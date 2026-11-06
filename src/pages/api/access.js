import { timingSafeEqual, createHash } from 'node:crypto';
import { createAccessToken } from '@/lib/oracleAccess.mjs';
import { safeMutation, limitLogin, registerSession, cookieHeader, SECURITY_UNAVAILABLE } from '@/lib/oracleSecurity.mjs';

export default async function handler(req, res) {
  res.setHeader('Cache-Control', 'no-store');
  if (!safeMutation(req, res)) return;
  try {
    const password = process.env.ORACLE_PASSWORD;
    if (!password) return res.status(503).json({ error: SECURITY_UNAVAILABLE });
    if (!await limitLogin(req, res)) return;
    const supplied = req.body?.password;
    const hash = value => createHash('sha256').update(value).digest();
    if (typeof supplied !== 'string' || supplied.length > 256 || !timingSafeEqual(hash(supplied), hash(password))) {
      return res.status(401).json({ error: 'That is not the key. Please try again.' });
    }
    const token = await createAccessToken();
    await registerSession(token, password);
    res.setHeader('Set-Cookie', process.env.NODE_ENV === 'production' ? [cookieHeader(token), 'oracle_access=; Path=/; HttpOnly; SameSite=Strict; Max-Age=0; Secure'] : cookieHeader(token));
    return res.status(200).json({ ok: true });
  } catch { return res.status(503).json({ error: SECURITY_UNAVAILABLE }); }
}
export const config = { api: { bodyParser: { sizeLimit: '1kb' } } };
