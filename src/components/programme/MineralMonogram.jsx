/**
 * MineralMonogram — Très grandes initiales serif, greige foncé, très légères.
 *
 * Style « pierre naturelle » :
 *   M  &  E
 *
 * Initiales en Playfair Display, greige foncé, sans contour, sans effet métallique.
 *
 * Props: nom, type_evenement, signature_override, theme, hasPhoto
 */
import { resolveSignature, SignatureContent } from './resolveSignature';

export default function MineralMonogram({ nom, type_evenement, signature_override, theme, hasPhoto }) {
  const sig = resolveSignature({ nom, type_evenement, signature_override });
  if (!sig) return null;

  const accent = theme?.accent || '#9A8E80';

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