import GlassSphere, { SphereDefs } from '@/components/GlassSphere';
import styles from '@/styles/OracleScene.module.css';
import { useEffect, useRef, useState } from 'react';

// Kept mounted across routes so the glass never restarts its loop.
export default function OracleScene({ pathname }) {
  const scene = pathname === '/' ? 'home' : pathname === '/access' ? 'access' : pathname === '/disclaimer' ? 'disclaimer' : 'reading';
  const [isClear, setIsClear] = useState(false);
  const resetTimer = useRef();
  const sceneRef = useRef(null);
  const sphereRef = useRef(null);
  const revealRef = useRef(null);
  const mountainRefs = useRef([]);

  useEffect(() => {
    const element = sceneRef.current;
    const reset = () => {
      element?.style.setProperty('--sphere-reveal', '0');
      element?.style.setProperty('--mountain-glow-x', '0px');
      element?.style.setProperty('--mountain-glow-y', '0px');
      element?.style.setProperty('--mountain-glow-angle', '0deg');
    };
    reset();
    if (scene !== 'home') return;
    let frame;
    let revealFrame;
    let lastTime;
    const reducedMotion = window.matchMedia('(prefers-reduced-motion: reduce)');
    const target = { x: 200, y: 410, strength: 0 };
    const current = { ...target };
    const animateReveal = time => {
      const delta = Math.min(time - (lastTime ?? time - 16), 64);
      lastTime = time;
      const positionBlend = reducedMotion.matches ? 1 : 1 - Math.exp(-delta / 340);
      const fadeBlend = reducedMotion.matches ? 1 : 1 - Math.exp(-delta / 650);
      current.x += (target.x - current.x) * positionBlend;
      current.y += (target.y - current.y) * positionBlend;
      current.strength += (target.strength - current.strength) * fadeBlend;
      revealRef.current?.setAttribute('cx', current.x);
      revealRef.current?.setAttribute('cy', current.y);
      element.style.setProperty('--sphere-reveal', String(current.strength));
      const moving = Math.abs(target.x - current.x) + Math.abs(target.y - current.y) > .02
        || Math.abs(target.strength - current.strength) > .0001;
      if (moving) revealFrame = requestAnimationFrame(animateReveal);
      else { revealFrame = undefined; lastTime = undefined; }
    };
    const followReveal = () => {
      if (revealFrame === undefined) revealFrame = requestAnimationFrame(animateReveal);
    };
    const move = event => {
      if (event.pointerType === 'touch') return;
      cancelAnimationFrame(frame);
      const { clientX, clientY } = event;
      frame = requestAnimationFrame(() => {
        const sphere = sphereRef.current;
        const matrix = sphere?.getScreenCTM();
        if (matrix && revealRef.current) {
          const point = new DOMPoint(clientX, clientY).matrixTransform(matrix.inverse());
          const distance = Math.hypot(point.x - 200, point.y - 410);
          target.strength = .98 * Math.max(0, Math.min(1, (163 - distance) / 28));
          if (distance <= 163) {
            target.x = point.x;
            target.y = point.y;
          }
          followReveal();
        }
        // Keep the glow on the existing curved ridge, using the visible landscape's coordinates.
        const mountain = mountainRefs.current.find(path => path?.getBoundingClientRect().width > 0 && path.getScreenCTM());
        if (!mountain) return;
        const wide = mountain.dataset.landscape === 'wide';
        const direction = Math.max(-1, Math.min(1, clientX / window.innerWidth * 2 - 1));
        const x = direction * (wide ? 720 : 200);
        let y, slope;
        // Follow the same mountain curve from any pointer height, including over the sphere.
        if (wide) {
          y = 1000 * (x / 1640) ** 2;
          slope = 2000 * x / 1640 ** 2;
        }
        else {
          const parameterAt = position => (-512 + Math.sqrt(512 ** 2 + 192 * (position + 80))) / 96;
          const t = parameterAt(202 + x);
          const center = parameterAt(202);
          const height = value => (1 - value) ** 2 * 720 + 2 * (1 - value) * value * 433 + value ** 2 * 691;
          y = height(t) - height(center);
          slope = (-574 + 1090 * t) / (512 + 96 * t);
        }
        element.style.setProperty('--mountain-glow-x', `${x}px`);
        element.style.setProperty('--mountain-glow-y', `${y}px`);
        element.style.setProperty('--mountain-glow-angle', `${Math.atan(slope) * 180 / Math.PI}deg`);
      });
    };
    const leave = () => {
      cancelAnimationFrame(frame);
      target.strength = 0;
      followReveal();
      element.style.setProperty('--mountain-glow-x', '0px');
      element.style.setProperty('--mountain-glow-y', '0px');
      element.style.setProperty('--mountain-glow-angle', '0deg');
    };
    window.addEventListener('pointermove', move, { passive: true });
    document.documentElement.addEventListener('pointerleave', leave);
    window.addEventListener('blur', leave);
    return () => {
      cancelAnimationFrame(frame);
      cancelAnimationFrame(revealFrame);
      window.removeEventListener('pointermove', move);
      document.documentElement.removeEventListener('pointerleave', leave);
      window.removeEventListener('blur', leave);
      reset();
    };
  }, [scene]);

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
    <div ref={sceneRef} className={styles.scene} data-scene={scene} data-clear={isClear} aria-hidden="true">
      <div className={styles.atmosphere} />
      <svg className={styles.grain} width="100%" height="100%">
        <defs>
          <filter id="oracle-grain" x="0" y="0" width="100%" height="100%">
            <feTurbulence type="fractalNoise" baseFrequency="1.485714" numOctaves="2" stitchTiles="stitch" />
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
        <svg className={styles.composition} viewBox="0 0 400 860" preserveAspectRatio="none" fill="none">
          <defs>
            <SphereDefs id="oracle" />
            <linearGradient id="oracle-mountain-light" x1="0" y1=".5" x2="1" y2=".5">
              <stop stopColor="#ddd" stopOpacity="0" />
              <stop offset=".12" stopColor="#ddd" stopOpacity=".06" />
              <stop offset=".3" stopColor="#ddd" stopOpacity=".4" />
              <stop offset=".5" stopColor="#ddd" />
              <stop offset=".7" stopColor="#ddd" stopOpacity=".4" />
              <stop offset=".88" stopColor="#ddd" stopOpacity=".06" />
              <stop offset="1" stopColor="#ddd" stopOpacity="0" />
            </linearGradient>

            <linearGradient id="oracle-ground" x1="220" y1="573" x2="200" y2="760" gradientUnits="userSpaceOnUse">
              <stop stopColor="#151515" /><stop offset=".65" stopColor="#050505" /><stop offset="1" stopColor="#030303" />
            </linearGradient>
          </defs>
          <g className={styles.mountainDeparture}>
          <ellipse className={styles.mountainGlow} cx="202" cy="573" rx="172" ry="66" fill="url(#oracle-mountain-light)" opacity=".55" filter="url(#oracle-soft)" />
          </g>
          <g className={styles.mountainDeparture}>
          <path ref={element => { mountainRefs.current[0] = element; }} data-landscape="portrait" d="M-80 720Q176 433 480 691V900H-80Z" fill="url(#oracle-ground)" />
          <path d="M-80 720Q176 433 480 691" stroke="#ddd" strokeOpacity=".1" />
          </g>

        </svg>
        <div className={styles.portraitFrame}>
          <svg className={`${styles.frameLeft} ${styles.leaves}`} viewBox="0 0 160 860" preserveAspectRatio="none" fill="#080808" aria-hidden="true">
            <g className={styles.leafLeft}>
              <path d="M-15 78Q30 111 129 108Q74 152 48 185Q6 164-15 131ZM-6 172Q64 164 104 213L47 208L80 242Q15 254-6 222ZM-20 283Q36 302 49 358Q7 347-20 322ZM-14 510Q32 495 42 453Q4 451-14 477ZM-7 672L14 582Q-33 591-42 644Z" />
            </g>
          </svg>
          <svg className={`${styles.frameRight} ${styles.leaves}`} viewBox="240 0 160 860" preserveAspectRatio="none" fill="#080808" aria-hidden="true">
            <g className={styles.leafRight}>
              <path d="M400 67Q327 70 282 108Q308 118 338 119L305 155Q364 162 413 126ZM417 149Q350 170 350 218Q390 206 418 189ZM416 278Q365 302 343 345Q391 352 421 315ZM408 497Q357 522 359 571Q404 565 421 539ZM403 707Q339 677 351 577Q378 602 409 642Z" />
            </g>
          </svg>
          <svg className={`${styles.frameTop} ${styles.leaves}`} viewBox="0 0 400 120" fill="#080808" aria-hidden="true">
            <g className={styles.leafTop}>
              <path d="M61-10Q124 12 134 90Q92 73 87 43L81 76Q64 50 61-10ZM165-20Q218 15 192 94Q172 61 174 38L149 56Q157 19 165-20ZM284-12Q298 26 252 62L258 30L230 41Q237 1 284-12Z" />
            </g>
          </svg>
        </div>
        <svg className={styles.wideLandscape} viewBox="0 0 1440 900" preserveAspectRatio="none" fill="none">
          <defs>
            <linearGradient id="oracle-wide-mountain-light" x1="0" y1=".5" x2="1" y2=".5">
              <stop stopColor="#ddd" stopOpacity="0" />
              <stop offset=".12" stopColor="#ddd" stopOpacity=".06" />
              <stop offset=".3" stopColor="#ddd" stopOpacity=".4" />
              <stop offset=".5" stopColor="#ddd" />
              <stop offset=".7" stopColor="#ddd" stopOpacity=".4" />
              <stop offset=".88" stopColor="#ddd" stopOpacity=".06" />
              <stop offset="1" stopColor="#ddd" stopOpacity="0" />
            </linearGradient>
            <linearGradient id="oracle-wide-ground" x1="720" y1="620" x2="720" y2="900" gradientUnits="userSpaceOnUse">
              <stop stopColor="#171717" /><stop offset=".7" stopColor="#050505" /><stop offset="1" stopColor="#030303" />
            </linearGradient>
            <filter id="oracle-wide-soft" x="-50%" y="-150%" width="200%" height="400%"><feGaussianBlur stdDeviation="26" /></filter>
          </defs>
          <g className={styles.mountainDeparture}>
            <ellipse className={styles.mountainGlow} cx="720" cy="635" rx="230" ry="46" fill="url(#oracle-wide-mountain-light)" opacity=".28" filter="url(#oracle-wide-soft)" />
            <path ref={element => { mountainRefs.current[1] = element; }} data-landscape="wide" d="M-100 920Q720 420 1540 920V1000H-100Z" fill="url(#oracle-wide-ground)" />
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
      </div>
      <div className={styles.sharedSpherePlacement}>
        <div className={styles.sphereDeparture}><GlassSphere className={styles.wideSphere} svgRef={sphereRef} revealRef={revealRef} /></div>
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
