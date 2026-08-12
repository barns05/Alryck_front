import { useState, useRef } from 'react';
import { X, Plus, Sparkles, Link2 } from 'lucide-react';

/**
 * Modal unifié "+ Créer" pour la bibliothèque.
 *
 * Props:
 * - title: string — titre affiché dans le header
 * - onManual: fn | null — callback saisie manuelle (null = option masquée)
 * - onImageSimple: (file: File) => Promise<void>
 * - onImageAmanda: (file: File) => void — ouvre l'import Amanda avec ce fichier
 * - onGenerateFromFormula: fn | null — callback génération depuis catalogue (null = option masquée)
 * - onClose: fn
 */
export default function CreerModal({ title, onManual, onImageSimple, onImageAmanda, onGenerateFromFormula, onClose }) {
  const fileAmandaRef = useRef();

  const handleFileAmanda = (e) => {
    const files = Array.from(e.target.files || []);
    if (files.length === 0) return;
    onClose();
    onImageAmanda(files[0], files);
  };

  const OPTIONS = [
    onManual && {
      id: 'manual',
      icon: Plus,
      label: 'Saisie manuelle',
      desc: 'Remplissez le formulaire de création classique',
      onClick: () => { onClose(); onManual(); },
      accent: false,
    },
    {
      id: 'amanda',
      icon: Sparkles,
      label: 'Import avec Amanda',
      desc: 'Retranscription et structuration automatique par IA',
      onClick: () => fileAmandaRef.current?.click(),
      accent: true,
    },
    onGenerateFromFormula && {
      id: 'formula',
      icon: Link2,
      label: 'Générer depuis le Catalogue',
      desc: 'Créez automatiquement un formulaire adapté à votre formule',
      onClick: () => { onClose(); onGenerateFromFormula(); },
      accent: false,
    },
  ].filter(Boolean);

  return (
    <>
      <input
        ref={fileAmandaRef}
        type="file"
        accept=".pdf,.jpg,.jpeg,.png,.webp"
        multiple
        className="hidden"
        onChange={handleFileAmanda}
      />

      <div className="fixed inset-0 z-50 bg-black/50 backdrop-blur-sm flex items-center justify-center p-4" onMouseDown={onClose}>
        <div
          className="bg-card rounded-2xl border border-border shadow-xl w-full max-w-sm"
          onMouseDown={e => e.stopPropagation()}
        >
          {/* Header */}
          <div className="flex items-center justify-between px-5 py-4 border-b border-border">
            <h2 className="font-bold text-base">+ Créer — {title}</h2>
            <button onClick={onClose} className="p-1.5 rounded-lg hover:bg-muted text-muted-foreground">
              <X size={16} />
            </button>
          </div>

          {/* Options */}
          <div className="p-4 space-y-2">
            {OPTIONS.map(opt => {
              const Icon = opt.icon;
              return (
                <button
                  key={opt.id}
                  onClick={opt.onClick}
                  className={`w-full flex items-center gap-4 p-4 rounded-xl border transition-all text-left group
                    ${opt.accent
                      ? 'border-primary/30 bg-primary/5 hover:bg-primary/10 hover:border-primary/50'
                      : 'border-border bg-card hover:bg-muted/50 hover:border-primary/30'}`}
                  >
                  <div className={`w-10 h-10 rounded-xl flex items-center justify-center shrink-0
                    ${opt.accent ? 'bg-primary/10 text-primary' : 'bg-muted text-muted-foreground group-hover:text-primary'}`}>
                    <Icon size={18} />
                  </div>
                  <div className="flex-1 min-w-0">
                    <p className={`font-semibold text-sm ${opt.accent ? 'text-primary' : ''}`}>{opt.label}</p>
                    <p className="text-xs text-muted-foreground mt-0.5">{opt.desc}</p>
                  </div>
                </button>
              );
            })}
          </div>
        </div>
      </div>
    </>
  );
}