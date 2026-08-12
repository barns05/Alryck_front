/**
 * tableSeating — Logique partagée de répartition circulaire des invités autour
 * d'une table. Utilisée à l'écran (PlanSpatialView, bulle au tap) et à l'export
 * PDF (exportPlanDeTablePDF) pour garantir un ordre et un placement identiques.
 *
 * L'ordre des invités = ordre chronologique d'assignation (Invite.date_assignation_table
 * croissant). Repli stable : les invités sans date_assignation_table (données
 * antérieures au champ) gardent leur ordre naturel dans la liste fournie, placés
 * APRÈS ceux qui ont une date.
 *
 * Le placement autour du cercle : départ en haut (−90°), sens horaire, positions
 * uniformément réparties sur `seats` sièges (seats = capacité de la table, ou
 * nombre d'invités si pas de capacité). Les sièges au-delà du nombre d'invités
 * restent vides (non annotés).
 */

/**
 * Trie les invités par ordre chronologique d'assignation (date_assignation_table).
 * Tri stable : préserve l'ordre original pour les invités sans date (repli).
 * @param {Array} invites — invités assignés à la table (table_attribuee === table.id)
 * @returns {Array} invités triés (ne mute pas l'entrée)
 */
export function sortInvitesByAssignation(invites) {
  const indexed = invites.map((inv, idx) => ({ inv, idx }));
  const withDate = indexed.filter((x) => x.inv.date_assignation_table);
  const without = indexed.filter((x) => !x.inv.date_assignation_table);
  withDate.sort(
    (a, b) =>
      new Date(a.inv.date_assignation_table).getTime() -
      new Date(b.inv.date_assignation_table).getTime()
  );
  without.sort((a, b) => a.idx - b.idx);
  return [...withDate, ...without].map((x) => x.inv);
}

/**
 * Nombre de sièges à représenter autour du cercle = capacité de la table,
 * ou nombre d'invités si pas de capacité (au moins 1).
 * @param {number|undefined} capacite
 * @param {number} invCount
 * @returns {number}
 */
export function seatCount(capacite, invCount) {
  return Math.max(capacite || invCount, invCount, 1);
}

/**
 * Angles (radians) des sièges autour du cercle, départ en haut (−90°), sens horaire.
 * @param {number} seats
 * @returns {number[]}
 */
export function seatAngles(seats) {
  const arr = [];
  for (let i = 0; i < seats; i++) {
    arr.push((-90 + (360 / seats) * i) * (Math.PI / 180));
  }
  return arr;
}