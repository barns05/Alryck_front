import { useMemo } from 'react';
import { useQuery } from '@tanstack/react-query';
import { base44 } from '@/api/base44Client';

/**
 * Hook générique qui charge les OptionPrestation actives et construit
 * un champ virtuel de type 'options_grouped' prêt à être fusionné
 * avec les champs d'un formulaire.
 *
 * @param {string} typeEvenement - type de l'événement pour filtrer les options
 * @returns {{ champOptions: Array }} — tableau vide ou tableau avec 1 champ virtuel
 */
export function useOptionsPrestationsChamp(typeEvenement) {
  const { data: optionsPrestations = [] } = useQuery({
    queryKey: ['options-prestations'],
    queryFn: () => base44.entities.OptionPrestation.list(undefined, 500),
  });

  const champOptions = useMemo(() => {
    const filtered = optionsPrestations.filter(item => {
      if (!item.actif) return false;
      const universelle = !item.s_applique_a || item.s_applique_a.length === 0;
      if (universelle) return true;
      // type inconnu → comportement permissif : afficher quand même
      if (!typeEvenement) return true;
      // type connu → ne montrer que si compatible
      return item.s_applique_a.includes(typeEvenement);
    });
    if (filtered.length === 0) return [];
    return [{
      id: 'options-prestations',
      label: '✨ Options & Prestations',
      type: 'options_grouped',
      optionsData: filtered,
      obligatoire: false,
    }];
  }, [optionsPrestations, typeEvenement]);

  return { champOptions };
}