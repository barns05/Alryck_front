/**
 * NatureWrapper — Délègue vers PremiumWrapper (architecture 3-assets unifiée).
 *
 * Anciennement HorizonWrapper, ce composant conserve l'interface d'import
 * existante tout en routant vers le wrapper premium commun. Aucune logique
 * spécifique à l'ancien thème Horizon n'est conservée.
 */
import PremiumWrapper from './PremiumWrapper';

export default function NatureWrapper({ theme, children }) {
  if (!theme || !theme.premium) {
    return <>{children}</>;
  }
  return <PremiumWrapper theme={theme}>{children}</PremiumWrapper>;
}