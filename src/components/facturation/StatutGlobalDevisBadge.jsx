import { useQuery } from '@tanstack/react-query';
import { base44 } from '@/api/base44Client';
import { calcStatutGlobal } from '@/lib/statutGlobalDevis';

// Badge "statut global" agrégé d'un événement (Soldé / Acompte reçu / Devis envoyé).
// Se charge de récupérer les documents Devis rattachés à l'événement et leurs échéances.
export default function StatutGlobalDevisBadge({ evenementId }) {
  const { data: devisList = [] } = useQuery({
    queryKey: ['devis-evenement-global', evenementId],
    queryFn: () => base44.entities.Devis.filter({ evenement_id: evenementId }),
    enabled: !!evenementId,
  });

  const devisIds = devisList.map(d => d.id);

  const { data: echeances = [] } = useQuery({
    queryKey: ['echeances-evenement-global', evenementId],
    queryFn: async () => {
      const results = await Promise.all(
        devisIds.map(id => base44.entities.Echeance.filter({ devis_id: id }).catch(() => []))
      );
      return results.flat();
    },
    enabled: devisIds.length > 0,
  });

  if (!devisList.length) return null;

  const echeancesByDevis = devisIds.reduce((acc, id) => {
    acc[id] = echeances.filter(e => e.devis_id === id);
    return acc;
  }, {});

  const statut = calcStatutGlobal(devisList, echeancesByDevis);
  if (!statut) return null;

  return (
    <span className={`text-xs px-2.5 py-1 rounded-full font-medium border ${statut.color}`}>
      {statut.label}
    </span>
  );
}