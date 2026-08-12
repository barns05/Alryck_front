// Calcul du "statut global" agrégé d'un événement à partir de ses documents Devis
// et de leurs échéances. Retourne { label, color } ou null si aucun document.
//
// Granularité : agrège TOUS les documents (devis + factures) rattachés à l'événement,
// contrairement à l'ancienne version qui ne regardait que devisList[0].
//
// Règles :
// - total reçu >= total TTC de l'ensemble → "Soldé"
// - au moins une échéance reçue → "Acompte reçu" / "Paiement partiel"
// - sinon, au moins un devis Envoyé/Accepté → "Devis envoyé"
// - sinon → statut brut du document le plus récent

export function calcStatutGlobal(devisList = [], echeancesByDevis = {}) {
  if (!devisList || devisList.length === 0) return null;

  const totalTTC = devisList.reduce((s, d) => s + (d.total_ttc || 0), 0);

  const allEcheances = devisList.flatMap(d => echeancesByDevis[d.id] || []);
  const totalRecu = allEcheances
    .filter(e => e.statut === 'Reçu')
    .reduce((s, e) => s + (e.montant_calcule || 0), 0);

  let label, color;

  if (totalTTC > 0 && totalRecu >= totalTTC) {
    label = 'Soldé ✅';
    color = 'bg-emerald-100 text-emerald-700 border-emerald-200';
  } else if (allEcheances.some(e => e.statut === 'Reçu')) {
    const nbRecues = allEcheances.filter(e => e.statut === 'Reçu').length;
    label = nbRecues >= 1 ? 'Acompte reçu' : 'Paiement partiel';
    color = 'bg-blue-100 text-blue-700 border-blue-200';
  } else if (devisList.some(d => d.statut === 'Envoyé' || d.statut === 'Accepté')) {
    label = 'Devis envoyé';
    color = 'bg-amber-100 text-amber-700 border-amber-200';
  } else {
    // Statut brut du document le plus récent (created_date desc)
    const plusRecent = [...devisList].sort((a, b) =>
      new Date(b.created_date || 0) - new Date(a.created_date || 0)
    )[0];
    label = plusRecent?.statut || 'Brouillon';
    color = 'bg-slate-100 text-slate-600 border-slate-200';
  }

  return { label, color };
}