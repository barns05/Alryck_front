/**
 * PrestatairesCardsSection — Accordéon Framer Motion
 * Prestataires confirmés avec modules dépliables.
 * Chaque relation reste privée — aucun prix/devis/contrat exposé.
 */
import { useState } from 'react';
import { createPortal } from 'react-dom';
import { motion, AnimatePresence } from 'framer-motion';
import { useQuery, useQueryClient } from '@tanstack/react-query';
import { base44 } from '@/api/base44Client';
import { CheckCircle2, ChevronDown, Clock, Tag, X, Sparkles } from 'lucide-react';
import PromotionBanner from './PromotionBanner';
import AcceptedPromoModal from './AcceptedPromoModal';
import { getPromoLabel, getPromoEmoji } from '@/components/promotions/PromoOffreBadge';

const DOMAINE_ICONS = {
  'Traiteur':      '🍽️',
  'DJ / Musique':  '🎵',
  'Photographe':   '📷',
  'Vidéaste':      '🎬',
  'Fleuriste':     '💐',
  'Décoration':    '✨',
  'Animation':     '🎭',
  'Transport':     '🚗',
  'Sécurité':      '🛡️',
  'Sono / Lumières': '💡',
  'Autre':         '🤝',
};

// Mapping icône basé sur CompanySettings.metier (enum plus large que Prestataire.domaine).
// Valeur par défaut pour toute valeur non explicitement couverte.
const DEFAULT_METIER_ICON = '🤝';
const METIER_ICONS = {
  'Salle de réception': '🏛️',
  'Lieu de prestige / Château': '🏰',
  'Domaine viticole / Château viticole': '🍇',
  'Domaine privé': '🏡',
  'Mas / Bastide': '🏠',
  'Villa privatisable': '🏖️',
  'Espace plein air / Jardin': '🌳',
  'Salle de spectacle': '🎭',
  'Salon événementiel': '🎪',
  'Restaurant privatisable': '🍽️',
  'Espace atypique': '🎨',
  'Péniche / Bateau': '⛵',
  'Rooftop': '🌆',
  'Musée / Galerie d\'art': '🖼️',
  'Traiteur événementiel': '🍽️',
  'Chef à domicile': '👨‍🍳',
  'Pâtissier / Wedding cake': '🎂',
  'Candy bar / Sweet table': '🍬',
  'Food truck événementiel': '🚚',
  'Photographe': '📷',
  'Vidéaste': '🎬',
  'Photobooth': '📸',
  'DJ': '🎧',
  'Musicien / Groupe': '🎸',
  'Animateur': '🎤',
  'Magicien / Artiste': '🎩',
  'Sonorisation / Éclairage': '💡',
  'Wedding Planner': '📋',
  'Chef de projet événementiel': '🗂️',
  'Maître de cérémonie': '⚖️',
  'Fleuriste': '💐',
  'Décorateur': '✨',
  'Scénographe': '🎭',
  'Coiffeur / Maquilleur': '💇',
  'Spa événementiel': '🧖',
  'Limousine / VTC prestige': '🚘',
  'Hélicoptère événementiel': '🚁',
  'Location de matériel': '📦',
  'Sécurité événementielle': '🛡️',
  'Autre prestataire': '🤝',
};

function getMetierDisplay(companySettings, prestataireDomaine) {
  // Source prioritaire : CompanySettings.metier (saisie précise dans Ma Vitrine)
  if (companySettings?.metier) {
    return {
      icon: METIER_ICONS[companySettings.metier] || DEFAULT_METIER_ICON,
      label: companySettings.metier,
    };
  }
  // Repli : Prestataire.domaine (enum plus court, ex: "Autre")
  return {
    icon: DOMAINE_ICONS[prestataireDomaine] || DEFAULT_METIER_ICON,
    label: prestataireDomaine || '',
  };
}

// 3 modules fixes pour tous les prestataires confirmés
const MODULES = [
  { key: 'medias',    label: 'Médias',     emoji: '🎥', tileId: 'medias'    },
  { key: 'documents', label: 'Documents',  emoji: '📄', tileId: 'documents' },
  { key: 'messages',  label: 'Messages',   emoji: '💬', tileId: 'messages'  },
];

function getInitiales(nom = '') {
  return nom.trim().split(/\s+/).map(w => w[0]).join('').toUpperCase().slice(0, 2);
}

