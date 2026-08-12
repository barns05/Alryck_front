import { useState } from 'react';
import { base44 } from '@/api/base44Client';
import { X, Upload } from 'lucide-react';
import { Button } from '@/components/ui/button';

const TYPE_OPTIONS = [
  { value: 'prix_barre',    emoji: '💰', label: 'Prix barré',        hint: 'ex: 250€ → 200€' },
  { value: 'pourcentage',   emoji: '📊', label: 'Pourcentage',       hint: 'ex: -20% sur le Pack Photo Booth' },
  { value: 'offre_groupee', emoji: '🎁', label: 'Offre groupée',     hint: 'ex: 2 achetés = 1 offert' },
  { value: 'gratuit',       emoji: '🆓', label: 'Offre gratuite',    hint: 'ex: Animation offerte pour tout mariage signé avant le 30 avril' },
  { value: 'personnalise',  emoji: '📝', label: 'Offre personnalisée', hint: 'Description libre' },
];

export default function PromotionFormModal({ promo, onClose, onSaved }) {
  const [form, setForm] = useState({
    titre: promo?.titre || '',
    description: promo?.description || '',
    date_validite: promo?.date_validite || '',
    visuel_url: promo?.visuel_url || '',
    type_promo: promo?.type_promo || 'prix_barre',
    prix_original: promo?.prix_original ?? '',
    prix: promo?.prix ?? '',
    pourcentage: promo?.pourcentage ?? '',
    offre_groupee_detail: promo?.offre_groupee_detail || '',
    offre_libre: promo?.offre_libre || '',
  });
  const [uploading, setUploading] = useState(false);
  const [saving, setSaving] = useState(false);

  const set = (k, v) => setForm(f => ({ ...f, [k]: v }));

  const handleUpload = async (e) => {
    const file = e.target.files?.[0];
    if (!file) return;
    setUploading(true);
    const { file_url } = await base44.integrations.Core.UploadFile({ file });
    set('visuel_url', file_url);
    setUploading(false);
  };

  const isValid = () => {
    if (!form.titre) return false;
    if (form.type_promo === 'prix_barre') return form.prix !== '';
    if (form.type_promo === 'pourcentage') return form.pourcentage !== '';
    if (form.type_promo === 'offre_groupee') return !!form.offre_groupee_detail;
    if (form.type_promo === 'gratuit') return !!form.offre_libre;
    if (form.type_promo === 'personnalise') return !!form.offre_libre;
    return true;
  };

  const handleSave = async () => {
    if (!isValid()) return;
    setSaving(true);
    const data = {
      ...form,
      prix: form.prix !== '' ? parseFloat(form.prix) : undefined,
      prix_original: form.prix_original !== '' ? parseFloat(form.prix_original) : undefined,
      pourcentage: form.pourcentage !== '' ? parseFloat(form.pourcentage) : undefined,
    };
    if (promo) {
      await base44.entities.Promotion.update(promo.id, data);
    } else {
      await base44.entities.Promotion.create(data);
    }
    onSaved();
  };

  const selectedType = TYPE_OPTIONS.find(t => t.value === form.type_promo);

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/40 backdrop-blur-sm p-4">
      <div className="bg-card rounded-2xl border border-border shadow-xl w-full max-w-md p-5 space-y-4 max-h-[90vh] overflow-y-auto">
        <div className="flex items-center justify-between">
          <h3 className="font-bold text-base">{promo ? 'Modifier la promotion' : 'Nouvelle promotion'}</h3>
          <button onClick={onClose} className="p-1.5 rounded-lg hover:bg-muted text-muted-foreground"><X size={15} /></button>
        </div>

        <div className="space-y-3">
          {/* Titre */}
          <div>
            <label className="text-xs font-medium text-muted-foreground">Titre *</label>
            <input value={form.titre} onChange={e => set('titre', e.target.value)} placeholder="ex: Pack Photo souvenir" className="mt-1 w-full px-3 py-2 text-sm rounded-lg border border-input bg-background focus:outline-none focus:ring-1 focus:ring-ring" />
          </div>

          {/* Description */}
          <div>
            <label className="text-xs font-medium text-muted-foreground">Description courte</label>
            <textarea value={form.description} onChange={e => set('description', e.target.value)} rows={2} placeholder="Décrivez l'offre en quelques mots..." className="mt-1 w-full px-3 py-2 text-sm rounded-lg border border-input bg-background focus:outline-none focus:ring-1 focus:ring-ring resize-none" />
          </div>

          {/* Type de promotion */}
          <div>
            <label className="text-xs font-medium text-muted-foreground">Type de promotion *</label>
            <div className="mt-1.5 grid grid-cols-1 gap-1.5">
              {TYPE_OPTIONS.map(opt => (
                <button
                  key={opt.value}
                  type="button"
                  onClick={() => set('type_promo', opt.value)}
                  className={`flex items-center gap-3 px-3 py-2.5 rounded-xl border text-left transition-all ${
                    form.type_promo === opt.value
                      ? 'border-primary bg-primary/5 text-foreground'
                      : 'border-border text-muted-foreground hover:border-primary/40'
                  }`}
                >
                  <span className="text-lg shrink-0">{opt.emoji}</span>
                  <div>
                    <p className="text-sm font-medium">{opt.label}</p>
                    <p className="text-xs opacity-60">{opt.hint}</p>
                  </div>
                </button>
              ))}
            </div>
          </div>

          {/* Champs conditionnels selon le type */}
          {form.type_promo === 'prix_barre' && (
            <div className="grid grid-cols-2 gap-3">
              <div>
                <label className="text-xs font-medium text-muted-foreground">Prix original (€)</label>
                <input type="number" min="0" value={form.prix_original} onChange={e => set('prix_original', e.target.value)} placeholder="250" className="mt-1 w-full px-3 py-2 text-sm rounded-lg border border-input bg-background focus:outline-none focus:ring-1 focus:ring-ring" />
              </div>
              <div>
                <label className="text-xs font-medium text-muted-foreground">Prix promotionnel (€) *</label>
                <input type="number" min="0" value={form.prix} onChange={e => set('prix', e.target.value)} placeholder="200" className="mt-1 w-full px-3 py-2 text-sm rounded-lg border border-input bg-background focus:outline-none focus:ring-1 focus:ring-ring" />
              </div>
            </div>
          )}

          {form.type_promo === 'pourcentage' && (
            <div className="grid grid-cols-2 gap-3">
              <div>
                <label className="text-xs font-medium text-muted-foreground">Réduction (%) *</label>
                <input type="number" min="1" max="100" value={form.pourcentage} onChange={e => set('pourcentage', e.target.value)} placeholder="20" className="mt-1 w-full px-3 py-2 text-sm rounded-lg border border-input bg-background focus:outline-none focus:ring-1 focus:ring-ring" />
              </div>
              <div>
                <label className="text-xs font-medium text-muted-foreground">Valeur indicative (€)</label>
                <input type="number" min="0" value={form.prix} onChange={e => set('prix', e.target.value)} placeholder="50" className="mt-1 w-full px-3 py-2 text-sm rounded-lg border border-input bg-background focus:outline-none focus:ring-1 focus:ring-ring" />
              </div>
            </div>
          )}

          {form.type_promo === 'offre_groupee' && (
            <div>
              <label className="text-xs font-medium text-muted-foreground">Détail de l'offre *</label>
              <input value={form.offre_groupee_detail} onChange={e => set('offre_groupee_detail', e.target.value)} placeholder="ex: 2 achetés = 1 offert" className="mt-1 w-full px-3 py-2 text-sm rounded-lg border border-input bg-background focus:outline-none focus:ring-1 focus:ring-ring" />
              <div className="mt-2">
                <label className="text-xs font-medium text-muted-foreground">Valeur offerte (€)</label>
                <input type="number" min="0" value={form.prix} onChange={e => set('prix', e.target.value)} placeholder="0" className="mt-1 w-full px-3 py-2 text-sm rounded-lg border border-input bg-background focus:outline-none focus:ring-1 focus:ring-ring" />
              </div>
            </div>
          )}

          {(form.type_promo === 'gratuit' || form.type_promo === 'personnalise') && (
            <div>
              <label className="text-xs font-medium text-muted-foreground">
                {form.type_promo === 'gratuit' ? 'Ce qui est offert *' : 'Description de l\'offre *'}
              </label>
              <textarea value={form.offre_libre} onChange={e => set('offre_libre', e.target.value)} rows={2}
                placeholder={form.type_promo === 'gratuit' ? 'ex: Animation offerte pour tout mariage signé avant le 30 avril' : 'Décrivez votre offre personnalisée...' }
                className="mt-1 w-full px-3 py-2 text-sm rounded-lg border border-input bg-background focus:outline-none focus:ring-1 focus:ring-ring resize-none" />
              <div className="mt-2">
                <label className="text-xs font-medium text-muted-foreground">Valeur (€, pour facturation)</label>
                <input type="number" min="0" value={form.prix} onChange={e => set('prix', e.target.value)} placeholder="0" className="mt-1 w-full px-3 py-2 text-sm rounded-lg border border-input bg-background focus:outline-none focus:ring-1 focus:ring-ring" />
              </div>
            </div>
          )}

          {/* Date limite */}
          <div>
            <label className="text-xs font-medium text-muted-foreground">Date limite</label>
            <input type="date" value={form.date_validite} onChange={e => set('date_validite', e.target.value)} className="mt-1 w-full px-3 py-2 text-sm rounded-lg border border-input bg-background focus:outline-none focus:ring-1 focus:ring-ring" />
          </div>

          {/* Visuel */}
          <div>
            <label className="text-xs font-medium text-muted-foreground">Visuel (optionnel)</label>
            <div className="mt-1 flex items-center gap-3">
              {form.visuel_url && <img src={form.visuel_url} alt="" className="w-16 h-16 rounded-xl object-cover border border-border" />}
              <label className="flex items-center gap-2 px-3 py-2 rounded-lg border border-dashed border-border text-xs text-muted-foreground cursor-pointer hover:bg-muted/40 transition-colors">
                <Upload size={14} />
                {uploading ? 'Envoi...' : 'Choisir une image'}
                <input type="file" accept="image/*" className="hidden" onChange={handleUpload} disabled={uploading} />
              </label>
            </div>
          </div>
        </div>

        <div className="flex justify-end gap-2 pt-2">
          <Button variant="outline" size="sm" onClick={onClose}>Annuler</Button>
          <Button size="sm" onClick={handleSave} disabled={saving || !isValid()}>
            {saving ? 'Enregistrement...' : promo ? 'Mettre à jour' : 'Créer'}
          </Button>
        </div>
      </div>
    </div>
  );
}