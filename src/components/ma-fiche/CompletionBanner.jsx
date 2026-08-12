/**
 * CompletionBanner — Bandeau discret affichant les champs manquants d'une section.
 * Rien ne s'affiche si la section est à 100%.
 */
import { AlertCircle } from 'lucide-react';

export default function CompletionBanner({ section }) {
  if (!section || section.percentage >= 100) return null;
  const missing = section.missing || [];
  if (missing.length === 0) return null;

  return (
    <div className="rounded-xl border px-4 py-3 space-y-2" style={{ background: '#FFFBF0', borderColor: 'rgba(197,160,89,0.3)' }}>
      <div className="flex items-center gap-2">
        <AlertCircle size={14} style={{ color: '#9a7b1f' }} className="shrink-0" />
        <span className="text-xs font-semibold" style={{ color: '#9a7b1f' }}>
          {section.percentage}% complété — il manque :
        </span>
      </div>
      <div className="flex flex-wrap gap-1.5">
        {missing.map((label, i) => (
          <span key={i} className="text-[11px] px-2 py-0.5 rounded-full" style={{ background: 'rgba(197,160,89,0.12)', color: '#7a5f1a' }}>
            {label}
          </span>
        ))}
      </div>
    </div>
  );
}