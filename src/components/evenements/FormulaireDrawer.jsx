/**
 * Drawer déroulant sur la carte événement pour gérer le formulaire de préparation.
 * Attachement automatique au meilleur modèle — aucune sélection manuelle.
 */
import { useState, useEffect } from 'react';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { base44 } from '@/api/base44Client';
import { X, Send, Eye, Loader2, CheckCircle2, Plus, Trash2, RefreshCw } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { format, parseISO, addDays } from 'date-fns';
import { fr } from 'date-fns/locale';
import { useToast } from '@/components/ui/use-toast';
import { createPortal } from 'react-dom';
import FormulaireReponsesModal from '@/components/formulaire/FormulaireReponsesModal';
import { useOwnerCompanySettings } from '@/hooks/useOwnerCompanySettings';

const DEFAULT_JOURS = 60;

// ─── Badge dynamique (utilisé sur la carte événement) ────────────────────────
export function FormulaireStatutBadge({ formulaire }) {

  if (!formulaire) {
    return (
      <span className="text-xs px-2 py-0.5 rounded-md bg-slate-100 text-slate-600 font-medium">
        Programmé — J-{DEFAULT_JOURS}
      </span>
    );
  }

  const jours = formulaire.jours_avant_envoi || DEFAULT_JOURS;

  if (formulaire.statut === 'Brouillon') {
    return (
      <span className="text-xs px-2 py-0.5 rounded-md bg-slate-100 text-slate-600 font-medium">
        Programmé — J-{jours}
      </span>
    );
  }

  // Non répondu : date_limite dépassée et toujours en attente
  if ((formulaire.statut === 'Envoyé' || formulaire.statut === 'En cours') && formulaire.date_limite) {
    if (new Date(formulaire.date_limite) < new Date()) {
      return (
        <span className="text-xs px-2 py-0.5 rounded-md bg-red-100 text-red-700 font-medium">
          Non répondu
        </span>
      );
    }
  }

  if (formulaire.statut === 'Envoyé' || formulaire.statut === 'En cours') {
    return (
      <span className="text-xs px-2 py-0.5 rounded-md bg-blue-100 text-blue-700 font-medium">
        Envoyé — En attente
      </span>
    );
  }

  if (formulaire.statut === 'Complété' || formulaire.statut === 'Clôturé') {
    return (
      <span className="text-xs px-2 py-0.5 rounded-md bg-emerald-100 text-emerald-700 font-medium">
        Complété
      </span>
    );
  }

  return (
    <span className="text-xs px-2 py-0.5 rounded-md bg-slate-100 text-slate-600 font-medium">
      {formulaire.statut}
    </span>
  );
}

function generateId() {
  return Math.random().toString(36).slice(2, 9);
}

