import { OpenAI } from 'openai';

const openai = new OpenAI({
  apiKey: process.env.OPENAI_API_KEY,
});

const cardNames = {
  '1': 'The Fool',
  '2': 'The Magician',
  '3': 'The High Priestess',
  '4': 'The Empress',
  '5': 'The Emperor',
  '6': 'The Hierophant',
  '7': 'The Lovers',
  '8': 'The Chariot',
  '9': 'Strength',
  '10': 'The Hermit',
  '11': 'Wheel of Fortune',
  '12': 'Justice',
  '13': 'The Hanged Man',
  '14': 'Death',
  '15': 'Temperance',
  '16': 'The Devil',
  '17': 'The Tower',
  '18': 'The Star',
  '19': 'The Moon',
  '20': 'The Sun',
  '21': 'Judgement',
  '22': 'The World',
  '23': 'Ace of Wands',
  '24': 'Two of Wands',
  '25': 'Three of Wands',
  '26': 'Four of Wands',
  '27': 'Five of Wands',
  '28': 'Six of Wands',
  '29': 'Seven of Wands',
  '30': 'Eight of Wands',
  '31': 'Nine of Wands',
  '32': 'Ten of Wands',
  '33': 'Page of Wands',
  '34': 'Knight of Wands',
  '35': 'Queen of Wands',
  '36': 'King of Wands',
  '37': 'Ace of Cups',
  '38': 'Two of Cups',
  '39': 'Three of Cups',
  '40': 'Four of Cups',
  '41': 'Five of Cups',
  '42': 'Six of Cups',
  '43': 'Seven of Cups',
  '44': 'Eight of Cups',
  '45': 'Nine of Cups',
  '46': 'Ten of Cups',
  '47': 'Page of Cups',
  '48': 'Knight of Cups',
  '49': 'Queen of Cups',
  '50': 'King of Cups',
  '51': 'Ace of Swords',
  '52': 'Two of Swords',
  '53': 'Three of Swords',
  '54': 'Four of Swords',
  '55': 'Five of Swords',
  '56': 'Six of Swords',
  '57': 'Seven of Swords',
  '58': 'Eight of Swords',
  '59': 'Nine of Swords',
  '60': 'Ten of Swords',
  '61': 'Page of Swords',
  '62': 'Knight of Swords',
  '63': 'Queen of Swords',
  '64': 'King of Swords',
  '65': 'Ace of Pentacles',
  '66': 'Two of Pentacles',
  '67': 'Three of Pentacles',
  '68': 'Four of Pentacles', 
  '69': 'Five of Pentacles',
  '70': 'Six of Pentacles',
  '71': 'Seven of Pentacles',
  '72': 'Eight of Pentacles',
  '73': 'Nine of Pentacles',
  '74': 'Ten of Pentacles',
  '75': 'Page of Pentacles', 
  '76': 'Knight of Pentacles',
  '77': 'Queen of Pentacles',
  '78': 'King of Pentacles' 
};

export default async function handler(req, res) {
  if (req.method === 'POST') {
    const { question, cards, adjectives } = req.body; 
    console.log("Request body:", req.body);  
    console.log("Question:", question);
    console.log("Cards:", cards);
    console.log("Adjectives:", adjectives);



    try {
      const prediction = await generatePrediction(question, cards, adjectives); 
      console.log(prediction);
      res.status(200).json({ prediction });
    } catch (error) {
      console.error('Error generating prediction:', error);
      res.status(500).json({ error: 'Failed to generate prediction' });
    }
  } else {
    res.setHeader('Allow', ['POST']);
    res.status(405).end(`Method ${req.method} Not Allowed`);
  }
}

async function generatePrediction(question, cards, adjectives) { //all params

   
    const selectedCardNames = cards.map(card => cardNames[card] || card).filter(name => name);
    console.log("selected cards", selectedCardNames);

    const prompt = `question = ${question}, selected tarot cards = ${selectedCardNames.join(', ')}, personality types = ${adjectives.join(', ')}. Don't mention the personality traits literally, but consider them for the prediction.`;

    const response = await openai.chat.completions.create({
        model: 'gpt-4o-mini', 
        messages: [
            { role: "system", content: "You are a tarot card reader. Based on the question provided, the selected tarot cards and the personality types you create a seamlessly blending tarot reading where the types are woven into the answers of each single card. Do never mention the types themselves. Always mention at the end what the cards mean together. The length should not be longer than 800 characters. Use paragraphs to structure the text. Reference the cards without using '(' or ')'. Personality Type descriptions: Reformer: Principled, purposeful, perfectionist. Fears corruption, desires integrity. Vice: anger, virtue: serenity. Helper: Caring, empathetic, people-pleasing. Fears being unlovable, desires love. Vice: pride, virtue: humility.Achiever: Ambitious, adaptable, image-conscious. Fears worthlessness, desires admiration. Vice: deceit, virtue: truthfulness.Individualist: Sensitive, creative, introspective. Fears being ordinary, desires authenticity. Vice: envy, virtue: equanimity.Investigator: Independent, perceptive, knowledge-seeking. Fears incompetence, desires understanding. Vice: avarice, virtue: detachment.Loyalist: Responsible, security-oriented, trustworthy. Fears lack of support, desires guidance. Vice: fear, virtue: courage.Enthusiast: Energetic, spontaneous, optimistic. Fears deprivation, desires contentment. Vice: gluttony, virtue: sobriety.Challenger: Assertive, confident, protective. Fears being controlled, desires autonomy. Vice: lust, virtue: innocence.Peacemaker: Agreeable, patient, supportive. Fears conflict, desires peace. Vice: sloth, virtue: action." },
            { role: 'user', content: prompt },
        ],
        max_tokens: 500,
    });

    return response.choices[0].message.content.trim();
}

