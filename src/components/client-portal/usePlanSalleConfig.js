/**
 * usePlanSalleConfig — Résolution partagée « Plan de salle » pour le portail client.
 *
 * Reprend la logique historique de MonEspaceTab :
 *   evenement.lieu_id → EspaceLieu.filter({ lieu_id, actif: true })
 *   → activeEspaceId = evenement.espace_lieu_id || espacesLieu[0]?.id
 *   → PropositionConfig.filter({ espace_lieu_id: activeEspaceId, statut: 'validee' })
 *
 * Clés de cache partagées avec EspaceSelector / AutoPlacementModal / PlanDeTable
 * (pas de requête réseau dupliquée).
 *
 * Retourne { espaceActif, espacesLieu, propsValidees, disponible }
 *   disponible = !!espaceActif && propsValidees.length > 0
 */
import { useQuery } from '@tanstack/react-query';
import { base44 } from '@/api/base44Client';

export function usePlanSalleConfig(evenement) {
  const { data: espacesLieu = [] } = useQuery({
    queryKey: ['espaces-lieu', evenement?.lieu_id],
    queryFn: () => evenement?.lieu_id
      ? base44.entities.EspaceLieu.filter({ lieu_id: evenement.lieu_id, actif: true })
      : [],
    enabled: !!evenement?.lieu_id,
    staleTime: 30000,
  });

  const activeEspaceId = evenement?.espace_lieu_id || espacesLieu[0]?.id || null;

  const { data: propsValidees = [] } = useQuery({
    queryKey: ['propositions-config-validees', activeEspaceId],
    queryFn: () => activeEspaceId
      ? base44.entities.PropositionConfig.filter({ espace_lieu_id: activeEspaceId, statut: 'validee' }, 'ordre', 200)
      : [],
    enabled: !!activeEspaceId,
    staleTime: 30000,
  });

  const espaceActif = activeEspaceId ? (espacesLieu.find(e => e.id === activeEspaceId) || null) : null;
  const disponible = !!espaceActif && propsValidees.length > 0;

  return { espaceActif, espacesLieu, propsValidees, disponible };
}

export default usePlanSalleConfig;