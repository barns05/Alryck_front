/**
 * PointsFortsSelector — Sélection administrateur des points forts (groupe Lieux/Traiteurs).
 *
 * Chaque catégorie prédéfinie est une carte accordéon réutilisable (PillAccordionSelector)
 * avec compteur « X sélectionnés » et état replié/déplié indépendant.
 * Les items prédéfinis cochés vont dans style_tags.
 * Le bouton « + Ajouter » par catégorie crée un point fort libre, stocké à part dans
 * points_forts_personnalises (bibliothèque commune préservée).
 * Côté fiche découverte, tout s'affiche en une liste plate.
 */
import { X } from 'lucide-react';
import { getPointsFortsCategories } from '@/config/metierConfig';
import PillAccordionSelector from '@/components/ma-fiche/PillAccordionSelector';

export default function PointsFortsSelector({ groupe, predefined, custom, onTogglePredefined, onAddCustom, onRemoveCustom }) {
  const categories = getPointsFortsCategories(groupe);
  if (categories.length === 0) return null;

  return (
    <div className="space-y-2.5">
      {categories.map((cat, idx) => (
        <PillAccordionSelector
          key={cat.titre}
          titre={cat.titre}
          items={cat.items}
          selected={predefined}
          onToggle={onTogglePredefined}
          defaultOpen={idx === 0}
          enableCustom
          onAddCustom={onAddCustom}
        />
      ))}

      {custom.length > 0 && (
        <div className="space-y-2 pt-2">
          <p className="text-[11px] font-bold text-slate-500 uppercase tracking-wider">Vos points forts personnalisés</p>
          <div className="flex flex-wrap gap-1.5">
            {custom.map((item, i) => (
              <span
                key={i}
                className="shrink-0 inline-flex items-center gap-1 px-2.5 py-1 rounded-full text-xs font-medium"
                style={{ background: '#FDF6E3', color: '#7a5f1a', border: '1px solid rgba(197,160,89,0.42)' }}
              >
                {item}
                <button type="button" onClick={() => onRemoveCustom(i)} className="ml-0.5 opacity-60 hover:opacity-100">
                  <X size={11} />
                </button>
              </span>
            ))}
          </div>
        </div>
      )}
    </div>
  );
}