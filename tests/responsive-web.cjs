const assert=require('node:assert/strict');
const {chromium}=require(process.env.PLAYWRIGHT_PACKAGE_PATH||'playwright');
(async()=>{
 const browser=await chromium.launch({executablePath:'/Applications/Google Chrome.app/Contents/MacOS/Google Chrome',headless:true});
 try{
  const page=await browser.newPage();const errors=[];page.on('pageerror',e=>errors.push(e.message));
  const base=process.env.DECK_TEST_URL||'http://localhost:3000';
  const segments=[0,1,2,-1].map(cardIndex=>({cardIndex,text:'The cards invite a thoughtful new perspective. Take the next step with patience, curiosity, and confidence in your own judgement. '.repeat(3)}));
  await page.route('**/api/predict',r=>r.fulfill({json:{prediction:segments.map(s=>s.text).join('\n'),segments}}));
  await page.route('**/api/tts',r=>r.fulfill({status:503,json:{error:'Speech unavailable'}}));
  await page.route('**/tarot_glow_music.mp3',r=>r.abort());
  for(const viewport of [{width:400,height:842},{width:960,height:600},{width:1440,height:900},{width:1920,height:1080},{width:2560,height:1440}]){
   await page.setViewportSize(viewport);await page.goto(base);
   await page.getByRole('link',{name:'Start',exact:true}).waitFor();await page.waitForTimeout(350);
   const desktop=viewport.width>=960;
   const wide=page.locator('[class*=wideSpherePlacement]');
   assert.equal(await wide.isVisible(),desktop);
   if(desktop){
    const globe=await wide.locator('circle[class*=body]').boundingBox();
    const hit=await page.getByRole('button',{name:'Clear the crystal sphere'}).boundingBox();
    assert.ok(Math.abs(globe.width-globe.height)<1,'Desktop sphere must remain circular');
    assert.ok(Math.abs(globe.x+globe.width/2-viewport.width/2)<1);
    assert.ok(Math.abs(hit.width-globe.width)<2,'Interaction target must match the wide-screen glass');
    const frame=await page.locator('[class*=wideLandscape]').boundingBox();
    assert.equal(Math.round(frame.width),viewport.width);
    if(viewport.width===1440)await page.screenshot({path:'/tmp/tarot-wide-start.png'});
   }
   assert.equal(await page.evaluate(()=>document.documentElement.scrollWidth>innerWidth),false);
   const query=new URLSearchParams({question:'What should I focus on this week?',adjectives:'["Helper"]',cards:'[1,2,3]'});
   await page.goto(base+'/results?'+query);
   const cards=page.getByRole('group',{name:'Your tarot cards'});await cards.waitFor();await page.waitForTimeout(1400);
   const cardBox=await cards.boundingBox();
   const text=page.locator('[class*=results_predictionText__]').first();
   const textBox=await text.boundingBox();
   const font=await text.evaluate(e=>parseFloat(getComputedStyle(e).fontSize));
   if(desktop){assert.ok(cardBox.x+cardBox.width<textBox.x,'Cards must sit in the left column and reading in the right');assert.ok(font>=12&&font<=17);}
   else{assert.ok(textBox.y>cardBox.y+cardBox.height);assert.equal(font,13.5);}
   const before=await cards.locator('button').first().boundingBox();
   if(viewport.width===1440)await page.screenshot({path:'/tmp/tarot-wide-reading.png'});
   await cards.locator('button').first().click();await page.getByRole('dialog').waitFor();await page.waitForTimeout(1350);
   const focus=await cards.locator('button').first().boundingBox();
   assert.ok(Math.abs(focus.x+focus.width/2-viewport.width/2)<2,'Focus card must center across the entire screen');
   assert.ok(Math.abs(focus.y+focus.height/2-viewport.height/2)<2);
   assert.ok(focus.width>await cards.locator('img').first().evaluate(e=>parseFloat(getComputedStyle(e).width))*1.2);
   const explanation=await page.getByRole('dialog').boundingBox();
   assert.ok(explanation.y>=focus.y+focus.height+26);
   await page.keyboard.press('Escape');await page.getByRole('dialog').waitFor({state:'detached'});await page.waitForTimeout(1350);
   const restored=await cards.locator('button').first().boundingBox();assert.ok(Math.abs(before.x-restored.x)<2);
   assert.equal(await page.evaluate(()=>document.documentElement.scrollWidth>innerWidth),false);
   console.log({...viewport,layout:desktop?'two columns':'stacked',readingFont:font,focusedCard:'passed'});
  }
  assert.deepEqual(errors,[]);console.log('Wide artwork, sphere hit target, responsive reading columns, and reversible focus passed.');
 }finally{await browser.close()}
})().catch(e=>{console.error(e);process.exitCode=1});
