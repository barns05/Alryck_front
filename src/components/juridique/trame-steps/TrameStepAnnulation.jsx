import { X } from 'lucide-react';
import { labelCls } from './trameConstants';
import StepperInput from '../StepperInput';

/** Clamp + parse → nombre valide pour l'affichage */
const num = (v, max = 9999) => {
  const n = Number(v);
  if (isNaN(n)) return 0;
  return Math.max(0, Math.min(max, n));
};

export default function TrameStepAnnulation({ fields, setField, addPalier, removePalier, updatePalier }) {
  const paliers = fields.PALIERS_ANNULATION || [];

  return (
    <div className="space-y-3">
      <div className="space-y-1">
        <label className={labelCls}>Lieu de signature</label>
        <input
          type="text"
          value={fields.LIEU_SIGNATURE}
          onChange={e => setField('LIEU_SIGNATURE', e.target.value)}
          className="flex h-9 w-full rounded-md border border-input bg-transparent px-3 py-1 text-sm text-foreground focus-visible:outline-none focus-visible:ring-1 focus-visible:ring-ring"
          autoComplete="off"
        />
      </div>

      <div className="border-t border-border pt-3 space-y-2">
        <p className="text-xs font-semibold uppercase tracking-wider text-muted-foreground">Paliers d'annulation</p>
        <p className="text-[11px] text-muted-foreground">
          Définissez les paliers d'annulation du plus éloigné au plus proche de l'événement.
          Le dernier palier représente le cas « moins de X jours avant ».
        </p>

        {paliers.length === 0 && (
          <p className="text-xs text-muted-foreground italic py-2">
            Aucun palier défini. Cliquez sur « + Ajouter un palier » pour commencer.
          </p>
        )}

        {paliers.map((palier, i) => {
          const isLast = i === paliers.length - 1;
          const prevDelai = i > 0 ? num(paliers[i - 1].delai_jours, 365) : null;

          return (
            <div key={i} className="bg-muted/30 rounded-lg p-3 space-y-3">
              {/* En-tête du palier */}
              <div className="flex items-center justify-between">
                <span className="text-xs font-medium text-foreground">
                  {i === 0 ? 'Palier 1 — Plus de' : isLast ? `Palier ${i + 1} — Moins de` : `Palier ${i + 1} — Entre`}
                </span>
                <button
                  onClick={() => removePalier(i)}
                  className="p-1.5 rounded-lg hover:bg-destructive/10 text-muted-foreground hover:text-destructive transition-colors shrink-0"
                  title="Supprimer"
                >
                  <X size={13} />
                </button>
              </div>

              {/* Steppers */}
              <div className="space-y-2">
                {!isLast && (
                  <div className="space-y-1">
                    <p className="text-[10px] text-muted-foreground">
                      {i === 0 ? 'Délai (jours)' : 'Délai sup. (jours)'}
                    </p>
                    <StepperInput
                      value={num(palier.delai_jours, 365)}
                      onChange={v => updatePalier(i, 'delai_jours', v)}
                      min={0}
                      max={365}
                      step={1}
                      ariaLabel="délai en jours"
                    />
                  </div>
                )}
                <div className="space-y-1">
                  <p className="text-[10px] text-muted-foreground">% retenu</p>
                  <StepperInput
                    value={num(palier.pourcentage_retenu, 100)}
                    onChange={v => updatePalier(i, 'pourcentage_retenu', v)}
                    min={0}
                    max={100}
                    step={5}
                    suffix=" %"
                    ariaLabel="pourcentage retenu"
                  />
                </div>
              </div>

              {/* Contexte */}
              {isLast && prevDelai != null && (
                <p className="text-[10px] text-muted-foreground text-center">
                  Soit moins de {prevDelai} jours avant l'événement
                </p>
              )}
              {!isLast && i > 0 && prevDelai != null && (
                <p className="text-[10px] text-muted-foreground text-center">
                  Soit entre {prevDelai} et {num(palier.delai_jours, 365)} jours avant
                </p>
              )}
            </div>
          );
        })}

        <button
          onClick={addPalier}
          className="text-xs font-medium text-primary hover:underline"
        >
          + Ajouter un palier
        </button>
      </div>

      {/* Aperçu du barème */}
      {paliers.length >= 2 && (
        <div className="bg-amber-50 border border-amber-200 rounded-lg p-3 text-xs text-amber-800">
          <strong>Barème d'annulation appliqué :</strong>
          <ul className="mt-1 space-y-0.5">
            {paliers.map((p, i) => {
              const isLast = i === paliers.length - 1;
              const prevDelai = i > 0 ? num(paliers[i - 1].delai_jours, 365) : null;
              const currDelai = num(p.delai_jours, 365);
              const currPct = num(p.pourcentage_retenu, 100);
              const consequence = currPct === 0
                ? `${fields.MODE_VERSEMENT === 'acompte' ? 'acompte' : 'arrhes'} conservé(e)s`
                : `${currPct}% du montant dû`;
              if (i === 0) {
                return <li key={i}>• Plus de {currDelai} jours avant : {consequence}</li>;
              }
              if (isLast) {
                return <li key={i}>• Moins de {prevDelai} jours avant : {consequence}</li>;
              }
              return <li key={i}>• Entre {prevDelai} et {currDelai} jours avant : {consequence}</li>;
            })}
          </ul>
        </div>
      )}
    </div>
  );
}