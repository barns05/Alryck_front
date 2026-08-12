/**
 * resolveSignature.js — Résolveur partagé pour le Bloc Signature dynamique.
 *
 * Source unique de vérité : décide du contenu à afficher sous la photo
 * selon le type d'événement. Remplace l'ancien extractInitials() qui était
 * dupliqué à l'identique dans les 13 composants Monogram.
 *
 * Priorité :
 *   1. signature_override (si renseigné par l'organisateur) → { kind: 'text', text }
 *   2. Auto-détection selon type_evenement
 *
 * Retourne un objet discriminé :
 *   { kind: 'duo', i1, i2 }       → initiales de couple (Mariage, PACS)
 *   { kind: 'single', initial }   → initiale unique (Baptême, Communion)
 *   { kind: 'age', value }        → âge en majuscules (Anniversaire : "18 ANS")
 *   { kind: 'label', text }       → mot-clé (Gala → "GALA", Soirée → "SOIRÉE")
 *   { kind: 'text', text }        → texte libre (override manuel)
 *   null                           → rien à afficher
 *
 * SignatureContent : composant de rendu partagé qui affiche le contenu
 * selon le kind, en préservant les styles propres à chaque thème.
 */

// ── Mapping des types d'événements ──────────────────────────────────────────
const DUO_TYPES = ['Mariage', 'Pacs', 'Anniversaire de mariage'];
const SINGLE_TYPES = ['Baptême', 'Communion'];
const AGE_TYPES = ['Anniversaire'];
const LABEL_MAP = {
  'Gala': 'GALA',
  'Soirée d\'entreprise': 'SOIRÉE',
  'Séminaire': 'SÉMINAIRE',
  'Cocktail': 'COCKTAIL',
  'Fête de fin d\'année': 'FÊTE',
  'Baby shower': 'BABY',
  'Gender reveal': 'BABY',
};

/**
 * Résout le contenu du Bloc Signature.
 *
 * @param {string} nom               Nom de l'événement (ex: "Mariage Emma & Lucas")
 * @param {string} type_evenement    Type depuis l'entité Evenement
 * @param {string} signature_override Surcharge manuelle (priorité absolue)
 * @returns {object|null}            Objet discriminé ou null
 */
export function resolveSignature({ nom, type_evenement, signature_override }) {
  // 1. Override manuel — priorité absolue
  if (signature_override && signature_override.trim()) {
    return { kind: 'text', text: signature_override.trim() };
  }

  // 2. Auto-détection par type d'événement
  if (DUO_TYPES.includes(type_evenement)) {
    const duo = extractDuoInitials(nom);
    if (duo) return { kind: 'duo', ...duo };
  }

  if (SINGLE_TYPES.includes(type_evenement)) {
    const initial = extractSingleInitial(nom);
    if (initial) return { kind: 'single', initial };
  }

  if (AGE_TYPES.includes(type_evenement)) {
    const age = extractAge(nom);
    if (age) return { kind: 'age', value: `${age} ANS` };
  }

  if (type_evenement && LABEL_MAP[type_evenement]) {
    return { kind: 'label', text: LABEL_MAP[type_evenement] };
  }

  // 3. Fallback global : essayer duo, puis single
  const duo = extractDuoInitials(nom);
  if (duo) return { kind: 'duo', ...duo };

  const single = extractSingleInitial(nom);
  if (single) return { kind: 'single', initial: single };

  return null;
}

/**
 * SignatureContent — rend le contenu textuel selon le kind de la signature.
 *
 * - duo    : i1 & i2 (avec ampersand stylé via ampersandStyle)
 * - single : initial seul
 * - age / label / text : texte unique, font size réduit (×0.55) pour
 *   tenir dans le même espace visuel que les initiales de couple.
 *
 * @param {object} sig            Objet retourné par resolveSignature
 * @param {object} style          Style du span principal (font, color…)
 * @param {object} ampersandStyle Style du "&" en mode duo (optionnel)
 */
export function SignatureContent({ sig, style, ampersandStyle }) {
  if (!sig) return null;

  if (sig.kind === 'duo') {
    return (
      <span style={style}>
        {sig.i1}
        {ampersandStyle ? (
          <span style={ampersandStyle}>&</span>
        ) : (
          <>&amp;</>
        )}
        {sig.i2}
      </span>
    );
  }

  if (sig.kind === 'single') {
    return <span style={style}>{sig.initial}</span>;
  }

  // age, label, text → texte unique avec font size réduit
  const text = sig.value || sig.text || '';
  const baseSize = style?.fontSize || 40;
  return (
    <span style={{
      ...style,
      fontSize: Math.round(baseSize * 0.55),
      letterSpacing: '0.12em',
      whiteSpace: 'nowrap',
    }}>
      {text}
    </span>
  );
}

// ── Extraction interne ───────────────────────────────────────────────────────

function extractDuoInitials(nom) {
  if (!nom) return null;

  const ampParts = nom.split('&');
  if (ampParts.length === 2) {
    const leftWords = ampParts[0].trim().split(/\s+/);
    const rightWords = ampParts[1].trim().split(/\s+/);
    const name1 = leftWords[leftWords.length - 1];
    const name2 = rightWords[0];
    if (isValidName(name1) && isValidName(name2)) {
      return { i1: name1[0].toUpperCase(), i2: name2[0].toUpperCase() };
    }
  }

  const etParts = nom.split(/\s+et\s+/i);
  if (etParts.length === 2) {
    const leftWords = etParts[0].trim().split(/\s+/);
    const rightWords = etParts[1].trim().split(/\s+/);
    const name1 = leftWords[leftWords.length - 1];
    const name2 = rightWords[0];
    if (isValidName(name1) && isValidName(name2)) {
      return { i1: name1[0].toUpperCase(), i2: name2[0].toUpperCase() };
    }
  }

  return null;
}

function extractSingleInitial(nom) {
  if (!nom) return null;
  const cleaned = nom.replace(
    /^(baptême|bapteme|communion|baby\s*shower|gender\s*reveal)\s+(de\s+|d')?/i,
    ''
  ).trim();
  const words = cleaned.split(/\s+/).filter(w => isValidName(w));
  if (words.length > 0) {
    return words[0][0].toUpperCase();
  }
  return null;
}

function extractAge(nom) {
  if (!nom) return null;
  const m1 = nom.match(/\b(\d{1,3})\s*ans?\b/i);
  if (m1) return parseInt(m1[1], 10);
  const m2 = nom.match(/\b(\d{1,3})(?:ème|eme|e|er|ère)\b/i);
  if (m2) return parseInt(m2[1], 10);
  return null;
}

function isValidName(word) {
  return word && word.length >= 2 && /^[a-zA-ZÀ-ÿ]+$/.test(word);
}