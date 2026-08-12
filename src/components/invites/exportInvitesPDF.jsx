/**
 * exportInvitesPDF — Export PDF premium ALRYCK
 * Adaptatif : colonne Table, bloc Allergies, bloc Hébergement, pagination.
 * Architecture plate : chaque personne = une ligne indépendante.
 */
import { jsPDF } from 'jspdf';

const CRYSTAL_URL = 'https://media.base44.com/images/public/69b804640546049d1a7bf53a/add7d9f16_file_00000000baa0724695dea66812e6a844.png';

// ─── Couleurs ────────────────────────────────────────────────────────────────
const NAVY   = [30, 27, 75];
const WHITE  = [255, 255, 255];
const LGRAY  = [248, 249, 252];
const MGRAY  = [107, 114, 128];
const DGRAY  = [55, 65, 81];
const GREEN  = [22, 163, 74];
const ORANGE = [234, 88, 12];
const RED    = [190, 18, 60];
const VIOLET = [109, 40, 217];
const BLUE   = [37, 99, 235];
const GOLD   = [180, 140, 30];
const PINK   = [255, 241, 242];
const LBLUE  = [239, 246, 255];

// ─── Allergènes ──────────────────────────────────────────────────────────────
const ALLERGENE_LABELS = {
  gluten: 'Gluten', crustaces: 'Crustacés', oeufs: 'Oeufs', poissons: 'Poissons',
  arachides: 'Arachides', soja: 'Soja', lait: 'Lait', fruits_coque: 'Fruits à coque',
  celeri: 'Céleri', moutarde: 'Moutarde', sesame: 'Sésame', sulfites: 'Sulfites',
  lupin: 'Lupin', mollusques: 'Mollusques',
};
function labelAllergene(id) { return ALLERGENE_LABELS[id] || id; }
function labelsAllergenes(ids) { return (ids || []).map(labelAllergene); }

