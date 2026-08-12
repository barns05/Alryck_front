import { Download } from 'lucide-react';

export default function PlanTableSection({ evenement }) {
  if (!evenement.plan_table_url) return null;

  const isPDF = /\.pdf$/i.test(evenement.plan_table_nom || evenement.plan_table_url);

  return (
    <div className="bg-card rounded-2xl border border-border p-5 space-y-3">
      <h3 className="font-semibold text-base">🪑 Plan de table</h3>
      {!isPDF && (
        <div className="rounded-xl overflow-hidden border border-border bg-muted">
          <img
            src={evenement.plan_table_url}
            alt="Plan de table"
            className="w-full h-auto object-contain max-h-80"
          />
        </div>
      )}
      <a
        href={evenement.plan_table_url}
        target="_blank"
        rel="noopener noreferrer"
        download={evenement.plan_table_nom || 'plan-de-table'}
        className="flex items-center justify-center gap-2 w-full py-2.5 rounded-xl bg-primary/10 text-primary hover:bg-primary/20 transition-colors text-sm font-medium"
      >
        <Download size={15} />
        {isPDF ? 'Télécharger le plan de table (PDF)' : 'Télécharger le plan de table'}
      </a>
    </div>
  );
}