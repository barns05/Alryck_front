/**
 * TypePickerModal — Sélecteur multi-choix plein écran pour le filtre « Type ».
 *
 * Même esprit que MetierPickerModal mais avec cases à cocher (sélection multiple).
 * Verrouille le scroll de fond pendant l'ouverture et restaure les valeurs
 * précédentes à la fermeture (cleanup du useEffect) pour éviter toute fuite de
 * style overflow sur <html>/<body>.
 *
 * Props :
 *  - open: boolean
 *  - title: string            (titre affiché dans l'en-tête, ex: « Type de bâtisse »)
 *  - items: string[]          (liste des types cochables)
 *  - selected: string[]      (types déjà cochés)
 *  - onToggle: (item) => void (bascule un type)
 *  - onClear: () => void      (tout désélectionner)
 *  - onClose: () => void      (fermer la modale)
 */
import { useEffect } from 'react';
import { createPortal } from 'react-dom';
import { X, Check } from 'lucide-react';

export default function TypePickerModal({ open, title, items, selected, onToggle, onClear, onClose }) {
  useEffect(() => {
    if (!open) return;
    const prevHtml = document.documentElement.style.overflow;
    const prevBody = document.body.style.overflow;
    document.documentElement.style.overflow = 'hidden';
    document.body.style.overflow = 'hidden';
    return () => {
      document.documentElement.style.overflow = prevHtml;
      document.body.style.overflow = prevBody;
    };
  }, [open]);

  if (!open) return null;

  const selectedCount = (selected || []).length;

  return createPortal(
    <div className="fixed inset-0 z-[70] flex flex-col" style={{ background: '#fff' }}>
      {/* En-tête */}
      <div
        className="flex items-center justify-between px-4 py-3 border-b shrink-0"
        style={{ borderColor: '#e8e4dc' }}
      >
        <p className="font-bold text-base" style={{ color: '#1e1b4b' }}>
          {title || 'Type'}
        </p>
        <button
          type="button"
          onClick={onClose}
          className="w-9 h-9 rounded-full flex items-center justify-center active:opacity-70"
          style={{ background: '#f3f4f6', color: '#1e1b4b' }}
        >
          <X size={18} />
        </button>
      </div>

      {/* Lien « Tout effacer » — visible dès qu'au moins un type est coché */}
      {selectedCount > 0 && (
        <div className="px-4 pt-2 shrink-0">
          <button
            type="button"
            onClick={onClear}
            className="text-[11px] font-semibold inline-flex items-center gap-1"
            style={{ color: '#9ca3af' }}
          >
            <X size={11} /> Tout effacer
          </button>
        </div>
      )}

      {/* Liste défilante des types cochables */}
      <div className="flex-1 overflow-y-auto">
        {(items || []).map((it) => {
          const on = selected.includes(it);
          return (
            <button
              key={it}
              type="button"
              onClick={() => onToggle(it)}
              className="w-full flex items-center gap-3 px-4 py-3.5 text-left border-b active:bg-black/5 transition-colors"
              style={{
                borderColor: '#f5f3ed',
                background: on ? 'rgba(30,27,75,0.06)' : 'transparent',
              }}
            >
              <span
                className="w-5 h-5 rounded-md flex items-center justify-center shrink-0 border"
                style={
                  on
                    ? { background: '#1e1b4b', borderColor: '#1e1b4b' }
                    : { borderColor: '#d6d3d1', background: '#fff' }
                }
              >
                {on && <Check size={14} style={{ color: '#fff' }} />}
              </span>
              <span className="flex-1 text-sm font-medium truncate" style={{ color: '#1e1b4b' }}>
                {it}
              </span>
            </button>
          );
        })}
      </div>

      {/* Pied — bouton de validation */}
      <div
        className="shrink-0 px-4 py-3 border-t"
        style={{
          borderColor: '#e8e4dc',
          paddingBottom: 'max(0.75rem, env(safe-area-inset-bottom))',
        }}
      >
        <button
          type="button"
          onClick={onClose}
          className="w-full py-3.5 text-sm font-bold rounded-xl text-white transition-all active:scale-[0.97]"
          style={{ background: '#1e1b4b' }}
        >
          {selectedCount > 0 ? `Voir les résultats (${selectedCount})` : 'Fermer'}
        </button>
      </div>
    </div>,
    document.body
  );
}