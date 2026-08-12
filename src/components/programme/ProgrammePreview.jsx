/**
 * ProgrammePreview — Rendu de prévisualisation du programme public.
 *
 * Navigation par swipe horizontal : chaque thème s'affiche en plein écran
 * dans son intégralité (rendu réel, pas de miniature).
 *   - Bouton retour flottant en haut à gauche (appelle onExit).
 *   - Badge cadenas en haut à droite si le thème visible est premium verrouillé.
 *   - Points de pagination indiquant la position dans la liste.
 *   - Gros bouton d'action en bas agissant sur le thème actuellement visible.
 *
 * La sauvegarde ne se déclenche qu'au clic sur le bouton du bas (Option A).
 *
 * Props: programme, evenement, onExit, initialThemeId
 */
import { useState, useRef, useEffect } from 'react';
import { useQuery, useQueryClient } from '@tanstack/react-query';
import { base44 } from '@/api/base44Client';
import { format, parseISO } from 'date-fns';
import { fr } from 'date-fns/locale';
import { MapPin, Navigation, Users, MessageCircle, Lock, ChevronLeft, ChevronRight, Undo2, Check } from 'lucide-react';
import { getTheme } from './programmeTheme';
import { THEME_PRICE } from '@/config/themePricing';
import InvitationPreviewSlide from './InvitationPreviewSlide';

const THEME_ORDER = ['navy_cristal', 'clair_cristal', 'elegance', 'nature', 'sienna', 'boheme', 'riviera', 'nocturne', 'rosee', 'emeraude', 'perle', 'dolce_vita', 'aurore', 'luna', 'mineral', 'givre', 'boreal'];
import ProgrammeIcsButton from './ProgrammeIcsButton';
import EleganceMonogram from './EleganceMonogram';
import DecorativeSeparator from './DecorativeSeparator';
import EleganceWrapper from './EleganceWrapper';
import EtapeIconCard from './EtapeIconCard';
import EtapeTimelineCard from './EtapeTimelineCard';
import { cleanEventName } from './etapeIcons';
import NatureWrapper from './NatureWrapper';
import NatureMonogram from './NatureMonogram';
import SiennaWrapper from './SiennaWrapper';
import SiennaMonogram from './SiennaMonogram';
import BohemeWrapper from './BohemeWrapper';
import BohemeMonogram from './BohemeMonogram';
import RivieraWrapper from './RivieraWrapper';
import RivieraMonogram from './RivieraMonogram';
import NocturneWrapper from './NocturneWrapper';
import NocturneMonogram from './NocturneMonogram';
import RoseeWrapper from './RoseeWrapper';
import RoseeMonogram from './RoseeMonogram';
import EmeraudeWrapper from './EmeraudeWrapper';
import EmeraudeMonogram from './EmeraudeMonogram';
import PerleWrapper from './PerleWrapper';
import PerleMonogram from './PerleMonogram';
import DolceVitaWrapper from './DolceVitaWrapper';
import DolceVitaMonogram from './DolceVitaMonogram';
import AuroreWrapper from './AuroreWrapper';
import AuroreMonogram from './AuroreMonogram';
import LunaWrapper from './LunaWrapper';
import LunaMonogram from './LunaMonogram';
import MineralWrapper from './MineralWrapper';
import MineralMonogram from './MineralMonogram';
import GivreWrapper from './GivreWrapper';
import GivreMonogram from './GivreMonogram';
import BorealWrapper from './BorealWrapper';
import BorealMonogram from './BorealMonogram';

const WRAPPER_MONOGRAM_MAP = {
  nature: [NatureWrapper, NatureMonogram],
  sienna: [SiennaWrapper, SiennaMonogram],
  boheme: [BohemeWrapper, BohemeMonogram],
  riviera: [RivieraWrapper, RivieraMonogram],
  nocturne: [NocturneWrapper, NocturneMonogram],
  rosee: [RoseeWrapper, RoseeMonogram],
  emeraude: [EmeraudeWrapper, EmeraudeMonogram],
  perle: [PerleWrapper, PerleMonogram],
  dolce_vita: [DolceVitaWrapper, DolceVitaMonogram],
  aurore: [AuroreWrapper, AuroreMonogram],
  luna: [LunaWrapper, LunaMonogram],
  mineral: [MineralWrapper, MineralMonogram],
  givre: [GivreWrapper, GivreMonogram],
  boreal: [BorealWrapper, BorealMonogram],
};

