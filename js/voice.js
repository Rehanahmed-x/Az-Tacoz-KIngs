// Rock-Solid Continuous Voice Controller for Bella AI Order Bot

class VoiceController {
  constructor() {
    this.isMuted = false;
    this.isSpeaking = false;
    this.isListening = false;
    this.shouldBeListening = false;
    this.synth = window.speechSynthesis || null;
    this.recognition = null;
    this.selectedVoice = null;
    this.audioCtx = null;
    this.micStream = null;
    this.analyser = null;
    this.silenceTimer = null;
    this.transcriptBuffer = "";
    this.transcriptAlternatives = [];
    this.currentSpokenText = "";
    this.recentBotPhrases = [];
    this.spokenWordSet = new Set();
    this.speakStartTime = 0;
    this.allowBargeIn = true;
    this.autoRelisten = false;
    this.sessionStartTime = 0;
    this.sessionWatchdog = null;
    this.activeUtterance = null;
    this.onStateChange = null;
    this.onInterimTranscript = null;
    this.onSpeechResult = null;
    this.currentLang = "en-US";

    this.initVoices();
    this.initSpeechRecognition();
  }

  initVoices() {
    if (!this.synth) return;

    const loadVoices = () => {
      const voices = this.synth.getVoices();
      if (!voices || voices.length === 0) return;

      const preferred = [
        "Microsoft Jenny Online (Natural) - English (United States)",
        "Microsoft Aria Online (Natural) - English (United States)",
        "Google US English",
        "Samantha",
        "Victoria",
        "Zira",
        "Jenny",
        "Aria",
        "Natural"
      ];

      for (const name of preferred) {
        const match = voices.find(v => v.name.includes(name));
        if (match) {
          this.selectedVoice = match;
          break;
        }
      }

      if (!this.selectedVoice) {
        this.selectedVoice = voices.find(v => v.lang === "en-US" && !v.name.includes("David")) ||
                             voices.find(v => v.lang.startsWith("en-US")) ||
                             voices[0];
      }
    };

    loadVoices();
    if (this.synth.onvoiceschanged !== undefined) {
      this.synth.onvoiceschanged = loadVoices;
    }
  }

  // Request mic permission once and cache stream permanently
  async ensureMicStream() {
    if (this.micStream) return true;
    try {
      if (navigator.mediaDevices && navigator.mediaDevices.getUserMedia) {
        this.micStream = await navigator.mediaDevices.getUserMedia({ audio: true });
        this.initAudioVisualizer(this.micStream);
        return true;
      }
    } catch (e) {
      console.warn("Microphone access notice:", e);
      return false;
    }
    return true;
  }

  requestMicPermission() {
    return this.ensureMicStream();
  }

  initAudioVisualizer(stream) {
    try {
      const ctx = this.getAudioContext();
      if (!ctx || !stream) return;

      const source = ctx.createMediaStreamSource(stream);
      this.analyser = ctx.createAnalyser();
      this.analyser.fftSize = 128;
      source.connect(this.analyser);

      const buffer = new Uint8Array(this.analyser.frequencyBinCount);
      this.pollRafId = null;
      this.pollAudio = () => {
        if (this.isListening && this.analyser) {
          this.analyser.getByteFrequencyData(buffer);
          let sum = 0;
          for (let i = 0; i < buffer.length; i++) sum += buffer[i];
          const avg = sum / buffer.length;
          const level = Math.min(1, avg / 45);

          if (this.onAudioLevel) {
            this.onAudioLevel(level);
          } else if (this.onStateChange) {
            this.onStateChange({ audioLevel: level });
          }
          this.pollRafId = requestAnimationFrame(this.pollAudio);
        } else {
          this.pollRafId = null;
          if (this.onAudioLevel) this.onAudioLevel(0);
        }
      };

      if (this.isListening && !this.pollRafId) {
        this.pollRafId = requestAnimationFrame(this.pollAudio);
      }
    } catch (e) {}
  }

