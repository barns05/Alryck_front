/**
 * tableDisplayName — Affichage normalisé du nom d'une table.
 * - Si nom_perso renseigné : « Table N · {nom_perso} » (ex: « Table 1 · Tulipe »).
 * - Sinon : « Table N » (référence générée à la création/configuration).
 *
 * `nom` (référence numérotée) n'est jamais modifié par le client : seul
 * `nom_perso` est éditable via TableEditModal, ce qui garantit la persistance
 * du numéro de référence lié à la position dans le plan de salle.
 */
export function tableDisplayName(table) {
  if (!table) return '';
  const ref = table.nom || '';
  return table.nom_perso ? `${ref} · ${table.nom_perso}` : ref;
}

export default tableDisplayName;