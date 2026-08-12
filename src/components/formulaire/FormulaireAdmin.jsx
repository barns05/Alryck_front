/**
 * Section admin dans la fiche événement pour gérer le formulaire de préparation.
 * Création, envoi manuel, visualisation des réponses.
 */
import { useState } from 'react';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { base44 } from '@/api/base44Client';
import { Plus, Send, Eye, CheckCircle2, FileText, Loader2, Pencil, Trash2, Zap } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { format, parseISO, addDays } from 'date-fns';
import { fr } from 'date-fns/locale';
import FormulaireBuilder from '@/components/formulaire/FormulaireBuilder';
import ModeleFormulaireModal from '@/components/formulaire/ModeleFormulaireModal';
import FormulaireReponsesModal from '@/components/formulaire/FormulaireReponsesModal';
import GenerationOrchestrator from '@/components/formulaire/GenerationOrchestrator';
import { useOwnerCompanySettings } from '@/hooks/useOwnerCompanySettings';

function PreRempliTag({ evenement }) {
  const infos = [];
  if (evenement.nom) infos.push({ label: 'Nom événement', valeur: evenement.nom });
  if (evenement.date) infos.push({ label: 'Date', valeur: evenement.date });
  if (evenement.lieu_nom) infos.push({ label: 'Lieu', valeur: evenement.lieu_nom });
  if (evenement.nb_invites) infos.push({ label: 'Nb invités', valeur: evenement.nb_invites });
  return (
    <div className="bg-blue-50 border border-blue-200 rounded-xl p-3 space-y-1.5">
      <p className="text-xs font-medium text-blue-700">ℹ️ Champs pré-remplis automatiquement depuis l'événement :</p>
      <div className="flex flex-wrap gap-1.5">
        {infos.map(info => (
          <span key={info.label} className="text-xs bg-blue-100 text-blue-700 px-2 py-0.5 rounded-full">
            {info.label} : <strong>{info.valeur}</strong>
          </span>
        ))}
      </div>
    </div>
  );
}

