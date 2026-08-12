/**
 * PillAccordionSelector — Carte accordéon réutilisable de sélection par pastilles.
 *
 * Pattern visuel unifié : pastilles fond clair (non sélectionné) / fond navy + coche
 * (sélectionné). Titre repliable au clic avec compteur « X sélectionnés » toujours
 * visible. Option « + Ajouter » pour saisie libre (points forts personnalisés).
 *
 * Utilisé par Équipements (une seule carte) et chaque catégorie de Points forts.
 */
import { useState } from 'react';
import { Plus, Check, ChevronDown, ChevronRight } from 'lucide-react';

export default function PillAccordionSelector({
  titre,
  items,
  selected,
  onToggle,
  defaultOpen = false,
  enableCustom = false,
  onAddCustom,
}) {
  const [open, setOpen] = useState(defaultOpen);
  const [adding, setAdding] = useState(false);
  const [draft, setDraft] = useState('');

  const count = items.filter(i => selected.includes(i)).length;

  const submitCustom = () => {
    const v = draft.trim();
    if (v) onAddCustom?.(v);
    setDraft('');
    setAdding(false);
  };

  return (
    <div className="border border-border rounded-xl overflow-hidden">
      <button
        type="button"
        onClick={() => setOpen(o => !o)}
        className="w-full flex items-center justify-between px-3 py-2.5 bg-muted/40 hover:bg-muted/60 transition-colors"
      >
        <span className="flex items-center gap-1.5 text-xs font-bold text-foreground uppercase tracking-wider">
          {open ? <ChevronDown size={14} /> : <ChevronRight size={14} />}
          {titre}
        </span>
        <span
          className="text-[11px] font-semibold px-2 py-0.5 rounded-full"
          style={{ background: count > 0 ? 'rgba(30,27,75,0.1)' : 'hsl(var(--muted))', color: count > 0 ? '#1e1b4b' : 'hsl(var(--muted-foreground))' }}
        >
          {count} sélectionné{count > 1 ? 's' : ''}
        </span>
      </button>
      {open && (
        <div className="px-3 py-3 space-y-2 bg-card">
          <div className="flex flex-wrap gap-1.5">
            {items.map(item => {
              const active = selected.includes(item);
              return (
                <button
                  key={item}
                  type="button"
                  onClick={() => onToggle(item)}
                  className={`shrink-0 inline-flex items-center px-2.5 py-1 rounded-full text-xs font-medium transition-all ${active ? 'text-white' : 'bg-muted text-muted-foreground hover:bg-muted/70'}`}
                  style={active ? { background: '#1e1b4b' } : undefined}
                >
                  {active && <Check size={11} className="mr-1" />}{item}
                </button>
              );
            })}
          </div>
          {enableCustom && (
            adding ? (
              <div className="flex items-center gap-1.5 pt-1">
                <input
                  autoFocus
                  value={draft}
                  onChange={e => setDraft(e.target.value)}
                  onKeyDown={e => { if (e.key === 'Enter') { e.preventDefault(); submitCustom(); } }}
                  placeholder="Saisir un point fort…"
                  className="flex h-8 rounded-md border border-input bg-background px-3 text-sm flex-1 min-w-0"
                />
                <button type="button" onClick={submitCustom} className="text-xs font-semibold text-primary whitespace-nowrap">Ajouter</button>
                <button type="button" onClick={() => { setAdding(false); setDraft(''); }} className="text-xs text-muted-foreground whitespace-nowrap">Annuler</button>
              </div>
            ) : (
              <button type="button" onClick={() => setAdding(true)}
                className="inline-flex items-center gap-1 text-xs font-semibold text-primary hover:underline">
                <Plus size={12} /> Ajouter
              </button>
            )
          )}
        </div>
      )}
    </div>
  );
}