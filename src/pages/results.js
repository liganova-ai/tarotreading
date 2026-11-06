import { cardNames, cardDescriptions } from '@/lib/tarotCards.mjs';
import Link from 'next/link';
import useTranslatedTexts from '@/hooks/useTranslatedTexts';
import { useLanguage } from '@/context/Language';
import wizardStyles from '@/styles/Wizard.module.css';
import LoadingMessage from '@/components/LoadingMessage';
import GlassDot from '@/components/GlassDot';
import { AnimatePresence, motion, useReducedMotion } from 'framer-motion';
import { disposePreparedReadingAudio, ensurePreparedReadingAudio } from '@/lib/readingAudio';
import { useEffect, useState, useRef } from 'react';
import { getSavedReading, getOrCreateReading } from '@/lib/readingCache.mjs';
import useNarration from '@/hooks/useNarration';
import useRouter from '@/hooks/usePrivateRouter';
import BackControl from '@/components/BackControl';
import WizardLayout, { PageAction } from '@/components/WizardLayout';
import { ORACLE_UNAVAILABLE, ORACLE_CREDITS_EXHAUSTED, oracleAvailabilityMessage } from '@/lib/oracleAvailability.mjs';
import { validateReadingInput } from '@/lib/tarotValidation.mjs';
import styles from '../styles/results.module.css';

