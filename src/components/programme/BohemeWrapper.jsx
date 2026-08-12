/**
 * BohemeWrapper — Délègue vers PremiumWrapper (architecture 3-assets unifiée).
 *
 * Route vers le wrapper premium commun. La config visuelle Bohème vit dans
 * programmeTheme.js. Renseigner decoTopUrl, decoBottomUrl et textureUrl
 * dans la config du thème pour activer les décorations.
 */
import PremiumWrapper from './PremiumWrapper';

export default function BohemeWrapper({ theme, children }) {
  if (!theme || theme.wrapper !== 'boheme') {
    return <>{children}</>;
  }
  return <PremiumWrapper theme={theme}>{children}</PremiumWrapper>;
}