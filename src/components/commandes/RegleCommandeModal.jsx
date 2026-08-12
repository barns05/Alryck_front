import { useState } from 'react';
import { useMutation, useQueryClient, useQuery } from '@tanstack/react-query';
import { base44 } from '@/api/base44Client';
import { X, Plus, Trash2 } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';

const UNITES = ['g', 'kg', 'ml', 'litres', 'pièces', 'bouteilles', 'plateaux', 'portions'];

function newProduit() {
  return {
    id: crypto.randomUUID(),
    nom: '',
    unite: 'kg',
    mode_qte: 'par_personne',
    qte_adulte: '',
    qte_adolescent: '',
    qte_enfant: '',
    qte_fixe: '',
    arrondi: 'supérieur',
    notes: '',
  };
}

function ProduitRow({ produit, onChange, onRemove, showRemove }) {
  const set = (k, v) => onChange({ ...produit, [k]: v });

  return (
    <div className="bg-muted/30 rounded-xl border border-border p-4 space-y-3">
      <div className="flex items-start gap-2">
        <div className="flex-1 space-y-1.5">
          <label className="text-xs font-medium text-muted-foreground">Nom du produit *</label>
          <Input
            value={produit.nom}
            onChange={e => set('nom', e.target.value)}
            placeholder="ex: Viande de bœuf, Légumes grillés…"
          />
        </div>
        {showRemove && (
          <button
            onClick={onRemove}
            className="mt-6 p-1.5 rounded-lg hover:bg-red-50 text-muted-foreground hover:text-red-600 transition-colors"
          >
            <Trash2 size={14} />
          </button>
        )}
      </div>

      {/* Mode quantité */}
      <div className="space-y-1.5">
        <label className="text-xs font-medium text-muted-foreground">Mode de calcul</label>
        <div className="flex gap-2">
          {[
            { v: 'par_personne', l: '👤 Par personne' },
            { v: 'fixe', l: '📦 Quantité fixe' },
          ].map(({ v, l }) => (
            <button
              key={v}
              type="button"
              onClick={() => set('mode_qte', v)}
              className={`flex-1 text-xs py-1.5 rounded-lg border transition-colors font-medium ${
                produit.mode_qte === v
                  ? 'border-primary bg-primary/10 text-primary'
                  : 'border-border hover:bg-muted text-muted-foreground'
              }`}
            >
              {l}
            </button>
          ))}
        </div>
      </div>

      {/* Unité */}
      <div className="space-y-1.5">
        <label className="text-xs font-medium text-muted-foreground">Unité</label>
        <div className="flex gap-1.5 flex-wrap">
          {UNITES.map(u => (
            <button
              key={u}
              type="button"
              onClick={() => set('unite', u)}
              className={`text-xs px-2.5 py-1 rounded-full border font-medium transition-colors ${
                produit.unite === u
                  ? 'bg-primary text-primary-foreground border-primary'
                  : 'bg-card border-border text-muted-foreground hover:bg-muted'
              }`}
            >
              {u}
            </button>
          ))}
        </div>
        <Input
          value={UNITES.includes(produit.unite) ? '' : produit.unite}
          onChange={e => e.target.value && set('unite', e.target.value)}
          placeholder="Unité personnalisée…"
          className="text-sm h-8 mt-1"
        />
      </div>

      {/* Quantités */}
      {produit.mode_qte === 'par_personne' ? (
        <div className="space-y-1.5">
          <label className="text-xs font-medium text-muted-foreground">Quantités par convive ({produit.unite})</label>
          <div className="grid grid-cols-3 gap-2">
            <div>
              <label className="text-[10px] text-muted-foreground block mb-1">Adulte</label>
              <Input
                type="number"
                step="any"
                value={produit.qte_adulte}
                onChange={e => set('qte_adulte', e.target.value)}
                placeholder="0"
              />
            </div>
            <div>
              <label className="text-[10px] text-muted-foreground block mb-1">Adolescent</label>
              <Input
                type="number"
                step="any"
                value={produit.qte_adolescent}
                onChange={e => set('qte_adolescent', e.target.value)}
                placeholder="0"
              />
            </div>
            <div>
              <label className="text-[10px] text-muted-foreground block mb-1">Enfant</label>
              <Input
                type="number"
                step="any"
                value={produit.qte_enfant}
                onChange={e => set('qte_enfant', e.target.value)}
                placeholder="0"
              />
            </div>
          </div>
          <div className="flex gap-2 pt-1">
            {[{ v: 'supérieur', l: '⬆️ Arrondi sup.' }, { v: 'inférieur', l: '⬇️ Arrondi inf.' }].map(({ v, l }) => (
              <button
                key={v}
                type="button"
                onClick={() => set('arrondi', v)}
                className={`flex-1 text-xs py-1.5 rounded-lg border transition-colors font-medium ${
                  produit.arrondi === v
                    ? 'border-primary bg-primary/10 text-primary'
                    : 'border-border hover:bg-muted text-muted-foreground'
                }`}
              >
                {l}
              </button>
            ))}
          </div>
        </div>
      ) : (
        <div className="space-y-1.5">
          <label className="text-xs font-medium text-muted-foreground">Quantité fixe ({produit.unite})</label>
          <Input
            type="number"
            step="any"
            value={produit.qte_fixe}
            onChange={e => set('qte_fixe', e.target.value)}
            placeholder="ex: 5"
            className="max-w-[140px]"
          />
        </div>
      )}

      <div className="space-y-1">
        <label className="text-xs font-medium text-muted-foreground">Notes (optionnel)</label>
        <Input
          value={produit.notes}
          onChange={e => set('notes', e.target.value)}
          placeholder="Précisions…"
          className="text-sm"
        />
      </div>
    </div>
  );
}

