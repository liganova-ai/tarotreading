import { oracleFailureCode, oracleAvailabilityMessage } from '@/lib/oracleAvailability.mjs';
import { getOpenAI } from '@/lib/openai';
import { isTarotQuestion, QUESTION_ERROR, validateQuestionInput } from '@/lib/tarotValidation.mjs';

export const config = { api: { bodyParser: { sizeLimit: '8kb' } } };

export default async function handler(req, res) {
  res.setHeader('Cache-Control', 'no-store');
  if (req.method !== 'POST') { res.setHeader('Allow', 'POST'); return res.status(405).json({ error: 'Method not allowed.' }); }
  const input = validateQuestionInput(req.body?.question);
  if (!input.ok) return res.status(400).json({ error: input.error });
  try {
    if (!await isTarotQuestion(getOpenAI(), input.question)) return res.status(400).json({ error: QUESTION_ERROR });
    return res.status(200).json({ valid: true });
  } catch (error) {
    const code = oracleFailureCode(error);
    return res.status(503).json({ code, error: oracleAvailabilityMessage(code) });
  }
}
