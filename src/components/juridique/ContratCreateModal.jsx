/**
 * ContratCreateModal — point d'entrée unifié pour la création d'un contrat client.
 *
 * Gabarit visuel : modal avec en-tête (titre + croix) et 3 grandes cartes cliquables.
 *   - « J'ai un contrat signé » → onPickUpload (cas A — upload → contrat_signe_url)
 *   - « J'ai un document à faire signer » → onPickSigner (cas B — upload → modele_url, e-signature)
 *   - « Depuis un modèle » → onPickModele (cas C — ModelePickerModal)
 */
import { X, Upload, FileText, PenTool } from 'lucide-react';

export default function ContratCreateModal({ onClose, onPickUpload, onPickSigner, onPickModele }) {
  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/40 backdrop-blur-sm p-4">
      <div className="bg-card rounded-2xl border border-border shadow-xl w-full max-w-2xl max-h-[90vh] flex flex-col">
        {/* Header */}
        <div className="px-6 py-4 border-b border-border flex items-center justify-between shrink-0">
          <h3 className="font-semibold text-base">Nouveau contrat</h3>
          <button onClick={onClose} className="p-1.5 rounded-lg hover:bg-muted text-muted-foreground">
            <X size={18} />
          </button>
        </div>

        {/* Contenu */}
        <div className="flex-1 overflow-y-auto px-6 py-5">
          <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
            {/* Option 1 — J'ai un contrat signé (cas A) */}
            <button
              onClick={onPickUpload}
              className="flex flex-col items-center gap-3 p-5 rounded-2xl border-2 border-blue-200 bg-blue-50/50 hover:border-blue-400 hover:bg-blue-50 transition-all text-center group"
            >
              <div className="w-12 h-12 rounded-xl bg-blue-100 flex items-center justify-center group-hover:scale-105 transition-transform">
                <Upload size={22} className="text-blue-600" />
              </div>
              <div>
                <p className="text-sm font-semibold text-foreground">J'ai un contrat signé</p>
                <p className="text-xs text-muted-foreground mt-1">
                  Uploadez le contrat déjà signé par votre client.
                </p>
              </div>
            </button>

            {/* Option 2 — J'ai un document à faire signer (cas B) */}
            <button
              onClick={onPickSigner}
              className="flex flex-col items-center gap-3 p-5 rounded-2xl border-2 border-violet-200 bg-violet-50/50 hover:border-violet-400 hover:bg-violet-50 transition-all text-center group"
            >
              <div className="w-12 h-12 rounded-xl bg-violet-100 flex items-center justify-center group-hover:scale-105 transition-transform">
                <PenTool size={22} className="text-violet-600" />
              </div>
              <div>
                <p className="text-sm font-semibold text-foreground">J'ai un document à faire signer</p>
                <p className="text-xs text-muted-foreground mt-1">
                  Uploadez un document non signé pour le faire signer électroniquement via l'app.
                </p>
              </div>
            </button>

            {/* Option 3 — Depuis un modèle (cas C) */}
            <button
              onClick={onPickModele}
              className="flex flex-col items-center gap-3 p-5 rounded-2xl border-2 border-amber-200 bg-amber-50/50 hover:border-amber-400 hover:bg-amber-50 transition-all text-center group"
            >
              <div className="w-12 h-12 rounded-xl bg-amber-100 flex items-center justify-center group-hover:scale-105 transition-transform">
                <FileText size={22} className="text-amber-600" />
              </div>
              <div>
                <p className="text-sm font-semibold text-foreground">Depuis un modèle</p>
                <p className="text-xs text-muted-foreground mt-1">
                  Choisissez un de vos modèles réutilisables et complétez-le pour ce client.
                </p>
              </div>
            </button>
          </div>
        </div>
      </div>
    </div>
  );
}