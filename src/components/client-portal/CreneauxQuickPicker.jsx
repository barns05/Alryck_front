/**
 * CreneauxQuickPicker — Modal de sélection rapide multi-créneaux.
 *
 * Ouvre une grille de créneaux générée automatiquement de 08:00 à 20:00
 * selon un pas de temps choisi (15 min, 30 min, 1 heure).
 * Le prestataire sélectionne plusieurs créneaux en une fois,
 * puis valide pour les ajouter à la liste du jour en cours.
 */
import { useState, useMemo } from 'react';
import { X, Check, Clock } from 'lucide-react';

const STEPS = [
  { label: '15 min', value: 15 },
  { label: '30 min', value: 30 },
  { label: '1 heure', value: 60 },
];

const START_MIN = 8 * 60;   // 08:00
const END_MIN   = 20 * 60;  // 20:00

function formatSlot(totalMin) {
  const h = Math.floor(totalMin / 60);
  const m = totalMin % 60;
  return `${String(h).padStart(2, '0')}:${String(m).padStart(2, '0')}`;
}

export default function CreneauxQuickPicker({ open, existingCreneaux = [], onAdd, onClose }) {
  const [step, setStep] = useState(60);
  const [selected, setSelected] = useState([]);

  const slots = useMemo(() => {
    const arr = [];
    for (let t = START_MIN; t <= END_MIN; t += step) {
      arr.push(formatSlot(t));
    }
    return arr;
  }, [step]);

  if (!open) return null;

  const toggleSlot = (h) => {
    setSelected(prev =>
      prev.includes(h) ? prev.filter(x => x !== h) : [...prev, h]
    );
  };

  const handleAdd = () => {
    // Fusionner avec les créneaux existants (sans doublons)
    const merged = [...new Set([...existingCreneaux, ...selected])].sort();
    onAdd(merged);
    setSelected([]);
  };

  const handleClose = () => {
    setSelected([]);
    onClose();
  };

  return (
    <div
      className="fixed inset-0 z-[9999] flex items-end sm:items-center justify-center p-0 sm:p-4"
      style={{ background: 'rgba(0,0,0,0.5)' }}
      onClick={handleClose}>
      <div
        className="bg-white rounded-t-3xl sm:rounded-2xl w-full sm:max-w-md max-h-[90vh] flex flex-col"
        onClick={e => e.stopPropagation()}>
        {/* En-tête */}
        <div className="flex items-center justify-between px-5 pt-4 pb-3 border-b shrink-0" style={{ borderColor: '#e2e8f0' }}>
          <p className="text-sm font-bold flex items-center gap-1.5" style={{ color: '#1e1b4b' }}>
            <Clock size={16} className="text-primary" /> Grille rapide de créneaux
          </p>
          <button onClick={handleClose} className="text-gray-400 hover:text-gray-600 shrink-0">
            <X size={18} />
          </button>
        </div>

        {/* Contenu scrollable */}
        <div className="px-5 py-4 space-y-4 overflow-y-auto pb-32">
          {/* Sélecteur de pas de temps */}
          <div>
            <p className="text-xs font-medium text-muted-foreground mb-2">Pas de temps</p>
            <div className="flex gap-2">
              {STEPS.map(s => (
                <button
                  key={s.value}
                  onClick={() => { setStep(s.value); setSelected([]); }}
                  className={`flex-1 py-2 rounded-xl text-xs font-semibold border-2 transition-colors ${step === s.value ? 'text-white' : 'text-muted-foreground hover:bg-muted'}`}
                  style={step === s.value
                    ? { background: '#1e1b4b', borderColor: '#1e1b4b' }
                    : { borderColor: '#e2e8f0', background: 'white' }}>
                  {s.label}
                </button>
              ))}
            </div>
          </div>

          {/* Grille de créneaux */}
          <div>
            <p className="text-xs font-medium text-muted-foreground mb-2">
              {slots.length} créneaux · 08:00 → 20:00 · {selected.length} sélectionné{selected.length > 1 ? 's' : ''}
            </p>
            <div className="grid grid-cols-3 sm:grid-cols-4 gap-2">
              {slots.map(h => {
                const isSelected = selected.includes(h);
                const isExisting = existingCreneaux.includes(h);
                return (
                  <button
                    key={h}
                    onClick={() => toggleSlot(h)}
                    className={`py-2 rounded-xl border-2 text-xs font-semibold transition-colors ${isExisting ? 'opacity-40 cursor-not-allowed' : ''}`}
                    style={isSelected
                      ? { background: '#1d4ed8', borderColor: '#1d4ed8', color: 'white' }
                      : { background: 'white', borderColor: '#fde68a', color: '#b45309' }}
                    disabled={isExisting}>
                    {h}
                  </button>
                );
              })}
            </div>
          </div>
        </div>

        {/* Boutons de validation */}
        <div className="px-5 py-3 border-t flex gap-2 shrink-0" style={{ borderColor: '#e2e8f0' }}>
          <button
            onClick={handleClose}
            className="flex-1 py-2.5 rounded-xl border-2 text-sm font-semibold transition-colors hover:bg-gray-50"
            style={{ borderColor: '#e2e8f0', color: '#6b7280' }}>
            Annuler
          </button>
          <button
            onClick={handleAdd}
            disabled={selected.length === 0}
            className="flex-1 py-2.5 rounded-xl text-white text-sm font-semibold transition-colors disabled:opacity-40 flex items-center justify-center gap-1.5"
            style={{ background: '#1d4ed8' }}>
            <Check size={14} /> {selected.length === 0 ? 'Aucun sélectionné' : `Ajouter ${selected.length} créneau${selected.length > 1 ? 'x' : ''}`}
          </button>
        </div>
      </div>
    </div>
  );
}