/**
 * Libellé lisible du statut d'une PropositionDateEvenement selon son initiateur.
 * Utilisé côté admin (PropositionDateRecap) et côté prestataire (PropositionsDateSection).
 */
export function statutPropositionLabel(prop) {
  if (!prop) return '';
  if (prop.initiee_par === 'prestataire') {
    return 'En attente de confirmation côté client/organisateur';
  }
  if (prop.initiee_par === 'client') {
    return 'En attente de confirmation des prestataires';
  }
  // 'admin' (par défaut)
  return 'En attente de réponse des prestataires';
}