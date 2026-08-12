/**
 * PDFExportModal — Sélection du contenu avant génération PDF
 * Props: evenementId, moments[], onSelect(choice), onClose
 * choice = { type: 'tous' } | { type: 'moment', momentId, momentNom }
 */
import { X, FileText } from 'lucide-react';

export default function PDFExportModal({ moments = [], onSelect, onClose }) {
  const sortedMoments = moments.slice().sort((a, b) => (a.ordre ?? 0) - (b.ordre ?? 0));

  return (
    <div className="fixed inset-0 z-[99999] flex items-end justify-center" onClick={onClose}>
      <div className="absolute inset-0 bg-black/50" />
      <div
        className="relative w-full max-w-lg bg-white rounded-t-3xl shadow-2xl flex flex-col overflow-hidden"
        style={{ maxHeight: '80vh' }}
        onClick={e => e.stopPropagation()}
      >
        {/* Header */}
        <div className="flex items-center justify-between px-5 pt-5 pb-3 border-b shrink-0"
          style={{ borderColor: '#f1f5f9' }}>
          <div className="flex items-center gap-2">
            <FileText size={18} className="text-violet-600" />
            <h3 className="font-bold text-base" style={{ color: '#1e1b4b' }}>
              Choisir le contenu du PDF
            </h3>
          </div>
          <button onClick={onClose} className="text-gray-400 hover:text-gray-600">
            <X size={20} />
          </button>
        </div>

        <div className="overflow-y-auto flex-1 px-5 py-4 space-y-2">

          {/* Option : Tous les invités */}
          <button
            onClick={() => onSelect({ type: 'tous' })}
            className="w-full flex items-center gap-4 p-4 rounded-2xl border-2 text-left transition-all active:scale-[0.99] hover:border-violet-300 hover:bg-violet-50"
            style={{ borderColor: '#e2e8f0' }}
          >
            <div className="w-10 h-10 rounded-2xl flex items-center justify-center shrink-0 text-xl"
              style={{ background: 'linear-gradient(135deg, #1e1b4b 0%, #4338ca 100%)' }}>
              👥
            </div>
            <div className="flex-1">
              <p className="text-sm font-bold" style={{ color: '#1e1b4b' }}>Tous les invités</p>
              <p className="text-xs text-gray-400 mt-0.5">
                Liste consolidée avec colonne « Présent à »
              </p>
            </div>
            <span className="text-xs font-semibold px-2 py-1 rounded-full"
              style={{ background: '#eef2ff', color: '#4338ca' }}>
              Complet
            </span>
          </button>

          {/* Séparateur si moments disponibles */}
          {sortedMoments.length > 0 && (
            <>
              <div className="flex items-center gap-3 py-1">
                <div className="flex-1 h-px" style={{ background: '#f1f5f9' }} />
                <p className="text-[10px] font-semibold text-gray-400 uppercase tracking-wide">
                  Par moment
                </p>
                <div className="flex-1 h-px" style={{ background: '#f1f5f9' }} />
              </div>

              {sortedMoments.map(m => (
                <button
                  key={m.id}
                  onClick={() => onSelect({ type: 'moment', momentId: m.id, momentNom: m.nom })}
                  className="w-full flex items-center gap-4 p-4 rounded-2xl border-2 text-left transition-all active:scale-[0.99] hover:border-indigo-300 hover:bg-indigo-50"
                  style={{ borderColor: '#e2e8f0' }}
                >
                  <div className="w-10 h-10 rounded-2xl flex items-center justify-center shrink-0 text-xl"
                    style={{ background: '#eef2ff' }}>
                    🎯
                  </div>
                  <div className="flex-1">
                    <p className="text-sm font-bold" style={{ color: '#1e1b4b' }}>{m.nom}</p>
                    <p className="text-xs text-gray-400 mt-0.5">
                      Uniquement les invités de ce moment
                    </p>
                  </div>
                </button>
              ))}
            </>
          )}
        </div>

        <div className="px-5 pb-8 pt-3 border-t shrink-0" style={{ borderColor: '#f1f5f9' }}>
          <button onClick={onClose}
            className="w-full py-3 rounded-2xl border-2 text-sm font-semibold text-gray-500"
            style={{ borderColor: '#e2e8f0' }}>
            Annuler
          </button>
        </div>
      </div>
    </div>
  );
}