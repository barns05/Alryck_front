/**
 * Templates de base et bibliothèque de suggestions pour le Programme du Jour J.
 */

// ── Templates par type d'événement ─────────────────────────────────────────────
export const TEMPLATES = {
  mariage: [
    { nom: 'Point de rendez-vous' },
    { nom: 'Cérémonie' },
    { nom: 'Cocktail' },
    { nom: 'Repas' },
    { nom: 'Soirée dansante' },
  ],
  bapteme: [
    { nom: 'Accueil des invités' },
    { nom: 'Cérémonie' },
    { nom: 'Apéritif cocktail' },
    { nom: 'Repas' },
    { nom: 'Gâteau & bougies' },
    { nom: 'Animation' },
    { nom: 'Fin de soirée' },
  ],
  anniversaire: [
    { nom: 'Accueil des invités' },
    { nom: 'Apéritif cocktail' },
    { nom: 'Repas' },
    { nom: 'Gâteau & bougies' },
    { nom: 'Animation' },
    { nom: 'Fin de soirée' },
  ],
  professionnel: [
    { nom: 'Accueil des invités' },
    { nom: 'Cocktail de bienvenue' },
    { nom: "Discours d'ouverture" },
    { nom: 'Dîner' },
    { nom: 'Intervention / animation' },
    { nom: 'Networking' },
    { nom: 'Fin de soirée' },
  ],
};

// ── Mapping type_evenement → template ─────────────────────────────────────────
const TYPE_MAP = {
  'Mariage': 'mariage',
  'Pacs': 'mariage',
  'Anniversaire de mariage': 'mariage',
  'Baptême': 'bapteme',
  'Communion': 'bapteme',
  'Anniversaire': 'anniversaire',
  'Gender reveal': 'anniversaire',
  'Baby shower': 'anniversaire',
  "Soirée d'entreprise": 'professionnel',
  'Séminaire': 'professionnel',
  'Gala': 'professionnel',
  'Cocktail': 'professionnel',
  "Fête de fin d'année": 'professionnel',
};

export function getTemplateForType(typeEvenement) {
  return TEMPLATES[TYPE_MAP[typeEvenement] || 'mariage'];
}

// ── Bibliothèque de suggestions organisée par catégorie ────────────────────────
export const BIBLIOTHEQUE = [
  {
    categorie: 'Mariage — Cérémonies',
    icon: '💍',
    suggestions: [
      { nom: 'Cérémonie civile (mairie)' },
      { nom: 'Cérémonie religieuse' },
      { nom: 'Cérémonie laïque' },
    ],
  },
  {
    categorie: 'Mariage — Photos',
    icon: '📸',
    suggestions: [
      { nom: 'Séance photo de couple' },
      { nom: 'Photos de groupe' },
    ],
  },
  {
    categorie: 'Mariage — Réception',
    icon: '🥂',
    suggestions: [
      { nom: "Vin d'honneur" },
      { nom: 'Apéritif dinatoire' },
      { nom: 'Cocktail' },
      { nom: 'Buffet' },
      { nom: 'Dîner assis' },
      { nom: 'Pièce montée / découpe du gâteau' },
    ],
  },
  {
    categorie: 'Mariage — Soirée',
    icon: '💃',
    suggestions: [
      { nom: 'Ouverture de bal' },
      { nom: 'Soirée dansante' },
      { nom: 'Lancé de bouquet' },
      { nom: "Livre d'or" },
      { nom: 'Champagne' },
      { nom: "Feu d'artifice" },
      { nom: 'Coin enfants' },
      { nom: 'Animation surprise' },
    ],
  },
  {
    categorie: 'Pratique — Toutes catégories',
    icon: 'ℹ️',
    suggestions: [
      { nom: 'Informations hébergement' },
      { nom: 'Navette transport' },
      { nom: 'Parking conseillé' },
      { nom: 'Point de dépose VTC' },
      { nom: 'Plan B météo' },
    ],
  },
  {
    categorie: 'Professionnel',
    icon: '👔',
    suggestions: [
      { nom: 'Pause café' },
      { nom: 'Networking' },
      { nom: 'Conférence' },
      { nom: 'Remise de prix' },
      { nom: 'Cocktail de clôture' },
    ],
  },
];