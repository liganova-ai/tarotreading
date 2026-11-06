const assert = require('node:assert/strict');
const { chromium } = require(process.env.PLAYWRIGHT_PACKAGE_PATH || 'playwright');
(async()=>{
 const browser=await chromium.launch({executablePath:'/Applications/Google Chrome.app/Contents/MacOS/Google Chrome',headless:true});
 try{
  const page=await browser.newPage();const errors=[];page.on('pageerror',e=>errors.push(e.message));
  for(const {width,height} of [{width:400,height:820},{width:320,height:640},{width:1440,height:900}]){
   await page.setViewportSize({width,height});
   await page.goto(`${process.env.DECK_TEST_URL||'http://localhost:3000'}/prequestion`);
   const group=page.getByRole('group',{name:'Personality choices'});
   await group.waitFor();await page.waitForTimeout(850);
   const geometry=await group.getByRole('button').evaluateAll(nodes=>nodes.map(e=>{const b=e.getBoundingClientRect();const range=document.createRange();range.selectNodeContents(e);return {name:e.textContent.trim(),x:b.x+b.width/2,y:b.y+b.height/2,size:b.width,textWidth:range.getBoundingClientRect().width,available:e.clientWidth-parseFloat(getComputedStyle(e).paddingLeft)-parseFloat(getComputedStyle(e).paddingRight)}}));
   assert.equal(geometry.length,8);
   const sphere=await group.getByRole('status',{name:'Personality selection'}).boundingBox();
   const center={x:sphere.x+sphere.width/2,y:sphere.y+sphere.height/2};
   assert.equal(await group.getByRole('button',{name:'Peacemaker',exact:true}).count(),0);
   const slots=group.getByRole('status',{name:'Personality selection'});
   assert.equal(await slots.locator('svg').count(),3);
   assert.equal(await slots.locator('[data-filled="true"]').count(),0);
   const radius=(await group.boundingBox()).width*.375;
   for(let i=0;i<8;i++)assert.ok(Math.abs(Math.hypot(geometry[i].x-center.x,geometry[i].y-center.y)-radius)<2);
   for(let i=0;i<8;i++){
    assert.ok(geometry[i].textWidth<=geometry[i].available+1,JSON.stringify(geometry[i]));
    for(let j=i+1;j<8;j++)assert.ok(Math.hypot(geometry[i].x-geometry[j].x,geometry[i].y-geometry[j].y)>(geometry[i].size+geometry[j].size)/2+2,'Personality circles must not overlap');
   }
   const footer=await page.getByRole('button',{name:'Confirm',exact:true}).boundingBox();
   assert.ok(Math.max(...geometry.map(e=>e.y+e.size/2))<footer.y-12,'Leave space above the footer');
   for(const name of ['Helper','Investigator','Challenger'])await group.getByRole('button',{name,exact:true}).click();
   await group.getByRole('button',{name:'Reformer',exact:true}).click();
   assert.equal(await group.locator('[aria-pressed="true"]').count(),3);
   await slots.locator('[data-filled="true"]').nth(2).waitFor();
   assert.equal(await slots.locator('[data-filled="true"]').count(),3);
   await group.getByRole('button',{name:'Helper',exact:true}).click();
   assert.equal(await group.locator('[aria-pressed="true"]').count(),2);
   assert.equal(await slots.locator('[data-filled="true"]').count(),2);
   assert.equal(await page.evaluate(()=>document.documentElement.scrollWidth>innerWidth),false);
   if(width===400)await page.screenshot({path:'/tmp/tarot-personality-orbit.png'});
   console.log({width,height,radius,smallestFont:await group.getByRole('button').first().evaluate(e=>getComputedStyle(e).fontSize)});
  }
  assert.deepEqual(errors,[]);console.log('Round personality layout, text fit, selection limit, and footer spacing passed.');
 }finally{await browser.close()}
})().catch(e=>{console.error(e);process.exitCode=1});
