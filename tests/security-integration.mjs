// Explicit isolated test namespace and test server only. No paid provider calls.
import assert from 'node:assert/strict';
import { randomUUID } from 'node:crypto';
import nextEnv from '@next/env';
nextEnv.loadEnvConfig(process.cwd(), false, { info() {}, error() {} });
assert.ok(process.env.ORACLE_SECURITY_NAMESPACE?.startsWith('oracle-integration-'), 'Use an isolated oracle-integration- namespace');
assert.ok(process.env.ORACLE_TEST_PASSWORD && process.env.ORACLE_SESSION_SECRET, 'Explicit test credentials required');
const { redis, consumeLimits, securityKey } = await import('../src/lib/securityStore.mjs');
const { readAccessToken } = await import('../src/lib/oracleAccess.mjs');
const base = process.env.ORACLE_TEST_URL || 'http://127.0.0.1:3001';
assert.ok(['127.0.0.1', 'localhost'].includes(new URL(base).hostname), 'Local test server required');
const post = (path, data, cookie, headers = {}) => fetch(base + path, {
  method: 'POST', headers: { 'content-type': 'application/json', ...(cookie ? { cookie } : {}), ...headers }, body: JSON.stringify(data)
});
const root = await fetch(base);
assert.equal(root.headers.get('x-frame-options'), 'DENY');
assert.equal(root.headers.get('x-content-type-options'), 'nosniff');
assert.equal(root.headers.get('referrer-policy'), 'no-referrer');
assert.match(root.headers.get('cache-control'), /no-store/);
const nonce = root.headers.get('content-security-policy').match(/'nonce-([^']+)'/)[1];
assert.ok((await root.text()).includes(`nonce="${nonce}"`));
const login = await post('/api/access', { password: process.env.ORACLE_TEST_PASSWORD });
assert.equal(login.status, 200);
const cookie = login.headers.get('set-cookie').split(';')[0];
assert.match(cookie, /^__Host-oracle_access=/);
const session = await readAccessToken(cookie.slice(cookie.indexOf('=') + 1));
assert.ok(session);
const routes = {
  predict: [{ question: 'What should I focus on this week?', cards: [1,2,3], adjectives: ['Helper'], language: 'en' },10],
  'validate-question': [{ question: 'What should I focus on this week?' },30],
  translate: [{ language: 'de', texts: ['Hello'] },20],
  tts: [{ text: 'Test narration.' },40],
};
for (const [operation, [body, maximum]] of Object.entries(routes)) {
  const key = securityKey(`limit:session:${session.id}:${operation}:${Math.floor(Date.now()/1000/7200)}`);
  await redis(['SET',key,maximum,'EX',120]);
  const response = await post('/api/' + operation, body, cookie);
  assert.equal(response.status,429, `${operation} must enforce its session quota before any provider call`);
  assert.ok(Number(response.headers.get('retry-after')) > 0);
  await redis(['DEL',key]);
}
const dailyKey = securityKey(`limit:paid:predict:${Math.floor(Date.now()/1000/86400)}`);
await redis(['SET',dailyKey,100,'EX',120]);
assert.equal((await post('/api/predict',routes.predict[0],cookie)).status,429);
await redis(['DEL',dailyKey]);
const concurrentKey = 'test:' + randomUUID();
const concurrent = await Promise.all(Array.from({length:20},()=>consumeLimits([{key:concurrentKey,max:5,seconds:60}])));
assert.equal(concurrent.filter(result=>result.allowed).length,5);
assert.equal((await post('/api/validate-question',{},cookie,{origin:'https://attacker.invalid'})).status,403);
assert.equal((await post('/api/logout',{},cookie)).status,200);
assert.equal((await post('/api/validate-question',routes['validate-question'][0],cookie)).status,401);
const revoked = await fetch(base + '/results',{headers:{cookie},redirect:'manual'});
assert.equal(revoked.status,307);
assert.equal(new URL(revoked.headers.get('location'), base).pathname,'/access');
let throttled = false;
for (let index=0;index<6;index++) {
  const response = await post('/api/access',{password:'deliberately-wrong-test-password'});
  assert.ok([401,429].includes(response.status));
  if (response.status===429) { assert.ok(Number(response.headers.get('retry-after'))>0); throttled=true; break; }
}
assert.ok(throttled,'Repeated login guesses must be throttled');
assert.equal((await post('/api/access',{password:process.env.ORACLE_TEST_PASSWORD})).status,429);
console.log('Passed real Redis quotas for all four paid routes, daily cap, 20 concurrent requests (only 5 admitted), login throttling, nonce/security headers and server-side logout revocation.');
