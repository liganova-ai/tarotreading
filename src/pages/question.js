import { useEffect, useRef, useState } from 'react';
import { useRouter } from 'next/router';
import WizardLayout, { PageAction } from '@/components/WizardLayout';
import { validateQuestionInput } from '@/lib/tarotValidation.mjs';
import { ORACLE_UNAVAILABLE, ORACLE_CREDITS_EXHAUSTED } from '@/lib/oracleAvailability.mjs';
import styles from '@/styles/question.module.css';

export default function QuestionPage() {
  const router = useRouter();
  const [question, setQuestion] = useState('');
  const [error, setError] = useState('');
  const [checking, setChecking] = useState(false);
  const inputRef = useRef(null);
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
    window.addEventListener('resize', fitText);
    return () => { active = false; window.removeEventListener('resize', fitText); };
  }, [question]);

  useEffect(() => {
    if (router.isReady && typeof router.query.question === 'string') setQuestion(router.query.question);
  }, [router.isReady, router.query.question]);

  const submit = async () => {
    if (checking) return;
    const result = validateQuestionInput(question);
    if (!result.ok) { setError(result.error); inputRef.current?.focus(); return; }
    setChecking(true); setError('');
    const continueToCards = oracleStatus => router.push({ pathname: '/cards', query: {
      question: result.question, adjectives: router.query.adjectives,
      ...(oracleStatus ? { oracleStatus } : {}),
    } });
    try {
      const response = await fetch('/api/validate-question', { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ question: result.question }) });
      if (response.status >= 500 || response.status === 429) {
        const data = await response.json().catch(() => ({}));
        await continueToCards(data.code === ORACLE_CREDITS_EXHAUSTED ? ORACLE_CREDITS_EXHAUSTED : ORACLE_UNAVAILABLE);
        return;
      }
      const data = await response.json();
      if (!response.ok || data.valid !== true) { setError(data.error || 'Please ask a question for a tarot reading.'); return; }
      await continueToCards();
    } catch { await continueToCards(ORACLE_UNAVAILABLE); }
    finally { setChecking(false); }
  };

  return (
    <WizardLayout back={{ pathname: '/prequestion', query: { ...(router.query.adjectives ? { adjectives: router.query.adjectives } : {}), ...(question ? { question } : {}) } }} action={<PageAction disabled={!question.trim() || checking} onClick={submit}>{checking ? 'Checking…' : 'Confirm'}</PageAction>}>
      <h1 className={styles.title}>What is your question?</h1>
      <div className={styles.writingArea}>
        <textarea data-autofocus ref={inputRef} aria-label="Your tarot question" aria-describedby={error ? 'question-error' : undefined} aria-invalid={!!error} value={question} maxLength={400} rows={1} className={styles.input} placeholder="Write your question…" onChange={event => { setQuestion(event.target.value); setError(''); }} onKeyDown={event => { if (event.key === 'Enter' && !event.shiftKey && !event.nativeEvent.isComposing) { event.preventDefault(); submit(); } }} />
        {error && <p id="question-error" role="alert" className={styles.error}>{error}</p>}
      </div>
    </WizardLayout>
  );
}
