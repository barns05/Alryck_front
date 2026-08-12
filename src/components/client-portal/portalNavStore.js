/**
 * portalNavStore — Pont de navigation pour l'espace client.
 *
 * Permet aux vues secondaires (Messagerie, Médias, Documents, Alertes)
 * de demander un retour à l'accueil sans modifier le shell ClientPortal
 * (fichier protégé). BottomNav — qui possède déjà onTabChange — s'abonne
 * et déclenche le retour vers l'onglet d'origine (premium tab préservé).
 */
const backListeners = new Set();

export function subscribeBack(listener) {
  backListeners.add(listener);
  return () => { backListeners.delete(listener); };
}

export function requestBackToAccueil() {
  backListeners.forEach((l) => l());
}