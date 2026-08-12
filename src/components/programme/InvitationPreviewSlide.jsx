/**
 * InvitationPreviewSlide — Aperçu STATIQUE de la carte d'invitation RSVP
 * pour un thème donné. Aucune query, aucune mutation, aucune donnée invité.
 *
 * Reproduit visuellement la mise en page de RSVPForm (étape « choix de présence »)
 * habillée avec le même PremiumWrapper + tokens (inviteThemeStyle) que le vrai
 * formulaire invité, mais sans aucune interactivité réelle :
 *   - nom de l'événement + compte à rebours (depuis evenement.date)
 *   - 3 cartes Présent·e / Absent·e / Peut-être (visuelles uniquement)
 *   - extrait factice de moments
 *   - champ allergènes désactivé
 *
 * Props: themeId, evenement
 */
import { format, parseISO } from 'date-fns';
import { fr } from 'date-fns/locale';
import { getTheme } from './programmeTheme';
import { inviteThemeStyle, PremiumWrapper } from '@/components/invite-portal/useInviteTheme';
import DecorativeSeparator from './DecorativeSeparator';

// Moments factices — purement illustratifs, aucun lien avec la base.
const FAKE_MOMENTS = [
  { nom: 'La cérémonie', heure: '15:00' },
  { nom: "Le vin d'honneur", heure: '17:00' },
  { nom: 'Le dîner', heure: '20:00' },
  { nom: 'La soirée dansante', heure: '22:30' },
];

const FAKE_ALLERGENES = [
  { id: 'gluten', label: 'Gluten', emoji: '🌾' },
  { id: 'lait', label: 'Lait', emoji: '🥛' },
  { id: 'fruits_coque', label: 'Fruits à coque', emoji: '🌰' },
  { id: 'poissons', label: 'Poissons', emoji: '🐟' },
];

function Countdown({ dateStr, s }) {
  if (!dateStr) return null;
  const now = new Date();
  const target = new Date(dateStr + 'T12:00:00');
  const diff = target - now;
  if (diff <= 0 || diff > 365 * 86400000) return null;
  const days = Math.floor(diff / (1000 * 60 * 60 * 24));
  return (
    <div className="text-center mt-3">
      <span className="inline-block rounded-xl px-4 py-1.5 text-sm font-semibold"
        style={{ background: s.accentBg, color: s.accent }}>
        ⏳ Dans {days} jour{days > 1 ? 's' : ''}
      </span>
    </div>
  );
}

