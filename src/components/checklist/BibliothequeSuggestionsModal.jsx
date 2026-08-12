/**
 * BibliothequeSuggestionsModal
 * Suggère des tâches additionnelles organisées par thème.
 */
import { useState } from 'react';
import { motion } from 'framer-motion';
import { X, Lightbulb } from 'lucide-react';

const THEMES = [
  {
    label: '📋 Administratif',
    suggestions: [
      "Faire la demande de dossier en mairie si nécessaire",
      "Souscrire une assurance annulation",
      "Vérifier les autorisations nécessaires",
      "Prévoir le livret de famille si nécessaire",
    ],
  },
  {
    label: '💄 Beauté',
    suggestions: [
      "Réserver coiffeur / maquilleur",
      "Essai coiffure et maquillage",
      "Prévoir une trousse de retouches",
    ],
  },
  {
    label: '🌸 Décoration',
    suggestions: [
      "Choisir les fleurs",
      "Prévoir la signalétique",
      "Choisir les centres de table",
    ],
  },
  {
    label: '🎉 Animation',
    suggestions: [
      "Prévoir une playlist personnalisée",
      "Organiser un photobooth",
      "Prévoir des jeux pour enfants",
    ],
  },
  {
    label: '📦 Logistique',
    suggestions: [
      "Prévoir le rangement après l'événement",
      "Organiser le stockage des cadeaux",
    ],
  },
  {
    label: '🚗 Transport & Hébergement',
    suggestions: [
      "Réserver un service de navette",
      "Prévoir le parking invités",
    ],
  },
];

export default function BibliothequeSuggestionsModal({ onClose, onAdd, existingTitres = [] }) {
  const [selected, setSelected] = useState([]);

  const toggle = (suggestion) => {
    setSelected(prev =>
      prev.includes(suggestion)
        ? prev.filter(s => s !== suggestion)
        : [...prev, suggestion]
    );
  };

  const handleAdd = () => {
    if (selected.length === 0) return;
    onAdd(selected);
    onClose();
  };

  return (
    <motion.div
      className="fixed inset-0 z-[99999] flex items-end justify-center"
      initial={{ opacity: 0 }}
      animate={{ opacity: 1 }}
      exit={{ opacity: 0 }}
      onClick={onClose}
    >
      <div className="absolute inset-0" style={{ background: 'rgba(0,0,0,0.5)' }} />
      <motion.div
        initial={{ y: '100%' }}
        animate={{ y: 0 }}
        exit={{ y: '100%' }}
        transition={{ type: 'spring', damping: 32, stiffness: 320 }}
        className="relative w-full max-w-lg bg-white rounded-t-3xl shadow-2xl flex flex-col overflow-hidden"
        style={{ maxHeight: '88vh' }}
        onClick={e => e.stopPropagation()}
      >
        {/* Header */}
        <div className="flex items-center justify-between px-5 pt-4 pb-3 border-b shrink-0" style={{ borderColor: '#f1f5f9' }}>
          <h3 className="font-bold text-base flex items-center gap-2" style={{ color: '#1e1b4b' }}>
            <Lightbulb size={18} className="text-amber-500" /> Bibliothèque de suggestions
          </h3>
          <button onClick={onClose} className="text-gray-400 hover:text-gray-600">
            <X size={20} />
          </button>
        </div>

        {/* Contenu scrollable */}
        <div className="overflow-y-auto flex-1 px-5 py-4 space-y-5">
          {THEMES.map(theme => (
            <div key={theme.label} className="space-y-2">
              <p className="text-xs font-bold uppercase tracking-wide" style={{ color: '#6b7280' }}>
                {theme.label}
              </p>
              <div className="space-y-1.5">
                {theme.suggestions.map(s => {
                  const alreadyAdded = existingTitres.includes(s);
                  const isSelected = selected.includes(s);
                  return (
                    <button
                      key={s}
                      disabled={alreadyAdded}
                      onClick={() => toggle(s)}
                      className="flex items-center gap-3 w-full text-left px-3 py-2.5 rounded-xl border-2 transition-colors"
                      style={{
                        borderColor: isSelected ? '#1e1b4b' : '#e2e8f0',
                        background: isSelected ? '#eef2ff' : alreadyAdded ? '#f9fafb' : 'white',
                        opacity: alreadyAdded ? 0.5 : 1,
                      }}
                    >
                      <div
                        className="w-5 h-5 rounded-md border-2 flex items-center justify-center shrink-0 transition-colors"
                        style={{
                          borderColor: isSelected ? '#1e1b4b' : '#d1d5db',
                          background: isSelected ? '#1e1b4b' : 'white',
                        }}
                      >
                        {isSelected && <span className="text-white text-[10px] font-bold">✓</span>}
                      </div>
                      <span className="text-sm" style={{ color: '#1e1b4b' }}>{s}</span>
                      {alreadyAdded && (
                        <span className="ml-auto text-[10px] text-gray-400 shrink-0">Déjà ajoutée</span>
                      )}
                    </button>
                  );
                })}
              </div>
            </div>
          ))}
        </div>

        {/* Footer */}
        <div className="px-5 pb-8 pt-3 border-t shrink-0" style={{ borderColor: '#f1f5f9' }}>
          <button
            onClick={handleAdd}
            disabled={selected.length === 0}
            className="w-full py-3.5 rounded-2xl text-white font-semibold text-sm disabled:opacity-40 transition-opacity"
            style={{ background: '#1e1b4b' }}
          >
            {selected.length === 0
              ? 'Sélectionnez des tâches'
              : `Ajouter ${selected.length} tâche${selected.length > 1 ? 's' : ''} à ma checklist`}
          </button>
        </div>
      </motion.div>
    </motion.div>
  );
}