const encoder = new TextEncoder();
export const ACCESS_COOKIE = process.env.NODE_ENV === 'production' ? '__Host-oracle_access' : 'oracle_access';
export const ACCESS_DURATION = 60 * 60 * 2;

export function sessionSecret() {
  const secret = process.env.ORACLE_SESSION_SECRET;
  if (typeof secret !== 'string' || secret.length < 43) throw new Error('Session security is not configured');
  return secret;
}
async function signature(value, secret) {
  const key = await crypto.subtle.importKey('raw', encoder.encode(secret), { name: 'HMAC', hash: 'SHA-256' }, false, ['sign']);
  const bytes = await crypto.subtle.sign('HMAC', key, encoder.encode(value));
  return Array.from(new Uint8Array(bytes), byte => byte.toString(16).padStart(2, '0')).join('');
}
export async function createAccessToken(secret = sessionSecret(), now = Date.now()) {
  if (secret.length < 43) throw new Error('Session secret is too short');
  const expiry = String(Math.floor(now / 1000) + ACCESS_DURATION);
  const id = Array.from(crypto.getRandomValues(new Uint8Array(32)), byte => byte.toString(16).padStart(2, '0')).join('');
  const payload = `v2.${expiry}.${id}`;
  return `${payload}.${await signature(payload, secret)}`;
}
export async function readAccessToken(token, secret = sessionSecret(), now = Date.now()) {
  if (typeof token !== 'string' || token.length > 160 || secret.length < 43) return null;
  const [version, expiry, id, supplied, extra] = token.split('.');
  const time = Math.floor(now / 1000);
  if (version !== 'v2' || extra || !/^\d{10}$/.test(expiry || '') || !/^[a-f0-9]{64}$/.test(id || '')
    || !/^[a-f0-9]{64}$/.test(supplied || '') || Number(expiry) <= time || Number(expiry) > time + ACCESS_DURATION) return null;
  const expected = await signature(`v2.${expiry}.${id}`, secret);
  let difference = 0;
  for (let i = 0; i < expected.length; i++) difference |= expected.charCodeAt(i) ^ supplied.charCodeAt(i);
  return difference === 0 ? { id, expiry: Number(expiry) } : null;
}
export async function hasOracleAccess(token, secret = sessionSecret()) {
  try { return !!await readAccessToken(token, secret); } catch { return false; }
}
