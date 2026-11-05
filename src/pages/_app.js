import { disposePreparedReadingAudio } from '@/lib/readingAudio';
import "@/styles/globals.css";
import localFont from 'next/font/local';
import { useEffect, useState } from 'react';
import { useRouter } from 'next/router';
import { AnimatePresence, motion, useReducedMotion } from 'framer-motion';
import OracleScene from '@/components/OracleScene';
import "slick-carousel/slick/slick.css";
import "slick-carousel/slick/slick-theme.css";
// Next must retain outgoing step styles until AnimatePresence finishes exiting.
import '@/styles/Home.module.css';
import '@/styles/Wizard.module.css';
import '@/styles/BackControl.module.css';
import '@/styles/GlassDot.module.css';
import '@/styles/disclaimer.module.css';
import '@/styles/prequestion.module.css';
import '@/styles/question.module.css';
import '@/styles/cards.module.css';
import '@/styles/results.module.css';



export default function App({ Component, pageProps }) {
  const router = useRouter();
  const reducedMotion = useReducedMotion();
  const [fontsReady, setFontsReady] = useState(false);

  useEffect(() => {
    let active = true;
    // Warm every face used by the wizard before revealing its first page.
    Promise.allSettled([
      document.fonts.load(`200 16px ${luxury.style.fontFamily}`),
      document.fonts.load(`300 16px ${sabon.style.fontFamily}`),
      document.fonts.load(`italic 500 16px ${sabon.style.fontFamily}`),
      document.fonts.load(`800 16px ${sabon.style.fontFamily}`),
    ]).then(() => { if (active) setFontsReady(true); });
    return () => { active = false; };
  }, []);

  useEffect(() => {
    ['/disclaimer', '/prequestion', '/question', '/cards', '/results'].forEach(path => router.prefetch(path));
  }, [router]);

  useEffect(() => {
    if (router.pathname !== '/results') disposePreparedReadingAudio();
  }, [router.pathname]);

  return (
    <main className={`app-shell ${luxury.variable} ${sabon.variable}`} data-fonts-ready={fontsReady}>
      <OracleScene pathname={router.pathname} />
      <AnimatePresence mode="wait" initial={false} onExitComplete={() => window.scrollTo(0, 0)}>
        <motion.div
          className="page-content"
          key={router.pathname}
          initial={{ opacity: reducedMotion ? 1 : 0, y: reducedMotion ? 0 : 12 }}
          animate={{ opacity: fontsReady ? 1 : 0, y: fontsReady || reducedMotion ? 0 : 12 }}
          exit={{
            opacity: reducedMotion ? 1 : 0,
            y: reducedMotion ? 0 : -8,
            transition: { duration: reducedMotion ? 0 : router.pathname === '/' ? 2.05 : .24 },
          }}
          transition={{ duration: reducedMotion ? 0 : .32, ease: [.22, 1, .36, 1] }}
          onAnimationComplete={definition => {
            if (definition.opacity !== 1) return;
            const target = document.querySelector('.page-content [data-autofocus]') || document.querySelector('.page-content h1');
            if (target) { if (target.tagName === 'H1') target.tabIndex = -1; target.focus({ preventScroll: true }); }
          }}
        >
          <Component {...pageProps} />
        </motion.div>
      </AnimatePresence>
    </main>
  );
}

const luxury = localFont({
  src: [
    {
      path: '/fonts/Luxury-Diamond.woff2',
      weight: '300',
      style: 'normal',
    },
    {
      path: '/fonts/Luxury-Gold.woff2',
      weight: '200',
      style: 'normal',
    },
    {
      path: '/fonts/Luxury-Platinum.woff2',
      weight: '700',
      style: 'normal',
    },
  ],
  display: 'block',
  preload: true,
  variable: '--font-luxury',  // css variable name 
});

const sabon = localFont({
  src: [
    {
      path: '/fonts/SabonLTStd-Roman.woff2',
      weight: '300',
      style: 'normal',
    },
    {
      path: '/fonts/SabonLTStd-Italic.woff2',
      weight: '500',
      style: 'italic',
    },
    {
      path: '/fonts/SabonLTStd-BoldItalic.woff2',
      weight: '700',
      style: 'italic',
    },
    {
      path: '/fonts/SabonLTStd-Bold.woff2',
      weight: '800',
      style: 'normal',
    },
  ],
  display: 'block',
  preload: true,
  variable: '--font-sabon',  // css variable name
});
