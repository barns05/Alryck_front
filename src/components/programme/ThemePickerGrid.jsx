/**
 * ThemePickerGrid — Grille de thèmes (ProgrammeJourJ).
 *
 *   - THÈMES INCLUS (navy_cristal, clair_cristal) : 2 colonnes.
 *       • tap sur le corps de la carte = onPreview(id) ; bouton « Choisir » = onApply(id).
 *   - THÈMES PREMIUM : scroll horizontal (Rosée/Nocturne/Sienna visibles au départ).
 *       • verrouillé (hors themesDebloques) : cadenas, tap = onPreview(id).
 *       • débloqué (dans themesDebloques) : tap = onPreview(id), bouton « Choisir » = onApply(id).
 */
import { Crown, Check, Loader2, Lock } from 'lucide-react';
import { PROGRAMME_THEMES } from './programmeTheme';

const INCLUDED_THEMES = ['navy_cristal', 'clair_cristal'];
// Rosée / Nocturne / Sienna visibles au départ, le reste accessible en scroll horizontal.
const PREMIUM_PREVIEW = [
  'rosee', 'nocturne', 'sienna',
  'elegance', 'nature', 'boheme', 'riviera', 'emeraude',
  'perle', 'dolce_vita', 'aurore', 'luna', 'mineral', 'givre', 'boreal',
];

const ACCROCHES = {
  navy_cristal: 'Élégant & Intemporel',
  clair_cristal: 'Frais & Raffiné',
};

