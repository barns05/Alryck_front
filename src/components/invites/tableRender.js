/**
 * tableRender — Helpers de rendu visuel d'une table sur le canvas % (0-100).
 * Aucune dépendance entité ni à invitesCount : le label (nom + sous-texte) est
 * fourni par l'appelant, ce helper ne fournit que le style du conteneur.
 *
 * Utilisé par PropositionEditor (et futurment PlanSpatialView après migration).
 */

export const TABLE_SIZE = 48; // px — taille de repli (canvas non mesuré ou très petit)
export const MIN_TABLE_PX = 25; // px — diamètre mini garanti (sinon canvas scrollable)
// Ratio visuel des tables rectangulaires (rendu réaliste de banquet : allongée).
// Ronde = base×base ; rect = base*RECT_W × base*RECT_H (base = tableRadius×2×pxPerPercent).
export const RECT_W = 1.3;
export const RECT_H = 0.46;

/**
 * computeTablePx — taille visuelle (px) d'une table à l'échelle réelle du canvas.
 * @param pxPerPercent largeurCanvasPx / 100 (échelle % → px sur l'axe horizontal)
 * @param tableRadius  demi-diamètre réel de la table en % (dimension du format)
 * @param forme         'ronde' | 'rectangulaire'
 * @returns { w, h, base } base = diamètre px (≥ MIN_TABLE_PX), w/h appliquent RECT_W/RECT_H
 */
export function computeTablePx(pxPerPercent, tableRadius, forme) {
  const base = Math.max(MIN_TABLE_PX, tableRadius * 2 * pxPerPercent);
  const isRound = (forme || 'ronde') === 'ronde';
  return { w: isRound ? base : base * RECT_W, h: isRound ? base : base * RECT_H, base };
}

/**
 * tableWrapStyle — style positionné (absolu, % centré) d'une table.
 * @param {object} pos        { x, y } en % (0-100)
 * @param {string} forme      'ronde' | 'rectangulaire'
 * @param {string} borderColor couleur de la bordure (état visuel)
 */
export function tableWrapStyle(pos, forme, borderColor, sizePx = TABLE_SIZE) {
  const isRound = (forme || 'ronde') === 'ronde';
  const w = isRound ? sizePx : sizePx * RECT_W;
  const h = isRound ? sizePx : sizePx * RECT_H;
  return {
    position: 'absolute',
    left: `${pos.x}%`,
    top: `${pos.y}%`,
    width: w,
    height: h,
    transform: 'translate(-50%, -50%)',
    borderRadius: isRound ? '9999px' : '10px',
    background: '#fff',
    border: `2px solid ${borderColor}`,
    boxShadow: '0 2px 6px rgba(30,27,75,0.15)',
    touchAction: 'none',
    cursor: 'grab',
  };
}

/**
 * tableLabelStyle — style du contenu interne (nom + sous-texte), non-sélectionnable.
 */
export function tableLabelStyle(forme, sizePx = TABLE_SIZE) {
  const isRound = (forme || 'ronde') === 'ronde';
  return {
    width: isRound ? sizePx : sizePx * RECT_W,
    height: isRound ? sizePx : sizePx * RECT_H,
    pointerEvents: 'none',
  };
}