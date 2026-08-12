/**
 * YousignStatusBadge — Badge affichant le statut de signature électronique
 * Youtrust (ex-Yousign) à côté du statut métier du contrat.
 *
 * Statuts : draft (brouillon), activated (en attente), done (signé),
 * expired (expiré), cancelled (annulé).
 */
const YOUSIGN_STATUT_CONFIG = {
  draft:     { label: 'E-sign · Brouillon',  cls: 'bg-slate-100 text-slate-500 border-slate-200' },
  activated: { label: 'E-sign · En attente', cls: 'bg-blue-50 text-blue-600 border-blue-200' },
  done:      { label: 'Signé électroniquement', cls: 'bg-emerald-50 text-emerald-600 border-emerald-200' },
  expired:   { label: 'E-sign · Expiré',     cls: 'bg-orange-50 text-orange-600 border-orange-200' },
  cancelled: { label: 'E-sign · Annulé',     cls: 'bg-red-50 text-red-600 border-red-200' },
};

export default function YousignStatusBadge({ statut }) {
  if (!statut) return null;
  const config = YOUSIGN_STATUT_CONFIG[statut] || YOUSIGN_STATUT_CONFIG.draft;
  return (
    <span className={`text-[10px] px-1.5 py-0.5 rounded-full font-medium border ${config.cls}`}>
      {config.label}
    </span>
  );
}