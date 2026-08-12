/**
 * MineralWrapper — Délègue vers PremiumWrapper (architecture 3-assets unifiée).
 *
 * Thème Minéral : travertin, quartz, pierre naturelle, luxe architectural.
 */
import PremiumWrapper from './PremiumWrapper';

export default function MineralWrapper({ theme, children }) {
  if (!theme || !theme.premium) {
    return <>{children}</>;
  }
  return <PremiumWrapper theme={theme}>{children}</PremiumWrapper>;
}