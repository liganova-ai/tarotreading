import { useEffect, useState, useRef } from 'react';
import axios from 'axios';
import { useRouter } from 'next/router';
import Link from 'next/link';
import styles from '../styles/results.module.css';

const cardNames = {
  '1': 'The Fool',
  '2': 'The Magician',
  '3': 'The High Priestess',
  '4': 'The Empress',
  '5': 'The Emperor',
  '6': 'The Hierophant',
  '7': 'The Lovers',
  '8': 'The Chariot',
  '9': 'Strength',
  '10': 'The Hermit',
  '11': 'Wheel of Fortune',
  '12': 'Justice',
  '13': 'The Hanged Man',
  '14': 'Death',
  '15': 'Temperance',
  '16': 'The Devil',
  '17': 'The Tower',
  '18': 'The Star',
  '19': 'The Moon',
  '20': 'The Sun',
  '21': 'Judgement',
  '22': 'The World',
  '23': 'Ace of Wands',
  '24': 'Two of Wands',
  '25': 'Three of Wands',
  '26': 'Four of Wands',
  '27': 'Five of Wands',
  '28': 'Six of Wands',
  '29': 'Seven of Wands',
  '30': 'Eight of Wands',
  '31': 'Nine of Wands',
  '32': 'Ten of Wands',
  '33': 'Page of Wands',
  '34': 'Knight of Wands',
  '35': 'Queen of Wands',
  '36': 'King of Wands',
  '37': 'Ace of Cups',
  '38': 'Two of Cups',
  '39': 'Three of Cups',
  '40': 'Four of Cups',
  '41': 'Five of Cups',
  '42': 'Six of Cups',
  '43': 'Seven of Cups',
  '44': 'Eight of Cups',
  '45': 'Nine of Cups',
  '46': 'Ten of Cups',
  '47': 'Page of Cups',
  '48': 'Knight of Cups',
  '49': 'Queen of Cups',
  '50': 'King of Cups',
  '51': 'Ace of Swords',
  '52': 'Two of Swords',
  '53': 'Three of Swords',
  '54': 'Four of Swords',
  '55': 'Five of Swords',
  '56': 'Six of Swords',
  '57': 'Seven of Swords',
  '58': 'Eight of Swords',
  '59': 'Nine of Swords',
  '60': 'Ten of Swords',
  '61': 'Page of Swords',
  '62': 'Knight of Swords',
  '63': 'Queen of Swords',
  '64': 'King of Swords',
  '65': 'Ace of Pentacles',
  '66': 'Two of Pentacles',
  '67': 'Three of Pentacles',
  '68': 'Four of Pentacles', 
  '69': 'Five of Pentacles',
  '70': 'Six of Pentacles',
  '71': 'Seven of Pentacles',
  '72': 'Eight of Pentacles',
  '73': 'Nine of Pentacles',
  '74': 'Ten of Pentacles',
  '75': 'Page of Pentacles', 
  '76': 'Knight of Pentacles',
  '77': 'Queen of Pentacles',
  '78': 'King of Pentacles' 
};

