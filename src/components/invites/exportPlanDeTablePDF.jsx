/**
 * exportPlanDeTablePDF — Export PDF du plan de table
 * Même habillage premium qu'exportInvitesPDF
 * Une section par table, section invités sans table à la fin
 */
import { jsPDF } from 'jspdf';
import { tableDisplayName } from '@/lib/tableName';
import { sortInvitesByAssignation, seatAngles } from '@/lib/tableSeating';

const CRYSTAL_URL = 'https://media.base44.com/images/public/69b804640546049d1a7bf53a/add7d9f16_file_00000000baa0724695dea66812e6a844.png';

const NAVY   = [30, 27, 75];
const WHITE  = [255, 255, 255];
const LGRAY  = [248, 249, 252];
const MGRAY  = [107, 114, 128];
const DGRAY  = [55, 65, 81];
const GREEN  = [22, 163, 74];
const ORANGE = [234, 88, 12];
const RED    = [190, 18, 60];
const GOLD   = [180, 140, 30];

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

function drawCalIcon(doc, cx, cy, sz, color) {
  doc.setDrawColor(...color); doc.setLineWidth(0.5);
  const hw = sz*0.5, hh = sz*0.45;
  doc.rect(cx - hw, cy - hh*0.6, hw*2, hh*1.5, 'S');
  doc.line(cx - hw, cy - hh*0.15, cx + hw, cy - hh*0.15);
  doc.line(cx - hw*0.3, cy - hh*0.85, cx - hw*0.3, cy - hh*0.45);
  doc.line(cx + hw*0.3, cy - hh*0.85, cx + hw*0.3, cy - hh*0.45);
}

// Schéma circulaire d'une table : cercle central (la table) + chaises autour,
// invités assignés répartis selon l'ordre chronologique d'assignation
// (helper partagé tableSeating — identique à l'écran). Le nombre de places =
// capacité de la table (ou nb d'invités si pas de capacité) ; les places non
// occupées restent vides (chaise grise, sans nom).
function drawTableSchema(doc, table, invitesT, cx, cy) {
  const invCount = invitesT.length;
  const seats = Math.max(table.capacite || invCount, invCount, 1);
  const tableR = Math.min(22, Math.max(14, Math.sqrt(seats / 6) * 14));
  const chairR = tableR + 3.5;
  const nameR = tableR + 8;

  // Cercle central (la table)
  doc.setDrawColor(...NAVY); doc.setLineWidth(0.4); doc.setFillColor(245, 246, 252);
  doc.circle(cx, cy, tableR, 'FD');
  doc.setFontSize(7); doc.setFont(undefined, 'bold'); doc.setTextColor(...NAVY);
  const label = tableDisplayName(table);
  doc.text(label.length > 14 ? label.slice(0, 13) + '…' : label, cx, cy - 1, { align: 'center' });
  doc.setFontSize(5.5); doc.setFont(undefined, 'normal'); doc.setTextColor(...MGRAY);
  doc.text(`${invCount} / ${table.capacite || invCount}`, cx, cy + 5, { align: 'center' });

  // Ordre chronologique d'assignation (repli stable sur l'ordre naturel si pas de date)
  const sorted = sortInvitesByAssignation(invitesT);
  const angles = seatAngles(seats);
  const maxLen = seats > 18 ? 6 : seats > 12 ? 9 : 14;

  for (let i = 0; i < seats; i++) {
    const angle = angles[i];
    const chx = cx + chairR * Math.cos(angle);
    const chy = cy + chairR * Math.sin(angle);
    const occupied = i < invCount;

    if (occupied) {
      doc.setFillColor(...GOLD); doc.setDrawColor(...NAVY); doc.setLineWidth(0.25);
    } else {
      doc.setFillColor(220, 224, 234); doc.setDrawColor(205, 210, 224); doc.setLineWidth(0.2);
    }
    doc.circle(chx, chy, 1.6, 'FD');

    if (occupied) {
      const inv = sorted[i];
      const nx = cx + nameR * Math.cos(angle);
      const ny = cy + nameR * Math.sin(angle);
      const name = `${inv.prenom || ''} ${inv.nom || ''}`.trim();
      const disp = name.length > maxLen ? name.slice(0, maxLen - 1) + '…' : name;
      const cos = Math.cos(angle);
      const align = cos > 0.2 ? 'left' : cos < -0.2 ? 'right' : 'center';
      const dx = cos * 2.4;
      const dy = Math.sin(angle) * 2.4 + 1.4;
      doc.setFontSize(6); doc.setFont(undefined, 'bold'); doc.setTextColor(...DGRAY);
      doc.text(disp, nx + dx, ny + dy, { align });
    }
  }
}

