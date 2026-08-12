/**
 * NotificationsView
 * Flux chronologique de toutes les alertes du portail client :
 * - Message reçu
 * - Document partagé
 * - Prestataire recommandé (vu_par_client = false)
 * - Rappel checklist
 */
import { motion } from 'framer-motion';
import { useQuery, useQueryClient } from '@tanstack/react-query';
import { base44 } from '@/api/base44Client';
import { toast } from 'sonner';
import { setActiveTabId } from './portalTabStore';
import PortalBackButton from './PortalBackButton';

const TYPE_CONFIG = {
  message:      { emoji: '💬', color: '#1d4ed8', bg: '#eff6ff', label: 'Nouveau message' },
  document:     { emoji: '📄', color: '#7c3aed', bg: '#faf5ff', label: 'Document partagé' },
  prestataire:  { emoji: '⭐', color: '#b45309', bg: '#fffbeb', label: 'Prestataire recommandé' },
  checklist:    { emoji: '✅', color: '#16a34a', bg: '#f0fdf4', label: 'Rappel checklist' },
  promotion:    { emoji: '🏷️', color: '#b45309', bg: '#fffbeb', label: 'Offre promotionnelle' },
  info:         { emoji: '🔔', color: '#475569', bg: '#f8fafc', label: 'Information' },
};

function formatDate(dateStr) {
  if (!dateStr) return '';
  const d = new Date(dateStr);
  const now = new Date();
  const diff = now - d;
  if (diff < 60000) return 'À l\'instant';
  if (diff < 3600000) return `il y a ${Math.floor(diff / 60000)} min`;
  if (diff < 86400000) return `il y a ${Math.floor(diff / 3600000)} h`;
  if (diff < 172800000) return 'Hier';
  return d.toLocaleDateString('fr-FR', { day: 'numeric', month: 'long' });
}

function buildNotifications({ conversations, documents, devis, contrats, evPrestataires, promotions, evenement }) {
  const notifs = [];

  // Messages non lus
  conversations.forEach(conv => {
    const nonLus = conv.non_lus_client || 0;
    if (nonLus > 0) {
      notifs.push({
        id: `msg-${conv.id}`,
        type: 'message',
        titre: `${nonLus} nouveau${nonLus > 1 ? 'x' : ''} message${nonLus > 1 ? 's' : ''}`,
        detail: `De : ${conv.prestataire_nom || conv.nom || 'Votre équipe'}`,
        date: conv.updated_date || conv.created_date,
        refId: conv.id,
      });
    }
  });

  // Documents récents (7 jours)
  const sevenDaysAgo = Date.now() - 7 * 86400000;
  documents.forEach(doc => {
    if (new Date(doc.created_date) > sevenDaysAgo) {
      notifs.push({
        id: `doc-${doc.id}`,
        type: 'document',
        titre: `Document partagé`,
        detail: doc.nom || doc.titre || 'Nouveau document',
        date: doc.created_date,
      });
    }
  });

  // Contrats récents (7 jours)
  contrats.filter(c => c.statut !== 'Archivé' && new Date(c.created_date) > sevenDaysAgo).forEach(c => {
    notifs.push({
      id: `contrat-${c.id}`,
      type: 'document',
      titre: 'Contrat disponible',
      detail: c.titre || '',
      date: c.created_date,
    });
  });

  // Devis envoyés récemment
  devis.filter(d => d.statut === 'Envoyé' && new Date(d.updated_date) > sevenDaysAgo).forEach(d => {
    notifs.push({
      id: `devis-${d.id}`,
      type: 'document',
      titre: `${d.type_document || 'Devis'} disponible`,
      detail: d.numero || d.objet || '',
      date: d.updated_date,
    });
  });

  // Nouveaux prestataires recommandés
  evPrestataires.filter(ep => ep.vu_par_client === false).forEach(ep => {
    notifs.push({
      id: `presta-${ep.id}`,
      type: 'prestataire',
      titre: 'Nouveau prestataire recommandé',
      detail: `${ep.prestataire_nom} · ${ep.prestataire_domaine || ''}`,
      date: ep.created_date,
      refId: ep.id,
    });
  });

  // Checklist — tâches non cochées sur l'événement
  const taches = evenement?.checklist || [];
  const nonCochees = taches.filter(t => !t.checked).length;
  if (nonCochees > 0) {
    notifs.push({
      id: 'checklist-rappel',
      type: 'checklist',
      titre: `${nonCochees} tâche${nonCochees > 1 ? 's' : ''} en attente`,
      detail: 'Consultez votre checklist dans Mon espace',
      date: evenement?.updated_date,
    });
  }

  // Promotions non traitées (reponse === 'Envoyé' = non vues par le client)
  (promotions || []).filter(p => p.reponse === 'Envoyé').forEach(p => {
    notifs.push({
      id: `promo-${p.id}`,
      type: 'promotion',
      titre: 'Offre promotionnelle disponible',
      detail: p.promotion_titre || '',
      date: p.date_reponse || p.created_date,
    });
  });

  // Trier par date décroissante
  return notifs.sort((a, b) => new Date(b.date || 0) - new Date(a.date || 0));
}

