/**
 * ApparenceCard — Mon ambiance événement
 * Toggle Ambiance / Photo en haut
 * Ambiance : 7 cartes prédéfinies
 * Photo : upload / preview / supprimer
 * Aperçu temps réel du bandeau
 */
import { useState, useEffect } from 'react';
import { ImagePlus, Trash2 } from 'lucide-react';
import { motion, AnimatePresence } from 'framer-motion';
import { differenceInDays, isPast } from 'date-fns';
import { format } from 'date-fns';
import { fr } from 'date-fns/locale';

// Même fonction que ClientPortalHeader pour cohérence visuelle
function darkenHex(hex, amount = 0.3) {
  const r = parseInt(hex.slice(1, 3), 16);
  const g = parseInt(hex.slice(3, 5), 16);
  const b = parseInt(hex.slice(5, 7), 16);
  const dr = Math.max(0, Math.round(r * (1 - amount)));
  const dg = Math.max(0, Math.round(g * (1 - amount)));
  const db = Math.max(0, Math.round(b * (1 - amount)));
  return `#${dr.toString(16).padStart(2, '0')}${dg.toString(16).padStart(2, '0')}${db.toString(16).padStart(2, '0')}`;
}

const AMBIANCES = [
  { id: 'nature',     emoji: '🌿', label: 'Nature',      desc: 'Verdure & harmonie',    primary: '#5A734D', secondary: '#D7C88A' },
  { id: 'elegant',    emoji: '✨', label: 'Élégant',     desc: 'Sobre & raffiné',        primary: '#1E1B4B', secondary: '#D6C08D' },
  { id: 'boheme',     emoji: '🌸', label: 'Bohème',      desc: 'Chaleureux & naturel',   primary: '#B97A57', secondary: '#F0D8B6' },
  { id: 'prestige',   emoji: '🏆', label: 'Prestige',    desc: 'Luxueux & exclusif',     primary: '#2A2A2A', secondary: '#C8A449' },
  { id: 'festif',     emoji: '🎉', label: 'Festif',      desc: 'Joyeux & coloré',        primary: '#C54B8C', secondary: '#F4B4D5' },
  { id: 'mer',        emoji: '🌊', label: 'Bord de mer', desc: 'Frais & lumineux',       primary: '#3F7AA3', secondary: '#D7EEF7' },
  { id: 'colore',     emoji: '💜', label: 'Coloré',      desc: 'Vibrant & créatif',      primary: '#6B4CE6', secondary: '#FF9BCB' },
];

// ── Mini aperçu bandeau ────────────────────────────────────────────────────────
// Retourne le secondary de l'ambiance si la couleur correspond, sinon darkenHex
function getSecondary(primary) {
  const found = AMBIANCES.find(a => a.primary.toLowerCase() === primary.toLowerCase());
  return found ? found.secondary : darkenHex(primary);
}

