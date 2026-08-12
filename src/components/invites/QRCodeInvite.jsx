/**
 * QRCodeInvite — Affiche le QR code du lien d'invitation d'un invité
 * Props: invite, onClose
 */
import { X, Download } from 'lucide-react';

export default function QRCodeInvite({ invite, onClose }) {
  const lien = `${window.location.origin}/invite-portal?token=${invite.lien_token}`;
  const qrUrl = `https://api.qrserver.com/v1/create-qr-code/?size=260x260&data=${encodeURIComponent(lien)}`;

  const handleDownload = async () => {
    const response = await fetch(qrUrl);
    const blob = await response.blob();
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = `invitation-${invite.prenom}-${invite.nom}.png`;
    a.click();
    URL.revokeObjectURL(url);
  };

  return (
    <div className="fixed inset-0 z-[9999] flex items-center justify-center p-4" onClick={onClose}>
      <div className="absolute inset-0 bg-black/50" />
      <div
        className="relative bg-white rounded-3xl shadow-2xl p-6 max-w-xs w-full text-center"
        onClick={e => e.stopPropagation()}
      >
        <button
          onClick={onClose}
          className="absolute top-4 right-4 text-gray-400 hover:text-gray-600"
        >
          <X size={20} />
        </button>

        <p className="font-bold text-[#1e1b4b] text-base mb-1">
          {invite.prenom} {invite.nom}
        </p>
        <p className="text-xs text-gray-400 mb-4">Lien d'invitation personnel</p>

        <img
          src={qrUrl}
          alt="QR Code invitation"
          className="mx-auto rounded-2xl border"
          style={{ borderColor: '#e2e8f0', width: 200, height: 200 }}
        />

        <button
          onClick={handleDownload}
          className="mt-4 w-full flex items-center justify-center gap-2 py-3 rounded-2xl text-sm font-semibold text-white"
          style={{ background: '#1e1b4b' }}
        >
          <Download size={15} /> Télécharger PNG
        </button>
      </div>
    </div>
  );
}