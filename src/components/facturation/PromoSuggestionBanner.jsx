/**
 * PromoSuggestionBanner — Suggestion (jamais auto-insertion) d'une ligne
 * promotionnelle dans un Devis/Facture lié à un événement.
 *
 * Affiché uniquement quand l'événement possède ≥1 promotion acceptée par le
 * client ET non encore appliquée à un document financier. Le prestataire peut
 * accepter (insère la ligne) ou ignorer. Une fois la ligne ajoutée, la
 * PromotionReponse est marquée `appliquee: true` pour ne plus être suggérée.
 */
import { useQuery, useQueryClient } from '@tanstack/react-query';
import { base44 } from '@/api/base44Client';
import { Tag, Plus } from 'lucide-react';
import { getPromoLabel, getPromoEmoji } from '@/components/promotions/PromoOffreBadge';

export default function PromoSuggestionBanner({ evenementId, devisId, tvaTauxDefaut = 20, disabled = false, onAddLigne }) {
  const qc = useQueryClient();

  const { data: reponses = [] } = useQuery({
    queryKey: ['promo-reponses-ev-admin', evenementId],
    queryFn: () => base44.entities.PromotionReponse.filter({ evenement_id: evenementId }),
    enabled: !!evenementId,
    staleTime: 30000,
  });

  // Promotions acceptées et non encore appliquées
  const accepteesNonAppliquees = (reponses || []).filter(r => r.reponse === 'Accepté' && !r.appliquee);
  const promotionIds = Array.from(new Set(accepteesNonAppliquees.map(r => r.promotion_id).filter(Boolean)));

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

  if (accepteesNonAppliquees.length === 0) return null;

  const handleAjouter = async (reponse, promo) => {
    // Construction de la ligne promotionnelle.
    // La ligne représente l'offre au prix promotionnel (promo.prix) ; le
    // prestataire reste libre de modifier le montant/unité après insertion.
    const montant = promo?.prix || 0;
    const label = promo ? getPromoLabel(promo) : '';
    const emoji = promo ? getPromoEmoji(promo.type_promo) : '🎯';
    const description = `🎁 ${promo?.titre || reponse.promotion_titre || 'Offre promotionnelle'}${label ? ` — ${label}` : ''}`;

    // Insère la ligne dans le document en cours via le callback fourni par DevisModal.
    onAddLigne?.({
      id: crypto.randomUUID(),
      description,
      unite: 'forfait',
      quantite: 1,
      prix_unitaire_ht: montant,
      tva_taux: tvaTauxDefaut,
      total_ht: montant,
      remise: 0,
      remise_type: 'pct',
    });

    // Marquer la promotion comme appliquée (ne plus suggérer)
    try {
      await base44.entities.PromotionReponse.update(reponse.id, {
        appliquee: true,
        appliquee_devis_id: devisId || null,
      });
      qc.invalidateQueries(['promo-reponses-ev-admin', evenementId]);
    } catch (_) {
      // La ligne est insérée même si le marquage échoue ; le prestataire peut
      // réappliquer manuellement si besoin.
    }
  };

  if (disabled) return null;

  return (
    <div className="rounded-xl border-2 border-violet-200 bg-violet-50/60 p-3 space-y-2">
      <div className="flex items-center gap-2">
        <Tag size={14} className="text-violet-700" />
        <p className="text-xs font-semibold text-violet-900">
          Offre{accepteesNonAppliquees.length > 1 ? 's' : ''} promotionnelle{accepteesNonAppliquees.length > 1 ? 's' : ''} acceptée{accepteesNonAppliquees.length > 1 ? 's' : ''} par le client
        </p>
      </div>
      <p className="text-[11px] text-violet-700/80 leading-relaxed">
        Le client a accepté une offre. Vous pouvez l'ajouter à ce document — choisissez librement sur quelle facture (acompte, intermédiaire, solde) l'appliquer.
      </p>
      <div className="flex flex-col gap-2">
        {accepteesNonAppliquees.map(r => {
          const promo = promotions.find(p => p.id === r.promotion_id);
          const label = promo ? getPromoLabel(promo) : '';
          const emoji = promo ? getPromoEmoji(promo.type_promo) : '🎯';
          return (
            <button
              key={r.id}
              type="button"
              onClick={() => handleAjouter(r, promo)}
              className="w-full flex items-center gap-2 text-left text-xs font-medium px-3 py-2 rounded-lg border border-violet-300 bg-white hover:bg-violet-50 transition-colors"
            >
              <Plus size={14} className="text-violet-700 shrink-0" />
              <span className="flex-1 min-w-0">
                <span className="text-violet-900">Ajouter la ligne promo : </span>
                <span className="font-semibold text-violet-700">{emoji} {promo?.titre || r.promotion_titre || 'Offre'}</span>
                {label && <span className="text-violet-600"> — {label}</span>}
              </span>
            </button>
          );
        })}
      </div>
    </div>
  );
}