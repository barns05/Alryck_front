import { useState, useEffect, useRef } from 'react';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { base44 } from '@/api/base44Client';
import { Send, MessageCircle } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { format, parseISO } from 'date-fns';
import { fr } from 'date-fns/locale';

export default function ChatSection({ clientId, evenementId, evenementNom, clientNom, isAdmin = false, conversationId = null }) {
  const qc = useQueryClient();
  const [newMessage, setNewMessage] = useState('');
  const bottomRef = useRef(null);
  const hasInteracted = useRef(false);

  // Récupère la conversation
  const { data: conversations = [] } = useQuery({
    queryKey: ['conversations', clientId, evenementId],
    queryFn: async () => {
      const convs = await base44.entities.Conversation.filter({ client_id: clientId, evenement_id: evenementId });
      // Créer une conversation vide si elle n'existe pas
      if (convs.length === 0) {
        try {
          const newConv = await base44.entities.Conversation.create({
            client_id: clientId,
            evenement_id: evenementId,
            evenement_nom: evenementNom,
            client_nom: clientNom,
          });
          return [newConv];
        } catch (e) {
          return [];
        }
      }
      return convs;
    },
  });

  const conversation = conversationId
    ? conversations.find(c => c.id === conversationId) || null
    : conversations[0] || null;

  const { data: messages = [] } = useQuery({
    queryKey: ['messages', conversation?.id],
    queryFn: () => base44.entities.Message.filter({ conversation_id: conversation.id }, 'created_date', 200),
    enabled: !!conversation?.id,
    refetchInterval: 3000,
  });

  useEffect(() => {
    if (hasInteracted.current) {
      bottomRef.current?.scrollIntoView({ behavior: 'smooth' });
    }
  }, [messages]);

  const createConvMutation = useMutation({
    mutationFn: () => base44.entities.Conversation.create({
      client_id: clientId,
      evenement_id: evenementId,
      evenement_nom: evenementNom,
      client_nom: clientNom,
    }),
    onSuccess: () => qc.invalidateQueries(['conversations', clientId, evenementId]),
  });

  // Remise à 0 des non-lus à l'ouverture du chat
  useEffect(() => {
    if (!conversation?.id) return;
    if (isAdmin && (conversation.non_lus_admin || 0) > 0) {
      base44.entities.Conversation.update(conversation.id, { non_lus_admin: 0 })
        .then(() => qc.invalidateQueries(['conversations']));
    }
    if (!isAdmin && (conversation.non_lus_client || 0) > 0) {
      base44.entities.Conversation.update(conversation.id, { non_lus_client: 0 })
        .then(() => qc.invalidateQueries(['conversations']));
    }
  }, [isAdmin, conversation?.id]);

  const sendMutation = useMutation({
    mutationFn: async (content) => {
      let conv = conversation;
      if (!conv) {
        conv = await base44.entities.Conversation.create({
          client_id: clientId,
          evenement_id: evenementId,
          evenement_nom: evenementNom,
          client_nom: clientNom,
          dernier_message: content,
          date_dernier_message: new Date().toISOString(),
          non_lus_admin: isAdmin ? 0 : 1,
        });
      } else {
        await base44.entities.Conversation.update(conv.id, {
          dernier_message: content,
          date_dernier_message: new Date().toISOString(),
          non_lus_admin: isAdmin ? 0 : (conv.non_lus_admin || 0) + 1,
        });
      }
      await base44.entities.Message.create({
        conversation_id: conv.id,
        auteur: isAdmin ? 'admin' : 'client',
        auteur_nom: isAdmin ? 'Organisateur' : clientNom,
        contenu: content,
        lu: isAdmin,
      });
      // Créer une notification pour l'admin si c'est un message client
      if (!isAdmin) {
        await base44.entities.Notification.create({
          titre: `Nouveau message de ${clientNom}`,
          message: content.length > 80 ? content.substring(0, 80) + '…' : content,
          type: 'evenement',
          lien: `/clients/${clientId}`,
          lu: false,
        });
      }
    },
    onSuccess: () => {
      qc.invalidateQueries(['messages']);
      qc.invalidateQueries(['conversations']);
      setNewMessage('');
    },
  });

  const handleSend = () => {
    if (!newMessage.trim()) return;
    hasInteracted.current = true;
    sendMutation.mutate(newMessage.trim());
  };

  return (
    <div className="bg-card rounded-2xl border border-border p-5 flex flex-col">
      <h3 className="font-semibold text-base mb-4 flex items-center gap-2">
        <MessageCircle size={18} className="text-primary" /> Messagerie
      </h3>

      <div className="flex-1 bg-muted/20 rounded-xl p-3 min-h-[200px] max-h-[300px] overflow-y-auto space-y-3 mb-3">
        {messages.length === 0 && (
          <p className="text-sm text-muted-foreground text-center py-6">
            Envoyez un message à votre organisateur !
          </p>
        )}
        {messages.map(msg => (
          <div key={msg.id} className={`flex ${msg.auteur === 'client' ? 'justify-end' : 'justify-start'}`}>
            <div className={`max-w-[80%] rounded-2xl px-3 py-2 text-sm ${
              msg.auteur === 'client'
                ? 'bg-primary text-primary-foreground rounded-br-sm'
                : 'bg-white border border-border text-foreground rounded-bl-sm'
            }`}>
              {msg.auteur === 'admin' && (
                <p className="text-[10px] font-semibold text-primary mb-1">Organisateur</p>
              )}
              <p>{msg.contenu}</p>
              <p className={`text-[10px] mt-1 ${msg.auteur === 'client' ? 'text-primary-foreground/60' : 'text-muted-foreground'}`}>
                {format(parseISO(msg.created_date), 'dd MMM HH:mm', { locale: fr })}
              </p>
            </div>
          </div>
        ))}
        <div ref={bottomRef} />
      </div>

      <div className="flex gap-2">
        <textarea
          value={newMessage}
          onChange={e => setNewMessage(e.target.value)}
          placeholder={isAdmin ? 'Répondre au client...' : 'Votre message...'}
          rows="3"
          className="flex-1 rounded-xl border border-input bg-background px-3 py-2 text-sm resize-none focus-visible:outline-none focus-visible:ring-1 focus-visible:ring-ring"
        />
        <Button size="icon" onClick={handleSend} disabled={!newMessage.trim() || sendMutation.isPending} className="self-end">
          <Send size={15} />
        </Button>
      </div>
    </div>
  );
}