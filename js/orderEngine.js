// Super-Forgiving & Efficient Natural Language Order Engine for Bella AI
// Handles any accent, colloquialism, compound orders & multiple languages

class OrderEngine {
  constructor() {
    this.cart = [];
    this.fulfillment = "pickup";
    this.deliveryAddress = "";
    this.tipPercent = 15;
    this.customTip = null;
    this.orderCounter = Math.floor(1000 + Math.random() * 9000);
    this.listeners = [];
    this.lastUpsellItem = null;
    this.lastSpokenResponse = "";
  }

  onChange(callback) {
    this.listeners.push(callback);
  }

  notify() {
    this.listeners.forEach(cb => cb(this.getSummary()));
  }

  addItem(menuItem, quantity = 1, modifiers = {}) {
    const qty = Math.max(1, parseInt(quantity) || 1);
    
    const existingIndex = this.cart.findIndex(entry => 
      entry.menuItem.id === menuItem.id && 
      JSON.stringify(entry.modifiers) === JSON.stringify(modifiers)
    );

    if (existingIndex > -1) {
      this.cart[existingIndex].quantity += qty;
    } else {
      this.cart.push({
        id: "cart_" + Date.now() + "_" + Math.random().toString(36).substr(2, 4),
        menuItem: menuItem,
        quantity: qty,
        modifiers: modifiers
      });
    }

    this.notify();
    return { success: true, item: menuItem, quantity: qty, modifiers };
  }

  removeItem(cartItemId) {
    this.cart = this.cart.filter(item => item.id !== cartItemId);
    this.notify();
  }

  removeItemByName(keyword) {
    if (!keyword || !this.cart.length) return null;
    const raw = keyword.toLowerCase().trim();
    // Clean out conversational filler words and command verbs that might be attached
    const cleanKw = raw.replace(/\b(wait|hey|can you|could you|please|actually|just|the|an|a|my|order of|orden de|cancel|remove|delete|drop|take off|take out|quitar|eliminar)\b/gi, " ").replace(/\s+/g, " ").trim();
    
    // 1. Try exact or partial substring match in name, id, or modifiers
    let index = this.cart.findIndex(entry => 
      entry.menuItem.name.toLowerCase().includes(cleanKw) ||
      entry.menuItem.id.toLowerCase().includes(cleanKw) ||
      (entry.modifiers && entry.modifiers.flavor && entry.modifiers.flavor.toLowerCase().includes(cleanKw)) ||
      (entry.modifiers && entry.modifiers.meat && entry.modifiers.meat.toLowerCase().includes(cleanKw))
    );

    // 2. Category matching (e.g. "remove the drink", "cancel my soda", "take off beverage")
    if (index === -1 && /\b(drink|soda|beverage|bebida|refresco|coke|agua)\b/i.test(cleanKw)) {
      index = this.cart.findIndex(entry => entry.menuItem.category === "Beverages & Drinks");
    }

    // 3. Significant token match (e.g. "ramen", "quesataco", "fries", "taco", "consome", "horchata", "burro")
    if (index === -1) {
      const tokens = cleanKw.split(/\s+/).filter(t => t.length >= 3);
      for (const tok of tokens) {
        index = this.cart.findIndex(entry => 
          entry.menuItem.name.toLowerCase().includes(tok) ||
          entry.menuItem.id.toLowerCase().includes(tok) ||
          (entry.modifiers && entry.modifiers.flavor && entry.modifiers.flavor.toLowerCase().includes(tok)) ||
          (entry.modifiers && entry.modifiers.meat && entry.modifiers.meat.toLowerCase().includes(tok))
        );
        if (index > -1) break;
      }
    }

    if (index > -1) {
      const removed = this.cart.splice(index, 1)[0];
      this.notify();
      return removed;
    }
    return null;
  }

  updateQuantity(cartItemId, newQty) {
    const item = this.cart.find(it => it.id === cartItemId);
    if (item) {
      if (newQty <= 0) {
        this.removeItem(cartItemId);
      } else {
        item.quantity = newQty;
        this.notify();
      }
    }
  }

  clearCart() {
    this.cart = [];
    this.notify();
  }

  setFulfillment(type, address = "") {
    this.fulfillment = type;
    if (address) this.deliveryAddress = address;
    this.notify();
  }

  setTip(percent, customAmount = null) {
    this.tipPercent = percent;
    this.customTip = customAmount;
    this.notify();
  }

