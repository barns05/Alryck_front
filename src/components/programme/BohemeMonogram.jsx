/**
 * BohemeMonogram — Grandes initiales serif, brun chaud, encadrées de feuilles minimalistes.
 *
 * Style « faire-part bohème chic » :
 *   🌿 M & E 🌿
 *
 * Initiales en Playfair Display, couleur taupe foncé, légèrement espacées.
 * Sans effet métallique ni ombre marquée. Petites feuilles minimalistes
 * de chaque côté en terracotta clair désaturé.
 *
 * Props: nom, type_evenement, signature_override, theme, hasPhoto
 */
import { resolveSignature, SignatureContent } from './resolveSignature';

export default function BohemeMonogram({ nom, type_evenement, signature_override, theme, hasPhoto }) {
  const sig = resolveSignature({ nom, type_evenement, signature_override });
  if (!sig) return null;

  const accent = theme?.accent || '#C4856A';
  const textColor = theme?.text || '#5D4E42';

  return (
    <div className="flex flex-col items-center" style={{
      marginTop: hasPhoto ? '-20px' : '0',
      position: 'relative',
      zIndex: 2,
    }}>
      <div className="flex items-center justify-center gap-5">
        <LeafSprig accent={accent} flip />
        <SignatureContent
          sig={sig}
          style={{
            fontFamily: theme?.headingFont || "'Playfair Display', Georgia, serif",
            fontSize: 38,
            fontWeight: 400,
            color: textColor,
            letterSpacing: '0.06em',
            display: 'flex',
            alignItems: 'center',
            gap: '8px',
            lineHeight: 1,
          }}
          ampersandStyle={{ color: accent, fontSize: 26, fontWeight: 300 }}
        />
        <LeafSprig accent={accent} />
      </div>
    </div>
  );
}

/**
 * Petite branche de feuilles minimalistes, style contour fin.
 */
function LeafSprig({ accent, flip }) {
  return (
    <svg width="32" height="24" viewBox="0 0 32 24" fill="none"
      style={{ transform: flip ? 'scaleX(-1)' : 'none', opacity: 0.55 }}>
      {/* Tige courbe */}
      <path d="M30 12 Q20 6 10 10 Q5 11 2 12"
        stroke={accent} strokeWidth="0.6" fill="none" strokeLinecap="round" />
      {/* Feuilles minimalistes (formes fines) */}
      <path d="M24 7 Q21 5 19 7 Q21 9 24 7 Z" fill={accent} opacity="0.30" />
      <path d="M18 9 Q15 7 13 9 Q15 11 18 9 Z" fill={accent} opacity="0.25" />
      <path d="M24 17 Q21 19 19 17 Q21 15 24 17 Z" fill={accent} opacity="0.25" />
      <path d="M18 15 Q15 17 13 15 Q15 13 18 15 Z" fill={accent} opacity="0.20" />
      {/* Petite baie en haut */}
      <circle cx="28" cy="6" r="1.2" fill={accent} opacity="0.35" />
    </svg>
  );
}