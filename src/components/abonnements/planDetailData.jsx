// ─── Constellation partagée ───────────────────────────────────────────────────
export const STARS = Array.from({ length: 38 }, (_, i) => ({
  x: ((i * 137.5) % 100).toFixed(2),
  y: ((i * 97.3 + 13) % 100).toFixed(2),
  r: i % 5 === 0 ? 1.5 : i % 3 === 0 ? 1 : 0.7,
  o: (0.03 + (i % 7) * 0.01).toFixed(2),
}));

// ─── Macarons par niveau ──────────────────────────────────────────────────────
export const MACARON = {
  Essentiel: { imageUrl: 'https://media.base44.com/images/public/69b804640546049d1a7bf53a/d53f06681_30508522-C1A0-460A-8B60-8154EDD6277E.png', label: 'Expérience Connectée' },
  Pro:       { imageUrl: 'https://media.base44.com/images/public/69b804640546049d1a7bf53a/98e1f1124_26A34486-246A-415C-8660-2D0D308FD53A.png', label: 'Expérience Avancée'   },
  Business:  { imageUrl: 'https://media.base44.com/images/public/69b804640546049d1a7bf53a/1c587c6c6_52ACD217-F1A8-4E67-A572-D0FCF490FF0F.png', label: 'Expérience Premium'   },
};

// ─── Tarification — source unique de vérité ───────────────────────────────────
export const FACTURATION_ADDON = 29;

export const PRIX = {
  Essentiel: { A: 79,  B: 39,  C: 24 },
  Pro:       { A: 149, B: 79,  C: 49 },
  Business:  { A: 249, B: 99,  C: 59 },
};

export const PRIX_BARRE = {
  Essentiel: { A: 99,  B: 59,  C: 34 },
  Pro:       { A: 199, B: 119, C: 69 },
  Business:  { A: 349, B: 149, C: 89 },
};

// ─── Catégories et helpers métier — source unique de vérité ──────────────────
export const CAT_A_METIERS = [
  'Salle de réception', 'Lieu de prestige / Château', 'Domaine viticole / Château viticole',
  'Domaine privé', 'Mas / Bastide', 'Villa privatisable', 'Espace plein air / Jardin',
  'Salle de spectacle', 'Salon événementiel', 'Restaurant privatisable', 'Espace atypique',
  'Péniche / Bateau', 'Rooftop', "Musée / Galerie d'art",
  'Traiteur événementiel', 'Chef à domicile', 'Food truck événementiel',
  'Wedding Planner', 'Fleuriste',
];

export const CAT_B_METIERS = [
  'Photographe', 'Vidéaste', 'Maître de cérémonie', 'Scénographe', 'Décorateur',
  'Pâtissier / Wedding cake', 'Candy bar / Sweet table', 'Location de matériel',
  'DJ', 'Musicien / Groupe', 'Animateur', 'Magicien / Artiste',
  'Performeur / Intermittent du spectacle',
];

export const CAT_A_FOOD = [
  'Traiteur événementiel', 'Chef à domicile', 'Food truck événementiel',
  'Pâtissier / Wedding cake', 'Candy bar / Sweet table',
];

export const CAT_B_LOUEURS = ['Location de matériel'];

export const isFood   = (metier) => CAT_A_FOOD.includes(metier);
export const isLoueur = (metier) => CAT_B_LOUEURS.includes(metier);

export function getCategorie(metier) {
  if (!metier) return 'C';
  if (CAT_A_METIERS.includes(metier)) return 'A';
  if (CAT_B_METIERS.includes(metier)) return 'B';
  return 'C';
}

// ─── Headers modales — source unique de vérité ────────────────────────────────
export const GRATUIT_MODAL_HEADER = {
  titre: 'Centralisez votre activité gratuitement',
  intro: 'Retrouvez vos prospects, vos clients, vos événements et vos échanges dans un espace unique conçu pour les professionnels de l\'événementiel.',
};