function LogoPrestataire({ d, domaine, size = 48 }) {
  const icon = DOMAINE_ICONS[domaine] || '🤝';
  if (d?.logo_url) {
    return (
      <img
        src={d.logo_url}
        alt={d?.nom || ''}
        className="rounded-xl object-contain shrink-0"
        style={{ width: size, height: size, background: 'white', border: '1.5px solid #e8e4dc' }}
      />
    );
  }
  return (
    <div
      className="rounded-xl flex items-center justify-center shrink-0 font-bold"
      style={{ width: size, height: size, background: 'rgba(30,27,75,0.08)', color: '#1e1b4b', fontSize: '1rem' }}
    >
      {d?.nom ? getInitiales(d.nom) : icon}
    </div>
  );
}

function ModuleChip({ mod, onClick, extra }) {
  return (
    <motion.button
      whileTap={{ scale: 0.95 }}
      onClick={() => onClick && onClick(mod.tileId, extra)}
      className="inline-flex items-center gap-1.5 text-[12px] font-semibold px-3 py-1.5 rounded-xl border transition-colors active:opacity-80"
      style={{ background: 'rgba(30,27,75,0.05)', borderColor: '#e8e4dc', color: '#1e1b4b' }}
    >
      <span>{mod.emoji}</span>
      <span>{mod.label}</span>
    </motion.button>
  );
}

function StatutBadge({ statut }) {
  if (statut === 'Contacté') {
    return (
      <span
        className="inline-flex items-center gap-1 text-[10px] font-semibold px-2 py-0.5 rounded-full shrink-0"
        style={{ background: 'rgba(249,115,22,0.12)', color: '#ea580c' }}
      >
        <Clock size={9} /> En discussion
      </span>
    );
  }
  return (
    <span
      className="inline-flex items-center gap-1 text-[10px] font-semibold px-2 py-0.5 rounded-full shrink-0"
      style={{ background: 'rgba(34,197,94,0.12)', color: '#16a34a' }}
    >
      <CheckCircle2 size={9} /> Confirmé
    </span>
  );
}

function OutilBadge({ emoji, label, onClick, accentColor, emptyLabel }) {
  // État inactif : aucun document n'existe pour ce prestataire sur cet événement.
  // Badge grisé, non cliquable, avec un texte discret expliquant l'absence.
  if (!onClick) {
    return (
      <div
        className="inline-flex flex-col gap-0.5 px-3 py-1.5 rounded-xl border"
        style={{ background: 'rgba(148,163,184,0.08)', borderColor: 'rgba(148,163,184,0.25)', color: '#94a3b8' }}
        title={emptyLabel}
      >
        <span className="inline-flex items-center gap-1.5 text-[12px] font-semibold opacity-80">
          <span className="opacity-60">{emoji}</span>
          <span>{label}</span>
        </span>
        <span className="text-[10px] font-normal leading-tight opacity-70">{emptyLabel}</span>
      </div>
    );
  }
  return (
    <motion.button
      whileTap={{ scale: 0.95 }}
      onClick={onClick}
      className="inline-flex items-center gap-1.5 text-[12px] font-semibold px-3 py-1.5 rounded-xl border transition-colors active:opacity-80"
      style={{ background: `${accentColor}14`, borderColor: `${accentColor}40`, color: accentColor }}
    >
      <span>{emoji}</span>
      <span>{label}</span>
    </motion.button>
  );
}