export default function InvitationPreviewSlide({ themeId, evenement }) {
  const theme = getTheme(themeId);
  const s = inviteThemeStyle(theme, true);

  const eventName = evenement?.nom || 'Mariage de Camille & Antoine';
  const eventType = evenement?.type_evenement || 'Mariage';
  const eventDate = evenement?.date;

  const btnStyle = {
    background: s.btnBg,
    color: s.btnText,
    borderRadius: theme?.buttonRadius || '1rem',
  };

  return (
    <div style={{ background: theme.pageBg, color: theme.text, minHeight: '100%' }}>
      <div style={{ transform: 'scale(0.88)', transformOrigin: 'top center', marginTop: theme.premium ? 0 : 32, paddingBottom: 80 }}>
        <PremiumWrapper theme={theme}>
          <div
            className={theme.premium ? "max-w-lg mx-auto px-5 py-5 space-y-6" : "max-w-lg mx-auto px-4 pt-20 pb-6 space-y-6"}
            style={{
              position: 'relative',
              zIndex: 1,
              border: theme.premium ? 'none' : (theme.globalBorder || 'none'),
              borderRadius: theme.premium ? 0 : '1.25rem',
              boxSizing: 'border-box',
              marginTop: theme.premium ? '14px' : 0,
            }}
          >
            {/* ── En-tête événement ── */}
            <div className="text-center space-y-2 pt-4">
              {evenement?.photo_bandeau_url && (
                <div className="w-full h-48 relative overflow-hidden" style={{ borderRadius: theme.premium ? (theme.photoRadius || '28px') : '1.5rem', boxShadow: theme.premium ? 'inset 0 0 0 3px rgba(251,247,239,0.5)' : 'none' }}>
                  <img src={evenement.photo_bandeau_url} alt={eventName}
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
              <h1 className="text-sm font-medium uppercase"
                style={{
                  fontFamily: theme.headingFont || "'Playfair Display', serif",
                  color: theme.accent,
                  letterSpacing: '0.25em',
                }}>
                {eventType}
              </h1>
              <h2 className="text-2xl"
                style={{
                  fontFamily: theme.subHeadingFont || "'Cormorant Garamond', serif",
                  color: theme.text,
                  fontWeight: 600,
                  lineHeight: 1.2,
                }}>
                {eventName}
              </h2>
              {eventDate && (
                <p className="text-sm"
                  style={{
                    color: theme.textMuted,
                    fontFamily: theme.premium ? (theme.bodyFont || "'Lora', serif") : 'sans-serif',
                  }}>
                  {format(parseISO(eventDate), 'd MMMM yyyy', { locale: fr })}
                </p>
              )}
              <Countdown dateStr={eventDate} s={s} />
              {theme.premium && (
                <div className="mt-3">
                  <DecorativeSeparator theme={theme} />
                </div>
              )}
            </div>

            {/* ── Salutation + question ── */}
            <div className="text-center">
              <h3 className="text-xl font-bold" style={{ color: s.text }}>
                Bonjour Camille ! 👋
              </h3>
              <p className="text-sm mt-1" style={{ color: s.textMuted }}>
                Serez-vous présent·e ?
              </p>
            </div>

            {/* ── 3 cartes de présence (visuelles, non interactives) ── */}
            <div className="space-y-3" style={{ pointerEvents: 'none' }}>
              {/* Présent·e */}
              <div
                className="w-full flex items-center gap-4 p-5 rounded-2xl border-2 text-left"
                style={{ borderColor: '#a7f3d0', background: '#ecfdf5' }}
              >
                <span className="text-3xl">🎉</span>
                <div>
                  <p className="font-bold text-base" style={{ color: '#065f46' }}>Je serai présent·e !</p>
                  <p className="text-sm" style={{ color: '#059669' }}>Confirmer ma venue</p>
                  <p className="text-xs mt-0.5" style={{ color: '#10b981' }}>Avec qui ?</p>
                </div>
              </div>

              {/* Absent·e */}
              <div
                className="w-full flex items-center gap-4 p-5 rounded-2xl border-2 text-left"
                style={{ borderColor: '#e2e8f0', background: '#f8fafc' }}
              >
                <span className="text-3xl">😔</span>
                <div>
                  <p className="font-bold text-base" style={{ color: '#334155' }}>Je ne pourrai pas venir</p>
                  <p className="text-sm" style={{ color: '#64748b' }}>Décliner l'invitation</p>
                </div>
              </div>

              {/* Peut-être */}
              <div
                className="w-full flex items-center gap-4 p-5 rounded-2xl border-2 text-left"
                style={{ borderColor: '#fde68a', background: '#fffbeb' }}
              >
                <span className="text-3xl">🤔</span>
                <div>
                  <p className="font-bold text-base" style={{ color: '#92400e' }}>Je ne sais pas encore</p>
                  <p className="text-sm" style={{ color: '#b45309' }}>Je répondrai via ce lien plus tard</p>
                </div>
              </div>
            </div>

            {/* ── Extrait de moments (factice) ── */}
            <div className="space-y-2">
              {theme.premium && <DecorativeSeparator theme={theme} />}
              <p className="text-[11px] font-bold uppercase"
                style={{
                  color: theme.sectionTitle,
                  letterSpacing: theme.sectionTitleTracking || '0.1em',
                  textAlign: theme.premium ? 'center' : 'left',
                }}>
                Étapes de la journée
              </p>
              <div className="space-y-2">
                {FAKE_MOMENTS.map((m, i) => (
                  <div key={i}
                    className="flex items-center gap-3 p-3 rounded-2xl"
                    style={{
                      background: theme.cardBg,
                      border: `1px solid ${theme.cardBorder}`,
                      borderRadius: theme.cardRadius || '1rem',
                      boxShadow: theme.cardShadow || 'none',
                    }}>
                    <div className="w-9 h-9 rounded-full flex items-center justify-center shrink-0"
                      style={{ background: theme.accentBg }}>
                      <span className="text-xs font-bold" style={{ color: theme.accent }}>{m.heure}</span>
                    </div>
                    <p className="font-medium text-sm" style={{ color: theme.text }}>{m.nom}</p>
                  </div>
                ))}
              </div>
            </div>

            {/* ── Champ allergènes désactivé ── */}
            <div className="space-y-2">
              <p className="text-[11px] font-semibold uppercase tracking-wide" style={{ color: s.textMuted }}>
                Restrictions alimentaires
              </p>
              <div className="flex flex-wrap gap-1.5" style={{ pointerEvents: 'none' }}>
                {FAKE_ALLERGENES.map(opt => (
                  <span key={opt.id}
                    className="flex items-center gap-1 px-2.5 py-1 rounded-xl text-xs font-medium border-2"
                    style={{ borderColor: '#e2e8f0', background: '#ffffff', color: '#475569' }}>
                    <span>{opt.emoji}</span><span>{opt.label}</span>
                  </span>
                ))}
              </div>
              <input
                type="text"
                disabled
                placeholder="Régime : végétarien, vegan, halal…"
                style={{
                  fontSize: 16,
                  borderColor: s.cardBorder,
                  background: s.inputBg,
                  color: s.inputText,
                  opacity: 0.6,
                }}
                className="w-full rounded-xl border px-3 py-2 text-sm"
              />
            </div>

            {/* ── Bouton factice (non fonctionnel) ── */}
            <div
              className="w-full flex items-center justify-center gap-3 p-4 rounded-2xl font-bold text-base"
              style={{ ...btnStyle, opacity: 0.85 }}
            >
              ✅ Confirmer ma réponse
            </div>

            <p className="text-center text-[10px] pt-2" style={{ color: theme.textMuted }}>
              Aperçu de l'invitation · Alryck
            </p>
          </div>
        </PremiumWrapper>
      </div>
    </div>
  );
}