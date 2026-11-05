import { useId } from 'react';
import styles from '@/styles/GlassDot.module.css';

export default function GlassDot({ filled = false, loading = false, index = 0 }) {
  const id = `glass-dot-${useId().replace(/:/g, '')}`;
  return <svg className={styles.dot} width="24" height="24" viewBox="0 0 32 32" fill="none" aria-hidden="true" focusable="false"
    data-active={filled} data-loading={loading} style={{ '--dot-delay': `${index * .28}s` }}>
    <defs>
      <linearGradient id={`${id}-gradient`} x1={index === 1 ? '4' : '26'} y1="4" x2="8" y2="29" gradientUnits="userSpaceOnUse">
        <stop stopColor="#fff" /><stop offset=".4" stopColor="#aaa" /><stop offset=".65" stopColor="#333" /><stop offset="1" stopColor="#eee" />
      </linearGradient>
      <clipPath id={`${id}-clip`}><circle cx="16" cy="16" r="11.5" /></clipPath>
    </defs>
    <g clipPath={`url(#${id}-clip)`}>
      <rect className={styles.fill} x="4" y="4" width="24" height="24" fill={`url(#${id}-gradient)`} />
    </g>
    <circle cx="16" cy="16" r="12" stroke="currentColor" strokeWidth=".7" />
    <path className={styles.star} d="M16 10Q16.5 15.5 22 16Q16.5 16.5 16 22Q15.5 16.5 10 16Q15.5 15.5 16 10Z" fill="white" />
  </svg>;
}
