// ─── Constantes centralisées du Catalogue ────────────────────────────────────

export const CATEGORIES_16 = [
  'Apéritif', "Hors d'œuvre", 'Mise en bouche', 'Entrée', 'Plat',
  'Fromage', 'Trou normand', 'Pré-dessert', 'Dessert', 'Mignardises',
  'Pain', 'Atelier', 'Vin', 'Champagne', 'Boisson', 'Autre',
];

export const ALLERGENES_14 = [
  { id: 'gluten', label: 'Gluten' },
  { id: 'crustaces', label: 'Crustacés' },
  { id: 'oeufs', label: 'Oeufs' },
  { id: 'poissons', label: 'Poissons' },
  { id: 'arachides', label: 'Arachides' },
  { id: 'soja', label: 'Soja' },
  { id: 'lait', label: 'Lait' },
  { id: 'fruits_a_coque', label: 'Fruits à coque' },
  { id: 'celeri', label: 'Céleri' },
  { id: 'moutarde', label: 'Moutarde' },
  { id: 'sesame', label: 'Sésame' },
  { id: 'sulfites', label: 'Sulfites' },
  { id: 'lupin', label: 'Lupin' },
  { id: 'mollusques', label: 'Mollusques' },
];

export const ALLERGEN_MAP = {
  'gluten': 'gluten',
  'crustacés': 'crustaces',
  'crustaces': 'crustaces',
  'œufs': 'oeufs',
  'oeufs': 'oeufs',
  'poissons': 'poissons',
  'arachides': 'arachides',
  'soja': 'soja',
  'lait': 'lait',
  'fruits à coque': 'fruits_a_coque',
  'fruits a coque': 'fruits_a_coque',
  'céleri': 'celeri',
  'celeri': 'celeri',
  'moutarde': 'moutarde',
  'graines de sésame': 'sesame',
  'sesame': 'sesame',
  'sésame': 'sesame',
  'anhydride sulfureux': 'sulfites',
  'sulfites': 'sulfites',
  'lupin': 'lupin',
  'mollusques': 'mollusques',
};

export const normalizeAllergen = (n) =>
  ALLERGEN_MAP[(n || '').toLowerCase().trim()] || (n || '').toLowerCase().trim();

// Ordre naturel d'un repas pour trier les catégories a_choisir dans le formulaire
export const ORDRE_CATEGORIES_REPAS = [
  'Apéritif', 'Mise en bouche', 'Atelier ou poste salé',
  'Entrée', 'Poisson', 'Viande', 'Plat',
  'Fromage',
  'Atelier ou poste sucré',
  'Dessert', 'Mignardise', 'Autre',
];