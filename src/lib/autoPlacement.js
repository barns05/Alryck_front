/**
 * autoPlacement — Placement automatique simplifié des tables sur un EspaceLieu.
 * Approche : grille régulière filtrée (pas un solveur d'optimisation).
 *
 * Pour chaque point de grille (gauche→droite, haut→bas) on vérifie :
 *  - qu'il est dans une zone 'table' (ou dans tout l'espace si aucune zone table définie)
 *  - qu'il n'est pas dans une zone 'exclusion'
 *  - qu'il garde une marge (clearance) autour des zones d'exclusion (anneau de test)
 *  - qu'il ne chevauche pas une table déjà placée
 *
 * On collecte TOUTES les positions valides de la grille (jusqu'à 500), puis on
 * renvoie un sous-ensemble réparti uniformément (sampleEvenly) si count < total,
 * afin que les tables ne s'accumulent pas dans le coin haut-gauche.
 */
import { pointInPolygon } from './espaceCoords';

const TABLE_RADIUS = 4; // % — demi-diamètre d'une table ronde sur le canvas
const MARGIN = 2;       // % — marge mini entre tables / zones exclues
const RING_STEPS = 12;  // nb de points testés sur le cercle de marge

export function computeAutoPlacement({
  zones = [],
  count,
  tableRadius = TABLE_RADIUS,
  margin = MARGIN,
  existingPositions = [],
}) {
  const tableZones = zones.filter((z) => (z.categorie || 'table') === 'table');
  const exclusionZones = zones.filter((z) => z.categorie === 'exclusion');

  // Bounding box du périmètre "table" (ou tout l'espace si aucune zone table)
  let minX = 0;
  let minY = 0;
  let maxX = 100;
  let maxY = 100;
  if (tableZones.length > 0) {
    const pts = tableZones.flatMap((z) => z.points || []);
    if (pts.length) {
      minX = Math.min(...pts.map((p) => p.x));
      minY = Math.min(...pts.map((p) => p.y));
      maxX = Math.max(...pts.map((p) => p.x));
      maxY = Math.max(...pts.map((p) => p.y));
    }
  }

  const step = tableRadius * 2 + margin;
  const clearance = tableRadius + margin;
  const positions = [];

  const inAnyExclusion = (x, y) =>
    exclusionZones.some((z) => pointInPolygon(x, y, z.points || []));

  const tooCloseToExclusion = (x, y) => {
    for (let a = 0; a < 360; a += 360 / RING_STEPS) {
      const rad = (a * Math.PI) / 180;
      const rx = x + clearance * Math.cos(rad);
      const ry = y + clearance * Math.sin(rad);
      if (inAnyExclusion(rx, ry)) return true;
    }
    return false;
  };

  const tooCloseToExisting = (x, y) =>
    existingPositions.some((p) => Math.hypot(p.x - x, p.y - y) < tableRadius * 2 + margin);

  // Le disque entier de la table doit rester dans la zone table (centre + 4 cardinaux).
  const inTablePt = (x, y) =>
    tableZones.length === 0 ? true : tableZones.some((z) => pointInPolygon(x, y, z.points || []));
  const circleInTable = (x, y) =>
    inTablePt(x, y) &&
    inTablePt(x - tableRadius, y) && inTablePt(x + tableRadius, y) &&
    inTablePt(x, y - tableRadius) && inTablePt(x, y + tableRadius);

  const MAX_SCAN = 500; // limite de sécurité (grille généralement < 100 points)
  scan:
  for (let y = minY + clearance; y <= maxY - clearance; y += step) {
    for (let x = minX + clearance; x <= maxX - clearance; x += step) {
      if (!circleInTable(x, y)) continue;
      if (inAnyExclusion(x, y)) continue;
      if (tooCloseToExclusion(x, y)) continue;
      if (tooCloseToExisting(x, y)) continue;
      positions.push({ x: Math.round(x * 10) / 10, y: Math.round(y * 10) / 10 });
      if (positions.length >= MAX_SCAN) break scan;
    }
  }
  return sampleEvenly(positions, count);
}

/**
 * sampleEvenly — Renvoie `count` positions réparties uniformément dans la liste
 * ordonnée `positions` (échantillonnage à intervalle régulier sur l'index).
 * Comme la grille est générée ligne par ligne, cet échantillonnage approxime une
 * bonne répartition spatiale sur toute la salle plutôt que dans un coin.
 */