export default function ThemePickerGrid({
  currentThemeId,
  themesDebloques,
  applyingId,
  onApply,
  onPreview,
}) {
  const debloques = themesDebloques || [];

  return (
    <div className="space-y-5">
      {/* ── THÈMES INCLUS ───────────────────────────────────────────────────── */}
      <div>
        <p className="text-[11px] font-bold uppercase tracking-wider mb-2" style={{ color: '#6b7280' }}>
          Gratuit
        </p>
        <div className="grid grid-cols-2 gap-3">
          {INCLUDED_THEMES.map((id) => {
            const t = PROGRAMME_THEMES[id];
            const isActive = currentThemeId === id;
            const isApplying = applyingId === id;
            const accentText = t.accentText || '#ffffff';

            // Tap sur le corps de la carte = visualiser (onPreview).
            // Bouton intégré « Choisir » = appliquer (onApply).
            const handleCardTap = () => {
              if (isApplying) return;
              onPreview(id);
            };
            const handleChoose = (e) => {
              e.stopPropagation();
              if (isApplying) return;
              onApply(id);
            };

            return (
              <div
                key={id}
                onClick={handleCardTap}
                className="relative rounded-2xl overflow-hidden text-left transition-transform active:scale-[0.98] cursor-pointer"
                style={{
                  background: t.pageBg,
                  border: isActive ? `2px solid ${t.accent}` : '1px solid rgba(229,231,235,0.8)',
                  boxShadow: isActive ? `0 4px 14px ${t.accent}40` : '0 1px 3px rgba(30,27,75,0.05)',
                }}
              >
                {/* Bande accent */}
                <div style={{ height: 8, background: t.accent }} />

                <div className="px-3 py-3">
                  <p className="text-sm font-bold truncate" style={{ color: t.text, fontFamily: t.headingFont || 'sans-serif' }}>
                    {t.shortName || t.name}
                  </p>
                  <p className="text-[11px] mt-0.5 truncate" style={{ color: t.textMuted }}>
                    {ACCROCHES[id]}
                  </p>
                  <div className="flex items-center gap-2 mt-2">
                    <span
                      className="inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-[9px] font-bold"
                      style={{ background: 'rgba(197,160,89,0.18)', color: '#C5A059' }}
                    >
                      <Crown size={9} /> Inclus
                    </span>
                    {!isActive && (
                      <button
                        type="button"
                        onClick={handleChoose}
                        disabled={isApplying}
                        className="px-2.5 py-0.5 rounded-full text-[10px] font-bold transition-transform active:scale-95 disabled:opacity-60"
                        style={{ background: t.accent, color: accentText }}
                      >
                        Choisir
                      </button>
                    )}
                  </div>
                </div>

                {/* Badge actif */}
                {isActive && (
                  <div className="absolute top-2.5 right-2.5 flex items-center gap-0.5 px-2 py-1 rounded-full text-[9px] font-bold"
                    style={{ background: t.accent, color: accentText }}>
                    <Check size={10} /> Choisi
                  </div>
                )}

                {/* Spinner */}
                {isApplying && (
                  <div className="absolute inset-0 flex items-center justify-center" style={{ background: 'rgba(0,0,0,0.18)' }}>
                    <Loader2 size={18} className="animate-spin text-white" />
                  </div>
                )}
              </div>
            );
          })}
        </div>
      </div>

      {/* ── THÈMES PREMIUM ──────────────────────────────────────────────────── */}
      <div>
        <p className="text-[11px] font-bold uppercase tracking-wider mb-2" style={{ color: '#6b7280' }}>
          Premium
        </p>
        <div
          className="flex gap-2.5 overflow-x-auto pb-1"
          style={{ scrollbarWidth: 'none', msOverflowStyle: 'none', WebkitOverflowScrolling: 'touch' }}
        >
          <style>{`.tpg-scroll::-webkit-scrollbar{display:none}`}</style>
          {PREMIUM_PREVIEW.map((id) => {
            const t = PROGRAMME_THEMES[id];
            const unlocked = debloques.includes(id);
            const isActive = currentThemeId === id;
            const isApplying = applyingId === id;
            const accentText = t.accentText || '#ffffff';

            // Tap sur le corps de la carte = visualiser (onPreview).
            // Bouton intégré « Choisir » = appliquer (onApply) — uniquement si débloqué.
            const handleCardTap = () => {
              if (isApplying) return;
              onPreview(id);
            };
            const handleChoose = (e) => {
              e.stopPropagation();
              if (isApplying) return;
              onApply(id);
            };

            return (
              <div
                key={id}
                onClick={handleCardTap}
                className="tpg-scroll relative rounded-2xl overflow-hidden text-left transition-transform active:scale-[0.98] cursor-pointer shrink-0"
                style={{
                  width: 112,
                  background: t.pageBg,
                  border: isActive ? `2px solid ${t.accent}` : '1px solid rgba(229,231,235,0.8)',
                  boxShadow: isActive ? `0 4px 14px ${t.accent}40` : '0 1px 3px rgba(30,27,75,0.05)',
                }}
              >
                {/* Bande accent */}
                <div style={{ height: 6, background: t.accent }} />

                <div className="px-2.5 py-3 flex flex-col items-center justify-center text-center" style={{ minHeight: 96 }}>
                  {unlocked ? (
                    isActive ? (
                      <div className="flex items-center gap-0.5 mb-1.5 px-2 py-1 rounded-full text-[9px] font-bold"
                        style={{ background: t.accent, color: accentText }}>
                        <Check size={10} /> Choisi
                      </div>
                    ) : (
                      <div className="mb-1.5">
                        <Crown size={14} style={{ color: t.accent }} />
                      </div>
                    )
                  ) : (
                    <div className="mb-1.5">
                      <Lock size={15} style={{ color: t.textMuted, opacity: 0.8 }} />
                    </div>
                  )}
                  <p className="text-xs font-bold truncate w-full" style={{ color: t.text, fontFamily: t.headingFont || 'sans-serif' }}>
                    {t.shortName || t.name}
                  </p>

                  {/* Bouton Choisir — uniquement pour les premium débloqués */}
                  {unlocked && !isActive && (
                    <button
                      type="button"
                      onClick={handleChoose}
                      disabled={isApplying}
                      className="mt-2 px-2.5 py-1 rounded-full text-[10px] font-bold transition-transform active:scale-95 disabled:opacity-60"
                      style={{ background: t.accent, color: accentText }}
                    >
                      Choisir
                    </button>
                  )}
                </div>

                {/* Spinner */}
                {isApplying && (
                  <div className="absolute inset-0 flex items-center justify-center" style={{ background: 'rgba(0,0,0,0.18)' }}>
                    <Loader2 size={18} className="animate-spin text-white" />
                  </div>
                )}
              </div>
            );
          })}
        </div>


      </div>
    </div>
  );
}