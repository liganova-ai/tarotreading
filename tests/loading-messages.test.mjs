import test from 'node:test';
import assert from 'node:assert/strict';
import { LANGUAGES } from '../src/lib/languages.mjs';
import { LOADING_MESSAGES, shuffleMessages } from '../src/lib/loadingMessages.mjs';

test('each supported language has ten distinct loading sentences', () => {
  assert.deepEqual(Object.keys(LOADING_MESSAGES).sort(), Object.keys(LANGUAGES).sort());
  for (const messages of Object.values(LOADING_MESSAGES)) {
    assert.equal(messages.length, 10);
    assert.equal(new Set(messages).size, 10);
    assert.ok(messages.every(message => typeof message === 'string' && message.trim().length > 0));
  }
});

test('random cycles include every sentence once and avoid repeating at cycle boundaries', () => {
  const messages = LOADING_MESSAGES.en;
  const original = [...messages];
  for (const random of [() => 0, () => .5, () => .999]) {
    const cycle = shuffleMessages(messages, undefined, random);
    const next = shuffleMessages(messages, cycle.at(-1), random);
    assert.deepEqual([...cycle].sort(), [...messages].sort());
    assert.deepEqual([...next].sort(), [...messages].sort());
    assert.notEqual(cycle.at(-1), next[0]);
  }
  assert.deepEqual(messages, original);
  assert.notDeepEqual(shuffleMessages(messages, undefined, () => 0), shuffleMessages(messages, undefined, () => .999));
});
