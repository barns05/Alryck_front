/**
 * RSVPModeLibre — Architecture plate
 * L'invité renseigne ses infos + ajoute des membres de son groupe.
 * Chaque membre devient un invité indépendant dans la base.
 * Props: invite, config, onSave, onBack, saving, saveError, theme, isPremiumUnlocked
 */
import { useState } from 'react';
import { AnimatePresence, motion } from 'framer-motion';
import { base44 } from '@/api/base44Client';
import DeadlineBanner from './DeadlineBanner';
import { inviteThemeStyle } from './useInviteTheme';

const ALLERGENES_OPTIONS = [
  { id: 'gluten', label: 'Gluten', emoji: '🌾' },
  { id: 'crustaces', label: 'Crustacés', emoji: '🦐' },
  { id: 'oeufs', label: 'Œufs', emoji: '🥚' },
  { id: 'poissons', label: 'Poissons', emoji: '🐟' },
  { id: 'arachides', label: 'Arachides', emoji: '🥜' },
  { id: 'soja', label: 'Soja', emoji: '🫘' },
  { id: 'lait', label: 'Lait', emoji: '🥛' },
  { id: 'fruits_coque', label: 'Fruits à coque', emoji: '🌰' },
  { id: 'celeri', label: 'Céleri', emoji: '🥬' },
  { id: 'moutarde', label: 'Moutarde', emoji: '🟡' },
  { id: 'sesame', label: 'Sésame', emoji: '✨' },
  { id: 'sulfites', label: 'Sulfites', emoji: '🍷' },
  { id: 'lupin', label: 'Lupin', emoji: '🌿' },
  { id: 'mollusques', label: 'Mollusques', emoji: '🦪' },
];

function genToken() {
  return Math.random().toString(36).slice(2, 12) + Date.now().toString(36);
}