const cardDescriptions = {
  '1': 'The Fool: Represents new beginnings, spontaneity, and a free spirit. It’s about taking risks and embarking on new adventures with enthusiasm and trust in the journey.',
  '2': 'The Magician: Symbolizes manifestation, resourcefulness, and the power of will. The Magician has all the tools needed to turn dreams into reality.',
  '3': 'The High Priestess: Signifies intuition, mystery, and inner knowledge. She encourages looking beyond the obvious and trusting your gut feelings.',
  '4': 'The Empress: Embodies fertility, abundance, and nurturing energy. She is associated with creativity, motherhood, and the beauty of nature.',
  '5': 'The Emperor: Represents authority, structure, and stability. The Emperor brings order, control, and leadership to chaotic situations.',
  '6': 'The Hierophant: Denotes tradition, spiritual wisdom, and conformity. It suggests seeking guidance from established beliefs or mentors.',
  '7': 'The Lovers: Signifies love, harmony, and partnership. It’s about important choices in relationships or aligning values with someone else.',
  '8': 'The Chariot: Stands for determination, control, and victory through effort. The Chariot encourages harnessing emotions to achieve success.',
  '9': 'Strength: Represents courage, patience, and inner strength. It reminds you to use compassion to overcome challenges.',
  '10': 'The Hermit: Symbolizes introspection, solitude, and spiritual enlightenment. The Hermit invites you to reflect and seek wisdom within.',
  '11': 'Wheel of Fortune: A card of cycles, fate, and destiny. It signifies changes and turning points, both positive and negative.',
  '12': 'Justice: Represents fairness, truth, and balance. Justice seeks to right wrongs and suggests making decisions with integrity.',
  '13': 'The Hanged Man: Symbolizes letting go, surrender, and gaining new perspectives. It’s a card of pause and reflection before moving forward.',
  '14': 'Death: Represents transformation, endings, and new beginnings. Death isn’t about literal death, but about major life changes.',
  '15': 'Temperance: Signifies balance, moderation, and patience. Temperance encourages calm and harmonious action.',
  '16': 'The Devil: Denotes temptation, materialism, and self-imposed limitations. It’s about being trapped by desires or unhealthy patterns.',
  '17': 'The Tower: Represents sudden upheaval, chaos, and revelation. The Tower signifies the breaking down of old structures to rebuild anew.',
  '18': 'The Star: A card of hope, inspiration, and healing. The Star is about faith and renewed optimism after difficult times.',
  '19': 'The Moon: Symbolizes illusion, fear, and the unconscious. The Moon encourages confronting hidden truths and working through uncertainties.',
  '20': 'The Sun: Represents positivity, success, and joy. The Sun is about happiness, vitality, and achieving your goals.',
  '21': 'Judgement: Signifies reflection, rebirth, and renewal. It encourages self-evaluation and making decisions based on past lessons.',
  '22': 'The World: Symbolizes completion, achievement, and wholeness. The World is about reaching your goals and celebrating success.',
  '23': 'Ace of Wands: Represents new opportunities, creativity, and enthusiasm. The Ace of Wands brings the energy to start new ventures.',
  '24': 'Two of Wands: Denotes planning, progress, and future possibilities. It’s about making decisions and contemplating your next steps.',
  '25': 'Three of Wands: Symbolizes expansion, growth, and long-term vision. It suggests that your efforts are beginning to bear fruit.',
  '26': 'Four of Wands: Represents celebration, stability, and community. It’s about achieving a sense of completion and enjoying the results.',
  '27': 'Five of Wands: Signifies conflict, competition, and challenges. The card reflects disagreements or struggles, but also the potential for growth.',
  '28': 'Six of Wands: A card of victory, recognition, and success. It suggests receiving praise and achieving public acknowledgment.',
  '29': 'Seven of Wands: Denotes standing your ground, perseverance, and defense. It encourages defending your position and beliefs despite opposition.',
  '30': 'Eight of Wands: Represents swift action, movement, and progress. The Eight of Wands is about things quickly moving forward.',
  '31': 'Nine of Wands: Signifies resilience, persistence, and endurance. It’s about continuing the fight even when tired or faced with obstacles.',
  '32': 'Ten of Wands: Symbolizes burden, responsibility, and hard work. The Ten of Wands reflects carrying a heavy load and nearing the end of a difficult task.',
  '33': 'Page of Wands: Represents curiosity, enthusiasm, and new ideas. The Page of Wands brings a spark of inspiration and potential.',
  '34': 'Knight of Wands: Signifies action, adventure, and passion. The Knight of Wands moves forward with confidence and high energy.',
  '35': 'Queen of Wands: Denotes determination, independence, and warmth. The Queen of Wands is charismatic, creative, and a natural leader.',
  '36': 'King of Wands: Represents leadership, vision, and confidence. The King of Wands is a dynamic and bold leader who inspires others.',
  '37': 'Ace of Cups: A card of love, emotional fulfillment, and new relationships. The Ace of Cups is about open-heartedness and new emotional experiences.',
  '38': 'Two of Cups: Symbolizes partnership, harmony, and mutual respect. It suggests a strong connection between two individuals.',
  '39': 'Three of Cups: Represents friendship, celebration, and social connections. It’s about enjoying the company of others and celebrating shared moments.',
  '40': 'Four of Cups: Signifies contemplation, apathy, and introspection. The card suggests dissatisfaction or missed opportunities.',
  '41': 'Five of Cups: Denotes loss, grief, and regret. The card encourages focusing on what remains rather than what’s lost.',
  '42': 'Six of Cups: A card of nostalgia, memories, and childhood. It represents looking back on the past with fondness or unresolved emotions.',
  '43': 'Seven of Cups: Symbolizes choices, illusion, and fantasy. The Seven of Cups encourages careful decision-making and distinguishing dreams from reality.',
  '44': 'Eight of Cups: Represents leaving behind, walking away, and searching for more. It’s about moving on from unfulfilling situations.',
  '45': 'Nine of Cups: A card of satisfaction, pleasure, and emotional fulfillment. The Nine of Cups is about achieving what you desire.',
  '46': 'Ten of Cups: Symbolizes happiness, harmony, and emotional fulfillment. It reflects domestic bliss and a strong sense of community or family.',
  '47': 'Page of Cups: Represents creativity, intuition, and emotional openness. The Page of Cups brings new emotional experiences and creative ideas.',
  '48': 'Knight of Cups: Denotes romance, idealism, and charm. The Knight of Cups pursues dreams and emotional connections with passion.',
  '49': 'Queen of Cups: A card of compassion, empathy, and deep emotional understanding. The Queen of Cups is nurturing and emotionally supportive.',
  '50': 'King of Cups: Represents emotional balance, control, and diplomacy. The King of Cups is calm and wise in navigating emotions.',
  '51': 'Ace of Swords: Symbolizes clarity, truth, and new intellectual insights. It suggests a breakthrough in understanding or communication.',
  '52': 'Two of Swords: Denotes indecision, difficult choices, and stalemate. The card reflects the need for balance and careful decision-making.',
  '53': 'Three of Swords: Represents heartbreak, sorrow, and emotional pain. It’s a card of grief but also suggests the possibility of healing.',
  '54': 'Four of Swords: A card of rest, recovery, and reflection. It suggests taking time to recharge and heal after challenges.',
  '55': 'Five of Swords: Symbolizes conflict, defeat, and tension. The card reflects a need to assess whether winning at all costs is worth it.',
  '56': 'Six of Swords: Denotes transition, moving on, and finding peace. It’s about leaving behind difficulties and heading towards calmer waters.',
  '57': 'Seven of Swords: Represents deception, trickery, and strategy. The card encourages caution and careful planning to avoid pitfalls.',
  '58': 'Eight of Swords: A card of feeling trapped, restricted, and powerless. It suggests self-imposed limitations and the need to break free.',
  '59': 'Nine of Swords: Denotes anxiety, worry, and sleepless nights. The card reflects fears and concerns weighing heavily on the mind.',
  '60': 'Ten of Swords: Represents betrayal, endings, and painful conclusions. The card indicates hitting rock bottom but also the opportunity for renewal.',
  '61': 'Page of Swords: Signifies curiosity, new ideas, and mental agility. The Page of Swords brings intellectual energy and fresh perspectives.',
  '62': 'Knight of Swords: A card of action, speed, and determination. The Knight of Swords is a fast-moving and focused force, often charging into situations.',
  '63': 'Queen of Swords: Denotes clarity, perception, and intellectual strength. The Queen of Swords is sharp-minded and seeks truth with fairness.',
  '64': 'King of Swords: Represents authority, judgment, and intellectual power. The King of Swords uses logic and reason to make decisions and lead others.',
  '65': 'Ace of Pentacles: Symbolizes new opportunities, prosperity, and material success. The Ace of Pentacles brings tangible rewards and stability.',
  '66': 'Two of Pentacles: Denotes balance, adaptability, and juggling responsibilities. The card encourages maintaining harmony while handling various tasks.',
  '67': 'Three of Pentacles: Represents teamwork, collaboration, and craftsmanship. It reflects the power of working with others to achieve goals.',
  '68': 'Four of Pentacles: Symbolizes security, control, and holding on tightly. The Four of Pentacles cautions against being too rigid or possessive.',
  '69': 'Five of Pentacles: Represents poverty, loss, and hardship. The card reflects financial or emotional struggles but suggests support is available.',
  '70': 'Six of Pentacles: Denotes generosity, charity, and balance. It suggests the fair distribution of resources and giving or receiving help.',
  '71': 'Seven of Pentacles: Symbolizes patience, evaluation, and long-term investment. It reflects assessing progress and waiting for results.',
  '72': 'Eight of Pentacles: Represents skill, craftsmanship, and hard work. The Eight of Pentacles encourages dedication and focus on mastering a craft.',
  '73': 'Nine of Pentacles: Denotes independence, luxury, and self-sufficiency. The Nine of Pentacles celebrates achieving success through personal effort.',
  '74': 'Ten of Pentacles: A card of family, wealth, and legacy. It reflects long-term stability, abundance, and generational success.',
  '75': 'Page of Pentacles: Represents ambition, new opportunities, and focus on material gain. The Page of Pentacles is eager to learn and build wealth.',
  '76': 'Knight of Pentacles: Denotes hard work, responsibility, and persistence. The Knight of Pentacles is steady, reliable, and committed to goals.',
  '77': 'Queen of Pentacles: Symbolizes nurturing, practicality, and financial acumen. The Queen of Pentacles brings comfort and stability to others.',
  '78': 'King of Pentacles: Represents wealth, security, and success. The King of Pentacles is a wise and capable leader in financial matters.'
};



