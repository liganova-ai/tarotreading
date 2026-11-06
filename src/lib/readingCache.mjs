import { translateTexts } from './translateTexts.mjs';
const completed = new Map();
const pending = new Map();
const prefix = 'oracle-reading-v1:';
export const readingQuestionKey = question => question.trim().replace(/\s+/g, ' ').toLowerCase();

function getBaseReading(question) {
  const key = readingQuestionKey(question);
  if (completed.has(key)) return completed.get(key);
  try {
    const saved = JSON.parse(window.localStorage.getItem(prefix + key));
    if (saved && saved.questionKey === key && typeof saved.prediction === 'string' && saved.prediction
      && Array.isArray(saved.cards) && saved.cards.length === 3
      && saved.cards.every(card => Number.isInteger(card) && card >= 1 && card <= 78)
      && Array.isArray(saved.segments) && saved.segments.length === 4
      && saved.segments.every((segment, index) => segment.cardIndex === (index === 3 ? -1 : index) && typeof segment.text === 'string' && segment.text)) {
      completed.set(key, saved);
      return saved;
    }
  } catch { /* Storage can be unavailable; the in-memory cache still works. */ }
  return null;
}

export function getSavedReading(question, language) {
  const base = getBaseReading(question);
  if (!base || !language || (base.language || 'en') === language) return base;
  return base.translations?.[language] || null;
}

export async function getOrCreateReading(input, generate, translate = translateTexts) {
  const key = readingQuestionKey(input.question);
  const language = input.language || 'en';
  let base = getBaseReading(input.question);
  if (!base) {
    if (!pending.has(key)) {
      const request = Promise.resolve().then(() => generate(input)).then(result => {
        const reading = { questionKey: key, language, cards: [...input.cards], prediction: result.prediction, segments: result.segments, translations: {} };
        completed.set(key, reading);
        persist(key, reading);
        return reading;
      }).finally(() => pending.delete(key));
      pending.set(key, request);
    }
    base = await pending.get(key);
  }
  if ((base.language || 'en') === language) return base;
  if (base.translations?.[language]) return base.translations[language];
  const translationKey = JSON.stringify([key, language]);
  if (!pending.has(translationKey)) {
    const request = translate(base.segments.map(segment => segment.text), language).then(texts => {
      const segments = base.segments.map((segment, index) => ({ ...segment, text: texts[index] }));
      const reading = { questionKey: key, language, cards: base.cards, segments, prediction: texts.join('\n\n') };
      base.translations ||= {};
      base.translations[language] = reading;
      persist(key, base);
      return reading;
    }).finally(() => pending.delete(translationKey));
    pending.set(translationKey, request);
  }
  return pending.get(translationKey);
}
function persist(key, reading) {
  try { window.localStorage.setItem(prefix + key, JSON.stringify(reading)); } catch { /* Keep the memory copy. */ }
}
