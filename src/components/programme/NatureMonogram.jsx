/**
 * NatureMonogram — Initiales en serif flanquées de feuilles.
 *
 * Style « faire-part botanique » :
 *   🌿 M & E 🌿
 *   ── rameau végétal fin ──
 *
 * Initiales en Playfair Display, vert sauge profond, encadrées par
 * de petites branches de feuilles, avec un rameau végétal fin
 * sous les initiales.
 *
 * Props: nom, type_evenement, signature_override, theme, hasPhoto
 */
import { resolveSignature, SignatureContent } from './resolveSignature';

export default function NatureMonogram({ nom, type_evenement, signature_override, theme, hasPhoto }) {
  const sig = resolveSignature({ nom, type_evenement, signature_override });
  if (!sig) return null;

  const accent = theme?.accent || '#5A7A5E';
  const textColor = theme?.text || '#2A3A2E';

  return (
    <div className="flex flex-col items-center" style={{
      marginTop: hasPhoto ? '-24px' : '0',
      position: 'relative',
      zIndex: 2,
    }}>
      <div className="flex items-center justify-center gap-4">
        <LeafSprig accent={accent} flip />
        <SignatureContent
          sig={sig}
          style={{
            fontFamily: theme?.headingFont || "'Playfair Display', Georgia, serif",
            fontSize: 30,
            fontWeight: 500,
            color: accent,
            letterSpacing: '0.03em',
            display: 'flex',
            alignItems: 'center',
            gap: '4px',
          }}
          ampersandStyle={{ color: accent, fontSize: 20, fontWeight: 400 }}
        />
        <LeafSprig accent={accent} />
      </div>
      <TwigRameau accent={accent} />
    </div>
  );
}

function LeafSprig({ accent, flip }) {
  return (
    <svg width="36" height="18" viewBox="0 0 36 18" fill="none"
      style={{ transform: flip ? 'scaleX(-1)' : 'none' }}>
      <path d="M34 9 Q24 4 12 7 Q6 8 2 9"
        stroke={accent} strokeWidth="0.8" fill="none" opacity="0.55" strokeLinecap="round" />
      <ellipse cx="25" cy="6" rx="5.5" ry="2.2" fill={accent} opacity="0.25" transform="rotate(-22 25 6)" />
      <ellipse cx="16" cy="8" rx="5.5" ry="2.2" fill={accent} opacity="0.22" transform="rotate(-16 16 8)" />
      <ellipse cx="25" cy="11" rx="5.5" ry="2.2" fill={accent} opacity="0.18" transform="rotate(22 25 11)" />
      <ellipse cx="16" cy="12" rx="5.5" ry="2.2" fill={accent} opacity="0.18" transform="rotate(16 16 12)" />
    </svg>
  );
}

function TwigRameau({ accent }) {
  return (
    <svg width="64" height="12" viewBox="0 0 64 12" fill="none" style={{ marginTop: 4 }}>
      <path d="M4 6 Q16 3 32 6 Q48 9 60 6"
        stroke={accent} strokeWidth="0.7" fill="none" opacity="0.4" strokeLinecap="round" />
      <ellipse cx="14" cy="4.5" rx="3.5" ry="1.4" fill={accent} opacity="0.20" transform="rotate(-28 14 4.5)" />
      <ellipse cx="14" cy="7.5" rx="3.5" ry="1.4" fill={accent} opacity="0.16" transform="rotate(28 14 7.5)" />
      <ellipse cx="50" cy="4.5" rx="3.5" ry="1.4" fill={accent} opacity="0.20" transform="rotate(-28 50 4.5)" />
      <ellipse cx="50" cy="7.5" rx="3.5" ry="1.4" fill={accent} opacity="0.16" transform="rotate(28 50 7.5)" />
      <circle cx="32" cy="6" r="1.5" fill={accent} opacity="0.35" />
    </svg>
  );
}