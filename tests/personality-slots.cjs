const assert=require('node:assert/strict');
const {chromium}=require(process.env.PLAYWRIGHT_PACKAGE_PATH||'playwright');
(async()=>{
 const browser=await chromium.launch({executablePath:'/Applications/Google Chrome.app/Contents/MacOS/Google Chrome',headless:true});
 try{
  const page=await browser.newPage({viewport:{width:1440,height:900}});const errors=[];page.on('pageerror',e=>errors.push(e.message));
  const base=process.env.DECK_TEST_URL||'http://localhost:3000';
  await page.goto(base+'/prequestion');
  const wheel=page.getByRole('group',{name:'Personality choices'});await wheel.waitFor();await page.waitForTimeout(850);
  const slots=wheel.getByRole('status',{name:'Personality selection'});
  assert.equal(await slots.locator('svg').count(),3);
  assert.equal(await slots.locator('[data-active="true"]').count(),0);
  for(const name of ['Helper','Investigator','Challenger']) await wheel.getByRole('button',{name,exact:true}).click();
  await slots.locator('[data-active="true"]').nth(2).waitFor();
  assert.equal(await slots.locator('[data-active="true"]').count(),3);
  await wheel.getByRole('button',{name:'Reformer',exact:true}).click();
  assert.equal(await wheel.locator('[aria-pressed="true"]').count(),3);
  await wheel.getByRole('button',{name:'Helper',exact:true}).click();
  assert.equal(await slots.locator('[data-active="true"]').count(),2);
  await wheel.getByRole('button',{name:'Reformer',exact:true}).focus();
  await page.keyboard.press('Space');
  await slots.locator('[data-active="true"]').nth(2).waitFor();
  assert.equal(await slots.locator('[data-active="true"]').count(),3);
  await page.emulateMedia({reducedMotion:'reduce'});
  const filled=slots.locator('svg[data-active="true"]').first();
  assert.ok(await filled.locator('[class*=fill]').evaluate(e=>parseFloat(getComputedStyle(e).transitionDuration)<.001),'Reduced motion must have no perceptible fill animation');
  assert.equal(await wheel.locator('svg[viewBox="20 230 360 360"]').count(),0);
  await page.goto(base+'/');await page.getByRole('link',{name:'Start',exact:true}).waitFor();
  assert.equal(await page.locator('[class*=pointerHighlight], [class*=pointerRefraction], [class*=pointerCaustic]').count(),0,'Home reflection keeps its original animation');
  assert.deepEqual(errors,[]);console.log('Three personality slots fill and empty with selection, enforce the limit, support keyboard input and reduced motion, and preserve the home artwork.');
 }finally{await browser.close()}
})().catch(e=>{console.error(e);process.exitCode=1});
