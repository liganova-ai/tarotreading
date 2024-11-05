import Link from 'next/link';
import styles from '../styles/Home.module.css';
import { useEffect, useState } from 'react';



export default function Home() {
    const [isLoading, setIsLoading] = useState(true);
  
    useEffect(() => {
      // all images to preload
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

      // Preload images and track loading progress
      imageUrls.forEach((url) => {
        const img = new Image();
        img.src = url;
        img.onload = () => {
          loadedImages += 1;
          if (loadedImages === imageUrls.length) {
            setIsLoading(false); // Set loading to false when all images are loaded
          }
        };
      });
    }, []);


    return (
      <div className={styles.container}>
        {isLoading ? (
          <>
          // Loading animation

          
      <div className={styles.background}>
          <img src="/resultsBackground.png" alt="Background" className={styles.backgroundImage} />
        </div>

        <header className={styles.header}>
          <Link href="/">
            <img src="/backButton.png" alt="Button" className={styles.headerButton} />
          </Link>
          <h1 className={styles.headerheading}>LIGAORACLE</h1>
        </header>
          
          <div className={styles.loadingSection}>
            <div className={styles.loadingCircles}>
              <div className={styles.circle}><img className={styles.loadingImg} src="/buttonBackground.png" alt="loading-icon" /></div>
              <div className={styles.circle}><img className={styles.loadingImg} src="/buttonBackground.png" alt="loading-icon" /></div>
              <div className={styles.circle}><img className={styles.loadingImg} src="/buttonBackground.png" alt="loading-icon" /></div>
              <div className={styles.circle}><img className={styles.loadingImg} src="/buttonBackground.png" alt="loading-icon" /></div>
              <div className={styles.circle}><img className={styles.loadingImg} src="/buttonBackground.png" alt="loading-icon" /></div>
            </div>
            <p className={styles.loadingText}>Your personal tarot experience is processing...</p>
          </div>
          </>
        ) : (
          // Main content
          <>

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

          </>
        )}
      </div>
    );
  }