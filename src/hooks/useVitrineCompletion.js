/**
 * useVitrineCompletion — Calcule le score de complétion de la vitrine publique.
 *
 * Pondération globale :
 * - Poids fort (4 pts)  : company_cover_url, accroche, company_logo_url, galerie ≥ 3 photos
 * - Poids moyen (2 pts) : tarif_a_partir_de, (zone_intervention OU capacite), style_tags, telephone, email_contact
 * - Poids faible (1 pt)  : social_networks, langues_parlees, lien_avis_externe
 * Total max = 33 pts.
 *
 * Seuils : <40% rouge, 40-80% orange, >80% vert.
 *
 * sections : complétion par section (identite, offre, contact) pour les pastilles des cartes d'accueil.
 */
import { useQuery } from '@tanstack/react-query';
import { base44 } from '@/api/base44Client';

const STRONG_FIELDS = [
  { key: 'company_cover_url', label: 'Photo de couverture' },
  { key: 'accroche', label: 'Phrase d\'accroche' },
  { key: 'company_logo_url', label: 'Logo' },
];
const MEDIUM_FIELDS = [
  { key: 'tarif_a_partir_de', label: 'Tarif indicatif' },
  { key: 'telephone', label: 'Téléphone' },
  { key: 'email_contact', label: 'Email de contact' },
];
const WEAK_FIELDS = [
  { key: 'lien_avis_externe', label: 'Lien avis clients' },
];

function computeSectionColor(pct) {
  if (pct < 40) return 'red';
  if (pct <= 80) return 'orange';
  return 'green';
}

function computeSections(cs, photos) {
  // Section Identité & Visuel
  const identiteFields = [
    { check: !!cs?.company_name, label: "Nom de l'entreprise" },
    { check: !!cs?.accroche, label: 'Accroche' },
    { check: !!cs?.company_logo_url, label: 'Logo' },
    { check: !!cs?.company_cover_url, label: 'Photo de couverture' },
    { check: !!cs?.metier, label: 'Métier principal' },
    { check: !!cs?.icone_commerciale, label: 'Icône commerciale' },
    { check: !!cs?.appellation_commerciale, label: 'Appellation des offres' },
  ];
  const identiteMissing = identiteFields.filter(f => !f.check).map(f => f.label);
  const identiteFilled = identiteFields.length - identiteMissing.length;
  const identitePct = Math.round((identiteFilled / identiteFields.length) * 100);

  // Section Offre & Prestation
  const offreFields = [
    { check: cs?.tarif_a_partir_de != null && cs?.tarif_a_partir_de !== '', label: 'Tarif indicatif' },
    { check: cs?.capacite_min != null || cs?.capacite_max != null, label: 'Capacité (min/max)' },
    { check: !!cs?.a_propos, label: 'À propos de nous' },
    { check: cs?.style_tags?.length > 0, label: 'Points forts / Style' },
    { check: cs?.langues_parlees?.length > 0, label: 'Langues parlées' },
    { check: cs?.faq?.length > 0, label: 'FAQ' },
  ];
  const offreMissing = offreFields.filter(f => !f.check).map(f => f.label);
  const offreFilled = offreFields.length - offreMissing.length;
  const offrePct = Math.round((offreFilled / offreFields.length) * 100);

  // Section Contact & Avis
  const contactFields = [
    { check: !!cs?.telephone, label: 'Téléphone' },
    { check: !!cs?.email_contact, label: 'Email de contact' },
    { check: !!cs?.site_web, label: 'Site web' },
    { check: cs?.social_networks?.length > 0, label: 'Réseaux sociaux' },
    { check: !!cs?.lien_avis_externe, label: 'Lien avis clients' },
    { check: cs?.review_platforms?.length > 0, label: 'Plateformes d\'avis' },
    { check: photos.length >= 3, label: 'Galerie (≥ 3 photos)' },
  ];
  const contactMissing = contactFields.filter(f => !f.check).map(f => f.label);
  const contactFilled = contactFields.length - contactMissing.length;
  const contactPct = Math.round((contactFilled / contactFields.length) * 100);

  return {
    identite: { percentage: identitePct, color: computeSectionColor(identitePct), filled: identiteFilled, total: identiteFields.length, missing: identiteMissing },
    offre: { percentage: offrePct, color: computeSectionColor(offrePct), filled: offreFilled, total: offreFields.length, missing: offreMissing },
    contact: { percentage: contactPct, color: computeSectionColor(contactPct), filled: contactFilled, total: contactFields.length, missing: contactMissing },
  };
}

