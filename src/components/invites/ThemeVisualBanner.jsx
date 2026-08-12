/**
 * ThemeVisualBanner — Carte pleine largeur « Thème visuel »
 * Même style premium que la bannière Programme du Jour J (fond dégradé navy, particules dorées, coins arrondis).
 * Toute la carte est cliquable et ouvre le sélecteur de thème.
 * Props: themeName (string), onClick
 */
import { motion } from 'framer-motion';
import { Palette, ChevronRight, Sparkles } from 'lucide-react';

export default function ThemeVisualBanner({ themeName, onClick, title = 'Thème visuel', subtitle, icon }) {
  return (
    <motion.button
      whileTap={{ scale: 0.985 }}
      whileHover={{ boxShadow: '0 20px 50px rgba(15,21,53,0.55)' }}
      onClick={onClick}
      className="relative w-full text-left rounded-2xl overflow-hidden"
      style={{
        background: 'linear-gradient(135deg, #0B1130 0%, #101640 40%, #1B2558 100%)',
        border: '2.5px solid rgba(130,195,255,0.50)',
        padding: '28px 24px',
        minHeight: 115,
        boxShadow: '0 8px 30px rgba(15,21,53,0.35), 0 0 28px rgba(99,165,255,0.15)',
      }}
    >
      {/* Halo satiné */}
      <div style={{
        position: 'absolute', inset: 0,
        background: 'radial-gradient(ellipse at 25% 15%, rgba(99,102,241,0.16) 0%, transparent 55%), radial-gradient(ellipse at 80% 85%, rgba(59,130,246,0.06) 0%, transparent 50%)',
        pointerEvents: 'none',
      }} />
      {/* Voile diagonal satiné */}
      <div style={{
        position: 'absolute', inset: 0,
        background: 'linear-gradient(120deg, rgba(255,255,255,0.06) 0%, transparent 35%, rgba(255,255,255,0.03) 70%, rgba(255,255,255,0.05) 100%)',
        pointerEvents: 'none',
      }} />
      {/* Voile lumineux central */}
      <div style={{
        position: 'absolute', inset: 0,
        background: 'radial-gradient(ellipse at 50% 45%, rgba(99,165,255,0.05) 0%, transparent 60%)',
        pointerEvents: 'none',
      }} />

      {/* Particules dorées statiques */}
      {[
        { t: '14%', r: '12%', s: 3, a: 0.45 },
        { t: '24%', r: '22%', s: 2, a: 0.35 },
        { t: '10%', r: '26%', s: 2, a: 0.28 },
        { t: '32%', r: '8%',  s: 2, a: 0.22 },
        { t: '20%', r: '34%', s: 1.5, a: 0.20 },
        { t: '8%',  r: '18%', s: 1.5, a: 0.25 },
        { t: '28%', r: '30%', s: 1.5, a: 0.18 },
        { t: '16%', r: '40%', s: 1.5, a: 0.15 },
        { t: '36%', r: '16%', s: 1, a: 0.16 },
        { t: '6%',  r: '34%', s: 2.5, a: 0.22 },
        { t: '5%',  r: '10%', s: 1, a: 0.11 },
        { t: '11%', r: '6%',  s: 1.5, a: 0.14 },
        { t: '20%', r: '5%',  s: 1, a: 0.10 },
        { t: '27%', r: '12%', s: 1, a: 0.09 },
      ].map((p, i) => (
        <div key={`p-${i}`} style={{
          position: 'absolute', top: p.t, right: p.r,
          width: p.s, height: p.s, borderRadius: '50%',
          background: `rgba(212,175,55,${p.a})`,
          pointerEvents: 'none',
        }} />
      ))}

      {/* Étoiles scintillantes animées */}
      <motion.div
        animate={{ opacity: [0.5, 1, 0.5], scale: [0.9, 1.15, 0.9] }}
        transition={{ duration: 3.5, repeat: Infinity, ease: 'easeInOut' }}
        style={{
          position: 'absolute', top: '12%', right: '14%',
          width: 4, height: 4, borderRadius: '50%',
          background: 'rgba(232,197,110,0.7)',
          boxShadow: '0 0 6px rgba(212,175,55,0.5), 0 0 12px rgba(212,175,55,0.25)',
          pointerEvents: 'none',
        }}
      />
      <motion.div
        animate={{ opacity: [0.4, 0.9, 0.4], scale: [0.85, 1.1, 0.85] }}
        transition={{ duration: 4.2, repeat: Infinity, ease: 'easeInOut', delay: 0.8 }}
        style={{
          position: 'absolute', top: '22%', right: '38%',
          width: 3.5, height: 3.5, borderRadius: '50%',
          background: 'rgba(232,197,110,0.55)',
          boxShadow: '0 0 5px rgba(212,175,55,0.35)',
          pointerEvents: 'none',
        }}
      />
      <motion.div
        animate={{ opacity: [0.35, 0.85, 0.35], scale: [0.8, 1.05, 0.8] }}
        transition={{ duration: 5, repeat: Infinity, ease: 'easeInOut', delay: 1.5 }}
        style={{
          position: 'absolute', top: '8%', right: '28%',
          width: 3, height: 3, borderRadius: '50%',
          background: 'rgba(232,197,110,0.5)',
          boxShadow: '0 0 4px rgba(212,175,55,0.3)',
          pointerEvents: 'none',
        }}
      />

      {/* Contenu */}
      <div className="relative z-10 flex items-center gap-4">
        <div className="shrink-0 w-11 h-11 rounded-xl flex items-center justify-center relative"
          style={{
            background: 'linear-gradient(135deg, rgba(212,175,55,0.18) 0%, rgba(212,175,55,0.06) 100%)',
            border: '1px solid rgba(212,175,55,0.30)',
            boxShadow: 'inset 0 1px 2px rgba(255,255,255,0.08), 0 0 28px rgba(212,175,55,0.34)',
          }}>
          <div style={{
            position: 'absolute', inset: -10,
            borderRadius: '50%',
            background: 'radial-gradient(circle, rgba(212,175,55,0.22) 0%, transparent 70%)',
            pointerEvents: 'none',
          }} />
          {icon === 'sparkles' ? <Sparkles size={22} style={{ color: '#f0d98a' }} /> : <Palette size={22} style={{ color: '#f0d98a' }} />}
        </div>
        <div className="space-y-0.5 flex-1 min-w-0">
          <p className="font-bold text-[17px] leading-tight text-white" style={{ letterSpacing: '-0.01em' }}>{title}</p>
          <p className="text-xs" style={{ color: '#e8d5b5' }}>
            {subtitle || `${themeName || 'Navy'} — touchez pour changer`}
          </p>
        </div>
        <ChevronRight size={20} className="shrink-0 relative z-10" style={{ color: 'rgba(232,197,110,0.7)' }} />
      </div>
    </motion.button>
  );
}