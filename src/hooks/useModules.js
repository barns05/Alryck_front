// Redirige vers le ModulesContext — la requête réseau est faite une seule fois
// dans Layout et distribuée via contexte à tous les composants enfants.
export { useModules } from '@/contexts/ModulesContext';