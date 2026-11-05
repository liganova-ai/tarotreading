import { useEffect, useRef, useState } from 'react';
import { takeReadingAudio, MUSIC_INTRO_MS, MUSIC_LEVEL, MUSIC_UNDER_VOICE, MUSIC_URL } from '@/lib/readingAudio';

const SPOKEN_WELCOME = 'Welcome to the oracle. Here is your personal tarot reading. Take a quiet breath, and let the cards guide you.';

export default function useNarration(segments, enabled) {
  const [status, setStatus] = useState('idle');
  const [hasStarted, setHasStarted] = useState(false);
  const [activeCard, setActiveCard] = useState(-2);
  const [attempt, setAttempt] = useState(0);
  const [segmentIndex, setSegmentIndex] = useState(0);
  const sessionRef = useRef(null);

  useEffect(() => {
    if (!enabled || !segments.length) return;
    const bundle = takeReadingAudio();
    const { audio, music, mixer } = bundle;
    const controller = new AbortController();
    const urls = [];
    const session = { audio, music, mixer, bundle, index: -1, disposed: false, introDone: false, musicFailed: false, speaking: false, request: 0 };
    sessionRef.current = session;
    setStatus('loading');

    const spokenSegments = [{ cardIndex: -2, text: SPOKEN_WELCOME }, ...segments];
    const clips = spokenSegments.map(async segment => {
      try {
        const response = await fetch('/api/tts', { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ text: segment.text }), signal: controller.signal });
        if (!response.ok) throw new Error('Speech unavailable');
        const blob = await response.blob();
        if (session.disposed) return {};
        const url = URL.createObjectURL(blob);
        urls.push(url);
        return { url };
      } catch (error) { return { error }; }
    });

    const startMusic = async () => {
      await bundle.ready;
      if (session.disposed) return;
      if (!session.started) {
        session.started = true;
        if (music.getAttribute('src') !== MUSIC_URL) music.src = MUSIC_URL;
        music.preload = 'auto';
        music.loop = true;
      }
      if (session.musicFailed) return;
      mixer.resume();
      try {
        if (music.paused) await music.play();
      } catch (error) {
        if (error.name === 'NotAllowedError') throw error;
        session.musicFailed = true;
        return; // A missing music file must not prevent the reading.
      }
      if (session.disposed) return;
      if (!session.introDone) {
        if (!bundle.musicStartedAt) {
          bundle.musicStartedAt = performance.now();
          mixer.fadeMusic(MUSIC_LEVEL, 2.2);
        }
        const introRemaining = Math.max(0, MUSIC_INTRO_MS - (performance.now() - bundle.musicStartedAt));
        await new Promise(resolve => {
          session.finishIntro = resolve;
          session.introTimer = setTimeout(resolve, introRemaining);
        });
        session.introDone = true;
      }
    };

    const failVoice = error => {
      if (session.disposed) return;
      session.speaking = false;
      setActiveCard(-2);
      music.pause();
      setStatus(error?.name === 'NotAllowedError' ? 'ready' : 'error');
    };

    const fadeOutro = (duration = 4000) => {
      clearTimeout(session.outroTimer);
      session.outroDeadline = performance.now() + duration;
      mixer.fadeMusic(0, duration / 1000);
      session.outroTimer = setTimeout(() => {
        if (session.disposed) return;
        music.pause();
        setStatus('ended');
      }, duration);
    };
    session.fadeOutro = fadeOutro;

    const play = async index => {
      if (session.disposed) return;
      const request = ++session.request;
      clearTimeout(session.outroTimer);
      session.index = index;
      session.speaking = false;
      if (session.started) audio.pause();
      setSegmentIndex(Math.max(0, Math.min(index, segments.length - 1)));
      setActiveCard(-2);
      if (index >= segments.length) {
        music.loop = false;
        if (!session.musicFailed && !music.paused && !music.ended) {
          setStatus('outro');
          fadeOutro();
        } else setStatus('ended');
        return;
      }
      music.loop = true;
      setStatus('loading');
      try {
        await startMusic();
        const clip = await clips[index + 1];
        if (session.disposed || request !== session.request) return;
        if (!clip.url) { failVoice(clip.error); return; }
        audio.src = clip.url;
        audio.load();
        mixer.fadeMusic(MUSIC_UNDER_VOICE, .6);
        await audio.play();
      } catch (error) { if (request === session.request) failVoice(error); }
    };
    session.play = play;
    audio.onplaying = () => {
      if (session.disposed || !session.started) return;
      session.speaking = true;
      setHasStarted(true);
      setStatus('playing');
      setActiveCard(session.index < 0 ? -2 : segments[session.index].cardIndex);
    };
    audio.onpause = () => {
      if (!session.disposed && session.speaking && !audio.ended) {
        session.speaking = false;
        music.pause();
        setStatus('paused'); setActiveCard(-2);
      }
    };
    audio.onended = () => { if (audio.ended && session.speaking) play(session.index + 1); };
    audio.onerror = () => { if (session.started) failVoice(); };
    music.onerror = () => { if (session.started) session.musicFailed = true; };
    music.onended = () => {
      if (!session.disposed && session.index >= segments.length) {
        clearTimeout(session.outroTimer);
        setStatus('ended');
      }
    };
    play(-1);

    return () => {
      session.disposed = true;
      clearTimeout(session.introTimer);
      clearTimeout(session.outroTimer);
      session.finishIntro?.();
      controller.abort();
      bundle.dispose();
      urls.forEach(url => URL.revokeObjectURL(url));
      if (sessionRef.current === session) sessionRef.current = null;
    };
  }, [segments, enabled, attempt]);

  const toggle = async () => {
    const session = sessionRef.current;
    if (!session || status === 'loading') return;
    const { audio, music, mixer } = session;
    mixer.resume();
    if (status === 'error') { setAttempt(value => value + 1); return; }
    if (status === 'playing') { audio.pause(); return; }
    if (status === 'outro') {
      session.outroRemaining = Math.max(0, session.outroDeadline - performance.now());
      clearTimeout(session.outroTimer);
      mixer.fadeMusic(mixer.musicLevel(), 0);
      music.pause(); setStatus('outroPaused'); return;
    }
    if (status === 'outroPaused') {
      try { await music.play(); setStatus('outro'); session.fadeOutro(session.outroRemaining); } catch { setStatus('ended'); }
      return;
    }
    if (status === 'ended') {
      music.currentTime = 0;
      music.loop = true;
      session.introDone = false;
      session.bundle.musicStartedAt = null;
      mixer.fadeMusic(0, 0);
      await session.play(-1);
      return;
    }
    if (status === 'ready') { await session.play(session.index); return; }
    try {
      if (!session.musicFailed) await music.play().catch(() => {});
      mixer.fadeMusic(MUSIC_UNDER_VOICE, .4);
      await audio.play();
    } catch (error) { setStatus(error.name === 'NotAllowedError' ? 'ready' : 'error'); }
  };

  const skip = direction => {
    const session = sessionRef.current;
    if (!session || status === 'loading' || status === 'error') return;
    const index = direction < 0 ? Math.max(0, Math.min(session.index, 3) - 1) : Math.min(2, session.index + 1);
    session.play(index);
  };

  return {
    status, hasStarted, activeCard, toggle,
    previous: () => skip(-1), next: () => skip(1),
    canPrevious: segmentIndex > 0 && status !== 'loading' && status !== 'error',
    canNext: segmentIndex < 2 && status !== 'loading' && status !== 'error',
    isPlaying: status === 'playing' || status === 'outro',
  };
}
