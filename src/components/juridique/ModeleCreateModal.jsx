/**
 * ModeleCreateModal — point d'entrée unifié pour la création de modèle de contrat.
 *
 * Écran 1 : 2 cartes cliquables
 *   - « Upload simple » (sobre, sans Amanda) → ModeleContratModal
 *   - « Avec Amanda » (avatar Amanda) → passe à l'écran 2
 *
 * Écran 2 : 2 sous-choix
 *   - « J'ai déjà un contrat » → ExtractionContratModal
 *   - « Je pars de zéro » → TrameContratModal
 *
 * Bouton retour pour revenir de l'écran 2 à l'écran 1 sans fermer le modal.
 */
import { useState } from 'react';
import { X, ArrowLeft, Upload, FileSearch, Sparkles, Wand2 } from 'lucide-react';
import { AMANDA_ASSETS } from '@/components/AmandaMessage';
import ModeleContratModal from './ModeleContratModal';
import ExtractionContratModal from './ExtractionContratModal';
import TrameContratModal from './TrameContratModal';

export default function ModeleCreateModal({ onClose }) {
  const [screen, setScreen] = useState(1);
  const [launch, setLaunch] = useState(null); // 'upload' | 'extraction' | 'trame'

  if (launch === 'upload') return <ModeleContratModal onClose={() => setLaunch(null)} />;
  if (launch === 'extraction') return <ExtractionContratModal onClose={() => setLaunch(null)} />;
  if (launch === 'trame') return <TrameContratModal onClose={() => setLaunch(null)} />;

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/40 backdrop-blur-sm p-4">
      <div className="bg-card rounded-2xl border border-border shadow-xl w-full max-w-lg max-h-[90vh] flex flex-col">
        {/* Header */}
        <div className="px-6 py-4 border-b border-border flex items-center justify-between shrink-0">
          <div className="flex items-center gap-2">
            {screen === 2 && (
              <button
                onClick={() => setScreen(1)}
                className="p-1.5 rounded-lg hover:bg-muted text-muted-foreground transition-colors"
                title="Retour"
              >
                <ArrowLeft size={16} />
              </button>
            )}
            <h3 className="font-semibold text-base">
              {screen === 1 ? 'Créer un modèle' : 'Avec Amanda'}
            </h3>
          </div>
          <button onClick={onClose} className="p-1.5 rounded-lg hover:bg-muted text-muted-foreground">
            <X size={18} />
          </button>
        </div>

        {/* Contenu */}
        <div className="flex-1 overflow-y-auto px-6 py-5">
          {screen === 1 ? (
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
              {/* Option 1 — Upload simple */}
              <button
                onClick={() => setLaunch('upload')}
                className="flex flex-col items-center gap-3 p-5 rounded-2xl border-2 border-blue-200 bg-blue-50/50 hover:border-blue-400 hover:bg-blue-50 transition-all text-center group"
              >
                <div className="w-12 h-12 rounded-xl bg-blue-100 flex items-center justify-center group-hover:scale-105 transition-transform">
                  <Upload size={22} className="text-blue-600" />
                </div>
                <div>
                  <p className="text-sm font-semibold text-foreground">Upload simple</p>
                  <p className="text-xs text-muted-foreground mt-1">
                    Uploadez un PDF existant comme modèle statique.
                  </p>
                </div>
              </button>

              {/* Option 2 — Avec Amanda */}
              <button
                onClick={() => setScreen(2)}
                className="flex flex-col items-center gap-3 p-5 rounded-2xl border-2 border-violet-200 bg-violet-50/50 hover:border-violet-400 hover:bg-violet-50 transition-all text-center group"
              >
                <img
                  src={AMANDA_ASSETS.character}
                  alt="Amanda"
                  className="w-16 h-18 object-contain group-hover:scale-105 transition-transform"
                  style={{ height: 64 }}
                />
                <div>
                  <p className="text-sm font-semibold text-foreground flex items-center justify-center gap-1">
                    Avec Amanda <Sparkles size={13} className="text-violet-500" />
                  </p>
                  <p className="text-xs text-muted-foreground mt-1">
                    Laissez Amanda vous guider dans la création.
                  </p>
                </div>
              </button>
            </div>
          ) : (
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
              {/* Sous-choix 1 — J'ai déjà un contrat */}
              <button
                onClick={() => setLaunch('extraction')}
                className="flex flex-col items-center gap-3 p-5 rounded-2xl border-2 border-violet-200 bg-white hover:border-violet-400 hover:bg-violet-50/30 transition-all text-center group"
              >
                <div className="w-12 h-12 rounded-xl bg-violet-100 flex items-center justify-center group-hover:scale-105 transition-transform">
                  <FileSearch size={22} className="text-violet-600" />
                </div>
                <div>
                  <p className="text-sm font-semibold text-foreground">J'ai déjà un contrat</p>
                  <p className="text-xs text-muted-foreground mt-1">
                    Amanda extrait le texte et détecte les variables intelligemment.
                  </p>
                </div>
              </button>

              {/* Sous-choix 2 — Je pars de zéro */}
              <button
                onClick={() => setLaunch('trame')}
                className="flex flex-col items-center gap-3 p-5 rounded-2xl border-2 border-amber-200 bg-white hover:border-amber-400 hover:bg-amber-50/30 transition-all text-center group"
              >
                <div className="w-12 h-12 rounded-xl bg-amber-100 flex items-center justify-center group-hover:scale-105 transition-transform">
                  <Wand2 size={22} className="text-amber-600" />
                </div>
                <div>
                  <p className="text-sm font-semibold text-foreground">Je pars de zéro</p>
                  <p className="text-xs text-muted-foreground mt-1">
                    Questionnaire guidé pour générer un modèle sur-mesure.
                  </p>
                </div>
              </button>
            </div>
          )}
        </div>
      </div>
    </div>
  );
}