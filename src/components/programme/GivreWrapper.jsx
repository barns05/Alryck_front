/**
 * GivreWrapper — Délègue vers PremiumWrapper (architecture 3-assets unifiée).
 *
 * Thème Givre : givre naturel, glace, verre dépoli, lumière hivernale, luxe discret.
 */
import PremiumWrapper from './PremiumWrapper';

export default function GivreWrapper({ theme, children }) {
  if (!theme || !theme.premium) {
    return <>{children}</>;
  }
  return <PremiumWrapper theme={theme}>{children}</PremiumWrapper>;
}