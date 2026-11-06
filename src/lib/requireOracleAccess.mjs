import { activeSession, safeMutation, SECURITY_UNAVAILABLE, cookieHeader } from './oracleSecurity.mjs';
import { gateCall, sendGateError } from './gateClient.mjs';

export async function requireOracleAccess(req, res) {
  res.setHeader('Cache-Control', 'no-store');
  try {
    const session = await activeSession(req);
    if (!session) { res.status(401).json({ code: 'ACTIVATION_REQUIRED', error: 'Please enter your access code to continue.' }); return false; }
    if (!safeMutation(req, res)) return false;
    req.oracleSession = session;
    req.gateSummary = await gateCall('status', { accessToken: session.gate.accessToken });
    if (req.gateSummary.grantId !== session.gate.grantId || req.gateSummary.appId !== session.gate.appId) throw new Error('Gate session mismatch');
    return true;
  } catch (error) {
    if (['EXPIRED', 'REVOKED', 'INVALID_ACCESS', 'NOT_ACTIVE'].includes(error.code)) res.setHeader('Set-Cookie', cookieHeader('', 0));
    if (sendGateError(res, error)) return false;
    res.status(503).json({ error: SECURITY_UNAVAILABLE });
    return false;
  }
}
