/**
 * MomentConfigCard — Card d'un moment avec toggles de configuration
 * Props: moment, onChange, onDelete
 */
import { useState } from 'react';
import { Trash2, ChevronDown, Plus, X } from 'lucide-react';
import { motion, AnimatePresence } from 'framer-motion';



const MAX_CUSTOM_QUESTIONS = 3;

function CustomQuestionsEditor({ questions, onChange }) {
  const addQuestion = () => {
    if (questions.length >= MAX_CUSTOM_QUESTIONS) return;
    onChange([...questions, '']);
  };
  const updateQuestion = (i, val) => {
    const next = [...questions];
    next[i] = val;
    onChange(next);
  };
  const removeQuestion = (i) => {
    onChange(questions.filter((_, idx) => idx !== i));
  };

  return (
    <div className="space-y-2 pt-1 border-t" style={{ borderColor: '#f1f5f9' }}>
      <div className="flex items-center justify-between pt-2">
        <p className="text-[10px] font-semibold text-gray-400 uppercase tracking-wide">
          ➕ Questions personnalisées
        </p>
        <span className="text-[10px] text-gray-300">{questions.length}/{MAX_CUSTOM_QUESTIONS}</span>
      </div>

      <AnimatePresence initial={false}>
        {questions.map((q, i) => (
          <motion.div
            key={i}
            initial={{ opacity: 0, y: -6 }}
            animate={{ opacity: 1, y: 0 }}
            exit={{ opacity: 0, y: -6 }}
            transition={{ duration: 0.15 }}
            className="flex items-center gap-2"
          >
            <input
              type="text"
              value={q}
              onChange={e => updateQuestion(i, e.target.value)}
              placeholder={`Question ${i + 1} (ex : À quelle heure arrivez-vous ?)`}
              style={{ fontSize: 14, borderColor: '#e2e8f0' }}
              className="flex-1 rounded-xl border px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-indigo-200 bg-white"
            />
            <button
              type="button"
              onClick={() => removeQuestion(i)}
              className="w-7 h-7 flex items-center justify-center rounded-full text-gray-300 hover:text-red-400 hover:bg-red-50 transition-colors shrink-0"
            >
              <X size={14} />
            </button>
          </motion.div>
        ))}
      </AnimatePresence>

      {questions.length < MAX_CUSTOM_QUESTIONS && (
        <button
          type="button"
          onClick={addQuestion}
          className="flex items-center gap-1.5 text-xs font-semibold px-3 py-2 rounded-xl border-2 border-dashed transition-colors hover:bg-indigo-50 w-full justify-center"
          style={{ borderColor: '#c7d2fe', color: '#4338ca' }}
        >
          <Plus size={13} />
          Ajouter une question
        </button>
      )}
      {questions.length >= MAX_CUSTOM_QUESTIONS && (
        <p className="text-[10px] text-gray-400 text-center">Maximum {MAX_CUSTOM_QUESTIONS} questions personnalisées</p>
      )}
    </div>
  );
}

const TOGGLES = [
  { key: 'collect_allergenes',  label: 'Repas et restrictions alimentaires', emoji: '🌾', desc: 'Allergies, régimes particuliers ou préférences alimentaires.' },
  { key: 'collect_hebergement', label: 'Besoin d\'hébergement',              emoji: '🏨', desc: 'Logement ou hébergement à prévoir.' },
  { key: 'collect_message',     label: 'Message libre',                      emoji: '💌', desc: 'Message à l\'organisateur.' },
];

function Toggle({ on, onToggle }) {
  return (
    <button
      type="button"
      onClick={onToggle}
      className="relative flex-shrink-0"
      style={{
        width: 42, height: 24, borderRadius: 999,
        background: on ? '#1e1b4b' : '#e2e8f0',
        transition: 'background 0.2s',
      }}
    >
      <span style={{
        position: 'absolute', top: 3,
        left: on ? 21 : 3,
        width: 18, height: 18, borderRadius: '50%',
        background: 'white', transition: 'left 0.2s',
        boxShadow: '0 1px 3px rgba(0,0,0,0.2)',
      }} />
    </button>
  );
}