  safeRestartRecognition(delay = 80) {
    if (this.restartTimer) clearTimeout(this.restartTimer);
    this.restartTimer = setTimeout(() => {
      if (!this.shouldBeListening) return;
      if (this.isListening) return;

      try {
        if (!this.recognition) {
          this.initSpeechRecognition();
        }
        this.recognition.start();
      } catch (e) {
        // If recognition failed to restart, recreate cleanly to avoid InvalidStateError
        setTimeout(() => {
          if (this.shouldBeListening && !this.isListening) {
            try {
              this.initSpeechRecognition();
              if (this.recognition) this.recognition.start();
            } catch (err) {
              console.warn("Recognition restart retry notice:", err);
            }
          }
        }, 200);
      }
    }, delay);
  }

  // Gracefully refresh recognition session during natural pauses before 60-second Chromium timeout
  refreshSessionWatchdog() {
    if (this.sessionWatchdog) clearTimeout(this.sessionWatchdog);
    if (!this.shouldBeListening) return;

    // Chromium drops WebSpeech sessions around 60 seconds. We proactively recycle at ~48 seconds
    this.sessionWatchdog = setTimeout(() => {
      if (this.shouldBeListening && !this.isSpeaking && !this.transcriptBuffer) {
        try {
          if (this.recognition) {
            this.recognition.stop();
          }
        } catch (e) {}
      } else if (this.shouldBeListening) {
        // If user was actively speaking or Bella was speaking, recheck in 8 seconds
        this.refreshSessionWatchdog();
      }
    }, 48000);
  }