export default function FormulaireDrawer({ evenement, onClose }) {
  const qc = useQueryClient();
  const { toast } = useToast();
  const { settings } = useOwnerCompanySettings();

  const [showReponses, setShowReponses] = useState(false);
  const [jours, setJours] = useState(DEFAULT_JOURS);
  const [fenetre, setFenetre] = useState(5);
  const [questionsSupp, setQuestionsSupp] = useState([]);
  const [doublonModal, setDoublonModal] = useState(null);

  const { data: formulaires = [] } = useQuery({
    queryKey: ['formulaire-prep', evenement.id],
    queryFn: () => base44.entities.FormulairePreparation.filter({ evenement_id: evenement.id }),
  });

  const formulaire = formulaires[0] || null;

  const { data: modeles = [], isLoading: loadModeles } = useQuery({
    queryKey: ['modeles-formulaire'],
    queryFn: () => base44.entities.ModeleFormulaire.list(),
  });

  const { data: formulesActives = [] } = useQuery({
    queryKey: ['catalogue-formules-actives'],
    queryFn: async () => {
      const items = await base44.entities.CatalogueItem.filter({ section: 'tarifs', type_tarif: 'formule', actif: true });
      return items.map(i => i.nom);
    },
  });

  /**
   * Sélectionne automatiquement le meilleur modèle pour le type d'événement.
   * Priorité : modèle avec ce type exact → modèle "Tous types" → premier disponible
   */
  const getBestModele = () => {
    const typeEvt = evenement.type_evenement;
    if (modeles.length === 0) return null;
    if (!typeEvt) return modeles[0];
    const exact = modeles.find(m =>
      (m.types_evenement || []).includes(typeEvt) || m.type_evenement === typeEvt
    );
    if (exact) return exact;
    const tous = modeles.find(m =>
      (m.types_evenement || []).includes('Tous types') ||
      m.type_evenement === 'Tous types' ||
      !m.type_evenement
    );
    return tous || modeles[0];
  };

  const buildChampsAvecFormule = (baseChamps) => {
    if (formulesActives.length === 0) return baseChamps;
    const questionFormule = {
      id: 'q_formule_auto',
      label: 'Quelle formule souhaitez-vous ?',
      type: 'liste',
      options: formulesActives,
      obligatoire: true,
      ordre: -1,
      conditions: [],
    };
    const already = baseChamps.some(c => c.id === 'q_formule_auto' || c.label?.includes('formule'));
    if (already) return baseChamps;
    return [questionFormule, ...baseChamps];
  };

  const creerDepuisModele = useMutation({
    mutationFn: ({ modele, baseChamps }) => base44.entities.FormulairePreparation.create({
      evenement_id: evenement.id,
      evenement_nom: evenement.nom,
      client_id: evenement.client_id || '',
      client_nom: evenement.client_nom || '',
      client_email: evenement.client_email || '',
      prestataire_id: settings?.prestataire_id || null,
      champs: baseChamps,
      jours_avant_envoi: modele.jours_avant_envoi_defaut || DEFAULT_JOURS,
      fenetre_reponse_jours: modele.fenetre_reponse_defaut || 5,
      statut: 'Brouillon',
      modele_id: modele.id,
    }),
    onSuccess: () => {
      qc.invalidateQueries(['formulaire-prep', evenement.id]);
    },
  });

  // Auto-attachement : dès que les modèles sont chargés et qu'il n'y a pas de formulaire
  useEffect(() => {
    if (formulaire) {
      setJours(formulaire.jours_avant_envoi ?? DEFAULT_JOURS);
      setFenetre(formulaire.fenetre_reponse_jours ?? 5);
    } else if (modeles.length > 0 && !creerDepuisModele.isPending) {
      const best = getBestModele();
      if (best) {
        creerDepuisModele.mutate({ modele: best, baseChamps: buildChampsAvecFormule(best.champs || []) });
      }
    }
  }, [formulaire?.id, modeles]);

  const enregistrer = useMutation({
    mutationFn: () => {
      const allChamps = [...(formulaire?.champs || []), ...questionsSupp];
      return base44.entities.FormulairePreparation.update(formulaire.id, {
        champs: allChamps,
        jours_avant_envoi: jours,
        fenetre_reponse_jours: fenetre,
      });
    },
    onSuccess: () => {
      qc.invalidateQueries(['formulaire-prep', evenement.id]);
      setQuestionsSupp([]);
    },
  });

  const envoyer = useMutation({
    mutationFn: async () => {
      const allChamps = [...(formulaire?.champs || []), ...questionsSupp];
      const today = new Date();
      const dateLimite = format(addDays(today, fenetre), 'yyyy-MM-dd');
      const dateEnvoi = format(today, 'yyyy-MM-dd');
      await base44.entities.FormulairePreparation.update(formulaire.id, {
        champs: allChamps,
        jours_avant_envoi: jours,
        fenetre_reponse_jours: fenetre,
        statut: 'Envoyé',
        date_envoi: dateEnvoi,
        date_limite: dateLimite,
      });
      let token = evenement.lien_client_token;
      if (!token) {
        token = crypto.randomUUID();
        await base44.entities.Evenement.update(evenement.id, { lien_client_token: token });
      }
      if (evenement.client_email) {
        const portalUrl = `${window.location.origin}/evenement-client?token=${token}`;
        await base44.integrations.Core.SendEmail({
          to: evenement.client_email,
          subject: `Votre questionnaire de préparation — ${evenement.nom}`,
          body: `<p>Bonjour ${evenement.client_nom || ''},</p><p>Votre questionnaire de préparation pour votre événement "<strong>${evenement.nom}</strong>" est disponible.</p><p>Cliquez sur le lien ci-dessous pour y accéder :</p><p><a href="${portalUrl}" style="display:inline-block;padding:12px 24px;background:#1e40af;color:white;text-decoration:none;border-radius:8px;font-weight:600;">Accéder à mon espace client →</a></p><p>Vous avez ${fenetre} jours pour le compléter, soit jusqu'au ${format(parseISO(dateLimite), 'd MMMM yyyy', { locale: fr })}.</p><p>Bien cordialement,<br/>${settings?.nom || "L'équipe"}</p>`,
        });
      }
      await base44.entities.Notification.create({
        titre: '📋 Questionnaire envoyé',
        message: `Le questionnaire de préparation a été envoyé à ${evenement.client_nom || 'le client'} pour "${evenement.nom}".`,
        type: 'evenement', lu: false,
      });
    },
    onSuccess: () => {
      setQuestionsSupp([]);
      qc.invalidateQueries(['formulaire-prep', evenement.id]);
      toast({
        title: '✓ Questionnaire envoyé',
        description: `Le questionnaire a été envoyé à ${evenement.client_nom || 'le client'}.`,
      });
    },
  });

  const supprimer = useMutation({
    mutationFn: () => base44.entities.FormulairePreparation.delete(formulaire.id),
    onSuccess: () => {
      qc.invalidateQueries(['formulaire-prep', evenement.id]);
      setQuestionsSupp([]);
    },
  });

  const remplacerFormulaire = useMutation({
    mutationFn: async ({ modele, baseChamps }) => {
      if (formulaire) await base44.entities.FormulairePreparation.delete(formulaire.id);
      return base44.entities.FormulairePreparation.create({
        evenement_id: evenement.id,
        evenement_nom: evenement.nom,
        client_id: evenement.client_id || '',
        client_nom: evenement.client_nom || '',
        client_email: evenement.client_email || '',
        prestataire_id: settings?.prestataire_id || null,
        champs: baseChamps,
        jours_avant_envoi: modele.jours_avant_envoi_defaut || DEFAULT_JOURS,
        fenetre_reponse_jours: modele.fenetre_reponse_defaut || 5,
        statut: 'Brouillon',
        modele_id: modele.id,
      });
    },
    onSuccess: () => {
      qc.invalidateQueries(['formulaire-prep', evenement.id]);
      setDoublonModal(null);
    },
  });

  const ajouterQuestionPonctuelle = () => {
    setQuestionsSupp(qs => [...qs, { id: generateId(), type: 'texte', label: '', obligatoire: false }]);
  };

  const updateQuestion = (id, label) => {
    setQuestionsSupp(qs => qs.map(q => q.id === id ? { ...q, label } : q));
  };

  const removeQuestion = (id) => {
    setQuestionsSupp(qs => qs.filter(q => q.id !== id));
  };

  const nbTotalQuestions = (formulaire?.champs?.length || 0) + questionsSupp.length;

  const statutColors = {
    'Brouillon': 'bg-orange-100 text-orange-700',
    'Envoyé': 'bg-blue-100 text-blue-700',
    'En cours': 'bg-amber-100 text-amber-700',
    'Complété': 'bg-emerald-100 text-emerald-700',
    'Clôturé': 'bg-slate-100 text-slate-500',
  };

  return (
    <div className="border-t border-border bg-muted/30 rounded-b-2xl">
      <div className="p-4 space-y-3">

        {/* Header */}
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-2">
            <span className="text-sm font-semibold">📋 Questionnaire de préparation</span>
            {formulaire ? (
              <span className={`text-xs px-2.5 py-0.5 rounded-full font-medium ${statutColors[formulaire.statut] || ''}`}>{formulaire.statut}</span>
            ) : (
              <span className="text-xs px-2 py-0.5 rounded-full bg-orange-100 text-orange-700 font-medium">Programmé — J-{DEFAULT_JOURS}</span>
            )}
          </div>
          <div className="flex items-center gap-1">
            {formulaire && ['Envoyé', 'En cours', 'Complété', 'Clôturé'].includes(formulaire.statut) && (
              <Button size="sm" variant="outline" className="text-xs gap-1 h-7" onClick={() => setShowReponses(true)}>
                <Eye size={11} /> Réponses
              </Button>
            )}
            <button onClick={onClose} className="ml-1 p-1 rounded text-muted-foreground hover:text-foreground"><X size={15} /></button>
          </div>
        </div>

        {/* État : chargement ou en cours de création */}
        {!formulaire && (loadModeles || creerDepuisModele.isPending) && (
          <div className="flex items-center gap-2 text-xs text-muted-foreground py-2">
            <Loader2 size={13} className="animate-spin" />
            Attachement automatique du questionnaire…
          </div>
        )}

        {/* Aucun modèle disponible */}
        {!formulaire && !loadModeles && !creerDepuisModele.isPending && modeles.length === 0 && (
          <p className="text-xs text-muted-foreground py-2">
            Aucun modèle de questionnaire disponible. Créez-en un depuis la Bibliothèque.
          </p>
        )}

        {/* Vue principale — formulaire existant */}
        {formulaire && (
          <div className="space-y-3">
            {/* Info condensée */}
            <div className="bg-card border border-border rounded-xl px-4 py-3 space-y-0.5">
              <p className="text-sm font-medium">
                {formulaire.modele_id
                  ? (modeles.find(m => m.id === formulaire.modele_id)?.nom || 'Questionnaire personnalisé')
                   : 'Questionnaire personnalisé'}
              </p>
              <p className="text-xs text-muted-foreground">{nbTotalQuestions} question{nbTotalQuestions !== 1 ? 's' : ''}</p>
              {formulaire.date_envoi && (
                <p className="text-xs text-muted-foreground">Envoyé le {format(parseISO(formulaire.date_envoi), 'd MMM yyyy', { locale: fr })}</p>
              )}
              {formulaire.statut === 'Complété' && (
                <div className="flex items-center gap-1.5 text-emerald-600 text-xs font-medium pt-0.5">
                  <CheckCircle2 size={11} /> Complété par le client
                </div>
              )}
            </div>

            {/* Remplacement — questionnaire déjà envoyé */}
            {['Envoyé', 'En cours'].includes(formulaire.statut) && (
              <Button
                size="sm"
                variant="outline"
                className="w-full text-xs gap-1.5 h-7 text-amber-700 border-amber-300 hover:bg-amber-50"
                onClick={() => {
                  const best = getBestModele();
                  if (best) {
                    setDoublonModal({ modele: best, baseChamps: buildChampsAvecFormule(best.champs || []) });
                  } else {
                    toast({ title: 'Aucun modèle disponible', description: 'Créez un modèle de questionnaire dans la bibliothèque.', variant: 'destructive' });
                  }
                }}
                disabled={loadModeles}
              >
                <RefreshCw size={11} /> Remplacer le questionnaire
              </Button>
            )}

            {/* Paramètres — uniquement en brouillon */}
            {formulaire.statut === 'Brouillon' && (
              <>
                <div className="grid grid-cols-2 gap-2">
                  <div className="space-y-1">
                    <label className="text-xs text-muted-foreground">Envoyer automatiquement J-</label>
                    <Input type="number" value={jours} onChange={e => setJours(parseInt(e.target.value) || DEFAULT_JOURS)} min={1} className="h-8 text-sm" />
                  </div>
                  <div className="space-y-1">
                    <label className="text-xs text-muted-foreground">Fenêtre de réponse (jours)</label>
                    <Input type="number" value={fenetre} onChange={e => setFenetre(parseInt(e.target.value) || 5)} min={1} className="h-8 text-sm" />
                  </div>
                </div>

                {/* Questions ponctuelles */}
                {questionsSupp.length > 0 && (
                  <div className="space-y-2">
                    <p className="text-xs font-medium text-muted-foreground">Questions ponctuelles</p>
                    {questionsSupp.map(q => (
                      <div key={q.id} className="flex gap-2 items-center">
                        <Input
                          value={q.label}
                          onChange={e => updateQuestion(q.id, e.target.value)}
                          placeholder="Libellé de la question"
                          className="h-8 text-sm flex-1"
                        />
                        <button onClick={() => removeQuestion(q.id)} className="text-destructive hover:text-destructive/80 p-1 shrink-0">
                          <Trash2 size={13} />
                        </button>
                      </div>
                    ))}
                  </div>
                )}

                <button
                  onClick={ajouterQuestionPonctuelle}
                  className="flex items-center gap-1.5 text-xs text-primary hover:underline font-medium"
                >
                  <Plus size={12} /> Ajouter une question ponctuelle
                </button>

                {/* Actions */}
                <div className="flex items-center gap-2 pt-1">
                  <Button
                    size="sm"
                    variant="outline"
                    className="text-xs gap-1 h-7 flex-1"
                    onClick={() => enregistrer.mutate()}
                    disabled={enregistrer.isPending}
                  >
                    {enregistrer.isPending ? <Loader2 size={11} className="animate-spin" /> : '💾'} Enregistrer
                  </Button>
                  <Button
                    size="sm"
                    className="text-xs gap-1 h-7 flex-1"
                    onClick={() => envoyer.mutate()}
                    disabled={envoyer.isPending || nbTotalQuestions === 0}
                  >
                    {envoyer.isPending ? <Loader2 size={11} className="animate-spin" /> : <Send size={11} />} Envoyer au client
                  </Button>
                  <button
                    onClick={() => { if (confirm('Supprimer ce questionnaire ?')) supprimer.mutate(); }}
                    className="h-7 px-1.5 text-destructive hover:text-destructive/80"
                  >
                    <Trash2 size={11} />
                  </button>
                </div>
              </>
            )}
          </div>
        )}
      </div>

      {showReponses && formulaire && (
        <FormulaireReponsesModal formulaire={formulaire} evenement={evenement} onClose={() => setShowReponses(false)} />
      )}

      {doublonModal && formulaire && createPortal(
        <div className="fixed inset-0 z-[60] flex items-center justify-center bg-black/50 backdrop-blur-sm p-4">
          <div className="bg-card rounded-2xl border border-border shadow-xl w-full max-w-sm p-5 space-y-4">
            <h3 className="font-semibold text-base">⚠️ Questionnaire existant</h3>
            <p className="text-sm text-muted-foreground">
              Un questionnaire existe déjà ({formulaire.statut}). Que souhaitez-vous faire ?
            </p>
            <div className="space-y-2">
              <Button className="w-full justify-start gap-2" variant="outline" onClick={() => setDoublonModal(null)}>📋 Continuer avec le questionnaire existant</Button>
              <Button className="w-full justify-start gap-2 text-destructive border-destructive/30 hover:bg-destructive/5" variant="outline" onClick={() => remplacerFormulaire.mutate(doublonModal)} disabled={remplacerFormulaire.isPending}>
                {remplacerFormulaire.isPending ? <Loader2 size={13} className="animate-spin" /> : '➕'} Remplacer par un nouveau
              </Button>
            </div>
            <Button variant="ghost" className="w-full text-muted-foreground" onClick={() => setDoublonModal(null)}>Annuler</Button>
          </div>
        </div>,
        document.body
      )}
    </div>
  );
}