import { useState, useEffect, useRef } from 'react';
import { base44 } from '@/api/base44Client';
import { Send } from 'lucide-react';

export default function ProspectMessagerie({ prospectId, prospectNom }) {
  const [messages, setMessages] = useState([]);
  const [texte, setTexte] = useState('');
  const [sending, setSending] = useState(false);
  const bottomRef = useRef(null);

  const load = async () => {
    const res = await base44.entities.ProspectMessage.filter({ prospect_id: prospectId }, 'created_date', 100);
    setMessages(res.filter(m => !m.message?.startsWith('DEMANDE_DEVIS:')));
  };

  useEffect(() => { load(); }, [prospectId]);

  useEffect(() => {
    const unsub = base44.entities.ProspectMessage.subscribe((event) => {
      if (event.data?.prospect_id === prospectId) load();
    });
    return unsub;
  }, [prospectId]);

  useEffect(() => {
    bottomRef.current?.scrollIntoView({ behavior: 'smooth' });
  }, [messages]);

  const handleSend = async () => {
    if (!texte.trim()) return;
    setSending(true);
    await base44.entities.ProspectMessage.create({
      prospect_id: prospectId,
      auteur: 'prospect',
      message: texte.trim(),
    });
    // Notifier l'admin
    await base44.functions.invoke('createNotification', {
      titre: `💬 Nouveau message de ${prospectNom}`,
      message: texte.trim().slice(0, 100),
      type: 'info',
      lien: '/Prospects',
    });
    setTexte('');
    setSending(false);
    load();
  };

  return (
    <div className="pt-4 space-y-3">
      {/* Messages */}
      <div className="max-h-60 overflow-y-auto space-y-2 pr-1">
        {messages.length === 0 && (
          <p className="text-xs text-muted-foreground text-center py-4">
            Aucun message pour le moment. Envoyez-nous votre première question !
          </p>
        )}
        {messages.map(msg => (
          <div key={msg.id} className={`flex ${msg.auteur === 'prospect' ? 'justify-end' : 'justify-start'}`}>
            <div className={`max-w-[80%] rounded-xl px-3 py-2 text-xs ${
              msg.auteur === 'prospect'
                ? 'bg-primary text-primary-foreground'
                : 'bg-muted text-foreground'
            }`}>
              {msg.auteur === 'admin' && <p className="font-semibold text-[10px] mb-0.5 opacity-70">Organisateur</p>}
              <p className="leading-relaxed">{msg.message}</p>
            </div>
          </div>
        ))}
        <div ref={bottomRef} />
      </div>

      {/* Input */}
      <div className="flex gap-2 items-end border-t border-border pt-3">
        <textarea
          value={texte}
          onChange={e => setTexte(e.target.value)}
          onKeyDown={e => { if (e.key === 'Enter' && !e.shiftKey) { e.preventDefault(); handleSend(); } }}
          rows={2}
          placeholder="Votre message…"
          className="flex-1 rounded-xl border border-input bg-transparent px-3 py-2 resize-none focus-visible:outline-none focus-visible:ring-1 focus-visible:ring-ring placeholder:text-muted-foreground"
          style={{ fontSize: '16px' }}
        />
        <button
          onClick={handleSend}
          disabled={sending || !texte.trim()}
          className="p-2.5 rounded-xl bg-primary text-primary-foreground hover:bg-primary/90 disabled:opacity-50 transition-colors shrink-0"
        >
          <Send size={15} />
        </button>
      </div>
    </div>
  );
}