export default function FormulaireAdmin({ evenement }) {
  const qc = useQueryClient();
  const { settings } = useOwnerCompanySettings();
  const isUniversel = (settings?.type_formulaire || 'par_formule') === 'universel';

  const [showBuilder, setShowBuilder] = useState(false);
  const [showModeles, setShowModeles] = useState(false);
  const [showReponses, setShowReponses] = useState(false);
  const [showModeleModal, setShowModeleModal] = useState(false);
  const [showOrchestrator, setShowOrchestrator] = useState(false);

  const { data: formulaires = [] } = useQuery({
    queryKey: ['formulaire-prep', evenement.id],
    queryFn: () => base44.entities.FormulairePreparation.filter({ evenement_id: evenement.id }),
  });

  const { data: modeles = [] } = useQuery({
    queryKey: ['modeles-formulaire'],
    queryFn: () => base44.entities.ModeleFormulaire.list(),
    enabled: showModeles || showBuilder,
  });

  const hasFormule = !!evenement.formule_nom;

  const formulaire = formulaires[0] || null;
  const [localChamps, setLocalChamps] = useState(null);
  const champs = localChamps ?? formulaire?.champs ?? [];
  const [jours, setJours] = useState(formulaire?.jours_avant_envoi ?? 30);
  const [fenetre, setFenetre] = useState(formulaire?.fenetre_reponse_jours ?? 5);

  const createOrUpdate = useMutation({
    mutationFn: async () => {
      const data = {
        evenement_id: evenement.id,
        evenement_nom: evenement.nom,
        client_id: evenement.client_id || '',
        client_nom: evenement.client_nom || '',
        client_email: evenement.client_email || '',
        champs,
        jours_avant_envoi: jours,
        fenetre_reponse_jours: fenetre,
        statut: formulaire?.statut || 'Brouillon',
      };
      if (formulaire) return base44.entities.FormulairePreparation.update(formulaire.id, data);
      return base44.entities.FormulairePreparation.create(data);
    },
    onSuccess: () => {
      qc.invalidateQueries(['formulaire-prep', evenement.id]);
      setShowBuilder(false);
      setLocalChamps(null);
    },
  });

  const envoyerManuellement = useMutation({
    mutationFn: async () => {
      const today = new Date();
      const dateLimite = format(addDays(today, fenetre), 'yyyy-MM-dd');
      const dateEnvoi = format(today, 'yyyy-MM-dd');
      const updated = await base44.entities.FormulairePreparation.update(formulaire.id, {
        statut: 'Envoyé',
        date_envoi: dateEnvoi,
        date_limite: dateLimite,
      });
      // Notification client
      if (evenement.client_email) {
        await base44.integrations.Core.SendEmail({
          to: evenement.client_email,
          subject: `Votre questionnaire de préparation — ${evenement.nom}`,
          body: `Bonjour ${evenement.client_nom || ''},\n\nVotre questionnaire de préparation pour votre événement "${evenement.nom}" est maintenant disponible.\n\nVous avez ${fenetre} jours pour le compléter, soit jusqu'au ${format(parseISO(dateLimite), 'd MMMM yyyy', { locale: fr })}.\n\nAccédez à votre espace client pour le remplir.\n\nCordialement`,
        });
      }
      await base44.entities.Notification.create({
        titre: '📋 Questionnaire envoyé',
        message: `Le questionnaire de préparation a été envoyé à ${evenement.client_nom || 'le client'} pour "${evenement.nom}".`,
        type: 'evenement',
        lu: false,
      });
      return updated;
    },
    onSuccess: () => qc.invalidateQueries(['formulaire-prep', evenement.id]),
  });

  const appliquerModele = (modele) => {
    setLocalChamps(modele.champs || []);
    setJours(modele.jours_avant_envoi_defaut || 30);
    setFenetre(modele.fenetre_reponse_defaut || 5);
    setShowModeles(false);
    setShowBuilder(true);
  };

  const supprimer = useMutation({
    mutationFn: () => base44.entities.FormulairePreparation.delete(formulaire.id),
    onSuccess: () => {
      qc.invalidateQueries(['formulaire-prep', evenement.id]);
      setShowBuilder(false);
      setLocalChamps(null);
    },
  });

  const statutColors = {
    'Brouillon': 'bg-slate-100 text-slate-600',
    'Envoyé': 'bg-blue-100 text-blue-700',
    'En cours': 'bg-amber-100 text-amber-700',
    'Complété': 'bg-emerald-100 text-emerald-700',
    'Clôturé': 'bg-slate-100 text-slate-500',
  };

  return (
    <div className="space-y-4">
      {/* Header avec statut */}
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-2">
          {formulaire && (
            <span className={`text-xs px-2.5 py-1 rounded-full font-medium ${statutColors[formulaire.statut] || ''}`}>
              {formulaire.statut}
            </span>
          )}
          {formulaire?.date_envoi && (
            <span className="text-xs text-muted-foreground">
              Envoyé le {format(parseISO(formulaire.date_envoi), 'd MMM yyyy', { locale: fr })}
            </span>
          )}
        </div>
        <div className="flex gap-1.5 flex-wrap justify-end">
          {!formulaire && (
            <>
              {isUniversel ? (
                // Mode universel : un seul bouton pour générer/utiliser le formulaire universel
                <Button size="sm" variant="outline" className="gap-1 text-xs" onClick={() => setShowOrchestrator(true)}>
                    <Zap size={12} /> Générer le questionnaire universel
                  </Button>
              ) : (
                <>
                  {hasFormule && (
                    <Button size="sm" variant="outline" className="gap-1 text-xs" onClick={() => setShowOrchestrator(true)}>
                      <Zap size={12} /> Générer depuis la Bibliothèque
                    </Button>
                  )}
                  <Button size="sm" variant="outline" className="gap-1 text-xs" onClick={() => { setShowModeles(true); setShowBuilder(false); }}>
                    <FileText size={12} /> Utiliser un modèle
                  </Button>
                  <Button size="sm" className="gap-1 text-xs" onClick={() => { setShowBuilder(true); setShowModeles(false); }}>
                    <Plus size={12} /> Créer un questionnaire
                  </Button>
                </>
              )}
            </>
          )}
          {formulaire && formulaire.statut === 'Brouillon' && (
            <>
              <Button size="sm" variant="outline" className="gap-1 text-xs" onClick={() => setShowBuilder(v => !v)}>
                <Pencil size={12} /> {showBuilder ? 'Masquer' : 'Modifier'}
              </Button>
              <Button size="sm" className="gap-1 text-xs" onClick={() => envoyerManuellement.mutate()} disabled={envoyerManuellement.isPending || !formulaire.champs?.length}>
                {envoyerManuellement.isPending ? <Loader2 size={12} className="animate-spin" /> : <Send size={12} />}
                Envoyer maintenant
              </Button>
            </>
          )}
          {formulaire && ['Envoyé', 'En cours', 'Complété', 'Clôturé'].includes(formulaire.statut) && (
            <Button size="sm" variant="outline" className="gap-1 text-xs" onClick={() => setShowReponses(true)}>
              <Eye size={12} /> Voir les réponses
            </Button>
          )}
          {formulaire && formulaire.statut === 'Brouillon' && (
            <Button size="sm" variant="ghost" className="text-xs text-destructive hover:text-destructive" onClick={() => supprimer.mutate()}>
              <Trash2 size={12} />
            </Button>
          )}
        </div>
      </div>

      {/* Résumé si formulaire existant mais builder fermé */}
      {formulaire && !showBuilder && (
        <div className="bg-muted/40 rounded-xl p-3 space-y-2">
          <div className="flex items-center justify-between text-sm">
            <span className="font-medium">{formulaire.champs?.length || 0} champ{(formulaire.champs?.length || 0) > 1 ? 's' : ''}</span>
            <span className="text-muted-foreground text-xs">Délai : J-{formulaire.jours_avant_envoi} · Fenêtre : {formulaire.fenetre_reponse_jours} jours</span>
          </div>
          {formulaire.date_limite && (
            <p className="text-xs text-muted-foreground">
              Date limite de réponse : <strong>{format(parseISO(formulaire.date_limite), 'd MMMM yyyy', { locale: fr })}</strong>
            </p>
          )}
          {formulaire.statut === 'Complété' && (
            <div className="flex items-center gap-2 text-emerald-600 text-xs font-medium">
              <CheckCircle2 size={13} /> Questionnaire complété par le client
              {formulaire.date_soumission && ` le ${format(parseISO(formulaire.date_soumission), 'd MMM yyyy', { locale: fr })}`}
            </div>
          )}
        </div>
      )}

      {/* Sélecteur de modèles — uniquement en mode par_formule */}
      {showModeles && !isUniversel && (
        <div className="space-y-3 border border-border rounded-xl p-4">
          <div className="flex items-center justify-between">
            <p className="text-sm font-medium">Choisir un modèle</p>
            <Button size="sm" variant="outline" className="gap-1 text-xs" onClick={() => setShowModeleModal(true)}>
              <Plus size={12} /> Nouveau modèle
            </Button>
          </div>
          {modeles.length === 0 ? (
            <p className="text-sm text-muted-foreground text-center py-3">Aucun modèle sauvegardé. Créez-en un !</p>
          ) : (
            <div className="space-y-2">
              {modeles.map(m => (
                <div key={m.id} className="flex items-center justify-between bg-muted/40 rounded-lg px-3 py-2">
                  <div>
                    <p className="text-sm font-medium">{m.nom}</p>
                    <p className="text-xs text-muted-foreground">{m.type_evenement || 'Tous types'} · {m.champs?.length || 0} champs · J-{m.jours_avant_envoi_defaut}</p>
                  </div>
                  <Button size="sm" onClick={() => appliquerModele(m)}>Utiliser</Button>
                </div>
              ))}
            </div>
          )}
          <button onClick={() => { setShowBuilder(true); setShowModeles(false); }} className="text-xs text-primary hover:underline">
            → Créer depuis zéro
          </button>
        </div>
      )}

      {/* Builder */}
      {showBuilder && (
        <div className="space-y-4 border border-border rounded-xl p-4">
          <PreRempliTag evenement={evenement} />

          <div className="grid grid-cols-2 gap-3">
            <div className="space-y-1">
              <label className="text-xs text-muted-foreground">Envoyer automatiquement J-</label>
              <Input type="number" value={jours} onChange={e => setJours(parseInt(e.target.value) || 30)} min={1} placeholder="30" />
            </div>
            <div className="space-y-1">
              <label className="text-xs text-muted-foreground">Fenêtre de réponse (jours)</label>
              <select
                value={fenetre}
                onChange={e => setFenetre(parseInt(e.target.value))}
                className="flex h-9 w-full rounded-md border border-input bg-transparent px-3 py-1 text-sm shadow-sm focus-visible:outline-none focus-visible:ring-1 focus-visible:ring-ring"
              >
                <option value={4}>4 jours</option>
                <option value={5}>5 jours</option>
                <option value={6}>6 jours</option>
              </select>
            </div>
          </div>

          <div className="space-y-2">
            <label className="text-xs font-semibold uppercase tracking-wider text-muted-foreground">Champs du questionnaire</label>
            <FormulaireBuilder champs={champs} onChange={setLocalChamps} />
          </div>

          <div className="flex justify-end gap-2 pt-1">
            <Button variant="outline" size="sm" onClick={() => { setShowBuilder(false); setLocalChamps(null); }}>Annuler</Button>
            <Button size="sm" onClick={() => createOrUpdate.mutate()} disabled={createOrUpdate.isPending || !champs.length}>
              {createOrUpdate.isPending ? <Loader2 size={14} className="animate-spin" /> : 'Sauvegarder le questionnaire'}
            </Button>
          </div>
        </div>
      )}

      {showModeleModal && <ModeleFormulaireModal onClose={() => setShowModeleModal(false)} />}
      {showReponses && formulaire && (
        <FormulaireReponsesModal formulaire={formulaire} evenement={evenement} onClose={() => setShowReponses(false)} />
      )}
      {showOrchestrator && (
        <GenerationOrchestrator
          formulaName={isUniversel ? null : evenement.formule_nom}
          onClose={() => setShowOrchestrator(false)}
          onCreated={() => {
            setShowOrchestrator(false);
            qc.invalidateQueries(['modeles-formulaire']);
          }}
        />
      )}
    </div>
  );
}