export default function ResultsPage() {
  const { language, languageReady, t } = useLanguage();
  const router = useRouter();
  const { question, cards, adjectives, oracleStatus, processId } = router.query;
  const [prediction, setPrediction] = useState('');
  const [readingLanguage, setReadingLanguage] = useState(null);
  const [retry, setRetry] = useState(0);
  const [segments, setSegments] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  const [availability, setAvailability] = useState('');
  const [selectedCardIndex, setSelectedCardIndex] = useState(null);
  const [focusGeometry, setFocusGeometry] = useState({ x: 0, y: 0, scale: 1, detailsTop: 0 });
  const reducedMotion = useReducedMotion();
  const [isDesktop, setIsDesktop] = useState(false);
  const readingRef = useRef(null);
  const cardButtons = useRef([]);
  const [readingCards, setReadingCards] = useState(null);

  const modalRef = useRef(null);
  const parseArray = value => { try { const parsed = JSON.parse(value); return Array.isArray(parsed) ? parsed : []; } catch { return []; } };
  const parsedCards = readingCards || parseArray(cards);
  const selectedNumber = selectedCardIndex === null ? null : parsedCards[selectedCardIndex];
  const cardTranslation = useTranslatedTexts(selectedNumber ? [cardNames[selectedNumber], cardDescriptions[selectedNumber]] : [], processId);

  useEffect(() => {
    ensurePreparedReadingAudio();
  }, []);

  const narration = useNarration(segments, !!prediction && !availability && readingLanguage === language, processId);
  const readingVisible = !loading && (narration.hasStarted || ['ready', 'error'].includes(narration.status));

  useEffect(() => {
    const media = window.matchMedia('(min-width: 960px)');
    const update = () => setIsDesktop(media.matches);
    update(); media.addEventListener('change', update);
    return () => media.removeEventListener('change', update);
  }, []);

  useEffect(() => {
    const element = readingRef.current;
    if (!element) return;
    if (!isDesktop) { element.style.removeProperty('--reading-font-size'); return; }
    if (!readingVisible || !prediction) return;
    let disposed = false;
    let frame;
    const fit = () => {
      if (disposed || !element.isConnected || !element.clientHeight) return;
      const upper = Math.min(17, Math.max(13, window.innerHeight * .018));
      const apply = size => element.style.setProperty('--reading-font-size', `${size}px`);
      const updateOverflow = () => { element.dataset.overflow = String(element.scrollHeight > element.clientHeight + 1); };
      apply(upper);
      if (element.scrollHeight <= element.clientHeight + 1) { updateOverflow(); return; }
      // Fit the complete reading without cutting or shortening its content.
      let low = 12, high = upper;
      apply(low);
      if (element.scrollHeight > element.clientHeight + 1) { updateOverflow(); return; }
      for (let step = 0; step < 6; step++) {
        const middle = (low + high) / 2;
        apply(middle);
        if (element.scrollHeight <= element.clientHeight + 1) low = middle;
        else high = middle;
      }
      apply(Math.floor(low * 10) / 10);
      updateOverflow();
    };
    const schedule = () => { cancelAnimationFrame(frame); frame = requestAnimationFrame(fit); };
    const observer = new ResizeObserver(schedule);
    observer.observe(element);
    document.fonts.ready.then(schedule);
    fit();
    return () => { disposed = true; cancelAnimationFrame(frame); observer.disconnect(); };
  }, [isDesktop, readingVisible, prediction]);

  useEffect(() => {
    if (!router.isReady || !languageReady) return;
    if (!question || !cards || !adjectives || !processId) { router.replace('/prequestion'); return; }

    let active = true;
    const applyReading = reading => {
      if (!active) return;
      setReadingLanguage(language);
      setPrediction(reading.prediction);
      setSegments(reading.segments);
      setReadingCards(reading.cards);
      setLoading(false);
    };
    setError('');
    setAvailability('');
    const saved = getSavedReading(question, language, processId);
    if (saved) {
      applyReading(saved);
      return;
    }
    setPrediction('');
    setSegments([]);
    setReadingCards(null);
    const parsedAdjectives = parseArray(adjectives);
    const input = validateReadingInput({ question, cards: parseArray(cards), adjectives: parsedAdjectives });
    if (!input.ok) {
      setError(input.error);
      setLoading(false);
      return;
    }
    if (!getSavedReading(question, undefined, processId) && (oracleStatus === ORACLE_UNAVAILABLE || oracleStatus === ORACLE_CREDITS_EXHAUSTED)) {
      setAvailability(oracleAvailabilityMessage(oracleStatus));
      setLoading(false);
      return;
    }
    setLoading(true);
    getOrCreateReading({ processId, question, language, cards: parseArray(cards), adjectives: parsedAdjectives }, async payload => {
      const response = await fetch('/api/predict', { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify(payload) });
      const data = await response.json();
      if (!response.ok) throw Object.assign(new Error(data.error || 'Reading unavailable.'), { response: { status: response.status, data } });
      return data;
    }).then(applyReading).catch(err => {
      if (!active) return;
      if (getSavedReading(question, undefined, processId)) {
        setError('Translation unavailable. Please try again.');
      } else if (!err.response || err.response.status >= 500) {
        setAvailability(oracleAvailabilityMessage(err.response?.data?.code));
      } else {
        setError(err.response?.data?.error || 'Please ask a question for a tarot reading.');
      }
      setLoading(false);
    });
    return () => { active = false; };
  }, [router.isReady, languageReady, language, question, cards, adjectives, oracleStatus, processId, retry]);

  useEffect(() => {
    if (selectedCardIndex === null) return;
    modalRef.current?.focus({ preventScroll: true });
    const dismiss = event => {
      if (event.type === 'keydown') {
        if (event.key === 'Escape') { event.preventDefault(); closeModal(); }
        return;
      }
      if (event.target.closest('[data-reading-back], [data-language-selector]')) return;
      if (!modalRef.current?.contains(event.target) && !event.target.closest('[data-card-selected="true"]')) closeModal();
    };
    const recenter = () => {
      const card = cardButtons.current[selectedCardIndex];
      if (card) setFocusGeometry(measureFocus(card));
    };
    window.addEventListener('resize', recenter);
    document.addEventListener('pointerdown', dismiss);
    document.addEventListener('keydown', dismiss);
    return () => {
      window.removeEventListener('resize', recenter);
      document.removeEventListener('pointerdown', dismiss);
      document.removeEventListener('keydown', dismiss);
    };
  }, [selectedCardIndex]);

  useEffect(() => {
    if (availability || error) disposePreparedReadingAudio();
  }, [availability, error]);

  const closeModal = () => {
    const previous = selectedCardIndex;
    setSelectedCardIndex(null);
    requestAnimationFrame(() => cardButtons.current[previous]?.focus({ preventScroll: true }));
  };

  const measureFocus = element => {
    const group = element.parentElement;
    const container = group.closest(`[data-focused]`);
    const desktop = window.innerWidth >= 960;
    const targetWidth = desktop
      ? Math.min(280, container.clientWidth * .25, container.clientHeight * .3)
      : Math.min(220, container.clientWidth * .46, container.clientHeight * .24);
    const scale = targetWidth / element.offsetWidth;
    return {
      x: container.clientWidth * (desktop ? .32 : .5) - group.offsetLeft - element.offsetLeft - element.offsetWidth / 2,
      y: container.clientHeight / 2 - group.offsetTop - element.offsetTop - element.offsetHeight / 2,
      scale,
      detailsTop: container.clientHeight / 2 + element.offsetHeight * scale / 2 + 28,
    };
  };

  const focusCard = (index, element) => {
    if (selectedCardIndex !== null) { closeModal(); return; }
    setFocusGeometry(measureFocus(element));
    setSelectedCardIndex(index);
  };
  const cardTransition = { duration: reducedMotion ? 0 : isDesktop ? 1.15 : .85, ease: [.22, 1, .36, 1] };

  const backToCards = { pathname: '/cards', query: { processId, ...(question ? { question } : {}), ...(adjectives ? { adjectives } : {}), ...(cards ? { cards: JSON.stringify(parsedCards) } : {}), ...(oracleStatus ? { oracleStatus } : {}) } };
  const backToQuestion = { pathname: '/question', query: { processId, ...(question ? { question } : {}), ...(adjectives ? { adjectives } : {}) } };

  const awaitingSpeech = !!prediction && !availability && !narration.hasStarted && !['ready', 'error'].includes(narration.status);

  if (loading || awaitingSpeech) return (
    <div className={styles.container}>

      <header className={styles.header}>
        <BackControl href={backToCards} className={styles.headerButton} />
        <h1 className={styles.headerheading}><Link href="/">ORACLE</Link></h1>
      </header>

      <div className={styles.loadingSection} role="status" aria-live="polite">
        <div className={styles.loadingCircles}>
          {[0, 1, 2].map(index => <span key={index} className={styles.circle}><GlassDot loading index={index} /></span>)}
        </div>
        <LoadingMessage />
      </div>
    </div>
  );

  if (error) return <WizardLayout back={backToQuestion} action={<PageAction onClick={() => getSavedReading(question, undefined, processId) ? setRetry(value => value + 1) : router.push(backToQuestion)}>{t("Try again")}</PageAction>}><p role="alert" className={styles.error}>{t(error)}</p></WizardLayout>;

  return (
    <div className={styles.container} data-focused={selectedCardIndex !== null}>

      <header className={styles.header}>
        <BackControl data-reading-back onClick={() => selectedCardIndex !== null ? closeModal() : router.push(backToCards)} className={styles.headerButton} />
        <h1 className={styles.headerheading}><Link href="/">ORACLE</Link></h1>
      </header>

          <div className={styles.cardsColumn}>
            <div className={styles.cardsSection} role="group" aria-label={t("Your tarot cards")}>
              {parsedCards.map((cardNumber, index) => (
                <motion.button type="button" key={cardNumber} ref={element => { cardButtons.current[index] = element; }} className={styles.cardContainer}
                  initial={false}
                  animate={selectedCardIndex === null
                    ? { x: 0, y: index === 1 ? -14 : isDesktop ? 18 : 7, rotate: (index - 1) * (isDesktop ? 12 : 7), originX: .5, originY: isDesktop ? 1.4 : .5, scale: 1, opacity: 1 }
                    : selectedCardIndex === index
                      ? { x: focusGeometry.x, y: focusGeometry.y, rotate: 0, originX: .5, originY: .5, scale: focusGeometry.scale, opacity: 1 }
                      : { x: index < selectedCardIndex ? '-100vw' : '100vw', y: 28, rotate: index < selectedCardIndex ? -24 : 24, scale: .92, opacity: 0 }}
                  transition={cardTransition}
                  data-card-selected={selectedCardIndex === index}
                  data-speaking={selectedCardIndex === null && (narration.activeCard === index || narration.activeCard === -1)}
                  aria-expanded={selectedCardIndex === index}
                  disabled={selectedCardIndex !== null && selectedCardIndex !== index}
                  aria-label={t("Explore {name}", { name: language === "en" ? cardNames[cardNumber] : t("Card {n}", { n: cardNumber }) })} onClick={event => focusCard(index, event.currentTarget)}>
                  <img
                    src={`/cards/Card ${cardNumber}.jpg`}
                    alt={t("Card {n}", { n: cardNumber })}
                    className={styles.cardImage}
                  />
                </motion.button>
              ))}
            </div>
            <motion.div className={styles.underCardsControls} inert={selectedCardIndex !== null ? '' : undefined} aria-hidden={selectedCardIndex !== null}
              animate={{ opacity: selectedCardIndex !== null ? 0 : 1, y: selectedCardIndex !== null ? 24 : 0 }}
              transition={{ duration: reducedMotion ? 0 : isDesktop ? .9 : .6, ease: [.22, 1, .36, 1] }}>
            {!availability && <>
              <div className={styles.playbackControls}>
              <button type="button" className={`${styles.button} ${styles.skipButton}`} onClick={narration.previous} disabled={!narration.canPrevious} aria-label={t("Previous card")}>
                <svg viewBox="0 0 24 24" width="16" height="16" fill="none" stroke="currentColor" strokeWidth="1.2" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true"><path d="m14 7-5 5 5 5" /></svg>
              </button>
              <button type="button" onClick={narration.toggle} className={styles.button} disabled={narration.status === 'loading'} aria-label={t(narration.isPlaying ? 'Pause reading' : narration.status === 'loading' ? 'Preparing narration' : 'Play reading')}>
                <svg viewBox="0 0 24 24" width="16" height="16" fill="none" stroke="currentColor" strokeWidth="1.2" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true" className={narration.status === 'loading' ? styles.voiceSpinner : undefined}>
                  {narration.status === 'loading'
                    ? <circle cx="12" cy="12" r="7" strokeDasharray="28 16" />
                    : narration.isPlaying
                      ? <path d="M9 6v12M15 6v12" />
                      : <path d="m9 5 10 7-10 7Z" />}
                </svg>
              </button>
              <button type="button" className={`${styles.button} ${styles.skipButton}`} onClick={narration.next} disabled={!narration.canNext} aria-label={t("Next card")}>
                <svg viewBox="0 0 24 24" width="16" height="16" fill="none" stroke="currentColor" strokeWidth="1.2" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true"><path d="m10 7 5 5-5 5" /></svg>
              </button>
              </div>
              {narration.status === 'error' && <p className={styles.audioHint}>{t("The oracle’s voice is resting.")}</p>}
            </>}
            </motion.div>
          </div>

          <div className={styles.predictionSection}>
            <motion.div className={styles.readingContent} inert={selectedCardIndex !== null ? '' : undefined} aria-hidden={selectedCardIndex !== null}
              animate={{ y: selectedCardIndex !== null ? 220 : 0, opacity: selectedCardIndex !== null ? 0 : 1 }}
              transition={{ duration: reducedMotion ? 0 : isDesktop ? .95 : .6, ease: [.22, 1, .36, 1] }}>
            <div ref={readingRef} className={availability ? styles.availabilityMessage : styles.predictionTextContainer} role={availability ? 'status' : undefined}>
            {availability ? <p>{t(availability)}</p> : segments.map((segment, index) => (
              <p key={index} className={styles.predictionText} data-speaking={narration.activeCard === segment.cardIndex}>{segment.text}</p>
            ))}
          </div>
            </motion.div>
            <AnimatePresence>
              {selectedCardIndex !== null && <motion.section key="card-explanation" className={styles.cardDetails} style={{ '--card-details-top': `${focusGeometry.detailsTop}px` }}
                ref={modalRef} role="dialog" aria-modal="true" aria-labelledby="card-explanation-title" tabIndex={-1}
                initial={{ opacity: 0, y: 40 }} animate={{ opacity: 1, y: 0 }} exit={{ opacity: 0, y: 32 }}
                transition={{ duration: reducedMotion ? 0 : .55, delay: reducedMotion ? 0 : .16, ease: [.22, 1, .36, 1] }}>
                <h2 id="card-explanation-title" className={styles.detailTitle}>{cardTranslation.error ? t("Card {n}", { n: selectedNumber }) : cardTranslation.texts[0]}</h2>
                <p className={styles.cardDescription}>{cardTranslation.error ? t('Translation unavailable. Please try again.') : cardTranslation.texts[1]}</p>
                {cardTranslation.error && <button className={wizardStyles.action} onClick={cardTranslation.retry}>{t('Try again')}</button>}
              </motion.section>}
            </AnimatePresence>
          </div>

          <footer className={styles.resultActions} aria-hidden={selectedCardIndex !== null}>
            <button type="button" className={wizardStyles.action} disabled={selectedCardIndex !== null}
              onClick={() => router.push('/')}>{t("Start over")}</button>
          </footer>
    </div>
  );
}
