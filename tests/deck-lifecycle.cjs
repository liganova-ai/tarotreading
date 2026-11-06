const assert=require('node:assert/strict');
const {chromium}=require(process.env.PLAYWRIGHT_PACKAGE_PATH||'playwright');
(async()=>{
 const browser=await chromium.launch({executablePath:'/Applications/Google Chrome.app/Contents/MacOS/Google Chrome',headless:true});
 try{
  const page=await browser.newPage({viewport:{width:400,height:842}});const errors=[];
  page.on('pageerror',e=>errors.push(e.message));
  await page.addInitScript(()=>{
   window.__deckObservers=[];
   const NativeObserver=window.ResizeObserver;
   window.ResizeObserver=class extends NativeObserver{
    constructor(callback){super(callback);this.deliverLate=()=>callback([],this);window.__deckObservers.push(this)}
    observe(element,...args){this.target=element;return super.observe(element,...args)}
   };
  });
  await page.route('**/api/validate-question',route=>route.fulfill({json:{valid:true}}));
  await page.goto(`${process.env.DECK_TEST_URL||'http://localhost:3000'}/cards?question=What%20should%20I%20focus%20on%20this%20week%3F&adjectives=%5B%22Helper%22%5D`);
  for(let cycle=0;cycle<5;cycle++){
   await page.getByRole('group',{name:/Tarot deck/}).waitFor();
   await page.setViewportSize({width:cycle%2?400:1440,height:842});
   await page.getByRole('link',{name:'Go back',exact:true}).click();
   await page.getByRole('textbox',{name:'Your tarot question'}).waitFor();
   await page.waitForFunction(()=>!document.querySelector('[aria-label^="Tarot deck"]'));
   const count=await page.evaluate(()=>{
    const detached=window.__deckObservers.filter(observer=>observer.target?.getAttribute('aria-label')?.startsWith('Tarot deck')&&!observer.target.isConnected);
    detached.forEach(observer=>observer.deliverLate());return detached.length;
   });
   assert.ok(count>0,'Exercise a real observer callback after its deck has been detached');
   await page.getByRole('button',{name:'Confirm',exact:true}).click();
  }
  await page.getByRole('group',{name:/Tarot deck/}).waitFor();
  assert.deepEqual(errors,[]);
  console.log('Repeated navigation and queued resize callbacks after deck removal passed without runtime errors.');
 }finally{await browser.close()}
})().catch(e=>{console.error(e);process.exitCode=1});
