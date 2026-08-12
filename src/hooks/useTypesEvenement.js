import { useQuery } from '@tanstack/react-query';
import { base44 } from '@/api/base44Client';

const DEFAULTS_PARTICULIERS = [
  { nom: 'Mariage', categorie: 'Particulier', is_default: true, ordre: 1 },
  { nom: 'Anniversaire', categorie: 'Particulier', is_default: true, ordre: 2 },
  { nom: 'Anniversaire de mariage', categorie: 'Particulier', is_default: true, ordre: 3 },
  { nom: 'Baptême', categorie: 'Particulier', is_default: true, ordre: 4 },
  { nom: 'Communion', categorie: 'Particulier', is_default: true, ordre: 5 },
  { nom: 'Soirée à thème', categorie: 'Particulier', is_default: true, ordre: 6 },
  { nom: 'Réveillon', categorie: 'Particulier', is_default: true, ordre: 7 },
  { nom: 'Autre', categorie: 'Particulier', is_default: true, ordre: 99 },
];

const DEFAULTS_PROFESSIONNELS = [
  { nom: 'Gala', categorie: 'Professionnel', is_default: true, ordre: 1 },
  { nom: 'Repas d\'entreprise', categorie: 'Professionnel', is_default: true, ordre: 2 },
  { nom: 'Afterwork', categorie: 'Professionnel', is_default: true, ordre: 3 },
  { nom: 'Lancement de produit', categorie: 'Professionnel', is_default: true, ordre: 4 },
  { nom: 'Séminaire', categorie: 'Professionnel', is_default: true, ordre: 5 },
  { nom: 'Team building', categorie: 'Professionnel', is_default: true, ordre: 6 },
  { nom: 'Autre pro', categorie: 'Professionnel', is_default: true, ordre: 99 },
];

export const ALL_DEFAULTS = [...DEFAULTS_PARTICULIERS, ...DEFAULTS_PROFESSIONNELS];

/**
 * Catégorie par défaut selon le type d'événement
 */
export function getCategorieFromType(typeName) {
  const prof = DEFAULTS_PROFESSIONNELS.map(d => d.nom);
  if (prof.includes(typeName)) return 'Professionnel';
  return 'Particulier';
}

/**
 * Hook principal — retourne les types actifs (pour les selects/menus)
 * et tous les types (pour les settings)
 */
export function useTypesEvenement() {
  const { data: dbTypes = [], isLoading } = useQuery({
    queryKey: ['types-evenement'],
    queryFn: () => base44.entities.TypeEvenement.list('ordre', 500),
    staleTime: 30000,
  });

  // Fusionner defaults + DB : les defaults ont priorité si pas encore en DB
  const dbNoms = new Set(dbTypes.map(t => t.nom));
  const allDefaults = ALL_DEFAULTS.filter(d => !dbNoms.has(d.nom)).map(d => ({ ...d, id: null, actif: true }));

  const allTypes = [
    ...dbTypes,
    ...allDefaults,
  ].sort((a, b) => {
    // Catégorie Particulier en premier
    if (a.categorie !== b.categorie) return a.categorie === 'Particulier' ? -1 : 1;
    return (a.ordre || 0) - (b.ordre || 0);
  });

  const activeTypes = allTypes.filter(t => t.actif !== false);

  const particuliers = allTypes.filter(t => t.categorie === 'Particulier');
  const professionnels = allTypes.filter(t => t.categorie === 'Professionnel');

  const activeParticuliers = activeTypes.filter(t => t.categorie === 'Particulier');
  const activeProfessionnels = activeTypes.filter(t => t.categorie === 'Professionnel');

  return {
    allTypes,
    activeTypes,
    particuliers,
    professionnels,
    activeParticuliers,
    activeProfessionnels,
    isLoading,
    // Juste les noms actifs pour les selects
    activeNoms: activeTypes.map(t => t.nom),
  };
}