/**
 * PromoEventBadge — Icône "Promotions" sur la carte événement (côté admin).
 * Affiche une icône Tag + un mini-statut (nb d'offres / acceptée).
 * Au tap, ouvre un bottom-sheet listant les offres envoyées pour cet événement
 * avec leur statut (Acceptée / Refusée / En attente).
 *
 * Style cohérent avec les autres badges modules de la carte événement
 * (Questionnaire, Programme, Fiche service, etc.).
 */
import { useState } from 'react';
import { createPortal } from 'react-dom';
import { useQuery } from '@tanstack/react-query';
import { base44 } from '@/api/base44Client';
import { Tag, X, Check, Clock, Ban } from 'lucide-react';
import { getPromoLabel, getPromoEmoji } from '@/components/promotions/PromoOffreBadge';

function StatutPill({ reponse }) {
  if (reponse === 'Accepté') {
    return (
      <span className="inline-flex items-center gap-1 text-[10px] font-semibold px-2 py-0.5 rounded-full bg-emerald-100 text-emerald-700">
        <Check size={10} /> Acceptée
      </span>
    );
  }
  if (reponse === 'Refusé') {
    return (
      <span className="inline-flex items-center gap-1 text-[10px] font-semibold px-2 py-0.5 rounded-full bg-red-100 text-red-600">
        <Ban size={10} /> Refusée
      </span>
    );
  }
  // Envoyé / Vu = en attente
  return (
    <span className="inline-flex items-center gap-1 text-[10px] font-semibold px-2 py-0.5 rounded-full bg-amber-100 text-amber-700">
      <Clock size={10} /> En attente
    </span>
  );
}

export default function PromoEventBadge({ evenementId }) {
  const [open, setOpen] = useState(false);

  const { data: reponses = [] } = useQuery({
    queryKey: ['promo-reponses-ev-admin', evenementId],
    queryFn: () => base44.entities.PromotionReponse.filter({ evenement_id: evenementId }),
    staleTime: 30000,
  });

  const promotionIds = Array.from(new Set((reponses || []).map(r => r.promotion_id).filter(Boolean)));
  const { data: promotions = [] } = useQuery({
    queryKey: ['promotions-by-ids', promotionIds.join(',')],
    queryFn: async () => {
      if (promotionIds.length === 0) return [];
      const all = await base44.entities.Promotion.list();
      return all.filter(p => promotionIds.includes(p.id));
    },
    enabled: promotionIds.length > 0,
    staleTime: 60000,
  });

  const promoById = new Map(promotions.map(p => [p.id, p]));

  // Ne rien afficher si aucune offre envoyée
  if (reponses.length === 0) return null;

  const nbAcceptees = reponses.filter(r => r.reponse === 'Accepté').length;
  const nbEnAttente = reponses.filter(r => r.reponse === 'Envoyé' || r.reponse === 'Vu').length;

  // Libellé du mini-statut : priorité à "X acceptée(s)", sinon "X en attente"
  let statutLabel;
  if (nbAcceptees > 0) {
    statutLabel = `${nbAcceptees} acceptée${nbAcceptees > 1 ? 's' : ''}`;
  } else if (nbEnAttente > 0) {
    statutLabel = `${nbEnAttente} en attente`;
  } else {
    statutLabel = `${reponses.length} offerte${reponses.length > 1 ? 's' : ''}`;
  }

  return (
    <>
      <button
        type="button"
        onClick={() => setOpen(true)}
        className="flex items-center gap-1 text-xs font-medium text-muted-foreground hover:text-foreground transition-colors"
        title="Offres promotionnelles envoyées au client"
      >
        <Tag size={12} />
        Promotions :
        <span className={`text-[10px] font-semibold px-1.5 py-0.5 rounded-full ${
          nbAcceptees > 0 ? 'bg-emerald-100 text-emerald-700' : 'bg-amber-100 text-amber-700'
        }`}>
          {statutLabel}
        </span>
      </button>

      {open && createPortal(
        <div className="fixed inset-0 z-[9999] flex items-end justify-center" onClick={() => setOpen(false)}>
          <div className="absolute inset-0 bg-black/45" />
          <div
            className="relative w-full max-w-lg bg-white rounded-t-3xl shadow-2xl flex flex-col overflow-hidden"
            style={{ maxHeight: '85vh' }}
            onClick={e => e.stopPropagation()}
          >
            <div className="flex items-center justify-between px-5 pt-4 pb-3 border-b shrink-0" style={{ borderColor: '#f1f5f9' }}>
              <h3 className="font-bold text-base flex items-center gap-2" style={{ color: '#1e1b4b' }}>
                <Tag size={18} style={{ color: '#C5A059' }} />
                Offres promotionnelles
                <span className="text-xs font-normal text-muted-foreground">({reponses.length})</span>
              </h3>
              <button onClick={() => setOpen(false)} className="text-gray-400 hover:text-gray-600">
                <X size={20} />
              </button>
            </div>

            <div className="overflow-y-auto flex-1 p-4 space-y-2">
              {reponses.map(r => {
                const promo = promoById.get(r.promotion_id);
                const label = promo ? getPromoLabel(promo) : (r.promotion_titre ? '' : '');
                const emoji = promo ? getPromoEmoji(promo.type_promo) : '🎯';
                return (
                  <div
                    key={r.id}
                    className="rounded-xl border p-3 flex items-start gap-3"
                    style={{ borderColor: '#e8e4dc', background: '#faf8f4' }}
                  >
                    <div className="flex-1 min-w-0">
                      <div className="flex items-center gap-2 flex-wrap mb-1">
                        <span className="text-base">{emoji}</span>
                        <p className="font-semibold text-sm" style={{ color: '#1e1b4b' }}>
                          {promo?.titre || r.promotion_titre || 'Offre'}
                        </p>
                        <StatutPill reponse={r.reponse} />
                      </div>
                      {promo?.description && (
                        <p className="text-xs text-muted-foreground leading-relaxed">{promo.description}</p>
                      )}
                      {label && (
                        <p className="text-xs font-semibold mt-1" style={{ color: '#C5A059' }}>
                          {emoji} {label}
                        </p>
                      )}
                      {r.appliquee && (
                        <p className="text-[10px] mt-1 inline-flex items-center gap-1 text-emerald-600 font-medium">
                          <Check size={10} /> Ligne ajoutée à une facture
                        </p>
                      )}
                    </div>
                  </div>
                );
              })}
            </div>
          </div>
        </div>,
        document.body
      )}
    </>
  );
}