  initSpeechRecognition() {
    const SpeechRecognition = window.SpeechRecognition || window.webkitSpeechRecognition;
    if (!SpeechRecognition) {
      console.warn("SpeechRecognition not supported in this browser.");
      return;
    }

    if (this.recognition) {
      try {
        this.recognition.onstart = null;
        this.recognition.onend = null;
        this.recognition.onerror = null;
        this.recognition.onresult = null;
        this.recognition.abort();
      } catch (e) {}
    }

    this.recognition = new SpeechRecognition();
    this.recognition.continuous = true; // Stay alive continuously!
    this.recognition.interimResults = true; // Show live words as user speaks
    this.recognition.maxAlternatives = 5; // Capture up to 5 phonetic alternatives for accented speakers!
    this.recognition.lang = this.currentLang || "en-US";

    this.recognition.onstart = () => {
      this.isListening = true;
      this.sessionStartTime = Date.now();
      this.refreshSessionWatchdog();
      if (this.onStateChange) this.onStateChange({ isListening: true });
      if (this.pollAudio && !this.pollRafId) {
        this.pollRafId = requestAnimationFrame(this.pollAudio);
      }
    };

    this.recognition.onend = () => {
      this.isListening = false;
      if (this.pollRafId) {
        cancelAnimationFrame(this.pollRafId);
        this.pollRafId = null;
      }
      if (this.onAudioLevel) this.onAudioLevel(0);
      if (this.onStateChange) this.onStateChange({ isListening: false });

      // Automatically reconnect whenever shouldBeListening is active (seamless 60s+ continuity!)
      if (this.shouldBeListening) {
        this.safeRestartRecognition(60);
      }
    };

    this.recognition.onerror = (event) => {
      // Normal non-fatal transient events in Chromium Web Speech
      if (event.error === "no-speech") {
        return;
      }

      if (event.error === "aborted" || event.error === "network") {
        // Network or aborted disconnects occur routinely at 60s session boundaries in Chrome.
        // Seamlessly reconnect without disturbing the customer with error banners!
        if (this.shouldBeListening) {
          this.safeRestartRecognition(100);
          return;
        }
      }

      console.warn("Speech recognition notice:", event.error);
      this.isListening = false;

      let msg = "";
      if (event.error === "not-allowed") {
        msg = "Microphone blocked. Click the lock/mic icon in the browser address bar to Allow.";
      }

      if (msg && this.onStateChange) {
        this.onStateChange({ isListening: false, error: event.error, errorMsg: msg });
      }
    };

    this.recognition.onresult = (event) => {
      let interim = "";
      let finalStr = "";
      const candidateAlternatives = [];

      for (let i = event.resultIndex; i < event.results.length; ++i) {
        const res = event.results[i];
        if (res.isFinal) {
          finalStr += res[0].transcript;
        } else {
          interim += res[0].transcript;
        }

        // Collect all phonetic alternatives across results for accented speakers
        for (let alt = 0; alt < res.length; alt++) {
          if (res[alt] && res[alt].transcript) {
            if (!candidateAlternatives[alt]) candidateAlternatives[alt] = "";
            candidateAlternatives[alt] += (candidateAlternatives[alt] ? " " : "") + res[alt].transcript;
          }
        }
      }

      const incomingText = (finalStr || interim).trim();
      if (!incomingText) return;

      const incomingLower = incomingText.toLowerCase();

      // =========================================================================
      // 🛡️ BULLETPROOF ACOUSTIC ECHO SUPPRESSION & INTELLIGENT BARGE-IN:
      // =========================================================================
      if (this.isSpeaking) {
        // Calculate token overlap with Bella's currently spoken output
        const incomingTokens = incomingLower.split(/\s+/).filter(t => t.length > 2);
        let echoTokens = 0;
        for (const tok of incomingTokens) {
          if (this.spokenWordSet.has(tok)) echoTokens++;
        }
        const overlapRatio = incomingTokens.length > 0 ? (echoTokens / incomingTokens.length) : 0;

        // Check if incoming text is a substring of what Bella is saying
        const isSubstringEcho = this.currentSpokenText && (
          this.currentSpokenText.includes(incomingLower) ||
          incomingLower.includes(this.currentSpokenText.slice(0, Math.min(25, this.currentSpokenText.length)))
        );

        const isBotEcho = isSubstringEcho || overlapRatio >= 0.35;

        // If it's Bella's own voice coming through the speaker, DISCARD immediately!
        if (isBotEcho) {
          return;
        }

        // Genuine User Interruption Detection (e.g. "wait", "stop", "hold on", "cancel", "no", "actually")
        const isExplicitInterruption = /\b(wait|hold on|stop|cancel|no|actually|excuse me|one sec|pause|hey bella)\b/i.test(incomingLower);
        const isDistinctOrderPhrase = incomingTokens.length >= 2 && overlapRatio < 0.20;

        if (this.allowBargeIn && (isExplicitInterruption || isDistinctOrderPhrase)) {
          console.log("⚡ Genuine User Barge-In detected:", incomingText);
          this.stopSpeaking();
          if (this.onStateChange) {
            this.onStateChange({ isSpeaking: false, isInterrupted: true, isListening: true });
          }
        } else {
          // Ambient background noise while Bella is speaking - ignore
          return;
        }
      }

      const activeText = (this.transcriptBuffer + " " + (finalStr || interim)).trim();

      if (this.onInterimTranscript && activeText) {
        this.onInterimTranscript(activeText);
      }

      if (finalStr) {
        this.transcriptBuffer += " " + finalStr;
      }

      // Collect primary text plus phonetic alternatives
      const allCandidates = [activeText];
      candidateAlternatives.forEach(alt => {
        const cleanAlt = alt.trim();
        if (cleanAlt && !allCandidates.includes(cleanAlt)) {
          allCandidates.push(cleanAlt);
        }
      });

      // Silence Detection Debounce:
      // When user finishes speaking (850ms pause), submit the full sentence!
      clearTimeout(this.silenceTimer);
      this.silenceTimer = setTimeout(() => {
        // Double check Bella isn't currently speaking so we never submit her voice
        if (this.isSpeaking) return;

        const fullPrompt = (this.transcriptBuffer || interim).trim();
        if (fullPrompt.length >= 2) {
          this.transcriptBuffer = "";
          this.refreshSessionWatchdog();

          // If not in a continuous phone call, stop listening after this utterance
          if (!this.autoRelisten) {
            this.stopListening();
          }

          if (this.onSpeechResult) {
            this.onSpeechResult(fullPrompt, allCandidates);
          }
        }
      }, 850);
    };
  }