// ─── Icônes vectorielles ─────────────────────────────────────────────────────
function drawCheck(doc, cx, cy, r, color) {
  doc.setDrawColor(...color); doc.setFillColor(...WHITE); doc.setLineWidth(0.4);
  doc.circle(cx, cy, r, 'FD');
  doc.setDrawColor(...color); doc.setLineWidth(0.8);
  doc.line(cx - r*0.42, cy+0.1, cx - r*0.1, cy + r*0.42);
  doc.line(cx - r*0.1, cy + r*0.42, cx + r*0.48, cy - r*0.35);
}
function drawCross(doc, cx, cy, r, color) {
  doc.setDrawColor(...color); doc.setFillColor(...WHITE); doc.setLineWidth(0.4);
  doc.circle(cx, cy, r, 'FD');
  doc.setLineWidth(0.7);
  doc.line(cx - r*0.38, cy - r*0.38, cx + r*0.38, cy + r*0.38);
  doc.line(cx + r*0.38, cy - r*0.38, cx - r*0.38, cy + r*0.38);
}
function drawClock(doc, cx, cy, r, color) {
  doc.setDrawColor(...color); doc.setFillColor(...WHITE); doc.setLineWidth(0.4);
  doc.circle(cx, cy, r, 'FD');
  doc.setLineWidth(0.6);
  doc.line(cx, cy, cx, cy - r*0.52);
  doc.line(cx, cy, cx + r*0.38, cy);
}
function drawPeopleIcon(doc, cx, cy, sz, color) {
  doc.setFillColor(...color);
  doc.circle(cx - sz*0.28, cy - sz*0.28, sz*0.2, 'F');
  doc.ellipse(cx - sz*0.28, cy + sz*0.1, sz*0.3, sz*0.2, 'F');
  doc.circle(cx + sz*0.28, cy - sz*0.28, sz*0.2, 'F');
  doc.ellipse(cx + sz*0.28, cy + sz*0.1, sz*0.3, sz*0.2, 'F');
}
function drawPerson(doc, cx, cy, sz, color) {
  doc.setFillColor(...color);
  doc.circle(cx, cy - sz*0.28, sz*0.22, 'F');
  doc.ellipse(cx, cy + sz*0.12, sz*0.32, sz*0.22, 'F');
}
function drawLeaf(doc, cx, cy, sz, color) {
  doc.setFillColor(...color);
  doc.ellipse(cx, cy - sz*0.05, sz*0.42, sz*0.28, 'F');
  doc.setDrawColor(...WHITE); doc.setLineWidth(0.4);
  doc.line(cx - sz*0.35, cy + sz*0.2, cx + sz*0.35, cy - sz*0.2);
}
function drawCalIcon(doc, cx, cy, sz, color) {
  doc.setDrawColor(...color); doc.setLineWidth(0.5);
  const hw = sz*0.5, hh = sz*0.45;
  doc.rect(cx - hw, cy - hh*0.6, hw*2, hh*1.5, 'S');
  doc.line(cx - hw, cy - hh*0.15, cx + hw, cy - hh*0.15);
  doc.line(cx - hw*0.3, cy - hh*0.85, cx - hw*0.3, cy - hh*0.45);
  doc.line(cx + hw*0.3, cy - hh*0.85, cx + hw*0.3, cy - hh*0.45);
}
function drawBed(doc, cx, cy, sz, color) {
  doc.setDrawColor(...color); doc.setLineWidth(0.5);
  doc.rect(cx - sz*0.55, cy - sz*0.1, sz*1.1, sz*0.5, 'S');
  doc.line(cx - sz*0.55, cy - sz*0.1, cx - sz*0.55, cy - sz*0.45);
  doc.line(cx - sz*0.55, cy - sz*0.45, cx + sz*0.1, cy - sz*0.45);
  doc.line(cx + sz*0.1, cy - sz*0.45, cx + sz*0.1, cy - sz*0.1);
}
function drawStar(doc, cx, cy, r, color) {
  doc.setDrawColor(...color); doc.setLineWidth(0.5);
  for (let i = 0; i < 5; i++) {
    const a1 = (i*72 - 90) * Math.PI / 180;
    const a2 = ((i*72 + 36) - 90) * Math.PI / 180;
    const a3 = ((i*72 + 72) - 90) * Math.PI / 180;
    doc.line(cx + r*Math.cos(a1), cy + r*Math.sin(a1), cx + r*0.38*Math.cos(a2), cy + r*0.38*Math.sin(a2));
    doc.line(cx + r*0.38*Math.cos(a2), cy + r*0.38*Math.sin(a2), cx + r*Math.cos(a3), cy + r*Math.sin(a3));
  }
}

// ─── Image ───────────────────────────────────────────────────────────────────
async function loadImageAsDataURL(url) {
  try {
    const resp = await fetch(url);
    const blob = await resp.blob();
    return new Promise(resolve => {
      const reader = new FileReader();
      reader.onloadend = () => resolve(reader.result);
      reader.onerror  = () => resolve(null);
      reader.readAsDataURL(blob);
    });
  } catch { return null; }
}

// ─── Stats ───────────────────────────────────────────────────────────────────
function computeStats(invites) {
  const conf = invites.filter(i => i.statut_rsvp === 'Confirmé' || i.statut_rsvp === 'Partiel');
  return {
    total:        invites.length,
    confirmes:    conf.length,
    attente:      invites.filter(i => !i.statut_rsvp || i.statut_rsvp === 'En attente').length,
    absents:      invites.filter(i => i.statut_rsvp === 'Absent').length,
    adultes:      invites.filter(i => i.categorie !== 'Mineur').length,
    mineurs:      invites.filter(i => i.categorie === 'Mineur').length,
    adultes_conf: conf.filter(i => i.categorie !== 'Mineur').length,
    mineurs_conf: conf.filter(i => i.categorie === 'Mineur').length,
  };
}

