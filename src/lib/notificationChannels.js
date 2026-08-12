// Configuration des canaux de communication pour chaque type de notification

export const NOTIFICATION_CHANNELS = {
  // In-app seulement
  MESSAGERIE: { channels: ['in-app'], label: 'Messagerie' },
  MEDIAS: { channels: ['in-app'], label: 'Médias & Photos' },
  PROGRAMME: { channels: ['in-app'], label: 'Programme' },
  STATUTS: { channels: ['in-app'], label: 'Statuts' },
  
  // Email seulement
  LIEN_ACCES: { channels: ['email'], label: 'Lien d\'accès' },
  FORMULAIRE_PREPARATION: { channels: ['email'], label: 'Formulaire de préparation' },
  CONFIRMATION_EVENEMENT: { channels: ['email'], label: 'Confirmation événement' },
  FICHE_SERVICE_EXTRAS: { channels: ['email'], label: 'Fiche de service extras' },
  
  // Double canal (in-app + email)
  PROMOTIONS: { channels: ['in-app', 'email'], label: 'Promotions' },
  DEMANDE_AVIS: { channels: ['in-app', 'email'], label: 'Demande d\'avis' },
  RAPPEL_FORMULAIRE_J2: { channels: ['in-app', 'email'], label: 'Rappel formulaire J-2' },
  NOUVEAUX_DOCUMENTS: { channels: ['in-app', 'email'], label: 'Nouveaux documents' },
};

export const CHANNEL_ICONS = {
  'in-app': '📱',
  'email': '📧',
};

// Helper pour vérifier si un type de notification doit envoyer un email
export function shouldSendEmail(notificationType) {
  const config = NOTIFICATION_CHANNELS[notificationType];
  return config?.channels.includes('email') ?? false;
}

// Helper pour vérifier si un type de notification doit créer une notification in-app
export function shouldShowInApp(notificationType) {
  const config = NOTIFICATION_CHANNELS[notificationType];
  return config?.channels.includes('in-app') ?? false;
}

// Helper pour obtenir la configuration complète
export function getNotificationConfig(notificationType) {
  return NOTIFICATION_CHANNELS[notificationType] || null;
}