import { ACCESS_COOKIE, readAccessToken } from '@/lib/oracleAccess.mjs';
import { cookieHeader, safeMutation, SECURITY_UNAVAILABLE } from '@/lib/oracleSecurity.mjs';
import { redis, securityKey } from '@/lib/securityStore.mjs';

export default async function handler(req, res) {
  res.setHeader('Cache-Control', 'no-store');
  if (!safeMutation(req, res)) return;
  try {
    const session = await readAccessToken(req.cookies?.[ACCESS_COOKIE]);
    if (session) await redis(['DEL', securityKey(`session:${session.id}`)]);
    res.setHeader('Set-Cookie', cookieHeader('', 0));
    return res.status(200).json({ ok: true });
  } catch { return res.status(503).json({ error: SECURITY_UNAVAILABLE }); }
}
export const config = { api: { bodyParser: { sizeLimit: '1kb' } } };
