/**
 * exportInvitesExcel — Export Excel de la liste des invités
 * Architecture plate : chaque ligne = une personne indépendante
 * Feuille 1 : Résumé | Feuille 2 : Liste complète
 */
import * as XLSX from 'xlsx';

const ALLERGENE_LABELS = {
  gluten: 'Gluten', crustaces: 'Crustacés', oeufs: 'Œufs', poissons: 'Poissons',
  arachides: 'Arachides', soja: 'Soja', lait: 'Lait', fruits_coque: 'Fruits à coque',
  celeri: 'Céleri', moutarde: 'Moutarde', sesame: 'Sésame', sulfites: 'Sulfites',
  lupin: 'Lupin', mollusques: 'Mollusques',
};

function labelsAllergenes(ids) {
  return (ids || []).map(id => ALLERGENE_LABELS[id] || id).join(', ');
}

function getAllergenesParType(invites) {
  const map = {};
  invites.forEach(invite => {
    const nom = `${invite.prenom} ${invite.nom}`;
    (invite.allergenes || []).forEach(alg => {
      if (!map[alg]) map[alg] = [];
      map[alg].push(nom);
    });
  });
  return map;
}

function getReponsesCustomCols(invites) {
  // Collecter toutes les clés de questions custom présentes dans les données
  const keysSet = new Set();
  invites.forEach(i => { Object.keys(i.reponses_custom || {}).forEach(k => keysSet.add(k)); });
  return Array.from(keysSet).sort();
}

export function exportInvitesExcel({ invites, evenementNom, evenementDate }) {
  const wb = XLSX.utils.book_new();

  const total = invites.length;
  const confirmes = invites.filter(i => i.statut_rsvp === 'Confirmé').length;
  const attente = invites.filter(i => !i.statut_rsvp || i.statut_rsvp === 'En attente').length;
  const absents = invites.filter(i => i.statut_rsvp === 'Absent').length;
  const adultes = invites.filter(i => i.categorie !== 'Mineur').length;
  const mineurs = invites.filter(i => i.categorie === 'Mineur').length;
  const allergenesMap = getAllergenesParType(invites);

  // ── Feuille 1 : Résumé ──
  const resumeRows = [
    ['Événement', evenementNom || ''],
    ['Date', evenementDate ? new Date(evenementDate + 'T12:00:00').toLocaleDateString('fr-FR') : ''],
    [],
    ['Total personnes', total],
    ['Confirmées', confirmes],
    ['En attente', attente],
    ['Absentes', absents],
    [],
    ['Adultes', adultes],
    ['Mineurs', mineurs],
    [],
    ['Allergènes — synthèse', ''],
  ];

  Object.entries(allergenesMap).forEach(([algId, personnes]) => {
    resumeRows.push([ALLERGENE_LABELS[algId] || algId, personnes.join(', ')]);
  });

  if (Object.keys(allergenesMap).length === 0) {
    resumeRows.push(['Aucune allergie déclarée', '']);
  }

  const ws1 = XLSX.utils.aoa_to_sheet(resumeRows);
  ws1['!cols'] = [{ wch: 30 }, { wch: 60 }];
  XLSX.utils.book_append_sheet(wb, ws1, 'Résumé');

  // ── Feuille 2 : Liste complète ──
  const customKeys = getReponsesCustomCols(invites);
  const customHeaders = customKeys.map(k => `Question ${parseInt(k) + 1}`);

  const headers = [
    'Prénom', 'Nom', 'Catégorie', 'Âge',
    'Statut RSVP', 'Mode invitation', 'Moment',
    'Groupe', 'Table attribuée',
    'Allergènes', 'Régime alimentaire', 'Hébergement',
    'Email', 'Téléphone',
    ...customHeaders,
  ];

  const rows = invites.map(invite => [
    invite.prenom || '',
    invite.nom || '',
    invite.categorie || 'Adulte',
    invite.categorie === 'Mineur' && invite.age ? invite.age : '',
    invite.statut_rsvp || 'En attente',
    invite.mode_invitation || 'Libre',
    invite.moment_nom || '',
    invite.groupe || '',
    invite.table_attribuee || '',
    labelsAllergenes(invite.allergenes),
    invite.regime_alimentaire || '',
    invite.besoin_hebergement ? 'Oui' : 'Non',
    invite.email || '',
    invite.telephone || '',
    ...customKeys.map(k => (invite.reponses_custom || {})[k] || ''),
  ]);

  const ws2 = XLSX.utils.aoa_to_sheet([headers, ...rows]);
  ws2['!cols'] = headers.map(() => ({ wch: 20 }));
  XLSX.utils.book_append_sheet(wb, ws2, 'Liste complète');

  const dateStr = new Date().toISOString().slice(0, 10);
  XLSX.writeFile(wb, `invites_${(evenementNom || 'evenement').replace(/\s+/g, '_')}_${dateStr}.xlsx`);
}