export default function MomentConfigCard({ moment, onChange, onDelete }) {
  const [expanded, setExpanded] = useState(true);
  const config = moment.config || {};
  const isPrincipale = !!moment.is_principale;

  const handleField = (field, value) => {
    onChange({ ...moment, [field]: value });
  };

  const handleConfig = (key, value) => {
    onChange({ ...moment, config: { ...config, [key]: value } });
  };

  return (
    <div className="bg-white rounded-2xl border shadow-sm overflow-hidden" style={{ borderColor: '#e8e4dc' }}>
      {/* Header */}
      <div className="flex items-center gap-3 px-4 py-3">
        <div className="flex-1 min-w-0">
          <div className="flex items-center gap-2">
            {isPrincipale && (
              <span className="shrink-0 text-[10px] font-bold px-2 py-0.5 rounded-full"
                style={{ background: '#eef2ff', color: '#4338ca' }}>
                ★ Principale
              </span>
            )}
          </div>
          <input
            type="text"
            value={moment.nom || ''}
            onChange={e => handleField('nom', e.target.value)}
            placeholder="Nom de l'étape (ex : Le dîner, La cérémonie…)"
            style={{ fontSize: 15, fontWeight: 600, color: '#1e1b4b', borderColor: 'transparent' }}
            className="w-full bg-transparent border-b-2 border-transparent focus:border-indigo-300 outline-none py-0.5 placeholder:text-gray-300 placeholder:font-normal"
          />
        </div>
        <button
          onClick={() => setExpanded(v => !v)}
          className="w-8 h-8 flex items-center justify-center text-gray-400 hover:text-gray-600 transition-colors"
        >
          <motion.div animate={{ rotate: expanded ? 180 : 0 }} transition={{ duration: 0.2 }}>
            <ChevronDown size={16} />
          </motion.div>
        </button>
        {isPrincipale ? (
          <div className="w-8 h-8 flex items-center justify-center text-gray-200" title="L'étape principale ne peut pas être supprimée">
            <Trash2 size={15} />
          </div>
        ) : (
          <button
            onClick={() => onDelete(moment.id)}
            className="w-8 h-8 flex items-center justify-center text-gray-300 hover:text-red-400 transition-colors"
          >
            <Trash2 size={15} />
          </button>
        )}
      </div>

      <AnimatePresence initial={false}>
        {expanded && (
          <motion.div
            initial={{ height: 0, opacity: 0 }}
            animate={{ height: 'auto', opacity: 1 }}
            exit={{ height: 0, opacity: 0 }}
            transition={{ duration: 0.2 }}
            className="overflow-hidden"
          >
            <div className="px-4 pb-4 space-y-3 border-t" style={{ borderColor: '#f1f5f9' }}>
              {/* Date + Heure */}
              <div className="flex gap-2 pt-3" style={{ alignItems: 'end' }}>
                {/* Date */}
                <div className="flex-1 min-w-0">
                  <label className="text-[10px] font-semibold text-gray-400 uppercase tracking-wide block mb-1">
                    {isPrincipale ? 'Date' : 'Date (opt.)'}
                  </label>
                  {isPrincipale ? (
                    <div
                      className="w-full rounded-xl border px-2 truncate"
                      style={{ fontSize: 13, borderColor: '#e8e4dc', background: '#f8f7f4', color: '#9ca3af', cursor: 'not-allowed', userSelect: 'none', height: 34, display: 'flex', alignItems: 'center' }}
                    >
                      {moment.date
                        ? new Date(moment.date + 'T12:00:00').toLocaleDateString('fr-FR', { day: 'numeric', month: 'long', year: 'numeric' })
                        : <span style={{ color: '#d1d5db' }}>Date de l'événement</span>}
                    </div>
                  ) : (
                    <div style={{ overflow: 'hidden', width: '100%' }}>
                      <input
                        type="date"
                        value={moment.date || ''}
                        onChange={e => handleField('date', e.target.value)}
                        style={{
                          fontSize: 13,
                          borderColor: '#e2e8f0',
                          color: '#1e1b4b',
                          display: 'block',
                          width: '100%',
                          minWidth: 0,
                          boxSizing: 'border-box',
                          height: 34,
                          WebkitAppearance: 'none',
                          appearance: 'none',
                        }}
                        className="rounded-xl border px-2 focus:outline-none focus:ring-2 focus:ring-indigo-200 bg-white"
                      />
                    </div>
                  )}
                </div>

                {/* Heure — masquée si vide, bouton sinon */}
                <div className="flex-1 min-w-0">
                  <label className="text-[10px] font-semibold text-gray-400 uppercase tracking-wide block mb-1">
                    Heure
                  </label>
                  {moment.heure ? (
                    <div style={{ display: 'flex', alignItems: 'center', gap: 4 }}>
                      <input
                        type="time"
                        value={moment.heure}
                        onChange={e => handleField('heure', e.target.value || '')}
                        style={{
                          fontSize: 13,
                          borderColor: '#e2e8f0',
                          color: '#1e1b4b',
                          width: '100%',
                          minWidth: 0,
                          boxSizing: 'border-box',
                          height: 34,
                          WebkitAppearance: 'none',
                          appearance: 'none',
                        }}
                        className="rounded-xl border px-2 focus:outline-none focus:ring-2 focus:ring-indigo-200 bg-white"
                      />
                      <button
                        type="button"
                        onClick={() => handleField('heure', '')}
                        className="shrink-0 text-gray-300 hover:text-red-400 transition-colors"
                        title="Supprimer l'heure"
                      >
                        <X size={13} />
                      </button>
                    </div>
                  ) : (
                    <button
                      type="button"
                      onClick={() => handleField('heure', '12:00')}
                      className="w-full flex items-center justify-center gap-1 rounded-xl border-2 border-dashed text-xs font-semibold transition-colors hover:bg-indigo-50"
                      style={{ borderColor: '#c7d2fe', color: '#6366f1', height: 34 }}
                    >
                      + Heure
                    </button>
                  )}
                </div>
              </div>

              {isPrincipale && (
                <p className="text-[10px] text-gray-300 -mt-1">
                  Cette date est définie par l'événement principal.
                </p>
              )}

              {/* Toggles configuration */}
              <div className="space-y-2 pt-1">
                <p className="text-[10px] font-semibold text-gray-400 uppercase tracking-wide">
                  Questions complémentaires
                </p>
                {TOGGLES.map(t => {
                  const defaultVal = t.key === 'collect_allergenes' ? true : false;
                  const isOn = config[t.key] !== undefined ? config[t.key] : defaultVal;
                  return (
                    <div key={t.key} className="flex items-center justify-between gap-3 py-1.5">
                      <div className="flex items-center gap-2 min-w-0">
                        <span className="text-base">{t.emoji}</span>
                        <div>
                          <p className="text-sm font-medium text-gray-700">{t.label}</p>
                          <p className="text-[10px] text-gray-400">{t.desc}</p>
                        </div>
                      </div>
                      <Toggle on={isOn} onToggle={() => handleConfig(t.key, !isOn)} />
                    </div>
                  );
                })}
              </div>

              {/* Questions personnalisées */}
              <CustomQuestionsEditor
                questions={config.questions_custom || []}
                onChange={qs => handleConfig('questions_custom', qs)}
              />
            </div>
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  );
}