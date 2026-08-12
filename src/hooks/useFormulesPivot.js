import { useMemo } from 'react';
import { useQuery } from '@tanstack/react-query';
import { base44 } from '@/api/base44Client';

/**
 * Hook qui charge les formules catalogue (section tarifs, type_tarif formule)
 * et expose une fonction pour filtrer les options d'un champ pivot formule
 * selon le type d'événement sélectionné.
 *
 * @returns {{ filtrerOptionsFormule: (options: string[], typeEvenement: string|undefined) => string[] }}
 */
export function useFormulesPivot() {
  const { data: formulesCatalogue = [] } = useQuery({
    queryKey: ['catalogue-tarifs-formules-pivot'],
    queryFn: () => base44.entities.CatalogueItem.filter({ type_tarif: 'formule' }),
  });

  const filtrerOptionsFormule = useMemo(() => {
    return (options, typeEvenement) => {
      // Pas de type sélectionné → toutes les options
      if (!typeEvenement || !options?.length) return options || [];

      return options.filter(nomFormule => {
        const item = formulesCatalogue.find(f => f.nom === nomFormule);
        if (!item) return true; // formule non trouvée dans le catalogue → afficher par défaut
        const sAppliqueA = item.s_applique_a || [];
        if (sAppliqueA.length === 0) return true; // universelle
        return sAppliqueA.includes(typeEvenement);
      });
    };
  }, [formulesCatalogue]);

  return { filtrerOptionsFormule };
}