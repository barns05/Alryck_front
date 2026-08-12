/**
 * LunaWrapper — Délègue vers PremiumWrapper (architecture 3-assets unifiée).
 *
 * Thème Luna : nuit élégante, lumière lunaire, calme et prestige.
 */
import PremiumWrapper from './PremiumWrapper';

export default function LunaWrapper({ theme, children }) {
  if (!theme || !theme.premium) {
    return <>{children}</>;
  }
  return <PremiumWrapper theme={theme}>{children}</PremiumWrapper>;
}