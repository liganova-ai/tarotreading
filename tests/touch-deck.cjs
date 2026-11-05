const assert = require('node:assert/strict');
const { chromium } = require(process.env.PLAYWRIGHT_PACKAGE_PATH || 'playwright');

(async () => {
  const browser = await chromium.launch({ executablePath: process.env.CHROME_PATH || '/Applications/Google Chrome.app/Contents/MacOS/Google Chrome', headless: true });
  try {
    const context = await browser.newContext({ viewport: { width: 400, height: 825 }, isMobile: true, hasTouch: true, deviceScaleFactor: 1 });
    const page = await context.newPage();
    const errors = []; page.on('pageerror', error => errors.push(error.message));
    await page.goto(`${process.env.DECK_TEST_URL || 'http://127.0.0.1:3000'}/cards?question=What%20should%20I%20focus%20on%20this%20week%3F&adjectives=%5B%22Helper%22%5D`);
    const center = page.getByRole('button', { name: /^Card / }).first();
    await center.waitFor();
    await page.waitForTimeout(2800);
    const initialBox = await center.boundingBox();
    await page.touchscreen.tap(initialBox.x + initialBox.width / 2, initialBox.y + initialBox.height / 2);
    await page.waitForTimeout(300);
    const label = await center.getAttribute('aria-label');
    const selected = page.locator(`button[aria-label="${label}"]`);
    await selected.evaluate(element => { window.__selectedCard = element; });
    const box = await selected.boundingBox();
    const y = box.y + box.height / 2;
    const beforeX = box.x;
    const cdp = await context.newCDPSession(page);
    const seen = new Set(await page.getByRole('button', { name: /^Card / }).evaluateAll(elements => elements.map(element => element.ariaLabel)));
    const swipe = async (from, to, checkContinuous = false) => {
      await cdp.send('Input.dispatchTouchEvent', { type: 'touchStart', touchPoints: [{ x: from, y, id: 1 }] });
      let lastX = beforeX;
      for (let step = 1; step <= 12; step++) {
        await cdp.send('Input.dispatchTouchEvent', { type: 'touchMove', touchPoints: [{ x: from + (to - from) * step / 12, y, id: 1 }] });
        if (checkContinuous) {
          const sample = await selected.evaluate(element => ({ same: window.__selectedCard === element, pressed: element.ariaPressed, lift: getComputedStyle(element.firstElementChild).translate, x: element.getBoundingClientRect().x }));
          assert.equal(sample.same, true); assert.equal(sample.pressed, 'true'); assert.equal(sample.lift, '0px -24px');
          assert.ok(sample.x <= lastX + 1 && lastX - sample.x < 24, 'Native touch must continue smoothly after capture transfers from card to deck');
          lastX = sample.x;
        }
      }
      await cdp.send('Input.dispatchTouchEvent', { type: 'touchEnd', touchPoints: [] });
      await page.waitForTimeout(300);
      for (const card of await page.getByRole('button', { name: /^Card / }).evaluateAll(elements => elements.map(element => element.ariaLabel))) seen.add(card);
    };
    await swipe(210, 25, true);
    assert.ok((await selected.boundingBox()).x < beforeX - 90, 'A swipe must reveal the next cards');
    for (let index = 0; index < 4; index++) await swipe(280, 30);
    await swipe(50, 290);
    assert.ok(seen.size >= 10, `Expected new cards after repeated swipes; saw ${seen.size}`);
    assert.equal(await selected.getAttribute('aria-pressed'), 'true');
    const wheelName = await page.getByRole('button', { name: /^Card / }).evaluateAll(elements => elements.sort((a, b) => Math.abs(a.getBoundingClientRect().x + a.getBoundingClientRect().width / 2 - innerWidth / 2) - Math.abs(b.getBoundingClientRect().x + b.getBoundingClientRect().width / 2 - innerWidth / 2))[0].ariaLabel);
    const wheelCard = page.getByRole('button', { name: wheelName, exact: true });
    const beforeWheel = await wheelCard.evaluate(element => element.style.transform);
    await page.getByRole('group', { name: /Tarot deck/ }).dispatchEvent('wheel', { deltaX: 150, deltaY: 0 });
    assert.notEqual(await wheelCard.evaluate(element => element.style.transform), beforeWheel);
    const beforeVertical = await wheelCard.evaluate(element => element.style.transform);
    await page.getByRole('group', { name: /Tarot deck/ }).dispatchEvent('wheel', { deltaX: 0, deltaY: 150 });
    assert.equal(await wheelCard.evaluate(element => element.style.transform), beforeVertical);

    assert.equal(await page.getByRole('status', { name: 'Card selection' }).getAttribute('data-count'), '1');
    assert.equal(await page.getByRole('status', { name: 'Card selection' }).locator('[data-filled="true"]').count(), 1);
    const headingSize = await page.getByRole('heading', { name: 'The future is in your hands' }).evaluate(element => getComputedStyle(element).fontSize);
    assert.equal(headingSize, '32px');
    const cardWidth = await selected.evaluate(element => parseFloat(getComputedStyle(element).width));
    assert.ok(Math.abs(cardWidth - 92 * 1.18) < .2);
    assert.equal(await page.evaluate(() => document.documentElement.scrollWidth > innerWidth), false);
    await page.screenshot({ path: '/tmp/tarot-native-touch-deck.png' });
    assert.deepEqual(errors, []);
    console.log(JSON.stringify({ nativeTouchSwipes: 'passed', horizontalTrackpadSwipe: 'passed', stableSelection: 'passed', uniqueCardsRevealed: seen.size, cardWidth, headingSize, errors }));
  } finally { await browser.close(); }
})().catch(error => { console.error(error); process.exitCode = 1; });
