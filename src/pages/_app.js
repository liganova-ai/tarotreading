import { disposePreparedReadingAudio } from '@/lib/readingAudio';
import "@/styles/globals.css";
import localFont from 'next/font/local';
import { useEffect } from 'react';
import { useRouter } from 'next/router';
import { AnimatePresence, motion, useReducedMotion } from 'framer-motion';
import OracleScene from '@/components/OracleScene';
import "slick-carousel/slick/slick.css";
import "slick-carousel/slick/slick-theme.css";


export default function App({ Component, pageProps }) {
  const router = useRouter();
  const reducedMotion = useReducedMotion();

  useEffect(() => {
    ['/disclaimer', '/prequestion', '/question', '/cards', '/results'].forEach(path => router.prefetch(path));
  }, [router]);

  useEffect(() => {
    if (router.pathname !== '/results') disposePreparedReadingAudio();
  }, [router.pathname]);

  return (
    <main className={`app-shell ${luxury.variable} ${sabon.variable}`}>
      <OracleScene pathname={router.pathname} />
      <AnimatePresence mode="wait" initial={false} onExitComplete={() => window.scrollTo(0, 0)}>
        <motion.div
          className="page-content"
          key={router.pathname}
          initial={{ opacity: reducedMotion ? 1 : 0, y: reducedMotion ? 0 : 12 }}
          animate={{ opacity: 1, y: 0 }}
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
      path: '/fonts/Luxury-Diamond.otf',
      weight: '300',
      style: 'diamond',
    },
    {
      path: '/fonts/Luxury-Gold.otf',
      weight: '200',
      style: 'golden',
    },
    {
      path: '/fonts/Luxury-Platinum.otf',
      weight: '700',
      style: 'platinum',
    },
  ],
  variable: '--font-luxury',  // css variable name 
});

const sabon = localFont({
  src: [
    {
      path: '/fonts/SabonLTStd-Roman.otf',
      weight: '300',
      style: 'Roman',
    },
    {
      path: '/fonts/SabonLTStd-Italic.otf',
      weight: '500',
      style: 'Italic',
    },
    {
      path: '/fonts/SabonLTStd-BoldItalic.otf',
      weight: '700',
      style: 'BoldItalic',
    },
    {
      path: '/fonts/SabonLTStd-Bold.otf',
      weight: '800',
      style: 'Bold',
    },
  ],
  variable: '--font-sabon',  // css variable name
});
