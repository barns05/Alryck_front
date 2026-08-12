/**
 * EleganceMonogram — Sceau circulaire embossé avec initiales + couronne de laurier.
 *
 * Évoque un sceau officiel de papeterie de luxe :
 *   - dégradé radial (effet embossé)
 *   - ombre interne douce + ombre externe subtile
 *   - double contour champagne noble
 *   - couronne de laurier bilatérale avec losange central
 *
 * Extrait automatiquement les initiales depuis le nom de l'événement
 * (ex: "Mariage Emma & Lucas" → "E & L").
 *
 * Props: nom, type_evenement, signature_override, theme, hasPhoto
 */
import { resolveSignature, SignatureContent } from './resolveSignature';

export default function EleganceMonogram({ nom, type_evenement, signature_override, theme, hasPhoto }) {
  const sig = resolveSignature({ nom, type_evenement, signature_override });
  if (!sig) return null;

  const accent = theme?.accent || '#C8A96A';
  const bg = theme?.monogramBg || '#FBF7EF';
  const textColor = theme?.text || '#1B2440';

  return (
    <div className="flex flex-col items-center" style={{
      marginTop: hasPhoto ? '-36px' : '0',
      position: 'relative',
      zIndex: 2,
    }}>
      {/* Sceau circulaire embossé */}
      <div style={{
        width: 72,
        height: 72,
        borderRadius: '50%',
        background: `radial-gradient(circle at 35% 22%, #FFFFFF 0%, ${bg} 50%, #E5D5B8 100%)`,
        border: `2px solid ${accent}`,
        outline: `1px solid ${accent}`,
        outlineOffset: '4px',
        display: 'flex',
        alignItems: 'center',
        justifyContent: 'center',
        boxShadow: `0 14px 32px rgba(180, 138, 74, 0.40), 0 4px 12px rgba(180, 138, 74, 0.20), inset 0 3px 8px rgba(255,255,255,1), inset 0 -6px 12px rgba(200,169,106,0.30)`,
      }}>
        <SignatureContent
          sig={sig}
          style={{
            fontFamily: theme?.headingFont || "'Cormorant Garamond', Georgia, serif",
            fontSize: 27,
            fontWeight: 600,
            color: textColor,
            letterSpacing: '0.02em',
            display: 'flex',
            alignItems: 'center',
            gap: '2px',
            textShadow: '0 1px 1px rgba(255,255,255,0.7)',
          }}
          ampersandStyle={{ color: accent, fontSize: 16, fontWeight: 400 }}
        />
      </div>
      {/* Couronne de laurier */}
      <svg width="56" height="16" viewBox="0 0 56 16" fill="none" style={{ marginTop: 6 }}>
        {/* Branche gauche */}
        <path d="M28 8 C22 3 14 4 7 8" stroke={accent} strokeWidth="0.9" strokeLinecap="round" fill="none" />
        <path d="M10 6 L9 3.5" stroke={accent} strokeWidth="0.6" strokeLinecap="round" />
        <path d="M13 5 L12.5 3" stroke={accent} strokeWidth="0.6" strokeLinecap="round" />
        <path d="M16 4.5 L15.5 2.5" stroke={accent} strokeWidth="0.6" strokeLinecap="round" />
        <path d="M10 10 L9 12.5" stroke={accent} strokeWidth="0.6" strokeLinecap="round" />
        <path d="M13 11 L12.5 13" stroke={accent} strokeWidth="0.6" strokeLinecap="round" />
        {/* Branche droite */}
        <path d="M28 8 C34 3 42 4 49 8" stroke={accent} strokeWidth="0.9" strokeLinecap="round" fill="none" />
        <path d="M46 6 L47 3.5" stroke={accent} strokeWidth="0.6" strokeLinecap="round" />
        <path d="M43 5 L43.5 3" stroke={accent} strokeWidth="0.6" strokeLinecap="round" />
        <path d="M40 4.5 L40.5 2.5" stroke={accent} strokeWidth="0.6" strokeLinecap="round" />
        <path d="M46 10 L47 12.5" stroke={accent} strokeWidth="0.6" strokeLinecap="round" />
        <path d="M43 11 L43.5 13" stroke={accent} strokeWidth="0.6" strokeLinecap="round" />
        {/* Losange central gravé */}
        <path d="M28 5 L31 8 L28 11 L25 8 Z" fill={accent} opacity="0.7" stroke={accent} strokeWidth="0.4" />
        <path d="M28 6 L30 8 L28 10 L26 8 Z" fill="none" stroke="#FFFFFF" strokeWidth="0.3" opacity="0.3" />
      </svg>
    </div>
  );
}