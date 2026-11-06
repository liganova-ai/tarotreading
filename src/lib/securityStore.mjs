export function securityKey(suffix) {
  const namespace = process.env.ORACLE_SECURITY_NAMESPACE || `oracle-${process.env.VERCEL_ENV || process.env.NODE_ENV || 'development'}`;
  return `${namespace}:{security}:${suffix}`;
}

// Durable Redis commands: production must never fall back to per-instance memory.
export async function redis(command) {
  const url = process.env.UPSTASH_REDIS_REST_URL || process.env.KV_REST_API_URL;
  const token = process.env.UPSTASH_REDIS_REST_TOKEN || process.env.KV_REST_API_TOKEN;
  if (!url || !token || (!url.startsWith('https://') && process.env.NODE_ENV === 'production')) throw new Error('Security storage unavailable');
  const response = await fetch(url, {
    method: 'POST', headers: { Authorization: `Bearer ${token}`, 'Content-Type': 'application/json' },
    body: JSON.stringify(command.map(String)), cache: 'no-store', signal: AbortSignal.timeout(5000),
  });
  if (!response.ok) throw new Error('Security storage unavailable');
  const result = await response.json();
  if (result.error) throw new Error('Security storage unavailable');
  return result.result;
}

// Check every bucket before changing any: concurrent invocations cannot overspend a budget.
export const LIMIT_SCRIPT = `
for i,key in ipairs(KEYS) do
  local count = tonumber(redis.call('GET', key) or '0')
  if count + tonumber(ARGV[(i-1)*3+1]) > tonumber(ARGV[(i-1)*3+2]) then return i end
end
for i,key in ipairs(KEYS) do
  local count = redis.call('INCRBY', key, ARGV[(i-1)*3+1])
  if count == tonumber(ARGV[(i-1)*3+1]) then redis.call('EXPIRE', key, ARGV[(i-1)*3+3]) end
end
return 0`;

export async function consumeLimits(limits, now = Date.now(), run = redis) {
  const keys = limits.map(limit => securityKey(`limit:${limit.key}:${Math.floor(now / 1000 / limit.seconds)}`));
  const args = limits.flatMap(limit => [limit.cost || 1, limit.max, limit.seconds + 60]);
  const denied = Number(await run(['EVAL', LIMIT_SCRIPT, keys.length, ...keys, ...args]));
  if (!Number.isInteger(denied) || denied < 0 || denied > limits.length) throw new Error('Invalid security response');
  const seconds = denied ? limits[denied - 1].seconds : 0;
  return { allowed: denied === 0, retryAfter: denied ? Math.ceil(seconds - (now / 1000 % seconds)) : 0 };
}