export const ESSENTIEL_MODAL_HEADER = {
  titre: 'Gagnez du temps et simplifiez votre gestion',
  intro: 'Arrêtez de recréer les mêmes documents à chaque demande. ALRYCK vous permet de structurer votre activité, d\'automatiser votre suivi commercial et d\'offrir une expérience plus professionnelle à vos prospects et clients.',
};

export const PRO_MODAL_HEADER = {
  titre: 'Transformez ALRYCK en véritable logiciel métier',
  intro: 'Automatisez la préparation de vos événements, structurez vos équipes et centralisez l\'ensemble de votre activité dans un outil conçu pour les professionnels exigeants.',
};

export const BUSINESS_MODAL_HEADER = {
  titre: 'Pilotez votre entreprise avec le niveau Business',
  intro: "Le niveau Business regroupe les outils les plus avancés d'ALRYCK pour structurer, sécuriser et développer votre activité.\n\nContrats, conformité, logistique, prévisionnel et automatisations : concentrez-vous sur votre métier pendant qu'ALRYCK veille sur votre entreprise.",
};

// ─── Sections de contenu par niveau ──────────────────────────────────────────
function getGratuitSections(categorie) {
  const isBOrC = categorie === 'B' || categorie === 'C';
  return [
    {
      titre: 'Votre Vitrine Professionnelle',
      items: [
        { label: isBOrC ? 'Présentez votre activité et vos prestations' : 'Présentez votre établissement et vos prestations', isNew: true },
        { label: 'Partagez jusqu\'à 6 photos', isNew: true },
        { label: 'Mettez en avant votre savoir-faire', isNew: true },
        { label: 'Donnez accès à un espace prospect personnalisé', isNew: true },
      ],
    },
    {
      titre: 'Espace Prospect',
      items: [
        { label: 'Recevez des demandes de disponibilité', isNew: true },
        { label: 'Échangez via la messagerie intégrée', isNew: true },
        { label: 'Partagez vos documents et brochures', isNew: true },
        { label: 'Offrez une expérience professionnelle dès le premier contact', isNew: true },
      ],
    },
    {
      titre: 'Clients & Événements',
      items: [
        { label: 'Retrouvez vos clients et vos événements', isNew: true },
        { label: 'Centralisez les informations importantes', isNew: true },
        { label: 'Consultez votre calendrier à tout moment', isNew: true },
        { label: 'Gardez un historique complet de votre activité', isNew: true },
      ],
    },
    {
      titre: 'Écosystème Connecté',
      items: [
        { label: 'Invitez vos partenaires dans un événement', isNew: true },
        { label: 'Facilitez les échanges entre prestataires', isNew: true },
        { label: 'Recommandez vos contacts de confiance', isNew: true },
        { label: 'Regroupez plusieurs professionnels autour d\'un même événement', isNew: true },
      ],
    },
    {
      titre: 'Une expérience unique pour vos clients',
      _isVisuel: true,
      items: [
        { label: 'Un espace dédié à chaque projet', isNew: true },
        { label: 'Tous les échanges regroupés au même endroit', isNew: true },
        { label: 'Vos prestataires réunis autour de l\'événement', isNew: true },
      ],
    },
    {
      titre: 'Inclus gratuitement',
      items: [
        { label: 'Utilisation sans limite de durée', isNew: true },
        { label: 'Mise à jour automatique de la plateforme', isNew: true },
        { label: 'Accès aux futures évolutions du niveau Gratuit', isNew: true },
      ],
    },
  ];
}

