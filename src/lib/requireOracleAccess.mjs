import { ACCESS_COOKIE, hasOracleAccess } from './oracleAccess.mjs';

// Authenticate at the paid operation itself, independently of middleware or URL matching.
export async function requireOracleAccess(req, res) {
  res.setHeader('Cache-Control', 'no-store');
  let allowed = false;
  try {
    allowed = await hasOracleAccess(req.cookies?.[ACCESS_COOKIE], process.env.ORACLE_PASSWORD);
  } catch {}
  if (!allowed) {
    res.status(401).json({ error: 'Please enter the oracle password to continue.' });
    return false;
  }
  if (req.headers?.['sec-fetch-site'] === 'cross-site') {
    res.status(403).json({ error: 'Cross-site requests are not allowed.' });
    return false;
  }
  return true;
}
