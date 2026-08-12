/**
 * Capitalise le premier caractère de chaque mot
 * Ex: "jean dupont" → "Jean Dupont"
 */
export function capitalizeWords(text) {
  if (!text) return '';
  return text
    .trim()
    .split(' ')
    .map(word => word.charAt(0).toUpperCase() + word.slice(1).toLowerCase())
    .join(' ');
}

/**
 * Capitalise les noms/prénoms sur un objet client
 */
export function capitalizeClientName(client) {
  return {
    ...client,
    nom: capitalizeWords(client.nom),
    prenom: capitalizeWords(client.prenom),
    nom2: client.nom2 ? capitalizeWords(client.nom2) : undefined,
    prenom2: client.prenom2 ? capitalizeWords(client.prenom2) : undefined,
  };
}