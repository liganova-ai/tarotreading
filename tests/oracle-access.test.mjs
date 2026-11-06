import test from 'node:test';
import assert from 'node:assert/strict';
import { createHmac } from 'node:crypto';
import { ACCESS_COOKIE, createAccessToken, hasOracleAccess } from '../src/lib/oracleAccess.mjs';
import { requireOracleAccess } from '../src/lib/requireOracleAccess.mjs';

const password = 'test-only-oracle-secret';
const signed = (expiry, secret = password) => `${expiry}.${createHmac('sha256', secret).update(String(expiry)).digest('hex')}`;
const response = () => ({
  headers: {}, code: null, body: null,
  setHeader(key, value) { this.headers[key] = value; },
  status(code) { this.code = code; return this; },
  json(body) { this.body = body; return this; },
});

test('sessions require a valid signature, expiry, and the current password', async () => {
  const token = await createAccessToken(password);
  assert.equal(await hasOracleAccess(token, password), true);
  for (const invalid of [undefined, '', 'true', 'authenticated', token + '.extra', signed(1), signed(Date.now() / 1000 + 1000, 'wrong-secret'), token.replace(/.$/, token.endsWith('a') ? 'b' : 'a')]) {
    assert.equal(await hasOracleAccess(invalid, password), false);
  }
  assert.equal(await hasOracleAccess(token, ''), false);
  assert.equal(await hasOracleAccess(token, 'rotated-password'), false);
});

test('the handler guard ignores URL passwords, request bodies, bearer tokens, and middleware bypass headers', async () => {
  const original = process.env.ORACLE_PASSWORD;
  process.env.ORACLE_PASSWORD = password;
  try {
    for (const req of [
      {},
      { query: { password }, body: { password } },
      { headers: { authorization: `Bearer ${await createAccessToken(password)}` } },
      { cookies: { [ACCESS_COOKIE]: 'true' }, headers: { 'x-middleware-subrequest': 'src/middleware:src/middleware:src/middleware:src/middleware:src/middleware' } },
      { cookies: { [ACCESS_COOKIE]: signed(1) } },
      { cookies: { [ACCESS_COOKIE]: signed(Math.floor(Date.now() / 1000) + 1000, 'wrong-secret') } },
    ]) {
      const res = response();
      assert.equal(await requireOracleAccess(req, res), false);
      assert.equal(res.code, 401);
      assert.equal(res.headers['Cache-Control'], 'no-store');
    }
    const authenticated = { cookies: { [ACCESS_COOKIE]: await createAccessToken(password) } };
    assert.equal(await requireOracleAccess(authenticated, response()), true);
    const crossSite = response();
    assert.equal(await requireOracleAccess({ ...authenticated, headers: { 'sec-fetch-site': 'cross-site' } }, crossSite), false);
    assert.equal(crossSite.code, 403);
    delete process.env.ORACLE_PASSWORD;
    const unconfigured = response();
    assert.equal(await requireOracleAccess(authenticated, unconfigured), false);
    assert.equal(unconfigured.code, 401);
  } finally {
    if (original === undefined) delete process.env.ORACLE_PASSWORD;
    else process.env.ORACLE_PASSWORD = original;
  }
});
