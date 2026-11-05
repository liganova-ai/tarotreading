const assert = require('node:assert/strict');
const { chromium } = require(process.env.PLAYWRIGHT_PACKAGE_PATH || 'playwright');

(async () => {
  const browser = await chromium.launch({ executablePath: '/Applications/Google Chrome.app/Contents/MacOS/Google Chrome', headless: true });
  try {
    const page = await browser.newPage();
    const errors = [];
    page.on('pageerror', error => errors.push(error.message));
    await page.route('**/tarot_glow_music.mp3', route => route.abort());
    for (const width of [400, 320, 1440]) {
      await page.setViewportSize({ width, height: 842 });
      await page.goto(`${process.env.DECK_TEST_URL || 'http://127.0.0.1:3000'}/results?${new URLSearchParams({ question: 'What should I focus on this week?', cards: '[1,2,3]', adjectives: '["Helper"]', oracleStatus: 'AI_UNAVAILABLE' })}`);
      const cards = page.locator('[class*="results_cardContainer"]');
      await cards.first().waitFor();
      await page.waitForTimeout(600);
      await cards.first().evaluate(element => { window.__firstCard = element; });
      for (let index = 0; index < 3; index++) {
        await cards.nth(index).click();
        const dialog = page.getByRole('dialog');
        await dialog.waitFor();
        await page.waitForTimeout(950);
        const selected = await cards.nth(index).boundingBox();
        assert.ok(Math.abs(selected.x + selected.width / 2 - width / 2) < 2, 'Selected card must center horizontally');
        assert.ok(Math.abs(selected.y + selected.height / 2 - 842 / 2) < 2, 'Selected card must center vertically');
        assert.ok(selected.width >= Math.min(220, width * .46, 842 * .24) - 1, 'Focused card must enlarge');
        assert.ok((await dialog.boundingBox()).y >= selected.y + selected.height + 26, 'Explanation must sit below the card');
        assert.equal(await page.getByText('Back to your reading', { exact: true }).count(), 0);
        assert.equal(await cards.nth(index).getAttribute('aria-expanded'), 'true');
        for (let other = 0; other < 3; other++) {
          if (other !== index) assert.equal(await cards.nth(other).evaluate(e => getComputedStyle(e).opacity), '0');
        }
        assert.equal(await page.locator('[class*="results_readingContent"]').getAttribute('aria-hidden'), 'true');
        assert.ok(await dialog.locator('p').textContent());
        assert.equal(await cards.first().evaluate(e => e === window.__firstCard), true, 'Keep the original cards mounted');
        if (width === 400 && index === 1) await page.screenshot({ path: '/tmp/tarot-card-focus.png' });
        if (index === 0) await page.keyboard.press('Escape');
        if (index === 1) await page.getByRole('button', { name: 'Go back' }).click();
        if (index === 2) await page.locator('header h1').click();
        await page.waitForTimeout(950);
        assert.equal(await dialog.count(), 0);
        assert.equal(await cards.nth(index).getAttribute('aria-expanded'), 'false');
        assert.equal(await page.locator('[class*="results_readingContent"]').getAttribute('aria-hidden'), 'false');
        for (let other = 0; other < 3; other++) assert.equal(await cards.nth(other).evaluate(e => getComputedStyle(e).opacity), '1');
        assert.equal(await page.getByRole('button', { name: 'Ask another question' }).isEnabled(), true);
      }
      assert.equal(await page.evaluate(() => document.documentElement.scrollWidth > innerWidth), false);
    }
    await page.emulateMedia({ reducedMotion: 'reduce' });
    await cardsFor(page).first().click();
    await page.getByRole('dialog').waitFor();
    await page.getByRole('button', { name: 'Go back' }).click();
    await page.getByRole('dialog').waitFor({ state: 'detached' });
    assert.deepEqual(errors, []);
    console.log(JSON.stringify({ cardFocusAndReturn: 'passed', sizes: [400, 320, 1440], escapeAndOutsideDismiss: 'passed', reducedMotion: 'passed', errors }));
  } finally { await browser.close(); }
})().catch(error => { console.error(error); process.exitCode = 1; });
function cardsFor(page) { return page.locator('[class*="results_cardContainer"]'); }
