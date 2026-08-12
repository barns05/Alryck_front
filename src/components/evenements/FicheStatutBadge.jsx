import { useQuery } from '@tanstack/react-query';
import { base44 } from '@/api/base44Client';

/**
 * Affiche un badge coloré selon le statut des fiches de service d'un événement.
 * - Gris "À faire" : aucune fiche ou non générée
 * - Vert "✅ Prête" : au moins une fiche en statut Prete
 * - Bleu "📨 Envoyée" : toutes les fiches envoyées
 */
export default function FicheStatutBadge({ evenementId }) {
  const { data: fiches = [] } = useQuery({
    queryKey: ['fiches-service', evenementId],
    queryFn: () => base44.entities.FicheService.filter({ evenement_id: evenementId }),
    staleTime: 30000,
  });

  const actives = fiches.filter(f => f.statut && f.statut !== 'Non generee');

  if (actives.length === 0) {
    return (
      <span className="text-xs px-2 py-0.5 rounded-md bg-slate-100 text-slate-600 font-medium">
        À faire
      </span>
    );
  }

  const toutesEnvoyees = actives.every(f => f.statut === 'Envoyee' || f.statut === 'Vue');

  if (toutesEnvoyees) {
    return (
      <span className="text-xs px-2 py-0.5 rounded-md bg-blue-100 text-blue-700 font-medium">
        Envoyée
      </span>
    );
  }

  return (
    <span className="text-xs px-2 py-0.5 rounded-md bg-emerald-100 text-emerald-700 font-medium">
      Prête
    </span>
  );
}