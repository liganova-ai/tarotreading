import { useEffect, useRef } from 'react';
import { motion } from 'framer-motion';
import styles from '@/styles/prequestion.module.css';

const circle = 'M-12 0C-12-6.6-6.6-12 0-12C6.6-12 12-6.6 12 0C12 6.6 6.6 12 0 12C-6.6 12-12 6.6-12 0Z';
const drop = 'M-24 0C-14-1-6-10 3-10C11-10 16-6 16 0C16 6 11 10 3 10C-6 10-14 1-24 0Z';

export default function PersonalityDroplet({ flight, destination, slotIndex, rotation, onArrival }) {
  const element = useRef(null);
  const dx = destination.x - flight.x, dy = destination.y - flight.y;
  const distance = Math.hypot(dx, dy);
  const angle = Math.atan2(dy, dx) * 180 / Math.PI;
  const startX = flight.x + dx / distance * 10.5;
  const startY = flight.y + dy / distance * 10.5;
  const { x, y } = destination;
  const { id } = flight;
  useEffect(() => {
    const transform = scale => `translate(-50%, -50%) rotate(${angle}deg) scale(${scale})`;
    const animation = element.current.animate([
      { left: `${startX}%`, top: `${startY}%`, transform: transform(.8), opacity: 0, offset: 0 },
      { transform: transform(1), opacity: 1, offset: .2 },
      { transform: transform(.8), opacity: 1, offset: .8 },
      { left: `${x}%`, top: `${y}%`, transform: transform(.71875), opacity: 1, offset: 1 },
    ], { duration: 750, easing: 'cubic-bezier(.45, 0, .2, 1)', fill: 'forwards' });
    animation.finished.then(() => onArrival(id)).catch(() => {});
    return () => animation.cancel();
  }, [id, startX, startY, x, y, angle, onArrival]);

  const gradientId = `personality-drop-${id}`;
  return <div ref={element} className={styles.flyingDrop} aria-hidden="true" style={{ opacity: 0 }}>
    <svg viewBox="-30 -30 60 60" fill="none" focusable="false">
      <defs><linearGradient id={gradientId} x1={slotIndex === 1 ? -12.5217 : 10.4348} y1="-12.5217" x2="-8.3478" y2="13.5652" gradientUnits="userSpaceOnUse" gradientTransform={`rotate(${rotation - angle})`}>
        <stop stopColor="#fff" /><stop offset=".4" stopColor="#aaa" /><stop offset=".65" stopColor="#333" /><stop offset="1" stopColor="#eee" />
      </linearGradient></defs>
      <motion.path fill={`url(#${gradientId})`} initial={{ d: circle }} animate={{ d: [circle, drop, drop, circle] }} transition={{ duration: .75, times: [0, .25, .7, 1], ease: 'easeInOut' }} />
    </svg>
  </div>;
}
