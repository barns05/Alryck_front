/**
 * OnboardingOverlay — Onboarding guidé plein écran pour l'espace client.
 *
 * Overlay sombre avec un "trou" découpé (spotlight) mettant en valeur un seul
 * élément à la fois, accompagné d'une bulle d'explication.
 *
 * Props:
 *  - steps: [{ target, text, preSwitch? }]
 *      target: valeur de l'attribut data-onboarding-target de l'élément à mettre en valeur
 *      text: message affiché dans la bulle
 *      preSwitch: (optionnel) data-onboarding-target d'un bouton d'onglet à cliquer
 *                 automatiquement avant de mettre en valeur la cible (ex: changer d'onglet)
 *  - onComplete: callback appelé à la fin (dernière étape validée)
 *  - onSkip: callback appelé quand l'utilisateur passe l'onboarding
 */
import { useState, useEffect, useLayoutEffect, useCallback } from 'react';
import { createPortal } from 'react-dom';
import { motion } from 'framer-motion';
import { ChevronLeft, ChevronRight, X } from 'lucide-react';

const PAD = 10;

export default function OnboardingOverlay({ steps, onComplete, onSkip }) {
  const [stepIndex, setStepIndex] = useState(0);
  const [rect, setRect] = useState(null);
  const step = steps[stepIndex];

  const measure = useCallback(() => {
    const sel = step?.target;
    if (!sel) { setRect(null); return; }
    const el = document.querySelector(`[data-onboarding-target="${sel}"]`);
    if (!el) { setRect(null); return; }
    const r = el.getBoundingClientRect();
    if (r.width === 0 || r.height === 0) { setRect(null); return; }
    setRect({ top: r.top, left: r.left, width: r.width, height: r.height });
  }, [step?.target]);

  // Changement d'étape : preSwitch (clic d'onglet programmatique) avant la mesure
  useEffect(() => {
    if (step?.preSwitch) {
      const btn = document.querySelector(`[data-onboarding-target="${step.preSwitch}"]`);
      if (btn) btn.click();
    }
  }, [stepIndex, step?.preSwitch]);

  // Mesure de la cible : immédiate + différée (render après preSwitch)
  useLayoutEffect(() => {
    measure();
    const t1 = setTimeout(measure, 120);
    const t2 = setTimeout(measure, 450);
    return () => { clearTimeout(t1); clearTimeout(t2); };
  }, [stepIndex, measure]);

  // Recalcul sur resize / scroll
  useEffect(() => {
    const onResize = () => measure();
    const onScroll = () => measure();
    window.addEventListener('resize', onResize);
    window.addEventListener('scroll', onScroll, true);
    return () => {
      window.removeEventListener('resize', onResize);
      window.removeEventListener('scroll', onScroll, true);
    };
  }, [measure]);

  const handleNext = () => {
    if (stepIndex < steps.length - 1) setStepIndex(i => i + 1);
    else onComplete();
  };
  const handlePrev = () => { if (stepIndex > 0) setStepIndex(i => i - 1); };

  // Positionnement de la bulle
  let bubbleStyle = { left: '50%', top: '50%', transform: 'translate(-50%, -50%)' };
  if (rect) {
    const isUpper = rect.top + rect.height / 2 < window.innerHeight * 0.55;
    const bubbleW = Math.min(300, window.innerWidth - 32);
    const left = Math.max(16, Math.min(window.innerWidth - bubbleW - 16, rect.left + rect.width / 2 - bubbleW / 2));
    bubbleStyle = isUpper
      ? { left, top: rect.bottom + PAD + 14, width: bubbleW, transform: 'none' }
      : { left, top: Math.max(16, rect.top - PAD - 14 - 170), width: bubbleW, transform: 'none' };
  }

  const holeStyle = rect ? {
    position: 'fixed',
    top: rect.top - PAD,
    left: rect.left - PAD,
    width: rect.width + PAD * 2,
    height: rect.height + PAD * 2,
    borderRadius: 16,
    boxShadow: '0 0 0 9999px rgba(15,23,42,0.72)',
    border: '2px solid #C5A059',
    transition: 'all 0.3s cubic-bezier(0.4,0,0.2,1)',
    pointerEvents: 'none',
  } : null;

  return createPortal(
    <div className="fixed inset-0" style={{ zIndex: 10050 }}>
      {/* Spotlight (box-shadow géant = masque sombre autour du trou) */}
      {holeStyle && <div style={holeStyle} />}

      {/* Bulle d'explication */}
      <motion.div
        key={stepIndex}
        initial={{ opacity: 0, y: 8 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ duration: 0.2 }}
        style={{
          position: 'fixed',
          background: '#ffffff',
          borderRadius: 18,
          padding: '16px 16px 14px',
          boxShadow: '0 12px 40px rgba(0,0,0,0.35)',
          zIndex: 10052,
          ...bubbleStyle,
        }}
      >
        <div className="flex items-start gap-2.5 mb-3">
          <span className="shrink-0 mt-0.5 w-6 h-6 rounded-full flex items-center justify-center text-xs font-bold"
            style={{ background: '#1e1b4b', color: '#C5A059' }}>
            {stepIndex + 1}
          </span>
          <p className="text-sm leading-relaxed" style={{ color: '#1e1b4b' }}>{step?.text}</p>
        </div>
        <div className="flex items-center justify-between gap-2">
          <button onClick={onSkip} className="text-xs font-medium transition-colors hover:opacity-70" style={{ color: '#94a3b8' }}>
            Passer
          </button>
          <div className="flex items-center gap-2">
            {stepIndex > 0 && (
              <button onClick={handlePrev}
                className="w-9 h-9 rounded-xl flex items-center justify-center transition-colors hover:bg-slate-100"
                style={{ color: '#1e1b4b' }}>
                <ChevronLeft size={18} />
              </button>
            )}
            <button onClick={handleNext}
              className="flex items-center gap-1.5 px-4 h-9 rounded-xl text-sm font-semibold transition-all active:scale-95"
              style={{ background: 'linear-gradient(135deg, #1e1b4b 0%, #C5A059 100%)', color: '#ffffff' }}>
              {stepIndex === steps.length - 1 ? 'Terminer' : 'Suivant'}
              {stepIndex !== steps.length - 1 && <ChevronRight size={15} />}
            </button>
          </div>
        </div>
      </motion.div>

      {/* Bouton fermeture haut droite */}
      <button onClick={onSkip}
        className="fixed top-4 right-4 w-9 h-9 rounded-full flex items-center justify-center transition-colors hover:opacity-90"
        style={{ background: 'rgba(255,255,255,0.14)', color: '#ffffff', zIndex: 10053, backdropFilter: 'blur(4px)' }}>
        <X size={16} />
      </button>
    </div>,
    document.body
  );
}