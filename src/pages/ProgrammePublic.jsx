/**
 * ProgrammePublic — Page publique du Programme du Jour J.
 *
 * Flux :
 *   1. Accès via /programme-public?token=XXX (sans auth)
 *   2. Écran d'accroche (non connecté) → photo, nom, type, date + CTA "Créer mon compte"
 *   3. Après connexion → programme complet filtré selon les moments de l'invité
 *
 * Logique de filtrage :
 *   - Si l'invité n'a pas de moments_ids (invitation globale) → toutes les étapes
 *   - Si l'invité a des moments_ids → étapes visibles par tous (moments_ids vide)
 *     OU étapes dont moments_ids chevauche celui de l'invité
 */
import { useState, useEffect } from 'react';
import { useQuery } from '@tanstack/react-query';
import { base44 } from '@/api/base44Client';
import { format, parseISO } from 'date-fns';
import { fr } from 'date-fns/locale';
import { MapPin, Navigation, Clock, Users, MessageCircle } from 'lucide-react';
import { getTheme } from '@/components/programme/programmeTheme';
import ProgrammeIcsButton from '@/components/programme/ProgrammeIcsButton';
import EleganceMonogram from '@/components/programme/EleganceMonogram';
import DecorativeSeparator from '@/components/programme/DecorativeSeparator';
import EleganceWrapper from '@/components/programme/EleganceWrapper';
import EtapeIconCard from '@/components/programme/EtapeIconCard';
import EtapeTimelineCard from '@/components/programme/EtapeTimelineCard';
import { cleanEventName } from '@/components/programme/etapeIcons';
import NatureWrapper from '@/components/programme/NatureWrapper';
import NatureMonogram from '@/components/programme/NatureMonogram';
import SiennaWrapper from '@/components/programme/SiennaWrapper';
import SiennaMonogram from '@/components/programme/SiennaMonogram';
import BohemeWrapper from '@/components/programme/BohemeWrapper';
import BohemeMonogram from '@/components/programme/BohemeMonogram';
import RivieraWrapper from '@/components/programme/RivieraWrapper';
import RivieraMonogram from '@/components/programme/RivieraMonogram';
import NocturneWrapper from '@/components/programme/NocturneWrapper';
import NocturneMonogram from '@/components/programme/NocturneMonogram';
import RoseeWrapper from '@/components/programme/RoseeWrapper';
import RoseeMonogram from '@/components/programme/RoseeMonogram';
import EmeraudeWrapper from '@/components/programme/EmeraudeWrapper';
import EmeraudeMonogram from '@/components/programme/EmeraudeMonogram';
import PerleWrapper from '@/components/programme/PerleWrapper';
import PerleMonogram from '@/components/programme/PerleMonogram';
import DolceVitaWrapper from '@/components/programme/DolceVitaWrapper';
import DolceVitaMonogram from '@/components/programme/DolceVitaMonogram';
import AuroreWrapper from '@/components/programme/AuroreWrapper';
import AuroreMonogram from '@/components/programme/AuroreMonogram';
import LunaWrapper from '@/components/programme/LunaWrapper';
import LunaMonogram from '@/components/programme/LunaMonogram';
import MineralWrapper from '@/components/programme/MineralWrapper';
import MineralMonogram from '@/components/programme/MineralMonogram';
import GivreWrapper from '@/components/programme/GivreWrapper';
import GivreMonogram from '@/components/programme/GivreMonogram';
import BorealWrapper from '@/components/programme/BorealWrapper';
import BorealMonogram from '@/components/programme/BorealMonogram';
import { matchLieuEvenement } from '@/lib/lieuEvenementMatch';

