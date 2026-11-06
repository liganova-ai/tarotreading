const pending = new Map();
const memory = new Map();
const keyFor = (texts, language) => 'oracle-translation-v1:' + JSON.stringify([language, texts]);
export function savedTranslation(texts, language) {
  if (language === 'en') return texts;
  const key = keyFor(texts, language);
  if (memory.has(key)) return memory.get(key);
  try {
    const saved = JSON.parse(localStorage.getItem(key));
    if (Array.isArray(saved) && saved.length === texts.length && saved.every(text => typeof text === 'string')) {
      memory.set(key, saved); return saved;
    }
  } catch {}
  return null;
}
export function translateTexts(texts, language, fromEnglish = false) {
  const key = keyFor(texts, language);
  const cached = fromEnglish ? savedTranslation(texts, language) : memory.get(key);
  if (cached) return Promise.resolve(cached);
  if (pending.has(key)) return pending.get(key);
  const promise = fetch('/api/translate', { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ texts, language }) })
    .then(async response => {
      if (!response.ok) throw new Error('Translation unavailable. Please try again.');
      const result = await response.json();
      if (!Array.isArray(result.texts) || result.texts.length !== texts.length || result.texts.some(text => typeof text !== 'string' || !text.trim())) throw new Error('Invalid translation');
      memory.set(key, result.texts);
      try { localStorage.setItem(key, JSON.stringify(result.texts)); } catch {}
      return result.texts;
    }).finally(() => pending.delete(key));
  pending.set(key, promise);
  return promise;
}
