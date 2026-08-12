/**
 * Hook pour accéder à la terminologie des offres commerciales configurée dans les paramètres.
 * Retourne le terme principal (singulier et pluriel) ainsi que la liste complète des termes.
 *
 * Exemple d'usage :
 *   const { terme, termePluriel, termes } = useTerminologie();
 *   // terme → "Formule", termePluriel → "Formules", termes → ["Formules", "Menus"]
 */
import { useOwnerCompanySettings } from '@/hooks/useOwnerCompanySettings';

const TERMES_LABELS = {
  Formules: { singulier: 'Formule', pluriel: 'Formules' },
  Menus: { singulier: 'Menu', pluriel: 'Menus' },
  Prestations: { singulier: 'Prestation', pluriel: 'Prestations' },
  Packs: { singulier: 'Pack', pluriel: 'Packs' },
  Offres: { singulier: 'Offre', pluriel: 'Offres' },
};

export function useTerminologie() {
  const { settings } = useOwnerCompanySettings();
  const terminologie = settings?.terminologie_offres;

  if (!terminologie) {
    return {
      terme: 'Formule',
      termePluriel: 'Formules',
      termes: ['Formules'],
      termeCustom: null,
    };
  }

  const { mode, termes = [], terme_unique, terme_custom } = terminologie;

  if (mode === 'unique') {
    const label = terme_unique || terme_custom || 'Formule';
    const canonical = TERMES_LABELS[label + 's'] || TERMES_LABELS[label];
    return {
      terme: canonical?.singulier || label,
      termePluriel: canonical?.pluriel || label,
      termes: [canonical?.pluriel || label],
      termeCustom: terme_custom || null,
    };
  }

  // mode === 'multiple'
  const termesPluriels = termes.length > 0 ? termes : ['Formules'];
  const first = termesPluriels[0];
  const canonical = TERMES_LABELS[first];
  return {
    terme: canonical?.singulier || first,
    termePluriel: first,
    termes: termesPluriels,
    termeCustom: terminologie.terme_custom || null,
  };
}