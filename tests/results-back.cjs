const assert = require('node:assert/strict');
const { chromium } = require(process.env.PLAYWRIGHT_PACKAGE_PATH || 'playwright');
require('@next/env').loadEnvConfig(process.cwd(), true, { info() {}, error() {} });

(async () => {
  const browser = await chromium.launch({ executablePath: process.env.CHROME_PATH || '/Applications/Google Chrome.app/Contents/MacOS/Google Chrome', headless: true });
  try {
    const context = await browser.newContext();
    const base = process.env.DECK_TEST_URL || 'http://localhost:3000';
    const login = await context.request.post(base + '/api/access', { data: { password: process.env.ORACLE_PASSWORD } });
    assert.equal(login.status(), 200, 'Test requires a configured oracle password');
    const page = await context.newPage();
    const segments = [0, 1, 2, -1].map(cardIndex => ({ cardIndex, text: 'Consider your next step with patience and curiosity.' }));
    await page.route('**/api/predict', route => route.fulfill({ json: { prediction: segments.map(s => s.text).join('\n'), segments } }));
    await page.route('**/api/tts', route => route.fulfill({ status: 503, json: { error: 'Unavailable' } }));
    const query = new URLSearchParams({ question: 'What should I focus on this week?', adjectives: '["Helper"]', cards: '[1,2,3]' });
    for (const viewport of [{ width: 390, height: 844 }, { width: 1440, height: 900 }, { width: 1920, height: 1080 }, { width: 960, height: 600 }]) {
      await page.setViewportSize(viewport);
      await page.goto(base + '/disclaimer');
      await page.waitForTimeout(500);
      const expected = await page.getByRole('link', { name: 'Go back', exact: true }).boundingBox();
      await page.goto(base + '/results?' + query);
      const cards = page.getByRole('group', { name: 'Your tarot cards' });
      await cards.waitFor();
      await page.waitForTimeout(1300);
      for (const keyboard of [false, true]) {
        await cards.locator('button').first().click();
        await page.getByRole('dialog').waitFor();
        await page.waitForTimeout(1300);
        const focusedCard = await cards.locator('button').first().boundingBox();
        const details = await page.getByRole('dialog').boundingBox();
        if (viewport.width >= 960) {
          assert.ok(details.x > focusedCard.x + focusedCard.width, 'Desktop description sits to the right of the card');
          assert.ok(Math.abs(details.y + details.height / 2 - focusedCard.y - focusedCard.height / 2) < 2, 'Desktop card and description align vertically');
        } else {
          assert.ok(details.y > focusedCard.y + focusedCard.height, 'Mobile description remains below the card');
        }
        const back = page.getByRole('button', { name: 'Go back', exact: true });
        const actual = await back.boundingBox();
        assert.ok(Math.abs(actual.x - expected.x) < 1 && Math.abs(actual.y - expected.y) < 1, 'Back control aligns with wizard pages');
        if (keyboard) await back.press('Enter');
        else await back.click();
        await page.getByRole('dialog').waitFor({ state: 'detached' });
        assert.equal(new URL(page.url()).pathname, '/results', 'Closing a card must stay on the reading');
        await page.waitForTimeout(1300);
        assert.equal(await cards.locator('[aria-expanded="true"]').count(), 0);
      }
      await page.getByRole('button', { name: 'Go back', exact: true }).click();
      await page.waitForURL('**/cards?**');
      console.log(`${viewport.width}x${viewport.height}: pointer and keyboard close to reading; next back returns to selection; position matches`);
    }
  } finally { await browser.close(); }
})().catch(error => { console.error(error); process.exitCode = 1; });
