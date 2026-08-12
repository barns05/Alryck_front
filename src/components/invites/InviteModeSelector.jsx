/**
 * InviteModeSelector — 4 cartes de sélection du mode d'invitation
 * Props: selected (string | null), onSelect (fn)
 * Aucune sélection par défaut — état neutre au chargement
 *
 * Chaque carte affiche uniquement un titre (police agrandie) + une icône ⓘ
 * à droite qui ouvre une modale centrée d'explication au tap.
 */
import { useState } from 'react';
import { Check, Info, X } from 'lucide-react';
import { motion, AnimatePresence } from 'framer-motion';

const MODES = [
  {
    id: 'Confirmé',
    emoji: '✅',
    label: 'Ajout direct',
    info: 'Je les ajoute directement sans attendre leur réponse',
    border: '#16a34a',
    bg: '#f0fdf4',
    color: '#15803d',
  },
  {
    id: 'Nominatif',
    emoji: '📋',
    label: 'Invitation personnalisée',
    info: 'Je renseigne moi-même les informations de chaque invité',
    border: '#4338ca',
    bg: '#eef2ff',
    color: '#3730a3',
  },
  {
    id: 'Libre',
    emoji: '✉️',
    label: "L'invité renseigne lui-même ses accompagnants",
    info: "Idéal quand vous connaissez le nom de l'invité mais pas qui l'accompagnera. Il complète lui-même les noms de ses accompagnants en répondant à l'invitation.",
    border: '#1e1b4b',
    bg: '#f8f7ff',
    color: '#1e1b4b',
  },
  {
    id: 'Groupe',
    emoji: '🔗',
    label: 'Lien unique partagé',
    info: 'Partagez ce lien par WhatsApp, Messenger, SMS ou email, à plusieurs personnes ou dans un groupe. Vous pouvez aussi télécharger le QR code en parallèle pour l\'ajouter à un faire-part ou une invitation papier. Chaque invité répond en quelques secondes.',
    border: '#ea580c',
    bg: '#fff7ed',
    color: '#c2410c',
  },
];

export default function InviteModeSelector({ selected, onSelect }) {
  const [openInfo, setOpenInfo] = useState(null);

  return (
    <div className="space-y-2">
      <p className="text-xs font-semibold text-gray-400 uppercase tracking-wide mb-3">
        Type d'invitation
      </p>
      {MODES.map(m => {
        const isSelected = selected === m.id;
        return (
          <div
            key={m.id}
            role="button"
            tabIndex={0}
            onClick={() => onSelect(m.id)}
            onKeyDown={(e) => { if (e.key === 'Enter' || e.key === ' ') { e.preventDefault(); onSelect(m.id); } }}
            className="w-full flex items-start gap-3 p-4 rounded-2xl border-2 text-left transition-all active:scale-[0.99] cursor-pointer"
            style={{
              borderColor: isSelected ? m.border : '#e2e8f0',
              background: isSelected ? m.bg : 'white',
            }}
          >
            <span className="text-2xl shrink-0 mt-0.5 leading-none">{m.emoji}</span>

            <div className="flex-1 min-w-0">
              <p className="text-base font-bold leading-snug" style={{ color: isSelected ? m.color : '#1e1b4b' }}>
                {m.label}
              </p>
            </div>

            {/* Icône info — positionnée à droite, zone de tap 44x44px, stopPropagation */}
            <button
              type="button"
              onClick={(e) => { e.stopPropagation(); setOpenInfo(m.id); }}
              className="shrink-0 -mr-1 flex items-center justify-center text-gray-400 hover:text-gray-600 transition-colors"
              style={{ width: 44, height: 44, marginTop: -4 }}
              aria-label="Plus d'informations"
            >
              <Info size={18} />
            </button>

            {/* Coche de confirmation visible uniquement après sélection */}
            {isSelected && (
              <div
                className="shrink-0 w-5 h-5 rounded-full flex items-center justify-center mt-0.5"
                style={{ background: m.border }}
              >
                <Check size={11} color="white" strokeWidth={3} />
              </div>
            )}
          </div>
        );
      })}

      {/* ── Modale d'information centrée ──────────────────────────────────────── */}
      <AnimatePresence>
        {openInfo && (
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            transition={{ duration: 0.18 }}
            className="fixed inset-0 z-[10001] flex items-center justify-center p-6"
            style={{ backgroundColor: 'rgba(0,0,0,0.5)' }}
            onClick={() => setOpenInfo(null)}
          >
            <motion.div
              initial={{ scale: 0.95, opacity: 0 }}
              animate={{ scale: 1, opacity: 1 }}
              exit={{ scale: 0.95, opacity: 0 }}
              transition={{ duration: 0.18 }}
              className="relative w-full max-w-sm rounded-2xl bg-white shadow-xl"
              onClick={(e) => e.stopPropagation()}
            >
              {/* Bouton fermeture */}
              <button
                type="button"
                onClick={() => setOpenInfo(null)}
                className="absolute top-3 right-3 w-8 h-8 rounded-full flex items-center justify-center text-gray-400 hover:text-gray-600 hover:bg-gray-100 transition-colors"
                aria-label="Fermer"
              >
                <X size={18} />
              </button>

              <div className="p-5 pt-12">
                <div className="rounded-2xl p-4" style={{ background: 'linear-gradient(135deg, #1e1b4b 0%, #4338ca 100%)', color: 'white' }}>
                  <p className="font-bold text-base mb-1 flex items-center gap-2">
                    <span>{MODES.find(m => m.id === openInfo)?.emoji}</span>
                    <span>{MODES.find(m => m.id === openInfo)?.label}</span>
                  </p>
                  <p className="text-white/80 text-sm leading-relaxed">
                    {MODES.find(m => m.id === openInfo)?.info}
                  </p>
                </div>
              </div>
            </motion.div>
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  );
}