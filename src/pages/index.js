import Link from 'next/link';
import styles from '../styles/Home.module.css';

export default function Home() {
  return (
    <div className={styles.container}>
      <div className={styles.background}>
        <img src="/indexBackground.png" alt="Background" className={styles.backgroundImage} />
      </div>
      <h1 className={styles.heading}>LIGAORACLE</h1>
      <div className={styles.footer}>
        <p className={styles.smallText}>Look into the future and discover what awaits</p>
        <Link href="/disclaimer">
          <button className={styles.startButton}>Start</button>
        </Link>
      </div>
    </div>
  );
}
