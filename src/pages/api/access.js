import { createAccessToken } from '@/lib/oracleAccess.mjs';
import { safeMutation, limitLogin, registerSession, cookieHeader, SECURITY_UNAVAILABLE } from '@/lib/oracleSecurity.mjs';
import { gateCall, publicGateStatus, sendGateError } from '@/lib/gateClient.mjs';

export default async function handler(req, res) {
  res.setHeader('Cache-Control', 'no-store');
  if (!safeMutation(req, res)) return;
  try {
    if (!await limitLogin(req, res)) return;
    const code = req.body?.code;
    if (typeof code !== 'string' || !code.trim() || code.length > 256) {
      return res.status(400).json({ error: 'Please enter your access code.' });
    }
    const access = await gateCall('activate', { code: code.trim() });
    const token = await createAccessToken();
    await registerSession(token, access);
    res.setHeader('Set-Cookie', process.env.NODE_ENV === 'production' ? [cookieHeader(token), 'oracle_access=; Path=/; HttpOnly; SameSite=Strict; Max-Age=0; Secure'] : cookieHeader(token));
    return res.status(200).json({ ok: true, ...publicGateStatus(access) });
  } catch (error) { if (sendGateError(res, error)) return; return res.status(503).json({ error: SECURITY_UNAVAILABLE }); }
}
export const config = { api: { bodyParser: { sizeLimit: '1kb' } } };
