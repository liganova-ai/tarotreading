import test from 'node:test';
import assert from 'node:assert/strict';
import { createHmac } from 'node:crypto';
import { ACCESS_COOKIE, ACCESS_DURATION, createAccessToken, readAccessToken, hasOracleAccess } from '../src/lib/oracleAccess.mjs';
import { requireOracleAccess } from '../src/lib/requireOracleAccess.mjs';
import { privateHash, safeMutation, clientIdentity } from '../src/lib/oracleSecurity.mjs';
import { consumeLimits } from '../src/lib/securityStore.mjs';

const secret = 'test-only-independent-session-signing-secret-64-characters-long';
const password = 'test-only-password';
const response = () => ({ headers: {}, code: null, setHeader(k,v){this.headers[k]=v;}, status(code){this.code=code;return this;}, json(body){this.body=body;return this;} });

test('random sessions are independently signed, time-bounded and reject old or forged cookies', async () => {
  const now = Date.now();
  const token = await createAccessToken(secret, now);
  assert.equal(await hasOracleAccess(token, secret), true);
  assert.notEqual(await createAccessToken(secret, now), token);
  assert.equal((await readAccessToken(token, secret, now)).expiry, Math.floor(now/1000)+ACCESS_DURATION);
  assert.equal(await readAccessToken(token, secret, now+ACCESS_DURATION*1000), null);
  for (const invalid of [undefined, '', 'true', token+'.extra', token.replace(/.$/,token.endsWith('a')?'b':'a'), `123.${'a'.repeat(64)}`]) assert.equal(await hasOracleAccess(invalid, secret), false);
  assert.equal(await hasOracleAccess(token, password), false);
  assert.equal(await hasOracleAccess(token, secret+'rotated'), false);
  const [, , id] = token.split('.');
  const payload = `v2.${Math.floor(now/1000)+ACCESS_DURATION+60}.${id}`;
  assert.equal(await readAccessToken(`${payload}.${createHmac('sha256',secret).update(payload).digest('hex')}`,secret,now),null);
});

test('paid handlers require an active, unrevoked session and reject cross-site or non-JSON calls', async () => {
  const saved = {...process.env}; const originalFetch=globalThis.fetch;
  Object.assign(process.env,{ORACLE_PASSWORD:password,ORACLE_SESSION_SECRET:secret,UPSTASH_REDIS_REST_URL:'https://security.test',UPSTASH_REDIS_REST_TOKEN:'test'});
  let record=privateHash(`password:${password}`), unavailable=false;
  globalThis.fetch=async()=>{if(unavailable)throw new Error('Offline');return {ok:true,json:async()=>({result:record})};};
  try {
    const token=await createAccessToken(secret);
    const valid={method:'POST',headers:{host:'localhost','content-type':'application/json'},cookies:{[ACCESS_COOKIE]:token}};
    for(const req of [{}, {query:{password},body:{password}}, {headers:{authorization:`Bearer ${token}`}}, {cookies:{[ACCESS_COOKIE]:'true'},headers:{'x-middleware-subrequest':'src/middleware:src/middleware:src/middleware:src/middleware:src/middleware'}}]) {
      const res=response(); assert.equal(await requireOracleAccess(req,res),false);assert.equal(res.code,401);
    }
    assert.equal(await requireOracleAccess(valid,response()),true);
    record=null;const revoked=response();assert.equal(await requireOracleAccess(valid,revoked),false);assert.equal(revoked.code,401);
    record=privateHash('password:old-password');const rotated=response();await requireOracleAccess(valid,rotated);assert.equal(rotated.code,401);
    record=privateHash(`password:${password}`);
    for(const headers of [{'sec-fetch-site':'cross-site'},{origin:'https://evil.test'}]){const res=response();await requireOracleAccess({...valid,headers:{...valid.headers,...headers}},res);assert.equal(res.code,403);}
    const form=response();await requireOracleAccess({...valid,headers:{host:'localhost','content-type':'text/plain'}},form);assert.equal(form.code,415);
    unavailable=true;const offline=response();await requireOracleAccess(valid,offline);assert.equal(offline.code,503);
    delete process.env.ORACLE_SESSION_SECRET;const missing=response();await requireOracleAccess(valid,missing);assert.equal(missing.code,503);
  } finally {
    globalThis.fetch=originalFetch;
    for(const key of Object.keys(process.env))if(!(key in saved))delete process.env[key];
    Object.assign(process.env,saved);
  }
});

test('atomic quotas use expiring shared buckets and return a bounded retry time', async()=>{
  let command;
  const limits=[{key:'global',max:10,cost:2,seconds:60},{key:'session',max:3,seconds:900}];
  const now=1700000000000;
  assert.deepEqual(await consumeLimits(limits,now,async c=>{command=c;return 0;}),{allowed:true,retryAfter:0});
  assert.equal(command[0],'EVAL');assert.equal(command[2],2);
  assert.ok(command.slice(3,5).every(key=>key.includes(':{security}:limit:')));
  assert.deepEqual(command.slice(-6),[2,10,120,1,3,960]);
  const denied=await consumeLimits(limits,now,async()=>2);assert.equal(denied.allowed,false);assert.ok(denied.retryAfter>0&&denied.retryAfter<=900);
  await assert.rejects(consumeLimits(limits,now,async()=>99));
});

test('self-hosted limits ignore spoofed forwarding headers',()=>{
  const original=process.env.VERCEL, signing=process.env.ORACLE_SESSION_SECRET;
  delete process.env.VERCEL;process.env.ORACLE_SESSION_SECRET=secret;
  try{const a=clientIdentity({headers:{'x-forwarded-for':'1.1.1.1'},socket:{remoteAddress:'127.0.0.1'}});const b=clientIdentity({headers:{'x-forwarded-for':'2.2.2.2'},socket:{remoteAddress:'127.0.0.1'}});assert.equal(a,b);}
  finally{if(original===undefined)delete process.env.VERCEL;else process.env.VERCEL=original;if(signing===undefined)delete process.env.ORACLE_SESSION_SECRET;else process.env.ORACLE_SESSION_SECRET=signing;}
});
