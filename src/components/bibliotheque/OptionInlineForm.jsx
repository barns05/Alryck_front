import { useState } from 'react';
import { X, Check } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';

const CATEGORIES = ['Animations', 'Son & Lumières', 'Décoration', 'Location Matériel', 'Prestataires externes', 'Animations culinaires', 'Autre'];

export default function OptionInlineForm({ onSave, onCancel }) {
  const [form, setForm] = useState({ nom: '', categorie: 'Autre', unite: 'Forfait', prix: '', description: '' });
  const set = (k, v) => setForm(f => ({ ...f, [k]: v }));

  return (
    <div className="space-y-4">
      <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
        <div>
          <label className="text-xs font-medium text-muted-foreground mb-1 block">Nom de l'option *</label>
          <Input value={form.nom} onChange={e => set('nom', e.target.value)} placeholder="ex: Bar à cocktails" />
        </div>
        <div>
          <label className="text-xs font-medium text-muted-foreground mb-1 block">Catégorie</label>
          <select value={form.categorie} onChange={e => set('categorie', e.target.value)} className="flex h-9 w-full rounded-md border border-input bg-transparent px-3 py-1 text-sm shadow-sm focus-visible:outline-none focus-visible:ring-1 focus-visible:ring-ring">
            {CATEGORIES.map(c => <option key={c} value={c}>{c}</option>)}
          </select>
        </div>
        <div>
          <label className="text-xs font-medium text-muted-foreground mb-1 block">Unité de prix</label>
          <div className="flex gap-2">
            {['Forfait', 'Par personne', 'Par heure', 'Par unité'].map(t => (
              <button key={t} type="button" onClick={() => set('unite', t)}
                className={`flex-1 text-xs py-1.5 px-3 rounded-lg border transition-colors font-medium ${form.unite === t ? 'bg-primary text-primary-foreground border-primary' : 'bg-card border-border text-muted-foreground hover:bg-muted'}`}>
                {t}
              </button>
            ))}
          </div>
        </div>
        <div>
          <label className="text-xs font-medium text-muted-foreground mb-1 block">Prix (€)</label>
          <Input type="number" value={form.prix} onChange={e => set('prix', e.target.value)} placeholder="0" />
        </div>
        <div className="md:col-span-2">
          <label className="text-xs font-medium text-muted-foreground mb-1 block">Description courte</label>
          <Input value={form.description} onChange={e => set('description', e.target.value)} placeholder="Description de l'option…" />
        </div>
      </div>
      <div className="flex gap-2 justify-end border-t border-border pt-3">
        <Button variant="outline" size="sm" onClick={onCancel}><X size={14} /> Annuler</Button>
        <Button size="sm" onClick={() => onSave({ ...form, prix: form.prix ? parseFloat(form.prix) : null, actif: true })} disabled={!form.nom.trim()}>
          <Check size={14} /> Enregistrer
        </Button>
      </div>
    </div>
  );
}