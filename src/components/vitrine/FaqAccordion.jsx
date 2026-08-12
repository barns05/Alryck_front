/**
 * FaqAccordion — Affichage public de la FAQ sur la fiche découverte.
 *
 * Point d'entrée discret « Voir la FAQ (N) » qui révèle toute la section au clic
 * (expand/collapse global). Chaque question conserve son propre accordéon natif
 * <details>/<summary> (fiable sur iOS, sans transform ni JS).
 * N'affiche que les items ayant une question ET une réponse non vides.
 * Renvoie null si la FAQ est vide ou non renseignée (section masquée).
 */
import { useState } from 'react';
import { ChevronDown } from 'lucide-react';

export default function FaqAccordion({ faq }) {
  const items = (Array.isArray(faq) ? faq : []).filter(
    (f) => f.question && f.question.trim() && f.reponse && f.reponse.trim()
  );
  const [open, setOpen] = useState(false);
  if (items.length === 0) return null;

  return (
    <div className="bg-white border border-border rounded-2xl overflow-hidden">
      <button
        type="button"
        onClick={() => setOpen((v) => !v)}
        className="w-full flex items-center justify-between gap-3 px-4 py-3 text-left hover:bg-muted/40 transition-colors"
      >
        <span className="text-sm font-semibold text-slate-800">❓ Voir la FAQ ({items.length})</span>
        <ChevronDown size={18} className={`shrink-0 text-slate-400 transition-transform duration-200 ${open ? 'rotate-180' : ''}`} />
      </button>
      {open && (
        <div className="px-4 pb-3 pt-1 divide-y divide-border">
          {items.map((f, i) => (
            <details key={i} className="group py-2.5 first:pt-1.5 last:pb-1">
              <summary className="flex items-center justify-between gap-3 cursor-pointer list-none select-none">
                <span className="text-sm font-semibold text-slate-800 leading-snug">{f.question}</span>
                <ChevronDown size={16} className="shrink-0 text-slate-400 transition-transform duration-200 group-open:rotate-180" />
              </summary>
              <p className="text-sm text-slate-600 leading-relaxed mt-2 whitespace-pre-line">{f.reponse}</p>
            </details>
          ))}
        </div>
      )}
    </div>
  );
}