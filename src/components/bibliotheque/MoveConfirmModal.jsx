/**
 * Modale de confirmation de déplacement unifiée (distinct de suppression).
 * Usage:
 *   <MoveConfirmModal
 *     open={showMove}
 *     title="Déplacer cet article ?"
 *     description="Il sera retiré de Catalogue et créé dans Options & Prestations."
 *     onConfirm={() => handleMove()}
 *     onCancel={() => setShowMove(false)}
 *     loading={isMoving}
 *   />
 */
export default function MoveConfirmModal({ open, title, description, onConfirm, onCancel, loading, confirmLabel }) {
  if (!open) return null;
  return (
    <div className="fixed inset-0 z-[100] flex items-center justify-center bg-black/50 backdrop-blur-sm p-4">
      <div className="bg-white rounded-2xl border border-slate-200 shadow-xl w-full max-w-sm p-6 space-y-4">
        <div className="space-y-1.5">
          <h3 className="text-base font-semibold text-slate-900">
            {title || 'Déplacer cet élément ?'}
          </h3>
          {description && (
            <p className="text-sm text-slate-500">{description}</p>
          )}
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
            className="px-4 py-2 rounded-lg bg-blue-600 text-white text-sm font-medium hover:bg-blue-700 transition-colors disabled:opacity-50"
          >
            {loading ? '...' : (confirmLabel || '↗ Déplacer')}
          </button>
        </div>
      </div>
    </div>
  );
}