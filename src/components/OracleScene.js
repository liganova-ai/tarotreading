import GlassSphere, { SphereDefs, SphereArtwork } from '@/components/GlassSphere';
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
            <SphereDefs id="oracle" />
            <linearGradient id="oracle-ground" x1="220" y1="573" x2="200" y2="760" gradientUnits="userSpaceOnUse">
              <stop stopColor="#151515" /><stop offset=".65" stopColor="#050505" /><stop offset="1" stopColor="#030303" />
            </linearGradient>
          </defs>
          <g className={styles.mountainDeparture}>
          <ellipse cx="202" cy="573" rx="172" ry="66" fill="#ddd" opacity=".55" filter="url(#oracle-soft)" />
          </g>
          <g className={styles.sphereDeparture}>
          <SphereArtwork id="oracle" />
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
        <svg className={styles.wideLandscape} viewBox="0 0 1440 900" preserveAspectRatio="none" fill="none">
          <defs>
            <linearGradient id="oracle-wide-ground" x1="720" y1="620" x2="720" y2="900" gradientUnits="userSpaceOnUse">
              <stop stopColor="#171717" /><stop offset=".7" stopColor="#050505" /><stop offset="1" stopColor="#030303" />
            </linearGradient>
            <filter id="oracle-wide-soft" x="-50%" y="-150%" width="200%" height="400%"><feGaussianBlur stdDeviation="26" /></filter>
          </defs>
          <g className={styles.mountainDeparture}>
            <ellipse cx="720" cy="635" rx="230" ry="46" fill="#ddd" opacity=".28" filter="url(#oracle-wide-soft)" />
            <path d="M-100 920Q720 420 1540 920V1000H-100Z" fill="url(#oracle-wide-ground)" />
            <path d="M-100 920Q720 420 1540 920" stroke="#ddd" strokeOpacity=".09" />
          </g>
          <g className={styles.leaves} fill="#080808">
            <g className={styles.leafLeft}>
              <path d="M-30 30Q115 45 220 140Q119 145 44 101L85 170Q-4 158-30 102ZM-25 245Q104 246 169 345Q80 337 27 293L53 366Q-17 348-25 291ZM-25 587Q88 524 153 542Q102 606 28 628L55 665Q-13 669-25 632Z" />
            </g>
            <g className={styles.leafRight}>
              <path d="M1470 26Q1330 45 1220 135Q1324 147 1395 99L1354 173Q1445 155 1470 100ZM1460 245Q1340 246 1272 344Q1364 338 1414 291L1388 364Q1452 347 1460 290ZM1462 590Q1352 528 1286 547Q1342 607 1412 630L1385 667Q1451 671 1462 634Z" />
            </g>
            <g className={styles.leafTop}>
              <path d="M310-30Q419 8 431 119Q365 88 355 36L325 67Q302 26 310-30ZM1117-30Q1008 8 997 119Q1063 88 1072 36L1103 67Q1126 26 1117-30Z" />
            </g>
          </g>
        </svg>
        <div className={styles.wideSpherePlacement}>
          <div className={styles.sphereDeparture}><GlassSphere className={styles.wideSphere} /></div>
        </div>
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
