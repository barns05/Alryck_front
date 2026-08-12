/**
 * DecorativeSeparator — Séparateur premium inspiré joaillerie / haute papeterie.
 *
 *   ───────────── ◆ ─────────────
 *
 * Lignes dorées longues en dégradé de transparence +
 * losange central gravé (dégradé, liseré clair, relief).
 *
 * Props: theme
 */
export default function DecorativeSeparator({ theme }) {
  const accent = theme?.accent || '#C8A96A';
  const lineColor = theme?.goldSeparator || 'rgba(200, 169, 106, 0.6)';

  if (theme?.wrapper === 'horizon' || theme?.wrapper === 'sienna') {
    return <LeafDivider accent={accent} lineColor={lineColor} />;
  }

  if (theme?.wrapper === 'riviera') {
    return <WaveDivider accent={accent} lineColor={lineColor} />;
  }

  if (theme?.wrapper === 'nocturne' || theme?.wrapper === 'rosee') {
    return <ArcDivider accent={accent} lineColor={lineColor} />;
  }

  if (theme?.wrapper === 'emeraude') {
    return <LeafDivider accent={accent} lineColor={lineColor} />;
  }

  return (
    <div className="flex items-center justify-center gap-3" style={{ margin: '5px 0' }}>
      <div style={{
        height: 1,
        width: 90,
        background: `linear-gradient(to right, transparent 0%, ${lineColor} 100%)`,
      }} />
      <svg width="14" height="14" viewBox="0 0 14 14" fill="none">
        <defs>
          <linearGradient id="diamond-grad-eleg2" x1="0%" y1="0%" x2="100%" y2="100%">
            <stop offset="0%" stopColor={accent} stopOpacity="1" />
            <stop offset="50%" stopColor={accent} stopOpacity="0.5" />
            <stop offset="100%" stopColor={accent} stopOpacity="0.95" />
          </linearGradient>
        </defs>
        {/* Losange gravé avec relief */}
        <path d="M7 0 L14 7 L7 14 L0 7 Z" fill="url(#diamond-grad-eleg2)" stroke={accent} strokeWidth="0.6" />
        <path d="M7 2 L12 7 L7 12 L2 7 Z" fill="none" stroke="#FFFFFF" strokeWidth="0.5" opacity="0.35" />
        <circle cx="7" cy="7" r="1" fill="#FFFFFF" opacity="0.25" />
      </svg>
      <div style={{
        height: 1,
        width: 90,
        background: `linear-gradient(to left, transparent 0%, ${lineColor} 100%)`,
      }} />
    </div>
  );
}

function ArcDivider({ accent, lineColor }) {
  return (
    <div className="flex items-center justify-center gap-3" style={{ margin: '5px 0' }}>
      <div style={{
        height: 1,
        width: 80,
        background: `linear-gradient(to right, transparent 0%, ${lineColor} 100%)`,
      }} />
      <svg width="24" height="10" viewBox="0 0 24 10" fill="none">
        <path d="M2 8 Q6 1 12 5 T22 8"
          stroke={accent} strokeWidth="0.7" fill="none" strokeLinecap="round" opacity="0.6" />
        <circle cx="12" cy="5" r="0.8" fill={accent} opacity="0.7" />
      </svg>
      <div style={{
        height: 1,
        width: 80,
        background: `linear-gradient(to left, transparent 0%, ${lineColor} 100%)`,
      }} />
    </div>
  );
}

function WaveDivider({ accent, lineColor }) {
  return (
    <div className="flex items-center justify-center gap-3" style={{ margin: '5px 0' }}>
      <div style={{
        height: 1,
        width: 80,
        background: `linear-gradient(to right, transparent 0%, ${lineColor} 100%)`,
      }} />
      <svg width="30" height="12" viewBox="0 0 30 12" fill="none">
        <path d="M2 6 Q7 2 12 6 T22 6 T28 6"
          stroke={accent} strokeWidth="0.9" fill="none" strokeLinecap="round" opacity="0.7" />
        <path d="M2 9 Q7 5 12 9 T22 9 T28 9"
          stroke={accent} strokeWidth="0.6" fill="none" strokeLinecap="round" opacity="0.35" />
      </svg>
      <div style={{
        height: 1,
        width: 80,
        background: `linear-gradient(to left, transparent 0%, ${lineColor} 100%)`,
      }} />
    </div>
  );
}

function LeafDivider({ accent, lineColor }) {
  return (
    <div className="flex items-center justify-center gap-3" style={{ margin: '5px 0' }}>
      <div style={{
        height: 1,
        width: 90,
        background: `linear-gradient(to right, transparent 0%, ${lineColor} 100%)`,
      }} />
      <svg width="26" height="26" viewBox="0 0 26 26" fill="none">
        <path d="M13 3 Q13 13 13 23" stroke={accent} strokeWidth="0.9" opacity="0.6" strokeLinecap="round" />
        <ellipse cx="8" cy="9" rx="5.5" ry="2.2" fill={accent} opacity="0.25" transform="rotate(-38 8 9)" />
        <ellipse cx="18" cy="9" rx="5.5" ry="2.2" fill={accent} opacity="0.25" transform="rotate(38 18 9)" />
        <ellipse cx="8" cy="15" rx="5.5" ry="2.2" fill={accent} opacity="0.20" transform="rotate(-38 8 15)" />
        <ellipse cx="18" cy="15" rx="5.5" ry="2.2" fill={accent} opacity="0.20" transform="rotate(38 18 15)" />
        <circle cx="13" cy="13" r="1.2" fill={accent} opacity="0.5" />
      </svg>
      <div style={{
        height: 1,
        width: 90,
        background: `linear-gradient(to left, transparent 0%, ${lineColor} 100%)`,
      }} />
    </div>
  );
}