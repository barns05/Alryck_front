// =============================================================================
//  Rôles applicatifs
// =============================================================================
//  Source unique du vocabulaire des rôles côté front. Il reproduit l'énumération
//  `TenantRole` du back (Alryck.DataAccess/Entities/AppUser.cs) et rien d'autre.
//
//  Pourquoi ce fichier existe : le front héritait du vocabulaire Base44
//  (`admin`, `user`, `extra`, `prestataire`, `lieu`), redéclaré au cas par cas dans
//  plusieurs écrans. Trois de ces valeurs n'existent plus — `prestataire` est devenu
//  `Partner`, `lieu` est devenu `Venue`, et `admin` ne couvre plus le propriétaire, qui
//  porte `Owner`. Un test d'égalité sur une chaîne périmée ne lève aucune erreur : il
//  renvoie simplement « faux » et masque silencieusement une interface entière.
//
//  Deux règles pour la suite :
//    - on lit `user.roles` (le tableau), jamais `user.role` (le premier élément, exposé
//      par le client d'API pour les écrans hérités et par nature ambigu quand une
//      appartenance en porte plusieurs — un propriétaire est `Owner` *et* `Admin`) ;
//    - toute nouvelle question sur les droits s'écrit ici, pas dans un composant.
// =============================================================================

/** Nature d'un contexte de travail, alignée sur l'enum `TenantKind` du back. */
export const TENANT_KINDS = {
  Business: 'Business',
  Personal: 'Personal',
};

/**
 * Espace personnel d'un particulier ? Le rôle ne suffit pas à le dire : son propriétaire
 * porte `Owner`, exactement comme le patron d'un traiteur. C'est la nature du périmètre
 * qui distingue les deux, et elle seule.
 */
export function isPersonalSpace(context) {
  return (context?.kind ?? context?.tenantKind) === TENANT_KINDS.Personal;
}

export const ROLES = {
  PlatformAdmin: 'platformadmin',
  Owner: 'owner',
  Admin: 'admin',
  Staff: 'staff',
  Extra: 'extra',
  Partner: 'partner',
  Venue: 'venue',
  Client: 'client',
  Guest: 'guest',
};

/** Rôles du contexte de travail courant, normalisés en minuscules. */
export function rolesOf(user) {
  return (user?.roles ?? []).map((role) => String(role).toLowerCase());
}

/** Vrai si le compte porte au moins un des rôles demandés dans son contexte courant. */
export function hasRole(user, ...roles) {
  const owned = rolesOf(user);
  return roles.some((role) => owned.includes(role));
}

/**
 * Accès au back-office de l'entreprise. `Owner` en fait partie : c'est le patron, et
 * l'oublier lui affichait le layout réduit des extras.
 */
export function isBackOffice(user) {
  if (isPersonalSpace(user)) return false;
  return hasRole(user, ROLES.Owner, ROLES.Admin, ROLES.Staff, ROLES.PlatformAdmin);
}

/** Le compte a-t-il déjà un espace de travail professionnel ? */
export function hasBusinessSpace(user) {
  return isBackOffice(user) || hasRole(user, ROLES.Partner, ROLES.Venue);
}

/** Le compte a-t-il déjà son espace personnel, parmi ses contextes ? */
export function hasPersonalSpace(contexts = []) {
  return contexts.some(isPersonalSpace);
}

/** Un compte sans appartenance active : inscrit, mais rattaché à aucune entreprise. */
export function hasNoContext(user) {
  return rolesOf(user).length === 0;
}

/**
 * Écran d'accueil d'un compte, selon ses rôles dans le contexte courant.
 *
 * `Venue` va délibérément à l'espace personnel et non à `/lieu-portal` : ce portail
 * n'ouvre que sur un jeton passé dans l'URL, si bien qu'y envoyer un compte connecté
 * produisait un « Lien invalide » systématique. Il y retournera le jour où le portail
 * saura se résoudre depuis le compte.
 */
export function homeRouteFor(user) {
  // Un espace personnel n'a pas de back-office, quel que soit le rôle qu'on y porte.
  // Tant que l'espace client de l'organisateur n'est pas branché, il atterrit sur
  // l'espace personnel, qui sait au moins lui montrer ses espaces et ses invitations.
  if (isPersonalSpace(user)) return '/espace-invite';
  if (isBackOffice(user)) return '/Dashboard';
  if (hasRole(user, ROLES.Extra)) return '/MonPlanning';
  if (hasRole(user, ROLES.Partner)) return '/MonEspacePrestataire';
  return '/espace-invite';
}
