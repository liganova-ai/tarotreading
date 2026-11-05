export const MUSIC_URL = '/tarot_glow_music.mp3';
export const MUSIC_INTRO_MS = 1800;
export const MUSIC_LEVEL = .26;
export const MUSIC_UNDER_VOICE = .11;

// Separate gains keep the voice clear while the soundtrack fades independently.
export function createReadingMixer(voice, music) {
  let context, gain, fadeFrame;
  try {
    const AudioContext = window.AudioContext || window.webkitAudioContext;
    if (AudioContext) {
      context = new AudioContext();
      const voiceGain = context.createGain();
      gain = context.createGain();
      voiceGain.gain.value = 1;
      gain.gain.value = 0;
      context.createMediaElementSource(voice).connect(voiceGain).connect(context.destination);
      context.createMediaElementSource(music).connect(gain).connect(context.destination);
    }
  } catch { context?.close().catch(() => {}); context = null; }
  if (!context) music.volume = 0;

  return {
    resume() { context?.resume().catch(() => {}); },
    musicLevel() { return context ? gain.gain.value : music.volume; },
    fadeMusic(level, seconds) {
      if (context) {
        const now = context.currentTime;
        const current = gain.gain.value;
        gain.gain.cancelScheduledValues(now);
        gain.gain.setValueAtTime(current, now);
        gain.gain.linearRampToValueAtTime(level, now + seconds);
      } else {
        cancelAnimationFrame(fadeFrame);
        const from = music.volume;
        const start = performance.now();
        const fade = now => {
          const progress = Math.min(1, (now - start) / Math.max(1, seconds * 1000));
          music.volume = from + (level - from) * progress;
          if (progress < 1) fadeFrame = requestAnimationFrame(fade);
        };
        fadeFrame = requestAnimationFrame(fade);
      }
    },
    close() { cancelAnimationFrame(fadeFrame); context?.close().catch(() => {}); },
  };
}

// Reuse the media elements unlocked by the Ask the oracle gesture after the
// asynchronous reading request finishes (including Safari's per-element grant).
let preparedAudio;
function createReadingAudio() {
  const audio = new Audio();
  const music = new Audio();
  const mixer = createReadingMixer(audio, music);
  let silentUrl;
  let disposed = false;
  return {
    audio, music, mixer, musicStartedAt: null, ready: Promise.resolve(),
    prime() {
      const data = new ArrayBuffer(1644);
      const view = new DataView(data);
      const label = (offset, value) => [...value].forEach((char, index) => view.setUint8(offset + index, char.charCodeAt(0)));
      label(0, 'RIFF'); view.setUint32(4, 1636, true); label(8, 'WAVE');
      label(12, 'fmt '); view.setUint32(16, 16, true); view.setUint16(20, 1, true);
      view.setUint16(22, 1, true); view.setUint32(24, 8000, true); view.setUint32(28, 16000, true);
      view.setUint16(32, 2, true); view.setUint16(34, 16, true); label(36, 'data'); view.setUint32(40, 1600, true);
      silentUrl = URL.createObjectURL(new Blob([data], { type: 'audio/wav' }));
      mixer.resume();
      audio.src = silentUrl;
      music.src = MUSIC_URL;
      music.preload = 'auto';
      music.loop = true;
      const voiceReady = audio.play();
      const musicReady = music.play().then(() => {
        if (disposed) return;
        this.musicStartedAt = performance.now();
        mixer.fadeMusic(MUSIC_LEVEL, 2.2);
      });
      this.ready = Promise.allSettled([voiceReady, musicReady]).then(() => {
        if (!disposed) audio.pause();
      });
    },
    dispose() {
      disposed = true;
      for (const element of [audio, music]) {
        element.pause(); element.removeAttribute('src'); element.load();
      }
      mixer.close();
      if (silentUrl) URL.revokeObjectURL(silentUrl);
    },
  };
}
export function prepareReadingAudio() {
  disposePreparedReadingAudio();
  preparedAudio = createReadingAudio();
  preparedAudio.prime();
}
export function ensurePreparedReadingAudio() {
  if (!preparedAudio) prepareReadingAudio();
}
export function takeReadingAudio() {
  const bundle = preparedAudio || createReadingAudio();
  preparedAudio = null;
  return bundle;
}
export function disposePreparedReadingAudio() {
  preparedAudio?.dispose();
  preparedAudio = null;
}
