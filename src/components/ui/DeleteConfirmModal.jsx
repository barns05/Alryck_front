/**
 * Modale de confirmation de suppression unifiée pour toute l'application.
 * Usage:
 *   <DeleteConfirmModal
 *     open={showDelete}
 *     title="Supprimer ce formulaire ?"         // optionnel, défaut générique
 *     description="Cette action est irréversible." // optionnel
 *     onConfirm={() => handleDelete()}
 *     onCancel={() => setShowDelete(false)}
 *     loading={isDeleting}
 *   />
 */
export default function DeleteConfirmModal({ open, title, description, onConfirm, onCancel, loading, confirmLabel, confirmClassName }) {
  if (!open) return null;
  return (
    <div className="fixed inset-0 z-[100] flex items-center justify-center bg-black/50 backdrop-blur-sm p-4">
      <div className="bg-white rounded-2xl border border-slate-200 shadow-xl w-full max-w-sm p-6 space-y-4">
        <div className="space-y-1.5">
          <h3 className="text-base font-semibold text-slate-900">
            {title || 'Supprimer cet élément ?'}
          </h3>
          <p className="text-sm text-slate-500">
            {description || 'Cette action est irréversible.'}
          </p>
        </div>
        <div className="flex gap-3 justify-end pt-1">
          <button
            onClick={onCancel}
            disabled={loading}
            className="px-4 py-2 rounded-lg bg-slate-100 text-slate-700 text-sm font-medium hover:bg-slate-200 transition-colors disabled:opacity-50"
          >
            Annuler
          </button>
          <button
            onClick={onConfirm}
            disabled={loading}
            className={confirmClassName || "px-4 py-2 rounded-lg bg-red-600 text-white text-sm font-medium hover:bg-red-700 transition-colors disabled:opacity-50"}
          >
            {loading ? '...' : (confirmLabel || 'Supprimer')}
          </button>
        </div>
      </div>
    </div>
  );
}