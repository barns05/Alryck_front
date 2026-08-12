/**
 * DeadlineAlert — Compte à rebours dynamique (mise à jour chaque seconde)
 * Props: dateLimit (string ISO YYYY-MM-DD)
 * États : 'info' (> 2 jours) | 'urgence' (≤ 48h) | 'critique' (< 1h) | 'cloture' (expiré)
 */
import { useState, useEffect } from 'react';

function getSnapshot(dateLimit) {
  if (!dateLimit) return null;
  const now = new Date();
  const limit = new Date(dateLimit + 'T23:59:59');
  const diffMs = limit - now;

  if (diffMs <= 0) return { etat: 'cloture', diffMs: 0 };

  const totalSec = Math.floor(diffMs / 1000);
  const sec = totalSec % 60;
  const min = Math.floor(totalSec / 60) % 60;
  const hours = Math.floor(totalSec / 3600);
  const days = Math.floor(hours / 24);
  const remH = hours % 24;

  if (hours < 1) return { etat: 'critique', min, sec, diffMs };
  if (diffMs <= 48 * 3600 * 1000) return { etat: 'urgence', hours, min, days, remH, diffMs };
  return { etat: 'info', days, diffMs };
}

function formatDateLong(dateLimit) {
  return new Date(dateLimit + 'T12:00:00').toLocaleDateString('fr-FR', {
    day: 'numeric', month: 'long', year: 'numeric',
  });
}

export function getEtat(dateLimit) {
  const snap = getSnapshot(dateLimit);
  return snap?.etat ?? null;
}

export default function DeadlineAlert({ dateLimit }) {
  const [snap, setSnap] = useState(() => getSnapshot(dateLimit));

  useEffect(() => {
    if (!dateLimit) return;
    setSnap(getSnapshot(dateLimit));
    const id = setInterval(() => {
      const s = getSnapshot(dateLimit);
      setSnap(s);
    }, 1000);
    return () => clearInterval(id);
  }, [dateLimit]);

  if (!snap) return null;

  // ── Clôturé ──
  if (snap.etat === 'cloture') {
    return (
      <div className="min-h-screen flex items-center justify-center p-6"
        style={{ background: 'linear-gradient(135deg, #1e1b4b 0%, #312e81 100%)' }}>
        <div className="text-center max-w-sm bg-white/10 backdrop-blur rounded-3xl p-8 text-white">
          <div className="text-5xl mb-4">🔒</div>
          <h2 className="text-xl font-bold mb-3">Les réponses sont closes</h2>
          <p className="text-white/70 text-sm leading-relaxed">
            Veuillez contacter les organisateurs directement.
          </p>
        </div>
      </div>
    );
  }

  // ── Moins d'1h — rouge critique ──
  if (snap.etat === 'critique') {
    return (
      <div className="mx-4 mt-4 rounded-2xl border-2 border-red-300 bg-red-50 px-4 py-3 flex items-center gap-3">
        <span className="text-xl shrink-0">🚨</span>
        <div>
          <p className="text-sm font-bold text-red-800">
            Il vous reste {snap.min}min {snap.sec}s pour répondre
          </p>
          <p className="text-xs text-red-600 mt-0.5">
            Avant le {formatDateLong(dateLimit)}
          </p>
        </div>
      </div>
    );
  }

  // ── ≤ 48h — orange urgence ──
  if (snap.etat === 'urgence') {
    const label = snap.days >= 1
      ? `${snap.days}j ${snap.remH}h ${snap.min}min`
      : `${snap.hours}h ${snap.min}min`;
    return (
      <div className="mx-4 mt-4 rounded-2xl border-2 border-orange-300 bg-orange-50 px-4 py-3 flex items-center gap-3">
        <span className="text-xl shrink-0">⏰</span>
        <div>
          <p className="text-sm font-bold text-orange-800">
            Il vous reste {label} pour répondre
          </p>
          <p className="text-xs text-orange-600 mt-0.5">
            Avant le {formatDateLong(dateLimit)}
          </p>
        </div>
      </div>
    );
  }

  // ── > 2 jours — bleu discret ──
  return (
    <div className="mx-4 mt-4 rounded-2xl bg-blue-50 border border-blue-100 px-4 py-2.5 flex items-center gap-2">
      <span className="text-base">📅</span>
      <div>
        <p className="text-xs text-blue-700 font-semibold">
          Il vous reste {snap.days} jour{snap.days > 1 ? 's' : ''} pour répondre
        </p>
        <p className="text-[11px] text-blue-500 mt-0.5">
          Avant le {formatDateLong(dateLimit)}
        </p>
      </div>
    </div>
  );
}