/**
 * IcsSubscriptionBlock — Icône discrète + modal d'abonnement calendrier iCal.
 *
 * Rendu compact : un simple bouton-icône (CalendarPlus) qui n'occupe pas
 * d'espace dans le flux principal. Au tap, ouvre une modal dédiée contenant
 * le lien webcal copiable, le QR code et les instructions Google / Apple.
 */
import { useState } from 'react';
import { Copy, Check, RefreshCw, QrCode, X } from 'lucide-react';

export default function IcsSubscriptionBlock({ token, clientNom }) {
  const [copied, setCopied] = useState(false);
  const [showQR, setShowQR] = useState(false);
  const [showModal, setShowModal] = useState(false);

  if (!token) {
    return (
      <button
        onClick={() => setShowModal(true)}
        title="Synchronisation calendrier indisponible"
        className="w-8 h-8 flex items-center justify-center rounded-lg border transition-colors opacity-40 cursor-not-allowed"
        style={{ borderColor: '#fecaca', color: '#dc2626' }}
        disabled>
        <RefreshCw size={16} />
      </button>
    );
  }

  // Construire l'URL absolue à partir du domaine courant
  const origin = window.location.origin;
  const httpsUrl = `${origin}/functions/icsFeed?token=${token}`;
  const webcalUrl = `webcal://${origin.replace(/^https?:\/\//, '')}/functions/icsFeed?token=${token}`;

  const handleCopy = async () => {
    try {
      await navigator.clipboard.writeText(webcalUrl);
      setCopied(true);
      setTimeout(() => setCopied(false), 2000);
    } catch {
      const ta = document.createElement('textarea');
      ta.value = webcalUrl;
      document.body.appendChild(ta);
      ta.select();
      document.execCommand('copy');
      document.body.removeChild(ta);
      setCopied(true);
      setTimeout(() => setCopied(false), 2000);
    }
  };

  return (
    <>
      {/* Icône discrète — déclencheur de la modal */}
      <button
        onClick={() => setShowModal(true)}
        title="Synchroniser avec mon calendrier"
        className="w-8 h-8 flex items-center justify-center rounded-lg border transition-colors hover:bg-blue-50"
        style={{ borderColor: '#dbeafe', color: '#1d4ed8' }}>
        <RefreshCw size={16} />
      </button>

      {/* Modal d'abonnement calendrier */}
      {showModal && (
        <div
          className="fixed inset-0 z-[9999] flex items-end sm:items-center justify-center p-0 sm:p-4"
          style={{ background: 'rgba(0,0,0,0.5)' }}
          onClick={() => setShowModal(false)}>
          <div
            className="bg-white rounded-t-3xl sm:rounded-2xl w-full sm:max-w-md max-h-[90vh] flex flex-col"
            onClick={e => e.stopPropagation()}>
            {/* En-tête */}
            <div className="flex items-center justify-between px-5 pt-4 pb-3 border-b shrink-0" style={{ borderColor: '#e2e8f0' }}>
              <p className="text-sm font-bold" style={{ color: '#1e1b4b' }}>
                Synchroniser avec mon calendrier
              </p>
              <button onClick={() => setShowModal(false)} className="text-gray-400 hover:text-gray-600 shrink-0">
                <X size={18} />
              </button>
            </div>

            {/* Contenu scrollable */}
            <div className="px-5 py-4 space-y-4 overflow-y-auto">
              <p className="text-xs" style={{ color: '#6b7280' }}>
                Ajoutez ce lien une seule fois dans votre calendrier. Vos rendez-vous s'y synchronisent automatiquement.
              </p>

              {/* Lien copiable */}
              <div className="flex items-center gap-2">
                <div className="flex-1 min-w-0 px-3 py-2 rounded-xl border bg-gray-50 overflow-hidden" style={{ borderColor: '#e2e8f0' }}>
                  <p className="text-[11px] font-mono truncate" style={{ color: '#1e1b4b' }}>{webcalUrl}</p>
                </div>
                <button
                  onClick={handleCopy}
                  className="shrink-0 flex items-center gap-1.5 px-3 py-2 rounded-xl text-white text-xs font-semibold transition-colors"
                  style={{ background: copied ? '#16a34a' : '#1d4ed8' }}>
                  {copied ? <><Check size={13} /> Copié</> : <><Copy size={13} /> Copier</>}
                </button>
              </div>

              {/* Bouton QR code */}
              <button
                onClick={() => setShowQR(true)}
                className="w-full flex items-center justify-center gap-1.5 py-2 rounded-xl border-2 text-xs font-medium transition-colors hover:bg-blue-50"
                style={{ borderColor: '#dbeafe', color: '#1d4ed8' }}>
                <QrCode size={13} /> Scanner depuis mon téléphone (QR code)
              </button>

              {/* Instructions rapides */}
              <div className="space-y-2">
                <div className="rounded-xl p-2.5 border space-y-1" style={{ borderColor: '#e2e8f0', background: 'white' }}>
                  <p className="text-[11px] font-semibold" style={{ color: '#1e1b4b' }}>📅 Google Calendar</p>
                  <p className="text-[11px]" style={{ color: '#6b7280' }}>Depuis un ordinateur uniquement — calendar.google.com → Autres agendas → ➕ → À partir de l'URL → collez le lien → Ajouter l'agenda.</p>
                  <p className="text-[10px] italic" style={{ color: '#9ca3af' }}>
                    Sur mobile, copiez le lien puis ouvrez ce lien depuis le navigateur de votre téléphone (pas l'application Google Agenda).
                  </p>
                </div>
                <div className="rounded-xl p-2.5 border space-y-1" style={{ borderColor: '#e2e8f0', background: 'white' }}>
                  <p className="text-[11px] font-semibold" style={{ color: '#1e1b4b' }}>🍎 Apple Calendar</p>
                  <p className="text-[11px]" style={{ color: '#6b7280' }}>
                    iPhone : Réglages → Calendrier → Comptes → Ajouter un compte → Autre → Ajouter un abonnement → collez le lien → Suivant.
                  </p>
                </div>
              </div>

              {/* Mention délai */}
              <p className="text-[10px] italic text-center" style={{ color: '#9ca3af' }}>
                La mise à jour peut prendre jusqu'à 24h selon votre calendrier.
              </p>

              <p className="text-[10px] text-center" style={{ color: '#6b7280' }}>
                Le format webcal s'ouvre automatiquement dans l'application calendrier de votre téléphone au clic, si vous scannez le QR code ou ouvrez le lien directement depuis votre mobile.
              </p>
            </div>

            {/* Bouton Fermer */}
            <div className="px-5 py-3 border-t shrink-0" style={{ borderColor: '#e2e8f0' }}>
              <button
                onClick={() => setShowModal(false)}
                className="w-full py-2.5 rounded-xl border-2 text-sm font-semibold transition-colors hover:bg-gray-50"
                style={{ borderColor: '#e2e8f0', color: '#1e1b4b' }}>
                Fermer
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Modal QR code */}
      {showQR && (
        <div
          className="fixed inset-0 z-[10000] flex items-center justify-center p-4"
          style={{ background: 'rgba(0,0,0,0.5)' }}
          onClick={() => setShowQR(false)}>
          <div
            className="bg-white rounded-2xl p-5 max-w-xs w-full space-y-3"
            onClick={e => e.stopPropagation()}>
            <div className="flex items-center justify-between">
              <p className="text-sm font-bold" style={{ color: '#1e1b4b' }}>Scanner pour ajouter</p>
              <button onClick={() => setShowQR(false)} className="text-gray-400 hover:text-gray-600">
                <X size={18} />
              </button>
            </div>
            <div className="flex justify-center">
              <img
                src={`https://api.qrserver.com/v1/create-qr-code/?size=200x200&data=${encodeURIComponent(httpsUrl)}`}
                alt="QR code d'abonnement calendrier"
                className="rounded-xl"
                width={200}
                height={200}
              />
            </div>
            <p className="text-[11px] text-center" style={{ color: '#6b7280' }}>
              Ouvrez l'app appareil photo de votre téléphone et scannez ce code.
            </p>
          </div>
        </div>
      )}
    </>
  );
}