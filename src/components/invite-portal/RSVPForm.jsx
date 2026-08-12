/**
 * RSVPForm — Point d'entrée RSVP côté invité
 * Gère les 3 modes : Confirmé / Nominatif / Libre
 * Props: invite, evenement, organizerName, onDone, theme, isPremiumUnlocked
 */
import { useState } from 'react';
import { useQuery } from '@tanstack/react-query';
import { base44 } from '@/api/base44Client';
import { motion, AnimatePresence } from 'framer-motion';
import RSVPModeNominatif from './RSVPModeNominatif';
import RSVPModeLibre from './RSVPModeLibre';
import DeadlineAlert from '@/components/invites/DeadlineAlert';
import DeadlineBanner from './DeadlineBanner';
import { inviteThemeStyle, PremiumWrapper } from './useInviteTheme';
import CalendarAddButton from '@/components/shared/CalendarAddButton';

const EVENT_EMOJIS = {
  'Mariage': '💍', 'Anniversaire': '🎂', 'Gala': '🥂', 'Baptême': '🕊️',
  'Pacs': '💑', "Soirée d'entreprise": '🏢', 'Séminaire': '📊',
  'Cocktail': '🍸', 'Location': '🏡', 'Autre': '🎉',
};

const STATUT_LABEL = {
  'Confirmé': 'Présent·e',
  'Absent': 'Absent·e',
  'Peut-être': 'Je ne sais pas encore',
  'Partiel': 'Présence partielle',
};

