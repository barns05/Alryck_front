/**
 * Barre d'actions en bas d'écran pour la sélection multiple.
 * Apparaît dès qu'au moins 1 élément est sélectionné.
 * Usage:
 *   <BulkSelectionBar
 *     count={selectedIds.length}
 *     onDelete={() => setShowBulkDelete(true)}
 *     onClear={() => setSelectedIds([])}
 *   />
 */
import { Trash2, X, Loader2 } from 'lucide-react';

export default function BulkSelectionBar({ count, onDelete, onClear, progress }) {
  if (count === 0 && !progress) return null;
  const isDeleting = !!progress;
  return (
    <>
    {isDeleting && <div className="fixed inset-0 z-40 bg-black/30 backdrop-blur-sm" />}
    <div className="fixed left-4 right-4 z-50 flex items-center justify-between gap-3 bg-slate-900 text-white px-4 py-3 rounded-2xl shadow-xl border border-slate-700 animate-in slide-in-from-bottom-2" style={{ bottom: `calc(80px + env(safe-area-inset-bottom, 0px))` }}>
      {isDeleting ? (
        <>
          <div className="flex items-center gap-2">
            <Loader2 size={15} className="animate-spin text-slate-400" />
            <span className="text-sm font-medium">Suppression en cours… {progress.current}/{progress.total}</span>
          </div>
          <div className="flex-1 h-1.5 bg-slate-700 rounded-full overflow-hidden mx-4">
            <div
              className="h-full bg-red-500 rounded-full transition-all duration-300"
              style={{ width: `${(progress.current / progress.total) * 100}%` }}
            />
          </div>
        </>
      ) : (
        <>
          <div className="flex items-center gap-2">
            <button onClick={onClear} className="p-0.5 text-slate-400 hover:text-white transition-colors" title="Désélectionner tout">
              <X size={15} />
            </button>
            <span className="text-sm font-medium">{count} élément{count > 1 ? 's' : ''} sélectionné{count > 1 ? 's' : ''}</span>
          </div>
          <button onClick={onDelete} className="flex items-center gap-1.5 text-sm font-medium bg-red-600 hover:bg-red-700 text-white px-3 py-1.5 rounded-lg transition-colors">
            <Trash2 size={14} />
            Supprimer
          </button>
        </>
      )}
    </div>
    </>
  );
}