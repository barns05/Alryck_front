/**
 * portalTabStore — État partagé de l'onglet premium actif de l'espace client.
 *
 * Permet à BottomNav (barre des 4 onglets en bas) et à UnifiedClientPortalTabs
 * (TabCarousel swipable) de rester synchronisés sans avoir à modifier le shell
 * ClientPortal (fichier protégé) qui les rend séparément.
 */
import { useSyncExternalStore } from 'react';

export const TAB_IDS = ['evenement', 'organisation', 'favoris', 'recherche'];

let activeTabId = 'evenement';
const listeners = new Set();

function subscribe(listener) {
  listeners.add(listener);
  return () => { listeners.delete(listener); };
}

function getSnapshot() {
  return activeTabId;
}

export function setActiveTabId(id) {
  if (!TAB_IDS.includes(id) || id === activeTabId) return;
  activeTabId = id;
  listeners.forEach(l => l());
}

export function setActiveIndex(index) {
  setActiveTabId(TAB_IDS[index]);
}

export function usePortalActiveTab() {
  return useSyncExternalStore(subscribe, getSnapshot, getSnapshot);
}