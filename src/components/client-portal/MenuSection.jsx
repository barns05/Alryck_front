import { useQuery } from '@tanstack/react-query';
import { base44 } from '@/api/base44Client';

export default function MenuSection({ evenement }) {
  // Charger les articles du catalogue associés à la formule de l'événement
  const { data: allItems = [] } = useQuery({
    queryKey: ['catalogue-items-portal'],
    queryFn: () => base44.entities.CatalogueItem.filter({ actif: true }),
    enabled: !!evenement.formule_nom,
  });

  const formuleName = evenement.formule_nom;

  // Articles filtrés par formule (toutes_formules ou associé à cette formule)
  const itemsFormule = allItems.filter(i =>
    i.toutes_formules !== false ||
    (i.formules_associees || []).includes(formuleName)
  );

  const alimentaire = itemsFormule.filter(i => i.section === 'alimentaire');
  const boissons = itemsFormule.filter(i => i.section === 'boissons');
  const inclusions = itemsFormule.filter(i => i.section === 'inclusions');

  // Ancien format menu (champs texte libres — legacy)
  const menu = evenement.menu;
  const hasLegacyContent = menu && (menu.entree || menu.plat || menu.dessert || menu.boissons || menu.options_speciales);

  const hasCatalogueContent = alimentaire.length > 0 || boissons.length > 0 || inclusions.length > 0;

  if (!hasCatalogueContent && !hasLegacyContent) return null;

  const legacyItems = hasLegacyContent ? [
    { label: 'Entrée', value: menu.entree, emoji: '🥗' },
    { label: 'Plat principal', value: menu.plat, emoji: '🍽️' },
    { label: 'Dessert', value: menu.dessert, emoji: '🍰' },
    { label: 'Boissons', value: menu.boissons, emoji: '🥂' },
    { label: 'Options spéciales', value: menu.options_speciales, emoji: '✨' },
  ].filter(item => item.value) : [];

  return (
    <div className="bg-card rounded-2xl border border-border p-5 space-y-4">
      <h3 className="font-semibold text-base">🍽️ Notre menu</h3>

      {/* Catalogue */}
      {hasCatalogueContent && formuleName && (
        <div className="space-y-4">
          <p className="font-medium text-sm text-primary">{formuleName}</p>

          {alimentaire.length > 0 && (
            <div className="space-y-1.5">
              <p className="text-xs font-semibold text-muted-foreground uppercase tracking-wide">🍽️ Alimentaire</p>
              {alimentaire.map(item => (
                <div key={item.id} className="flex items-start gap-2">
                  <span className="w-1.5 h-1.5 rounded-full bg-primary mt-1.5 shrink-0" />
                  <div>
                    <span className="text-sm font-medium">{item.nom}</span>
                    {item.categorie && <span className="ml-1.5 text-xs text-muted-foreground">({item.categorie})</span>}
                    {item.description && <p className="text-xs text-muted-foreground">{item.description}</p>}
                  </div>
                </div>
              ))}
            </div>
          )}

          {boissons.length > 0 && (
            <div className="space-y-1.5">
              <p className="text-xs font-semibold text-muted-foreground uppercase tracking-wide">🥂 Boissons</p>
              {boissons.map(item => (
                <div key={item.id} className="flex items-start gap-2">
                  <span className="w-1.5 h-1.5 rounded-full bg-primary mt-1.5 shrink-0" />
                  <div>
                    <span className="text-sm font-medium">{item.nom}</span>
                    {item.description && <p className="text-xs text-muted-foreground">{item.description}</p>}
                  </div>
                </div>
              ))}
            </div>
          )}

          {inclusions.length > 0 && (
            <div className="space-y-1.5">
              <p className="text-xs font-semibold text-muted-foreground uppercase tracking-wide">✅ Inclusions</p>
              {inclusions.map(item => (
                <div key={item.id} className="flex items-start gap-2">
                  <span className="w-1.5 h-1.5 rounded-full bg-primary mt-1.5 shrink-0" />
                  <div>
                    <span className="text-sm font-medium">{item.nom}</span>
                    {item.description && <p className="text-xs text-muted-foreground">{item.description}</p>}
                  </div>
                </div>
              ))}
            </div>
          )}
        </div>
      )}

      {/* Ancien format texte libre */}
      {!hasCatalogueContent && hasLegacyContent && (
        <div className="space-y-3">
          {legacyItems.map(item => (
            <div key={item.label} className="flex gap-3">
              <span className="text-base shrink-0">{item.emoji}</span>
              <div>
                <p className="text-xs text-muted-foreground font-medium uppercase tracking-wide">{item.label}</p>
                <p className="text-sm mt-0.5 whitespace-pre-line">{item.value}</p>
              </div>
            </div>
          ))}
        </div>
      )}
    </div>
  );
}