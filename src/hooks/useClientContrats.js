import { useQuery } from '@tanstack/react-query';
import { base44 } from '@/api/base44Client';

/**
 * useClientContrats — logique partagée de requête/filtrage des contrats côté
 * portail client (lecture seule). Consommée par ContratsView (EvenementTab) et
 * ConsolidatedDocumentsView pour éviter la duplication de la logique de requête.
 *
 * Requête tous les contrats du client (client_id), puis filtre côté client par
 * evenement_id et prestataire_id (optionnels).
 */
export function useClientContrats({ clientId, evenementId, prestataireId } = {}) {
  const { data: contrats = [], isLoading } = useQuery({
    queryKey: ['client-contrats', clientId, evenementId, prestataireId],
    queryFn: () => clientId ? base44.entities.Contrat.filter({ client_id: clientId }) : [],
    enabled: !!clientId,
    staleTime: 60000,
  });

  const actifs = contrats.filter(c =>
    c.type !== 'modele' &&
    (!evenementId || !c.evenement_id || c.evenement_id === evenementId) &&
    (!prestataireId || c.prestataire_id === prestataireId)
  );

  return { contrats: actifs, isLoading };
}