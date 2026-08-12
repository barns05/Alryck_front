/**
 * metierConfig.js — Source de vérité centralisée pour la taxonomie des métiers.
 *
 * Indexé par les 40 valeurs exactes de l'enum CompanySettings.metier.
 * Consulté par tous les modules (Ma Vitrine, fiche découverte, futur annuaire)
 * au lieu de dupliquer la logique conditionnelle dans chaque composant.
 *
 * Champs par métier :
 *  - groupe            : regroupement d'affichage (ex: "Lieux et réception")
 *  - icone_defaut      : emoji principal (premier de ICONES_PAR_METIER historique)
 *  - domaine_prestataire : mapping vers Prestataire.domaine (11 valeurs existantes
 *                        + 4 nouvelles valeurs introduites ici pour couvrir les 40 métiers)
 *  - appellation_defaut : terme commercial fallback (ex: "Nos forfaits")
 *  - champs_specifiques : clés de champs CompanySettings pertinents pour ce métier
 *
 * NOTE — Nouvelles valeurs de domaine_prestataire introduites (à ajouter à l'enum
 * Prestataire.domaine lors de l'étape 2 de refactorisation) :
 *   "Lieu de réception", "Organisation", "Beauté & Bien-être", "Logistique"
 */

export const METIER_CONFIG = {
  // ─── Lieux et réception (14) ──────────────────────────────────────────────
  'Salle de réception': {
    groupe: 'Lieux et réception',
    icone_defaut: '🏛️',
    domaine_prestataire: 'Lieu de réception',
    appellation_defaut: 'Nos espaces',
    champs_specifiques: ['type_lieu', 'hebergement', 'capacite_min', 'capacite_max'],
  },
  'Lieu de prestige / Château': {
    groupe: 'Lieux et réception',
    icone_defaut: '🏰',
    domaine_prestataire: 'Lieu de réception',
    appellation_defaut: 'Nos espaces',
    champs_specifiques: ['type_lieu', 'hebergement', 'capacite_min', 'capacite_max'],
  },
  'Domaine viticole / Château viticole': {
    groupe: 'Lieux et réception',
    icone_defaut: '🍇',
    domaine_prestataire: 'Lieu de réception',
    appellation_defaut: 'Nos espaces',
    champs_specifiques: ['type_lieu', 'hebergement', 'capacite_min', 'capacite_max'],
  },
  'Domaine privé': {
    groupe: 'Lieux et réception',
    icone_defaut: '🌿',
    domaine_prestataire: 'Lieu de réception',
    appellation_defaut: 'Nos espaces',
    champs_specifiques: ['type_lieu', 'hebergement', 'capacite_min', 'capacite_max'],
  },
  'Mas / Bastide': {
    groupe: 'Lieux et réception',
    icone_defaut: '🏡',
    domaine_prestataire: 'Lieu de réception',
    appellation_defaut: 'Nos espaces',
    champs_specifiques: ['type_lieu', 'hebergement', 'capacite_min', 'capacite_max'],
  },
  'Villa privatisable': {
    groupe: 'Lieux et réception',
    icone_defaut: '✨',
    domaine_prestataire: 'Lieu de réception',
    appellation_defaut: 'Nos espaces',
    champs_specifiques: ['type_lieu', 'hebergement', 'capacite_min', 'capacite_max'],
  },
  'Espace plein air / Jardin': {
    groupe: 'Lieux et réception',
    icone_defaut: '🌳',
    domaine_prestataire: 'Lieu de réception',
    appellation_defaut: 'Nos espaces',
    champs_specifiques: ['type_lieu', 'hebergement', 'capacite_min', 'capacite_max'],
  },
  'Salle de spectacle': {
    groupe: 'Lieux et réception',
    icone_defaut: '🎭',
    domaine_prestataire: 'Lieu de réception',
    appellation_defaut: 'Nos espaces',
    champs_specifiques: ['type_lieu', 'hebergement', 'capacite_min', 'capacite_max'],
  },
  'Salon événementiel': {
    groupe: 'Lieux et réception',
    icone_defaut: '🌟',
    domaine_prestataire: 'Lieu de réception',
    appellation_defaut: 'Nos espaces',
    champs_specifiques: ['type_lieu', 'hebergement', 'capacite_min', 'capacite_max'],
  },
  'Restaurant privatisable': {
    groupe: 'Lieux et réception',
    icone_defaut: '🍽️',
    domaine_prestataire: 'Lieu de réception',
    appellation_defaut: 'Nos espaces',
    champs_specifiques: ['type_lieu', 'hebergement', 'capacite_min', 'capacite_max'],
  },
  'Espace atypique': {
    groupe: 'Lieux et réception',
    icone_defaut: '✨',
    domaine_prestataire: 'Lieu de réception',
    appellation_defaut: 'Nos espaces',
    champs_specifiques: ['type_lieu', 'hebergement', 'capacite_min', 'capacite_max'],
  },
  'Péniche / Bateau': {
    groupe: 'Lieux et réception',
    icone_defaut: '🛥️',
    domaine_prestataire: 'Lieu de réception',
    appellation_defaut: 'Nos espaces',
    champs_specifiques: ['type_lieu', 'hebergement', 'capacite_min', 'capacite_max'],
  },
  'Rooftop': {
    groupe: 'Lieux et réception',
    icone_defaut: '🌇',
    domaine_prestataire: 'Lieu de réception',
    appellation_defaut: 'Nos espaces',
    champs_specifiques: ['type_lieu', 'hebergement', 'capacite_min', 'capacite_max'],
  },
  "Musée / Galerie d'art": {
    groupe: 'Lieux et réception',
    icone_defaut: '🖼️',
    domaine_prestataire: 'Lieu de réception',
    appellation_defaut: 'Nos espaces',
    champs_specifiques: ['type_lieu', 'hebergement', 'capacite_min', 'capacite_max'],
  },

  // ─── Restauration et traiteur (5) ─────────────────────────────────────────
  'Traiteur événementiel': {
    groupe: 'Restauration et traiteur',
    icone_defaut: '🍽️',
    domaine_prestataire: 'Traiteur',
    appellation_defaut: 'Nos menus',
    champs_specifiques: ['type_lieu', 'hebergement', 'capacite_min', 'capacite_max'],
  },
  'Chef à domicile': {
    groupe: 'Restauration et traiteur',
    icone_defaut: '👨‍🍳',
    domaine_prestataire: 'Traiteur',
    appellation_defaut: 'Nos menus',
    champs_specifiques: ['type_lieu', 'hebergement', 'capacite_min', 'capacite_max'],
  },
  'Pâtissier / Wedding cake': {
    groupe: 'Restauration et traiteur',
    icone_defaut: '🎂',
    domaine_prestataire: 'Traiteur',
    appellation_defaut: 'Nos menus',
    champs_specifiques: ['type_lieu', 'hebergement', 'capacite_min', 'capacite_max'],
  },
  'Candy bar / Sweet table': {
    groupe: 'Restauration et traiteur',
    icone_defaut: '🍭',
    domaine_prestataire: 'Traiteur',
    appellation_defaut: 'Nos menus',
    champs_specifiques: ['type_lieu', 'hebergement', 'capacite_min', 'capacite_max'],
  },
  'Food truck événementiel': {
    groupe: 'Restauration et traiteur',
    icone_defaut: '🚚',
    domaine_prestataire: 'Traiteur',
    appellation_defaut: 'Nos menus',
    champs_specifiques: ['type_lieu', 'hebergement', 'capacite_min', 'capacite_max'],
  },

  // ─── Image et souvenir (3) ─────────────────────────────────────────────────
  'Photographe': {
    groupe: 'Image et souvenir',
    icone_defaut: '📷',
    domaine_prestataire: 'Photographe',
    appellation_defaut: 'Nos forfaits',
    champs_specifiques: ['nb_photos_livrees', 'delai_livraison', 'video_incluse'],
  },
  'Vidéaste': {
    groupe: 'Image et souvenir',
    icone_defaut: '🎬',
    domaine_prestataire: 'Vidéaste',
    appellation_defaut: 'Nos forfaits',
    champs_specifiques: ['nb_photos_livrees', 'delai_livraison', 'video_incluse'],
  },
  'Photobooth': {
    groupe: 'Image et souvenir',
    icone_defaut: '📸',
    domaine_prestataire: 'Animation',
    appellation_defaut: 'Nos forfaits',
    champs_specifiques: ['nb_photos_livrees', 'delai_livraison', 'video_incluse'],
  },

  // ─── Musique et animation (5) ──────────────────────────────────────────────
  'DJ': {
    groupe: 'Musique et animation',
    icone_defaut: '🎧',
    domaine_prestataire: 'DJ / Musique',
    appellation_defaut: 'Nos prestations',
    champs_specifiques: ['type_musique', 'materiel_inclus'],
  },
  'Musicien / Groupe': {
    groupe: 'Musique et animation',
    icone_defaut: '🎵',
    domaine_prestataire: 'DJ / Musique',
    appellation_defaut: 'Nos prestations',
    champs_specifiques: ['type_musique', 'materiel_inclus'],
  },
  'Animateur': {
    groupe: 'Musique et animation',
    icone_defaut: '🎤',
    domaine_prestataire: 'Animation',
    appellation_defaut: 'Nos prestations',
    champs_specifiques: ['type_musique', 'materiel_inclus'],
  },
  'Magicien / Artiste': {
    groupe: 'Musique et animation',
    icone_defaut: '🎩',
    domaine_prestataire: 'Animation',
    appellation_defaut: 'Nos prestations',
    champs_specifiques: ['type_musique', 'materiel_inclus'],
  },
  'Sonorisation / Éclairage': {
    groupe: 'Musique et animation',
    icone_defaut: '💡',
    domaine_prestataire: 'Sono / Lumières',
    appellation_defaut: 'Nos prestations',
    champs_specifiques: ['type_musique', 'materiel_inclus'],
  },

  // ─── Organisation (3) ─────────────────────────────────────────────────────
  'Wedding Planner': {
    groupe: 'Organisation',
    icone_defaut: '💍',
    domaine_prestataire: 'Organisation',
    appellation_defaut: 'Nos services',
    champs_specifiques: [],
  },
  'Chef de projet événementiel': {
    groupe: 'Organisation',
    icone_defaut: '📋',
    domaine_prestataire: 'Organisation',
    appellation_defaut: 'Nos services',
    champs_specifiques: [],
  },
  'Maître de cérémonie': {
    groupe: 'Organisation',
    icone_defaut: '🎙️',
    domaine_prestataire: 'Organisation',
    appellation_defaut: 'Nos services',
    champs_specifiques: [],
  },

  // ─── Décoration et floral (3) ──────────────────────────────────────────────
  'Fleuriste': {
    groupe: 'Décoration et floral',
    icone_defaut: '🌸',
    domaine_prestataire: 'Fleuriste',
    appellation_defaut: 'Nos prestations',
    champs_specifiques: ['style_floral', 'prestations_florales'],
  },
  'Décorateur': {
    groupe: 'Décoration et floral',
    icone_defaut: '🎨',
    domaine_prestataire: 'Décoration',
    appellation_defaut: 'Nos prestations',
    champs_specifiques: ['style_floral', 'prestations_florales'],
  },
  'Scénographe': {
    groupe: 'Décoration et floral',
    icone_defaut: '🎨',
    domaine_prestataire: 'Décoration',
    appellation_defaut: 'Nos prestations',
    champs_specifiques: ['style_floral', 'prestations_florales'],
  },

  // ─── Beauté et bien-être (2) ───────────────────────────────────────────────
  'Coiffeur / Maquilleur': {
    groupe: 'Beauté et bien-être',
    icone_defaut: '💄',
    domaine_prestataire: 'Beauté & Bien-être',
    appellation_defaut: 'Nos prestations',
    champs_specifiques: [],
  },
  'Spa événementiel': {
    groupe: 'Beauté et bien-être',
    icone_defaut: '💆',
    domaine_prestataire: 'Beauté & Bien-être',
    appellation_defaut: 'Nos prestations',
    champs_specifiques: [],
  },

  // ─── Transport de prestige (3) ─────────────────────────────────────────────
  'Limousine / VTC prestige': {
    groupe: 'Transport de prestige',
    icone_defaut: '🚗',
    domaine_prestataire: 'Transport',
    appellation_defaut: 'Nos prestations',
    champs_specifiques: [],
  },
  'Hélicoptère événementiel': {
    groupe: 'Transport de prestige',
    icone_defaut: '🚁',
    domaine_prestataire: 'Transport',
    appellation_defaut: 'Nos prestations',
    champs_specifiques: [],
  },
  'Voiture de luxe / collection': {
    groupe: 'Transport de prestige',
    icone_defaut: '🚙',
    domaine_prestataire: 'Transport',
    appellation_defaut: 'Nos prestations',
    champs_specifiques: [],
  },

  // ─── Logistique et technique (1) ───────────────────────────────────────────
  'Location de matériel': {
    groupe: 'Logistique et technique',
    icone_defaut: '📦',
    domaine_prestataire: 'Logistique',
    appellation_defaut: 'Nos locations',
    champs_specifiques: [],
  },

  // ─── Sécurité événementielle (1) ───────────────────────────────────────────
  'Sécurité événementielle': {
    groupe: 'Sécurité événementielle',
    icone_defaut: '🛡️',
    domaine_prestataire: 'Sécurité',
    appellation_defaut: 'Nos prestations',
    champs_specifiques: [],
  },

  // ─── Autre (1) ─────────────────────────────────────────────────────────────
  'Autre prestataire': {
    groupe: 'Autre',
    icone_defaut: '⭐',
    domaine_prestataire: 'Autre',
    appellation_defaut: 'Nos prestations',
    champs_specifiques: [],
  },
};