function Countdown({ date, s }) {
  const now = new Date();
  const target = new Date(date + 'T12:00:00');
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

async function sendRSVPNotification(invite, statut, ancienStatut, nbAccomp, nomEvenement) {
  const nomInvite = `${invite.prenom} ${invite.nom}`;
  const estModification = ancienStatut && ancienStatut !== 'En attente' && ancienStatut !== statut;
  let titre, message;

  if (estModification) {
    titre = `📝 Réponse mise à jour — ${nomInvite}`;
    message = `${nomInvite} a modifié sa réponse.\nNouvelle réponse : ${STATUT_LABEL[statut] || statut}`;
  } else if (statut === 'Confirmé') {
    titre = `🎉 ${nomInvite} a confirmé sa présence`;
    message = nbAccomp > 0
      ? `${nomInvite} sera présent·e avec ${nbAccomp} accompagnant${nbAccomp > 1 ? 's' : ''}.`
      : `${nomInvite} sera présent·e à ${nomEvenement}.`;
  } else if (statut === 'Absent') {
    titre = `😔 ${nomInvite} ne pourra pas venir`;
    message = `${nomInvite} a indiqué qu'il/elle sera absent·e de ${nomEvenement}.`;
  } else {
    titre = `🤔 ${nomInvite} n'a pas encore répondu`;
    message = `${nomInvite} ne sait pas encore s'il/elle pourra venir à ${nomEvenement}.`;
  }

  await base44.entities.Notification.create({ titre, message, type: 'evenement', lu: false, lien: '/Evenements' });
}

export default function RSVPForm({ invite, evenement, organizerName, onDone, theme, isPremiumUnlocked }) {
  const ancienStatut = invite.statut_rsvp || 'En attente';
  const mode = invite.mode_invitation || 'Libre';
  const s = inviteThemeStyle(theme, isPremiumUnlocked);

  const dejaRepondu = ancienStatut !== 'En attente';

  // Multi-moments : présélectionner les moments déjà enregistrés ou tous par défaut
  const [momentsSel, setMomentsSel] = useState(invite.moments_ids || []);

  const [step, setStep] = useState(dejaRepondu ? 'done' : 'reponse');
  const [statut, setStatut] = useState(ancienStatut);
  const [saving, setSaving] = useState(false);
  const [saveError, setSaveError] = useState('');

  const { data: moment = null } = useQuery({
    queryKey: ['moment', invite.moment_id],
    queryFn: () => base44.entities.MomentEvenement.filter({ id: invite.moment_id }).then(r => r[0] || null),
    enabled: !!invite.moment_id,
    staleTime: 60000,
  });

  // Charger TOUTES les étapes de l'événement (toujours, pour la sélection côté invité)
  const { data: tousMoments = [] } = useQuery({
    queryKey: ['moments-event', invite.evenement_id],
    queryFn: () => base44.entities.MomentEvenement.filter({ evenement_id: invite.evenement_id }, 'ordre', 50),
    enabled: !!invite.evenement_id,
    staleTime: 60000,
  });

  // Étapes proposées = celles assignées à l'invitation, ou toutes si aucune restriction
  const momentsDispos = tousMoments
    .filter(m => !invite.moments_ids?.length || invite.moments_ids.includes(m.id))
    .sort((a, b) => (a.ordre ?? 0) - (b.ordre ?? 0));

  const hasMultiMoments = momentsDispos.length > 1;

  // Charger le groupe pour déterminer singulier/pluriel
  const { data: groupeInvites = [] } = useQuery({
    queryKey: ['groupe-size', invite.groupe_token],
    queryFn: () => base44.entities.Invite.filter({ groupe_token: invite.groupe_token }),
    enabled: !!invite.groupe_token,
    staleTime: 60000,
  });

  const isGroupe = invite.groupe_token && groupeInvites.length > 1;

  // Calcul des questions à afficher selon les étapes sélectionnées (union = chaque question une seule fois)
  const etapesSelectionnees = momentsDispos.filter(m => momentsSel.includes(m.id));

  const config = (() => {
    const mergeQuestionsCustom = (etapes) => {
      const seen = new Set();
      const result = [];
      etapes.forEach(m => {
        (m.config?.questions_custom || []).forEach(q => {
          if (q && q.trim() && !seen.has(q.trim())) {
            seen.add(q.trim());
            result.push(q.trim());
          }
        });
      });
      return result;
    };

    if (etapesSelectionnees.length > 0) {
      return {
        collect_allergenes:   etapesSelectionnees.some(m => m.config?.collect_allergenes ?? true),
        collect_hebergement:  etapesSelectionnees.some(m => m.config?.collect_hebergement ?? false),
        collect_message:      etapesSelectionnees.some(m => m.config?.collect_message ?? false),
        questions_custom:     mergeQuestionsCustom(etapesSelectionnees),
      };
    }
    if (momentsDispos.length > 0 && invite.moment_id && moment) {
      return {
        collect_allergenes:   moment.config?.collect_allergenes ?? true,
        collect_hebergement:  moment.config?.collect_hebergement ?? false,
        collect_message:      moment.config?.collect_message ?? false,
        questions_custom:     (moment.config?.questions_custom || []).filter(q => q && q.trim()),
      };
    }
    if (momentsDispos.length > 0) {
      return {
        collect_allergenes:   momentsDispos.some(m => m.config?.collect_allergenes ?? true),
        collect_hebergement:  momentsDispos.some(m => m.config?.collect_hebergement ?? false),
        collect_message:      momentsDispos.some(m => m.config?.collect_message ?? false),
        questions_custom:     mergeQuestionsCustom(momentsDispos),
      };
    }
    return {
      collect_allergenes:   true,
      collect_hebergement:  evenement?.hebergement_disponible === true,
      collect_message:      false,
      questions_custom:     [],
    };
  })();

  const nomEvenement = evenement?.nom || invite.evenement_nom || 'l\'événement';
  const typeEvenement = evenement?.type_evenement || '';
  const dateEvenement = invite.moment_id && moment?.date ? moment.date : evenement?.date;
  const emoji = EVENT_EMOJIS[typeEvenement] || '🎉';
  const messageInvitation = organizerName
    ? `Vous êtes invité·e par ${organizerName}`
    : `Vous êtes invité·e à ${nomEvenement || 'cet événement'}`;

  const EventHeader = () => (
    <div
      className="rounded-2xl p-6 text-center shadow-xl mb-6 overflow-hidden"
      style={{
        background: s.headerBg,
        color: s.text,
        border: isPremiumUnlocked ? 'none' : `1px solid ${s.cardBorder}`,
        boxShadow: isPremiumUnlocked ? 'none' : undefined,
      }}
    >
      {evenement?.photo_bandeau_url && (
        <div className="-mx-6 -mt-6 mb-4 h-40 overflow-hidden">
          <img src={evenement.photo_bandeau_url} alt={nomEvenement} className="w-full h-full object-cover" />
        </div>
      )}
      <div className="text-4xl mb-2">{emoji}</div>
      <p className="text-xs uppercase tracking-widest font-semibold mb-2" style={{ color: s.textMuted }}>
        {messageInvitation}
      </p>
      <h1 className="text-xl font-bold leading-tight" style={{ fontFamily: s.headingFont, color: s.text }}>
        {nomEvenement}
      </h1>
      {typeEvenement && <p className="text-sm mt-1" style={{ color: s.textMuted }}>{typeEvenement}</p>}
      {dateEvenement && (
        <p className="text-sm mt-2 font-medium" style={{ color: s.text }}>
          📅 {new Date(dateEvenement + 'T12:00:00').toLocaleDateString('fr-FR', {
            weekday: 'long', day: 'numeric', month: 'long', year: 'numeric'
          })}
        </p>
      )}
      {dateEvenement && <Countdown date={dateEvenement} s={s} />}
    </div>
  );

  const PageShell = ({ children }) => (
    <div className="min-h-screen" style={s.page}>
      {isPremiumUnlocked
        ? <PremiumWrapper theme={theme}><div className="px-5 pb-8">{children}</div></PremiumWrapper>
        : <div className="max-w-lg mx-auto px-4 py-6">{children}</div>}
    </div>
  );

  // Moments sélectionnés → noms
  const momentsSelsNoms = momentsDispos.filter(m => momentsSel.includes(m.id)).map(m => m.nom);

  // Sauvegarde commune pour les réponses simples (Absent / Peut-être)
  const handleSimpleSave = async (statutChoisi) => {
    setSaving(true);
    setSaveError('');
    try {
      await base44.entities.Invite.update(invite.id, {
        statut_rsvp: statutChoisi,
        present_principal: false,
        date_reponse: new Date().toISOString().split('T')[0],
        ...(hasMultiMoments ? { moments_ids: momentsSel, moments_noms: momentsSelsNoms } : {}),
      });
      sendRSVPNotification(invite, statutChoisi, ancienStatut, 0, nomEvenement).catch(() => {});
      setSaving(false);
      setStatut(statutChoisi);
      setStep('done');
      onDone?.();
    } catch (error) {
      console.log('Erreur RSVP:', error);
      setSaving(false);
      setSaveError('Une erreur est survenue. Veuillez réessayer.');
    }
  };

  // Sauvegarde après remplissage des détails (modes Confirmé/Nominatif/Libre)
  const handleDetailSave = async (extraData) => {
    setSaving(true);
    setSaveError('');

    try {
      if (extraData._groupeUpdates) {
        await Promise.all(extraData._groupeUpdates);
        const statutNominatif = extraData.statut_rsvp || 'Confirmé';
        await base44.entities.Invite.update(invite.id, {
          statut_rsvp: statutNominatif,
          date_reponse: new Date().toISOString().split('T')[0],
          allergenes: extraData.allergenes || [],
          regime_alimentaire: extraData.regime_alimentaire || '',
          besoin_hebergement: extraData.besoin_hebergement ?? false,
          message_organisateur: extraData.message_organisateur || '',
          reponses_custom: extraData.reponses_custom ?? null,
          ...(hasMultiMoments ? { moments_ids: momentsSel, moments_noms: momentsSelsNoms } : {}),
        });
        sendRSVPNotification(invite, statutNominatif, ancienStatut, 0, nomEvenement).catch(() => {});
        setSaving(false);
        setStatut(statutNominatif);
        setStep('done');
        onDone?.();
        return;
      }

      const updateData = { ...extraData };
      delete updateData._groupeUpdates;
      const statutFinal = updateData.statut_rsvp || 'Confirmé';

      await base44.entities.Invite.update(invite.id, {
        date_reponse: new Date().toISOString().split('T')[0],
        ...(hasMultiMoments ? { moments_ids: momentsSel, moments_noms: momentsSelsNoms } : {}),
        ...updateData,
      });
      sendRSVPNotification(invite, statutFinal, ancienStatut, 0, nomEvenement).catch(() => {});
      setSaving(false);
      setStatut(statutFinal);
      setStep('done');
      onDone?.();
    } catch (error) {
      console.log('Erreur RSVP:', error);
      setSaving(false);
      setSaveError('Une erreur est survenue. Veuillez réessayer.');
    }
  };

  const primaryBtnStyle = {
    background: s.btnBg,
    color: s.btnText,
    borderRadius: theme?.buttonRadius || '1rem',
  };

  // ── Écran résumé ──
  if (step === 'done') {
    const isConfirmed = statut === 'Confirmé' || statut === 'Partiel';
    const isAbsent = statut === 'Absent';
    return (
      <PageShell>
        <EventHeader />
        <motion.div
          initial={{ scale: 0.8, opacity: 0 }}
          animate={{ scale: 1, opacity: 1 }}
          transition={{ type: 'spring', stiffness: 200, damping: 15 }}
          className="w-full max-w-sm mx-auto text-center space-y-4"
        >
          <div className="text-5xl mb-2">
            {isConfirmed ? '🎉' : isAbsent ? '💌' : '🤔'}
          </div>
          <div className="rounded-2xl p-5 text-left space-y-2"
            style={{ background: s.cardBg, border: `1px solid ${s.cardBorder}` }}>
            <p className="text-xs font-semibold uppercase tracking-wide" style={{ color: s.textMuted }}>Votre réponse</p>
            <p className="text-base font-bold" style={{ color: s.text }}>
              {STATUT_LABEL[statut] || statut}
            </p>
          </div>
          <p className="text-sm leading-relaxed" style={{ color: s.textMuted }}>
            {isConfirmed
              ? 'Nous avons hâte de vous retrouver ! 🥂'
              : isAbsent
              ? 'Votre absence a bien été prise en compte. Vous nous manquerez. 💙'
              : statut === 'Partiel'
              ? 'Votre réponse a bien été enregistrée. 👍'
              : 'Vous pouvez mettre à jour votre réponse via ce lien à tout moment. 🌟'
            }
          </p>
          <button
            onClick={() => setStep('reponse')}
            className="text-sm underline underline-offset-2 py-2 transition-colors"
            style={{ color: s.accent }}
          >
            ✏️ Modifier ma réponse
          </button>
          {isConfirmed && evenement?.date && (
            <CalendarAddButton
              titre={nomEvenement}
              dateDebut={dateEvenement}
              lieu={evenement?.lieu_nom || null}
              heureDebut={evenement?.heure_debut || null}
              heureFin={evenement?.heure_fin || null}
            />
          )}
        </motion.div>
      </PageShell>
    );
  }

  // ── Étape sélection des moments ──
  if (step === 'moments') {
    return (
      <PageShell>
        <EventHeader />
        {invite.date_limite_reponse && <div className="mb-4"><DeadlineBanner dateLimit={invite.date_limite_reponse} /></div>}
        <div className="space-y-5">
          <div className="text-center mb-2">
            <div className="text-4xl mb-3">🗓️</div>
            <h2 className="text-lg font-bold" style={{ color: s.text }}>À quels temps forts serez-vous présent·e ?</h2>
            <p className="text-sm mt-1" style={{ color: s.textMuted }}>Sélectionnez les temps forts auxquels vous participerez.</p>
          </div>

          <div className="space-y-2">
            {momentsDispos.map(m => {
              const sel = momentsSel.includes(m.id);
              return (
                <button key={m.id} type="button"
                  onClick={() => setMomentsSel(prev =>
                    prev.includes(m.id) ? prev.filter(x => x !== m.id) : [...prev, m.id]
                  )}
                  className="w-full flex items-center gap-4 p-4 rounded-2xl border-2 text-left transition-all"
                  style={{
                    borderColor: sel ? s.accent : s.cardBorder,
                    background: sel ? s.accentBg : s.cardBg,
                  }}>
                  <div className="w-6 h-6 rounded-lg border-2 flex items-center justify-center shrink-0"
                    style={{ borderColor: sel ? s.accent : s.cardBorder, background: sel ? s.accent : s.inputBg }}>
                    {sel && <span className="text-xs font-bold" style={{ color: s.btnText }}>✓</span>}
                  </div>
                  <div>
                    <p className="font-semibold text-sm" style={{ color: s.text }}>{m.nom}</p>
                    {m.date && (
                      <p className="text-xs mt-0.5" style={{ color: s.textMuted }}>
                        📅 {new Date(m.date + 'T12:00:00').toLocaleDateString('fr-FR', { day: 'numeric', month: 'long' })}
                        {m.heure && ` · ${m.heure}`}
                      </p>
                    )}
                  </div>
                </button>
              );
            })}
          </div>

          <button
            onClick={() => {
              if (statut === 'Confirmé') {
                if (mode === 'Confirmé') {
                  handleDetailSave({});
                } else {
                  setStep('details');
                }
              } else {
                setStep('confirmer');
              }
            }}
            disabled={momentsSel.length === 0}
            className="w-full flex items-center justify-center gap-3 p-4 rounded-2xl font-bold text-base transition-all disabled:opacity-40"
            style={primaryBtnStyle}>
            Continuer →
          </button>
          <button type="button" onClick={() => setStep('reponse')}
            className="w-full py-3 text-sm transition-colors" style={{ color: s.textMuted }}>
            ← Revenir
          </button>
        </div>
      </PageShell>
    );
  }

  // ── Étape confirmation Absent/Peut-être ──
  if (step === 'confirmer') {
    return (
      <PageShell>
        <EventHeader />
        {invite.date_limite_reponse && <div className="mb-4"><DeadlineBanner dateLimit={invite.date_limite_reponse} /></div>}
        <div className="space-y-5">
          <div className="text-center mb-4">
            <div className="text-4xl mb-3">{statut === 'Absent' ? '😔' : '🤔'}</div>
            <h2 className="text-lg font-bold" style={{ color: s.text }}>Confirmez votre réponse</h2>
            <div className="mt-3 inline-block px-5 py-2 rounded-2xl text-sm font-semibold"
              style={{
                background: statut === 'Absent' ? '#f1f5f9' : '#fffbeb',
                color: statut === 'Absent' ? '#374151' : '#92400e',
              }}>
              {statut === 'Absent'
                ? (isGroupe ? '😔 Nous ne pourrons pas venir' : '😔 Je ne pourrai pas venir')
                : (isGroupe ? '🤔 Nous ne savons pas encore' : '🤔 Je ne sais pas encore')}
            </div>
            <p className="text-sm mt-3 leading-relaxed" style={{ color: s.textMuted }}>
              {statut === 'Absent'
                ? 'Vous nous manquerez. Nous gardons un bon souvenir de vous. 💙'
                : 'Pas de souci, vous pourrez répondre plus tard via ce lien. 🌟'}
            </p>
          </div>

          {saveError && (
            <p className="text-sm text-red-600 bg-red-50 border border-red-200 rounded-2xl px-4 py-3 text-center">
              ⚠️ {saveError}
            </p>
          )}

          <button
            onClick={() => handleSimpleSave(statut)}
            disabled={saving}
            className="w-full flex items-center justify-center gap-3 p-5 rounded-2xl font-bold text-base transition-all active:scale-[0.98] shadow-lg disabled:opacity-50"
            style={primaryBtnStyle}
          >
            {saving
              ? <div className="w-5 h-5 border-2 border-current border-t-transparent rounded-full animate-spin" />
              : '✅ Confirmer ma réponse'}
          </button>
          <button type="button" onClick={() => setStep('reponse')}
            className="w-full py-3 text-sm transition-colors" style={{ color: s.textMuted }}>
            ← Revenir au choix
          </button>
        </div>
      </PageShell>
    );
  }

  // ── Étape détails (présents) ──
  if (step === 'details') {
    return (
      <PageShell>
        <EventHeader />
        {mode === 'Nominatif' ? (
          <RSVPModeNominatif
            invite={invite}
            config={config}
            onSave={handleDetailSave}
            onBack={() => setStep('reponse')}
            saving={saving}
            saveError={saveError}
            dateLimit={invite.date_limite_reponse || null}
            theme={theme}
            isPremiumUnlocked={isPremiumUnlocked}
          />
        ) : (
          <RSVPModeLibre
            invite={invite}
            config={config}
            onSave={handleDetailSave}
            onBack={() => setStep('reponse')}
            saving={saving}
            saveError={saveError}
            dateLimit={invite.date_limite_reponse || null}
            theme={theme}
            isPremiumUnlocked={isPremiumUnlocked}
          />
        )}
      </PageShell>
    );
  }

  // ── Étape 1 — Choix de présence ──
  return (
    <PageShell>
      <EventHeader />

      {invite.date_limite_reponse && (
        <div className="mb-4">
          <DeadlineBanner dateLimit={invite.date_limite_reponse} />
        </div>
      )}

      <AnimatePresence mode="wait">
        <motion.div
          key="reponse"
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          exit={{ opacity: 0, y: -20 }}
          className="space-y-4"
        >
          <div className="text-center mb-6">
            <h2 className="text-xl font-bold" style={{ color: s.text }}>
              Bonjour {invite.prenom} ! 👋
            </h2>
            <p className="text-sm mt-1" style={{ color: s.textMuted }}>
              Serez-vous présent·e ?
            </p>
          </div>

          {/* Carte 1 — Présence */}
          <button
            onClick={() => {
              setStatut('Confirmé');
              if (hasMultiMoments) {
                setStep('moments');
              } else if (mode === 'Confirmé') {
                handleDetailSave({});
              } else {
                setStep('details');
              }
            }}
            className="w-full flex items-center gap-4 p-5 rounded-2xl border-2 border-emerald-200 bg-emerald-50 text-left transition-all active:scale-[0.98] hover:border-emerald-400 hover:bg-emerald-100"
          >
            <span className="text-3xl">🎉</span>
            <div>
              <p className="font-bold text-emerald-800 text-base">
                {isGroupe ? 'Nous serons présents !' : 'Je serai présent·e !'}
              </p>
              <p className="text-emerald-600 text-sm">Confirmer {isGroupe ? 'notre' : 'ma'} venue</p>
              {mode !== 'Confirmé' && (
                <p className="text-emerald-500 text-xs mt-0.5">Avec qui ?</p>
              )}
            </div>
          </button>

          {/* Carte 2 — Absent */}
          <button
            onClick={() => { setStatut('Absent'); if (hasMultiMoments) setStep('moments'); else setStep('confirmer'); }}
            className="w-full flex items-center gap-4 p-5 rounded-2xl border-2 border-slate-200 bg-slate-50 text-left transition-all active:scale-[0.98] hover:border-slate-300 hover:bg-slate-100"
          >
            <span className="text-3xl">😔</span>
            <div>
              <p className="font-bold text-slate-700 text-base">
                {isGroupe ? 'Nous ne pourrons pas venir' : 'Je ne pourrai pas venir'}
              </p>
              <p className="text-slate-500 text-sm">Décliner l'invitation</p>
            </div>
          </button>

          {/* Carte 3 — Peut-être */}
          <button
            onClick={() => { setStatut('Peut-être'); if (hasMultiMoments) setStep('moments'); else setStep('confirmer'); }}
            className="w-full flex items-center gap-4 p-5 rounded-2xl border-2 border-amber-200 bg-amber-50 text-left transition-all active:scale-[0.98] hover:border-amber-400 hover:bg-amber-100"
          >
            <span className="text-3xl">🤔</span>
            <div>
              <p className="font-bold text-amber-800 text-base">
                {isGroupe ? 'Nous ne savons pas encore' : 'Je ne sais pas encore'}
              </p>
              <p className="text-amber-600 text-sm">Je répondrai via ce lien plus tard</p>
            </div>
          </button>
        </motion.div>
      </AnimatePresence>
    </PageShell>
  );
}