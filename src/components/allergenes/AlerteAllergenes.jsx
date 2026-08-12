import { useMemo } from 'react';
import { AlertTriangle, Info } from 'lucide-react';
import { ALLERGENES_14 } from './AllergenesPicker';

/**
 * Affiche une alerte allergènes.
 * 
 * Mode 1 (avec formulaire) : croise les allergies déclarées avec les allergènes du menu → conflits réels ⚠️
 * Mode 2 (sans formulaire) : affiche simplement les allergènes présents dans le menu à titre préventif ℹ️
 *
 * Props:
 * - formulaireReponses : objet des réponses du formulaire (null = mode préventif)
 * - menuElements : articles CatalogueItem avec allergènes
 * - optionsAllergenes : options avec allergènes (array de { nom, allergenes })
 * - compact : mode compact
 */
export default function AlerteAllergenes({ formulaireReponses, menuElements = [], optionsAllergenes = [], compact = false }) {
  const { conflits, allergiesClientDeclarees, allergenesMenu } = useMemo(() => {
    // Tous les allergènes présents dans le menu/options
    const allergenesMenuSet = new Set();
    menuElements.forEach(el => (el.allergenes || []).forEach(a => allergenesMenuSet.add(a)));
    optionsAllergenes.forEach(opt => (opt.allergenes || []).forEach(a => allergenesMenuSet.add(a)));

    if (!formulaireReponses) {
      return { conflits: [], allergiesClientDeclarees: [], allergenesMenu: [...allergenesMenuSet] };
    }

    // Extraction des allergies déclarées dans les réponses formulaire
    const allergiesText = [];
    Object.entries(formulaireReponses).forEach(([key, val]) => {
      if (!val) return;
      const kLow = key.toLowerCase();
      if (
        kLow.includes('allerg') ||
        kLow.includes('intoler') ||
        kLow.includes('intolér') ||
        kLow.includes('regime') ||
        kLow.includes('régime') ||
        kLow.includes('restriction')
      ) {
        if (typeof val === 'string' && val.trim()) allergiesText.push(val.trim());
        else if (Array.isArray(val)) allergiesText.push(...val);
      }
    });

    // Mappage texte → ids allergènes
    const allergeneMapping = {
      'gluten': 'gluten', 'blé': 'gluten', 'farine': 'gluten', 'orge': 'gluten', 'seigle': 'gluten',
      'crustac': 'crustaces', 'crevette': 'crustaces', 'homard': 'crustaces',
      'oeuf': 'oeufs', 'œuf': 'oeufs',
      'poisson': 'poissons', 'saumon': 'poissons', 'thon': 'poissons', 'cabillaud': 'poissons',
      'arachide': 'arachides', 'cacahuète': 'arachides', 'cacahuete': 'arachides',
      'soja': 'soja', 'tofu': 'soja',
      'lait': 'lait', 'lactose': 'lait', 'fromage': 'lait', 'crème': 'lait', 'beurre': 'lait',
      'fruit à coque': 'fruits_a_coque', 'noix': 'fruits_a_coque', 'amande': 'fruits_a_coque', 'noisette': 'fruits_a_coque', 'pistache': 'fruits_a_coque',
      'céleri': 'celeri', 'celeri': 'celeri',
      'moutarde': 'moutarde',
      'sésame': 'sesame', 'sesame': 'sesame',
      'sulfite': 'sulfites', 'anhydride sulfureux': 'sulfites',
      'lupin': 'lupin',
      'mollusque': 'mollusques', 'moule': 'mollusques', 'coquille': 'mollusques',
    };

    const allergiesDetectees = new Set();
    allergiesText.forEach(txt => {
      const low = txt.toLowerCase();
      Object.entries(allergeneMapping).forEach(([keyword, aId]) => {
        if (low.includes(keyword)) allergiesDetectees.add(aId);
      });
    });

    const conflits = [...allergiesDetectees].filter(a => allergenesMenuSet.has(a));

    return {
      conflits,
      allergiesClientDeclarees: [...allergiesDetectees],
      allergenesMenu: [...allergenesMenuSet],
    };
  }, [formulaireReponses, menuElements, optionsAllergenes]);

  // Mode préventif : pas de formulaire mais allergènes dans le menu
  if (!formulaireReponses) {
    if (allergenesMenu.length === 0) return null;
    return (
      <div className={`bg-amber-50 border border-amber-200 rounded-xl flex items-start gap-3 ${compact ? 'p-3' : 'p-4'}`}>
        <Info size={compact ? 16 : 18} className="text-amber-600 shrink-0 mt-0.5" />
        <div className="space-y-1 min-w-0">
          <p className={`font-semibold text-amber-800 ${compact ? 'text-xs' : 'text-sm'}`}>
            Allergènes présents dans le menu
          </p>
          <div className="flex flex-wrap gap-1 mt-1">
            {allergenesMenu.map(aId => {
              const a = ALLERGENES_14.find(x => x.id === aId);
              return a ? (
                <span key={aId} className="text-xs bg-amber-200 text-amber-900 px-2.5 py-0.5 rounded-full font-medium">
                  {a.emoji} {a.label}
                </span>
              ) : null;
            })}
          </div>
          <p className={`text-amber-600 ${compact ? 'text-[10px]' : 'text-[11px]'}`}>
            Informez vos équipes et vérifiez avec le formulaire client une fois complété.
          </p>
        </div>
      </div>
    );
  }

  // Mode conflit : formulaire complété + allergènes correspondants
  if (conflits.length === 0) return null;

  return (
    <div className={`bg-red-50 border border-red-300 rounded-xl flex items-start gap-3 ${compact ? 'p-3' : 'p-4'}`}>
      <AlertTriangle size={compact ? 16 : 18} className="text-red-600 shrink-0 mt-0.5" />
      <div className="space-y-1 min-w-0">
        <p className={`font-semibold text-red-800 ${compact ? 'text-xs' : 'text-sm'}`}>
          ⚠️ Alerte allergènes — {conflits.length} conflit{conflits.length > 1 ? 's' : ''} détecté{conflits.length > 1 ? 's' : ''}
        </p>
        <p className={`text-red-700 ${compact ? 'text-[11px]' : 'text-xs'}`}>
          Un ou plusieurs convives ont déclaré des allergies correspondant aux allergènes présents dans le menu de cet événement.
        </p>
        <div className="flex flex-wrap gap-1 mt-1">
          {conflits.map(aId => {
            const a = ALLERGENES_14.find(x => x.id === aId);
            return a ? (
              <span key={aId} className="text-xs bg-red-200 text-red-900 px-2.5 py-0.5 rounded-full font-medium">
                {a.emoji} {a.label}
              </span>
            ) : null;
          })}
        </div>
        <p className={`text-red-600 font-medium ${compact ? 'text-[10px]' : 'text-[11px]'}`}>
          Vérifiez les fiches invités et adaptez le menu si nécessaire.
        </p>
      </div>
    </div>
  );
}