export function useVitrineCompletion() {
  const { data: cs, isLoading: csLoading } = useQuery({
    queryKey: ['company-settings-vitrine-completion'],
    queryFn: () => base44.entities.CompanySettings.list().then(r => r.find(cs => cs.is_owner === true) || null),
    staleTime: 30 * 1000,
  });

  const { data: photos = [], isLoading: photosLoading } = useQuery({
    queryKey: ['galerie-photos-completion'],
    queryFn: () => base44.entities.GalerieVitrine.filter({ type: 'photo', visible_prospect: true }, 'ordre', 6),
    staleTime: 30 * 1000,
  });

  const isLoading = csLoading || photosLoading;

  if (isLoading) {
    return { score: 0, percentage: 0, color: null, label: '', missingFields: [], ready: false, isLoading: true, sections: null };
  }

  if (!cs) {
    return { score: 0, percentage: 0, color: 'red', label: 'Non configurée', missingFields: [], ready: false, isLoading: false, sections: null };
  }

  let score = 0;
  const missingFields = [];

  // ── Poids fort (4 pts chacun) ──
  for (const f of STRONG_FIELDS) {
    if (cs[f.key]) {
      score += 4;
    } else {
      missingFields.push({ ...f, weight: 'fort' });
    }
  }
  // Galerie ≥ 3 photos
  if (photos.length >= 3) {
    score += 4;
  } else {
    missingFields.push({ key: 'galerie', label: 'Galerie (≥ 3 photos)', weight: 'fort' });
  }

  // ── Poids moyen (2 pts chacun) ──
  for (const f of MEDIUM_FIELDS) {
    if (cs[f.key]) {
      score += 2;
    } else {
      missingFields.push({ ...f, weight: 'moyen' });
    }
  }
  // zone_intervention OU capacite (min ou max)
  if (cs.zone_intervention || cs.capacite_min != null || cs.capacite_max != null) {
    score += 2;
  } else {
    missingFields.push({ key: 'zone_capacite', label: 'Zone d\'intervention ou capacité', weight: 'moyen' });
  }
  // style_tags ≥ 1
  if (cs.style_tags && cs.style_tags.length > 0) {
    score += 2;
  } else {
    missingFields.push({ key: 'style_tags', label: 'Tags de style', weight: 'moyen' });
  }

  // ── Poids faible (1 pt chacun) ──
  for (const f of WEAK_FIELDS) {
    if (cs[f.key]) {
      score += 1;
    } else {
      missingFields.push({ ...f, weight: 'faible' });
    }
  }
  // social_networks ≥ 1
  if (cs.social_networks && cs.social_networks.length > 0) {
    score += 1;
  } else {
    missingFields.push({ key: 'social_networks', label: 'Réseaux sociaux', weight: 'faible' });
  }
  // langues_parlees ≥ 1
  if (cs.langues_parlees && cs.langues_parlees.length > 0) {
    score += 1;
  } else {
    missingFields.push({ key: 'langues_parlees', label: 'Langues parlées', weight: 'faible' });
  }

  const MAX_SCORE = 33;
  const percentage = Math.round((score / MAX_SCORE) * 100);

  let color, label;
  if (percentage < 40) {
    color = 'red';
    label = 'À compléter';
  } else if (percentage <= 80) {
    color = 'orange';
    label = 'Presque prêt';
  } else {
    color = 'green';
    label = 'Complète';
  }

  const sections = computeSections(cs, photos);

  return { score, percentage, color, label, missingFields, ready: true, isLoading: false, sections };
}