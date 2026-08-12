/**
 * SuperPDPStatusBadge — Badge de statut de transmission électronique SuperPDP.
 * Affiché à côté du statut métier de la facture (devis.type_document facture).
 *
 * Statuts : en_attente, transmise, livree, echec.
 * Retourne null si aucun statut SuperPDP n'est renseigné (facture non transmise).
 */
const STATUT_CONFIG = {
  en_attente: { label: 'PDP · En attente', cls: 'bg-blue-50 text-blue-600 border-blue-200' },
  transmise:  { label: 'PDP · Transmise', cls: 'bg-violet-50 text-violet-600 border-violet-200' },
  livree:     { label: 'PDP · Livrée',    cls: 'bg-emerald-50 text-emerald-600 border-emerald-200' },
  echec:      { label: 'PDP · Échec',      cls: 'bg-red-50 text-red-600 border-red-200' },
};

export default function SuperPDPStatusBadge({ statut, compact = false }) {
  if (!statut) return null;
  const config = STATUT_CONFIG[statut];
  if (!config) return null;
  return (
    <span
      className={`${compact ? 'text-[10px] px-1.5 py-0.5' : 'text-[10px] px-1.5 py-0.5'} rounded-full font-medium border ${config.cls}`}
      title="Statut de transmission électronique (SuperPDP)"
    >
      {config.label}
    </span>
  );
}