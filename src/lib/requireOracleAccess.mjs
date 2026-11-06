import { activeSession, safeMutation, SECURITY_UNAVAILABLE } from './oracleSecurity.mjs';

export async function requireOracleAccess(req, res) {
  res.setHeader('Cache-Control', 'no-store');
  try {
    const session = await activeSession(req);
    if (!session) { res.status(401).json({ error: 'Please enter the oracle password to continue.' }); return false; }
    if (!safeMutation(req, res)) return false;
    req.oracleSession = session;
    return true;
  } catch {
    res.status(503).json({ error: SECURITY_UNAVAILABLE });
    return false;
  }
}
