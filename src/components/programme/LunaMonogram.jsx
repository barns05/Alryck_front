/**
 * LunaMonogram — Très grandes initiales serif, argent satiné, très légères.
 *
 * Style « nuit élégante » :
 *   M  &  E
 *
 * Initiales en Playfair Display, argent satiné, sans contour, sans effet métallique excessif.
 *
 * Props: nom, type_evenement, signature_override, theme, hasPhoto
 */
import { resolveSignature, SignatureContent } from './resolveSignature';

export default function LunaMonogram({ nom, type_evenement, signature_override, theme, hasPhoto }) {
  const sig = resolveSignature({ nom, type_evenement, signature_override });
  if (!sig) return null;

  const accent = theme?.accent || '#3F475C';

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
          opacity: 0.85,
        }}
        ampersandStyle={{ color: accent, fontSize: 30, fontWeight: 300, opacity: 0.5 }}
      />
    </div>
  );
}