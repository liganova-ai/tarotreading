import Link from 'next/link';
import styles from '../styles/Home.module.css';

export default function Home() {
  return (
    <div className={styles.container}>
      <h1 className={styles.heading}>LIGAORACLE</h1>
      <div className={styles.footer}>
        <p className={styles.smallText}>Look into the future and<br />discover what awaits.</p>
        <Link href="/disclaimer" className={styles.startButton}>Start</Link>
      </div>
    </div>
  );
}