  getSummary() {
    const subtotal = this.cart.reduce((sum, entry) => {
      let itemPrice = entry.menuItem.price;
      if (entry.modifiers && entry.modifiers.extraConsome) {
        itemPrice += 3.00;
      }
      return sum + (itemPrice * entry.quantity);
    }, 0);

    const tax = subtotal * RESTAURANT_INFO.taxRate;
    
    let tip = 0;
    if (this.customTip !== null) {
      tip = parseFloat(this.customTip) || 0;
    } else if (this.tipPercent > 0) {
      tip = subtotal * (this.tipPercent / 100);
    }

    const deliveryFee = this.fulfillment === "delivery" ? 4.99 : 0.00;
    const total = subtotal + tax + tip + deliveryFee;
    const itemCount = this.cart.reduce((cnt, it) => cnt + it.quantity, 0);

    return {
      items: this.cart,
      itemCount: itemCount,
      subtotal: parseFloat(subtotal.toFixed(2)),
      tax: parseFloat(tax.toFixed(2)),
      tip: parseFloat(tip.toFixed(2)),
      deliveryFee: deliveryFee,
      fulfillment: this.fulfillment,
      deliveryAddress: this.deliveryAddress,
      total: parseFloat(total.toFixed(2)),
      orderId: `ATK-${this.orderCounter}`
    };
  }

  detectLanguage(text) {
    const lower = text.toLowerCase();
    if (/\b(hola|por favor|quiero|dame|ordenar|tacos|quesataco|con todo|sin|cebolla|cilantro|cuenta|llevar|domicilio|cuánto|gracias|buenos días|buenas tardes|sí|claro)\b/i.test(lower)) {
      return "es";
    }
    if (/\b(bonjour|s'il vous plaît|je voudrais|merci|combien|l'addition)\b/i.test(lower)) {
      return "fr";
    }
    if (/\b(hallo|bitte|ich möchte|danke|wieviel)\b/i.test(lower)) {
      return "de";
    }
    if (/[\u0600-\u06FF]/.test(text)) {
      return "ar";
    }
    if (/[\u4E00-\u9FFF]/.test(text)) {
      return "zh";
    }
    if (/[\u0900-\u097F]/.test(text) || /\b(namaste|chahiye|kitna|karo|bhai)\b/i.test(lower)) {
      return "hi";
    }
    return "en";
  }

  // Fast Levenshtein distance algorithm for fuzzy token matching
  levenshteinDistance(a, b) {
    if (a === b) return 0;
    if (!a.length) return b.length;
    if (!b.length) return a.length;
    const row = new Array(b.length + 1);
    for (let i = 0; i <= b.length; i++) row[i] = i;
    for (let i = 0; i < a.length; i++) {
      let prev = i + 1;
      for (let j = 0; j < b.length; j++) {
        let cur;
        if (a[i] === b[j]) {
          cur = row[j];
        } else {
          cur = Math.min(row[j] + 1, prev + 1, row[j + 1] + 1);
        }
        row[j] = prev;
        prev = cur;
      }
      row[b.length] = prev;
    }
    return row[b.length];
  }

  stringSimilarity(s1, s2) {
    const longer = s1.length >= s2.length ? s1 : s2;
    const shorter = s1.length < s2.length ? s1 : s2;
    if (longer.length === 0) return 1.0;
    const dist = this.levenshteinDistance(longer, shorter);
    return (longer.length - dist) / longer.length;
  }

