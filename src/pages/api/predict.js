import { normalizeReadingSegments, READING_SEGMENTS_SCHEMA } from '@/lib/readingSegments.mjs';
import { oracleFailureCode, oracleAvailabilityMessage } from '@/lib/oracleAvailability.mjs';
import { getOpenAI } from '@/lib/openai';
import { isTarotQuestion, QUESTION_ERROR, READING_PROMPT, structuredReply, validateReadingInput } from '@/lib/tarotValidation.mjs';

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

const traits = {
  Reformer: 'principled, purposeful, perfectionistic', Helper: 'caring, empathetic, people-pleasing',
  Achiever: 'ambitious, adaptable, image-conscious', Individualist: 'sensitive, creative, introspective',
  Investigator: 'independent, perceptive, knowledge-seeking', Loyalist: 'responsible, security-oriented, trustworthy',
  Enthusiast: 'energetic, spontaneous, optimistic', Challenger: 'assertive, confident, protective',
  Peacemaker: 'agreeable, patient, supportive',
};

export const config = { api: { bodyParser: { sizeLimit: '8kb' } } };

export default async function handler(req, res) {
  res.setHeader('Cache-Control', 'no-store');
  if (req.method !== 'POST') { res.setHeader('Allow', 'POST'); return res.status(405).json({ error: 'Method not allowed.' }); }
  const input = validateReadingInput(req.body);
  if (!input.ok) return res.status(400).json({ error: input.error });
  try {
    const client = getOpenAI();
    // Always re-check here: a client can skip the question page entirely.
    if (!await isTarotQuestion(client, input.question)) return res.status(400).json({ error: QUESTION_ERROR });
    const result = await structuredReply(client, READING_PROMPT, {
      question: input.question,
      cards: input.cards.map(card => cardNames[card]),
      personalityTraits: input.adjectives.map(type => traits[type]),
    }, 'tarot_reading', { allowed: { type: 'boolean' }, segments: READING_SEGMENTS_SCHEMA });
    if (result.allowed !== true) return res.status(400).json({ error: QUESTION_ERROR });
    const segments = normalizeReadingSegments(result.segments);
    return res.status(200).json({ prediction: segments.map(segment => segment.text).join('\n\n'), segments });
  } catch (error) {
    const code = oracleFailureCode(error);
    return res.status(503).json({ code, error: oracleAvailabilityMessage(code) });
  }
}
