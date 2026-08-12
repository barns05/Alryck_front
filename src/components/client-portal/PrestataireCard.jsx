/**
 * PrestataireCard — Carte prestataire unifiée.
 *
 * Source canonique des données : CompanySettings (le « passeport prestataire »),
 * récupéré via cs.prestataire_id. Repli sur l'entité Prestataire (d) si la
 * CompanySettings n'existe pas encore. Garantit une présentation identique
 * (couverture, logo, nom, métier, ville, tarif) sur tous les écrans.
 *
 * context:
 *  - "annuaire"  : contour doré + badge overlay « ⭐ Recommandé par X » si applicable,
 *                  prix, distance, cœur favori en haut à droite, carte tappable.
 *  - "recommande": même contour/badge que l'annuaire, boutons « Voir le profil » /
 *                  « Refuser », pas de cœur (pas de sélection manuelle ici).
 *  - "selection" : structure riche (photo), cœur plein rouge (retirer le favori),
 *                  bouton « Voir le profil » (carte également tappable).
 */
import { motion } from 'framer-motion';
import { Heart, MapPin } from 'lucide-react';
import { getMetierConfig } from '@/config/metierConfig';

const DOMAINE_ICONS = {
  'Traiteur': '🍽️',
  'DJ / Musique': '🎵',
  'Photographe': '📷',
  'Vidéaste': '🎬',
  'Fleuriste': '💐',
  'Décoration': '✨',
  'Animation': '🎭',
  'Transport': '🚗',
  'Sécurité': '🛡️',
  'Sono / Lumières': '💡',
  'Lieu de réception': '🏛️',
  'Organisation': '📋',
  'Beauté & Bien-être': '💆',
  'Logistique': '📦',
  'Autre': '🤝',
};

function getInitiales(nom = '') {
  return nom.trim().split(/\s+/).map((w) => w[0]).join('').toUpperCase().slice(0, 2);
}

