/**
 * useOwnerCompanySettings — Hook centralisé React Query pour récupérer
 * l'enregistrement CompanySettings propriétaire de l'app (is_owner === true).
 *
 * Résout la divergence historique entre `useSettingsStore` (singleton manuel,
 * 1er record par created_date) et les queries React Query `['company-settings']`
 * (filter is_owner) : désormais tout passe par ce hook.
 *
 * Cache : la queryFn renvoie la LISTE filtrée `[owner]` (shape array, compatible
 * avec les consommateurs existants qui font `data[0]`) afin de permettre une
 * migration incrémentale sans collision de cache. Le hook expose `settings`
 * = l'objet owner (ou null si absent).
 *
 * Clé de query : `['company-settings']` (réutilisée — les invalidateQueries
 * existants continuent de rafraîchir ce cache).
 */
import { useQuery, useQueryClient } from '@tanstack/react-query';
import { base44 } from '@/api/base44Client';

export const OWNER_SETTINGS_KEY = ['company-settings'];

async function fetchOwnerSettingsList() {
  const all = await base44.entities.CompanySettings.list('-created_date', 50);
  // is_owner === true : enregistrement de l'entreprise propriétaire de l'app.
  return all.filter(cs => cs.is_owner === true);
}

/**
 * @param {object} [options] options React Query additionnelles (ex. { enabled })
 * @returns {{ settings: object|null, isLoading: boolean, isError: boolean, error: unknown, refetch: Function, query: object }}
 */
export function useOwnerCompanySettings(options = {}) {
  const query = useQuery({
    queryKey: OWNER_SETTINGS_KEY,
    queryFn: fetchOwnerSettingsList,
    staleTime: 60_000,
    ...options,
  });
  const list = query.data ?? [];
  return {
    settings: list[0] ?? null,
    isLoading: query.isLoading,
    isError: query.isError,
    error: query.error,
    refetch: query.refetch,
    query,
  };
}

/** Invalide le cache owner settings (à appeler après mutation de CompanySettings). */
export function useInvalidateOwnerSettings() {
  const qc = useQueryClient();
  return () => qc.invalidateQueries({ queryKey: OWNER_SETTINGS_KEY });
}