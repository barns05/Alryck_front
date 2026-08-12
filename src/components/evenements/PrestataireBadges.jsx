import { useState, useRef } from 'react';
import { useQuery } from '@tanstack/react-query';
import { base44 } from '@/api/base44Client';

/**
 * Affiche deux badges (✅ confirmés / 📌 à contacter+contactés) pour un événement.
 * - Desktop : hover → popover avec liste groupée par statut
 * - Mobile  : clic → ouvre AssocierPrestataireModal (via onOpenModal)
 */
export default function PrestataireBadges({ evenementId, onOpenModal }) {
  const [hovered, setHovered] = useState(false);
  const timerRef = useRef(null);

  const { data: assocs = [] } = useQuery({
    queryKey: ['evenement-prestataires', evenementId],
    queryFn: () => base44.entities.EvenementPrestataire.filter({ evenement_id: evenementId }),
    staleTime: 60000,
  });

  const confirmes  = assocs.filter(a => a.statut === 'Confirmé');
  const enAttente  = assocs.filter(a => a.statut === 'Recommandé' || a.statut === 'Contacté');

  if (confirmes.length === 0 && enAttente.length === 0) return null;

  const isMobile = () => window.matchMedia('(pointer: coarse)').matches;

  const handleClick = (e) => {
    if (isMobile()) {
      e.stopPropagation();
      onOpenModal();
    }
  };

  const handleMouseEnter = () => {
    if (!isMobile()) {
      clearTimeout(timerRef.current);
      setHovered(true);
    }
  };

  const handleMouseLeave = () => {
    timerRef.current = setTimeout(() => setHovered(false), 150);
  };

  return (
    <span
      className="relative flex items-center gap-1"
      onMouseEnter={handleMouseEnter}
      onMouseLeave={handleMouseLeave}
      onClick={handleClick}
    >
      {confirmes.length > 0 && (
        <span className="text-[10px] font-semibold px-1.5 py-0.5 rounded-full bg-emerald-100 text-emerald-700 cursor-pointer">
          ✅ {confirmes.length}
        </span>
      )}
      {enAttente.length > 0 && (
        <span className="text-[10px] font-semibold px-1.5 py-0.5 rounded-full bg-yellow-100 text-yellow-700 cursor-pointer">
          📌 {enAttente.length}
        </span>
      )}

      {/* Popover desktop */}
      {hovered && assocs.length > 0 && (
        <div
          className="absolute bottom-full left-0 mb-2 z-50 bg-card border border-border rounded-xl shadow-xl p-3 min-w-[180px] max-w-[260px] space-y-2"
          onMouseEnter={handleMouseEnter}
          onMouseLeave={handleMouseLeave}
        >
          {confirmes.length > 0 && (
            <div>
              <p className="text-[10px] font-semibold text-emerald-700 uppercase tracking-wide mb-1">✅ Confirmés</p>
              {confirmes.map(a => (
                <p key={a.id} className="text-xs text-foreground truncate">{a.prestataire_nom}{a.prestataire_domaine ? ` · ${a.prestataire_domaine}` : ''}</p>
              ))}
            </div>
          )}
          {enAttente.length > 0 && (
            <div>
              <p className="text-[10px] font-semibold text-yellow-700 uppercase tracking-wide mb-1">📌 En attente</p>
              {enAttente.map(a => (
                <p key={a.id} className="text-xs text-foreground truncate">{a.prestataire_nom}{a.prestataire_domaine ? ` · ${a.prestataire_domaine}` : ''}</p>
              ))}
            </div>
          )}
        </div>
      )}
    </span>
  );
}