/**
 * Modal admin pour visualiser et valider les réponses du client,
 * et générer la fiche de service.
 */
import { useState } from 'react';
import { useMutation, useQueryClient } from '@tanstack/react-query';
import { base44 } from '@/api/base44Client';
import { X, CheckCircle2, FileText, Loader2 } from 'lucide-react';
import AmandaMessage from '@/components/AmandaMessage';
import { filterChampsVisibles } from '@/lib/conditionEngine';
import { Button } from '@/components/ui/button';
import { format, parseISO } from 'date-fns';
import { fr } from 'date-fns/locale';

function ReponseDisplay({ champ, valeur }) {
  if (valeur === undefined || valeur === null || valeur === '') {
    return <span className="text-muted-foreground italic text-sm">Non renseigné</span>;
  }
  if (Array.isArray(valeur)) {
    return <div className="flex flex-wrap gap-1">{valeur.map((v, i) => <span key={i} className="text-xs bg-primary/10 text-primary px-2 py-0.5 rounded-full">{v}</span>)}</div>;
  }
  if (champ.type === 'upload') {
    return <a href={valeur} target="_blank" rel="noopener noreferrer" className="text-sm text-primary hover:underline">📎 Voir le fichier</a>;
  }
  return <p className="text-sm font-medium">{String(valeur)}</p>;
}

