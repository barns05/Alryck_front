import { motion } from 'framer-motion';
import { ALRYCK_CRISTAL_URL as CRYSTAL_URL } from '@/lib/brandAssets';

/**
 * Cristal tournant — remplace tous les spinners génériques.
 * @param {number} size     - Taille en px (défaut : 48)
 * @param {string} label    - Texte optionnel affiché sous le cristal
 * @param {string} className - Classes supplémentaires pour le wrapper
 */
export default function LoadingCristal({ size = 48, label, className = '' }) {
  return (
    <div
      className={`flex flex-col items-center justify-center gap-3 ${className}`}
    >
      <div style={{ position: 'relative', width: size, height: size }}>
        {/* Glow champagne pulsé */}
        <motion.div
          animate={{ opacity: [0.15, 0.35, 0.15], scale: [1, 1.15, 1] }}
          transition={{ duration: 2, repeat: Infinity, ease: 'easeInOut' }}
          style={{
            position: 'absolute',
            inset: -size * 0.2,
            borderRadius: '50%',
            background: 'radial-gradient(circle, rgba(246,231,193,0.20) 0%, transparent 70%)',
            pointerEvents: 'none',
          }}
        />
        {/* Cristal rotatif */}
        <motion.img
          src={CRYSTAL_URL}
          alt=""
          animate={{ scale: [0.85, 1.15, 0.85], opacity: [0.85, 1, 0.85] }}
          transition={{ duration: 1.5, repeat: Infinity, ease: 'easeInOut' }}
          style={{ width: size, height: size, objectFit: 'contain', display: 'block' }}
        />
      </div>

      {label && (
        <p
          style={{
            fontSize: 12,
            color: 'rgba(246,231,193,0.75)',
            letterSpacing: '0.03em',
            textAlign: 'center',
          }}
        >
          {label}
        </p>
      )}
    </div>
  );
}