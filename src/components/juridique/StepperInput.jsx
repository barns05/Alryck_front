/**
 * StepperInput — sélecteur à boutons +/- (stepper) pour valeurs numériques.
 *
 * Bouton "−" à gauche, valeur au centre (lecture seule), bouton "+" à droite.
 * Pas de saisie clavier libre : uniquement les boutons pour ajuster.
 * Bornes [min, max] et pas configurable.
 */
import { Minus, Plus } from 'lucide-react';

export default function StepperInput({ value, onChange, min = 0, max = 999, step = 1, suffix = '', ariaLabel }) {
  const current = (() => {
    const n = Number(value);
    return isNaN(n) ? min : Math.max(min, Math.min(max, n));
  })();

  const clampStep = (v) => {
    let n = Math.round(v / step) * step;
    n = Math.max(min, Math.min(max, n));
    return n;
  };

  const decrement = () => {
    const next = clampStep(current - step);
    if (next !== current) onChange(next);
  };
  const increment = () => {
    const next = clampStep(current + step);
    if (next !== current) onChange(next);
  };

  const btnCls =
    'flex items-center justify-center rounded-lg border border-border bg-card text-foreground transition-colors hover:bg-muted active:bg-muted/70 disabled:opacity-30 disabled:pointer-events-none shrink-0';

  return (
    <div className="flex items-center gap-2">
      <button
        type="button"
        onClick={decrement}
        disabled={current <= min}
        className={btnCls}
        style={{ width: 40, height: 40 }}
        aria-label={`Diminuer ${ariaLabel || ''}`}
      >
        <Minus size={18} />
      </button>
      <div
        className="flex-1 flex items-center justify-center rounded-lg border border-input bg-muted/30 min-w-[56px] h-10"
      >
        <span className="text-base font-semibold text-foreground tabular-nums">
          {current}{suffix}
        </span>
      </div>
      <button
        type="button"
        onClick={increment}
        disabled={current >= max}
        className={btnCls}
        style={{ width: 40, height: 40 }}
        aria-label={`Augmenter ${ariaLabel || ''}`}
      >
        <Plus size={18} />
      </button>
    </div>
  );
}