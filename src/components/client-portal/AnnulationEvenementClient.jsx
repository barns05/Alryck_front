import { useState } from 'react';
import { useQuery, useQueryClient } from '@tanstack/react-query';
import { base44 } from '@/api/base44Client';
import { toast } from 'sonner';
import { Ban, CheckCircle2, XCircle, AlertTriangle } from 'lucide-react';
import { format, parseISO } from 'date-fns';
import { fr } from 'date-fns/locale';

/**
 * AnnulationEvenementClient — bloc affiché dans l'espace client (EvenementTab).
 *
 *  - Bouton « Annuler mon événement » (action directe via annulerEvenement avec
 *    client_token). Confirmation obligatoire expliquant l'impact.
 *  - Si une DemandeAnnulationEvenement 'en_attente' existe (initiée par un
 *    prestataire), l'affiche au client avec boutons Accepter / Refuser.
 *
 * N'apparaît que si l'événement n'est pas déjà Annulé.
 */
export default function AnnulationEvenementClient({ evenement, clientToken }) {
  const qc = useQueryClient();
  const [annuling, setAnnuling] = useState(false);
  const [accepting, setAccepting] = useState(false);
  const [refusing, setRefusing] = useState(false);

  const { data: demande } = useQuery({
    queryKey: ['demande-annulation-active-client', evenement?.id],
    queryFn: async () => {
      const all = await base44.entities.DemandeAnnulationEvenement.filter({ evenement_id: evenement.id });
      return (all || []).find((d) => d.statut === 'en_attente') || null;
    },
    enabled: !!evenement?.id,
  });

  if (!evenement || evenement.statut === 'Annulé') return null;

  // Token client : priorité au prop explicite, sinon lié depuis l'événement lui-même.
  const token = clientToken || evenement.lien_client_token || null;

  const annulerDirect = async () => {
    if (!confirm(
      `Annuler votre événement « ${evenement.nom || ''} » ?\n\n` +
      `Tous les prestataires confirmés seront notifiés et leur statut passera à Annulé. ` +
      `La donnée est conservée (pas de suppression). Cette action est irréversible.`
    )) return;
    setAnnuling(true);
    try {
      await base44.functions.invoke('annulerEvenement', {
        evenement_id: evenement.id,
        client_token: token,
      });
      toast.success('✓ Événement annulé. Les prestataires confirmés ont été notifiés.');
      qc.invalidateQueries(['evenement-portal', evenement.id]);
      qc.invalidateQueries(['demande-annulation-active-client', evenement.id]);
    } catch {
      toast.error('❌ Erreur lors de l\'annulation');
    }
    setAnnuling(false);
  };

  const accepterDemande = async () => {
    if (!confirm(
      `Accepter la demande d'annulation de ${demande.demandee_par_prestataire_nom || 'ce prestataire'} ?\n\n` +
      `L'événement passera en Annulé et tous les prestataires confirmés seront notifiés. Cette action est irréversible.`
    )) return;
    setAccepting(true);
    try {
      await base44.functions.invoke('annulerEvenement', {
        evenement_id: evenement.id,
        demande_id: demande.id,
        client_token: token,
      });
      toast.success('✓ Demande acceptée. Événement annulé.');
      qc.invalidateQueries(['evenement-portal', evenement.id]);
      qc.invalidateQueries(['demande-annulation-active-client', evenement.id]);
    } catch {
      toast.error('❌ Erreur lors de l\'annulation');
    }
    setAccepting(false);
  };

  const refuserDemande = async () => {
    if (!confirm('Refuser cette demande ? L\'événement restera inchangé.')) return;
    setRefusing(true);
    try {
      await base44.functions.invoke('refuserDemandeAnnulation', { demande_id: demande.id });
      toast.success('✓ Demande refusée. L\'événement est maintenu.');
      qc.invalidateQueries(['demande-annulation-active-client', evenement.id]);
    } catch {
      toast.error('❌ Erreur lors du refus');
    }
    setRefusing(false);
  };

  return (
    <div className="px-4 pt-2 space-y-3">
      {/* Demande prestataire en attente */}
      {demande && (
        <div className="border border-red-200 bg-red-50 rounded-2xl p-4 space-y-3">
          <div>
            <p className="text-sm font-semibold text-red-900 flex items-center gap-1.5">
              <Ban size={15} /> Demande d'annulation reçue
            </p>
            <p className="text-xs text-red-800 mt-0.5">
              {demande.demandee_par_prestataire_nom || 'Un prestataire'} demande l'annulation de cet événement
              {demande.created_date && (
                <> · {format(parseISO(demande.created_date), 'd MMMM yyyy', { locale: fr })}</>
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
              <button
                onClick={accepterDemande}
                disabled={accepting || refusing}
                className="flex-1 flex items-center justify-center gap-1.5 text-xs py-2 rounded-xl font-medium bg-red-600 text-white disabled:opacity-50"
              >
                {accepting
                  ? <div className="w-3.5 h-3.5 border-2 border-white border-t-transparent rounded-full animate-spin" />
                  : <CheckCircle2 size={13} />}
                Accepter & annuler
              </button>
              <button
                onClick={refuserDemande}
                disabled={accepting || refusing}
                className="flex-1 flex items-center justify-center gap-1.5 text-xs py-2 rounded-xl font-medium border border-red-200 text-red-600 bg-white hover:bg-red-50 disabled:opacity-50"
              >
                {refusing
                  ? <div className="w-3.5 h-3.5 border-2 border-red-400 border-t-transparent rounded-full animate-spin" />
                  : <XCircle size={13} />}
                Refuser
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Bouton annulation directe */}
      <button
        onClick={annulerDirect}
        disabled={annuling}
        className="w-full flex items-center justify-center gap-1.5 text-xs py-2.5 rounded-xl font-medium border border-red-200 text-red-600 bg-white hover:bg-red-50 disabled:opacity-50"
      >
        {annuling
          ? <div className="w-3.5 h-3.5 border-2 border-red-400 border-t-transparent rounded-full animate-spin" />
          : <Ban size={13} />}
        Annuler mon événement
      </button>
    </div>
  );
}