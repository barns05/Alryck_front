import { useState } from 'react';
import { useMutation, useQueryClient } from '@tanstack/react-query';
import { base44 } from '@/api/base44Client';
import { X } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';

const UNITES = ['pièces', 'lots', 'kg', 'g', 'ml', 'litres', 'bouteilles', 'plateaux'];

const PRESTATION_OPTIONS = [
  { v: 'sur_place',             l: '🏛️ Sur place' },
  { v: 'livraison',             l: '🚚 Livraison simple' },
  { v: 'prestation_complete',   l: '👨‍🍳 Prestation complète' },
];

export default function RegleMateriauModal({ regle, articles, formules, onClose }) {
  const qc = useQueryClient();

  // prestation_types: array. Empty = toutes
  const initPrestTypes = regle?.prestation_types?.length
    ? regle.prestation_types
    : regle?.prestation_type && regle.prestation_type !== 'toutes' && regle.prestation_type !== 'hors_site'
      ? [regle.prestation_type]
      : [];
  const [prestationTypes, setPrestationTypes] = useState(initPrestTypes);

  // formule_ids: array. Empty = toutes
  const initFormuleIds = regle?.formule_ids?.length
    ? regle.formule_ids
    : regle?.formule_id ? [regle.formule_id] : [];
  const [formuleIds, setFormuleIds] = useState(initFormuleIds);

  const [articleId, setArticleId] = useState(regle?.article_id || '');
  const [modeQte, setModeQte] = useState(regle?.mode_qte || 'par_personne');
  const [unite, setUnite] = useState(regle?.unite || 'pièces');
  const [qteAdulte, setQteAdulte] = useState(regle?.qte_adulte ?? '');
  const [qteAdo, setQteAdo] = useState(regle?.qte_adolescent ?? '');
  const [qteEnfant, setQteEnfant] = useState(regle?.qte_enfant ?? '');
  const [qteFixe, setQteFixe] = useState(regle?.qte_fixe ?? '');
  const [arrondi, setArrondi] = useState(regle?.arrondi || 'supérieur');
  const [notes, setNotes] = useState(regle?.notes || '');

  const togglePrestation = (v) => {
    setPrestationTypes(prev =>
      prev.includes(v) ? prev.filter(p => p !== v) : [...prev, v]
    );
  };

  const toggleFormule = (id) => {
    setFormuleIds(prev =>
      prev.includes(id) ? prev.filter(f => f !== id) : [...prev, id]
    );
  };

  const selectedArticle = articles.find(a => a.id === articleId);

  const saveMutation = useMutation({
    mutationFn: () => {
      const payload = {
        prestation_types: prestationTypes, // [] = toutes
        source_type: formuleIds.length > 0 ? 'formule_specifique' : 'toutes',
        formule_ids: formuleIds,
        formule_id: formuleIds[0] || '',
        formule_nom: formuleIds.length === 1 ? (formules.find(f => f.id === formuleIds[0])?.nom || '') : '',
        article_id: articleId,
        article_nom: selectedArticle?.nom || '',
        mode_qte: modeQte,
        unite,
        qte_adulte: parseFloat(qteAdulte) || 0,
        qte_adolescent: parseFloat(qteAdo) || 0,
        qte_enfant: parseFloat(qteEnfant) || 0,
        qte_fixe: parseFloat(qteFixe) || 0,
        arrondi,
        notes,
      };
      return regle
        ? base44.entities.RegleMateriel.update(regle.id, payload)
        : base44.entities.RegleMateriel.create(payload);
    },
    onSuccess: () => { qc.invalidateQueries(['regles-materiel']); onClose(); },
  });

  const isValid = articleId && unite && (
    modeQte === 'fixe' ? (parseFloat(qteFixe) > 0) : (parseFloat(qteAdulte) > 0 || parseFloat(qteAdo) > 0 || parseFloat(qteEnfant) > 0)
  );

  const selectClass = "flex h-9 w-full rounded-md border border-input bg-transparent px-3 py-1 text-sm shadow-sm focus-visible:outline-none focus-visible:ring-1 focus-visible:ring-ring";

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/40 backdrop-blur-sm p-4">
      <div className="bg-card rounded-2xl border border-border shadow-xl w-full max-w-lg max-h-[90vh] flex flex-col overflow-hidden">
        <div className="flex items-center justify-between p-6 pb-4 border-b border-border shrink-0">
          <h3 className="font-semibold text-lg">{regle ? 'Modifier la règle' : 'Nouvelle règle de matériel'}</h3>
          <button onClick={onClose} className="p-1.5 rounded-lg hover:bg-muted text-muted-foreground"><X size={16} /></button>
        </div>

        <div className="flex-1 overflow-y-auto p-6 pt-4 space-y-5">

          {/* Niveau 1 — Types de prestation (multi-select) */}
          <div className="space-y-2">
            <div>
              <label className="text-sm font-semibold">Niveau 1 — Types de prestation</label>
              <p className="text-xs text-muted-foreground">Aucune sélection = s'applique à toutes les prestations</p>
            </div>
            <div className="space-y-2">
              {PRESTATION_OPTIONS.map(({ v, l }) => {
                const checked = prestationTypes.includes(v);
                return (
                  <label key={v} className={`flex items-center gap-3 px-3 py-2.5 rounded-xl border cursor-pointer transition-colors ${checked ? 'border-primary bg-primary/5' : 'border-border hover:bg-muted/30'}`}>
                    <input
                      type="checkbox"
                      checked={checked}
                      onChange={() => togglePrestation(v)}
                      className="w-4 h-4 accent-primary"
                    />
                    <span className="text-sm font-medium">{l}</span>
                  </label>
                );
              })}
            </div>
            {prestationTypes.length === 0 && (
              <p className="text-xs text-emerald-600 bg-emerald-50 border border-emerald-200 rounded-lg px-3 py-2">
                ✓ S'appliquera à toutes les prestations
              </p>
            )}
          </div>

          {/* Niveau 2 — Formules (multi-select) */}
          <div className="space-y-2">
            <div>
              <label className="text-sm font-semibold">Niveau 2 — Formules <span className="font-normal text-muted-foreground">(optionnel)</span></label>
              <p className="text-xs text-muted-foreground">Aucune sélection = toutes les formules</p>
            </div>
            {formules.length === 0 ? (
              <p className="text-xs text-muted-foreground italic">Aucune formule disponible</p>
            ) : (
              <div className="space-y-2 max-h-40 overflow-y-auto border border-border rounded-xl p-2">
                {formules.map(f => {
                  const checked = formuleIds.includes(f.id);
                  return (
                    <label key={f.id} className={`flex items-center gap-3 px-3 py-2 rounded-lg cursor-pointer transition-colors ${checked ? 'bg-primary/5 border border-primary' : 'hover:bg-muted/30 border border-transparent'}`}>
                      <input
                        type="checkbox"
                        checked={checked}
                        onChange={() => toggleFormule(f.id)}
                        className="w-4 h-4 accent-primary"
                      />
                      <span className="text-sm">{f.nom}</span>
                    </label>
                  );
                })}
              </div>
            )}
            {formuleIds.length === 0 && (
              <p className="text-xs text-emerald-600 bg-emerald-50 border border-emerald-200 rounded-lg px-3 py-2">
                ✓ S'appliquera à toutes les formules
              </p>
            )}
          </div>

          {/* Article */}
          <div className="space-y-1.5">
            <label className="text-sm font-medium">Article matériel *</label>
            <select value={articleId} onChange={e => setArticleId(e.target.value)} className={selectClass}>
              <option value="">Sélectionner un article…</option>
              {articles.map(a => <option key={a.id} value={a.id}>{a.nom} {a.categorie ? `(${a.categorie})` : ''}</option>)}
            </select>
          </div>

          {/* Mode calcul */}
          <div className="space-y-1.5">
            <label className="text-sm font-medium">Mode de calcul</label>
            <div className="flex gap-2">
              {[{ v: 'par_personne', l: '👤 Par personne' }, { v: 'fixe', l: '📦 Quantité fixe' }].map(({ v, l }) => (
                <button key={v} type="button" onClick={() => setModeQte(v)}
                  className={`flex-1 text-xs py-1.5 rounded-lg border transition-colors font-medium ${modeQte === v ? 'border-primary bg-primary/10 text-primary' : 'border-border hover:bg-muted text-muted-foreground'}`}>
                  {l}
                </button>
              ))}
            </div>
          </div>

          {/* Unité */}
          <div className="space-y-1.5">
            <label className="text-sm font-medium">Unité</label>
            <div className="flex gap-1.5 flex-wrap">
              {UNITES.map(u => (
                <button key={u} type="button" onClick={() => setUnite(u)}
                  className={`text-xs px-2.5 py-1 rounded-full border font-medium transition-colors ${unite === u ? 'bg-primary text-primary-foreground border-primary' : 'bg-card border-border text-muted-foreground hover:bg-muted'}`}>
                  {u}
                </button>
              ))}
            </div>
            <Input value={UNITES.includes(unite) ? '' : unite} onChange={e => e.target.value && setUnite(e.target.value)} placeholder="Unité personnalisée…" className="text-sm h-8 mt-1" />
          </div>

          {/* Quantités */}
          {modeQte === 'par_personne' ? (
            <div className="space-y-1.5">
              <label className="text-sm font-medium">Quantités par convive ({unite})</label>
              <div className="grid grid-cols-3 gap-2">
                <div>
                  <label className="text-[10px] text-muted-foreground block mb-1">Adulte</label>
                  <Input type="number" step="any" value={qteAdulte} onChange={e => setQteAdulte(e.target.value)} placeholder="0" />
                </div>
                <div>
                  <label className="text-[10px] text-muted-foreground block mb-1">Adolescent</label>
                  <Input type="number" step="any" value={qteAdo} onChange={e => setQteAdo(e.target.value)} placeholder="0" />
                </div>
                <div>
                  <label className="text-[10px] text-muted-foreground block mb-1">Enfant</label>
                  <Input type="number" step="any" value={qteEnfant} onChange={e => setQteEnfant(e.target.value)} placeholder="0" />
                </div>
              </div>
              <div className="flex gap-2 pt-1">
                {[{ v: 'supérieur', l: '⬆️ Arrondi sup.' }, { v: 'inférieur', l: '⬇️ Arrondi inf.' }].map(({ v, l }) => (
                  <button key={v} type="button" onClick={() => setArrondi(v)}
                    className={`flex-1 text-xs py-1.5 rounded-lg border transition-colors font-medium ${arrondi === v ? 'border-primary bg-primary/10 text-primary' : 'border-border hover:bg-muted text-muted-foreground'}`}>
                    {l}
                  </button>
                ))}
              </div>
            </div>
          ) : (
            <div className="space-y-1.5">
              <label className="text-sm font-medium">Quantité fixe ({unite})</label>
              <Input type="number" step="any" value={qteFixe} onChange={e => setQteFixe(e.target.value)} placeholder="ex: 5" className="max-w-[140px]" />
            </div>
          )}

          <div className="space-y-1.5">
            <label className="text-sm font-medium">Notes (optionnel)</label>
            <Input value={notes} onChange={e => setNotes(e.target.value)} placeholder="Précisions…" />
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