/**
 * Page de test des composants animés — accessible uniquement en preview Base44.
 * Route : /test-animations
 */
import { useState } from 'react';
import AmandaMessage, { AMANDA_ASSETS } from '@/components/AmandaMessage.jsx';
import AmandaProcessing from '@/components/AmandaProcessing.jsx';
import LoadingCristal from '@/components/LoadingCristal.jsx';

const NAVY = '#1e1b4b';

const TYPES = [
  { type: 'celebration', label: '🎉 Celebration', msg: 'Félicitations ! La conversion a été réalisée avec succès. Votre client est maintenant dans l\'espace client.' },
  { type: 'processing',  label: '⏳ Processing',  msg: 'Amanda traite votre document… Extraction des informations en cours, merci de patienter.' },
  { type: 'success',     label: '✅ Success',     msg: 'Le questionnaire a été généré depuis votre formule ! Vérifiez-le et ajustez si besoin.' },
  { type: 'info',        label: 'ℹ️ Info',        msg: 'J\'ai analysé votre document et préparé 42 articles répartis dans 3 formules ! Jetez un œil aux catégories avant de valider.', tips: ['Vérifiez les noms des articles', 'Contrôlez les allergènes détectés', 'Assurez-vous que les catégories sont correctes'] },
  { type: 'warning',     label: '⚠️ Warning',     msg: 'Certaines questions n\'ont pas pu être générées. Vérifiez la configuration de votre formule avant de relancer.' },
];

