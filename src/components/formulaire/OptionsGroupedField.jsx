/**
 * Rendu du champ de type 'options_grouped'.
 * Affiche les OptionPrestation groupées par catégorie avec prix et sélection multiple.
 * Partagé entre FormulaireClientSection et FormulaireModeTest.
 */
const CAT_EMOJIS = {
  'Animations': '🎭',
  'Son & Lumières': '🎵',
  'Décoration': '🌸',
  'Location Matériel': '📦',
  'Prestataires externes': '🤝',
  'Animations culinaires': '👨‍🍳',
  'Autre': '✨',
};

export default function OptionsGroupedField({ champ, value, onChange, disabled, reponsesChoix, formuleChoisie, choixMenu }) {
  const selected = Array.isArray(value) ? value : [];

  const normalize = str => str?.toLowerCase()
    .normalize('NFD')
    .replace(/[\u0300-\u036f]/g, '')
    .trim();

  const grouped = (champ.optionsData || []).reduce((acc, opt) => {
    const cat = opt.categorie || 'Autre';
    if (!acc[cat]) acc[cat] = [];
    acc[cat].push(opt);
    return acc;
  }, {});

  return (
    <div className="space-y-4">
      {Object.entries(grouped).map(([cat, items]) => (
        <div key={cat} className="rounded-2xl border border-border overflow-hidden">
          <div className="px-4 py-2 bg-muted/40 border-b border-border">
            <span className="text-xs font-semibold uppercase tracking-wider text-muted-foreground">
              {CAT_EMOJIS[cat] || '✨'} {cat}
            </span>
          </div>
          <div className="divide-y divide-border">
            {items.map(opt => {
              const checked = selected.includes(opt.id);
              const inclus = !!(
                formuleChoisie &&
                opt.formules_liees?.includes(formuleChoisie) &&
                (opt.choix_menu_lies || []).some(c =>
                  (choixMenu || []).some(choix =>
                    normalize(choix) === normalize(c)
                  )
                )
              );
              return (
                <label
                  key={opt.id}
                  className={`flex items-center gap-3 px-4 py-3 transition-colors ${
                    inclus ? 'bg-emerald-50/60 dark:bg-emerald-950/20 pointer-events-none opacity-70'
                    : checked ? 'bg-primary/5 cursor-pointer'
                    : 'bg-card hover:bg-muted/30 cursor-pointer'
                  } ${disabled && !inclus ? 'pointer-events-none opacity-60' : ''}`}
                >
                  <input
                    type="checkbox"
                    checked={inclus || checked}
                    disabled={disabled || inclus}
                    onChange={() => {
                      if (!inclus) onChange(checked ? selected.filter(id => id !== opt.id) : [...selected, opt.id]);
                    }}
                    className="w-4 h-4 rounded accent-primary shrink-0"
                  />
                  <div className="flex-1 min-w-0">
                    <p className="text-sm font-medium">{opt.nom}</p>
                    {opt.description && (
                      <p className="text-xs text-muted-foreground">{opt.description}</p>
                    )}
                  </div>
                  {inclus && (
                    <span className="text-xs font-semibold text-emerald-700 dark:text-emerald-400 shrink-0 bg-emerald-100 dark:bg-emerald-900/40 px-2 py-0.5 rounded-full">
                      ✓ Inclus dans votre formule
                    </span>
                  )}
                  {!inclus && opt.prix > 0 && (
                    <span className="text-xs font-semibold text-primary shrink-0 bg-primary/10 px-2 py-0.5 rounded-full">
                      {opt.prix} €{opt.unite === 'Par personne' ? ' /pers.'
                        : opt.unite === 'Par heure' ? ' /h'
                        : opt.unite === 'Par unité' ? ' /unité'
                        : opt.unite === 'Forfait' ? ' forfait'
                        : ''}
                    </span>
                  )}
                </label>
              );
            })}
          </div>
        </div>
      ))}
    </div>
  );
}