const FOOTER_SAFE = 26;
const CONTENT_TOP = 16;

function checkPage(doc, y, PH, PW) {
  if (y > PH - FOOTER_SAFE) {
    doc.addPage();
    doc.setFillColor(...WHITE);
    doc.rect(0, 0, PW, PH, 'F');
    return CONTENT_TOP;
  }
  return y;
}

function checkPageBlock(doc, y, blockH, PH, PW) {
  if (y + blockH > PH - FOOTER_SAFE) {
    doc.addPage();
    doc.setFillColor(...WHITE);
    doc.rect(0, 0, PW, PH, 'F');
    return CONTENT_TOP;
  }
  return y;
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

function drawSectionTitle(doc, label, x, y, PW, M, color) {
  doc.setFontSize(9); doc.setFont(undefined, 'bold'); doc.setTextColor(...color);
  doc.text(label, x, y + 3.5);
  const tw = doc.getStringUnitWidth(label) * 9 / doc.internal.scaleFactor;
  doc.setDrawColor(200, 200, 218); doc.setLineWidth(0.3);
  doc.line(x + tw + 4, y + 2, PW - M, y + 2);
}

export async function exportPlanDeTablePDF({ tables, invites, evenementNom, evenementDate, coverUrl }) {
  const doc = new jsPDF({ orientation: 'portrait', unit: 'mm', format: 'a4' });
  const crystalData = await loadImageAsDataURL(CRYSTAL_URL);
  const PW = doc.internal.pageSize.getWidth();
  const PH = doc.internal.pageSize.getHeight();
  const M = 14;
  const CW = PW - M * 2;

  doc.setFillColor(...WHITE);
  doc.rect(0, 0, PW, PH, 'F');

  // ── HEADER ──
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

  doc.setFillColor(0, 0, 0);
  doc.setGState(doc.GState({ opacity: 0.45 }));
  doc.rect(0, 0, PW, BANNER_H, 'F');
  doc.setGState(doc.GState({ opacity: 1 }));

  doc.setFillColor(...WHITE);
  doc.roundedRect(M, 8, 50, 7, 3, 3, 'F');
  doc.setFontSize(6.5); doc.setFont(undefined, 'bold'); doc.setTextColor(...NAVY);
  doc.text('PLAN DE TABLE', M + 25, 13, { align: 'center' });

  doc.setTextColor(...WHITE); doc.setFontSize(22); doc.setFont(undefined, 'bold');
  const nomLines = doc.splitTextToSize(evenementNom || 'Événement', CW - 4);
  nomLines.forEach((line, i) => doc.text(line, M, 28 + i * 9));
  const afterName = 28 + nomLines.length * 9;

  doc.setDrawColor(...GOLD); doc.setLineWidth(1);
  doc.line(M, afterName + 1, M + 22, afterName + 1);

  if (evenementDate) {
    const dateStr = new Date(evenementDate + 'T12:00:00').toLocaleDateString('fr-FR', {
      weekday: 'long', day: 'numeric', month: 'long', year: 'numeric',
    });
    const dy = afterName + 8;
    drawCalIcon(doc, M + 2.5, dy, 2.8, [210, 215, 240]);
    doc.setFontSize(9); doc.setFont(undefined, 'normal'); doc.setTextColor(225, 228, 248);
    doc.text(dateStr, M + 7, dy + 1.5);
  }

  doc.setFillColor(...WHITE);
  doc.rect(0, BANNER_H, PW, PH - BANNER_H, 'F');

  let y = BANNER_H + 7;

  // ── STATS ──
  const invitesVisibles = invites.filter(i => !(i.archived && i.prenom === '_groupe_'));
  const sortedTables = tables.slice().sort((a, b) => (a.ordre ?? 0) - (b.ordre ?? 0));

  const getInvitesTable = (table) =>
    invitesVisibles.filter(i => i.table_attribuee === table.id);

  const invitesSansTable = invitesVisibles.filter(i => !i.table_attribuee || i.table_attribuee === '');
  const invitesPlaces = invitesVisibles.filter(i => !!i.table_attribuee && i.table_attribuee !== '');

  const CARD_W = CW / 3;
  const CARD_H = 20;
  doc.setFillColor(...WHITE); doc.setDrawColor(220, 222, 235); doc.setLineWidth(0.3);
  doc.roundedRect(M, y, CW, CARD_H, 2, 2, 'FD');
  doc.setDrawColor(228, 230, 240);
  doc.line(M + CARD_W, y + 4, M + CARD_W, y + CARD_H - 4);
  doc.line(M + CARD_W * 2, y + 4, M + CARD_W * 2, y + CARD_H - 4);

  const STATS = [
    { val: sortedTables.length, label: 'Tables', col: NAVY },
    { val: invitesPlaces.length, label: 'Placés', col: GREEN },
    { val: invitesSansTable.length, label: 'Sans table', col: ORANGE },
  ];
  STATS.forEach((s, i) => {
    const cx = M + CARD_W * i + CARD_W / 2;
    doc.setFontSize(14); doc.setFont(undefined, 'bold'); doc.setTextColor(...s.col);
    doc.text(String(s.val), cx, y + 11.5, { align: 'center' });
    doc.setFontSize(6); doc.setFont(undefined, 'normal'); doc.setTextColor(...MGRAY);
    doc.text(s.label, cx, y + 16.5, { align: 'center' });
  });

  y += CARD_H + 8;

  // ── UNE SECTION PAR TABLE ──
  sortedTables.forEach(table => {
    const invitesT = getInvitesTable(table);
    const invCount = invitesT.length;
    const capSeats = Math.max(table.capacite || invCount, invCount, 1);
    const schemaR = Math.min(22, Math.max(14, Math.sqrt(capSeats / 6) * 14));
    const schemaH = invCount > 0 ? (schemaR + 8) * 2 + 6 : 0;
    const blockH = 12 + schemaH + Math.max(invCount, 1) * 7.5 + 8;
    y = checkPageBlock(doc, y, blockH, PH, PW);

    drawSectionTitle(doc, tableDisplayName(table).toUpperCase(), M, y, PW, M, NAVY);

    const isOver = table.capacite && invitesT.length > table.capacite;
    const capaciteLabel = table.capacite
      ? `${invitesT.length} / ${table.capacite} places${isOver ? ' ⚠' : ''}`
      : `${invitesT.length} invité${invitesT.length > 1 ? 's' : ''}`;
    doc.setFontSize(7.5); doc.setFont(undefined, 'normal');
    if (isOver) {
      doc.setTextColor(...RED);
    } else {
      doc.setTextColor(...MGRAY);
    }
    doc.text(capaciteLabel, PW - M, y + 3.5, { align: 'right' });
    y += 10;

    if (invitesT.length === 0) {
      y = checkPage(doc, y, PH, PW);
      doc.setFontSize(7); doc.setTextColor(...MGRAY);
      doc.text('Aucun invité assigné', M + 3, y + 4);
      y += 10;
    } else {
      // Schéma circulaire : invités répartis autour de la table (complément visuel).
      y = checkPageBlock(doc, y, schemaH + 6, PH, PW);
      drawTableSchema(doc, table, invitesT, M + CW / 2, y + schemaR + 10);
      y += schemaH + 6;

      y = checkPage(doc, y, PH, PW);
      doc.setFillColor(...NAVY);
      doc.roundedRect(M, y, CW, 6.5, 1.5, 1.5, 'F');
      doc.setFontSize(6); doc.setFont(undefined, 'bold'); doc.setTextColor(...WHITE);
      doc.text('NOM ET PRÉNOM', M + 3, y + 4.5);
      doc.text('TYPE', M + 100, y + 4.5);
      doc.text('GROUPE', M + 140, y + 4.5);
      y += 6.5;

      invitesT.forEach((inv, ri) => {
        y = checkPage(doc, y, PH, PW);
        const rowH = 7.5;
        doc.setFillColor(...(ri % 2 === 0 ? WHITE : LGRAY));
        doc.rect(M, y, CW, rowH, 'F');
        doc.setDrawColor(235, 236, 245); doc.setLineWidth(0.2);
        doc.line(M, y + rowH, M + CW, y + rowH);

        const fullName = `${inv.prenom} ${inv.nom}`;
        doc.setFontSize(7.5); doc.setFont(undefined, 'bold'); doc.setTextColor(...NAVY);
        doc.text(fullName.length > 30 ? fullName.slice(0, 28) + '…' : fullName, M + 3, y + 5.2);

        doc.setFontSize(7); doc.setFont(undefined, 'normal'); doc.setTextColor(...DGRAY);
        const isMin = inv.categorie === 'Mineur';
        doc.text(isMin ? `Mineur${inv.age ? ` (${inv.age}a)` : ''}` : 'Adulte', M + 100, y + 5.2);

        if (inv.groupe) {
          doc.setFontSize(6.5); doc.setTextColor(...MGRAY);
          doc.text(inv.groupe.slice(0, 14), M + 140, y + 5.2);
        }

        // Restrictions alimentaires
        const hasAllergies = (inv.allergenes || []).length > 0;
        const hasRegime = !!inv.regime_alimentaire;
        if (hasAllergies || hasRegime) {
          const restrictionTxt = hasRegime
            ? inv.regime_alimentaire.slice(0, 20)
            : `${inv.allergenes.length} allergie${inv.allergenes.length > 1 ? 's' : ''}`;
          doc.setFontSize(6); doc.setFont(undefined, 'italic'); doc.setTextColor(...RED);
          doc.text(`⚠ ${restrictionTxt}`, M + 3, y + rowH - 1.5);
        }

        y += rowH;
      });
      y += 5;
    }
  });

  // ── INVITÉS SANS TABLE ──
  if (invitesSansTable.length > 0) {
    y = checkPageBlock(doc, y + 2, 20 + invitesSansTable.length * 7, PH, PW);
    drawSectionTitle(doc, `SANS TABLE (${invitesSansTable.length} personne${invitesSansTable.length > 1 ? 's' : ''})`, M, y, PW, M, ORANGE);
    y += 10;

    doc.setFillColor(255, 247, 237);
    doc.roundedRect(M, y, CW, 8, 2, 2, 'F');
    doc.setFontSize(7.5); doc.setFont(undefined, 'bold'); doc.setTextColor(...ORANGE);
    doc.text(`Ces ${invitesSansTable.length} invité${invitesSansTable.length > 1 ? 's n\'ont' : ' n\'a'} pas encore de table attribuée`, M + 4, y + 5.5);
    y += 12;

    invitesSansTable.forEach((inv, ri) => {
      y = checkPage(doc, y, PH, PW);
      const rowH = 7;
      doc.setFillColor(...(ri % 2 === 0 ? WHITE : LGRAY));
      doc.rect(M, y, CW, rowH, 'F');
      doc.setFontSize(7.5); doc.setFont(undefined, 'bold'); doc.setTextColor(...NAVY);
      doc.text(`${inv.prenom} ${inv.nom}`, M + 3, y + 4.8);
      doc.setFontSize(7); doc.setFont(undefined, 'normal'); doc.setTextColor(...MGRAY);
      const isMinST = inv.categorie === 'Mineur';
      doc.text(isMinST ? `Mineur${inv.age ? ` (${inv.age}a)` : ''}` : 'Adulte', M + 100, y + 4.8);
      const hasSTA = (inv.allergenes || []).length > 0;
      const hasSTR = !!inv.regime_alimentaire;
      if (hasSTA || hasSTR) {
        const stTxt = hasSTR ? inv.regime_alimentaire.slice(0, 20) : `${inv.allergenes.length} allergie${inv.allergenes.length > 1 ? 's' : ''}`;
        doc.setFontSize(6); doc.setFont(undefined, 'italic'); doc.setTextColor(...RED);
        doc.text(`⚠ ${stTxt}`, M + 140, y + 4.8);
      }
      y += rowH;
    });
  }

  // ── FOOTERS ──
  const totalPages = doc.getNumberOfPages();
  for (let p = 1; p <= totalPages; p++) {
    doc.setPage(p);
    addFooter(doc, PW, PH, crystalData, p, totalPages);
  }

  const dateFn = new Date().toISOString().slice(0, 10);
  const fileName = `plan_de_table_${(evenementNom || 'evenement').replace(/\s+/g, '_')}_${dateFn}.pdf`;
  return { blob: doc.output('blob'), fileName };
}