function BandeauPreview({ evenement, previewPrimary, showPhotoActions, onChanger, onSupprimer, uploading }) {
  const hasPhoto = !!evenement?.photo_bandeau_url;

  const dateStr = evenement?.date
    ? format(new Date(evenement.date + 'T12:00:00'), 'd MMM yyyy', { locale: fr })
    : '';

  let daysLeft = null;
  let passed = false;
  if (evenement?.date) {
    const d = new Date(evenement.date + 'T12:00:00');
    if (isPast(d)) { passed = true; }
    else { daysLeft = differenceInDays(d, new Date()); }
  }

  return (
    <div className="space-y-1.5">
      <p className="text-[10px] font-semibold uppercase tracking-widest" style={{ color: '#9ca3af' }}>
        Aperçu en temps réel
      </p>
      <div
        className="relative rounded-xl overflow-hidden"
        style={{ height: 100 }}
      >
        {/* Fond */}
        <AnimatePresence mode="wait">
          {hasPhoto ? (
            <motion.div
              key="photo"
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              exit={{ opacity: 0 }}
              transition={{ duration: 0.3 }}
              className="absolute inset-0 bg-cover bg-center"
              style={{ backgroundImage: `url(${evenement.photo_bandeau_url})` }}
            />
          ) : (
            <motion.div
              key={`gradient-${previewPrimary}`}
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              exit={{ opacity: 0 }}
              transition={{ duration: 0.3 }}
              className="absolute inset-0"
              style={{ background: `linear-gradient(160deg, ${previewPrimary} 0%, ${getSecondary(previewPrimary)} 100%)` }}
            />
          )}
        </AnimatePresence>

        {/* Overlay uniquement sur photo */}
        {hasPhoto && (
          <div className="absolute inset-0" style={{ background: 'rgba(0,0,0,0.45)' }} />
        )}

        {/* Contenu */}
        <div className="absolute inset-0 px-3 py-2.5 flex items-center justify-between text-white">
          <div className="min-w-0">
            <p className="font-bold text-sm leading-tight truncate">
              {evenement?.nom || 'Nom de l\'événement'}
            </p>
            <p className="text-[10px] opacity-70 mt-0.5 truncate">
              {[dateStr, evenement?.lieu_nom].filter(Boolean).join(' · ') || 'Date · Lieu'}
            </p>
          </div>
          {!passed && daysLeft !== null && (
            <div className="text-right shrink-0 ml-2">
              <p className="text-2xl font-bold leading-none" style={{ color: '#fff' }}>
                {daysLeft}
              </p>
              <p className="text-[9px] opacity-60 leading-tight">jours</p>
            </div>
          )}
          {passed && (
            <span className="text-[10px] opacity-60 ml-2 shrink-0">🎊 Passé</span>
          )}
        </div>

        {/* Boutons d'action photo en overlay */}
        {showPhotoActions && hasPhoto && (
          <div className="absolute inset-0 flex items-end justify-end p-2 gap-2 pointer-events-none">
            <button
              onClick={onChanger}
              disabled={uploading}
              className="flex items-center gap-1.5 px-2.5 py-1.5 rounded-lg text-[11px] font-semibold backdrop-blur-sm disabled:opacity-50 pointer-events-auto"
              style={{ background: 'rgba(255,255,255,0.85)', color: '#1e1b4b' }}
            >
              <ImagePlus size={11} />
              {uploading ? 'Envoi…' : 'Changer'}
            </button>
            <button
              onClick={onSupprimer}
              className="flex items-center gap-1.5 px-2.5 py-1.5 rounded-lg text-[11px] font-semibold backdrop-blur-sm pointer-events-auto"
              style={{ background: 'rgba(239,68,68,0.85)', color: '#fff' }}
            >
              <Trash2 size={11} />
              Supprimer
            </button>
          </div>
        )}
      </div>
    </div>
  );
}

