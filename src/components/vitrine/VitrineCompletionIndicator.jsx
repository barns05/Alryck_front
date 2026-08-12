/**
 * VitrineCompletionIndicator — Barre de progression + détail des champs manquants.
 */
import { useState } from 'react';
import { ChevronDown, ChevronUp } from 'lucide-react';

const COLOR_MAP = {
  red: { bar: 'bg-red-500', text: 'text-red-600', bg: 'bg-red-50', border: 'border-red-200' },
  orange: { bar: 'bg-orange-500', text: 'text-orange-600', bg: 'bg-orange-50', border: 'border-orange-200' },
  green: { bar: 'bg-emerald-500', text: 'text-emerald-600', bg: 'bg-emerald-50', border: 'border-emerald-200' },
};

export default function VitrineCompletionIndicator({ completion }) {
  const [expanded, setExpanded] = useState(false);

  if (completion?.isLoading) {
    return (
      <div className="rounded-2xl border border-border bg-muted/30 p-4 space-y-3 animate-pulse">
        <div className="flex items-center gap-2">
          <div className="h-4 w-8 rounded bg-muted" />
          <div className="h-3 w-24 rounded bg-muted" />
        </div>
        <div className="h-2 rounded-full bg-muted overflow-hidden" />
      </div>
    );
  }

  if (!completion?.ready) return null;

  const c = COLOR_MAP[completion.color] || COLOR_MAP.red;
  const missing = completion.missingFields || [];

  return (
    <div className={`rounded-2xl border ${c.border} ${c.bg} p-4 space-y-3`}>
      <div className="flex items-center justify-between gap-3">
        <div className="flex items-center gap-2 min-w-0">
          <span className={`text-sm font-bold ${c.text}`}>{completion.percentage}%</span>
          <span className="text-xs text-muted-foreground truncate">— {completion.label}</span>
        </div>
        {missing.length > 0 && (
          <button
            onClick={() => setExpanded(v => !v)}
            className="flex items-center gap-1 text-xs font-medium text-muted-foreground hover:text-foreground transition-colors shrink-0"
          >
            {missing.length} à compléter
            {expanded ? <ChevronUp size={14} /> : <ChevronDown size={14} />}
          </button>
        )}
      </div>

      <div className="h-2 rounded-full bg-muted overflow-hidden">
        <div className={`h-full ${c.bar} transition-all duration-500`} style={{ width: `${completion.percentage}%` }} />
      </div>

      {expanded && missing.length > 0 && (
        <div className="space-y-1 pt-1">
          {missing.map(f => (
            <div key={f.key} className="flex items-center gap-2 text-xs">
              <span className={`w-1.5 h-1.5 rounded-full shrink-0 ${
                f.weight === 'fort' ? 'bg-red-400' : f.weight === 'moyen' ? 'bg-orange-400' : 'bg-slate-300'
              }`} />
              <span className="text-foreground/70">{f.label}</span>
              <span className="text-muted-foreground/60 ml-auto">{f.weight}</span>
            </div>
          ))}
        </div>
      )}
    </div>
  );
}