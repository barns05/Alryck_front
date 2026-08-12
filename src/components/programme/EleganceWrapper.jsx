/**
 * EleganceWrapper — Délègue vers PremiumWrapper (architecture 3-assets unifiée).
 *
 * Ce fichier conserve l'interface d'import existante (ProgrammePreview et
 * ProgrammePublic importent EleganceWrapper) tout en routant vers le wrapper
 * premium commun. La config visuelle d'Élégance vit dans programmeTheme.js.
 *
 * Pour connecter les 3 assets dédiés, il suffit de renseigner textureUrl,
 * decoTopUrl et decoBottomUrl dans la config du thème — aucun code à changer.
 */
import PremiumWrapper from './PremiumWrapper';

export default function EleganceWrapper({ theme, children }) {
  if (!theme || !theme.premium) {
    return <>{children}</>;
  }
  return <PremiumWrapper theme={theme}>{children}</PremiumWrapper>;
}