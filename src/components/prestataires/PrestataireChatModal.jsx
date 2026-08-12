import { useState, useEffect, useRef } from 'react';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { base44 } from '@/api/base44Client';
import { X, Send, MessageCircle } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { format, parseISO } from 'date-fns';
import { fr } from 'date-fns/locale';

export default function PrestataireChatModal({ prestataire, onClose }) {
  const qc = useQueryClient();
  const [newMessage, setNewMessage] = useState('');
  const bottomRef = useRef(null);

  const { data: conversations = [] } = useQuery({
    queryKey: ['conversations-prestataire', prestataire?.id],
    queryFn: () => base44.entities.ConversationPrestataire.filter({ prestataire_id: prestataire.id }),
  });

  const conversation = conversations[0] || null;

  const { data: messages = [] } = useQuery({
    queryKey: ['messages-prestataire', conversation?.id],
    queryFn: () => base44.entities.MessagePrestataire.filter({ conversation_id: conversation?.id }, 'created_date', 200),
    enabled: !!conversation?.id,
    refetchInterval: 5000,
  });

  useEffect(() => {
    bottomRef.current?.scrollIntoView({ behavior: 'smooth' });
  }, [messages]);

  // Marquer les messages non lus comme lus
  useEffect(() => {
    if (conversation?.id && (conversation.non_lus_admin || 0) > 0) {
      base44.entities.ConversationPrestataire.update(conversation.id, { non_lus_admin: 0 })
        .then(() => qc.invalidateQueries(['conversations-prestataire']));
    }
  }, [conversation?.id]);

  const sendMutation = useMutation({
    mutationFn: async (content) => {
      let conv = conversation;
      if (!conv) {
        conv = await base44.entities.ConversationPrestataire.create({
          prestataire_id: prestataire.id,
          prestataire_nom: prestataire.nom,
          prestataire_email: prestataire.email || '',
          dernier_message: content,
          date_dernier_message: new Date().toISOString(),
          non_lus_admin: 0,
        });
      } else {
        await base44.entities.ConversationPrestataire.update(conv.id, {
          dernier_message: content,
          date_dernier_message: new Date().toISOString(),
        });
      }
      await base44.entities.MessagePrestataire.create({
        conversation_id: conv.id,
        auteur: 'admin',
        auteur_nom: 'Organisateur',
        contenu: content,
        lu: true,
      });
    },
    onSuccess: () => {
      qc.invalidateQueries(['messages-prestataire']);
      qc.invalidateQueries(['conversations-prestataire']);
      setNewMessage('');
    },
  });

  const handleSend = () => {
    if (!newMessage.trim()) return;
    sendMutation.mutate(newMessage.trim());
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/40 backdrop-blur-sm p-4">
      <div className="bg-card rounded-2xl border border-border shadow-xl w-full max-w-lg p-6 flex flex-col max-h-[80vh]">
        <div className="flex items-center justify-between mb-4">
          <h3 className="font-semibold text-lg flex items-center gap-2">
            <MessageCircle size={18} className="text-purple-500" />
            Messagerie - {prestataire.nom}
          </h3>
          <button onClick={onClose} className="p-1.5 rounded-lg hover:bg-muted text-muted-foreground">
            <X size={16} />
          </button>
        </div>

        <div className="flex-1 bg-muted/20 rounded-xl p-3 overflow-y-auto space-y-3 mb-3 min-h-[300px]">
          {messages.length === 0 ? (
            <p className="text-sm text-muted-foreground text-center py-6">
              Envoyez un message à {prestataire.nom?.split(' ')[0]} !
            </p>
          ) : (
            messages.map(msg => (
              <div key={msg.id} className={`flex ${msg.auteur === 'prestataire' ? 'justify-start' : 'justify-end'}`}>
                <div className={`max-w-[80%] rounded-2xl px-3 py-2 text-sm ${
                  msg.auteur === 'prestataire'
                    ? 'bg-white border border-border text-foreground rounded-bl-sm'
                    : 'bg-purple-600 text-white rounded-br-sm'
                }`}>
                  {msg.auteur === 'prestataire' && (
                    <p className="text-[10px] font-semibold text-purple-600 mb-1">{msg.auteur_nom}</p>
                  )}
                  <p>{msg.contenu}</p>
                  <p className={`text-[10px] mt-1 ${msg.auteur === 'prestataire' ? 'text-muted-foreground' : 'text-white/60'}`}>
                    {format(parseISO(msg.created_date), 'dd MMM HH:mm', { locale: fr })}
                  </p>
                </div>
              </div>
            ))
          )}
          <div ref={bottomRef} />
        </div>

        <div className="flex gap-2">
          <textarea
            value={newMessage}
            onChange={e => setNewMessage(e.target.value)}
            placeholder="Votre message..."
            rows="3"
            className="flex-1 rounded-xl border border-input bg-background px-3 py-2 text-sm resize-none focus-visible:outline-none focus-visible:ring-1 focus-visible:ring-ring"
          />
          <Button size="icon" onClick={handleSend} disabled={!newMessage.trim() || sendMutation.isPending}
            className="bg-purple-600 hover:bg-purple-700 self-end">
            <Send size={15} />
          </Button>
        </div>
      </div>
    </div>
  );
}