export function PrestataireCard({ ep, cs, onSelectModule, onOpenOutil, promoInfo, onOpenPromo, acceptedPromos }) {
  const [open, setOpen] = useState(false);
  const [selectedAcceptedPromo, setSelectedAcceptedPromo] = useState(null);
  const d = ep.details;
  const { icon, label: metierLabel } = getMetierDisplay(cs, ep.prestataire_domaine);
  const coverUrl = cs?.company_cover_url || null;

  // 3 modules fixes pour tous les prestataires
  const activeModules = MODULES;

  // Offres acceptées (sous-section "Commercial") — uniquement si au moins une promo acceptée.
  const acceptedList = Array.isArray(acceptedPromos) ? acceptedPromos : [];

  return (
    <div
      className="rounded-2xl overflow-hidden"
      style={{
        background: '#FFFBF0',
        border: '2px solid #C5A059',
        boxShadow: '0 6px 18px rgba(197,160,89,0.28)',
        position: 'relative',
      }}
    >
      {/* Photo de couverture (depuis CompanySettings.company_cover_url) */}
      {coverUrl && (
        <div className="w-full" style={{ height: 88 }}>
          <img
            src={coverUrl}
            alt={''}
            className="w-full h-full object-cover"
            style={{ display: 'block' }}
          />
        </div>
      )}

      {/* En-tête cliquable */}
      <motion.div
        whileTap={{ scale: 0.99 }}
        onClick={() => setOpen(v => !v)}
        className="flex items-center gap-3 w-full p-4 text-left cursor-pointer"
      >
        <LogoPrestataire d={d} domaine={ep.prestataire_domaine} />

        <div className="flex-1 min-w-0">
          <div className="flex items-center gap-2 flex-wrap">
            <p className="font-semibold text-sm" style={{ color: '#1e1b4b' }}>
              {ep.prestataire_nom}
            </p>
            <StatutBadge statut={ep.statut} />
          </div>
          <p className="text-xs mt-0.5" style={{ color: '#9ca3af' }}>
            {icon} {metierLabel}{d?.ville ? ` · ${d.ville}` : ''}
          </p>
        </div>

        {/* Icône promotion — à côté du chevron, sur la carte du prestataire propriétaire.
            2 états visibles en en-tête : pending (vibration cloche du glyphe seul) et refusé/accepté → masqué.
            Le cercle doré reste fixe ; seul le glyphe intérieur pivote pour que le mouvement soit visible.
            L'état "acceptée" n'apparaît plus ici : les offres acceptées sont listées dans la sous-section
            "Commercial" du corps déplié. */}
        {promoInfo?.state === 'pending' && (
          <button
            type="button"
            onClick={(e) => { e.stopPropagation(); onOpenPromo && onOpenPromo(); }}
            className="relative flex items-center justify-center rounded-full shrink-0 transition-all active:scale-90"
            style={{
              width: 40, height: 40,
              background: promoInfo.hasUnseen ? '#C5A059' : 'rgba(197,160,89,0.10)',
              boxShadow: promoInfo.hasUnseen ? '0 3px 10px rgba(197,160,89,0.5)' : 'none',
            }}
            aria-label="Voir les offres promotionnelles"
          >
            <motion.span
              className="flex items-center justify-center"
              style={{ originX: '50%', originY: '30%' }}
              animate={promoInfo.hasUnseen ? { rotate: [0, -20, 20, -14, 14, -7, 0] } : undefined}
              transition={promoInfo.hasUnseen ? { duration: 0.75, repeat: Infinity, repeatDelay: 2.25, ease: 'easeInOut' } : undefined}
            >
              <Tag size={22} style={{ color: promoInfo.hasUnseen ? '#fff' : '#C5A059' }} />
            </motion.span>
          </button>
        )}

        {/* Chevron rotatif */}
        <motion.div
          animate={{ rotate: open ? 180 : 0 }}
          transition={{ duration: 0.2 }}
          style={{ color: '#9ca3af', flexShrink: 0 }}
        >
          <ChevronDown size={18} />
        </motion.div>
      </motion.div>

      {/* Corps dépliable */}
      <AnimatePresence initial={false}>
        {open && (
          <motion.div
            key="body"
            initial={{ height: 0, opacity: 0 }}
            animate={{ height: 'auto', opacity: 1 }}
            exit={{ height: 0, opacity: 0 }}
            transition={{ duration: 0.22, ease: 'easeOut' }}
            style={{ overflow: 'hidden' }}
          >
            <div className="px-4 pb-4 space-y-4 border-t" style={{ borderColor: '#f1f5f9' }}>

              {/* Description prestataire */}
              {d?.description && (
                <p className="text-sm text-muted-foreground italic pt-2 leading-relaxed">{d.description}</p>
              )}

              {/* Commercial — offres promotionnelles acceptées par le client.
                  N'apparaît que s'il existe ≥1 promo acceptée pour ce prestataire.
                  Chaque pastille ouvre le détail lecture seule (AcceptedPromoModal). */}
              {acceptedList.length > 0 && (
                <div className="space-y-2 pt-2">
                  <p className="text-[11px] font-semibold uppercase tracking-widest flex items-center gap-1.5" style={{ color: '#9ca3af' }}>
                    <Sparkles size={12} style={{ color: '#C5A059' }} />
                    Commercial
                  </p>
                  <div className="flex flex-wrap gap-2">
                    {acceptedList.map(promo => {
                      const label = getPromoLabel(promo);
                      const emoji = getPromoEmoji(promo.type_promo);
                      return (
                        <motion.button
                          key={promo.id}
                          whileTap={{ scale: 0.95 }}
                          onClick={() => setSelectedAcceptedPromo(promo)}
                          className="inline-flex items-center gap-1.5 text-[12px] font-semibold px-3 py-1.5 rounded-xl border transition-colors active:opacity-80"
                          style={{ background: 'rgba(22,163,74,0.08)', borderColor: 'rgba(22,163,74,0.35)', color: '#15803d' }}
                        >
                          <span>{emoji}</span>
                          <span>{promo.titre}</span>
                          {label && <span className="opacity-70">· {label}</span>}
                        </motion.button>
                      );
                    })}
                  </div>
                </div>
              )}

              {/* Échanges */}
              {activeModules.length > 0 && (
                <div className="space-y-2 pt-2">
                  <p className="text-[11px] font-semibold uppercase tracking-widest" style={{ color: '#9ca3af' }}>
                    Échanges
                  </p>
                  <div className="flex flex-wrap gap-2">
                    {activeModules.map(mod => (
                      <ModuleChip
                        key={mod.key}
                        mod={mod}
                        onClick={onSelectModule}
                        extra={{ prestataire_id: ep.prestataire_id, prestataire_nom: ep.prestataire_nom }}
                      />
                    ))}
                  </div>
                </div>
              )}

              {/* Outils rattachés (Questionnaire / Contrat / Devis) — toujours affichés,
                  actifs si un enregistrement existe, grisés avec texte explicatif sinon. */}
              <div className="space-y-2 pt-2 border-t" style={{ borderColor: '#f1f5f9' }}>
                <p className="text-[11px] font-semibold uppercase tracking-widest" style={{ color: '#9ca3af' }}>
                  Dossier administratif
                </p>
                <div className="flex flex-wrap gap-2 items-start">
                  <OutilBadge
                    emoji="📄" label="Contrat" accentColor="#475569"
                    onClick={ep.hasContrat ? () => onOpenOutil?.(ep.prestataire_id, ep.prestataire_nom, 'contrats') : undefined}
                    emptyLabel="Contrat pas encore établi"
                  />
                  <OutilBadge
                    emoji="💰" label="Devis et factures" accentColor="#166534"
                    onClick={ep.hasDevis ? () => onOpenOutil?.(ep.prestataire_id, ep.prestataire_nom, 'financier') : undefined}
                    emptyLabel="Pas encore de devis partagé"
                  />
                  {ep.hasBrochures && (
                    <OutilBadge
                      emoji="📘" label="Brochures" accentColor="#7c3aed"
                      onClick={() => onOpenOutil?.(ep.prestataire_id, ep.prestataire_nom, 'brochures')}
                    />
                  )}
                </div>
              </div>

              {/* Notes spécifiques à cet événement */}
              {ep.notes && (
                <p className="text-xs italic pt-1" style={{ color: '#9ca3af' }}>📝 {ep.notes}</p>
              )}
            </div>
          </motion.div>
        )}
      </AnimatePresence>

      {/* Modal détail lecture seule d'une offre acceptée (sous-section Commercial) */}
      {selectedAcceptedPromo && (
        <AcceptedPromoModal
          promo={selectedAcceptedPromo}
          onClose={() => setSelectedAcceptedPromo(null)}
        />
      )}
    </div>
  );
}

