/**
 * Énumérations centralisées pour tous les statuts de l'application
 */

// ============ ÉVÉNEMENTS ============
export const STATUT_EVENEMENT = {
  EN_ATTENTE: 'En attente',
  A_CONFIGURER: 'À configurer',
  CONFIRME: 'Confirmé',
  EN_PREPARATION: 'En préparation',
  PRET: 'Prêt',
  EN_COURS: 'En cours',
  TERMINE: 'Terminé',
  ANNULE: 'Annulé',
};

export const STATUT_EVENEMENT_VALUES = Object.values(STATUT_EVENEMENT);

// ============ PROSPECTS ============
export const STATUT_PROSPECT = {
  NOUVEAU: 'Nouveau',
  DEVIS_ENVOYE: 'Devis envoyé',
  EN_ATTENTE: 'En attente',
  A_RELANCER: 'À relancer',
  SIGNE: 'Signé',
  ANNULE: 'Annulé',
};

export const STATUT_PROSPECT_VALUES = Object.values(STATUT_PROSPECT);

// ============ FORMULAIRES ============
export const STATUT_FORMULAIRE = {
  NON_GENERE: 'Non généré',
  GENERE: 'Généré',
  EN_COURS: 'En cours',
  COMPLETE: 'Complété',
  CLOTURE: 'Clôturé',
};

export const STATUT_FORMULAIRE_VALUES = Object.values(STATUT_FORMULAIRE);

// ============ FICHES SERVICE ============
export const STATUT_FICHE_SERVICE = {
  NON_GENEREE: 'Non générée',
  GENEREE: 'Générée',
  PRETE: 'Prête',
  ENVOYEE: 'Envoyée',
  VUE: 'Vue',
};

export const STATUT_FICHE_SERVICE_VALUES = Object.values(STATUT_FICHE_SERVICE);

// ============ SERVICES & ASSIGNMENTS ============
export const STATUT_SERVICE = {
  OUVERT: 'Ouvert',
  COMPLET: 'Complet',
  ANNULE: 'Annulé',
  TERMINE: 'Terminé',
};

export const STATUT_ASSIGNMENT = {
  EN_ATTENTE: 'En attente',
  DISPO: 'Dispo',
  INDISPO: 'Indispo',
  CONFIRME: 'Confirmé',
  ANNULE: 'Annulé',
};

export const STATUT_ASSIGNMENT_VALUES = Object.values(STATUT_ASSIGNMENT);

// ============ DISPONIBILITÉS PRESTATAIRES ============
export const STATUT_DISPO_PRESTATAIRE = {
  EN_ATTENTE: 'En attente',
  CONFIRME: 'Confirmé',
  ANNULE: 'Annulé',
};

export const STATUT_DISPO_PRESTATAIRE_VALUES = Object.values(STATUT_DISPO_PRESTATAIRE);

// ============ AVIS ÉVÉNEMENTS ============
export const STATUT_AVIS_EVENEMENT = {
  NON_DEMANDE: 'Non demandé',
  ENVOYE: 'Envoyé',
  AVIS_RECU: 'Avis reçu',
};

export const STATUT_AVIS_EVENEMENT_VALUES = Object.values(STATUT_AVIS_EVENEMENT);

// ============ DEMANDES DE DATES (Prospects) ============
export const STATUT_DEMANDE_DATE = {
  EN_ATTENTE: 'En attente',
  CONFIRMEE: 'Confirmée',
  REFUSEE: 'Refusée',
};

export const STATUT_DEMANDE_DATE_VALUES = Object.values(STATUT_DEMANDE_DATE);

// ============ FLEXIBILITÉ (Demandes de dates) ============
export const FLEXIBILITE_DATE = {
  DATE_FIXE: 'Date fixe',
  FLEXIBLE_SEMAINE: 'Flexible sur la semaine',
  FLEXIBLE_MOIS: 'Flexible sur le mois',
};

export const FLEXIBILITE_DATE_VALUES = Object.values(FLEXIBILITE_DATE);

// ============ TYPES D'ÉVÉNEMENTS ============
export const TYPE_EVENEMENT = {
  MARIAGE: 'Mariage',
  PACS: 'Pacs',
  ANNIVERSAIRE_MARIAGE: 'Anniversaire de mariage',
  BAPTEME: 'Baptême',
  ANNIVERSAIRE: 'Anniversaire',
  SOIREE_ENTREPRISE: "Soirée d'entreprise",
  SEMINAIRE: 'Séminaire',
  COCKTAIL: 'Cocktail',
  GALA: 'Gala',
  LOCATION: 'Location',
  AUTRE: 'Autre',
};

export const TYPE_EVENEMENT_VALUES = Object.values(TYPE_EVENEMENT);

// ============ POSTES/MÉTIERS ============
export const POSTE = {
  SERVEUR: 'Serveur',
  BARMAN: 'Barman',
  CUISINIER: 'Cuisinier',
  PLONGEUR: 'Plongeur',
  CHEF_DE_RANG: 'Chef de rang',
  HOTESSE: 'Hôte/Hôtesse',
  AUTRE: 'Autre',
};

