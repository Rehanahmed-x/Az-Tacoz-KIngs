// Main Application Controller for Bella AI Order Bot - Az Tacos King

document.addEventListener("DOMContentLoaded", () => {
  // DOM References
  const callScreenOverlay = document.getElementById("call-screen-overlay");
  const btnStartCall = document.getElementById("btn-start-call");
  const btnSkipCall = document.getElementById("btn-skip-call");
  const callBtnText = document.getElementById("call-btn-text");
  const precallAccentSelect = document.getElementById("precall-accent-select");
  const inCallBar = document.getElementById("in-call-bar");
  const inCallTimer = document.getElementById("in-call-timer");
  const btnEndCall = document.getElementById("btn-end-call");
  const btnTriggerCall = document.getElementById("btn-trigger-call");

  const chatStream = document.getElementById("chat-stream");
  const chatInput = document.getElementById("chat-input");
  const sendBtn = document.getElementById("send-btn");
  const micBtn = document.getElementById("mic-btn");
  const muteBtn = document.getElementById("mute-btn");
  const cartToggleBtn = document.getElementById("cart-toggle-btn");
  const cartBadge = document.getElementById("cart-badge");
  const cartDrawer = document.getElementById("cart-drawer");
  const cartDrawerOverlay = document.getElementById("cart-drawer-overlay");
  const cartCloseBtn = document.getElementById("cart-close-btn");
  const drawerItemsList = document.getElementById("drawer-items-list");
  const subtotalEl = document.getElementById("subtotal-amount");
  const taxEl = document.getElementById("tax-amount");
  const tipEl = document.getElementById("tip-amount");
  const grandTotalEl = document.getElementById("grand-total-amount");
  const checkoutBtn = document.getElementById("checkout-btn");
  const accentPills = document.querySelectorAll(".accent-pill");
  const bellaSubtext = document.getElementById("bella-subtext");
  const bellaAvatarRing = document.getElementById("bella-avatar-ring");
  const soundwaveIndicator = document.getElementById("soundwave-indicator");
  const receiptModal = document.getElementById("receipt-modal");
  const receiptCloseBtn = document.getElementById("receipt-close-btn");
  const customizeModal = document.getElementById("customize-modal");
  const customizeCloseBtn = document.getElementById("customize-close-btn");
  const fullMenuModal = document.getElementById("full-menu-modal");
  const fullMenuCloseBtn = document.getElementById("full-menu-close-btn");
  const viewMenuHeaderBtn = document.getElementById("view-menu-header-btn");

  const liveSpeechToast = document.getElementById("live-speech-toast");
  const liveSpeechText = document.getElementById("live-speech-text");
  const micErrorToast = document.getElementById("mic-error-toast");
  const micErrorText = document.getElementById("mic-error-text");
  const micRetryBtn = document.getElementById("mic-retry-btn");
  const micDismissBtn = document.getElementById("mic-dismiss-btn");

  let pendingCustomItem = null;
  let callTimerInterval = null;
  let callSeconds = 0;
  let isCallActive = false;

  const liveVoiceBadge = document.getElementById("live-voice-badge");
  const liveVoiceStatusText = document.getElementById("live-voice-status-text");

  // Detect file:// protocol and show helpful prompt
  if (window.location.protocol === "file:") {
    const fileBanner = document.getElementById("file-protocol-warning");
    if (fileBanner) fileBanner.style.display = "block";
  }

  // Initialize Voice Controller State Watcher
  voiceController.onStateChange = (state) => {
    if (state.isInterrupted) {
      bellaAvatarRing.classList.remove("speaking");
      soundwaveIndicator.classList.remove("active");
      if (liveVoiceBadge) {
        liveVoiceBadge.style.display = "inline-flex";
        liveVoiceBadge.className = "live-voice-badge listening";
        if (liveVoiceStatusText) liveVoiceStatusText.innerHTML = "⚡ Interrupted • Listening to you...";
      }
      if (liveSpeechToast) {
        liveSpeechToast.style.display = "flex";
        liveSpeechText.innerText = "⚡ I hear you! Go ahead...";
      }
      return;
    }

    if (state.isSpeaking) {
      bellaAvatarRing.classList.add("speaking");
      soundwaveIndicator.classList.add("active");
      if (liveVoiceBadge) {
        liveVoiceBadge.style.display = "inline-flex";
        liveVoiceBadge.className = "live-voice-badge speaking";
        if (liveVoiceStatusText) liveVoiceStatusText.innerHTML = "🔊 Bella is speaking... (Interrupt anytime!)";
      }
    } else {
      bellaAvatarRing.classList.remove("speaking");
      soundwaveIndicator.classList.remove("active");
    }

    if (state.isListening) {
      micBtn.classList.add("listening");
      micBtn.innerHTML = "🎙️";
      if (liveVoiceBadge && !state.isSpeaking) {
        liveVoiceBadge.style.display = "inline-flex";
        liveVoiceBadge.className = "live-voice-badge listening";
        if (liveVoiceStatusText) liveVoiceStatusText.innerHTML = "🟢 Bella is listening... Speak anytime!";
      }
      if (liveSpeechToast && !state.isSpeaking) {
        liveSpeechToast.style.display = "flex";
        liveSpeechText.innerText = "Listening... Speak your order!";
      }
    } else if (!state.isSpeaking) {
      micBtn.classList.remove("listening");
      micBtn.innerHTML = "🎤";
      micBtn.style.transform = "scale(1)";
      if (liveVoiceBadge && !isCallActive) {
        liveVoiceBadge.style.display = "none";
      }
      if (liveSpeechToast) {
        liveSpeechToast.style.display = "none";
      }
    }

    // Audio level meter: button pulses with user's actual voice volume!
    if (state.audioLevel !== undefined && state.audioLevel > 0.05) {
      const scale = Math.min(1.4, 1 + state.audioLevel * 0.4);
      micBtn.style.transform = `scale(${scale})`;
    }

    // Error notifications
    if (state.errorMsg && micErrorToast) {
      micErrorToast.style.display = "flex";
      micErrorText.innerText = state.errorMsg;
    }
  };

  // Real-time live transcript as user speaks
  voiceController.onInterimTranscript = (text) => {
    if (liveSpeechToast) {
      liveSpeechToast.style.display = "flex";
      liveSpeechText.innerText = `🎙️ "${text}"`;
    }
    chatInput.value = text;
  };

  if (micRetryBtn) {
    micRetryBtn.addEventListener("click", () => {
      micErrorToast.style.display = "none";
      voiceController.requestMicPermission().then(granted => {
        if (granted) {
          voiceController.startListening(transcript => handleUserSubmit(transcript));
        }
      });
    });
  }

  if (micDismissBtn) {
    micDismissBtn.addEventListener("click", () => {
      micErrorToast.style.display = "none";
    });
  }

  // ==========================================
  // COMPACT AUDIO WAVEFORM VISUALIZER
  // ==========================================
  const audioVisualizerContainer = document.getElementById("audio-visualizer-container");
  const audioVisualizerCanvas = document.getElementById("audio-visualizer-canvas");
  const visualizerCtx = audioVisualizerCanvas ? audioVisualizerCanvas.getContext("2d") : null;

  let vizPhase = 0;
  let vizIdlePulse = 0;
  let currentVizLevel = 0;

  function renderAudioVisualizer() {
    if (!audioVisualizerCanvas || !visualizerCtx) return;

    const width = audioVisualizerCanvas.width;
    const height = audioVisualizerCanvas.height;
    const midY = height / 2;

    visualizerCtx.clearRect(0, 0, width, height);

    vizPhase += 0.05;
    vizIdlePulse += 0.025;

    const isSpeaking = voiceController && voiceController.isSpeaking;
    const isListening = voiceController && voiceController.isListening;
    const analyser = voiceController && voiceController.analyser;

    // Synchronize container state class for glowing pill border
    if (audioVisualizerContainer) {
      if (isSpeaking) {
        audioVisualizerContainer.className = "audio-visualizer-container speaking";
      } else if (isListening) {
        audioVisualizerContainer.className = "audio-visualizer-container listening";
      } else {
        audioVisualizerContainer.className = "audio-visualizer-container";
      }
    }

    // Audio frequency / volume calculation
    let targetLevel = 0;
    let freqBuffer = null;

    if (isListening && analyser) {
      freqBuffer = new Uint8Array(analyser.frequencyBinCount);
      analyser.getByteFrequencyData(freqBuffer);
      let sum = 0;
      for (let i = 0; i < freqBuffer.length; i++) sum += freqBuffer[i];
      targetLevel = Math.min(1, (sum / freqBuffer.length) / 40);
    } else if (isSpeaking) {
      // Dynamic pseudo-rhythmic speech energy when Bella is talking
      targetLevel = 0.5 + 0.3 * Math.sin(vizPhase * 2.5) + 0.2 * Math.cos(vizPhase * 1.8);
    } else {
      // Idle: subtle pulsing alive baseline (never a flat dead line)
      targetLevel = 0;
    }

    // Smooth dampening for level transitions
    currentVizLevel += (targetLevel - currentVizLevel) * 0.2;

    // Organic idle pulse: gentle breathing wave
    const idleAmplitude = 2.2 + Math.sin(vizIdlePulse) * 1.2;
    const dynamicAmplitude = idleAmplitude + currentVizLevel * 9;

    // Dynamic wave gradient
    const grad = visualizerCtx.createLinearGradient(0, 0, width, 0);
    if (isListening) {
      grad.addColorStop(0, "rgba(74, 222, 128, 0.2)");
      grad.addColorStop(0.5, "rgba(34, 197, 94, 0.95)");
      grad.addColorStop(1, "rgba(74, 222, 128, 0.2)");
    } else {
      grad.addColorStop(0, "rgba(255, 87, 34, 0.2)");
      grad.addColorStop(0.5, "rgba(255, 179, 0, 0.95)");
      grad.addColorStop(1, "rgba(255, 87, 34, 0.2)");
    }

    // Background harmonic wave for ambient depth
    visualizerCtx.beginPath();
    visualizerCtx.strokeStyle = isListening ? "rgba(74, 222, 128, 0.2)" : "rgba(255, 87, 34, 0.2)";
    visualizerCtx.lineWidth = 1.2;
    const bgSteps = 24;
    for (let i = 0; i <= bgSteps; i++) {
      const x = (i / bgSteps) * width;
      const norm = i / bgSteps;
      const envelope = Math.sin(norm * Math.PI); // Pin to midY at left and right edges
      const y = midY + Math.sin(norm * 5 - vizPhase * 0.9) * (dynamicAmplitude * 0.55) * envelope;
      if (i === 0) visualizerCtx.moveTo(x, y);
      else visualizerCtx.lineTo(x, y);
    }
    visualizerCtx.stroke();

    // Foreground primary responsive wave
    visualizerCtx.beginPath();
    visualizerCtx.strokeStyle = grad;
    visualizerCtx.lineWidth = 2.2;
    visualizerCtx.lineCap = "round";
    visualizerCtx.shadowColor = isListening ? "rgba(34, 197, 94, 0.5)" : "rgba(255, 179, 0, 0.5)";
    visualizerCtx.shadowBlur = 5;

    const fgSteps = 36;
    for (let i = 0; i <= fgSteps; i++) {
      const x = (i / fgSteps) * width;
      const norm = i / fgSteps;
      const envelope = Math.sin(norm * Math.PI); // Taper seamlessly to zero at edges
      const jitter = (freqBuffer && i < freqBuffer.length) ? (freqBuffer[i] / 255) * 4 * envelope : 0;
      const y = midY + (Math.sin(norm * 6.2 + vizPhase) * dynamicAmplitude + jitter) * envelope;

      if (i === 0) visualizerCtx.moveTo(x, y);
      else visualizerCtx.lineTo(x, y);
    }
    visualizerCtx.stroke();
    visualizerCtx.shadowBlur = 0;

    requestAnimationFrame(renderAudioVisualizer);
  }

  // Start visualizer animation loop
  renderAudioVisualizer();

  // ==========================================
  // CALL BELLA PHONE ORDERING EXPERIENCE
  // ==========================================

  async function startPhoneCall() {
    const selectedAccent = precallAccentSelect.value || "chicano";
    setActiveAccent(selectedAccent);
    syncAccentPills(selectedAccent);

    btnStartCall.classList.add("dialing");
    callBtnText.innerText = "Calling (480) 410-1914...";
    voiceController.playPhoneRing();

    // Request microphone permission proactively so user is ready
    await voiceController.requestMicPermission();

    setTimeout(() => {
      voiceController.playCallPickup();
      btnStartCall.classList.remove("dialing");
      callBtnText.innerText = "Connected!";

      setTimeout(() => {
        callScreenOverlay.classList.add("hidden");
        inCallBar.style.display = "flex";
        isCallActive = true;
        voiceController.autoRelisten = true; // Auto listen during phone call!
        startCallTimer();

        const accent = getActiveAccent();
        const callGreeting = `📞 <strong>Call Connected:</strong> ${accent.greetings[0]}`;
        appendBellaMessage(callGreeting, { accentTag: `${accent.name} • Live Call` });

        // Speak greeting and immediately start listening for customer's response!
        voiceController.speak(accent.greetings[0], accent, "en", () => {
          if (isCallActive) {
            voiceController.startListening(transcript => {
              if (transcript) handleUserSubmit(transcript);
            });
          }
        });

        setTimeout(() => {
          const bestSellers = MENU_ITEMS.filter(i => i.popular).slice(0, 3);
          appendBellaMessage("Here are our top customer favorites you can order over the phone:", { cards: bestSellers });
        }, 500);

      }, 400);
    }, 1500);
  }

  function skipCallToChat() {
    callScreenOverlay.classList.add("hidden");
    const accent = getActiveAccent();
    const welcome = accent.greetings[0];
    appendBellaMessage(welcome);
    const bestSellers = MENU_ITEMS.filter(i => i.popular).slice(0, 3);
    appendBellaMessage("Here are our top customer favorites to get you started:", { cards: bestSellers });
  }

  function endPhoneCall() {
    if (!isCallActive) return;
    isCallActive = false;
    voiceController.autoRelisten = false;
    voiceController.stopListening();
    stopCallTimer();
    voiceController.stopSpeaking();
    voiceController.playCallHangup();

    inCallBar.style.display = "none";
    appendBellaMessage("📞 <em>Call Ended. Your order is saved in the bag! You can continue chatting or tap Checkout when ready.</em>");
  }

  function startCallTimer() {
    callSeconds = 0;
    inCallTimer.innerText = "00:00";
    if (callTimerInterval) clearInterval(callTimerInterval);
    callTimerInterval = setInterval(() => {
      callSeconds++;
      const mins = Math.floor(callSeconds / 60).toString().padStart(2, '0');
      const secs = (callSeconds % 60).toString().padStart(2, '0');
      inCallTimer.innerText = `${mins}:${secs}`;
    }, 1000);
  }

  function stopCallTimer() {
    if (callTimerInterval) clearInterval(callTimerInterval);
  }

  btnStartCall.addEventListener("click", startPhoneCall);
  btnSkipCall.addEventListener("click", skipCallToChat);
  btnEndCall.addEventListener("click", endPhoneCall);

  if (btnTriggerCall) {
    btnTriggerCall.addEventListener("click", () => {
      callBtnText.innerText = "Call Bella to Order";
      btnStartCall.classList.remove("dialing");
      if (precallAccentSelect) precallAccentSelect.value = currentAccentId;
      callScreenOverlay.classList.remove("hidden");
    });
  }

  if (precallAccentSelect) {
    precallAccentSelect.addEventListener("change", () => {
      const selectedAccent = precallAccentSelect.value || "standard";
      setActiveAccent(selectedAccent);
      syncAccentPills(selectedAccent);
    });
  }

  function syncAccentPills(accentId) {
    accentPills.forEach(pill => {
      if (pill.dataset.accent === accentId) {
        pill.classList.add("active");
      } else {
        pill.classList.remove("active");
      }
    });
    if (precallAccentSelect) precallAccentSelect.value = accentId;
    const acc = getActiveAccent();
    bellaSubtext.innerText = `${acc.name} • ${acc.tagline}`;
  }

  // Mute / Unmute Button Handler
  muteBtn.addEventListener("click", () => {
    const isMuted = voiceController.toggleMute();
    muteBtn.classList.toggle("muted", isMuted);
    muteBtn.innerHTML = isMuted ? "🔇 Voice Muted" : "🔊 Voice Active";
  });

  // Accent Switcher Handler
  accentPills.forEach(pill => {
    pill.addEventListener("click", () => {
      accentPills.forEach(p => p.classList.remove("active"));
      pill.classList.add("active");
      const accentId = pill.dataset.accent;
      const accent = setActiveAccent(accentId);
      
      bellaSubtext.innerText = `${accent.name} • ${accent.tagline}`;
      voiceController.playPop(620, 0.06);

      const randomGreeting = accent.greetings[Math.floor(Math.random() * accent.greetings.length)];
      appendBellaMessage(randomGreeting, { accentTag: accent.name });
      voiceController.speak(randomGreeting, accent);
    });
  });

  // Cart Drawer Toggles
  function openCartDrawer() {
    cartDrawer.classList.add("open");
    cartDrawerOverlay.classList.add("open");
    voiceController.playPop(520, 0.05);
  }

  function closeCartDrawer() {
    cartDrawer.classList.remove("open");
    cartDrawerOverlay.classList.remove("open");
  }

  cartToggleBtn.addEventListener("click", openCartDrawer);
  cartCloseBtn.addEventListener("click", closeCartDrawer);
  cartDrawerOverlay.addEventListener("click", closeCartDrawer);

  // Full Menu Explorer Modal
  if (viewMenuHeaderBtn) {
    viewMenuHeaderBtn.addEventListener("click", () => {
      openFullMenuModal();
    });
  }

  if (fullMenuCloseBtn) {
    fullMenuCloseBtn.addEventListener("click", () => {
      fullMenuModal.classList.remove("open");
    });
  }

  // Quick Suggestion Chips Handler
  document.querySelectorAll(".quick-chip").forEach(chip => {
    chip.addEventListener("click", () => {
      const text = chip.dataset.text || chip.innerText;
      handleUserSubmit(text);
    });
  });

  // Client Demo Presentation Chips Handler
  document.querySelectorAll(".demo-chip").forEach(chip => {
    chip.addEventListener("click", () => {
      const speakText = chip.getAttribute("data-speak");
      if (speakText) {
        handleUserSubmit(speakText);
      }
    });
  });

  // Send Message Handler
  sendBtn.addEventListener("click", () => {
    const text = chatInput.value.trim();
    if (text) {
      handleUserSubmit(text);
      chatInput.value = "";
    }
  });

  chatInput.addEventListener("keydown", (e) => {
    if (e.key === "Enter" && !e.shiftKey) {
      e.preventDefault();
      const text = chatInput.value.trim();
      if (text) {
        handleUserSubmit(text);
        chatInput.value = "";
      }
    }
  });

  // Microphone Voice Input Handler
  micBtn.addEventListener("click", () => {
    if (voiceController.isListening) {
      voiceController.stopListening();
    } else {
      voiceController.startListening((transcript) => {
        if (transcript) {
          handleUserSubmit(transcript);
        }
      });
    }
  });

  orderEngine.onChange((summary) => {
    updateCartUI(summary);
  });

  function handleUserSubmit(userText) {
    appendUserMessage(userText);
    showTypingIndicator();

    setTimeout(() => {
      removeTypingIndicator();
      processBotResponse(userText);
    }, 400);
  }

  function appendUserMessage(text) {
    const row = document.createElement("div");
    row.className = "message-row user";
    row.innerHTML = `
      <div class="msg-bubble">${escapeHtml(text)}</div>
      <div class="msg-meta">You • ${getCurrentTime()}</div>
    `;
    chatStream.appendChild(row);
    scrollToBottom();
  }

  function appendBellaMessage(text, options = {}) {
    const row = document.createElement("div");
    row.className = "message-row bella";
    
    const accent = getActiveAccent();
    const tag = options.accentTag || accent.name;

    row.innerHTML = `
      <div class="msg-bubble">${text}</div>
      <div class="msg-meta">
        <span>Bella AI</span>
        <span class="accent-tag-inline">${tag}</span>
        <span>• ${getCurrentTime()}</span>
      </div>
    `;

    if (options.cards && options.cards.length > 0) {
      const cardsGrid = renderProductCards(options.cards);
      row.appendChild(cardsGrid);
    }

    chatStream.appendChild(row);
    scrollToBottom();
    voiceController.playChime();
  }

  function renderProductCards(items) {
    const grid = document.createElement("div");
    grid.className = "chat-products-grid";

    items.forEach(item => {
      const card = document.createElement("div");
      card.className = "product-card";
      
      const badgeHtml = item.badge ? `<span class="card-badge-top">${item.badge}</span>` : "";
      const imgUrl = item.image || "https://images.unsplash.com/photo-1565299585323-38d6b0865b47?w=500&auto=format&fit=crop&q=80";

      card.innerHTML = `
        <div class="card-media">
          <img src="${imgUrl}" alt="${escapeHtml(item.name)}" loading="lazy" onerror="this.src='https://images.unsplash.com/photo-1565299585323-38d6b0865b47?w=500&auto=format&fit=crop&q=80'">
          ${badgeHtml}
        </div>
        <div class="card-details">
          <div class="card-title-price">
            <span class="card-name">${escapeHtml(item.name)}</span>
            <span class="card-price">$${item.price.toFixed(2)}</span>
          </div>
          <p class="card-desc">${escapeHtml(item.description)}</p>
          <button class="card-add-btn" data-id="${item.id}">
            <span>+ Add to Order</span>
          </button>
        </div>
      `;

      card.querySelector(".card-add-btn").addEventListener("click", () => {
        promptCustomizeItem(item);
      });

      grid.appendChild(card);
    });

    return grid;
  }

  function showTypingIndicator() {
    const indicator = document.createElement("div");
    indicator.className = "message-row bella typing-row";
    indicator.id = "bella-typing";
    indicator.innerHTML = `
      <div class="msg-bubble typing-indicator">
        <span class="typing-dot"></span>
        <span class="typing-dot"></span>
        <span class="typing-dot"></span>
      </div>
    `;
    chatStream.appendChild(indicator);
    scrollToBottom();
  }

  function removeTypingIndicator() {
    const indicator = document.getElementById("bella-typing");
    if (indicator) indicator.remove();
  }

  function scrollToBottom() {
    chatStream.scrollTop = chatStream.scrollHeight;
  }

  // =======================================================
  // SUPER-EFFICIENT & MULTILINGUAL RESPONSE PROCESSOR
  // =======================================================
  function processBotResponse(userText) {
    const accent = getActiveAccent();
    const parsed = orderEngine.parseUserMessage(userText);
    const isSpanish = parsed.lang === "es";

    // 0. CONVERSATIONAL UPSELL CONFIRMATION (Handles "yes", "sure", "add it")
    if (parsed.intent === "upsell_confirm" && parsed.upsellItem) {
      orderEngine.addItem(parsed.upsellItem, 1);
      voiceController.playCartAdd();
      const summary = orderEngine.getSummary();
      const reply = isSpanish 
        ? `¡Perfecto amigo! Agregué <strong>${escapeHtml(parsed.upsellItem.name)}</strong> a su orden.<br>Subtotal actual: <strong>$${summary.subtotal.toFixed(2)}</strong>. ¿Desea algo más o cerramos la cuenta?`
        : `Awesome choice! Added <strong>${escapeHtml(parsed.upsellItem.name)}</strong> right to your ticket.<br>Subtotal: <strong>$${summary.subtotal.toFixed(2)}</strong>. Anything else for you, or ready to checkout?`;
      const speech = isSpanish
        ? `Perfecto, agregué ${parsed.upsellItem.name} a su orden. ¿Desea algo más?`
        : `Awesome! Added the ${parsed.upsellItem.name} to your ticket. Anything else I can get started for you, or ready to checkout?`;
      appendBellaMessage(reply);
      orderEngine.lastSpokenResponse = speech;
      voiceController.speak(speech, accent, isSpanish ? "es" : "en");
      return;
    }

    // 0B. CONVERSATIONAL UPSELL DECLINE (Handles "no", "no thanks", "i'm good")
    if (parsed.intent === "upsell_decline") {
      const reply = isSpanish
        ? `¡Entendido amigo! Sin problema. ¿Desea ordenar algo más o prefiere pagar ahora?`
        : `No problem at all! What else can I get started for you today, or are you ready to checkout?`;
      appendBellaMessage(reply);
      orderEngine.lastSpokenResponse = reply;
      voiceController.speak(reply, accent, isSpanish ? "es" : "en");
      return;
    }

    // 0C. ITEM REMOVAL INTENT ("remove the ramen", "take off quesatacos")
    if (parsed.intent === "order_remove") {
      const removed = orderEngine.removeItemByName(parsed.removeItemQuery || "");
      if (removed) {
        voiceController.playPop(350, 0.08);
        const summary = orderEngine.getSummary();
        const reply = isSpanish
          ? `He eliminado <strong>${escapeHtml(removed.menuItem.name)}</strong> de su orden.<br>Nuevo subtotal: <strong>$${summary.subtotal.toFixed(2)}</strong>.`
          : `Got it! I took the <strong>${escapeHtml(removed.menuItem.name)}</strong> off your ticket.<br>Updated subtotal: <strong>$${summary.subtotal.toFixed(2)}</strong>.`;
        const speech = isSpanish
          ? `Listo amigo, quité ${removed.menuItem.name} de su cuenta.`
          : `Got it! I removed ${removed.menuItem.name} from your ticket. Your updated subtotal is $${summary.subtotal.toFixed(2)}.`;
        appendBellaMessage(reply);
        orderEngine.lastSpokenResponse = speech;
        voiceController.speak(speech, accent, isSpanish ? "es" : "en");
      } else {
        const reply = isSpanish
          ? `No encontré ese platillo en su orden actual. Revise su carrito tocando el botón de arriba.`
          : `I couldn't find that item on your ticket right now. You can check your cart to see what's in your bag!`;
        appendBellaMessage(reply);
        orderEngine.lastSpokenResponse = reply;
        voiceController.speak(reply, accent, isSpanish ? "es" : "en");
      }
      return;
    }

    // 0D. REPEAT REQUEST ("repeat", "say that again", "what did you say")
    if (parsed.intent === "repeat_request") {
      const repeatSpeech = orderEngine.lastSpokenResponse || (isSpanish 
        ? "Le preguntaba qué delicioso platillo le preparamos hoy en Az Tacos King." 
        : "I was asking what delicious tacos or birria items I can get started for you today!");
      const reply = `🔄 <strong>Here's what I said:</strong><br><em>"${repeatSpeech}"</em>`;
      appendBellaMessage(reply);
      voiceController.speak(repeatSpeech, accent, isSpanish ? "es" : "en");
      return;
    }

    // 0E. FULFILLMENT & DELIVERY INQUIRIES
    if (parsed.intent === "fulfillment_info") {
      const reply = isSpanish
        ? `🛍️ <strong>Pickup:</strong> Gratis y listo en 15 a 20 minutos aquí en 2030 W Camelback Rd.<br>🚗 <strong>Delivery:</strong> Entrega a domicilio por solo $4.99 de envío.`
        : `🛍️ <strong>Pickup:</strong> Free and ready in about 15 to 20 minutes right here at 2030 W Camelback Rd.<br>🚗 <strong>Delivery:</strong> We deliver straight to your door with a $4.99 delivery fee!`;
      const speech = isSpanish
        ? "Ofrecemos pickup gratis listo en 15 a 20 minutos, y entrega a domicilio por 4 dólares y 99 centavos."
        : "We offer free pickup ready in 15 to 20 minutes right on Camelback Road, or delivery for a 4 dollar and 99 cent fee!";
      appendBellaMessage(reply);
      orderEngine.lastSpokenResponse = speech;
      voiceController.speak(speech, accent, isSpanish ? "es" : "en");
      return;
    }

    // 0F. FOOD, SPICE & INGREDIENT QUESTIONS
    if (parsed.intent === "food_info") {
      const reply = isSpanish
        ? `🔥 Nuestra famosa birria es 100% carne de res tierna, cocinada a fuego lento. Nuestra salsa verde es suave y la salsa roja tiene un rico picante. Servimos con limones frescos, cebolla y cilantro.`
        : `🔥 Our famous birria is 100% tender beef slow-simmered in rich Mexican spices. Our green salsa is mild and zesty, while our red salsa brings a savory kick! All tacos come with fresh lime wedges, onions, and cilantro.`;
      const speech = isSpanish
        ? "Nuestra birria es 100% carne de res. Tenemos salsa verde suave y salsa roja picosita."
        : "Our signature birria is 100% slow-simmered beef! Green salsa is mild and red salsa has a nice spicy kick.";
      appendBellaMessage(reply);
      orderEngine.lastSpokenResponse = speech;
      voiceController.speak(speech, accent, isSpanish ? "es" : "en");
      return;
    }

    // 1. COMPOUND / MULTI-ITEM ORDER TAKING (Highest Efficiency)
    if (parsed.intent === "order_add" && parsed.itemsFound.length > 0) {
      let addedItemsSummary = [];
      let totalItemsCount = 0;

      parsed.itemsFound.forEach(match => {
        orderEngine.addItem(match.item, match.quantity, match.modifiers);
        voiceController.playCartAdd();

        let detail = `${match.quantity}x ${match.item.name}`;
        const mods = [];
        if (match.modifiers.meat) mods.push(match.modifiers.meat);
        if (match.modifiers.flavor) mods.push(match.modifiers.flavor);
        if (match.modifiers.noOnion) mods.push(isSpanish ? "Sin cebolla" : "No onion");
        if (match.modifiers.noCilantro) mods.push(isSpanish ? "Sin cilantro" : "No cilantro");
        if (mods.length > 0) detail += ` (${mods.join(", ")})`;

        addedItemsSummary.push(detail);
        totalItemsCount += match.quantity;
      });

      const summary = orderEngine.getSummary();

      let reply = "";
      let speechText = "";

      if (isSpanish) {
        reply = `<strong>¡Listo amigo!</strong><br>Agregué a su orden: <em>${addedItemsSummary.join(" + ")}</em>.<br><br>Subtotal actual: <strong>$${summary.subtotal.toFixed(2)}</strong>.`;
        speechText = `Listo amigo. Agregué a su orden ${addedItemsSummary.join(", ")}. El subtotal es $${summary.subtotal.toFixed(2)} dólares. ¿Desea algo más?`;
      } else if (parsed.lang === "fr") {
        reply = `<strong>C'est noté !</strong><br>Ajouté à votre commande : <em>${addedItemsSummary.join(" + ")}</em>.<br><br>Sous-total : <strong>$${summary.subtotal.toFixed(2)}</strong>.`;
        speechText = `Perfect! Added ${addedItemsSummary.join(", ")} to your order. Subtotal is $${summary.subtotal.toFixed(2)}. Anything else?`;
      } else {
        const affirmation = accent.orderAffirmation[Math.floor(Math.random() * accent.orderAffirmation.length)];
        reply = `<strong>${affirmation}</strong><br>Added to your ticket: <em>${addedItemsSummary.join(" + ")}</em>.<br><br>Subtotal: <strong>$${summary.subtotal.toFixed(2)}</strong> (${summary.itemCount} items).`;
        speechText = `${affirmation} Added ${addedItemsSummary.join(", ")} to your order. Your subtotal is $${summary.subtotal.toFixed(2)}. Would you like anything else?`;
      }

      // Smart Upsell Suggestion & Dialogue Context
      const hasConsomeInCart = orderEngine.cart.some(entry => entry.menuItem.id.includes("consome"));
      const addedTaco = parsed.itemsFound.some(m => m.item.id.includes("taco"));
      let upsellCards = [];

      if (addedTaco && !hasConsomeInCart) {
        reply += `<br><br>💡 ${isSpanish ? accent.upsellConsomeSpanish : accent.upsellConsome}`;
        const consomeItem = MENU_ITEMS.find(i => i.id === "item_consome_cup");
        if (consomeItem) {
          upsellCards.push(consomeItem);
          orderEngine.lastUpsellItem = consomeItem; // Track pending upsell!
        }
      } else {
        const hasDrink = orderEngine.cart.some(entry => entry.menuItem.category === "Beverages & Drinks");
        if (!hasDrink) {
          reply += `<br><br>🥤 ${isSpanish ? accent.upsellDrinkSpanish : accent.upsellDrink}`;
          const drinkItem = MENU_ITEMS.find(i => i.id === "item_mexican_bottle");
          if (drinkItem) {
            upsellCards.push(drinkItem);
            orderEngine.lastUpsellItem = drinkItem; // Track pending upsell!
          }
        }
      }

      const langTag = isSpanish ? "Español / Spanish" : parsed.lang !== "en" ? `${parsed.lang.toUpperCase()} Detected` : accent.name;
      appendBellaMessage(reply, { cards: upsellCards, accentTag: langTag });
      orderEngine.lastSpokenResponse = speechText;
      voiceController.speak(speechText, accent, isSpanish ? "es" : "en");
      return;
    }

    // 2. CHECKOUT INTENT
    if (parsed.intent === "checkout") {
      const summary = orderEngine.getSummary();
      if (summary.itemCount === 0) {
        const reply = isSpanish 
          ? "Su carrito está vacío. Dígame qué le gustaría ordenar para comenzar." 
          : "Your cart is currently empty! Tell me what you'd like to eat to start your order.";
        appendBellaMessage(reply);
        orderEngine.lastSpokenResponse = reply;
        voiceController.speak(reply, accent, isSpanish ? "es" : "en");
        return;
      }

      const reply = isSpanish
        ? `¡Perfecto! Tiene ${summary.itemCount} artículo(s) por un total de <strong>$${summary.total.toFixed(2)}</strong>.<br>${accent.checkoutPromptSpanish}`
        : `Alright! You have ${summary.itemCount} item(s) on your ticket for a total of <strong>$${summary.total.toFixed(2)}</strong>.<br>${accent.checkoutPrompt}`;
      
      appendBellaMessage(reply);
      orderEngine.lastSpokenResponse = reply.replace(/<[^>]*>?/gm, '');
      voiceController.speak(reply.replace(/<[^>]*>?/gm, ''), accent, isSpanish ? "es" : "en");
      openCartDrawer();
      return;
    }

    // 3. VIEW CART INTENT
    if (parsed.intent === "view_cart") {
      const summary = orderEngine.getSummary();
      if (summary.itemCount === 0) {
        const reply = isSpanish
          ? "Aún no tiene nada en su bolsa. Pruebe pidiendo: <em>'3 quesatacos'</em> o <em>'Birria Ramen'</em>."
          : "You don't have any items in your bag yet. Try ordering: <em>'3 quesatacos'</em> or <em>'Birria Ramen'</em>!";
        appendBellaMessage(reply);
        orderEngine.lastSpokenResponse = reply.replace(/<[^>]*>?/gm, '');
        voiceController.speak(reply.replace(/<[^>]*>?/gm, ''), accent, isSpanish ? "es" : "en");
      } else {
        let listText = summary.items.map(it => `• ${it.quantity}x ${it.menuItem.name} ($${(it.quantity * it.menuItem.price).toFixed(2)})`).join("<br>");
        const reply = isSpanish
          ? `${accent.cartSummaryIntroSpanish}<br><br>${listText}<br><br><strong>Subtotal:</strong> $${summary.subtotal.toFixed(2)}<br>¿Desea pagar o agregar algo más?`
          : `${accent.cartSummaryIntro}<br><br>${listText}<br><br><strong>Subtotal:</strong> $${summary.subtotal.toFixed(2)}<br>Ready to checkout, or would you like to add anything else?`;
        appendBellaMessage(reply);
        const speech = isSpanish ? `Tiene ${summary.itemCount} artículos con un subtotal de $${summary.subtotal.toFixed(2)} dólares.` : `${accent.cartSummaryIntro} You have ${summary.itemCount} items for $${summary.subtotal.toFixed(2)}.`;
        orderEngine.lastSpokenResponse = speech;
        voiceController.speak(speech, accent, isSpanish ? "es" : "en");
        openCartDrawer();
      }
      return;
    }

    // 4. CLEAR CART
    if (parsed.intent === "order_clear") {
      orderEngine.clearCart();
      const reply = isSpanish ? "He vaciado su carrito. ¿Con qué empezamos de nuevo?" : "I've cleared your order cart! What would you like to start with fresh?";
      appendBellaMessage(reply);
      orderEngine.lastSpokenResponse = reply;
      voiceController.speak(reply, accent, isSpanish ? "es" : "en");
      return;
    }

    // 5. RECOMMENDATIONS & BEST SELLERS
    if (parsed.intent === "recommendations") {
      const bestSellers = MENU_ITEMS.filter(i => i.popular).slice(0, 3);
      const reply = isSpanish
        ? `Nuestros platillos más populares aquí en Phoenix son el <strong>Combo de 3 Quesatacos con Consomé y Agua Fresca ($13.99)</strong>, el <strong>Birria Ramen ($15.00)</strong>, y la <strong>Caja Familiar de 50 Tacos ($50.00)</strong>:`
        : `Our biggest hits right here in Phoenix are the <strong>3 Quesataco Combo with Consomé & Agua Fresca ($13.99)</strong>, the viral <strong>Birria Ramen ($15.00)</strong>, and our <strong>$50 Family Taco Box</strong>! Here they are:`;
      appendBellaMessage(reply, { cards: bestSellers });
      const speech = reply.replace(/<[^>]*>?/gm, '');
      orderEngine.lastSpokenResponse = speech;
      voiceController.speak(speech, accent, isSpanish ? "es" : "en");
      return;
    }

    // 6. MENU & CATEGORIES
    if (parsed.intent === "menu_inquiry") {
      const combos = MENU_ITEMS.filter(i => i.category === "Combos & Specials").slice(0, 3);
      const reply = isSpanish
        ? `Aquí tiene algunos de nuestros mejores combos y especiales de Birria Kingz. Puede tocar <em>+ Add to Order</em> o simplemente decirme qué se le antoja:`
        : `Here are some of our legendary Birria Kingz combos & specials! You can tap <em>+ Add to Order</em> on any item or just tell me what you'd like:`;
      appendBellaMessage(reply, { cards: combos });
      const speech = reply.replace(/<[^>]*>?/gm, '');
      orderEngine.lastSpokenResponse = speech;
      voiceController.speak(speech, accent, isSpanish ? "es" : "en");
      return;
    }

    // 7. DIETARY (Keto, Gluten, etc.)
    if (parsed.intent === "dietary") {
      const ketoItem = MENU_ITEMS.find(i => i.id === "item_keto_taco");
      const reply = isSpanish
        ? `¡Sí! Tenemos nuestro <strong>Keto Taco ($3.50)</strong> con costra de queso dorada 100% libre de carbohidratos. Además, nuestro Consomé natural no tiene gluten.`
        : `Yes! We have our signature <strong>Keto Taco ($3.50)</strong> made with a 100% crispy melted cheese shell instead of a tortilla—zero carbs and pure birria flavor! Our Consomé is also low-carb and naturally gluten-free.`;
      appendBellaMessage(reply, { cards: ketoItem ? [ketoItem] : [] });
      const speech = reply.replace(/<[^>]*>?/gm, '');
      orderEngine.lastSpokenResponse = speech;
      voiceController.speak(speech, accent, isSpanish ? "es" : "en");
      return;
    }

    // 8. LOCATION & HOURS
    if (parsed.intent === "location_info") {
      const reply = isSpanish
        ? `📍 <strong>Az Tacos King / Birria Kingz</strong><br>
           Dirección: <strong>${RESTAURANT_INFO.address}</strong><br>
           Horario: <strong>${RESTAURANT_INFO.hours}</strong><br>
           Teléfono: <strong>${RESTAURANT_INFO.phoneDisplay}</strong><br>
           ¡Estamos abiertos para Pickup y Entrega a domicilio!`
        : `📍 <strong>Az Tacos King / Birria Kingz</strong><br>
           Address: <strong>${RESTAURANT_INFO.address}</strong><br>
           Hours: <strong>${RESTAURANT_INFO.hours}</strong><br>
           Phone: <strong>${RESTAURANT_INFO.phoneDisplay}</strong><br>
           We are ready for Pickup and Delivery right now!`;
      appendBellaMessage(reply);
      const speech = isSpanish ? "Az Tacos King está ubicado en 2030 West Camelback Road en Phoenix. Estamos abiertos todos los días." : "Az Tacos King is located at 2030 West Camelback Road in Phoenix.";
      orderEngine.lastSpokenResponse = speech;
      voiceController.speak(speech, accent, isSpanish ? "es" : "en");
      return;
    }

    // 9. GREETINGS
    if (parsed.intent === "greeting") {
      const greeting = isSpanish ? accent.spanishGreeting : accent.greetings[Math.floor(Math.random() * accent.greetings.length)];
      appendBellaMessage(greeting);
      orderEngine.lastSpokenResponse = greeting;
      voiceController.speak(greeting, accent, isSpanish ? "es" : "en");
      return;
    }

    // 10. DEFAULT INTENT / MULTILINGUAL CATCH-ALL
    const defaultReply = isSpanish
      ? `¡Estoy a sus órdenes! Dígame qué desea ordenar, por ejemplo: <em>"Quiero 3 quesatacos y un consomé"</em>, <em>"Un birria ramen"</em>, o <em>"Ver el menú"</em>.`
      : `I'm right here with ya! Tell me what you'd like to eat—for example: <em>"Add 3 quesatacos"</em>, <em>"Birria Ramen"</em>, or <em>"Show me the combos"</em>!`;
    appendBellaMessage(defaultReply);
    const speech = defaultReply.replace(/<[^>]*>?/gm, '');
    orderEngine.lastSpokenResponse = speech;
    voiceController.speak(speech, accent, isSpanish ? "es" : "en");
  }

  // Update Cart UI
  function updateCartUI(summary) {
    cartBadge.innerText = summary.itemCount;
    cartBadge.classList.add("bounce");
    setTimeout(() => cartBadge.classList.remove("bounce"), 350);

    if (summary.items.length === 0) {
      drawerItemsList.innerHTML = `
        <div class="cart-empty-state">
          <span class="emoji">🌮</span>
          <h4>Your bag is empty</h4>
          <p>Order tacos, birria ramen, or drinks to get started!</p>
        </div>
      `;
      checkoutBtn.disabled = true;
      checkoutBtn.style.opacity = "0.5";
    } else {
      checkoutBtn.disabled = false;
      checkoutBtn.style.opacity = "1";
      drawerItemsList.innerHTML = "";

      summary.items.forEach(entry => {
        const itemCard = document.createElement("div");
        itemCard.className = "cart-item-card";

        let modText = "";
        if (entry.modifiers && Object.keys(entry.modifiers).length > 0) {
          const mods = [];
          if (entry.modifiers.meat) mods.push(`Meat: ${entry.modifiers.meat}`);
          if (entry.modifiers.agua) mods.push(`Agua: ${entry.modifiers.agua}`);
          if (entry.modifiers.salsa) mods.push(`Salsa: ${entry.modifiers.salsa}`);
          if (entry.modifiers.style) mods.push(`Style: ${entry.modifiers.style}`);
          if (entry.modifiers.flavor) mods.push(`Flavor: ${entry.modifiers.flavor}`);
          if (entry.modifiers.noOnion) mods.push(`No Onion`);
          if (entry.modifiers.noCilantro) mods.push(`No Cilantro`);
          if (entry.modifiers.extraConsome) mods.push(`+ Extra Consomé ($3.00)`);
          if (mods.length > 0) modText = `<div class="cart-item-modifiers">${mods.join(" • ")}</div>`;
        }

        const itemUnitPrice = entry.menuItem.price + (entry.modifiers && entry.modifiers.extraConsome ? 3.00 : 0);
        const lineTotal = (itemUnitPrice * entry.quantity).toFixed(2);

        itemCard.innerHTML = `
          <div class="cart-item-top">
            <span class="cart-item-name">${escapeHtml(entry.menuItem.name)}</span>
            <span class="cart-item-price">$${lineTotal}</span>
          </div>
          ${modText}
          <div class="cart-item-bottom">
            <div class="qty-stepper">
              <button class="qty-btn btn-minus" data-id="${entry.id}">-</button>
              <span class="qty-number">${entry.quantity}</span>
              <button class="qty-btn btn-plus" data-id="${entry.id}">+</button>
            </div>
            <button class="remove-item-btn" data-id="${entry.id}">Remove</button>
          </div>
        `;

        itemCard.querySelector(".btn-minus").addEventListener("click", () => {
          orderEngine.updateQuantity(entry.id, entry.quantity - 1);
        });

        itemCard.querySelector(".btn-plus").addEventListener("click", () => {
          orderEngine.updateQuantity(entry.id, entry.quantity + 1);
        });

        itemCard.querySelector(".remove-item-btn").addEventListener("click", () => {
          orderEngine.removeItem(entry.id);
        });

        drawerItemsList.appendChild(itemCard);
      });
    }

    const deliveryRow = document.getElementById("cart-delivery-row");
    const deliveryEl = document.getElementById("cart-delivery-amount");
    if (deliveryRow && deliveryEl) {
      if (summary.fulfillment === "delivery") {
        deliveryRow.style.display = "flex";
        deliveryEl.innerText = `$${summary.deliveryFee.toFixed(2)}`;
      } else {
        deliveryRow.style.display = "none";
      }
    }

    subtotalEl.innerText = `$${summary.subtotal.toFixed(2)}`;
    taxEl.innerText = `$${summary.tax.toFixed(2)}`;
    tipEl.innerText = `$${summary.tip.toFixed(2)}`;
    grandTotalEl.innerText = `$${summary.total.toFixed(2)}`;
  }

  document.querySelectorAll(".tip-pill").forEach(pill => {
    pill.addEventListener("click", () => {
      document.querySelectorAll(".tip-pill").forEach(p => p.classList.remove("active"));
      pill.classList.add("active");
      const tipVal = parseInt(pill.dataset.tip);
      orderEngine.setTip(tipVal);
    });
  });

  document.querySelectorAll(".fulfillment-btn").forEach(btn => {
    btn.addEventListener("click", () => {
      document.querySelectorAll(".fulfillment-btn").forEach(b => b.classList.remove("active"));
      btn.classList.add("active");
      const mode = btn.dataset.mode;
      orderEngine.setFulfillment(mode);
    });
  });

  checkoutBtn.addEventListener("click", () => {
    const summary = orderEngine.getSummary();
    if (summary.itemCount === 0) return;

    closeCartDrawer();
    voiceController.playOrderSuccess();

    document.getElementById("receipt-order-id").innerText = summary.orderId;
    document.getElementById("receipt-address").innerText = summary.fulfillment === "pickup" 
      ? `Pickup at: ${RESTAURANT_INFO.address}` 
      : `Delivery to customer address`;

    const receiptItemsContainer = document.getElementById("receipt-items-container");
    receiptItemsContainer.innerHTML = "";

    summary.items.forEach(entry => {
      const row = document.createElement("div");
      row.className = "receipt-row";
      const itemUnitPrice = entry.menuItem.price + (entry.modifiers && entry.modifiers.extraConsome ? 3.00 : 0);
      const lineTotal = (itemUnitPrice * entry.quantity).toFixed(2);
      const extraTag = entry.modifiers && entry.modifiers.extraConsome ? ' <span style="color: var(--gold); font-size: 11px;">(+Consomé)</span>' : '';
      row.innerHTML = `
        <span>${entry.quantity}x ${escapeHtml(entry.menuItem.name)}${extraTag}</span>
        <span>$${lineTotal}</span>
      `;
      receiptItemsContainer.appendChild(row);
    });

    const receiptDeliveryRow = document.getElementById("receipt-delivery-row");
    const receiptDeliveryEl = document.getElementById("receipt-delivery-amount");
    if (receiptDeliveryRow && receiptDeliveryEl) {
      if (summary.fulfillment === "delivery") {
        receiptDeliveryRow.style.display = "flex";
        receiptDeliveryEl.innerText = `$${summary.deliveryFee.toFixed(2)}`;
      } else {
        receiptDeliveryRow.style.display = "none";
      }
    }

    document.getElementById("receipt-subtotal").innerText = `$${summary.subtotal.toFixed(2)}`;
    document.getElementById("receipt-tax").innerText = `$${summary.tax.toFixed(2)}`;
    document.getElementById("receipt-tip").innerText = `$${summary.tip.toFixed(2)}`;
    document.getElementById("receipt-total").innerText = `$${summary.total.toFixed(2)}`;

    receiptModal.classList.add("open");

    const accent = getActiveAccent();
    const voiceMsg = `${accent.thanks} Your order ${summary.orderId} for $${summary.total.toFixed(2)} is confirmed for pickup on Camelback Road. Estimated prep time is 15 to 20 minutes!`;
    voiceController.speak(voiceMsg, accent);
  });

  receiptCloseBtn.addEventListener("click", () => {
    receiptModal.classList.remove("open");
  });

  function updateCustomizeModalPrice() {
    if (!pendingCustomItem) return;
    const qty = Math.max(1, parseInt(document.getElementById("custom-qty-input").value) || 1);
    const extraConsome = document.getElementById("custom-extra-consome-check")?.checked ? 3.00 : 0.00;
    const total = (pendingCustomItem.price + extraConsome) * qty;
    document.getElementById("custom-item-price").innerText = `$${total.toFixed(2)}`;
  }

  const customQtyInput = document.getElementById("custom-qty-input");
  const customConsomeCheck = document.getElementById("custom-extra-consome-check");
  if (customQtyInput) {
    customQtyInput.addEventListener("input", updateCustomizeModalPrice);
    customQtyInput.addEventListener("change", updateCustomizeModalPrice);
  }
  if (customConsomeCheck) {
    customConsomeCheck.addEventListener("change", updateCustomizeModalPrice);
  }

  function promptCustomizeItem(item) {
    pendingCustomItem = item;
    document.getElementById("custom-item-name").innerText = item.name;
    
    // Reset modal state to defaults
    if (customQtyInput) customQtyInput.value = "1";
    if (customConsomeCheck) customConsomeCheck.checked = false;
    updateCustomizeModalPrice();
    
    const meatGroup = document.getElementById("custom-meat-group");
    const meatSelect = document.getElementById("custom-meat-select");
    if (item.options && (item.options.meat || item.options.meat1)) {
      meatGroup.style.display = "block";
      meatSelect.innerHTML = "";
      const meats = item.options.meat || item.options.meat1;
      meats.forEach(m => {
        const opt = document.createElement("option");
        opt.value = m;
        opt.innerText = m;
        meatSelect.appendChild(opt);
      });
    } else {
      meatGroup.style.display = "none";
    }

    const aguaGroup = document.getElementById("custom-agua-group");
    const aguaSelect = document.getElementById("custom-agua-select");
    if (item.options && item.options.agua) {
      aguaGroup.style.display = "block";
      aguaSelect.innerHTML = "";
      item.options.agua.forEach(a => {
        const opt = document.createElement("option");
        opt.value = a;
        opt.innerText = a;
        aguaSelect.appendChild(opt);
      });
    } else {
      aguaGroup.style.display = "none";
    }

    customizeModal.classList.add("open");
  }

  document.getElementById("custom-confirm-btn").addEventListener("click", () => {
    if (!pendingCustomItem) return;

    const qty = parseInt(document.getElementById("custom-qty-input").value) || 1;
    const modifiers = {};

    const meatSelect = document.getElementById("custom-meat-select");
    if (meatSelect && meatSelect.offsetParent !== null) {
      modifiers.meat = meatSelect.value;
    }

    const aguaSelect = document.getElementById("custom-agua-select");
    if (aguaSelect && aguaSelect.offsetParent !== null) {
      modifiers.agua = aguaSelect.value;
    }

    const extraConsome = document.getElementById("custom-extra-consome-check");
    if (extraConsome && extraConsome.checked) {
      modifiers.extraConsome = true;
    }

    orderEngine.addItem(pendingCustomItem, qty, modifiers);
    voiceController.playCartAdd();

    customizeModal.classList.remove("open");
    openCartDrawer();
  });

  customizeCloseBtn.addEventListener("click", () => {
    customizeModal.classList.remove("open");
  });

  // Click on backdrop to close modals
  customizeModal.addEventListener("click", (e) => {
    if (e.target === customizeModal) customizeModal.classList.remove("open");
  });
  fullMenuModal.addEventListener("click", (e) => {
    if (e.target === fullMenuModal) fullMenuModal.classList.remove("open");
  });
  receiptModal.addEventListener("click", (e) => {
    if (e.target === receiptModal) receiptModal.classList.remove("open");
  });

  function openFullMenuModal() {
    const listEl = document.getElementById("full-menu-list");
    listEl.innerHTML = "";

    MENU_CATEGORIES.forEach(cat => {
      if (cat === "All Items") return;
      const catItems = MENU_ITEMS.filter(it => it.category === cat);
      if (catItems.length === 0) return;

      const catHeader = document.createElement("h4");
      catHeader.style.cssText = "margin-top: 14px; margin-bottom: 8px; color: var(--gold); font-size: 14px; border-bottom: 1px solid var(--border-subtle); padding-bottom: 4px;";
      catHeader.innerText = cat;
      listEl.appendChild(catHeader);

      catItems.forEach(item => {
        const row = document.createElement("div");
        row.style.cssText = "display: flex; justify-content: space-between; align-items: center; padding: 8px 0; border-bottom: 1px dashed rgba(255,255,255,0.06);";
        row.innerHTML = `
          <div>
            <div style="font-weight: 700; font-size: 13px;">${escapeHtml(item.name)}</div>
            <div style="font-size: 11px; color: var(--text-muted);">${escapeHtml(item.description)}</div>
          </div>
          <div style="display: flex; align-items: center; gap: 10px; margin-left: 12px;">
            <span style="font-weight: 800; color: var(--gold); font-size: 13px;">$${item.price.toFixed(2)}</span>
            <button class="btn-primary" style="padding: 4px 10px; font-size: 11px;" data-id="${item.id}">+ Add</button>
          </div>
        `;
        row.querySelector("button").addEventListener("click", () => {
          promptCustomizeItem(item);
          fullMenuModal.classList.remove("open");
        });
        listEl.appendChild(row);
      });
    });

    fullMenuModal.classList.add("open");
  }

  function escapeHtml(str) {
    if (!str) return "";
    return str
      .replace(/&/g, "&amp;")
      .replace(/</g, "&lt;")
      .replace(/>/g, "&gt;")
      .replace(/"/g, "&quot;")
      .replace(/'/g, "&#039;");
  }

  function getCurrentTime() {
    const now = new Date();
    return now.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' });
  }

  // Tap or click anywhere to interrupt Bella immediately if speaking
  document.addEventListener("click", (e) => {
    if (voiceController.isSpeaking && !e.target.closest("button") && !e.target.closest("input") && !e.target.closest("select")) {
      voiceController.stopSpeaking();
    }
  });

  // Spacebar or Escape to interrupt Bella immediately (without interfering with input fields)
  document.addEventListener("keydown", (e) => {
    const isFormElement = document.activeElement && ['INPUT', 'SELECT', 'TEXTAREA'].includes(document.activeElement.tagName);
    if ((e.key === "Escape" || (e.key === " " && !isFormElement)) && voiceController.isSpeaking) {
      voiceController.stopSpeaking();
    }
  });
});
