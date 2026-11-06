import { createHmac } from 'node:crypto';
import { isIP } from 'node:net';
import { sessionSecret, ACCESS_COOKIE, ACCESS_DURATION, readAccessToken } from './oracleAccess.mjs';
import { redis, consumeLimits, securityKey } from './securityStore.mjs';

export const SECURITY_UNAVAILABLE = 'Access checks are temporarily unavailable. Please try again later.';
export function privateHash(value) { return createHmac('sha256', sessionSecret()).update(value).digest('hex'); }
export function clientIdentity(req) {
  // Only Vercel's overwritten proxy header is trusted. Self-hosted requests use the socket.
  let ip = process.env.VERCEL ? String(req.headers['x-forwarded-for'] || '').split(',').at(-1).trim() : req.socket?.remoteAddress;
  if (!isIP(ip || '')) ip = 'unknown';
  // Group IPv6 privacy addresses in the same /64 rather than granting a quota per address.
  if (isIP(ip) === 6) {
    const host = new URL(`http://[${ip}]/`).hostname.slice(1, -1);
    const [left, right = ''] = host.split('::');
    const a = left ? left.split(':') : [], b = right ? right.split(':') : [];
    const expanded = [...a, ...Array(Math.max(0, 8 - a.length - b.length)).fill('0'), ...b];
    ip = expanded.slice(0, 4).map(part => part.padStart(4, '0')).join(':');
  }
  return privateHash(`ip:${ip}`);
}
export function safeMutation(req, res) {
  if (req.method !== 'POST') { res.setHeader('Allow', 'POST'); res.status(405).json({ error: 'Method not allowed.' }); return false; }
  const origin = req.headers?.origin;
  const expected = process.env.ORACLE_APP_ORIGIN || `${process.env.VERCEL || req.socket?.encrypted ? 'https' : 'http'}://${req.headers?.host}`;
  if (req.headers?.['sec-fetch-site'] === 'cross-site' || (origin && origin !== expected)) {
    res.status(403).json({ error: 'Cross-site requests are not allowed.' }); return false;
  }
  if (req.headers?.['content-type']?.split(';')[0].trim().toLowerCase() !== 'application/json') {
    res.status(415).json({ error: 'Please send a JSON request.' }); return false;
  }
  return true;
}
export function limited(res, retryAfter) {
  res.setHeader('Retry-After', String(retryAfter));
  res.status(429).json({ error: 'Too many requests. Please wait and try again.' });
}
export async function limitLogin(req, res) {
  const result = await consumeLimits([
    { key: `login:${clientIdentity(req)}`, max: 5, seconds: 900 },
    { key: 'login:global', max: 500, seconds: 900 },
  ]);
  if (!result.allowed) { limited(res, result.retryAfter); return false; }
  return true;
}
export async function registerSession(token, password) {
  const session = await readAccessToken(token);
  await redis(['SET', securityKey(`session:${session.id}`), privateHash(`password:${password}`), 'EX', ACCESS_DURATION]);
}
export async function activeSession(req) {
  const session = await readAccessToken(req.cookies?.[ACCESS_COOKIE]);
  if (!session || !process.env.ORACLE_PASSWORD) return null;
  const record = await redis(['GET', securityKey(`session:${session.id}`)]);
  return record === privateHash(`password:${process.env.ORACLE_PASSWORD}`) ? session : null;
}
const policy = {
  predict: { daily: 100, session: 10, cost: 10 },
  'validate-question': { daily: 300, session: 30, cost: 1 },
  translate: { daily: 200, session: 20, cost: 3 },
  tts: { daily: 500, session: 40, cost: 2 },
};
export async function reserveUsage(req, res, operation) {
  const p = policy[operation];
  if (!p || !req.oracleSession) throw new Error('Invalid paid operation');
  const result = await consumeLimits([
    { key: 'paid:units', max: 2000, cost: p.cost, seconds: 86400 },
    { key: `paid:${operation}`, max: p.daily, seconds: 86400 },
    { key: `session:${req.oracleSession.id}:${operation}`, max: p.session, seconds: ACCESS_DURATION },
    { key: `ip:${clientIdentity(req)}`, max: 600, cost: p.cost, seconds: 3600 },
  ]);
  if (!result.allowed) { limited(res, result.retryAfter); return false; }
  return true;
}
export function cookieHeader(value, seconds = ACCESS_DURATION) {
  return `${ACCESS_COOKIE}=${value}; Path=/; HttpOnly; SameSite=Strict; Max-Age=${seconds}${process.env.NODE_ENV === 'production' ? '; Secure' : ''}`;
}