  // Phonetic smoothing for natural TTS
  enhancePhonetics(text, accentId = "standard") {
    let clean = text
      .replace(/<[^>]*>/g, ' ') // Strip all HTML tags so Bella never reads tags
      .replace(/\p{Extended_Pictographic}/gu, '') // Cleanly strip all Unicode emojis
      .replace(/[*_~`#]/g, '')
      .replace(/\$\s?([0-9]+)\.([0-9]{2})/g, '$1 dollars and $2 cents')
      .replace(/\$\s?([0-9]+)/g, '$1 dollars')
      .replace(/\b8\s?oz\b/gi, '8 ounce')
      .replace(/\b16\s?oz\b/gi, '16 ounce')
      .replace(/\bATK\b/g, 'Az Tacos King');

    clean = clean
      .replace(/\bquesatacos\b/gi, "kay-sah tacos")
      .replace(/\bquesataco\b/gi, "kay-sah taco")
      .replace(/\bconsomé\b/gi, "con-so-may")
      .replace(/\bconsome\b/gi, "con-so-may")
      .replace(/\bhorchata\b/gi, "or-chah-tah")
      .replace(/\btaquitos\b/gi, "tah-kee-tohs")
      .replace(/\bbirria\b/gi, "beer-ee-ah")
      .replace(/\bórale\b/gi, "oh-rah-lay")
      .replace(/\bprovecho\b/gi, "pro-veh-choh");

    return clean.replace(/\s+/g, ' ').trim();
  }

  speak(text, accentObj = null, lang = "en", onDoneCallback = null) {
    if (this.isMuted || !this.synth) {
      if (onDoneCallback) onDoneCallback();
      return;
    }

    const accentId = accentObj ? accentObj.id : "standard";
    const cleanText = this.enhancePhonetics(text, accentId);
    if (!cleanText) {
      if (onDoneCallback) onDoneCallback();
      return;
    }

    this.currentSpokenText = cleanText.toLowerCase();
    this.speakStartTime = Date.now();
    this.isSpeaking = true;

    // Cache words spoken by Bella to guarantee 100% echo cancellation
    this.spokenWordSet.clear();
    const words = this.currentSpokenText.replace(/[.,\/#!$%\^&\*;:{}=\-_`~()]/g, " ").split(/\s+/);
    words.forEach(w => {
      if (w.length > 2) this.spokenWordSet.add(w);
    });

    clearTimeout(this.silenceTimer);
    this.transcriptBuffer = "";
    if (this.onStateChange) this.onStateChange({ isSpeaking: true });

    this.synth.cancel();
    const utterance = new SpeechSynthesisUtterance(cleanText);
    this.activeUtterance = utterance;
    window._currentBellaUtterance = utterance; // Prevent garbage-collection glitch

    if (lang === "es") {
      const voices = this.synth.getVoices();
      const esVoice = voices.find(v => v.lang.startsWith("es-MX") || v.lang.startsWith("es-US") || v.lang.startsWith("es"));
      if (esVoice) utterance.voice = esVoice;
      utterance.lang = "es-MX";
      utterance.rate = 0.98;
      utterance.pitch = 1.0;
    } else {
      if (this.selectedVoice) {
        utterance.voice = this.selectedVoice;
      }
      if (accentObj && accentObj.tts) {
        utterance.rate = accentObj.tts.rate || 0.98;
        utterance.pitch = accentObj.tts.pitch || 1.0;
        utterance.lang = accentObj.tts.lang || "en-US";
      }
    }

    utterance.onstart = () => {
      this.isSpeaking = true;
      this.speakStartTime = Date.now();
      if (this.onStateChange) this.onStateChange({ isSpeaking: true });
    };

    let speechEnded = false;
    let watchdogTimer = null;

    const handleSpeechEnd = () => {
      if (speechEnded) return;
      speechEnded = true;
      if (watchdogTimer) clearTimeout(watchdogTimer);

      this.isSpeaking = false;
      this.activeUtterance = null;
      window._currentBellaUtterance = null;
      this.currentSpokenText = "";
      this.transcriptBuffer = "";
      clearTimeout(this.silenceTimer);
      if (this.onStateChange) this.onStateChange({ isSpeaking: false });

      if (this.shouldBeListening) {
        if (!this.isListening) {
          this.safeRestartRecognition(80);
        } else {
          if (this.onStateChange) this.onStateChange({ isListening: true });
        }
      }

      if (onDoneCallback) onDoneCallback();
    };

    utterance.onend = handleSpeechEnd;
    utterance.onerror = handleSpeechEnd;

    // Ensure recognition stays active during speech for legitimate user barge-in
    if (this.shouldBeListening && !this.isListening) {
      this.safeRestartRecognition(60);
    }

    const maxDurationMs = Math.max(3500, cleanText.length * 95);
    watchdogTimer = setTimeout(() => {
      if (!speechEnded) {
        handleSpeechEnd();
      }
    }, maxDurationMs);

    this.synth.speak(utterance);
  }