// ─── Fallback générique ──────────────────────────────────────────────────────
const METIER_FALLBACK = {
  groupe: 'Autre',
  icone_defaut: '⭐',
  domaine_prestataire: 'Autre',
  appellation_defaut: 'Nos prestations',
  champs_specifiques: [],
};

// ─── Helpers ──────────────────────────────────────────────────────────────────

/**
 * Retourne la config complète d'un métier, ou un fallback générique si le métier
 * n'est pas trouvé dans METIER_CONFIG.
 * @param {string} metier — valeur exacte de CompanySettings.metier
 * @returns {Object} { groupe, icone_defaut, domaine_prestataire, appellation_defaut, champs_specifiques }
 */
export function getMetierConfig(metier) {
  return METIER_CONFIG[metier] || METIER_FALLBACK;
}

/**
 * Retourne le domaine Prestataire correspondant à un métier.
 * @param {string} metier
 * @returns {string} valeur de Prestataire.domaine (ou 'Autre' par défaut)
 */
export function getDomaineFromMetier(metier) {
  return getMetierConfig(metier).domaine_prestataire;
}

/**
 * Retourne la liste des clés de champs CompanySettings spécifiques au métier.
 * @param {string} metier
 * @returns {string[]} clés de champs (ex: ['nb_photos_livrees', 'delai_livraison', 'video_incluse'])
 */
