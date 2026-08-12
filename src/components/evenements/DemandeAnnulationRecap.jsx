import { useState } from 'react';
import { useQuery, useQueryClient } from '@tanstack/react-query';
import { base44 } from '@/api/base44Client';
import { toast } from 'sonner';
import { CheckCircle2, XCircle, Ban, AlertTriangle } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { format, parseISO } from 'date-fns';
import { fr } from 'date-fns/locale';

/**
 * DemandeAnnulationRecap — vue récapitulative admin d'une demande d'annulation
 * en cours (DemandeAnnulationEvenement 'en_attente' initiée par un prestataire).
 *
 * Affiche le demandeur, le motif, et deux boutons :
 *  - Accepter → annulerEvenement (annulation directe + marque demande 'acceptee')
 *  - Refuser  → refuserDemandeAnnulation (demande 'refusee', événement intact)
 *
 * Affiché côté admin dans EvenementDetail et EvenementModal.
 */
export default function DemandeAnnulationRecap({ evenementId }) {
  const qc = useQueryClient();
  const [accepting, setAccepting] = useState(false);
  const [refusing, setRefusing] = useState(false);

  const { data: demande } = useQuery({
    queryKey: ['demande-annulation-active', evenementId],
    queryFn: async () => {
      const all = await base44.entities.DemandeAnnulationEvenement.filter({ evenement_id: evenementId });
      return (all || []).find((d) => d.statut === 'en_attente') || null;
    },
    enabled: !!evenementId,
  });

  if (!demande) return null;

  const accepter = async () => {
    if (!confirm(
      `Accepter la demande d'annulation de ${demande.demandee_par_prestataire_nom || 'ce prestataire'} ?\n\n` +
      `L'événement passera en Annulé et TOUS les prestataires confirmés seront notifiés et passés en Annulé. Cette action est irréversible.`
    )) return;
    setAccepting(true);
    try {
      await base44.functions.invoke('annulerEvenement', {
        evenement_id: evenementId,
        demande_id: demande.id,
      });
      toast.success('✓ Événement annulé et demande marquée acceptée. Les prestataires confirmés ont été notifiés.');
      qc.invalidateQueries(['evenements']);
      qc.invalidateQueries(['demande-annulation-active', evenementId]);
      qc.invalidateQueries(['evenement-prestataires', evenementId]);
      qc.invalidateQueries(['evenement-prestataires-all']);
    } catch {
      toast.error('❌ Erreur lors de l\'annulation');
    }
    setAccepting(false);
  };

  const refuser = async () => {
    if (!confirm('Refuser cette demande ? L\'événement restera inchangé et les prestataires garderont leur statut.')) return;
    setRefusing(true);
    try {
      await base44.functions.invoke('refuserDemandeAnnulation', { demande_id: demande.id });
      toast.success('✓ Demande refusée. L\'événement est maintenu.');
      qc.invalidateQueries(['evenements']);
      qc.invalidateQueries(['demande-annulation-active', evenementId]);
      qc.invalidateQueries(['evenement-prestataires', evenementId]);
      qc.invalidateQueries(['evenement-prestataires-all']);
    } catch {
      toast.error('❌ Erreur lors du refus');
    }
    setRefusing(false);
  };

  return (
    <div className="border border-red-200 bg-red-50 rounded-2xl p-4 space-y-3">
      <div>
        <p className="text-sm font-semibold text-red-900 flex items-center gap-1.5">
          <Ban size={15} /> Demande d'annulation en cours
        </p>
        <p className="text-xs text-red-800 mt-0.5">
          Demandée par <strong>{demande.demandee_par_prestataire_nom || 'un prestataire'}</strong>
          {demande.created_date && (
            <> · {format(parseISO(demande.created_date), 'd MMMM yyyy à HH:mm', { locale: fr })}</>
          )}
        </p>
        {demande.motif && (
          <p className="text-[12px] text-red-700 italic mt-1 bg-white/60 rounded-lg px-2.5 py-1.5">
            « {demande.motif} »
          </p>
        )}
      </div>

      <div className="flex flex-col gap-2 pt-1 border-t border-red-200">
        <p className="text-[11px] text-red-700 flex items-center gap-1">
          <AlertTriangle size={11} />
          Accepter annulera l'événement et notifiera tous les prestataires confirmés.
        </p>
        <div className="flex gap-2">
          <Button
            size="sm"
            onClick={accepter}
            disabled={accepting || refusing}
            className="bg-red-600 hover:bg-red-700 text-white h-8 text-xs gap-1.5 flex-1"
          >
            {accepting ? <div className="w-3.5 h-3.5 border-2 border-white border-t-transparent rounded-full animate-spin" /> : <CheckCircle2 size={13} />}
            Accepter & annuler
          </Button>
          <Button
            size="sm"
            variant="outline"
            onClick={refuser}
            disabled={accepting || refusing}
            className="h-8 text-xs gap-1.5 border-red-200 text-red-600 hover:bg-red-50"
          >
            {refusing ? <div className="w-3.5 h-3.5 border-2 border-red-400 border-t-transparent rounded-full animate-spin" /> : <XCircle size={13} />}
            Refuser
          </Button>
        </div>
      </div>
    </div>
  );
}