  stopSpeaking() {
    if (this.synth) {
      this.synth.cancel();
      this.isSpeaking = false;
      this.activeUtterance = null;
      window._currentBellaUtterance = null;
      this.currentSpokenText = "";
      if (this.onStateChange) this.onStateChange({ isSpeaking: false });
    }
  }

  toggleMute() {
    this.isMuted = !this.isMuted;
    if (this.isMuted) {
      this.stopSpeaking();
    }
    return this.isMuted;
  }

  async startListening(onResultCallback, lang = "en-US") {
    if (!this.recognition) {
      alert("Speech recognition is not supported in this browser. You can type your order directly into the chat input!");
      return false;
    }

    await this.ensureMicStream();

    this.shouldBeListening = true;
    this.stopSpeaking();
    this.currentLang = lang;
    if (this.recognition) {
      this.recognition.lang = lang;
    }
    if (onResultCallback) {
      this.onSpeechResult = onResultCallback;
    }

    try {
      this.recognition.start();
      return true;
    } catch (e) {
      // If already started or stalled, ensure restart
      this.safeRestartRecognition(50);
      return true;
    }
  }

  stopListening() {
    this.shouldBeListening = false;
    clearTimeout(this.silenceTimer);
    if (this.sessionWatchdog) clearTimeout(this.sessionWatchdog);
    this.transcriptBuffer = "";
    if (this.recognition) {
      try {
        this.recognition.stop();
      } catch(e) {}
    }
    this.isListening = false;
    if (this.pollRafId) {
      cancelAnimationFrame(this.pollRafId);
      this.pollRafId = null;
    }
    if (this.onAudioLevel) this.onAudioLevel(0);
    if (this.onStateChange) this.onStateChange({ isListening: false });
  }

  // Audio Context Synthesizer
  getAudioContext() {
    if (!this.audioCtx) {
      const AudioCtx = window.AudioContext || window.webkitAudioContext;
      if (AudioCtx) {
        this.audioCtx = new AudioCtx();
      }
    }
    if (this.audioCtx && this.audioCtx.state === "suspended") {
      this.audioCtx.resume();
    }
    return this.audioCtx;
  }

  playPhoneRing() {
    try {
      const ctx = this.getAudioContext();
      if (!ctx) return;
      const now = ctx.currentTime;

      const osc1 = ctx.createOscillator();
      const osc2 = ctx.createOscillator();
      const gain = ctx.createGain();

      osc1.frequency.setValueAtTime(440, now);
      osc2.frequency.setValueAtTime(480, now);

      gain.gain.setValueAtTime(0.08, now);
      gain.gain.setValueAtTime(0.08, now + 0.8);
      gain.gain.exponentialRampToValueAtTime(0.001, now + 0.85);

      osc1.connect(gain);
      osc2.connect(gain);
      gain.connect(ctx.destination);

      osc1.start(now);
      osc2.start(now);
      osc1.stop(now + 0.85);
      osc2.stop(now + 0.85);
    } catch (e) {}
  }

  playCallPickup() {
    try {
      const ctx = this.getAudioContext();
      if (!ctx) return;
      const now = ctx.currentTime;
      const osc = ctx.createOscillator();
      const gain = ctx.createGain();

      osc.frequency.setValueAtTime(800, now);
      osc.frequency.exponentialRampToValueAtTime(400, now + 0.05);

      gain.gain.setValueAtTime(0.15, now);
      gain.gain.exponentialRampToValueAtTime(0.001, now + 0.06);

      osc.connect(gain);
      gain.connect(ctx.destination);
      osc.start(now);
      osc.stop(now + 0.06);
    } catch (e) {}
  }

