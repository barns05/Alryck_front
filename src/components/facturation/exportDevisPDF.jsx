import { calculerTotaux } from './DevisTotaux.jsx';

export async function exportDevisPDF({ devis, echeances = [], company, modeFacture = false, returnBlob = false }) {
  const { jsPDF } = await import('jspdf');
  const doc = new jsPDF({ unit: 'mm', format: 'a4' });
  const pageW = 210;
  const margin = 15;
  let y = 15;

  const addText = (text, x, size = 10, style = 'normal', color = [30, 30, 30]) => {
    doc.setFontSize(size);
    doc.setFont('helvetica', style);
    doc.setTextColor(...color);
    doc.text(String(text || ''), x, y);
  };

  // === EN-TÊTE DU DOCUMENT ===
  // Logo
  if (company?.company_logo_url) {
    const img = new Image();
    img.src = company.company_logo_url;
    doc.addImage(img, 'PNG', margin, y, 25, 25);
    y += 30;
  }

  // Bloc entreprise (nom, adresse, contact, SIRET, TVA)
  if (company?.company_name) {
    addText(company.company_name, margin, 12, 'bold', [30, 60, 140]);
    y += 6;
    if (company.adresse) { addText(company.adresse, margin, 8, 'normal', [80, 80, 80]); y += 4; }
    if (company.telephone) { addText(`Tél : ${company.telephone}`, margin, 8, 'normal', [80, 80, 80]); y += 4; }
    if (company.email_contact) { addText(`Email : ${company.email_contact}`, margin, 8, 'normal', [80, 80, 80]); y += 4; }
    if (company.siret) { addText(`SIRET : ${company.siret}`, margin, 8, 'normal', [80, 80, 80]); y += 4; }
    if (company.tva_intracommunautaire) { addText(`TVA : ${company.tva_intracommunautaire}`, margin, 8, 'normal', [80, 80, 80]); y += 4; }
  }

  // Titre document
  y += 4;
  const typeDoc = devis.type_document || (modeFacture ? 'FACTURE' : 'DEVIS');
  const isProForma = devis.est_pro_forma === true;
  const titre = isProForma ? `${typeDoc.toUpperCase()} — PRO FORMA` : typeDoc.toUpperCase();
  doc.setFontSize(18);
  doc.setFont('helvetica', 'bold');
  doc.setTextColor(30, 60, 140);
  doc.text(titre, pageW / 2, y, { align: 'center' });
  y += 6;

  // Watermark diagonal "PRO FORMA" sur toute la page
  if (isProForma) {
    doc.saveGraphicsState();
    doc.setFontSize(60);
    doc.setFont('helvetica', 'bold');
    doc.setTextColor(200, 160, 60);
    doc.setGState(doc.GState({ opacity: 0.12 }));
    doc.text('PRO FORMA', pageW / 2, 160, { align: 'center', angle: 45 });
    doc.restoreGraphicsState();
  }

  // Mention avoir : "En annulation et remplacement de [numéro]"
  if (devis.facture_origine_numero) {
    doc.setFontSize(9);
    doc.setFont('helvetica', 'italic');
    doc.setTextColor(180, 50, 50);
    doc.text(`En annulation et remplacement de la facture ${devis.facture_origine_numero}`, pageW / 2, y, { align: 'center' });
    y += 5;
    doc.setFont('helvetica', 'normal');
    doc.setTextColor(100, 100, 100);
  }

  // Numéro et date
  doc.setFontSize(9);
  doc.setFont('helvetica', 'normal');
  doc.setTextColor(100, 100, 100);
  const numAffiche = isProForma ? (devis.numero_provisoire || '---') : (devis.numero || '---');
  doc.text(`N° ${numAffiche}${isProForma ? ' (provisoire)' : ''}`, pageW / 2, y, { align: 'center' });
  y += 4;
  if (devis.objet) {
    doc.setFontSize(10);
    doc.setFont('helvetica', 'italic');
    doc.setTextColor(60, 60, 60);
    doc.text(devis.objet, pageW / 2, y, { align: 'center' });
    y += 4;
    doc.setFont('helvetica', 'normal');
    doc.setFontSize(9);
    doc.setTextColor(100, 100, 100);
  }
  doc.text(`Date : ${devis.date_devis || ''}`, pageW / 2, y, { align: 'center' });
  if (devis.date_validite) { y += 4; doc.text(`Valable jusqu'au : ${devis.date_validite}`, pageW / 2, y, { align: 'center' }); }
  if (devis.date_prestation) { y += 4; doc.text(`Date de prestation : ${devis.date_prestation}`, pageW / 2, y, { align: 'center' }); }
  if (devis.evenement_nom) { y += 4; doc.text(`Événement : ${devis.evenement_nom}`, pageW / 2, y, { align: 'center' }); }
  y += 8;

  // Bloc client
  doc.setFillColor(240, 244, 255);
  doc.roundedRect(pageW - margin - 70, y - 5, 70, 28, 3, 3, 'F');
  doc.setFontSize(9);
  doc.setTextColor(60, 60, 60);
  doc.setFont('helvetica', 'bold');
  doc.text('CLIENT', pageW - margin - 65, y);
  doc.setFont('helvetica', 'normal');
  y += 5;
  doc.text(devis.client_nom || '', pageW - margin - 65, y); y += 4;
  if (devis.client_email) { doc.text(devis.client_email, pageW - margin - 65, y); y += 4; }
  if (devis.client_telephone) { doc.text(devis.client_telephone, pageW - margin - 65, y); y += 4; }
  if (devis.client_adresse) {
    const lines = doc.splitTextToSize(devis.client_adresse, 65);
    lines.forEach(l => { doc.text(l, pageW - margin - 65, y); y += 4; });
  }
  y += 6;

  // Séparateur
  doc.setDrawColor(200, 210, 230);
  doc.line(margin, y, pageW - margin, y);
  y += 6;

  // Tableau des articles avec TVA, unité et remise par ligne
  const assujetti = company?.assujetti_tva !== false;
  // 7 colonnes si assujetti (avec TVA), 6 sinon
  const colWidths = assujetti
    ? [52, 12, 10, 18, 15, 15, 22]
    : [60, 14, 12, 25, 18, 27];    // 6 colonnes, total = 156 = pageW - 2*margin
  const headers = assujetti
    ? ['Description', 'Unité', 'Qté', 'PU HT (€)', 'TVA %', 'Remise', 'Total HT (€)']
    : ['Description', 'Unité', 'Qté', 'Prix (€)', 'Remise', 'Total (€)'];
  const colX = [margin];
  colWidths.forEach((w, i) => { if (i < colWidths.length - 1) colX.push(colX[i] + w); });

  // En-tête tableau
  doc.setFillColor(30, 60, 140);
  doc.rect(margin, y - 4, pageW - margin * 2, 8, 'F');
  doc.setTextColor(255, 255, 255);
  doc.setFontSize(8);
  doc.setFont('helvetica', 'bold');
  headers.forEach((h, i) => doc.text(h, colX[i] + 1, y));
  y += 7;

  // Lignes d'articles
  const lignes = devis.lignes || [];
  lignes.forEach((ligne, idx) => {
    if (idx % 2 === 0) { doc.setFillColor(248, 250, 255); doc.rect(margin, y - 4, pageW - margin * 2, 7, 'F'); }
    doc.setTextColor(40, 40, 40);
    doc.setFont('helvetica', 'normal');
    doc.setFontSize(8);
    
    let montantRemise = 0;
    if (ligne.remise) {
      montantRemise = ligne.remise_type === 'pct'
        ? (ligne.quantite || 0) * (ligne.prix_unitaire_ht || 0) * (ligne.remise / 100)
        : ligne.remise;
    }
    const totalHT = (ligne.quantite || 0) * (ligne.prix_unitaire_ht || 0) - montantRemise;

    const rawDesc = ligne.description || '';
    const firstLine = rawDesc.includes('\n') ? rawDesc.split('\n')[0] : rawDesc;
    const descShort = firstLine.length > 50 ? firstLine.slice(0, 50) + '…' : firstLine;
    doc.text(descShort, colX[0] + 1, y);
    doc.text(ligne.unite || 'pers', colX[1] + 1, y);
    doc.text(String(ligne.quantite || 0), colX[2] + 1, y);
    doc.text((ligne.prix_unitaire_ht || 0).toFixed(2), colX[3] + 1, y);
    if (assujetti) {
      doc.text(`${ligne.tva_taux ?? 20}%`, colX[4] + 1, y);
      doc.text(montantRemise > 0 ? `-${montantRemise.toFixed(2)}€` : '-', colX[5] + 1, y);
      doc.text(totalHT.toFixed(2), colX[6] + 1, y);
    } else {
      doc.text(montantRemise > 0 ? `-${montantRemise.toFixed(2)}€` : '-', colX[4] + 1, y);
      doc.text(totalHT.toFixed(2), colX[5] + 1, y);
    }
    y += 7;
  });

  // Totaux
  const { totalHT, tvaMap, totalTVA, totalTTC } = calculerTotaux(lignes, devis.remise_globale || 0, devis.remise_globale_type || 'pct');
  y += 4;
  doc.setDrawColor(200, 210, 230);
  doc.line(pageW - margin - 60, y, pageW - margin, y);
  y += 4;

  const addTotalLine = (label, value, bold = false) => {
    doc.setFont('helvetica', bold ? 'bold' : 'normal');
    doc.setFontSize(bold ? 10 : 8);
    doc.setTextColor(bold ? 30 : 80, bold ? 60 : 80, bold ? 140 : 80);
    doc.text(label, pageW - margin - 58, y);
    doc.text(`${value.toFixed(2)} €`, pageW - margin, y, { align: 'right' });
    y += bold ? 6 : 4;
  };

  if (assujetti) {
    addTotalLine('Total HT', totalHT);
    Object.entries(tvaMap).forEach(([taux, montant]) => addTotalLine(`TVA ${taux}%`, montant));
    addTotalLine('TOTAL TTC', totalTTC, true);
  } else {
    addTotalLine('TOTAL', totalHT, true);
  }

  // Conditions de paiement
  if (devis.conditions_paiement) {
    y += 6;
    doc.setFontSize(8);
    doc.setFont('helvetica', 'bold');
    doc.setTextColor(60, 60, 60);
    doc.text('Conditions de paiement :', margin, y); y += 4;
    doc.setFont('helvetica', 'normal');
    const lines = doc.splitTextToSize(devis.conditions_paiement, pageW - margin * 2);
    lines.forEach(l => { doc.text(l, margin, y); y += 3.5; });
  }

  // Échéances
  if (echeances.length > 0) {
    y += 4;
    doc.setFontSize(8);
    doc.setFont('helvetica', 'bold');
    doc.setTextColor(60, 60, 60);
    doc.text('Échéancier de paiement :', margin, y); y += 4;
    doc.setFont('helvetica', 'normal');
    echeances.forEach(e => {
      doc.text(`• ${e.type} — ${(e.montant_calcule || 0).toFixed(2)} € — ${e.date_prevue || 'date à définir'} — ${e.statut}`, margin, y);
      y += 3.5;
    });
  }

  // === PIED DE PAGE (RIB + Mentions légales) ===
  y = 250;
  doc.setDrawColor(200, 210, 230);
  doc.line(margin, y, pageW - margin, y);
  y += 5;

  doc.setFontSize(8);
  doc.setFont('helvetica', 'normal');
  doc.setTextColor(80, 80, 80);

  // RIB
  if (company?.iban || company?.bic || company?.nom_banque) {
    doc.setFont('helvetica', 'bold');
    doc.text('Informations bancaires :', margin, y);
    y += 4;
    doc.setFont('helvetica', 'normal');
    if (company.nom_banque) { doc.text(`Banque : ${company.nom_banque}`, margin, y); y += 3; }
    if (company.iban) { doc.text(`IBAN : ${company.iban}`, margin, y); y += 3; }
    if (company.bic) { doc.text(`BIC : ${company.bic}`, margin, y); y += 3; }
  }

  // Mentions légales
  y += 2;
  doc.setFont('helvetica', 'bold');
  doc.text('Mentions légales :', margin, y);
  y += 3;
  doc.setFont('helvetica', 'normal');

  if (company?.mentions_legales) {
    // Mentions personnalisées
    const customLines = doc.splitTextToSize(company.mentions_legales, pageW - margin * 2);
    customLines.forEach(l => { if (y < 285) { doc.text(l, margin, y); y += 3; } });
  } else {
    // Mentions légales par défaut
    const mentions = [
      isProForma ? 'Document pro forma — sans valeur comptable. Numéro définitif attribué lors de la finalisation.' : null,
      !assujetti ? 'TVA non applicable - art. 293 B du CGI' : null,
      company?.siret ? `SIRET : ${company.siret}` : null,
      assujetti && company?.tva_intracommunautaire ? `TVA intracommunautaire : ${company.tva_intracommunautaire}` : null,
      assujetti ? 'Pénalités de retard : 3 fois le taux d\'intérêt légal' : null,
      assujetti ? 'Indemnité forfaitaire de recouvrement : 40 €' : null,
    ].filter(Boolean);
    mentions.forEach(mention => { if (y < 285) { doc.text(`• ${mention}`, margin + 3, y); y += 3; } });
  }

  const numForFile = isProForma ? (devis.numero_provisoire || 'draft') : (devis.numero || 'draft');
  const filename = `${modeFacture ? 'facture' : 'devis'}-${numForFile}-${devis.client_nom?.replace(/\s/g, '-') || 'client'}.pdf`;

  if (returnBlob) {
    return doc.output('blob');
  }

  // ── Téléchargement direct (returnBlob = false) ──────────────────────────────
  // iOS Safari ignore l'attribut <a download> pour les blob URLs.
  // On utilise la Web Share API avec un objet File pour proposer
  // "Enregistrer dans Fichiers" via la feuille de partage native.
  const isIOS = /iPad|iPhone|iPod/.test(navigator.userAgent)
    || (navigator.platform === 'MacIntel' && navigator.maxTouchPoints > 1);

  const pdfBlob = doc.output('blob');

  if (isIOS && navigator.canShare) {
    const file = new File([pdfBlob], filename, { type: 'application/pdf' });
    if (navigator.canShare({ files: [file] })) {
      try {
        await navigator.share({ files: [file], title: devis.type_document || 'Devis' });
        return;
      } catch (err) {
        if (err?.name === 'AbortError') return;
      }
    }
  }

  // Android / Desktop : <a download> classique
  const url = URL.createObjectURL(pdfBlob);
  const a = document.createElement('a');
  a.href = url;
  a.download = filename;
  a.style.display = 'none';
  document.body.appendChild(a);
  a.click();
  setTimeout(() => { document.body.removeChild(a); URL.revokeObjectURL(url); }, 200);
}

export async function exportDevisPDFBlob({ devis, echeances = [], company, modeFacture = false }) {
  return exportDevisPDF({ devis, echeances, company, modeFacture, returnBlob: true });
}