import test from 'node:test';
import assert from 'node:assert/strict';
import { normalizeReadingSegments } from '../src/lib/readingSegments.mjs';

const segments = [0, 1, 2, -1].map(cardIndex => ({ cardIndex, text: `  Section ${cardIndex}.  ` }));
test('narration sections preserve the card order and clean their text', () => {
  const normalized = normalizeReadingSegments(segments);
  assert.deepEqual(normalized.map(segment => segment.cardIndex), [0, 1, 2, -1]);
  assert.equal(normalized[0].text, 'Section 0.');
});
test('rejects mismatched cards, missing sections and empty narration', () => {
  for (const value of [null, [], segments.slice(1), [{ cardIndex: 2, text: 'Wrong card' }, ...segments.slice(1)], [{ cardIndex: 0, text: '' }, ...segments.slice(1)]]) assert.throws(() => normalizeReadingSegments(value));
});
test('preserves complete readings beyond the approximate length guideline', () => {
  const longSegments = segments.map(segment => ({ ...segment, text: 'A reflective tarot sentence. '.repeat(30).trim() }));
  const result = normalizeReadingSegments(longSegments);
  assert.deepEqual(result, longSegments);
  assert.ok(result.map(segment => segment.text).join('\n\n').length > 800);
  assert.ok(result.every(segment => segment.text.endsWith('.') && !segment.text.endsWith('…')));
});
