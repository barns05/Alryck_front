/**
 * EmeraudeMonogram — Grandes initiales serif, vert émeraude profond.
 *
 * Style « Émeraude Premium » :
 *   E  &  L
 *   ⋱
 *
 * Initiales en Playfair Display, couleur vert émeraude profond, sans cercle,
 * sans contour, sans ombre marquée. Sobre et élégant.
 * Petit rameau d'eucalyptus subtil en dessous pour évoquer le végétal.
 *
 * Props: nom, type_evenement, signature_override, theme, hasPhoto
 */
import { resolveSignature, SignatureContent } from './resolveSignature';

export default function EmeraudeMonogram({ nom, type_evenement, signature_override, theme, hasPhoto }) {
  const sig = resolveSignature({ nom, type_evenement, signature_override });
  if (!sig) return null;

  const textColor = theme?.accent || '#2A6B4A';
  const accent = theme?.accentDeep || '#1A5C45';

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
          fontSize: 46,
          fontWeight: 400,
          color: textColor,
          letterSpacing: '0.06em',
          display: 'flex',
          alignItems: 'center',
          gap: '14px',
          lineHeight: 1,
        }}
        ampersandStyle={{ color: accent, fontSize: 30, fontWeight: 300 }}
      />
      {/* Petit rameau d'eucalyptus subtil */}
      <svg width="30" height="14" viewBox="0 0 30 14" fill="none"
        style={{ marginTop: 10 }}>
        <path d="M15 2 Q15 8 15 12" stroke={accent} strokeWidth="0.6" opacity="0.4" strokeLinecap="round" />
        <ellipse cx="9" cy="6" rx="4" ry="1.8" fill={accent} opacity="0.15" transform="rotate(-35 9 6)" />
        <ellipse cx="21" cy="6" rx="4" ry="1.8" fill={accent} opacity="0.15" transform="rotate(35 21 6)" />
        <ellipse cx="9" cy="10" rx="3.5" ry="1.5" fill={accent} opacity="0.10" transform="rotate(-35 9 10)" />
        <ellipse cx="21" cy="10" rx="3.5" ry="1.5" fill={accent} opacity="0.10" transform="rotate(35 21 10)" />
      </svg>
    </div>
  );
}