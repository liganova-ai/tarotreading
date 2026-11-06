const encoder = new TextEncoder();
export const ACCESS_COOKIE = 'oracle_access';
export const ACCESS_DURATION = 60 * 60 * 24 * 30;

async function signature(value, password) {
  const key = await crypto.subtle.importKey('raw', encoder.encode(password), { name: 'HMAC', hash: 'SHA-256' }, false, ['sign']);
  const bytes = await crypto.subtle.sign('HMAC', key, encoder.encode(value));
  return Array.from(new Uint8Array(bytes), byte => byte.toString(16).padStart(2, '0')).join('');
}
export async function createAccessToken(password) {
  const expiry = String(Math.floor(Date.now() / 1000) + ACCESS_DURATION);
  return `${expiry}.${await signature(expiry, password)}`;
}
export async function hasOracleAccess(token, password) {
  if (!password || typeof token !== 'string') return false;
  const [expiry, supplied, extra] = token.split('.');
  if (extra || !/^\d+$/.test(expiry) || !/^[a-f0-9]{64}$/.test(supplied || '') || Number(expiry) <= Date.now() / 1000) return false;
  const expected = await signature(expiry, password);
  let difference = 0;
  for (let i = 0; i < expected.length; i++) difference |= expected.charCodeAt(i) ^ supplied.charCodeAt(i);
  return difference === 0;
}
