/**
 * TabCarousel — Afficheur de l'onglet actif (plus de swipe).
 *
 * Évolution : le swipe horizontal entre les 4 onglets (Événement / Organisation /
 * Favoris / Recherche) a été retiré au profit d'une navigation exclusivement au
 * tap sur la BottomNav (qui écrit l'onglet actif dans portalTabStore). Le swipe
 * par scroll natif (overflowX + scrollLeft + drag tactile/souris + Intersection
 * Observer + scroll-snap) est supprimé :
 *  - il entrait en conflit avec le scroll horizontal des galeries photos de
 *    prestataires (un geste de balayage des photos changeait accidentellement
 *    d'onglet) ;
 *  - un ancêtre en `overflowX:auto` + `touch-action:manipulation` + snap
 *    perturbait le routage tactile des <select> natifs sur iOS Safari.
 *
 * Désormais, ce composant se contente d'afficher l'onglet actif piloté par
 * `activeIndex` (issu du store). Les onglets inactifs restent montés mais
 * masqués en `display:none` afin de préserver leur état interne (filtres
 * Annuaire, sélection Favoris, scroll, requêtes en cache) d'un changement
 * d'onglet à l'autre — comportement équivalent à l'ancien carrousel, sans
 * aucun `transform` CSS ni conteneur scrollable.
 *
 * Props (inchangées pour compatibilité avec UnifiedClientPortalTabs) :
 *   - activeIndex: number (onglet à afficher)
 *   - onIndexChange: (index) => void  (non utilisé ici — la navigation se fait au tap)
 *   - children: un enfant par onglet (dans l'ordre)
 */
import { useEffect } from 'react';

export default function TabCarousel({ activeIndex, onIndexChange, children }) {
  // ── Sécurité : ne jamais laisser `user-select: none` fuir sur <body> ─────────
  // (hérité de l'ancienne implémentation par swipe ; conservé par précaution si
  // un autre module a posé cette valeur).
  useEffect(() => {
    return () => { document.body.style.userSelect = ''; };
  }, []);

  // ── Remonte en haut de page à chaque changement d'onglet ────────────────────
  // Les onglets restent montés (display:none) pour préserver leur état interne,
  // donc le scroll vertical de la fenêtre persiste d'un onglet à l'autre. On
  // force le retour en haut quand un onglet devient actif.
  useEffect(() => {
    if (typeof window !== 'undefined') window.scrollTo(0, 0);
  }, [activeIndex]);

  const arr = Array.isArray(children) ? children : [children];
  const safeIndex = Math.max(0, Math.min(activeIndex || 0, arr.length - 1));

  return (
    <div className="tab-carousel-container">
      {arr.map((child, i) => (
        <div key={i} style={{ display: i === safeIndex ? 'block' : 'none' }}>
          {child}
        </div>
      ))}
    </div>
  );
}