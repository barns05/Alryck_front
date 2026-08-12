/**
 * exportPlanDeSallePDF — Export PDF du PLAN SPATIAL de la salle (vue plan).
 *
 * Reproduit l'écran « Vue plan » de PlanSalleScreen :
 *  - contour/zones de l'EspaceLieu (zones « table » + zones d'exclusion hachurées
 *    avec leur nom) mis à l'échelle de la page,
 *  - chaque TableEvenement dessinée à sa position réelle (pos_x/pos_y), forme
 *    ronde/rectangulaire + taille relative (dimension × croissance capacité),
 *  - nom de la table (numéro + nom perso) au centre,
 *  - prénoms des invités assignés répartis autour de la table dans l'ordre
 *    chronologique d'assignation (helper tableSeating.js — même logique que
 *    l'écran et le PDF « Mon plan de table »).
 *
 * Cohérence visuelle avec exportPlanDeTablePDF (palette NAVY/GOLD, header bandeau,
 * footer alryck + cristal). A4 paysage, jsPDF.
 */
import { jsPDF } from 'jspdf';
import { tableDisplayName } from '@/lib/tableName';
import { sortInvitesByAssignation, seatAngles } from '@/lib/tableSeating';

const CRYSTAL_URL = 'https://media.base44.com/images/public/69b804640546049d1a7bf53a/add7d9f16_file_00000000baa0724695dea66812e6a844.png';

const NAVY  = [30, 27, 75];
const WHITE = [255, 255, 255];
const LGRAY = [248, 249, 252];
const MGRAY = [107, 114, 128];
const DGRAY = [55, 65, 81];
const GOLD  = [180, 140, 30];
const EXCL_FILL = [229, 231, 235];   // gris clair exclusion
const EXCL_HATCH = [148, 163, 184];  // gris hachure
const TABLE_FILL = [199, 210, 254]; // indigo clair table
const TABLE_STROKE = NAVY;

const CAP_REF = 6;
const MAX_CAP_GROWTH = 1.6;

async function loadImageAsDataURL(url) {
  try {
    const resp = await fetch(url);
    const blob = await resp.blob();
    return new Promise(resolve => {
      const reader = new FileReader();
      reader.onloadend = () => resolve(reader.result);
      reader.onerror = () => resolve(null);
      reader.readAsDataURL(blob);
    });
  } catch { return null; }
}

function drawStar(doc, cx, cy, r, color) {
  doc.setDrawColor(...color); doc.setLineWidth(0.5);
  for (let i = 0; i < 5; i++) {
    const a1 = (i * 72 - 90) * Math.PI / 180;
    const a2 = ((i * 72 + 36) - 90) * Math.PI / 180;
    const a3 = ((i * 72 + 72) - 90) * Math.PI / 180;
    doc.line(cx + r * Math.cos(a1), cy + r * Math.sin(a1), cx + r * 0.38 * Math.cos(a2), cy + r * 0.38 * Math.sin(a2));
    doc.line(cx + r * 0.38 * Math.cos(a2), cy + r * 0.38 * Math.sin(a2), cx + r * Math.cos(a3), cy + r * Math.sin(a3));
  }
}

function drawCalIcon(doc, cx, cy, sz, color) {
  doc.setDrawColor(...color); doc.setLineWidth(0.5);
  const hw = sz * 0.5, hh = sz * 0.45;
  doc.rect(cx - hw, cy - hh * 0.6, hw * 2, hh * 1.5, 'S');
  doc.line(cx - hw, cy - hh * 0.15, cx + hw, cy - hh * 0.15);
  doc.line(cx - hw * 0.3, cy - hh * 0.85, cx - hw * 0.3, cy - hh * 0.45);
  doc.line(cx + hw * 0.3, cy - hh * 0.85, cx + hw * 0.3, cy - hh * 0.45);
}

// Hachures horizontales à l'intérieur d'un polygone (scanline) — robuste pour
// polygones concaves. Dessine un segment sur deux pour l'effet hachuré.
function scanlineHatch(doc, pts, spacing, color, lw) {
  if (!pts || pts.length < 3) return;
  doc.setDrawColor(...color); doc.setLineWidth(lw);
  const ys = pts.map(p => p.y);
  const minY = Math.min(...ys), maxY = Math.max(...ys);
  let row = 0;
  for (let y = minY; y <= maxY; y += spacing, row++) {
    if (row % 2 !== 0) continue; // une ligne sur deux → hachure
    const xs = [];
    for (let i = 0; i < pts.length; i++) {
      const a = pts[i], b = pts[(i + 1) % pts.length];
      const y1 = a.y, y2 = b.y;
      if ((y1 <= y && y < y2) || (y2 <= y && y < y1)) {
        const t = (y - y1) / (y2 - y1);
        xs.push(a.x + t * (b.x - a.x));
      }
    }
    xs.sort((a, b) => a - b);
    for (let i = 0; i + 1 < xs.length; i += 2) {
      doc.line(xs[i], y, xs[i + 1], y);
    }
  }
}

