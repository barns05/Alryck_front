// Helpers purs extraits de ContractModal.jsx — utilitaires de substitution
// de placeholders {{CHAMP}} pour les modèles dynamiques de contrats.

export function extractPlaceholders(text) {
  if (!text) return [];
  const matches = text.match(/{{([^}]+)}}/g) || [];
  return [...new Set(matches.map(m => m.slice(2, -2)))];
}

export function substituteVariables(text, values) {
  if (!text) return '';
  return text.replace(/{{([^}]+)}}/g, (match, key) => values[key] ?? match);
}

export function buildClientFullName(client) {
  if (!client) return '';
  return [client.prenom, client.nom].filter(Boolean).join(' ') || client.nom || '';
}

export function autoFillValue(placeholder, { form, client, evenement, company, modelSettings, acceptedDevis }) {
  const p = placeholder.toUpperCase();

  // ─── Champs fixés par le modèle (Mode A — TVA et acompte) ───
  if (p === 'TAUX_TVA' && modelSettings?.tauxTvaModele != null) return String(modelSettings.tauxTvaModele);
  if (p === 'POURCENTAGE_ACOMPTE' && modelSettings?.pourcentageAcompteModele != null) return String(modelSettings.pourcentageAcompteModele);

  // ─── Second contact client (optionnel — préfixé " et " / " / " si renseigné) ───
  if (p === 'PRENOM_NOM_CLIENT_2') {
    const n2 = [client?.prenom2, client?.nom2].filter(Boolean).join(' ');
    return n2 ? ` et ${n2}` : '';
  }
  if (p === 'TELEPHONE_CLIENT_2') {
    return client?.telephone2 ? ` / ${client.telephone2}` : '';
  }
  if (p === 'EMAIL_CLIENT_2') {
    return client?.email2 ? ` / ${client.email2}` : '';
  }

  // ─── Champs Client (du plus spécifique au plus générique) ───
  if (p === 'PRENOM_NOM_CLIENT' || (p.includes('CLIENT') && (p.includes('NOM') || p.includes('PRENOM'))))
    return form.client_nom || evenement?.client_nom || '';
  if (p.includes('TELEPHONE_REFERENT_CLIENT'))
    return client?.telephone || client?.telephone2 || evenement?.client_telephone || '';
  if (p.includes('TELEPHONE_CLIENT') || (p.includes('TELEPHONE') && p.includes('CLIENT')))
    return client?.telephone || client?.telephone2 || '';
  if (p.includes('EMAIL_CLIENT') || (p.includes('EMAIL') && p.includes('CLIENT')))
    return client?.email || client?.email2 || '';
  if (p.includes('ADRESSE_CLIENT') || (p.includes('ADRESSE') && p.includes('CLIENT')))
    return [client?.adresse, client?.code_postal, client?.ville].filter(Boolean).join(' ');

  // ─── Champs Entreprise (CompanySettings) ───
  if (p.includes('TELEPHONE_REFERENT_PRESTATAIRE'))
    return company?.telephone || '';
  if (p.includes('TELEPHONE_ENTREPRISE') || (p.includes('TELEPHONE') && p.includes('ENTREPRISE')))
    return company?.telephone || '';
  if (p.includes('REFERENT_PRESTATAIRE') && !p.includes('TELEPHONE'))
    return company?.company_name || '';
  if (p.includes('EMAIL_ENTREPRISE') || (p.includes('EMAIL') && p.includes('ENTREPRISE')))
    return company?.email_contact || '';
  if (p.includes('ENTREPRISE') && p.includes('NOM')) return company?.company_name || '';
  if (p.includes('ADRESSE_VILLE') || p.includes('LOCALIT'))
    return [company?.adresse_code_postal, company?.adresse_ville].filter(Boolean).join(' ');
  if (p === 'ADRESSE_ENTREPRISE' || (p.includes('ENTREPRISE') && p.includes('ADRESSE')))
    return company?.adresse || '';
  if (p.includes('RCS') || p.includes('SIRET')) return company?.siret || '';

  // ─── Champs Événement ───
  if (p.includes('EVENEMENT') && p.includes('NOM')) return form.evenement_nom || '';
  if (p.includes('DATE_EVENEMENT'))
    return evenement?.date ? new Date(evenement.date).toLocaleDateString('fr-FR') : '';
  if (p.includes('LIEU_EVENEMENT')) return evenement?.lieu_nom || '';
  if (p.includes('NB_PERSONNES'))
    return String(evenement?.nb_invites || evenement?.nb_adultes || '') || '';

  // ─── Champs Devis lié à l'événement ───
  if (p === 'DESCRIPTION_PRESTATION' && acceptedDevis?.objet) return acceptedDevis.objet;
  if (p === 'DESCRIPTION_PRESTATION' && acceptedDevis?.lignes) {
    const lignes = acceptedDevis.lignes.filter(l => l.description).map(l => l.description);
    if (lignes.length > 0) return lignes.join(', ');
  }
  if (p === 'MONTANT_HT' && acceptedDevis?.total_ht != null) return String(acceptedDevis.total_ht);

  // ─── Horaires et capacités (Evenement + CompanySettings) ───
  if (p === 'HEURE_DEBUT_EVENEMENT') return evenement?.heure_debut || '';
  if (p === 'HEURE_FIN_EVENEMENT') return evenement?.heure_fin || '';
  if (p === 'MINIMUM_CONVIVES') return company?.capacite_min != null ? String(company.capacite_min) : '';
  if (p === 'CAPACITE_MAX_ERP') return company?.capacite_max != null ? String(company.capacite_max) : '';
  if (p === 'DELAI_LIVRAISON') return company?.delai_livraison || '';

  // ─── Paliers d'annulation (depuis le modèle) ───
  if (p === 'DELAI_ANNULATION_LOINTAIN' && modelSettings?.paliersAnnulation?.length >= 2) {
    const sorted = [...modelSettings.paliersAnnulation].sort((a, b) => (b.delai_jours ?? 0) - (a.delai_jours ?? 0));
    return String(sorted[0].delai_jours ?? '');
  }
  if (p === 'DELAI_ANNULATION_PROCHE' && modelSettings?.paliersAnnulation?.length >= 2) {
    const sorted = [...modelSettings.paliersAnnulation].sort((a, b) => (b.delai_jours ?? 0) - (a.delai_jours ?? 0));
    return String(sorted[sorted.length - 1].delai_jours ?? '');
  }

  // ─── Dates génériques ───
  if (p === 'DATE' || p.includes('DATE_SIGNATURE') || p.includes('DATE_CONTRAT'))
    return new Date().toLocaleDateString('fr-FR');

  return '';
}