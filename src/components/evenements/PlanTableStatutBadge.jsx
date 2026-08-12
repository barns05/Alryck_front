/**
 * Badge statut plan de table sur la carte événement.
 * - Masqué si plan_table_actif est false
 * - Gris "À faire" : actif mais pas uploadé
 * - Vert "✅ Prêt" : uploadé
 * - Bleu "📨 Envoyé" : envoyé aux équipes
 */
export default function PlanTableStatutBadge({ evenement }) {
  if (!evenement.plan_table_actif && evenement.plan_table_actif !== undefined) return null;

  if (evenement.plan_table_envoye) {
    return (
      <span className="text-xs px-2 py-0.5 rounded-md bg-blue-100 text-blue-700 font-medium">
        Envoyé
      </span>
    );
  }

  if (evenement.plan_table_url) {
    return (
      <span className="text-xs px-2 py-0.5 rounded-md bg-emerald-100 text-emerald-700 font-medium">
        Prêt
      </span>
    );
  }

  return (
    <span className="text-xs px-2 py-0.5 rounded-md bg-slate-100 text-slate-600 font-medium">
      À faire
    </span>
  );
}