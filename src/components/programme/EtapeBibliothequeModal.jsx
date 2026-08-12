/**
 * EtapeBibliothequeModal — Modal de sélection d'étapes depuis la bibliothèque.
 * Props: onClose, onAdd(suggestion)
 */
import { X, Plus, Check } from 'lucide-react';
import { BIBLIOTHEQUE } from './programmeTemplates';
import { useState } from 'react';

export default function EtapeBibliothequeModal({ onClose, onAdd }) {
  const [added, setAdded] = useState({});

  const handleAdd = (suggestion) => {
    onAdd(suggestion);
    setAdded(prev => ({ ...prev, [suggestion.nom]: true }));
  };

  return (
    <div className="fixed inset-0 z-[99999] flex items-end justify-center" onClick={onClose}>
      <div className="absolute inset-0 bg-black/60" />
      <div
        className="relative w-full max-w-lg bg-white rounded-t-3xl shadow-2xl flex flex-col overflow-hidden"
        style={{ maxHeight: '85vh' }}
        onClick={e => e.stopPropagation()}
      >
        {/* Header */}
        <div className="flex items-center justify-between px-5 pt-5 pb-3 border-b shrink-0" style={{ borderColor: '#f1f5f9' }}>
          <div>
            <h3 className="font-bold text-base" style={{ color: '#1e1b4b' }}>📚 Bibliothèque d'étapes</h3>
            <p className="text-xs text-gray-400 mt-0.5">Piochez des étapes prêtes à l'emploi</p>
          </div>
          <button onClick={onClose} className="text-gray-400 hover:text-gray-600">
            <X size={20} />
          </button>
        </div>

        {/* Contenu */}
        <div className="overflow-y-auto flex-1 px-5 py-4 space-y-4">
          {BIBLIOTHEQUE.map((cat) => (
            <div key={cat.categorie} className="space-y-1.5">
              <p className="text-[11px] font-bold uppercase tracking-wide" style={{ color: '#0369a1' }}>
                {cat.icon} {cat.categorie}
              </p>
              <div className="space-y-1">
                {cat.suggestions.map((s) => {
                  const isAdded = !!added[s.nom];
                  return (
                    <button
                      key={s.nom}
                      onClick={() => handleAdd(s)}
                      disabled={isAdded}
                      className="w-full flex items-center justify-between px-3 py-2 rounded-xl border text-left transition-colors disabled:opacity-50"
                      style={{
                        borderColor: isAdded ? '#bbf7d0' : '#e2e8f0',
                        background: isAdded ? '#f0fdf4' : '#f8faff',
                      }}
                    >
                      <span className="text-sm" style={{ color: '#1e1b4b' }}>{s.nom}</span>
                      {isAdded
                        ? <Check size={14} className="text-green-600" />
                        : <Plus size={14} className="text-blue-600" />}
                    </button>
                  );
                })}
              </div>
            </div>
          ))}
        </div>

        {/* Footer */}
        <div className="px-5 pb-8 pt-3 border-t shrink-0" style={{ borderColor: '#f1f5f9' }}>
          <button onClick={onClose} className="w-full py-3 rounded-2xl text-white text-sm font-semibold"
            style={{ background: '#1e1b4b' }}>
            Terminer
          </button>
        </div>
      </div>
    </div>
  );
}