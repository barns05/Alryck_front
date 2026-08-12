import { useQuery, useQueryClient } from '@tanstack/react-query';
import { base44 } from '@/api/base44Client';
import { toast } from 'sonner';
import { format, parseISO } from 'date-fns';
import { fr } from 'date-fns/locale';
import { Calendar, CheckCircle, XCircle, Clock } from 'lucide-react';
import { statutPropositionLabel } from '@/lib/propositionDateLabels';

/**
 * PropositionsDateSection — bloc affiché dans l'espace prestataire
 * (MonEspacePrestataire & PrestatairePortal) listant les changements de date
 * à confirmer. Pour chaque proposition active, le prestataire répond dispo/indispo.
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

export default function PropositionsDateSection({ prestataireId }) {
  const qc = useQueryClient();

  const { data: eps = [] } = useQuery({
    queryKey: ['prop-date-eps-prestataire', prestataireId],
    queryFn: async () => {
      const all = await base44.entities.EvenementPrestataire.filter({ prestataire_id: prestataireId });
      return (all || []).filter((ep) => ep.proposition_date_id && ep.statut === 'Confirmé');
    },
    enabled: !!prestataireId,
  });

  const propositionIds = [...new Set(eps.map((ep) => ep.proposition_date_id))];
  const { data: propositions = [] } = useQuery({
    queryKey: ['prop-date-props-prestataire', propositionIds.join(',')],
    queryFn: async () => {
      if (propositionIds.length === 0) return [];
      const all = await base44.entities.PropositionDateEvenement.list('-created_date', 100);
      return (all || []).filter((p) => propositionIds.includes(p.id) && p.statut === 'en_attente');
    },
    enabled: propositionIds.length > 0,
  });

  const propsById = {};
  propositions.forEach((p) => { propsById[p.id] = p; });
  const items = eps.filter((ep) => propsById[ep.proposition_date_id]);

  if (items.length === 0) return null;

  const repondre = async (ep, reponse) => {
    try {
      await base44.entities.EvenementPrestataire.update(ep.id, { reponse_date_proposee: reponse });
      qc.invalidateQueries(['prop-date-eps-prestataire', prestataireId]);
      toast.success(reponse === 'dispo' ? '✓ Disponibilité confirmée' : '✓ Indisponibilité signalée');
    } catch {
      toast.error('❌ Erreur lors de l\'enregistrement');
    }
  };

  return (
    <div className="space-y-3">
      <h2 className="font-semibold text-sm uppercase tracking-wide text-muted-foreground">
        📅 Changements de date à confirmer
      </h2>
      {items.map((ep) => {
        const prop = propsById[ep.proposition_date_id];
        const rep = ep.reponse_date_proposee;
        return (
          <div key={ep.id} className="bg-amber-50 border border-amber-200 rounded-2xl p-4 space-y-2">
            <p className="text-sm font-semibold text-amber-900">{ep.evenement_nom || 'Événement'}</p>
            <p className="text-xs text-amber-800 flex items-center gap-1">
              <Calendar size={12} /> Nouvelle date proposée : <strong className="ml-1">{dateLabel(prop)}</strong>
            </p>
            <p className="text-[11px] text-amber-700 italic">{statutPropositionLabel(prop)}</p>
            <div className="flex gap-2 pt-1">
              <button
                onClick={() => repondre(ep, 'dispo')}
                disabled={rep === 'dispo'}
                className={`flex-1 flex items-center justify-center gap-1.5 text-xs py-2 rounded-xl font-medium border transition-colors ${
                  rep === 'dispo'
                    ? 'bg-emerald-100 text-emerald-700 border-emerald-200 cursor-default'
                    : 'bg-white text-emerald-700 border-emerald-200 hover:bg-emerald-50'
                }`}
              >
                <CheckCircle size={13} />
                {rep === 'dispo' ? 'Disponible ✓' : 'Je suis disponible'}
              </button>
              <button
                onClick={() => repondre(ep, 'indispo')}
                disabled={rep === 'indispo'}
                className={`flex-1 flex items-center justify-center gap-1.5 text-xs py-2 rounded-xl font-medium border transition-colors ${
                  rep === 'indispo'
                    ? 'bg-red-100 text-red-600 border-red-200 cursor-default'
                    : 'bg-white text-red-600 border-red-200 hover:bg-red-50'
                }`}
              >
                <XCircle size={13} />
                {rep === 'indispo' ? 'Indisponible ✓' : 'Je suis indisponible'}
              </button>
            </div>
            {rep && (
              <p className="text-[11px] text-amber-700 flex items-center gap-1">
                <Clock size={10} /> Réponse enregistrée — l'organisateur finalisera la date.
              </p>
            )}
          </div>
        );
      })}
    </div>
  );
}