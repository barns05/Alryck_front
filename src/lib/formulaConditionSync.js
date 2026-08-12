/**
 * Synchronisation des conditions entre BibliothequeQuestion et ModeleFormulaire
 * Quand une question BibliothequeQuestion est modifiée, met à jour les ModeleFormulaire existants
 */

/**
 * Met à jour les conditions d'un ModeleFormulaire quand une BibliothequeQuestion change
 * @param {Object} modeleFormulaire - Le modèle à mettre à jour
 * @param {Object} questionModifiee - La question BibliothequeQuestion qui a changé
 * @param {string} questionIdOriginal - L'ID original de la question dans BibliothequeQuestion
 * @returns {Object|null} - Le modèle mis à jour, ou null si aucune modification
 */
export function syncQuestionChangesToModele(modeleFormulaire, questionModifiee, questionIdOriginal) {
  if (!modeleFormulaire.champs || modeleFormulaire.champs.length === 0) {
    return null;
  }

  // Trouver le champ dans le modèle qui correspond à cette question
  const champIndex = modeleFormulaire.champs.findIndex(c => {
    // Matching par label (plus stable que l'ID puisque l'ID change entre BibliothequeQuestion et ModeleFormulaire)
    return c.label === questionModifiee.label;
  });

  if (champIndex === -1) {
    return null; // Cette question n'est pas dans ce modèle
  }

  const champ = modeleFormulaire.champs[champIndex];
  
  // ─── Mettre à jour le champ ───
  const champsUpdated = [...modeleFormulaire.champs];
  champsUpdated[champIndex] = {
    ...champ,
    description: questionModifiee.description,
    type: questionModifiee.type,
    obligatoire: questionModifiee.obligatoire,
    options: questionModifiee.options || [],
    // ⚠️ Les conditions restent inchangées car les IDs du formulaire sont fixes
    // (les déclencheurs continuent de pointer vers les mêmes champs du formulaire)
    conditions: champ.conditions,
  };

  return {
    ...modeleFormulaire,
    champs: champsUpdated,
  };
}

/**
 * Recalcule les conditions d'un ModeleFormulaire après un changement massif
 * Utile si on change la liste des questions de base
 * @param {Array} modeles - Liste des ModeleFormulaire à vérifier
 * @param {Array} questions - Nouvelle liste de BibliothequeQuestion
 * @returns {Array} - Liste des modèles à mettre à jour
 */
export function findModelsNeedingRecalc(modeles, questions) {
  // Actuellement, on ne recalcule pas les conditions (elles restent figées)
  // Mais on pourrait détecter les modèles qui contiennent des champs dont les déclencheurs n'existent plus
  const modelsToUpdate = [];

  modeles.forEach(modele => {
    const hasOrphanConditions = (modele.champs || []).some(champ => {
      return (champ.conditions || []).some(cond => {
        // Vérifier si le déclencheur existe dans la liste des champs
        return !modele.champs.find(c => c.id === cond.champ_declencheur_id);
      });
    });

    if (hasOrphanConditions) {
      modelsToUpdate.push(modele.id);
    }
  });

  return modelsToUpdate;
}