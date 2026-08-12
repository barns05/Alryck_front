/**
 * AcceptedPromoModal — Vue lecture seule d'une promotion déjà acceptée.
 * Affiche le même contenu que PromotionBanner (prix barré, description, visuel)
 * mais sans les boutons d'action (déjà traitée).
 */
import { createPortal } from 'react-dom';
import { motion } from 'framer-motion';
import { Check, X, Calendar } from 'lucide-react';
import { format, parseISO } from 'date-fns';
import { fr } from 'date-fns/locale';
import { getPromoLabel, getPromoEmoji, getPromoTypeLabel } from '@/components/promotions/PromoOffreBadge';

export default function AcceptedPromoModal({ promo, onClose }) {
  if (!promo) return null;
  const label = getPromoLabel(promo);
  const emoji = getPromoEmoji(promo.type_promo);
  const typeLabel = getPromoTypeLabel(promo.type_promo);

  return createPortal(
    <div className="fixed inset-0 z-[9999] flex items-end justify-center" onClick={onClose}>
      <div className="absolute inset-0 bg-black/45" />
      <motion.div
        initial={{ y: '100%' }}
        animate={{ y: 0 }}
        exit={{ y: '100%' }}
        transition={{ type: 'spring', damping: 30, stiffness: 300 }}
        className="relative w-full max-w-lg bg-white rounded-t-3xl shadow-2xl flex flex-col overflow-hidden"
        style={{ maxHeight: '85vh' }}
        onClick={e => e.stopPropagation()}
      >
        {/* Header */}
        <div className="flex items-center justify-between px-5 pt-4 pb-3 border-b shrink-0" style={{ borderColor: '#f1f5f9' }}>
          <h3 className="font-bold text-base flex items-center gap-2" style={{ color: '#1e1b4b' }}>
            <span>✅</span> Offre acceptée
          </h3>
          <button onClick={onClose} className="text-gray-400 hover:text-gray-600">
            <X size={20} />
          </button>
        </div>

        {/* Corps */}
        <div className="overflow-y-auto flex-1 p-4 space-y-3">
          {/* Badge type */}
          <div className="flex items-center justify-between">
            <span className="text-xs font-bold uppercase tracking-wider text-emerald-600">
              {emoji} {typeLabel}
            </span>
            {promo.date_validite && (
              <span className="flex items-center gap-1 text-xs font-medium px-2 py-0.5 rounded-full bg-muted text-muted-foreground">
                <Calendar size={11} />
                Jusqu'au {format(parseISO(promo.date_validite), 'd MMM yyyy', { locale: fr })}
              </span>
            )}
          </div>

          {/* Visuel */}
          {promo.visuel_url && (
            <img src={promo.visuel_url} alt="" className="w-full rounded-xl object-cover max-h-48" />
          )}

          {/* Contenu */}
          <div>
            <h4 className="font-bold text-base" style={{ color: '#1e1b4b' }}>{promo.titre}</h4>
            {promo.description && <p className="text-sm text-muted-foreground mt-0.5">{promo.description}</p>}
            {label && (
              <div className="mt-2">
                <span className="inline-flex items-center gap-1.5 text-sm font-bold text-emerald-700 bg-emerald-50 px-3 py-1.5 rounded-xl">
                  {emoji} {label}
                </span>
              </div>
            )}
          </div>

          {/* Statut accepté */}
          <p className="text-sm text-emerald-700 font-medium flex items-center gap-1.5 pt-1">
            <Check size={14} /> Offre ajoutée à votre événement — notre équipe vous contactera pour les détails.
          </p>
        </div>
      </motion.div>
    </div>,
    document.body
  );
}