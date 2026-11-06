import { timingSafeEqual, createHash } from 'node:crypto';
import { ACCESS_COOKIE, ACCESS_DURATION, createAccessToken } from '@/lib/oracleAccess.mjs';

export default async function handler(req, res) {
  res.setHeader('Cache-Control', 'no-store');
  if (req.method !== 'POST') { res.setHeader('Allow', 'POST'); return res.status(405).end(); }
  if (req.headers['sec-fetch-site'] === 'cross-site') return res.status(403).end();
  const password = process.env.ORACLE_PASSWORD;
  if (!password) return res.status(503).json({ error: 'The oracle is resting. Please try again later.' });
  const supplied = req.body?.password;
  const hash = value => createHash('sha256').update(value).digest();
  if (typeof supplied !== 'string' || supplied.length > 256 || !timingSafeEqual(hash(supplied), hash(password))) {
    await new Promise(resolve => setTimeout(resolve, 800));
    return res.status(401).json({ error: 'That is not the key. Please try again.' });
  }
  const token = await createAccessToken(password);
  res.setHeader('Set-Cookie', `${ACCESS_COOKIE}=${token}; Path=/; HttpOnly; SameSite=Strict; Max-Age=${ACCESS_DURATION}${process.env.NODE_ENV === 'production' ? '; Secure' : ''}`);
  return res.status(200).json({ ok: true });
}
export const config = { api: { bodyParser: { sizeLimit: '1kb' } } };