export default function ProgrammePublic() {
  const urlParams = new URLSearchParams(window.location.search);
  const token = urlParams.get('token');
  const [authState, setAuthState] = useState({ loading: true, user: null });

  // ── Load ProgrammeJourJ by token ─────────────────────────────────────────────
  const { data: programme, isLoading: progLoading } = useQuery({
    queryKey: ['programme-public', token],
    queryFn: async () => {
      const results = await base44.entities.ProgrammeJourJ.filter({ lien_universel_token: token });
      return results[0] || null;
    },
    enabled: !!token,
  });

  // ── Load Evenement ───────────────────────────────────────────────────────────
  const { data: evenement = null, isLoading: evtLoading } = useQuery({
    queryKey: ['evenement-programme-public', programme?.evenement_id],
    queryFn: () => base44.entities.Evenement.filter({ id: programme.evenement_id }).then(r => r[0] || null),
    enabled: !!programme?.evenement_id,
  });

  // ── Check auth ───────────────────────────────────────────────────────────────
  useEffect(() => {
    base44.auth.isAuthenticated().then(async (isAuth) => {
      if (isAuth) {
        try {
          const user = await base44.auth.me();
          setAuthState({ loading: false, user });
        } catch {
          setAuthState({ loading: false, user: null });
        }
      } else {
        setAuthState({ loading: false, user: null });
      }
    });
  }, []);

  // ── Loading ──────────────────────────────────────────────────────────────────
  if (!token) return <ErrorScreen message="Lien invalide. Vérifiez l'URL qui vous a été envoyée." />;
  if (progLoading || evtLoading || authState.loading) return <LoadingScreen />;
  if (!programme) return <ErrorScreen message="Programme introuvable. Ce lien est peut-être expiré ou incorrect." />;
  if (!evenement) return <ErrorScreen message="Événement introuvable." />;

  const theme = getTheme(programme.theme_id);

  // ── Non connecté → écran d'accroche ──────────────────────────────────────────
  if (!authState.user) {
    return <AccrocheScreen evenement={evenement} />;
  }

  // ── Connecté → programme complet filtré ──────────────────────────────────────
  return <ProgrammeConnecte programme={programme} evenement={evenement} user={authState.user} theme={theme} />;
}

// ═══════════════════════════════════════════════════════════════════════════════
// ÉCRAN D'ACCROCHE (non connecté)
// ═══════════════════════════════════════════════════════════════════════════════
function AccrocheScreen({ evenement }) {
  const currentUrl = window.location.pathname + window.location.search;
  const bgImage = evenement.photo_bandeau_url;

  return (
    <div style={{
      minHeight: '100vh',
      display: 'flex',
      alignItems: 'center',
      justifyContent: 'center',
      background: bgImage
        ? `linear-gradient(rgba(30,27,75,0.75), rgba(30,27,75,0.85)), url(${bgImage})`
        : 'linear-gradient(135deg, #1e1b4b 0%, #312e81 100%)',
      backgroundSize: 'cover',
      backgroundPosition: 'center',
    }}>
      <div className="text-center max-w-md px-6 py-12 text-white">
        <h1 className="text-3xl sm:text-4xl font-bold mb-2" style={{ fontFamily: "'Playfair Display', serif" }}>
          {evenement.nom}
        </h1>
        <div className="flex items-center justify-center gap-3 text-sm opacity-80 mt-3">
          <span>{evenement.type_evenement}</span>
          {evenement.date && (
            <>
              <span>•</span>
              <span>{format(parseISO(evenement.date), 'd MMMM yyyy', { locale: fr })}</span>
            </>
          )}
        </div>
        {evenement.lieu_nom && (
          <p className="text-sm opacity-60 mt-1 flex items-center justify-center gap-1">
            <MapPin size={12} /> {evenement.lieu_nom}
          </p>
        )}

        <div className="mt-10 space-y-4">
          <p className="text-base opacity-80 leading-relaxed">
            Créez votre espace invité gratuit pour découvrir le programme complet
          </p>
          <button
            onClick={() => window.location.href = `/register?profile=client&redirect=${encodeURIComponent('/espace-invite')}`}
            className="w-full py-3.5 rounded-2xl text-sm font-bold transition-all active:scale-[0.98]"
            style={{
              background: 'linear-gradient(135deg, #C5A059 0%, #A8862E 100%)',
              color: '#1e1b4b',
            }}
          >
            ✨ Créer mon compte
          </button>
          <p className="text-xs opacity-50">Gratuit · 30 secondes suffisent</p>
          <button
            onClick={() => base44.auth.redirectToLogin(currentUrl)}
            className="text-xs opacity-60 hover:opacity-90 underline transition-opacity"
          >
            Déjà un compte ? Se connecter
          </button>
        </div>
      </div>
    </div>
  );
}

