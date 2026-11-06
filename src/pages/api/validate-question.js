import { readingProcesses } from '@/lib/readingProcess.mjs';
import { sendGateError } from '@/lib/gateClient.mjs';
import { isLanguage } from '@/lib/languages.mjs';
import { reserveUsage } from '@/lib/oracleSecurity.mjs';
import { requireOracleAccess } from '@/lib/requireOracleAccess.mjs';
import { oracleFailureCode, oracleAvailabilityMessage } from '@/lib/oracleAvailability.mjs';
import { getOpenAI } from '@/lib/openai';
import { isTarotQuestion, QUESTION_ERROR, validateReadingInput } from '@/lib/tarotValidation.mjs';

export const config = { api: { bodyParser: { sizeLimit: '8kb' } } };

export default async function handler(req, res) {
  if (!await requireOracleAccess(req, res)) return;
  res.setHeader('Cache-Control', 'no-store');
  if (req.method !== 'POST') { res.setHeader('Allow', 'POST'); return res.status(405).json({ error: 'Method not allowed.' }); }
  const input = validateReadingInput({ ...req.body, cards: [1, 2, 3] });
  const language = req.body?.language;
  if (!isLanguage(language)) return res.status(400).json({ error: 'Unsupported language.' });
  if (!input.ok) return res.status(400).json({ error: input.error });
  try {
    if (!await reserveUsage(req, res, 'validate-question')) return;
    await readingProcesses.start(req.oracleSession, req.body?.processId, { question: input.question, adjectives: input.adjectives, language });
    const result = await readingProcesses.job(req.oracleSession, req.body.processId, 'validate', {}, async () => ({ valid: await isTarotQuestion(getOpenAI(), input.question) }));
    return res.status(result.valid ? 200 : 400).json(result.valid ? result : { error: QUESTION_ERROR });
  } catch (error) {
    if (sendGateError(res, error)) return;
    const code = oracleFailureCode(error);
    return res.status(503).json({ code, error: oracleAvailabilityMessage(code) });
  }
}
