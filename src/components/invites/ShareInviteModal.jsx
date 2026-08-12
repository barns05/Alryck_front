/**
 * ShareInviteModal — Bloc de partage avec message personnalisé prêt à copier
 * Props: invite, organizerName, onClose
 */
import { useState } from 'react';
import { X, Copy, Check } from 'lucide-react';
import { toast } from 'sonner';

export default function ShareInviteModal({ invite, organizerName, onClose }) {
  const [copied, setCopied] = useState(false);
  const lien = `${window.location.origin}/invite-portal?token=${invite.lien_token}`;
  const nom = organizerName || invite.evenement_nom || 'l\'organisateur';

  const message =
    `Vous avez reçu une invitation de la part de ${nom} !\n\n` +
    `Cliquez sur le lien ci-dessous pour consulter votre carte d'invitation personnelle :\n${lien}`;

  const handleCopyMessage = async () => {
    await navigator.clipboard.writeText(message);
    setCopied(true);
    toast.success('Message copié !');
    setTimeout(() => setCopied(false), 2000);
  };

  const handleShare = async () => {
    if (navigator.share) {
      await navigator.share({
        title: `Invitation — ${invite.evenement_nom || ''}`,
        text: message,
      });
    } else {
      handleCopyMessage();
    }
  };

  return (
    <div className="fixed inset-0 z-[99999] flex items-end justify-center" onClick={onClose}>
      <div className="absolute inset-0 bg-black/60" />
      <div
        className="relative w-full max-w-lg bg-white rounded-t-3xl shadow-2xl flex flex-col overflow-hidden"
        style={{ maxHeight: '80vh' }}
        onClick={e => e.stopPropagation()}
      >
        {/* Header */}
        <div className="flex items-center justify-between px-5 pt-5 pb-3 border-b shrink-0" style={{ borderColor: '#f1f5f9' }}>
          <div>
            <h3 className="font-bold text-base" style={{ color: '#1e1b4b' }}>
              📩 Partager l'invitation
            </h3>
            <p className="text-xs text-gray-400 mt-0.5">
              {invite.prenom} {invite.nom}
            </p>
          </div>
          <button onClick={onClose} className="text-gray-400 hover:text-gray-600">
            <X size={20} />
          </button>
        </div>

        <div className="overflow-y-auto flex-1 px-5 py-4 space-y-4">
          {/* Message prêt à copier */}
          <div className="rounded-2xl border-2 p-4 space-y-3" style={{ borderColor: '#e8e4dc', background: '#fafaf8' }}>
            <p className="text-[10px] font-semibold text-gray-400 uppercase tracking-wide">
              Message prêt à envoyer
            </p>
            <pre className="text-sm text-gray-700 whitespace-pre-wrap font-sans leading-relaxed">
              {message}
            </pre>
          </div>

          {/* Boutons d'action */}
          <button
            onClick={handleCopyMessage}
            className="w-full flex items-center justify-center gap-2 py-3.5 rounded-2xl text-white text-sm font-semibold transition-all active:scale-[0.98]"
            style={{ background: copied ? '#16a34a' : '#1e1b4b' }}
          >
            {copied ? <Check size={16} /> : <Copy size={16} />}
            {copied ? 'Copié !' : 'Copier le message'}
          </button>

          {typeof navigator !== 'undefined' && navigator.share && (
            <button
              onClick={handleShare}
              className="w-full flex items-center justify-center gap-2 py-3.5 rounded-2xl text-sm font-semibold border-2 transition-all active:scale-[0.98]"
              style={{ borderColor: '#1e1b4b', color: '#1e1b4b' }}
            >
              📤 Partager via SMS / WhatsApp / Email
            </button>
          )}

          {/* Lien seul */}
          <div className="space-y-1">
            <p className="text-[10px] font-semibold text-gray-400 uppercase tracking-wide">Lien seul</p>
            <div className="flex items-center gap-2 bg-slate-50 border rounded-xl px-3 py-2" style={{ borderColor: '#e2e8f0' }}>
              <p className="flex-1 text-xs text-gray-500 truncate font-mono">{lien}</p>
              <button
                onClick={async () => {
                  await navigator.clipboard.writeText(lien);
                  toast.success('Lien copié !');
                }}
                className="text-gray-400 hover:text-gray-600 shrink-0"
              >
                <Copy size={13} />
              </button>
            </div>
          </div>
        </div>

        <div className="px-5 pb-8 pt-3 border-t shrink-0" style={{ borderColor: '#f1f5f9' }}>
          <button onClick={onClose} className="w-full py-3 rounded-2xl border-2 text-sm font-semibold text-gray-500"
            style={{ borderColor: '#e2e8f0' }}>
            Fermer
          </button>
        </div>
      </div>
    </div>
  );
}