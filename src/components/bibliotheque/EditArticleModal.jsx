/**
 * Modal d'édition d'un CatalogueItem depuis VueParFormule.
 */
import { useState, useRef, useEffect } from 'react';
import { useMutation, useQueryClient } from '@tanstack/react-query';
import { base44 } from '@/api/base44Client';
import { X, Loader2 } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { toast } from 'sonner';
import { CATEGORIES_16, ALLERGENES_14 } from '@/constants/catalogue';

const TYPES_TARIF_SPECIAUX = [
  { id: 'enfant', label: 'Menu enfant' },
  { id: 'ado', label: 'Menu ado' },
  { id: 'prestataire', label: 'Prestataire' },
];

// item est optionnel — si absent, mode création
export default function EditArticleModal({ item, formules = [], onClose, defaultCategorie, defaultFormule, defaultSection, defaultTypeTarif, hideSectionFields, focusPrix }) {
  const isCreation = !item;
  const qc = useQueryClient();
  const prixRef = useRef(null);

  useEffect(() => {
    if (focusPrix) {
      setTimeout(() => prixRef.current?.focus(), 100);
    }
  }, [focusPrix]);
  const [form, setForm] = useState({
    nom: item?.nom || '',
    categorie: item?.categorie || defaultCategorie || 'Autre',
    a_choisir: item?.a_choisir || false,
    quantite_par_personne: item?.quantite_par_personne ?? '',
    unite: item?.unite || '',
    allergenes: item?.allergenes || [],
    formules_associees: item?.formules_associees || (defaultFormule ? [defaultFormule] : []),
    section: item?.section || defaultSection || 'alimentaire',
    prix: item?.prix ?? '',
    type_tarif: item?.type_tarif || defaultTypeTarif || '',
  });

  const set = (k, v) => setForm(f => ({ ...f, [k]: v }));

  const toggleAllergen = (id) => {
    set('allergenes', form.allergenes.includes(id)
      ? form.allergenes.filter(a => a !== id)
      : [...form.allergenes, id]
    );
  };

  const toggleFormule = (nom) => {
    set('formules_associees', form.formules_associees.includes(nom)
      ? form.formules_associees.filter(f => f !== nom)
      : [...form.formules_associees, nom]
    );
  };

  const saveMutation = useMutation({
    mutationFn: () => {
      const payload = {
        nom: form.nom,
        categorie: form.categorie,
        a_choisir: form.a_choisir,
        quantite_par_personne: form.quantite_par_personne !== '' ? Number(form.quantite_par_personne) : null,
        unite: form.unite || null,
        allergenes: form.allergenes,
        formules_associees: form.formules_associees,
        section: form.section,
        prix: form.prix !== '' ? Number(form.prix) : null,
        ...(form.type_tarif ? { type_tarif: form.type_tarif } : {}),
      };
      return isCreation
        ? base44.entities.CatalogueItem.create(payload)
        : base44.entities.CatalogueItem.update(item.id, payload);
    },
    onSuccess: () => {
      qc.invalidateQueries(['catalogue-items']);
      toast.success(isCreation ? '✓ Article ajouté' : '✓ Article mis à jour', { position: 'top-center', duration: 2500, style: { background: '#16a34a', color: '#fff' } });
      onClose();
    },
  });

  return (
    <div className="fixed inset-0 z-[60] bg-black/50 backdrop-blur-sm flex items-center justify-center p-4" onClick={onClose}>
      <div
        className="bg-card rounded-2xl border border-border shadow-xl w-full max-w-lg flex flex-col overflow-hidden"
        style={{ maxHeight: '90vh' }}
        onClick={e => e.stopPropagation()}
      >
        {/* Header */}
        <div className="flex items-center justify-between px-5 py-4 border-b border-border shrink-0">
          <h2 className="font-bold text-base">{isCreation ? '➕ Ajouter un article' : '✏️ Modifier l\'article'}</h2>
          <button onClick={onClose} className="p-1.5 rounded-lg hover:bg-muted text-muted-foreground"><X size={16} /></button>
        </div>

        {/* Contenu scrollable */}
        <div className="flex-1 overflow-y-auto px-5 py-4 space-y-4">

          {/* Nom */}
          <div className="space-y-1.5">
            <label className="text-xs font-semibold text-muted-foreground uppercase tracking-wider">Nom</label>
            <Input value={form.nom} onChange={e => set('nom', e.target.value)} placeholder="Nom de l'article" />
          </div>

          {/* Catégorie */}
          <div className="space-y-1.5">
            <label className="text-xs font-semibold text-muted-foreground uppercase tracking-wider">Catégorie</label>
            <select
              value={form.categorie}
              onChange={e => set('categorie', e.target.value)}
              className="w-full h-9 rounded-md border border-input bg-transparent px-3 py-1 text-sm shadow-sm focus-visible:outline-none focus-visible:ring-1 focus-visible:ring-ring"
            >
              {CATEGORIES_16.map(c => <option key={c} value={c}>{c}</option>)}
            </select>
          </div>

          {/* Prix */}
          <div className="space-y-1.5">
            <label className="text-xs font-semibold text-muted-foreground uppercase tracking-wider">Prix (€ / pers.)</label>
            <Input
              ref={prixRef}
              type="number"
              min="0"
              step="0.01"
              value={form.prix}
              onChange={e => set('prix', e.target.value)}
              placeholder="ex: 15.00"
            />
          </div>

          {/* Type de tarif (si mode tarif spécial) */}
          {defaultTypeTarif && (
            <div className="space-y-1.5">
              <label className="text-xs font-semibold text-muted-foreground uppercase tracking-wider">Type de tarif</label>
              <select
                value={form.type_tarif}
                onChange={e => set('type_tarif', e.target.value)}
                className="w-full h-9 rounded-md border border-input bg-transparent px-3 py-1 text-sm shadow-sm focus-visible:outline-none focus-visible:ring-1 focus-visible:ring-ring"
              >
                <option value="">-- Choisir --</option>
                {TYPES_TARIF_SPECIAUX.map(t => <option key={t.id} value={t.id}>{t.label}</option>)}
              </select>
            </div>
          )}

          {/* À choisir */}
          <div className="flex items-center justify-between">
            <div>
              <p className="text-sm font-medium">À choisir</p>
              <p className="text-xs text-muted-foreground">Le client peut choisir parmi plusieurs options</p>
            </div>
            <button
              onClick={() => set('a_choisir', !form.a_choisir)}
              className={`relative w-10 h-5 rounded-full transition-colors ${form.a_choisir ? 'bg-violet-500' : 'bg-slate-300'}`}
            >
              <span className={`absolute top-0.5 w-4 h-4 bg-white rounded-full shadow transition-transform ${form.a_choisir ? 'translate-x-5' : 'translate-x-0.5'}`} />
            </button>
          </div>

          {/* Quantité + unité */}
          <div className="grid grid-cols-2 gap-3">
            <div className="space-y-1.5">
              <label className="text-xs font-semibold text-muted-foreground uppercase tracking-wider">Quantité / pers.</label>
              <Input
                type="number"
                min="0"
                step="0.01"
                value={form.quantite_par_personne}
                onChange={e => set('quantite_par_personne', e.target.value)}
                placeholder="ex: 1.5"
              />
            </div>
            <div className="space-y-1.5">
              <label className="text-xs font-semibold text-muted-foreground uppercase tracking-wider">Unité</label>
              <Input value={form.unite} onChange={e => set('unite', e.target.value)} placeholder="pièce, cl, g…" />
            </div>
          </div>

          {/* Allergènes */}
          <div className="space-y-2">
            <label className="text-xs font-semibold text-muted-foreground uppercase tracking-wider">Allergènes</label>
            <div className="grid grid-cols-2 gap-1.5">
              {ALLERGENES_14.map(a => {
                const checked = form.allergenes.includes(a.id);
                return (
                  <button
                    key={a.id}
                    onClick={() => toggleAllergen(a.id)}
                    className={`flex items-center gap-2 px-2.5 py-1.5 rounded-lg border text-left text-xs transition-all ${
                      checked ? 'border-amber-400 bg-amber-50 text-amber-800' : 'border-border hover:bg-muted/50 text-muted-foreground'
                    }`}
                  >
                    <div className={`w-4 h-4 rounded border-2 flex items-center justify-center shrink-0 ${checked ? 'bg-amber-400 border-amber-400' : 'border-muted-foreground'}`}>
                      {checked && <span className="text-white text-[9px] font-bold">✓</span>}
                    </div>
                    {a.label}
                  </button>
                );
              })}
            </div>
          </div>

          {/* Formules associées */}
          {formules.length > 0 && (
            <div className="space-y-2">
              <label className="text-xs font-semibold text-muted-foreground uppercase tracking-wider">Formules associées</label>
              <div className="flex flex-wrap gap-1.5">
                {formules.map(nom => {
                  const checked = form.formules_associees.includes(nom);
                  return (
                    <button
                      key={nom}
                      onClick={() => toggleFormule(nom)}
                      className={`px-2.5 py-1 rounded-full text-xs font-medium transition-all cursor-pointer select-none ${
                        checked ? 'bg-primary text-white' : 'bg-gray-100 text-gray-600 hover:bg-gray-200'
                      }`}
                    >
                      {nom}
                    </button>
                  );
                })}
              </div>
              {form.formules_associees.length === 0 ? (
                <p className="text-xs text-amber-600 font-medium">⚠️ Aucune formule sélectionnée = visible dans toutes les formules</p>
              ) : (
                <p className="text-xs text-muted-foreground">Vide = toutes les formules</p>
              )}
            </div>
          )}
        </div>

        {/* Footer — padding-bottom 160px pour Safari mobile */}
        <div className="shrink-0 flex gap-2 justify-end px-5 py-4 border-t border-border" style={{ paddingBottom: 'env(safe-area-inset-bottom, 16px)' }}>
          <Button variant="outline" onClick={onClose} disabled={saveMutation.isPending}>Annuler</Button>
          <Button onClick={() => saveMutation.mutate()} disabled={!form.nom || saveMutation.isPending}>
            {saveMutation.isPending ? <><Loader2 size={14} className="animate-spin" /> Sauvegarde…</> : '✓ Sauvegarder'}
          </Button>
        </div>
      </div>
    </div>
  );
}