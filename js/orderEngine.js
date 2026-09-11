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
    // Clean out conversational filler words that might be attached
    const cleanKw = raw.replace(/\b(wait|hey|can you|could you|please|actually|just|the|an|a|my)\b/gi, " ").replace(/\s+/g, " ").trim();
    
    // 1. Try match with cleaned keyword
    let index = this.cart.findIndex(entry => 
      entry.menuItem.name.toLowerCase().includes(cleanKw) ||
      entry.menuItem.id.toLowerCase().includes(cleanKw)
    );

    // 2. If not found, match by significant tokens (e.g. "ramen", "quesataco", "fries", "taco", "consome")
    if (index === -1) {
      const tokens = cleanKw.split(/\s+/).filter(t => t.length >= 3);
      for (const tok of tokens) {
        index = this.cart.findIndex(entry => 
          entry.menuItem.name.toLowerCase().includes(tok) ||
          entry.menuItem.id.toLowerCase().includes(tok)
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

  // Multi-Accent & Phonetic Normalizer
  normalizeSpokenInput(text) {
    let s = text.toLowerCase()
      .replace(/[.,\/#!$%\^&\*;:{}=\-_`~()]/g, " ")
      .replace(/\s+/g, " ");

    // Normalize speech-to-text sound-alike mishearings:
    // Quesatacos (all regional phonetic variations)
    s = s.replace(/\b(case of tacos|case uh tacos|case at tacos|casa tacos|kiss uh taco|kiss of taco|quesa tacos|quesatacos|quesa taco|quesataco|qusataco|quesabirria|quesabirrias|quesotaco|quesotacos|kay-sa tacos|kay sa tacos|cheese taco|cheese tacos)\b/g, "quesataco");

    // Consomé & Dipping Broth
    s = s.replace(/\b(dipping broth|dipping soup|beef broth|caldo de birria|caldo|con some|consume|conso may|can so may|conzome|consomme|consome|consomé)\b/g, "consome cup");

    // Birria
    s = s.replace(/\b(beer ya|beer yeah|beeria|barria|berea|bidi a)\b/g, "birria");

    // Birria Ramen
    s = s.replace(/\b(birria noodles|noodle soup|ramin|roman|raymond)\b/g, "birria ramen");

    // Horchata
    s = s.replace(/\b(or chata|orchata|our chata|whore chata|rice drink|rice milk)\b/g, "horchata");

    // Jarritos
    s = s.replace(/\b(harritos|jaritos|ritos|mexican soda)\b/g, "jarritos");

    // $50 Taco Box
    s = s.replace(/\b(50 dollar taco box|fifty dollar taco box|fifty dollar box|50 dollar box|fifty box|50 box|family box|party box|caja familiar)\b/g, "$50 taco box");

    // King Fries
    s = s.replace(/\b(loaded fries|birria fries|cheese fries)\b/g, "king fries");

    // Burro / Burrito
    s = s.replace(/\b(birria burrito|king burrito|burrito)\b/g, "king burro");

    // Birria Balls
    s = s.replace(/\b(potato balls deal|potato ball deal|potato balls|potato ball|two birria balls|birria balls deal)\b/g, "birria balls deal");

    return s.trim();
  }

  // Super-Forgiving NLP Parser
  parseUserMessage(userText) {
    const rawText = userText.trim();
    const text = this.normalizeSpokenInput(rawText);
    const lang = this.detectLanguage(rawText);

    const result = {
      intent: "unknown",
      lang: lang,
      itemsFound: [],
      rawText: rawText,
      normalizedText: text
    };

    // 0. Conversational Upsell Confirmation (Fix for "yes / sure / add it / no thanks")
    if (this.lastUpsellItem) {
      if (/\b(yes|yeah|yep|sure|please|go ahead|sounds good|okay|ok|definitely|why not|add it|put it in|sí|si|claro|por favor|por supuesto)\b/i.test(text)) {
        result.intent = "upsell_confirm";
        result.upsellItem = this.lastUpsellItem;
        this.lastUpsellItem = null;
        return result;
      }
      if (/\b(no|nope|nah|no thanks|no thank you|i'm good|im good|pass|skip|dont need|no gracias)\b/i.test(text)) {
        result.intent = "upsell_decline";
        this.lastUpsellItem = null;
        return result;
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
    if (/\b(spicy|hot sauce|chili|pico|salsa|picante|pica|halal|pork|beef|meat)\b/i.test(text) && !/\b(order|give|add|want)\b/i.test(text)) {
      result.intent = "food_info";
      return result;
    }

    // 5. Checkout Intent
    if (
      /\b(checkout|place order|finish order|ready to pay|bill|check|done|that's all|thats all|i'm done|im done|la cuenta|pagar|terminar|l'addition)\b/i.test(text) ||
      text === "done" || text === "pay" || text === "pagar"
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
    if (/\b(cart|my order|my bag|total|what did i order|review|ver orden|mi pedido)\b/i.test(text)) {
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

    // Multilingual Numbers
    const numberWords = {
      "a": 1, "an": 1, "one": 1, "two": 2, "three": 3, "four": 4, "five": 5,
      "six": 6, "seven": 7, "eight": 8, "nine": 9, "ten": 10, "eleven": 11,
      "twelve": 12, "dozen": 12, "couple": 2,
      "un": 1, "una": 1, "uno": 1, "dos": 2, "tres": 3, "cuatro": 4, "cinco": 5,
      "seis": 6, "siete": 7, "ocho": 8, "nueve": 9, "diez": 10,
      "ek": 1, "do": 2, "teen": 3, "char": 4, "paanch": 5
    };

    // Dictionary of Item Matchers (Ordered by specificity: combos first, then singles)
    const itemMatchers = [
      // 3 Quesataco Combo
      {
        id: "item_combo_3qt",
        keys: [
          "3 quesataco combo", "3 quesatacos combo", "quesataco combo", "quesatacos combo",
          "three quesataco combo", "three quesatacos combo", "combo de quesatacos",
          "combo 1", "combo one", "taco combo with agua", "quesataco with agua"
        ]
      },
      // $50 Taco Box
      {
        id: "item_taco_box_50",
        keys: [
          "50 taco box", "$50 taco box", "50 dollar taco box", "fifty dollar taco box",
          "fifty dollar box", "50 dollar box", "50 box", "taco box", "caja de tacos",
          "caja de 50", "family box", "caja familiar"
        ]
      },
      // Birria Ramen
      {
        id: "item_ramen_birria",
        keys: [
          "birria ramen", "ramen birria", "ramen", "ramen de birria", "noodles",
          "birria noodles", "noodle soup", "sopa ramen", "roman", "raymond"
        ]
      },
      // King Birria Pizza
      {
        id: "item_birria_pizza",
        keys: [
          "birria pizza", "king birria pizza", "pizza de birria", "taco pizza", "pizza birria", "pizza"
        ]
      },
      // King Fries
      {
        id: "item_king_fries",
        keys: [
          "king fries", "papas king", "birria fries", "papas con birria", "loaded fries", "king fry"
        ]
      },
      // Queen Fries
      {
        id: "item_queen_fries",
        keys: ["queen fries", "papas queen"]
      },
      // Birria Balls Deal (2 pcs)
      {
        id: "item_birria_balls_deal",
        keys: [
          "birria balls deal", "birria ball deal", "two birria balls", "2 birria balls",
          "dos birria balls", "dos bolas de birria"
        ]
      },
      // Birria Ball (Single)
      {
        id: "item_birria_ball",
        keys: ["birria ball", "bola de birria", "potato ball"]
      },
      // Birria Nachos
      {
        id: "item_birria_nachos",
        keys: ["birria nachos", "nachos de birria", "nachos"]
      },
      // Foodie Box
      {
        id: "item_foodie_box",
        keys: ["foodie box", "caja foodie"]
      },
      // King Burro
      {
        id: "item_king_burro",
        keys: [
          "king burro", "burro king", "birria burrito", "burrito de birria",
          "king burrito", "burro", "burrito"
        ]
      },
      // Quesadilla
      {
        id: "item_meat_quesadilla",
        keys: [
          "meat quesadilla", "quesadilla de carne", "quesadilla de birria", "beef quesadilla"
        ]
      },
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
          "quesataco plate", "plato de quesatacos", "orden de quesatacos", "quesataco plato"
        ]
      },
      // Quesataco (Single) - Includes broad fuzzy terms
      {
        id: "item_quesataco_single",
        keys: [
          "quesataco", "quesatacos", "quesabirria", "quesabirrias", "qusataco", "qusatacos",
          "cheese taco", "cheese tacos", "quesotaco", "quesotacos", "case of tacos", "casa tacos"
        ]
      },
      // Keto Taco
      {
        id: "item_keto_taco",
        keys: [
          "keto taco", "keto tacos", "taco keto", "tacos keto", "cheese shell taco"
        ]
      },
      // Street Taco Platter (10 pcs)
      {
        id: "item_street_taco_platter",
        keys: [
          "street taco platter", "charola de tacos", "10 street tacos", "ten street tacos", "diez tacos"
        ]
      },
      // Street Taco Plate
      {
        id: "item_street_taco_plate",
        keys: [
          "street taco plate", "plato de street tacos", "plato de tacos", "street tacos plate"
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
      // Consomé Dipping Cup (8 oz)
      {
        id: "item_consome_cup",
        keys: [
          "consome cup", "side consome", "consomé cup", "vaso de consomé", "dipping broth",
          "8 oz consome", "consome", "consomé", "caldo de birria", "caldo", "broth", "dip",
          "consume", "conzome", "consomme"
        ]
      },
      // Large Consomé (16 oz)
      {
        id: "item_consome_de_birria_large",
        keys: [
          "large consome", "consome grande", "tazón de birria", "16 oz consome"
        ]
      },
      // Mexican Bottle Drink
      {
        id: "item_mexican_bottle",
        keys: [
          "mexican bottle", "mexican coke", "coca mexicana", "coke", "coca", "refresco",
          "jarritos", "jarrito", "mexican soda", "agua fresca", "horchata", "jamaica", "soda", "drink"
        ]
      },
      // French Fries
      {
        id: "item_side_fries",
        keys: ["french fries", "side of fries", "papas fritas", "papas", "fries", "fry"]
      },
      // Rice
      {
        id: "item_rice",
        keys: ["rice", "arroz", "mexican rice", "arroz mexicano"]
      },
      // Taquitos
      {
        id: "item_birria_taquitos",
        keys: ["birria taquitos", "taquitos de birria", "taquitos"]
      }
    ];

    // Multi-Item Segment Extraction
    // Split by punctuation, conjunctions, or transitions between items
    const segments = text.split(/(?:,|\band\b|\by\b|\bplus\b|\bet\b|\bund\b|(?<=\w)\s+(?=(?:\d+|a|an|one|two|three|four|five|six|seven|eight|nine|ten|un|una|dos|tres|ek|do|teen)\b))/i);

    for (const segment of segments) {
      const cleanSeg = segment.trim();
      if (!cleanSeg) continue;

      let bestMatcher = null;
      let bestKey = null;
      let bestLen = 0;

      for (const matcher of itemMatchers) {
        for (const key of matcher.keys) {
          const escaped = key.replace(/[.*+?^${}()|[\]\\]/g, "\\$&");
          const keyRegex = new RegExp("(?:^|\\s)" + escaped + "(?:\\s|$)", "i");
          if (keyRegex.test(cleanSeg) || cleanSeg === key) {
            if (key.length > bestLen) {
              bestLen = key.length;
              bestMatcher = matcher;
              bestKey = key;
            }
          }
        }
      }

      if (bestMatcher) {
        // Prepare text for quantity detection:
        // Remove embedded numerals belonging to the dish title (e.g. 50 in $50 taco box, 3 in 3 quesataco combo)
        let segForQty = cleanSeg;
        if (bestMatcher.id === "item_taco_box_50") {
          segForQty = segForQty.replace(/\b(50|\$50|fifty)\s*(dollar)?\s*(taco)?\s*(box)?\b/gi, "box");
        } else if (bestMatcher.id === "item_combo_3qt") {
          segForQty = segForQty.replace(/\b(3|three)\s*quesataco/gi, "quesataco");
        } else if (bestMatcher.id === "item_birria_balls_deal") {
          segForQty = segForQty.replace(/\b(2|two)\s*birria/gi, "birria");
        } else if (bestMatcher.id === "item_quesataco_platter" || bestMatcher.id === "item_street_taco_platter") {
          segForQty = segForQty.replace(/\b(10|ten)\s*(street)?\s*taco/gi, "platter");
        }

        // Extract quantity
        let quantity = 1;
        const numPattern = /(\b(?:\d+|a|an|one|two|three|four|five|six|seven|eight|nine|ten|un|una|uno|dos|tres|cuatro|cinco|seis|ek|do|teen)\b)/i;
        const numMatch = segForQty.match(numPattern);
        if (numMatch) {
          const rawNum = numMatch[1].toLowerCase();
          quantity = numberWords[rawNum] || parseInt(rawNum) || 1;
          if (quantity > 20) quantity = 1; // sanity limit
        }

        const menuItem = MENU_ITEMS.find(m => m.id === bestMatcher.id);
        if (menuItem && !result.itemsFound.some(f => f.item.id === menuItem.id)) {
          const modifiers = {};

          if (cleanSeg.includes("asada")) modifiers.meat = "Carne Asada";
          else if (cleanSeg.includes("chicken") || cleanSeg.includes("pollo")) modifiers.meat = "Pollo Asado";
          else if (cleanSeg.includes("pastor")) modifiers.meat = "Al Pastor";
          else modifiers.meat = "Birria de Res (Beef)";

          if (cleanSeg.includes("no onion") || cleanSeg.includes("sin cebolla")) modifiers.noOnion = true;
          if (cleanSeg.includes("no cilantro") || cleanSeg.includes("sin cilantro")) modifiers.noCilantro = true;
          if (cleanSeg.includes("horchata")) modifiers.flavor = "Horchata";
          else if (cleanSeg.includes("jamaica")) modifiers.flavor = "Jamaica (Hibiscus)";
          else if (cleanSeg.includes("jarrito")) modifiers.flavor = "Jarritos";

          result.itemsFound.push({
            item: menuItem,
            quantity: quantity,
            modifiers: modifiers
          });
        }
      }
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
