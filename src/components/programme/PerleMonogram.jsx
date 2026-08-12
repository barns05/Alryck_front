/**
 * PerleMonogram — Très grandes initiales serif, gris perle, très légères.
 *
 * Style « papeterie cinq étoiles » :
 *   M  &  E
 *
 * Pas de sceau, pas de feuilles, pas d'ornements — uniquement la typographie.
 * Initiales en Playfair Display, gris perle, opacité réduite, sans contour,
 * sans effet métallique.
 *
 * Props: nom, type_evenement, signature_override, theme, hasPhoto
 */
import { resolveSignature, SignatureContent } from './resolveSignature';

export default function PerleMonogram({ nom, type_evenement, signature_override, theme, hasPhoto }) {
  const sig = resolveSignature({ nom, type_evenement, signature_override });
  if (!sig) return null;

  const accent = theme?.accent || '#8A8A92';

  return (
    <div className="flex flex-col items-center" style={{
      marginTop: hasPhoto ? '-32px' : '0',
      position: 'relative',
      zIndex: 2,
    }}>
      <SignatureContent
        sig={sig}
        style={{
          fontFamily: theme?.headingFont || "'Playfair Display', Georgia, serif",
          fontSize: 48,
          fontWeight: 300,
          color: accent,
          letterSpacing: '0.08em',
          display: 'flex',
          alignItems: 'center',
          gap: '10px',
          opacity: 0.82,
        }}
        ampersandStyle={{ color: accent, fontSize: 30, fontWeight: 300, opacity: 0.55 }}
      />
    </div>
  );
}