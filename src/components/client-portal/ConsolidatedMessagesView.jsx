/**
 * ConsolidatedMessagesView
 * Liste toutes les conversations liées à l'événement,
 * groupées par prestataire. Au clic, ouvre la conversation.
 */
import { useState, useEffect } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { useQuery } from '@tanstack/react-query';
import { base44 } from '@/api/base44Client';
import { X, ArrowLeft } from 'lucide-react';
import ChatSection from './ChatSection';
import PortalBackButton from './PortalBackButton';

function getInitiales(nom = '') {
  return nom.trim().split(/\s+/).map(w => w[0]).join('').toUpperCase().slice(0, 2);
}

function formatDate(dateStr) {
  if (!dateStr) return '';
  const d = new Date(dateStr);
  const now = new Date();
  const diff = now - d;
  if (diff < 60000) return 'À l\'instant';
  if (diff < 3600000) return `${Math.floor(diff / 60000)} min`;
  if (diff < 86400000) return `${Math.floor(diff / 3600000)} h`;
  return d.toLocaleDateString('fr-FR', { day: 'numeric', month: 'short' });
}

export default function ConsolidatedMessagesView({ evenement, clientId, clientNom, prestataireFilter, onPrestataireFilterConsumed }) {
  const [openConvId, setOpenConvId] = useState(null);

  const clientIdFinal = clientId || `guest-${evenement?.id}`;

  const { data: conversations = [] } = useQuery({
    queryKey: ['conversations-badge', clientIdFinal, evenement?.id],
    queryFn: () => base44.entities.Conversation.filter({
      client_id: clientIdFinal,
      evenement_id: evenement?.id,
    }),
    enabled: !!evenement?.id,
    refetchInterval: 15000,
  });

  // Auto-open the conversation matching the prestataire filter
  useEffect(() => {
    if (prestataireFilter && conversations.length > 0 && !openConvId) {
      const match = conversations.find(c =>
        (prestataireFilter.prestataire_id && c.prestataire_id === prestataireFilter.prestataire_id) ||
        (prestataireFilter.prestataire_nom && c.prestataire_nom === prestataireFilter.prestataire_nom)
      );
      if (match) {
        setOpenConvId(match.id);
        onPrestataireFilterConsumed?.();
      }
    }
  }, [prestataireFilter, conversations, openConvId]);

  const { data: messages = [] } = useQuery({
    queryKey: ['messages-consolidated', evenement?.id],
    queryFn: () => base44.entities.Message.filter({ evenement_id: evenement?.id }, '-created_date', 200),
    enabled: !!evenement?.id && conversations.length > 0,
  });

  // Dernier message par conversation
  const lastMsgByConv = {};
  messages.forEach(m => {
    if (!lastMsgByConv[m.conversation_id] || new Date(m.created_date) > new Date(lastMsgByConv[m.conversation_id].created_date)) {
      lastMsgByConv[m.conversation_id] = m;
    }
  });

  const openConv = conversations.find(c => c.id === openConvId);

  if (openConvId && openConv) {
    return (
      <div className="flex flex-col h-full">
        {/* Header retour */}
        <div className="flex items-center gap-3 px-4 py-3 border-b shrink-0" style={{ borderColor: '#e8e4dc' }}>
          <button onClick={() => setOpenConvId(null)} className="text-gray-400 hover:text-gray-700">
            <ArrowLeft size={20} />
          </button>
          <p className="font-semibold text-sm" style={{ color: '#1e1b4b' }}>
            {openConv.prestataire_nom || openConv.nom || 'Conversation'}
          </p>
          {openConv.prestataire_nom && (
            <span className="text-[10px] font-medium px-2 py-0.5 rounded-full" style={{ background: 'rgba(30,27,75,0.08)', color: '#1e1b4b' }}>
              Prestataire
            </span>
          )}
        </div>
        <div className="flex-1 overflow-y-auto">
          <ChatSection
            clientId={clientIdFinal}
            evenementId={evenement.id}
            evenementNom={evenement.nom}
            clientNom={clientNom}
            isAdmin={false}
            conversationId={openConvId}
          />
        </div>
      </div>
    );
  }

  return (
    <div className="px-4 py-4">
      <PortalBackButton />
      <p className="text-[11px] font-semibold text-muted-foreground uppercase tracking-widest mb-4">
        💬 Mes messages
      </p>

      {conversations.length === 0 ? (
        <div className="flex flex-col items-center justify-center py-16 text-center gap-3">
          <span className="text-5xl">💬</span>
          <p className="font-semibold text-sm" style={{ color: '#1e1b4b' }}>Aucune conversation</p>
          <p className="text-xs text-gray-400">Vos échanges avec l'équipe et les prestataires apparaîtront ici.</p>
        </div>
      ) : (
        <div className="space-y-2">
          {conversations.map(conv => {
            const lastMsg = lastMsgByConv[conv.id];
            const nonLus = conv.non_lus_client || 0;
            const nom = conv.prestataire_nom || conv.nom || 'Équipe';

            return (
              <motion.button
                key={conv.id}
                whileTap={{ scale: 0.98 }}
                onClick={() => setOpenConvId(conv.id)}
                className="w-full flex items-center gap-3 p-3 rounded-2xl border text-left transition-all"
                style={{
                  background: nonLus > 0 ? '#f0f9ff' : '#ffffff',
                  borderColor: nonLus > 0 ? '#bae6fd' : '#e8e4dc',
                }}
              >
                {/* Avatar */}
                <div
                  className="w-11 h-11 rounded-xl flex items-center justify-center shrink-0 font-bold text-sm text-white"
                  style={{ background: '#1e1b4b' }}
                >
                  {getInitiales(nom)}
                </div>

                {/* Contenu */}
                <div className="flex-1 min-w-0">
                  <div className="flex items-baseline justify-between gap-2">
                    <p className={`text-sm truncate ${nonLus > 0 ? 'font-bold' : 'font-medium'}`} style={{ color: '#1e1b4b' }}>
                      {nom}
                    </p>
                    <span className="text-[10px] text-gray-400 shrink-0">{formatDate(lastMsg?.created_date)}</span>
                  </div>
                  <p className={`text-xs truncate mt-0.5 ${nonLus > 0 ? 'font-medium text-gray-700' : 'text-gray-400'}`}>
                    {lastMsg?.contenu || lastMsg?.message || 'Démarrer la conversation…'}
                  </p>
                </div>

                {/* Badge non lus */}
                {nonLus > 0 && (
                  <span className="shrink-0 min-w-[20px] h-5 rounded-full flex items-center justify-center text-[10px] font-bold text-white px-1"
                    style={{ background: '#ef4444' }}>
                    {nonLus > 99 ? '99+' : nonLus}
                  </span>
                )}
              </motion.button>
            );
          })}
        </div>
      )}
    </div>
  );
}