/**
 * RivieraWrapper — Délègue vers PremiumWrapper (architecture 3-assets unifiée).
 *
 * Ce fichier conserve l'interface d'import existante (ProgrammePreview et
 * ProgrammePublic importent RivieraWrapper) tout en routant vers le wrapper
 * premium commun. La config visuelle de Riviera vit dans programmeTheme.js.
 *
 * Pour ajouter des décorations haute/basse dédiées, il suffit de renseigner
 * decoTopUrl et decoBottomUrl dans la config du thème — aucun code à changer.
 */
import PremiumWrapper from './PremiumWrapper';

export default function RivieraWrapper({ theme, children }) {
  if (!theme || theme.wrapper !== 'riviera') {
    return <>{children}</>;
  }
  return <PremiumWrapper theme={theme}>{children}</PremiumWrapper>;
}