export function getChampsSpecifiques(metier) {
  return getMetierConfig(metier).champs_specifiques;
}

/**
 * Liste ordonnée des groupes de métiers (pour affichage de sélecteurs groupés).
 * @returns {string[]}
 */
export function getGroupesMetiers() {
  const seen = new Set();
  const groupes = [];
  for (const cfg of Object.values(METIER_CONFIG)) {
    if (!seen.has(cfg.groupe)) {
      seen.add(cfg.groupe);
      groupes.push(cfg.groupe);
    }
  }
  return groupes;
}

/**
 * Liste des métiers d'un groupe donné.
 * @param {string} groupe
 * @returns {string[]}
 */
export function getMetiersByGroupe(groupe) {
  return Object.entries(METIER_CONFIG)
    .filter(([, cfg]) => cfg.groupe === groupe)
    .map(([metier]) => metier);
}

// ─── Suggestions d'emojis par métier (pour le sélecteur d'icône commerciale) ─
export const EMOJIS_SUGGESTIONS_PAR_METIER = {
  'Salle de réception': ['🏛️','✨','🌟','🥂','🎊'],
  'Lieu de prestige / Château': ['🏰','✨','🌟','🥂','🍾'],
  'Domaine viticole / Château viticole': ['🍇','🌿','🍾','🥂','✨'],
  'Domaine privé': ['🌿','🏡','✨','🌳','🍃'],
  'Mas / Bastide': ['🏡','🌿','☀️','🌸','✨'],
  'Villa privatisable': ['✨','🌟','🏡','🥂','🌊'],
  'Espace plein air / Jardin': ['🌳','🌿','🌸','☀️','🍃'],
  'Salle de spectacle': ['🎭','✨','🌟','🎊','🎬'],
  'Salon événementiel': ['🌟','✨','🥂','🎊','🏛️'],
  'Restaurant privatisable': ['🍽️','🥂','✨','🌟','🏊'],
  'Espace atypique': ['✨','🌟','🎨','🎭','🚀'],
  'Péniche / Bateau': ['🛥️','⛵','🌊','✨','🌅'],
  'Rooftop': ['🌇','✨','🥂','🌆','🌃'],
  "Musée / Galerie d'art": ['🖼️','🏛️','🎨','✨','🌟'],
  'Traiteur événementiel': ['🍽️','🔔','🥂','🍾','👨‍🍳'],
  'Chef à domicile': ['👨‍🍳','🍽️','🔪','🥗','✨'],
  'Pâtissier / Wedding cake': ['🎂','🍰','🧁','🔔','✨'],
  'Candy bar / Sweet table': ['🍭','🍬','🎂','✨','🌈'],
  'Food truck événementiel': ['🚚','🍔','🌮','🍕','✨'],
  'Photographe': ['📷','📸','🎬','🎥','🖼️'],
  'Vidéaste': ['🎬','🎥','📹','📸','🎞️'],
  'Photobooth': ['📸','🤳','🎠','✨','🎭'],
  'DJ': ['🎧','🎵','🎼','🎹','🎸'],
  'Musicien / Groupe': ['🎵','🎼','🎹','🎸','🎻'],
  'Animateur': ['🎤','🎊','🎭','✨','🎉'],
  'Magicien / Artiste': ['🎩','✨','🌟','🎭','🃏'],
  'Sonorisation / Éclairage': ['💡','🔊','🎛️','✨','🌟'],
  'Wedding Planner': ['💍','💐','🤍','✨','🎊'],
  'Chef de projet événementiel': ['📋','🎊','✨','🤝','🌟'],
  'Maître de cérémonie': ['🎙️','✨','🤍','🎊','💐'],
  'Fleuriste': ['🌸','🌺','🌿','🪷','💐'],
  'Décorateur': ['🎨','✨','🌿','🖼️','🌸'],
  'Scénographe': ['🎨','🖼️','✨','🎭','🌟'],
  'Coiffeur / Maquilleur': ['💄','💅','✂️','✨','💋'],
  'Spa événementiel': ['💆','✨','🌿','🕯️','🌸'],
  'Limousine / VTC prestige': ['🚗','🎩','⭐','✨','🌟'],
  'Hélicoptère événementiel': ['🚁','✨','⭐','🌟','🎊'],
  'Voiture de luxe / collection': ['🚙','⭐','✨','🌟','🏁'],
  'Location de matériel': ['📦','🔧','💡','🛠️','✨'],
  'Sécurité événementielle': ['🛡️','🔒','✅','💪','🌟'],
  'Autre prestataire': ['⭐','🎉','🎊','✨','💫','🌟','🎈','🎁','🏆','🤝','💼','🎯'],
};