function getEssentielSections(categorie) {
  const isBOrC = categorie === 'B' || categorie === 'C';
  return [
    {
      titre: 'Catalogue et Prestations',
      items: [
        { label: isBOrC ? 'Créez vos formules, prestations et services une seule fois' : 'Créez vos formules, menus et prestations une seule fois', isNew: true },
        { label: 'Centralisez vos tarifs, options et documents commerciaux', isNew: true },
        { label: 'Retrouvez facilement toutes vos informations au même endroit', isNew: true },
        { label: 'Importez automatiquement vos brochures grâce à Amanda IA', isNew: true },
      ],
    },
    {
      titre: 'Prospects et Devis',
      items: [
        { label: 'Générez vos devis plus rapidement', isNew: true },
        { label: 'Suivez chaque prospect jusqu\'à la réservation', isNew: true },
        { label: 'Gérez vos relances sans rien oublier', isNew: true },
        { label: 'Visualisez votre pipeline commercial en temps réel', isNew: true },
      ],
    },
    {
      titre: 'Expérience Client',
      items: [
        { label: 'Offrez un espace dédié à chaque prospect et client', isNew: true },
        { label: 'Partagez documents et informations depuis un espace unique', isNew: true },
        { label: 'Professionnalisez votre parcours client', isNew: true },
        { label: 'Renforcez la qualité de votre suivi commercial', isNew: true },
      ],
    },
    {
      titre: 'Amanda IA',
      items: [
        { label: 'Importez vos brochures en quelques secondes', isNew: true },
        { label: 'Transforme automatiquement vos brochures en catalogue exploitable', isNew: true },
        { label: 'Évitez des heures de saisie manuelle', isNew: true },
        { label: 'Vous fait gagner un temps précieux dès la mise en place', isNew: true },
      ],
    },
    {
      titre: 'Votre Vitrine Professionnelle',
      items: [
        { label: 'Badge Partenaire ALRYCK inclus', isNew: true },
        { label: 'Jusqu\'à 12 photos pour valoriser votre activité', isNew: true },
        { label: 'Présentez davantage vos réalisations et prestations', isNew: true },
        { label: 'Renforcez la confiance dès le premier contact', isNew: true },
        { label: 'Affirmez votre professionnalisme auprès de vos futurs clients', isNew: true },
      ],
    },
    {
      titre: 'Inclus dans Essentiel',
      items: [
        { label: 'Tout le contenu du niveau Gratuit', isNew: false },
        { label: 'Mises à jour automatiques de la plateforme', isNew: false },
        { label: 'Accès aux futures évolutions du niveau Essentiel', isNew: false },
      ],
    },
  ];
}

function getProSections(categorie, metier, restaurationIntegree) {
  const isBOrC = categorie === 'B' || categorie === 'C';
  const hasAlimentaire = isFood(metier) || restaurationIntegree === true;
  return [
    {
      titre: 'Espace prospect',
      items: [
        { label: 'Suivez chaque prospect jusqu\'à la réservation', isNew: true },
        { label: 'Centralisez vos échanges et relances', isNew: true },
        { label: 'Gérez un véritable tunnel de réservation', isNew: true },
        { label: 'Médias collaboratif — échangez photos, vidéos et documents avec vos clients', isNew: true },
        { label: 'Centralisez inspirations et visuels de préparation dans un espace unique', isNew: true },
        { label: 'Gérez les autorisations de publication sur les réseaux sociaux', isNew: true },
      ],
    },
    {
      titre: 'Bibliothèque complète',
      items: [
        { label: 'Catalogue complet de vos prestations', isNew: true },
        { label: isBOrC ? 'Prestations, options, services et articles' : 'Produits, menus, options et articles', isNew: true },
        { label: 'Tarification centralisée', isNew: true },
        { label: 'Bibliothèque documentaire métier', isNew: true },
        { label: 'Bibliothèque de modèles métier ALRYCK', isNew: true },
        { label: 'Créez et diffusez vos offres commerciales', isNew: true },
      ],
    },
    {
      titre: 'Gestion événements',
      items: [
        { label: 'Questionnaire automatique envoyé aux clients', isNew: true },
        { label: 'Programme journée généré automatiquement', isNew: true },
        { label: 'Fiche de service centralisée', isNew: true },
        ...(hasAlimentaire ? [{ label: 'Détection automatique des allergènes à partir des menus et prestations saisis', isNew: true }] : []),
        { label: 'Coordination simplifiée de chaque événement', isNew: true },
      ],
    },
    {
      titre: 'Gestion extras et équipes',
      items: isBOrC ? [
        { label: 'Gestion de vos intervenants et collaborateurs', isNew: true },
        { label: 'Planning des équipes et missions', isNew: true },
        { label: 'Notifications automatiques aux intervenants', isNew: true },
        { label: 'Espace dédié à chaque collaborateur', isNew: true },
        { label: 'Confirmation de présence et disponibilité', isNew: true },
        { label: 'Historique et suivi des missions', isNew: true },
      ] : [
        { label: 'Gestion complète des extras', isNew: true },
        { label: 'Planning des équipes', isNew: true },
        { label: 'Convocations automatiques', isNew: true },
        { label: 'Espace dédié à chaque collaborateur', isNew: true },
        { label: 'Confirmation de présence', isNew: true },
        { label: 'Historique et suivi des missions', isNew: true },
      ],
    },
    {
      titre: 'Vitrine et visibilité',
      items: [
        { label: 'Badge Expérience Avancée ALRYCK inclus', isNew: true },
        { label: 'Jusqu\'à 24 photos professionnelles', isNew: true },
        { label: isBOrC ? 'Présentation enrichie de votre activité' : 'Présentation enrichie de votre établissement', isNew: true },
        { label: 'Valorisez davantage vos réalisations', isNew: true },
        { label: 'Renforcez la confiance dès le premier contact', isNew: true },
      ],
    },
    {
      titre: 'Amanda IA · Niveau 2',
      items: [
        { label: 'Analyse vos brochures', isNew: true },
        { label: 'Prépare votre catalogue métier', isNew: true },
        { label: 'Assiste la préparation de vos événements', isNew: true },
        { label: 'Réduit les tâches administratives', isNew: true },
        { label: 'Vous fait gagner plusieurs heures chaque semaine', isNew: true },
      ],
    },
    {
      titre: 'Inclus dans Pro',
      items: [
        { label: 'Tout le contenu des niveaux Gratuit et Essentiel', isNew: false },
        { label: 'Mises à jour automatiques de la plateforme', isNew: false },
        { label: 'Accès aux futures évolutions du niveau Pro', isNew: false },
      ],
    },
  ];
}

