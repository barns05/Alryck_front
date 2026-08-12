/**
 * AutoPlacementModal — Sélecteur « Configuration de la salle » (côté client).
 * Remplace l'ancienne saisie libre d'un nombre de tables par un choix entre
 * propositions validées par le prestataire, sur 3 modes :
 *  - Assis : PropositionConfig mode='assis' statut='validee' de l'EspaceLieu lié à l'événement.
 *            Sélection → crée les TableEvenement depuis les positions précalculées → fermeture
 *            (PlanSpatialView inchangé pour l'ajustement manuel).
 *  - Debout : si EspaceLieu.capacite_max_debout renseigné, le client saisit un effectif ≤ max,
 *            sauvegardé sur l'événement (mode_configuration='debout', capacite_debout_demandee).
 *  - Chaises : idem avec capacite_max_chaises (mode_configuration='chaises').
 * Mode « personnalisé » (saisie libre d'un nombre de tables via computeAutoPlacement) conservé
 * en repli dans l'onglet Assis. Si l'espace n'a ni formats ni capacités debout/chaises, on
 * retombe sur le comportement historique (personnalisé seul).
 */
import { useState } from 'react';
import { useQuery, useQueryClient } from '@tanstack/react-query';
import { base44 } from '@/api/base44Client';
import { X, Loader2, Sparkles, Users, Armchair, UtensilsCrossed, Wand2, AlertTriangle } from 'lucide-react';
import { toast } from 'sonner';
import { generateGridLayout } from '@/lib/autoPlacement';
import LoadingCristal from '@/components/LoadingCristal';


function MiniPreview({ positions, dimension = 4 }) {
  return (
    <svg viewBox="0 0 100 100" preserveAspectRatio="none" className="w-full h-full">
      <rect x="0" y="0" width="100" height="100" fill="#fafaf7" stroke="#e8e4dc" strokeWidth="0.4" />
      {(positions || []).map((p, i) => {
        const r = p.honneur ? 6 : dimension;
        if (p.forme === 'rectangulaire') {
          return (
            <rect key={i} x={p.x - r * 1.2} y={p.y - r * 0.425} width={r * 2.4} height={r * 0.85} rx="0.6"
              fill={p.honneur ? '#C5A059' : '#c7d2fe'} stroke="#1e1b4b" strokeWidth="0.3" />
          );
        }
        return (
          <circle key={i} cx={p.x} cy={p.y} r={r}
            fill={p.honneur ? '#C5A059' : '#c7d2fe'} stroke="#1e1b4b" strokeWidth="0.3" />
        );
      })}
    </svg>
  );
}

const TABS = [
  { id: 'assis', label: 'Assis', icon: UtensilsCrossed },
  { id: 'debout', label: 'Debout', icon: Users },
  { id: 'chaises', label: 'Chaises', icon: Armchair },
];