/**
 * Retourne la liste d'emojis suggérés pour un métier (sélecteur d'icône commerciale).
 * @param {string} metier
 * @returns {string[]} emojis suggérés
 */
export function getEmojisSuggestions(metier) {
  return EMOJIS_SUGGESTIONS_PAR_METIER[metier] || EMOJIS_SUGGESTIONS_PAR_METIER['Autre prestataire'] || [getMetierConfig(metier).icone_defaut];
}

// ─── Bibliothèque de Points forts (par groupe métier) ─────────────────────────
// Organisée en catégories pour la SÉLECTION ADMIN uniquement. Côté fiche découverte,
// les points forts sélectionnés s'affichent en une liste plate sans regroupement.
// Les items prédéfinis cochés vont dans style_tags ; les items personnalisés saisis
// librement vont dans points_forts_personnalises (séparés pour ne pas polluer la
// bibliothèque commune).
export const POINTS_FORTS_CATEGORIES = {
  'Lieux et réception': [
    {
      titre: 'Type de bâtisse',
      items: ['Château', 'Manoir', 'Abbaye', 'Domaine viticole', 'Bastide / Mas', 'Corps de ferme', 'Longère', 'Grange rénovée', 'Maison de maître', 'Bâtisse industrielle rénovée', 'Loft / espace atypique', 'Chalet'],
    },
    {
      titre: 'Accès & situation',
      items: ['Proche autoroute', 'Proche gare', 'Proche aéroport', 'Centre-ville'],
    },
    {
      titre: 'Cadre & extérieurs',
      items: ['Parc arboré', 'Jardin paysager', 'Vue mer', 'Vue panoramique', 'Vignoble', 'Piscine', 'Terrasse couverte', 'Oliveraie'],
    },
    {
      titre: 'Éléments de caractère',
      items: ['Pierre apparente', 'Poutres apparentes', 'Cheminée', 'Fontaine', 'Verrière', 'Cour intérieure', 'Patio', 'Kiosque / Pergola', 'Étang / Pièce d\'eau', 'Monument historique classé/inscrit', 'Voûtes / caves voûtées', 'Charpente d\'époque'],
    },
    {
      titre: 'Ambiance',
      items: ['Romantique', 'Champêtre', 'Élégant / Chic', 'Provençal', 'Contemporain', 'Rustique / Authentique', 'Épuré / Minimaliste', 'Industriel chic'],
    },
  ],

  'Restauration et traiteur': [
    {
      titre: 'Type de cuisine',
      items: ['Provençale / Méditerranéenne', 'Gastronomique', 'Fusion / Créative', 'Végétarien / Vegan', 'Traditionnelle française', 'Orientale / Maghrébine', 'Indienne', 'Asiatique', 'Italienne', 'Libanaise', 'Antillaise / Créole', 'Casher', 'Halal'],
    },
    {
      titre: 'Spécialités service',
      items: ['Buffet', 'Service à l\'assiette', 'Cocktail dînatoire', 'Food trucks', 'Wedding cake inclus'],
    },
    {
      titre: 'Services inclus',
      items: ['Dégustation avant l\'événement', 'Service en salle', 'Vaisselle et nappage inclus', 'Personnel de service inclus'],
    },
    {
      titre: 'Ambiance',
      items: ['Gastronomique / Raffiné', 'Convivial / Familial', 'Healthy / Léger', 'Traditionnel'],
    },
  ],

  'Image et souvenir': [
    {
      titre: 'Style',
      items: ['Reportage naturel', 'Posé / Classique', 'Artistique', 'Documentaire', 'Cinématographique', 'Argentique / Pellicule'],
    },
    {
      titre: 'Spécialités techniques',
      items: ['Prise de vue aérienne (drone)', 'Vidéo highlights', 'Time-lapse', 'Diaporama musical le jour J', 'Live streaming', 'Album premium relié main'],
    },
    {
      titre: 'Services inclus',
      items: ['Essai coiffure/maquillage photographié', 'Séance couple avant mariage (engagement)', 'Livraison rapide (aperçu <48h)', 'Deuxième jour couvert (lendemain de noce)'],
    },
    {
      titre: 'Ambiance',
      items: ['Discret / Non-intrusif', 'Dynamique / Créatif', 'Chaleureux', 'Haut de gamme'],
    },
  ],

  'Musique et animation': [
    {
      titre: 'Répertoire',
      items: ['Généraliste tous styles', 'Spécialiste musique française', 'Spécialiste musique internationale', 'Live (groupe/musicien)', 'Mix DJ uniquement', 'Répertoire personnalisable sur demande'],
    },
    {
      titre: 'Prestations',
      items: ['Animation micro / Maître de cérémonie', 'Karaoké', 'Jeux et animations invités', 'Mix cocktail + soirée', 'Ouverture de bal', 'Set acoustique cérémonie', 'Mise en ambiance progressive'],
    },
    {
      titre: 'Matériel & technique',
      items: ['Éclairage scénique', 'Effets spéciaux (confettis, CO2)', 'Sonorisation extérieure adaptée', 'Régie technique complète'],
    },
    {
      titre: 'Ambiance',
      items: ['Festif / Dynamique', 'Élégant / Feutré', 'Familial', 'Clubbing / Électro'],
    },
  ],

  'Décoration et floral': [
    {
      titre: 'Style floral',
      items: ['Champêtre / Sauvage', 'Romantique / Classique', 'Minimaliste / Épuré', 'Coloré / Exotique', 'Monochrome', 'Bohème'],
    },
    {
      titre: 'Spécialités',
      items: ['Compositions suspendues', 'Arches et structures florales', 'Fleurs de saison / locales', 'Fleurs éco-responsables', 'Décoration de voiture', 'Décoration d\'extérieur (jardin, piscine)'],
    },
    {
      titre: 'Services inclus',
      items: ['Livraison et installation incluses', 'Reprise du matériel le lendemain', 'Essai de composition avant le jour J', 'Conseil déco complet (thème, palette)'],
    },
    {
      titre: 'Ambiance',
      items: ['Élégant / Chic', 'Naturel / Végétal', 'Festif / Coloré', 'Épuré / Contemporain'],
    },
  ],

  'Beauté et bien-être': [
    {
      titre: 'Style',
      items: ['Naturel / Glamour', 'Bohème', 'Classique / Intemporel', 'Artistique / Créatif', 'Longue tenue (waterproof)'],
    },
    {
      titre: 'Spécialités',
      items: ['Essai inclus', 'Déplacement à domicile', 'Peaux sensibles / bio', 'Extensions / postiches', 'Spa duo (mariés)'],
    },
    {
      titre: 'Services inclus',
      items: ['Retouche pendant l\'événement', 'Kit de retouche offert', 'Prestation témoins/famille'],
    },
    {
      titre: 'Ambiance',
      items: ['Détente / Relaxant', 'Chic / Glamour', 'Convivial'],
    },
  ],

  'Sécurité événementielle': [
    {
      titre: 'Services',
      items: ['Sécurité entrée/sortie', 'Gestion parking / voituriers', 'Surveillance discrète', 'Gestion de foule'],
    },
    {
      titre: 'Spécialités',
      items: ['Sécurité rapprochée (VIP)', 'Multi-langues'],
    },
    {
      titre: 'Ambiance',
      items: ['Discret / Professionnel', 'Rassurant / Fiable', 'Haut de gamme'],
    },
  ],

  'Transport de prestige': [
    {
      titre: 'Services',
      items: ['Vol photo/vidéo aérien', 'Transport mariés (arrivée spectaculaire)', 'Navette invités', 'Flotte de véhicules / cortège'],
    },
    {
      titre: 'Spécialités',
      items: ['Vol longue distance', 'Vol nocturne équipé', 'Véhicule de collection'],
    },
    {
      titre: 'Ambiance',
      items: ['Spectaculaire / Inoubliable', 'Luxe / Prestige', 'Discret / Professionnel'],
    },
  ],

  'Organisation': [
    {
      titre: 'Style',
      items: ['Traditionnel', 'Moderne / Tendance', 'Sur-mesure', 'Minimaliste'],
    },
    {
      titre: 'Spécialités',
      items: ['Mariage destination', 'Multiculturel / Mixte', 'Petit budget', 'Grand format (500+ invités)', 'Elopement / Micro-wedding'],
    },
    {
      titre: 'Services inclus',
      items: ['Coordination jour J uniquement', 'Accompagnement complet de A à Z', 'Book de prestataires partenaires', 'Visite de repérage incluse'],
    },
    {
      titre: 'Ambiance',
      items: ['Rassurant / Organisé', 'Créatif', 'Discret / Professionnel'],
    },
  ],

  'Logistique et technique': [
    {
      titre: 'Services',
      items: ['Livraison et installation incluses', 'Reprise le lendemain', 'Montage/démontage complet', 'Location courte/longue durée'],
    },
    {
      titre: 'Spécialités',
      items: ['Grand volume (gros événements)', 'Matériel haut de gamme / design', 'Matériel écoresponsable'],
    },
    {
      titre: 'Ambiance',
      items: ['Fiable / Professionnel', 'Flexible', 'Rapide'],
    },
  ],
};