function AllergenesToggle({ allergenes, onToggle, regime, onRegimeChange, s }) {
  const [open, setOpen] = useState(allergenes.length > 0 || !!regime);
  return (
    <div className="mt-2">
      <button type="button" onClick={() => setOpen(v => !v)}
        className="flex items-center gap-2 text-xs transition-colors" style={{ color: s.textMuted }}>
        <span className={`w-4 h-4 rounded border-2 flex items-center justify-center transition-colors ${open ? 'bg-rose-500 border-rose-500' : 'border-gray-300'}`}>
          {open && <span className="text-white text-[10px]">✓</span>}
        </span>
        Restrictions alimentaires
      </button>
      <AnimatePresence initial={false}>
        {open && (
          <motion.div
            initial={{ height: 0, opacity: 0 }}
            animate={{ height: 'auto', opacity: 1 }}
            exit={{ height: 0, opacity: 0 }}
            transition={{ duration: 0.2 }}
            className="overflow-hidden mt-2"
          >
            <div className="flex flex-wrap gap-1.5">
              {ALLERGENES_OPTIONS.map(opt => (
                <button key={opt.id} type="button" onClick={() => onToggle(opt.id)}
                  className={`flex items-center gap-1 px-2.5 py-1 rounded-xl text-xs font-medium border-2 transition-all ${
                    allergenes.includes(opt.id) ? 'border-rose-400 bg-rose-50 text-rose-800' : 'border-slate-200 bg-white text-slate-600'
                  }`}>
                  <span>{opt.emoji}</span><span>{opt.label}</span>
                </button>
              ))}
            </div>
            <input type="text"
              placeholder="Régime : végétarien, vegan, halal…"
              value={regime}
              onChange={e => onRegimeChange(e.target.value)}
              style={{ fontSize: 16, borderColor: s.cardBorder, background: s.inputBg, color: s.inputText }}
              className="mt-2 w-full rounded-xl border px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-black/10"
            />
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  );
}

function CustomQuestionsFields({ questions, reponses, onReponse, s }) {
  if (!questions || questions.length === 0) return null;
  const validQuestions = questions.filter(q => q && q.trim());
  if (validQuestions.length === 0) return null;
  return (
    <div className="space-y-2 mt-3 pt-3 border-t" style={{ borderColor: s.cardBorder }}>
      <p className="text-[10px] font-semibold uppercase tracking-wide" style={{ color: s.textMuted }}>Questions de l'organisateur</p>
      {validQuestions.map((q, i) => (
        <div key={i}>
          <label className="text-xs font-medium block mb-1" style={{ color: s.text }}>{q}</label>
          <input
            type="text"
            value={reponses?.[i] || ''}
            onChange={e => onReponse(i, e.target.value)}
            placeholder="Votre réponse…"
            style={{ fontSize: 16, borderColor: s.cardBorder, background: s.inputBg, color: s.inputText }}
            className="w-full rounded-xl border px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-black/10"
          />
        </div>
      ))}
    </div>
  );
}

function MembreForm({ membre, index, onChange, onToggleAllergene, s }) {
  const isMineur = membre.categorie === 'Mineur';
  return (
    <div className="rounded-2xl border p-4 space-y-3" style={{ background: s.cardBg, borderColor: s.cardBorder, color: s.text }}>
      {index > 0 && (
        <p className="text-xs font-bold uppercase tracking-wide" style={{ color: s.text }}>
          {`Personne ${index + 1}`}
        </p>
      )}
      <div className="flex items-center justify-between mb-1">
        <div className="grid grid-cols-2 gap-2 flex-1 mr-3">
          <input type="text" placeholder="Prénom *" value={membre.prenom}
            onChange={e => onChange('prenom', e.target.value)}
            style={{ fontSize: 16, borderColor: s.cardBorder, background: s.inputBg, color: s.inputText }}
            className="w-full rounded-xl border px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-black/10"
          />
          <input type="text" placeholder="Nom *" value={membre.nom}
            onChange={e => onChange('nom', e.target.value)}
            style={{ fontSize: 16, borderColor: s.cardBorder, background: s.inputBg, color: s.inputText }}
            className="w-full rounded-xl border px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-black/10"
          />
        </div>
        <button type="button"
          onClick={() => onChange('present', !membre.present)}
          className="shrink-0 text-xs font-semibold px-3 py-2 rounded-full border-2 transition-colors"
          style={{
            borderColor: membre.present ? '#16a34a' : '#be123c',
            background: membre.present ? '#f0fdf4' : '#fff1f2',
            color: membre.present ? '#16a34a' : '#be123c',
          }}>
          {membre.present ? '✅ Présent·e' : '❌ Absent·e'}
        </button>
      </div>
      <div className="flex gap-2">
        {['Adulte', 'Mineur'].map(cat => (
          <button key={cat} type="button" onClick={() => onChange('categorie', cat)}
            className="flex-1 py-2 rounded-xl text-sm font-semibold border-2 transition-all"
            style={{
              borderColor: membre.categorie === cat ? s.accent : s.cardBorder,
              background: membre.categorie === cat ? s.accent : s.inputBg,
              color: membre.categorie === cat ? s.btnText : s.text,
            }}>
            {cat === 'Adulte' ? '👤 Adulte' : '👦 Mineur'}
          </button>
        ))}
      </div>
      {isMineur && (
        <div>
          <label className="text-[10px] font-semibold uppercase tracking-wide block mb-1" style={{ color: s.textMuted }}>
            Âge <span className="text-red-400">*</span>
          </label>
          <input type="number" placeholder="Âge en années" min={0} max={17}
            value={membre.age || ''}
            onChange={e => onChange('age', e.target.value ? parseInt(e.target.value) : '')}
            style={{ fontSize: 16, borderColor: s.cardBorder, background: s.inputBg, color: s.inputText }}
            className="w-full rounded-xl border px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-black/10"
          />
        </div>
      )}
      <AllergenesToggle
        allergenes={membre.allergenes || []}
        onToggle={onToggleAllergene}
        regime={membre.regime_alimentaire || ''}
        onRegimeChange={(v) => onChange('regime_alimentaire', v)}
        s={s}
      />
    </div>
  );
}

function newMembre() {
  return { prenom: '', nom: '', categorie: 'Adulte', age: '', allergenes: [], regime_alimentaire: '', present: true };
}

export default function RSVPModeLibre({ invite, config, onSave, onBack, saving, saveError, dateLimit, theme, isPremiumUnlocked }) {
  const s = inviteThemeStyle(theme, isPremiumUnlocked);
  const [membres, setMembres] = useState([
    { prenom: invite.prenom || '', nom: invite.nom || '', categorie: invite.categorie || 'Adulte', age: invite.age || '', allergenes: invite.allergenes || [], regime_alimentaire: invite.regime_alimentaire || '', present: true },
  ]);
  const [besoinHebergement, setBesoinHebergement] = useState(invite.besoin_hebergement || false);
  const [message, setMessage] = useState(invite.message_organisateur || '');
  const [reponsesCustom, setReponsesCustom] = useState(invite.reponses_custom || {});

  const questionsCustom = (config.questions_custom || []).filter(q => q && q.trim());
  const handleReponseCustom = (i, val) => setReponsesCustom(prev => ({ ...prev, [i]: val }));

  const updateMembre = (idx, field, value) => {
    setMembres(prev => {
      const next = [...prev];
      next[idx] = { ...next[idx], [field]: value };
      return next;
    });
  };

  const toggleAllergene = (idx, algId) => {
    setMembres(prev => {
      const next = [...prev];
      const curr = next[idx].allergenes || [];
      next[idx] = { ...next[idx], allergenes: curr.includes(algId) ? curr.filter(a => a !== algId) : [...curr, algId] };
      return next;
    });
  };

  const addMembre = () => setMembres(prev => [...prev, newMembre()]);
  const removeMembre = (idx) => setMembres(prev => prev.filter((_, i) => i !== idx));

  const validate = () => membres.every(m => m.prenom.trim() && m.nom.trim() && (m.categorie !== 'Mineur' || m.age !== ''));

  const handleSubmit = async () => {
    if (!validate()) return;

    const [referent, ...autres] = membres;

    const reponsesCustomFiltered = {};
    questionsCustom.forEach((_, i) => { if (reponsesCustom[i]?.trim()) reponsesCustomFiltered[i] = reponsesCustom[i].trim(); });

    const referentData = {
      categorie: referent.categorie,
      age: referent.categorie === 'Mineur' && referent.age !== '' ? Number(referent.age) : null,
      allergenes: config.collect_allergenes ? referent.allergenes : [],
      regime_alimentaire: config.collect_allergenes ? referent.regime_alimentaire : '',
      besoin_hebergement: config.collect_hebergement ? besoinHebergement : false,
      message_organisateur: config.collect_message ? message : '',
      reponses_custom: questionsCustom.length > 0 ? reponsesCustomFiltered : null,
      statut_rsvp: referent.present ? 'Confirmé' : 'Absent',
    };

    if (autres.length === 0) {
      onSave(referentData);
      return;
    }

    const groupeToken = invite.groupe_token || genToken();

    try {
      await Promise.all(autres.map(m => base44.entities.Invite.create({
        evenement_id: invite.evenement_id,
        evenement_nom: invite.evenement_nom,
        moment_id: invite.moment_id || null,
        moment_nom: invite.moment_nom || null,
        mode_invitation: invite.mode_invitation || 'Libre',
        prenom: m.prenom.trim(),
        nom: m.nom.trim(),
        categorie: m.categorie,
        age: m.categorie === 'Mineur' && m.age !== '' ? Number(m.age) : null,
        allergenes: config.collect_allergenes ? m.allergenes : [],
        regime_alimentaire: config.collect_allergenes ? m.regime_alimentaire : '',
        statut_rsvp: m.present ? 'Confirmé' : 'Absent',
        groupe_token: groupeToken,
        invite_referent_id: invite.id,
      })));
    } catch (err) {
      // La gestion d'erreur remonte via onSave qui a son propre try/catch dans RSVPForm
    }

    const tousMembres = membres;
    const nbPresents = tousMembres.filter(m => m.present).length;
    const statutGlobal = nbPresents === 0 ? 'Absent' : 'Confirmé';

    onSave({ ...referentData, statut_rsvp: statutGlobal, groupe_token: groupeToken });
  };

  const cardStyle = { background: s.cardBg, border: `1px solid ${s.cardBorder}`, color: s.text };
  const primaryBtn = { background: s.btnBg, color: s.btnText, borderRadius: theme?.buttonRadius || '1rem' };
  const inputStyle = { fontSize: 16, borderColor: s.cardBorder, background: s.inputBg, color: s.inputText };

  return (
    <div className="space-y-4">
      {dateLimit && <DeadlineBanner dateLimit={dateLimit} />}
      <div className="text-center mb-2">
        <div className="text-3xl mb-1">🎊</div>
        <h2 className="text-lg font-bold" style={{ color: s.text }}>Qui sera présent ?</h2>
        <p className="text-sm mt-1" style={{ color: s.textMuted }}>
          Indiquez les personnes de votre groupe et leur présence.
        </p>
      </div>

      {membres.map((m, i) => (
        <div key={i} className="relative">
          <MembreForm
            membre={m}
            index={i}
            onChange={(field, val) => updateMembre(i, field, val)}
            onToggleAllergene={(algId) => toggleAllergene(i, algId)}
            s={s}
          />
          {i > 0 && (
            <button type="button" onClick={() => removeMembre(i)}
              className="absolute top-3 right-3 text-xs transition-colors" style={{ color: s.textMuted }}>
              ✕ Retirer
            </button>
          )}
        </div>
      ))}

      <button type="button" onClick={addMembre}
        className="w-full py-3 rounded-2xl border-2 border-dashed text-sm font-semibold transition-colors"
        style={{ borderColor: s.accent, color: s.accent, background: 'transparent' }}>
        ➕ Ajouter une personne
      </button>

      {questionsCustom.length > 0 && (
        <div className="rounded-2xl border p-4" style={cardStyle}>
          <CustomQuestionsFields
            questions={questionsCustom}
            reponses={reponsesCustom}
            onReponse={handleReponseCustom}
            s={s}
          />
        </div>
      )}

      {config.collect_hebergement && (
        <div className="rounded-2xl border p-4" style={cardStyle}>
          <p className="text-sm font-semibold" style={{ color: s.text }}>🏨 Avez-vous besoin d'un hébergement ?</p>
          <div className="flex gap-2 mt-2">
            {[true, false].map(v => (
              <button key={String(v)} type="button"
                onClick={() => setBesoinHebergement(v)}
                className="flex-1 py-2 rounded-xl text-sm font-semibold border-2 transition-all"
                style={{
                  borderColor: besoinHebergement === v ? s.accent : s.cardBorder,
                  background: besoinHebergement === v ? s.accent : s.inputBg,
                  color: besoinHebergement === v ? s.btnText : s.text,
                }}>
                {v ? 'Oui' : 'Non'}
              </button>
            ))}
          </div>
        </div>
      )}

      {config.collect_message && (
        <div className="rounded-2xl border p-4" style={cardStyle}>
          <h3 className="font-semibold mb-2 text-sm" style={{ color: s.text }}>💌 Un message pour les organisateurs ?</h3>
          <textarea rows={2} placeholder="Optionnel…"
            value={message}
            onChange={e => setMessage(e.target.value)}
            style={{ ...inputStyle }}
            className="w-full rounded-xl border px-3 py-2 text-sm focus:outline-none resize-none focus:ring-2 focus:ring-black/10"
          />
        </div>
      )}

      {saveError && (
        <p className="text-sm text-red-600 bg-red-50 border border-red-200 rounded-2xl px-4 py-3 text-center">
          ⚠️ {saveError}
        </p>
      )}

      <div className="space-y-2 pb-10">
        <button onClick={handleSubmit} disabled={saving || !validate()}
          className="w-full py-4 rounded-2xl font-bold text-base shadow-lg transition-all active:scale-[0.98] disabled:opacity-50"
          style={primaryBtn}>
          {saving ? (
            <span className="flex items-center justify-center gap-2">
              <div className="w-4 h-4 border-2 border-current border-t-transparent rounded-full animate-spin" />
              Envoi en cours…
            </span>
          ) : membres.every(m => !m.present)
            ? '✅ Enregistrer nos réponses'
            : '✉️ Confirmer notre venue'}
        </button>
        <button type="button" onClick={onBack}
          className="w-full py-3 text-sm transition-colors" style={{ color: s.textMuted }}>
          ← Modifier ma réponse
        </button>
      </div>
    </div>
  );
}