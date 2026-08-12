/**
 * geocodeAddress.js — Résolution adresse → coordonnées GPS.
 *
 * Interface stable : geocodeAddress({ adresse, ville, code_postal }) → Promise<{lat, lng} | null>
 *
 * Implémentation actuelle : STUB. Aucun appel réseau, retourne null.
 * Les coordonnées sont assignées manuellement sur les fiches TEST pour valider
 * le filtrage géolocalisé de l'annuaire sans dépendre d'un provider externe.
 *
 * À compléter plus tard (migration Vercel / Supabase, bascule Google Maps Platform) :
 *   - Appel Google Geocoding API :
 *       fetch(`https://maps.googleapis.com/maps/api/geocode/json?address=${encodeURIComponent(q)}&key=${GOOGLE_MAPS_API_KEY}`)
 *   - Parser results[0].geometry.location → { lat, lng }
 *   - Mettre en cache les résultats (ex: en base sur CompanySettings.latitude/longitude)
 *   pour éviter de rejouer le géocodage à chaque fois.
 *
 * L'interface ne change pas : aucun refactoring du consommateur (AnnuaireTab) nécessaire.
 */

export async function geocodeAddress({ adresse, ville, code_postal } = {}) {
  // STUB — pas de provider de géocodage configuré pour l'instant.
  return null;
}

/**
 * Distance Haversine en km entre deux points GPS.
 * Retourne Infinity si l'une des coordonnées est manquante (exclut le prestataire du filtre distance).
 */
export function haversineKm(lat1, lon1, lat2, lon2) {
  if (lat1 == null || lon1 == null || lat2 == null || lon2 == null) return Infinity;
  const R = 6371; // rayon terrestre en km
  const toRad = (d) => (d * Math.PI) / 180;
  const dLat = toRad(lat2 - lat1);
  const dLon = toRad(lon2 - lon1);
  const a =
    Math.sin(dLat / 2) ** 2 +
    Math.cos(toRad(lat1)) * Math.cos(toRad(lat2)) * Math.sin(dLon / 2) ** 2;
  return 2 * R * Math.asin(Math.min(1, Math.sqrt(a)));
}