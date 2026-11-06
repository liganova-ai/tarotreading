import { createCipheriv, createDecipheriv, createHash, randomBytes } from 'node:crypto';
import { sessionSecret } from './oracleAccess.mjs';
import { redis, securityKey } from './securityStore.mjs';
function key() { return createHash('sha256').update('oracle-private-records:').update(sessionSecret()).digest(); }
export function seal(value, name) {
  const iv = randomBytes(12), cipher = createCipheriv('aes-256-gcm', key(), iv);
  cipher.setAAD(Buffer.from(name));
  const bytes = Buffer.concat([cipher.update(JSON.stringify(value), 'utf8'), cipher.final()]);
  return [iv, cipher.getAuthTag(), bytes].map(part => part.toString('base64')).join('.');
}
export function unseal(value, name) {
  if (!value) return null;
  const [iv, tag, data] = value.split('.').map(part => Buffer.from(part, 'base64'));
  const cipher = createDecipheriv('aes-256-gcm', key(), iv); cipher.setAAD(Buffer.from(name)); cipher.setAuthTag(tag);
  return JSON.parse(Buffer.concat([cipher.update(data), cipher.final()]).toString('utf8'));
}
export function createPrivateStore(run = redis) {
  return {
    async get(name) {
      const value = await run(['GET', securityKey(name)]);
      // Old password sessions and corrupted/rotated records are unauthenticated.
      // Network/storage failures still propagate and fail closed as unavailable.
      try { return unseal(value, name); } catch { return null; }
    },
    async put(name, value, seconds, onlyNew = false) {
      const result = await run(['SET', securityKey(name), seal(value, name), 'EX', seconds, ...(onlyNew ? ['NX'] : [])]);
      return result === 'OK';
    },
  };
}
export const privateStore = createPrivateStore();
