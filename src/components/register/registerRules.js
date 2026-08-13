// =============================================================================
//  Règles communes aux formulaires d'inscription
// =============================================================================
//  Les trois formulaires (pro, client, équipe) appliquaient chacun leur propre règle de
//  mot de passe : deux exigeaient 8 caractères là où ASP.NET Identity en impose 10, si
//  bien qu'un mot de passe de 8 passait la validation du navigateur pour se faire
//  refuser par le serveur, sous un message générique qui ne disait pas pourquoi.
//
//  La règle vit donc à un seul endroit, et les codes d'erreur stables du back sont
//  traduits ici plutôt que dans chaque écran.
// =============================================================================

/**
 * Longueur minimale imposée par ASP.NET Identity côté serveur
 * (`RegisterRequest.Password`, `[MinLength(10)]`). Toute modification doit être faite
 * des deux côtés — le serveur reste seul juge.
 */
export const PASSWORD_MIN = 10;

/** Message affiché sous le champ, et vérifié avant l'appel réseau. */
export const PASSWORD_HINT = `Minimum ${PASSWORD_MIN} caractères`;

/**
 * Valide le couple mot de passe / confirmation. Renvoie un message d'erreur, ou `null`
 * si tout va bien.
 */
export function validatePassword(password, confirmation) {
  if (password !== confirmation) return 'Les mots de passe ne correspondent pas.';
  if (password.length < PASSWORD_MIN) {
    return `Le mot de passe doit contenir au moins ${PASSWORD_MIN} caractères.`;
  }
  return null;
}

/** Traduit les codes d'erreur stables du back en message lisible. */
export function messageFor(err) {
  switch (err?.code) {
    case 'auth.email_taken':
      return 'Un compte existe déjà avec cette adresse.';
    case 'auth.invalid_credentials':
      return 'Un compte existe déjà avec cette adresse, et ce mot de passe ne correspond pas.';
    case 'auth.weak_password':
      // Le serveur détaille ce qu'il refuse (longueur, chiffre, majuscule…) : on le
      // montre tel quel plutôt que de le remplacer par une formule vague.
      return err.payload?.errors?.join(' ') || 'Ce mot de passe est trop faible.';
    case 'auth.locked_out':
      return 'Compte temporairement bloqué après plusieurs tentatives. Réessayez dans quelques minutes.';
    case 'tenant.slug_taken':
      return "Ce nom d'entreprise est déjà utilisé sur la plateforme. Essayez une variante.";
    default:
      return err?.message || 'Une erreur est survenue.';
  }
}