// ═══════════════════════════════════════════════════════════════════════════════
// PROGRAMME CONNECTÉ (filtré selon les moments de l'invité)
// ═══════════════════════════════════════════════════════════════════════════════
function ProgrammeConnecte({ programme, evenement, user, theme }) {
  const blocs = programme.blocs_actifs || {};
  const Wrapper = theme.wrapper === 'nature' ? NatureWrapper : theme.wrapper === 'sienna' ? SiennaWrapper : theme.wrapper === 'boheme' ? BohemeWrapper : theme.wrapper === 'riviera' ? RivieraWrapper : theme.wrapper === 'nocturne' ? NocturneWrapper : theme.wrapper === 'rosee' ? RoseeWrapper : theme.wrapper === 'emeraude' ? EmeraudeWrapper : theme.wrapper === 'perle' ? PerleWrapper : theme.wrapper === 'dolce_vita' ? DolceVitaWrapper : theme.wrapper === 'aurore' ? AuroreWrapper : theme.wrapper === 'luna' ? LunaWrapper : theme.wrapper === 'mineral' ? MineralWrapper : theme.wrapper === 'givre' ? GivreWrapper : theme.wrapper === 'boreal' ? BorealWrapper : EleganceWrapper;
  const Monogram = theme.wrapper === 'nature' ? NatureMonogram : theme.wrapper === 'sienna' ? SiennaMonogram : theme.wrapper === 'boheme' ? BohemeMonogram : theme.wrapper === 'riviera' ? RivieraMonogram : theme.wrapper === 'nocturne' ? NocturneMonogram : theme.wrapper === 'rosee' ? RoseeMonogram : theme.wrapper === 'emeraude' ? EmeraudeMonogram : theme.wrapper === 'perle' ? PerleMonogram : theme.wrapper === 'dolce_vita' ? DolceVitaMonogram : theme.wrapper === 'aurore' ? AuroreMonogram : theme.wrapper === 'luna' ? LunaMonogram : theme.wrapper === 'mineral' ? MineralMonogram : theme.wrapper === 'givre' ? GivreMonogram : theme.wrapper === 'boreal' ? BorealMonogram : EleganceMonogram;

  // ── Find invite by email ──────────────────────────────────────────────────────
  const { data: invite = null } = useQuery({
    queryKey: ['invite-programme', programme.evenement_id, user.email],
    queryFn: async () => {
      if (!user.email) return null;
      const invites = await base44.entities.Invite.filter({
        evenement_id: programme.evenement_id,
        email: user.email,
      });
      return invites[0] || null;
    },
    enabled: !!user.email,
  });

  const inviteMoments = invite?.moments_ids || [];

  // ── Load etapes ──────────────────────────────────────────────────────────────
  const { data: allEtapes = [] } = useQuery({
    queryKey: ['etapes-public', programme.evenement_id],
    queryFn: () => base44.entities.EtapeProgramme.filter({ evenement_id: programme.evenement_id }),
    enabled: blocs.afficher_programme_detaille,
  });

  // Lieux typés associés (entité LieuEvenement — cérémonie, réception, etc.)
  const { data: lieuxEvenement = [] } = useQuery({
    queryKey: ['lieux-evenement-public', programme.evenement_id],
    queryFn: () => base44.entities.LieuEvenement.filter({ evenement_id: programme.evenement_id }),
  });

  const filteredEtapes = allEtapes.filter(e => {
    if (!e.moments_ids || e.moments_ids.length === 0) return true;
    if (inviteMoments.length === 0) return true;
    return e.moments_ids.some(m => inviteMoments.includes(m));
  }).sort((a, b) => (a.ordre || 0) - (b.ordre || 0));

  // ── Load moments ─────────────────────────────────────────────────────────────
  const { data: allMoments = [] } = useQuery({
    queryKey: ['moments-public', programme.evenement_id],
    queryFn: () => base44.entities.MomentEvenement.filter({ evenement_id: programme.evenement_id }),
    enabled: blocs.afficher_moments,
  });

  const filteredMoments = allMoments.filter(m => {
    if (inviteMoments.length === 0) return true;
    return inviteMoments.includes(m.id);
  }).sort((a, b) => (a.ordre || 0) - (b.ordre || 0));

  // ── Load prestataires ────────────────────────────────────────────────────────
  const prestataireIds = (programme.prestataires_affiches || []).map(p => p.prestataire_id);
  const { data: prestataires = [] } = useQuery({
    queryKey: ['prestataires-public', prestataireIds.join(',')],
    queryFn: async () => {
      const results = await Promise.all(
        prestataireIds.map(id => base44.entities.Prestataire.get(id).catch(() => null))
      );
      return results.filter(Boolean);
    },
    enabled: blocs.afficher_prestataires && prestataireIds.length > 0,
  });

  // Table de l'invité connecté (ou exemple fictif pour l'organisateur en prévisualisation)
  const inviteTableName = invite?.table_attribuee || (user?.role === 'admin' ? 'Table 7 (exemple)' : null);

  return (
    <div style={{ minHeight: '100vh', background: theme.pageBg, color: theme.text, border: theme.globalBorder || 'none', boxSizing: 'border-box' }}>
      <Wrapper theme={theme}>
        <div className={theme.premium ? "max-w-lg mx-auto px-5 py-5 space-y-6" : "max-w-lg mx-auto px-4 pt-20 pb-6 space-y-6"} style={{ position: 'relative', zIndex: 1, borderRadius: theme.premium ? 0 : '1.25rem', marginTop: theme.premium ? '14px' : 0 }}>

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
            {/* H1 = type d'événement, H2 = nom */}
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
        {blocs.afficher_programme_detaille && filteredEtapes.length > 0 && (
          <Section title="Programme de la journée" theme={theme}>
            {theme.premium ? (
              <div className="space-y-3">
                {filteredEtapes.map((etape) => (
                  <EtapeIconCard key={etape.id} etape={etape} theme={theme} lieuEvenement={matchLieuEvenement(etape, lieuxEvenement)} />
                ))}
              </div>
            ) : (
              <div className="space-y-1">
                {filteredEtapes.map((etape, idx) => (
                  <EtapeTimelineCard key={etape.id} etape={etape} theme={theme} isLast={idx === filteredEtapes.length - 1} lieuEvenement={matchLieuEvenement(etape, lieuxEvenement)} />
                ))}
              </div>
            )}
          </Section>
        )}

        {/* ── Plan de table (table de l'invité) ────────────────────────────────── */}
        {blocs.afficher_plan_de_table && inviteTableName && (
          <Section title="Votre table" theme={theme}>
            <div className="rounded-2xl p-4 flex items-center gap-3"
              style={{ background: theme.cardBg, border: `1px solid ${theme.cardBorder}`, borderRadius: theme.cardRadius || '1rem', boxShadow: theme.cardShadow || 'none' }}>
              <span className="text-2xl">🪑</span>
              <p className="font-semibold text-sm" style={{ color: theme.text }}>
                {inviteTableName}
              </p>
            </div>
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
        <ProgrammeIcsButton evenement={evenement} etapes={filteredEtapes} theme={theme} />

        {/* Footer */}
        <div className="text-center pt-4 pb-8">
          <p className="text-[10px]" style={{ color: theme.textMuted }}>
            Programme fourni par vos organisateurs · Alryck
          </p>
        </div>
        </div>
      </Wrapper>
    </div>
  );
}

// ═══════════════════════════════════════════════════════════════════════════════
// COMPOSANTS UTILITAIRES
// ═══════════════════════════════════════════════════════════════════════════════
function Section({ title, theme, children }) {
  return (
    <div className="space-y-3" style={{ borderTop: theme.sectionBorder || 'none', paddingTop: theme.sectionBorder ? '14px' : 0 }}>
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

function LoadingScreen() {
  return (
    <div className="min-h-screen flex items-center justify-center"
      style={{ background: 'linear-gradient(135deg, #1e1b4b 0%, #312e81 100%)' }}>
      <div className="text-center text-white space-y-4">
        <div className="w-12 h-12 border-4 border-white/30 border-t-white rounded-full animate-spin mx-auto" />
        <p className="text-white/70 text-sm">Chargement du programme…</p>
      </div>
    </div>
  );
}

function ErrorScreen({ message }) {
  return (
    <div className="min-h-screen flex items-center justify-center p-6"
      style={{ background: 'linear-gradient(135deg, #1e1b4b 0%, #312e81 100%)' }}>
      <div className="text-center max-w-sm bg-white/10 backdrop-blur rounded-3xl p-8 text-white">
        <div className="text-5xl mb-4">🔒</div>
        <h2 className="text-xl font-bold mb-2">Oups</h2>
        <p className="text-white/70 text-sm leading-relaxed">{message}</p>
      </div>
    </div>
  );
}