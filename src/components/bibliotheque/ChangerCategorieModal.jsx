import { useState } from 'react';
import { X } from 'lucide-react';
import { Button } from '@/components/ui/button';

export default function ChangerCategorieModal({ open, item, categories, onConfirm, onCancel, loading }) {
  const [selected, setSelected] = useState(item?.categorie || item?.section || categories[0]);

  if (!open || !item) return null;

  const currentVal = item.section || item.categorie;

  return (
    <div className="fixed inset-0 z-[100] flex items-center justify-center bg-black/50 backdrop-blur-sm p-4">
      <div className="bg-white rounded-2xl border border-slate-200 shadow-xl w-full max-w-sm p-6 space-y-4">
        <div className="flex items-center justify-between">
          <h3 className="text-base font-semibold text-slate-900">✏️ Changer de catégorie</h3>
          <button onClick={onCancel} className="p-1.5 rounded-lg hover:bg-muted text-muted-foreground">
            <X size={15} />
          </button>
        </div>
        <div className="space-y-1.5">
          <p className="text-sm text-slate-600">Article : <span className="font-medium text-slate-900">{item.nom}</span></p>
          <label className="text-xs font-medium text-muted-foreground block mt-2">Nouvelle catégorie</label>
          <select
            value={selected}
            onChange={e => setSelected(e.target.value)}
            className="flex h-9 w-full rounded-md border border-input bg-transparent px-3 text-sm shadow-sm focus-visible:outline-none focus-visible:ring-1 focus-visible:ring-ring"
          >
            {categories.map(c => (
              <option key={c.value || c} value={c.value || c}>
                {c.label || c}
              </option>
            ))}
          </select>
          {(selected === currentVal) && (
            <p className="text-xs text-muted-foreground">C'est déjà la catégorie actuelle.</p>
          )}
        </div>
        <div className="flex gap-3 justify-end pt-1">
          <Button variant="outline" size="sm" onClick={onCancel} disabled={loading}>Annuler</Button>
          <Button size="sm" onClick={() => onConfirm(selected)} disabled={loading || selected === currentVal}>
            {loading ? '…' : 'Confirmer'}
          </Button>
        </div>
      </div>
    </div>
  );
}