export default function NotificationsView({ evenement, clientId }) {
  const qc = useQueryClient();
  const clientIdFinal = clientId || `guest-${evenement?.id}`;

  const { data: conversations = [] } = useQuery({
    queryKey: ['conversations-badge', clientIdFinal, evenement?.id],
    queryFn: () => base44.entities.Conversation.filter({ client_id: clientIdFinal, evenement_id: evenement?.id }),
    enabled: !!evenement?.id,
    refetchInterval: 30000,
  });

  const { data: documents = [] } = useQuery({
    queryKey: ['client-documents', clientId, evenement?.id],
    queryFn: () => clientId
      ? base44.entities.ClientDocument.filter({ client_id: clientId }, '-created_date', 50)
      : [],
    enabled: !!clientId,
  });

  const { data: devis = [] } = useQuery({
    queryKey: ['devis-client-portal', evenement?.id],
    queryFn: () => base44.entities.Devis.filter({ evenement_id: evenement?.id }),
    enabled: !!evenement?.id,
  });

  const { data: evPrestataires = [] } = useQuery({
    queryKey: ['ev-prestataires-client', evenement?.id],
    queryFn: () => base44.entities.EvenementPrestataire.filter({ evenement_id: evenement?.id }),
    enabled: !!evenement?.id,
  });

  const { data: contrats = [] } = useQuery({
    queryKey: ['client-contrats-notif', clientId],
    queryFn: () => clientId
      ? base44.entities.Contrat.filter({ client_id: clientId, type: 'client' }, '-created_date', 50)
      : [],
    enabled: !!clientId,
  });

  const { data: promotions = [] } = useQuery({
    queryKey: ['promo-reponses-notif', evenement?.id],
    queryFn: () => base44.entities.PromotionReponse.filter({ evenement_id: evenement?.id }),
    enabled: !!evenement?.id,
  });

  const notifs = buildNotifications({ conversations, documents, devis, contrats, evPrestataires, promotions, evenement });

  // Tap sur une notification : marquer comme lue + déclencher la navigation associée.
  const handleNotifTap = async (notif) => {
    try {
      if (notif.type === 'prestataire' && notif.refId) {
        await base44.entities.EvenementPrestataire.update(notif.refId, { vu_par_client: true });
        qc.invalidateQueries({ queryKey: ['ev-prestataires-client'] });
        qc.invalidateQueries({ queryKey: ['ev-prestataires-selection'] });
        setActiveTabId('favoris');
        toast.success('Marqué comme lu — retrouvez ce prestataire dans « Mes favoris ».');
        return;
      }
      if (notif.type === 'message' && notif.refId) {
        await base44.entities.Conversation.update(notif.refId, { non_lus_client: 0 });
        qc.invalidateQueries({ queryKey: ['conversations-badge'] });
        toast.success('Messages marqués comme lus.');
        return;
      }
      if (notif.type === 'checklist') {
        setActiveTabId('organisation');
        toast.info('Retrouvez votre checklist dans « Mon espace ».');
        return;
      }
      if (notif.type === 'promotion') {
        setActiveTabId('evenement');
        toast.info('Retrouvez l\'offre sur la carte de votre prestataire.');
        return;
      }
    } catch {
      toast.error('Impossible de marquer la notification.');
    }
  };

  return (
    <div className="px-4 py-4">
      <PortalBackButton />
      <p className="text-[11px] font-semibold text-muted-foreground uppercase tracking-widest mb-4">
        🔔 Mes alertes
      </p>

      {notifs.length === 0 ? (
        <div className="flex flex-col items-center justify-center py-16 text-center gap-3">
          <span className="text-5xl">🔔</span>
          <p className="font-semibold text-sm" style={{ color: '#1e1b4b' }}>Tout est à jour !</p>
          <p className="text-xs text-gray-400">Vos notifications apparaîtront ici au fil de la préparation.</p>
        </div>
      ) : (
        <div className="space-y-2">
          {notifs.map((notif, i) => {
            const cfg = TYPE_CONFIG[notif.type] || TYPE_CONFIG.info;
            const actionable = ['prestataire', 'message', 'checklist', 'promotion'].includes(notif.type);
            return (
              <motion.div
                key={notif.id}
                initial={{ opacity: 0, y: 8 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{ delay: i * 0.04 }}
                onClick={actionable ? () => handleNotifTap(notif) : undefined}
                className={`flex items-start gap-3 p-3 rounded-2xl border ${actionable ? 'cursor-pointer active:scale-[0.98]' : ''}`}
                style={{ background: '#ffffff', borderColor: '#e8e4dc' }}
              >
                {/* Icône */}
                <div className="w-10 h-10 rounded-xl flex items-center justify-center shrink-0 text-lg"
                  style={{ background: cfg.bg }}>
                  {cfg.emoji}
                </div>

                {/* Contenu */}
                <div className="flex-1 min-w-0">
                  <p className="text-sm font-semibold" style={{ color: '#1e1b4b' }}>{notif.titre}</p>
                  {notif.detail && (
                    <p className="text-xs text-gray-400 mt-0.5 truncate">{notif.detail}</p>
                  )}
                </div>

                {/* Date */}
                <span className="text-[10px] text-gray-400 shrink-0 mt-0.5">{formatDate(notif.date)}</span>
              </motion.div>
            );
          })}
        </div>
      )}
    </div>
  );
}