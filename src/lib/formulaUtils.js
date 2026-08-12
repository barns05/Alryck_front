/**
 * Utility pour la logique de formules.
 * Single Source of Truth : formules_associees seul.
 */

/**
 * Détermine si un article est pertinent pour une formule donnée.
 * @param {Object} article - Article du catalogue
 * @param {string} formulaName - Nom de la formule
 * @returns {boolean} true si article s'applique à cette formule
 */
export const isRelevantForFormula = (article, formulaName) => {
  const fa = article?.formules_associees;
  if (!fa || fa.length === 0) return true; // Array vide = toutes les formules
  return fa.includes(formulaName);
};

/**
 * Récupère tous les articles pertinents pour une formule.
 * @param {Array} articles - Tous les articles du catalogue
 * @param {string} formulaName - Nom de la formule
 * @returns {Array} Articles filtrés
 */
export const getArticlesForFormula = (articles, formulaName) => {
  return (articles || []).filter(a => isRelevantForFormula(a, formulaName));
};

/**
 * Récupère les articles "partagés" (toutes les formules).
 * @param {Array} articles - Tous les articles du catalogue
 * @returns {Array} Articles sans restriction de formule
 */
export const getSharedArticles = (articles) => {
  return (articles || []).filter(a => !a.formules_associees || a.formules_associees.length === 0);
};

/**
 * Récupère les articles spécifiques à une formule (pas partagés).
 * @param {Array} articles - Tous les articles du catalogue
 * @param {string} formulaName - Nom de la formule
 * @returns {Array} Articles exclusifs à cette formule
 */
export const getSpecificArticles = (articles, formulaName) => {
  return (articles || []).filter(a => 
    a.formules_associees && a.formules_associees.length > 0 && a.formules_associees.includes(formulaName)
  );
};