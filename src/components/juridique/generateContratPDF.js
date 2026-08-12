/**
 * generateContratPDF.js — Génération PDF professionnelle unifiée.
 *
 * Deux modes d'appel :
 * 1. Mode `clauses` (Trame Alryck) : tableau d'articles { titre, corps } rendus
 *    avec numérotation séquentielle "Article N — Titre".
 * 2. Mode `bodyText` (extraction IA / modèle dynamique) : texte continu rendu en
 *    flux, avec détection heuristique des lignes ressemblant à des titres d'articles
 *    (commençant par "Article N" ou lignes courtes entièrement en majuscules).
 *
 * Les deux modes partagent : en-tête entreprise, titre centré, pied de page
 * numéroté, et bloc signature en bas.
 *
 * Syntaxe des placeholders : {{CHAMP}} (double accolades) — unifiée avec
 * l'extraction IA et ContractModal.jsx.
 */
import jsPDF from 'jspdf';

const PAGE_WIDTH = 210;  // A4
const PAGE_HEIGHT = 297;
const MARGIN = 20;
const CONTENT_WIDTH = PAGE_WIDTH - MARGIN * 2;
const TOP_START = 20;
const BOTTOM_LIMIT = PAGE_HEIGHT - 25; // marge bas avant pied de page

/**
 * @param {Object} params
 * @param {Array<{titre: string, corps: string}>} [params.clauses] — articles structurés (mode Trame)
 * @param {string} [params.bodyText] — texte continu (mode extraction IA / modèle dynamique)
 * @param {Object} params.company — CompanySettings (logo, nom, SIRET, adresse…)
 * @param {string} params.titreModele — titre du document
 * @param {Object} params.fields — valeurs de substitution { {CHAMP}: string }
 * @returns {jsPDF} document PDF généré
 */
