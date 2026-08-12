import { useState, useEffect, useRef } from 'react';
import { base44 } from '@/api/base44Client';
import { Send } from 'lucide-react';

export default function AdminProspectMessages({ prospectId }) {
  const [messages, setMessages] = useState([]);
  const [texte, setTexte] = useState('');
  const [sending, setSending] = useState(false);
  const bottomRef = useRef(null);

  const load = async () => {
    const res = await base44.entities.ProspectMessage.filter({ prospect_id: prospectId }, 'created_date', 100);
    setMessages(res);
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
      auteur: 'admin',
      message: texte.trim(),
    });
    setTexte('');
    setSending(false);
    load();
  };

  return (
    <div className="space-y-3">
      <div className="max-h-64 overflow-y-auto space-y-2 pr-1 border border-border rounded-xl p-3 bg-muted/20">
        {messages.length === 0 && (
          <p className="text-xs text-muted-foreground text-center py-4">Aucun message échangé.</p>
        )}
        {messages.map(msg => {
          if (msg.message?.startsWith('DEMANDE_DEVIS:')) {
            return (
              <div key={msg.id} className="flex justify-start">
                <div className="max-w-[80%] rounded-xl px-3 py-2 text-xs bg-blue-50 border border-blue-200 text-blue-700">
                  <p className="italic">📋 Demande de devis reçue — consultez la notification pour créer le devis</p>
                </div>
              </div>
            );
          }
          if (msg.message?.startsWith('DEMANDE_RESERVATION:')) {
            let dateLabel = '';
            try {
              const data = JSON.parse(msg.message.slice('DEMANDE_RESERVATION:'.length));
              dateLabel = data?.date_evenement?.label || '';
            } catch {}
            return (
              <div key={msg.id} className="flex justify-start">
                <div className="max-w-[80%] rounded-xl px-3 py-2 text-xs bg-emerald-50 border border-emerald-200 text-emerald-700">
                  <p className="italic">📅 Demande de réservation reçue{dateLabel ? ` — ${dateLabel}` : ''}</p>
                </div>
              </div>
            );
          }
          return (
            <div key={msg.id} className={`flex ${msg.auteur === 'admin' ? 'justify-end' : 'justify-start'}`}>
              <div className={`max-w-[80%] rounded-xl px-3 py-2 text-xs ${
                msg.auteur === 'admin'
                  ? 'bg-primary text-primary-foreground'
                  : 'bg-card border border-border text-foreground'
              }`}>
                <p className="font-semibold text-[10px] mb-0.5 opacity-70">
                  {msg.auteur === 'admin' ? 'Vous' : 'Prospect'}
                </p>
                <p className="leading-relaxed">{msg.message}</p>
              </div>
            </div>
          );
        })}
        <div ref={bottomRef} />
      </div>
      <div className="flex gap-2 items-end">
        <textarea
          value={texte}
          onChange={e => setTexte(e.target.value)}
          onKeyDown={e => { if (e.key === 'Enter' && !e.shiftKey) { e.preventDefault(); handleSend(); } }}
          rows={2}
          placeholder="Votre réponse…"
          className="flex-1 rounded-xl border border-input bg-transparent px-3 py-2 text-sm resize-none focus-visible:outline-none focus-visible:ring-1 focus-visible:ring-ring placeholder:text-muted-foreground"
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