/**
 * LienUniverselSection — Affichage du lien universel avec copie et QR code.
 * Props: programme (entité ProgrammeJourJ avec lien_universel_token)
 */
import { useState } from 'react';
import { Copy, Check, QrCode, Download } from 'lucide-react';
import { toast } from 'sonner';

export default function LienUniverselSection({ programme }) {
  const [copied, setCopied] = useState(false);
  const [showQR, setShowQR] = useState(false);

  const lien = `${window.location.origin}/programme-public?token=${programme.lien_universel_token}`;
  const qrUrl = `https://api.qrserver.com/v1/create-qr-code/?size=240x240&data=${encodeURIComponent(lien)}`;

  const handleCopy = async () => {
    await navigator.clipboard.writeText(lien);
    setCopied(true);
    toast.success('Lien copié !');
    setTimeout(() => setCopied(false), 2000);
  };

  return (
    <div className="rounded-2xl border-2 p-4 space-y-3" style={{ borderColor: '#1e1b4b', background: '#f8faff' }}>
      <p className="text-xs font-bold uppercase tracking-wide" style={{ color: '#1e1b4b' }}>🔗 Lien universel du programme</p>

      {/* Lien + bouton copier */}
      <div className="flex items-center gap-2 bg-white border rounded-xl px-3 py-2" style={{ borderColor: '#e2e8f0' }}>
        <p className="flex-1 text-xs text-gray-500 truncate font-mono">{lien}</p>
        <button onClick={handleCopy} className="shrink-0 text-gray-400 hover:text-gray-600">
          {copied ? <Check size={14} className="text-green-600" /> : <Copy size={14} />}
        </button>
      </div>

      {/* Boutons */}
      <div className="flex gap-2">
        <button onClick={handleCopy}
          className="flex-1 py-2.5 rounded-xl text-white text-xs font-semibold flex items-center justify-center gap-1.5"
          style={{ background: copied ? '#16a34a' : '#1e1b4b' }}>
          {copied ? <Check size={13} /> : <Copy size={13} />}
          {copied ? 'Copié !' : 'Copier le lien'}
        </button>
        <button onClick={() => setShowQR(v => !v)}
          className="flex-1 py-2.5 rounded-xl border-2 text-xs font-semibold flex items-center justify-center gap-1.5"
          style={{ borderColor: '#1e1b4b', color: '#1e1b4b', background: 'white' }}>
          <QrCode size={13} /> {showQR ? 'Masquer QR' : 'QR code'}
        </button>
      </div>

      {/* QR code */}
      {showQR && (
        <div className="flex flex-col items-center gap-2 pt-2">
          <div className="p-3 bg-white rounded-2xl border" style={{ borderColor: '#e2e8f0' }}>
            <img src={qrUrl} alt="QR code du programme" className="w-48 h-48" />
          </div>
          <a href={qrUrl} download="programme-jour-j-qr.png"
            className="text-xs font-medium flex items-center gap-1.5 px-3 py-1.5 rounded-lg border"
            style={{ borderColor: '#e2e8f0', color: '#6b7280' }}>
            <Download size={12} /> Télécharger le QR code
          </a>
        </div>
      )}
    </div>
  );
}