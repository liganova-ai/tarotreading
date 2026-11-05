import styles from '@/styles/OracleScene.module.css';
import { useEffect, useRef, useState } from 'react';

// Kept mounted across routes so the glass never restarts its loop.
export default function OracleScene({ pathname }) {
  const scene = pathname === '/' ? 'home' : pathname === '/disclaimer' ? 'disclaimer' : 'reading';
  const [isClear, setIsClear] = useState(false);
  const resetTimer = useRef();

  useEffect(() => {
    setIsClear(false);
    return () => clearTimeout(resetTimer.current);
  }, [pathname]);

  const clearSphere = () => {
    clearTimeout(resetTimer.current);
    setIsClear(true);
    resetTimer.current = setTimeout(() => setIsClear(false), 2400);
  };

  return (
    <>
    <div className={styles.scene} data-scene={scene} data-clear={isClear} aria-hidden="true">
      <div className={styles.atmosphere} />
      <svg className={styles.grain} width="100%" height="100%">
        <defs>
          <filter id="oracle-grain" x="0" y="0" width="100%" height="100%">
            <feTurbulence type="fractalNoise" baseFrequency="0.78" numOctaves="2" stitchTiles="stitch" />
            <feColorMatrix type="matrix" values="0 0 0 0 1  0 0 0 0 1  0 0 0 0 1  3 0 0 0 -1.35" />
          </filter>
          <radialGradient id="oracle-grain-mask" cx="0" cy="1" r="1.1">
            <stop stopColor="white" /><stop offset="1" stopColor="white" stopOpacity="0" />
          </radialGradient>
          <radialGradient id="oracle-grain-mask-top" cx="0" cy="0" r="1.1">
            <stop stopColor="white" /><stop offset="1" stopColor="white" stopOpacity="0" />
          </radialGradient>
          <mask id="oracle-texture-fade"><rect width="100%" height="100%" fill="url(#oracle-grain-mask)" /></mask>
          <mask id="oracle-texture-fade-top"><rect width="100%" height="100%" fill="url(#oracle-grain-mask-top)" /></mask>
        </defs>
        <rect className={styles.grainLower} width="100%" height="100%" filter="url(#oracle-grain)" mask="url(#oracle-texture-fade)" />
        <rect className={styles.grainUpper} width="100%" height="100%" filter="url(#oracle-grain)" mask="url(#oracle-texture-fade-top)" />
      </svg>
      <div className={styles.artwork}>
        <svg className={styles.composition} viewBox="0 0 400 860" fill="none">
          <defs>
            <linearGradient id="oracle-glass" x1="300" y1="265" x2="110" y2="555" gradientUnits="userSpaceOnUse">
              <stop stopColor="#f5f5f5" /><stop offset=".27" stopColor="#cecece" />
              <stop offset=".51" stopColor="#272727" /><stop offset=".64" stopColor="#161616" />
              <stop offset=".83" stopColor="#9e9e9e" /><stop offset="1" stopColor="#fff" />
            </linearGradient>
            <radialGradient id="oracle-rim">
              <stop offset=".72" stopColor="white" stopOpacity="0" /><stop offset=".93" stopColor="white" stopOpacity=".08" />
              <stop offset="1" stopColor="white" stopOpacity=".75" />
            </radialGradient>
            <radialGradient id="oracle-reflection">
              <stop stopColor="white" stopOpacity=".85" /><stop offset=".45" stopColor="white" stopOpacity=".2" /><stop offset="1" stopColor="white" stopOpacity="0" />
            </radialGradient>
            <linearGradient id="oracle-ground" x1="220" y1="573" x2="200" y2="760" gradientUnits="userSpaceOnUse">
              <stop stopColor="#151515" /><stop offset=".65" stopColor="#050505" /><stop offset="1" stopColor="#030303" />
            </linearGradient>
            <clipPath id="oracle-sphere-clip"><circle cx="200" cy="410" r="163" /></clipPath>
            <filter id="oracle-soft" x="-50%" y="-200%" width="200%" height="500%"><feGaussianBlur stdDeviation="22" /></filter>
            <filter id="oracle-glint" x="-80%" y="-80%" width="260%" height="260%"><feGaussianBlur stdDeviation="8" /></filter>
          </defs>
          <g className={styles.mountainDeparture}>
          <ellipse cx="202" cy="573" rx="172" ry="66" fill="#ddd" opacity=".55" filter="url(#oracle-soft)" />
          </g>
          <g className={styles.sphereDeparture}>
          <g className={styles.sphere}>
            <circle className={styles.body} cx="200" cy="410" r="163" fill="#1b1b1b" />
            <g clipPath="url(#oracle-sphere-clip)">
              <g className={styles.glass}>
              <g className={styles.refraction}>
                <circle cx="200" cy="410" r="205" fill="url(#oracle-glass)" />
                <ellipse cx="274" cy="318" rx="150" ry="120" fill="url(#oracle-reflection)" opacity=".35" />
              </g>
              </g>
              <ellipse className={styles.caustic} cx="180" cy="551" rx="152" ry="23" stroke="#fff" strokeWidth="13" opacity=".55" filter="url(#oracle-soft)" />
              <rect className={styles.sphereGrain} x="35" y="245" width="330" height="330" filter="url(#oracle-grain)" opacity=".72" />
            </g>
            <circle cx="200" cy="410" r="163" fill="url(#oracle-rim)" opacity=".7" />
            <circle cx="200" cy="410" r="162.6" stroke="#fff" strokeOpacity=".16" strokeWidth=".7" />
            <g className={styles.reflectionStrength}>
            <g className={styles.highlight}>
              <ellipse cx="286" cy="316" rx="31" ry="33" fill="#fff" opacity=".84" filter="url(#oracle-glint)" />
              <ellipse cx="275" cy="302" rx="55" ry="39" fill="url(#oracle-reflection)" opacity=".28" />
            </g>
            </g>
            <g transform="translate(270 267)">
              <g className={styles.starGlint}>
                <circle r="18" fill="url(#oracle-reflection)" opacity=".45" />
                <path d="M0-24C1-6 2-2 17 0C2 2 1 6 0 24C-1 6-2 2-17 0C-2-2-1-6 0-24Z" fill="white" />
                <path d="M-7-7L7 7M7-7L-7 7" stroke="white" strokeWidth=".7" opacity=".75" />
                <circle r="1.8" fill="white" />
              </g>
            </g>
          </g>
          </g>
          <g className={styles.mountainDeparture}>
          <path d="M-80 720Q176 433 480 691V900H-80Z" fill="url(#oracle-ground)" />
          <path d="M-80 720Q176 433 480 691" stroke="#ddd" strokeOpacity=".1" />
          </g>
          <g className={styles.leaves} fill="#080808">
            <g className={styles.leafLeft}>
              <path d="M-15 78Q30 111 129 108Q74 152 48 185Q6 164-15 131ZM-6 172Q64 164 104 213L47 208L80 242Q15 254-6 222ZM-20 283Q36 302 49 358Q7 347-20 322ZM-14 510Q32 495 42 453Q4 451-14 477ZM-7 672L14 582Q-33 591-42 644Z" />
            </g>
            <g className={styles.leafRight}>
              <path d="M400 67Q327 70 282 108Q308 118 338 119L305 155Q364 162 413 126ZM417 149Q350 170 350 218Q390 206 418 189ZM416 278Q365 302 343 345Q391 352 421 315ZM408 497Q357 522 359 571Q404 565 421 539ZM403 707Q339 677 351 577Q378 602 409 642Z" />
            </g>
            <g className={styles.leafTop}>
              <path d="M61-10Q124 12 134 90Q92 73 87 43L81 76Q64 50 61-10ZM165-20Q218 15 192 94Q172 61 174 38L149 56Q157 19 165-20ZM284-12Q298 26 252 62L258 30L230 41Q237 1 284-12Z" />
            </g>
          </g>
        </svg>
      </div>
      <div className={styles.vignette} />
    </div>
    {scene === 'home' && (
      <button
        type="button"
        className={styles.sphereControl}
        aria-label="Clear the crystal sphere"
        aria-pressed={isClear}
        onClick={clearSphere}
      />
    )}
    </>
  );
}
