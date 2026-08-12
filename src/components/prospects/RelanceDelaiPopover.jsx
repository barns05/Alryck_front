import { useState } from 'react';
import { Clock } from 'lucide-react';

/**
 * Petit bouton + popover inline pour personnaliser le délai de relance
 * d'un prospect au statut "Devis envoyé".
 */
export default function RelanceDelaiPopover({ prospect, onSave }) {
  const [open, setOpen] = useState(false);
  const [valeur, setValeur] = useState(prospect.relance_delai_jours || '');
  const [saving, setSaving] = useState(false);

  const handleSave = async () => {
    setSaving(true);
    await onSave(valeur === '' ? null : Number(valeur));
    setSaving(false);
    setOpen(false);
  };

  return (
    <div className="relative" onClick={e => e.stopPropagation()}>
      <button
        onClick={() => setOpen(v => !v)}
        title="Délai de relance personnalisé"
        className="flex items-center gap-1 text-[10px] px-2 py-0.5 rounded-full border border-slate-200 bg-slate-50 text-slate-500 hover:bg-slate-100 transition-colors"
      >
        <Clock size={10} />
        {prospect.relance_delai_jours
          ? `Relance J+${prospect.relance_delai_jours}`
          : 'Délai relance'}
      </button>

      {open && (
        <div className="absolute bottom-full left-0 mb-1 z-30 bg-card border border-border rounded-xl shadow-lg p-3 w-52">
          <p className="text-xs font-semibold mb-2 text-foreground">Délai de relance (jours)</p>
          <p className="text-[10px] text-muted-foreground mb-2">
            Laissez vide pour utiliser le délai par défaut (7 jours).
          </p>
          <input
            type="number"
            min="1"
            max="365"
            value={valeur}
            onChange={e => setValeur(e.target.value)}
            placeholder="Ex : 14"
            className="w-full h-8 rounded-md border border-input bg-transparent px-2 text-sm focus-visible:outline-none focus-visible:ring-1 focus-visible:ring-ring mb-2"
          />
          <div className="flex gap-2">
            <button
              onClick={() => setOpen(false)}
              className="flex-1 h-7 rounded-md border border-input text-xs text-muted-foreground hover:bg-muted transition-colors"
            >
              Annuler
            </button>
            <button
              onClick={handleSave}
              disabled={saving}
              className="flex-1 h-7 rounded-md bg-primary text-primary-foreground text-xs font-medium hover:bg-primary/90 transition-colors disabled:opacity-50"
            >
              {saving ? '…' : 'Enregistrer'}
            </button>
          </div>
        </div>
      )}
    </div>
  );
}