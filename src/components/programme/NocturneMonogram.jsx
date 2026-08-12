/**
 * NocturneMonogram — Grandes initiales serif, champagne mat sur fond anthracite.
 *
 * Style « gala / soirée prestige » :
 *   M & E
 *   ⋯
 *
 * Initiales en Playfair Display, couleur champagne, sans cercle, sans contour.
 * Petit point lumineux central en dessous pour évoquer une étoile discrète.
 *
 * Props: nom, type_evenement, signature_override, theme, hasPhoto
 */
import { resolveSignature, SignatureContent } from './resolveSignature';

export default function NocturneMonogram({ nom, type_evenement, signature_override, theme, hasPhoto }) {
  const sig = resolveSignature({ nom, type_evenement, signature_override });
  if (!sig) return null;

  const textColor = theme?.text || '#E8DCC8';
  const accent = theme?.accent || '#C5A059';

  return (
    <div className="flex flex-col items-center" style={{
      marginTop: hasPhoto ? '-18px' : '0',
      position: 'relative',
      zIndex: 2,
    }}>
      <SignatureContent
        sig={sig}
        style={{
          fontFamily: theme?.headingFont || "'Playfair Display', Georgia, serif",
          fontSize: 44,
          fontWeight: 400,
          color: textColor,
          letterSpacing: '0.10em',
          display: 'flex',
          alignItems: 'center',
          gap: '12px',
          lineHeight: 1,
        }}
        ampersandStyle={{ color: accent, fontSize: 28, fontWeight: 300 }}
      />
      {/* Point lumineux subtil */}
      <svg width="8" height="8" viewBox="0 0 8 8" fill="none"
        style={{ marginTop: 8 }}>
        <circle cx="4" cy="4" r="1.5" fill={accent} opacity="0.7" />
        <circle cx="4" cy="4" r="3" stroke={accent} strokeWidth="0.4" opacity="0.25" fill="none" />
      </svg>
    </div>
  );
}