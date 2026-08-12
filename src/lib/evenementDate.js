/**
 * evenementDate — Helper partagé pour la gestion des dates/périodes d'événements.
 *
 * Phase 1 — socle technique. Aucune interface n'utilise encore ce helper.
 *
 * Trois modes de saisie (date_type) :
 *  - 'exacte'  : date précise connue. date = date saisie. date_mois + date_periode = null.
 *  - 'mois'    : mois approximatif (date_mois 'YYYY-MM'). date technique = `${date_mois}-01`.
 *                date_periode = null.
 *  - 'periode' : période en texte libre (date_periode). date_mois = null.
 *                date technique conservée pour tri/planning (ne jamais afficher telle quelle).
 *
 * `date` reste TOUJOURS renseignée (champ required) : c'est la date technique de travail
 * utilisée par le tri, le planning, le compte à rebours et les envois J-X.
 * Pour les modes 'mois'/'periode', cette date ne doit JAMAIS être affichée comme une
 * vraie date — utiliser formatEvenementDate() pour l'affichage.
 *
 * La confirmation est déterminée par `date_type === 'exacte'` (pas de champ date_confirmee).
 */

const MONTHS_FR = [
  'Janvier', 'Février', 'Mars', 'Avril', 'Mai', 'Juin',
  'Juillet', 'Août', 'Septembre', 'Octobre', 'Novembre', 'Décembre',
];

/**
 * Normalise les champs de date d'un événement selon date_type.
 * Nettoie les champs incompatibles et calcule la date technique quand c'est possible.
 *
 * @param {object} input - champs bruts (date_type, date, date_mois, date_periode)
 * @returns {object} - { date_type, date, date_mois, date_periode } nettoyés
 *
 * Règles :
 *  - 'exacte'  : on garde `date`, on efface `date_mois` et `date_periode`.
 *  - 'mois'    : on garde `date_mois`, on calcule `date = ${date_mois}-01`, on efface `date_periode`.
 *  - 'periode' : on garde `date_periode`, on efface `date_mois`.
 *                La date technique : si `date_mois` fourni on l'utilise (`${date_mois}-01`),
 *                sinon on conserve la `date` existante (champ required, jamais passée à null).
 *                On n'invente pas de date arbitraire sans mois disponible — voir compte-rendu.
 */
export function normalizeEvenementDate(input = {}) {
  const dateType = input.date_type || 'exacte';

  switch (dateType) {
    case 'exacte': {
      return {
        date_type: 'exacte',
        date: input.date || null,
        date_mois: null,
        date_periode: null,
      };
    }

    case 'mois': {
      const mois = input.date_mois || null;
      let date = null;
      if (mois && /^\d{4}-\d{2}$/.test(mois)) {
        date = `${mois}-01`;
      } else if (input.date) {
        // date_mois invalide mais date existante : on conserve la date technique
        date = input.date;
      }
      return {
        date_type: 'mois',
        date,
        date_mois: mois,
        date_periode: null,
      };
    }

    case 'periode': {
      let date = null;
      // Si un mois est disponible (saisie optionnelle en mode periode), on l'utilise
      // comme base technique `${date_mois}-01`.
      if (input.date_mois && /^\d{4}-\d{2}$/.test(input.date_mois)) {
        date = `${input.date_mois}-01`;
      } else if (input.date) {
        // Pas de mois disponible : on conserve la date technique existante (required).
        // On n'invente pas de date arbitraire — cas à signaler (voir compte-rendu).
        date = input.date;
      }
      return {
        date_type: 'periode',
        date,
        date_mois: null, // en mode periode pur, date_mois n'est pas stocké
        date_periode: input.date_periode || null,
      };
    }

    default: {
      // date_type inconnu / legacy : on conserve tout tel quel (défensif)
      return {
        date_type: 'exacte',
        date: input.date || null,
        date_mois: input.date_mois || null,
        date_periode: input.date_periode || null,
      };
    }
  }
}

/**
 * Formate la date d'un événement pour l'affichage utilisateur.
 *
 * @param {object} evenement - entité Evenement (ou objet partiel)
 * @returns {object} { type, label, secondary, isConfirmed }
 *
 *  - exacte  → { type: 'exacte', label: '15 août 2027', secondary: null, isConfirmed: true }
 *  - mois    → { type: 'mois',   label: 'Août 2027',    secondary: 'Date exacte à confirmer', isConfirmed: false }
 *  - periode → { type: 'periode',label: 'Été 2027',     secondary: 'Date exacte à confirmer', isConfirmed: false }
 */
export function formatEvenementDate(evenement = {}) {
  const dateType = evenement.date_type || 'exacte';

  // Mode MOIS — label depuis date_mois (YYYY-MM)
  if (dateType === 'mois') {
    const mois = evenement.date_mois;
    let label = 'Mois à préciser';
    if (mois && /^\d{4}-\d{2}$/.test(mois)) {
      const [year, m] = mois.split('-');
      const idx = parseInt(m, 10) - 1;
      label = idx >= 0 && idx < 12 ? `${MONTHS_FR[idx]} ${year}` : mois;
    }
    return {
      type: 'mois',
      label,
      secondary: 'Date exacte à confirmer',
      isConfirmed: false,
    };
  }

  // Mode PERIODE — label depuis date_periode (texte libre)
  if (dateType === 'periode') {
    return {
      type: 'periode',
      label: evenement.date_periode?.trim() || 'Période à préciser',
      secondary: 'Date exacte à confirmer',
      isConfirmed: false,
    };
  }

  // Mode EXACTE (par défaut) — label depuis date
  const dateStr = evenement.date;
  if (!dateStr) {
    return {
      type: 'exacte',
      label: 'Date à définir',
      secondary: null,
      isConfirmed: false,
    };
  }

  let label = dateStr;
  try {
    const d = new Date(dateStr + 'T12:00:00');
    if (!isNaN(d.getTime())) {
      label = d.toLocaleDateString('fr-FR', {
        day: 'numeric', month: 'long', year: 'numeric',
      });
    }
  } catch { /* fallback chaîne brute */ }

  return {
    type: 'exacte',
    label,
    secondary: null,
    isConfirmed: true,
  };
}

/**
 * Indique si la date de l'événement est exacte (confirmée).
 * La confirmation = date_type === 'exacte'.
 */
export function isEvenementDateExacte(evenement = {}) {
  return (evenement.date_type || 'exacte') === 'exacte';
}

/**
 * Retourne la date technique de travail (pour tri, planning, J-X).
 * JAMAIS à afficher telle quelle quand date_type !== 'exacte' — utiliser formatEvenementDate().
 *
 * @param {object} evenement
 * @returns {string|null} date ISO YYYY-MM-DD
 */
export function getEvenementTechnicalDate(evenement = {}) {
  return evenement.date || null;
}