export default function PrestataireCard({
  context,
  cs = null,
  d = null,
  ep = null,
  recommandePar = null,
  dist = null,
  favori = false,
  onToggleFavori,
  onOpen,
  onRefuse,
  description = null,
}) {
  const cfg = cs?.metier ? getMetierConfig(cs.metier) : null;
  const icon = cfg?.icone_defaut || DOMAINE_ICONS[ep?.prestataire_domaine] || '🤝';
  const cover = cs?.company_cover_url || d?.cover_url || null;
  const logo = cs?.company_logo_url || d?.logo_url || null;
  const nom = cs?.company_name || ep?.prestataire_nom || d?.nom || 'Prestataire';
  const metier = cs?.metier || ep?.prestataire_domaine || '';
  const ville = cs?.adresse_ville || d?.ville || '';
  const tarif = cs?.tarif_a_partir_de ?? null;
  const badge = recommandePar || ep?.recommande_par || null;
  const isRecommande = !!badge;

  const hasHeart = context === 'annuaire' || context === 'selection';
  const hasButtons = context === 'recommande' || context === 'selection';
  const tappable = context === 'annuaire' || context === 'selection';

  const cardStyle = {
    background: isRecommande ? '#FFFBF0' : '#fff',
    borderColor: isRecommande ? '#C5A059' : '#e8e4dc',
    borderWidth: isRecommande ? 2 : 1,
    boxShadow: isRecommande ? '0 6px 18px rgba(197,160,89,0.28)' : '0 1px 3px rgba(0,0,0,0.04)',
  };

  const inner = (
    <>
      {/* Badge « Recommandé par » — chevauche le bord supérieur de la carte */}
      {isRecommande && (
        <div className="absolute z-20" style={{ top: -10, left: 12 }}>
          <span
            className="inline-flex items-center gap-1 text-[10px] font-bold px-2.5 py-1 rounded-full"
            style={{ background: '#C5A059', color: '#fff', boxShadow: '0 4px 12px rgba(197,160,89,0.5)' }}
          >
            ⭐ Recommandé par {badge}
          </span>
        </div>
      )}

      {/* Couverture */}
      <div className="relative rounded-t-2xl overflow-hidden" style={{ height: 90 }}>
        {cover ? (
          <img src={cover} alt="" className="w-full h-full object-cover" style={{ display: 'block' }} />
        ) : (
          <div className="w-full h-full" style={{ background: 'linear-gradient(135deg, #1e1b4b 0%, #3730a3 60%, #b45309 100%)' }} />
        )}
        <div className="absolute inset-0" style={{ background: 'linear-gradient(to top, rgba(0,0,0,0.60) 0%, rgba(0,0,0,0.05) 60%, transparent 100%)' }} />

        {/* Cœur favori (annuaire + sélection) */}
        {hasHeart && (
          <button
            type="button"
            onClick={(e) => { e.stopPropagation(); onToggleFavori && onToggleFavori(); }}
            className="absolute top-2 right-2 z-10 w-9 h-9 rounded-full flex items-center justify-center transition-all active:scale-90"
            style={{
              background: favori ? 'rgba(255,255,255,0.95)' : 'rgba(255,255,255,0.80)',
              boxShadow: favori ? '0 2px 10px rgba(220,38,38,0.35)' : '0 1px 4px rgba(0,0,0,0.15)',
              backdropFilter: 'blur(4px)',
            }}
            aria-label={favori ? 'Retirer des favoris' : 'Ajouter aux favoris'}
          >
            <Heart size={18} className={favori ? 'fill-red-500 text-red-500' : 'text-slate-600'} />
          </button>
        )}

        {/* Logo overlay */}
        <div className="absolute bottom-2 left-3">
          {logo ? (
            <img src={logo} alt={nom} className="rounded-lg object-contain"
              style={{ width: 40, height: 40, border: '2px solid white', background: 'white' }} />
          ) : (
            <div className="rounded-lg flex items-center justify-center text-white text-sm font-bold"
              style={{ width: 40, height: 40, border: '2px solid white', background: 'rgba(30,27,75,0.85)' }}>
              {getInitiales(nom) || icon}
            </div>
          )}
        </div>

        {/* Nom + métier overlay */}
        <div className="absolute bottom-2 left-14 right-3">
          <p className="font-bold text-sm text-white leading-tight" style={{ textShadow: '0 1px 4px rgba(0,0,0,0.5)' }}>
            {nom}
          </p>
          <p className="text-white/70 text-xs">{icon} {metier}{ville ? ` · ${ville}` : ''}</p>
        </div>
      </div>

      {/* Corps */}
      <div className="px-4 py-3 space-y-2">
        {/* Tarif + distance */}
        {(tarif != null || (dist != null && dist !== Infinity)) && (
          <div className="flex items-center gap-3 flex-wrap">
            {tarif != null && (
              <span className="text-[11px] font-semibold" style={{ color: '#1e1b4b' }}>💰 À partir de {tarif}€</span>
            )}
            {dist != null && dist !== Infinity && (
              <span className="text-[11px] inline-flex items-center gap-0.5" style={{ color: '#9ca3af' }}>
                <MapPin size={10} /> {Math.round(dist)} km
              </span>
            )}
          </div>
        )}

        {/* Description (recommandé) */}
        {description && (
          <p className="text-xs leading-relaxed line-clamp-2" style={{ color: '#6b7280' }}>{description}</p>
        )}

        {/* Boutons (recommandé + sélection) */}
        {hasButtons && (
          <div className="flex gap-2 pt-1">
            <button
              onClick={(e) => { e.stopPropagation(); onOpen && onOpen(); }}
              className="flex-1 py-2 rounded-xl text-xs font-semibold transition-all active:scale-[0.97]"
              style={{ background: 'rgba(30,27,75,0.06)', color: '#1e1b4b' }}
            >
              Voir le profil
            </button>
            {context === 'recommande' && (
              <button
                onClick={(e) => { e.stopPropagation(); onRefuse && onRefuse(); }}
                className="py-2 px-3 rounded-xl text-xs font-semibold transition-all active:scale-[0.97]"
                style={{ background: 'rgba(239,68,68,0.08)', color: '#dc2626' }}
              >
                Refuser
              </button>
            )}
          </div>
        )}
      </div>
    </>
  );

  const motionProps = {
    initial: { opacity: 0, y: 8 },
    animate: { opacity: 1, y: 0 },
    exit: { opacity: 0, y: -8 },
    transition: { duration: 0.18 },
  };

  if (tappable) {
    return (
      <motion.div
        {...motionProps}
        whileTap={{ scale: 0.99 }}
        onClick={() => onOpen && onOpen()}
        className="relative w-full rounded-2xl border text-left cursor-pointer"
        style={cardStyle}
      >
        {inner}
      </motion.div>
    );
  }

  return (
    <motion.div
      {...motionProps}
      className="relative w-full rounded-2xl border text-left"
      style={cardStyle}
    >
      {inner}
    </motion.div>
  );
}