import { useLanguage } from '@/context/Language';
import GlassDot from '@/components/GlassDot';
import { prepareReadingAudio } from '@/lib/readingAudio';
import { useEffect, useRef, useState } from 'react';
import useRouter from '@/hooks/usePrivateRouter';
import WizardLayout, { PageAction } from '@/components/WizardLayout';
import styles from '@/styles/cards.module.css';

const wrap = (value, length) => ((value % length) + length) % length;

export default function CardsPage() {
  const { t } = useLanguage();
  const router = useRouter();
  const [deck, setDeck] = useState([]);
  const [selectedCards, setSelectedCards] = useState([]);
  const [selectionStarted, setSelectionStarted] = useState(false);
  const deckRef = useRef(null);
  const buttons = useRef([]);
  const position = useRef(0);
  const geometry = useRef({ spacing: 101 * 1.18 });
  const interaction = useRef({ drag: null, moved: false, hover: false, coasting: false, pauseUntil: 0 });
  const layout = useRef(null);
  const settleFrame = useRef(null);

  useEffect(() => {
    const shuffled = Array.from({ length: 78 }, (_, index) => index + 1);
    for (let i = shuffled.length - 1; i > 0; i--) {
      const j = Math.floor(Math.random() * (i + 1));
      [shuffled[i], shuffled[j]] = [shuffled[j], shuffled[i]];
    }
    setDeck(shuffled);
  }, []);

  useEffect(() => {
    const element = deckRef.current;
    if (!deck.length || !element) return;
    let disposed = false;
    let width = 400;
    let radius = 1200;
    let scale = 1.18;
    const reducedMotion = window.matchMedia('(prefers-reduced-motion: reduce)');
    const entranceStarted = performance.now();
    let entranceAngle = reducedMotion.matches ? 0 : 1.2;
    const renderDeck = () => {
      if (disposed || !element.isConnected) return;
      const spacing = geometry.current.spacing;
      buttons.current.forEach((button, index) => {
        if (!button) return;
        const distance = wrap(index - position.current + deck.length / 2, deck.length) - deck.length / 2;
        const angle = distance * spacing / radius + entranceAngle;
        const x = Math.sin(angle) * radius;
        const y = (1 - Math.cos(angle)) * radius;
        // A card wraps to the other side only outside the visible arc.
        const visible = Math.abs(distance) < 8 && Math.abs(angle) < 1.38 && Math.abs(x) < width / 2 + 85 * scale;
        button.style.visibility = visible ? 'visible' : 'hidden';
        button.tabIndex = visible ? 0 : -1;
        if (!visible) return;
        button.style.transform = `translate3d(calc(-50% + ${x}px), ${y}px, 0) rotate(${angle * 180 / Math.PI}deg)`;
      });
    };
    const measureDeck = () => {
      // Resize deliveries can arrive after React has detached the deck ref.
      if (disposed || !element.isConnected) return;
      width = element.clientWidth || 400;
      scale = Number(getComputedStyle(element).getPropertyValue('--deck-scale')) || 1.18;
      radius = Math.max(1200, width * 2.1) * scale;
      geometry.current.spacing = (width < 600 ? 101 : 128) * scale;
      renderDeck();
    };
    layout.current = renderDeck;
    measureDeck();
    const resizeObserver = new ResizeObserver(measureDeck);
    const wheel = event => {
      if (interaction.current.drag || (!event.shiftKey && Math.abs(event.deltaX) <= Math.abs(event.deltaY))) return;
      event.preventDefault();
      interaction.current.pauseUntil = performance.now() + 2500;
      cancelAnimationFrame(settleFrame.current);
      interaction.current.coasting = false;
      const units = event.deltaMode === 1 ? 16 : event.deltaMode === 2 ? element.clientWidth : 1;
      position.current += (event.deltaX || event.deltaY) * units / geometry.current.spacing;
      renderDeck();
    };
    if (element) {
      resizeObserver.observe(element);
      element.addEventListener('wheel', wheel, { passive: false });
    }
    let driftFrame;
    let previousTime;
    const entranceDuration = 2600;
    const drift = now => {
      if (disposed || !element.isConnected) return;
      const elapsed = previousTime === undefined ? 0 : Math.min(50, now - previousTime);
      previousTime = now;
      if (entranceAngle > 0) {
        const progress = reducedMotion.matches ? 1 : Math.min(1, (now - entranceStarted) / entranceDuration);
        // A long, gentle tail blends into the idle drift without stopping.
        entranceAngle = 1.2 * Math.pow(1 - progress, 5);
        renderDeck();
      }
      const state = interaction.current;
      const keyboardFocus = element?.contains(document.activeElement) && document.activeElement.matches(':focus-visible');
      if (!reducedMotion.matches && !document.hidden && !state.drag && !state.coasting && !state.hover && !keyboardFocus && now > state.pauseUntil) {
        position.current += elapsed / 60000; // One card per minute.
        renderDeck();
      }
      driftFrame = requestAnimationFrame(drift);
    };
    driftFrame = requestAnimationFrame(drift);
    return () => {
      disposed = true;
      cancelAnimationFrame(driftFrame);
      resizeObserver.disconnect();
      element?.removeEventListener('wheel', wheel);
      cancelAnimationFrame(settleFrame.current);
      layout.current = null;
    };
  }, [deck]);

  useEffect(() => {
    if (!router.isReady || !router.query.cards) return;
    try {
      const restored = JSON.parse(router.query.cards);
      if (Array.isArray(restored)) {
        const valid = [...new Set(restored.filter(value => Number.isInteger(value) && value >= 1 && value <= 78))].slice(0, 3);
        setSelectedCards(valid);
        setSelectionStarted(valid.length > 0);
      }
    } catch {}
  }, [router.isReady, router.query.cards]);

  useEffect(() => { if (router.isReady && !router.query.question) router.replace('/question'); }, [router.isReady, router.query.question]);

  const select = card => {
    if (interaction.current.moved) return;
    interaction.current.pauseUntil = performance.now() + 2500;
    setSelectionStarted(true);
    setSelectedCards(previous => previous.includes(card) ? previous.filter(value => value !== card) : previous.length < 3 ? [...previous, card] : previous);
  };

  const finishDrag = event => {
    const drag = interaction.current.drag;
    if (!drag || event.pointerId !== drag.pointerId) return;
    // Touch starts with implicit capture on the card. Ignore its bubbling
    // capture-loss event when capture is transferred to the deck.
    if (event.type === 'lostpointercapture' && event.target !== event.currentTarget) return;
    interaction.current.drag = null;
    interaction.current.pauseUntil = performance.now() + 2500;
    if (deckRef.current) deckRef.current.dataset.dragging = 'false';
    if (!interaction.current.moved) return;
    const from = position.current;
    const reducedMotion = window.matchMedia('(prefers-reduced-motion: reduce)').matches;
    const cancelled = event.type === 'pointercancel' || event.type === 'lostpointercapture';
    const samples = drag.samples;
    const first = samples[0];
    const last = samples[samples.length - 1];
    const duration = last.time - first.time;
    // Release speed comes from the recent gesture, not the whole drag or the
    // selected card. A pause before letting go should stop the momentum.
    const velocity = !cancelled && !reducedMotion && duration > 0 && performance.now() - last.time < 100
      ? Math.max(-.018, Math.min(.018, (first.x - last.x) / duration / geometry.current.spacing))
      : 0;
    if (reducedMotion || cancelled) {
      interaction.current.coasting = false;
      if (!cancelled) position.current = Math.round(from);
      layout.current?.();
      return;
    }

    interaction.current.coasting = true;
    const snap = () => {
      const origin = position.current;
      const target = Math.round(origin);
      const start = performance.now();
      const settle = now => {
        const progress = Math.min(1, (now - start) / 220);
        position.current = origin + (target - origin) * (1 - Math.pow(1 - progress, 3));
        layout.current?.();
        if (progress < 1) settleFrame.current = requestAnimationFrame(settle);
        else {
          interaction.current.coasting = false;
          interaction.current.pauseUntil = now + 2500;
        }
      };
      settleFrame.current = requestAnimationFrame(settle);
    };
    if (Math.abs(velocity) < .0003) { snap(); return; }
    const start = performance.now();
    const friction = 300;
    const coast = now => {
      const decay = Math.exp(-(now - start) / friction);
      position.current = from + velocity * friction * (1 - decay);
      layout.current?.();
      if (Math.abs(velocity * decay) > .00012) settleFrame.current = requestAnimationFrame(coast);
      else snap();
    };
    settleFrame.current = requestAnimationFrame(coast);
  };

  const centerSelectedCard = (card, keyboard = false) => {
    const index = deck.indexOf(card);
    if (index < 0) return;
    cancelAnimationFrame(settleFrame.current);
    interaction.current.drag = null;
    interaction.current.moved = false;
    if (deckRef.current) deckRef.current.dataset.dragging = 'false';
    const from = position.current;
    const distance = wrap(index - from + deck.length / 2, deck.length) - deck.length / 2;
    const target = from + distance;
    if (window.matchMedia('(prefers-reduced-motion: reduce)').matches) {
      position.current = target;
      interaction.current.coasting = false;
      interaction.current.pauseUntil = performance.now() + 2500;
      layout.current?.();
      if (keyboard) buttons.current[index]?.focus({ preventScroll: true });
      return;
    }
    interaction.current.coasting = true;
    const start = performance.now();
    const duration = Math.min(1300, 450 + Math.abs(distance) * 55);
    const rotate = now => {
      const progress = Math.min(1, (now - start) / duration);
      position.current = from + distance * (1 - Math.pow(1 - progress, 3));
      layout.current?.();
      if (progress < 1) settleFrame.current = requestAnimationFrame(rotate);
      else {
        interaction.current.coasting = false;
        interaction.current.pauseUntil = now + 2500;
        if (keyboard) buttons.current[index]?.focus({ preventScroll: true });
      }
    };
    settleFrame.current = requestAnimationFrame(rotate);
  };

  const startDrag = event => {
    if (event.button !== 0 || interaction.current.drag) return;
    cancelAnimationFrame(settleFrame.current);
    interaction.current.coasting = false;
    interaction.current.moved = false;
    interaction.current.drag = {
      pointerId: event.pointerId, x: event.clientX, position: position.current,
      samples: [{ x: event.clientX, time: performance.now() }],
    };
  };

  const moveDrag = event => {
    const drag = interaction.current.drag;
    if (!drag || event.pointerId !== drag.pointerId) return;
    const now = performance.now();
    drag.samples.push({ x: event.clientX, time: now });
    while (drag.samples.length > 2 && drag.samples[1].time < now - 100) drag.samples.shift();
    const delta = drag.x - event.clientX;
    if (Math.abs(delta) > 8) {
      interaction.current.moved = true;
      event.currentTarget.dataset.dragging = 'true';
      if (!event.currentTarget.hasPointerCapture(event.pointerId)) event.currentTarget.setPointerCapture(event.pointerId);
    }
    if (interaction.current.moved) {
      position.current = drag.position + delta / geometry.current.spacing;
      layout.current?.();
    }
  };

  return (
    <WizardLayout back={{ pathname: '/question', query: { ...(router.query.adjectives ? { adjectives: router.query.adjectives } : {}), ...(router.query.question ? { question: router.query.question } : {}) } }} className={styles.page} action={
      <PageAction disabled={selectedCards.length !== 3} onClick={() => { prepareReadingAudio(); router.push({ pathname: '/results', query: { question: router.query.question, cards: JSON.stringify(selectedCards), adjectives: router.query.adjectives, ...(router.query.oracleStatus ? { oracleStatus: router.query.oracleStatus } : {}) } }); }}>{t("Ask the oracle")}</PageAction>
    }>
      <h1 className={styles.title}>{t("The future is in your hands")}</h1>
      <div className={styles.deckArea}>
        <div className={styles.deck} ref={deckRef} role="group" aria-label={t("Tarot deck. Swipe or use left and right arrow keys to browse. Select three cards.")}
          onPointerEnter={event => { if (event.pointerType === 'mouse') interaction.current.hover = true; }}
          onPointerLeave={event => { if (event.pointerType === 'mouse') interaction.current.hover = false; }}
          onKeyDown={event => { if (event.key === 'ArrowRight' || event.key === 'ArrowLeft') { event.preventDefault(); interaction.current.pauseUntil = performance.now() + 2500; cancelAnimationFrame(settleFrame.current); interaction.current.coasting = false; position.current = Math.round(position.current) + (event.key === 'ArrowRight' ? 1 : -1); layout.current?.(); } }}
          onPointerDown={startDrag}
          onPointerMove={moveDrag}
          onPointerUp={finishDrag}
          onPointerCancel={finishDrag}
          onLostPointerCapture={finishDrag}
        >
          {deck.map((card, index) => {
            const selected = selectedCards.includes(card);
            return <button key={card} ref={element => { buttons.current[index] = element; }} className={styles.card} aria-label={t("Card {n}", { n: card })} aria-pressed={selected} onKeyDown={() => { interaction.current.moved = false; }} onClick={() => select(card)}>
              <span className={`${styles.cardFace} ${selected ? styles.selected : ''}`}><img src="/backcard.jpg" alt="" draggable="false" /></span>
            </button>;
          })}
        </div>
        <div className={styles.selectionProgress} data-started={selectionStarted} data-count={selectedCards.length} role="status" aria-live="polite" aria-label={t("Card selection")}>
          <p className={styles.instruction} aria-hidden="true">{t("Select 3 cards")}</p>
          <div className={styles.progressSymbols}>
            {[0, 1, 2].map(index => (
              <span key={index} className={styles.progressSlot}>
              <button type="button" className={styles.progressSymbol} data-filled={index < selectedCards.length}
                disabled={index >= selectedCards.length} aria-label={t("Go to selected card {n}", { n: index + 1 })}
                onClick={event => centerSelectedCard(selectedCards[index], event.detail === 0)}>

                <GlassDot filled={index < selectedCards.length} index={index} />
              </button>
              {index < selectedCards.length && <button type="button" className={styles.removeSelection}
                aria-label={t("Unselect card {n}", { n: selectedCards[index] })}
                onClick={() => setSelectedCards(previous => previous.filter(card => card !== selectedCards[index]))}>
                <svg viewBox="0 0 16 16" width="10" height="10" fill="none" stroke="currentColor" strokeWidth="1" strokeLinecap="round" aria-hidden="true"><path d="m4 4 8 8M12 4l-8 8" /></svg>
              </button>}
              </span>
            ))}
          </div>
          <span className={styles.srOnly}>{t("{n} of 3 cards selected", { n: selectedCards.length })}</span>
        </div>
      </div>
    </WizardLayout>
  );
}
