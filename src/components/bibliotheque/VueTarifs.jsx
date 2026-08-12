/**
 * Vue "Tarifs" — une carte par formule principale avec ses tarifs associés.
 * Création via TarifWizardModal (3 étapes).
 */
import { useState, useEffect } from 'react';
import { useQueryClient } from '@tanstack/react-query';
import { Plus, Pencil, Trash2, X } from 'lucide-react';
import { toast } from 'sonner';
import { base44 } from '@/api/base44Client';
import DeleteConfirmModal from '@/components/ui/DeleteConfirmModal';
import PrixFormulaireModal from './PrixFormulaireModal';
import TarifWizardModal from './TarifWizardModal';
import { Input } from '@/components/ui/input';
import { Button } from '@/components/ui/button';
import { useTVASuggestion, TVA_TAUX } from '@/hooks/useTVASuggestion';
import { useOwnerCompanySettings } from '@/hooks/useOwnerCompanySettings';

// ─── Éditeur prix par année ──────────────────────────────────────────────────
function PrixParAnneeEditor({ itemId, prixParAnnee = [], onSaved }) {
  const qc = useQueryClient();
  const [newAnnee, setNewAnnee] = useState('');
  const [newPrix, setNewPrix] = useState('');
  const [saving, setSaving] = useState(false);

  const save = async (updated) => {
    setSaving(true);
    await base44.entities.CatalogueItem.update(itemId, { prix_par_annee: updated });
    qc.invalidateQueries(['catalogue-items']);
    onSaved?.();
    setSaving(false);
  };

  const ajouter = async () => {
    const annee = parseInt(newAnnee);
    const prix = parseFloat(newPrix);
    if (!annee || isNaN(prix)) return;
    const updated = [...prixParAnnee.filter(p => p.annee !== annee), { annee, prix }]
      .sort((a, b) => a.annee - b.annee);
    await save(updated);
    setNewAnnee(''); setNewPrix('');
  };

  const supprimer = (annee) => save(prixParAnnee.filter(p => p.annee !== annee));

  return (
    <div className="mt-2 space-y-1.5 pl-2 border-l-2 border-primary/20">
      <p className="text-[10px] font-semibold text-muted-foreground uppercase tracking-wide">Prix par année</p>
      {prixParAnnee.map(p => (
        <div key={p.annee} className="flex items-center gap-2 bg-muted/40 rounded-lg px-2 py-1">
          <span className="text-xs font-semibold text-muted-foreground w-12">{p.annee}</span>
          <span className="text-xs font-bold text-primary flex-1">{p.prix} €</span>
          <button onClick={() => supprimer(p.annee)} className="text-muted-foreground hover:text-destructive" disabled={saving}>
            <X size={12} />
          </button>
        </div>
      ))}
      <div className="flex items-center gap-1.5">
        <input type="number" value={newAnnee} onChange={e => setNewAnnee(e.target.value)}
          placeholder="Année" min="2024" max="2035"
          className="flex h-7 w-20 rounded-md border border-input bg-transparent px-2 text-xs focus-visible:outline-none focus-visible:ring-1 focus-visible:ring-ring" />
        <input type="number" value={newPrix} onChange={e => setNewPrix(e.target.value)}
          placeholder="Prix €" min="0" step="0.01"
          className="flex h-7 flex-1 rounded-md border border-input bg-transparent px-2 text-xs focus-visible:outline-none focus-visible:ring-1 focus-visible:ring-ring" />
        <button onClick={ajouter} disabled={saving || !newAnnee || !newPrix}
          className="flex items-center gap-1 h-7 px-2 rounded-md bg-primary/10 text-primary text-xs font-medium hover:bg-primary/20 transition-colors disabled:opacity-50">
          <Plus size={11} /> Ajouter
        </button>
      </div>
    </div>
  );
}