// Polygone (vecteurs delta cumulés) — remplit/trace une zone fermée.
function drawPoly(doc, pts, style) {
  const d = [];
  for (let i = 0; i < pts.length; i++) {
    const a = pts[i], b = pts[(i + 1) % pts.length];
    d.push([b.x - a.x, b.y - a.y]);
  }
  doc.lines(d, pts[0].x, pts[0].y, [1, 1], style, true);
}

function addFooter(doc, PW, PH, crystalData, pageNum, totalPages) {
  const M = 14;
  const lineY = PH - 16;
  const baseY = PH - 9;
  doc.setDrawColor(210, 210, 220); doc.setLineWidth(0.25);
  doc.line(M, lineY, PW - M, lineY);
  doc.setFontSize(7); doc.setFont(undefined, 'normal'); doc.setTextColor(...MGRAY);
  doc.text('alryck.com', M, baseY);
  doc.text(`Page ${pageNum} / ${totalPages}`, PW / 2, baseY, { align: 'center' });
  const logoSize = 14;
  const logoY = lineY + (PH - lineY - logoSize) / 2 + 1;
  if (crystalData) {
    doc.addImage(crystalData, 'PNG', PW - M - logoSize, logoY, logoSize, logoSize);
  } else {
    drawStar(doc, PW - M - 5, baseY - 1.5, 3, NAVY);
  }
}

