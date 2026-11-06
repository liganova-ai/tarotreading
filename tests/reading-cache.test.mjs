import test from 'node:test';
import assert from 'node:assert/strict';
import { getOrCreateReading } from '../src/lib/readingCache.mjs';

const result = { prediction: 'A saved reading.', segments: [0, 1, 2, -1].map(cardIndex => ({ cardIndex, text: 'Consider the next step.' })) };
test('same question reuses original reading and cards; a new question generates again', async () => {
  let calls = 0;
  const generate = async () => { calls++; return result; };
  const first = await getOrCreateReading({ question: 'What comes next?', cards: [1, 2, 3] }, generate);
  const second = await getOrCreateReading({ question: '  WHAT comes   next? ', cards: [4, 5, 6] }, generate);
  assert.equal(first, second);
  assert.deepEqual(second.cards, [1, 2, 3]);
  assert.equal(calls, 1);
  await getOrCreateReading({ question: 'How can I grow?', cards: [4, 5, 6] }, generate);
  assert.equal(calls, 2);
});
test('navigation during generation shares the pending request; failures can retry', async () => {
  let finish;
  let calls = 0;
  const input = { question: 'A pending question?', cards: [1, 2, 3] };
  const generate = () => { calls++; return new Promise(resolve => { finish = resolve; }); };
  const first = getOrCreateReading(input, generate);
  const second = getOrCreateReading(input, generate);
  await Promise.resolve();
  finish(result);
  assert.equal(await first, await second);
  assert.equal(calls, 1);
  const retryInput = { ...input, question: 'A retry question?' };
  await assert.rejects(getOrCreateReading(retryInput, async () => { throw new Error('Offline'); }));
  assert.equal((await getOrCreateReading(retryInput, async () => result)).prediction, result.prediction);
});
test('saved reading reloads from browser storage with original cards', async () => {
  const storage = new Map();
  globalThis.window = { localStorage: { getItem: key => storage.get(key) || null, setItem: (key, value) => storage.set(key, value) } };
  try {
    const input = { question: 'A persistent question?', cards: [7, 8, 9] };
    await getOrCreateReading(input, async () => result);
    const fresh = await import('../src/lib/readingCache.mjs?reload');
    const saved = await fresh.getOrCreateReading(input, () => { throw new Error('Must not regenerate'); });
    assert.deepEqual(saved.cards, input.cards);
    assert.equal(saved.prediction, result.prediction);
  } finally { delete globalThis.window; }
});
test('switching language translates a saved reading without generating a new interpretation', async () => {
  let generations = 0, translations = 0;
  const input = { question: 'A multilingual question?', cards: [10, 11, 12], language: 'de' };
  const generate = async () => { generations++; return result; };
  const translate = async (texts, language) => { translations++; return texts.map(text => language + ': ' + text); };
  const german = await getOrCreateReading(input, generate, translate);
  const french = await getOrCreateReading({ ...input, cards: [1, 2, 3], language: 'fr' }, generate, translate);
  assert.deepEqual(french.cards, [10, 11, 12]);
  assert.match(french.prediction, /^fr:/);
  assert.equal(await getOrCreateReading(input, generate, translate), german);
  assert.equal(await getOrCreateReading({ ...input, language: 'fr' }, generate, translate), french);
  assert.equal(generations, 1);
  assert.equal(translations, 1);
});
