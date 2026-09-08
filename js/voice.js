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
        "Zira"
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
        if (this.isListening && !this.isSpeaking && this.analyser) {
          this.analyser.getByteFrequencyData(buffer);
          let sum = 0;
          for (let i = 0; i < buffer.length; i++) sum += buffer[i];
          const avg = sum / buffer.length;
          const level = Math.min(1, avg / 45);
          if (this.onStateChange) this.onStateChange({ audioLevel: level });
        }
        requestAnimationFrame(pollAudio);
      };
      pollAudio();
    } catch (e) {}
  }

  safeRestartRecognition(delay = 200) {
    if (this.restartTimer) clearTimeout(this.restartTimer);
    this.restartTimer = setTimeout(() => {
      if (!this.shouldBeListening || this.isSpeaking || this.isListening) return;
      try {
        this.recognition.start();
      } catch (e) {
        if (this.shouldBeListening && !this.isSpeaking) {
          setTimeout(() => {
            try {
              if (this.shouldBeListening && !this.isSpeaking && !this.isListening) {
                this.recognition.start();
              }
            } catch (err) {}
          }, 350);
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

      // Automatically restart if shouldBeListening is active and Bella is not speaking!
      if (this.shouldBeListening && !this.isSpeaking) {
        this.safeRestartRecognition(150);
      }
    };

    this.recognition.onerror = (event) => {
      // Ignorable events like no-speech shouldn't break the session
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
      // Ignore audio while Bella is speaking to prevent echo
      if (this.isSpeaking) return;

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

      const activeText = (this.transcriptBuffer + " " + (finalStr || interim)).trim();

      if (this.onInterimTranscript && activeText) {
        this.onInterimTranscript(activeText);
      }

      if (finalStr) {
        this.transcriptBuffer += " " + finalStr;
      }

      // Silence Detection Debounce:
      // When user stops speaking for 1.1s, automatically submit the whole sentence!
      clearTimeout(this.silenceTimer);
      this.silenceTimer = setTimeout(() => {
        const fullPrompt = (this.transcriptBuffer || interim).trim();
        if (fullPrompt.length >= 2) {
          this.transcriptBuffer = "";
          if (this.onSpeechResult) {
            this.onSpeechResult(fullPrompt);
          }
        }
      }, 1100);
    };
  }

  // Phonetic smoothing for natural TTS
  enhancePhonetics(text, accentId = "chicano") {
    let clean = text
      .replace(/[\u{1F600}-\u{1F6FF}|[\u{1F300}-\u{1F5FF}|[\u{1F680}-\u{1F6FF}|[\u{2600}-\u{26FF}]/gu, '')
      .replace(/[*_~`#]/g, '')
      .replace(/\$\s?([0-9]+(?:\.[0-9]{2})?)/g, '$1 dollars')
      .replace(/\b8\s?oz\b/gi, '8 ounce')
      .replace(/\b16\s?oz\b/gi, '16 ounce');

    clean = clean
      .replace(/\bquesatacos\b/gi, "kay-sah tacos")
      .replace(/\bquesataco\b/gi, "kay-sah taco")
      .replace(/\bconsomé\b/gi, "con-so-may")
      .replace(/\bconsome\b/gi, "con-so-may")
      .replace(/\bhorchata\b/gi, "or-chah-tah")
      .replace(/\btaquitos\b/gi, "tah-kee-tohs")
      .replace(/\bórale\b/gi, "oh-rah-lay")
      .replace(/\bprovecho\b/gi, "pro-veh-choh");

    return clean.trim();
  }

  speak(text, accentObj = null, lang = "en", onDoneCallback = null) {
    if (this.isMuted || !this.synth) {
      if (onDoneCallback) onDoneCallback();
      return;
    }

    const accentId = accentObj ? accentObj.id : "chicano";
    const cleanText = this.enhancePhonetics(text, accentId);
    if (!cleanText) {
      if (onDoneCallback) onDoneCallback();
      return;
    }

    // Set speaking flag to mute recognition input
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
      utterance.rate = 1.0;
      utterance.pitch = 1.05;
    } else {
      if (this.selectedVoice) {
        utterance.voice = this.selectedVoice;
      }
      if (accentObj && accentObj.tts) {
        utterance.rate = accentObj.tts.rate || 1.0;
        utterance.pitch = accentObj.tts.pitch || 1.0;
        utterance.lang = accentObj.tts.lang || "en-US";
      }
    }

    utterance.onstart = () => {
      this.isSpeaking = true;
      if (this.onStateChange) this.onStateChange({ isSpeaking: true });
    };

    let speechEnded = false;
    let watchdogTimer = null;

    const handleSpeechEnd = () => {
      if (speechEnded) return;
      speechEnded = true;
      if (watchdogTimer) clearTimeout(watchdogTimer);

      this.isSpeaking = false;
      this.transcriptBuffer = "";
      clearTimeout(this.silenceTimer);
      if (this.onStateChange) this.onStateChange({ isSpeaking: false });

      // If continuous listening is enabled, ensure recognition is running and ready for next turn!
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

    // Watchdog: In case Chromium speech synthesis drops the onend callback on Windows
    const maxDurationMs = Math.max(3000, cleanText.length * 85);
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