export default function ProgrammePreview({ programme, evenement, onExit, initialThemeId }) {
  const qc = useQueryClient();
  const [currentThemeId, setCurrentThemeId] = useState(initialThemeId || programme.theme_id || 'navy_cristal');
  const [themesDebloques, setThemesDebloques] = useState(programme.themes_debloques || []);
  const [unlocking, setUnlocking] = useState(false);
  const [mode, setMode] = useState('invitation'); // 'programme' | 'invitation'
  const scrollRef = useRef(null);
  const slideRefs = useRef({});

  const currentTheme = getTheme(currentThemeId);
  const blocs = programme.blocs_actifs || {};
  const isPremiumLocked = currentTheme.premium && !themesDebloques.includes(currentThemeId);

  // ── Positionner le scroll horizontal sur le thème initial au montage ─────────
  useEffect(() => {
    const startId = initialThemeId || programme.theme_id || 'navy_cristal';
    const container = scrollRef.current;
    const el = slideRefs.current[startId];
    if (container && el) {
      container.scrollTo({ left: el.offsetLeft, behavior: 'auto' });
    }
  }, [initialThemeId, programme.theme_id]);

  // ── Suivi du slide visible via IntersectionObserver ─────────────────────────
  useEffect(() => {
    const container = scrollRef.current;
    if (!container) return;
    const observer = new IntersectionObserver((entries) => {
      entries.forEach(e => {
        if (e.isIntersecting && e.intersectionRatio >= 0.5) {
          const id = e.target.dataset.themeId;
          if (id) setCurrentThemeId(id);
        }
      });
    }, { root: container, threshold: [0.5] });
    Object.values(slideRefs.current).forEach(el => el && observer.observe(el));
    return () => observer.disconnect();
  }, []);

  const handleChoose = async () => {
    try {
      await base44.entities.ProgrammeJourJ.update(programme.id, { theme_id: currentThemeId });
      qc.invalidateQueries(['programme-jourj', evenement.id]);
      onExit();
    } catch (e) {
      console.error('Erreur choix thème:', e);
    }
  };

  const scrollToThemeById = (themeId) => {
    const container = scrollRef.current;
    const el = slideRefs.current[themeId];
    if (container && el) {
      container.scrollTo({ left: el.offsetLeft, behavior: 'smooth' });
    }
  };

  const currentIndex = THEME_ORDER.indexOf(currentThemeId);
  const hasPrev = currentIndex > 0;
  const hasNext = currentIndex >= 0 && currentIndex < THEME_ORDER.length - 1;

  const handleUnlock = async () => {
    setUnlocking(true);
    try {
      const updated = [...themesDebloques, currentThemeId];
      // Déblocage ET activation simultanés : le thème devient débloqué et actif.
      await base44.entities.ProgrammeJourJ.update(programme.id, { themes_debloques: updated, theme_id: currentThemeId });
      setThemesDebloques(updated);
      qc.invalidateQueries(['programme-jourj', evenement.id]);
      onExit();
    } catch (e) {
      console.error('Erreur déblocage:', e);
    } finally {
      setUnlocking(false);
    }
  };

  // ── Chargement des données (pas de filtrage invité en prévisualisation) ──────
  const { data: allEtapes = [] } = useQuery({
    queryKey: ['etapes-preview', programme.evenement_id],
    queryFn: () => base44.entities.EtapeProgramme.filter({ evenement_id: programme.evenement_id }),
    enabled: blocs.afficher_programme_detaille,
  });
  const sortedEtapes = allEtapes.slice().sort((a, b) => (a.ordre || 0) - (b.ordre || 0));

  const { data: allMoments = [] } = useQuery({
    queryKey: ['moments-preview', programme.evenement_id],
    queryFn: () => base44.entities.MomentEvenement.filter({ evenement_id: programme.evenement_id }),
    enabled: blocs.afficher_moments,
  });
  const sortedMoments = allMoments.slice().sort((a, b) => (a.ordre || 0) - (b.ordre || 0));

  const prestataireIds = (programme.prestataires_affiches || []).map(p => p.prestataire_id);
  const { data: prestataires = [] } = useQuery({
    queryKey: ['prestataires-preview', prestataireIds.join(',')],
    queryFn: async () => {
      const results = await Promise.all(
        prestataireIds.map(id => base44.entities.Prestataire.get(id).catch(() => null))
      );
      return results.filter(Boolean);
    },
    enabled: blocs.afficher_prestataires && prestataireIds.length > 0,
  });

  return (
    <div className="fixed right-0 bottom-0 left-0 top-14 md:left-60 md:top-0" style={{ zIndex: 10000, background: currentTheme.pageBg }}>
      <style>{`.preview-swipe-track::-webkit-scrollbar{display:none}.preview-swipe-track{scrollbar-width:none;-ms-overflow-style:none}`}</style>

      {/* ── Track horizontal swipable — chaque slide = un thème plein écran ────── */}
      <div ref={scrollRef} className="preview-swipe-track" style={{
        display: 'flex',
        overflowX: 'auto',
        overflowY: 'hidden',
        scrollSnapType: 'x mandatory',
        WebkitOverflowScrolling: 'touch',
        height: '100%',
      }}>
        {THEME_ORDER.map(themeId => {
          const slideTheme = getTheme(themeId);
          return (
          <div
            key={themeId}
            data-theme-id={themeId}
            ref={el => { if (el) slideRefs.current[themeId] = el; }}
            style={{ minWidth: '100vw', width: '100vw', height: '100%', scrollSnapAlign: 'start', overflowY: 'auto', WebkitOverflowScrolling: 'touch', background: slideTheme.pageBg }}
          >
            {mode === 'invitation'
              ? <InvitationPreviewSlide themeId={themeId} evenement={evenement} />
              : <ThemeSlide
                  themeId={themeId}
                  programme={programme}
                  evenement={evenement}
                  blocs={blocs}
                  sortedEtapes={sortedEtapes}
                  prestataires={prestataires}
                />}
          </div>
          );
        })}
      </div>

      {/* ── Bouton retour flottant (haut gauche) ──────────────────────────────── */}
      <button
        onClick={onExit}
        className="flex items-center justify-center transition-all active:scale-90"
        style={{
          position: 'absolute',
          top: 6,
          left: 12,
          zIndex: 100,
          width: 40, height: 40, borderRadius: 20,
          background: 'rgba(30,27,75,0.55)',
          backdropFilter: 'blur(8px)', WebkitBackdropFilter: 'blur(8px)',
          border: '1px solid rgba(255,255,255,0.18)',
          color: '#ffffff', cursor: 'pointer',
        }}
      >
        <Undo2 size={22} />
      </button>

      {/* ── Flèches de navigation latérales (semi-transparentes) ──────────────── */}
      {hasPrev && (
        <button
          onClick={() => scrollToThemeById(THEME_ORDER[currentIndex - 1])}
          aria-label="Thème précédent"
          className="flex items-center justify-center transition-all active:scale-90"
          style={{
            position: 'absolute',
            top: '50%',
            left: 12,
            transform: 'translateY(-50%)',
            zIndex: 95,
            width: 40, height: 40, borderRadius: 20,
            background: 'rgba(30,27,75,0.40)',
            backdropFilter: 'blur(6px)', WebkitBackdropFilter: 'blur(6px)',
            border: '1px solid rgba(255,255,255,0.14)',
            color: 'rgba(255,255,255,0.85)',
            cursor: 'pointer',
          }}
        >
          <ChevronLeft size={22} />
        </button>
      )}
      {hasNext && (
        <button
          onClick={() => scrollToThemeById(THEME_ORDER[currentIndex + 1])}
          aria-label="Thème suivant"
          className="flex items-center justify-center transition-all active:scale-90"
          style={{
            position: 'absolute',
            top: '50%',
            right: 12,
            transform: 'translateY(-50%)',
            zIndex: 95,
            width: 40, height: 40, borderRadius: 20,
            background: 'rgba(30,27,75,0.40)',
            backdropFilter: 'blur(6px)', WebkitBackdropFilter: 'blur(6px)',
            border: '1px solid rgba(255,255,255,0.14)',
            color: 'rgba(255,255,255,0.85)',
            cursor: 'pointer',
          }}
        >
          <ChevronRight size={22} />
        </button>
      )}

      {/* ── Points de pagination — palette fixe navy→champagne ─────────────── */}
      <div style={{
        position: 'fixed',
        bottom: 'calc(86px + env(safe-area-inset-bottom, 0px))',
        left: 0, right: 0,
        zIndex: 99,
        display: 'flex', justifyContent: 'center', gap: 6,
        pointerEvents: 'none',
      }}>
        {THEME_ORDER.map(t => (
          <span key={t} style={{
            width: t === currentThemeId ? 24 : 8,
            height: 8,
            borderRadius: 4,
            background: t === currentThemeId ? '#C5A059' : 'rgba(197,160,89,0.35)',
            transition: 'all 0.25s ease',
          }} />
        ))}
      </div>

      {/* ── Bandeau du bas : toggle Invitation/Programme + bouton d'action ─────── */}
      <div style={{
        position: 'fixed', bottom: 0, left: 0, right: 0,
        zIndex: 100,
        display: 'flex', flexDirection: 'column', alignItems: 'center', gap: 10,
        padding: '12px 16px calc(16px + env(safe-area-inset-bottom, 0px))',
        background: 'linear-gradient(to top, #1e1b4b 60%, rgba(30,27,75,0.85) 80%, transparent 100%)',
      }}>
        {/* Toggle Invitation ↔ Programme Jour J — fond opaque, toujours lisible */}
        <div style={{
          display: 'flex',
          padding: 4,
          borderRadius: 999,
          background: '#ffffff',
          border: '1px solid rgba(197,160,89,0.3)',
          boxShadow: '0 2px 10px rgba(30,27,75,0.25)',
        }}>
          {[
            { id: 'invitation', label: 'Invitation' },
            { id: 'programme', label: 'Programme Jour J' },
          ].map(opt => {
            const active = mode === opt.id;
            return (
              <button
                key={opt.id}
                onClick={() => setMode(opt.id)}
                className="text-xs font-semibold transition-all"
                style={{
                  padding: '7px 16px',
                  borderRadius: 999,
                  color: active ? '#1e1b4b' : '#6b7280',
                  background: active ? 'linear-gradient(135deg, #C5A059 0%, #f3d28a 100%)' : 'transparent',
                  boxShadow: active ? '0 2px 8px rgba(197,160,89,0.4)' : 'none',
                  cursor: 'pointer',
                  whiteSpace: 'nowrap',
                }}
              >
                {opt.label}
              </button>
            );
          })}
        </div>

        {/* Bouton unique large — nom + statut + action sur une seule ligne */}
        <button
          onClick={currentThemeId === programme.theme_id ? undefined : isPremiumLocked ? handleUnlock : handleChoose}
          disabled={currentThemeId === programme.theme_id || unlocking}
          className="w-full py-4 rounded-2xl text-base font-bold flex items-center justify-center gap-2 transition-all active:scale-[0.98] disabled:opacity-60 disabled:cursor-default"
          style={{ background: 'linear-gradient(135deg, #1e1b4b 0%, #2d2a6e 45%, #C5A059 100%)', color: '#ffffff', boxShadow: '0 8px 24px rgba(30,27,75,0.40)' }}
        >
          {(() => {
            const name = currentTheme.shortName || currentTheme.name;
            if (currentThemeId === programme.theme_id) {
              return (<><Check size={18} />{name} · Thème actif</>);
            }
            if (isPremiumLocked) {
              return (<><Lock size={18} />{name} · {`${THEME_PRICE.toFixed(2).replace('.', ',')} €`} · Acheter</>);
            }
            const isUnlocked = currentTheme.premium && themesDebloques.includes(currentThemeId);
            return (<><Check size={18} />{name} · {isUnlocked ? 'Débloqué' : 'Gratuit'} · Choisir</>);
          })()}
        </button>
      </div>
    </div>
  );
}

