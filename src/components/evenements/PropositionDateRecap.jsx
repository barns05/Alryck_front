import { useState } from 'react';
import { useQuery, useQueryClient } from '@tanstack/react-query';
import { base44 } from '@/api/base44Client';
import { toast } from 'sonner';
import { format, parseISO } from 'date-fns';
import { fr } from 'date-fns/locale';
import { CheckCircle2, XCircle, Clock, CalendarClock } from 'lucide-react';
import { statutPropositionLabel } from '@/lib/propositionDateLabels';
import { Button } from '@/components/ui/button';

/**
 * PropositionDateRecap — vue récapitulative admin d'un changement de date en cours.
 * Affiche la proposition active (en_attente), l'état des réponses par prestataire,
 * et un bouton "Finaliser cette date" (appelle finalizePropositionDate).
 *
 * Affiché côté admin dans EvenementDetail et EvenementModal.
 */
function dateLabel(prop) {
  if (!prop) return '';
  if (prop.nouvelle_date_type === 'mois' && prop.nouvelle_date_mois) {
    const names = ['Janvier','Février','Mars','Avril','Mai','Juin','Juillet','Août','Septembre','Octobre','Novembre','Décembre'];
    const [y, m] = prop.nouvelle_date_mois.split('-');
    const idx = parseInt(m, 10) - 1;
    return idx >= 0 && idx < 12 ? `${names[idx]} ${y}` : prop.nouvelle_date_mois;
  }
  if (prop.nouvelle_date_type === 'periode' && prop.nouvelle_date_periode) {
    return prop.nouvelle_date_periode;
  }
  try {
    return format(parseISO(prop.nouvelle_date), 'd MMMM yyyy', { locale: fr });
  } catch {
    return prop.nouvelle_date || '';
  }
}

export default function PropositionDateRecap({ evenementId }) {
  const qc = useQueryClient();
  const [finalizing, setFinalizing] = useState(false);
  const [refusing, setRefusing] = useState(false);

  const { data: prop } = useQuery({
    queryKey: ['proposition-date-active', evenementId],
    queryFn: async () => {
      const all = await base44.entities.PropositionDateEvenement.filter({ evenement_id: evenementId });
      return (all || []).find((p) => p.statut === 'en_attente') || null;
    },
    enabled: !!evenementId,
  });

  const { data: eps = [] } = useQuery({
    queryKey: ['prop-date-eps-recap', evenementId, prop?.id],
    queryFn: async () => {
      if (!prop) return [];
      const all = await base44.entities.EvenementPrestataire.filter({ evenement_id: evenementId });
      return (all || []).filter((ep) => ep.proposition_date_id === prop.id);
    },
    enabled: !!prop,
  });

  if (!prop) return null;

  const counts = {
    dispo: eps.filter((e) => e.reponse_date_proposee === 'dispo').length,
    indispo: eps.filter((e) => e.reponse_date_proposee === 'indispo').length,
    attente: eps.filter((e) => !e.reponse_date_proposee).length,
  };

  const finalize = async () => {
    setFinalizing(true);
    try {
      await base44.functions.invoke('finalizePropositionDate', { proposition_id: prop.id });
      toast.success('✓ Date finalisée et appliquée à l\'événement');
      qc.invalidateQueries(['evenements']);
      qc.invalidateQueries(['proposition-date-active', evenementId]);
      qc.invalidateQueries(['evenement-prestataires', evenementId]);
      qc.invalidateQueries(['evenement-prestataires-all']);
    } catch {
      toast.error('❌ Erreur lors de la finalisation');
    }
    setFinalizing(false);
  };

  const refuser = async () => {
    if (!confirm('Refuser cette proposition ? La date de l\'événement restera inchangée et les prestataires garderont leur statut Confirmé.')) return;
    setRefusing(true);
    try {
      await base44.functions.invoke('refuserPropositionDate', { proposition_id: prop.id });
      toast.success('✓ Proposition refusée. La date initiale est maintenue.');
      qc.invalidateQueries(['evenements']);
      qc.invalidateQueries(['proposition-date-active', evenementId]);
      qc.invalidateQueries(['evenement-prestataires', evenementId]);
      qc.invalidateQueries(['evenement-prestataires-all']);
    } catch {
      toast.error('❌ Erreur lors du refus');
    }
    setRefusing(false);
  };

  return (
    <div className="border border-amber-200 bg-amber-50 rounded-2xl p-4 space-y-3">
      <div>
        <p className="text-sm font-semibold text-amber-900 flex items-center gap-1.5">
          <CalendarClock size={15} /> Changement de date en cours
        </p>
        <p className="text-xs text-amber-800 mt-0.5">
          Nouvelle date proposée : <strong>{dateLabel(prop)}</strong>
        </p>
        <p className="text-[11px] text-amber-700 italic">{statutPropositionLabel(prop)}</p>
      </div>

      <div className="space-y-1.5">
        {eps.map((ep) => {
          const rep = ep.reponse_date_proposee;
          return (
            <div key={ep.id} className="flex items-center justify-between bg-white rounded-lg px-3 py-1.5 border border-amber-100">
              <span className="text-sm font-medium truncate">{ep.prestataire_nom}</span>
              <span className={`text-xs px-2 py-0.5 rounded-full font-medium flex items-center gap-1 shrink-0 ${
                rep === 'dispo' ? 'bg-emerald-100 text-emerald-700'
                : rep === 'indispo' ? 'bg-red-100 text-red-600'
                : 'bg-amber-100 text-amber-700'
              }`}>
                {rep === 'dispo' ? <><CheckCircle2 size={11} /> Disponible</>
                  : rep === 'indispo' ? <><XCircle size={11} /> Indisponible</>
                  : <><Clock size={11} /> En attente</>}
              </span>
            </div>
          );
        })}
      </div>

      <div className="flex flex-col gap-2 pt-1 border-t border-amber-200">
        <p className="text-[11px] text-amber-700">
          {counts.dispo} dispo · {counts.indispo} indispo · {counts.attente} en attente
        </p>
        <div className="flex gap-2">
          <Button
            size="sm"
            onClick={finalize}
            disabled={finalizing || refusing || eps.length === 0}
            className="bg-amber-600 hover:bg-amber-700 text-white h-8 text-xs gap-1.5 flex-1"
          >
            {finalizing ? <div className="w-3.5 h-3.5 border-2 border-white border-t-transparent rounded-full animate-spin" /> : <CheckCircle2 size={13} />}
            Finaliser cette date
          </Button>
          <Button
            size="sm"
            variant="outline"
            onClick={refuser}
            disabled={finalizing || refusing}
            className="h-8 text-xs gap-1.5 border-red-200 text-red-600 hover:bg-red-50"
          >
            {refusing ? <div className="w-3.5 h-3.5 border-2 border-red-400 border-t-transparent rounded-full animate-spin" /> : <XCircle size={13} />}
            Refuser
          </Button>
        </div>
      </div>
      <p className="text-[11px] text-amber-600">
        La finalisation applique la nouvelle date. Les prestataires « indisponibles » passent en Annulé
        (place libérée pour l'Annuaire). Les autres restent Confirmés.
      </p>
    </div>
  );
}