export async function exportPlanDeSallePDF({ espace, tables, invites, evenementNom, evenementDate, coverUrl }) {
  const doc = new jsPDF({ orientation: 'landscape', unit: 'mm', format: 'a4' });
  const crystalData = await loadImageAsDataURL(CRYSTAL_URL);
  const PW = doc.internal.pageSize.getWidth();
  const PH = doc.internal.pageSize.getHeight();
  const M = 14;
  const CW = PW - M * 2;
  const FOOTER_SAFE = 24;

  doc.setFillColor(...WHITE);
  doc.rect(0, 0, PW, PH, 'F');

  // ── HEADER (bandeau) ── compact en paysage pour maximiser la hauteur de dessin
  const BANNER_H = 50;
  let coverData = null;
  if (coverUrl) coverData = await loadImageAsDataURL(coverUrl);
  if (coverData) {
    const props = doc.getImageProperties(coverData);
    const iA = props.width / props.height;
    const bA = PW / BANNER_H;
    let dW, dH, dX, dY;
    if (iA > bA) { dH = BANNER_H; dW = BANNER_H * iA; dX = -(dW - PW) / 2; dY = 0; }
    else { dW = PW; dH = PW / iA; dX = 0; dY = -(dH - BANNER_H) / 2; }
    doc.addImage(coverData, 'JPEG', dX, dY, dW, dH, undefined, 'FAST');
  } else {
    doc.setFillColor(...NAVY);
    doc.rect(0, 0, PW, BANNER_H, 'F');
  }
  // Assombrissement renforcé + dégradé sombre en bas du bandeau (zone texte)
  // pour garantir la lisibilité du blanc sur toutes les photos de couverture.
  doc.setFillColor(0, 0, 0);
  doc.setGState(doc.GState({ opacity: 0.55 }));
  doc.rect(0, 0, PW, BANNER_H, 'F');
  const SCRIM_TOP = BANNER_H * 0.32;
  const BANDS = 10;
  const bandH = (BANNER_H - SCRIM_TOP) / BANDS;
  for (let i = 0; i < BANDS; i++) {
    doc.setGState(doc.GState({ opacity: 0.05 + (i / (BANDS - 1)) * 0.45 }));
    doc.rect(0, SCRIM_TOP + i * bandH, PW, bandH + 0.5, 'F');
  }
  doc.setGState(doc.GState({ opacity: 1 }));

  // Badge « PLAN DE SALLE »
  doc.setFillColor(...WHITE);
  doc.roundedRect(M, 7, 58, 6.5, 2.5, 2.5, 'F');
  doc.setFontSize(6.5); doc.setFont(undefined, 'bold'); doc.setTextColor(...NAVY);
  doc.text('PLAN DE SALLE', M + 29, 11.7, { align: 'center' });

  // Titre de l'événement — proportionné pour le bandeau compact paysage
  doc.setTextColor(...WHITE); doc.setFontSize(20); doc.setFont(undefined, 'bold');
  const nomLines = doc.splitTextToSize(evenementNom || 'Événement', CW - 4);
  nomLines.forEach((line, i) => doc.text(line, M, 21 + i * 7.5));
  const afterName = 21 + nomLines.length * 7.5;

  doc.setDrawColor(...GOLD); doc.setLineWidth(1);
  doc.line(M, afterName + 1, M + 22, afterName + 1);

  if (evenementDate) {
    const dateStr = new Date(evenementDate + 'T12:00:00').toLocaleDateString('fr-FR', {
      weekday: 'long', day: 'numeric', month: 'long', year: 'numeric',
    });
    const dy = afterName + 6;
    drawCalIcon(doc, M + 2.5, dy, 2.6, [210, 215, 240]);
    doc.setFontSize(8.5); doc.setFont(undefined, 'normal'); doc.setTextColor(225, 228, 248);
    doc.text(dateStr, M + 7, dy + 1.4);
  }
  if (espace?.nom) {
    doc.setFontSize(8); doc.setFont(undefined, 'italic'); doc.setTextColor(225, 228, 248);
    doc.text(`Espace : ${espace.nom}`, PW - M, afterName + 6, { align: 'right' });
  }

  doc.setFillColor(...WHITE);
  doc.rect(0, BANNER_H, PW, PH - BANNER_H, 'F');

  // ── ZONE DE DESSIN (salle à l'échelle) ──
  const yStart = BANNER_H + 6;
  const availH = PH - yStart - FOOTER_SAFE - 6;
  const largeur = espace?.largeur || 100;
  const hauteur = espace?.hauteur || 70;
  const aspect = largeur / hauteur;
  let drawW = CW, drawH = CW / aspect;
  if (drawH > availH) { drawH = availH; drawW = availH * aspect; }
  const salleX = M + (CW - drawW) / 2;
  const salleY = yStart + (availH - drawH) / 2;
  const scaleX = drawW / 100; // x % → mm (les tables restent rondes via scaleX)
  const scaleY = drawH / 100;
  const mapX = (x) => salleX + (x / 100) * drawW;
  const mapY = (y) => salleY + (y / 100) * drawH;

  // Cadre de la salle
  doc.setDrawColor(...NAVY); doc.setLineWidth(0.5); doc.setFillColor(...LGRAY);
  doc.roundedRect(salleX - 1, salleY - 1, drawW + 2, drawH + 2, 1.5, 1.5, 'FD');

  // Zones
  const zones = espace?.zones || [];
  zones.forEach((z) => {
    const pts = (z.points || []).map((p) => ({ x: mapX(p.x), y: mapY(p.y) }));
    if (pts.length < 3) return;
    const isExcl = z.categorie === 'exclusion';
    if (isExcl) {
      doc.setFillColor(...EXCL_FILL); doc.setGState(doc.GState({ opacity: 0.55 }));
      drawPoly(doc, pts, 'F');
      doc.setGState(doc.GState({ opacity: 1 }));
      scanlineHatch(doc, pts, 1.6, EXCL_HATCH, 0.2);
      doc.setDrawColor(...EXCL_HATCH); doc.setLineWidth(0.3); doc.setLineDashPattern([1.2, 0.8], 0);
      drawPoly(doc, pts, 'S');
      doc.setLineDashPattern([], 0);
    } else {
      doc.setFillColor(...TABLE_FILL); doc.setGState(doc.GState({ opacity: 0.4 }));
      drawPoly(doc, pts, 'F');
      doc.setGState(doc.GState({ opacity: 1 }));
      doc.setDrawColor(...NAVY); doc.setLineWidth(0.3);
      drawPoly(doc, pts, 'S');
    }
    if (z.nom) {
      // centroïde approximatif
      const cx = pts.reduce((s, p) => s + p.x, 0) / pts.length;
      const cy = pts.reduce((s, p) => s + p.y, 0) / pts.length;
      doc.setFontSize(isExcl ? 7 : 6.5); doc.setFont(undefined, 'bold');
      doc.setTextColor(...(isExcl ? EXCL_HATCH : NAVY));
      const label = z.nom.length > 16 ? z.nom.slice(0, 15) + '…' : z.nom;
      doc.text(label, cx, cy + 1, { align: 'center' });
    }
  });

  // ── TABLES placées ──
  const placed = (tables || []).filter((t) => t.pos_x != null && t.pos_y != null);
  const baseRadiusPct = (t) => t.dimension || ((t.forme || 'ronde') === 'rectangulaire' ? 6 : 4);
  const radiusPct = (t) => {
    const base = baseRadiusPct(t);
    const cap = t.capacite;
    if (!cap || cap <= 0) return base;
    return base * Math.min(MAX_CAP_GROWTH, Math.sqrt(cap / CAP_REF));
  };

  placed.forEach((t) => {
    const cx = mapX(t.pos_x);
    const cy = mapY(t.pos_y);
    const rPct = radiusPct(t);
    const diam = 2 * rPct * scaleX; // mm
    const isRound = (t.forme || 'ronde') === 'ronde';
    const r = diam / 2;

    // Corps de la table
    doc.setFillColor(...WHITE);
    doc.setDrawColor(...TABLE_STROKE); doc.setLineWidth(0.4);
    if (isRound) {
      doc.circle(cx, cy, Math.max(1.5, r), 'FD');
    } else {
      const w = diam * 1.3, h = diam * 0.46;
      doc.roundedRect(cx - w / 2, cy - h / 2, w, h, 0.6, 0.6, 'FD');
    }

    // Nom de la table au centre
    const label = tableDisplayName(t);
    const maxLabelChars = Math.max(4, Math.floor(diam / 1.7));
    const dispLabel = label.length > maxLabelChars ? label.slice(0, maxLabelChars - 1) + '…' : label;
    doc.setFontSize(Math.min(7, Math.max(4, diam / 3.2))); doc.setFont(undefined, 'bold'); doc.setTextColor(...NAVY);
    doc.text(dispLabel, cx, cy + 0.5, { align: 'center' });

    // Invités assignés autour (ordre chronologique d'assignation)
    const list = (invites || []).filter((i) => i.table_attribuee === t.id);
    if (list.length === 0 || diam < 9) return; // trop petit → on garde le seul nom
    const sorted = sortInvitesByAssignation(list);
    const seats = Math.max(t.capacite || list.length, list.length, 1);
    const angles = seatAngles(seats);
    const nameR = r + 2.2;
    const maxLen = seats > 14 ? 6 : seats > 8 ? 9 : 12;
    doc.setFontSize(4.8); doc.setFont(undefined, 'bold'); doc.setTextColor(...DGRAY);
    angles.forEach((a, i) => {
      if (i >= sorted.length) return;
      const nx = cx + nameR * Math.cos(a);
      const ny = cy + nameR * Math.sin(a);
      const inv = sorted[i];
      const name = `${inv.prenom || ''}`.trim();
      const disp = name.length > maxLen ? name.slice(0, maxLen - 1) + '…' : name;
      // petit point champagne à la place assise
      const chx = cx + r * Math.cos(a);
      const chy = cy + r * Math.sin(a);
      doc.setFillColor(...GOLD); doc.setDrawColor(...NAVY); doc.setLineWidth(0.15);
      doc.circle(chx, chy, 0.7, 'FD');
      const cos = Math.cos(a);
      const align = cos > 0.2 ? 'left' : cos < -0.2 ? 'right' : 'center';
      const dx = cos * 0.8, dy = 0.8;
      doc.text(disp, nx + dx, ny + dy, { align });
    });
  });

  // Légende
  const legY = salleY + drawH + 4;
  if (legY < PH - FOOTER_SAFE - 4) {
    doc.setFontSize(6); doc.setFont(undefined, 'normal'); doc.setTextColor(...MGRAY);
    let lx = salleX;
    doc.setFillColor(...TABLE_FILL); doc.setGState(doc.GState({ opacity: 0.5 }));
    doc.rect(lx, legY, 3, 1.6, 'F'); doc.setGState(doc.GState({ opacity: 1 }));
    doc.text('Zone de table', lx + 4, legY + 1.2);
    lx += 30;
    doc.setFillColor(...EXCL_FILL); doc.setGState(doc.GState({ opacity: 0.7 }));
    doc.rect(lx, legY, 3, 1.6, 'F'); doc.setGState(doc.GState({ opacity: 1 }));
    scanlineHatch(doc, [{ x: lx, y: legY }, { x: lx + 3, y: legY }, { x: lx + 3, y: legY + 1.6 }, { x: lx, y: legY + 1.6 }], 0.7, EXCL_HATCH, 0.15);
    doc.text('Zone d\'exclusion', lx + 4, legY + 1.2);
    lx += 32;
    doc.setFillColor(...GOLD); doc.circle(lx + 1.5, legY + 0.8, 0.7, 'F');
    doc.text('Invité assigné', lx + 4, legY + 1.2);
  }

  // ── FOOTER ──
  const totalPages = doc.getNumberOfPages();
  for (let p = 1; p <= totalPages; p++) {
    doc.setPage(p);
    addFooter(doc, PW, PH, crystalData, p, totalPages);
  }

  const dateFn = new Date().toISOString().slice(0, 10);
  const fileName = `plan_de_salle_${(evenementNom || 'evenement').replace(/\s+/g, '_')}_${dateFn}.pdf`;
  return { blob: doc.output('blob'), fileName };
}