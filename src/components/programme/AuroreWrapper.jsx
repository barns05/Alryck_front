/**
 * AuroreWrapper — Délègue vers PremiumWrapper (architecture 3-assets unifiée).
 *
 * Thème Aurore : premières lueurs du jour, lumière du matin, douceur et chaleur.
 */
import PremiumWrapper from './PremiumWrapper';

export default function AuroreWrapper({ theme, children }) {
  if (!theme || !theme.premium) {
    return <>{children}</>;
  }
  return <PremiumWrapper theme={theme}>{children}</PremiumWrapper>;
}