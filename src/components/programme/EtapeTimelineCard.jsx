/**
 * EtapeTimelineCard — Timeline simple et épurée pour les thèmes gratuits (Navy, Cristal).
 *
 * ADN propre aux thèmes gratuits : pas d'icônes médailles, pas de cartes ornées.
 * Timeline verticale classique avec point + ligne, heure en évidence.
 *
 * Props: etape, theme, isLast
 */
import { MapPin, Navigation, Clock } from 'lucide-react';

export default function EtapeTimelineCard({ etape, theme, isLast, lieuEvenement }) {
  const displayLieu = etape.lieu || (lieuEvenement ? [lieuEvenement.lieu_nom, lieuEvenement.lieu_ville].filter(Boolean).join(' · ') : null);
  const displayMaps = etape.gps_lien || lieuEvenement?.lieu_lien_google_maps || null;
  return (
    <div className="flex gap-3">
      {/* Colonne timeline : point + ligne */}
      <div className="flex flex-col items-center" style={{ flexShrink: 0 }}>
        <div style={{
          width: 12, height: 12, borderRadius: '50%',
          background: theme.timelineDot || theme.accent,
          border: `2px solid ${theme.timelineDotBorder || 'transparent'}`,
          flexShrink: 0,
        }} />
        {!isLast && (
          <div style={{
            width: 2,
            flex: 1,
            background: theme.timelineLine || 'rgba(255,255,255,0.2)',
            minHeight: 28,
          }} />
        )}
      </div>

      {/* Contenu */}
      <div className="flex-1 min-w-0 pb-1">
        {etape.heure && (
          <p className="flex items-center gap-1 text-xs font-semibold mb-0.5" style={{ color: theme.accent }}>
            <Clock size={11} /> {etape.heure}
          </p>
        )}
        <p className="font-semibold" style={{
          color: theme.text,
          fontSize: 14,
          lineHeight: 1.3,
        }}>
          {etape.nom}
        </p>
        {displayLieu && (
          <p className="text-xs flex items-center gap-1 mt-0.5" style={{ color: theme.textMuted }}>
            <MapPin size={10} /> {displayLieu}
          </p>
        )}
        {displayMaps && (
          <a href={displayMaps} target="_blank" rel="noopener noreferrer"
            className="inline-flex items-center gap-1 text-[11px] font-medium mt-1"
            style={{ color: theme.accent }}>
            <Navigation size={10} /> Itinéraire
          </a>
        )}
        {etape.description && (
          <p className="text-xs leading-relaxed pt-1" style={{ color: theme.textMuted, opacity: 0.7 }}>
            {etape.description}
          </p>
        )}
      </div>
    </div>
  );
}