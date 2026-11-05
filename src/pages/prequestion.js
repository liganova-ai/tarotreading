import GlassSphere from '@/components/GlassSphere';
import { useRouter } from 'next/router';
import { useEffect, useRef, useState } from 'react';
import WizardLayout, { PageAction } from '@/components/WizardLayout';
import { PERSONALITIES } from '@/lib/tarotValidation.mjs';
import styles from '@/styles/prequestion.module.css';

export default function Prequestion() {
  const router = useRouter();
  const [selected, setSelected] = useState([]);
  const sphereRef = useRef(null);

  useEffect(() => {
    if (!router.isReady) return;
    try {
      const previous = JSON.parse(router.query.adjectives || '[]');
      if (Array.isArray(previous)) setSelected([...new Set(previous.filter(value => PERSONALITIES.includes(value)))].slice(0, 3));
    } catch {}
  }, [router.isReady, router.query.adjectives]);

  const followGlow = event => {
    if (event.pointerType !== 'mouse' && event.pointerType !== 'pen') return;
    const wheel = event.currentTarget.getBoundingClientRect();
    const x = (event.clientX - wheel.left - wheel.width / 2) / (wheel.width / 2);
    const y = (event.clientY - wheel.top - wheel.height / 2) / (wheel.height / 2);
    const length = Math.max(1, Math.hypot(x, y));
    sphereRef.current?.style.setProperty('--sphere-glass-x', `${x / length * 100}px`);
    sphereRef.current?.style.setProperty('--sphere-glass-y', `${y / length * 100}px`);
    sphereRef.current?.style.setProperty('--sphere-glow-x', `${-86 + x / length * 100}px`);
    sphereRef.current?.style.setProperty('--sphere-glow-y', `${94 + y / length * 100}px`);
  };

  const resetGlow = () => {
    sphereRef.current?.style.setProperty('--sphere-glass-x', '0px');
    sphereRef.current?.style.setProperty('--sphere-glass-y', '0px');
    sphereRef.current?.style.setProperty('--sphere-glow-x', '-86px');
    sphereRef.current?.style.setProperty('--sphere-glow-y', '94px');
  };

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
      <div className={styles.personalityField}>
      <div className={styles.bubblesContainer} role="group" aria-label="Personality choices" onPointerMove={followGlow} onPointerLeave={resetGlow}>
        <div className={styles.centerSphere}><GlassSphere className={styles.miniSphere} svgRef={sphereRef} followPointer /></div>
        {PERSONALITIES.map((personality, index) => {
          const angle = (-90 + index * 45) * Math.PI / 180;
          const x = 50 + Math.cos(angle) * 37.5;
          const y = 50 + Math.sin(angle) * 37.5;
          return <div key={personality} className={styles.bubbleSlot} style={{ left: `${x}%`, top: `${y}%` }}>
          <button
            type="button"
            aria-pressed={selected.includes(personality)}
            style={{ '--delay': `${index * 45}ms`, '--light-x': `${[75, 25, 65, 40, 80, 20, 55, 30, 70][index]}%`, '--light-y': `${[20, 70, 75, 25, 50, 30, 15, 65, 35][index]}%`, '--angle': `${115 + index * 29}deg` }}
            className={`${styles.bubble} ${selected.includes(personality) ? styles.filled : ''}`}
            onClick={() => toggle(personality)}
          >
            {personality}
          </button>
          </div>;
        })}
      </div>
      </div>
    </WizardLayout>
  );
}