// ─── Footer fixe avec pagination (identique sur toutes les pages) ─────────────
// Positionné dans la safe area basse — géométrie constante, jamais de chevauchement.
function addFooter(doc, PW, PH, crystalData, pageNum, totalPages) {
  const M  = 14;
  const lineY = PH - 16;     // trait séparateur fixe
  const baseY = PH - 9;      // ligne de référence verticale des éléments

  // Trait séparateur
  doc.setDrawColor(210, 210, 220); doc.setLineWidth(0.25);
  doc.line(M, lineY, PW - M, lineY);

  // Gauche — alryck.com
  doc.setFontSize(7); doc.setFont(undefined, 'normal'); doc.setTextColor(...MGRAY);
  doc.text('alryck.com', M, baseY);

  // Centre — pagination
  doc.setFontSize(7); doc.setFont(undefined, 'normal'); doc.setTextColor(...MGRAY);
  doc.text(`Page ${pageNum} / ${totalPages}`, PW / 2, baseY, { align: 'center' });

  // Droite — logo cristal centré verticalement sur le footer
  const logoSize = 14;
  const logoY = lineY + (PH - lineY - logoSize) / 2 + 1;
  if (crystalData) {
    doc.addImage(crystalData, 'PNG', PW - M - logoSize, logoY, logoSize, logoSize);
  } else {
    drawStar(doc, PW - M - 5, baseY - 1.5, 3, NAVY);
  }
}

// ─── Safe area basse réservée au footer (jamais de contenu en dessous) ────────
const FOOTER_SAFE = 26; // mm réservés en bas de chaque page pour le footer
const CONTENT_TOP = 16; // position Y de reprise en haut de page

// Saut de page si la ligne courante dépasse la zone de contenu
function checkPage(doc, y, PH, PW) {
  if (y > PH - FOOTER_SAFE) {
    doc.addPage();
    doc.setFillColor(...WHITE);
    doc.rect(0, 0, PW, PH, 'F');
    return CONTENT_TOP;
  }
  return y;
}

// Saut de page anticipé si un bloc de hauteur `blockH` ne tient pas entièrement
function checkPageBlock(doc, y, blockH, PH, PW) {
  if (y + blockH > PH - FOOTER_SAFE) {
    doc.addPage();
    doc.setFillColor(...WHITE);
    doc.rect(0, 0, PW, PH, 'F');
    return CONTENT_TOP;
  }
  return y;
}

// ─── Section titre ───────────────────────────────────────────────────────────
function drawSectionTitle(doc, label, x, y, PW, M, color) {
  doc.setFontSize(9); doc.setFont(undefined, 'bold'); doc.setTextColor(...color);
  doc.text(label, x, y + 3.5);
  const tw = doc.getStringUnitWidth(label) * 9 / doc.internal.scaleFactor;
  doc.setDrawColor(200, 200, 218); doc.setLineWidth(0.3);
  doc.line(x + tw + 4, y + 2, PW - M, y + 2);
}

