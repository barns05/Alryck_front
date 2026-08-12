import { useState, useEffect } from 'react';
import { base44 } from '@/api/base44Client';
import { Tag, Check, X, Calendar, AlertTriangle } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { format, parseISO, isAfter, differenceInDays } from 'date-fns';
import { fr } from 'date-fns/locale';
import { getPromoLabel, getPromoEmoji, getPromoTypeLabel } from '@/components/promotions/PromoOffreBadge';

export default function PromotionBanner({ evenement, clientNom }) {
  const [promotions, setPromotions] = useState([]);
  const [reponses, setReponses] = useState({});
  const [loading, setLoading] = useState(true);
  const [processing, setProcessing] = useState({});

  const load = async () => {
    if (!evenement?.id) return;
    setLoading(true);
    // Charger les réponses pour cet événement spécifique
    const reps = await base44.entities.PromotionReponse.filter({ evenement_id: evenement.id });

    const repMap = {};
    reps.forEach(r => { repMap[r.promotion_id] = r; });

    // Charger toutes les promos
    const allPromos = await base44.entities.Promotion.list();

    // Garder celles qui ont une PromotionReponse pour cet événement
    const promoIdsAvecReponse = new Set(reps.map(r => r.promotion_id));
    const actives = allPromos.filter(p => promoIdsAvecReponse.has(p.id));

    setPromotions(actives);
    setReponses(repMap);
    setLoading(false);
  };

  useEffect(() => {
    load();
  }, [evenement?.id]);

  // Marquer les promotions comme "Vu" quand le composant s'affiche
  useEffect(() => {
    if (!loading && reponses) {
      promotions.forEach(p => {
        const rep = reponses[p.id];
        if (rep && rep.reponse === 'Envoyé') {
          base44.entities.PromotionReponse.update(rep.id, { 
            reponse: 'Vu',
            date_reponse: new Date().toISOString(),
          }).catch(() => {});
        }
      });
    }
  }, [loading, promotions]);

  const handleReponse = async (promo, reponse) => {
    setProcessing(p => ({ ...p, [promo.id]: true }));
    const existing = reponses[promo.id];
    try {
      const promoLabel = getPromoLabel(promo);
      if (existing) {
        await base44.entities.PromotionReponse.update(existing.id, {
          reponse,
          date_reponse: new Date().toISOString(),
        });
      } else {
        await base44.entities.PromotionReponse.create({
          promotion_id: promo.id,
          promotion_titre: promo.titre,
          promotion_prix: promo.prix || 0,
          evenement_id: evenement.id,
          evenement_nom: evenement.nom,
          client_id: evenement.client_id || '',
          client_nom: clientNom || evenement.client_nom || '',
          client_email: evenement.client_email || '',
          reponse,
          date_reponse: new Date().toISOString(),
        });
      }

      if (reponse === 'Accepté') {
        // Ajouter à la fiche de préparation
        try {
          const formList = await base44.entities.FormulairePreparation.filter({ evenement_id: evenement.id });
          if (formList.length > 0) {
            const form = formList[0];
            const checklist = form.reponses?.checklist || [];
            await base44.entities.FormulairePreparation.update(form.id, {
              reponses: {
                ...form.reponses,
                checklist: [...checklist, {
                  label: `🎯 ${promo.titre}${promoLabel ? ` — ${promoLabel}` : ''}${promo.prix ? ` (${promo.prix.toLocaleString('fr-FR')} €)` : ''}`,
                  checked: false,
                }],
              },
            });
          }
        } catch (_) {}

        // Notifier les admins (in-app + email pour acceptation)
        try {
          const admins = await base44.entities.User.list();
          const adminList = (admins || []).filter(u => u.role === 'admin');
          for (const admin of adminList) {
            await base44.entities.Notification.create({
              titre: `🎯 ${clientNom || 'Un client'} a accepté l'offre`,
              message: `${clientNom || evenement.client_nom || 'Le client'} a accepté "${promo.titre}" pour ${evenement.nom}.`,
              type: 'promotion',
              lu: false,
              user_email: admin.email,
              lien: '/promotions',
            });
          }
          // Email aux admins — information commerciale importante à ne pas manquer
          for (const admin of adminList) {
            try {
              await base44.integrations.Core.SendEmail({
                to: admin.email,
                subject: `🎯 ${clientNom || 'Un client'} a accepté une offre promotionnelle`,
                body: `<p>Bonjour,</p><p><strong>${clientNom || evenement.client_nom || 'Le client'}</strong> a accepté l'offre <strong>${promo.titre}</strong> pour l'événement <strong>${evenement.nom}</strong>.</p><p>Connectez-vous à votre espace pour suivre les réponses.</p>`,
              });
            } catch (_) {}
          }
        } catch (_) {}
      } else if (reponse === 'Refusé') {
        // Notifier les admins (in-app uniquement — moins urgent qu'une acceptation)
        try {
          const admins = await base44.entities.User.list();
          const adminList = (admins || []).filter(u => u.role === 'admin');
          for (const admin of adminList) {
            await base44.entities.Notification.create({
              titre: `🚫 ${clientNom || 'Un client'} a décliné l'offre`,
              message: `${clientNom || evenement.client_nom || 'Le client'} a refusé "${promo.titre}" pour ${evenement.nom}.`,
              type: 'promotion',
              lu: false,
              user_email: admin.email,
              lien: '/promotions',
            });
          }
        } catch (_) {}
      }

      setReponses(prev => ({
        ...prev,
        [promo.id]: { ...(prev[promo.id] || {}), reponse, promotion_id: promo.id },
      }));
    } finally {
      setProcessing(p => { const n = { ...p }; delete n[promo.id]; return n; });
    }
  };

  if (loading) return null;

  // Filtrer : non expirées, qui ont une réponse liée à cet événement OU pas encore de réponse "Refusé"
  const visible = promotions.filter(p => {
    const rep = reponses[p.id];
    if (rep?.reponse === 'Refusé') return false;
    if (p.date_validite && !isAfter(parseISO(p.date_validite), new Date())) return false;
    return true;
  });

  if (visible.length === 0) return null;

  return (
    <div className="px-4 pt-4 space-y-3">
      {visible.map(promo => {
        const rep = reponses[promo.id];
        const accepted = rep?.reponse === 'Accepté';
        const label = getPromoLabel(promo);
        const emoji = getPromoEmoji(promo.type_promo);
        const typeLabel = getPromoTypeLabel(promo.type_promo);

        const daysLeft = promo.date_validite
          ? differenceInDays(parseISO(promo.date_validite), new Date())
          : null;
        const urgentDate = daysLeft !== null && daysLeft <= 7;

        return (
          <div key={promo.id} className={`rounded-2xl border-2 p-4 space-y-3 ${accepted ? 'border-emerald-300 bg-emerald-50' : 'border-primary/30 bg-primary/5'}`}>
            {/* Header badge */}
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-2">
                <span className="text-xl">{accepted ? '✅' : emoji}</span>
                <div>
                  <p className="text-xs font-bold text-primary uppercase tracking-wider">
                    {accepted ? 'Offre acceptée' : `🎯 ${typeLabel}`}
                  </p>
                </div>
              </div>
              {promo.date_validite && (
                <span className={`flex items-center gap-1 text-xs font-medium px-2 py-0.5 rounded-full ${urgentDate && !accepted ? 'bg-red-100 text-red-600' : 'bg-muted text-muted-foreground'}`}>
                  {urgentDate && !accepted && <AlertTriangle size={11} />}
                  <Calendar size={11} />
                  {urgentDate && !accepted
                    ? daysLeft === 0 ? "Expire aujourd'hui !" : `Plus que ${daysLeft} jour${daysLeft > 1 ? 's' : ''} !`
                    : `Jusqu'au ${format(parseISO(promo.date_validite), 'd MMM yyyy', { locale: fr })}`
                  }
                </span>
              )}
            </div>

            {/* Visuel */}
            {promo.visuel_url && (
              <img src={promo.visuel_url} alt="" className="w-full rounded-xl object-cover max-h-36" />
            )}

            {/* Contenu */}
            <div>
              <h4 className="font-bold text-base">{promo.titre}</h4>
              {promo.description && <p className="text-sm text-muted-foreground mt-0.5">{promo.description}</p>}
              {label && (
                <div className="mt-2">
                  <span className="inline-flex items-center gap-1.5 text-sm font-bold text-primary bg-primary/10 px-3 py-1.5 rounded-xl">
                    {emoji} {label}
                  </span>
                </div>
              )}
            </div>

            {/* Actions */}
            {!accepted ? (
              <div className="flex gap-2">
                <Button
                  className="flex-1 bg-primary text-white gap-2"
                  size="sm"
                  disabled={!!processing[promo.id]}
                  onClick={() => handleReponse(promo, 'Accepté')}
                >
                  <Check size={14} /> Je suis intéressé(e)
                </Button>
                <Button
                  variant="outline"
                  size="sm"
                  className="text-muted-foreground border-muted"
                  disabled={!!processing[promo.id]}
                  onClick={() => handleReponse(promo, 'Refusé')}
                >
                  <X size={14} /> Non merci
                </Button>
              </div>
            ) : (
              <p className="text-sm text-emerald-700 font-medium flex items-center gap-1.5">
                <Check size={14} /> Offre ajoutée à votre événement — notre équipe vous contactera pour les détails.
              </p>
            )}
          </div>
        );
      })}
    </div>
  );
}