// ═══════════════════════════════════════════════════════════════════════════════
// THEME SLIDE — Rendu complet plein écran d'un thème individuel
// ═══════════════════════════════════════════════════════════════════════════════
function ThemeSlide({ themeId, programme, evenement, blocs, sortedEtapes, prestataires }) {
  const theme = getTheme(themeId);
  const [Wrapper, Monogram] = WRAPPER_MONOGRAM_MAP[theme.wrapper] || [EleganceWrapper, EleganceMonogram];

  return (
    <div style={{ background: theme.pageBg, color: theme.text, minHeight: '100%' }}>
      <div style={{ transform: 'scale(0.88)', transformOrigin: 'top center', marginTop: theme.premium ? 0 : 32, paddingBottom: 80 }}>
      <Wrapper theme={theme}>
        <div className={theme.premium ? "max-w-lg mx-auto px-5 py-5 space-y-6" : "max-w-lg mx-auto px-4 pt-20 pb-6 space-y-6"} style={{ position: 'relative', zIndex: 1, border: theme.premium ? 'none' : (theme.globalBorder || 'none'), borderRadius: theme.premium ? 0 : '1.25rem', boxSizing: 'border-box', marginTop: theme.premium ? '14px' : 0 }}>

        {/* ── Photo + titre hiérarchisé ──────────────────────────────────────── */}
        {blocs.afficher_infos_evenement && (
          <div className="text-center space-y-2 pt-4">
            {evenement.photo_bandeau_url && (
              <div className="w-full h-48 relative overflow-hidden" style={{ borderRadius: theme.premium ? (theme.photoRadius || '28px') : '1.5rem', boxShadow: theme.premium ? 'inset 0 0 0 3px rgba(251,247,239,0.5)' : 'none' }}>
                <img src={evenement.photo_bandeau_url} alt={evenement.nom}
                  className="w-full h-full object-cover" />
                {theme.premium && (
                  <div style={{
                    position: 'absolute', left: 0, right: 0, bottom: 0, height: '50%',
                    background: `linear-gradient(to top, ${theme.photoFadeColor || theme.paperBg || '#FBF7EF'} 0%, ${theme.photoFadeColorMid || 'rgba(251,247,239,0.4)'} 60%, transparent 100%)`,
                    pointerEvents: 'none',
                  }} />
                )}
              </div>
            )}
            {theme.premium && (
              <Monogram nom={evenement.nom} type_evenement={evenement.type_evenement} signature_override={programme.signature_override} theme={theme} hasPhoto={!!evenement.photo_bandeau_url} />
            )}
            {theme.premium ? (
              <>
                <h1 className="text-sm font-medium uppercase" style={{ fontFamily: theme.headingFont || "'Playfair Display', serif", color: theme.accent, letterSpacing: '0.25em', marginTop: theme.premium ? '4px' : '12px' }}>
                  {evenement.type_evenement}
                </h1>
                <h2 className="text-2xl" style={{ fontFamily: theme.subHeadingFont || "'Cormorant Garamond', serif", color: theme.text, fontWeight: 600, lineHeight: 1.2 }}>
                  {cleanEventName(evenement.nom, evenement.type_evenement)}
                </h2>
              </>
            ) : (
              <h1 className="text-2xl font-bold" style={{ fontFamily: "'Playfair Display', serif", marginTop: '12px' }}>
                {evenement.nom}
              </h1>
            )}
            {evenement.date && (
              <p className="text-sm" style={{ color: theme.textMuted, fontFamily: theme.premium ? (theme.bodyFont || "'Lora', serif") : 'sans-serif' }}>
                {format(parseISO(evenement.date), 'd MMMM yyyy', { locale: fr })}
              </p>
            )}
            {blocs.afficher_lieu_gps && evenement.lieu_nom && (
              <a
                href={`https://www.google.com/maps/search/?api=1&query=${encodeURIComponent(evenement.lieu_nom)}`}
                target="_blank"
                rel="noopener noreferrer"
                className="inline-flex items-center gap-1.5 text-xs px-3 py-1.5 rounded-full"
                style={{ background: theme.accentBg, color: theme.accent }}
              >
                <MapPin size={12} /> {evenement.lieu_nom} — Voir sur la carte
              </a>
            )}
            {theme.premium && (
              <div className="mt-3">
                <DecorativeSeparator theme={theme} />
              </div>
            )}
          </div>
        )}

        {/* ── Message de bienvenue ─────────────────────────────────────────────── */}
        {blocs.afficher_message_perso && programme.message_bienvenue && (
          <div className="rounded-2xl p-4 text-center"
            style={{ background: theme.cardBg, border: `1px solid ${theme.cardBorder}`, borderRadius: theme.cardRadius || '1rem', boxShadow: theme.cardShadow || 'none' }}>
            <MessageCircle size={18} className="mx-auto mb-2" style={{ color: theme.accent }} />
            <p className="text-sm leading-relaxed" style={{ color: theme.text, opacity: 0.9 }}>
              {programme.message_bienvenue}
            </p>
          </div>
        )}

        {/* ── Programme de la journée (cartes empilées + médaillons) ─────────── */}
        {blocs.afficher_programme_detaille && sortedEtapes.length > 0 && (
          <Section title="Programme de la journée" theme={theme}>
            {theme.premium ? (
              <div className="space-y-3">
                {sortedEtapes.map((etape) => (
                  <EtapeIconCard key={etape.id} etape={etape} theme={theme} />
                ))}
              </div>
            ) : (
              <div className="space-y-1">
                {sortedEtapes.map((etape, idx) => (
                  <EtapeTimelineCard key={etape.id} etape={etape} theme={theme} isLast={idx === sortedEtapes.length - 1} />
                ))}
              </div>
            )}
          </Section>
        )}

        {/* ── Prestataires ─────────────────────────────────────────────────────── */}
        {blocs.afficher_prestataires && prestataires.length > 0 && (
          <Section title="Prestataires" theme={theme}>
            <div className="space-y-2">
              {prestataires.map(p => {
                const config = (programme.prestataires_affiches || []).find(pa => pa.prestataire_id === p.id);
                return (
                  <div key={p.id} className="flex items-center gap-3 rounded-2xl p-3"
                    style={{ background: theme.cardBg, border: `1px solid ${theme.cardBorder}`, borderRadius: theme.cardRadius || '1rem', boxShadow: theme.cardShadow || 'none' }}>
                    <div className="w-10 h-10 rounded-full flex items-center justify-center shrink-0"
                      style={{ background: theme.accentBg }}>
                      <Users size={16} style={{ color: theme.accent }} />
                    </div>
                    <div>
                      <p className="font-medium text-sm" style={{ color: theme.text }}>{p.nom}</p>
                      {config?.role_personnalise && (
                        <p className="text-xs" style={{ color: theme.textMuted }}>{config.role_personnalise}</p>
                      )}
                    </div>
                  </div>
                );
              })}
            </div>
          </Section>
        )}

        {/* ── Bouton Ajouter à mon calendrier ──────────────────────────────────── */}
        <ProgrammeIcsButton evenement={evenement} etapes={sortedEtapes} theme={theme} />

        {/* Footer */}
        <div className="text-center pt-4 pb-32">
          <p className="text-[10px]" style={{ color: theme.textMuted }}>
            Programme fourni par vos organisateurs · Alryck
          </p>
        </div>
        </div>
      </Wrapper>
      </div>
    </div>
  );
}

function Section({ title, theme, children }) {
  return (
    <div className="space-y-3">
      {theme.premium && (
        <DecorativeSeparator theme={theme} />
      )}
      <p className="text-[11px] font-bold uppercase" style={{ color: theme.sectionTitle, letterSpacing: theme.sectionTitleTracking || '0.1em', textAlign: theme.premium ? 'center' : 'left' }}>
        {title}
      </p>
      {children}
    </div>
  );
}