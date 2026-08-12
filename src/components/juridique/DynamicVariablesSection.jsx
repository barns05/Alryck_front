import { Sparkles } from 'lucide-react';

function formatPlaceholderLabel(placeholder) {
  return placeholder
    .toLowerCase()
    .replace(/_/g, ' ')
    .replace(/\b\w/g, c => c.toUpperCase());
}

/**
 * DynamicVariablesSection — section "Variables du modèle" extraite de ContractModal.
 * Affiche le formulaire de substitution des placeholders {{CHAMP}} avec aperçu en temps réel.
 */
export default function DynamicVariablesSection({
  placeholders,
  variableValues,
  setVariableValues,
  autoFilledFields,
  setAutoFilledFields,
  previewText,
}) {
  return (
    <div className="space-y-3 rounded-xl border border-violet-200 bg-violet-50/50 p-4">
      <div className="flex items-center gap-2">
        <Sparkles size={14} className="text-violet-700" />
        <p className="text-sm font-semibold text-violet-900">Modèle dynamique — variables à substituer</p>
      </div>
      <p className="text-xs text-violet-800">
        Renseignez chaque variable. L'aperçu se met à jour automatiquement. Un PDF sera généré à la sauvegarde.
      </p>

      {placeholders.length > 0 ? (
        <div className="grid grid-cols-2 gap-2">
          {placeholders.map(ph => (
            <div key={ph} className="space-y-1">
              <label className="text-xs font-medium text-muted-foreground flex items-start gap-1 flex-wrap min-w-0">
                <span className="break-words min-w-0">{formatPlaceholderLabel(ph)}</span>
                {autoFilledFields.has(ph) && (
                  <span className="text-[9px] text-violet-600 bg-violet-100 px-1 rounded-full shrink-0">auto</span>
                )}
              </label>
              <input
                type="text"
                value={variableValues[ph] || ''}
                onChange={e => {
                  const val = e.target.value;
                  setVariableValues(prev => ({ ...prev, [ph]: val }));
                  setAutoFilledFields(prev => {
                    const s = new Set(prev);
                    s.delete(ph);
                    return s;
                  });
                }}
                className={`flex h-8 w-full rounded-md border px-2 py-1 text-xs text-foreground focus-visible:outline-none focus-visible:ring-1 focus-visible:ring-ring ${
                  autoFilledFields.has(ph)
                    ? 'border-violet-300 bg-violet-50/40'
                    : 'border-input bg-white'
                }`}
              />
            </div>
          ))}
        </div>
      ) : (
        <p className="text-xs text-muted-foreground">Aucune variable détectée dans ce modèle.</p>
      )}

      {/* Aperçu du texte substitué (règle A/C : relecture avant sauvegarde) */}
      <div className="space-y-1">
        <p className="text-xs font-semibold text-muted-foreground">Aperçu du contrat généré :</p>
        <div className="bg-white border border-border rounded-lg p-3 text-xs font-mono whitespace-pre-wrap max-h-48 overflow-y-auto">
          {previewText}
        </div>
      </div>
    </div>
  );
}