// Source canonique des emojis par type d'événement.
// Réutilisée partout dans l'app (VitrineProfil, Clients, etc.) pour garantir
// une icône cohérente par type d'événement, quelle que soit la vue.
export const EVENT_EMOJIS = {
  'Mariage': '💍',
  'Pacs': '💑',
  'Anniversaire de mariage': '💎',
  'Baptême': '🕊️',
  'Communion': '🕊️',
  'Anniversaire': '🎂',
  'Gender reveal': '🎀',
  'Baby shower': '🍼',
  "Fête de fin d'année": '🎉',
  "Soirée d'entreprise": '🏢',
  'Séminaire': '📊',
  'Cocktail': '🍸',
  'Gala': '🥂',
  'Location': '🏡',
  'Autre': '🎉',
};

export function getEventEmoji(type) {
  return EVENT_EMOJIS[type] || '🎉';
}