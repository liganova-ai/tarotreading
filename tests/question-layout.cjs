const assert = require('node:assert/strict');
const { chromium } = require(process.env.PLAYWRIGHT_PACKAGE_PATH || 'playwright');
(async () => {
  const browser = await chromium.launch({ executablePath: process.env.CHROME_PATH || '/Applications/Google Chrome.app/Contents/MacOS/Google Chrome', headless: true });
  try {
    const page = await browser.newPage({ viewport: { width: 400, height: 842 } });
    await page.goto(`${process.env.DECK_TEST_URL || 'http://127.0.0.1:3000'}/question?adjectives=%5B%22Helper%22%5D`);
    const input = page.getByRole('textbox', { name: 'Your tarot question' });
    for (const text of ['Will I be a CTO one day?', 'What should I focus on as I take the next step in my career and learn to trust my own judgement?']) {
      await input.fill(text); await page.waitForTimeout(120);
      const center = await input.evaluate(element => { const box = element.getBoundingClientRect(); return { y: box.top + box.height / 2, target: innerHeight / 2, family: getComputedStyle(element).fontFamily, size: getComputedStyle(element).fontSize }; });
      assert.ok(Math.abs(center.y - center.target) < 1, JSON.stringify(center));
      assert.match(center.family, /sabon/i);
      assert.equal(center.size, '28px');
    }
    await page.setViewportSize({ width: 1440, height: 900 }); await page.waitForTimeout(120);
    assert.ok(await input.evaluate(element => Math.abs(element.getBoundingClientRect().top + element.getBoundingClientRect().height / 2 - innerHeight / 2) < 1));
    console.log('Question text stays vertically centered at mobile and desktop sizes.');
  } finally { await browser.close(); }
})().catch(error => { console.error(error); process.exitCode = 1; });
