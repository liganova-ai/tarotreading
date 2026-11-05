const assert = require('node:assert/strict');
const { chromium } = require(process.env.PLAYWRIGHT_PACKAGE_PATH || 'playwright');
const wrap = (value, count = 78) => ((value % count) + count) % count;
(async () => {
 const browser = await chromium.launch({ executablePath: '/Applications/Google Chrome.app/Contents/MacOS/Google Chrome', headless: true });
 try {
  const context = await browser.newContext({ viewport: { width: 400, height: 842 }, isMobile: true, hasTouch: true });
  const page = await context.newPage();
  const errors=[]; page.on('pageerror',error=>errors.push(error.message));
  await page.goto(`${process.env.DECK_TEST_URL || 'http://127.0.0.1:3000'}/cards?question=What%20should%20I%20focus%20on%20this%20week%3F&adjectives=%5B%22Helper%22%5D`);
  const cards=page.locator('button[aria-label^="Card "]');
  await cards.first().waitFor(); await page.waitForTimeout(2800);
  const selectedName=await cards.first().getAttribute('aria-label');
  await cards.first().dispatchEvent('click');
  const selected=page.locator(`button[aria-label="${selectedName}"]`);
  const progress=page.getByRole('status',{name:'Card selection'});
  const cdp=await context.newCDPSession(page);
  const phase=()=>cards.evaluateAll(nodes=>{
   const index=nodes.findIndex(e=>getComputedStyle(e).visibility==='visible'&&Math.abs(new DOMMatrix(getComputedStyle(e).transform).m41+parseFloat(getComputedStyle(e).width)/2)<70);
   const m=new DOMMatrix(getComputedStyle(nodes[index]).transform);
   return index-Math.atan2(m.m12,m.m11)*1416/(101*1.18);
  });
  const swipe=async(from,to,duration)=>{
   const box=await page.getByRole('group',{name:/Tarot deck/}).boundingBox();
   const y=box.y+170;
   await cdp.send('Input.dispatchTouchEvent',{type:'touchStart',touchPoints:[{x:from,y,id:1}]});
   const start=await phase();
   for(let step=1;step<=12;step++){
    await page.waitForTimeout(duration/12);
    await cdp.send('Input.dispatchTouchEvent',{type:'touchMove',touchPoints:[{x:from+(to-from)*step/12,y,id:1}]});
   }
   await page.evaluate(()=>new Promise(requestAnimationFrame));
   const release=await phase();
   await cdp.send('Input.dispatchTouchEvent',{type:'touchEnd',touchPoints:[]});
   await page.waitForTimeout(600);
   const end=await phase();
   return {direct:wrap(release-start),momentum:wrap(end-release),end};
  };
  const slow=await swipe(310,30,1000);
  await page.waitForTimeout(1600);
  const fast=await swipe(310,30,90);
  assert.ok(fast.momentum>slow.momentum+1,'Fast swipe must carry significantly more momentum than slow swipe');
  assert.ok(Math.abs(fast.direct-slow.direct)<.3,'During a drag the deck must follow the finger consistently');
  assert.equal(await selected.getAttribute('aria-pressed'),'true','Momentum must preserve selection');
  await page.getByRole('button',{name:'Go to selected card 1'}).click();
  await page.waitForTimeout(1500);
  const centered=await selected.boundingBox();
  assert.ok(Math.abs(centered.x+centered.width/2-200)<2,'Filled symbol must center its selected card');
  assert.equal(await selected.getAttribute('aria-pressed'),'true');
  await page.getByRole('button',{name:selectedName.replace('Card','Unselect card'),exact:true}).click();
  assert.equal(await selected.getAttribute('aria-pressed'),'false');
  assert.equal(await progress.getAttribute('data-count'),'0');
  assert.equal(await page.getByRole('button',{name:'Ask the oracle'}).isDisabled(),true);
  await selected.dispatchEvent('click');
  assert.equal(await progress.getAttribute('data-count'),'1');
  const box=await page.getByRole('group',{name:/Tarot deck/}).boundingBox();
  await cdp.send('Input.dispatchTouchEvent',{type:'touchStart',touchPoints:[{x:250,y:box.y+170,id:1}]});
  await cdp.send('Input.dispatchTouchEvent',{type:'touchMove',touchPoints:[{x:120,y:box.y+170,id:1}]});
  await cdp.send('Input.dispatchTouchEvent',{type:'touchCancel',touchPoints:[]});
  const cancelled=await phase();await page.waitForTimeout(400);
  assert.ok(Math.abs((await phase())-cancelled)<.05,'Cancelled gesture must stop momentum');
  const additional = await cards.evaluateAll(nodes=>nodes.filter(e=>getComputedStyle(e).visibility==='visible'&&e.ariaPressed!=='true').slice(0,2).map(e=>e.ariaLabel));
  for (const name of additional) await page.getByRole('button',{name,exact:true}).click({force:true});
  assert.equal(await progress.getAttribute('data-count'),'3');
  assert.equal(await page.getByRole('button',{name:'Ask the oracle'}).isEnabled(),true);
  await page.getByRole('button',{name:/^Unselect card /}).nth(1).click();
  assert.equal(await progress.getAttribute('data-count'),'2');
  assert.equal(await page.getByRole('button',{name:'Ask the oracle'}).isDisabled(),true);
  assert.deepEqual(errors,[]);
  console.log(JSON.stringify({slow,fast,selectedCardNavigation:'passed',unselectAndReselect:'passed',cancelledGesture:'passed',errors}));
 } finally {await browser.close()}
})().catch(error=>{console.error(error);process.exitCode=1});
