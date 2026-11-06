// Production Next server, isolated HTTPS Gate/OpenAI/Redis fixtures. No real AI calls or production data.
const assert = require('node:assert/strict');
const https = require('node:https');
const fs = require('node:fs');
const os = require('node:os');
const path = require('node:path');
const { spawn, execFileSync } = require('node:child_process');
const { randomUUID } = require('node:crypto');
const { chromium } = require(process.env.PLAYWRIGHT_PACKAGE_PATH || 'playwright');
(async () => {
  const directory=fs.mkdtempSync(path.join(os.tmpdir(),'oracle-gate-test-'));
  const keyFile=path.join(directory,'key.pem'),certFile=path.join(directory,'cert.pem');
  execFileSync('openssl',['req','-x509','-newkey','rsa:2048','-nodes','-keyout',keyFile,'-out',certFile,'-days','1','-subj','/CN=localhost','-addext','subjectAltName=DNS:localhost,IP:127.0.0.1'],{stdio:'ignore'});
  const records=new Map(),grants=new Map(),tokens=new Map();let aiCalls=0,speechCalls=0,outage=false,providerFailure=false;
  for(const [code,limit] of [['test-three',3],['test-ten',10],['test-failure',3]])grants.set(code,{id:randomUUID(),limit,used:0,requests:new Set(),expiresAt:new Date(Date.now()+7200000).toISOString()});
  const summary=g=>({grantId:g.id,appId:'oracle-fixture',requestLimit:g.limit,used:g.used,remaining:g.limit-g.used,activatedAt:new Date(Date.now()-1000).toISOString(),expiresAt:g.expiresAt});
  const wav=Buffer.alloc(1644);wav.write('RIFF');wav.writeUInt32LE(wav.length-8,4);wav.write('WAVEfmt ',8);wav.writeUInt32LE(16,16);wav.writeUInt16LE(1,20);wav.writeUInt16LE(1,22);wav.writeUInt32LE(8000,24);wav.writeUInt32LE(16000,28);wav.writeUInt16LE(2,32);wav.writeUInt16LE(16,34);wav.write('data',36);wav.writeUInt32LE(1600,40);
  const fixture=https.createServer({key:fs.readFileSync(keyFile),cert:fs.readFileSync(certFile)},async(req,res)=>{
    try{
      let raw='';for await(const chunk of req)raw+=chunk;const data=JSON.parse(raw||'{}');
      const reply=(status,body)=>{res.writeHead(status,{'content-type':'application/json'});res.end(JSON.stringify(body));};
      if(req.url==='/redis'){
        const [command,key,value,...options]=data;
        if(command==='GET'){const item=records.get(key);return reply(200,{result:item&&item.expiry>Date.now()?item.value:null});}
        if(command==='SET'){if(options.includes('NX')&&records.get(key)?.expiry>Date.now())return reply(200,{result:null});records.set(key,{value,expiry:Date.now()+Number(options[options.indexOf('EX')+1])*1000});return reply(200,{result:'OK'});}
        if(command==='DEL'){records.delete(key);return reply(200,{result:1});}
        if(command==='EVAL')return reply(200,{result:0});
        return reply(400,{error:'Unknown Redis fixture command'});
      }
      if(req.url.startsWith('/api/v1/')){
        assert.equal(req.headers.authorization,'Bearer app_fixture_server_only');
        if(outage)return reply(503,{error:'UNAVAILABLE'});
        if(req.url.endsWith('/activate')){
          assert.equal('subject' in data,false,'The browser never supplies a person ID');
          const grant=grants.get(data.code);if(!grant)return reply(404,{error:'INVALID_ACCESS'});
          const token=grant.id+'.fixture-signed-private-access-token';tokens.set(token,grant);
          return reply(200,{...summary(grant),accessToken:token});
        }
        const grant=tokens.get(data.accessToken);if(!grant)return reply(401,{error:'INVALID_ACCESS'});
        if(grant.revoked)return reply(403,{error:'REVOKED'});
        if(Date.parse(grant.expiresAt)<=Date.now())return reply(403,{error:'EXPIRED'});
        if(req.url.endsWith('/status'))return reply(200,summary(grant));
        if(grant.requests.has(data.requestId))return reply(200,{...summary(grant),requestId:data.requestId,alreadyProcessed:true});
        if(grant.used===grant.limit)return reply(403,{error:'QUOTA_EXHAUSTED'});
        grant.requests.add(data.requestId);grant.used++;
        return reply(200,{...summary(grant),requestId:data.requestId,alreadyProcessed:false});
      }
      if(req.url.endsWith('/audio/speech')){speechCalls++;res.writeHead(200,{'content-type':'audio/wav'});return res.end(wav);}
      aiCalls++;
      if(providerFailure)return reply(503,{error:{message:'Fixture AI failure',code:'server_error'}});
      let output;
      const name=data.text?.format?.name;
      if(name==='tarot_question_gate')output={allowed:true};
      else if(name==='oracle_translation')output={texts:JSON.parse(data.input).texts.map(text=>'Translated '+text)};
      else output={allowed:true,segments:[0,1,2,-1].map(cardIndex=>({cardIndex,text:'The cards invite a thoughtful first step toward your chosen direction.'}))};
      return reply(200,{id:'resp_fixture',object:'response',status:'completed',output:[{id:'message_fixture',type:'message',role:'assistant',status:'completed',content:[{type:'output_text',text:JSON.stringify(output),annotations:[]}]}]});
    }catch(error){res.writeHead(500);res.end(JSON.stringify({error:error.message}));}
  });
  await new Promise(resolve=>fixture.listen(4017,'127.0.0.1',resolve));
  const env={...process.env,NODE_ENV:'production',NODE_EXTRA_CA_CERTS:certFile,OPENAI_API_KEY:'fixture-only',OPENAI_BASE_URL:'https://127.0.0.1:4017/v1',GATE_URL:'https://127.0.0.1:4017',GATE_APP_KEY:'app_fixture_server_only',ORACLE_SESSION_SECRET:'test-only-session-signing-secret-at-least-43-characters-long',ORACLE_SECURITY_NAMESPACE:'oracle-integration-'+randomUUID(),KV_REST_API_URL:'https://127.0.0.1:4017/redis',KV_REST_API_TOKEN:'fixture-only',UPSTASH_REDIS_REST_URL:'',UPSTASH_REDIS_REST_TOKEN:''};
  delete env.VERCEL;delete env.ORACLE_APP_ORIGIN;
  const next=spawn(process.execPath,['node_modules/next/dist/bin/next','start','--hostname','127.0.0.1','--port','3017'],{env,stdio:'ignore'});
  let browser;
  const base='http://127.0.0.1:3017';
  try{
    let ready=false;
    for(let i=0;i<100;i++){try{if((await fetch(base)).ok){ready=true;break;}}catch{}await new Promise(resolve=>setTimeout(resolve,100));}
    assert.ok(ready,'Production server must start');
    browser=await chromium.launch({executablePath:'/Applications/Google Chrome.app/Contents/MacOS/Google Chrome',headless:true});
    const context=await browser.newContext({viewport:{width:1440,height:1000},reducedMotion:'reduce'});
    const page=await context.newPage(),errors=[];let captured;
    page.on('pageerror',error=>errors.push(error.message));
    page.on('request',request=>{if(request.url().endsWith('/api/validate-question'))captured=request.postDataJSON()});
    await page.goto(base+'/access');
    assert.equal(await page.getByLabel(/person|password/i).count(),0);
    await page.getByLabel('Access code',{exact:true}).fill('test-three');
    await page.getByRole('button',{name:'Enter the oracle',exact:true}).click();
    await page.waitForURL('**/disclaimer');
    await page.getByText('3 readings remaining',{exact:true}).waitFor();
    await page.getByRole('button',{name:'Confirm',exact:true}).click();
    await page.getByRole('button',{name:'Helper',exact:true}).click();
    await page.getByRole('button',{name:'Confirm',exact:true}).click();
    await page.getByRole('textbox',{name:'Your tarot question'}).fill('What should I focus on this week?');
    await page.getByRole('button',{name:'Confirm',exact:true}).click();
    await page.waitForURL('**/cards');
    await page.getByText('2 readings remaining',{exact:true}).waitFor();
    const cards=page.getByRole('button',{name:/^Card \d+$/});await cards.first().waitFor();
    for(const index of [0,1,2])await cards.nth(index).dispatchEvent('click');
    await page.getByRole('button',{name:'Ask the oracle',exact:true}).click();
    await page.waitForURL('**/results');
    for(let i=0;i<100&&speechCalls<5;i++)await page.waitForTimeout(100);
    assert.equal(speechCalls,5);assert.equal(grants.get('test-three').used,1);
    assert.equal(new URL(page.url()).search,'');
    const post=async(endpoint,data,ctx=context)=>{const response=await ctx.request.post(base+'/api/'+endpoint,{data});return{status:response.status(),body:await response.json().catch(()=>null)}};
    const before=aiCalls;
    const wrong=await post('validate-question',{...captured,question:'What should I focus on next year?'});assert.equal(wrong.status,409);assert.equal(aiCalls,before);
    const unauthorized=await post('tts',{text:'Arbitrary speech is not allowed'});assert.equal(unauthorized.status,400);
    assert.equal((await post('translate',{processId:captured.processId,language:'en',texts:['Untrusted arbitrary text']})).status,403);
    const audioBefore=speechCalls;
    assert.equal((await context.request.post(base+'/api/tts',{data:{processId:captured.processId,segmentIndex:0}})).status(),200);
    assert.equal(speechCalls,audioBefore);
    const cardData=await import('../src/lib/tarotCards.mjs');
    for(let index=1;index<3;index++){
      const processId=randomUUID(),question='What should I focus on this week '+index+'?';
      const input={processId,question,adjectives:['Helper'],language:'en'};
      const parallel=await Promise.all(Array.from({length:6},()=>post('validate-question',input)));
      assert.ok(parallel.some(value=>value.status===200));assert.ok(parallel.every(value=>[200,409].includes(value.status)));
      assert.equal((await post('predict',{...input,cards:[1,2,3]})).status,200);
      for(const segmentIndex of [-1,0,1,2,3])assert.equal((await context.request.post(base+'/api/tts',{data:{processId,segmentIndex}})).status(),200);
      for(const number of [1,2,3])assert.equal((await post('translate',{processId,language:'en',texts:[cardData.cardNames[number],cardData.cardDescriptions[number]]})).status,200);
      assert.equal(grants.get('test-three').used,index+1);
    }
    assert.equal((await post('validate-question',{...captured,processId:randomUUID()})).body.code,'QUOTA_EXHAUSTED');
    assert.equal(grants.get('test-three').used,3);
    const ten=await browser.newContext();
    assert.equal((await post('access',{code:'test-ten'},ten)).status,200);
    for(let index=0;index<10;index++)assert.equal((await post('validate-question',{...captured,processId:randomUUID()},ten)).status,200);
    assert.equal((await post('validate-question',{...captured,processId:randomUUID()},ten)).body.code,'QUOTA_EXHAUSTED');
    assert.equal(grants.get('test-ten').used,10);
    const beforeOutage=aiCalls;outage=true;
    assert.equal((await post('validate-question',{...captured,processId:randomUUID()},ten)).status,503);assert.equal(aiCalls,beforeOutage);outage=false;
    const fail=await browser.newContext();assert.equal((await post('access',{code:'test-failure'},fail)).status,200);
    const failedInput={...captured,processId:randomUUID()};providerFailure=true;
    assert.equal((await post('validate-question',failedInput,fail)).status,503);const afterFailure=aiCalls;
    assert.equal((await post('validate-question',failedInput,fail)).status,503);assert.equal(aiCalls,afterFailure);assert.equal(grants.get('test-failure').used,1);providerFailure=false;
    grants.get('test-failure').revoked=true;
    assert.equal((await post('validate-question',{...failedInput,processId:randomUUID()},fail)).body.code,'REVOKED');assert.equal(aiCalls,afterFailure);
    const cookie=(await context.cookies()).find(cookie=>cookie.name==='__Host-oracle_access');assert.ok(cookie.httpOnly&&cookie.secure);
    assert.equal((await post('logout',{})).status,200);
    assert.equal((await context.request.post(base+'/api/validate-question',{headers:{cookie:cookie.name+'='+cookie.value},data:captured})).status(),401);
    assert.deepEqual(errors,[]);
    console.log(JSON.stringify({productionBrowserFlow:'passed',threeWholeReadings:'passed',tenWholeReadings:'passed',parallelIdempotency:'passed',includedSpeechAndTranslations:'passed',lastCreditFinishes:'passed',arbitraryAiBlocked:'passed',outageAndRevocation:'passed',failuresCountOnce:'passed',secureSessionAndLogout:'passed',realAiRequests:0}));
  }finally{if(browser)await browser.close();next.kill('SIGTERM');await new Promise(resolve=>fixture.close(resolve));fs.rmSync(directory,{recursive:true,force:true});}
})().catch(error=>{console.error(error);process.exitCode=1});
