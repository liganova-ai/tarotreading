export const LOADING_MESSAGES = {
  en: [
    'Your future is being interpreted…',
    'The cards are revealing their story…',
    'A new perspective is taking shape…',
    'The threads of your reading are coming together…',
    'Your question is finding its reflection…',
    'The symbols are beginning to speak…',
    'A moment of clarity is drawing closer…',
    'The cards are weaving their guidance…',
    'Hidden connections are coming to light…',
    'Your reading is unfolding, one card at a time…',
  ],
  de: [
    'Deine Zukunft wird gedeutet…',
    'Die Karten offenbaren ihre Geschichte…',
    'Eine neue Perspektive nimmt Gestalt an…',
    'Die Fäden deiner Deutung finden zusammen…',
    'Deine Frage findet ihren Widerhall…',
    'Die Symbole beginnen zu sprechen…',
    'Ein Moment der Klarheit rückt näher…',
    'Die Karten weben ihren Rat…',
    'Verborgene Verbindungen kommen ans Licht…',
    'Deine Deutung entfaltet sich, Karte für Karte…',
  ],
  es: [
    'Tu futuro se está interpretando…',
    'Las cartas están revelando su historia…',
    'Una nueva perspectiva está tomando forma…',
    'Los hilos de tu lectura se están uniendo…',
    'Tu pregunta está encontrando su reflejo…',
    'Los símbolos comienzan a hablar…',
    'Un momento de claridad se acerca…',
    'Las cartas están tejiendo su guía…',
    'Las conexiones ocultas salen a la luz…',
    'Tu lectura se despliega, carta a carta…',
  ],
  fr: [
    'Ton avenir se dessine…',
    'Les cartes révèlent leur histoire…',
    'Une nouvelle perspective prend forme…',
    'Les fils de ta lecture se rejoignent…',
    'Ta question trouve son écho…',
    'Les symboles commencent à parler…',
    'Un instant de clarté se rapproche…',
    'Les cartes tissent leurs conseils…',
    'Des liens cachés se révèlent…',
    'Ta lecture se dévoile, carte après carte…',
  ],
  nl: [
    'Je toekomst wordt geduid…',
    'De kaarten onthullen hun verhaal…',
    'Een nieuw perspectief krijgt vorm…',
    'De draden van je lezing komen samen…',
    'Je vraag vindt haar weerspiegeling…',
    'De symbolen beginnen te spreken…',
    'Een moment van helderheid komt dichterbij…',
    'De kaarten verweven hun inzichten…',
    'Verborgen verbanden komen aan het licht…',
    'Je lezing ontvouwt zich, kaart voor kaart…',
  ],
  it: [
    'Il tuo futuro viene interpretato…',
    'Le carte stanno rivelando la loro storia…',
    'Una nuova prospettiva sta prendendo forma…',
    'I fili della tua lettura si intrecciano…',
    'La tua domanda trova il suo riflesso…',
    'I simboli cominciano a parlare…',
    'Un momento di chiarezza si avvicina…',
    'Le carte stanno tessendo i loro consigli…',
    'I legami nascosti vengono alla luce…',
    'La tua lettura si svela, una carta alla volta…',
  ],
};

// Shuffle a complete cycle, avoiding a repeat at the boundary between cycles.
export function shuffleMessages(messages, previous, random = Math.random) {
  const shuffled = [...messages];
  for (let index = shuffled.length - 1; index > 0; index--) {
    const other = Math.floor(random() * (index + 1));
    [shuffled[index], shuffled[other]] = [shuffled[other], shuffled[index]];
  }
  if (shuffled.length > 1 && shuffled[0] === previous) {
    [shuffled[0], shuffled[1]] = [shuffled[1], shuffled[0]];
  }
  return shuffled;
}
