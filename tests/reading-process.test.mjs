import test from 'node:test';
import assert from 'node:assert/strict';
import { randomUUID } from 'node:crypto';
import { createProcessService } from '../src/lib/readingProcess.mjs';
import { GateError, gateCall } from '../src/lib/gateClient.mjs';
import { seal, unseal, createPrivateStore } from '../src/lib/privateStore.mjs';

function fixture(limit=3) {
  const records=new Map(); let used=0, calls=0, revoked=false;
  const processed=new Set();
  const session={gate:{appId:'oracle',grantId:'person-one',accessToken:'server-only',expiresAt:new Date(Date.now()+7200000).toISOString()}};
  const store={get:async key=>records.get(key),put:async(key,value,ttl,nx)=>{assert.ok(ttl>0);if(nx&&records.has(key))return false;records.set(key,structuredClone(value));return true;}};
  const gate=async(action,input)=>{
    calls++;
    if(revoked)throw new GateError('REVOKED',403,'Revoked');
    const summary={appId:'oracle',grantId:'person-one',used,remaining:limit-used,requestLimit:limit};
    if(action==='status')return summary;
    if(processed.has(input.requestId))return {...summary,alreadyProcessed:true};
    if(used===limit)throw new GateError('QUOTA_EXHAUSTED',403,'Exhausted');
    processed.add(input.requestId);used++;
    return {...summary,used,remaining:limit-used,alreadyProcessed:false};
  };
  return {session,store,gate,service:createProcessService(store,gate),records,get used(){return used},get calls(){return calls},revoke(){revoked=true}};
}
const input={question:'What should I focus on this week?',adjectives:['Helper'],language:'en'};
for(const limit of [3,10]) test(`${limit} Gate usages allow exactly ${limit} full workflows, including speech and translations`,async()=>{
  const f=fixture(limit);let aiCalls=0;
  for(let index=0;index<limit;index++){
    const id=randomUUID();
    await f.service.start(f.session,id,input);
    for(const job of ['validate','predict','tts:-1','tts:0','tts:1','tts:2','tts:3','translate:1','translate:2','translate:3']){
      const run=()=>f.service.job(f.session,id,job,{},async()=>{aiCalls++;return {saved:job}});
      assert.deepEqual(await run(),{saved:job});assert.deepEqual(await run(),{saved:job});
    }
    assert.equal(f.used,index+1);
  }
  assert.equal(aiCalls,limit*10);
  await assert.rejects(f.service.start(f.session,randomUUID(),input),{code:'QUOTA_EXHAUSTED'});
  assert.equal(f.used,limit);
});
test('parallel requests and changed input cannot execute the same workflow twice',async()=>{
  const f=fixture(),id=randomUUID();
  await Promise.allSettled(Array.from({length:12},()=>f.service.start(f.session,id,input)));
  assert.equal(f.used,1);
  await assert.rejects(f.service.start(f.session,id,{...input,question:'Another private question?'}),{code:'PROCESS_CONFLICT'});
  let ai=0;
  await Promise.allSettled(Array.from({length:12},()=>f.service.job(f.session,id,'predict',{cards:[1,2,3]},async()=>{ai++;await new Promise(resolve=>setTimeout(resolve,10));return 'saved';})));
  assert.equal(ai,1);
  assert.equal(await f.service.job(f.session,id,'predict',{cards:[1,2,3]},()=>{throw new Error('duplicate')}),'saved');
  await assert.rejects(f.service.job(f.session,id,'predict',{cards:[4,5,6]},()=>{}),{code:'PROCESS_CONFLICT'});
  await assert.rejects(f.service.round({gate:{...f.session.gate,grantId:'different-person'}},id),{code:'PROCESS_REQUIRED'});
});
test('AI failures remain charged and cannot rerun; revoked access blocks the next child AI operation',async()=>{
  const f=fixture(),id=randomUUID();await f.service.start(f.session,id,input);let ai=0;
  const run=()=>f.service.job(f.session,id,'validate',{},async()=>{ai++;throw new Error('Provider failed')});
  await assert.rejects(run(),{code:'AI_FAILED'});await assert.rejects(run(),{code:'AI_FAILED'});
  assert.equal(f.used,1);assert.equal(ai,1);
  f.revoke();await assert.rejects(f.service.job(f.session,id,'predict',{},()=>{ai++}),{code:'REVOKED'});assert.equal(ai,1);
});
test('uncertain consumption and Gate outages fail closed without executing AI',async()=>{
  const f=fixture();
  for(const gate of [async()=>{throw new GateError()},async()=>({appId:'oracle',grantId:'person-one',alreadyProcessed:true})]){
    const service=createProcessService(f.store,gate),id=randomUUID();
    await assert.rejects(service.start(f.session,id,input));
    await assert.rejects(service.job(f.session,id,'validate',{},()=>{assert.fail('AI must not run')}));
  }
});
test('private ledger encryption is authenticated and bound to its record name',()=>{
  process.env.ORACLE_SESSION_SECRET='test-only-private-record-secret-at-least-43-characters';
  const encrypted=seal({question:'private question',token:'private token'},'record-one');
  assert.ok(!encrypted.includes('private'));assert.deepEqual(unseal(encrypted,'record-one'),{question:'private question',token:'private token'});
  assert.throws(()=>unseal(encrypted,'record-two'));
  delete process.env.ORACLE_SESSION_SECRET;
});
test('legacy session records become unauthenticated while storage failures remain unavailable',async()=>{
  assert.equal(await createPrivateStore(async()=> 'a'.repeat(64)).get('old-session'),null);
  await assert.rejects(createPrivateStore(async()=>{throw new Error('Storage unavailable')}).get('session'),/Storage unavailable/);
});
test('Gate transport validates summaries, keeps credentials server-side and fails closed',async()=>{
  const original={...process.env};process.env.GATE_APP_KEY='app_test';process.env.GATE_URL='https://gate.test';
  const summary={grantId:'g',appId:'a',requestLimit:10,used:7,remaining:3,expiresAt:new Date(Date.now()+7200000).toISOString()};
  try{
    let sent;
    assert.equal((await gateCall('status',{accessToken:'private'},async(url,options)=>{sent={url:String(url),options};return{ok:true,json:async()=>summary}})).remaining,3);
    assert.equal(sent.options.headers.Authorization,'Bearer app_test');assert.equal(sent.options.cache,'no-store');
    await assert.rejects(gateCall('status',{},async()=>{throw new Error('offline')}),{code:'GATE_UNAVAILABLE'});
    await assert.rejects(gateCall('status',{},async()=>({ok:true,json:async()=>({...summary,remaining:20})})),{code:'GATE_UNAVAILABLE'});
    await assert.rejects(gateCall('consume',{},async()=>({ok:false,status:403,json:async()=>({error:'QUOTA_EXHAUSTED'})})),{code:'QUOTA_EXHAUSTED'});
    delete process.env.GATE_APP_KEY;await assert.rejects(gateCall('status',{},()=>assert.fail('No request without key')));
  }finally{for(const key of Object.keys(process.env))if(!(key in original))delete process.env[key];Object.assign(process.env,original)}
});
