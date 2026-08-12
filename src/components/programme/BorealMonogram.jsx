/**
 * BorealMonogram — Très grandes initiales serif, bleu pétrole profond.
 *
 * Style « aurores boréales / voiles lumineux » :
 *   M  &  E
 *
 * Initiales en Playfair Display, bleu pétrole profond, sans contour,
 * sans effet métallique. Sobre et élégant.
 *
 * Props: nom, type_evenement, signature_override, theme, hasPhoto
 */
import { resolveSignature, SignatureContent } from './resolveSignature';

export default function BorealMonogram({ nom, type_evenement, signature_override, theme, hasPhoto }) {
  const sig = resolveSignature({ nom, type_evenement, signature_override });
  if (!sig) return null;

  const textColor = theme?.text || '#2A4A5C';

  return (
    <div className="flex flex-col items-center" style={{
      marginTop: hasPhoto ? '-28px' : '0',
      position: 'relative',
      zIndex: 2,
    }}>
      <SignatureContent
        sig={sig}
        style={{
          fontFamily: theme?.headingFont || "'Playfair Display', Georgia, serif",
          fontSize: 48,
          fontWeight: 400,
          color: textColor,
          letterSpacing: '0.08em',
          display: 'flex',
          alignItems: 'center',
          gap: '12px',
        }}
        ampersandStyle={{ color: theme?.accent || '#C5A059', fontSize: 30, fontWeight: 300, opacity: 0.7 }}
      />
    </div>
  );
}