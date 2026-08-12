import { useState } from 'react';
import { base44 } from '@/api/base44Client';
import { Upload, Loader2, AlertTriangle } from 'lucide-react';
import AmandaProcessing from '@/components/AmandaProcessing';

export const ALLERGENES_14 = [
  { id: 'gluten', label: 'Gluten', emoji: '🌾' },
  { id: 'crustaces', label: 'Crustacés', emoji: '🦞' },
  { id: 'oeufs', label: 'Œufs', emoji: '🥚' },
  { id: 'poissons', label: 'Poissons', emoji: '🐟' },
  { id: 'arachides', label: 'Arachides', emoji: '🥜' },
  { id: 'soja', label: 'Soja', emoji: '🫘' },
  { id: 'lait', label: 'Lait', emoji: '🥛' },
  { id: 'fruits_a_coque', label: 'Fruits à coque', emoji: '🌰' },
  { id: 'celeri', label: 'Céleri', emoji: '🥬' },
  { id: 'moutarde', label: 'Moutarde', emoji: '🌿' },
  { id: 'sesame', label: 'Graines de sésame', emoji: '🌱' },
  { id: 'sulfites', label: 'Anhydride sulfureux', emoji: '🍇' },
  { id: 'lupin', label: 'Lupin', emoji: '🌼' },
  { id: 'mollusques', label: 'Mollusques', emoji: '🦪' },
];

/**
 * Composant autonome de sélection des allergènes.
 * value : tableau d'ids (ex: ['gluten', 'lait'])
 * onChange : (newValue) => void
 */
