/**
 * PDFViewer — Visualiseur PDF mobile premium ALRYCK
 *
 * Stratégie cross-platform :
 *  - iOS Safari : l'iframe ne peut pas rendre les PDFs inline. On utilise un
 *    tag <object> avec fallback lien direct + bouton télécharger.
 *  - Android Chrome / Desktop : iframe avec #toolbar=0&view=FitH pour
 *    forcer le fit-to-width et masquer la toolbar native du viewer.
 *
 * Scroll : un seul défilement vertical natif — pas de double scroll.
 * Téléchargement : vraie sauvegarde du fichier via <a download>.
 * Partage : Web Share API native (feuille iOS) avec fallback download.
 */
import { useEffect, useRef, useState } from 'react';
import { motion } from 'framer-motion';
import { X, Download, Share2, FileText } from 'lucide-react';

// Détecte iOS Safari (inclut iPhone, iPad, iPod — même en mode desktop)
function isIOS() {
  return (
    /iPad|iPhone|iPod/.test(navigator.userAgent) ||
    (navigator.platform === 'MacIntel' && navigator.maxTouchPoints > 1)
  );
}

export default function PDFViewer({ pdfBlob, pdfUrl, fileName, onClose }) {
  const objectUrl = useRef(null);
  const [ios] = useState(() => isIOS());

  // Créer une Object URL stable depuis le Blob (une seule fois)
  if (pdfBlob && !objectUrl.current) {
    objectUrl.current = URL.createObjectURL(pdfBlob);
  }

  const blobUrl = objectUrl.current || pdfUrl;

  // URL pour l'iframe desktop — #toolbar=0&view=FitH force fit-to-width
  const iframeUrl = blobUrl ? `${blobUrl}#toolbar=0&navpanes=0&scrollbar=0&view=FitH` : null;

  // Nettoyage à la fermeture
  useEffect(() => {
    return () => {
      if (objectUrl.current) {
        URL.revokeObjectURL(objectUrl.current);
        objectUrl.current = null;
      }
    };
  }, []);

  // ── Téléchargement réel du fichier ──────────────────────────────────────
  const handleDownload = async () => {
    if (!pdfBlob) return;

    // iOS Safari : <a download> est ignoré → Web Share API avec File
    // propose "Enregistrer dans Fichiers" dans la feuille de partage native
    if (ios && navigator.canShare) {
      const file = new File([pdfBlob], fileName || 'liste-invites.pdf', { type: 'application/pdf' });
      if (navigator.canShare({ files: [file] })) {
        try {
          await navigator.share({ files: [file], title: 'Liste des invités' });
          return;
        } catch (err) {
          if (err?.name === 'AbortError') return;
          // Sinon on retombe sur la méthode <a> ci-dessous
        }
      }
    }

    // Android / Desktop : <a download> classique
    const a = document.createElement('a');
    a.href = blobUrl;
    a.download = fileName || 'liste-invites.pdf';
    a.style.display = 'none';
    document.body.appendChild(a);
    a.click();
    // Petit délai avant de retirer le lien (iOS besoin)
    setTimeout(() => document.body.removeChild(a), 200);
  };

  // ── Partage natif (feuille iOS) ─────────────────────────────────────────
  const handleShare = async () => {
    if (navigator.share && pdfBlob) {
      try {
        const file = new File([pdfBlob], fileName || 'liste-invites.pdf', { type: 'application/pdf' });
        // canShare avec fichier disponible sur iOS 15+
        if (navigator.canShare && navigator.canShare({ files: [file] })) {
          await navigator.share({ files: [file], title: 'Liste des invités' });
          return;
        }
        // Fallback : partager l'URL blob
        await navigator.share({ url: blobUrl, title: 'Liste des invités' });
        return;
      } catch (err) {
        // Annulation par l'utilisateur = pas de fallback download
        if (err?.name === 'AbortError') return;
      }
    }
    // Fallback ultime : téléchargement
    handleDownload();
  };

  if (!blobUrl) return null;

  const NAVBAR_HEIGHT = 56;

  return (
    <motion.div
      initial={{ y: '100%' }}
      animate={{ y: 0 }}
      exit={{ y: '100%' }}
      transition={{ type: 'spring', damping: 32, stiffness: 300 }}
      className="fixed inset-0 z-[99999] flex flex-col"
      style={{ background: '#111827' }}
    >
      {/* ══════════════════════════════════════════════════
          BARRE SUPÉRIEURE FIXE
      ══════════════════════════════════════════════════ */}
      <div
        className="flex items-center justify-between px-4 shrink-0"
        style={{
          height: NAVBAR_HEIGHT,
          paddingTop: 'env(safe-area-inset-top, 0px)',
          background: 'linear-gradient(135deg, #1e1b4b 0%, #312e81 100%)',
          boxShadow: '0 1px 0 rgba(255,255,255,0.08)',
        }}
      >
        {/* ── Fermer ── */}
        <button
          onClick={onClose}
          className="flex items-center gap-1.5 text-white/75 hover:text-white active:text-white/50 transition-colors"
          style={{ minWidth: 72 }}
        >
          <X size={18} strokeWidth={2.2} />
          <span className="text-sm font-semibold">Fermer</span>
        </button>

        {/* ── Titre orienté utilisateur ── */}
        <div className="flex items-center gap-1.5">
          <FileText size={13} className="text-white/40" />
          <span className="text-white/80 text-sm font-semibold tracking-tight">
            Liste des invités
          </span>
        </div>

        {/* ── Actions droite ── */}
        <div className="flex items-center gap-1" style={{ minWidth: 72, justifyContent: 'flex-end' }}>
          <button
            onClick={handleDownload}
            className="flex items-center gap-1.5 p-2 rounded-xl text-white/75 hover:text-white hover:bg-white/10 active:bg-white/20 transition-all"
            title="Télécharger"
            aria-label="Télécharger le PDF"
          >
            <Download size={17} strokeWidth={2.2} />
            <span className="text-sm font-semibold hidden sm:inline">Télécharger</span>
          </button>
          <button
            onClick={handleShare}
            className="p-2 rounded-xl text-white/75 hover:text-white hover:bg-white/10 active:bg-white/20 transition-all"
            title="Partager"
            aria-label="Partager le PDF"
          >
            <Share2 size={17} strokeWidth={2.2} />
          </button>
        </div>
      </div>

      {/* ══════════════════════════════════════════════════
          ZONE DE VISUALISATION
      ══════════════════════════════════════════════════ */}
      <div
        className="flex-1"
        style={{
          paddingBottom: 'env(safe-area-inset-bottom, 0px)',
          overflow: 'hidden',
          background: '#1f2937',
        }}
      >
        {ios ? (
          /* ── iOS Safari : <object> scroll natif, fit auto ── */
          <object
            data={blobUrl}
            type="application/pdf"
            style={{
              width: '100%',
              height: '100%',
              display: 'block',
              border: 'none',
              // Sur iOS le viewer natif gère lui-même scroll + fit
            }}
          >
            {/* Fallback si l'objet n'est pas supporté */}
            <div className="flex flex-col items-center justify-center h-full gap-4 px-6 text-center">
              <FileText size={48} className="text-white/30" />
              <p className="text-white/60 text-sm leading-relaxed">
                L'aperçu PDF n'est pas disponible dans ce navigateur.
              </p>
              <button
                onClick={handleDownload}
                className="flex items-center gap-2 px-6 py-3 rounded-2xl text-sm font-bold text-white"
                style={{ background: 'linear-gradient(135deg, #1e1b4b, #4338ca)' }}
              >
                <Download size={16} /> Télécharger le PDF
              </button>
            </div>
          </object>
        ) : (
          /* ── Android / Desktop : iframe avec fit-to-width ── */
          <iframe
            src={iframeUrl}
            title="Liste des invités"
            style={{
              width: '100%',
              height: '100%',
              border: 'none',
              display: 'block',
              // Forcer le fit-width via CSS (certains viewers le respectent)
              overflow: 'hidden',
            }}
            allow="fullscreen"
          />
        )}
      </div>
    </motion.div>
  );
}