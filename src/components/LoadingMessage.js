import { useEffect, useState } from 'react';
import { useLanguage } from '@/context/Language';
import { LOADING_MESSAGES, shuffleMessages } from '@/lib/loadingMessages.mjs';
import styles from '@/styles/results.module.css';

export default function LoadingMessage() {
  const { language, languageReady } = useLanguage();
  const [message, setMessage] = useState(null);
  useEffect(() => {
    if (!languageReady) return;
    const messages = LOADING_MESSAGES[language];
    let queue = shuffleMessages(messages);
    let current = queue.shift();
    setMessage(current);
    const timer = setInterval(() => {
      if (!queue.length) queue = shuffleMessages(messages, current);
      current = queue.shift();
      setMessage(current);
    }, 4500);
    return () => clearInterval(timer);
  }, [language, languageReady]);
  return <p className={styles.loadingText}><span key={message} className={styles.loadingMessage}>{message}</span></p>;
}
