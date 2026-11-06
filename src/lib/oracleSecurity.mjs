import { createHmac } from 'node:crypto';
import { isIP } from 'node:net';
import { sessionSecret, ACCESS_COOKIE, ACCESS_DURATION, readAccessToken } from './oracleAccess.mjs';
import { consumeLimits } from './securityStore.mjs';
import { privateStore } from './privateStore.mjs';

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
export async function registerSession(token, gate) {
  const session = await readAccessToken(token);
  await privateStore.put(`session:${session.id}`, { gate, keyVersion: privateHash(`gate-key:${process.env.GATE_APP_KEY}`) }, ACCESS_DURATION);
}
export async function activeSession(req) {
  const session = await readAccessToken(req.cookies?.[ACCESS_COOKIE]);
  if (!session || !process.env.GATE_APP_KEY) return null;
  const record = await privateStore.get(`session:${session.id}`);
  if (!record?.gate || record.keyVersion !== privateHash(`gate-key:${process.env.GATE_APP_KEY}`) || Date.parse(record.gate.expiresAt) <= Date.now()) return null;
  return { ...session, gate: record.gate };
}
export async function reserveUsage(req, res, operation) {
  if (!['predict', 'validate-question', 'translate', 'tts'].includes(operation) || !req.oracleSession) throw new Error('Invalid paid operation');
  // Burst protection only; Gate is the authority for the number of whole readings.
  const result = await consumeLimits([
    { key: `requests:ip:${clientIdentity(req)}`, max: 120, seconds: 60 },
    { key: `requests:session:${req.oracleSession.id}`, max: 120, seconds: 60 },
  ]);
  if (!result.allowed) { limited(res, result.retryAfter); return false; }
  return true;
}
export function cookieHeader(value, seconds = ACCESS_DURATION) {
  return `${ACCESS_COOKIE}=${value}; Path=/; HttpOnly; SameSite=Strict; Max-Age=${seconds}${process.env.NODE_ENV === 'production' ? '; Secure' : ''}`;
}
