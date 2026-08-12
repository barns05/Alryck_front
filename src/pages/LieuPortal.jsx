import { useState, useEffect, useRef } from 'react';
import { base44 } from '@/api/base44Client';
import PortalAuthModal from '@/components/portal/PortalAuthModal';
import { usePortalAuth } from '@/hooks/usePortalAuth';
import { MapPin, Phone, Mail, Users, Send, MessageCircle, LogOut } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { format, parseISO } from 'date-fns';
import { fr } from 'date-fns/locale';
import PortalHeader from '@/components/portal/PortalHeader';
import PortalPhotosSection from '@/components/portal/PortalPhotosSection';

export default function LieuPortal() {
  const params = new URLSearchParams(window.location.search);
  const token = params.get('token');

  const [lieu, setLieu] = useState(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);
  const [conversation, setConversation] = useState(null);
  const [messages, setMessages] = useState([]);
  const [newMessage, setNewMessage] = useState('');
  const [sending, setSending] = useState(false);
  const bottomRef = useRef(null);
  const pollRef = useRef(null);

  useEffect(() => {
    if (!token) { setError('Lien invalide.'); setLoading(false); return; }
    loadLieu();
  }, [token]);

  useEffect(() => {
    bottomRef.current?.scrollIntoView({ behavior: 'smooth' });
  }, [messages]);

  const loadLieu = async () => {
    try {
      const lieux = await base44.entities.Lieu.filter({ lien_token: token });
      if (!lieux.length) { setError('Lieu introuvable.'); setLoading(false); return; }
      const l = lieux[0];
      setLieu(l);
      await loadConversation(l);
      setLoading(false);
    } catch {
      setError('Erreur lors du chargement.');
      setLoading(false);
    }
  };

  const { authStep, authError, isAuthenticated, handleRegister, handleLogin, handleForgotPassword, handleSkip, handleLogout } = usePortalAuth({
    token,
    entityType: 'lieu',
    entityId: lieu?.id,
    entityEmail: lieu?.email,
    portalPassword: lieu?.portal_password,
    onSavePassword: async (hash, email) => {
      await base44.entities.Lieu.update(lieu.id, { portal_password: hash, portal_email: email });
      setLieu(prev => ({ ...prev, portal_password: hash, portal_email: email }));
    },
    onSendForgotLink: async (email) => {
      await base44.integrations.Core.SendEmail({
        to: email,
        subject: 'Accès à votre espace lieu',
        body: `Bonjour,\n\nVoici votre lien d'accès à votre espace lieu :\n${window.location.href}\n\nCordialement`,
      });
    },
  });

  const loadConversation = async (l) => {
    const convs = await base44.entities.ConversationLieu.filter({ lieu_id: l.id });
    const conv = convs[0] || null;
    setConversation(conv);
    if (conv) {
      const msgs = await base44.entities.MessageLieu.filter({ conversation_id: conv.id }, 'created_date', 200);
      setMessages(msgs);
      // Marquer les messages du lieu comme lus
      const unread = msgs.filter(m => m.auteur === 'lieu' && !m.lu);
      for (const m of unread) {
        await base44.entities.MessageLieu.update(m.id, { lu: true });
      }
    }
  };

  useEffect(() => {
    if (!lieu) return;
    pollRef.current = setInterval(async () => {
      await loadConversation(lieu);
    }, 5000);
    return () => clearInterval(pollRef.current);
  }, [lieu]);

  const handleSend = async () => {
    if (!newMessage.trim()) return;
    setSending(true);
    const content = newMessage.trim();
    setNewMessage('');
    try {
      let conv = conversation;
      if (!conv) {
        conv = await base44.entities.ConversationLieu.create({
          lieu_id: lieu.id,
          lieu_nom: lieu.nom,
          lieu_email: lieu.email || '',
          dernier_message: content,
          date_dernier_message: new Date().toISOString(),
          non_lus_admin: 1,
        });
        setConversation(conv);
      } else {
        await base44.entities.ConversationLieu.update(conv.id, {
          dernier_message: content,
          date_dernier_message: new Date().toISOString(),
          non_lus_admin: (conv.non_lus_admin || 0) + 1,
        });
      }
      await base44.entities.MessageLieu.create({
        conversation_id: conv.id,
        auteur: 'lieu',
        auteur_nom: lieu.nom,
        contenu: content,
        lu: false,
      });
      await loadConversation(lieu);
    } finally {
      setSending(false);
    }
  };

  if (loading) {
    return (
      <div className="min-h-screen flex items-center justify-center">
        <div className="w-8 h-8 border-4 border-slate-200 border-t-primary rounded-full animate-spin" />
      </div>
    );
  }

  if (error) {
    return (
      <div className="min-h-screen flex items-center justify-center p-4">
        <div className="text-center space-y-2">
          <MapPin size={40} className="mx-auto text-muted-foreground opacity-40" />
          <p className="text-muted-foreground">{error}</p>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-background">
      {authStep && (
        <PortalAuthModal
          mode={authStep}
          entityEmail={lieu?.portal_email || lieu?.email || ''}
          entityNom={lieu?.nom}
          onRegister={handleRegister}
          onLogin={handleLogin}
          onForgotPassword={handleForgotPassword}
          onSkip={handleSkip}
          error={authError}
          portalType="lieu"
        />
      )}
      <PortalHeader subtitle="Espace Lieu" userLabel={lieu.nom} userSub={lieu.type_lieu} portalType="lieu" />

      <div className="max-w-2xl mx-auto p-4 space-y-4">
        {isAuthenticated && lieu?.portal_password && (
          <div className="flex justify-end">
            <button onClick={handleLogout} className="flex items-center gap-1.5 text-xs text-muted-foreground hover:text-foreground transition-colors">
              <LogOut size={13} /> Se déconnecter
            </button>
          </div>
        )}
        {/* Infos lieu */}
        <div className="bg-card rounded-2xl border border-border p-4 space-y-2">
          <h2 className="font-semibold text-lg">{lieu.nom}</h2>
          {lieu.type_lieu && (
            <span className="text-xs px-2 py-0.5 rounded-full bg-blue-100 text-blue-700 font-medium">{lieu.type_lieu}</span>
          )}
          <div className="space-y-1.5 text-sm text-muted-foreground mt-2">
            {(lieu.adresse || lieu.ville) && (
              <div className="flex items-center gap-2">
                <MapPin size={13} />
                <span>{[lieu.adresse, lieu.ville, lieu.code_postal].filter(Boolean).join(', ')}</span>
              </div>
            )}
            {lieu.telephone && (
              <div className="flex items-center gap-2"><Phone size={13} /><span>{lieu.telephone}</span></div>
            )}
            {lieu.email && (
              <div className="flex items-center gap-2"><Mail size={13} /><span>{lieu.email}</span></div>
            )}
            {lieu.capacite && (
              <div className="flex items-center gap-2"><Users size={13} /><span>Capacité : {lieu.capacite} pers.</span></div>
            )}
          </div>
        </div>

        {/* Photos */}
        <PortalPhotosSection
          sourceType="lieu"
          sourceId={lieu.id}
          sourceNom={lieu.nom}
        />

        {/* Messagerie */}
        <div className="bg-card rounded-2xl border border-border p-4 flex flex-col" style={{ minHeight: '400px' }}>
          <h3 className="font-semibold text-sm flex items-center gap-2 mb-3">
            <MessageCircle size={15} className="text-blue-500" />
            Messagerie
          </h3>

          <div className="flex-1 bg-muted/20 rounded-xl p-3 overflow-y-auto space-y-3 mb-3" style={{ minHeight: '250px' }}>
            {messages.length === 0 ? (
              <p className="text-sm text-muted-foreground text-center py-6">
                Aucun message pour l'instant. Envoyez un message à votre organisateur !
              </p>
            ) : (
              messages.map(msg => (
                <div key={msg.id} className={`flex ${msg.auteur === 'lieu' ? 'justify-end' : 'justify-start'}`}>
                  <div className={`max-w-[80%] rounded-2xl px-3 py-2 text-sm ${
                    msg.auteur === 'lieu'
                      ? 'bg-blue-600 text-white rounded-br-sm'
                      : 'bg-white border border-border text-foreground rounded-bl-sm'
                  }`}>
                    {msg.auteur === 'admin' && (
                      <p className="text-[10px] font-semibold text-blue-600 mb-1">{msg.auteur_nom}</p>
                    )}
                    <p>{msg.contenu}</p>
                    <p className={`text-[10px] mt-1 ${msg.auteur === 'lieu' ? 'text-white/60' : 'text-muted-foreground'}`}>
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
              onKeyDown={e => { if (e.key === 'Enter' && !e.shiftKey) { e.preventDefault(); handleSend(); } }}
              className="flex-1 rounded-xl border border-input bg-background px-3 py-2 text-sm resize-none focus-visible:outline-none focus-visible:ring-1 focus-visible:ring-ring"
            />
            <Button size="icon" onClick={handleSend} disabled={!newMessage.trim() || sending}
              className="bg-blue-600 hover:bg-blue-700 self-end">
              <Send size={15} />
            </Button>
          </div>
        </div>
      </div>
    </div>
  );
}