/**
 * Retourne les catégories de points forts prédéfinis pour un groupe métier.
 * @param {string} groupe — groupe métier (ex: 'Lieux et réception')
 * @returns {Array<{titre: string, items: string[]}>} catégories, ou [] si aucune bibliothèque définie
 */
export function getPointsFortsCategories(groupe) {
  return POINTS_FORTS_CATEGORIES[groupe] || [];
}

// ─── Équipements disponibles (groupe Lieux et réception + Restauration et traiteur) ──
export const EQUIPEMENTS_DISPONIBLES = [
  'Climatisation',
  'Chauffage',
  'Accès PMR',
  'Espace enfants',
  'Table à langer',
  'Espace de jeux enfants',
  'Jouets à disposition',
  'Défibrillateur',
  'Parking sur place',
  'Espace extérieur',
  'Piscine',
  'Cuisine professionnelle',
  'Hébergement sur place',
  'Prises extérieures',
  'Wifi',
  'Tente / Chapiteau',
  'Sanitaires',
  'Tables',
  'Chaises',
  'Sonorisation',
  'Vaisselle',
  'Verrerie',
  'Couverts',
  'Linge de table',
];

const GROUPES_AVEC_EQUIPEMENTS = ['Lieux et réception', 'Restauration et traiteur'];

/**
 * Indique si le métier appartient au groupe Lieux/Traiteurs (équipements + accueil).
 * @param {string} metier
 * @returns {boolean}
 */
export function metierAAccueilEtEquipements(metier) {
  return GROUPES_AVEC_EQUIPEMENTS.includes(getMetierConfig(metier).groupe);
}

// Groupes métiers « mobiles » pour lesquels le champ Déplacement a du sens
// (le prestataire se déplace chez le client). Masqué pour les groupes à lieu
// fixe (Lieux et réception) ou sans notion de déplacement pertinente
// (Sécurité événementielle, Logistique et technique).
const GROUPES_MOBILE_AVEC_DEPLACEMENT = [
  'Image et souvenir',
  'Musique et animation',
  'Décoration et floral',
  'Beauté et bien-être',
  'Transport de prestige',
  'Organisation',
  'Restauration et traiteur',
];

/**
 * Indique si le métier est mobile (champ Déplacement pertinent sur la fiche).
 * @param {string} metier
 * @returns {boolean}
 */
