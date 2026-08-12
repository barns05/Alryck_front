/**
 * useVitrineData — Hook résolveur de source pour VitrineProfil
 *
 * 3 modes :
 *  - "company"     → charge CompanySettings[0] (L'Alizé / multi-tenant futur)
 *  - "prestataire" → charge Prestataire par prestataire_id
 *  - "prospect"    → passe-plat : utilise les props prospect + settings sans chargement supplémentaire
 *
 * Retourne toujours un objet normalisé { vitrineData, prospect, isLoading }
 * vitrineData est compatible avec les props attendues par CarteEtablissement.
 */
import { useQuery } from '@tanstack/react-query';
import { base44 } from '@/api/base44Client';

// Mapping CompanySettings → vitrineData normalisé
function normalizeFromCompany(cs) {
  if (!cs) return null;
  return {
    nom:                cs.company_name || '',
    logo_url:           cs.company_logo_url || '',
    cover_url:          cs.company_cover_url || '',
    telephone:          cs.telephone || '',
    site_web:           cs.site_web || '',
    adresse:            cs.adresse || '',
    accroche:           cs.accroche || '',
    social_networks:    cs.social_networks || [],
    appellation_commerciale: cs.appellation_commerciale || '',
    icone_commerciale:  cs.icone_commerciale || '',
    metier:             cs.metier || '',
    subscription_level: cs.subscription_level || '',
    annee_creation:     cs.annee_creation || null,
    lien_avis_externe:  cs.lien_avis_externe || '',
    note_moyenne_externe: cs.note_moyenne_externe ?? null,
    nb_avis_externe:     cs.nb_avis_externe ?? null,
    source_avis:         cs.source_avis || '',
    a_propos:            cs.a_propos || '',
    verifie_alryck:      cs.verifie_alryck ?? false,
    relance_prospect_jours: cs.relance_prospect_jours ?? 3,
    modules_actifs:     cs.modules_actifs || {},
    avis_mis_en_avant:  cs.avis_mis_en_avant || [],
    ville:              '',
    adresse_ville:       cs.adresse_ville || '',
    adresse_code_postal: cs.adresse_code_postal || '',
    tarif_a_partir_de:    cs.tarif_a_partir_de ?? null,
    style_tags:           cs.style_tags || [],
    points_forts_personnalises: cs.points_forts_personnalises || [],
    langues_parlees:      cs.langues_parlees || [],
    zone_intervention:    cs.zone_intervention || '',
    delai_reponse:        cs.delai_reponse || '',
    capacite_min:         cs.capacite_min ?? null,
    capacite_max:         cs.capacite_max ?? null,
    hebergement:          cs.hebergement ?? null,
    type_lieu:            cs.type_lieu || '',
    nb_photos_livrees:    cs.nb_photos_livrees ?? null,
    delai_livraison:      cs.delai_livraison || '',
    video_incluse:        cs.video_incluse ?? null,
    type_musique:         cs.type_musique || '',
    materiel_inclus:      cs.materiel_inclus || [],
    style_floral:         cs.style_floral || '',
    prestations_florales: cs.prestations_florales || [],
    equipements:          cs.equipements || [],
    faq:                  cs.faq || [],
    accueil_sur_place:    cs.accueil_sur_place ?? false,
    accueil_deplacement:  cs.accueil_deplacement ?? false,
    // Champs CompanySettings complets transmis tels quels pour compatibilité
    _raw: cs,
  };
}

