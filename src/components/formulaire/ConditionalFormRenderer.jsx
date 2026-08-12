/**
 * Moteur de rendu de formulaire avec logique conditionnelle.
 * Affiche/masque les champs selon les conditions définies.
 * ⚠️ DÉPRECATED : utilisez lib/conditionEngine.js à la place
 */
import { useMemo } from 'react';
import { Input } from '@/components/ui/input';
import { Textarea } from '@/components/ui/textarea';
import { filterChampsVisibles } from '@/lib/conditionEngine';

/**
 * Rend un champ individuel
 */
function renderChamp(champ, value, onChange) {
  const baseClasses = 'w-full';

  switch (champ.type) {
    case 'texte':
      return (
        <Textarea
          value={value || ''}
          onChange={e => onChange(champ.id, e.target.value)}
          placeholder={champ.description || ''}
          className="min-h-24"
        />
      );

    case 'nombre':
      return (
        <Input
          type="number"
          value={value || ''}
          onChange={e => onChange(champ.id, e.target.value)}
          placeholder={champ.description || ''}
        />
      );

    case 'date':
      return (
        <Input
          type="date"
          value={value || ''}
          onChange={e => onChange(champ.id, e.target.value)}
        />
      );

    case 'choix_unique':
      return (
        <div className="space-y-2">
          {(champ.options || []).map(option => (
            <label key={option} className="flex items-center gap-2 cursor-pointer">
              <input
                type="radio"
                name={champ.id}
                value={option}
                checked={value === option}
                onChange={e => onChange(champ.id, e.target.value)}
                className="rounded"
              />
              <span className="text-sm">{option}</span>
            </label>
          ))}
        </div>
      );

    case 'cases_a_cocher':
      return (
        <div className="space-y-2">
          {(champ.options || []).map(option => (
            <label key={option} className="flex items-center gap-2 cursor-pointer">
              <input
                type="checkbox"
                checked={(Array.isArray(value) ? value : []).includes(option)}
                onChange={e => {
                  const arr = Array.isArray(value) ? [...value] : [];
                  if (e.target.checked) {
                    arr.push(option);
                  } else {
                    arr.splice(arr.indexOf(option), 1);
                  }
                  onChange(champ.id, arr);
                }}
                className="rounded"
              />
              <span className="text-sm">{option}</span>
            </label>
          ))}
        </div>
      );

    case 'liste':
      return (
        <select
          value={value || ''}
          onChange={e => onChange(champ.id, e.target.value)}
          className="flex h-9 w-full rounded-md border border-input bg-transparent px-3 py-1 text-sm shadow-sm focus-visible:outline-none focus-visible:ring-1 focus-visible:ring-ring"
        >
          <option value="">— Sélectionner —</option>
          {(champ.options || []).map(option => (
            <option key={option} value={option}>{option}</option>
          ))}
        </select>
      );

    case 'upload':
      return (
        <Input
          type="file"
          onChange={e => onChange(champ.id, e.target.files?.[0]?.name || '')}
          className="cursor-pointer"
        />
      );

    default:
      return (
        <Input
          type="text"
          value={value || ''}
          onChange={e => onChange(champ.id, e.target.value)}
          placeholder={champ.description || ''}
        />
      );
  }
}

export default function ConditionalFormRenderer({ champs, reponses, onChangeReponse }) {
  // Calcule les champs visibles en fonction des réponses (utilise le moteur unifié)
  const champsVisibles = useMemo(() => {
    return filterChampsVisibles(champs, reponses);
  }, [champs, reponses]);

  return (
    <div className="space-y-6">
      {champsVisibles.map((champ, idx) => (
        <div key={champ.id || idx} className="space-y-2">
          <label className="text-sm font-medium">
            {champ.label}
            {champ.obligatoire && <span className="text-destructive ml-1">*</span>}
          </label>
          {champ.description && (
            <p className="text-xs text-muted-foreground">{champ.description}</p>
          )}
          {renderChamp(champ, reponses[champ.id], onChangeReponse)}
        </div>
      ))}
    </div>
  );
}