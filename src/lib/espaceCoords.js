// Helpers de conversion % ↔ px et clamping pour le plan spatial (niveau 2)
// Toutes les coordonnées stockées (zones EspaceLieu, pos_x/pos_y des tables) sont en % (0-100).

export const clamp = (v, min = 0, max = 100) => Math.max(min, Math.min(max, v));

export const pctToPx = (pct, size) => (pct / 100) * size;

export const pxToPct = (px, size) => (size > 0 ? (px / size) * 100 : 0);

// Centre d'un ensemble de points (en %)
export const centerOf = (points) => {
  if (!points || points.length === 0) return { x: 50, y: 50 };
  const sx = points.reduce((s, p) => s + (p.x ?? 0), 0);
  const sy = points.reduce((s, p) => s + (p.y ?? 0), 0);
  return { x: sx / points.length, y: sy / points.length };
};

// Test point-in-polygon (ray casting). Renvoie true si (px,py) est dans le polygone.
export const pointInPolygon = (px, py, poly) => {
  if (!poly || poly.length < 3) return false;
  let inside = false;
  for (let i = 0, j = poly.length - 1; i < poly.length; j = i++) {
    const xi = poly[i].x ?? 0;
    const yi = poly[i].y ?? 0;
    const xj = poly[j].x ?? 0;
    const yj = poly[j].y ?? 0;
    const intersect = ((yi > py) !== (yj > py)) &&
      (px < ((xj - xi) * (py - yi)) / ((yj - yi) || 1e-9) + xi);
    if (intersect) inside = !inside;
  }
  return inside;
};

// Un point (x,y en %) est-il dans au moins une zone de l'espace ?
// Si aucune zone n'est définie, on considère tout l'espace comme disponible.
export const isPointInZones = (x, y, zones) => {
  if (!zones || zones.length === 0) return true;
  return zones.some((z) => pointInPolygon(x, y, z.points || []));
};