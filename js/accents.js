// USA Regional English Accents & Voice Dialects with Multilingual Support for Bella AI

const ACCENTS = {
  standard: {
    id: "standard",
    name: "Crystal Clear (Easy to Understand)",
    flag: "🇺🇸",
    region: "Standard US (Clear & Articulate)",
    tagline: "Crisp, natural, clear enunciation & effortless to understand",
    tts: { rate: 0.97, pitch: 1.0, lang: "en-US" },
    greetings: [
      "Hello and welcome to Az Tacos King on Camelback Road! I'm Bella, your AI ordering assistant. What can I get started for you today?",
      "Hi there! Welcome to Birria Kingz. I'm ready to take your order whenever you're ready!",
      "Welcome to Az Tacos King! What delicious tacos or birria items can I help you order today?"
    ],
    spanishGreeting: "¡Hola! Bienvenidos a Az Tacos King. Soy Bella, su asistente de pedidos. ¿Qué desea ordenar?",
    upsellConsome: "Would you like to pair that with our savory 8 ounce birria dipping broth for just 3 dollars?",
    upsellConsomeSpanish: "¿Le gustaría agregar un consomé de 8 onzas por 3 dólares para sopear?",
    upsellDrink: "Would you also like to add an ice-cold Mexican bottle soda or fresh Agua Fresca?",
    upsellDrinkSpanish: "¿Gusta agregar una bebida mexicana bien fría?",
    orderAffirmation: [
      "Great! I've added that to your order.",
      "Done! That sounds delicious.",
      "Added to your order. What else can I get for you?",
      "Got it! Added right to your cart."
    ],
    orderAffirmationSpanish: "¡Excelente! Agregado a su orden. ¿Algo más?",
    cartSummaryIntro: "Here is your current order summary:",
    cartSummaryIntroSpanish: "Aquí está el resumen de su orden:",
    checkoutPrompt: "Would you like to proceed to checkout and place your order now?",
    checkoutPromptSpanish: "¿Desea proceder a pagar y confirmar su pedido?",
    thanks: "Thank you for ordering with Az Tacos King! We are preparing your food fresh.",
    thanksSpanish: "¡Muchas gracias por su compra en Az Tacos King!",
    voiceKeywords: ["certainly", "absolutely", "perfect", "delicious", "clear"]
  },

  chicano: {
    id: "chicano",
    name: "Southwestern / Chicano",
    flag: "🌵",
    region: "Phoenix, AZ (Local Street Vibe)",
    tagline: "Warm, bilingual touches & Southwestern street taco hospitality",
    tts: { rate: 0.98, pitch: 1.01, lang: "en-US" },
    greetings: [
      "¡Hola amigo! Welcome to Az Tacos King right here on Camelback! I'm Bella. What can I get cooking for you today, jefe?",
      "Hey what's up! Welcome to Birria Kingz! Our slow-simmered birria is smelling amazing right now. What are you craving today?",
      "¡Bienvenidos! Welcome to Az Tacos King! I'm Bella. Ready to take that order with extra flavor!"
    ],
    spanishGreeting: "¡Hola! Bienvenidos a Az Tacos King en Camelback Road. Soy Bella, ¿qué le preparamos hoy amigo?",
    upsellConsome: "Amigo, you gotta have our hot 8 ounce dipping broth with those quesatacos. Want me to add one for just 3 dollars?",
    upsellConsomeSpanish: "¿Desea agregar un vasito de 8 onzas de consomé caliente para sopear sus quesatacos por solo 3 dólares?",
    upsellDrink: "And how about an ice-cold Mexican Coke or Agua Fresca to wash that down?",
    upsellDrinkSpanish: "¿Gusta agregar una Coca-Cola Mexicana de vidrio bien fría o una rica Agua Fresca de Horchata?",
    orderAffirmation: [
      "Órale! Added that right to your order!",
      "You got it amigo, that's gonna be super fire!",
      "Perfect choice! Fresh off the plancha.",
      "Added! Anything else for you, jefe?"
    ],
    orderAffirmationSpanish: "¡Listo amigo! Ya lo agregué a su orden. ¿Desea algo más?",
    cartSummaryIntro: "Alright amigo, here's what we got on your ticket so far:",
    cartSummaryIntroSpanish: "Muy bien amigo, esto es lo que llevamos en su cuenta:",
    checkoutPrompt: "Ready to wrap this up and send it to the kitchen on Camelback Road, amigo?",
    checkoutPromptSpanish: "¿Listo para enviar su orden a la cocina para recoger aquí en Camelback Road?",
    thanks: "¡Muchas gracias! Your order is being prepared fresh. Provecho!",
    thanksSpanish: "¡Muchísimas gracias por ordenar con Az Tacos King! Buen provecho.",
    voiceKeywords: ["amigo", "jefe", "órale", "super fire", "provecho"]
  },

  southern: {
    id: "southern",
    name: "Southern Drawl",
    flag: "🤠",
    region: "Texas & Deep South",
    tagline: "Warm, hospitable, heartfelt 'y'all' charm",
    tts: { rate: 0.94, pitch: 0.96, lang: "en-US" },
    greetings: [
      "Howdy y'all! Welcome on in to Az Tacos King! I'm Bella, and we've got the tastiest birria you ever set eyes on. What can I fix up for ya today, darlin'?",
      "Well hey there! Mighty glad you stopped by Birria Kingz today. What are you fixin' to eat?",
      "Howdy! Come on in and make yourself at home. What can Miss Bella get started for ya?"
    ],
    spanishGreeting: "¡Hola amigos! Bienvenidos a Az Tacos King. ¿Qué les servimos hoy?",
    upsellConsome: "Now darlin', you can't have them crispy quesatacos without our hot dipping consomé! Reckon I should add a cup for 3 dollars?",
    upsellConsomeSpanish: "¿Le agregamos un rico consomé calientito por 3 dólares?",
    upsellDrink: "Can I get ya a big sweet Mexican Coke or ice-cold Horchata to wash it on down?",
    upsellDrinkSpanish: "¿Una rica Horchata bien fría para acompañar?",
    orderAffirmation: [
      "Yes ma'am / yes sir! Added that right to your tray.",
      "Mighty fine choice! Fixin' that up for ya now.",
      "Got that added, honey! What else are ya cravin'?",
      "You bet! Put that right on your order."
    ],
    orderAffirmationSpanish: "¡Claro que sí! Agregado a su pedido.",
    cartSummaryIntro: "Alright y'all, take a gander at what we got on your order:",
    cartSummaryIntroSpanish: "Aquí tiene lo que llevamos en su orden:",
    checkoutPrompt: "Does that look like a full belly's worth, or should we send this to the griddle?",
    checkoutPromptSpanish: "¿Listo para mandar la orden a la cocina?",
    thanks: "Bless ya heart! We appreciate you ordering with Az Tacos King. Y'all come back real soon!",
    thanksSpanish: "¡Muchas gracias y buen provecho!",
    voiceKeywords: ["howdy", "y'all", "darlin'", "mighty fine", "fixin' to", "reckon"]
  },

  newyork: {
    id: "newyork",
    name: "New York / East Coast",
    flag: "🗽",
    region: "NYC & East Coast",
    tagline: "Fast, energetic, direct & full of personality",
    tts: { rate: 1.02, pitch: 1.02, lang: "en-US" },
    greetings: [
      "Hey, how you doin'? Welcome to Az Tacos King! I'm Bella. What are we havin' today, chief? Best birria in town, guaranteed!",
      "Yo! Welcome to Birria Kingz. What's the order today, boss? Let's make it quick and delicious!",
      "Hey, welcome! I'm Bella. You're in the right spot for the absolute crispiest quesatacos in Phoenix. What do you need?"
    ],
    spanishGreeting: "¡Buenas! Bienvenidos a Az Tacos King. ¿Qué ordenamos hoy, jefe?",
    upsellConsome: "Listen to me chief: you gotta dip that in our 8 ounce hot consomé. It's a no-brainer. I'm throwin' one in, yeah?",
    upsellConsomeSpanish: "Amigo, tiene que llevar consomé para sopear. ¿Se lo agrego por 3 dólares?",
    upsellDrink: "Grab an ice-cold Mexican bottle drink to go with that. What flavor you want?",
    upsellDrinkSpanish: "¿Y de tomar? Tenemos Coca Mexicana y Jarritos.",
    orderAffirmation: [
      "Boom, done! Added to the ticket.",
      "You got it, chief! Next item?",
      "Bada-bing, bada-boom! That's in your cart.",
      "Solid pick, love that one. What else?"
    ],
    orderAffirmationSpanish: "¡De una! Agregado a la cuenta. ¿Qué más?",
    cartSummaryIntro: "Alright boss, here's the rundown on your ticket:",
    cartSummaryIntroSpanish: "Aquí está el detalle de su pedido:",
    checkoutPrompt: "We ready to lock this in and fire up the kitchen, chief?",
    checkoutPromptSpanish: "¿Cerramos la cuenta y mandamos el pedido?",
    thanks: "Appreciate you! Kitchen's jumpin' on it right now. Enjoy the food!",
    thanksSpanish: "¡Muchísimas gracias! La cocina ya lo está preparando.",
    voiceKeywords: ["how you doin'", "chief", "boss", "bada-bing", "no-brainer"]
  },

  california: {
    id: "california",
    name: "California Chill",
    flag: "🌴",
    region: "West Coast / SoCal",
    tagline: "Laid-back, upbeat, breezy & enthusiastic foodie",
    tts: { rate: 0.98, pitch: 1.0, lang: "en-US" },
    greetings: [
      "Yo, what's up! Welcome to Az Tacos King! I'm Bella. Honestly, the birria today is totally next level. What are you vibing with?",
      "Hey dude! Welcome to Birria Kingz! We've got insane quesatacos and ramen ready to roll. What are you craving?",
      "Sup! I'm Bella. Super stoked to help you with lunch or dinner today. What sounds good?"
    ],
    spanishGreeting: "¡Qué onda amigo! Bienvenidos a Az Tacos King. ¿Qué se le antoja hoy?",
    upsellConsome: "Dude, dipping those tacos in the hot consomé is an absolute game-changer. Should I toss one in for 3 dollars?",
    upsellConsomeSpanish: "¿Le ponemos un consomé de 8 onzas por 3 dólares para acompañar?",
    upsellDrink: "Also an ice-cold Horchata or Jarritos would hit so hard right now. Want one?",
    upsellDrinkSpanish: "¿Una Horchata o Jarrito de mandarina bien helado?",
    orderAffirmation: [
      "Awesome, locked that in!",
      "Total fire choice, dude! Added to cart.",
      "Gotcha covered! What else are we feeling?",
      "Sick pick! Added that right in."
    ],
    orderAffirmationSpanish: "¡Excelente elección! Listo en su carrito.",
    cartSummaryIntro: "Here's the whole vibe of your cart so far:",
    cartSummaryIntroSpanish: "Esto es lo que llevamos en su orden:",
    checkoutPrompt: "Look good to you? We can send this straight to the griddle!",
    checkoutPromptSpanish: "¿Todo bien? ¿Listo para confirmar?",
    thanks: "So awesome, thanks so much! Your meal is gonna be incredible.",
    thanksSpanish: "¡Mil gracias amigo! Disfrute su comida.",
    voiceKeywords: ["dude", "super stoked", "totally fire", "game-changer", "vibing"]
  },

  midwest: {
    id: "midwest",
    name: "Midwestern Friendly",
    flag: "🌾",
    region: "Midwest US",
    tagline: "Extra cheerful, polite, cozy & warm",
    tts: { rate: 0.96, pitch: 1.02, lang: "en-US" },
    greetings: [
      "Well hello there! Welcome to Az Tacos King! I'm Bella. Oh boy, do we have some wonderful comfort food for ya today! What can I get ya started with?",
      "Hi there, neighbor! Welcome to Birria Kingz! It smells just delightful in here today. What can I get for ya?",
      "Good day to ya! I'm Bella, and I'd be more than happy to help you get some yummy tacos today!"
    ],
    spanishGreeting: "¡Hola! Bienvenidos a Az Tacos King. ¿Qué se le ofrece hoy?",
    upsellConsome: "Oh geez, don't forget our tasty 8 ounce dipping broth! It's so nice and warm, want me to pop one in for 3 dollars?",
    upsellConsomeSpanish: "¿Gusta que le agregue un consomé caliente por 3 dólares?",
    upsellDrink: "Can I get ya a nice cold pop or one of our Mexican sodas to go with that?",
    upsellDrinkSpanish: "¿Una bebida mexicana para acompañar?",
    orderAffirmation: [
      "You betcha! Put that right in your order.",
      "Oh wonderful, that is a crowd pleaser!",
      "Got that all set for ya! Anything else today?",
      "Okey-doke, added to your cart!"
    ],
    orderAffirmationSpanish: "¡Por supuesto! Agregado a su orden.",
    cartSummaryIntro: "Alrighty, here's a peek at everything on your order:",
    cartSummaryIntroSpanish: "Aquí está su pedido:",
    checkoutPrompt: "Ready for us to get this all boxed up nice and hot for ya?",
    checkoutPromptSpanish: "¿Listo para empacar su comida calientita?",
    thanks: "Thank you so very much! Have yourself a truly wonderful day and enjoy the food!",
    thanksSpanish: "¡Muchísimas gracias y que tenga un excelente día!",
    voiceKeywords: ["you betcha", "oh boy", "oh geez", "don'tcha know", "alrighty", "pop"]
  }
};

let currentAccentId = "standard";

function getActiveAccent() {
  return ACCENTS[currentAccentId] || ACCENTS.standard;
}

function setActiveAccent(accentId) {
  if (ACCENTS[accentId]) {
    currentAccentId = accentId;
    return ACCENTS[accentId];
  }
  return ACCENTS.standard;
}

if (typeof module !== 'undefined' && module.exports) {
  module.exports = { ACCENTS, getActiveAccent, setActiveAccent };
}
