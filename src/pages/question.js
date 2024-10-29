import { useState } from 'react';
import Link from 'next/link';
import { useRouter } from 'next/router';
import styles from '../styles/question.module.css'; // Change the import to use prequestion styles

export default function QuestionPage() {
  const router = useRouter();
  const { adjectives } = router.query; // Get adjectives from query
  const [question, setQuestion] = useState('');

  const handleChange = (e) => setQuestion(e.target.value);

   // Function to handle the Enter key press
   const handleKeyDown = (e) => {
    if (e.key === 'Enter' && question) {
      // Prevent the default behavior of adding a new line
      e.preventDefault();
      // Navigate to the cards page
      router.push({ pathname: '/cards', query: { question, adjectives } });
    }
  };

  return (
    <div className={styles.container}>
      <div className={styles.background}>
        <img src="/questionBackground.png" alt="Background" className={styles.backgroundImage} />
      </div>

      <header className={styles.header}>
        <Link href="/prequestion">
          <img src="/backButton.png" alt="Button" className={styles.headerButton} />
        </Link>
        <h1 className={styles.headerheading}>LIGAORACLE</h1>
      </header>

      <div className={styles.topSection}>
        <h1 className={styles.topheading}>What is your question?</h1>
        <h1 className={styles.explanation}> Keep it short for the best result.</h1>
      </div>

      <textarea
        value={question}
        onChange={handleChange}
        onKeyDown={handleKeyDown}
        placeholder="Enter your question here."
        className={styles.input}
      />

      <Link href={{ pathname: '/cards', query: { question, adjectives } }}>
        <button className={styles.submitButton} disabled={!question}>
          Confirm
        </button>
      </Link>
    </div>
  );
}
