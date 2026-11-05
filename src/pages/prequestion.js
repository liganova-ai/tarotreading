import { useRouter } from 'next/router';
import { useEffect, useState } from 'react';
import WizardLayout, { PageAction } from '@/components/WizardLayout';
import { PERSONALITIES } from '@/lib/tarotValidation.mjs';
import styles from '@/styles/prequestion.module.css';

export default function Prequestion() {
  const router = useRouter();
  const [selected, setSelected] = useState([]);

  useEffect(() => {
    if (!router.isReady) return;
    try {
      const previous = JSON.parse(router.query.adjectives || '[]');
      if (Array.isArray(previous)) setSelected([...new Set(previous.filter(value => PERSONALITIES.includes(value)))].slice(0, 3));
    } catch {}
  }, [router.isReady, router.query.adjectives]);

  const toggle = personality => {
    setSelected(previous => previous.includes(personality)
      ? previous.filter(value => value !== personality)
      : previous.length < 3 ? [...previous, personality] : previous);
  };

  return (
    <WizardLayout back="/disclaimer" action={
      <PageAction disabled={!selected.length} onClick={() => router.push({ pathname: '/question', query: { adjectives: JSON.stringify(selected), ...(router.query.question ? { question: router.query.question } : {}) } })}>Confirm</PageAction>
    }>
      <div className={styles.topSection}>
        <h1 className={styles.topheading}>Choose your personality</h1>
        <p className={styles.explanation}>
          <span>Select up to three personality types</span>
          <span>that match you the most.</span>
        </p>
      </div>
      <div className={styles.bubblesContainer}>
        {PERSONALITIES.map((personality, index) => (
          <button
            type="button"
            aria-pressed={selected.includes(personality)}
            key={personality}
            style={{ '--delay': `${index * 45}ms`, '--light-x': `${[75, 25, 65, 40, 80, 20, 55, 30, 70][index]}%`, '--light-y': `${[20, 70, 75, 25, 50, 30, 15, 65, 35][index]}%`, '--angle': `${115 + index * 29}deg` }}
            className={`${styles.bubble} ${selected.includes(personality) ? styles.filled : ''}`}
            onClick={() => toggle(personality)}
          >
            {personality}
          </button>
        ))}
      </div>
    </WizardLayout>
  );
}
