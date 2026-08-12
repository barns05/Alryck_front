/**
 * Composant universel pour les messages d'Amanda.
 * Types : 'celebration' | 'processing' | 'success' | 'info' | 'warning'
 */
import { useState } from 'react';
import { motion, AnimatePresence } from 'framer-motion';

export const AMANDA_ASSETS = {
  character: "https://media.base44.com/images/public/69b804640546049d1a7bf53a/b40a205d7_1B1C326A-B45D-4C5D-9B3D-69D6A46F502B.png",
  // Version « main vide » d'Amanda (même style/pose, sans cristaux dans la main).
  // Utilisée par AmandaProcessing (md/lg) pour y animer un cristal tournant.
  // `character` (avec cristaux) reste utilisé par celebration/success/info/warning.
  characterEmptyHand: "https://media.base44.com/images/public/69b804640546049d1a7bf53a/2eeb941e1_F4B573F7-B264-4742-AB8D-FCBEF2B5A70A.png",
  crystalAlryck: "https://media.base44.com/images/public/69b804640546049d1a7bf53a/add7d9f16_file_00000000baa0724695dea66812e6a844.png",
  // Anneau de 6 cristaux multicolores reliés par une traîne scintillante (centre
  // transparent). Utilisé par AmandaProcessing (md/lg) : sa rotation donne un
  // effet « roue magique » tournant dans la main d'Amanda.
  crystalRing: "https://media.base44.com/images/public/69b804640546049d1a7bf53a/862b9c28b_5221B7B6-2C65-43DE-8C92-45188B4B3DAC.png",
  // 4 cristaux isolés (fond transparent) pour l'orbite au-dessus de la paume
  // dans AmandaProcessing (md/lg). Éclairage/couleurs d'origine non retouchés.
  crystalOrbitBlue: "https://media.base44.com/images/public/69b804640546049d1a7bf53a/f91bd6612_IMG_4234.png?cb=orb1",
  crystalOrbitRose: "https://media.base44.com/images/public/69b804640546049d1a7bf53a/b3eaa2fbb_IMG_4235.png?cb=orb1",
  crystalOrbitOrange: "https://media.base44.com/images/public/69b804640546049d1a7bf53a/ce02bd0bf_IMG_4236.png?cb=orb1",
  crystalOrbitChampagne: "https://media.base44.com/images/public/69b804640546049d1a7bf53a/afd52b0f6_IMG_4237.png?cb=orb1",
  crystals: {
    magenta:   "https://media.base44.com/images/public/69b804640546049d1a7bf53a/e467ac989_5A6EA692-C719-4A12-A63B-69D734E16FE3.png",
    blue:      "https://media.base44.com/images/public/69b804640546049d1a7bf53a/1d2079931_58ECE9C5-1B74-4169-98D6-37A11C3068BD.png",
    champagne: "https://media.base44.com/images/public/69b804640546049d1a7bf53a/d0ffea403_35366EA7-C8AC-42ED-8107-B34BD1E05F9D.png",
    amber:     "https://media.base44.com/images/public/69b804640546049d1a7bf53a/94977f8e5_17C1522C-F38F-40E4-B0D7-DA076BED4004.png",
  }
};

// Trajectoires des 5 cristaux depuis la main gauche du personnage
const CRYSTAL_TRAJECTORIES = [
  // Bleu — haut gauche
  { src: AMANDA_ASSETS.crystals.blue,      x: [-60, -120], y: [-80,  -160], rotate: [-20, -40] },
  // Magenta — haut centre-gauche
  { src: AMANDA_ASSETS.crystals.magenta,   x: [-10,   10], y: [-90,  -180], rotate: [15,   30] },
  // Amber — haut droite
  { src: AMANDA_ASSETS.crystals.amber,     x: [40,    90], y: [-70,  -150], rotate: [25,   50] },
  // Champagne — grand angle gauche (drop-shadow pour visibilité fond blanc)
  { src: AMANDA_ASSETS.crystals.champagne, x: [-80, -150], y: [-50,  -120], rotate: [-35, -60], shadow: true },
  // Magenta bis — arc droite bas
  { src: AMANDA_ASSETS.crystals.magenta,   x: [70,   130], y: [-40,  -100], rotate: [40,   70] },
];

function FloatingCrystal({ src, x, y, rotate, delay = 0, shadow = false }) {
  return (
    <motion.img
      src={src}
      alt=""
      initial={{ opacity: 0, scale: 0, x: 0, y: 0, rotate: 0 }}
      animate={{
        opacity: [0, 1, 1, 0],
        scale:   [0, 1, 0.85, 0],
        x:       [0, x[0], x[1]],
        y:       [0, y[0], y[1]],
        rotate:  [0, rotate[0], rotate[1]],
      }}
      transition={{
        duration: 1.5,
        delay,
        ease: "easeOut",
        repeat: Infinity,
        repeatDelay: 1.2,
      }}
      style={{
        position: 'absolute',
        width: 72,
        height: 72,
        objectFit: 'contain',
        pointerEvents: 'none',
        // Position de départ : la main gauche du personnage (bas-gauche du PNG)
        bottom: '28%',
        left: '22%',
        zIndex: 10,
        // Ombre portée pour les cristaux clairs sur fond blanc
        filter: shadow ? 'drop-shadow(0 2px 6px rgba(180,140,60,0.45))' : undefined,
      }}
    />
  );
}

