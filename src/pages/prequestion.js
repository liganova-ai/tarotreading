import Link from 'next/link';
import { useState } from 'react';
import styles from '../styles/prequestion.module.css';

export default function Prequestion() {
  const [selectedBubbles, setSelectedBubbles] = useState(Array(6).fill(false));
  const [isOverlayVisible, setOverlayVisible] = useState(false); // State for toggling the rectangle

  const handleBubbleClick = (index) => {
    const newSelection = [...selectedBubbles];
    const selectedCount = newSelection.filter(Boolean).length;

    if (!newSelection[index] && selectedCount < 3) {
      newSelection[index] = true;
    } else if (newSelection[index]) {
      newSelection[index] = false;
    }

    setSelectedBubbles(newSelection);
  };

  const toggleOverlay = () => {
    setOverlayVisible(!isOverlayVisible); // Toggle the overlay visibility
  };

  const selectedAdjectives = selectedBubbles
    .map((selected, index) =>
      selected ? [
        "Reformer",
        "Helper",
        "Achiever",
        "Individualist",
        "Investigator",
        "Loyalist",
        "Enthusiast",
        "Challenger",
        "Peacemaker",
      ][index] : null
    )
    .filter(Boolean)
    .slice(0, 3);

    const personalityHeadings = [
      "Introduction",
      "Reformer",
      "Helper",
      "Achiever",
      "Individualist",
      "Investigator",
      "Loyalist",
      "Enthusiast",
      "Challenger",
      "Peacemaker"
    ];
  
    const personalityDescriptions = [
      "The system used is the Enneagram mode. It is a personality system that identifies nine core types, each representing a distinct way of thinking, feeling, and behaving. It explores the core motivations, fears, and desires that drive individuals, offering a deeper understanding of oneself and others. Each type has a dominant personality pattern shaped by core beliefs and emotions, along with specific strengths, weaknesses, and pathways for growth.",
      "Principled, purposeful, and perfectionistic. Driven by a sense of right and wrong, with a desire for integrity and excellence. Fears being corrupt; seeks moral correctness. Vice: anger, virtue: serenity",
      "Caring, empathetic, and people-pleasing. Motivated by a need for love and appreciation, often prioritizing others' needs. Fears being unlovable; desires connection. Vice: pride, virtue: humility.",
      "Ambitious, adaptable, and image-conscious. Strives for success and recognition, fearing worthlessness. Seeks admiration and validation. Vice: deceit, virtue: truthfulness.",
      "Sensitive, creative, and introspective. Desires authenticity and self-expression, fearing ordinariness. Seeks a unique identity. Vice: envy, virtue: equanimity.",
      "Independent, perceptive, and knowledge-seeking. Driven by a need to understand and conserve resources. Fears incompetence; desires mastery. Vice: avarice, virtue: detachment.",
      "Responsible, security-oriented, and trustworthy. Seeks safety and stability, fearing uncertainty. Desires guidance and support. Vice: fear, virtue: courage.",
      "Energetic, spontaneous, and optimistic. Pursues new experiences, fearing deprivation. Desires contentment and freedom. Vice: gluttony, virtue: sobriety.",
      "Assertive, confident, and protective. Values autonomy and control, fearing vulnerability. Seeks strength and independence. Vice: lust, virtue: innocence.",
      "Agreeable, patient, and supportive. Strives for harmony, avoiding conflict. Fears disruption; desires peace. Vice: sloth, virtue: action."
    ];

  return (
    <div className={styles.container}>
      <div className={styles.background}>
        <img src="/prequestionBackground.png" alt="Background" className={styles.backgroundImage} />
      </div>

      <header className={styles.header}>
        <Link href="/disclaimer">
          <img src="/backButton.png" alt="Button" className={styles.headerButton} />
        </Link>
        <h1 className={styles.headerheading}>LIGAFUTURE</h1>

        

      </header>

      <div className={styles.topSection}>
  <h1 className={styles.topheading}>Choose your personality</h1>
  
  <h1 className={styles.explanation}>
    Select up to three personality types that match you the most.
  </h1>

  <div className={styles.infoContainer}>
    <span className={styles.moreInfoText} onClick={toggleOverlay}>Find out more</span>
    <button className={styles.infoButton} onClick={toggleOverlay}>
      <img src="/infoarrow.png" alt="More Info" className={styles.infoIcon} />
    </button>
  </div>
</div>


      <div className={styles.bubblesContainer}>
        {[
          "Reformer",
          "Helper",
          "Achiever",
          "Individualist",
          "Investigator",
          "Loyalist",
          "Enthusiast",
          "Challenger",
          "Peacemaker",
        ].map((word, index) => (
          <div
            key={index}
            className={`${styles.bubble} ${selectedBubbles[index] ? styles.filled : ''}`}
            onClick={() => handleBubbleClick(index)}
          >
            {word}
          </div>
        ))}
      </div>

      <Link href={{ pathname: '/question', query: { adjectives: JSON.stringify(selectedAdjectives) } }}>
        <button 
          className={`${styles.startButton} ${selectedBubbles.some(Boolean) ? '' : styles.disabledButton}`} 
          disabled={!selectedBubbles.some(Boolean)}
        >
          Confirm
        </button>
      </Link>


      {isOverlayVisible && (
        <div className={styles.overlay} onClick={toggleOverlay}>
          <div className={styles.overlayContent} onClick={(e) => e.stopPropagation()}>
          <button className={styles.closeButton} onClick={toggleOverlay}>
            <img src="/closebutton.png" alt="Close" className={styles.closeButtonImage} />
          </button>


            {personalityHeadings.map((heading, index) => (
              <div key={index} className={styles.paragraph}>
                <div className={styles.paragraphHeading}>
                  <div className={styles.circle}></div>
                  <h3>{heading}</h3>
                </div>
                <p>{personalityDescriptions[index]}</p>
              </div>
            ))}
    </div>
  </div>
)}
    </div>
  );
}
