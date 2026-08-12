/**
 * PerleWrapper — Délègue vers PremiumWrapper (architecture 3-assets unifiée).
 *
 * Thème Perle : blanc nacré & gris perle, luxe discret et minimaliste.
 * Aucune logique spécifique — tout passe par le wrapper premium commun.
 */
import PremiumWrapper from './PremiumWrapper';

export default function PerleWrapper({ theme, children }) {
  if (!theme || !theme.premium) {
    return <>{children}</>;
  }
  return <PremiumWrapper theme={theme}>{children}</PremiumWrapper>;
}