/**
 * Modal 2 étapes pour déplacer une formule vers Options & Prestations.
 * Étape 1 : choisir le mode (une option unique vs articles séparés)
 * Étape 2 : choisir la catégorie de destination
 */
import { useState } from 'react';
import { X, ArrowLeft } from 'lucide-react';
import { Button } from '@/components/ui/button';

const CATEGORIES_OPTIONS = [
  'Animations',
  'Son & Lumières',
  'Décoration',
  'Location Matériel',
  'Prestataires externes',
  'Animations culinaires',
  'Autre',
];

export default function DeplacerFormuleModal({ formule, articles, onConfirm, onCancel, loading }) {
  const [step, setStep] = useState(1);
  const [mode, setMode] = useState('unique'); // 'unique' | 'separes'
  const [categorie, setCategorie] = useState('Autre');

  if (!formule) return null;

  const nomSeul = formule.nom?.split('—')[0]?.trim() || formule.nom;

  return (
    <div className="fixed inset-0 z-[100] flex items-center justify-center bg-black/50 backdrop-blur-sm p-4">
      <div className="bg-white rounded-2xl border border-slate-200 shadow-xl w-full max-w-sm flex flex-col" style={{ paddingBottom: 'max(1.5rem, env(safe-area-inset-bottom))' }}>
        {/* Header */}
        <div className="flex items-center justify-between px-6 pt-5 pb-3 border-b border-slate-100">
          <h3 className="text-base font-semibold text-slate-900">
            ↗️ Déplacer vers Options & Prestations
          </h3>
          <button onClick={onCancel} className="p-1.5 rounded-lg hover:bg-muted text-muted-foreground">
            <X size={15} />
          </button>
        </div>

        <div className="px-6 py-4 space-y-4 pb-[110px] sm:pb-4">
          {/* ── Étape 1 ── */}
          {step === 1 && (
            <>
              <p className="text-sm text-slate-600">
                Comment voulez-vous déplacer <span className="font-semibold text-slate-900">« {nomSeul} »</span> ?
              </p>
              <div className="space-y-2">
                <label className={`flex items-start gap-3 p-3 rounded-xl border-2 cursor-pointer transition-colors ${mode === 'unique' ? 'border-blue-500 bg-blue-50' : 'border-slate-200 hover:border-slate-300'}`}>
                  <input
                    type="radio"
                    name="mode"
                    value="unique"
                    checked={mode === 'unique'}
                    onChange={() => setMode('unique')}
                    className="mt-0.5 accent-blue-600 shrink-0"
                  />
                  <div>
                    <p className="text-sm font-semibold text-slate-800">En une seule option</p>
                    <p className="text-xs text-slate-500 mt-0.5">La formule devient une option unique avec ses articles listés en description.</p>
                  </div>
                </label>
                <label className={`flex items-start gap-3 p-3 rounded-xl border-2 cursor-pointer transition-colors ${mode === 'separes' ? 'border-blue-500 bg-blue-50' : 'border-slate-200 hover:border-slate-300'}`}>
                  <input
                    type="radio"
                    name="mode"
                    value="separes"
                    checked={mode === 'separes'}
                    onChange={() => setMode('separes')}
                    className="mt-0.5 accent-blue-600 shrink-0"
                  />
                  <div>
                    <p className="text-sm font-semibold text-slate-800">En articles séparés</p>
                    <p className="text-xs text-slate-500 mt-0.5">Chaque article de la formule devient une option individuelle ({articles.length} article{articles.length !== 1 ? 's' : ''}).</p>
                  </div>
                </label>
              </div>
              <div className="flex gap-3 justify-end pt-2 border-t border-slate-100">
                <Button variant="outline" size="sm" onClick={onCancel}>Annuler</Button>
                <Button size="sm" className="bg-blue-600 hover:bg-blue-700 text-white" onClick={() => setStep(2)}>Suivant →</Button>
              </div>
            </>
          )}

          {/* ── Étape 2 ── */}
          {step === 2 && (
            <>
              <p className="text-sm text-slate-600">Dans quelle catégorie ?</p>
              <select
                value={categorie}
                onChange={e => setCategorie(e.target.value)}
                className="flex h-9 w-full rounded-md border border-input bg-transparent px-3 text-sm shadow-sm focus-visible:outline-none focus-visible:ring-1 focus-visible:ring-ring"
              >
                {CATEGORIES_OPTIONS.map(c => <option key={c} value={c}>{c}</option>)}
              </select>
              <div className="flex gap-3 justify-end pt-2 border-t border-slate-100">
                <Button variant="outline" size="sm" onClick={() => setStep(1)}>
                  <ArrowLeft size={13} /> Retour
                </Button>
                <Button
                  size="sm"
                  className="bg-blue-600 hover:bg-blue-700 text-white"
                  onClick={() => onConfirm({ mode, categorie })}
                  disabled={loading}
                >
                  {loading ? '…' : '↗️ Déplacer'}
                </Button>
              </div>
            </>
          )}
        </div>
      </div>
    </div>
  );
}