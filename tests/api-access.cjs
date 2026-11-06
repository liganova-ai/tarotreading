const assert = require('node:assert/strict');
const { createHmac } = require('node:crypto');

(async () => {
  const base = process.env.ORACLE_TEST_URL || 'http://127.0.0.1:3001';
  const password = process.env.ORACLE_TEST_CODE;
  if (!password) throw new Error('Set ORACLE_TEST_CODE to the test access code.');
  const expiry = Math.floor(Date.now() / 1000) + 3600;
  const expired = `1.${createHmac('sha256', password).update('1').digest('hex')}`;
  const routes = {
    predict: { question: 'What should I focus on this week?', cards: [1, 2, 3], adjectives: ['Helper'], language: 'en' },
    translate: { language: 'de', texts: ['Hello'] },
    tts: { text: 'A reflective tarot reading.' },
    'validate-question': { question: 'What should I focus on this week?' },
  };
  const variants = [
    {},
    { headers: { cookie: 'oracle_access=true' } },
    { headers: { cookie: `oracle_access=${expiry}.${'0'.repeat(64)}` } },
    { headers: { cookie: `oracle_access=${expired}` } },
    { headers: { 'x-middleware-subrequest': 'src/middleware:src/middleware:src/middleware:src/middleware:src/middleware' } },
    { headers: { 'x-middleware-subrequest': 'middleware:middleware:middleware:middleware:middleware' } },
    { headers: { 'x-nextjs-data': '1' } },
    { query: '?password=not-a-session' },
  ];
  let checks = 0;
  for (const [route, body] of Object.entries(routes)) {
    for (const variant of variants) {
      const response = await fetch(`${base}/api/${route}${variant.query || ''}`, {
        method: 'POST', headers: { 'content-type': 'application/json', ...variant.headers }, body: JSON.stringify({ ...body, password: 'not-a-session' }),
      });
      assert.equal(response.status, 401, `${route}: direct request must require an active Gate session`);
      checks++;
    }
    assert.equal((await fetch(`${base}/api/${route}?password=not-a-session`)).status, 401);
    checks++;
  }
  const login = await fetch(base + '/api/access', { method: 'POST', headers: { 'content-type': 'application/json' }, body: JSON.stringify({ code: password }) });
  assert.equal(login.status, 200, 'Code activation must remain available');
  const cookie = login.headers.get('set-cookie').split(';')[0];
  for (const route of Object.keys(routes)) {
    const allowed = await fetch(base + '/api/' + route, { method: 'POST', headers: { 'content-type': 'application/json', cookie }, body: '{}' });
    assert.equal(allowed.status, 400, `${route}: authenticated requests must reach input validation`);
    const crossSite = await fetch(base + '/api/' + route, { method: 'POST', headers: { 'content-type': 'application/json', cookie, 'sec-fetch-site': 'cross-site' }, body: '{}' });
    assert.equal(crossSite.status, 403, `${route}: cross-site calls must be denied even with a session`);
    checks += 2;
  }
  console.log(`Passed ${checks} API access checks: direct calls, URL/body passwords, forged/expired cookies, bypass headers, legitimate sessions and cross-site rejection.`);
})().catch(error => { console.error(error.message); process.exitCode = 1; });
