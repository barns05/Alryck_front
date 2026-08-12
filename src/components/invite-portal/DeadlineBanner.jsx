/**
 * DeadlineBanner — Bandeau compact date limite RSVP
 * Affiché dans les formulaires de détail (RSVPModeLibre, RSVPModeNominatif)
 * Props: dateLimit (string YYYY-MM-DD | null | undefined)
 */
import { useState, useEffect } from 'react';

function computeState(dateLimit) {
  if (!dateLimit) return null;
  const now = new Date();
  const limit = new Date(dateLimit + 'T23:59:59');
  const diffMs = limit - now;
  if (diffMs <= 0) return { type: 'expired' };
  const days = Math.floor(diffMs / (1000 * 60 * 60 * 24));
  const hours = Math.floor(diffMs / (1000 * 60 * 60));
  if (hours < 1) {
    const min = Math.floor(diffMs / (1000 * 60));
    return { type: 'critical', label: `${min} minute${min > 1 ? 's' : ''}` };
  }
  if (days === 0) return { type: 'urgent', label: `${hours}h` };
  if (days <= 2) return { type: 'urgent', label: `${days} jour${days > 1 ? 's' : ''}` };
  return { type: 'info', days };
}

function formatDate(dateLimit) {
  return new Date(dateLimit + 'T12:00:00').toLocaleDateString('fr-FR', {
    day: 'numeric', month: 'long', year: 'numeric',
  });
}

export default function DeadlineBanner({ dateLimit }) {
  const [state, setState] = useState(() => computeState(dateLimit));

  useEffect(() => {
    if (!dateLimit) return;
    setState(computeState(dateLimit));
    const id = setInterval(() => setState(computeState(dateLimit)), 30000);
    return () => clearInterval(id);
  }, [dateLimit]);

  if (!state) return null;

  if (state.type === 'expired') {
    return (
      <div className="rounded-2xl border border-slate-200 bg-slate-50 px-4 py-3 flex items-start gap-2 text-sm">
        <span className="shrink-0">⌛</span>
        <p className="text-slate-600 leading-snug">
          La date limite de réponse est dépassée.{' '}
          <span className="font-medium">Contactez l'organisateur si besoin.</span>
        </p>
      </div>
    );
  }

  if (state.type === 'critical' || state.type === 'urgent') {
    return (
      <div className="rounded-2xl border-2 border-orange-200 bg-orange-50 px-4 py-3 flex items-center gap-3">
        <span className="text-xl shrink-0">⏰</span>
        <div>
          <p className="text-sm font-bold text-orange-800">
            Plus que {state.label} pour répondre !
          </p>
          <p className="text-xs text-orange-600 mt-0.5">
            Réponse souhaitée avant le {formatDate(dateLimit)}
          </p>
        </div>
      </div>
    );
  }

  // type === 'info'
  return (
    <div className="rounded-2xl bg-blue-50 border border-blue-100 px-4 py-2.5 flex items-center gap-2">
      <span className="text-base shrink-0">📅</span>
      <p className="text-xs text-blue-700 leading-snug">
        Réponse souhaitée avant le{' '}
        <span className="font-semibold">{formatDate(dateLimit)}</span>
        {state.days && state.days <= 7 && (
          <span className="text-blue-500"> · encore {state.days} jour{state.days > 1 ? 's' : ''}</span>
        )}
      </p>
    </div>
  );
}