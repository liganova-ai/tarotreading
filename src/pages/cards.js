import { prepareReadingAudio } from '@/lib/readingAudio';
import { useEffect, useRef, useState } from 'react';
import { useRouter } from 'next/router';
import WizardLayout, { PageAction } from '@/components/WizardLayout';
import styles from '@/styles/cards.module.css';

const wrap = (value, length) => ((value % length) + length) % length;

export default function CardsPage() {
  const router = useRouter();
  const [deck, setDeck] = useState([]);
  const [selectedCards, setSelectedCards] = useState([]);
  const [selectionStarted, setSelectionStarted] = useState(false);
  const deckRef = useRef(null);
  const buttons = useRef([]);
  const position = useRef(0);
  const geometry = useRef({ spacing: 101 * 1.18 });
  const interaction = useRef({ drag: null, moved: false, hover: false, pauseUntil: 0 });
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
    if (!deck.length) return;
    let width = 400;
    let radius = 1200;
    let scale = 1.18;
    const reducedMotion = window.matchMedia('(prefers-reduced-motion: reduce)');
    const entranceStarted = performance.now();
    let entranceAngle = reducedMotion.matches ? 0 : 1.2;
    const renderDeck = () => {
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
      width = deckRef.current?.clientWidth || 400;
      scale = Number(getComputedStyle(deckRef.current).getPropertyValue('--deck-scale')) || 1.18;
      radius = Math.max(1200, width * 2.1) * scale;
      geometry.current.spacing = (width < 600 ? 101 : 128) * scale;
      renderDeck();
    };
    layout.current = renderDeck;
    measureDeck();
    const resizeObserver = new ResizeObserver(measureDeck);
    const element = deckRef.current;
    const wheel = event => {
      if (interaction.current.drag || (!event.shiftKey && Math.abs(event.deltaX) <= Math.abs(event.deltaY))) return;
      event.preventDefault();
      interaction.current.pauseUntil = performance.now() + 2500;
      cancelAnimationFrame(settleFrame.current);
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
      if (!reducedMotion.matches && !document.hidden && !state.drag && !state.hover && !keyboardFocus && now > state.pauseUntil) {
        position.current += elapsed / 60000; // One card per minute.
        renderDeck();
      }
      driftFrame = requestAnimationFrame(drift);
    };
    driftFrame = requestAnimationFrame(drift);
    return () => {
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
    deckRef.current.dataset.dragging = 'false';
    if (!interaction.current.moved) return;
    const from = position.current;
    const to = Math.round(from);
    if (window.matchMedia('(prefers-reduced-motion: reduce)').matches) {
      position.current = to;
      layout.current?.();
      return;
    }
    const start = performance.now();
    const settle = now => {
      const progress = Math.min(1, (now - start) / 240);
      position.current = from + (to - from) * (1 - Math.pow(1 - progress, 3));
      layout.current?.();
      if (progress < 1) settleFrame.current = requestAnimationFrame(settle);
    };
    settleFrame.current = requestAnimationFrame(settle);
  };

  return (
    <WizardLayout back={{ pathname: '/question', query: { ...(router.query.adjectives ? { adjectives: router.query.adjectives } : {}), ...(router.query.question ? { question: router.query.question } : {}) } }} className={styles.page} action={
      <PageAction disabled={selectedCards.length !== 3} onClick={() => { prepareReadingAudio(); router.push({ pathname: '/results', query: { question: router.query.question, cards: JSON.stringify(selectedCards), adjectives: router.query.adjectives, ...(router.query.oracleStatus ? { oracleStatus: router.query.oracleStatus } : {}) } }); }}>Ask the oracle</PageAction>
    }>
      <h1 className={styles.title}>The future is in your hands</h1>
      <div className={styles.deckArea}>
        <div className={styles.deck} ref={deckRef} role="group" aria-label="Tarot deck. Swipe or use left and right arrow keys to browse. Select three cards."
          onPointerEnter={event => { if (event.pointerType === 'mouse') interaction.current.hover = true; }}
          onPointerLeave={event => { if (event.pointerType === 'mouse') interaction.current.hover = false; }}
          onKeyDown={event => { if (event.key === 'ArrowRight' || event.key === 'ArrowLeft') { event.preventDefault(); interaction.current.pauseUntil = performance.now() + 2500; cancelAnimationFrame(settleFrame.current); position.current = Math.round(position.current) + (event.key === 'ArrowRight' ? 1 : -1); layout.current?.(); } }}
          onPointerDown={event => { if (event.button !== 0 || interaction.current.drag) return; cancelAnimationFrame(settleFrame.current); interaction.current.moved = false; interaction.current.drag = { pointerId: event.pointerId, x: event.clientX, position: position.current }; }}
          onPointerMove={event => { const drag = interaction.current.drag; if (!drag || event.pointerId !== drag.pointerId) return; const delta = drag.x - event.clientX; if (Math.abs(delta) > 8) { interaction.current.moved = true; event.currentTarget.dataset.dragging = 'true'; if (!event.currentTarget.hasPointerCapture(event.pointerId)) event.currentTarget.setPointerCapture(event.pointerId); } if (interaction.current.moved) { position.current = drag.position + delta / geometry.current.spacing; layout.current?.(); } }}
          onPointerUp={finishDrag}
          onPointerCancel={finishDrag}
          onLostPointerCapture={finishDrag}
        >
          {deck.map((card, index) => {
            const selected = selectedCards.includes(card);
            return <button key={card} ref={element => { buttons.current[index] = element; }} className={styles.card} aria-label={`Card ${card}`} aria-pressed={selected} onKeyDown={() => { interaction.current.moved = false; }} onClick={() => select(card)}>
              <span className={`${styles.cardFace} ${selected ? styles.selected : ''}`}><img src="/backcard.jpg" alt="" draggable="false" /></span>
            </button>;
          })}
        </div>
        <div className={styles.selectionProgress} data-started={selectionStarted} data-count={selectedCards.length} role="status" aria-live="polite" aria-label="Card selection">
          <p className={styles.instruction} aria-hidden="true">Select 3 cards</p>
          <div className={styles.progressSymbols} aria-hidden="true">
            {[0, 1, 2].map(index => (
              <span key={index} className={styles.progressSymbol} data-filled={index < selectedCards.length}>
                <svg width="30" height="30" viewBox="0 0 32 32" fill="none">
                  <defs>
                    <linearGradient id={`selection-orb-${index}`} x1={index === 1 ? '4' : '26'} y1="4" x2="8" y2="29" gradientUnits="userSpaceOnUse">
                      <stop stopColor="#fff" /><stop offset=".4" stopColor="#aaa" /><stop offset=".65" stopColor="#333" /><stop offset="1" stopColor="#eee" />
                    </linearGradient>
                    <clipPath id={`selection-clip-${index}`}><circle cx="16" cy="16" r="11.5" /></clipPath>
                  </defs>
                  <g clipPath={`url(#selection-clip-${index})`}>
                    <rect className={styles.symbolFill} x="4" y="4" width="24" height="24" fill={`url(#selection-orb-${index})`} />
                  </g>
                  <circle className={styles.symbolRing} cx="16" cy="16" r="12" stroke="currentColor" strokeWidth=".7" />
                  <path className={styles.symbolStar} d="M16 10Q16.5 15.5 22 16Q16.5 16.5 16 22Q15.5 16.5 10 16Q15.5 15.5 16 10Z" fill="white" />
                </svg>
              </span>
            ))}
          </div>
          <span className={styles.srOnly}>{selectedCards.length} of 3 cards selected</span>
        </div>
      </div>
    </WizardLayout>
  );
}