export default function FormulaireReponsesModal({ formulaire, evenement, onClose }) {
  const qc = useQueryClient();
  const [generating, setGenerating] = useState(false);

  const reponses = formulaire.reponses || {};

  const genererFicheService = useMutation({
    mutationFn: async () => {
      setGenerating(true);
      // Extraire les infos clés des réponses pour la fiche
      const nbAdultes = reponses['nb_adultes'] || evenement.nb_invites || 0;
      const nomClient = evenement.client_nom || '';
      const telClient = evenement.client_telephone || '';
      const emailClient = evenement.client_email || '';

      // Chercher ou créer le service associé
      const services = await base44.entities.Service.filter({ evenement_id: evenement.id });
      let serviceId = services[0]?.id;
      if (!serviceId) {
        const newService = await base44.entities.Service.create({
          date: evenement.date,
          heure_debut: evenement.heure_debut || '',
          heure_fin: evenement.heure_fin || '',
          lieu: evenement.lieu_nom || '',
          lieu_id: evenement.lieu_id || '',
          evenement_id: evenement.id,
          evenement_nom: evenement.nom,
          statut: 'Ouvert',
        });
        serviceId = newService.id;
      }

      // Créer la fiche de service
      const commentaire = Object.entries(reponses)
        .map(([id, val]) => {
          const champ = formulaire.champs?.find(c => c.id === id);
          if (!champ) return null;
          const valStr = Array.isArray(val) ? val.join(', ') : String(val || '');
          return `${champ.label}: ${valStr}`;
        })
        .filter(Boolean)
        .join('\n');

      await base44.entities.FicheService.create({
        service_id: serviceId,
        type_evenement: evenement.type_evenement || '',
        nom_client: nomClient,
        telephone_client: telClient,
        email_client: emailClient,
        nb_adultes: typeof nbAdultes === 'number' ? nbAdultes : parseInt(nbAdultes) || 0,
        commentaire,
        envoyee: false,
      });

      // Marquer formulaire comme traité
      await base44.entities.FormulairePreparation.update(formulaire.id, { fiche_service_generee: true });

      // Notification
      await base44.entities.Notification.create({
        titre: '📋 Fiche de service générée',
        message: `La fiche de service pour "${evenement.nom}" a été générée depuis les réponses du questionnaire client.`,
        type: 'service',
        lu: false,
      });

      qc.invalidateQueries(['formulaire-prep', evenement.id]);
      setGenerating(false);
    },
  });

  const [celebrationDone, setCelebrationDone] = useState(false);
  const champsVisibles = filterChampsVisibles(formulaire.champs || [], reponses);
  const champsRemplis = formulaire.champs?.filter(c => reponses[c.id] !== undefined && reponses[c.id] !== '') || [];
  const progression = formulaire.champs?.length ? Math.round((champsRemplis.length / formulaire.champs.length) * 100) : 0;

  return (
    <div className="fixed inset-0 z-[60] flex items-center justify-center bg-black/50 p-4">
      <div className="bg-card rounded-2xl border border-border shadow-xl w-full max-w-xl max-h-[90vh] flex flex-col overflow-hidden">
        <div className="flex items-center justify-between p-5 border-b border-border shrink-0">
          <div>
            <h3 className="font-semibold text-lg">Réponses du questionnaire</h3>
            <p className="text-sm text-muted-foreground">{evenement.nom}</p>
          </div>
          <button onClick={onClose} className="p-1.5 rounded-lg hover:bg-muted text-muted-foreground"><X size={16} /></button>
        </div>

        {progression === 100 && !celebrationDone && (
          <AmandaMessage
            type="celebration"
            modal
            message={`Le questionnaire est complet à 100% ! Vous pouvez maintenant générer la fiche de service. 🎉`}
            onClose={() => setCelebrationDone(true)}
          />
        )}

        <div className="overflow-y-auto flex-1 p-5 space-y-4">
          {/* Statut et progression */}
          <div className="bg-muted/40 rounded-xl p-3 space-y-2">
            <div className="flex items-center justify-between text-sm">
              <span className="font-medium">Progression</span>
              <span className="text-muted-foreground">{champsRemplis.length}/{formulaire.champs?.length || 0} champs</span>
            </div>
            <div className="w-full bg-muted rounded-full h-2">
              <div className="bg-primary rounded-full h-2 transition-all" style={{ width: `${progression}%` }} />
            </div>
            {formulaire.statut === 'Complété' && (
              <div className="flex items-center gap-2 text-emerald-600 text-xs font-medium">
                <CheckCircle2 size={13} />
                Questionnaire soumis
                {formulaire.date_soumission && ` le ${format(parseISO(formulaire.date_soumission), 'd MMMM yyyy', { locale: fr })}`}
              </div>
            )}
          </div>

          {/* Réponses */}
          {(formulaire.champs || []).length === 0 && (
            <p className="text-sm text-muted-foreground text-center py-4">Aucun champ dans ce questionnaire.</p>
          )}
          <div className="space-y-3">
            {champsVisibles.map(champ => (
              <div key={champ.id} className="bg-muted/30 rounded-xl p-3 space-y-1">
                <div className="flex items-center justify-between">
                  <p className="text-xs font-medium text-muted-foreground uppercase tracking-wide">{champ.label}</p>
                  {champ.obligatoire && !reponses[champ.id] && (
                    <span className="text-xs text-red-500">⚠️ Obligatoire</span>
                  )}
                </div>
                <ReponseDisplay champ={champ} valeur={reponses[champ.id]} />
              </div>
            ))}
          </div>
        </div>

        <div className="flex justify-between items-center gap-2 p-5 border-t border-border shrink-0">
          <Button variant="outline" onClick={onClose}>Fermer</Button>
          {formulaire.statut === 'Complété' && !formulaire.fiche_service_generee && (
            <Button
              className="gap-1.5"
              onClick={() => genererFicheService.mutate()}
              disabled={genererFicheService.isPending || generating}
            >
              {genererFicheService.isPending || generating
                ? <><Loader2 size={14} className="animate-spin" /> Génération...</>
                : <><FileText size={14} /> Générer la fiche de service</>
              }
            </Button>
          )}
          {formulaire.fiche_service_generee && (
            <div className="flex items-center gap-2 text-emerald-600 text-sm font-medium">
              <CheckCircle2 size={15} /> Fiche de service générée
            </div>
          )}
        </div>
      </div>
    </div>
  );
}