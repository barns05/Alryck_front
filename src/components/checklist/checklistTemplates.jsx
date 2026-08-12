/**
 * Templates de checklist par type d'événement.
 * Retourne un tableau de titres de tâches.
 */

const TEMPLATE_MARIAGE = [
  "Définir le budget global",
  "Choisir la date définitive",
  "Réserver le lieu de réception",
  "Réserver le lieu de cérémonie",
  "Choisir le traiteur",
  "Définir le menu et les boissons",
  "Choisir la robe de mariée",
  "Choisir le costume du marié",
  "Envoyer les save the date",
  "Envoyer les invitations officielles",
  "Réserver le photographe",
  "Réserver le vidéaste",
  "Choisir la musique (DJ ou groupe)",
  "Organiser la décoration florale",
  "Choisir le wedding cake",
  "Prévoir les alliances",
  "Organiser les essayages",
  "Réserver les hébergements invités",
  "Prévoir le transport (mariés et invités)",
  "Choisir les témoins",
  "Préparer les discours",
  "Valider le nombre définitif d'invités",
  "Finaliser le plan de table",
  "Confirmer tous les prestataires",
  "Préparer le planning du jour J",
  "Prévoir un plan B en cas de pluie ou contretemps",
  "Prévoir une trousse de secours",
  "Laisser un avis sur l'organisation",
];

const TEMPLATE_ANNIVERSAIRE = [
  "Définir le budget global",
  "Choisir la date définitive",
  "Réserver le lieu",
  "Envoyer les invitations",
  "Choisir le traiteur ou le gâteau",
  "Organiser la décoration",
  "Prévoir l'animation (DJ, jeux, animateur)",
  "Réserver le photographe",
  "Prévoir les cadeaux invités",
  "Valider le nombre définitif de participants",
  "Prévoir un plan B en cas de pluie ou contretemps",
  "Confirmer les prestataires",
  "Préparer le planning du jour J",
  "Laisser un avis sur l'organisation",
];

const TEMPLATE_PRO = [
  "Définir le budget global",
  "Choisir la date et le lieu",
  "Valider la liste des invités",
  "Envoyer les invitations officielles",
  "Choisir le traiteur et le menu",
  "Réserver les intervenants ou animations",
  "Organiser la scénographie et la décoration",
  "Prévoir les supports de communication (badges, signalétique)",
  "Réserver le photographe / vidéaste",
  "Confirmer les prestataires techniques (son, lumière)",
  "Préparer le déroulé de la soirée",
  "Valider le nombre définitif de participants",
  "Laisser un avis sur l'organisation",
];

const MARIAGE_TYPES = ["Mariage", "Pacs", "Anniversaire de mariage"];
const PRO_TYPES = ["Soirée d'entreprise", "Séminaire", "Gala", "Cocktail"];
const ANNIVERSAIRE_TYPES = ["Anniversaire", "Baptême", "Communion", "Gender reveal", "Baby shower", "Fête de fin d'année", "Location", "Autre"];

export function getTemplateForType(typeEvenement) {
  if (!typeEvenement) return TEMPLATE_ANNIVERSAIRE;
  if (MARIAGE_TYPES.includes(typeEvenement)) return TEMPLATE_MARIAGE;
  if (PRO_TYPES.includes(typeEvenement)) return TEMPLATE_PRO;
  return TEMPLATE_ANNIVERSAIRE;
}