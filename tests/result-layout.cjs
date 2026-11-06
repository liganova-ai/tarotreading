const assert=require('node:assert/strict');
const {chromium}=require(process.env.PLAYWRIGHT_PACKAGE_PATH||'playwright');
(async()=>{
 const browser=await chromium.launch({executablePath:'/Applications/Google Chrome.app/Contents/MacOS/Google Chrome',headless:true});
 try{
  const page=await browser.newPage();const errors=[];page.on('pageerror',e=>errors.push(e.message));
  const base=process.env.DECK_TEST_URL||'http://localhost:3000';
  const paragraph='This card invites you to consider the choices ahead with patience and curiosity. Trust the skills you have built, stay open to helpful advice, and take one thoughtful step toward the future you imagine.';
  const segments=[0,1,2,-1].map(cardIndex=>({cardIndex,text:paragraph}));
  await page.route('**/api/predict',r=>r.fulfill({json:{prediction:segments.map(s=>s.text).join('\n'),segments}}));
  await page.route('**/api/tts',r=>r.fulfill({status:503,json:{error:'Speech unavailable'}}));
  await page.route('**/tarot_glow_music.mp3',r=>r.abort());
  const url=base+'/results?'+new URLSearchParams({question:'What should I focus on this week?',adjectives:'["Helper"]',cards:'[1,2,3]'});
  for(const viewport of [{width:400,height:842},{width:960,height:600},{width:1440,height:900},{width:1920,height:1080}]){
   await page.setViewportSize(viewport);await page.goto(url);
   const cards=page.getByRole('group',{name:'Your tarot cards'});await cards.waitFor();await page.waitForTimeout(1500);
   const cardBox=await cards.boundingBox();
   const controls=await page.locator('[class*=results_playbackControls]').boundingBox();
   assert.ok(controls.y>=cardBox.y+cardBox.height-1,'Playback belongs below the cards');
   assert.ok(Math.abs(controls.x+controls.width/2-cardBox.x-cardBox.width/2)<2,'Playback controls must center under the fan');
   const reading=await page.locator('[class*=results_predictionTextContainer]').evaluate(e=>({height:e.clientHeight,scroll:e.scrollHeight,font:parseFloat(getComputedStyle(e.querySelector('p')).fontSize)}));
   if(viewport.width>=960){
    assert.ok(reading.scroll<=reading.height+1,'Complete normal reading must fit the desktop height');
    const alignment=await page.evaluate(()=>{const column=document.querySelector('[class*=results_predictionSection]').getBoundingClientRect();const text=document.querySelector('[class*=results_predictionTextContainer]').getBoundingClientRect();const cards=document.querySelector('[class*=results_cardsSection]').getBoundingClientRect();return {textCenter:text.y+text.height/2,columnCenter:column.y+column.height/2,cardsCenter:cards.y+cards.height/2}});
    const offset=Math.min(32,Math.max(16,viewport.height*.025));
    assert.ok(Math.abs(alignment.textCenter-alignment.columnCenter-offset)<2,'Text sits slightly below the vertical center');
    assert.ok(Math.abs(alignment.cardsCenter-alignment.columnCenter)<2,'Card fan must share the same vertical center');
    assert.ok(Math.abs(alignment.columnCenter-viewport.height/2)<2,'Both columns must center in the viewport');
    assert.ok(reading.font<=17&&reading.font>=12);
    const angle=await cards.locator('button').first().evaluate(e=>{const m=new DOMMatrix(getComputedStyle(e).transform);return Math.atan2(m.m12,m.m11)*180/Math.PI});
    assert.ok(Math.abs(angle+12)<.1,'Desktop fan uses stronger angles');
   }
   assert.deepEqual(await page.locator('[class*=results_predictionText__]').allTextContents(),segments.map(s=>s.text));
   if(viewport.width===1440)await page.screenshot({path:'/tmp/tarot-refined-desktop-reading.png'});
   console.log({...viewport,...reading});
  }
  await page.getByRole('button',{name:'Start over',exact:true}).click();
  await page.getByRole('link',{name:'Start',exact:true}).waitFor();
  assert.equal(new URL(page.url()).pathname,'/');
  await page.goto(url);await page.getByRole('group',{name:'Your tarot cards'}).waitFor();
  assert.equal(await page.getByRole('button',{name:'Back to start',exact:true}).count(),0);
  assert.deepEqual(errors,[]);console.log('Reading fit, card controls, fan angles, complete text, start-over navigation, and no extra start link passed.');
 }finally{await browser.close()}
})().catch(e=>{console.error(e);process.exitCode=1});
