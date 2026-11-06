import { cardNames } from '@/lib/tarotCards.mjs';
import { readingProcesses } from '@/lib/readingProcess.mjs';
import { GateError, sendGateError } from '@/lib/gateClient.mjs';
import { reserveUsage } from '@/lib/oracleSecurity.mjs';
import { requireOracleAccess } from '@/lib/requireOracleAccess.mjs';
import { LANGUAGE_NAMES, isLanguage } from '@/lib/languages.mjs';
import { normalizeReadingSegments, READING_SEGMENTS_SCHEMA } from '@/lib/readingSegments.mjs';
import { oracleFailureCode, oracleAvailabilityMessage } from '@/lib/oracleAvailability.mjs';
import { getOpenAI } from '@/lib/openai';
import { QUESTION_ERROR, READING_PROMPT, structuredReply, validateReadingInput } from '@/lib/tarotValidation.mjs';

const traits = {
  Reformer: 'principled, purposeful, perfectionistic', Helper: 'caring, empathetic, people-pleasing',
  Achiever: 'ambitious, adaptable, image-conscious', Individualist: 'sensitive, creative, introspective',
  Investigator: 'independent, perceptive, knowledge-seeking', Loyalist: 'responsible, security-oriented, trustworthy',
  Enthusiast: 'energetic, spontaneous, optimistic', Challenger: 'assertive, confident, protective',
};

export const config = { api: { bodyParser: { sizeLimit: '8kb' } } };

export default async function handler(req, res) {
  if (!await requireOracleAccess(req, res)) return;
  res.setHeader('Cache-Control', 'no-store');
  if (req.method !== 'POST') { res.setHeader('Allow', 'POST'); return res.status(405).json({ error: 'Method not allowed.' }); }
  const language = req.body?.language ?? 'en';
  if (!isLanguage(language)) return res.status(400).json({ error: 'Unsupported language.' });
  const input = validateReadingInput(req.body);
  if (!input.ok) return res.status(400).json({ error: input.error });
  try {
    if (!await reserveUsage(req, res, 'predict')) return;
    const processId = req.body?.processId;
    const round = await readingProcesses.round(req.oracleSession, processId);
    if (round.input.question !== input.question || round.input.language !== language || JSON.stringify(round.input.adjectives) !== JSON.stringify(input.adjectives)) throw new GateError('PROCESS_CONFLICT', 409, 'Please confirm this question before selecting cards.');
    const validation = await readingProcesses.result(req.oracleSession, processId, 'validate');
    if (!validation.valid) return res.status(400).json({ error: QUESTION_ERROR });
    const output = await readingProcesses.job(req.oracleSession, processId, 'predict', { cards: input.cards }, async () => {
      const result = await structuredReply(getOpenAI(), READING_PROMPT.replace('Write in the language of the question.', `Write the entire reading in ${LANGUAGE_NAMES[language]}, regardless of the language of the question.`), {
        question: input.question,
        cards: input.cards.map(card => cardNames[card]),
        personalityTraits: input.adjectives.map(type => traits[type]),
      }, 'tarot_reading', { allowed: { type: 'boolean' }, segments: READING_SEGMENTS_SCHEMA });
      if (result.allowed !== true) throw new GateError('QUESTION_REJECTED', 400, QUESTION_ERROR);
      const segments = normalizeReadingSegments(result.segments);
      return { prediction: segments.map(segment => segment.text).join('\n\n'), segments, cards: input.cards };
    });
    return res.status(200).json(output);
  } catch (error) {
    if (sendGateError(res, error)) return;
    const code = oracleFailureCode(error);
    return res.status(503).json({ code, error: oracleAvailabilityMessage(code) });
  }
}
