import Link from 'next/link';
import styles from '../styles/Home.module.css';
import { useState, useEffect } from 'react';

export default function Home() {
  const [isLoading, setIsLoading] = useState(true);

  useEffect(() => {
    // All images to preload
    const imageUrls = [
      '/indexBackground.png',
      '/prequestionBackground.png',
      '/questionBackground.png',
      '/waitingBackground.png',
      '/resultsBackground.png',
      '/explainationBackground.png',
      '/cardsBackground.png',
      '/buttonBackground.png',
      '/disclaimerBackground.png',
      '/backcard.jpg'
    ];

    let loadedImages = 0;
    imageUrls.forEach((url) => {
      const img = new Image();
      img.src = url;
      img.onload = () => {
        loadedImages += 1;
        if (loadedImages === imageUrls.length) {
          setIsLoading(false);
        }
      };
      img.onerror = () => {
        loadedImages += 1;
        if (loadedImages === imageUrls.length) {
          setIsLoading(false);
        }
      };
    });
  }, []);

  return (
    <div className={styles.container}>
      {isLoading && (
        <div className={styles.loadingOverlay}>
          <img src="/grey-loading.svg" alt="Loading" className={styles.loadingImage} />
        </div>
      )}
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