const PREVIEW_COUNT = 2;

export default function PrestatairesCardsSection({ evenementId, evenementType, evenement, clientNom, onSelectModule, onOpenOutil }) {
  const qc = useQueryClient();
  const [showAll, setShowAll] = useState(false);
  const [promoOpen, setPromoOpen] = useState(false);

  const { data: evPrestataires = [] } = useQuery({
    queryKey: ['ev-prestataires-client', evenementId],
    queryFn: () => base44.entities.EvenementPrestataire.filter({ evenement_id: evenementId }),
  });

  const { data: tousPrestataires = [] } = useQuery({
    queryKey: ['prestataires-all'],
    queryFn: () => base44.entities.Prestataire.list(),
    enabled: evPrestataires.length > 0,
  });

  // CompanySettings de chaque prestataire (source du métier précis + photo de couverture).
  const { data: allCompanySettings = [] } = useQuery({
    queryKey: ['company-settings-all'],
    queryFn: () => base44.entities.CompanySettings.list(),
    enabled: evPrestataires.length > 0,
  });

  // Outils rattachés par prestataire (Questionnaire / Contrat / Devis) — chargés une
  // fois pour l'événement, puis traduits en drapeaux par prestataire confirmé.
  const { data: formulaires = [] } = useQuery({
    queryKey: ['outils-formulaires-ev', evenementId],
    queryFn: () => base44.entities.FormulairePreparation.filter({ evenement_id: evenementId }),
    enabled: evPrestataires.length > 0,
    staleTime: 60000,
  });
  const { data: contrats = [] } = useQuery({
    queryKey: ['outils-contrats-ev', evenementId],
    queryFn: () => base44.entities.Contrat.filter({ evenement_id: evenementId }),
    enabled: evPrestataires.length > 0,
    staleTime: 60000,
  });
  const { data: devis = [] } = useQuery({
    queryKey: ['outils-devis-ev', evenementId],
    queryFn: () => base44.entities.Devis.filter({ evenement_id: evenementId }),
    enabled: evPrestataires.length > 0,
    staleTime: 60000,
  });

  // Brochures (globales — propriété du prestataire propriétaire de l'app).
  // Clé de cache partagée avec OutilsSection / ConsolidatedDocumentsView.
  const { data: brochures = [] } = useQuery({
    queryKey: ['outils-brochures'],
    queryFn: () => base44.entities.BrochureCatalogue.filter({ actif: true }),
    enabled: evPrestataires.length > 0,
    staleTime: 300000,
  });

  const prestatairesAvecQuestionnaire = new Set((formulaires || []).filter(f => f.prestataire_id).map(f => f.prestataire_id));
  const prestatairesAvecContrat = new Set((contrats || []).filter(c => c.prestataire_id).map(c => c.prestataire_id));
  const prestatairesAvecDevis = new Set((devis || []).filter(d => d.prestataire_id).map(d => d.prestataire_id));

  // PromotionReponse pour cet événement — détermine l'affichage du badge promo
  // sur la carte du prestataire propriétaire (qui envoie les promotions).
  const { data: promoReponses = [] } = useQuery({
    queryKey: ['promo-reponses-ev', evenementId],
    queryFn: () => base44.entities.PromotionReponse.filter({ evenement_id: evenementId }),
    enabled: evPrestataires.length > 0,
    staleTime: 30000,
  });
  // 2 états visibles en en-tête :
  //   - 'pending' : au moins une promo Envoyé/Vu non traitée → icône animée (vibration cloche)
  //   - null      : tout est Accepté/Refusé (ou aucune promo) → icône masquée en en-tête.
  //                Les promos acceptées sont affichées dans la sous-section "Commercial" du corps déplié.
  const hasPendingPromo = promoReponses.some(r => r.reponse === 'Envoyé' || r.reponse === 'Vu');
  const promoState = hasPendingPromo ? 'pending' : null;
  const hasUnseenPromo = promoReponses.some(r => r.reponse === 'Envoyé');

  // Promotions acceptées — on charge les enregistrements Promotion complets pour afficher
  // le détail (prix barré, description, visuel) dans la sous-section "Commercial".
  const acceptedReponseIds = (promoReponses || []).filter(r => r.reponse === 'Accepté').map(r => r.promotion_id);
  const { data: allPromotions = [] } = useQuery({
    queryKey: ['promotions-all'],
    queryFn: () => base44.entities.Promotion.list(),
    enabled: evPrestataires.length > 0,
    staleTime: 60000,
  });
  const acceptedPromos = (allPromotions || []).filter(p => acceptedReponseIds.includes(p.id));

  // BrochureCatalogue n'a pas de prestataire_id : les brochures appartiennent au
  // prestataire propriétaire de l'app (CompanySettings.is_owner). Le chip Brochures
  // n'apparaît que sur sa carte, et seulement s'il existe ≥1 brochure applicable
  // au type d'événement.
  const ownerPrestataireId = (allCompanySettings || []).find(c => c.is_owner === true)?.prestataire_id || null;
  const brochuresForType = (brochures || []).filter(b =>
    !Array.isArray(b.types_evenement) || b.types_evenement.length === 0 || b.types_evenement.includes(evenementType)
  );

  // Prestataires confirmés uniquement (les cartes Contacté restent dans l'onglet Favoris)
  const confirmes = evPrestataires
    .filter(ep => ep.statut === 'Confirmé')
    .map(ep => ({
      ...ep,
      details: tousPrestataires.find(p => p.id === ep.prestataire_id) || null,
      company: allCompanySettings.find(c => c.prestataire_id === ep.prestataire_id) || null,
      hasQuestionnaire: prestatairesAvecQuestionnaire.has(ep.prestataire_id),
      hasContrat: prestatairesAvecContrat.has(ep.prestataire_id),
      hasDevis: prestatairesAvecDevis.has(ep.prestataire_id),
      hasBrochures: ep.prestataire_id === ownerPrestataireId && brochuresForType.length > 0,
    }));

  if (confirmes.length === 0) return null;

  // Tri : Confirmés d'abord
  const STATUT_ORDER = { 'Confirmé': 0, 'Contacté': 1 };
  const sorted = [...confirmes].sort((a, b) => (STATUT_ORDER[a.statut] ?? 2) - (STATUT_ORDER[b.statut] ?? 2));

  const displayed = showAll ? sorted : sorted.slice(0, PREVIEW_COUNT);
  const hasMore = sorted.length > PREVIEW_COUNT;

  return (
    <div className="px-4 pb-2">
      <p className="text-[11px] font-bold uppercase tracking-widest mb-3 flex items-center gap-2" style={{ color: '#1e1b4b' }}>
        <span style={{ display: 'inline-block', width: 9, height: 9, borderRadius: '50%', background: '#C5A059', flexShrink: 0 }} />
        Mes prestataires confirmés
        <span style={{ flex: 1, height: 1, background: 'rgba(197,160,89,0.3)' }} />
        </p>

      <div className="space-y-3">
        <AnimatePresence>
          {displayed.map(ep => (
            <motion.div
              key={ep.id}
              initial={{ opacity: 0, y: 8 }}
              animate={{ opacity: 1, y: 0 }}
              exit={{ opacity: 0, y: -8 }}
              transition={{ duration: 0.18 }}
            >
              <PrestataireCard
                ep={ep}
                cs={ep.company}
                onSelectModule={onSelectModule}
                onOpenOutil={onOpenOutil}
                promoInfo={ep.prestataire_id === ownerPrestataireId ? { state: promoState, hasUnseen: hasUnseenPromo } : null}
                onOpenPromo={ep.prestataire_id === ownerPrestataireId ? () => setPromoOpen(true) : undefined}
                acceptedPromos={ep.prestataire_id === ownerPrestataireId ? acceptedPromos : null}
              />
            </motion.div>
          ))}
        </AnimatePresence>
      </div>

      {/* Bouton "Voir tous" */}
      {hasMore && (
        <motion.button
          whileTap={{ scale: 0.97 }}
          onClick={() => setShowAll(v => !v)}
          className="w-full mt-3 py-2.5 rounded-xl border text-sm font-semibold transition-colors"
          style={{ borderColor: '#e8e4dc', color: '#1e1b4b', background: '#faf8f4' }}
        >
          {showAll
            ? 'Réduire la liste ↑'
            : `Voir tous mes prestataires (${sorted.length}) →`
          }
        </motion.button>
      )}

      {/* Drawer promotion — ouvert depuis l'icône 🏷️ sur la carte du prestataire propriétaire */}
      {promoOpen && createPortal(
        <div className="fixed inset-0 z-[9999] flex items-end justify-center" onClick={() => { setPromoOpen(false); qc.invalidateQueries(['promo-reponses-ev', evenementId]); }}>
          <div className="absolute inset-0 bg-black/45" />
          <motion.div
            initial={{ y: '100%' }}
            animate={{ y: 0 }}
            transition={{ type: 'spring', damping: 30, stiffness: 300 }}
            className="relative w-full max-w-lg bg-white rounded-t-3xl shadow-2xl flex flex-col overflow-hidden"
            style={{ maxHeight: '85vh' }}
            onClick={e => e.stopPropagation()}
          >
            <div className="flex items-center justify-between px-5 pt-4 pb-3 border-b shrink-0" style={{ borderColor: '#f1f5f9' }}>
              <h3 className="font-bold text-base flex items-center gap-2" style={{ color: '#1e1b4b' }}>
                <span>🏷️</span> Offres promotionnelles
              </h3>
              <button onClick={() => { setPromoOpen(false); qc.invalidateQueries(['promo-reponses-ev', evenementId]); }} className="text-gray-400 hover:text-gray-600">
                <X size={20} />
              </button>
            </div>
            <div className="overflow-y-auto flex-1">
              <PromotionBanner evenement={evenement} clientNom={clientNom} />
            </div>
          </motion.div>
        </div>,
        document.body
      )}
    </div>
  );
}