export default function ResultsPage() {
  const router = useRouter();
  const { question, cards, adjectives } = router.query;
  const [prediction, setPrediction] = useState('');
  const [paragraphs, setParagraphs] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  const [isFetchingAudio, setIsFetchingAudio] = useState(false);
  const [isPlaying, setIsPlaying] = useState(false);
  const [isAudioFetched, setIsAudioFetched] = useState(false);
  const audioRef = useRef(null);
  const [selectedCardIndex, setSelectedCardIndex] = useState(null);
  const isFetchingRef = useRef(false); // useRef: does not trigger re-render, to check if Prediciton is being fetched from API Endpoint

  const modalRef = useRef(null);
  const parsedCards = cards ? JSON.parse(cards) : [];

  const handleSpeakClick = async () => {
    if (isAudioFetched && audioRef.current) {
      if (isPlaying) {
        audioRef.current.pause();
        setIsPlaying(false);
      } else {
        audioRef.current.play();
        setIsPlaying(true);
      }
      return;
    }

    try {
      setIsFetchingAudio(true);
      const response = await fetch('/api/tts', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ text: prediction }),
      });

      if (!response.ok) throw new Error('Audio generation failed');

      const audioBlob = await response.blob();
      const audioUrl = URL.createObjectURL(audioBlob);

      if (audioRef.current) {
        audioRef.current.src = audioUrl;
        audioRef.current.load();
        audioRef.current.play();
        setIsAudioFetched(true);
        setIsPlaying(true);
      }

      audioRef.current.onplaying = () => {
        setIsFetchingAudio(false);
        setIsPlaying(true);
      };
      audioRef.current.onpause = () => setIsPlaying(false);
      audioRef.current.onended = () => setIsPlaying(false);

    } catch (err) {
      console.error('Error fetching TTS:', err);
      setIsFetchingAudio(false);
    }
  };
  
  
  useEffect(() => {
    if (!router.isReady || !question || !cards || !adjectives) {
      return;
    }

    const parsedAdjectives = JSON.parse(adjectives);
    if (!Array.isArray(parsedCards) || !Array.isArray(parsedAdjectives)) {
      return;
    }

    if (isFetchingRef.current) {
      return;
    }

    const fetchPrediction = async () => {
      isFetchingRef.current = true;
      setLoading(true);
      console.log("post req @ openai:", question, cards, adjectives)
      try {
        const response = await axios.post('/api/predict', {
          question,
          cards: parsedCards,
          adjectives: parsedAdjectives,
        });
        setTimeout(() => {
          setPrediction(response.data.prediction);
          setParagraphs(response.data.prediction.split('\n'));
          setLoading(false);
        }, 5000);
      } catch (err) {
        setError('Failed to fetch prediction. Please try again.');
        setLoading(false);
      } finally {
        isFetchingRef.current = false;
      }
    };

    fetchPrediction();
  }, [router.isReady, question, cards, adjectives]);

  // for Overlay Modal when clicking one Card for further explanation
  useEffect(() => {
    const handleClickOutside = (event) => {
      if (modalRef.current && !modalRef.current.contains(event.target)) {
        closeModal(); // Close modal if clicked outside
      }
    };
  
    if (selectedCardIndex !== null) {
      document.addEventListener('mousedown', handleClickOutside);
    } else {
      document.removeEventListener('mousedown', handleClickOutside);
    }
  
    return () => {
      document.removeEventListener('mousedown', handleClickOutside);
    };
  }, [selectedCardIndex]);



  if (loading) return (
    <div className={styles.container}>
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
        <p className={styles.loadingText}>Your future is being processed...</p>
      </div>
    </div>
  );

  if (error) return <div className={styles.error}>{error}</div>;

  return (
    <div className={styles.container}>
      <div className={styles.background}>
        <img src="/resultsBackground.png" alt="Background" className={styles.backgroundImage} />
      </div>

      <header className={styles.header}>
        <Link href="/">
          <img src="/backButton.png" alt="Button" className={styles.headerButton} />
        </Link>
        <h1 className={styles.headerheading}>LIGAORACLE</h1>
      </header>

      <div className={styles.topSection}>
        <h1 className={styles.topheading}>The cards have spoken</h1>
      </div>

      {/* Main content, hidden when overlay modal for card explanation is open (/a Card is selected) */}
      {selectedCardIndex === null && (
          <>
            <div className={styles.cardsSection}>
              {parsedCards.map((cardNumber, index) => (
                <div key={index} className={styles.cardContainer} onClick={() => setSelectedCardIndex(index)}>
                  <img
                    src={`/cards/Card ${cardNumber}.jpg`}
                    alt={`Card ${cardNumber}`}
                    className={styles.cardImage}
                  />
                </div>
              ))}
            </div>

          <div className={styles.predictionSection}>
            <button onClick={handleSpeakClick} className={styles.button}>
            <img
              src={
                isFetchingAudio ? "/bouncing-circles.svg" :
                isPlaying ? "/PauseButton.png" :
                isAudioFetched ? "/PlayButton.png" :
                "/SpeakButton.png"
              }
              className={styles.speakButton}
              alt="Speak Button"
            />
            </button>
            <audio ref={audioRef}/>
            <div className={styles.predictionTextContainer}>
            {paragraphs.map((paragraph, index) => (
              <p key={index} className={styles.predictionText}>{paragraph}</p>
            ))}
          </div>
          </div>

          <Link href="/">
            <button className={styles.returnButton}>Restart</button>
          </Link>
        </>
      )}


      {selectedCardIndex !== null && (
        <div className={styles.modal}>
          <div className={styles.background}>
            <img src="/resultsBackground.png" alt="Background" className={styles.backgroundImage} />
          </div>
          
          <header className={styles.header}>
            
              <img src="/backButton.png" alt="Button" className={styles.headerButton} onClick={closeModal} />
           
            <h1 className={styles.headerheading}>LIGAORACLE</h1>
          </header>

              <div className={styles.topSection}>
                <h1 className={styles.topheading}>What each card means</h1>
              </div>
              <div className={styles.modalContent}>
            <div className={styles.modalCard} ref={modalRef}>
              <img
                src={`/cards/Card ${parsedCards[selectedCardIndex]}.jpg`}
                alt={`Card ${parsedCards[selectedCardIndex]}`}
                className={styles.largeCardImage}
              />
            </div>

            
              <p className={styles.cardDescription}>
                {cardDescriptions[parsedCards[selectedCardIndex]]}
              </p>
              
            
          </div>



        </div>
      )}


    </div>
  );
}
