import { useLanguage } from '@/context/Language';
import PersonalityDroplet from '@/components/PersonalityDroplet';
import GlassDot from '@/components/GlassDot';
import { useRouter } from 'next/router';
import { useCallback, useEffect, useRef, useState } from 'react';
import { motion, useAnimationControls, useReducedMotion } from 'framer-motion';
import WizardLayout, { PageAction } from '@/components/WizardLayout';
import { PERSONALITIES } from '@/lib/tarotValidation.mjs';
import styles from '@/styles/prequestion.module.css';
import { SLOT_ANGLES, SLOT_RADIUS, alignPersonalitySlot } from '@/lib/personalityMotion.mjs';

const slots = SLOT_ANGLES.map(angle => ({
  x: 50 + Math.cos(angle * Math.PI / 180) * SLOT_RADIUS,
  y: 50 + Math.sin(angle * Math.PI / 180) * SLOT_RADIUS,
}));

export default function Prequestion() {
  const { t } = useLanguage();
  const router = useRouter();
  const [selected, setSelected] = useState([]);
  const [flights, setFlights] = useState([]);
  const flightId = useRef(0);
  const reducedMotion = useReducedMotion();
  const rotationControls = useAnimationControls();
  const rotation = useRef(0);
  const [travelId, setTravelId] = useState(null);
  const finishFlight = useCallback(id => setFlights(previous => previous.filter(flight => flight.id !== id)), []);
  const activeFlight = flights[0];
  const activeSlotIndex = activeFlight ? selected.indexOf(activeFlight.personality) : -1;

  useEffect(() => {
    if (!activeFlight || activeSlotIndex < 0) return;
    let cancelled = false;
    setTravelId(null);
    const alignment = alignPersonalitySlot(activeFlight, activeSlotIndex, rotation.current);
    rotation.current = alignment.rotation;
    rotationControls.start({ rotate: alignment.rotation, transition: {
      duration: reducedMotion ? 0 : .6, ease: [.22, 1, .36, 1],
    } }).then(() => { if (!cancelled) setTravelId(activeFlight.id); });
    return () => { cancelled = true; };
  }, [activeFlight, activeSlotIndex, reducedMotion, rotationControls]);

  useEffect(() => {
    if (!router.isReady) return;
    try {
      const previous = JSON.parse(router.query.adjectives || '[]');
      if (Array.isArray(previous)) setSelected([...new Set(previous.filter(value => PERSONALITIES.includes(value)))].slice(0, 3));
    } catch {}
  }, [router.isReady, router.query.adjectives]);

  const toggle = (personality, x, y) => {
    if (selected.includes(personality)) {
      setSelected(previous => previous.filter(value => value !== personality));
      setFlights([]);
    } else if (selected.length < 3) {
      setSelected(previous => [...previous, personality]);
      if (!reducedMotion) {
        const id = flightId.current++;
        setFlights(previous => [...previous, { id, personality, x, y }]);
      }
    }
  };

  return (
    <WizardLayout back="/disclaimer" action={
      <PageAction disabled={!selected.length} onClick={() => router.push({ pathname: '/question', query: { adjectives: JSON.stringify(selected), ...(router.query.question ? { question: router.query.question } : {}) } })}>{t("Confirm")}</PageAction>
    }>
      <div className={styles.topSection}>
        <h1 className={styles.topheading}>{t("Choose your personality")}</h1>
        <p className={styles.explanation}>
          <span>{t("Select up to three personality types")}</span>
          <span>{t("that match you the most.")}</span>
        </p>
      </div>
      <div className={styles.personalityField}>
      <div className={styles.bubblesContainer} role="group" aria-label={t("Personality choices")}>
        <div className={styles.centerSlots} role="status" aria-live="polite" aria-label={t("Personality selection")} data-count={selected.length}>
          <motion.div className={styles.slotRotor} initial={{ rotate: 0 }} animate={rotationControls}>
          {slots.map((position, index) => {
            const filled = index < selected.length && !flights.some(flight => flight.personality === selected[index]);
            return <span key={index} className={styles.selectionSlot} data-filled={filled} style={{ left: `${position.x}%`, top: `${position.y}%` }}>
              <GlassDot filled={filled} index={index} instantFill />
            </span>;
          })}
          </motion.div>
          <span className={styles.srOnly}>{t("{n} of 3 personality types selected", { n: selected.length })}</span>
        </div>
        {PERSONALITIES.map((personality, index) => {
          const angle = (-90 + index * 45) * Math.PI / 180;
          const x = 50 + Math.cos(angle) * 37.5;
          const y = 50 + Math.sin(angle) * 37.5;
          return <div key={t(personality)} className={styles.bubbleSlot} style={{ left: `${x}%`, top: `${y}%` }}>
          <button
            type="button"
            aria-pressed={selected.includes(personality)}
            style={{ '--delay': `${index * 45}ms`, '--light-x': `${[75, 25, 65, 40, 80, 20, 55, 30, 70][index]}%`, '--light-y': `${[20, 70, 75, 25, 50, 30, 15, 65, 35][index]}%`, '--angle': `${115 + index * 29}deg` }}
            className={`${styles.bubble} ${selected.includes(personality) ? styles.filled : ''}`}
            onClick={() => toggle(personality, x, y)}
          >
            {t(personality)}
          </button>
          </div>;
        })}
        {flights.filter(flight => flight.id === travelId).map(flight => {
          const slotIndex = selected.indexOf(flight.personality);
          if (slotIndex < 0) return null;
          const { destination } = alignPersonalitySlot(flight, slotIndex, rotation.current);
          return <PersonalityDroplet key={flight.id} flight={flight} destination={destination} slotIndex={slotIndex} rotation={rotation.current} onArrival={finishFlight} />;
        })}
      </div>
      </div>
    </WizardLayout>
  );
}
