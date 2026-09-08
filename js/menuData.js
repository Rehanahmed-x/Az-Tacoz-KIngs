// Az Tacos King / Birria Kingz ATK - Full Menu Data
// Extracted from official Square Online site: https://birriakingzatk.square.site/

const RESTAURANT_INFO = {
  name: "Az Tacos King",
  brandSubtitle: "Birria Kingz ATK",
  address: "2030 W Camelback Rd, Phoenix, AZ 85015-3441, US",
  phone: "+1 480-410-1914",
  phoneDisplay: "(480) 410-1914",
  email: "aztacosking@gmail.com",
  squareUrl: "https://birriakingzatk.square.site/?location_id=LP862J1T4DZXK&fulfillment=PICKUP",
  mapsUrl: "https://maps.google.com/?q=2030+W+Camelback+Rd,+Phoenix,+AZ+85015",
  hours: "Open Daily • 10:30 AM - 10:00 PM",
  taxRate: 0.086 // Phoenix, AZ tax rate 8.6%
};

const MENU_ITEMS = [
  {
    id: "item_combo_3qt",
    name: "3 Quesataco Consomé, & Medium Agua Combo",
    price: 13.99,
    category: "Combos & Specials",
    popular: true,
    badge: "🔥 #1 Best Seller",
    description: "3 crispy birria quesatacos with melted cheese, served with an 8 oz hot dipping consomé and a medium traditional Mexican Agua Fresca.",
    image: "https://147991831.cdn6.editmysite.com/uploads/1/4/7/9/147991831/3VZOHNN2ZRVR66M5.jpeg?width=600",
    options: {
      meat: ["Birria de Res (Beef)", "Carne Asada", "Pollo Asado", "Al Pastor"],
      agua: ["Horchata", "Jamaica (Hibiscus)", "Piña (Pineapple)", "Watermelon"],
      salsa: ["Mild Verde", "Spicy Roja", "Both Salsas", "No Salsa"]
    }
  },
  {
    id: "item_taco_box_50",
    name: "$50 Taco Box",
    price: 50.00,
    category: "Combos & Specials",
    popular: true,
    badge: "👑 King Feeder",
    description: "The ultimate family feast! 11 crispy Quesatacos, 11 traditional Street Tacos, and 2 large hot Consomés. Pick up to 2 meat choices.",
    image: "https://147991831.cdn6.editmysite.com/uploads/1/4/7/9/147991831/6W7GNSISVP7PJQXQLNQSS66Y.jpeg?width=600",
    options: {
      meat1: ["Birria de Res", "Carne Asada", "Pollo Asado", "Al Pastor"],
      meat2: ["Birria de Res", "Carne Asada", "Pollo Asado", "Al Pastor"],
      salsa: ["Both Verde & Roja", "Spicy Roja Only", "Mild Verde Only"]
    }
  },
  {
    id: "item_ramen_birria",
    name: "Ramen Birria",
    price: 15.00,
    category: "Birria & Consomé",
    popular: true,
    badge: "🍜 Viral Favorite",
    description: "Steaming hot savory birria broth filled with noodles, tender shredded beef birria, onions, cilantro, and fresh lime wedges.",
    image: "https://147991831.cdn6.editmysite.com/uploads/1/4/7/9/147991831/XNLWKBFQNFDP7CXH.jpeg?width=600",
    options: {
      spice: ["Regular Flavorful", "Extra Spicy Kick", "Mild"],
      toppings: ["Onions & Cilantro Included", "No Onions", "No Cilantro", "Extra Lime"]
    }
  },
  {
    id: "item_quesataco_single",
    name: "Quesataco",
    price: 3.50,
    category: "Tacos & Plates",
    popular: true,
    badge: "🌮 Signature",
    description: "Crispy corn tortilla dipped in birria chili oil, griddled with melted Monterey cheese, folded around tender slow-cooked birria beef.",
    image: "https://147991831.cdn6.editmysite.com/uploads/1/4/7/9/147991831/3SAJMIE6V3OMH2DX.jpeg?width=600",
    options: {
      meat: ["Birria de Res (Shredded Beef)", "Carne Asada", "Pollo", "Al Pastor"],
      style: ["Traditional with Cilantro & Onion", "Cheese Only (Plain)", "Extra Crispy Shell"]
    }
  },
  {
    id: "item_birria_pizza",
    name: "King Birria Pizza",
    price: 40.00,
    category: "Burros & Quesadillas",
    popular: true,
    badge: "🍕 Crowd Pleaser",
    description: "King-sized birria pizza crafted with triple-layered large flour tortillas stuffed with birria beef, melted cheese, cilantro, and onions. Includes 2 dipping consomés.",
    image: "https://147991831.cdn6.editmysite.com/uploads/1/4/7/9/147991831/G4FK5NPQRFLFRAR2.jpeg?width=600",
    options: {
      cut: ["8 Big Slices", "12 Slices"],
      extras: ["Includes 2 Consomés", "Add Extra Consomé (+$3.00)"]
    }
  },
  {
    id: "item_king_fries",
    name: "King Fries",
    price: 15.00,
    category: "Sides & Appetizers",
    popular: true,
    badge: "🍟 Loaded",
    description: "Huge bed of golden crispy fries smothered in birria beef, creamy melted nacho cheese, sour cream, chipotle sauce, onions, and cilantro.",
    image: "https://147991831.cdn6.editmysite.com/uploads/1/4/7/9/147991831/HMM4GWUHCQNHM63E.jpeg?width=600",
    options: {
      toppings: ["All The Works", "No Sour Cream", "No Chipotle Cream", "Sauces on the Side"]
    }
  },
  {
    id: "item_queen_fries",
    name: "Queen Fries",
    price: 13.00,
    category: "Sides & Appetizers",
    popular: false,
    badge: "🍟 Delicious",
    description: "Golden fries loaded with savory birria beef, melted cheese, cilantro, and creamy house dressing.",
    image: "https://147991831.cdn6.editmysite.com/uploads/1/4/7/9/147991831/XPPCC5YFDJV34NNK.jpeg?width=600"
  },
  {
    id: "item_birria_ball",
    name: "Birria Ball",
    price: 7.00,
    category: "Sides & Appetizers",
    popular: true,
    badge: "✨ Unique ATK",
    description: "Crispy fried golden potato ball stuffed with succulent melted cheese and juicy birria beef, served with dipping sauce.",
    image: "https://147991831.cdn6.editmysite.com/uploads/1/4/7/9/147991831/CKJVVVR2U2PTGGM5.jpeg?width=600"
  },
  {
    id: "item_birria_balls_deal",
    name: "Birria Balls Deal (2 pcs)",
    price: 10.00,
    category: "Combos & Specials",
    popular: true,
    badge: "🔥 Daily Deal",
    description: "Two house-made crispy birria balls stuffed with birria & cheese, served with nacho cheese & signature chipotle sauce.",
    image: "https://147991831.cdn6.editmysite.com/uploads/1/4/7/9/147991831/MI4SSH6DGQJYWGDG.jpeg?width=600"
  },
  {
    id: "item_birria_nachos",
    name: "Birria Nachos",
    price: 14.00,
    category: "Tacos & Plates",
    popular: false,
    badge: "🧀 Cheesy",
    description: "Crispy tortilla chips topped with juicy beef birria, melted nacho cheese, jalapeños, sour cream, and fresh pico.",
    image: "https://147991831.cdn6.editmysite.com/uploads/1/4/7/9/147991831/FWIUBR3FQAXIXBBS.jpeg?width=600"
  },
  {
    id: "item_foodie_box",
    name: "Foodie Box",
    price: 35.00,
    category: "Combos & Specials",
    popular: true,
    badge: "⭐ Must Try",
    description: "The ultimate tasting experience! Includes 1 King Burro, Queen Fries, 1 Birria Ball, and 2 Quesatacos.",
    image: "https://147991831.cdn6.editmysite.com/uploads/1/4/7/9/147991831/Z2RSWCM7BLFUIRO7.jpeg?width=600"
  },
  {
    id: "item_king_burro",
    name: "King Burro",
    price: 15.00,
    category: "Burros & Quesadillas",
    popular: true,
    badge: "🌯 Giant Burro",
    description: "Massive flour tortilla stuffed with slow-cooked birria, Mexican rice, beans, melted cheese, cilantro, and onions.",
    image: "https://147991831.cdn6.editmysite.com/uploads/1/4/7/9/147991831/SJI3IGW2UM3WJBMW.jpeg?width=600"
  },
  {
    id: "item_meat_quesadilla",
    name: "Meat Quesadilla",
    price: 13.00,
    category: "Burros & Quesadillas",
    popular: false,
    description: "Large 12-inch flour tortilla filled with your choice of meat and copious melted Monterey Jack cheese, grilled to golden perfection.",
    image: "https://147991831.cdn6.editmysite.com/uploads/1/4/7/9/147991831/M3JWDXHEX4YSUVGA.jpeg?width=600"
  },
  {
    id: "item_quesataco_plate",
    name: "Quesataco Plate (3 pcs)",
    price: 14.99,
    category: "Tacos & Plates",
    popular: true,
    badge: "🍽️ Complete Meal",
    description: "3 crispy cheesy quesatacos with rice, beans, onions, cilantro, limes, and 4 oz consomé for dipping.",
    image: "https://147991831.cdn6.editmysite.com/uploads/1/4/7/9/147991831/6HGZG6FAKMFKLMUX.jpeg?width=600"
  },
  {
    id: "item_quesataco_platter",
    name: "Quesataco Platter (10 pcs)",
    price: 32.00,
    category: "Combos & Specials",
    popular: true,
    badge: "🎉 Party Pack",
    description: "10 signature birria quesatacos with melted cheese, served with 2 large dipping consomés, limes, and salsas.",
    image: "https://147991831.cdn6.editmysite.com/uploads/1/4/7/9/147991831/NPCYGQO3GNKIIBES.jpeg?width=600"
  },
  {
    id: "item_birria_platter_ramen_2qt",
    name: "Birria Platter Ramen & 2 Qt Combo",
    price: 18.00,
    category: "Combos & Specials",
    popular: true,
    description: "Complete feast with birria ramen, rich dipping broth, and 2 quesatacos on the side.",
    image: "https://147991831.cdn6.editmysite.com/uploads/1/4/7/9/147991831/2ZA6W6UP7TY3UYG7.jpeg?width=600"
  },
  {
    id: "item_keto_taco",
    name: "Keto Taco",
    price: 3.50,
    category: "Tacos & Plates",
    popular: false,
    badge: "🥑 Low Carb / Keto",
    description: "Zero carb tortilla substitute made of crispy griddled cheese folded around tender birria meat.",
    image: "https://147991831.cdn6.editmysite.com/uploads/1/4/7/9/147991831/RUDYCAOWQX2FY5FE.jpeg?width=600"
  },
  {
    id: "item_street_taco_plate",
    name: "Street Taco Plate",
    price: 12.99,
    category: "Tacos & Plates",
    popular: false,
    description: "3 traditional street tacos on warm corn tortillas served with Mexican rice, beans, and fresh limes.",
    image: "https://147991831.cdn6.editmysite.com/uploads/1/4/7/9/147991831/WBIE5GXBLQLKUYQH.jpeg?width=600"
  },
  {
    id: "item_street_taco",
    name: "Street Taco (Single)",
    price: 2.50,
    category: "Tacos & Plates",
    popular: false,
    description: "Traditional Mexican street taco on doubled yellow corn tortilla with your choice of protein, cilantro, and chopped onions."
  },
  {
    id: "item_street_taco_platter",
    name: "Street Taco Platter (10 pcs)",
    price: 25.00,
    category: "Combos & Specials",
    popular: false,
    description: "10 birria street tacos with your choice of up to two proteins. Includes radish, limes, and salsas."
  },
  {
    id: "item_king_platter_combo",
    name: "King Platter Combo",
    price: 25.00,
    category: "Combos & Specials",
    popular: false,
    description: "Ultimate sampler featuring 2 quesatacos, 2 street tacos, consomé, rice, beans, and a drink."
  },
  {
    id: "item_birria_de_res_plate",
    name: "Birria de Res Plate",
    price: 15.00,
    category: "Tacos & Plates",
    popular: false,
    description: "Generous plate of shredded beef birria in rich chili jus, served with Mexican rice, beans, and warm corn tortillas."
  },
  {
    id: "item_consome_de_birria_large",
    name: "Consomé De Birria (Large 16oz)",
    price: 15.00,
    category: "Birria & Consomé",
    popular: false,
    description: "Large 16 oz bowl of hearty birria broth packed with shredded beef, herbs, onions, and cilantro."
  },
  {
    id: "item_consome_cup",
    name: "Consomé (8 oz Side Dipping Cup)",
    price: 3.00,
    category: "Birria & Consomé",
    popular: true,
    badge: "🥣 Dipping Cup",
    description: "8 oz cup of rich savory slow-simmered birria dipping broth. Essential for dipping your quesatacos!"
  },
  {
    id: "item_bean_cheese_burro",
    name: "Bean & Cheese Burro",
    price: 8.00,
    category: "Burros & Quesadillas",
    popular: false,
    description: "Warm flour tortilla filled with authentic refried pinto beans and melted Mexican blend cheese."
  },
  {
    id: "item_cheese_quesadilla",
    name: "Cheese Quesadilla",
    price: 7.00,
    category: "Burros & Quesadillas",
    popular: false,
    description: "Large toasted flour tortilla filled with melted Monterey Jack cheese."
  },
  {
    id: "item_birria_taquitos",
    name: "Birria Taquitos (4 pcs)",
    price: 12.00,
    category: "Sides & Appetizers",
    popular: false,
    description: "4 rolled crispy corn tortillas filled with seasoned birria beef, topped with shredded lettuce and sour cream."
  },
  {
    id: "item_mexican_bottle",
    name: "Mexican Glass Bottle Soda",
    price: 5.00,
    category: "Beverages & Drinks",
    popular: true,
    badge: "🥤 Ice Cold",
    description: "Authentic Mexican soda made with real cane sugar. Choose Mexican Coke, Jarritos Mandarin, Lime, or Pineapple.",
    options: {
      flavor: ["Mexican Coca-Cola (Glass)", "Jarritos Mandarin", "Jarritos Pineapple", "Jarritos Tamarind", "Sidral Mundet (Apple)"]
    }
  },
  {
    id: "item_side_fries",
    name: "Side of Crispy Fries",
    price: 6.00,
    category: "Sides & Appetizers",
    popular: false,
    description: "Generous basket of golden seasoned french fries."
  },
  {
    id: "item_rice",
    name: "Mexican Rice",
    price: 3.00,
    category: "Sides & Appetizers",
    popular: false,
    description: "Traditional seasoned Mexican tomato rice."
  },
  {
    id: "item_chipotle_cream",
    name: "Side of Chipotle Cream",
    price: 1.00,
    category: "Sides & Appetizers",
    popular: false,
    description: "House-made creamy chipotle sauce with a smoky kick."
  },
  {
    id: "item_sour_cream",
    name: "Side of Sour Cream",
    price: 2.00,
    category: "Sides & Appetizers",
    popular: false,
    description: "Cool, rich sour cream."
  },
  {
    id: "item_corn_tortillas",
    name: "Side of Corn Tortillas (3 pcs)",
    price: 1.75,
    category: "Sides & Appetizers",
    popular: false,
    description: "3 warm griddled corn tortillas."
  },
  {
    id: "item_flour_tortilla",
    name: "Flour Tortilla (Single)",
    price: 2.00,
    category: "Sides & Appetizers",
    popular: false,
    description: "One large warm flour tortilla."
  }
];

const MENU_CATEGORIES = [
  "All Items",
  "Combos & Specials",
  "Tacos & Plates",
  "Birria & Consomé",
  "Burros & Quesadillas",
  "Sides & Appetizers",
  "Beverages & Drinks"
];

if (typeof module !== 'undefined' && module.exports) {
  module.exports = { RESTAURANT_INFO, MENU_ITEMS, MENU_CATEGORIES };
}