// ─── Étoiles scintillantes ────────────────────────────────────────────────────
const STARS = [
  { cx: '78%', cy: '12%', size: 14, delay: 0,    color: '#F6E7C1' },
  { cx: '88%', cy: '35%', size: 10, delay: 0.4,  color: '#ffffff' },
  { cx: '15%', cy: '18%', size: 12, delay: 0.8,  color: '#F6E7C1' },
  { cx: '8%',  cy: '55%', size: 9,  delay: 1.2,  color: '#ffffff' },
];

function SparkStar({ cx, cy, size, delay, color }) {
  return (
    <motion.svg
      width={size}
      height={size}
      viewBox="0 0 20 20"
      fill={color}
      style={{ position: 'absolute', left: cx, top: cy, pointerEvents: 'none', zIndex: 12 }}
      initial={{ opacity: 0, scale: 0.5 }}
      animate={{ opacity: [0, 1, 0], scale: [0.5, 1, 0.5] }}
      transition={{ duration: 1.6, delay, repeat: Infinity, repeatDelay: 0.8, ease: 'easeInOut' }}
    >
      {/* Forme en croix / losange à 4 branches */}
      <path d="M10 0 L11.5 8.5 L20 10 L11.5 11.5 L10 20 L8.5 11.5 L0 10 L8.5 8.5 Z" />
    </motion.svg>
  );
}

// ─── Type Celebration ────────────────────────────────────────────────────────
function CelebrationContent({ message, onClose }) {
  return (
    <div className="flex flex-col items-center gap-4 py-4 px-2">
      {/* Personnage + cristaux + étoiles */}
      <div style={{ position: 'relative', width: 180, height: 200 }}>
        {CRYSTAL_TRAJECTORIES.map((c, i) => (
          <FloatingCrystal key={i} {...c} delay={i * 0.22} />
        ))}
        {STARS.map((s, i) => (
          <SparkStar key={i} {...s} />
        ))}
        <motion.img
          src={AMANDA_ASSETS.character}
          alt="Amanda"
          initial={{ opacity: 0, scale: 0.6 }}
          animate={{
            opacity: 1,
            scale: 1,
            y: [0, -8, 0],
            filter: [
              "drop-shadow(0 0 8px rgba(232,121,249,0.4))",
              "drop-shadow(0 0 20px rgba(232,121,249,0.8))",
              "drop-shadow(0 0 8px rgba(232,121,249,0.4))",
            ],
          }}
          transition={{
            opacity: { duration: 0.5, type: "spring", stiffness: 200, damping: 15 },
            scale:   { duration: 0.5, type: "spring", stiffness: 200, damping: 15 },
            y:       { duration: 3, repeat: Infinity, ease: "easeInOut" },
            filter:  { duration: 2, repeat: Infinity, ease: "easeInOut" },
          }}
          style={{ width: 180, height: 200, objectFit: 'contain', display: 'block' }}
        />
      </div>

      {/* Message */}
      <p className="text-center font-bold text-base" style={{ color: '#1e1b4b', maxWidth: 280 }}>
        {message}
      </p>

      {onClose && (
        <button
          onClick={onClose}
          className="mt-1 px-6 py-2 rounded-full text-sm font-semibold transition-all"
          style={{
            background: 'linear-gradient(135deg, #E879F9 0%, #38BDF8 100%)',
            color: '#fff',
            boxShadow: '0 4px 14px rgba(232,121,249,0.35)',
          }}
        >
          Super ! ✨
        </button>
      )}
    </div>
  );
}

// ─── Type Processing ──────────────────────────────────────────────────────────
function ProcessingContent({ message }) {
  return (
    <div className="flex items-center gap-3 py-2">
      <motion.img
        src={AMANDA_ASSETS.crystalAlryck}
        alt=""
        animate={{ scale: [1, 1.06, 1], opacity: [0.85, 1, 0.85] }}
        transition={{ duration: 1.5, repeat: Infinity, ease: "easeInOut" }}
        style={{ width: 80, height: 80, objectFit: 'contain', flexShrink: 0 }}
      />
      <p className="text-sm font-medium" style={{ color: '#1e1b4b' }}>{message}</p>
    </div>
  );
}

