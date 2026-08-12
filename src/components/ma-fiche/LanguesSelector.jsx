/**
 * LanguesSelector — Sélection des langues parlées en pastilles cliquables.
 *
 * Liste prédéfinie + option « + Ajouter » pour une langue non listée (stockée
 * dans le même champ langues_parlees, affichée comme pastille sélectionnée à la
 * suite des prédéfinies). Même composant visuel que Points forts / Équipements.
 */
import PillAccordionSelector from '@/components/ma-fiche/PillAccordionSelector';

const LANGUES_PREDEFINIES = [
  'Français', 'Anglais', 'Espagnol', 'Italien', 'Allemand',
  'Portugais', 'Arabe', 'Néerlandais', 'Russe', 'Chinois',
];

export default function LanguesSelector({ value, onChange, setIsDirty }) {
  const selected = Array.isArray(value) ? value : [];
  const custom = selected.filter(l => !LANGUES_PREDEFINIES.includes(l));
  const items = [...LANGUES_PREDEFINIES, ...custom];

  const toggle = (item) => {
    if (selected.includes(item)) onChange(selected.filter(l => l !== item));
    else onChange([...selected, item]);
    setIsDirty?.(true);
  };

  const addCustom = (v) => {
    if (!selected.includes(v)) onChange([...selected, v]);
    setIsDirty?.(true);
  };

  return (
    <PillAccordionSelector
      titre="Langues parlées"
      items={items}
      selected={selected}
      onToggle={toggle}
      onAddCustom={addCustom}
      enableCustom
      defaultOpen
    />
  );
}