function getBusinessSections(categorie, metier) {
  const isBOrC = categorie === 'B' || categorie === 'C';

  const conformiteSection = {
    titre: 'Conformité ERP & Pilotage',
    _isStarCard: true,
    items: isBOrC ? [
      { label: 'Suivi documentaire centralisé — tous vos documents administratifs accessibles en un clic', isNew: true },
      { label: 'Contrôles périodiques automatisés — planifiez vos vérifications, recevez vos alertes avant l\'échéance', isNew: true },
      { label: 'Obligations administratives centralisées — plus aucune échéance réglementaire ne passe entre les mailles', isNew: true },
      { label: 'Alertes avant chaque échéance — zéro oubli, zéro pénalité, zéro mauvaise surprise', isNew: true },
      { label: 'Suivi des intervenants et prestataires — historique complet de chaque mission et intervenant', isNew: true },
      { label: 'Archivage centralisé et sécurisé — traçabilité totale de vos documents et contrats', isNew: true },
    ] : [
      { label: 'Registre de sécurité numérique — tous vos documents réglementaires centralisés, datés et accessibles en un clic', isNew: true },
      { label: 'Contrôles périodiques automatisés — planifiez vos vérifications, recevez vos alertes avant l\'échéance', isNew: true },
      { label: 'Obligations réglementaires centralisées — plus aucune obligation administrative ne passe entre les mailles', isNew: true },
      { label: 'Alertes avant chaque échéance — zéro oubli, zéro pénalité, zéro mauvaise surprise', isNew: true },
      { label: 'Suivi des bureaux de contrôle — historique complet de chaque intervention et intervenant', isNew: true },
      { label: 'Historique documentaire sécurisé — archivage automatique, traçabilité totale de vos documents', isNew: true },
    ],
  };

  const prospectSection = {
    titre: 'Espace prospect',
    items: [
      { label: 'Tunnel de réservation complet — de la première demande à la signature', isNew: true },
      { label: 'Messagerie centralisée — tous vos échanges prospects et clients au même endroit', isNew: true },
      { label: 'Promotions et offres commerciales — codes promo, remises, packages sur mesure', isNew: true },
      { label: 'Contrats directement liés aux dossiers clients', isNew: true },
      { label: 'Signature électronique simplifiée depuis l\'espace prospect', isNew: true },
    ],
  };

  const bibliothequeSection = {
    titre: 'Bibliothèque premium',
    items: [
      { label: isBOrC ? 'Catalogue complet — prestations, services, options et articles' : 'Catalogue complet — produits, menus, options et articles', isNew: true },
      ...(categorie === 'A' ? [
        { label: 'Plans de salle interactifs — tables, zones et capacités', isNew: true },
        { label: 'Préparation visuelle des événements en quelques minutes', isNew: true },
      ] : [
        { label: 'Tarification centralisée — tous vos tarifs à jour', isNew: true },
        { label: 'Modèles et documents prêts à l\'emploi', isNew: true },
      ]),
      { label: 'Contrats personnalisables — clauses, signature électronique, archivage', isNew: true },
      { label: 'Chaque réservation sécurisée juridiquement', isNew: true },
    ],
  };

  const logistiqueItems = categorie === 'A' ? [
    { label: 'Inventaire matériel complet — tables, chaises, nappes, sono, tout ce que vous mobilisez', isNew: true },
    { label: 'Dotation automatique — définissez les règles une fois, Alryck calcule pour chaque événement', isNew: true },
    { label: 'Planification des véhicules — affectez camions et utilitaires avec horaires de départ', isNew: true },
    { label: 'Affectation des chauffeurs — qui conduit quoi, où et quand', isNew: true },
    { label: 'Suivi des livraisons fournisseurs — confirmez les horaires et signalez les écarts en temps réel', isNew: true },
  ] : (categorie === 'B' && isLoueur(metier)) ? [
    { label: 'Stock matériel par catégorie', isNew: true },
    { label: 'Affectation matériel par événement', isNew: true },
    { label: 'Planification et suivi des livraisons', isNew: true },
  ] : [
    { label: 'Inventaire et suivi de votre matériel', isNew: true },
    { label: 'Planification logistique simplifiée', isNew: true },
    { label: 'Suivi des déplacements et intervenants', isNew: true },
  ];

  const analysesSection = {
    titre: 'Analyses et prévisionnel',
    items: [
      { label: 'Tableau de bord de l\'activité — chiffre d\'affaires, événements, taux de conversion en un écran', isNew: true },
      { label: 'Analyse du chiffre d\'affaires — identifiez vos meilleures périodes et formules', isNew: true },
      { label: 'Prévisionnel N+1 — projetez votre carnet de commandes sur les 12 prochains mois', isNew: true },
      { label: 'Statistiques détaillées — suivez vos performances dans le temps', isNew: true },
      { label: 'Aide à la prise de décision — données claires pour piloter en toute confiance', isNew: true },
    ],
  };

  const amandaSection = {
    titre: 'Amanda IA · Niveau 3',
    items: [
      { label: 'Assistant événementiel intelligent — analyse, anticipe et vous guide dans chaque étape', isNew: true },
      { label: isBOrC ? 'Amanda vocal — dictez vos instructions à voix haute pendant votre activité sans interrompre votre travail' : 'Amanda vocal — dictez vos instructions à voix haute pendant la préparation, sans poser votre couteau', isNew: true },
      { label: 'Automatisations personnalisables — créez vos propres déclencheurs : J-X, alertes, rappels sur mesure', isNew: true },
      { label: 'Suggestions intelligentes — formules, extras et prestataires selon l\'historique de vos événements', isNew: true },
      { label: 'Assistance proactive au pilotage — Amanda surveille votre activité et vous alerte avant les problèmes', isNew: true },
    ],
  };

  const vitrineSection = {
    titre: 'Vitrine et visibilité',
    items: [
      { label: 'Badge Expérience Premium ALRYCK — affichez votre statut sur votre vitrine et vos espaces clients', isNew: true },
      { label: isBOrC ? 'Jusqu\'à 34 photos professionnelles pour valoriser votre activité et vos réalisations' : 'Jusqu\'à 34 photos professionnelles pour valoriser votre établissement et vos réalisations', isNew: true },
      { label: 'Vidéo de présentation — offrez une expérience immersive à vos futurs clients', isNew: true },
      { label: isBOrC ? 'Présentation enrichie de votre activité' : 'Présentation enrichie de votre établissement', isNew: true },
      { label: 'Renforcez la confiance dès le premier contact', isNew: true },
    ],
  };

  const inclusSection = {
    titre: 'Inclus dans Business',
    items: [
      { label: 'Tout le contenu des niveaux Gratuit, Essentiel et Pro', isNew: false },
      { label: 'Mises à jour automatiques de la plateforme', isNew: false },
      { label: 'Accès aux futures évolutions du niveau Business', isNew: false },
    ],
  };

  return [
    conformiteSection,
    prospectSection,
    bibliothequeSection,
    { titre: 'Gestion logistique', items: logistiqueItems },
    analysesSection,
    amandaSection,
    vitrineSection,
    inclusSection,
  ];
}

