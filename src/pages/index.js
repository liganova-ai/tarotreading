import { useLanguage } from '@/context/Language';
import Link from 'next/link';
import styles from '../styles/Home.module.css';

export default function Home() {
  const { t } = useLanguage();
  return (
    <div className={styles.container}>
      <h1 className={styles.heading}>ORACLE</h1>
      <div className={styles.footer}>
        <p className={styles.smallText}>{t("Look into the future and")}<br />{t("discover what awaits.")}</p>
        <Link href="/disclaimer" className={styles.startButton}>{t("Start")}</Link>
      </div>
    </div>
  );
}