export function sampleEvenly(positions, count) {
  const total = positions.length;
  if (count == null || count >= total) return positions.slice();
  if (count <= 0) return [];
  if (count === 1) return [positions[Math.floor((total - 1) / 2)]];
  const result = [];
  for (let i = 0; i < count; i++) {
    const idx = Math.round((i * (total - 1)) / (count - 1));
    result.push(positions[idx]);
  }
  return result;
}

/**
 * generateGridLayout — Placement des tables en une vraie grille alignée
 * (rangées × colonnes), centrée dans le périmètre « table » de l'espace.
 *
 * - cols/rows choisis pour obtenir une grille aussi « carrée » que possible
 *   par rapport au ratio largeur/hauteur de la salle.
 * - espacement régulier centré : colonne i → minX + (i+1)×W/(cols+1),
 *   rangée j → minY + (j+1)×H/(rows+1) — marges égales de chaque côté.
 * - remplissage row-major ; la dernière rangée incomplète est centrée
 *   horizontalement (pas calée à gauche).
 * - chaque position idéale est validée (zone table, hors exclusion + marge,
 *   hors tables déjà placées). Si invalide (ex : tombe dans une zone
 *   d'exclusion « Piste de danse »), recherche locale en spirale autour de
 *   l'idéale ; en dernier recours, filet de sécurité via computeAutoPlacement
 *   (point valide le plus proche).
 *
 * computeAutoPlacement / sampleEvenly sont conservés comme filet de sécurité.
 */
