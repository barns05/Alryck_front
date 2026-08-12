import { useEffect, useState } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { ALRYCK_CRISTAL_URL as CRYSTAL_URL } from '@/lib/brandAssets';

const WORDMARK_URL =
  'https://media.base44.com/images/public/69b804640546049d1a7bf53a/54cebbb89_6C85E1F1-B178-4B34-980F-516CAA26E653.png';

const NAVY = '#1e1b4b';

// Clé sessionStorage — affiché une seule fois par session
const SESSION_KEY = 'alryck_splash_shown';

const MIN_DURATION = 3000;

export default function SplashScreen({ onDone, ready = false }) {
  const [visible, setVisible] = useState(false);
  const [timerDone, setTimerDone] = useState(false);

  useEffect(() => {
    const already = sessionStorage.getItem(SESSION_KEY);
    if (already) {
      onDone();
      return;
    }
    sessionStorage.setItem(SESSION_KEY, '1');
    setVisible(true);

    const t = setTimeout(() => setTimerDone(true), MIN_DURATION);
    return () => clearTimeout(t);
  }, []);

  // Ferme le splash quand les deux conditions sont remplies
  useEffect(() => {
    if (timerDone && ready && visible) {
      setVisible(false);
      setTimeout(onDone, 320);
    }
  }, [timerDone, ready, visible]);

  return (
    <AnimatePresence>
      {visible && (
        /* ── Étape 1 : fond navy en fondu ─────────────────────────── */
        <motion.div
          key="splash"
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          exit={{ opacity: 0 }}
          transition={{ duration: 0.25, ease: 'easeInOut' }}
          style={{
            position: 'fixed',
            inset: 0,
            zIndex: 99999,
            backgroundColor: NAVY,
            background: `radial-gradient(ellipse at center, #2d2a6e 0%, ${NAVY} 70%)`,
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center',
            overflow: 'hidden',
          }}
        >
          {/* Lumière centrale champagne — très subtile */}
          <div
            style={{
              position: 'absolute',
              inset: 0,
              background:
                'radial-gradient(ellipse 40% 30% at 50% 50%, rgba(246,231,193,0.06) 0%, transparent 100%)',
              pointerEvents: 'none',
            }}
          />

          {/* ── Conteneur logo + wordmark ── */}
          <div
            style={{
              display: 'flex',
              flexDirection: 'column',
              alignItems: 'center',
              position: 'relative',
            }}
          >
            {/* ── Étape 2 : cristal ─────────────────────────────────── */}
            <motion.div
              initial={{ opacity: 0, scale: 0.3, rotate: -6 }}
              animate={{ opacity: 1, scale: 1, rotate: 0 }}
              transition={{ delay: 0.30, duration: 0.90, ease: 'easeInOut' }}
              style={{ position: 'relative', width: 179, height: 179 }}
            >
              <img
                src={CRYSTAL_URL}
                alt="Alryck"
                style={{ width: 179, height: 179, objectFit: 'contain', display: 'block' }}
              />

              {/* ── Étape 3 : mini éclat champagne au centre du cristal ── */}
              <motion.div
                initial={{ opacity: 0 }}
                animate={{ opacity: [0, 0.6, 0] }}
                transition={{ delay: 1.20, duration: 0.50, ease: 'easeInOut' }}
                style={{
                  position: 'absolute',
                  top: '50%',
                  left: '50%',
                  transform: 'translate(-50%, -50%)',
                  width: 28,
                  height: 28,
                  borderRadius: '50%',
                  background:
                    'radial-gradient(circle, rgba(255,255,255,0.9) 0%, rgba(255,255,255,0) 70%)',
                  pointerEvents: 'none',
                }}
              />
            </motion.div>

            {/* ── Étape 4 : wordmark ─────────────────────────────────── */}
            <motion.div
              initial={{ opacity: 0, y: 8 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ delay: 1.70, duration: 0.60, ease: 'easeOut' }}
              style={{ marginTop: -66 }}
            >
              <img
                src={WORDMARK_URL}
                alt="ALRYCK"
                style={{
                  height: 209,
                  objectFit: 'contain',
                  display: 'block',
                  // Wordmark net, sans halo doré (glow retiré)
                }}
              />
            </motion.div>
          </div>
        </motion.div>
      )}
    </AnimatePresence>
  );
}