/**
 * usePortalResolution
 *
 * Résout un token URL vers les entités correspondantes.
 * Ordre de résolution :
 *  1. Client.lien_client_token → mode client
 *  2. Evenement.lien_client_token → mode client (depuis événement)
 *  3. Prospect.lien_token → mode prospect
 *     - Si prospect.converti → charge aussi Client + Evenements (mode client avec prospect lié)
 *     - Sinon → mode prospect pur
 *
 * Retourne :
 *   mode        : 'client' | 'prospect' | null
 *   client      : Client entity | null
 *   prospect    : Prospect entity | null
 *   evenements  : Evenement[] (triés par date)
 *   lieux       : { [lieu_id]: Lieu }
 *   loading     : boolean
 *   error       : string | null
 *   refetch     : () => void  — force une nouvelle résolution (ex: après création d'un événement)
 */
import { useState, useEffect, useCallback } from 'react';
import { base44 } from '@/api/base44Client';

export function usePortalResolution(token) {
  const [state, setState] = useState({
    mode: null,
    client: null,
    prospect: null,
    evenements: [],
    lieux: {},
    loading: true,
    error: null,
  });
  const [refreshKey, setRefreshKey] = useState(0);
  const refetch = useCallback(() => setRefreshKey(k => k + 1), []);

  useEffect(() => {
    if (!token) {
      setState(s => ({ ...s, loading: false, error: 'Lien invalide. Veuillez utiliser le lien qui vous a été envoyé.' }));
      return;
    }

    let cancelled = false;

    const resolve = async () => {
      try {
        // ── Étape 1 : Client par token ─────────────────────────────────────
        const clientsByToken = await base44.entities.Client.filter({ lien_client_token: token });
        if (!cancelled && clientsByToken.length > 0) {
          const client = clientsByToken[0];
          const { evs, lieux } = await loadClientEvents(client.id);
          if (!cancelled) setState({ mode: 'client', client, prospect: null, evenements: evs, lieux, loading: false, error: null });
          return;
        }

        // ── Étape 2 : Evenement par token ──────────────────────────────────
        const evsByToken = await base44.entities.Evenement.filter({ lien_client_token: token });
        if (!cancelled && evsByToken.length > 0) {
          const firstEv = evsByToken[0];
          let client = null;
          if (firstEv.client_id) {
            const cl = await base44.entities.Client.filter({ id: firstEv.client_id });
            if (cl.length > 0) client = cl[0];
          }
          const { evs, lieux } = await loadClientEvents(firstEv.client_id, evsByToken);
          if (!cancelled) setState({ mode: 'client', client, prospect: null, evenements: evs, lieux, loading: false, error: null });
          return;
        }

        // ── Étape 3 : Prospect par token ───────────────────────────────────
        const prospects = await base44.entities.Prospect.filter({ lien_token: token });
        if (!cancelled && prospects.length > 0) {
          const prospect = prospects[0];

          if (prospect.converti && prospect.client_id) {
            // Prospect converti → mode client avec prospect lié
            const clientsByPId = await base44.entities.Client.filter({ id: prospect.client_id });
            const client = clientsByPId[0] || null;
            const { evs, lieux } = await loadClientEvents(prospect.client_id);
            if (!cancelled) setState({ mode: 'client', client, prospect, evenements: evs, lieux, loading: false, error: null });
          } else {
            // Prospect pur
            if (!cancelled) setState({ mode: 'prospect', client: null, prospect, evenements: [], lieux: {}, loading: false, error: null });
          }
          return;
        }

        // ── Aucun résultat ─────────────────────────────────────────────────
        if (!cancelled) setState(s => ({ ...s, loading: false, error: 'Espace introuvable. Veuillez contacter votre organisateur.' }));
      } catch (err) {
        if (!cancelled) setState(s => ({ ...s, loading: false, error: 'Une erreur est survenue. Veuillez réessayer.' }));
      }
    };

    resolve();
    return () => { cancelled = true; };
  }, [token, refreshKey]);

  return { ...state, refetch };
}

/** Charge les événements d'un client et les lieux associés */
async function loadClientEvents(clientId, existingEvs = null) {
  let evs = existingEvs;
  if (!evs) {
    evs = clientId ? await base44.entities.Evenement.filter({ client_id: clientId }) : [];
  }
  evs = [...evs].sort((a, b) => (a.date || '').localeCompare(b.date || ''));

  const lieux = {};
  for (const e of evs) {
    if (e.lieu_id && !lieux[e.lieu_id]) {
      const res = await base44.entities.Lieu.filter({ id: e.lieu_id });
      if (res.length > 0) lieux[e.lieu_id] = res[0];
    }
  }
  return { evs, lieux };
}