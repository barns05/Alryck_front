/**
 * bibliothequeArticles.js — Helper d'insertion d'un article de la bibliothèque
 * dans le contenu_dynamique d'un modèle.
 *
 * Ajoute l'article à la fin du texte, sous un séparateur clair (inséré une seule
 * fois). Les articles suivants s'accumulent dessous. Aucune comparaison, aucun
 * diagnostic — insertion purement mécanique.
 */

export const SEPARATOR_BIBLIOTHEQUE = '\n\n--- Articles ajoutés depuis la bibliothèque ---\n\n';

export function appendArticleToText(texte, article) {
  const articleText = `${article.titre}\n\n${article.corps}`;
  if (texte.includes(SEPARATOR_BIBLIOTHEQUE)) {
    return texte + '\n\n' + articleText;
  }
  return texte + SEPARATOR_BIBLIOTHEQUE + articleText;
}