/**
 * Moteur d'évaluation des conditions — source unique de vérité
 * Utilisé dans : mode test, espace client, simulateur
 */

/**
 * Évalue si une condition est satisfaite
 * @param {Object} condition - { champ_declencheur_id, operateur, valeur, action }
 * @param {Object} reponses - { [champ_id]: value }
 * @returns {boolean}
 */
export function evaluateCondition(condition, reponses) {
  if (!condition.champ_declencheur_id) return false;

  const valeurActuelle = reponses[condition.champ_declencheur_id];

  // Pas de valeur = condition non satisfaite (par défaut on affiche/masque selon l'action)
  if (valeurActuelle === undefined || valeurActuelle === null || valeurActuelle === '') {
    return false;
  }

  const cond = String(condition.valeur).trim();

  // Gestion des tableaux (cases_a_cocher)
  if (Array.isArray(valeurActuelle)) {
    const stringVals = valeurActuelle.map(v => String(v).trim().toLowerCase());
    const condLower = cond.toLowerCase();

    switch (condition.operateur) {
      case 'egal':
        return valeurActuelle.includes(cond);
      case 'different':
        return !valeurActuelle.includes(cond);
      case 'contient':
        return stringVals.some(v => v.includes(condLower));
      case 'superieur':
        return Math.max(...valeurActuelle.map(v => Number(v))) > Number(cond);
      case 'inferieur':
        return Math.min(...valeurActuelle.map(v => Number(v))) < Number(cond);
      default:
        return false;
    }
  }

  // Gestion des valeurs simples
  const val = String(valeurActuelle).trim().toLowerCase();
  const condLower = cond.toLowerCase();

  switch (condition.operateur) {
    case 'egal':
      return val === condLower;
    case 'different':
      return val !== condLower;
    case 'superieur':
      return Number(val) > Number(cond);
    case 'inferieur':
      return Number(val) < Number(cond);
    case 'contient':
      return val.includes(condLower);
    default:
      return false;
  }
}

/**
 * Détermine si un champ doit être visible
 *
 * Logique :
 *  - Les conditions "masquer" sont évaluées en AND : si l'une est vraie → masqué
 *  - Les conditions "afficher" groupées par champ_declencheur_id sont évaluées en OR :
 *    si au moins une condition "afficher" pour un même déclencheur est vraie → groupe OK
 *    Tous les groupes (déclencheurs distincts) doivent être OK → AND inter-groupes
 *
 * @param {Object} champ - { id, label, conditions[], ... }
 * @param {Object} reponses - { [champ_id]: value }
 * @param {boolean} debug - Log verbose
 * @returns {boolean}
 */
export function isChampVisible(champ, reponses, debug = false) {
  if (!champ.conditions || champ.conditions.length === 0) {
    return true;
  }

  // Séparer masquer / afficher
  const condsMasquer = champ.conditions.filter(c => c.action === 'masquer' && c.champ_declencheur_id);
  const condsAfficher = champ.conditions.filter(c => c.action === 'afficher' && c.champ_declencheur_id);

  // "masquer" : AND — si l'une est satisfaite → invisible
  for (const condition of condsMasquer) {
    if (evaluateCondition(condition, reponses)) {
      if (debug) console.log(`[Condition MASQUER] "${champ.label}" → masqué`);
      return false;
    }
  }

  // "afficher" : grouper par champ_declencheur_id → OR intra-groupe, AND inter-groupes
  if (condsAfficher.length > 0) {
    // Grouper par déclencheur
    const groupes = {};
    for (const cond of condsAfficher) {
      const key = cond.champ_declencheur_id;
      if (!groupes[key]) groupes[key] = [];
      groupes[key].push(cond);
    }

    for (const [declencheurId, conditionsGroupe] of Object.entries(groupes)) {
      // OR au sein du groupe : au moins une doit être satisfaite
      const groupeOk = conditionsGroupe.some(cond => evaluateCondition(cond, reponses));
      if (debug) {
        console.log(`[Condition AFFICHER] "${champ.label}" | Déclencheur: ${declencheurId} | GroupeOK: ${groupeOk}`);
      }
      if (!groupeOk) return false;
    }
  }

  return true;
}

/**
 * Filtre les champs visibles selon les réponses actuelles
 * @param {Array} champs - Tous les champs du formulaire
 * @param {Object} reponses - Réponses actuelles
 * @returns {Array} Champs visibles
 */
export function filterChampsVisibles(champs, reponses, debug = false) {
  return champs.filter(champ => isChampVisible(champ, reponses, debug));
}