  // Universal Multi-Accent & Phonetic Normalizer
  // Supports: Standard US, Indian/South Asian, British/Irish, Australian, Hispanic/Chicano, Southern/AAVE & Global English
  normalizeSpokenInput(text) {
    let s = text.toLowerCase()
      .replace(/[.,\/#!$%\^&\*;:{}=\-_`~()?"']/g, " ")
      .replace(/\s+/g, " ");

    // Protect compound phrases containing 'and' or 'y' from getting prematurely split
    s = s.replace(/\bbean\s+(?:and|&)\s+cheese\b/g, "bean_and_cheese");
    s = s.replace(/\bfrijol(?:es)?\s+y\s+queso\b/g, "frijol_y_queso");
    s = s.replace(/\brice\s+(?:and|&)\s+beans\b/g, "rice_and_beans");
    s = s.replace(/\barroz\s+y\s+frijol(?:es)?\b/g, "arroz_y_frijoles");

    // =========================================================================
    // 1. UNIVERSAL ENGLISH ACCENT PHONETIC NORMALIZATIONS:
    // =========================================================================

    // Indian & South Asian English Shifts:
    // "th" pronounced as "t" ("tree tacos" -> "three tacos")
    s = s.replace(/\b(?:tree|tri|tiri)\s+(taco|quesataco|ramen|burro|burrito|drink|coke|box|combo|plate|order)/gi, "three $1");
    s = s.replace(/\b(?:to|too)\s+(taco|quesataco|ramen|burro|burrito|drink|coke|box|combo|plate|order)/gi, "two $1");
    s = s.replace(/\b(?:won|juan)\s+(taco|quesataco|ramen|burro|burrito|drink|coke|box|combo|plate|order)/gi, "one $1");
    s = s.replace(/\b(?:for|fore)\s+(taco|quesataco|ramen|burro|burrito|drink|coke|box|combo|plate|order)/gi, "four $1");
    s = s.replace(/\b(?:ate)\s+(taco|quesataco|ramen|burro|burrito|drink|coke|box|combo|plate|order)/gi, "eight $1");
    s = s.replace(/\b(?:tin|den)\s+(taco|quesataco|ramen|burro|burrito|drink|coke|box|combo|plate|order)/gi, "ten $1");

    // "dis / dat" -> "this / that"
    s = s.replace(/\bdis\b/g, "this").replace(/\bdat\b/g, "that");
    // "ve vant / we vant" -> "we want", "vater" -> "water"
    s = s.replace(/\b(?:ve\s+vant|we\s+vant)\b/g, "we want").replace(/\bvater\b/g, "water");

    // British / Australian / Commonwealth Shifts:
    // "chips" -> "fries" (e.g. "king chips", "loaded chips", "chips")
    s = s.replace(/\b(king chips|loaded chips|birria chips)\b/gi, "king fries");
    s = s.replace(/\b(chips|portion of chips|side of chips)\b/gi, "french fries");
    // "fizzy drink", "soft drink", "cold drink", "pop" -> "drink"
    s = s.replace(/\b(cold drink|cold drinks|soft drink|soft drinks|fizzy drink|fizzy drinks|can of pop|tin of drink)\b/gi, "mexican bottle");
    // British non-rhotic phonetic shifts ("tackos", "tahkos" -> "tacos")
    s = s.replace(/\b(tackos|tahkos|tacko|tahko)\b/gi, "tacos");

    // Hispanic / Chicano / Latino Accented Shifts:
    // "jes" -> "yes"
    s = s.replace(/\bjes\b/gi, "yes");
    // "es-taco", "estreet taco" -> "street taco"
    s = s.replace(/\b(estreet tacos?|es street tacos?|es taco|es tacos)\b/gi, "street taco");
    // "virria" -> "birria"
    s = s.replace(/\bvirria\b/gi, "birria");

    // Southern US & AAVE Colloquial Normalizations:
    s = s.replace(/\b(lemme get|can i get a uh|can i get uh|tryna get|hook me up with|slide me|put me down for|i'mma get|imma get)\b/gi, "give me");
    s = s.replace(/\b(a couple of them|a pair of them|two of them)\b/gi, "two");
    s = s.replace(/\b(three of them|few of them)\b/gi, "three");

    // Fulfillment colloquialisms across accents:
    // "parcel", "packing", "pack it", "takeaway", "take away", "carry out", "collection", "tiffin" -> "pickup"
    s = s.replace(/\b(parcel|packing|pack it|takeaway|take away|carry out|collection|tiffin|to go)\b/gi, "pickup");

    // Checkout colloquialisms across accents:
    // "billing", "bill please", "settle the bill", "sorted", "cheers thats all", "that will be all thanks"
    s = s.replace(/\b(billing|bill please|settle up|settle the bill|sorted|cheers thats all|that will be all thanks|check please)\b/gi, "checkout");

    // =========================================================================
    // 2. PHONETIC STT SOUND-ALIKE NORMALIZATIONS:
    // =========================================================================

    // Quesatacos (all regional phonetic sound-alikes)
    s = s.replace(/\b(case of tacos|case uh tacos|case at tacos|casa tacos|kiss uh taco|kiss of taco|kiss a taco|quesa tacos|quesatacos|quesa taco|quesataco|qusataco|quesabirria|quesabirrias|quesotaco|quesotacos|kay-sa tacos|kay sa tacos|cheese taco|cheese tacos|taste of taco|piece of tacos|quasa taco|cater tacos|kasa taco|face of taco|case of taco|case uh taco)\b/gi, "quesataco");

    // Consomé & Dipping Broth
    s = s.replace(/\b(dipping broth|dipping soup|beef broth|caldo de birria|caldo|con some|consume|conso may|can so may|conzome|consomme|can some|gun some|gravy|broth|dipping sauce|dip)\b/gi, "consome");

    // Birria
    s = s.replace(/\b(beer ya|beer yeah|beeria|barria|berea|bidi a|buria|bria|perea|virria|birya)\b/gi, "birria");

    // Birria Ramen
    s = s.replace(/\b(birria noodles|noodle soup|ramin|roman|raymond|romen|raw men|rah men|noodles)\b/gi, "birria ramen");

    // Horchata
    s = s.replace(/\b(or chata|orchata|our chata|whore chata|rice drink|rice milk|her chata|or shooter|or chatter)\b/gi, "horchata");

    // Jarritos
    s = s.replace(/\b(harritos|jaritos|ritos|mexican soda|fruit punch soda|mandarin soda)\b/gi, "jarritos");

    // $50 Taco Box
    s = s.replace(/\b(50 dollar taco box|fifty dollar taco box|fifty dollar box|50 dollar box|fifty box|50 box|family box|party box|caja familiar|22 tacos box|22 taco box)\b/gi, "$50 taco box");

    // King Fries
    s = s.replace(/\b(loaded fries|birria fries|cheese fries|king fry)\b/gi, "king fries");

    // Birria Pizza
    s = s.replace(/\b(birria pizza|taco pizza|king pizza|pizza de birria|peace uh pizza|peace uh)\b/gi, "birria pizza");

    // Burro / Burrito
    s = s.replace(/\b(birria burrito|king burrito)\b/gi, "king burro");

    // Birria Balls
    s = s.replace(/\b(potato balls deal|potato ball deal|potato balls|potato ball|two birria balls|birria balls deal)\b/gi, "birria balls deal");

    return s.trim();
  }

  // Super-Forgiving NLP Parser with Multi-Alternative Candidate Evaluation
  parseUserMessage(userText, candidateAlternatives = []) {
    const primaryResult = this._parseSingleUtterance(userText);

    // If primary result successfully detected order items or a clear conversational intent, return it
    if (primaryResult.itemsFound.length > 0 || (primaryResult.intent !== "unknown" && primaryResult.intent !== "menu_inquiry")) {
      return primaryResult;
    }

    // Evaluate alternative recognition candidates (from other phonetic hypotheses)
    if (Array.isArray(candidateAlternatives) && candidateAlternatives.length > 0) {
      for (const alt of candidateAlternatives) {
        if (!alt || typeof alt !== "string") continue;
        const cleanAlt = alt.trim();
        if (!cleanAlt || cleanAlt.toLowerCase() === userText.trim().toLowerCase()) continue;

        const altResult = this._parseSingleUtterance(cleanAlt);
        if (altResult.itemsFound.length > 0) {
          console.log("🎯 Multi-Alternative Recognition matched items from alternative:", cleanAlt);
          return altResult;
        }
        if (primaryResult.intent === "unknown" && altResult.intent !== "unknown") {
          return altResult;
        }
      }
    }

    return primaryResult;
  }

  _parseSingleUtterance(userText) {
    const rawText = (userText || "").trim();
    const text = this.normalizeSpokenInput(rawText);
    const lang = this.detectLanguage(rawText);

    const result = {
      intent: "unknown",
      lang: lang,
      itemsFound: [],
      rawText: rawText,
      normalizedText: text
    };

    // 0. Conversational Upsell Confirmation (Supports "yes", "sure", "add it", AND compound "yes and also a...")
    let confirmedUpsell = null;
    if (this.lastUpsellItem) {
      if (/\b(yes|yeah|yep|sure|please|go ahead|sounds good|okay|ok|definitely|why not|add it|put it in|sí|si|claro|por favor|por supuesto)\b/i.test(text)) {
        confirmedUpsell = this.lastUpsellItem;
        this.lastUpsellItem = null;

        // If the user's utterance was purely an affirmation without other items, return immediately
        if (/^(yes|yeah|yep|sure|please|go ahead|sounds good|okay|ok|definitely|why not|add it|put it in|sí|si|claro|por favor|por supuesto|yes please|yeah add it|sure add it)[\s.!?,]*$/i.test(text.trim())) {
          result.intent = "upsell_confirm";
          result.upsellItem = confirmedUpsell;
          return result;
        }
        // Otherwise, confirmedUpsell will be prepended to itemsFound below!
      } else if (/\b(no|nope|nah|no thanks|no thank you|i'm good|im good|pass|skip|dont need|no gracias)\b/i.test(text)) {
        this.lastUpsellItem = null;
        if (/^(no|nope|nah|no thanks|no thank you|i'm good|im good|pass|skip|dont need|no gracias)[\s.!?,]*$/i.test(text.trim())) {
          result.intent = "upsell_decline";
          return result;
        }
      }
    }

    // 1. Item Removal Intent ("remove the ramen", "take off tacos", "cancel fries", "wait remove the ramen please")
    if (/\b(remove|delete|take off|take out|cancel|drop|quitar|eliminar)\b/i.test(text) && !/\b(order|add)\b/i.test(text)) {
      result.intent = "order_remove";
      result.removeItemQuery = text.replace(/\b(remove|delete|take off|take out|cancel|drop|quitar|eliminar|the|an|a|my|please|wait|hey|actually)\b/gi, " ").replace(/\s+/g, " ").trim();
      return result;
    }

    // 2. Repeat Request ("repeat", "say that again", "what did you say", "speak slower")
    if (/\b(repeat|say that again|what did you say|say again|speak slower|speak up|pardon|come again|no te entendí|repite)\b/i.test(text)) {
      result.intent = "repeat_request";
      return result;
    }

    // 3. Fulfillment & Delivery Questions
    if (/\b(deliver|delivery|do you deliver|a domicilio|tiempo|how long|prep time|ready in|wait time)\b/i.test(text)) {
      result.intent = "fulfillment_info";
      return result;
    }

    // 4. Food & Spice Questions
    if (/\b(spicy|hot sauce|chili|pico|salsa|picante|pica|halal|pork|beef|meat)\b/i.test(text) && !/\b(order|give|add|want|quiero)\b/i.test(text)) {
      result.intent = "food_info";
      return result;
    }

    // 5. Checkout Intent (Multilingual & Multi-Accent)
    if (
      /\b(checkout|place order|finish order|ready to pay|bill|check|done|that's all|thats all|i'm done|im done|la cuenta|pagar|terminar|l'addition|billing|bill please|settle up|sorted|cheers thats all)\b/i.test(text) ||
      text === "done" || text === "pay" || text === "pagar" || text === "checkout" || text === "bill"
    ) {
      result.intent = "checkout";
      return result;
    }

    // 6. Clear Cart Intent
    if (/\b(clear cart|start over|cancel order|empty bag|borrar|vaciar)\b/i.test(text)) {
      result.intent = "order_clear";
      return result;
    }

    // 7. View Cart Intent
    if (/\b(cart|my order|my bag|total|what did i order|how much is it|review|ver orden|mi pedido|mi bolsa)\b/i.test(text)) {
      result.intent = "view_cart";
      return result;
    }

    // 8. Menu & Category Inquiries
    if (/\b(menu|what do you have|options|specials|menú|qué tienen)\b/i.test(text) && !/\b(order|give|add|want|quiero)\b/i.test(text)) {
      result.intent = "menu_inquiry";
      return result;
    }

    // 9. Recommendations
    if (/\b(recommend|best seller|what is good|popular|favorite|favorito|recomiendas)\b/i.test(text)) {
      result.intent = "recommendations";
      return result;
    }

    // 10. Dietary Questions
    if (/\b(keto|carb|diet|gluten|vegetarian|vegan|vegetariano)\b/i.test(text) && !/\b(taco|tacos|order|give)\b/i.test(text)) {
      result.intent = "dietary";
      return result;
    }

    // 11. Store Info & Hours
    if (/\b(where are you|address|location|hours|phone number|dónde están|dirección|horario)\b/i.test(text)) {
      result.intent = "location_info";
      return result;
    }

    // 12. Simple Greeting
    if (/^(hi|hello|hey|hola|howdy|sup|bonjour|namaste|good morning)\b/i.test(text) && text.length < 18) {
      result.intent = "greeting";
      return result;
    }

    // Multilingual Numbers & Colloquials
    const numberWords = {
      "a": 1, "an": 1, "one": 1, "two": 2, "three": 3, "four": 4, "five": 5,
      "six": 6, "seven": 7, "eight": 8, "nine": 9, "ten": 10, "eleven": 11,
      "twelve": 12, "thirteen": 13, "fourteen": 14, "fifteen": 15, "sixteen": 16,
      "twenty": 20, "couple": 2, "pair": 2, "few": 3, "dozen": 12, "half a dozen": 6, "half dozen": 6,
      "single": 1, "double": 2, "triple": 3,
      // Spanish
      "un": 1, "una": 1, "uno": 1, "dos": 2, "tres": 3, "cuatro": 4, "cinco": 5,
      "seis": 6, "siete": 7, "ocho": 8, "nueve": 9, "diez": 10, "once": 11,
      "doce": 12, "quince": 15, "veinte": 20,
      // Indian / South Asian
      "ek": 1, "do": 2, "teen": 3, "char": 4, "paanch": 5,
      "chhe": 6, "saat": 7, "aath": 8, "nau": 9, "das": 10,
      // STT mishearings & accent shifts
      "tree": 3, "tri": 3, "won": 1, "to": 2, "too": 2, "for": 4, "fore": 4, "ate": 8, "tin": 10, "den": 10
    };

    // Dictionary of Item Matchers (Ordered by specificity: combos & specials first, then singles)
    const itemMatchers = [
      // 3 Quesataco Combo with Consomé & Agua
      {
        id: "item_combo_3qt",
        keys: [
          "3 quesataco combo", "3 quesatacos combo", "three quesataco combo", "three quesatacos combo",
          "quesataco combo", "quesatacos combo", "combo de quesatacos", "combo 3 quesatacos",
          "combo tres quesatacos", "3 quesatacos con agua", "quesataco with agua", "quesataco feast",
          "combo 1", "combo one", "taco combo with agua", "combo de 3", "3 taco combo", "three taco combo"
        ]
      },
      // $50 Taco Box (22 Tacos + 2 Consomés)
      {
        id: "item_taco_box_50",
        keys: [
          "50 taco box", "$50 taco box", "50 dollar taco box", "fifty dollar taco box",
          "fifty dollar box", "50 dollar box", "fifty box", "50 box", "taco box", "caja de tacos",
          "caja de 50", "family box", "caja familiar", "22 tacos box", "22 taco box",
          "box of 22 tacos", "family taco box", "party taco box", "party box"
        ]
      },
      // Birria Platter Ramen & 2 Qt Combo
      {
        id: "item_birria_platter_ramen_2qt",
        keys: [
          "birria platter ramen", "ramen platter", "ramen and 2 quesatacos", "ramen and two quesatacos",
          "ramen and quesatacos combo", "ramen combo with quesatacos", "ramen combo"
        ]
      },
      // King Platter Combo
      {
        id: "item_king_platter_combo",
        keys: [
          "king platter combo", "king platter", "sampler platter", "king sampler"
        ]
      },
      // Foodie Box
      {
        id: "item_foodie_box",
        keys: ["foodie box", "caja foodie", "foodie tasting box"]
      },
      // Birria Ramen
      {
        id: "item_ramen_birria",
        keys: [
          "birria ramen", "ramen birria", "ramen", "ramen de birria", "noodles",
          "birria noodles", "noodle soup", "sopa ramen", "birria ramen bowl",
          "ramen with birria", "roman", "raymond", "ramin", "romen"
        ]
      },
      // King Birria Pizza
      {
        id: "item_birria_pizza",
        keys: [
          "birria pizza", "king birria pizza", "pizza de birria", "taco pizza", "pizza birria", "pizza", "king pizza"
        ]
      },
      // King Fries (Loaded)
      {
        id: "item_king_fries",
        keys: [
          "king fries", "papas king", "birria fries", "papas con birria", "loaded fries", "king fry",
          "loaded chips", "birria chips", "king chips"
        ]
      },
      // Queen Fries
      {
        id: "item_queen_fries",
        keys: ["queen fries", "papas queen", "queen fry"]
      },
      // Birria Balls Deal (2 pcs)
      {
        id: "item_birria_balls_deal",
        keys: [
          "birria balls deal", "birria ball deal", "two birria balls", "2 birria balls",
          "dos birria balls", "dos bolas de birria", "birria balls"
        ]
      },
      // Birria Ball (Single)
      {
        id: "item_birria_ball",
        keys: ["single birria ball", "one birria ball", "birria ball", "bola de birria", "potato ball"]
      },
      // Birria Nachos
      {
        id: "item_birria_nachos",
        keys: ["birria nachos", "nachos de birria", "nachos"]
      },
      // Bean & Cheese Burro
      {
        id: "item_bean_cheese_burro",
        keys: [
          "bean_and_cheese burro", "bean and cheese burro", "bean_and_cheese burrito", "bean and cheese burrito",
          "bean burrito", "bean burro", "burro de frijol y queso", "frijol_y_queso burro", "burrito de frijol",
          "frijol con queso burro"
        ]
      },
      // King Burro
      {
        id: "item_king_burro",
        keys: [
          "king burro", "burro king", "birria burrito", "burrito de birria",
          "king burrito", "burro", "burrito", "king wrap"
        ]
      },
      // Meat Quesadilla
      {
        id: "item_meat_quesadilla",
        keys: [
          "meat quesadilla", "quesadilla de carne", "quesadilla de birria", "beef quesadilla",
          "steak quesadilla", "chicken quesadilla"
        ]
      },
      // Cheese Quesadilla
      {
        id: "item_cheese_quesadilla",
        keys: ["cheese quesadilla", "quesadilla de queso", "quesadilla"]
      },
      // Quesataco Platter (10 pcs)
      {
        id: "item_quesataco_platter",
        keys: [
          "quesataco platter", "platter de quesatacos", "10 quesatacos", "diez quesatacos",
          "charola de quesatacos", "ten quesatacos"
        ]
      },
      // Quesataco Plate (3 pcs with rice & beans)
      {
        id: "item_quesataco_plate",
        keys: [
          "plate of quesataco", "plate of quesatacos", "quesataco plate", "plato de quesataco",
          "plato de quesatacos", "orden de quesataco", "orden de quesatacos", "quesataco plato"
        ]
      },
      // Quesataco (Single)
      {
        id: "item_quesataco_single",
        keys: [
          "quesataco", "quesatacos", "quesabirria", "quesabirrias", "qusataco", "qusatacos",
          "cheese taco", "cheese tacos", "quesotaco", "quesotacos", "case of tacos", "casa tacos", "kay-sa tacos"
        ]
      },
      // Keto Taco (Cheese shell)
      {
        id: "item_keto_taco",
        keys: [
          "keto taco", "keto tacos", "taco keto", "tacos keto", "cheese shell taco", "low carb taco"
        ]
      },
      // Street Taco Platter (10 pcs)
      {
        id: "item_street_taco_platter",
        keys: [
          "street taco platter", "charola de tacos", "10 street tacos", "ten street tacos", "diez tacos"
        ]
      },
      // Street Taco Plate (3 pcs with rice & beans)
      {
        id: "item_street_taco_plate",
        keys: [
          "plate of street taco", "plate of street tacos", "street taco plate", "plato de street tacos",
          "plato de tacos", "street tacos plate", "taco plate", "orden de tacos"
        ]
      },
      // Street Taco (Single) / General Tacos
      {
        id: "item_street_taco",
        keys: [
          "street taco", "street tacos", "taco de la calle", "birria taco", "birria tacos",
          "beef taco", "beef tacos", "regular taco", "regular tacos", "taco", "tacos"
        ]
      },
      // Birria de Res Plate
      {
        id: "item_birria_de_res_plate",
        keys: [
          "birria de res plate", "plato de birria", "orden de birria", "birria plate", "birria de res"
        ]
      },
      // Large Consomé (16 oz) - Matched before 8 oz cup for specificity
      {
        id: "item_consome_de_birria_large",
        keys: [
          "large consome cup", "large consome", "consome grande", "tazón de birria",
          "16 oz consome cup", "16 oz consome", "large broth", "large dipping broth", "16 oz broth"
        ]
      },
      // Consomé Dipping Cup (8 oz)
      {
        id: "item_consome_cup",
        keys: [
          "consome cup", "side consome", "consomé cup", "vaso de consomé", "dipping broth",
          "8 oz consome", "consome", "consomé", "caldo de birria", "caldo", "broth", "dip",
          "consume", "conzome", "consomme", "cup of consome", "dipping soup", "beef broth", "gravy"
        ]
      },
      // Taquitos
      {
        id: "item_birria_taquitos",
        keys: [
          "birria taquitos", "taquitos de birria", "taquitos", "order of taquitos", "flautas", "rolled tacos"
        ]
      },
      // Mexican Bottle Drink / Aguas / Sodas
      {
        id: "item_mexican_bottle",
        keys: [
          "mexican bottle", "mexican coke", "coca mexicana", "coke", "coca", "refresco",
          "jarritos", "jarrito", "mexican soda", "agua fresca", "horchata", "jamaica",
          "soda", "drink", "bottle of water", "bottled water", "water bottle", "water",
          "cold drink", "soft drink", "fizzy drink", "cold drinks", "soft drinks"
        ]
      },
      // French Fries / Chips
      {
        id: "item_side_fries",
        keys: ["french fries", "side of fries", "papas fritas", "papas", "fries", "fry", "regular fries", "chips", "side of chips", "portion of chips"]
      },
      // Rice
      {
        id: "item_rice",
        keys: ["rice", "arroz", "mexican rice", "arroz mexicano", "side of rice"]
      },
      // Chipotle Cream
      {
        id: "item_chipotle_cream",
        keys: ["side of chipotle cream", "chipotle cream", "chipotle sauce", "salsa chipotle"]
      },
      // Sour Cream
      {
        id: "item_sour_cream",
        keys: ["side of sour cream", "sour cream", "crema", "extra sour cream"]
      },
      // Corn Tortillas
      {
        id: "item_corn_tortillas",
        keys: ["side of corn tortillas", "corn tortillas", "extra tortillas", "tortillas", "tortillas de maiz"]
      },
      // Flour Tortilla
      {
        id: "item_flour_tortilla",
        keys: ["flour tortilla", "tortilla de harina"]
      }
    ];

    // Multi-Item Segment Extraction
    // Split by punctuation, conjunctions, or transitions between distinct items
    const segments = text.split(/(?:,|\band\b|\by\b|\bplus\b|\bet\b|\bund\b|(?<=\w)\s+(?=(?:\d+|a|an|one|two|three|four|five|six|seven|eight|nine|ten|eleven|twelve|twenty|couple|pair|un|una|dos|tres|cuatro|cinco|ek|do|teen|tree)\b))/i);

    for (const segment of segments) {
      const cleanSeg = segment.trim();
      if (!cleanSeg) continue;

      let bestMatcher = null;
      let bestKey = null;
      let bestLen = 0;

      // 1. Exact regex key match
      for (const matcher of itemMatchers) {
        for (const key of matcher.keys) {
          const escaped = key.replace(/[.*+?^${}()|[\]\\]/g, "\\$&");
          const keyRegex = new RegExp("(?:^|\\s)" + escaped + "(?:s|es)?(?:\\s|$)", "i");
          if (keyRegex.test(cleanSeg) || cleanSeg === key || cleanSeg === key + "s" || cleanSeg === key + "es") {
            if (key.length > bestLen) {
              bestLen = key.length;
              bestMatcher = matcher;
              bestKey = key;
            }
          }
        }
      }

      // 2. Fuzzy fallback match for heavily accented words
      if (!bestMatcher && cleanSeg.length >= 4) {
        for (const matcher of itemMatchers) {
          for (const key of matcher.keys) {
            if (key.length >= 4) {
              const sim = this.stringSimilarity(cleanSeg, key);
              if (sim >= 0.82 && key.length > bestLen) {
                bestLen = key.length;
                bestMatcher = matcher;
                bestKey = key;
              }
            }
          }
        }
      }

      if (bestMatcher) {
        // Prepare text for quantity detection:
        // Remove numerals belonging to the dish title (e.g. 50 in $50 taco box, 3 in 3 quesataco combo)
        let segForQty = cleanSeg;
        if (bestMatcher.id === "item_taco_box_50") {
          segForQty = segForQty.replace(/\b(50|\$50|fifty)\s*(dollar)?\s*(taco)?\s*(box)?\b/gi, "box");
        } else if (bestMatcher.id === "item_combo_3qt") {
          segForQty = segForQty.replace(/\b(3|three|tres|tree)\s*quesataco/gi, "quesataco");
        } else if (bestMatcher.id === "item_birria_balls_deal") {
          segForQty = segForQty.replace(/\b(2|two|dos)\s*birria/gi, "birria");
        } else if (bestMatcher.id === "item_quesataco_platter" || bestMatcher.id === "item_street_taco_platter") {
          segForQty = segForQty.replace(/\b(10|ten|diez)\s*(street)?\s*taco/gi, "platter");
        }

        // Clean out leading fillers like "can i get", "could i have", "order of", "give me", "plates of"
        segForQty = segForQty.replace(/\b(orders? of|orden(es)? de|plates? of|platos? de|portions? of|can i get|could i have|can i have|give me|lemme get|i want|i will take|i'll take|add|put|dame|quiero|chahiye|ek plate|do plate)\b/gi, " ");

        // Extract quantity
        let quantity = 1;
        const numPattern = /(\b(?:\d+|a|an|one|two|three|four|five|six|seven|eight|nine|ten|eleven|twelve|thirteen|fourteen|fifteen|twenty|couple|pair|dozen|half a dozen|half dozen|few|un|una|uno|dos|tres|cuatro|cinco|seis|siete|ocho|nueve|diez|ek|do|teen|char|paanch|tree|tri|won|to|too|for|ate|tin)\b)/i;
        const numMatch = segForQty.match(numPattern);
        if (numMatch) {
          const rawNum = numMatch[1].toLowerCase();
          quantity = numberWords[rawNum] || parseInt(rawNum) || 1;
          if (quantity > 20) quantity = 1; // sanity limit
        }

        const menuItem = MENU_ITEMS.find(m => m.id === bestMatcher.id);
        if (menuItem) {
          const modifiers = {};

          if (cleanSeg.includes("asada")) modifiers.meat = "Carne Asada";
          else if (cleanSeg.includes("chicken") || cleanSeg.includes("pollo")) modifiers.meat = "Pollo Asado";
          else if (cleanSeg.includes("pastor")) modifiers.meat = "Al Pastor";
          else modifiers.meat = "Birria de Res (Beef)";

          if (cleanSeg.includes("no onion") || cleanSeg.includes("sin cebolla")) modifiers.noOnion = true;
          if (cleanSeg.includes("no cilantro") || cleanSeg.includes("sin cilantro")) modifiers.noCilantro = true;
          if (cleanSeg.includes("no cheese") || cleanSeg.includes("sin queso")) modifiers.noCheese = true;
          if (cleanSeg.includes("extra cheese") || cleanSeg.includes("extra queso")) modifiers.extraCheese = true;

          if (cleanSeg.includes("salsa verde") || cleanSeg.includes("green salsa")) modifiers.salsa = "Salsa Verde (Mild)";
          else if (cleanSeg.includes("salsa roja") || cleanSeg.includes("red salsa")) modifiers.salsa = "Salsa Roja (Hot)";

          if (cleanSeg.includes("extra consome") || cleanSeg.includes("extra dipping") || cleanSeg.includes("with consome") || cleanSeg.includes("con consome") || cleanSeg.includes("with broth")) {
            modifiers.extraConsome = true;
          }

          if (cleanSeg.includes("horchata")) modifiers.flavor = "Horchata";
          else if (cleanSeg.includes("jamaica")) modifiers.flavor = "Jamaica (Hibiscus)";
          else if (cleanSeg.includes("jarrito")) modifiers.flavor = "Jarritos";
          else if (cleanSeg.includes("coke") || cleanSeg.includes("coca")) modifiers.flavor = "Mexican Coke";

          // Merge with existing match if exact same modifiers, otherwise push as customized entry!
          const existing = result.itemsFound.find(f => 
            f.item.id === menuItem.id && 
            JSON.stringify(f.modifiers) === JSON.stringify(modifiers)
          );

          if (existing) {
            existing.quantity += quantity;
          } else {
            result.itemsFound.push({
              item: menuItem,
              quantity: quantity,
              modifiers: modifiers
            });
          }
        }
      }
    }

    // If an upsell was confirmed as part of a compound request, prepend it to items
    if (confirmedUpsell) {
      result.itemsFound.unshift({
        item: confirmedUpsell,
        quantity: 1,
        modifiers: {}
      });
    }

    if (result.itemsFound.length > 0) {
      result.intent = "order_add";
      return result;
    }

    // Fallback: If customer says they want food without specific item
    if (/\b(hungry|food|eat|order|comida|comer|hambre)\b/i.test(text)) {
      result.intent = "menu_inquiry";
      return result;
    }

    return result;
  }
}

const orderEngine = new OrderEngine();

if (typeof module !== 'undefined' && module.exports) {
  module.exports = { OrderEngine, orderEngine };
}

