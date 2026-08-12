/**
 * GivreMonogram — Très grandes initiales serif, gris glacier, sans contour.
 *
 * Style « givre et lumière froide » :
 *   M  &  E
 *
 * Initiales en Playfair Display, gris glacier froid, sans contour, sans effet
 * métallique prononcé. Légère opacité pour un rendu givré et aérien.
 *
 * Props: nom, type_evenement, signature_override, theme, hasPhoto
 */
import { resolveSignature, SignatureContent } from './resolveSignature';

export default function GivreMonogram({ nom, type_evenement, signature_override, theme, hasPhoto }) {
  const sig = resolveSignature({ nom, type_evenement, signature_override });
  if (!sig) return null;

  const accent = theme?.iconColor || '#8A9AAA';

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
          opacity: 0.80,
        }}
        ampersandStyle={{ color: accent, fontSize: 30, fontWeight: 300, opacity: 0.45 }}
      />
    </div>
  );
}