export function generateContratPDF({ clauses, bodyText, company, titreModele, fields }) {
  const safeFields = fields || {};
  const doc = new jsPDF();
  let y = TOP_START;

  // ─── Helper : substituer {{PLACEHOLDERS}} ───────────────────────────────────
  const substitute = (text) => {
    if (!text) return '';
    let result = text;
    for (const [key, value] of Object.entries(safeFields)) {
      if (value) {
        result = result.replace(new RegExp(`\\{\\{${key}\\}\\}`, 'g'), value);
      }
    }
    return result;
  };

  // ─── Helper : vérifier l'espace restant et ajouter une page si besoin ──────
  const ensureSpace = (needed) => {
    if (y + needed > BOTTOM_LIMIT) {
      addFooter(doc);
      doc.addPage();
      y = TOP_START;
    }
  };

  // ─── Helper : pied de page ──────────────────────────────────────────────────
  function addFooter(d) {
    const pageCount = d.getNumberOfPages();
    const currentPage = d.getCurrentPageInfo().pageNumber;
    d.setFontSize(8);
    d.setFont('helvetica', 'normal');
    d.setTextColor(150);
    d.text(
      `${titreModele || 'Contrat de prestation'} — Page ${currentPage}/${pageCount}`,
      PAGE_WIDTH / 2,
      PAGE_HEIGHT - 10,
      { align: 'center' }
    );
    d.setTextColor(0);
  }

  // ─── En-tête : logo + infos entreprise ──────────────────────────────────────
  const logoUrl = company?.company_logo_url;

  if (logoUrl) {
    try {
      doc.addImage(logoUrl, 'PNG', MARGIN, y, 25, 25);
    } catch (e) {
      console.warn('Logo non ajouté au PDF:', e.message);
    }
  }

  doc.setFontSize(9);
  doc.setFont('helvetica', 'bold');
  const infoX = logoUrl ? MARGIN + 30 : MARGIN;
  const companyLines = [company?.company_name || '{{NOM_ENTREPRISE}}'];
  if (company?.siret) companyLines.push(`SIRET : ${company.siret}`);
  const addrParts = [company?.adresse, [company?.adresse_code_postal, company?.adresse_ville].filter(Boolean).join(' ')].filter(Boolean);
  if (addrParts.length) companyLines.push(addrParts.join(', '));
  if (company?.email_contact) companyLines.push(company.email_contact);
  if (company?.telephone) companyLines.push(company.telephone);

  companyLines.forEach((line, i) => {
    doc.setFont('helvetica', i === 0 ? 'bold' : 'normal');
    doc.text(line, infoX, y + 5 + i * 5);
  });

  const headerEndY = Math.max(y + (logoUrl ? 25 : 0), y + 5 + companyLines.length * 5);
  y = headerEndY + 10;

  // ─── Titre du document ─────────────────────────────────────────────────────
  doc.setFontSize(16);
  doc.setFont('helvetica', 'bold');
  doc.text(titreModele || 'CONTRAT DE PRESTATION DE SERVICES', PAGE_WIDTH / 2, y, { align: 'center' });
  y += 12;

  doc.setLineWidth(0.5);
  doc.line(MARGIN, y, PAGE_WIDTH - MARGIN, y);
  y += 10;

  // ─── Contenu : mode texte continu (bodyText) ou mode articles (clauses) ─────
  if (bodyText) {
    // Heuristique de détection des titres :
    // - Lignes commençant par "Article" suivi d'un chiffre
    // - Lignes courtes (≤ 80 car.) entièrement en majuscules contenant au moins une lettre
    const substituted = substitute(bodyText);
    const lines = substituted.split('\n');

    for (let idx = 0; idx < lines.length; idx++) {
      const rawLine = lines[idx];
      const line = rawLine.trim();
      if (!line) { y += 3; continue; }

      const isTitle = /^Article\s+\d+/i.test(line) ||
        (line.length <= 80 && line === line.toUpperCase() && /[A-ZÀ-Ý]/.test(line));

      if (isTitle) {
        doc.setFontSize(11);
        doc.setFont('helvetica', 'bold');
        const wrapped = doc.splitTextToSize(line, CONTENT_WIDTH);

        // Look-ahead : vérifier qu'on a la place pour le titre + au moins
        // la première ligne du corps qui suit, sinon passer à la page suivante
        const nextLine = lines.slice(idx + 1).find(l => l.trim())?.trim() || '';
        const nextWrapped = nextLine ? doc.splitTextToSize(nextLine, CONTENT_WIDTH) : [];
        const firstNextHeight = nextWrapped.length > 0 ? 4.8 : 0;

        if (y + wrapped.length * 6 + 3 + firstNextHeight > BOTTOM_LIMIT) {
          addFooter(doc);
          doc.addPage();
          y = TOP_START;
        }

        wrapped.forEach(w => {
          doc.text(w, MARGIN, y);
          y += 6;
        });
        y += 3; // espacement entre titre et corps
      } else {
        doc.setFontSize(9.5);
        doc.setFont('helvetica', 'normal');
        const wrapped = doc.splitTextToSize(line, CONTENT_WIDTH);
        wrapped.forEach(w => {
          if (y + 4.8 > BOTTOM_LIMIT) { addFooter(doc); doc.addPage(); y = TOP_START; }
          doc.text(w, MARGIN, y);
          y += 4.8;
        });
        y += 2; // petit espacement entre paragraphes
      }
    }
  } else if (clauses) {
    clauses.forEach((clause, clauseIndex) => {
      const corpsSubst = substitute(clause.corps);

      doc.setFontSize(11);
      doc.setFont('helvetica', 'bold');
      const titreComplet = `Article ${clauseIndex + 1} — ${clause.titre}`;
      const titreLines = doc.splitTextToSize(titreComplet, CONTENT_WIDTH);

      doc.setFontSize(9.5);
      doc.setFont('helvetica', 'normal');
      const corpsLines = doc.splitTextToSize(corpsSubst, CONTENT_WIDTH);

      const titreHeight = titreLines.length * 6;
      // Réserver le titre + au moins les 3 premières lignes du corps pour
      // éviter qu'un titre se retrouve seul en bas de page
      const firstBodyHeight = Math.min(corpsLines.length, 3) * 4.8;

      ensureSpace(titreHeight + 3 + firstBodyHeight);

      // Titre
      doc.setFontSize(11);
      doc.setFont('helvetica', 'bold');
      doc.text(titreLines, MARGIN, y);
      y += titreHeight + 3; // espacement entre titre et corps

      // Corps
      doc.setFontSize(9.5);
      doc.setFont('helvetica', 'normal');
      for (let i = 0; i < corpsLines.length; i++) {
        if (y + 4.8 > BOTTOM_LIMIT) {
          addFooter(doc);
          doc.addPage();
          y = TOP_START;
        }
        doc.text(corpsLines[i], MARGIN, y);
        y += 4.8;
      }
      y += 12; // espacement entre articles (augmenté de 8 → 12)
    });
  }

  // ─── Bloc signature ────────────────────────────────────────────────────────
  ensureSpace(50);
  y += 10;

  doc.setFontSize(9.5);
  doc.setFont('helvetica', 'normal');
  const lieu = safeFields.LIEU_SIGNATURE || safeFields.ADRESSE_VILLE || company?.adresse_ville || '................';
  const dateStr = safeFields.DATE || new Date().toLocaleDateString('fr-FR');
  doc.text(`Fait à ${lieu}, le ${dateStr}`, PAGE_WIDTH / 2, y, { align: 'center' });
  y += 15;

  const colWidth = (CONTENT_WIDTH - 20) / 2;
  const col1X = MARGIN;
  const col2X = MARGIN + colWidth + 20;

  doc.setFont('helvetica', 'bold');
  doc.text('Le Prestataire', col1X, y);
  doc.text('Le Client', col2X, y);
  y += 8;

  doc.setFont('helvetica', 'normal');
  doc.setFontSize(8);
  doc.text(company?.company_name || '{{NOM_ENTREPRISE}}', col1X, y);
  doc.text(safeFields.PRENOM_NOM_CLIENT || '{{NOM_CLIENT}}', col2X, y);
  y += 15;

  doc.setLineWidth(0.3);
  doc.line(col1X, y, col1X + colWidth, y);
  doc.line(col2X, y, col2X + colWidth, y);
  y += 5;
  doc.setFontSize(8);
  doc.text('Signature et cachet', col1X, y);
  doc.text('Signature', col2X, y);

  // ─── Pied de page final ────────────────────────────────────────────────────
  addFooter(doc);

  return doc;
}