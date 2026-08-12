/**
 * DolceVitaWrapper — Délègue vers PremiumWrapper (architecture 3-assets unifiée).
 *
 * Thème Dolce Vita : Côte Amalfitaine, bleu cobalt & blanc, céramiques italiennes.
 */
import PremiumWrapper from './PremiumWrapper';

export default function DolceVitaWrapper({ theme, children }) {
  if (!theme || !theme.premium) {
    return <>{children}</>;
  }
  return <PremiumWrapper theme={theme}>{children}</PremiumWrapper>;
}