// ── Composant principal ────────────────────────────────────────────────────────
export default function ApparenceCard({
  evenement,
  couleurActive,
  onCouleur,
  onUploadBandeau,
  onSupprimerBandeau,
  onSauvegarderMode,
  uploadingBandeau,
  bandeauInputRef,
}) {
  const hasPhoto = !!evenement?.photo_bandeau_url;

  // Mode actif : 'ambiance' ou 'photo' — initialisé depuis mode_bandeau ou présence photo
  const [activeMode, setActiveMode] = useState(() => {
    if (evenement?.mode_bandeau) return evenement.mode_bandeau;
    return hasPhoto ? 'photo' : 'ambiance';
  });

  // Ambiance sélectionnée
  const initAmbiance = AMBIANCES.find(a => a.primary === couleurActive) || AMBIANCES[1];
  const [previewPrimary, setPreviewPrimary] = useState(initAmbiance.primary);

  // Resync si couleurActive change depuis l'extérieur
  useEffect(() => {
    if (couleurActive && couleurActive !== previewPrimary) {
      setPreviewPrimary(couleurActive);
    }
  }, [couleurActive]);

  const handleSelectAmbiance = (ambiance) => {
    setPreviewPrimary(ambiance.primary);
    onCouleur(ambiance.primary);
  };

  const handleModeChange = (mode) => {
    setActiveMode(mode);
    onSauvegarderMode?.(mode);
  };

  // Pour l'aperçu : photo uniquement si mode photo ET photo présente
  const previewEvenement = activeMode === 'photo' ? evenement : { ...evenement, photo_bandeau_url: null };

  return (
    <div className="bg-white border border-border rounded-2xl p-4 space-y-4">
      {/* ── Toggle Ambiance / Photo ───────────────────────────────────── */}
      <div className="flex rounded-xl overflow-hidden border" style={{ borderColor: '#e8e4dc' }}>
        {['ambiance', 'photo'].map(mode => (
          <button
            key={mode}
            onClick={() => handleModeChange(mode)}
            className="flex-1 py-2 text-xs font-semibold transition-colors"
            style={
              activeMode === mode
                ? { background: '#1e1b4b', color: '#fff' }
                : { background: '#f9f7f3', color: '#6b7280' }
            }
          >
            {mode === 'ambiance' ? '🎨 Couleur' : '📷 Photo'}
          </button>
        ))}
      </div>

      {/* ── Mode Ambiance ─────────────────────────────────────────────── */}
      {activeMode === 'ambiance' && (
        <div className="grid grid-cols-2 gap-2">
          {AMBIANCES.map(ambiance => {
            const isSelected = previewPrimary === ambiance.primary;
            return (
              <motion.button
                key={ambiance.id}
                onClick={() => handleSelectAmbiance(ambiance)}
                whileTap={{ scale: 0.97 }}
                animate={isSelected
                  ? { y: -2, boxShadow: `0 6px 20px ${ambiance.primary}55` }
                  : { y: 0,  boxShadow: '0 1px 4px rgba(0,0,0,0.08)' }
                }
                transition={{ type: 'spring', stiffness: 400, damping: 25 }}
                className="relative rounded-xl p-3 text-left overflow-hidden"
                style={{
                  background: `linear-gradient(135deg, ${ambiance.primary} 0%, ${ambiance.secondary} 100%)`,
                  border: isSelected ? `2px solid #F6E7C1` : '2px solid transparent',
                  outline: 'none',
                }}
              >
                {isSelected && (
                  <motion.div
                    layoutId="ambiance-ring"
                    className="absolute inset-0 rounded-xl pointer-events-none"
                    style={{ boxShadow: 'inset 0 0 0 2px #F6E7C1' }}
                  />
                )}
                <div className="relative z-10 flex items-start gap-2">
                  <span className="text-lg leading-none">{ambiance.emoji}</span>
                  <div className="min-w-0">
                    <p className="text-xs font-bold leading-tight text-white drop-shadow-sm">{ambiance.label}</p>
                    <p className="text-[10px] leading-tight mt-0.5 text-white/70">{ambiance.desc}</p>
                  </div>
                  {isSelected && (
                    <motion.span
                      initial={{ scale: 0 }}
                      animate={{ scale: 1 }}
                      className="ml-auto shrink-0 w-4 h-4 rounded-full flex items-center justify-center text-[9px] font-bold"
                      style={{ background: '#F6E7C1', color: '#1e1b4b' }}
                    >
                      ✓
                    </motion.span>
                  )}
                </div>
              </motion.button>
            );
          })}
        </div>
      )}

      {/* ── Mode Photo : bouton d'ajout uniquement (si pas de photo) ──── */}
      {activeMode === 'photo' && !hasPhoto && (
        <div className="space-y-2">
          <button
            onClick={() => bandeauInputRef.current?.click()}
            disabled={uploadingBandeau}
            className="w-full h-20 rounded-xl border-2 border-dashed flex flex-col items-center justify-center gap-1.5 text-xs font-medium disabled:opacity-50 active:scale-[0.98]"
            style={{ borderColor: '#e8e4dc', color: '#9ca3af' }}
          >
            <ImagePlus size={18} style={{ color: '#F6E7C1' }} />
            {uploadingBandeau ? 'Envoi en cours…' : 'Ajouter une photo de couverture'}
          </button>
          <input ref={bandeauInputRef} type="file" accept="image/*" className="hidden" onChange={onUploadBandeau} />
        </div>
      )}

      {/* ── Aperçu temps réel (boutons photo en overlay si applicable) ── */}
      <BandeauPreview
        evenement={previewEvenement}
        previewPrimary={previewPrimary}
        showPhotoActions={activeMode === 'photo'}
        onChanger={() => bandeauInputRef.current?.click()}
        onSupprimer={onSupprimerBandeau}
        uploading={uploadingBandeau}
      />
    </div>
  );
}