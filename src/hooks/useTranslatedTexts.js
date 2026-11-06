import { useEffect, useState } from 'react';
import { useLanguage } from '@/context/Language';
import { savedTranslation, translateTexts } from '@/lib/translateTexts.mjs';
export default function useTranslatedTexts(texts) {
  const { language, t } = useLanguage();
  const key = JSON.stringify(texts);
  const [result, setResult] = useState(null);
  const [attempt, setAttempt] = useState(0);
  useEffect(() => {
    if (!texts.length) return;
    let active = true;
    translateTexts(JSON.parse(key), language, true).then(value => {
      if (active) setResult({ key, language, value });
    }).catch(() => { if (active) setResult({ key, language, error: true }); });
    return () => { active = false; };
  }, [key, language, attempt]);
  const cached = savedTranslation(texts, language);
  const current = result?.key === key && result.language === language ? result : null;
  return { texts: cached || current?.value || texts.map(() => t('Translating…')), error: current?.error && !cached, retry: () => setAttempt(value => value + 1) };
}
