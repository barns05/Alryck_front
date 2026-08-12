import { useState } from 'react';
import { useMutation, useQueryClient } from '@tanstack/react-query';
import { base44 } from '@/api/base44Client';
import { X } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';

const CATEGORIES_APPRO = [
  'Viande', 'Poisson', 'Boulangerie', 'Pâtisserie',
  'Vins', 'Alcools', 'Champagne', 'Légumes', 'Épicerie', 'Autre'
];

const MODES = [
  { v: 'email', l: '📧 Email' },
  { v: 'téléphone', l: '📞 Téléphone' },
  { v: 'bon_de_commande', l: '📄 Bon de commande' },
  { v: 'autre', l: '🔗 Autre' },
];

export default function FournisseurModal({ fournisseur, onClose }) {
  const qc = useQueryClient();
  const [form, setForm] = useState({
    nom: fournisseur?.nom || '',
    telephone: fournisseur?.telephone || '',
    email: fournisseur?.email || '',
    categories: fournisseur?.categories || [],
    mode_commande: fournisseur?.mode_commande || 'email',
    bon_commande_usage: fournisseur?.bon_commande_usage || 'interne',
    notes: fournisseur?.notes || '',
    actif: fournisseur?.actif !== false,
  });
  const set = (k, v) => setForm(f => ({ ...f, [k]: v }));

  const toggleCat = (cat) => {
    setForm(f => ({
      ...f,
      categories: f.categories.includes(cat)
        ? f.categories.filter(c => c !== cat)
        : [...f.categories, cat],
    }));
  };

  const saveMutation = useMutation({
    mutationFn: () => fournisseur
      ? base44.entities.Fournisseur.update(fournisseur.id, form)
      : base44.entities.Fournisseur.create(form),
    onSuccess: () => { qc.invalidateQueries(['fournisseurs']); onClose(); },
  });

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/40 backdrop-blur-sm p-4">
      <div className="bg-card rounded-2xl border border-border shadow-xl w-full max-w-lg p-6 space-y-5 max-h-[90vh] overflow-y-auto">
        <div className="flex items-center justify-between">
          <h3 className="font-semibold text-lg">{fournisseur ? 'Modifier le fournisseur' : 'Nouveau fournisseur'}</h3>
          <button onClick={onClose} className="p-1.5 rounded-lg hover:bg-muted text-muted-foreground"><X size={16} /></button>
        </div>

        <div className="space-y-4">
          <div className="space-y-1.5">
            <label className="text-sm font-medium">Nom du fournisseur *</label>
            <Input value={form.nom} onChange={e => set('nom', e.target.value)} placeholder="ex: Boucherie Dupont" />
          </div>
          <div className="grid grid-cols-2 gap-3">
            <div className="space-y-1.5">
              <label className="text-sm font-medium">Téléphone</label>
              <Input value={form.telephone} onChange={e => set('telephone', e.target.value)} placeholder="06 00 00 00 00" />
            </div>
            <div className="space-y-1.5">
              <label className="text-sm font-medium">Email</label>
              <Input value={form.email} onChange={e => set('email', e.target.value)} placeholder="contact@..." />
            </div>
          </div>

          <div className="space-y-1.5">
            <label className="text-sm font-medium">Catégories d'approvisionnement</label>
            <div className="flex flex-wrap gap-1.5">
              {CATEGORIES_APPRO.map(cat => (
                <button
                  key={cat}
                  type="button"
                  onClick={() => toggleCat(cat)}
                  className={`text-xs px-3 py-1 rounded-full border font-medium transition-colors ${
                    form.categories.includes(cat)
                      ? 'bg-primary text-primary-foreground border-primary'
                      : 'bg-card border-border text-muted-foreground hover:bg-muted'
                  }`}
                >
                  {cat}
                </button>
              ))}
            </div>
          </div>

          {/* Mode de commande */}
          <div className="space-y-1.5">
            <label className="text-sm font-medium">Mode de commande préféré</label>
            <div className="grid grid-cols-2 gap-2">
              {MODES.map(({ v, l }) => (
                <button
                  key={v}
                  type="button"
                  onClick={() => set('mode_commande', v)}
                  className={`text-sm py-2 px-3 rounded-xl border transition-colors font-medium text-left ${
                    form.mode_commande === v
                      ? 'border-primary bg-primary/10 text-primary'
                      : 'border-border hover:bg-muted text-muted-foreground'
                  }`}
                >
                  {l}
                </button>
              ))}
            </div>
          </div>

          {/* Options spécifiques au bon de commande */}
          {form.mode_commande === 'bon_de_commande' && (
            <div className="space-y-2 bg-blue-50 border border-blue-200 rounded-xl p-4">
              <p className="text-sm font-medium text-blue-900">📄 Options du bon de commande</p>
              <div className="flex flex-col gap-2">
                {[
                  { v: 'interne', l: '🏠 Usage interne', desc: 'Bon consultable et imprimable dans l\'app' },
                  { v: 'envoi_fournisseur', l: '📤 Envoyer au fournisseur', desc: 'Génère et envoie le bon par email au fournisseur' },
                ].map(({ v, l, desc }) => (
                  <button
                    key={v}
                    type="button"
                    onClick={() => set('bon_commande_usage', v)}
                    className={`text-left px-4 py-3 rounded-xl border transition-colors ${
                      form.bon_commande_usage === v
                        ? 'border-blue-500 bg-blue-100 text-blue-900'
                        : 'border-blue-200 bg-white text-blue-800 hover:bg-blue-50'
                    }`}
                  >
                    <p className="font-medium text-sm">{l}</p>
                    <p className="text-xs opacity-75 mt-0.5">{desc}</p>
                  </button>
                ))}
              </div>
              {form.bon_commande_usage === 'envoi_fournisseur' && !form.email && (
                <p className="text-xs text-amber-700 bg-amber-50 border border-amber-200 rounded-lg px-3 py-2">
                  ⚠️ Renseignez l'email du fournisseur pour pouvoir envoyer le bon de commande.
                </p>
              )}
            </div>
          )}

          <div className="space-y-1.5">
            <label className="text-sm font-medium">Notes</label>
            <Input value={form.notes} onChange={e => set('notes', e.target.value)} placeholder="Délai de livraison, conditions particulières..." />
          </div>
        </div>

        <div className="flex justify-end gap-2 pt-1">
          <Button variant="outline" onClick={onClose}>Annuler</Button>
          <Button onClick={() => saveMutation.mutate()} disabled={!form.nom.trim() || saveMutation.isPending}>
            {saveMutation.isPending ? 'Enregistrement...' : 'Enregistrer'}
          </Button>
        </div>
      </div>
    </div>
  );
}