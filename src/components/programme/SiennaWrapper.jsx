/**
 * SiennaWrapper — Délègue vers PremiumWrapper (architecture 3-assets unifiée).
 *
 * Ce fichier conserve l'interface d'import existante (ProgrammePreview et
 * ProgrammePublic importent SiennaWrapper) tout en routant vers le wrapper
 * premium commun. La config visuelle de Sienna vit dans programmeTheme.js.
 *
 * Pour ajouter des décorations haute/basse dédiées, il suffit de renseigner
 * decoTopUrl et decoBottomUrl dans la config du thème — aucun code à changer.
 */
import PremiumWrapper from './PremiumWrapper';

export default function SiennaWrapper({ theme, children }) {
  if (!theme || theme.wrapper !== 'sienna') {
    return <>{children}</>;
  }
  return <PremiumWrapper theme={theme}>{children}</PremiumWrapper>;
}