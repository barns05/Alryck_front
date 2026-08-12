/**
 * RivieraMonogram — Grandes initiales serif, bleu Riviera profond.
 *
 * Style « Côte d'Azur / Méditerranée » :
 *   M & E
 *   〰️
 *
 * Initiales en Playfair Display, couleur bleu profond, sans cercle.
 * Sans effet métallique, sans ombre marquée. Vague marine subtile
 * en dessous pour évoquer la Méditerranée.
 *
 * Props: nom, type_evenement, signature_override, theme, hasPhoto
 */
import { resolveSignature, SignatureContent } from './resolveSignature';

export default function RivieraMonogram({ nom, type_evenement, signature_override, theme, hasPhoto }) {
  const sig = resolveSignature({ nom, type_evenement, signature_override });
  if (!sig) return null;

  const textColor = theme?.text || '#234E70';
  const accent = theme?.accent || '#234E70';

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
          fontSize: 42,
          fontWeight: 400,
          color: textColor,
          letterSpacing: '0.08em',
          display: 'flex',
          alignItems: 'center',
          gap: '10px',
          lineHeight: 1,
        }}
        ampersandStyle={{ color: accent, fontSize: 28, fontWeight: 300 }}
      />
      {/* Vague marine subtile */}
      <svg width="60" height="10" viewBox="0 0 60 10" fill="none"
        style={{ marginTop: 6, opacity: 0.5 }}>
        <path d="M2 5 Q9 1 16 5 T30 5 T44 5 T58 5"
          stroke={accent} strokeWidth="0.8" fill="none" strokeLinecap="round" />
      </svg>
    </div>
  );
}