export function metierAutoriseDeplacement(metier) {
  return GROUPES_MOBILE_AVEC_DEPLACEMENT.includes(getMetierConfig(metier).groupe);
}

// Équipements par groupe métier. Lieux/Traiteurs partagent la bibliothèque
// historique (EQUIPEMENTS_DISPONIBLES) ; Image et souvenir dispose de sa propre
// liste (matériel photo/vidéo). Les groupes non listés retombent sur la liste
// historique par sécurité.
const EQUIPEMENTS_PAR_GROUPE = {
  'Lieux et réception': EQUIPEMENTS_DISPONIBLES,
  'Restauration et traiteur': EQUIPEMENTS_DISPONIBLES,
  'Image et souvenir': [
    'Drone',
    '2e photographe/vidéaste',
    'Studio photo',
    'Éclairage professionnel',
    'Photobooth',
    'Impression sur place',
    'Album photo inclus',
    'Retouche professionnelle',
    'Vidéo drone',
    'Micro-cravate / Son',
  ],
  'Musique et animation': [
    'Sonorisation pro',
    'Éclairage / Jeux lumière',
    'Machine à fumée légère',
    'Fumée lourde (piste)',
    'Show laser',
    'Micro sans fil',
    'Platines / Mixage',
    'Écran / Vidéoprojecteur',
    'Photobooth',
    'Groupe électrogène secours',
  ],
  'Décoration et floral': [
    'Fleurs fraîches',
    'Fleurs séchées',
    'Arche florale',
    'Centres de table',
    'Bouquet de mariée',
    'Boutonnières',
    'Décoration de chaises',
    'Linge de table',
    'Vaisselle décorative',
    'Éclairage décoratif',
    'Location de mobilier',
  ],
  'Beauté et bien-être': [
    'Kit maquillage',
    'Fer à boucler/lisseur',
    'Coiffeuse mobile',
    'Éclairage maquillage',
    'Produits bio',
    'Table de massage',
    'Soins haut de gamme',
  ],
  'Sécurité événementielle': [
    'Talkie-walkie',
    'Barrières de sécurité',
    'Contrôle d\'accès',
    'Gilet identifiable',
  ],
  'Transport de prestige': [
    'Hélicoptère',
    'Limousine prestige',
    'Voiture de collection',
    'Chauffeur pro',
    'Assurance passagers',
    'Aire d\'atterrissage',
    'Casque communication',
  ],
  'Organisation': [
    'Kit d\'urgence',
    'Signalétique jour J',
    'Talkies-walkies',
    'Mallette de coordination',
  ],
  'Logistique et technique': [
    'Tentes / Chapiteaux',
    'Mobilier',
    'Groupe électrogène',
    'Éclairage événementiel',
    'Sonorisation',
    'Estrades / Podiums',
    'Chauffage extérieur',
  ],
};

// Groupes bénéficiant du sélecteur "Points forts + Équipements" en admin
// (accordéons par catégories). Inclut Lieux/Traiteurs et Image et souvenir.
const GROUPES_AVEC_POINTS_FORTS = ['Lieux et réception', 'Restauration et traiteur', 'Image et souvenir', 'Musique et animation', 'Décoration et floral', 'Beauté et bien-être', 'Sécurité événementielle', 'Transport de prestige', 'Organisation', 'Logistique et technique'];

/**
 * Indique si le métier dispose des sélecteurs Points forts + Équipements
 * (accordéons pastilles) en admin. Plus large que metierAAccueilEtEquipements
 * qui reste réservé au bloc "Type d'accueil" (Lieux/Traiteurs).
 * @param {string} metier
 * @returns {boolean}
 */
export function metierAEquipementsEtPointsForts(metier) {
  return GROUPES_AVEC_POINTS_FORTS.includes(getMetierConfig(metier).groupe);
}

/**
 * Retourne la liste des équipements disponibles à proposer pour un métier donné
 * (résolu via son groupe métier).
 * @param {string} metier
 * @returns {string[]}
 */
export function getEquipementsDisponibles(metier) {
  const groupe = getMetierConfig(metier).groupe;
  return EQUIPEMENTS_PAR_GROUPE[groupe] || EQUIPEMENTS_DISPONIBLES;
}

