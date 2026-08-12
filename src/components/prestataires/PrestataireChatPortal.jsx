import { useState, useEffect, useRef } from 'react';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { base44 } from '@/api/base44Client';
import { Send, MessageCircle } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { format, parseISO } from 'date-fns';
import { fr } from 'date-fns/locale';

// Composant chat côté prestataire (portail)
export default function PrestataireChatPortal({ prestataireId, prestataireNom, prestataireEmail }) {
  const qc = useQueryClient();
  const [newMessage, setNewMessage] = useState('');
  const bottomRef = useRef(null);

  const { data: conversations = [] } = useQuery({
    queryKey: ['conv-prestataire-portal', prestataireId],
    queryFn: () => base44.entities.ConversationPrestataire.filter({ prestataire_id: prestataireId }),
    refetchInterval: 5000,
  });

  const conversation = conversations[0] || null;

  const { data: messages = [] } = useQuery({
    queryKey: ['msg-prestataire-portal', conversation?.id],
    queryFn: () => base44.entities.MessagePrestataire.filter({ conversation_id: conversation?.id }, 'created_date', 200),
    enabled: !!conversation?.id,
    refetchInterval: 5000,
  });

  useEffect(() => {
    bottomRef.current?.scrollIntoView({ behavior: 'smooth' });
  }, [messages]);

  const sendMutation = useMutation({
    mutationFn: async (content) => {
      let conv = conversation;
      if (!conv) {
        conv = await base44.entities.ConversationPrestataire.create({
          prestataire_id: prestataireId,
          prestataire_nom: prestataireNom,
          prestataire_email: prestataireEmail || '',
          dernier_message: content,
          date_dernier_message: new Date().toISOString(),
          non_lus_admin: 1,
        });
      } else {
        await base44.entities.ConversationPrestataire.update(conv.id, {
          dernier_message: content,
          date_dernier_message: new Date().toISOString(),
          non_lus_admin: (conv.non_lus_admin || 0) + 1,
        });
      }
      await base44.entities.MessagePrestataire.create({
        conversation_id: conv.id,
        auteur: 'prestataire',
        auteur_nom: prestataireNom,
        contenu: content,
        lu: false,
      });
      // Notification pour l'admin
      await base44.entities.Notification.create({
        titre: `Nouveau message de ${prestataireNom}`,
        message: content.length > 80 ? content.substring(0, 80) + '…' : content,
        type: 'prestataire',
        lien: '/Prestataires',
        lu: false,
      });
    },
    onSuccess: () => {
      qc.invalidateQueries(['conv-prestataire-portal', prestataireId]);
      qc.invalidateQueries(['msg-prestataire-portal']);
      setNewMessage('');
    },
  });

  const handleSend = () => {
    if (!newMessage.trim()) return;
    sendMutation.mutate(newMessage.trim());
  };

  return (
    <div className="bg-card rounded-2xl border border-border p-5 flex flex-col">
      <h3 className="font-semibold text-base mb-4 flex items-center gap-2">
        <MessageCircle size={18} className="text-purple-500" /> Messagerie
      </h3>

      <div className="flex-1 bg-muted/20 rounded-xl p-3 min-h-[200px] max-h-[300px] overflow-y-auto space-y-3 mb-3">
        {messages.length === 0 && (
          <p className="text-sm text-muted-foreground text-center py-6">
            Envoyez un message à votre organisateur !
          </p>
        )}
        {messages.map(msg => (
          <div key={msg.id} className={`flex ${msg.auteur === 'prestataire' ? 'justify-end' : 'justify-start'}`}>
            <div className={`max-w-[80%] rounded-2xl px-3 py-2 text-sm ${
              msg.auteur === 'prestataire'
                ? 'bg-purple-600 text-white rounded-br-sm'
                : 'bg-white border border-border text-foreground rounded-bl-sm'
            }`}>
              {msg.auteur === 'admin' && (
                <p className="text-[10px] font-semibold text-purple-600 mb-1">Organisateur</p>
              )}
              <p>{msg.contenu}</p>
              <p className={`text-[10px] mt-1 ${msg.auteur === 'prestataire' ? 'text-white/60' : 'text-muted-foreground'}`}>
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
  );
}