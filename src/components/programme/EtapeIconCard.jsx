/**
 * EtapeIconCard — Carte d'étape premium avec icône intégrée.
 *
 * Remplace l'ancienne timeline (bulles + horloges) par une carte élégante
 * où l'icône est directement intégrée à gauche du titre.
 *
 * L'icône est automatiquement choisie via getEtapeIcon() selon le nom
 * de l'étape. Toutes les icônes sont monochromes (couleur du thème).
 *
 * Props: etape, theme
 */
import { MapPin, Navigation } from 'lucide-react';
import { getEtapeIcon } from './etapeIcons';

export default function EtapeIconCard({ etape, theme, lieuEvenement }) {
  const Icon = getEtapeIcon(etape.nom);
  const isPremium = theme?.premium;
  const isHorizon = theme?.wrapper === 'horizon';

  // Lieu affiché : priorité au lieu propre de l'étape, puis fallback sur le lieu typé (LieuEvenement)
  const displayLieu = etape.lieu || (lieuEvenement ? [lieuEvenement.lieu_nom, lieuEvenement.lieu_ville].filter(Boolean).join(' · ') : null);
  const displayMaps = etape.gps_lien || lieuEvenement?.lieu_lien_google_maps || null;

  return (
    <div className="flex items-start gap-3"
      style={{
        background: theme.cardBg,
        border: `1px solid ${theme.cardBorder}`,
        borderRadius: theme.cardRadius || '1rem',
        boxShadow: theme.cardShadow || 'none',
        padding: theme.cardPadding || '14px',
      }}>
      {/* Icône intégrée */}
      <div style={{
        width: 36, height: 36, borderRadius: '50%',
        background: theme.accentBg,
        border: `1px solid ${theme.cardBorder}`,
        display: 'flex', alignItems: 'center', justifyContent: 'center',
        flexShrink: 0,
        marginTop: 2,
      }}>
        <Icon size={16} style={{ color: theme.iconColor || (isHorizon ? (theme.accentDeep || '#5A7A5E') : theme.accent) }} strokeWidth={1.25} />
      </div>
      {/* Contenu */}
      <div className="flex-1 min-w-0">
        <p className="font-semibold" style={{
          color: theme.text,
          fontFamily: isPremium ? (theme.subHeadingFont || "'Cormorant Garamond', serif") : 'sans-serif',
          fontSize: isPremium ? 16 : 14,
          lineHeight: 1.3,
        }}>
          {etape.nom}
        </p>
        {(etape.heure || displayLieu) && (
          <p className="text-xs flex items-center gap-1.5 mt-1" style={{
            color: theme.textMuted,
            fontFamily: isPremium ? (theme.bodyFont || "'Lora', serif") : 'sans-serif',
          }}>
            {etape.heure && <span>{etape.heure}</span>}
            {etape.heure && displayLieu && <span style={{ opacity: 0.4 }}>•</span>}
            {displayLieu && <span className="flex items-center gap-0.5"><MapPin size={10} /> {displayLieu}</span>}
          </p>
        )}
        {displayMaps && (
          <a href={displayMaps} target="_blank" rel="noopener noreferrer"
            className="inline-flex items-center gap-1 text-[11px] font-medium mt-1.5"
            style={{ color: theme.accent }}>
            <Navigation size={10} /> Itinéraire
          </a>
        )}
        {etape.description && (
          <p className="text-xs leading-relaxed pt-1.5" style={{ color: theme.textMuted, opacity: 0.7 }}>
            {etape.description}
          </p>
        )}
      </div>
    </div>
  );
}