// ─── Export principal ────────────────────────────────────────────────────────
export async function exportInvitesPDF({ invites, evenementNom, evenementDate, coverUrl, couleurTheme, lieuNom, filterMoment }) {
  const doc = new jsPDF({ orientation: 'portrait', unit: 'mm', format: 'a4' });
  const crystalData = await loadImageAsDataURL(CRYSTAL_URL);
  const PW = doc.internal.pageSize.getWidth();
  const PH = doc.internal.pageSize.getHeight();
  const M  = 14;
  const CW = PW - M * 2;

  // ── Page 1 fond blanc ──
  doc.setFillColor(...WHITE);
  doc.rect(0, 0, PW, PH, 'F');

  // ══════════════════════════════════════════════════════════════════════════
  // 1. HEADER
  // ══════════════════════════════════════════════════════════════════════════
  const BANNER_H = 68;
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

  // Overlay sombre 45%
  doc.setFillColor(0, 0, 0);
  doc.setGState(doc.GState({ opacity: 0.45 }));
  doc.rect(0, 0, PW, BANNER_H, 'F');
  doc.setGState(doc.GState({ opacity: 1 }));

  // Badge pill
  doc.setFillColor(...WHITE);
  doc.roundedRect(M, 8, 50, 7, 3, 3, 'F');
  doc.setFontSize(6.5); doc.setFont(undefined, 'bold'); doc.setTextColor(...NAVY);
  doc.text('LISTE DES INVITES', M + 25, 13, { align: 'center' });

  // Nom événement
  doc.setTextColor(...WHITE); doc.setFontSize(22); doc.setFont(undefined, 'bold');
  const nomLines = doc.splitTextToSize(evenementNom || 'Evenement', CW - 4);
  nomLines.forEach((line, i) => doc.text(line, M, 28 + i * 9));
  const afterName = 28 + nomLines.length * 9;

  // Trait doré
  doc.setDrawColor(...GOLD); doc.setLineWidth(1);
  doc.line(M, afterName + 1, M + 22, afterName + 1);

  // Date
  const dateStr = evenementDate
    ? new Date(evenementDate + 'T12:00:00').toLocaleDateString('fr-FR', { weekday: 'long', day: 'numeric', month: 'long', year: 'numeric' })
    : '';
  if (dateStr) {
    const dy = afterName + 8;
    drawCalIcon(doc, M + 2.5, dy, 2.8, [210, 215, 240]);
    doc.setFontSize(9); doc.setFont(undefined, 'normal'); doc.setTextColor(225, 228, 248);
    doc.text(dateStr, M + 7, dy + 1.5);
  }
  if (lieuNom) {
    doc.setFontSize(8.5); doc.setFont(undefined, 'normal'); doc.setTextColor(200, 205, 230);
    doc.text(lieuNom, M + 3, afterName + 17);
  }

  // Fond blanc sous le header
  doc.setFillColor(...WHITE);
  doc.rect(0, BANNER_H, PW, PH - BANNER_H, 'F');

  let y = BANNER_H + 7;

  // ══════════════════════════════════════════════════════════════════════════
  // 2. STATS
  // ══════════════════════════════════════════════════════════════════════════
  const stats = computeStats(invites);
  const CARD_W = CW / 6;
  const CARD_H = 23;

  doc.setFillColor(...WHITE); doc.setDrawColor(220, 222, 235); doc.setLineWidth(0.3);
  doc.roundedRect(M, y, CW, CARD_H, 2, 2, 'FD');
  for (let i = 1; i < 6; i++) {
    doc.setDrawColor(228, 230, 240);
    doc.line(M + CARD_W * i, y + 4, M + CARD_W * i, y + CARD_H - 4);
  }

  const CARDS = [
    { label: 'Invites\nau total', val: stats.total,    col: NAVY,   icon: (d,cx,cy) => drawPeopleIcon(d,cx,cy,3.5,NAVY) },
    { label: 'Confirmes',        val: stats.confirmes, col: GREEN,  icon: (d,cx,cy) => drawCheck(d,cx,cy,2.8,GREEN) },
    { label: 'En attente',       val: stats.attente,   col: ORANGE, icon: (d,cx,cy) => drawClock(d,cx,cy,2.8,ORANGE) },
    { label: 'Absents',          val: stats.absents,   col: RED,    icon: (d,cx,cy) => drawCross(d,cx,cy,2.8,RED) },
    { label: 'Adultes',          val: stats.adultes,   col: NAVY,   icon: (d,cx,cy) => drawPerson(d,cx,cy,3.5,NAVY) },
    { label: 'Mineurs',          val: stats.mineurs,   col: NAVY,   icon: (d,cx,cy) => drawPerson(d,cx,cy,2.8,NAVY) },
  ];
  CARDS.forEach((card, i) => {
    const cx = M + CARD_W * i + CARD_W / 2;
    card.icon(doc, cx, y + 5.5);
    doc.setFontSize(15); doc.setFont(undefined, 'bold'); doc.setTextColor(...card.col);
    doc.text(String(card.val), cx, y + 14.5, { align: 'center' });
    doc.setFontSize(5.8); doc.setFont(undefined, 'normal'); doc.setTextColor(...MGRAY);
    card.label.split('\n').forEach((l, li) => doc.text(l, cx, y + 18.5 + li * 3, { align: 'center' }));
  });

  y += CARD_H + 7;

  // ══════════════════════════════════════════════════════════════════════════
  // 3. TABLEAU DES INVITÉS
  // ══════════════════════════════════════════════════════════════════════════

  // Déduplication
  const STATUT_RANK = { 'Confirmé': 4, 'Partiel': 3, 'Peut-être': 2, 'Peut-etre': 2, 'En attente': 1, 'Absent': 0 };
  const personMap = {};
  invites.forEach(inv => {
    const key = `${(inv.prenom || '').trim().toLowerCase()}|${(inv.nom || '').trim().toLowerCase()}`;
    const invMoments = inv.moments_noms?.length ? inv.moments_noms : inv.moment_nom ? [inv.moment_nom] : [];
    if (!personMap[key]) {
      personMap[key] = { ...inv, _moments: invMoments };
    } else {
      const ex = personMap[key];
      invMoments.forEach(mn => { if (!ex._moments.includes(mn)) ex._moments.push(mn); });
      if ((STATUT_RANK[inv.statut_rsvp] || 0) > (STATUT_RANK[ex.statut_rsvp] || 0)) ex.statut_rsvp = inv.statut_rsvp;
      if (inv.allergenes?.length) ex.allergenes = [...new Set([...(ex.allergenes || []), ...inv.allergenes])];
      if (inv.regime_alimentaire && !ex.regime_alimentaire) ex.regime_alimentaire = inv.regime_alimentaire;
      if (inv.table_attribuee && !ex.table_attribuee) ex.table_attribuee = inv.table_attribuee;
    }
  });
  const invitesDedups = Object.values(personMap).sort((a, b) =>
    `${a.nom} ${a.prenom}`.localeCompare(`${b.nom} ${b.prenom}`, 'fr')
  );

  // Décider si colonne Table est utile
  const showTable = invitesDedups.some(i => i.table_attribuee);

  // Colonnes dynamiques selon showPresenta + showTable
  const showPresenta = !filterMoment;

  // Calcul des positions de colonnes
  let COL;
  if (showPresenta && showTable) {
    COL = { nom: M+3, statut: M+48, pres: M+83, grp: M+120, cat: M+144, table: M+168 };
  } else if (showPresenta && !showTable) {
    COL = { nom: M+3, statut: M+48, pres: M+83, grp: M+127, cat: M+160 };
  } else if (!showPresenta && showTable) {
    COL = { nom: M+3, statut: M+58, grp: M+100, cat: M+135, table: M+163 };
  } else {
    COL = { nom: M+3, statut: M+60, grp: M+108, cat: M+148 };
  }

  const STATUT_CFG = {
    'Confirmé':   { col: GREEN,  txt: 'Confirme',  icon: (d,cx,cy) => drawCheck(d,cx,cy,2,GREEN) },
    'Partiel':    { col: ORANGE, txt: 'Partiel',    icon: (d,cx,cy) => drawClock(d,cx,cy,2,ORANGE) },
    'En attente': { col: ORANGE, txt: 'En attente', icon: (d,cx,cy) => drawClock(d,cx,cy,2,ORANGE) },
    'Absent':     { col: RED,    txt: 'Absent',     icon: (d,cx,cy) => drawCross(d,cx,cy,2,RED) },
    'Peut-être':  { col: VIOLET, txt: 'Peut-etre',  icon: () => {} },
    'Peut-etre':  { col: VIOLET, txt: 'Peut-etre',  icon: () => {} },
  };

  // Titre section
  y = checkPage(doc, y, PH, PW);
  drawSectionTitle(doc, 'LISTE DES INVITES', M, y, PW, M, NAVY);
  doc.setFontSize(7.5); doc.setFont(undefined, 'normal'); doc.setTextColor(...MGRAY);
  doc.text(`${invitesDedups.length} personne${invitesDedups.length > 1 ? 's' : ''}`, PW - M, y + 3.5, { align: 'right' });
  y += 9;

  // En-têtes tableau
  y = checkPage(doc, y, PH, PW);
  doc.setFillColor(...NAVY);
  doc.roundedRect(M, y, CW, 7, 2.5, 2.5, 'F');
  doc.setFontSize(6.5); doc.setFont(undefined, 'bold'); doc.setTextColor(...WHITE);
  doc.text('NOM ET PRENOM', COL.nom, y + 4.8);
  doc.text('STATUT',        COL.statut, y + 4.8);
  if (showPresenta) doc.text('PRESENT A', COL.pres, y + 4.8);
  doc.text('GROUPE', COL.grp, y + 4.8);
  doc.text('TYPE',   COL.cat, y + 4.8);
  if (showTable) { drawCalIcon(doc, COL.table + 1.5, y + 3.5, 2, WHITE); doc.text('TABLE', COL.table + 6, y + 4.8); }
  y += 7;

  // Lignes
  invitesDedups.forEach((inv, rowIdx) => {
    y = checkPage(doc, y, PH, PW);
    const rowH = 8;
    doc.setFillColor(...(rowIdx % 2 === 0 ? WHITE : LGRAY));
    doc.rect(M, y, CW, rowH, 'F');
    doc.setDrawColor(235, 236, 245); doc.setLineWidth(0.2);
    doc.line(M, y + rowH, M + CW, y + rowH);

    // Nom
    doc.setFontSize(8); doc.setFont(undefined, 'bold'); doc.setTextColor(...NAVY);
    const fullName = `${inv.prenom} ${inv.nom}`;
    doc.text(fullName.length > 20 ? fullName.slice(0, 18) + '…' : fullName, COL.nom, y + 5.2);

    // Statut
    const st  = inv.statut_rsvp || 'En attente';
    const cfg = STATUT_CFG[st] || STATUT_CFG['En attente'];
    cfg.icon(doc, COL.statut + 2.5, y + 4);
    doc.setFontSize(7); doc.setFont(undefined, 'normal'); doc.setTextColor(...cfg.col);
    doc.text(cfg.txt, COL.statut + 6.5, y + 5.2);

    // Présent à
    if (showPresenta) {
      const moments = inv._moments || [];
      const momStr = moments.length === 0 ? 'Tous' : moments.join(' • ');
      const maxW = (COL.grp || COL.cat) - COL.pres - 4;
      if (moments.length > 0) {
        const pillW = Math.min(doc.getStringUnitWidth(momStr) * 6.5 / doc.internal.scaleFactor + 4, maxW);
        doc.setFillColor(238, 242, 255);
        doc.roundedRect(COL.pres, y + 1.8, pillW, 4.5, 2, 2, 'F');
        doc.setFontSize(6.5); doc.setTextColor(67, 56, 202);
        const momDisp = momStr.length > 22 ? momStr.slice(0, 20) + '…' : momStr;
        doc.text(momDisp, COL.pres + 2, y + 5.2);
      } else {
        doc.setFontSize(7); doc.setTextColor(200, 205, 220);
        doc.text('Tous', COL.pres, y + 5.2);
      }
    }

    // Groupe
    if (inv.groupe) {
      const grpStr = inv.groupe.slice(0, 10);
      const grpW = Math.min(doc.getStringUnitWidth(grpStr) * 7 / doc.internal.scaleFactor + 4, 22);
      doc.setFillColor(240, 244, 255);
      doc.roundedRect(COL.grp, y + 1.8, grpW, 4.5, 2, 2, 'F');
      doc.setFontSize(6.5); doc.setTextColor(55, 48, 163);
      doc.text(grpStr, COL.grp + 2, y + 5.2);
    } else {
      doc.setFontSize(7); doc.setTextColor(200, 205, 220);
      doc.text('—', COL.grp + 2, y + 5.2);
    }

    // Type
    doc.setFontSize(7); doc.setTextColor(...DGRAY);
    const isMin = inv.categorie === 'Mineur';
    doc.text(isMin ? `Min.${inv.age ? ` ${inv.age}a` : ''}` : 'Adulte', COL.cat, y + 5.2);

    // Table (si applicable)
    if (showTable) {
      if (inv.table_attribuee) {
        const ts = String(inv.table_attribuee);
        const pillW3 = Math.max(doc.getStringUnitWidth(ts) * 7 / doc.internal.scaleFactor + 4, 7);
        doc.setFillColor(224, 226, 240);
        doc.roundedRect(COL.table, y + 1.8, pillW3, 4.5, 2, 2, 'F');
        doc.setFontSize(7); doc.setFont(undefined, 'bold'); doc.setTextColor(...NAVY);
        doc.text(ts, COL.table + pillW3 / 2, y + 5.2, { align: 'center' });
      } else {
        doc.setFontSize(7); doc.setFont(undefined, 'normal'); doc.setTextColor(200, 205, 220);
        doc.text('—', COL.table + 2, y + 5.2);
      }
    }

    y += rowH;
  });

  y += 6;

  // ══════════════════════════════════════════════════════════════════════════
  // 4. BLOC RESTRICTIONS ALIMENTAIRES (adaptatif)
  // ══════════════════════════════════════════════════════════════════════════
  const withRestrictions = invitesDedups.filter(i =>
    (i.allergenes || []).length > 0 || i.regime_alimentaire
  );

  if (withRestrictions.length > 0) {
    y = checkPage(doc, y + 2, PH, PW);
    drawSectionTitle(doc, 'RESTRICTIONS ALIMENTAIRES ET REGIMES', M, y, PW, M, RED);
    y += 9;

    withRestrictions.forEach((inv, ri) => {
      y = checkPage(doc, y, PH, PW);
      const rowH = 7.5;
      doc.setFillColor(...(ri % 2 === 0 ? [255, 248, 248] : WHITE));
      doc.rect(M, y, CW, rowH, 'F');
      doc.setDrawColor(255, 220, 220); doc.setLineWidth(0.15);
      doc.line(M, y + rowH, M + CW, y + rowH);

      // Nom
      doc.setFontSize(7.5); doc.setFont(undefined, 'bold'); doc.setTextColor(...NAVY);
      doc.text(`${inv.prenom} ${inv.nom}`, M + 3, y + 5);

      // Allergènes + régime
      const parts = [];
      const algL = labelsAllergenes(inv.allergenes);
      if (algL.length > 0) parts.push(algL.join(', '));
      if (inv.regime_alimentaire) parts.push(inv.regime_alimentaire);
      const detail = parts.join(' — ');

      doc.setFontSize(7); doc.setFont(undefined, 'normal'); doc.setTextColor(...RED);
      const maxW = CW - 60;
      const detailDisp = doc.getStringUnitWidth(detail) * 7 / doc.internal.scaleFactor > maxW
        ? detail.slice(0, Math.floor(detail.length * maxW / (doc.getStringUnitWidth(detail) * 7 / doc.internal.scaleFactor))) + '…'
        : detail;
      doc.text(detailDisp, M + 58, y + 5);

      y += rowH;
    });
    y += 5;
  }

  // ══════════════════════════════════════════════════════════════════════════
  // 5. BLOC HÉBERGEMENT (adaptatif)
  // ══════════════════════════════════════════════════════════════════════════
  const withHebergement = invitesDedups.filter(i => i.besoin_hebergement === true);

  if (withHebergement.length > 0) {
    // Bloc minimum (titre + bandeau + 1ère ligne) : saut anticipé si insuffisant
    y = checkPageBlock(doc, y + 2, 30, PH, PW);
    drawSectionTitle(doc, `HEBERGEMENT (${withHebergement.length} demande${withHebergement.length > 1 ? 's' : ''})`, M, y, PW, M, BLUE);
    y += 9;

    // Bandeau résumé
    doc.setFillColor(...LBLUE);
    doc.roundedRect(M, y, CW, 9, 2, 2, 'F');
    drawBed(doc, M + 5, y + 4.5, 3, BLUE);
    doc.setFontSize(7.5); doc.setFont(undefined, 'bold'); doc.setTextColor(...BLUE);
    doc.text(`${withHebergement.length} personne${withHebergement.length > 1 ? 's ont' : ' a'} besoin d'un hebergement`, M + 12, y + 5.5);
    y += 13;

    // Liste — ligne par ligne avec saut de page sécurisé
    const names = withHebergement.map(i => `${i.prenom} ${i.nom}`);
    const nameStr = names.join('   •   ');
    doc.setFontSize(7.5); doc.setFont(undefined, 'normal'); doc.setTextColor(...DGRAY);
    const nameLines = doc.splitTextToSize(nameStr, CW - 4);
    nameLines.forEach(l => { y = checkPage(doc, y, PH, PW); doc.text(l, M + 2, y); y += 5; });
    y += 3;
  }

  // ══════════════════════════════════════════════════════════════════════════
  // 6. RÉCAPITULATIF (pied de page contenu)
  // ══════════════════════════════════════════════════════════════════════════
  // Bloc récapitulatif complet (trait + 3 colonnes ≈ 33mm) : saut anticipé si insuffisant
  y = checkPageBlock(doc, y + 2, 33, PH, PW);
  doc.setDrawColor(205, 208, 225); doc.setLineWidth(0.35);
  doc.line(M, y, PW - M, y);
  y += 6;

  const C3W = CW / 3;

  // Col 1 — RÉPARTITION
  const c1x = M;
  drawPeopleIcon(doc, c1x + 3.5, y + 3, 3.5, BLUE);
  doc.setFontSize(7.5); doc.setFont(undefined, 'bold'); doc.setTextColor(...BLUE);
  doc.text('REPARTITION', c1x + 9, y + 4.5);

  doc.setFont(undefined, 'normal'); doc.setFontSize(7); doc.setTextColor(...DGRAY);
  doc.text('Adultes confirmes', c1x, y + 10);
  doc.text(String(stats.adultes_conf), c1x + C3W - 6, y + 10, { align: 'right' });
  doc.text('Mineurs confirmes', c1x, y + 15);
  doc.text(String(stats.mineurs_conf), c1x + C3W - 6, y + 15, { align: 'right' });
  doc.setDrawColor(218, 220, 232); doc.setLineWidth(0.25);
  doc.line(c1x, y + 17.5, c1x + C3W - 6, y + 17.5);
  doc.setFont(undefined, 'bold'); doc.setTextColor(...NAVY);
  doc.text('Total confirmes', c1x, y + 22);
  doc.text(String(stats.confirmes), c1x + C3W - 6, y + 22, { align: 'right' });

  // Col 2 — ALLERGIES résumé
  const c2x = M + C3W;
  drawLeaf(doc, c2x + 3.5, y + 3, 3, GREEN);
  doc.setFontSize(7.5); doc.setFont(undefined, 'bold'); doc.setTextColor(...GREEN);
  doc.text('REGIMES / ALLERGIES', c2x + 9, y + 4.5);

  const algMap = {};
  invites.forEach(inv => { (inv.allergenes || []).forEach(alg => { algMap[alg] = (algMap[alg] || 0) + 1; }); });
  const algEntries = Object.entries(algMap);
  doc.setFont(undefined, 'normal'); doc.setFontSize(7); doc.setTextColor(...DGRAY);
  if (algEntries.length === 0) {
    doc.setTextColor(...MGRAY);
    doc.text('Aucune allergie declaree', c2x, y + 10);
  } else {
    algEntries.slice(0, 4).forEach(([id, cnt], ai) => {
      doc.setTextColor(...DGRAY);
      doc.text(labelAllergene(id), c2x, y + 10 + ai * 5);
      doc.text(String(cnt), c2x + C3W - 6, y + 10 + ai * 5, { align: 'right' });
    });
    if (algEntries.length > 4) { doc.setTextColor(...MGRAY); doc.text('+ autres...', c2x, y + 10 + 4 * 5); }
  }

  // Col 3 — INFORMATIONS
  const c3x = M + C3W * 2;
  drawCalIcon(doc, c3x + 3.5, y + 3, 3, ORANGE);
  doc.setFontSize(7.5); doc.setFont(undefined, 'bold'); doc.setTextColor(...ORANGE);
  doc.text('INFORMATIONS', c3x + 9, y + 4.5);

  const now  = new Date();
  const dMaj = now.toLocaleDateString('fr-FR', { day: 'numeric', month: 'long', year: 'numeric' });
  const hMaj = now.toLocaleTimeString('fr-FR', { hour: '2-digit', minute: '2-digit' });
  doc.setFont(undefined, 'normal'); doc.setFontSize(7); doc.setTextColor(...DGRAY);
  doc.text('Derniere mise a jour :', c3x, y + 10);
  doc.text(`${dMaj} a ${hMaj}`, c3x, y + 15);
  doc.text('Source : Reponses en ligne', c3x, y + 20);
  doc.setFont(undefined, 'italic'); doc.setTextColor(...NAVY);
  doc.text('via Alryck', c3x, y + 25);

  // ══════════════════════════════════════════════════════════════════════════
  // FOOTER toutes les pages + pagination
  // ══════════════════════════════════════════════════════════════════════════
  const totalPages = doc.getNumberOfPages();
  for (let p = 1; p <= totalPages; p++) {
    doc.setPage(p);
    addFooter(doc, PW, PH, crystalData, p, totalPages);
  }

  const dateFn = new Date().toISOString().slice(0, 10);
  const fileName = `invites_${(evenementNom || 'evenement').replace(/\s+/g, '_')}_${dateFn}.pdf`;
  return { blob: doc.output('blob'), fileName };
}