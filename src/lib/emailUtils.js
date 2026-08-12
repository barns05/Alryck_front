/**
 * Interpole les variables dans un template HTML/texte
 * Supprime proprement les blocs contenant {lien_portail} si absent
 * 
 * Variables supportées:
 * - {client_nom}, {client_email}
 * - {numero}, {type_document}
 * - {lien_portail} (optionnel) — si absent, supprime le bloc contenant ce lien
 * - {company_name}, {email_contact}, {telephone}, {site_web}
 */
export function interpolateTemplate(template, variables = {}) {
  if (!template) return '';

  let result = template;

  // 1. Gérer {lien_portail} : si absent, supprimer le bloc <a> qui le contient
  if (!variables.lien_portail) {
    // Supprimer les balises <a> qui contiennent {lien_portail}
    // Pattern: <a href="{lien_portail}"...>...</a>
    result = result.replace(/<a[^>]*href="{lien_portail}"[^>]*>.*?<\/a>/gi, '');
    // Supprimer aussi les <p> vides qui pourraient rester après
    result = result.replace(/<p>\s*<\/p>/gi, '');
  }

  // 2. Remplacer toutes les variables
  const variables_list = [
    'client_nom',
    'client_email',
    'numero',
    'type_document',
    'lien_portail',
    'company_name',
    'email_contact',
    'telephone',
    'site_web'
  ];

  variables_list.forEach(key => {
    const value = variables[key] || '';
    const regex = new RegExp(`{${key}}`, 'g');
    result = result.replace(regex, value);
  });

  // 3. Nettoyer les variables non remplacées (restes de {xxx})
  result = result.replace(/{[^}]+}/g, '');

  return result;
}

/**
 * Obtient le modèle email par défaut pour un type de document
 * Retourne un objet {subject, body}
 */
export const DEFAULT_EMAIL_TEMPLATES = {
  'Devis': {
    subject: 'Devis {numero}',
    body: 'Bonjour {client_nom},\n\nVotre devis {numero} est disponible dans votre espace client.\n\n{lien_portail}\n\nN\'hésitez pas à nous contacter pour toute question.\n\nCordialement'
  },
  'Facture d\'acompte': {
    subject: 'Facture d\'acompte {numero}',
    body: 'Bonjour {client_nom},\n\nVotre facture d\'acompte {numero} est disponible dans votre espace client.\n\n{lien_portail}\n\nCordialement'
  },
  'Facture intermédiaire': {
    subject: 'Facture intermédiaire {numero}',
    body: 'Bonjour {client_nom},\n\nVotre facture intermédiaire {numero} est disponible dans votre espace client.\n\n{lien_portail}\n\nCordialement'
  },
  'Facture': {
    subject: 'Facture {numero}',
    body: 'Bonjour {client_nom},\n\nVotre facture {numero} est disponible dans votre espace client.\n\n{lien_portail}\n\nCordialement'
  },
  'Avoir': {
    subject: 'Avoir {numero}',
    body: 'Bonjour {client_nom},\n\nVotre avoir {numero} est disponible dans votre espace client.\n\n{lien_portail}\n\nCordialement'
  },
  'Solde': {
    subject: 'Solde {numero}',
    body: 'Bonjour {client_nom},\n\nVotre solde {numero} est disponible dans votre espace client.\n\n{lien_portail}\n\nCordialement'
  }
};

/**
 * Récupère le modèle pour un type de document depuis CompanySettings ou défaut
 */
export function getEmailTemplate(companySettings, documentType) {
  if (companySettings?.email_templates?.[documentType]) {
    return companySettings.email_templates[documentType];
  }
  return DEFAULT_EMAIL_TEMPLATES[documentType] || DEFAULT_EMAIL_TEMPLATES['Devis'];
}