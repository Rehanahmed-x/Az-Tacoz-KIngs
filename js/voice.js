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
    this.currentSpokenText = "";
    this.speakStartTime = 0;
    this.allowBargeIn = true;
    this.onStateChange = null;
    this.onInterimTranscript = null;
    this.onSpeechResult = null;

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
      const pollAudio = () => {
        if (this.isListening && this.analyser) {
          this.analyser.getByteFrequencyData(buffer);
          let sum = 0;
          for (let i = 0; i < buffer.length; i++) sum += buffer[i];
          const avg = sum / buffer.length;
          const level = Math.min(1, avg / 45);

          // Audio level barge-in: If user speaks loudly while Bella is speaking, cut speech immediately!
          if (this.isSpeaking && level > 0.28 && (Date.now() - this.speakStartTime > 400)) {
            this.stopSpeaking();
            if (this.onStateChange) {
              this.onStateChange({ isSpeaking: false, isInterrupted: true, isListening: true });
            }
          }

          if (this.onStateChange) this.onStateChange({ audioLevel: level });
        }
        requestAnimationFrame(pollAudio);
      };
      pollAudio();
    } catch (e) {}
  }

  safeRestartRecognition(delay = 150) {
    if (this.restartTimer) clearTimeout(this.restartTimer);
    this.restartTimer = setTimeout(() => {
      if (!this.shouldBeListening || this.isListening) return;
      try {
        this.recognition.start();
      } catch (e) {
        if (this.shouldBeListening) {
          setTimeout(() => {
            try {
              if (this.shouldBeListening && !this.isListening) {
                this.recognition.start();
              }
            } catch (err) {}
          }, 300);
        }
      }
    }, delay);
  }

  initSpeechRecognition() {
    const SpeechRecognition = window.SpeechRecognition || window.webkitSpeechRecognition;
    if (!SpeechRecognition) {
      console.warn("SpeechRecognition not supported in this browser.");
      return;
    }

    this.recognition = new SpeechRecognition();
    this.recognition.continuous = true; // Stay alive continuously!
    this.recognition.interimResults = true; // Show live words as user speaks
    this.recognition.maxAlternatives = 3;
    this.recognition.lang = "en-US";

    this.recognition.onstart = () => {
      this.isListening = true;
      if (this.onStateChange) this.onStateChange({ isListening: true });
    };

    this.recognition.onend = () => {
      this.isListening = false;
      if (this.onStateChange) this.onStateChange({ isListening: false });

      // Automatically restart whenever shouldBeListening is active, so listening never dies!
      if (this.shouldBeListening) {
        this.safeRestartRecognition(120);
      }
    };

    this.recognition.onerror = (event) => {
      if (event.error === "no-speech") return;

      console.warn("Speech recognition notice:", event.error);
      this.isListening = false;

      let msg = "";
      if (event.error === "not-allowed") {
        msg = "Microphone blocked. Click the lock/mic icon in the browser address bar to Allow.";
      } else if (event.error === "network") {
        msg = "Speech recognition needs localhost or internet. Use Start_Az_Tacos_King.bat!";
      }

      if (this.onStateChange) {
        this.onStateChange({ isListening: false, error: event.error, errorMsg: msg });
      }
    };

    this.recognition.onresult = (event) => {
      let interim = "";
      let finalStr = "";

      for (let i = event.resultIndex; i < event.results.length; ++i) {
        const transcript = event.results[i][0].transcript;
        if (event.results[i].isFinal) {
          finalStr += transcript;
        } else {
          interim += transcript;
        }
      }

      const incomingText = (finalStr || interim).trim();
      if (!incomingText) return;

      // ⚡ ACTIVE VOICE BARGE-IN:
      // If user interrupts the bot during conversation, immediately stop Bella's voice!
      if (this.isSpeaking && this.allowBargeIn) {
        const timeSinceSpeak = Date.now() - this.speakStartTime;
        const incomingLower = incomingText.toLowerCase();
        const isEcho = this.currentSpokenText && 
                       this.currentSpokenText.includes(incomingLower) && 
                       timeSinceSpeak < 600;

        if (!isEcho && incomingText.length >= 2) {
          console.log("⚡ Voice Barge-In: User interrupted Bella with:", incomingText);
          this.stopSpeaking();
          if (this.onStateChange) {
            this.onStateChange({ isSpeaking: false, isInterrupted: true, isListening: true });
          }
        } else {
          return; // Ignore bot's own speaker echo
        }
      }

      const activeText = (this.transcriptBuffer + " " + (finalStr || interim)).trim();

      if (this.onInterimTranscript && activeText) {
        this.onInterimTranscript(activeText);
      }

      if (finalStr) {
        this.transcriptBuffer += " " + finalStr;
      }

      // Silence Detection Debounce:
      // When user finishes speaking (950ms pause), submit the full sentence!
      clearTimeout(this.silenceTimer);
      this.silenceTimer = setTimeout(() => {
        const fullPrompt = (this.transcriptBuffer || interim).trim();
        if (fullPrompt.length >= 2) {
          this.transcriptBuffer = "";
          if (this.onSpeechResult) {
            this.onSpeechResult(fullPrompt);
          }
        }
      }, 950);
    };
  }

  // Phonetic smoothing for natural TTS
  enhancePhonetics(text, accentId = "standard") {
    let clean = text
      .replace(/[\u{1F600}-\u{1F6FF}|[\u{1F300}-\u{1F5FF}|[\u{1F680}-\u{1F6FF}|[\u{2600}-\u{26FF}]/gu, '')
      .replace(/[*_~`#]/g, '')
      .replace(/\$\s?([0-9]+)\.([0-9]{2})/g, '$1 dollars and $2 cents')
      .replace(/\$\s?([0-9]+)/g, '$1 dollars')
      .replace(/\b8\s?oz\b/gi, '8 ounce')
      .replace(/\b16\s?oz\b/gi, '16 ounce');

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

    return clean.trim();
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
    clearTimeout(this.silenceTimer);
    this.transcriptBuffer = "";
    if (this.onStateChange) this.onStateChange({ isSpeaking: true });

    this.synth.cancel();
    const utterance = new SpeechSynthesisUtterance(cleanText);

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
      this.currentSpokenText = "";
      this.transcriptBuffer = "";
      clearTimeout(this.silenceTimer);
      if (this.onStateChange) this.onStateChange({ isSpeaking: false });

      if (this.shouldBeListening) {
        if (!this.isListening) {
          this.safeRestartRecognition(100);
        } else {
          if (this.onStateChange) this.onStateChange({ isListening: true });
        }
      }

      if (onDoneCallback) onDoneCallback();
    };

    utterance.onend = handleSpeechEnd;
    utterance.onerror = handleSpeechEnd;

    // Keep recognition active during speech for instant barge-in interruption!
    if (this.shouldBeListening && !this.isListening) {
      this.safeRestartRecognition(60);
    }

    const maxDurationMs = Math.max(3000, cleanText.length * 90);
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
    this.recognition.lang = lang;
    if (onResultCallback) {
      this.onSpeechResult = onResultCallback;
    }

    try {
      this.recognition.start();
      return true;
    } catch (e) {
      // Already running
      return true;
    }
  }

  stopListening() {
    this.shouldBeListening = false;
    clearTimeout(this.silenceTimer);
    this.transcriptBuffer = "";
    if (this.recognition) {
      try {
        this.recognition.stop();
      } catch(e) {}
    }
    this.isListening = false;
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