export default function TestAnimations() {
  const [activeType, setActiveType] = useState(null);
  const [celebrationOpen, setCelebrationOpen] = useState(false);

  const handleSplashReplay = () => {
    sessionStorage.removeItem('alryck_splash_shown');
    window.location.reload();
  };

  const handleTypeClick = (type) => {
    if (type === 'celebration') {
      setCelebrationOpen(true);
      setActiveType(null);
    } else {
      setActiveType(prev => prev === type ? null : type);
      setCelebrationOpen(false);
    }
  };

  const activeItem = TYPES.find(t => t.type === activeType);

  return (
    <div className="min-h-screen p-6 space-y-10" style={{ background: '#f8f9fb' }}>
      {/* Header */}
      <div className="max-w-2xl mx-auto">
        <div className="flex items-center gap-3 mb-1">
          <div className="w-8 h-8 rounded-lg flex items-center justify-center text-lg" style={{ background: NAVY }}>🧪</div>
          <h1 className="text-xl font-bold" style={{ color: NAVY }}>Page de test — Composants animés</h1>
        </div>
        <p className="text-sm text-slate-500">Accessible uniquement en préview Base44. Ne pas inclure en production.</p>
      </div>

      <div className="max-w-2xl mx-auto space-y-8">

        {/* ── SECTION SPLASH SCREEN ─────────────────────────────────── */}
        <Section title="Splash Screen">
          <button
            onClick={handleSplashReplay}
            className="px-5 py-2.5 rounded-xl text-sm font-semibold text-white transition-all hover:opacity-90 active:scale-95"
            style={{ background: NAVY }}
          >
            ▶ Rejouer le splash screen
          </button>
          <p className="text-xs text-slate-400 mt-2">Efface sessionStorage et recharge la page.</p>
        </Section>

        {/* ── SECTION Amanda — 5 TYPES ──────────────────────────────── */}
        <Section title="Amanda — 5 types de message">
          <div className="flex flex-wrap gap-2 mb-4">
            {TYPES.map(({ type, label }) => (
              <button
                key={type}
                onClick={() => handleTypeClick(type)}
                className={`px-4 py-2 rounded-xl text-sm font-medium border-2 transition-all active:scale-95
                  ${(activeType === type || (type === 'celebration' && celebrationOpen))
                    ? 'border-indigo-500 bg-indigo-50 text-indigo-700'
                    : 'border-slate-200 bg-white text-slate-700 hover:border-indigo-300'}`}
              >
                {label}
              </button>
            ))}
          </div>

          {/* Rendu inline pour les types non-modal */}
          {activeItem && (
            <div className="bg-white rounded-2xl border border-slate-200 p-4 shadow-sm">
              <AmandaMessage
                type={activeItem.type}
                message={activeItem.msg}
                tips={activeItem.tips}
              />
            </div>
          )}

          {/* Modal celebration */}
          {celebrationOpen && (
            <AmandaMessage
              type="celebration"
              modal
              message="Félicitations ! La conversion a été réalisée avec succès. Votre client dispose maintenant de son espace client."
              onClose={() => setCelebrationOpen(false)}
            />
          )}
        </Section>

        {/* ── SECTION AMANDA PROCESSING ────────────────────────────── */}
        <Section title="AmandaProcessing — 3 tailles (pulse + orbite)">
          <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
            {['sm', 'md', 'lg'].map(size => (
              <div key={size} className="space-y-2">
                <p className="text-xs font-medium text-slate-500">{size}</p>
                <div className="rounded-xl border border-slate-200 bg-white p-3 flex items-center justify-center min-h-[140px]">
                  <AmandaProcessing size={size} variant="light" message="Amanda traite votre document…" />
                </div>
              </div>
            ))}
          </div>
        </Section>

        {/* ── SECTION LOADING CRISTAL ──────────────────────────────── */}
        <Section title="Loading Cristal — 3 tailles">
          <div className="flex items-end gap-10 flex-wrap py-4 px-4 rounded-2xl">
            <div className="flex flex-col items-center gap-3">
              <LoadingCristal size={32} />
              <p className="text-xs font-medium text-slate-500">Small — 32px</p>
            </div>
            <div className="flex flex-col items-center gap-3">
              <LoadingCristal size={56} />
              <p className="text-xs font-medium text-slate-500">Medium — 56px</p>
            </div>
            <div className="flex flex-col items-center gap-3">
              <LoadingCristal size={96} label="Chargement…" />
              <p className="text-xs font-medium text-slate-500">Large — 96px + label</p>
            </div>
          </div>
        </Section>

        {/* ── SECTION AVATAR CHAT ──────────────────────────────────── */}
        <Section title="Avatar Amanda — Bulle chat">
          <div className="bg-white rounded-2xl border border-slate-200 p-4 shadow-sm space-y-4">
            {/* Type success */}
            <AmandaMessage type="success" message="Le questionnaire a été généré avec succès ! Vérifiez-le avant de l'envoyer à votre client." />
            {/* Type info */}
            <AmandaMessage type="info" message="J'ai détecté 3 formules dans votre brochure. Jetez un œil aux catégories avant de valider !" />
            {/* Type warning */}
            <AmandaMessage type="warning" message="Certaines questions n'ont pas pu être générées automatiquement. Vérifiez la configuration." />
          </div>
          <p className="text-xs text-slate-400 mt-2">
            Avatar actuel : <code className="bg-slate-100 px-1 rounded text-[10px]">b40a205d7_1B1C326A…</code>
          </p>
          <div className="mt-3 flex items-center gap-3">
            <img
              src={AMANDA_ASSETS.character}
              alt="Amanda"
              style={{ width: 60, height: 68, objectFit: 'contain' }}
              className="rounded-lg border border-slate-200 bg-white p-1"
            />
            <div className="text-xs text-slate-500 space-y-1">
              <p><strong>character</strong> — utilisé dans Success / Info / Warning / Celebration</p>
              <p><strong>crystalAlryck</strong> — utilisé dans Processing</p>
            </div>
            <img
              src={AMANDA_ASSETS.crystalAlryck}
              alt="cristal"
              style={{ width: 40, height: 40, objectFit: 'contain' }}
              className="rounded-lg border border-slate-200 bg-white p-1"
            />
          </div>
        </Section>

      </div>
    </div>
  );
}

function Section({ title, children }) {
  return (
    <div className="bg-white rounded-2xl border border-slate-200 shadow-sm overflow-hidden">
      <div className="px-5 py-3 border-b border-slate-100" style={{ background: '#f1f0fc' }}>
        <h2 className="text-sm font-bold" style={{ color: NAVY }}>{title}</h2>
      </div>
      <div className="p-5">{children}</div>
    </div>
  );
}