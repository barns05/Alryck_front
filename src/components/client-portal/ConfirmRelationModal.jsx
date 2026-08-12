/**
 * ConfirmRelationModal — Fenêtre de composition du premier message avant mise en
 * relation. Le client voit un message pré-rempli généré depuis les données réelles
 * de son événement, peut le modifier, puis « Envoyer » déclenche la même logique
 * que handleConfirmRelation/handleConfirm (création Prospect, notification, statut
 * Contacté, Conversation) avec le texte saisi comme premier message de la Conversation.
 */
import { useState, useEffect } from 'react';
import { createPortal } from 'react-dom';
import { X, Send } from 'lucide-react';

function formatDateFr(d) {
  try {
    return new Date(d).toLocaleDateString('fr-FR', { weekday: 'long', day: 'numeric', month: 'long', year: 'numeric' });
  } catch {
    return d;
  }
}

// Construit un message à partir des champs réellement disponibles sur l'événement.
// Ne laisse aucun placeholder vide : reformule proprement selon ce qui est renseigné.
export function buildRelationMessage(evenement) {
  const type = evenement?.type_evenement || 'événement';
  const date = evenement?.date;
  const lieu = evenement?.lieu_nom;
  const nb = evenement?.nb_invites;

  let phrase = `Bonjour, je suis intéressé(e) par vos services pour mon ${type}`;
  if (date && lieu) {
    phrase += ` du ${formatDateFr(date)} à ${lieu}`;
  } else if (date) {
    phrase += ` du ${formatDateFr(date)}`;
  } else if (lieu) {
    phrase += ` prévu à ${lieu}`;
  }
  phrase += '.';

  if (nb) {
    phrase += ` Nous prévoyons environ ${nb} invités.`;
  }
  phrase += ' Merci de me recontacter pour en discuter.';
  return phrase;
}

export default function ConfirmRelationModal({ open, onClose, onConfirm, prestataireNom, evenement, confirming }) {
  const [text, setText] = useState('');

  useEffect(() => {
    if (open) setText(buildRelationMessage(evenement));
  }, [open, evenement]);

  if (!open) return null;

  const handleSend = () => {
    const contenu = text.trim() || buildRelationMessage(evenement);
    onConfirm(contenu);
  };

  return createPortal(
    <div
      className="fixed inset-0 z-[2000] flex items-end sm:items-center justify-center"
      style={{ background: 'rgba(0,0,0,0.45)' }}
      onClick={onClose}
    >
      <div
        className="w-full max-w-lg bg-white rounded-t-2xl sm:rounded-2xl shadow-2xl"
        onClick={(e) => e.stopPropagation()}
      >
        <div className="flex items-center justify-between px-5 py-4 border-b" style={{ borderColor: '#e8e4dc' }}>
          <div>
            <p className="font-bold text-base" style={{ color: '#1e1b4b' }}>Mise en relation</p>
            <p className="text-xs" style={{ color: '#9ca3af' }}>avec {prestataireNom}</p>
          </div>
          <button
            onClick={onClose}
            className="w-9 h-9 rounded-full flex items-center justify-center"
            style={{ background: '#f3f4f6', color: '#1e1b4b' }}
            aria-label="Fermer"
          >
            <X size={18} />
          </button>
        </div>

        <div className="px-5 py-4 space-y-3">
          <p className="text-xs" style={{ color: '#6b7280' }}>
            Votre message sera envoyé au prestataire. Vous pouvez le modifier avant l'envoi.
          </p>
          <textarea
            value={text}
            onChange={(e) => setText(e.target.value)}
            rows={5}
            className="w-full rounded-xl border p-3 text-sm resize-none focus:outline-none focus:ring-2"
            style={{ borderColor: '#e8e4dc', color: '#1e1b4b' }}
            placeholder="Saisissez votre message…"
            disabled={confirming}
          />
        </div>

        <div className="px-5 pb-5">
          <button
            onClick={handleSend}
            disabled={confirming}
            className="w-full py-3.5 text-sm font-bold rounded-xl text-white transition-all active:scale-[0.97] disabled:opacity-60 flex items-center justify-center gap-2"
            style={{ background: '#1e1b4b' }}
          >
            {confirming ? 'Envoi…' : (<><Send size={16} /> Envoyer</>)}
          </button>
        </div>
      </div>
    </div>,
    document.body
  );
}