/**
 * matchLieuEvenement — Associe une étape/moment du programme à un lieu typé
 * (entité LieuEvenement) selon la catégorie ou le nom de l'étape.
 *
 * Seuls les lieux VALIDÉS (statut_validation === 'valide', défaut) sont retenus :
 * les propositions client en attente et les lieux refusés ne s'affichent pas
 * comme lieu officiel dans les vues programme (client + public).
 *
 * @param {Object} etape - étape du programme (item de programme_journee ou EtapeProgramme)
 * @param {Array}  lieuxEvenement - lieux typés de l'événement (entité LieuEvenement)
 * @returns {Object|null} - le lieu matché ou null (fallback sur evenement.lieu_nom côté appelant)
 */
export function matchLieuEvenement(etape, lieuxEvenement) {
  if (!lieuxEvenement || lieuxEvenement.length === 0 || !etape) return null;
  const valides = lieuxEvenement.filter((le) => (le.statut_validation || 'valide') === 'valide');
  if (valides.length === 0) return null;
  const cat = (etape.categorie || etape.nom || '').toLowerCase();
  for (const le of valides) {
    if (le.type && cat.includes(le.type.toLowerCase())) return le;
  }
  // Si un seul lieu validé existe, on l'utilise par défaut pour toutes les étapes
  if (valides.length === 1) return valides[0];
  return null;
}