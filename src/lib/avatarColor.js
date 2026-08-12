/**
 * avatarColor — Couleur d'avatar (initiales) cohérente et partagée.
 * Même logique utilisée par PlanSalleListView (vue liste) et PlanSpatialView
 * (bulle invités au tap), pour qu'un même invité ait la même couleur partout.
 */
export const AVATAR_COLORS = [
  '#1e1b4b', '#7c3aed', '#1d4ed8', '#0f766e', '#15803d',
  '#c2410c', '#b91c1c', '#be185d', '#6d28d9', '#0369a1',
];

export function avatarColor(name) {
  return AVATAR_COLORS[((name || ' ').charCodeAt(0)) % AVATAR_COLORS.length];
}

export function avatarInitiales(prenom, nom) {
  return `${(prenom || '?')[0]}${(nom || '')[0] || ''}`.toUpperCase();
}