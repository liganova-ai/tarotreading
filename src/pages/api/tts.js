import { reserveUsage } from '@/lib/oracleSecurity.mjs';
import { requireOracleAccess } from '@/lib/requireOracleAccess.mjs';
import { getOpenAI } from '@/lib/openai';

export const config = { api: { bodyParser: { sizeLimit: '32kb' } } };

export default async function handler(req, res) {
  if (!await requireOracleAccess(req, res)) return;
  res.setHeader('Cache-Control', 'no-store');
  if (req.method !== 'POST') { res.setHeader('Allow', 'POST'); return res.status(405).json({ error: 'Method not allowed.' }); }
  const text = req.body?.text;
  if (typeof text !== 'string' || !text.trim() || text.length > 4096) return res.status(400).json({ error: 'Please provide a reading to narrate.' });
  try {
    if (!await reserveUsage(req, res, 'tts')) return;
    const audio = await getOpenAI().audio.speech.create({ model: 'tts-1', voice: 'alloy', input: text });
    res.setHeader('Content-Type', 'audio/mpeg');
    return res.status(200).send(Buffer.from(await audio.arrayBuffer()));
  } catch {
    return res.status(503).json({ error: 'The oracle’s voice is resting for now.' });
  }
}