// ─── Type Success ─────────────────────────────────────────────────────────────
function SuccessContent({ message }) {
  return (
    <div className="flex items-start gap-3">
      <motion.img
        src={AMANDA_ASSETS.character}
        alt="Amanda"
        initial={{ opacity: 0, scale: 0.85 }}
        animate={{
          opacity: 1,
          scale: 1,
          filter: "drop-shadow(0 0 10px rgba(74,222,128,0.45))",
        }}
        transition={{ duration: 0.4, type: "spring" }}
        style={{ width: 44, height: 50, objectFit: 'contain', flexShrink: 0 }}
      />
      <div className="flex-1 pt-1">
        <p className="text-xs font-bold mb-1" style={{ color: '#1e1b4b' }}>Amanda</p>
        <div className="rounded-2xl rounded-tl-sm px-4 py-3" style={{ background: '#F0FDF4', border: '1px solid #BBF7D0' }}>
          <p className="text-sm leading-relaxed" style={{ color: '#14532D' }}>{message}</p>
        </div>
      </div>
    </div>
  );
}

// ─── Type Info ────────────────────────────────────────────────────────────────
function InfoContent({ message, tips, tipsOpen, setTipsOpen }) {
  return (
    <div className="flex items-start gap-3">
      <img
        src={AMANDA_ASSETS.character}
        alt="Amanda"
        style={{ width: 40, height: 46, objectFit: 'contain', flexShrink: 0 }}
      />
      <div className="flex-1 pt-1">
        <p className="text-xs font-bold mb-1" style={{ color: '#1e1b4b' }}>Amanda</p>
        <div className="rounded-2xl rounded-tl-sm px-4 py-3 space-y-2" style={{ background: '#EFF6FF', border: '1px solid #BFDBFE' }}>
          <p className="text-sm leading-relaxed" style={{ color: '#1E3A8A' }}>{message}</p>
          {tips && tips.length > 0 && (
            <>
              <button
                onClick={() => setTipsOpen?.(o => !o)}
                className="flex items-center gap-1 text-xs font-medium transition-colors"
                style={{ color: '#3B82F6' }}
              >
                💡 Quoi vérifier ? {tipsOpen ? '▲' : '▼'}
              </button>
              {tipsOpen && (
                <ul className="space-y-1 text-xs pl-1" style={{ color: '#1D4ED8' }}>
                  {tips.map((t, i) => (
                    <li key={i} className="flex items-start gap-1.5">
                      <span className="mt-0.5 shrink-0">•</span>{t}
                    </li>
                  ))}
                </ul>
              )}
            </>
          )}
        </div>
      </div>
    </div>
  );
}

// ─── Type Warning ─────────────────────────────────────────────────────────────
function WarningContent({ message }) {
  return (
    <div className="flex items-start gap-3">
      <img
        src={AMANDA_ASSETS.character}
        alt="Amanda"
        style={{ width: 40, height: 46, objectFit: 'contain', flexShrink: 0 }}
      />
      <div className="flex-1 pt-1">
        <p className="text-xs font-bold mb-1" style={{ color: '#92400E' }}>Amanda</p>
        <div className="rounded-2xl rounded-tl-sm px-4 py-3" style={{ background: '#FFFBEB', border: '1px solid #FCD34D' }}>
          <p className="text-sm leading-relaxed" style={{ color: '#78350F' }}>{message}</p>
        </div>
      </div>
    </div>
  );
}

// ─── Composant principal ──────────────────────────────────────────────────────
/**
 * @param {'celebration'|'processing'|'success'|'info'|'warning'} type
 * @param {string} message
 * @param {string[]} [tips]       — Pour type='info', liste de conseils dépliables
 * @param {function} [onClose]    — Pour type='celebration', bouton de fermeture
 * @param {boolean}  [modal]      — Affichage plein écran overlay (celebration seulement)
 * @param {string}   [className]
 */
export default function AmandaMessage({ type = 'info', message, tips, onClose, modal = false, className = '' }) {
  const [tipsOpen, setTipsOpen] = useState(false);

  const content = (() => {
    switch (type) {
      case 'celebration': return <CelebrationContent message={message} onClose={onClose} />;
      case 'processing':  return <ProcessingContent message={message} />;
      case 'success':     return <SuccessContent message={message} />;
      case 'warning':     return <WarningContent message={message} />;
      default:            return <InfoContent message={message} tips={tips} tipsOpen={tipsOpen} setTipsOpen={setTipsOpen} />;
    }
  })();

  if (modal && type === 'celebration') {
    return (
      <AnimatePresence>
        <motion.div
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          exit={{ opacity: 0 }}
          className="fixed inset-0 z-[80] flex items-center justify-center"
          style={{ background: 'rgba(30,27,75,0.55)', backdropFilter: 'blur(4px)' }}
          onClick={onClose}
        >
          <motion.div
            initial={{ scale: 0.8, opacity: 0 }}
            animate={{ scale: 1, opacity: 1 }}
            exit={{ scale: 0.8, opacity: 0 }}
            transition={{ type: 'spring', stiffness: 220, damping: 18 }}
            onClick={e => e.stopPropagation()}
            className="bg-white rounded-3xl shadow-2xl px-8 py-6 flex flex-col items-center"
            style={{ maxWidth: 340, border: '1.5px solid rgba(232,121,249,0.25)' }}
          >
            {content}
          </motion.div>
        </motion.div>
      </AnimatePresence>
    );
  }

  return (
    <div className={`w-full ${className}`}>
      {content}
    </div>
  );
}