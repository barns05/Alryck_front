// Composant réutilisable pour afficher le type/valeur d'une promotion
export function getPromoLabel(promo) {
  switch (promo.type_promo) {
    case 'prix_barre':
      if (promo.prix_original && promo.prix) return `${promo.prix_original.toLocaleString('fr-FR')} € → ${promo.prix.toLocaleString('fr-FR')} €`;
      if (promo.prix) return `${promo.prix.toLocaleString('fr-FR')} €`;
      return '';
    case 'pourcentage':
      return promo.pourcentage ? `-${promo.pourcentage}%${promo.prix ? ` (valeur : ${promo.prix.toLocaleString('fr-FR')} €)` : ''}` : '';
    case 'offre_groupee':
      return promo.offre_groupee_detail || '';
    case 'gratuit':
      return promo.offre_libre || 'Offert';
    case 'personnalise':
      return promo.offre_libre || '';
    default:
      return promo.prix ? `${promo.prix.toLocaleString('fr-FR')} €` : '';
  }
}

export function getPromoEmoji(type_promo) {
  const map = { prix_barre: '💰', pourcentage: '📊', offre_groupee: '🎁', gratuit: '🆓', personnalise: '📝' };
  return map[type_promo] || '🎯';
}

export function getPromoTypeLabel(type_promo) {
  const map = { prix_barre: 'Prix barré', pourcentage: 'Réduction', offre_groupee: 'Offre groupée', gratuit: 'Offre gratuite', personnalise: 'Offre personnalisée' };
  return map[type_promo] || 'Promotion';
}

export default function PromoOffreBadge({ promo, className = '' }) {
  if (promo.type_promo === 'prix_barre' && promo.prix_original && promo.prix) {
    return (
      <span className={`inline-flex items-center gap-1.5 text-sm font-bold ${className}`}>
        <span className="line-through text-muted-foreground font-normal">{promo.prix_original.toLocaleString('fr-FR')} €</span>
        <span className="text-primary">{promo.prix.toLocaleString('fr-FR')} €</span>
      </span>
    );
  }
  const label = getPromoLabel(promo);
  const emoji = getPromoEmoji(promo.type_promo);
  if (!label) return null;
  return (
    <span className={`inline-flex items-center gap-1 text-xs font-semibold bg-primary/10 text-primary px-2.5 py-1 rounded-full ${className}`}>
      {emoji} {label}
    </span>
  );
}