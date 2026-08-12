import { useQuery } from '@tanstack/react-query';
import { base44 } from '@/api/base44Client';

const TILE_CONFIG = [
  {
    id: 'programme',
    emoji: '📋',
    label: 'Programme de la journée',
    color: 'bg-blue-50 border-blue-100',
    badgeColor: 'bg-blue-100 text-blue-700',
  },
  {
    id: 'formulaire',
    emoji: '📝',
    label: 'Mon questionnaire',
    color: 'bg-amber-50 border-amber-100',
    badgeColor: 'bg-amber-100 text-amber-700',
  },
  {
    id: 'medias',
    emoji: '📸',
    label: 'Mes médias',
    color: 'bg-purple-50 border-purple-100',
    badgeColor: 'bg-purple-100 text-purple-700',
  },
  {
    id: 'messages',
    emoji: '💬',
    label: 'Messages',
    color: 'bg-emerald-50 border-emerald-100',
    badgeColor: 'bg-emerald-100 text-emerald-700',
  },
  {
    id: 'documents',
    emoji: '📄',
    label: 'Mes documents',
    color: 'bg-slate-50 border-slate-100',
    badgeColor: 'bg-slate-100 text-slate-700',
  },
  {
    id: 'prestataires',
    emoji: '👥',
    label: 'Nos prestataires',
    color: 'bg-rose-50 border-rose-100',
    badgeColor: 'bg-rose-100 text-rose-700',
  },
];

function useTileBadges({ evenement, clientId }) {
  const { data: formulaires = [] } = useQuery({
    queryKey: ['formulaire-client', evenement.id],
    queryFn: () => base44.entities.FormulairePreparation.filter({ evenement_id: evenement.id }),
  });

  const { data: medias = [] } = useQuery({
    queryKey: ['photos-client', evenement.id],
    queryFn: () => base44.entities.PhotoClient.filter({ evenement_id: evenement.id }),
  });

  const { data: conversations = [] } = useQuery({
    queryKey: ['conversations-badge', evenement.client_id || evenement.id, evenement.id],
    queryFn: () => base44.entities.Conversation.filter({ client_id: evenement.client_id || `guest-${evenement.id}`, evenement_id: evenement.id }),
  });

  const { data: documents = [] } = useQuery({
    queryKey: ['client-documents', clientId, evenement.id],
    queryFn: () => clientId ? base44.entities.ClientDocument.filter({ client_id: clientId }, '-created_date', 100) : [],
    enabled: !!clientId,
  });

  const { data: devis = [] } = useQuery({
    queryKey: ['devis-client-portal', evenement.id],
    queryFn: () => base44.entities.Devis.filter({ evenement_id: evenement.id }),
  });

  const { data: evPrestataires = [] } = useQuery({
    queryKey: ['ev-prestataires-client', evenement.id],
    queryFn: () => base44.entities.EvenementPrestataire.filter({ evenement_id: evenement.id }),
  });

  const formulaire = formulaires.find(f => ['Envoyé', 'En cours', 'Complété', 'Clôturé'].includes(f.statut));
  const isFormulaireCompleted = formulaire && ['Complété', 'Clôturé'].includes(formulaire.statut);
  const isFormulaireEnCours = formulaire && ['Envoyé', 'En cours'].includes(formulaire.statut);
  const formulaireBadge = isFormulaireCompleted ? 'Envoyé ✓' : isFormulaireEnCours ? 'À remplir' : null;

  const nonLus = conversations[0]?.non_lus_client || 0;
  const confirmes = evPrestataires.filter(ep => ep.statut === 'Confirmé').length;

  const programme = evenement.programme_journee || [];

  return {
    programme: { visible: programme.length > 0, badge: programme.length > 0 ? `${programme.length} étapes` : null },
    formulaire: { visible: !!formulaire, badge: formulaireBadge, urgent: isFormulaireEnCours },
    medias: { visible: true, badge: medias.length > 0 ? `${medias.length} fichier${medias.length > 1 ? 's' : ''}` : null },
    messages: { visible: true, badge: nonLus > 0 ? `${nonLus} non lu${nonLus > 1 ? 's' : ''}` : null, urgent: nonLus > 0 },
    documents: (() => { const totalDocs = documents.length + devis.filter(d => d.statut !== 'Brouillon').length; return { visible: totalDocs > 0, badge: totalDocs > 0 ? `${totalDocs}` : null }; })(),
    prestataires: { visible: confirmes > 0, badge: confirmes > 0 ? `${confirmes} confirmé${confirmes > 1 ? 's' : ''}` : null },
  };
}

export default function ClientPortalTiles({ evenement, clientId, onSelectTile }) {
  const badges = useTileBadges({ evenement, clientId });

  const visibleTiles = TILE_CONFIG.filter(t => badges[t.id]?.visible !== false);

  if (visibleTiles.length === 0) return null;

  return (
    <div className="grid grid-cols-2 gap-3 px-4 py-4">
      {visibleTiles.map(tile => {
        const info = badges[tile.id] || {};
        return (
          <button
            key={tile.id}
            onClick={() => onSelectTile(tile.id)}
            className={`relative flex flex-col items-start gap-3 p-4 rounded-2xl border-2 text-left transition-all hover:scale-[1.02] active:scale-[0.98] ${tile.color}`}
          >
            <span className="text-3xl">{tile.emoji}</span>
            <div className="space-y-1 w-full">
              <p className="font-semibold text-sm text-foreground leading-tight">{tile.label}</p>
              {info.badge && (
                <span className={`inline-block text-[11px] font-medium px-2 py-0.5 rounded-full ${tile.badgeColor} ${info.urgent ? 'animate-pulse' : ''}`}>
                  {info.badge}
                </span>
              )}
            </div>
          </button>
        );
      })}
    </div>
  );
}