// ─── Blocs d'introduction par niveau ─────────────────────────────────────────
const PLAN_INTRO_DATA = {
  Gratuit: {
    sousTitre: 'Centralisez vos clients et vos événements',
    bullets: [
      'Créez votre vitrine professionnelle en ligne',
      'Disposez d\'un espace dédié pour chaque prospect',
      'Centralisez vos demandes et vos échanges',
      'Présentez vos prestations de manière professionnelle',
      'Suivez vos opportunités commerciales plus efficacement',
    ],
  },
  Essentiel: {
    sousTitre: 'Gagnez du temps et simplifiez votre gestion',
    bullets: [
      'Ne recréez plus vos devis et prestations à chaque demande',
      'Retrouvez formules, tarifs et documents au même endroit',
      'Suivez chaque prospect jusqu\'à la réservation',
      'Offrez à vos clients un espace professionnel dédié',
      'Importez automatiquement vos prestations grâce à Amanda IA',
    ],
  },
  Pro: {
    A: {
      sousTitre: 'Pilotez vos événements de A à Z',
      bullets: [
        'Gérez l\'ensemble du parcours client jusqu\'au jour J',
        'Automatisez questionnaires, programmes et fiches de service',
        'Réunissez clients, équipes et prestataires autour du même événement',
        'Centralisez toutes les informations liées à vos événements',
        'Partagez facilement documents et médias depuis un espace unique',
        'Utilisez Amanda IA comme assistant métier',
      ],
    },
    default: {
      sousTitre: 'Pilotez vos événements de A à Z',
      bullets: [
        'Gérez l\'ensemble du parcours client jusqu\'au jour J',
        'Automatisez questionnaires, programmes et documents de préparation',
        'Réunissez vos clients et partenaires autour du même événement',
        'Centralisez toutes les informations liées à vos prestations',
        'Partagez facilement photos, vidéos, documents et médias depuis un espace unique',
        'Utilisez Amanda IA comme assistant métier',
      ],
    },
  },
  Business: {
    sousTitre: 'Pilotez votre entreprise avec le niveau Business',
    bullets: [
      'Le niveau Business regroupe les outils les plus avancés d\'ALRYCK pour structurer, sécuriser et développer votre activité.',
      'Contrats, conformité, logistique, prévisionnel et automatisations : concentrez-vous sur votre métier pendant qu\'ALRYCK veille sur votre entreprise.',
    ],
  },
};

export const PLAN_INTRO = PLAN_INTRO_DATA;

export function getPlanIntro(level, categorie) {
  const data = PLAN_INTRO_DATA[level];
  if (!data) return null;
  if (level === 'Pro') return data[categorie] || data.default;
  return data;
}

// ─── Export principal ─────────────────────────────────────────────────────────
export function getPlanSections(level, categorie, metier, restaurationIntegree) {
  if (level === 'Gratuit')   return getGratuitSections(categorie);
  if (level === 'Essentiel') return getEssentielSections(categorie);
  if (level === 'Pro')       return getProSections(categorie, metier, restaurationIntegree);
  if (level === 'Business')  return getBusinessSections(categorie, metier);
  return [];
}