/**
 * Composant de choix du type de formulaire de préparation.
 * Utilisé dans l'Onboarding (étape 3) et dans BlocParametresApp.
 */
export default function FormulaireTypeSection({ value, onChange }) {
  const options = [
    {
      id: 'universel',
      emoji: '🔄',
      label: 'Questionnaire universel adaptatif',
      desc: 'Un seul questionnaire pour tous les événements. Le client peut choisir ou changer sa formule. Les questions s\'adaptent dynamiquement selon la formule sélectionnée.',
      badge: 'Recommandé',
    },
    {
      id: 'par_formule',
      emoji: '📋',
      label: 'Questionnaire par formule',
      desc: 'Un questionnaire distinct par formule. Les questions sont figées selon la formule validée au contrat. Le client ne peut pas changer de formule.',
      badge: null,
    },
  ];

  return (
    <div className="space-y-3">
      {options.map(opt => (
        <button
          key={opt.id}
          type="button"
          onClick={() => onChange(opt.id)}
          className={`w-full text-left p-4 rounded-xl border-2 transition-all ${
            value === opt.id
              ? 'border-primary bg-primary/5'
              : 'border-border hover:border-primary/40 hover:bg-muted/30'
          }`}
        >
          <div className="flex items-start gap-3">
            <div className={`w-5 h-5 rounded-full border-2 flex items-center justify-center shrink-0 mt-0.5 transition-colors ${
              value === opt.id ? 'border-primary bg-primary' : 'border-muted-foreground'
            }`}>
              {value === opt.id && <span className="w-2 h-2 rounded-full bg-white block" />}
            </div>
            <div className="flex-1 min-w-0">
              <div className="flex items-center gap-2 flex-wrap">
                <span className="text-base">{opt.emoji}</span>
                <span className="font-semibold text-sm">{opt.label}</span>
                {opt.badge && (
                  <span className="text-[10px] px-2 py-0.5 rounded-full bg-emerald-100 text-emerald-700 font-medium">
                    {opt.badge}
                  </span>
                )}
              </div>
              <p className="text-xs text-muted-foreground mt-1 leading-relaxed">{opt.desc}</p>
            </div>
          </div>
        </button>
      ))}
    </div>
  );
}