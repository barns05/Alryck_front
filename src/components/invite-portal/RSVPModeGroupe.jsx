/**
 * RSVPModeGroupe — Formulaire d'entrée pour le Mode 4 "Lien de groupe"
 * L'invité saisit prénom + nom, puis le formulaire RSVP standard s'affiche.
 * Props: groupeLienToken, evenementId, evenementNom, evenement, onCreated, theme, isPremiumUnlocked
 */
import { useState } from 'react';
import { base44 } from '@/api/base44Client';
import { motion, AnimatePresence } from 'framer-motion';
import { inviteThemeStyle, PremiumWrapper } from './useInviteTheme';

const EVENT_EMOJIS = {
  'Mariage': '💍', 'Anniversaire': '🎂', 'Gala': '🥂', 'Baptême': '🕊️',
  'Pacs': '💑', "Soirée d'entreprise": '🏢', 'Séminaire': '📊',
  'Cocktail': '🍸', 'Location': '🏡', 'Autre': '🎉',
};

function genToken() {
  return Math.random().toString(36).slice(2, 12) + Date.now().toString(36);
}

export default function RSVPModeGroupe({ groupeLienToken, evenementId, evenementNom, evenement, onCreated, theme, isPremiumUnlocked }) {
  const s = inviteThemeStyle(theme, isPremiumUnlocked);
  const [prenom, setPrenom] = useState('');
  const [nom, setNom] = useState('');
  const [checking, setChecking] = useState(false);
  const [creating, setCreating] = useState(false);
  const [error, setError] = useState('');

  const [doublon, setDoublon] = useState(null);
  const [showDoublonConfirm, setShowDoublonConfirm] = useState(false);

  const typeEvenement = evenement?.type_evenement || '';
  const emoji = EVENT_EMOJIS[typeEvenement] || '🎉';
  const dateEvenement = evenement?.date;

  const handleSubmit = async () => {
    if (!prenom.trim() || !nom.trim()) return;
    setChecking(true);
    setError('');

    const existing = await base44.entities.Invite.filter({
      evenement_id: evenementId,
      prenom: prenom.trim(),
      nom: nom.trim(),
    });

    if (existing.length > 0) {
      setDoublon(existing[0]);
      setShowDoublonConfirm(true);
      setChecking(false);
      return;
    }

    await createInvite();
  };

  const createInvite = async () => {
    setCreating(true);
    const token = genToken();
    const created = await base44.entities.Invite.create({
      evenement_id: evenementId,
      evenement_nom: evenementNom || '',
      mode_invitation: 'Groupe',
      groupe_lien_token: groupeLienToken,
      prenom: prenom.trim(),
      nom: nom.trim(),
      statut_rsvp: 'En attente',
      lien_token: token,
    });
    setCreating(false);
    onCreated({ ...created, lien_token: token });
  };

  const handleDoublonUpdate = () => {
    setShowDoublonConfirm(false);
    onCreated(doublon);
  };

  const handleDoublonNew = async () => {
    setShowDoublonConfirm(false);
    await createInvite();
  };

  const cardStyle = { background: s.cardBg, border: `1px solid ${s.cardBorder}`, color: s.text };
  const primaryBtn = { background: s.btnBg, color: s.btnText, borderRadius: theme?.buttonRadius || '1rem' };
  const inputStyle = { fontSize: 16, borderColor: s.cardBorder, background: s.inputBg, color: s.inputText };

  const PageShell = ({ children }) => (
    <div className="min-h-screen" style={s.page}>
      {isPremiumUnlocked
        ? <PremiumWrapper theme={theme}><div className="px-5 pb-8">{children}</div></PremiumWrapper>
        : <div className="max-w-lg mx-auto px-4 py-6">{children}</div>}
    </div>
  );

  if (showDoublonConfirm && doublon) {
    return (
      <PageShell>
        <motion.div
          initial={{ scale: 0.9, opacity: 0 }}
          animate={{ scale: 1, opacity: 1 }}
          className="w-full max-w-sm mx-auto space-y-5 text-center"
        >
          <div className="text-4xl">🔍</div>
          <div className="rounded-2xl border-2 p-5 text-left space-y-2" style={{ borderColor: '#fde68a', background: s.cardBg, color: s.text }}>
            <p className="font-bold text-base">
              Une réponse existe déjà pour cette personne
            </p>
            <p className="text-sm leading-relaxed" style={{ color: s.textMuted }}>
              <strong>{doublon.prenom} {doublon.nom}</strong> a déjà répondu à cette invitation
              {doublon.statut_rsvp && doublon.statut_rsvp !== 'En attente'
                ? ` (statut : ${doublon.statut_rsvp})`
                : ''}.
            </p>
            <p className="text-sm font-medium" style={{ color: '#92400e' }}>
              Souhaitez-vous mettre à jour votre réponse ?
            </p>
          </div>

          <div className="space-y-2">
            <button onClick={handleDoublonUpdate}
              className="w-full py-4 rounded-2xl font-bold text-base shadow-lg transition-all active:scale-[0.98]"
              style={primaryBtn}>
              ✅ Oui, mettre à jour ma réponse
            </button>
            <button onClick={handleDoublonNew}
              className="w-full py-3 rounded-2xl border-2 text-sm font-semibold transition-colors"
              style={{ borderColor: s.cardBorder, color: s.textMuted, background: 'transparent' }}>
              Non, c'est une autre personne
            </button>
          </div>
        </motion.div>
      </PageShell>
    );
  }

  return (
    <PageShell>
      {/* Header événement */}
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
            <img src={evenement.photo_bandeau_url} alt={evenementNom || 'événement'} className="w-full h-full object-cover" />
          </div>
        )}
        <div className="text-4xl mb-2">{emoji}</div>
        <p className="text-xs uppercase tracking-widest font-semibold mb-2" style={{ color: s.textMuted }}>
          Vous êtes invité·e
        </p>
        <h1 className="text-xl font-bold leading-tight" style={{ fontFamily: s.headingFont }}>
          {evenementNom || 'à cet événement'}
        </h1>
        {typeEvenement && (
          <p className="text-sm mt-1" style={{ color: s.textMuted }}>{typeEvenement}</p>
        )}
        {dateEvenement && (
          <p className="text-sm mt-2 font-medium" style={{ color: s.text }}>
            📅 {new Date(dateEvenement + 'T12:00:00').toLocaleDateString('fr-FR', {
              weekday: 'long', day: 'numeric', month: 'long', year: 'numeric'
            })}
          </p>
        )}
      </div>

      <AnimatePresence mode="wait">
        <motion.div
          key="entry"
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          className="space-y-5"
        >
          <div className="text-center">
            <h2 className="text-xl font-bold" style={{ color: s.text }}>Qui êtes-vous ? 👋</h2>
            <p className="text-sm mt-1" style={{ color: s.textMuted }}>
              Saisissez votre prénom et votre nom pour accéder au formulaire
            </p>
          </div>

          <div className="space-y-3 rounded-2xl border p-5 shadow-sm" style={cardStyle}>
            <div>
              <label className="text-[10px] font-semibold uppercase tracking-wide block mb-1.5" style={{ color: s.textMuted }}>
                Prénom <span className="text-red-400">*</span>
              </label>
              <input
                type="text"
                placeholder="Marie"
                value={prenom}
                onChange={e => setPrenom(e.target.value)}
                style={inputStyle}
                className="w-full rounded-xl border px-4 py-3 text-base focus:outline-none focus:ring-2 focus:ring-black/10"
                autoComplete="given-name"
              />
            </div>
            <div>
              <label className="text-[10px] font-semibold uppercase tracking-wide block mb-1.5" style={{ color: s.textMuted }}>
                Nom <span className="text-red-400">*</span>
              </label>
              <input
                type="text"
                placeholder="Dupont"
                value={nom}
                onChange={e => setNom(e.target.value)}
                style={inputStyle}
                className="w-full rounded-xl border px-4 py-3 text-base focus:outline-none focus:ring-2 focus:ring-black/10"
                autoComplete="family-name"
                onKeyDown={e => e.key === 'Enter' && handleSubmit()}
              />
            </div>
          </div>

          {error && (
            <p className="text-sm text-red-600 bg-red-50 border border-red-200 rounded-2xl px-4 py-3 text-center">
              ⚠️ {error}
            </p>
          )}

          <button
            onClick={handleSubmit}
            disabled={checking || creating || !prenom.trim() || !nom.trim()}
            className="w-full py-4 rounded-2xl font-bold text-base shadow-lg transition-all active:scale-[0.98] disabled:opacity-50"
            style={primaryBtn}
          >
            {(checking || creating) ? (
              <span className="flex items-center justify-center gap-2">
                <div className="w-5 h-5 border-2 border-current border-t-transparent rounded-full animate-spin" />
                Vérification…
              </span>
            ) : 'Accéder à mon invitation →'}
          </button>
        </motion.div>
      </AnimatePresence>
    </PageShell>
  );
}