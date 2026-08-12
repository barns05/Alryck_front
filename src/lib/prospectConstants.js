// Constantes partagées pour les formulaires prospect (création + édition)
// Source unique pour éviter la duplication entre ProspectModal et ProspectEditModal.

export const PROSPECT_TYPES = ['Mariage', 'Anniversaire', 'Gala', 'Baptême', 'Pacs', "Soirée d'entreprise", 'Séminaire', 'Cocktail', 'Location', 'Autre'];

export const PROSPECT_SOURCES = ['Bouche à oreille', 'Google', 'Instagram', 'Facebook', 'Salon du mariage', 'Recommandation prestataire', 'Site web', 'Autre'];

export const PROSPECT_STATUTS = ['Nouveau', 'Devis envoyé', 'À relancer', 'Signé', 'Annulé'];

export const PROSPECT_STATUT_DOTS = { 'Nouveau': '⚪', 'Devis envoyé': '🔵', 'À relancer': '🟠', 'Signé': '🟢', 'Annulé': '🔴' };

export function genProspectToken() {
  return Math.random().toString(36).slice(2, 12) + Date.now().toString(36);
}