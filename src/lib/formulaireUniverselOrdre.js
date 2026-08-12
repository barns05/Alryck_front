/**
 * Ordre canonique d'affichage du formulaire universel.
 * Appliqué une seule fois à la création — ne modifie jamais les données en base.
 *
 * Ordre :
 *  1. Identification client (nom, tel)
 *  2. Date
 *  3. Pivot type d'événement
 *  4. Pivot formule
 *  5. Effectifs (adultes, ados, enfants)
 *  6. Champs dynamiques "Choix — *" (menu catalogue)
 *  7. Options & Prestations groupées (options_grouped)
 *  8. Prestataires (oui, nb, fonction)
 *  9. Heures (honneur, invités)
 * 10. Spécifiques Mariage / Célébrations / Pro (f-mar-*, f-cel-*, f-pro-*)
 * 11. Communs (régimes, allergènes, déco, PMR) (f-com-*)
 * 12. Contact urgence
 * 13. Champs restants (non reconnus)
 */

const ORDRE_IDS = [
  // 1. Identification client
  'f-ident-nom',
  'f-ident-tel',
  // 2. Date
  'f-gen-date',
  // 3. Pivot type d'événement
  'f-pivot-type',
  // 4. Pivot formule
  'f-pivot-formule',
  // 5. Effectifs
  'f-gen-adultes',
  'f-gen-ados',
  'f-gen-enfants',
  // 6. Champs "Choix — *" → rang dynamique (voir getRang)
  // 7. options_grouped → rang dynamique (voir getRang)
  // 8. Prestataires
  'f-gen-prest-oui',
  'f-gen-prest-nb',
  'f-gen-prest-fn',
  // 9. Heures
  'f-gen-heure-honneur',
  'f-gen-heure-invites',
  // 10. Spécifiques Mariage (f-mar-*)
  'f-mar-contact',
  'f-mar-prog-oui',
  'f-mar-prog-detail',
  // 10. Spécifiques Célébrations (f-cel-*)
  'f-cel-honneur',
  'f-cel-surprise',
  'f-cel-complice',
  // 10. Spécifiques Pro (f-pro-*)
  'f-pro-entreprise',
  'f-pro-intitule',
  'f-pro-referent',
  'f-pro-prog-oui',
  'f-pro-prog-detail',
  // 11. Communs (f-com-*)
  'f-com-deco-oui',
  'f-com-deco-detail',
  'f-com-regime-oui',
  'f-com-regime-nb',
  'f-com-regime-detail',
  'f-com-allergie-oui',
  'f-com-allerg-prenom1',
  'f-com-allerg-aller1',
  'f-com-allerg-ajouter1',
  'f-com-allerg-prenom2',
  'f-com-allerg-aller2',
  'f-com-allerg-ajouter2',
  'f-com-allerg-prenom3',
  'f-com-allerg-aller3',
  'f-com-allerg-ajouter3',
  'f-com-allerg-prenom4',
  'f-com-allerg-aller4',
  'f-com-allerg-ajouter4',
  'f-com-allerg-prenom5',
  'f-com-allerg-aller5',
  'f-com-allerg-ajouter5',
  'f-com-allerg-prenom6',
  'f-com-allerg-aller6',
  // 12. Contact urgence
  'f-ident-urgence-nom',
  'f-ident-urgence-tel',
];

// Rang de base pour chaque ID connu (index 0-based + 100 pour laisser de la place aux rangs flottants)
const RANG_PAR_ID = Object.fromEntries(ORDRE_IDS.map((id, i) => [id, 100 + i]));

// Rangs des sections dynamiques — calés entre f-pivot-formule (104) et f-gen-prest-oui (105)
// f-pivot-formule = index 4 → rang 104
// "Choix — *" → 104.5
// options_grouped → 104.9
// f-gen-prest-oui = index 5 → rang 105
const RANG_CHOIX_DYNAMIQUE  = 104.5;
const RANG_OPTIONS_GROUPED  = 107.5;

// Rangs de fallback par préfixe (pour les champs f-mar/cel/pro/com non listés explicitement)
const RANG_FALLBACK_MAR_CEL_PRO = 900;
const RANG_FALLBACK_COM         = 950;
const RANG_FALLBACK_IDENT       = 975;
const RANG_FALLBACK_RESTE       = 9999;

function rangParPrefixe(id) {
  if (id.startsWith('f-mar-') || id.startsWith('f-cel-') || id.startsWith('f-pro-')) return RANG_FALLBACK_MAR_CEL_PRO;
  if (id.startsWith('f-com-')) return RANG_FALLBACK_COM;
  if (id.startsWith('f-ident-')) return RANG_FALLBACK_IDENT;
  return RANG_FALLBACK_RESTE;
}

function getRang(champ) {
  // ID connu explicitement
  if (RANG_PAR_ID[champ.id] !== undefined) return RANG_PAR_ID[champ.id];

  // Champs dynamiques "Choix — *" (générés par le catalogue)
  if (champ.label?.startsWith('Choix — ')) return RANG_CHOIX_DYNAMIQUE;

  // Bloc Options & Prestations groupées
  if (champ.type === 'options_grouped') return RANG_OPTIONS_GROUPED;

  // Préfixes f-* non listés explicitement
  return rangParPrefixe(champ.id || '');
}

/**
 * Trie les champs d'un formulaire universel dans l'ordre canonique.
 * Opération purement en mémoire — ne modifie pas le tableau original.
 *
 * @param {Array} champs — tableau de champs du formulaire
 * @returns {Array} nouveau tableau trié
 */
export function sortChampsUniversel(champs) {
  return [...champs].sort((a, b) => getRang(a) - getRang(b));
}