  playCallHangup() {
    try {
      const ctx = this.getAudioContext();
      if (!ctx) return;
      const now = ctx.currentTime;
      [480, 480, 480].forEach((freq, idx) => {
        const osc = ctx.createOscillator();
        const gain = ctx.createGain();
        const start = now + idx * 0.18;

        osc.frequency.setValueAtTime(freq, start);
        gain.gain.setValueAtTime(0.1, start);
        gain.gain.exponentialRampToValueAtTime(0.001, start + 0.12);

        osc.connect(gain);
        gain.connect(ctx.destination);
        osc.start(start);
        osc.stop(start + 0.12);
      });
    } catch (e) {}
  }

  playPop(freq = 520, duration = 0.08) {
    if (this.isMuted) return;
    try {
      const ctx = this.getAudioContext();
      if (!ctx) return;
      const osc = ctx.createOscillator();
      const gain = ctx.createGain();
      osc.type = "sine";
      osc.frequency.setValueAtTime(freq, ctx.currentTime);
      osc.frequency.exponentialRampToValueAtTime(freq * 1.5, ctx.currentTime + duration);

      gain.gain.setValueAtTime(0.12, ctx.currentTime);
      gain.gain.exponentialRampToValueAtTime(0.001, ctx.currentTime + duration);

      osc.connect(gain);
      gain.connect(ctx.destination);
      osc.start();
      osc.stop(ctx.currentTime + duration);
    } catch (e) {}
  }

  playChime() {
    if (this.isMuted) return;
    try {
      const ctx = this.getAudioContext();
      if (!ctx) return;
      const now = ctx.currentTime;
      [587.33, 880].forEach((freq, i) => {
        const osc = ctx.createOscillator();
        const gain = ctx.createGain();
        osc.type = "triangle";
        osc.frequency.setValueAtTime(freq, now + i * 0.1);

        gain.gain.setValueAtTime(0.08, now + i * 0.1);
        gain.gain.exponentialRampToValueAtTime(0.001, now + i * 0.1 + 0.25);

        osc.connect(gain);
        gain.connect(ctx.destination);
        osc.start(now + i * 0.1);
        osc.stop(now + i * 0.1 + 0.25);
      });
    } catch (e) {}
  }

  playCartAdd() {
    if (this.isMuted) return;
    try {
      const ctx = this.getAudioContext();
      if (!ctx) return;
      const now = ctx.currentTime;
      [523.25, 659.25, 783.99].forEach((freq, i) => {
        const osc = ctx.createOscillator();
        const gain = ctx.createGain();
        osc.type = "sine";
        osc.frequency.setValueAtTime(freq, now + i * 0.05);

        gain.gain.setValueAtTime(0.1, now + i * 0.05);
        gain.gain.exponentialRampToValueAtTime(0.001, now + i * 0.05 + 0.18);

        osc.connect(gain);
        gain.connect(ctx.destination);
        osc.start(now + i * 0.05);
        osc.stop(now + i * 0.05 + 0.18);
      });
    } catch (e) {}
  }

  playOrderSuccess() {
    if (this.isMuted) return;
    try {
      const ctx = this.getAudioContext();
      if (!ctx) return;
      const now = ctx.currentTime;
      [523.25, 659.25, 783.99, 1046.50].forEach((freq, i) => {
        const osc = ctx.createOscillator();
        const gain = ctx.createGain();
        osc.type = "triangle";
        osc.frequency.setValueAtTime(freq, now + i * 0.08);

        gain.gain.setValueAtTime(0.15, now + i * 0.08);
        gain.gain.exponentialRampToValueAtTime(0.001, now + i * 0.08 + 0.35);

        osc.connect(gain);
        gain.connect(ctx.destination);
        osc.start(now + i * 0.08);
        osc.stop(now + i * 0.08 + 0.35);
      });
    } catch (e) {}
  }
}

const voiceController = new VoiceController();

if (typeof module !== 'undefined' && module.exports) {
  module.exports = { VoiceController, voiceController };
}
