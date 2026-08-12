/**
 * Onglet de test — visible UNIQUEMENT en mode preview Base44.
 * Détection : hostname contient "preview-sandbox" ou "view--"
 */
import { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import AmandaMessage, { AMANDA_ASSETS } from '@/components/AmandaMessage.jsx';
import AmandaProcessing from '@/components/AmandaProcessing.jsx';
import LoadingCristal from '@/components/LoadingCristal.jsx';

const NAVY = '#1e1b4b';

const AMANDA_TYPES = [
  { type: 'celebration', label: '🎉 Celebration', msg: 'Félicitations ! La conversion a été réalisée avec succès.' },
  { type: 'processing',  label: '⏳ Processing',  msg: 'Amanda traite votre document… Extraction en cours.' },
  { type: 'success',     label: '✅ Success',     msg: 'Le questionnaire a été généré depuis votre formule !' },
  { type: 'info',        label: 'ℹ️ Info',        msg: 'J\'ai analysé votre brochure et préparé 42 articles.', tips: ['Vérifiez les noms', 'Contrôlez les allergènes', 'Vérifiez les catégories'] },
  { type: 'warning',     label: '⚠️ Warning',     msg: 'Certaines questions n\'ont pas pu être générées automatiquement.' },
];

export default function DashboardTestTab() {
  return <TestTabContent />;
}

function TestTabContent() {
  const navigate = useNavigate();
  const [activeAmanda, setActiveAmanda] = useState(null);
  const [celebOpen, setCelebOpen] = useState(false);

  const handleAmanda = (type) => {
    if (type === 'celebration') {
      setCelebOpen(true);
      setActiveAmanda(null);
    } else {
      setActiveAmanda(prev => prev === type ? null : type);
      setCelebOpen(false);
    }
  };

  const handleSplash = () => {
    sessionStorage.removeItem('alryck_splash_shown');
    window.location.reload();
  };

  const activeItem = AMANDA_TYPES.find(t => t.type === activeAmanda);

  return (
    <div className="space-y-5">
      {/* Badge preview */}
      <div className="flex items-center gap-2 px-3 py-1.5 rounded-lg w-fit text-xs font-semibold" style={{ background: 'rgba(99,102,241,0.12)', color: '#4F46E5' }}>
        🧪 Mode preview — onglet test uniquement
      </div>

      {/* ── SPLASH SCREEN ──────────────────────────── */}
      <Block title="Splash Screen">
        <button
          onClick={handleSplash}
          className="px-4 py-2 rounded-xl text-sm font-semibold text-white transition-all hover:opacity-90 active:scale-95"
          style={{ background: NAVY }}
        >
          ▶ Rejouer le splash screen
        </button>
        <p className="text-xs text-slate-400 mt-1.5">Efface sessionStorage et recharge la page.</p>
      </Block>

      {/* ── PAGE INSCRIPTION ───────────────────────── */}
      <Block title="Page Inscription / Onboarding">
        <div className="flex flex-wrap gap-2">
          <a
            href="/register"
            target="_blank"
            rel="noopener noreferrer"
            className="px-4 py-2 rounded-xl text-sm font-semibold border-2 border-indigo-300 text-indigo-700 bg-indigo-50 hover:bg-indigo-100 transition-all"
          >
            🔗 Ouvrir /register dans un nouvel onglet
          </a>
          <button
            onClick={() => navigate('/register')}
            className="px-4 py-2 rounded-xl text-sm font-semibold border-2 border-slate-200 text-slate-700 bg-white hover:border-indigo-300 transition-all"
          >
            → Naviguer vers /register
          </button>
        </div>
      </Block>

      {/* ── Amanda — 5 TYPES ────────────────────────── */}
      <Block title="Amanda — 5 types de message">
        <div className="flex flex-wrap gap-2 mb-3">
          {AMANDA_TYPES.map(({ type, label }) => (
            <button
              key={type}
              onClick={() => handleAmanda(type)}
              className={`px-3 py-1.5 rounded-xl text-xs font-medium border-2 transition-all active:scale-95
                ${(activeAmanda === type || (type === 'celebration' && celebOpen))
                  ? 'border-indigo-500 bg-indigo-50 text-indigo-700'
                  : 'border-slate-200 bg-white text-slate-700 hover:border-indigo-300'}`}
            >
              {label}
            </button>
          ))}
        </div>
        {activeItem && (
          <div className="bg-white rounded-xl border border-slate-200 p-3 shadow-sm">
            <AmandaMessage type={activeItem.type} message={activeItem.msg} tips={activeItem.tips} />
          </div>
        )}
        {celebOpen && (
          <AmandaMessage
            type="celebration"
            modal
            message="Félicitations ! La conversion a été réalisée avec succès."
            onClose={() => setCelebOpen(false)}
          />
        )}
      </Block>

      {/* ── AmandaProcessing — 3 TAILLES (pulse) ─── */}
      <Block title="AmandaProcessing — 3 tailles (pulse)">
        <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
          {['sm', 'md', 'lg'].map(size => (
            <div key={size} className="space-y-2">
              <p className="text-[11px] font-bold uppercase tracking-wide text-slate-400">{size}</p>
              <div className="rounded-xl border border-slate-200 bg-white p-3 flex items-center justify-center min-h-[140px]">
                <AmandaProcessing size={size} variant="light" message="Amanda traite votre document…" />
              </div>
            </div>
          ))}
        </div>
      </Block>

      {/* ── LOADING CRISTAL ────────────────────────── */}
      <Block title="Loading Cristal — 3 tailles">
        <div className="flex items-end gap-8 flex-wrap py-4 px-4 rounded-xl" style={{ background: 'transparent' }}>
          <div className="flex flex-col items-center gap-2">
            <LoadingCristal size={28} />
            <p className="text-[10px] font-medium text-slate-500">Small</p>
          </div>
          <div className="flex flex-col items-center gap-2">
            <LoadingCristal size={52} />
            <p className="text-[10px] font-medium text-slate-500">Medium</p>
          </div>
          <div className="flex flex-col items-center gap-2">
            <LoadingCristal size={88} label="Chargement…" />
            <p className="text-[10px] font-medium text-slate-500">Large</p>
          </div>
        </div>
      </Block>

      {/* ── AVATAR CHAT ────────────────────────────── */}
      <Block title="Avatar Amanda — Bulle chat">
        <div className="bg-white rounded-xl border border-slate-200 p-3 shadow-sm space-y-3">
          <AmandaMessage type="success" message="Le questionnaire a été généré avec succès ! Vérifiez-le avant de l'envoyer." />
          <AmandaMessage type="info" message="J'ai détecté 3 formules dans votre brochure. Jetez un œil avant de valider !" />
        </div>
        <div className="flex items-center gap-3 mt-3">
          <img src={AMANDA_ASSETS.character} alt="Amanda character" style={{ width: 48, height: 54, objectFit: 'contain' }} className="rounded-lg border border-slate-200 bg-white p-1" />
          <img src={AMANDA_ASSETS.crystalAlryck} alt="Amanda cristal" style={{ width: 36, height: 36, objectFit: 'contain' }} className="rounded-lg border border-slate-200 bg-white p-1" />
          <p className="text-xs text-slate-400">character · crystalAlryck</p>
        </div>
      </Block>
    </div>
  );
}

function Block({ title, children }) {
  return (
    <div className="bg-card rounded-2xl border border-border shadow-sm overflow-hidden">
      <div className="px-4 py-2.5 border-b border-border" style={{ background: '#f1f0fc' }}>
        <p className="text-xs font-bold" style={{ color: NAVY }}>{title}</p>
      </div>
      <div className="p-4">{children}</div>
    </div>
  );
}