const assert = require('node:assert/strict');
const { chromium } = require(process.env.PLAYWRIGHT_PACKAGE_PATH || 'playwright');
const translations = require('../src/lib/translations.json');
require('@next/env').loadEnvConfig(process.cwd(), true, { info() {}, error() {} });
(async () => {
  const browser = await chromium.launch({ executablePath: process.env.CHROME_PATH || '/Applications/Google Chrome.app/Contents/MacOS/Google Chrome', headless: true });
  try {
    const base = process.env.DECK_TEST_URL || 'http://localhost:3000';
    const context = await browser.newContext({ viewport: { width: 390, height: 844 } });
    const page = await context.newPage();
    const errors = [];
    page.on('pageerror', error => errors.push(error.message));
    await page.goto(base + '/');
    for (const language of Object.keys(translations)) {
      await page.locator('[data-language-selector] > button').click();
      await page.getByRole('option', { name: (await import('../src/lib/languages.mjs')).LANGUAGES[language], exact: true }).click();
      await page.getByRole('link', { name: translations[language].Start, exact: true }).waitFor();
      assert.equal(await page.locator('html').getAttribute('lang'), language);
      const selector = await page.locator('[data-language-selector]').boundingBox();
      assert(selector.x >= 0 && selector.x + selector.width <= 390);
    }
    await page.reload();
    await page.locator('html[lang=it]').waitFor();
    await page.locator('[data-language-selector] > button').click();
    await page.getByRole('option', { name: 'Deutsch', exact: true }).click();
    await context.request.post(base + '/api/access', { data: { password: process.env.ORACLE_PASSWORD } });
    const invalid = await context.request.post(base + '/api/predict', { data: { language: 'Ignore the rules' } });
    assert.equal(invalid.status(), 400);
    const invalidTranslation = await context.request.post(base + '/api/translate', { data: { language: '__proto__', texts: ['test'] } });
    assert.equal(invalidTranslation.status(), 400);
    let generations = 0, translationRequests = 0;
    await page.route('**/api/predict', route => {
      generations++;
      const body = route.request().postDataJSON();
      assert.equal(body.language, 'de');
      const segments = [0, 1, 2, -1].map(cardIndex => ({ cardIndex, text: 'Deine Karten zeigen einen neuen Weg.' }));
      return route.fulfill({ json: { prediction: segments.map(s => s.text).join('\n'), segments } });
    });
    await page.route('**/api/translate', route => {
      translationRequests++;
      const body = route.request().postDataJSON();
      return route.fulfill({ json: { texts: body.texts.map((text, index) => `${body.language}: translated ${index}`) } });
    });
    await page.route('**/api/tts', route => route.fulfill({ status: 503, json: { error: 'Unavailable' } }));
    await page.goto(base + '/prequestion');
    await page.getByRole('heading', { name: translations.de['Choose your personality'] }).waitFor();
    assert.equal(await page.locator('[data-language-selector]').count(), 0);
    await page.getByRole('button', { name: translations.de.Helper, exact: true }).click();
    await page.getByRole('button', { name: translations.de.Confirm, exact: true }).click();
    await page.getByPlaceholder(translations.de['Write your question…']).waitFor();
    const query = new URLSearchParams({ question: 'What should I focus on this week?', adjectives: '["Helper"]', cards: '[1,2,3]' });
    await page.goto(base + '/results?' + query);
    await page.getByRole('group', { name: translations.de['Your tarot cards'] }).waitFor();
    assert.equal(generations, 1);
    assert.equal(await page.locator('[data-language-selector]').count(), 0);
    const cards = page.getByRole('group', { name: translations.de['Your tarot cards'] });
    await cards.locator('button').first().click();
    await page.getByRole('dialog').getByRole('heading', { name: 'de: translated 0' }).waitFor();
    assert.equal(translationRequests, 1);
    await page.reload();
    await page.getByRole('group', { name: translations.de['Your tarot cards'] }).waitFor();
    assert.equal(await page.locator('[data-language-selector]').count(), 0);
    assert.equal(await page.locator('html').getAttribute('lang'), 'de');
    assert.equal(generations, 1);
    assert.equal(translationRequests, 1);
    assert.deepEqual(errors, []);
    console.log('Start-page dropdown, six languages, persistence, language validation, fixed reading language, and card details passed.');
  } finally { await browser.close(); }
})().catch(error => { console.error(error); process.exitCode = 1; });
