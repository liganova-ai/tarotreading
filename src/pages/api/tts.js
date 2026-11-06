import { reserveUsage } from '@/lib/oracleSecurity.mjs';
import { requireOracleAccess } from '@/lib/requireOracleAccess.mjs';
import { getOpenAI } from '@/lib/openai';
import { readingProcesses } from '@/lib/readingProcess.mjs';
import { sendGateError } from '@/lib/gateClient.mjs';
import translations from '@/lib/translations.json';

export const SPOKEN_WELCOME = 'Welcome to the oracle. Here is your personal tarot reading. Take a quiet breath, and let the cards guide you.';

export const config = { api: { bodyParser: { sizeLimit: '32kb' } } };

export default async function handler(req, res) {
  if (!await requireOracleAccess(req, res)) return;
  res.setHeader('Cache-Control', 'no-store');
  if (req.method !== 'POST') { res.setHeader('Allow', 'POST'); return res.status(405).json({ error: 'Method not allowed.' }); }
  const { processId, segmentIndex } = req.body || {};
  if (!Number.isInteger(segmentIndex) || segmentIndex < -1 || segmentIndex > 3) return res.status(400).json({ error: 'Please select a reading section to narrate.' });
  try {
    if (!await reserveUsage(req, res, 'tts')) return;
    const round = await readingProcesses.round(req.oracleSession, processId);
    const reading = await readingProcesses.result(req.oracleSession, processId, 'predict');
    const text = segmentIndex === -1 ? translations[round.input.language]?.[SPOKEN_WELCOME] || SPOKEN_WELCOME : reading.segments[segmentIndex].text;
    const encoded = await readingProcesses.job(req.oracleSession, processId, `tts:${segmentIndex}`, {}, async () => {
      const audio = await getOpenAI().audio.speech.create({ model: 'tts-1', voice: 'alloy', input: text });
      return Buffer.from(await audio.arrayBuffer()).toString('base64');
    });
    res.setHeader('Content-Type', 'audio/mpeg');
    return res.status(200).send(Buffer.from(encoded, 'base64'));
  } catch (error) {
    if (sendGateError(res, error)) return;
    return res.status(503).json({ error: 'The oracle’s voice is resting for now.' });
  }
}
