/**
 * ShareGroupeModal — Partage du lien de groupe (Mode 4)
 * Affiche le lien commun avec options WhatsApp, Messenger, SMS, QR Code, copie
 * Props: groupeLienToken, evenementNom, organizerName, onClose
 */
import { useState } from 'react';
import { X, Copy, Check, QrCode } from 'lucide-react';
import { toast } from 'sonner';

function QRCodeDisplay({ url }) {
  // QR Code via API publique
  const qrUrl = `https://api.qrserver.com/v1/create-qr-code/?size=200x200&data=${encodeURIComponent(url)}`;
  return (
    <div className="flex flex-col items-center gap-3 py-4">
      <img src={qrUrl} alt="QR Code invitation" className="w-48 h-48 rounded-2xl border-4 border-white shadow-lg" />
      <p className="text-xs text-gray-400 text-center">Scannez ce QR Code pour accéder au formulaire</p>
    </div>
  );
}

export default function ShareGroupeModal({ groupeLienToken, evenementNom, organizerName, onClose }) {
  const [copied, setCopied] = useState(false);
  const [showQR, setShowQR] = useState(false);

  const lien = `${window.location.origin}/invite-portal?groupe=${groupeLienToken}`;
  const nom = organizerName || evenementNom || 'l\'organisateur';

  const message =
    `🎉 Vous êtes invité·e par ${nom} !\n\n` +
    `Cliquez sur ce lien pour confirmer votre présence :\n${lien}`;

  const handleCopy = async () => {
    await navigator.clipboard.writeText(lien);
    setCopied(true);
    toast.success('Lien copié !');
    setTimeout(() => setCopied(false), 2000);
  };

  const handleShareNative = async () => {
    if (navigator.share) {
      await navigator.share({ title: `Invitation — ${evenementNom || ''}`, text: message });
    } else {
      await navigator.clipboard.writeText(message);
      toast.success('Message copié !');
    }
  };

  const handleWhatsApp = () => {
    window.open(`https://wa.me/?text=${encodeURIComponent(message)}`, '_blank');
  };

  const handleMessenger = () => {
    window.open(`https://www.facebook.com/dialog/send?link=${encodeURIComponent(lien)}&app_id=291494419107518&redirect_uri=${encodeURIComponent(window.location.origin)}`, '_blank');
  };

  const handleSMS = () => {
    window.open(`sms:?body=${encodeURIComponent(message)}`, '_blank');
  };

  return (
    <div className="fixed inset-0 z-[99999] flex items-end justify-center" onClick={onClose}>
      <div className="absolute inset-0 bg-black/60" />
      <div
        className="relative w-full max-w-lg bg-white rounded-t-3xl shadow-2xl flex flex-col overflow-hidden"
        style={{ maxHeight: '90vh' }}
        onClick={e => e.stopPropagation()}
      >
        {/* Header */}
        <div className="flex items-center justify-between px-5 pt-5 pb-3 border-b shrink-0" style={{ borderColor: '#f1f5f9' }}>
          <div>
            <h3 className="font-bold text-base" style={{ color: '#1e1b4b' }}>
              🔗 Partager le lien de groupe
            </h3>
            <p className="text-xs text-gray-400 mt-0.5">
              Partagez une seule fois dans votre groupe
            </p>
          </div>
          <button onClick={onClose} className="text-gray-400 hover:text-gray-600">
            <X size={20} />
          </button>
        </div>

        <div className="overflow-y-auto flex-1 px-5 py-4 space-y-3">

          {/* Bandeau info */}
          <div className="rounded-2xl p-4 text-sm leading-relaxed"
            style={{ background: 'linear-gradient(135deg, #1e1b4b 0%, #4338ca 100%)', color: 'white' }}>
            <p className="font-bold text-base mb-1">✨ Lien unique pour tout le monde</p>
            <p className="text-white/80 text-xs">
              Chaque personne qui ouvre ce lien saisit son prénom et nom, puis répond à son invitation. Les réponses sont individuelles et intégrées automatiquement.
            </p>
          </div>

          {/* Boutons partage */}
          <div className="grid grid-cols-2 gap-3">
            <button onClick={handleWhatsApp}
              className="flex items-center justify-center gap-2.5 py-4 rounded-3xl text-sm font-semibold transition-all active:scale-[0.97]"
              style={{
                background: '#f0fdf4',
                color: '#15803d',
                border: '1.5px solid #bbf7d0',
                boxShadow: '0 2px 8px rgba(34,197,94,0.10)',
              }}>
              <span className="text-xl">📱</span>
              <span>WhatsApp</span>
            </button>
            <button onClick={handleSMS}
              className="flex items-center justify-center gap-2.5 py-4 rounded-3xl text-sm font-semibold transition-all active:scale-[0.97]"
              style={{
                background: '#eff6ff',
                color: '#1d4ed8',
                border: '1.5px solid #bfdbfe',
                boxShadow: '0 2px 8px rgba(59,130,246,0.10)',
              }}>
              <span className="text-xl">💬</span>
              <span>SMS</span>
            </button>
          </div>

          <div className="grid grid-cols-2 gap-3">
            <button onClick={handleMessenger}
              className="flex items-center justify-center gap-2.5 py-4 rounded-3xl text-sm font-semibold transition-all active:scale-[0.97]"
              style={{
                background: '#eef2ff',
                color: '#4338ca',
                border: '1.5px solid #c7d2fe',
                boxShadow: '0 2px 8px rgba(99,102,241,0.10)',
              }}>
              <span className="text-xl">💬</span>
              <span>Messenger</span>
            </button>
            {typeof navigator !== 'undefined' && navigator.share ? (
              <button onClick={handleShareNative}
                className="flex items-center justify-center gap-2.5 py-4 rounded-3xl text-sm font-semibold transition-all active:scale-[0.97]"
                style={{
                  background: 'white',
                  color: '#1e1b4b',
                  border: '1.5px solid #c7d2fe',
                  boxShadow: '0 2px 8px rgba(30,27,75,0.08)',
                }}>
                <span className="text-xl">📤</span>
                <span>Partager</span>
              </button>
            ) : (
              <button onClick={() => setShowQR(v => !v)}
                className="flex items-center justify-center gap-2.5 py-4 rounded-3xl text-sm font-semibold transition-all active:scale-[0.97]"
                style={{
                  background: 'white',
                  color: '#1e1b4b',
                  border: '1.5px solid #c7d2fe',
                  boxShadow: '0 2px 8px rgba(30,27,75,0.08)',
                }}>
                <QrCode size={16} />
                <span>QR Code</span>
              </button>
            )}
          </div>

          {/* QR Code toggle */}
          <button onClick={() => setShowQR(v => !v)}
            className="w-full flex items-center justify-center gap-2 py-2.5 rounded-2xl text-xs font-semibold border-2 transition-colors"
            style={{ borderColor: showQR ? '#1e1b4b' : '#e2e8f0', color: showQR ? '#1e1b4b' : '#6b7280' }}>
            <QrCode size={14} /> {showQR ? 'Masquer le QR Code' : 'Afficher le QR Code'}
          </button>

          {showQR && <QRCodeDisplay url={lien} />}

          {/* Lien seul + copie */}
          <div className="space-y-1.5">
            <p className="text-[10px] font-semibold text-gray-400 uppercase tracking-wide">Lien à copier</p>
            <div className="flex items-center gap-2 bg-slate-50 border rounded-xl px-3 py-2.5" style={{ borderColor: '#e2e8f0' }}>
              <p className="flex-1 text-xs text-gray-500 truncate font-mono">{lien}</p>
              <button onClick={handleCopy} className="shrink-0">
                {copied ? <Check size={14} className="text-green-500" /> : <Copy size={14} className="text-gray-400" />}
              </button>
            </div>
          </div>

          {/* Message complet */}
          <div className="rounded-2xl border-2 p-4 space-y-2" style={{ borderColor: '#e8e4dc', background: '#fafaf8' }}>
            <p className="text-[10px] font-semibold text-gray-400 uppercase tracking-wide">Message complet à copier</p>
            <pre className="text-xs text-gray-700 whitespace-pre-wrap font-sans leading-relaxed">{message}</pre>
            <button
              onClick={async () => {
                await navigator.clipboard.writeText(message);
                toast.success('Message copié !');
              }}
              className="flex items-center gap-1.5 text-xs text-gray-500 hover:text-gray-700 transition-colors"
            >
              <Copy size={11} /> Copier le message
            </button>
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