const assert = require('node:assert/strict');
const { chromium } = require(process.env.PLAYWRIGHT_PACKAGE_PATH || 'playwright');
(async()=>{
 const browser=await chromium.launch({executablePath:'/Applications/Google Chrome.app/Contents/MacOS/Google Chrome',headless:true});
 try{
  const page=await browser.newPage({viewport:{width:400,height:842}});
  const base=process.env.DECK_TEST_URL||'http://localhost:3000';
  const errors=[];page.on('pageerror',e=>errors.push(e.message));
  await page.goto(base+'/cards?question=What%20should%20I%20focus%20on%20this%20week%3F&adjectives=%5B%22Helper%22%5D');
  await page.getByRole('group',{name:/Tarot deck/}).waitFor();await page.waitForTimeout(2800);
  await page.locator('button[aria-label^="Card "]').first().dispatchEvent('click');
  const shape=svg=>svg.evaluate(e=>({viewBox:e.getAttribute('viewBox'),star:e.querySelector('path').getAttribute('d'),circle:e.querySelector('circle[stroke]').outerHTML,gradient:[...e.querySelectorAll('stop')].map(s=>s.outerHTML)}));
  const selectedShape=await shape(page.getByRole('button',{name:'Go to selected card 1'}).locator('svg'));
  await page.route('**/api/predict',()=>{});
  await page.route('**/tarot_glow_music.mp3',route=>route.abort());
  await page.goto(base+'/results?question=What%20should%20I%20focus%20on%20this%20week%3F&cards=%5B1%2C2%2C3%5D&adjectives=%5B%22Helper%22%5D');
  const loader=page.locator('[class*=results_loadingCircles]');await loader.waitFor();await page.waitForTimeout(500);
  assert.equal(await loader.locator('svg').count(),3);
  assert.deepEqual(await shape(loader.locator('svg').first()),selectedShape);
  assert.match(await loader.locator('svg rect').first().evaluate(e=>getComputedStyle(e).animationName),/dot-fill/);
  const middle=await loader.evaluate(e=>{const b=e.getBoundingClientRect();return b.y+b.height/2});
  assert.ok(Math.abs(middle-421)<1);
  await page.screenshot({path:'/tmp/tarot-shared-loading-dots.png'});
  await page.emulateMedia({reducedMotion:'reduce'});
  assert.equal(await loader.locator('svg rect').first().evaluate(e=>getComputedStyle(e).animationName),'none');
  await page.goto(base+'/');await page.getByRole('link',{name:'Start',exact:true}).waitFor();
  assert.equal(await page.getByRole('button',{name:'Clear the crystal sphere'}).count(),1);
  assert.deepEqual(errors,[]);
  console.log('Loading uses three matching selection dots, centered and animated, with reduced-motion support. Home sphere remains available.');
 }finally{await browser.close()}
})().catch(e=>{console.error(e);process.exitCode=1});