// ─── Modale choix type de prix ────────────────────────────────────────────────
function ChoixPrixModal({ formule, onClose, onSaved, onChoixVariable }) {
  const qc = useQueryClient();
  const { settings } = useOwnerCompanySettings();
  const assujetti = settings?.assujetti_tva !== false;
  const nomSeul = formule.nom.split('—')[0].trim();
  const [choix, setChoix] = useState('fixe');
  const { tvaTaux, changeTaux, prixHT, setPrixHT, prixTTC, setPrixTTC, suggestingTVA, suggestTVA } = useTVASuggestion({
    initialTaux: formule.tva_taux ?? 20,
    initialPrixHT: formule.prix != null ? String(formule.prix) : '',
    initialPrixTTC: formule.prix_ttc != null ? String(formule.prix_ttc) : '',
  });
  const [saving, setSaving] = useState(false);
  // Mode saisie : 'ttc' par défaut
  const [modeSaisie, setModeSaisie] = useState('ttc');

  // Suggérer TVA à l'ouverture uniquement si assujetti et pas encore de prix (= création)
  const isCreation = !formule.prix && !formule.prix_ttc;
  useEffect(() => {
    if (assujetti && isCreation && nomSeul.length > 2) {
      suggestTVA(nomSeul, '');
    }
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  const handleSave = async () => {
    if (choix === 'variable') {
      onClose();
      onChoixVariable();
      return;
    }
    setSaving(true);
    await base44.entities.CatalogueItem.update(formule.id, {
      prix: prixHT !== '' ? parseFloat(prixHT) : null,
      prix_ttc: prixTTC !== '' ? parseFloat(prixTTC) : null,
      tva_taux: tvaTaux,
    });
    qc.invalidateQueries(['catalogue-items']);
    onSaved?.();
    onClose();
  };

  return (
    <div className="fixed inset-0 z-[70] bg-black/50 backdrop-blur-sm flex items-center justify-center p-4" onClick={onClose}>
      <div className="bg-card rounded-2xl border border-border shadow-xl w-full max-w-xs" onClick={e => e.stopPropagation()}>
        <div className="flex items-center justify-between px-5 py-4 border-b border-border">
          <h2 className="font-bold text-base">💰 Prix — {nomSeul}</h2>
          <button onClick={onClose} className="p-1.5 rounded-lg hover:bg-muted text-muted-foreground"><X size={16} /></button>
        </div>
        <div className="px-5 py-4 space-y-4">
          <p className="text-xs font-semibold text-muted-foreground uppercase tracking-wider">Type de prix</p>
          <div className="space-y-2">
            <label className="flex items-center gap-3 cursor-pointer">
              <input type="radio" name="choix_prix" value="fixe" checked={choix === 'fixe'} onChange={() => setChoix('fixe')} className="accent-primary" />
              <span className="text-sm">Prix fixe</span>
            </label>
            {choix === 'fixe' && (
              <div className="ml-6 space-y-3">
                {/* Taux TVA — masqué si franchise */}
                {assujetti && (
                  <div>
                    <label className="text-xs font-medium text-muted-foreground mb-1 flex items-center gap-2 block">
                      Taux TVA
                      {suggestingTVA && <span className="text-[10px] text-primary animate-pulse">✨ Analyse…</span>}
                    </label>
                    <div className="flex gap-1.5">
                      {TVA_TAUX.map(t => (
                        <button
                          key={t}
                          type="button"
                          onClick={() => changeTaux(t, modeSaisie)}
                          className={`flex-1 text-xs py-1.5 rounded-lg border font-semibold transition-colors ${
                            tvaTaux === t ? 'bg-primary text-primary-foreground border-primary' : 'bg-card border-border text-muted-foreground hover:bg-muted'
                          }`}
                        >
                          {t}%
                        </button>
                      ))}
                    </div>
                  </div>
                )}
                {/* Toggle mode saisie TTC / HT (assujetti seulement) */}
                {assujetti && (
                  <div className="flex rounded-lg border border-input overflow-hidden w-full">
                    {['ttc', 'ht'].map(m => (
                      <button
                        key={m}
                        type="button"
                        onClick={() => setModeSaisie(m)}
                        className={`flex-1 py-1.5 text-xs font-semibold transition-colors ${modeSaisie === m ? 'bg-primary text-primary-foreground' : 'bg-transparent text-muted-foreground hover:bg-muted'}`}
                      >
                        Saisir en {m.toUpperCase()}
                      </button>
                    ))}
                  </div>
                )}
                {/* Champ principal */}
                {assujetti && modeSaisie === 'ttc' ? (
                  <>
                    <div className="relative">
                      <Input
                        type="number" min="0" step="0.01"
                        value={prixTTC} onChange={e => setPrixTTC(e.target.value)}
                        placeholder="ex: 106.80" autoFocus
                        className="pr-24"
                      />
                      <span className="absolute right-3 top-1/2 -translate-y-1/2 text-xs text-muted-foreground">€ TTC/pers.</span>
                    </div>
                    <div className="relative">
                      <Input
                        type="number" min="0" step="0.01"
                        value={prixHT} readOnly tabIndex={-1}
                        placeholder="—"
                        className="pr-20 bg-muted/40 text-muted-foreground cursor-default"
                      />
                      <span className="absolute right-3 top-1/2 -translate-y-1/2 text-xs text-muted-foreground">€ HT (calc.)</span>
                    </div>
                  </>
                ) : (
                  <>
                    <div className="relative">
                      <Input
                        type="number" min="0" step="0.01"
                        value={prixHT} onChange={e => setPrixHT(e.target.value)}
                        placeholder="ex: 89.00" autoFocus={!assujetti}
                        className={assujetti ? 'pr-20' : 'pr-12'}
                      />
                      <span className="absolute right-3 top-1/2 -translate-y-1/2 text-xs text-muted-foreground">{assujetti ? '€ HT/pers.' : '€'}</span>
                    </div>
                    {assujetti && (
                      <div className="relative">
                        <Input
                          type="number" min="0" step="0.01"
                          value={prixTTC} readOnly tabIndex={-1}
                          placeholder="—"
                          className="pr-24 bg-muted/40 text-muted-foreground cursor-default"
                        />
                        <span className="absolute right-3 top-1/2 -translate-y-1/2 text-xs text-muted-foreground">€ TTC (calc.)</span>
                      </div>
                    )}
                  </>
                )}
              </div>
            )}
            <label className="flex items-center gap-3 cursor-pointer">
              <input type="radio" name="choix_prix" value="variable" checked={choix === 'variable'} onChange={() => setChoix('variable')} className="accent-primary" />
              <span className="text-sm">Prix variable (règles)</span>
            </label>
          </div>
        </div>
        <div className="flex gap-2 justify-end px-5 py-4 border-t border-border">
          <Button variant="outline" onClick={onClose} disabled={saving}>Annuler</Button>
          <Button onClick={handleSave} disabled={saving || (choix === 'fixe' && prixHT === '' && prixTTC === '')}>
            {choix === 'variable' ? 'Définir les règles →' : 'Sauvegarder'}
          </Button>
        </div>
      </div>
    </div>
  );
}

const BADGE_STYLES = {
  enfant:      'bg-pink-100 text-pink-700 border-pink-200',
  ado:         'bg-orange-100 text-orange-700 border-orange-200',
  prestataire: 'bg-blue-100 text-blue-700 border-blue-200',
  supplement:  'bg-violet-100 text-violet-700 border-violet-200',
  heure_supp:  'bg-slate-100 text-slate-600 border-slate-200',
  formule:     'bg-primary/10 text-primary border-primary/20',
  autre:       'bg-slate-100 text-slate-600 border-slate-200',
};
const BADGE_LABELS = {
  enfant:      '🧒 Enfant',
  ado:         '🧑 Ado',
  prestataire: '👷 Prestataire',
  supplement:  '➕ Supplément',
  heure_supp:  '⏱ H. supp.',
  formule:     '💰 Formule',
  autre:       'Autre',
};

// ─── Ligne tarif ─────────────────────────────────────────────────────────────
function TarifRow({ item, formulesItems, onRefresh }) {
  const qc = useQueryClient();
  const [editModal, setEditModal] = useState(false);
  const [deleteModal, setDeleteModal] = useState(false);
  const [showPrixAnnee, setShowPrixAnnee] = useState(false);
  const badgeClass = BADGE_STYLES[item.type_tarif] || BADGE_STYLES.autre;
  const badgeLabel = BADGE_LABELS[item.type_tarif] || item.type_tarif;
  const hasPrix = item.prix != null && item.prix > 0;

  const [deleting, setDeleting] = useState(false);

  // ── Aperçu des prix calculés par formule associée ──────────────────────────
  const prixCalculesApercu = (() => {
    if (item.type_calcul === 'fixe' || !item.valeur_calcul) return [];
    const formules = item.toutes_formules
      ? formulesItems
      : formulesItems.filter(f => (item.formules_associees || []).includes(f.nom.split('—')[0].trim()));
    return formules.map(f => {
      if (!f.prix) return null;
      const deduit = item.type_calcul === 'deduction_pourcentage'
        ? Math.max(0, f.prix - f.prix * item.valeur_calcul / 100)
        : Math.max(0, f.prix - item.valeur_calcul);
      return `${f.nom.split('—')[0].trim()} → ${deduit.toFixed(0)}€`;
    }).filter(Boolean);
  })();

  // ── Libellé descriptif de la règle ────────────────────────────────────────
  const regleLabel = (() => {
    const cibles = item.toutes_formules
      ? 'toutes formules'
      : (item.formules_associees || []).join(', ') || '—';
    if (item.type_calcul === 'deduction_montant')
      return `Déduction -${item.valeur_calcul}€ sur ${cibles}`;
    if (item.type_calcul === 'deduction_pourcentage')
      return `Déduction -${item.valeur_calcul}% sur ${cibles}`;
    if (item.type_calcul === 'fixe' && hasPrix)
      return `Prix fixe ${item.prix}€`;
    return null;
  })();

  const handleDelete = async () => {
    if (deleting) return;
    setDeleting(true);
    await base44.entities.CatalogueItem.delete(item.id);
    qc.invalidateQueries(['catalogue-items']);
    toast.success('Tarif supprimé');
    setDeleteModal(false);
    setDeleting(false);
  };

  return (
    <>
      <div className="flex items-start gap-2 py-2 border-b border-border/30 last:border-0">
        <div className="flex-1 min-w-0 space-y-0.5">
          <div className="flex items-center gap-1.5 flex-wrap">
            <span className="text-sm font-medium truncate">{item.nom}</span>
            {(item.toutes_formules === true || !item.formules_associees?.length) && (
              <span className="text-[10px] font-semibold bg-blue-100 text-blue-700 border border-blue-200 px-1.5 py-0.5 rounded-full shrink-0 whitespace-nowrap">
                🌐 Toutes formules
              </span>
            )}
          </div>
          {regleLabel && (
            <p className="text-xs text-muted-foreground">{regleLabel}</p>
          )}
          {prixCalculesApercu.length > 0 && (
            <p className="text-xs text-blue-600">{prixCalculesApercu.join(' | ')}</p>
          )}
        </div>
        <span className={`text-[10px] font-semibold px-1.5 py-0.5 rounded-full border whitespace-nowrap shrink-0 mt-0.5 ${badgeClass}`}>
          {badgeLabel}
        </span>
        {hasPrix ? (
          <span className="text-sm font-bold text-primary shrink-0 whitespace-nowrap mt-0.5">{item.prix} €</span>
        ) : item.type_calcul && item.type_calcul !== 'fixe' ? (
          <span className="text-[11px] font-semibold bg-blue-100 text-blue-700 border border-blue-200 px-1.5 py-0.5 rounded-full shrink-0 whitespace-nowrap mt-0.5">
            💰 Calculé
          </span>
        ) : null}
        <button
          onClick={() => setEditModal(true)}
          className="p-1.5 rounded-lg hover:bg-primary/10 text-muted-foreground hover:text-primary transition-colors shrink-0"
          title="Modifier le prix"
        >
          <Pencil size={13} />
        </button>
        <button
          onClick={() => setShowPrixAnnee(v => !v)}
          className="p-1.5 rounded-lg hover:bg-muted text-muted-foreground hover:text-primary transition-colors shrink-0"
          title="Prix par année"
        >
          📅
        </button>
        <button
          onClick={() => setDeleteModal(true)}
          className="p-1.5 rounded-lg hover:bg-red-50 text-muted-foreground hover:text-red-600 transition-colors shrink-0"
          title="Supprimer ce tarif"
        >
          <Trash2 size={13} />
        </button>
      </div>
      {showPrixAnnee && (
        <PrixParAnneeEditor
          itemId={item.id}
          prixParAnnee={item.prix_par_annee || []}
          onSaved={onRefresh}
        />
      )}
      {editModal && (
        <PrixFormulaireModal
          formule={item}
          formulesDisponibles={formulesItems}
          onClose={() => setEditModal(false)}
          onSaved={onRefresh}
        />
      )}
      <DeleteConfirmModal
        open={deleteModal}
        title="Supprimer ce tarif ?"
        description={`« ${item.nom} » sera définitivement supprimé.`}
        onConfirm={handleDelete}
        onCancel={() => setDeleteModal(false)}
        loading={deleting}
      />
    </>
  );
}

// ─── Carte formule ────────────────────────────────────────────────────────────
function FormulaCard({ formule, tarifsDeFormule, formulesItems, onRefresh }) {
  const [wizardFormule, setWizardFormule] = useState(null);
  const [choixPrixModal, setChoixPrixModal] = useState(false);
  const [wizardEditOpen, setWizardEditOpen] = useState(false);
  const [showPrixAnnee, setShowPrixAnnee] = useState(false);
  const qc = useQueryClient();
  const nomSeul = formule.nom.split('—')[0].trim();

  const aPrixFixe = formule.prix > 0 || formule.prix_ttc > 0;
  const aTarifs = tarifsDeFormule.length > 0;

  const handleRefresh = () => qc.invalidateQueries(['catalogue-items']);

  return (
    <div className="bg-card border border-border rounded-2xl overflow-hidden">
      {/* Header */}
      <div className="px-4 py-3 bg-muted/30 flex flex-col gap-1.5 border-b border-border/60">
        <div className="flex items-center gap-2">
          <span className="font-bold text-sm">{nomSeul}</span>
          {aPrixFixe ? (
            <span className="text-xs font-semibold text-primary bg-primary/10 px-2 py-0.5 rounded-full">
              {formule.prix_ttc > 0
                ? `${formule.prix_ttc} € TTC/pers.`
                : `${formule.prix} € HT/pers.`}
            </span>
          ) : aTarifs ? (
            <span className="text-[11px] font-semibold bg-blue-100 text-blue-700 border border-blue-200 px-1.5 py-0.5 rounded-full">
              💰 Prix variable
            </span>
          ) : (
            <span className="text-[11px] font-semibold bg-orange-100 text-orange-700 border border-orange-200 px-1.5 py-0.5 rounded-full">
              ⚠️ Prix manquant
            </span>
          )}
          <button
            onClick={() => setChoixPrixModal(true)}
            className="p-1 rounded-lg hover:bg-primary/10 text-muted-foreground hover:text-primary transition-colors"
            title="Modifier le prix de la formule"
          >
            <Pencil size={13} />
          </button>
          <button
            onClick={() => setShowPrixAnnee(v => !v)}
            className="p-1 rounded-lg hover:bg-muted text-muted-foreground hover:text-primary transition-colors text-sm"
            title="Prix par année"
          >
            📅
          </button>
          <span className="ml-auto text-xs text-muted-foreground">
            {(() => {
              const nbDerives = tarifsDeFormule.length;
              const aPrix = formule.prix > 0;
              if (aPrix && nbDerives === 0) return 'Tarif de base';
              if (aPrix && nbDerives > 0)   return `${nbDerives + 1} tarifs`;
              if (!aPrix && nbDerives > 0)  return `${nbDerives} tarif${nbDerives > 1 ? 's' : ''}`;
              return 'Prix variable';
            })()}
          </span>
        </div>
      </div>

      {/* Prix par année sur la formule principale */}
      {showPrixAnnee && (
        <div className="px-4 pb-3 border-b border-border/60">
          <PrixParAnneeEditor
            itemId={formule.id}
            prixParAnnee={formule.prix_par_annee || []}
            onSaved={handleRefresh}
          />
        </div>
      )}

      {/* Tarifs */}
      <div className="px-4 py-2">
        {tarifsDeFormule.length === 0 ? (
          <p className="text-xs text-muted-foreground italic py-2">Aucun tarif associé.</p>
        ) : (
          tarifsDeFormule.map(item => (
            <TarifRow
              key={item.id}
              item={item}
              formulesItems={formulesItems}
              onRefresh={handleRefresh}
            />
          ))
        )}
        {formule.prix > 0 ? (
          <button
            onClick={() => setWizardFormule(nomSeul)}
            className="mt-2 mb-1 w-full text-xs text-primary border border-dashed border-primary/30 rounded-lg px-3 py-1.5 hover:bg-primary/5 transition-colors text-left flex items-center gap-1"
          >
            <Plus size={11} /> Ajouter un tarif
          </button>
        ) : (
          <button
            onClick={() => setWizardFormule({ nom: nomSeul, modeRegle: true })}
            className="mt-2 mb-1 w-full text-xs text-primary border border-dashed border-primary/30 rounded-lg px-3 py-1.5 hover:bg-primary/5 transition-colors text-left flex items-center gap-1"
          >
            <Plus size={11} /> Ajouter une règle
          </button>
        )}
      </div>

      {/* Wizard — pré-coché sur cette formule */}
      {wizardFormule !== null && (
        <TarifWizardModal
          formulesItems={formulesItems}
          defaultFormule={typeof wizardFormule === 'string' ? wizardFormule : wizardFormule.nom}
          modeRegle={typeof wizardFormule === 'object' ? wizardFormule.modeRegle : false}
          onClose={() => setWizardFormule(null)}
          onSaved={handleRefresh}
        />
      )}

      {/* Modale choix type de prix */}
      {choixPrixModal && (
        <ChoixPrixModal
          formule={formule}
          onClose={() => setChoixPrixModal(false)}
          onSaved={handleRefresh}
          onChoixVariable={() => setWizardEditOpen(true)}
        />
      )}

      {/* Wizard pour prix variable (règles) */}
      {wizardEditOpen && (
        <TarifWizardModal
          formulesItems={formulesItems}
          defaultFormule={nomSeul}
          onClose={() => setWizardEditOpen(false)}
          onSaved={handleRefresh}
        />
      )}
    </div>
  );
}

// ─── Export ───────────────────────────────────────────────────────────────────
export default function VueTarifs({ items }) {
  const qc = useQueryClient();
  const [wizardOpen, setWizardOpen] = useState(false);

  const formules     = items.filter(i => i.section === 'tarifs' && i.type_tarif === 'formule');
  const tarifsSpeciaux = items.filter(i => i.section === 'tarifs' && i.type_tarif !== 'formule');

  const getTarifsForFormule = (formule) => {
    const nomSeul = formule.nom.split('—')[0].trim();
    return tarifsSpeciaux.filter(t => {
      // Règle de déduction rattachée explicitement à cette formule parente
      if (t.formule_parente === nomSeul) return true;
      // Tarif enfant direct (pas de formule_parente) associé uniquement à cette formule
      if (!t.formule_parente && (t.formules_associees || []).includes(nomSeul) && !t.toutes_formules) return true;
      return false;
    });
  };

  if (formules.length === 0) {
    return (
      <div className="text-center py-12 text-muted-foreground">
        <p className="text-4xl mb-3">💰</p>
        <p className="font-medium">Aucune formule créée</p>
        <p className="text-sm mt-1">Créez d'abord des formules dans la vue "Par formule".</p>
      </div>
    );
  }

  return (
    <div className="space-y-3 pb-10">
      {/* Bouton global */}
      <div className="flex justify-end">
        <button
          onClick={() => setWizardOpen(true)}
          className="flex items-center gap-1.5 text-xs text-primary border border-primary/30 rounded-lg px-3 py-1.5 hover:bg-primary/5 transition-colors"
        >
          <Plus size={12} /> Tarif spécial
        </button>
      </div>

      {formules.map(formule => (
        <FormulaCard
          key={formule.id}
          formule={formule}
          tarifsDeFormule={getTarifsForFormule(formule)}
          formulesItems={formules}
        />
      ))}

      {/* Wizard global — démarre à l'étape 1 */}
      {wizardOpen && (
        <TarifWizardModal
          formulesItems={formules}
          onClose={() => setWizardOpen(false)}
          onSaved={() => qc.invalidateQueries(['catalogue-items'])}
        />
      )}
    </div>
  );
}