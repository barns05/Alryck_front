/**
 * Sélecteur multiple de types d'événement.
 * - Stocke un tableau de strings dans `value`
 * - "Tous" = menu universel (désactive les autres coches et vice-versa)
 */

const TYPES = [
  'Mariage', 'Pacs', 'Anniversaire de mariage', 'Baptême',
  'Anniversaire', "Soirée d'entreprise", 'Séminaire', 'Cocktail',
  'Gala', 'Location', 'Autre',
];

export { TYPES };

/**
 * Normalise une valeur legacy (string) ou moderne (array) en array.
 * "Tous" ou "" → []  (signifie "tous types")
 */
export function normalizeTypes(v) {
  if (!v) return [];
  if (Array.isArray(v)) return v;
  if (v === 'Tous') return [];
  return [v];
}

/**
 * Pour l'affichage : retourne un libellé court.
 */
export function typesLabel(arr) {
  if (!arr || arr.length === 0) return 'Tous types';
  if (arr.length <= 2) return arr.join(', ');
  return `${arr[0]}, +${arr.length - 1}`;
}

export default function TypeEvenementMultiSelect({ value = [], onChange }) {
  const tous = value.length === 0;

  const toggle = (type) => {
    if (value.includes(type)) {
      onChange(value.filter(t => t !== type));
    } else {
      onChange([...value, type]);
    }
  };

  const setTous = () => onChange([]);

  return (
    <div className="space-y-2">
      {/* Option "Tous" */}
      <button
        type="button"
        onClick={setTous}
        className={`flex items-center gap-2 w-full text-left px-3 py-2 rounded-lg border text-sm font-medium transition-colors ${
          tous
            ? 'bg-primary text-primary-foreground border-primary'
            : 'bg-card border-border text-muted-foreground hover:bg-muted'
        }`}
      >
        <span className={`w-4 h-4 rounded border flex items-center justify-center shrink-0 ${tous ? 'bg-white/30 border-white/50' : 'border-border'}`}>
          {tous && <span className="w-2 h-2 rounded-sm bg-white block" />}
        </span>
        Tous les événements
      </button>

      {/* Types individuels */}
      <div className="grid grid-cols-2 gap-1.5">
        {TYPES.map(type => {
          const checked = value.includes(type);
          return (
            <button
              key={type}
              type="button"
              onClick={() => toggle(type)}
              className={`flex items-center gap-2 text-left px-2.5 py-1.5 rounded-lg border text-xs font-medium transition-colors ${
                checked
                  ? 'bg-primary/10 text-primary border-primary/30'
                  : 'bg-card border-border text-muted-foreground hover:bg-muted'
              }`}
            >
              <span className={`w-3.5 h-3.5 rounded border flex items-center justify-center shrink-0 ${checked ? 'bg-primary border-primary' : 'border-muted-foreground/40'}`}>
                {checked && (
                  <svg viewBox="0 0 10 8" fill="none" className="w-2.5 h-2">
                    <path d="M1 4l2.5 2.5L9 1" stroke="white" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round"/>
                  </svg>
                )}
              </span>
              {type}
            </button>
          );
        })}
      </div>
    </div>
  );
}