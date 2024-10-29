import { useState, useRef, useEffect } from 'react';
import { useRouter } from 'next/router';
import styles from '../styles/cards.module.css';

// Generate card numbers 1 through 78
const originalCards = Array.from({ length: 77 }, (_, index) => index + 2);

// Utility function to shuffle the array
const shuffleArray = (array) => {
  return array.sort(() => Math.random() - 0.5);
};

export default function CardsPage() {
  const router = useRouter();
  const { question, adjectives } = router.query;
  const [selectedCards, setSelectedCards] = useState([]);
  const [currentCard, setCurrentCard] = useState(0);
  const [shuffledCards, setShuffledCards] = useState([]); // Store shuffled cards
  const carouselRef = useRef(null);

  // Shuffle cards on component mount
  useEffect(() => {
    setShuffledCards(shuffleArray([...originalCards]));
  }, []);

  const handleCardClick = (cardNumber) => {
    if (selectedCards.length < 3 && !selectedCards.includes(cardNumber)) {
      setSelectedCards([...selectedCards, cardNumber]);
    } else if (selectedCards.includes(cardNumber)) {
      setSelectedCards(selectedCards.filter(card => card !== cardNumber));
    }
  };

  const handleSelectCard = () => {
    if (!selectedCards.includes(currentCard)) {
      handleCardClick(currentCard);
    }
  };

  const handleMouseDown = (e) => {
    const carousel = carouselRef.current;
    carousel.isDown = true;
    carousel.startX = e.pageX - carousel.offsetLeft;
    carousel.scrollLeft = carousel.scrollLeft;
  };

  const handleMouseLeave = () => {
    const carousel = carouselRef.current;
    carousel.isDown = false;
  };

  const handleMouseUp = () => {
    const carousel = carouselRef.current;
    carousel.isDown = false;
  };

  const handleMouseMove = (e) => {
    const carousel = carouselRef.current;
    if (!carousel.isDown) return;
    e.preventDefault();
    const x = e.pageX - carousel.offsetLeft;
    const walk = (x - carousel.startX) * 2; // Scroll speed multiplier
    carousel.scrollLeft = carousel.scrollLeft - walk;
  };

  return (
    <div className={styles.container}>
      <div className={styles.background}>
        <img src="/questionBackground.png" alt="Background" className={styles.backgroundImage} />
      </div>


      <header className={styles.header}>
        <img src="/backbutton.png" alt="Back Button" className={styles.headerButton} onClick={() => router.back()} />
        <h1 className={styles.headerheading}>LIGAORACLE</h1>
      </header>

        <div className={styles.headlineSection}>
          <h2 className={styles.bigHeadline}>The future is in your hands</h2>
          <p className={styles.subHeading}>Choose cards from the deck</p>
        </div>


      
      <div
        className={styles.carouselSection}
        ref={carouselRef}
        onMouseDown={handleMouseDown}
        onMouseLeave={handleMouseLeave}
        onMouseUp={handleMouseUp}
        onMouseMove={handleMouseMove}
      >
        <div className={styles.carousel}>
          {shuffledCards.map((cardNumber) => (
            <div
              key={cardNumber}
              className={`${styles.cardContainer} ${selectedCards.includes(cardNumber) ? styles.selected : ''}`}
              onClick={() => handleCardClick(cardNumber)}
            >
              <div className={styles.rectangle}>
                <div className={styles.imageWrapper}>
                  <img
                    src="/backcard.jpg"
                    alt={`Card ${cardNumber}`}
                    className={styles.cardImage}
                  />
                </div>
              </div>
            </div>
          ))}
        </div>
      </div>

      <div className={styles.navigationArrows}>
    
        <p className={styles.swipeText}>Swipe & Select 3 cards</p>
      </div>
      <div className={styles.buttonContainer}>


      <button
        onClick={() => router.push({
          pathname: '/results',
          query: { question, cards: JSON.stringify(selectedCards), adjectives },
        })}
        className={styles.submitButton}
        disabled={selectedCards.length !== 3}
      >
        Start Prediction
      </button>
    </div>
    </div>
  );
}
