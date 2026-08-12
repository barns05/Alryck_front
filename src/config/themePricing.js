/**
 * Centralisation de la tarification des thèmes ProgrammeJourJ.
 *
 * Source unique de vérité pour le prix des thèmes premium, utilisée par
 * ProgrammePreview (et futurement l'intégration Stripe après migration
 * Vercel/Supabase). Ne pas dupliquer ces valeurs ailleurs.
 */

// Prix unitaire par thème premium (en euros)
export const THEME_PRICE = 4.99;

// Thèmes gratuits : jamais de paiement, toujours disponibles
export const FREE_THEMES = ['navy_cristal', 'clair_cristal'];

// Liste de tous les thèmes premium avec leur identifiant, nom affiché et prix
export const PREMIUM_THEMES = [
  { id: 'elegance', name: 'Élégance', price: THEME_PRICE },
  { id: 'nature', name: 'Nature', price: THEME_PRICE },
  { id: 'sienna', name: 'Sienna', price: THEME_PRICE },
  { id: 'boheme', name: 'Bohème', price: THEME_PRICE },
  { id: 'riviera', name: 'Riviera', price: THEME_PRICE },
  { id: 'nocturne', name: 'Nocturne', price: THEME_PRICE },
  { id: 'rosee', name: 'Rosée', price: THEME_PRICE },
  { id: 'emeraude', name: 'Émeraude', price: THEME_PRICE },
  { id: 'perle', name: 'Perle', price: THEME_PRICE },
  { id: 'dolce_vita', name: 'Dolce Vita', price: THEME_PRICE },
  { id: 'aurore', name: 'Aurore', price: THEME_PRICE },
  { id: 'luna', name: 'Luna', price: THEME_PRICE },
  { id: 'mineral', name: 'Minéral', price: THEME_PRICE },
  { id: 'givre', name: 'Givre', price: THEME_PRICE },
  { id: 'boreal', name: 'Boréal', price: THEME_PRICE },
];

// Helper : vérifier si un thème est premium (tout thème non listé dans FREE_THEMES)
export const isThemePremium = (themeId) => !FREE_THEMES.includes(themeId);

// Helper : récupérer le prix d'un thème (0 si gratuit)
export const getThemePrice = (themeId) => (isThemePremium(themeId) ? THEME_PRICE : 0);