export default function AllergenesPicker({ value = [], onChange, compact = false }) {
  const [mode, setMode] = useState('manuel'); // 'manuel' | 'amanda'
  const [uploading, setUploading] = useState(false);
  const [detected, setDetected] = useState(null); // résultat Amanda avant confirmation

  const toggle = (id) => {
    if (value.includes(id)) {
      onChange(value.filter(a => a !== id));
    } else {
      onChange([...value, id]);
    }
  };

  const handleAmandaUpload = async (e) => {
    const file = e.target.files?.[0];
    if (!file) return;
    setUploading(true);
    setDetected(null);

    const { file_url } = await base44.integrations.Core.UploadFile({ file });

    const result = await base44.integrations.Core.InvokeLLM({
      prompt: `Analyse ce document (fiche technique produit, étiquette ou liste d'ingrédients) et identifie les allergènes réglementaires présents parmi les 14 allergènes majeurs de l'UE.
      
      Retourne uniquement les identifiants des allergènes détectés parmi cette liste exacte :
      gluten, crustaces, oeufs, poissons, arachides, soja, lait, fruits_a_coque, celeri, moutarde, sesame, sulfites, lupin, mollusques
      
      Si le document ne parle pas d'ingrédients ou d'allergènes, retourne une liste vide.
      Sois conservateur : ne détecte que ce qui est explicitement mentionné ou très probable.`,
      file_urls: [file_url],
      response_json_schema: {
        type: 'object',
        properties: {
          allergenes_detectes: {
            type: 'array',
            items: { type: 'string' },
          },
          fiabilite: { type: 'string' },
        },
      },
    });

    setDetected(result.allergenes_detectes || []);
    setUploading(false);
    e.target.value = '';
  };

  const confirmDetection = () => {
    const merged = [...new Set([...value, ...(detected || [])])];
    onChange(merged);
    setDetected(null);
    setMode('manuel');
  };

  return (
    <div className="space-y-3">
      {/* Toggle mode */}
      <div className="flex gap-2">
        <button
          type="button"
          onClick={() => { setMode('manuel'); setDetected(null); }}
          className={`text-xs px-3 py-1.5 rounded-lg border font-medium transition-colors ${mode === 'manuel' ? 'bg-primary text-primary-foreground border-primary' : 'border-border text-muted-foreground hover:bg-muted'}`}
        >
          ✏️ Manuel
        </button>
        <button
          type="button"
          onClick={() => setMode('amanda')}
          className={`text-xs px-3 py-1.5 rounded-lg border font-medium transition-colors ${mode === 'amanda' ? 'bg-violet-600 text-white border-violet-600' : 'border-border text-muted-foreground hover:bg-muted'}`}
        >
          ✨ Détecter avec Amanda
        </button>
      </div>

      {/* Mode Amanda */}
      {mode === 'amanda' && (
        <div className="space-y-3">
          <label className="cursor-pointer block">
            <input type="file" accept="image/*,application/pdf" className="hidden" onChange={handleAmandaUpload} disabled={uploading} />
            <div className="flex items-center justify-center gap-2 border-2 border-dashed border-violet-300 bg-violet-50 rounded-xl px-4 py-4 hover:bg-violet-100 transition-colors">
              {uploading ? (
                <AmandaProcessing size="sm" message="Analyse en cours…" />
              ) : (
                <><Upload size={16} className="text-violet-600" /><span className="text-sm text-violet-700">📸 Uploader photo ou PDF produit</span></>
              )}
            </div>
          </label>
          <p className="text-[11px] text-muted-foreground flex items-start gap-1.5">
            <AlertTriangle size={12} className="shrink-0 mt-0.5 text-amber-500" />
            Détection automatique à titre indicatif — vérifiez toujours les informations avec le fabricant.
          </p>

          {/* Résultat Amanda — confirmation */}
          {detected !== null && (
            <div className="bg-violet-50 border border-violet-200 rounded-xl p-3 space-y-2">
              <p className="text-sm font-medium text-violet-900">
                ✨ Amanda a détecté {detected.length} allergène{detected.length !== 1 ? 's' : ''} :
              </p>
              <div className="flex flex-wrap gap-1.5">
                {detected.length === 0
                  ? <span className="text-xs text-muted-foreground">Aucun allergène détecté dans ce document.</span>
                  : detected.map(id => {
                    const a = ALLERGENES_14.find(x => x.id === id);
                    return a ? (
                      <span key={id} className="text-xs bg-violet-200 text-violet-800 px-2.5 py-1 rounded-full font-medium">
                        {a.emoji} {a.label}
                      </span>
                    ) : null;
                  })}
              </div>
              <p className="text-[11px] text-muted-foreground">Vous pourrez corriger manuellement après confirmation.</p>
              <div className="flex gap-2 pt-1">
                <button type="button" onClick={confirmDetection} className="text-xs px-3 py-1.5 bg-violet-600 text-white rounded-lg font-medium hover:bg-violet-700 transition-colors">
                  ✓ Appliquer et corriger
                </button>
                <button type="button" onClick={() => setDetected(null)} className="text-xs px-3 py-1.5 border border-border rounded-lg text-muted-foreground hover:bg-muted transition-colors">
                  Annuler
                </button>
              </div>
            </div>
          )}
        </div>
      )}

      {/* Cases à cocher — toujours visibles en mode manuel, ou après confirmation Amanda */}
      {(mode === 'manuel' || detected === null) && (
        <div className={`flex flex-wrap gap-1.5 ${compact ? '' : ''}`}>
          {ALLERGENES_14.map(a => {
            const checked = value.includes(a.id);
            return (
              <button
                key={a.id}
                type="button"
                onClick={() => toggle(a.id)}
                className={`flex items-center gap-1 text-xs px-2.5 py-1 rounded-full border font-medium transition-colors ${
                  checked
                    ? 'bg-amber-500 text-white border-amber-500'
                    : 'bg-card border-border text-muted-foreground hover:bg-muted'
                }`}
              >
                <span>{a.emoji}</span>
                <span>{a.label}</span>
              </button>
            );
          })}
        </div>
      )}

      {/* Résumé si des allergènes sont sélectionnés */}
      {value.length > 0 && (
        <p className="text-xs text-amber-700 font-medium">
          ⚠️ {value.length} allergène{value.length > 1 ? 's' : ''} renseigné{value.length > 1 ? 's' : ''}
        </p>
      )}
    </div>
  );
}