// ─── Emoji par équipement (pastilles équipements de la fiche découverte) ──────
// Un emoji par item de EQUIPEMENTS_DISPONIBLES + un défaut cohérent pour les
// équipements hors liste prédéfinie.
export const EQUIPEMENTS_EMOJIS = {
  'Climatisation': '❄️',
  'Chauffage': '🔥',
  'Accès PMR': '♿',
  'Chaise bébé / Espace enfants': '🧸',
  'Table à langer': '🚼',
  'Espace de jeux enfants': '🧸',
  'Jouets à disposition': '🎲',
  'Défibrillateur': '🚑',
  'Parking sur place': '🚗',
  'Espace extérieur / Jardin': '🌳',
  'Piscine': '🏊',
  'Cuisine professionnelle équipée': '🍽️',
  'Hébergement sur place': '🛏️',
  'Groupe électrogène / Prise extérieure': '🔌',
  'Wifi': '📶',
  'Tente/chapiteau disponible': '⛺',
  'Sanitaires': '🚻',
  'Tables': '🪑',
  'Chaises': '💺',
  'Sonorisation': '🔊',
  'Vaisselle': '🍽️',
  'Verrerie': '🥂',
  'Couverts': '🍴',
  'Nappage / Linge de table': '🧵',
  // ── Image et souvenir (Photo/Vidéo) ──
  'Drone': '🚁',
  'Deuxième photographe/vidéaste': '👥',
  'Studio photo': '🎞️',
  'Éclairage professionnel': '💡',
  'Photobooth': '📸',
  'Impression sur place': '🖨️',
  'Album photo inclus': '📔',
  'Retouche professionnelle': '✨',
  'Vidéo drone': '🎥',
  'Micro-cravate / Son professionnel': '🎙️',
  // ── Musique et animation (DJ / Musiciens / Animateur) ──
  'Sonorisation professionnelle': '🔊',
  'Éclairage / Jeux de lumière': '💡',
  'Machine à fumée légère': '🌫️',
  'Fumée lourde (piste de danse)': '💨',
  'Show laser': '✳️',
  'Micro sans fil (discours)': '🎙️',
  'Platines / Table de mixage': '🎚️',
  'Écran / Vidéoprojecteur': '🖥️',
  'Photobooth': '📸',
  'Groupe électrogène de secours': '🔌',
  // ── Décoration et floral (Fleuriste / Décorateur / Scénographe) ──
  'Fleurs fraîches': '💐',
  'Fleurs séchées / stabilisées': '🌸',
  'Arche florale': '🌿',
  'Centres de table': '🪴',
  'Bouquet de mariée': '👰',
  'Boutonnières': '🏵️',
  'Décoration de chaises': '🪑',
  'Vaisselle décorative': '🍽️',
  'Éclairage décoratif (guirlandes, bougies)': '🕯️',
  'Location de mobilier (mange-debout, arche, etc.)': '🛋️',
  // ── Beauté et bien-être (Coiffeur / Maquilleur / Spa) ──
  'Kit maquillage professionnel': '💄',
  'Fer à boucler/lisseur': '🌀',
  'Coiffeuse mobile': '💈',
  'Éclairage professionnel (miroir loge)': '🪞',
  'Produits bio/hypoallergéniques': '🌿',
  'Table de massage': '💆',
  'Produits de soin haut de gamme': '🧴',
  // ── Sécurité événementielle ──
  'Talkie-walkie / communication': '📻',
  'Barrières de sécurité': '🚧',
  'Contrôle d\'accès': '🔐',
  'Gilet / tenue identifiable': '🦺',
  // ── Transport de prestige (Hélico / VTC / Voiture de collection) ──
  'Hélicoptère (modèle/capacité)': '🚁',
  'Limousine / véhicule prestige': '🚘',
  'Voiture de collection': '🚙',
  'Chauffeur professionnel en tenue': '🤵',
  'Assurance passagers incluse': '📋',
  'Point d\'atterrissage sécurisé (hélico)': '🛬',
  'Casque / communication à bord (hélico)': '🎧',
  // ── Organisation (Wedding Planner / Chef de projet / Maître de cérémonie) ──
  'Kit d\'urgence (couture, retouches, premiers secours)': '🩹',
  'Signalétique / panneaux jour J': '🪧',
  'Talkies-walkies coordination': '📡',
  'Mallette de coordination (chronologie, contacts, documents)': '💼',
  // ── Logistique et technique (Location de matériel) ──
  'Tentes / Chapiteaux': '⛺',
  'Mobilier (tables, chaises)': '🪑',
  'Groupe électrogène': '🔌',
  'Éclairage événementiel': '💡',
  'Sonorisation': '🔊',
  'Estrades / Podiums': '🪜',
  'Chauffage extérieur / Brasero': '🔥',
  // ── Libellés courts (équivalences des anciens libellés longs) ──
  'Espace enfants': '🧸',
  'Cuisine professionnelle': '🍽️',
  'Prises extérieures': '🔌',
  'Espace extérieur': '🌳',
  'Tente / Chapiteau': '⛺',
  'Linge de table': '🧵',
  '2e photographe/vidéaste': '👥',
  'Micro-cravate / Son': '🎙️',
  'Sonorisation pro': '🔊',
  'Éclairage / Jeux lumière': '💡',
  'Fumée lourde (piste)': '💨',
  'Groupe électrogène secours': '🔌',
  'Micro sans fil': '🎙️',
  'Platines / Mixage': '🎚️',
  'Fleurs séchées': '🌸',
  'Location de mobilier': '🛋️',
  'Éclairage décoratif': '🕯️',
  'Kit maquillage': '💄',
  'Éclairage maquillage': '🪞',
  'Produits bio': '🌿',
  'Soins haut de gamme': '🧴',
  'Talkie-walkie': '📻',
  'Gilet identifiable': '🦺',
  'Hélicoptère': '🚁',
  'Limousine prestige': '🚘',
  'Chauffeur pro': '🤵',
  'Assurance passagers': '📋',
  'Aire d\'atterrissage': '🛬',
  'Casque communication': '🎧',
  'Kit d\'urgence': '🩹',
  'Signalétique jour J': '🪧',
  'Talkies-walkies': '📡',
  'Mallette de coordination': '💼',
  'Mobilier': '🪑',
  'Chauffage extérieur': '🔥',
  __default: '✨',
};

// ─── Affichage court des équipements (fiche découverte) ─────────────────────
// Map les anciens libellés longs (stockés en base avant renommage) vers leur
// version courte pour l'affichage en grille 2 colonnes (évite la troncature).
// Les nouvelles sélections utilisent directement le libellé court canonique.
export const EQUIPEMENT_LABEL_COURT = {
  'Chaise bébé / Espace enfants': 'Espace enfants',
  'Cuisine professionnelle équipée': 'Cuisine professionnelle',
  'Groupe électrogène / Prise extérieure': 'Prises extérieures',
  'Espace extérieur / Jardin': 'Espace extérieur',
  'Tente/chapiteau disponible': 'Tente / Chapiteau',
  'Nappage / Linge de table': 'Linge de table',
  'Deuxième photographe/vidéaste': '2e photographe/vidéaste',
  'Micro-cravate / Son professionnel': 'Micro-cravate / Son',
  'Sonorisation professionnelle': 'Sonorisation pro',
  'Éclairage / Jeux de lumière': 'Éclairage / Jeux lumière',
  'Fumée lourde (piste de danse)': 'Fumée lourde (piste)',
  'Groupe électrogène de secours': 'Groupe électrogène secours',
  'Micro sans fil (discours)': 'Micro sans fil',
  'Platines / Table de mixage': 'Platines / Mixage',
  'Fleurs séchées / stabilisées': 'Fleurs séchées',
  'Location de mobilier (mange-debout, arche, etc.)': 'Location de mobilier',
  'Éclairage décoratif (guirlandes, bougies)': 'Éclairage décoratif',
  'Kit maquillage professionnel': 'Kit maquillage',
  'Éclairage professionnel (miroir loge)': 'Éclairage maquillage',
  'Produits bio/hypoallergéniques': 'Produits bio',
  'Produits de soin haut de gamme': 'Soins haut de gamme',
  'Talkie-walkie / communication': 'Talkie-walkie',
  'Gilet / tenue identifiable': 'Gilet identifiable',
  'Hélicoptère (modèle/capacité)': 'Hélicoptère',
  'Limousine / véhicule prestige': 'Limousine prestige',
  'Chauffeur professionnel en tenue': 'Chauffeur pro',
  'Assurance passagers incluse': 'Assurance passagers',
  'Point d\'atterrissage sécurisé (hélico)': 'Aire d\'atterrissage',
  'Casque / communication à bord (hélico)': 'Casque communication',
  'Kit d\'urgence (couture, retouches, premiers secours)': 'Kit d\'urgence',
  'Signalétique / panneaux jour J': 'Signalétique jour J',
  'Talkies-walkies coordination': 'Talkies-walkies',
  'Mallette de coordination (chronologie, contacts, documents)': 'Mallette de coordination',
  'Mobilier (tables, chaises)': 'Mobilier',
  'Chauffage extérieur / Brasero': 'Chauffage extérieur',
};

