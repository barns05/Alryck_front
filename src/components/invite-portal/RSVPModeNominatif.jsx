/**
 * RSVPModeNominatif — Architecture plate
 * Charge tous les invités du même groupe_token.
 * Toggle présent/absent pour chaque personne.
 * Met à jour chaque invité indépendamment.
 * Props: invite, config, onSave, onBack, saving, saveError, theme, isPremiumUnlocked
 */
import { useState } from 'react';
import { useQuery } from '@tanstack/react-query';
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

export default function RSVPModeNominatif({ invite, config, onSave, onBack, saving, saveError, dateLimit, theme, isPremiumUnlocked }) {
  const s = inviteThemeStyle(theme, isPremiumUnlocked);
  const [besoinHebergement, setBesoinHebergement] = useState(invite.besoin_hebergement || false);
  const [message, setMessage] = useState(invite.message_organisateur || '');
  const [reponsesCustom, setReponsesCustom] = useState(invite.reponses_custom || {});

  const questionsCustom = (config.questions_custom || []).filter(q => q && q.trim());
  const handleReponseCustom = (i, val) => setReponsesCustom(prev => ({ ...prev, [i]: val }));

  const { data: groupeInvites = [], isLoading } = useQuery({
    queryKey: ['groupe-invites', invite.groupe_token],
    queryFn: () => invite.groupe_token
      ? base44.entities.Invite.filter({ groupe_token: invite.groupe_token })
      : Promise.resolve([invite]),
    staleTime: 0,
  });

  const [etats, setEtats] = useState({});

  const personnes = (groupeInvites.length > 0 ? groupeInvites : [invite])
    .slice()
    .sort((a, b) => {
      const da = a.created_date ? new Date(a.created_date).getTime() : 0;
      const db = b.created_date ? new Date(b.created_date).getTime() : 0;
      return da - db;
    });

  const getEtat = (inv) => etats[inv.id] ?? {
    present: inv.statut_rsvp !== 'Absent',
    allergenes: inv.allergenes || [],
    regime_alimentaire: inv.regime_alimentaire || '',
  };

  const updateEtat = (id, field, value) => {
    setEtats(prev => ({ ...prev, [id]: { ...getEtat({ id, ...prev[id] }), [field]: value } }));
  };

  const toggleAllergene = (id, algId) => {
    const curr = getEtat({ id }).allergenes;
    updateEtat(id, 'allergenes', curr.includes(algId) ? curr.filter(a => a !== algId) : [...curr, algId]);
  };

  const handleSubmit = async () => {
    const updates = personnes.map(p => {
      const etat = getEtat(p);
      return base44.entities.Invite.update(p.id, {
        statut_rsvp: etat.present ? 'Confirmé' : 'Absent',
        allergenes: config.collect_allergenes ? etat.allergenes : p.allergenes || [],
        regime_alimentaire: config.collect_allergenes ? etat.regime_alimentaire : p.regime_alimentaire || '',
        date_reponse: new Date().toISOString().split('T')[0],
      });
    });

    const nbPresents = personnes.filter(p => getEtat(p).present).length;
    const statutGlobal = nbPresents === 0 ? 'Absent' : 'Confirmé';

    const referentEtat = getEtat(invite);
    const reponsesCustomFiltered = {};
    questionsCustom.forEach((_, i) => { if (reponsesCustom[i]?.trim()) reponsesCustomFiltered[i] = reponsesCustom[i].trim(); });

    onSave({
      allergenes: config.collect_allergenes ? referentEtat.allergenes : [],
      regime_alimentaire: config.collect_allergenes ? referentEtat.regime_alimentaire : '',
      besoin_hebergement: config.collect_hebergement ? besoinHebergement : false,
      message_organisateur: config.collect_message ? message : '',
      reponses_custom: questionsCustom.length > 0 ? reponsesCustomFiltered : null,
      statut_rsvp: statutGlobal,
      _groupeUpdates: updates,
    });
  };

  const totalPresents = personnes.filter(p => getEtat(p).present).length;
  const totalMembres = personnes.length;

  if (isLoading) {
    return (
      <div className="flex items-center justify-center py-8">
        <div className="w-6 h-6 border-2 rounded-full animate-spin" style={{ borderColor: s.cardBorder, borderTopColor: s.accent }} />
      </div>
    );
  }

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
          Indiquez qui parmi votre groupe sera là
        </p>
      </div>

      {personnes.map((p) => {
        const etat = getEtat(p);
        const isReferent = p.id === invite.id;
        return (
          <div key={p.id} className="rounded-2xl border p-4 space-y-3" style={cardStyle}>
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm font-bold" style={{ color: s.text }}>{p.prenom} {p.nom}</p>
                <p className="text-xs" style={{ color: s.textMuted }}>
                  {p.categorie === 'Mineur' ? `Mineur${p.age ? ` · ${p.age} ans` : ''}` : 'Adulte'}
                  {isReferent && <span className="ml-1" style={{ color: s.accent }}>· Vous</span>}
                </p>
              </div>
              <button type="button"
                onClick={() => updateEtat(p.id, 'present', !etat.present)}
                className="text-xs font-semibold px-3 py-1.5 rounded-full border-2 transition-colors"
                style={{
                  borderColor: etat.present ? '#16a34a' : '#be123c',
                  background: etat.present ? '#f0fdf4' : '#fff1f2',
                  color: etat.present ? '#16a34a' : '#be123c',
                }}>
                {etat.present ? '✅ Présent·e' : '❌ Absent·e'}
              </button>
            </div>
            {config.collect_allergenes && (
              <AllergenesToggle
                allergenes={etat.allergenes}
                onToggle={(algId) => toggleAllergene(p.id, algId)}
                regime={etat.regime_alimentaire}
                onRegimeChange={(v) => updateEtat(p.id, 'regime_alimentaire', v)}
                s={s}
              />
            )}
          </div>
        );
      })}

      <div className="text-center py-1">
        <p className="text-sm font-semibold" style={{ color: s.text }}>
          {totalPresents} présent{totalPresents > 1 ? 's' : ''} sur {totalMembres}
        </p>
      </div>

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

      {saveError && (
        <p className="text-sm text-red-600 bg-red-50 border border-red-200 rounded-2xl px-4 py-3 text-center">
          ⚠️ {saveError}
        </p>
      )}

      <div className="space-y-2 pb-10">
        <button onClick={handleSubmit} disabled={saving}
          className="w-full py-4 rounded-2xl font-bold text-base shadow-lg transition-all active:scale-[0.98] disabled:opacity-50"
          style={primaryBtn}>
          {saving ? (
            <span className="flex items-center justify-center gap-2">
              <div className="w-4 h-4 border-2 border-current border-t-transparent rounded-full animate-spin" />
              Envoi en cours…
            </span>
          ) : totalPresents === 0
            ? '😔 Confirmer notre absence'
            : totalPresents === totalMembres
            ? '✉️ Confirmer notre venue'
            : `✉️ Confirmer (${totalPresents}/${totalMembres} présent${totalPresents > 1 ? 's' : ''})`
          }
        </button>
        <button type="button" onClick={onBack}
          className="w-full py-3 text-sm transition-colors" style={{ color: s.textMuted }}>
          ← Modifier ma réponse
        </button>
      </div>
    </div>
  );
}