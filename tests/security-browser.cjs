// Run against an isolated production test server; paid endpoints are browser fixtures.
const assert = require('node:assert/strict');
const { chromium } = require(process.env.PLAYWRIGHT_PACKAGE_PATH || 'playwright');
(async () => {
  const base = process.env.ORACLE_TEST_URL || 'http://127.0.0.1:3001';
  assert.ok(process.env.ORACLE_TEST_PASSWORD, 'An explicit test password is required');
  const browser = await chromium.launch({ executablePath: '/Applications/Google Chrome.app/Contents/MacOS/Google Chrome', headless: true });
  try {
    const context = await browser.newContext({ viewport: { width: 1440, height: 1000 }, reducedMotion: 'reduce' });
    const page = await context.newPage();
    const errors = [];
    page.on('pageerror', error => errors.push(error.message));
    page.on('console', message => { if (/Content Security Policy|Refused to execute/i.test(message.text())) errors.push(message.text()); });
    await context.addInitScript(() => localStorage.setItem('oracle-reading-v1:legacy', 'private legacy data'));
    await page.route('**/api/validate-question', route => route.fulfill({ json: { valid: true } }));
    await page.route('**/api/predict', route => route.fulfill({ json: {
      prediction: 'A private test reading.', segments: [0,1,2,-1].map(cardIndex => ({ cardIndex, text: 'A private test reading.' }))
    } }));
    await page.route('**/api/tts', route => route.fulfill({ status: 503, json: { error: 'Test narration disabled' } }));
    await page.goto(base + '/access');
    await page.getByLabel('Your password', { exact: true }).fill(process.env.ORACLE_TEST_PASSWORD);
    await page.getByRole('button', { name: 'Enter the oracle', exact: true }).click();
    await page.waitForURL('**/disclaimer');
    const cookies = await context.cookies();
    const cookie = cookies.find(cookie => cookie.name === '__Host-oracle_access');
    assert.ok(cookie?.httpOnly && cookie.secure && cookie.sameSite === 'Strict');
    await page.getByRole('button', { name: 'Confirm', exact: true }).click();
    await page.getByRole('button', { name: 'Helper', exact: true }).click();
    await page.getByRole('button', { name: 'Confirm', exact: true }).click();
    const question = 'What should I focus on this week?';
    await page.getByRole('textbox', { name: 'Your tarot question' }).fill(question);
    await page.getByRole('button', { name: 'Confirm', exact: true }).click();
    await page.waitForURL('**/cards');
    assert.equal(new URL(page.url()).search, '');
    const cards = page.getByRole('button', { name: /^Card \d+$/ });
    await cards.first().waitFor();
    for (const index of [0,1,2]) await cards.nth(index).dispatchEvent('click');
    await page.getByRole('button', { name: 'Ask the oracle', exact: true }).click();
    await page.waitForURL('**/results');
    assert.equal(new URL(page.url()).search, '');
    await page.getByRole('group', { name: 'Your tarot cards', exact: true }).waitFor();
    const storage = await page.evaluate(() => JSON.stringify([Object.entries(localStorage), Object.entries(sessionStorage), history.state]));
    assert.ok(!storage.includes(question) && !storage.includes('private test reading') && !storage.includes('private legacy data'));
    await page.reload();
    await page.waitForURL('**/prequestion');
    await page.getByRole('button', { name: 'Sign out', exact: true }).click();
    await page.waitForURL('**/access');
    const replay = await context.request.post(base + '/api/validate-question', {
      headers: { cookie: `${cookie.name}=${cookie.value}` }, data: { question }
    });
    assert.equal(replay.status(), 401, 'A copied cookie must stop working after logout');
    await page.goto(base + '/results');
    await page.waitForURL('**/access');
    assert.deepEqual(errors, []);
    console.log('Passed browser login, CSP, private navigation/storage, refresh reset, logout and copied-cookie revocation checks. Paid API calls were mocked.');
  } finally { await browser.close(); }
})().catch(error => { console.error(error.message); process.exitCode = 1; });
