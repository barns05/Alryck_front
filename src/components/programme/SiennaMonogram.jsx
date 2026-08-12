/**
 * SiennaMonogram — Initiales en serif flanquées de rameaux terracotta.
 *
 * Style « faire-part bohème toscan » :
 *   🌾 M & E 🌾
 *
 * Pas de sceau circulaire — les initiales en Cormorant Garamond,
 * couleur brun cacao, encadrées par de petites branches d'eucalyptus
 * et herbes de la pampa aux teintes terracotta.
 *
 * Props: nom, type_evenement, signature_override, theme, hasPhoto
 */
import { resolveSignature, SignatureContent } from './resolveSignature';

export default function SiennaMonogram({ nom, type_evenement, signature_override, theme, hasPhoto }) {
  const sig = resolveSignature({ nom, type_evenement, signature_override });
  if (!sig) return null;

  const accent = theme?.accent || '#C97A5A';
  const textColor = theme?.text || '#6D4C41';

  return (
    <div className="flex flex-col items-center" style={{
      marginTop: hasPhoto ? '-22px' : '0',
      position: 'relative',
      zIndex: 2,
    }}>
      <div className="flex items-center justify-center gap-4">
        <PampasSprig accent={accent} flip />
        <SignatureContent
          sig={sig}
          style={{
            fontFamily: theme?.headingFont || "'Cormorant Garamond', Georgia, serif",
            fontSize: 32,
            fontWeight: 500,
            color: textColor,
            letterSpacing: '0.03em',
            display: 'flex',
            alignItems: 'center',
            gap: '4px',
          }}
          ampersandStyle={{ color: accent, fontSize: 22, fontWeight: 400 }}
        />
        <PampasSprig accent={accent} />
      </div>
    </div>
  );
}

/**
 * Rameau d'eucalyptus + herbe de la pampa, style aquarelle terracotta.
 */
function PampasSprig({ accent, flip }) {
  return (
    <svg width="38" height="22" viewBox="0 0 38 22" fill="none"
      style={{ transform: flip ? 'scaleX(-1)' : 'none' }}>
      {/* Tige principale courbe */}
      <path d="M36 11 Q24 5 12 9 Q6 10 2 11"
        stroke={accent} strokeWidth="0.7" fill="none" opacity="0.5" strokeLinecap="round" />
      {/* Feuilles d'eucalyptus (ellipses allongées) */}
      <ellipse cx="27" cy="7" rx="6" ry="2" fill={accent} opacity="0.22" transform="rotate(-28 27 7)" />
      <ellipse cx="18" cy="9" rx="6" ry="2" fill={accent} opacity="0.20" transform="rotate(-20 18 9)" />
      <ellipse cx="27" cy="14" rx="6" ry="2" fill={accent} opacity="0.18" transform="rotate(28 27 14)" />
      <ellipse cx="18" cy="15" rx="6" ry="2" fill={accent} opacity="0.16" transform="rotate(20 18 15)" />
      {/* Herbe de la pampa (plumeau) en haut */}
      <path d="M33 6 Q34 2 37 1" stroke={accent} strokeWidth="0.5" opacity="0.35" strokeLinecap="round" />
      <path d="M33 6 Q31 3 30 0.5" stroke={accent} strokeWidth="0.5" opacity="0.30" strokeLinecap="round" />
      <path d="M33 6 Q35.5 3.5 37.5 3" stroke={accent} strokeWidth="0.4" opacity="0.25" strokeLinecap="round" />
      <circle cx="33" cy="6" r="1" fill={accent} opacity="0.3" />
    </svg>
  );
}