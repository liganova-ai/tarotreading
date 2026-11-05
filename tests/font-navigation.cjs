const assert = require('node:assert/strict');
const { chromium } = require(process.env.PLAYWRIGHT_PACKAGE_PATH || 'playwright');
(async () => {
 const browser = await chromium.launch({ executablePath: process.env.CHROME_PATH || '/Applications/Google Chrome.app/Contents/MacOS/Google Chrome', headless: true });
 try {
  const page = await browser.newPage({ viewport: { width: 400, height: 842 } });
  const errors = []; page.on('pageerror', error => errors.push(error.message));
  let releaseFonts;
  const fontGate = new Promise(resolve => { releaseFonts = resolve; });
  await page.route('**/*.woff2', async route => { await fontGate; await route.continue(); });
  await page.route('**/api/validate-question', route => route.fulfill({ json: { valid: true } }));
  await page.route('**/api/predict', route => route.fulfill({ status: 503, json: { code: 'AI_UNAVAILABLE' } }));
  await page.route('**/tarot_glow_music.mp3', route => route.abort());
  await page.goto(process.env.DECK_TEST_URL || 'http://127.0.0.1:3018', { waitUntil: 'domcontentloaded' });
  await page.waitForTimeout(200);
  assert.equal(await page.locator('.app-shell').getAttribute('data-fonts-ready'), 'false');
  assert.equal(await page.locator('.page-content').evaluate(e => getComputedStyle(e).visibility), 'hidden', 'Do not flash fallback fonts on a cold connection');
  releaseFonts();
  await page.waitForFunction(() => document.querySelector('.app-shell').dataset.fontsReady === 'true');
  await page.evaluate(() => {
   window.__fontRegressions = [];
   window.__watchFonts = true;
   const watch = () => {
    for (const h of document.querySelectorAll('.page-content h1')) {
     const style = getComputedStyle(h);
     if (!style.fontFamily.includes('luxury') || style.fontWeight !== '200' || !document.fonts.check(`200 16px ${style.fontFamily.split(',')[0]}`)) {
      window.__fontRegressions.push({ text: h.textContent, family: style.fontFamily, weight: style.fontWeight });
     }
    }
    if (window.__watchFonts) requestAnimationFrame(watch);
   };
   watch();
  });
  await page.getByRole('link', { name: 'Start', exact: true }).click();
  await page.getByRole('heading', { name: 'Disclaimer', exact: true }).waitFor();
  await page.waitForTimeout(400);
  await page.getByRole('button', { name: 'Confirm', exact: true }).click();
  await page.getByRole('button', { name: 'Helper', exact: true }).click();
  await page.getByRole('button', { name: 'Confirm', exact: true }).click();
  const input = page.getByRole('textbox', { name: 'Your tarot question' });
  await input.waitFor(); await page.waitForTimeout(400);
  for (const width of [400, 320, 1440]) {
   await page.setViewportSize({ width, height: 842 });
   for (const text of ['Will I be a CTO one day?', 'What should I focus on as I move into a new chapter of my life? '.repeat(6).slice(0, 400)]) {
    await input.fill(text); await page.waitForTimeout(150);
    const state = await input.evaluate(e => ({ value: e.value, scrollbar: getComputedStyle(e).scrollbarWidth, webkitScrollbar: getComputedStyle(e, '::-webkit-scrollbar').display, resize: getComputedStyle(e).resize, fontLoaded: document.fonts.check(`italic 500 28px ${getComputedStyle(e).fontFamily.split(',')[0]}`), overflow: document.documentElement.scrollWidth > innerWidth }));
    assert.equal(state.value, text);
    assert.equal(state.scrollbar, 'none');
    assert.equal(state.webkitScrollbar, 'none');
    assert.equal(state.resize, 'none');
    assert.equal(state.fontLoaded, true);
    assert.equal(state.overflow, false);
   }
  }
  await input.fill('What should I focus on this week?');
  await page.getByRole('button', { name: 'Confirm', exact: true }).click();
  await page.getByRole('heading', { name: 'The future is in your hands', exact: true }).waitFor();
  await page.waitForTimeout(2800);
  await page.getByRole('group', { name: /Tarot deck/ }).locator('button').evaluateAll(buttons => buttons.filter(b => getComputedStyle(b).visibility === 'visible').slice(0, 3).forEach(b => b.click()));
  await page.getByRole('button', { name: 'Ask the oracle' }).click();
  await page.getByRole('group', { name: 'Your tarot cards', exact: true }).waitFor();
  await page.waitForTimeout(600);
  await page.evaluate(() => { window.__watchFonts = false; });
  assert.deepEqual(await page.evaluate(() => window.__fontRegressions), [], 'Every animation frame must retain the correct headline font');
  assert.deepEqual(errors, []);
  console.log(JSON.stringify({ coldFontLoad: 'passed', routeAnimationFonts: 'passed', scrollbarFreeQuestion: 'passed', widths: [400, 320, 1440], errors }));
 } finally { await browser.close(); }
})().catch(error => { console.error(error); process.exitCode = 1; });
