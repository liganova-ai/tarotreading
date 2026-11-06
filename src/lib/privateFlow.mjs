// Sensitive navigation state lives only in this tab's memory, never URL/history or disk.
let state = {};
const listeners = new Set();
export const EMPTY_FLOW = Object.freeze({});
export const privateFlow = {
  subscribe(listener) { listeners.add(listener); return () => listeners.delete(listener); },
  snapshot() { return state; },
  save(path, query = {}) {
    const clean = {};
    for (const key of ['question', 'cards', 'adjectives', 'oracleStatus']) {
      if (typeof query[key] === 'string' && query[key].length <= 1024) clean[key] = query[key];
    }
    state = { ...state, [path]: clean };
    listeners.forEach(listener => listener());
  },
  clear() { state = {}; listeners.forEach(listener => listener()); },
};
export function clearLegacyReadings(storage) {
  if (!storage) return;
  try {
    const keys = [];
    for (let i = 0; i < storage.length; i++) {
      const key = storage.key(i);
      if (key?.startsWith('oracle-reading-') || key?.startsWith('oracle-translation-')) keys.push(key);
    }
    keys.forEach(key => storage.removeItem(key));
  } catch {}
}