export function generateGridLayout({
  zones = [],
  count,
  tableRadius = TABLE_RADIUS,
  margin = MARGIN,
  existingPositions = [],
  forme = 'ronde',
}) {
  if (count == null || count <= 0) return [];

  const tableZones = zones.filter((z) => (z.categorie || 'table') === 'table');
  const exclusionZones = zones.filter((z) => z.categorie === 'exclusion');

  let minX = 0;
  let minY = 0;
  let maxX = 100;
  let maxY = 100;
  if (tableZones.length > 0) {
    const pts = tableZones.flatMap((z) => z.points || []);
    if (pts.length) {
      minX = Math.min(...pts.map((p) => p.x));
      minY = Math.min(...pts.map((p) => p.y));
      maxX = Math.max(...pts.map((p) => p.x));
      maxY = Math.max(...pts.map((p) => p.y));
    }
  }
  const W = Math.max(1, maxX - minX);
  const H = Math.max(1, maxY - minY);
  const clearance = tableRadius + margin;
  const stepSpacing = tableRadius * 2 + margin;
  // Bornes utilisables rétrécies de tableRadius + margin sur chaque bord :
  // garantit que le disque entier de chaque table reste dans la zone table.
  const innerMinX = minX + clearance;
  const innerMaxX = maxX - clearance;
  const innerMinY = minY + clearance;
  const innerMaxY = maxY - clearance;

  // Distance minimale centre à centre entre deux tables pour éviter tout
  // chevauchement (avec marge). Plus large pour les tables rectangulaires
  // (forme allongée) afin d'éviter des collisions superflues en espace ouvert.
  const isRect = forme === 'rectangulaire';
  const minSpacing = (isRect ? tableRadius * 2.5 : tableRadius * 2) + margin;

  // Plafonner cols à floor(W/minSpacing) puis réduire jusqu'à ce que l'espacement
  // réel de la grille (colGap = W/(cols+1)) ≥ minSpacing : garantit l'absence de
  // chevauchement entre colonnes voisines d'une même rangée, même loin des zones
  // d'exclusion. Si count dépasse cols×rows possible avec cet espacement garanti,
  // rows grandit (la revalidation par colonne gère les résidus verticaux) plutôt
  // que de resserrer les colonnes sous le minimum.
  let maxCols = Math.max(1, Math.floor(W / minSpacing));
  while (maxCols > 1 && W / (maxCols + 1) < minSpacing - 1e-9) maxCols--;

  // Grille idéale centrée (calculée tôt : utilisé par resolvePosition).
  const ratio = W / H;
  let cols = Math.max(1, Math.ceil(Math.sqrt(count * ratio)));
  cols = Math.min(cols, maxCols);
  cols = Math.max(1, cols);
  const rows = Math.max(1, Math.ceil(count / cols));
  const colGap = W / (cols + 1);
  const rowGap = H / (rows + 1);

  const inAnyExclusion = (x, y) =>
    exclusionZones.some((z) => pointInPolygon(x, y, z.points || []));
  const inTable = (x, y) =>
    tableZones.length === 0 ? true : tableZones.some((z) => pointInPolygon(x, y, z.points || []));
  // Disque entier dans la zone table : centre + 4 points cardinaux (gère les contours concaves).
  const circleInTable = (x, y) =>
    inTable(x, y) &&
    inTable(x - tableRadius, y) && inTable(x + tableRadius, y) &&
    inTable(x, y - tableRadius) && inTable(x, y + tableRadius);
  const tooCloseToExclusion = (x, y) => {
    for (let a = 0; a < 360; a += 360 / RING_STEPS) {
      const rad = (a * Math.PI) / 180;
      if (inAnyExclusion(x + clearance * Math.cos(rad), y + clearance * Math.sin(rad))) return true;
    }
    return false;
  };

  const placed = (existingPositions || []).map((p) => ({ x: p.x, y: p.y }));
  const tooCloseToPlaced = (x, y) =>
    placed.some((p) => Math.hypot(p.x - x, p.y - y) < tableRadius * 2 + margin);
  const isValid = (x, y) =>
    x >= innerMinX && x <= innerMaxX && y >= innerMinY && y <= innerMaxY &&
    circleInTable(x, y) && !inAnyExclusion(x, y) && !tooCloseToExclusion(x, y) && !tooCloseToPlaced(x, y);

  const clamp = (v, lo, hi) => Math.max(lo, Math.min(hi, v));
  const round = (v) => Math.round(v * 10) / 10;

  const resolvePosition = (ix, iy) => {
    const ideal = { x: round(clamp(ix, innerMinX, innerMaxX)), y: round(clamp(iy, innerMinY, innerMaxY)) };
    if (isValid(ideal.x, ideal.y)) return ideal;
    // 1) Décalage horizontal uniquement (même y) : préserve l'alignement de la rangée.
    for (let mult = 1; mult <= cols + 1; mult++) {
      for (const dir of [-1, 1]) {
        const cx = clamp(ix + dir * mult * colGap, innerMinX, innerMaxX);
        const cand = { x: round(cx), y: ideal.y };
        if (isValid(cand.x, cand.y)) return cand;
      }
    }
    // 2) Recherche locale en spirale (anneaux de rayon croissant).
    for (let ring = 1; ring <= 8; ring++) {
      const rr = ring * stepSpacing;
      const points = 8 * ring;
      for (let k = 0; k < points; k++) {
        const ang = (k / points) * 2 * Math.PI;
        const cx = clamp(ix + rr * Math.cos(ang), innerMinX, innerMaxX);
        const cy = clamp(iy + rr * Math.sin(ang), innerMinY, innerMaxY);
        const cand = { x: round(cx), y: round(cy) };
        if (isValid(cand.x, cand.y)) return cand;
      }
    }
    // Filet de sécurité : point valide le plus proche issu du balayage grille.
    const grid = computeAutoPlacement({ zones, count: 500, tableRadius, margin, existingPositions: placed });
    if (grid.length === 0) return null;
    let best = grid[0];
    let bestD = Infinity;
    for (const g of grid) {
      const d = Math.hypot(g.x - ix, g.y - iy);
      if (d < bestD) { bestD = d; best = g; }
    }
    return best;
  };

  const pushPos = (pos) => {
    if (!pos) return false;
    result.push(pos);
    placed.push(pos);
    return true;
  };

  const result = [];

  /**
   * resolveRow — place une rangée en groupe pour préserver la symétrie quand
   * plusieurs colonnes tombent dans une exclusion. Les colonnes bloquées sont
   * appariées à leur miroir (par rapport au centre de la rangée) puis placées
   * symétriquement en center±D (D croissant) jusqu'à validité simultanée des
   * deux ; la colonne centrale impaire restante va à la position valide la
   * plus proche du centre. Repli spirale + filet si la rangée ne suffit pas.
   */
  const resolveRow = (colXs, iy) => {
    const y = round(clamp(iy, innerMinY, innerMaxY));
    const center = minX + W / 2;
    const n = colXs.length;
    const rowRes = [];
    const ideals = colXs.map((ix) => ({ x: round(clamp(ix, innerMinX, innerMaxX)), y }));

    // Bornes utilisables rétrécies (disque entier dans la zone table) :
    // le clamp garantit qu'aucune table ne s'aligne sur le mur brut du périmètre.
    const eClamp = (v) => round(Math.max(innerMinX, Math.min(innerMaxX, v)));

    // 1) Colonnes bloquées (brutes) + symétrisation par miroir dans la rangée.
    const rawBlocked = new Set();
    ideals.forEach((p, idx) => { if (!isValid(p.x, p.y)) rawBlocked.add(idx); });
    const B = new Set(rawBlocked);
    for (const k of rawBlocked) B.add(n - 1 - k);

    // 2) Placer les colonnes valides UNE PAR UNE dans l'ordre, en revalidant à
    //    chaque placement contre le placed cumulatif (inclut les colonnes déjà
    //    placées dans cette même rangée). placed est mis à jour immédiatement
    //    après chaque placement effectif. Une colonne trop proche d'une voisine
    //    déjà placée (colGap < minSpacing ou décalage spiral) devient bloquée
    //    et passe par la logique de décalage/appairage symétrique (étape 3).
    const placedInRow = new Set();
    for (let k = 0; k < n; k++) {
      if (B.has(k)) continue;
      const p = ideals[k];
      if (isValid(p.x, p.y)) {
        placed.push(p); rowRes.push(p); placedInRow.add(k);
      } else {
        B.add(k); // devenue bloquée par proximité d'une voisine de la même rangée
      }
    }

    // 3) Apparier les bloquées en miroirs (intérieur→extérieur) ; placement symétrique center±D.
    //    Si le miroir est déjà placé valide (placedInRow), on ne le déplace pas :
    //    on résout uniquement la colonne bloquée via resolvePosition (pas de doublon).
    const blockedList = [...B].sort((a, b) => ideals[a].x - ideals[b].x);
    const paired = new Set();
    for (const k of blockedList) {
      if (paired.has(k)) continue;
      const m = n - 1 - k;
      if (m === k) continue; // colonne centrale (impaire) traitée plus bas
      if (placedInRow.has(m)) {
        paired.add(k);
        const f = resolvePosition(ideals[k].x, iy);
        if (f) { placed.push(f); rowRes.push(f); }
        continue;
      }
      paired.add(k); paired.add(m);
      const baseD = Math.max(Math.abs(ideals[k].x - center), Math.abs(ideals[m].x - center));
      let ok = false;
      for (let step = 0; step <= cols + 3; step++) {
        const D = baseD + step * colGap;
        const lx = eClamp(center - D);
        const rx = eClamp(center + D);
        if (isValid(lx, y) && isValid(rx, y) && Math.abs(lx - rx) >= tableRadius * 2) {
          const pl = { x: lx, y };
          const pr = { x: rx, y };
          placed.push(pl); placed.push(pr);
          rowRes.push(pl); rowRes.push(pr);
          ok = true;
          break;
        }
      }
      if (!ok) {
        const fl = resolvePosition(ideals[k].x, iy);
        if (fl) { placed.push(fl); rowRes.push(fl); }
        const fr = resolvePosition(ideals[m].x, iy);
        if (fr) { placed.push(fr); rowRes.push(fr); }
      }
    }

    // 4) Colonne centrale bloquée (impaire) : position valide la plus proche du centre.
    for (const k of blockedList) {
      if (paired.has(k)) continue;
      paired.add(k);
      let ok = false;
      for (let step = 0; step <= cols + 3; step++) {
        const D = step * colGap;
        const cands = step === 0 ? [eClamp(center)] : [eClamp(center - D), eClamp(center + D)];
        for (const cx of cands) {
          if (isValid(cx, y)) {
            const p = { x: cx, y };
            placed.push(p); rowRes.push(p);
            ok = true;
            break;
          }
        }
        if (ok) break;
      }
      if (!ok) {
        const f = resolvePosition(ideals[k].x, iy);
        if (f) { placed.push(f); rowRes.push(f); }
      }
    }

    return rowRes;
  };

  // Cas particulier : 1 table → centre de la salle.
  if (count === 1) {
    const p = resolvePosition(minX + W / 2, minY + H / 2);
    pushPos(p);
    return result;
  }

  const fullRows = Math.floor(count / cols);
  const remainder = count - fullRows * cols;

  // Rangées pleines (row-major), puis dernière rangée incomplète centrée.
  for (let j = 0; j < fullRows; j++) {
    const iy = minY + (j + 1) * rowGap;
    const colXs = [];
    for (let i = 0; i < cols; i++) colXs.push(minX + (i + 1) * colGap);
    resolveRow(colXs, iy).forEach((p) => result.push(p));
  }
  if (remainder > 0 && result.length < count) {
    const offset = Math.floor((cols - remainder) / 2);
    const j = fullRows;
    const iy = minY + (j + 1) * rowGap;
    const colXs = [];
    for (let k = 0; k < remainder; k++) colXs.push(minX + (offset + k + 1) * colGap);
    resolveRow(colXs, iy).forEach((p) => result.push(p));
  }

  return result;
}