export const POSTE_VALUES = Object.values(POSTE);

// ============ DOMAINES PRESTATAIRES ============
export const DOMAINE_PRESTATAIRE = {
  TRAITEUR: 'Traiteur',
  DJ_MUSIQUE: 'DJ / Musique',
  PHOTOGRAPHE: 'Photographe',
  VIDEASTE: 'Vidéaste',
  FLEURISTE: 'Fleuriste',
  DECORATION: 'Décoration',
  ANIMATION: 'Animation',
  TRANSPORT: 'Transport',
  SECURITE: 'Sécurité',
  SONO_LUMIERES: 'Sono / Lumières',
  AUTRE: 'Autre',
};

export const DOMAINE_PRESTATAIRE_VALUES = Object.values(DOMAINE_PRESTATAIRE);

// ============ SOURCES DE CONNAISSANCE (Prospects) ============
export const SOURCE_PROSPECT = {
  BOUCHE_A_OREILLE: 'Bouche à oreille',
  GOOGLE: 'Google',
  INSTAGRAM: 'Instagram',
  FACEBOOK: 'Facebook',
  SALON_MARIAGE: 'Salon du mariage',
  RECOMMANDATION_PRESTATAIRE: 'Recommandation prestataire',
  SITE_WEB: 'Site web',
  AUTRE: 'Autre',
};

export const SOURCE_PROSPECT_VALUES = Object.values(SOURCE_PROSPECT);

// ============ TYPES DE LIEUX ============
export const TYPE_LIEU = {
  SALLE_RECEPTION: 'Salle de réception',
  CHATEAU: 'Château',
  RESTAURANT: 'Restaurant',
  HOTEL: 'Hôtel',
  PLEIN_AIR: 'Plein air',
  AUTRE: 'Autre',
};

export const TYPE_LIEU_VALUES = Object.values(TYPE_LIEU);

// ============ CATÉGORIES D'OPTIONS/PRESTATIONS ============
export const CATEGORIE_OPTION = {
  ANIMATIONS_CULINAIRES: 'Animations culinaires',
  ANIMATIONS_LOISIRS: 'Animations loisirs',
  DECORATION: 'Décoration',
  MUSIQUE: 'Musique',
  BOISSONS: 'Boissons',
  PACKS: 'Packs',
  AUTRE: 'Autre',
};

export const CATEGORIE_OPTION_VALUES = Object.values(CATEGORIE_OPTION);

// ============ TYPES DE PRIX ============
export const TYPE_PRIX = {
  PAR_PERSONNE: 'Par personne',
  FORFAIT: 'Forfait',
};

export const TYPE_PRIX_VALUES = Object.values(TYPE_PRIX);

// ============ TYPES DE CONTRATS ============
export const TYPE_CONTRAT = {
  CDI: 'CDI',
  CDD: 'CDD',
  AUTO_ENTREPRENEUR: 'Auto-entrepreneur',
};

export const TYPE_CONTRAT_VALUES = Object.values(TYPE_CONTRAT);

// ============ MODES D'ENVOI AVIS ============
export const MODE_ENVOI_AVIS = {
  MANUEL: 'Manuel',
  AUTOMATIQUE: 'Automatique',
};

export const MODE_ENVOI_AVIS_VALUES = Object.values(MODE_ENVOI_AVIS);

// ============ TYPES D'ENTRÉES PERSONNELLES ============
export const TYPE_ENTREE_PERSONNELLE = {
  CONGE: 'Congé',
  REPOS: 'Repos',
  INDISPONIBILITE: 'Indisponibilité',
  FORMATION: 'Formation',
  TACHE_INTERNE: 'Tâche interne',
  AUTRE: 'Autre',
};

export const TYPE_ENTREE_PERSONNELLE_VALUES = Object.values(TYPE_ENTREE_PERSONNELLE);

// ============ STATUTS ENTRÉES PERSONNELLES ============
export const STATUT_ENTREE_PERSONNELLE = {
  PLANIFIE: 'Planifié',
  EN_COURS: 'En cours',
  TERMINE: 'Terminé',
  ANNULE: 'Annulé',
};

export const STATUT_ENTREE_PERSONNELLE_VALUES = Object.values(STATUT_ENTREE_PERSONNELLE);

// ============ MODES DE RÉPONSE DISPO (Extras/Prestataires) ============
export const MODE_REPONSE_DISPO = {
  DISPO: 'Dispo',
  INDISPO: 'Indispo',
};

export const MODE_REPONSE_DISPO_VALUES = Object.values(MODE_REPONSE_DISPO);

/**
 * Utilitaire pour obtenir la description/label d'un statut
 * Peut être étendu pour des traductions ou labels personnalisés
 */
export function getStatusLabel(status: string, category: string = 'generic'): string {
  const map: Record<string, Record<string, string>> = {
    evenement: STATUT_EVENEMENT,
    prospect: STATUT_PROSPECT,
    formulaire: STATUT_FORMULAIRE,
    fiche_service: STATUT_FICHE_SERVICE,
  };

  return map[category]?.[status] || status;
}