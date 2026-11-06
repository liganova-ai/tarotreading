import { useId } from 'react';
import styles from '@/styles/OracleScene.module.css';

// The home artwork and miniature share their glass, grain, and reflection motion.
export function SphereDefs({ id, includeGrain = false, radial = false }) {
  return <>
            {radial ? <radialGradient id={`${id}-glass`} cx="200" cy="410" r="260" gradientUnits="userSpaceOnUse">
              <stop stopColor="#f5f5f5" /><stop offset=".25" stopColor="#cecece" />
              <stop offset=".6" stopColor="#484848" /><stop offset="1" stopColor="#161616" />
            </radialGradient> : (
            <linearGradient id={`${id}-glass`} x1="300" y1="265" x2="110" y2="555" gradientUnits="userSpaceOnUse">
              <stop stopColor="#f5f5f5" /><stop offset=".27" stopColor="#cecece" />
              <stop offset=".51" stopColor="#272727" /><stop offset=".64" stopColor="#161616" />
              <stop offset=".83" stopColor="#9e9e9e" /><stop offset="1" stopColor="#fff" />
            </linearGradient>
            )}
            <radialGradient id={`${id}-rim`}>
              <stop offset=".72" stopColor="white" stopOpacity="0" /><stop offset=".93" stopColor="white" stopOpacity=".08" />
              <stop offset="1" stopColor="white" stopOpacity=".75" />
            </radialGradient>
            <radialGradient id={`${id}-reflection`}>
              <stop stopColor="white" stopOpacity=".85" /><stop offset=".45" stopColor="white" stopOpacity=".2" /><stop offset="1" stopColor="white" stopOpacity="0" />
            </radialGradient>
            <clipPath id={`${id}-sphere-clip`}><circle cx="200" cy="410" r="163" /></clipPath>
            <filter id={`${id}-soft`} x="-50%" y="-200%" width="200%" height="500%"><feGaussianBlur stdDeviation="22" /></filter>
            <filter id={`${id}-glint`} x="-80%" y="-80%" width="260%" height="260%"><feGaussianBlur stdDeviation="8" /></filter>
    {includeGrain && <filter id={`${id}-grain`} x="0" y="0" width="100%" height="100%">
      <feTurbulence type="fractalNoise" baseFrequency="1.485714" numOctaves="2" stitchTiles="stitch" />
      <feColorMatrix type="matrix" values="0 0 0 0 1  0 0 0 0 1  0 0 0 0 1  3 0 0 0 -1.35" />
    </filter>}
  </>;
}

export function SphereArtwork({ id, followPointer = false }) {
  return (
          <g className={styles.sphere}>
            <circle className={styles.body} cx="200" cy="410" r="163" fill="#1b1b1b" />
            <g clipPath={`url(#${id}-sphere-clip)`}>
              <g className={styles.glass}>
              <g className={`${styles.refraction} ${followPointer ? styles.pointerRefraction : ''}`}>
                <circle cx="200" cy="410" r={followPointer ? 360 : 205} fill={`url(#${id}-glass)`} />
                <ellipse cx={followPointer ? 200 : 274} cy={followPointer ? 410 : 318} rx={followPointer ? 120 : 150} ry={followPointer ? 110 : 120} fill={`url(#${id}-reflection)`} opacity=".35" />
              </g>
              </g>
              <ellipse className={`${styles.caustic} ${followPointer ? styles.pointerCaustic : ''}`} cx="180" cy="551" rx="152" ry="23" stroke="#fff" strokeWidth="13" opacity=".55" filter={`url(#${id}-soft)`} />
              <rect className={styles.sphereGrain} x="35" y="245" width="330" height="330" filter={`url(#${id}-grain)`} opacity=".5" />
            </g>
            <circle cx="200" cy="410" r="163" fill={`url(#${id}-rim)`} opacity=".7" />
            <circle cx="200" cy="410" r="162.6" stroke="#fff" strokeOpacity=".16" strokeWidth=".7" />
            <g className={styles.reflectionStrength} clipPath={followPointer ? `url(#${id}-sphere-clip)` : undefined}>
            <g className={`${styles.highlight} ${followPointer ? styles.pointerHighlight : ''}`}>
              <ellipse cx="286" cy="316" rx="31" ry="33" fill="#fff" opacity=".84" filter={`url(#${id}-glint)`} />
              <ellipse cx="275" cy="302" rx="55" ry="39" fill={`url(#${id}-reflection)`} opacity=".28" />
            </g>
            </g>
            <g transform="translate(270 267)">
              <g className={styles.starGlint}>
                <circle r="18" fill={`url(#${id}-reflection)`} opacity=".45" />
                <path d="M0-24C1-6 2-2 17 0C2 2 1 6 0 24C-1 6-2 2-17 0C-2-2-1-6 0-24Z" fill="white" />
                <path d="M-7-7L7 7M7-7L-7 7" stroke="white" strokeWidth=".7" opacity=".75" />
                <circle r="1.8" fill="white" />
              </g>
            </g>
          </g>
  );
}

export default function GlassSphere({ className, svgRef, followPointer = false, clear = false, revealRef }) {
  const id = `mini-glass-${useId().replace(/:/g, '')}`;
  return <svg ref={svgRef} className={`${className || ''} ${clear ? styles.clearSphere : ''}`} viewBox="20 230 360 360" fill="none" aria-hidden="true" focusable="false">
    <defs>
      <SphereDefs id={id} includeGrain radial={followPointer} />
      {revealRef && <>
        <radialGradient ref={revealRef} id={`${id}-reveal`} gradientUnits="userSpaceOnUse" cx="200" cy="410" r="210">
          {[ [0, 1], [.16, .97], [.34, .86], [.52, .64], [.7, .36], [.86, .11], [1, 0] ].map(([offset, strength]) =>
            <stop key={offset} className={styles.revealStop} offset={offset} stopColor="black" style={{ '--reveal-strength': strength }} />)}
        </radialGradient>
        <radialGradient id={`${id}-preview`} href={`#${id}-reveal`}>
          {[ [0, 1], [.16, .97], [.34, .86], [.52, .64], [.7, .36], [.86, .11], [1, 0] ].map(([offset, strength]) =>
            <stop key={offset} className={styles.revealStop} offset={offset} stopColor="white" style={{ '--reveal-strength': strength }} />)}
        </radialGradient>
        <mask id={`${id}-reveal-mask`} maskUnits="userSpaceOnUse" x="20" y="230" width="360" height="360" style={{ maskType: 'luminance' }}>
          <rect x="20" y="230" width="360" height="360" fill="white" />
          <rect x="20" y="230" width="360" height="360" fill={`url(#${id}-reveal)`} />
        </mask>
        <mask id={`${id}-preview-mask`} maskUnits="userSpaceOnUse" x="20" y="230" width="360" height="360" style={{ maskType: 'luminance' }}>
          <rect x="20" y="230" width="360" height="360" fill="black" />
          <rect x="20" y="230" width="360" height="360" fill={`url(#${id}-preview)`} />
        </mask>
      </>}
    </defs>
    <g mask={revealRef ? `url(#${id}-reveal-mask)` : undefined}>
      <SphereArtwork id={id} followPointer={followPointer} />
    </g>
    {revealRef && <g className={`${styles.clearSphere} ${styles.previewSphere}`} mask={`url(#${id}-preview-mask)`}>
      <SphereArtwork id={id} followPointer={followPointer} />
    </g>}
  </svg>;
}
