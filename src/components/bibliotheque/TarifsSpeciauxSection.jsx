/**
 * Section "Tarifs spéciaux" — vue structurée par formule principale.
 * Pour chaque formule : affiche les tarifs associés (enfant / ado / prestataire / etc.)
 * avec prix, badge type, et édition inline.
 */
import { useState } from 'react';
import { useMutation, useQueryClient } from '@tanstack/react-query';
import { Pencil, Check, X, Plus } from 'lucide-react';
import { base44 } from '@/api/base44Client';
import { toast } from 'sonner';
import EditArticleModal from './EditArticleModal';

const BADGE_STYLES = {
  enfant:      'bg-pink-100 text-pink-700 border-pink-200',
  ado:         'bg-orange-100 text-orange-700 border-orange-200',
  prestataire: 'bg-blue-100 text-blue-700 border-blue-200',
  supplement:  'bg-violet-100 text-violet-700 border-violet-200',
  heure_supp:  'bg-slate-100 text-slate-600 border-slate-200',
  autre:       'bg-slate-100 text-slate-600 border-slate-200',
};

const BADGE_LABELS = {
  enfant:      '🧒 Enfant',
  ado:         '🧑 Ado',
  prestataire: '👷 Prestataire',
  supplement:  '➕ Supplément',
  heure_supp:  '⏱ Heure supp.',
  autre:       'Autre',
};

const TYPE_TARIF_OPTIONS = [
  { id: 'enfant',      label: '🧒 Menu enfant',   cls: 'text-pink-700 border-pink-300 hover:bg-pink-50' },
  { id: 'ado',         label: '🧑 Menu ado',       cls: 'text-orange-700 border-orange-300 hover:bg-orange-50' },
  { id: 'prestataire', label: '👷 Prestataire',    cls: 'text-blue-700 border-blue-300 hover:bg-blue-50' },
];

// ─── Ligne tarif avec édition inline ─────────────────────────────────────────
function TarifRow({ item, formuleName }) {
  const [editing, setEditing] = useState(false);
  const [draft, setDraft] = useState({ prix: item.prix ?? '', type_calcul: item.type_calcul || 'fixe', valeur_calcul: item.valeur_calcul ?? '' });
  const qc = useQueryClient();

  const saveMutation = useMutation({
    mutationFn: () => base44.entities.CatalogueItem.update(item.id, {
      prix: draft.prix !== '' ? Number(draft.prix) : null,
      type_calcul: draft.type_calcul || 'fixe',
      valeur_calcul: draft.valeur_calcul !== '' ? Number(draft.valeur_calcul) : null,
    }),
    onSuccess: () => {
      qc.invalidateQueries(['catalogue-items']);
      toast.success('✓ Tarif mis à jour', { position: 'top-center', duration: 2000, style: { background: '#16a34a', color: '#fff' } });
      setEditing(false);
    },
  });

  const badgeClass = BADGE_STYLES[item.type_tarif] || BADGE_STYLES.autre;
  const badgeLabel = BADGE_LABELS[item.type_tarif] || item.type_tarif;
  const hasPrix = item.prix != null && item.prix > 0;

  if (editing) {
    return (
      <div className="flex items-center gap-2 py-2 border-b border-border/30 last:border-0 bg-primary/5 rounded-lg px-3 -mx-1">
        <span className="text-sm font-medium flex-1 min-w-0 truncate">{item.nom}</span>
        {/* Prix fixe */}
        <div className="flex items-center gap-1 shrink-0">
          <span className="text-xs text-muted-foreground">€</span>
          <input
            type="number"
            min="0"
            step="0.01"
            value={draft.prix}
            onChange={e => setDraft(d => ({ ...d, prix: e.target.value }))}
            className="w-20 h-7 rounded-md border border-input bg-white px-2 text-sm focus:outline-none focus:ring-1 focus:ring-ring"
            placeholder="Prix"
          />
        </div>
        {/* Mode calcul */}
        <select
          value={draft.type_calcul}
          onChange={e => setDraft(d => ({ ...d, type_calcul: e.target.value }))}
          className="h-7 rounded-md border border-input bg-white px-1.5 text-xs focus:outline-none focus:ring-1 focus:ring-ring"
        >
          <option value="fixe">Fixe</option>
          <option value="deduction_montant">- montant</option>
          <option value="deduction_pourcentage">- %</option>
        </select>
        {/* Valeur calcul (si pas fixe) */}
        {draft.type_calcul !== 'fixe' && (
          <input
            type="number"
            min="0"
            step="0.01"
            value={draft.valeur_calcul}
            onChange={e => setDraft(d => ({ ...d, valeur_calcul: e.target.value }))}
            className="w-16 h-7 rounded-md border border-input bg-white px-2 text-xs focus:outline-none focus:ring-1 focus:ring-ring"
            placeholder={draft.type_calcul === 'deduction_pourcentage' ? '%' : '€'}
          />
        )}
        {/* Boutons */}
        <button onClick={() => saveMutation.mutate()} disabled={saveMutation.isPending}
          className="p-1.5 rounded-lg bg-primary text-white hover:bg-primary/90 transition-colors">
          <Check size={13} />
        </button>
        <button onClick={() => setEditing(false)}
          className="p-1.5 rounded-lg hover:bg-muted text-muted-foreground transition-colors">
          <X size={13} />
        </button>
      </div>
    );
  }

  return (
    <div className="flex items-center gap-2 py-2 border-b border-border/30 last:border-0">
      {/* Nom */}
      <span className="text-sm font-medium flex-1 min-w-0 truncate">{item.nom}</span>
      {/* Badge type */}
      <span className={`text-[10px] font-semibold px-1.5 py-0.5 rounded-full border whitespace-nowrap shrink-0 ${badgeClass}`}>
        {badgeLabel}
      </span>
      {/* Prix */}
      {hasPrix ? (
        <span className="text-sm font-bold text-primary shrink-0">
          {item.prix}&nbsp;€
        </span>
      ) : (
        <span className="text-[11px] font-semibold bg-orange-100 text-orange-700 border border-orange-200 px-1.5 py-0.5 rounded-full shrink-0 whitespace-nowrap">
          ⚠️ Prix manquant
        </span>
      )}
      {/* Édition */}
      <button onClick={() => { setDraft({ prix: item.prix ?? '', type_calcul: item.type_calcul || 'fixe', valeur_calcul: item.valeur_calcul ?? '' }); setEditing(true); }}
        className="p-1.5 rounded-lg hover:bg-primary/10 text-muted-foreground hover:text-primary transition-colors shrink-0"
        title="Modifier ce tarif">
        <Pencil size={13} />
      </button>
    </div>
  );
}

