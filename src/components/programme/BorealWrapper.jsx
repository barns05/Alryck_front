/**
 * BorealWrapper — Délègue vers PremiumWrapper (architecture 3-assets unifiée).
 *
 * Thème Boréal : aurores boréales, voiles lumineux, mouvements de lumière,
 * luxe contemporain. Totalement abstrait et générique.
 */
import PremiumWrapper from './PremiumWrapper';

export default function BorealWrapper({ theme, children }) {
  if (!theme || !theme.premium) {
    return <>{children}</>;
  }
  return <PremiumWrapper theme={theme}>{children}</PremiumWrapper>;
}