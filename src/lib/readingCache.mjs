import { translateTexts } from './translateTexts.mjs';
const completed = new Map();
const pending = new Map();
export const readingQuestionKey = question => question.trim().replace(/\s+/g, ' ').toLowerCase();

function getBaseReading(question, processId) {
  const key = processId || readingQuestionKey(question);
  if (completed.has(key)) return completed.get(key);

  return null;
}

export function getSavedReading(question, language, processId) {
  const base = getBaseReading(question, processId);
  if (!base || !language || (base.language || 'en') === language) return base;
  return base.translations?.[language] || null;
}

export async function getOrCreateReading(input, generate, translate = translateTexts) {
  const key = input.processId || readingQuestionKey(input.question);
  const language = input.language || 'en';
  let base = getBaseReading(input.question, input.processId);
  if (!base) {
    if (!pending.has(key)) {
      const request = Promise.resolve().then(() => generate(input)).then(result => {
        const reading = { questionKey: key, language, cards: [...input.cards], prediction: result.prediction, segments: result.segments, translations: {} };
        completed.set(key, reading);
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
      return reading;
    }).finally(() => pending.delete(translationKey));
    pending.set(translationKey, request);
  }
  return pending.get(translationKey);
}