// Mapping Prestataire → vitrineData normalisé
// Privilégie les champs CompanySettings (cs) quand renseignés, sinon retombe sur Prestataire (p).
function normalizeFromPrestataire(p, cs = null) {
  if (!p) return null;
  return {
    nom:                cs?.company_name || p.nom || '',
    logo_url:           cs?.company_logo_url || p.logo_url || '',
    cover_url:          cs?.company_cover_url || p.cover_url || '',
    telephone:          cs?.telephone || p.telephone || '',
    site_web:           cs?.site_web || p.site_web || '',
    adresse:            cs?.adresse || p.ville || '',
    accroche:           cs?.accroche || p.description || '',
    social_networks:    cs?.social_networks || [],
    appellation_commerciale: cs?.appellation_commerciale || p.domaine || '',
    icone_commerciale:  cs?.icone_commerciale || '',
    metier:             cs?.metier || p.domaine || '',
    subscription_level: cs?.subscription_level || '',
    annee_creation:     cs?.annee_creation || null,
    lien_avis_externe:  cs?.lien_avis_externe || '',
    note_moyenne_externe: cs?.note_moyenne_externe ?? null,
    nb_avis_externe:     cs?.nb_avis_externe ?? null,
    source_avis:         cs?.source_avis || '',
    a_propos:            cs?.a_propos || '',
    verifie_alryck:      cs?.verifie_alryck ?? false,
    relance_prospect_jours: cs?.relance_prospect_jours ?? 3,
    modules_actifs:     cs?.modules_actifs || {},
    avis_mis_en_avant:  cs?.avis_mis_en_avant || [],
    // Champs infos_pratiques_* depuis CompanySettings
    infos_pratiques_adresse:  cs?.infos_pratiques_adresse || '',
    infos_pratiques_gps:      cs?.infos_pratiques_gps || '',
    infos_pratiques_horaires: cs?.infos_pratiques_horaires || '',
    infos_pratiques_contact:  cs?.infos_pratiques_contact || '',
    infos_pratiques_notes:    cs?.infos_pratiques_notes || '',
    tarif:                    p.tarif || null,
    tarif_a_partir_de:        cs?.tarif_a_partir_de ?? p.tarif ?? null,
    style_tags:               cs?.style_tags || [],
    points_forts_personnalises: cs?.points_forts_personnalises || [],
    langues_parlees:          cs?.langues_parlees || [],
    zone_intervention:        cs?.zone_intervention || '',
    delai_reponse:            cs?.delai_reponse || '',
    capacite_min:             cs?.capacite_min ?? null,
    capacite_max:             cs?.capacite_max ?? null,
    hebergement:              cs?.hebergement ?? null,
    type_lieu:                cs?.type_lieu || '',
    nb_photos_livrees:         cs?.nb_photos_livrees ?? null,
    delai_livraison:          cs?.delai_livraison || '',
    video_incluse:            cs?.video_incluse ?? null,
    type_musique:             cs?.type_musique || '',
    materiel_inclus:          cs?.materiel_inclus || [],
    style_floral:             cs?.style_floral || '',
    prestations_florales:     cs?.prestations_florales || [],
    equipements:              cs?.equipements || [],
    faq:                      cs?.faq || [],
    accueil_sur_place:        cs?.accueil_sur_place ?? false,
    accueil_deplacement:      cs?.accueil_deplacement ?? false,
    ville:                    p.ville || '',
    adresse_ville:            cs?.adresse_ville || p.ville || '',
    adresse_code_postal:      cs?.adresse_code_postal || '',
    _raw: p,
  };
}

export function useVitrineData({ mode = 'prospect', prestataire_id = null, prospect = null, settings = null }) {
  // Mode company — charge CompanySettings
  const { data: csData, isLoading: csLoading } = useQuery({
    queryKey: ['company-settings-vitrine'],
    queryFn: () => base44.entities.CompanySettings.list('created_date', 1).then(r => r[0] || null),
    staleTime: 5 * 60 * 1000,
    enabled: mode === 'company',
  });

  // Mode prestataire — charge Prestataire par id
  const { data: prestData, isLoading: prestLoading } = useQuery({
    queryKey: ['prestataire-vitrine', prestataire_id],
    queryFn: () => base44.entities.Prestataire.filter({ id: prestataire_id }).then(r => r[0] || null),
    staleTime: 5 * 60 * 1000,
    enabled: mode === 'prestataire' && !!prestataire_id,
  });

  // Mode prestataire — charge la fiche CompanySettings liée en parallèle
  const { data: prestCsData, isLoading: prestCsLoading } = useQuery({
    queryKey: ['prestataire-company-settings', prestataire_id],
    queryFn: () => base44.entities.CompanySettings.filter({ prestataire_id }).then(r => r[0] || null),
    staleTime: 5 * 60 * 1000,
    enabled: mode === 'prestataire' && !!prestataire_id,
  });

  if (mode === 'company') {
    return {
      vitrineData: normalizeFromCompany(csData),
      // En mode company, on expose aussi le cs brut pour que VitrineProfil
      // puisse l'utiliser là où il attend l'objet CompanySettings complet
      settingsRaw: csData || null,
      prospect: null,
      isLoading: csLoading,
    };
  }

  if (mode === 'prestataire') {
    return {
      vitrineData: normalizeFromPrestataire(prestData, prestCsData),
      settingsRaw: prestCsData || null,
      prospect: null,
      isLoading: prestLoading || prestCsLoading,
    };
  }

  // mode === 'prospect' — comportement original inchangé
  return {
    vitrineData: settings ? normalizeFromCompany(settings) : null,
    settingsRaw: settings || null,
    prospect: prospect || null,
    isLoading: false,
  };
}