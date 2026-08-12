/**
 * RoseeMonogram — Grandes initiales serif, vieux rose / taupe rosé.
 *
 * Style « Rosée Premium » :
 *   E  &  L
 *   ⋯
 *
 * Initiales en Cormorant Garamond, couleur taupe rosé, sans cercle,
 * sans contour, sans ombre marquée. Sobre et élégant.
 * Petit point rosé central en dessous pour évoquer une rosée discrète.
 *
 * Props: nom, type_evenement, signature_override, theme, hasPhoto
 */
import { resolveSignature, SignatureContent } from './resolveSignature';

export default function RoseeMonogram({ nom, type_evenement, signature_override, theme, hasPhoto }) {
  const sig = resolveSignature({ nom, type_evenement, signature_override });
  if (!sig) return null;

  const textColor = theme?.accent || '#B08585';
  const accent = theme?.accentDeep || '#9A6B6B';

  return (
    <div className="flex flex-col items-center" style={{
      marginTop: hasPhoto ? '-18px' : '0',
      position: 'relative',
      zIndex: 2,
    }}>
      <SignatureContent
        sig={sig}
        style={{
          fontFamily: theme?.headingFont || "'Cormorant Garamond', Georgia, serif",
          fontSize: 46,
          fontWeight: 400,
          color: textColor,
          letterSpacing: '0.08em',
          display: 'flex',
          alignItems: 'center',
          gap: '14px',
          lineHeight: 1,
        }}
        ampersandStyle={{ color: accent, fontSize: 30, fontWeight: 300 }}
      />
      {/* Goutte de rosée subtile */}
      <svg width="10" height="10" viewBox="0 0 10 10" fill="none"
        style={{ marginTop: 10 }}>
        <circle cx="5" cy="5" r="1.5" fill={accent} opacity="0.5" />
        <circle cx="5" cy="5" r="3" stroke={accent} strokeWidth="0.4" opacity="0.18" fill="none" />
      </svg>
    </div>
  );
}