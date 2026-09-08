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
    if (state.isSpeaking) {
      bellaAvatarRing.classList.add("speaking");
      soundwaveIndicator.classList.add("active");
      if (liveVoiceBadge) {
        liveVoiceBadge.style.display = "inline-flex";
        liveVoiceBadge.className = "live-voice-badge speaking";
        if (liveVoiceStatusText) liveVoiceStatusText.innerHTML = "🔊 Bella is speaking...";
      }
    } else {
      bellaAvatarRing.classList.remove("speaking");
      soundwaveIndicator.classList.remove("active");
    }

    if (state.isListening) {
      micBtn.classList.add("listening");
      micBtn.innerHTML = "🎙️";
      if (liveVoiceBadge) {
        liveVoiceBadge.style.display = "inline-flex";
        liveVoiceBadge.className = "live-voice-badge listening";
        if (liveVoiceStatusText) liveVoiceStatusText.innerHTML = "🟢 Bella is listening... Speak anytime!";
      }
      if (liveSpeechToast) {
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
      callScreenOverlay.classList.remove("hidden");
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

      // Smart Upsell Suggestion
      const hasConsomeInCart = orderEngine.cart.some(entry => entry.menuItem.id.includes("consome"));
      const addedTaco = parsed.itemsFound.some(m => m.item.id.includes("taco"));
      let upsellCards = [];

      if (addedTaco && !hasConsomeInCart) {
        reply += `<br><br>💡 ${isSpanish ? accent.upsellConsomeSpanish : accent.upsellConsome}`;
        const consomeItem = MENU_ITEMS.find(i => i.id === "item_consome_cup");
        if (consomeItem) upsellCards.push(consomeItem);
      } else {
        const hasDrink = orderEngine.cart.some(entry => entry.menuItem.category === "Beverages & Drinks");
        if (!hasDrink) {
          reply += `<br><br>🥤 ${isSpanish ? accent.upsellDrinkSpanish : accent.upsellDrink}`;
          const drinkItem = MENU_ITEMS.find(i => i.id === "item_mexican_bottle");
          if (drinkItem) upsellCards.push(drinkItem);
        }
      }

      const langTag = isSpanish ? "Español / Spanish" : parsed.lang !== "en" ? `${parsed.lang.toUpperCase()} Detected` : accent.name;
      appendBellaMessage(reply, { cards: upsellCards, accentTag: langTag });
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
        voiceController.speak(reply, accent, isSpanish ? "es" : "en");
        return;
      }

      const reply = isSpanish
        ? `¡Perfecto! Tiene ${summary.itemCount} artículo(s) por un total de <strong>$${summary.total.toFixed(2)}</strong>.<br>${accent.checkoutPromptSpanish}`
        : `Alright! You have ${summary.itemCount} item(s) on your ticket for a total of <strong>$${summary.total.toFixed(2)}</strong>.<br>${accent.checkoutPrompt}`;
      
      appendBellaMessage(reply);
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
        voiceController.speak(reply.replace(/<[^>]*>?/gm, ''), accent, isSpanish ? "es" : "en");
      } else {
        let listText = summary.items.map(it => `• ${it.quantity}x ${it.menuItem.name} ($${(it.quantity * it.menuItem.price).toFixed(2)})`).join("<br>");
        const reply = isSpanish
          ? `${accent.cartSummaryIntroSpanish}<br><br>${listText}<br><br><strong>Subtotal:</strong> $${summary.subtotal.toFixed(2)}<br>¿Desea pagar o agregar algo más?`
          : `${accent.cartSummaryIntro}<br><br>${listText}<br><br><strong>Subtotal:</strong> $${summary.subtotal.toFixed(2)}<br>Ready to checkout, or would you like to add anything else?`;
        appendBellaMessage(reply);
        voiceController.speak(isSpanish ? `Tiene ${summary.itemCount} artículos con un subtotal de $${summary.subtotal.toFixed(2)} dólares.` : `${accent.cartSummaryIntro} You have ${summary.itemCount} items for $${summary.subtotal.toFixed(2)}.`, accent, isSpanish ? "es" : "en");
        openCartDrawer();
      }
      return;
    }

    // 4. CLEAR CART
    if (parsed.intent === "order_clear") {
      orderEngine.clearCart();
      const reply = isSpanish ? "He vaciado su carrito. ¿Con qué empezamos de nuevo?" : "I've cleared your order cart! What would you like to start with fresh?";
      appendBellaMessage(reply);
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
      voiceController.speak(reply.replace(/<[^>]*>?/gm, ''), accent, isSpanish ? "es" : "en");
      return;
    }

    // 6. MENU & CATEGORIES
    if (parsed.intent === "menu_inquiry") {
      const combos = MENU_ITEMS.filter(i => i.category === "Combos & Specials").slice(0, 3);
      const reply = isSpanish
        ? `Aquí tiene algunos de nuestros mejores combos y especiales de Birria Kingz. Puede tocar <em>+ Add to Order</em> o simplemente decirme qué se le antoja:`
        : `Here are some of our legendary Birria Kingz combos & specials! You can tap <em>+ Add to Order</em> on any item or just tell me what you'd like:`;
      appendBellaMessage(reply, { cards: combos });
      voiceController.speak(reply.replace(/<[^>]*>?/gm, ''), accent, isSpanish ? "es" : "en");
      return;
    }

    // 7. DIETARY (Keto, Gluten, etc.)
    if (parsed.intent === "dietary") {
      const ketoItem = MENU_ITEMS.find(i => i.id === "item_keto_taco");
      const reply = isSpanish
        ? `¡Sí! Tenemos nuestro <strong>Keto Taco ($3.50)</strong> con costra de queso dorada 100% libre de carbohidratos. Además, nuestro Consomé natural no tiene gluten.`
        : `Yes! We have our signature <strong>Keto Taco ($3.50)</strong> made with a 100% crispy melted cheese shell instead of a tortilla—zero carbs and pure birria flavor! Our Consomé is also low-carb and naturally gluten-free.`;
      appendBellaMessage(reply, { cards: ketoItem ? [ketoItem] : [] });
      voiceController.speak(reply.replace(/<[^>]*>?/gm, ''), accent, isSpanish ? "es" : "en");
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
      voiceController.speak(isSpanish ? "Az Tacos King está ubicado en 2030 West Camelback Road en Phoenix. Estamos abiertos todos los días." : "Az Tacos King is located at 2030 West Camelback Road in Phoenix.", accent, isSpanish ? "es" : "en");
      return;
    }

    // 9. GREETINGS
    if (parsed.intent === "greeting") {
      const greeting = isSpanish ? accent.spanishGreeting : accent.greetings[Math.floor(Math.random() * accent.greetings.length)];
      appendBellaMessage(greeting);
      voiceController.speak(greeting, accent, isSpanish ? "es" : "en");
      return;
    }

    // 10. DEFAULT INTENT / MULTILINGUAL CATCH-ALL
    const defaultReply = isSpanish
      ? `¡Estoy a sus órdenes! Dígame qué desea ordenar, por ejemplo: <em>"Quiero 3 quesatacos y un consomé"</em>, <em>"Un birria ramen"</em>, o <em>"Ver el menú"</em>.`
      : `I'm right here with ya! Tell me what you'd like to eat—for example: <em>"Add 3 quesatacos"</em>, <em>"Birria Ramen"</em>, or <em>"Show me the combos"</em>!`;
    appendBellaMessage(defaultReply);
    voiceController.speak(defaultReply.replace(/<[^>]*>?/gm, ''), accent, isSpanish ? "es" : "en");
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

        const lineTotal = (entry.menuItem.price * entry.quantity).toFixed(2);

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
      row.innerHTML = `
        <span>${entry.quantity}x ${escapeHtml(entry.menuItem.name)}</span>
        <span>$${(entry.menuItem.price * entry.quantity).toFixed(2)}</span>
      `;
      receiptItemsContainer.appendChild(row);
    });

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

  function promptCustomizeItem(item) {
    pendingCustomItem = item;
    document.getElementById("custom-item-name").innerText = item.name;
    document.getElementById("custom-item-price").innerText = `$${item.price.toFixed(2)}`;
    
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
});
