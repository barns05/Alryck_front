/**
 * Retourne le prix d'un article pour une année donnée.
 * Cherche dans prix_par_annee, sinon retourne item.prix (rétrocompatibilité).
 *
 * @param {object} item  - CatalogueItem ou OptionPrestation
 * @param {number} annee - Année cible (ex: 2027)
 * @returns {number}
 */
export function getPrixPourAnnee(item, annee) {
  if (!annee || !item?.prix_par_annee?.length) return item?.prix || 0;
  const found = item.prix_par_annee.find(p => p.annee === annee);
  return found ? found.prix : (item?.prix || 0);
}