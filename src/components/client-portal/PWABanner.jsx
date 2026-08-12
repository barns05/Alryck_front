import { useState } from 'react';
import { X, Smartphone, ChevronRight } from 'lucide-react';

export default function PWABanner() {
  const [visible, setVisible] = useState(true);
  const [showSteps, setShowSteps] = useState(false);

  if (!visible) return null;

  const isIOS = /iphone|ipad|ipod/i.test(navigator.userAgent);

  const steps = isIOS
    ? [
        { icon: '📤', text: 'Appuyez sur le bouton Partager (carré avec flèche) en bas de votre navigateur Safari' },
        { icon: '➕', text: 'Faites défiler et choisissez "Sur l\'écran d\'accueil", puis confirmez' },
      ]
    : [
        { icon: '⋮', text: 'Appuyez sur le menu (3 points) en haut à droite de Chrome' },
        { icon: '📲', text: 'Choisissez "Ajouter à l\'écran d\'accueil" puis confirmez' },
      ];

  return (
    <div className="bg-sidebar text-white">
      <div className="max-w-2xl mx-auto px-4 py-3">
        {!showSteps ? (
          <div className="flex items-center gap-3">
            <Smartphone size={18} className="shrink-0 text-white/70" />
            <p className="text-sm flex-1">
              Installez l'app sur votre téléphone pour un accès rapide
            </p>
            <button
              onClick={() => setShowSteps(true)}
              className="flex items-center gap-1 text-xs font-semibold bg-white/15 hover:bg-white/25 transition-colors px-3 py-1.5 rounded-lg shrink-0"
            >
              Comment faire <ChevronRight size={12} />
            </button>
            <button onClick={() => setVisible(false)} className="text-white/50 hover:text-white transition-colors shrink-0">
              <X size={16} />
            </button>
          </div>
        ) : (
          <div className="space-y-3">
            <div className="flex items-center justify-between">
              <p className="text-sm font-semibold">Ajouter à l'écran d'accueil</p>
              <button onClick={() => setVisible(false)} className="text-white/50 hover:text-white transition-colors">
                <X size={16} />
              </button>
            </div>
            <div className="space-y-2">
              {steps.map((step, i) => (
                <div key={i} className="flex items-start gap-3 bg-white/10 rounded-xl px-3 py-2.5">
                  <span className="text-lg shrink-0">{step.icon}</span>
                  <p className="text-xs text-white/90 leading-relaxed">
                    <span className="font-bold text-white">Étape {i + 1} :</span> {step.text}
                  </p>
                </div>
              ))}
            </div>
            <button onClick={() => setShowSteps(false)}
              className="text-xs text-white/60 hover:text-white underline underline-offset-2 transition-colors">
              ← Retour
            </button>
          </div>
        )}
      </div>
    </div>
  );
}