// Construire la liste de produits depuis une règle existante (legacy ou nouvelle)
function buildProduitsFromRegle(regle) {
  if (regle?.produits?.length > 0) return regle.produits;
  // Legacy : un seul produit
  if (regle?.unite) {
    return [{
      id: crypto.randomUUID(),
      nom: regle.option_prestation_nom || '',
      unite: regle.unite || 'kg',
      mode_qte: 'par_personne',
      qte_adulte: regle.qte_adulte || '',
      qte_adolescent: regle.qte_adolescent || '',
      qte_enfant: regle.qte_enfant || '',
      qte_fixe: '',
      arrondi: regle.arrondi || 'supérieur',
      notes: regle.notes || '',
    }];
  }
  return [newProduit()];
}

export default function RegleCommandeModal({ regle, options, fournisseurs, onClose }) {
  const qc = useQueryClient();

  const { data: catalogueFormules = [] } = useQuery({
    queryKey: ['catalogue-formules-commandes'],
    queryFn: () => base44.entities.CatalogueItem.filter({ actif: true }),
    select: items => items.filter(i => i.section === 'tarifs' && i.type_tarif === 'formule'),
  });

  const defaultOption = regle?.option_prestation_id
    ? options.find(o => o.id === regle.option_prestation_id)
    : null;
  const defaultCatalogueFormule = regle?.option_prestation_id?.startsWith('cat_')
    ? catalogueFormules.find(f => `cat_${f.id}` === regle.option_prestation_id)
    : null;
  const defaultFourn = regle?.fournisseur_id
    ? fournisseurs.find(f => f.id === regle.fournisseur_id)
    : null;

  const [selectedOption, setSelectedOption] = useState(defaultOption || null);
  const [selectedCatalogueFormule, setSelectedCatalogueFormule] = useState(defaultCatalogueFormule || null);
  const [sourceType, setSourceType] = useState(defaultCatalogueFormule ? 'catalogue' : 'option'); // 'option' | 'catalogue'
  const [selectedFourn, setSelectedFourn] = useState(defaultFourn || null);
  const [produits, setProduits] = useState(() => buildProduitsFromRegle(regle));
  const [notesRegle, setNotesRegle] = useState(regle?.notes || '');

  const updateProduit = (idx, val) => setProduits(p => p.map((x, i) => i === idx ? val : x));
  const removeProduit = (idx) => setProduits(p => p.filter((_, i) => i !== idx));
  const addProduit = () => setProduits(p => [...p, newProduit()]);

  const saveMutation = useMutation({
    mutationFn: () => {
      const produitsClean = produits.map(p => ({
        ...p,
        qte_adulte: parseFloat(p.qte_adulte) || 0,
        qte_adolescent: parseFloat(p.qte_adolescent) || 0,
        qte_enfant: parseFloat(p.qte_enfant) || 0,
        qte_fixe: parseFloat(p.qte_fixe) || 0,
      }));

      // Source : option/prestation classique ou formule du catalogue
      const isFromCatalogue = sourceType === 'catalogue';
      const optionId = isFromCatalogue ? `cat_${selectedCatalogueFormule?.id}` : (selectedOption?.id || '');
      const optionNom = isFromCatalogue ? selectedCatalogueFormule?.nom : (selectedOption?.nom || '');

      const payload = {
        option_prestation_id: optionId,
        option_prestation_nom: optionNom || '',
        fournisseur_id: selectedFourn?.id || '',
        fournisseur_nom: selectedFourn?.nom || '',
        produits: produitsClean,
        notes: notesRegle,
        // Champs legacy pour compatibilité BonDeCommandeModal existant
        unite: produitsClean[0]?.unite || '',
        qte_adulte: produitsClean[0]?.qte_adulte || 0,
        qte_adolescent: produitsClean[0]?.qte_adolescent || 0,
        qte_enfant: produitsClean[0]?.qte_enfant || 0,
        arrondi: produitsClean[0]?.arrondi || 'supérieur',
      };
      return regle
        ? base44.entities.RegleCommande.update(regle.id, payload)
        : base44.entities.RegleCommande.create(payload);
    },
    onSuccess: () => { qc.invalidateQueries(['regles-commande']); onClose(); },
  });

  const selectedSourceValid = sourceType === 'catalogue' ? !!selectedCatalogueFormule : !!selectedOption;
  const isValid = selectedSourceValid && selectedFourn && produits.every(p => p.nom.trim() && p.unite);

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/40 backdrop-blur-sm p-4">
      <div className="bg-card rounded-2xl border border-border shadow-xl w-full max-w-xl max-h-[90vh] flex flex-col overflow-hidden">
        <div className="flex items-center justify-between p-6 pb-4 border-b border-border shrink-0">
          <h3 className="font-semibold text-lg">{regle ? 'Modifier la règle' : 'Nouvelle règle de commande'}</h3>
          <button onClick={onClose} className="p-1.5 rounded-lg hover:bg-muted text-muted-foreground"><X size={16} /></button>
        </div>

        <div className="flex-1 overflow-y-auto p-6 pt-4 space-y-4">
          {/* Source : Option/Prestation ou Formule Catalogue */}
          <div className="space-y-1.5">
            <label className="text-sm font-medium">Source *</label>
            <div className="flex gap-2">
              {[{ v: 'option', l: '📦 Option / Prestation' }, { v: 'catalogue', l: '💰 Formule catalogue' }].map(({ v, l }) => (
                <button
                  key={v}
                  type="button"
                  onClick={() => { setSourceType(v); setSelectedOption(null); setSelectedCatalogueFormule(null); }}
                  className={`flex-1 text-xs py-1.5 rounded-lg border transition-colors font-medium ${sourceType === v ? 'border-primary bg-primary/10 text-primary' : 'border-border hover:bg-muted text-muted-foreground'}`}
                >
                  {l}
                </button>
              ))}
            </div>

            {sourceType === 'option' && (
              <select
                value={selectedOption?.id || ''}
                onChange={e => setSelectedOption(options.find(o => o.id === e.target.value) || null)}
                className="flex h-9 w-full rounded-md border border-input bg-transparent px-3 py-1 text-sm shadow-sm focus-visible:outline-none focus-visible:ring-1 focus-visible:ring-ring"
              >
                <option value="">Sélectionner une option…</option>
                {options.map(o => (
                  <option key={o.id} value={o.id}>{o.nom} {o.categorie ? `(${o.categorie})` : ''}</option>
                ))}
              </select>
            )}

            {sourceType === 'catalogue' && (
              <select
                value={selectedCatalogueFormule?.id || ''}
                onChange={e => setSelectedCatalogueFormule(catalogueFormules.find(f => f.id === e.target.value) || null)}
                className="flex h-9 w-full rounded-md border border-input bg-transparent px-3 py-1 text-sm shadow-sm focus-visible:outline-none focus-visible:ring-1 focus-visible:ring-ring"
              >
                <option value="">Sélectionner une formule…</option>
                {catalogueFormules.map(f => (
                  <option key={f.id} value={f.id}>{f.nom}{f.prix ? ` — ${f.prix} €/pers.` : ''}</option>
                ))}
              </select>
            )}
          </div>

          {/* Fournisseur */}
          <div className="space-y-1.5">
            <label className="text-sm font-medium">Fournisseur *</label>
            <select
              value={selectedFourn?.id || ''}
              onChange={e => setSelectedFourn(fournisseurs.find(f => f.id === e.target.value) || null)}
              className="flex h-9 w-full rounded-md border border-input bg-transparent px-3 py-1 text-sm shadow-sm focus-visible:outline-none focus-visible:ring-1 focus-visible:ring-ring"
            >
              <option value="">Sélectionner un fournisseur…</option>
              {fournisseurs.map(f => (
                <option key={f.id} value={f.id}>{f.nom}</option>
              ))}
            </select>
          </div>

          {/* Produits */}
          <div className="space-y-3">
            <div className="flex items-center justify-between">
              <label className="text-sm font-medium">
                Produits à commander
                <span className="ml-2 text-xs text-muted-foreground font-normal">({produits.length} produit{produits.length > 1 ? 's' : ''})</span>
              </label>
            </div>

            {produits.map((p, idx) => (
              <ProduitRow
                key={p.id}
                produit={p}
                onChange={val => updateProduit(idx, val)}
                onRemove={() => removeProduit(idx)}
                showRemove={produits.length > 1}
              />
            ))}

            <button
              type="button"
              onClick={addProduit}
              className="w-full flex items-center justify-center gap-2 py-2.5 rounded-xl border-2 border-dashed border-border text-sm text-muted-foreground hover:border-primary hover:text-primary transition-colors font-medium"
            >
              <Plus size={15} /> Ajouter un produit
            </button>
          </div>

          <div className="space-y-1.5">
            <label className="text-sm font-medium">Notes de la règle</label>
            <Input value={notesRegle} onChange={e => setNotesRegle(e.target.value)} placeholder="Précisions générales sur cette règle…" />
          </div>
        </div>

        <div className="flex justify-end gap-2 p-6 pt-4 border-t border-border shrink-0" style={{ paddingBottom: 'max(1.5rem, env(safe-area-inset-bottom))' }}>
          <Button variant="outline" onClick={onClose}>Annuler</Button>
          <Button onClick={() => saveMutation.mutate()} disabled={!isValid || saveMutation.isPending}>
            {saveMutation.isPending ? 'Enregistrement...' : 'Enregistrer'}
          </Button>
        </div>
      </div>
    </div>
  );
}