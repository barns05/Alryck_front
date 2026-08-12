/**
 * ConsolidatedMediasView
 * Galerie unifiée de tous les médias liés à l'événement.
 * Filtrable par prestataire via chips.
 */
import { useState } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { useQuery } from '@tanstack/react-query';
import { base44 } from '@/api/base44Client';
import { X } from 'lucide-react';
import PortalBackButton from './PortalBackButton';

export default function ConsolidatedMediasView({ evenement, clientNom }) {
  const [selectedPrestataire, setSelectedPrestataire] = useState('tous');
  const [lightbox, setLightbox] = useState(null);

  const { data: medias = [] } = useQuery({
    queryKey: ['photos-client', evenement?.id],
    queryFn: () => base44.entities.PhotoClient.filter({ evenement_id: evenement?.id }),
    enabled: !!evenement?.id,
  });

  // Prestataires uniques dans les médias
  const prestataires = ['tous', ...Array.from(new Set(
    medias.map(m => m.prestataire_nom || m.uploaded_by || 'Équipe').filter(Boolean)
  ))];

  const filtered = selectedPrestataire === 'tous'
    ? medias
    : medias.filter(m => (m.prestataire_nom || m.uploaded_by || 'Équipe') === selectedPrestataire);

  return (
    <div className="px-4 py-4">
      <PortalBackButton />
      <p className="text-[11px] font-semibold text-muted-foreground uppercase tracking-widest mb-3">
        📸 Mes médias
      </p>

      {/* Chips filtre */}
      {prestataires.length > 1 && (
        <div className="flex gap-2 overflow-x-auto pb-3 mb-3 no-scrollbar">
          {prestataires.map(p => (
            <button
              key={p}
              onClick={() => setSelectedPrestataire(p)}
              className="shrink-0 px-3 py-1.5 rounded-full text-xs font-semibold transition-all"
              style={
                selectedPrestataire === p
                  ? { background: '#1e1b4b', color: '#fff' }
                  : { background: '#f1f5f9', color: '#64748b' }
              }
            >
              {p === 'tous' ? 'Tous' : p}
            </button>
          ))}
        </div>
      )}

      {filtered.length === 0 ? (
        <div className="flex flex-col items-center justify-center py-16 text-center gap-3">
          <span className="text-5xl">📸</span>
          <p className="font-semibold text-sm" style={{ color: '#1e1b4b' }}>Aucun média partagé</p>
          <p className="text-xs text-gray-400">Les photos et vidéos partagées par votre équipe apparaîtront ici.</p>
        </div>
      ) : (
        <>
          <p className="text-xs text-gray-400 mb-3">{filtered.length} fichier{filtered.length > 1 ? 's' : ''}</p>
          <div className="grid grid-cols-3 gap-1.5">
            <AnimatePresence>
              {filtered.map((media, i) => (
                <motion.button
                  key={media.id}
                  initial={{ opacity: 0, scale: 0.9 }}
                  animate={{ opacity: 1, scale: 1 }}
                  exit={{ opacity: 0, scale: 0.9 }}
                  transition={{ delay: i * 0.03 }}
                  whileTap={{ scale: 0.95 }}
                  onClick={() => setLightbox(media)}
                  className="relative aspect-square rounded-xl overflow-hidden bg-gray-100"
                >
                  {media.url && /\.(jpg|jpeg|png|webp|gif)$/i.test(media.url) ? (
                    <img src={media.url} alt={media.nom || 'Média'} className="w-full h-full object-cover" />
                  ) : media.url && /\.(mp4|mov|webm)$/i.test(media.url) ? (
                    <div className="w-full h-full flex items-center justify-center bg-gray-800">
                      <span className="text-2xl">🎬</span>
                    </div>
                  ) : (
                    <div className="w-full h-full flex items-center justify-center bg-gray-100">
                      <span className="text-2xl">📎</span>
                    </div>
                  )}
                  {/* Badge prestataire si "tous" */}
                  {selectedPrestataire === 'tous' && media.prestataire_nom && (
                    <div className="absolute bottom-0 left-0 right-0 bg-black/40 px-1 py-0.5">
                      <p className="text-[9px] text-white truncate">{media.prestataire_nom}</p>
                    </div>
                  )}
                </motion.button>
              ))}
            </AnimatePresence>
          </div>
        </>
      )}

      {/* Lightbox */}
      <AnimatePresence>
        {lightbox && (
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            className="fixed inset-0 z-[9999] bg-black/90 flex items-center justify-center p-4"
            onClick={() => setLightbox(null)}
          >
            <button
              className="absolute top-4 right-4 w-9 h-9 rounded-full flex items-center justify-center text-white"
              style={{ background: 'rgba(255,255,255,0.15)' }}
              onClick={() => setLightbox(null)}
            >
              <X size={18} />
            </button>
            <motion.img
              initial={{ scale: 0.85 }}
              animate={{ scale: 1 }}
              src={lightbox.url}
              alt={lightbox.nom || 'Média'}
              className="max-w-full max-h-[85vh] rounded-2xl object-contain"
              onClick={e => e.stopPropagation()}
            />
            {lightbox.nom && (
              <p className="absolute bottom-6 left-0 right-0 text-center text-white/70 text-sm">{lightbox.nom}</p>
            )}
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  );
}