/**
 * PersonnalisationProgress — Indicateur visuel de progression 3 étapes.
 *
 * Réutilise la logique step1Done / step2Done / step3Done déjà calculée dans
 * PersonnalisationCard et PersonnalisationContent.
 *
 *   Étape 1 : photo de profil
 *   Étape 2 : couleur ou photo d'ambiance
 *   Étape 3 : thème invitations / programme
 *
 * Deux variantes :
 *   - variant="compact" : petit pill « X/3 » + 3 points (carte compacte).
 *   - variant="drawer"  : 3 segments libellés + compteur (en-tête du drawer).
 */
const STEPS_LABELS = ['Photo de profil', 'Ambiance', 'Thème'];

export default function PersonnalisationProgress({ step1Done, step2Done, step3Done, variant = 'drawer' }) {
  const steps = [!!step1Done, !!step2Done, !!step3Done];
  const doneCount = steps.filter(Boolean).length;

  if (variant === 'compact') {
    return (
      <div className="flex items-center gap-1.5 shrink-0">
        <div className="flex items-center gap-1">
          {steps.map((done, i) => (
            <span
              key={i}
              className="block rounded-full transition-colors"
              style={{
                width: 6,
                height: 6,
                background: done ? '#C5A059' : 'rgba(30,27,75,0.18)',
              }}
            />
          ))}
        </div>
        <span
          className="text-[11px] font-bold tabular-nums"
          style={{ color: doneCount === 3 ? '#9a7b1f' : '#1e1b4b' }}
        >
          {doneCount}/3
        </span>
      </div>
    );
  }

  // variant="drawer"
  return (
    <div className="space-y-2">
      <div className="flex items-center justify-between">
        <p className="text-[11px] font-bold uppercase tracking-wide" style={{ color: '#1e1b4b' }}>
          Progression
        </p>
        <span
          className="text-[11px] font-bold tabular-nums px-2 py-0.5 rounded-full"
          style={{
            background: doneCount === 3 ? 'rgba(197,160,89,0.18)' : 'rgba(30,27,75,0.06)',
            color: doneCount === 3 ? '#9a7b1f' : '#1e1b4b',
          }}
        >
          {doneCount}/3
        </span>
      </div>
      <div className="grid grid-cols-3 gap-2">
        {steps.map((done, i) => (
          <div key={i} className="space-y-1">
            <div
              className="h-1.5 rounded-full transition-colors"
              style={{ background: done ? '#C5A059' : '#e8e4dc' }}
            />
            <p className="text-[10px] leading-tight" style={{ color: done ? '#1e1b4b' : '#9ca3af' }}>
              {STEPS_LABELS[i]}
            </p>
          </div>
        ))}
      </div>
    </div>
  );
}