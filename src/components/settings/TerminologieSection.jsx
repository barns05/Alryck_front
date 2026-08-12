/**
 * Section de configuration de la terminologie des offres commerciales.
 * Utilisée dans SettingsIdentite et dans l'onboarding.
 *
 * Props:
 *  - value: { mode: 'unique'|'multiple', terme_unique: string, terme_custom: string, termes: string[] }
 *  - onChange: (value) => void
 */
import { useState } from 'react';
import { Input } from '@/components/ui/input';

const TERMES_DISPONIBLES = ['Formules', 'Menus', 'Prestations', 'Packs', 'Offres'];
const TERMES_UNIQUE = ['Formule', 'Menu', 'Prestation', 'Pack', 'Offre'];

export default function TerminologieSection({ value, onChange }) {
  const mode = value?.mode || 'unique';
  const termeUnique = value?.terme_unique || 'Formule';
  const termeCustom = value?.terme_custom || '';
  const termesMultiples = value?.termes || [];

  const set = (patch) => onChange({ ...value, ...patch });

  const toggleTerme = (t) => {
    const next = termesMultiples.includes(t)
      ? termesMultiples.filter(x => x !== t)
      : [...termesMultiples, t];
    set({ termes: next });
  };

  return (
    <div className="space-y-4">
      {/* Mode */}
      <div className="grid grid-cols-2 gap-2">
        <button
          type="button"
          onClick={() => set({ mode: 'unique' })}
          className={`p-3 rounded-xl border text-left transition-colors ${mode === 'unique' ? 'border-primary bg-primary/5' : 'border-border hover:bg-muted/50'}`}
        >
          <p className="font-medium text-sm">Un seul terme</p>
          <p className="text-xs text-muted-foreground mt-0.5">ex: "Formule Prestige"</p>
        </button>
        <button
          type="button"
          onClick={() => set({ mode: 'multiple' })}
          className={`p-3 rounded-xl border text-left transition-colors ${mode === 'multiple' ? 'border-primary bg-primary/5' : 'border-border hover:bg-muted/50'}`}
        >
          <p className="font-medium text-sm">Plusieurs termes</p>
          <p className="text-xs text-muted-foreground mt-0.5">ex: Formules + Menus + Packs</p>
        </button>
      </div>

      {/* Terme unique */}
      {mode === 'unique' && (
        <div className="space-y-2">
          <p className="text-xs font-medium text-muted-foreground">Choisissez votre terme principal :</p>
          <div className="flex flex-wrap gap-2">
            {TERMES_UNIQUE.map(t => (
              <button
                key={t}
                type="button"
                onClick={() => set({ terme_unique: t, terme_custom: '' })}
                className={`px-3 py-1.5 rounded-full text-sm font-medium border transition-colors ${termeUnique === t && !termeCustom ? 'bg-primary text-primary-foreground border-primary' : 'border-border hover:bg-muted'}`}
              >
                {t}
              </button>
            ))}
          </div>
          <div className="flex items-center gap-2">
            <button
              type="button"
              onClick={() => set({ terme_unique: '', terme_custom: termeCustom || '' })}
              className={`px-3 py-1.5 rounded-full text-sm font-medium border transition-colors shrink-0 ${termeCustom ? 'bg-primary text-primary-foreground border-primary' : 'border-border hover:bg-muted'}`}
            >
              Autre
            </button>
            {(termeCustom !== undefined) && (
              <Input
                value={termeCustom}
                onChange={e => set({ terme_unique: '', terme_custom: e.target.value })}
                placeholder="Votre terme personnalisé…"
                className="text-sm h-8"
              />
            )}
          </div>
        </div>
      )}

      {/* Termes multiples */}
      {mode === 'multiple' && (
        <div className="space-y-2">
          <p className="text-xs font-medium text-muted-foreground">Cochez tous les termes que vous utilisez :</p>
          <div className="space-y-2">
            {TERMES_DISPONIBLES.map(t => (
              <label key={t} className="flex items-center gap-2.5 cursor-pointer">
                <input
                  type="checkbox"
                  checked={termesMultiples.includes(t)}
                  onChange={() => toggleTerme(t)}
                  className="rounded"
                />
                <span className="text-sm font-medium">{t}</span>
              </label>
            ))}
            <div className="flex items-center gap-2 pt-1">
              <input
                type="checkbox"
                checked={!!value?.terme_custom}
                onChange={e => set({ terme_custom: e.target.checked ? '' : undefined })}
                className="rounded"
              />
              <span className="text-sm font-medium shrink-0">Autre</span>
              {value?.terme_custom !== undefined && (
                <Input
                  value={value.terme_custom || ''}
                  onChange={e => set({ terme_custom: e.target.value })}
                  placeholder="Votre terme personnalisé…"
                  className="text-sm h-8"
                />
              )}
            </div>
          </div>
          {termesMultiples.length === 0 && !value?.terme_custom && (
            <p className="text-xs text-amber-600">Cochez au moins un terme.</p>
          )}
        </div>
      )}
    </div>
  );
}