/**
 * Retourne le libellé d'affichage (court) d'un équipement, pour la grille
 * 2 colonnes de la fiche découverte. Les libellés déjà courts passent tels quels.
 * @param {string} eq
 * @returns {string}
 */
export function getEquipementDisplayLabel(eq) {
  return EQUIPEMENT_LABEL_COURT[eq] || eq;
}

// ─── Bibliothèque de questions FAQ (par groupe métier) ───────────────────────
// ~6 questions suggérées par groupe métier. Le prestataire en coche 3 à 6 et
// rédige une réponse courte ; possibilité d'ajouter des questions personnalisées
// hors bibliothèque. Même esprit que EQUIPEMENTS_PAR_GROUPE / POINTS_FORTS_CATEGORIES.
export const FAQ_PAR_GROUPE = {
  'Lieux et réception': [
    'Acceptez-vous les animaux ?',
    'Y a-t-il un plan B en cas de pluie ?',
    'Le prix inclut-il le mobilier et la vaisselle ?',
    "Combien de temps à l'avance faut-il réserver ?",
    'Peut-on faire appel à notre propre traiteur ?',
    'Y a-t-il un parking sur place ?',
  ],
  'Restauration et traiteur': [
    'Proposez-vous des menus végétariens / vegan ?',
    'Gérez-vous les allergies alimentaires ?',
    'Le service est-il inclus dans le tarif ?',
    "Combien de temps à l'avance faut-il finaliser le menu ?",
    'Proposez-vous une dégustation avant l’événement ?',
    'Intervenez-vous sur un lieu extérieur ?',
  ],
  'Image et souvenir': [
    'Combien de temps pour recevoir les photos / vidéos ?',
    'Proposez-vous un drone ?',
    'Puis-je récupérer tous les fichiers bruts ?',
    'Faites-vous une rencontre avant le jour J ?',
    'Combien de photos sont livrées ?',
    'Proposez-vous un album imprimé ?',
  ],
  'Musique et animation': [
    'Peut-on faire une playlist personnalisée ?',
    'Avez-vous votre propre matériel de sonorisation ?',
    'Proposez-vous une animation micro ?',
    "Jusqu'à quelle heure pouvez-vous jouer ?",
    'Intervenez-vous en extérieur ?',
    'Proposez-vous des musiciens en plus du DJ ?',
  ],
  'Décoration et floral': [
    'Travaillez-vous avec des fleurs de saison uniquement ?',
    'Proposez-vous la location de mobilier de décoration ?',
    'Venez-vous installer et désinstaller le jour J ?',
    'Proposez-vous un essai de composition avant le jour J ?',
    'Pouvez-vous créer une arche florale ?',
    'Faites-vous la reprise du matériel le lendemain ?',
  ],
  'Beauté et bien-être': [
    'Proposez-vous un essai avant le jour J ?',
    'Vous déplacez-vous sur le lieu de l’événement ?',
    'Combien de temps dure une prestation ?',
    'Prenez-vous en charge les témoins et la famille ?',
    'Utilisez-vous des produits bio / hypoallergéniques ?',
    'Proposez-vous des retouches pendant l’événement ?',
  ],
  'Transport de prestige': [
    'Combien de personnes peuvent monter dans le véhicule ?',
    'Le chauffeur est-il inclus ?',
    'Quel est le rayon de déplacement ?',
    'Le véhicule est-il décoré pour l’occasion ?',
    'Proposez-vous plusieurs véhicules / un cortège ?',
    'Quelles formalités pour un vol en hélicoptère ?',
  ],
  'Sécurité événementielle': [
    "Combien d'agents proposez-vous en moyenne ?",
    'Êtes-vous habilités / agréés ?',
    'Gérez-vous des événements de grande envergure ?',
    'Proposez-vous le contrôle d’accès et les voituriers ?',
    'Intervenez-vous en civil / discret ?',
    'Couvrez-vous la garde de nuit ?',
  ],
  'Logistique et technique': [
    'Fournissez-vous l’installation et le démontage ?',
    'Quel délai de réservation recommandez-vous ?',
    'Faites-vous la reprise le lendemain ?',
    'Gérez-vous les gros volumes (grands événements) ?',
    'Proposez-vous du matériel haut de gamme / design ?',
    'Intervenez-vous en extérieur ?',
  ],
  'Organisation': [
    'Proposez-vous un accompagnement jour J uniquement ou complet ?',
    'Travaillez-vous avec des prestataires imposés ou au choix ?',
    'Quel est votre tarif moyen ?',
    'Incluez-vous la visite de repérage ?',
    'Gérez-vous les mariages destination / à l’étranger ?',
    "Combien d'événements gérez-vous par an ?",
  ],
  'Autre': [
    'Quel est votre délai de réponse ?',
    'Vous déplacez-vous sur le lieu de l’événement ?',
    'Quel est votre tarif moyen ?',
    "Combien de temps à l'avance faut-il réserver ?",
    'Proposez-vous un devis gratuit ?',
    'Quels sont vos délais de livraison ?',
  ],
};

/**
 * Retourne les questions FAQ suggérées pour un groupe métier.
 * @param {string} groupe — groupe métier (ex: 'Lieux et réception')
 * @returns {string[]} questions suggérées, ou liste générique 'Autre' si groupe inconnu
 */
export function getFaqSuggestions(groupe) {
  return FAQ_PAR_GROUPE[groupe] || FAQ_PAR_GROUPE['Autre'] || [];
}