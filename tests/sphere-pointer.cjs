const assert=require('node:assert/strict');
const {chromium}=require(process.env.PLAYWRIGHT_PACKAGE_PATH||'playwright');
(async()=>{
 const browser=await chromium.launch({executablePath:'/Applications/Google Chrome.app/Contents/MacOS/Google Chrome',headless:true});
 try{
  const page=await browser.newPage({viewport:{width:1440,height:900}});const errors=[];page.on('pageerror',e=>errors.push(e.message));
  const base=process.env.DECK_TEST_URL||'http://localhost:3000';
  await page.goto(base+'/prequestion');
  const wheel=page.getByRole('group',{name:'Personality choices'});await wheel.waitFor();await page.waitForTimeout(850);
  const box=await wheel.boundingBox();
  const glow=wheel.locator('[class*=pointerHighlight]');
  const position=async()=>{const highlight=await glow.evaluate(e=>{const m=new DOMMatrix(getComputedStyle(e).transform);return {x:m.m41,y:m.m42}});const glass=await wheel.locator('[class*=pointerRefraction]').evaluate(e=>{const m=new DOMMatrix(getComputedStyle(e).transform);return {x:m.m41,y:m.m42,angle:Math.atan2(m.m12,m.m11)*180/Math.PI}});return {...highlight,glass}};
  const move=async(x,y)=>{await page.mouse.move(box.x+box.width*x,box.y+box.height*y);await page.waitForTimeout(650);return position()};
  const left=await move(.12,.5),right=await move(.88,.5),top=await move(.5,.12),bottom=await move(.5,.88);
  assert.ok(right.x-left.x>120,'Reflection must follow horizontal mouse movement');
  assert.ok(bottom.y-top.y>120,'Reflection must follow vertical mouse movement');
  assert.ok(Math.abs(left.glass.angle)<.01&&Math.abs(right.glass.angle)<.01,'Radial light must translate toward the pointer without rotating');
  assert.ok(left.glass.x<0&&right.glass.x>0&&top.glass.y<0&&bottom.glass.y>0,'Radial center must follow the correct direction on both axes');
  const radial=wheel.locator('radialGradient[id$="-glass"]');
  assert.equal(await radial.getAttribute('cx'),'200');
  assert.equal(await radial.getAttribute('cy'),'410');
  assert.ok(right.glass.x-left.glass.x>45,'Entire glass gradient must shift horizontally');
  assert.ok(bottom.glass.y-top.glass.y>45,'Entire glass gradient must shift vertically');
  await wheel.getByRole('button',{name:'Helper',exact:true}).click();
  assert.equal(await wheel.getByRole('button',{name:'Helper',exact:true}).getAttribute('aria-pressed'),'true');
  await page.mouse.move(10,10);await page.waitForTimeout(650);const rest=await position();
  assert.ok(Math.abs(rest.x+86)<1&&Math.abs(rest.y-94)<1,'Reflection returns gently to its resting position');
  await page.emulateMedia({reducedMotion:'reduce'});await move(.88,.5);
  assert.equal(await glow.evaluate(e=>getComputedStyle(e).animationName),'none');
  await page.goto(base+'/');await page.getByRole('link',{name:'Start',exact:true}).waitFor();
  assert.equal(await page.locator('[class*=pointerHighlight], [class*=pointerRefraction], [class*=pointerCaustic]').count(),0,'Home reflection keeps its original animation');
  assert.deepEqual(errors,[]);console.log(JSON.stringify({mouseFollow:'passed',left,right,top,bottom,selection:'passed',rest:'passed',homeAnimation:'preserved'}));
 }finally{await browser.close()}
})().catch(e=>{console.error(e);process.exitCode=1});
