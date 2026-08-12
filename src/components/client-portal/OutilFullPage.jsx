/**
 * OutilFullPage — Page plein écran uniforme pour les 4 cartes principales
 * de l'onglet Événement (Fiche récap, Informations pratiques, Déroulé, Brochures).
 *
 * En-tête identique pour toutes : flèche retour à gauche, titre centré,
 * contenu scrollable par-dessus la page (portal plein écran, pas de bottom sheet).
 */
import { createPortal } from 'react-dom';
import { motion } from 'framer-motion';
import { ArrowLeft } from 'lucide-react';

export default function OutilFullPage({ title, emoji, onClose, children }) {
  return createPortal(
    <motion.div
      initial={{ opacity: 0 }}
      animate={{ opacity: 1 }}
      exit={{ opacity: 0 }}
      transition={{ duration: 0.18 }}
      className="fixed inset-0 z-[9999] bg-white flex flex-col"
    >
      <div
        className="flex items-center justify-between px-3 py-3 border-b shrink-0"
        style={{ borderColor: '#e8e4dc', background: '#ffffff' }}
      >
        <button
          onClick={onClose}
          className="w-10 h-10 rounded-full flex items-center justify-center transition-colors active:opacity-70"
          style={{ background: '#f3f4f6', color: '#1e1b4b' }}
          aria-label="Retour"
        >
          <ArrowLeft size={20} />
        </button>
        <p className="font-semibold text-sm truncate px-2 text-center" style={{ color: '#1e1b4b' }}>
          <span className="mr-1.5">{emoji}</span>{title}
        </p>
        <div className="w-10" />
      </div>
      <div className="flex-1 overflow-y-auto px-4 py-4">
        {children}
      </div>
    </motion.div>,
    document.body
  );
}