// ─── Bloc d'une formule avec ses tarifs ──────────────────────────────────────
function FormulaireBlock({ formule, tarifsDeFormule, onRefresh }) {
  const [createModal, setCreateModal] = useState(false);
  const [createType, setCreateType] = useState('enfant');
  const nomSeul = formule.nom.split('—')[0].trim();

  const ouvrirCreation = (type) => {
    setCreateType(type);
    setCreateModal(true);
  };

  return (
    <div className="bg-card border border-border rounded-2xl overflow-hidden">
      {/* Header formule */}
      <div className="px-4 py-3 bg-muted/30 flex items-center gap-2 border-b border-border/60">
        <span className="font-bold text-sm">{nomSeul}</span>
        {formule.prix > 0 && (
          <span className="text-xs font-semibold text-primary bg-primary/10 px-2 py-0.5 rounded-full">
            {formule.prix} €/pers.
          </span>
        )}
        <span className="ml-auto text-xs text-muted-foreground">
          {tarifsDeFormule.length} tarif{tarifsDeFormule.length !== 1 ? 's' : ''}
        </span>
      </div>

      {/* Tarifs */}
      <div className="px-4 py-2">
        {tarifsDeFormule.length === 0 ? (
          <p className="text-xs text-muted-foreground italic py-2">Aucun tarif spécial associé.</p>
        ) : (
          <div>
            {tarifsDeFormule.map(item => (
              <TarifRow key={item.id} item={item} formuleName={nomSeul} />
            ))}
          </div>
        )}

        {/* Boutons ajout rapide */}
        <div className="flex items-center gap-1.5 flex-wrap pt-2 pb-1">
          {TYPE_TARIF_OPTIONS.map(({ id, label, cls }) => (
            <button
              key={id}
              onClick={() => ouvrirCreation(id)}
              className={`text-[11px] font-medium px-2.5 py-1 rounded-lg border bg-white transition-colors flex items-center gap-1 ${cls}`}
            >
              <Plus size={10} /> {label}
            </button>
          ))}
        </div>
      </div>

      {createModal && (
        <EditArticleModal
          defaultSection="tarifs"
          defaultTypeTarif={createType}
          defaultFormule={nomSeul}
          formules={[nomSeul]}
          onClose={() => { setCreateModal(false); onRefresh?.(); }}
        />
      )}
    </div>
  );
}

// ─── Export principal ─────────────────────────────────────────────────────────
export default function TarifsSpeciauxSection({ tarifsSpeciaux, formules, onRefresh }) {
  // Pour chaque formule, trouver ses tarifs spéciaux associés
  const getTarifsForFormule = (formule) => {
    const nomSeul = formule.nom.split('—')[0].trim();
    return tarifsSpeciaux.filter(t =>
      !t.formules_associees?.length || // toutes formules
      t.toutes_formules === true ||
      t.formules_associees.includes(nomSeul)
    );
  };

  return (
    <div className="mt-6 space-y-3">
      {/* Titre section */}
      <div className="flex items-center gap-3">
        <div className="h-px flex-1 bg-border" />
        <span className="text-xs font-bold text-muted-foreground uppercase tracking-widest whitespace-nowrap">
          🧒 Tarifs spéciaux par formule
        </span>
        <div className="h-px flex-1 bg-border" />
      </div>

      {formules.length === 0 ? (
        <p className="text-xs text-muted-foreground italic text-center py-3">
          Créez d'abord des formules pour y associer des tarifs spéciaux.
        </p>
      ) : (
        <div className="space-y-3">
          {formules.map(formule => (
            <FormulaireBlock
              key={formule.id}
              formule={formule}
              tarifsDeFormule={getTarifsForFormule(formule)}
              onRefresh={onRefresh}
            />
          ))}
        </div>
      )}
    </div>
  );
}