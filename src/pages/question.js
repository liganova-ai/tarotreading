import { useLanguage } from '@/context/Language';
import { useEffect, useRef, useState } from 'react';
import useRouter from '@/hooks/usePrivateRouter';
import WizardLayout, { PageAction } from '@/components/WizardLayout';
import { validateQuestionInput } from '@/lib/tarotValidation.mjs';
import styles from '@/styles/question.module.css';

export default function QuestionPage() {
  const { t, language } = useLanguage();
  const router = useRouter();
  const [question, setQuestion] = useState('');
  const [error, setError] = useState('');
  const [checking, setChecking] = useState(false);
  const inputRef = useRef(null);
  const attemptRef = useRef(null);
  useEffect(() => { inputRef.current?.focus({ preventScroll: true }); }, []);
  useEffect(() => {
    let active = true;
    const fitText = () => {
      const input = inputRef.current;
      if (!active || !input) return;
      input.style.height = '0px';
      input.style.height = `${input.scrollHeight}px`;
    };
    fitText();
    document.fonts.ready.then(fitText);
    document.fonts.addEventListener('loadingdone', fitText);
    window.addEventListener('resize', fitText);
    return () => { active = false; document.fonts.removeEventListener('loadingdone', fitText); window.removeEventListener('resize', fitText); };
  }, [question]);

  useEffect(() => {
    if (router.isReady && typeof router.query.question === 'string') setQuestion(router.query.question);
  }, [router.isReady, router.query.question]);

  const submit = async () => {
    if (checking) return;
    const result = validateQuestionInput(question);
    if (!result.ok) { setError(result.error); inputRef.current?.focus(); return; }
    setChecking(true); setError('');
    const fingerprint = JSON.stringify([result.question, router.query.adjectives, language]);
    if (attemptRef.current?.fingerprint !== fingerprint) attemptRef.current = { fingerprint, id: result.question === router.query.question && router.query.processId ? router.query.processId : crypto.randomUUID() };
    const processId = attemptRef.current.id;
    const continueToCards = oracleStatus => router.push({ pathname: '/cards', query: {
      question: result.question, adjectives: router.query.adjectives, processId,
      ...(oracleStatus ? { oracleStatus } : {}),
    } });
    try {
      let adjectives;
      try { adjectives = JSON.parse(router.query.adjectives || '[]'); } catch { adjectives = []; }
      const response = await fetch('/api/validate-question', { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ question: result.question, adjectives, language, processId }) });
      if (response.status === 429) { const data = await response.json(); setError(data.error); return; }
      const data = await response.json();
      if (!response.ok || data.valid !== true) { setError(data.error || 'Please ask a question for a tarot reading.'); return; }
      await continueToCards();
    } catch { setError('Access verification is temporarily unavailable. Please try again.'); }
    finally { setChecking(false); window.dispatchEvent(new Event('oracle-usage-changed')); }
  };

  return (
    <WizardLayout back={{ pathname: '/prequestion', query: { ...(router.query.adjectives ? { adjectives: router.query.adjectives } : {}), ...(question ? { question } : {}) } }} action={<PageAction disabled={!question.trim() || checking} onClick={submit}>{t(checking ? 'Checking…' : 'Confirm')}</PageAction>}>
      <h1 className={styles.title}>{t("What is your question?")}</h1>
      <div className={styles.writingArea}>
        <textarea data-autofocus ref={inputRef} aria-label={t("Your tarot question")} aria-describedby={error ? 'question-error' : undefined} aria-invalid={!!error} value={question} maxLength={400} rows={1} className={styles.input} placeholder={t("Write your question…")} onChange={event => { setQuestion(event.target.value); setError(''); }} onKeyDown={event => { if (event.key === 'Enter' && !event.shiftKey && !event.nativeEvent.isComposing) { event.preventDefault(); submit(); } }} />
        {error && <p id="question-error" role="alert" className={styles.error}>{t(error)}</p>}
      </div>
    </WizardLayout>
  );
}