export default function AutoPlacementModal({ evenementId, evenement, espace, existingTables, onClose }) {
  const qc = useQueryClient();
  const [busy, setBusy] = useState(false);
  const [persoCount, setPersoCount] = useState(10);
  const [showPerso, setShowPerso] = useState(false);
  const [deboutVal, setDeboutVal] = useState('');
  const [chaisesVal, setChaisesVal] = useState('');
  const [confirm, setConfirm] = useState(null); // { records, evenementUpdate, successMsg }

  const espaceId = espace?.id;

  const { data: propositions = [], isLoading: propsLoading } = useQuery({
    queryKey: ['propositions-config-validees', espaceId],
    queryFn: () => base44.entities.PropositionConfig.filter({ espace_lieu_id: espaceId, statut: 'validee' }, 'ordre', 200),
    enabled: !!espaceId,
  });
  const [nbTablesPrevu, setNbTablesPrevu] = useState(evenement?.nb_tables_prevu ?? '');

  const assisProps = propositions.filter((p) => p.mode === 'assis');
  const hasFormats = Array.isArray(espace?.formats_tables) && espace.formats_tables.length > 0;
  const capDebout = espace?.capacite_max_debout || null;
  const capChaises = espace?.capacite_max_chaises || null;

  const modeAssisDispo = assisProps.length > 0 || hasFormats;
  const modeDeboutDispo = !!capDebout;
  const modeChaisesDispo = !!capChaises;

  const aucunMode = !modeAssisDispo && !modeDeboutDispo && !modeChaisesDispo;
  const hasExistingTables = existingTables && existingTables.length > 0;

  // Onglet actif par défaut : assis si dispo, sinon le premier dispo, sinon assis (personnalisé).
  const [tab, setTab] = useState(() => {
    if (modeAssisDispo) return 'assis';
    if (modeDeboutDispo) return 'debout';
    if (modeChaisesDispo) return 'chaises';
    return 'assis';
  });

  const refreshAll = () => {
    qc.invalidateQueries(['tables', evenementId]);
    qc.invalidateQueries(['evenement', evenementId]);
    qc.invalidateQueries(['propositions-config-validees', espaceId]);
    qc.invalidateQueries(['invites', evenementId]);
  };

  // Mémorise le nombre de tables prévu par le client (filtrage des propositions assis).
  const handleSaveNbTablesPrevu = async () => {
    const v = nbTablesPrevu === '' ? null : parseInt(nbTablesPrevu, 10);
    if (v !== null && Number.isNaN(v)) return;
    try {
      await base44.entities.Evenement.update(evenementId, { nb_tables_prevu: v });
      qc.invalidateQueries(['evenement', evenementId]);
    } catch {}
  };

  // === Application d'une configuration (remplace + migre les invités) ===
  // Crée les nouvelles tables, migre les invités (ancienId → nouveauId par ordre),
  // supprime les anciennes tables. Si aucune table existante, crée simplement.
  const applyConfig = async (records, evenementUpdate, successMsg) => {
    setBusy(true);
    try {
      let nouvelles = [];
      if (records.length > 0) {
        nouvelles = await base44.entities.TableEvenement.bulkCreate(records);
      }
      if (existingTables && existingTables.length > 0) {
        // Invités de l'événement pour savoir qui est placé où (lien par id, cf. fix étape 1).
        const invites = await base44.entities.Invite.filter({ evenement_id: evenementId });
        const anciennesTriees = [...existingTables].sort((a, b) => (a.ordre ?? 0) - (b.ordre ?? 0));
        const nouvellesTriees = [...nouvelles].sort((a, b) => (a.ordre ?? 0) - (b.ordre ?? 0));
        const migrationDate = new Date().toISOString();
        for (let i = 0; i < anciennesTriees.length; i++) {
          const oldT = anciennesTriees[i];
          const newT = nouvellesTriees[i];
          const aDesInvites = invites.some(inv => inv.table_attribuee === oldT.id);
          if (!aDesInvites) continue;
          if (newT) {
            await base44.entities.Invite.updateMany(
              { evenement_id: evenementId, table_attribuee: oldT.id },
              { $set: { table_attribuee: newT.id, date_assignation_table: migrationDate } }
            );
          } else {
            // Ancienne table excédentaire (plus de nouvelle correspondante) → sans table.
            await base44.entities.Invite.updateMany(
              { evenement_id: evenementId, table_attribuee: oldT.id },
              { $set: { table_attribuee: '', date_assignation_table: null } }
            );
          }
        }
        // Supprimer les anciennes tables (les invités pointent déjà vers les nouvelles).
        for (const t of anciennesTriees) {
          await base44.entities.TableEvenement.delete(t.id);
        }
      }
      await base44.entities.Evenement.update(evenementId, evenementUpdate);
      refreshAll();
      toast.success(successMsg);
      onClose();
    } catch (e) {
      console.error('applyConfig error', e);
      toast.error("Erreur lors de l'application de la configuration.");
    } finally {
      setBusy(false);
    }
  };

  // Confirmation systématique avant application d'une configuration
  // (remplacement ou première pose). Le libellé du bouton s'adapte au contexte.
  const demanderRemplacement = (records, evenementUpdate, successMsg) => {
    setConfirm({ records, evenementUpdate, successMsg });
  };

  // === Mode ASSIS : choix d'une proposition ===
  const handleChoisirProposition = (prop) => {
    const records = prop.positions.map((p, i) => ({
      evenement_id: evenementId,
      nom: p.honneur ? "Table d'honneur" : `Table ${i + 1}`,
      ordre: i,
      forme: p.forme || 'ronde',
      pos_x: p.x,
      pos_y: p.y,
    }));
    demanderRemplacement(
      records,
      { mode_configuration: 'assis', proposition_config_id: prop.id },
      `Configuration « ${prop.label} » appliquée. Ajustez les tables à la main si besoin.`
    );
  };

  // === Mode ASSIS : placement personnalisé (comportement historique) ===
  const handlePlacePerso = () => {
    const n = Math.max(1, Math.min(100, parseInt(persoCount, 10) || 1));
    const existingPositions = (existingTables || [])
      .filter((t) => t.pos_x != null && t.pos_y != null)
      .map((t) => ({ x: t.pos_x, y: t.pos_y }));
    const positions = generateGridLayout({ zones: espace?.zones || [], count: n, existingPositions });
    if (positions.length === 0) {
      toast.error("Aucune position disponible — périmètre trop petit ou zones d'exclusion trop larges.");
      return;
    }
    const records = positions.map((p, i) => ({
      evenement_id: evenementId,
      nom: `Table ${i + 1}`,
      ordre: i,
      forme: 'ronde',
      pos_x: p.x,
      pos_y: p.y,
    }));
    demanderRemplacement(
      records,
      { mode_configuration: 'personnalise', proposition_config_id: null },
      `${positions.length} tables placées automatiquement.`
    );
  };

  // === Mode DEBOUT ===
  const handleSaveDebout = async () => {
    const v = parseInt(deboutVal, 10);
    if (!v || v < 1) { toast.error('Saisissez un nombre de personnes.'); return; }
    if (capDebout && v > capDebout) { toast.error(`Le maximum pour cet espace est de ${capDebout} personnes.`); return; }
    setBusy(true);
    try {
      await base44.entities.Evenement.update(evenementId, {
        mode_configuration: 'debout',
        capacite_debout_demandee: v,
        proposition_config_id: null,
      });
      refreshAll();
      toast.success(`Mode debout — ${v} personnes enregistré.`);
      onClose();
    } catch (e) {
      toast.error("Erreur lors de l'enregistrement.");
    } finally {
      setBusy(false);
    }
  };

  // === Mode CHAISES ===
  const handleSaveChaises = async () => {
    const v = parseInt(chaisesVal, 10);
    if (!v || v < 1) { toast.error('Saisissez un nombre de personnes.'); return; }
    if (capChaises && v > capChaises) { toast.error(`Le maximum pour cet espace est de ${capChaises} personnes.`); return; }
    setBusy(true);
    try {
      await base44.entities.Evenement.update(evenementId, {
        mode_configuration: 'chaises',
        capacite_chaises_demandee: v,
        proposition_config_id: null,
      });
      refreshAll();
      toast.success(`Mode chaises — ${v} personnes enregistré.`);
      onClose();
    } finally {
      setBusy(false);
    }
  };

  const tabsVisibles = TABS.filter((t) => {
    if (t.id === 'assis') return modeAssisDispo || aucunMode;
    if (t.id === 'debout') return modeDeboutDispo;
    if (t.id === 'chaises') return modeChaisesDispo;
    return false;
  });

  return (
    <div className="fixed inset-0 z-[60] bg-black/50 flex items-center justify-center p-4">
      <div className="bg-card rounded-2xl w-full max-w-lg max-h-[92vh] overflow-y-auto p-5 space-y-4">
        <div className="flex items-center justify-between">
          <h3 className="font-semibold flex items-center gap-1.5">
            <Sparkles size={16} /> Configuration de la salle
          </h3>
          <button onClick={onClose} className="p-1.5 rounded-lg hover:bg-muted text-muted-foreground">
            <X size={16} />
          </button>
        </div>

        <p className="text-xs text-muted-foreground">
          {espace?.nom ? `Espace : ${espace.nom}. ` : ''}Choisissez un mode de configuration proposé par le lieu.
        </p>

        {aucunMode && (
          <p className="text-xs text-amber-700 bg-amber-50 border border-amber-200 rounded-lg p-2">
            Le lieu n'a pas encore publié de configurations pour cet espace. Vous pouvez utiliser le
            mode personnalisé ci-dessous pour placer vos tables librement.
          </p>
        )}

        {/* Onglets */}
        {tabsVisibles.length > 1 && (
          <div className="flex gap-1 bg-muted/40 rounded-lg p-1">
            {tabsVisibles.map((t) => {
              const Icon = t.icon;
              return (
                <button
                  key={t.id}
                  onClick={() => setTab(t.id)}
                  className={`flex-1 flex items-center justify-center gap-1.5 px-3 py-1.5 rounded-md text-xs font-semibold ${
                    tab === t.id ? 'bg-white text-foreground shadow-sm' : 'text-muted-foreground'
                  }`}
                >
                  <Icon size={13} /> {t.label}
                </button>
              );
            })}
          </div>
        )}

        {/* Contenu ASSIS */}
        {tab === 'assis' && (modeAssisDispo || aucunMode) && (
          <div className="space-y-3">
            {propsLoading ? (
              <div className="flex flex-col items-center justify-center gap-2 py-8">
                <LoadingCristal size={36} />
                <p className="text-xs text-muted-foreground">Chargement des configurations…</p>
              </div>
            ) : assisProps.length > 0 ? (
              <>
                {/* Filtre : nombre de tables prévu (mémorisé sur l'événement) */}
                <div className="rounded-xl border border-border bg-muted/30 p-3 space-y-1.5">
                  <label className="text-xs font-semibold text-foreground flex items-center gap-1.5">
                    <Armchair size={13} /> Combien de tables prévoyez-vous ?
                  </label>
                  <input
                    type="number"
                    min={0}
                    value={nbTablesPrevu}
                    onChange={(e) => setNbTablesPrevu(e.target.value)}
                    onBlur={handleSaveNbTablesPrevu}
                    className="h-10 w-28 rounded-md border border-input bg-white px-3 text-base"
                    placeholder="Ex: 8"
                  />
                  <p className="text-[11px] text-muted-foreground">
                    Les configurations avec moins de tables que prévu sont grisées.
                  </p>
                </div>

                <p className="text-xs font-semibold uppercase tracking-wider text-muted-foreground">
                  Configurations validées par le lieu
                </p>
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-2">
                  {assisProps.map((p) => {
                    const nbPrevu = parseInt(nbTablesPrevu, 10);
                    const insuffisant = nbPrevu > 0 && (p.nb_tables || 0) < nbPrevu;
                    return (
                      <button
                        key={p.id}
                        onClick={() => !insuffisant && handleChoisirProposition(p)}
                        disabled={busy || insuffisant}
                        className={`flex items-start gap-3 p-3 rounded-xl border text-left transition-colors ${
                          insuffisant
                            ? 'border-border bg-muted/30 opacity-50 cursor-not-allowed'
                            : 'border-border bg-white hover:border-primary hover:bg-primary/5'
                        } disabled:opacity-50`}
                      >
                        <div className="w-16 h-16 shrink-0 rounded-lg overflow-hidden border border-border bg-white">
                          <MiniPreview positions={p.positions} dimension={p.forme_principale === 'rectangulaire' ? 6 : 4} />
                        </div>
                        <div className="min-w-0 flex-1">
                          <p className="text-sm font-semibold leading-tight">{p.label}</p>
                          <p className="text-xs text-muted-foreground mt-0.5">
                            {p.capacite_totale} pers.
                            {p.avec_table_honneur ? ' · avec table d\'honneur' : ''}
                          </p>
                          {insuffisant && (
                            <p className="text-[10px] font-semibold mt-1" style={{ color: '#b45309' }}>
                              Insuffisant pour {nbPrevu} tables
                            </p>
                          )}
                        </div>
                      </button>
                    );
                  })}
                </div>
              </>
            ) : (
              <p className="text-xs text-muted-foreground">
                Aucune configuration assis validée par le lieu pour cet espace.
              </p>
            )}

            {/* Mode personnalisé (repli) */}
            <div className="border-t border-border pt-3">
              <button
                onClick={() => setShowPerso((s) => !s)}
                className="flex items-center gap-1.5 text-xs font-semibold text-primary"
              >
                <Wand2 size={13} /> {showPerso ? 'Masquer' : 'Mode personnalisé (saisie libre)'}
              </button>
              {showPerso && (
                <div className="mt-2 space-y-2">
                  <p className="text-xs text-muted-foreground">
                    Place un nombre libre de tables rondes dans l'espace (placement automatique),
                    ajustables ensuite à la main.
                  </p>
                  <div className="flex items-center gap-2">
                    <input
                      type="number"
                      min={1}
                      max={100}
                      value={persoCount}
                      onChange={(e) => setPersoCount(e.target.value)}
                      className="h-9 w-24 rounded-md border border-input bg-transparent px-3 text-base"
                    />
                    <span className="text-xs text-muted-foreground">tables</span>
                    <button
                      onClick={handlePlacePerso}
                      disabled={busy}
                      className="ml-auto flex items-center gap-1.5 px-3 py-2 rounded-lg text-sm font-semibold bg-primary text-primary-foreground disabled:opacity-60"
                    >
                      {busy ? <Loader2 size={14} className="animate-spin" /> : <Sparkles size={14} />}
                      Placer
                    </button>
                  </div>
                </div>
              )}
            </div>
          </div>
        )}

        {/* Contenu DEBOUT */}
        {tab === 'debout' && modeDeboutDispo && (
          <div className="space-y-3">
            <p className="text-xs text-muted-foreground">
              Mode cocktail / debout. Le lieu indique une capacité maximale de{' '}
              <strong>{capDebout} personnes</strong> pour cet espace.
            </p>
            <div>
              <label className="text-xs font-medium text-muted-foreground mb-1 block">
                Nombre de personnes attendues
              </label>
              <input
                type="number"
                min={1}
                max={capDebout || undefined}
                value={deboutVal}
                onChange={(e) => setDeboutVal(e.target.value)}
                className="w-full h-10 rounded-md border border-input bg-transparent px-3 text-base"
                placeholder={`1 à ${capDebout}`}
              />
            </div>
            <button
              onClick={handleSaveDebout}
              disabled={busy}
              className="w-full flex items-center justify-center gap-2 py-2.5 rounded-xl text-sm font-semibold bg-primary text-primary-foreground disabled:opacity-60"
            >
              {busy ? <Loader2 size={15} className="animate-spin" /> : <Users size={15} />}
              Enregistrer
            </button>
          </div>
        )}

        {/* Contenu CHAISES */}
        {tab === 'chaises' && modeChaisesDispo && (
          <div className="space-y-3">
            <p className="text-xs text-muted-foreground">
              Mode réunion / conférence (chaises seules). Le lieu indique une capacité maximale de{' '}
              <strong>{capChaises} personnes</strong>.
            </p>
            <div>
              <label className="text-xs font-medium text-muted-foreground mb-1 block">
                Nombre de personnes attendues
              </label>
              <input
                type="number"
                min={1}
                max={capChaises || undefined}
                value={chaisesVal}
                onChange={(e) => setChaisesVal(e.target.value)}
                className="w-full h-10 rounded-md border border-input bg-transparent px-3 text-base"
                placeholder={`1 à ${capChaises}`}
              />
            </div>
            <button
              onClick={handleSaveChaises}
              disabled={busy}
              className="w-full flex items-center justify-center gap-2 py-2.5 rounded-xl text-sm font-semibold bg-primary text-primary-foreground disabled:opacity-60"
            >
              {busy ? <Loader2 size={15} className="animate-spin" /> : <Armchair size={15} />}
              Enregistrer
            </button>
          </div>
        )}

        {/* Fenêtre de confirmation flottante (indépendante du scroll de la liste) :
            affiche le LoadingCristal pendant le traitement, puis se ferme avec la modale. */}
        {(confirm || busy) && (
          <div className="fixed inset-0 z-[80] bg-black/50 flex items-center justify-center p-4">
            <div className="bg-card rounded-2xl w-full max-w-sm p-5 space-y-3 shadow-xl">
              {busy ? (
                <div className="flex flex-col items-center justify-center gap-3 py-6">
                  <LoadingCristal size={40} />
                  <p className="text-sm font-medium text-muted-foreground">Traitement…</p>
                </div>
              ) : (
                <>
                  <div className="space-y-1">
                    <p className="text-sm font-semibold flex items-center gap-1.5" style={{ color: hasExistingTables ? '#92400e' : '#1e1b4b' }}>
                      {hasExistingTables ? <AlertTriangle size={14} /> : <Sparkles size={14} />}
                      {hasExistingTables ? 'Remplacer les tables actuelles ?' : 'Valider cette configuration ?'}
                    </p>
                    <p className="text-xs leading-snug" style={{ color: hasExistingTables ? '#92400e' : '#1e1b4b' }}>
                      {hasExistingTables
                        ? `Cette action va remplacer vos ${existingTables?.length || 0} table(s) actuelle(s). Les invités déjà placés seront réaffectés aux nouvelles tables selon leur ordre.`
                        : 'La configuration sera appliquée à votre événement.'}
                    </p>
                  </div>
                  <div className="flex gap-2 justify-end">
                    <button
                      onClick={() => setConfirm(null)}
                      className="px-3 py-2 rounded-lg text-sm font-semibold border border-border bg-white"
                    >
                      Annuler
                    </button>
                    <button
                      onClick={() => {
                        if (!confirm) return;
                        const { records, evenementUpdate, successMsg } = confirm;
                        applyConfig(records, evenementUpdate, successMsg);
                      }}
                      className="flex items-center gap-1.5 px-3 py-2 rounded-lg text-sm font-semibold bg-primary text-primary-foreground"
                    >
                      {hasExistingTables ? 'Remplacer et migrer' : 'Valider'}
                    </button>
                  </div>
                </>
              )}
            </div>
          </div>
        )}
      </div>
    </div>
  );
}