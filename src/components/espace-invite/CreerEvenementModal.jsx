import { useState } from 'react';
import { createPortal } from 'react-dom';
import { motion, AnimatePresence } from 'framer-motion';
import { X } from 'lucide-react';
import { base44 } from '@/api/base44Client';

const NAVY = '#1e1b4b';
const GOLD = '#c9a84c';

// La précision de date est explicite plutôt que devinée : un couple qui n'a pas encore
// arrêté son jour ne doit pas être forcé d'en inventer un, ce que l'ancien modèle imposait
// en stockant le 1er du mois à la place.
const PRECISIONS = [
  { value: 'Exact', label: 'Une date précise' },
  { value: 'Month', label: 'Un mois' },
  { value: 'Period', label: 'Une période' },
];

const inputCls =
  'w-full rounded-xl border border-gray-200 px-3 py-2.5 text-sm text-gray-800 ' +
  'placeholder:text-gray-300 focus:outline-none focus:ring-2 focus:ring-amber-300/60';
const labelCls = 'text-xs font-semibold text-gray-500';

export default function CreerEvenementModal({ open, onClose, onCreated }) {
  const [form, setForm] = useState({
    name: '',
    datePrecision: 'Exact',
    exactDate: '',
    monthOf: '',
    periodStart: '',
    periodEnd: '',
    guestCountAdults: '',
  });
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState(null);

  const set = (k, v) => setForm(f => ({ ...f, [k]: v }));

  const submit = async (e) => {
    e.preventDefault();
    setError(null);
    setSaving(true);

    // Le mois est saisi en « AAAA-MM » : le serveur attend une date, on prend le premier
    // jour — la précision déclarée dit déjà que le jour n'est pas signifiant.
    const payload = {
      name: form.name.trim(),
      datePrecision: form.datePrecision,
      exactDate: form.datePrecision === 'Exact' ? (form.exactDate || null) : null,
      monthOf: form.datePrecision === 'Month' && form.monthOf ? `${form.monthOf}-01` : null,
      periodStart: form.datePrecision === 'Period' ? (form.periodStart || null) : null,
      periodEnd: form.datePrecision === 'Period' ? (form.periodEnd || null) : null,
      guestCountAdults: form.guestCountAdults ? Number(form.guestCountAdults) : null,
    };

    try {
      onCreated?.(await base44.events.create(payload));
    } catch (err) {
      // Un dossier doit pointer un contact, et le titulaire est le sien. Les espaces créés
      // avant que cette fiche fasse partie du provisionnement n'en ont pas : on répare en
      // rappelant la création d'espace, qui est idempotente et réparatrice, puis on
      // recommence. Une seule fois — au-delà, l'erreur vient d'ailleurs et doit se voir.
      if (err?.code === 'event.contact_required') {
        try {
          await base44.tenants.createPersonal({});
          onCreated?.(await base44.events.create(payload));
          return;
        } catch (retryErr) {
          setError(retryErr?.payload?.message || retryErr?.message || "L'événement n'a pas pu être créé.");
          return;
        } finally {
          setSaving(false);
        }
      }
      setError(err?.payload?.message || err?.message || "L'événement n'a pas pu être créé.");
    } finally {
      setSaving(false);
    }
  };

  if (!open) return null;

  return createPortal(
    <AnimatePresence>
      <motion.div
        className="fixed inset-0 z-50 flex items-end sm:items-center justify-center"
        initial={{ opacity: 0 }}
        animate={{ opacity: 1 }}
        exit={{ opacity: 0 }}
      >
        <div className="absolute inset-0 bg-black/40" onClick={onClose} />

        <motion.form
          onSubmit={submit}
          initial={{ y: 40, opacity: 0 }}
          animate={{ y: 0, opacity: 1 }}
          exit={{ y: 40, opacity: 0 }}
          transition={{ type: 'spring', damping: 26, stiffness: 260 }}
          className="relative w-full sm:max-w-md bg-white rounded-t-3xl sm:rounded-3xl p-6 space-y-4 max-h-[90vh] overflow-y-auto"
        >
          <div className="flex items-start justify-between">
            <div>
              <h2 className="text-lg font-bold" style={{ color: NAVY }}>Votre événement</h2>
              <p className="text-xs text-gray-400 mt-0.5">
                Vous pourrez tout compléter ensuite — seul le nom est nécessaire pour commencer.
              </p>
            </div>
            <button type="button" onClick={onClose} className="text-gray-300 hover:text-gray-500 transition-colors">
              <X size={18} />
            </button>
          </div>

          <div className="space-y-1.5">
            <label className={labelCls}>Nom de l'événement *</label>
            <input
              required
              minLength={2}
              value={form.name}
              onChange={e => set('name', e.target.value)}
              placeholder="Ex : Mariage de Marie et Paul"
              className={inputCls}
            />
          </div>

          <div className="space-y-1.5">
            <label className={labelCls}>Vous connaissez…</label>
            <div className="grid grid-cols-3 gap-2">
              {PRECISIONS.map(p => (
                <button
                  key={p.value}
                  type="button"
                  onClick={() => set('datePrecision', p.value)}
                  className="rounded-xl px-2 py-2 text-xs font-medium transition-all"
                  style={form.datePrecision === p.value
                    ? { background: NAVY, color: 'white' }
                    : { background: '#f3f4f6', color: '#6b7280' }}
                >
                  {p.label}
                </button>
              ))}
            </div>
          </div>

          {form.datePrecision === 'Exact' && (
            <div className="space-y-1.5">
              <label className={labelCls}>Date</label>
              <input type="date" required value={form.exactDate}
                onChange={e => set('exactDate', e.target.value)} className={inputCls} />
            </div>
          )}

          {form.datePrecision === 'Month' && (
            <div className="space-y-1.5">
              <label className={labelCls}>Mois</label>
              <input type="month" required value={form.monthOf}
                onChange={e => set('monthOf', e.target.value)} className={inputCls} />
            </div>
          )}

          {form.datePrecision === 'Period' && (
            <div className="grid grid-cols-2 gap-3">
              <div className="space-y-1.5">
                <label className={labelCls}>Du</label>
                <input type="date" required value={form.periodStart}
                  onChange={e => set('periodStart', e.target.value)} className={inputCls} />
              </div>
              <div className="space-y-1.5">
                <label className={labelCls}>Au</label>
                <input type="date" required value={form.periodEnd}
                  onChange={e => set('periodEnd', e.target.value)} className={inputCls} />
              </div>
            </div>
          )}

          <div className="space-y-1.5">
            <label className={labelCls}>Nombre d'invités (estimation)</label>
            <input type="number" min={0} value={form.guestCountAdults}
              onChange={e => set('guestCountAdults', e.target.value)}
              placeholder="Ex : 120" className={inputCls} />
          </div>

          {error && (
            <p className="text-xs text-red-700 bg-red-50 border border-red-200 rounded-xl px-3 py-2">{error}</p>
          )}

          <button
            type="submit"
            disabled={saving}
            className="w-full py-3 rounded-2xl text-sm font-bold transition-all disabled:opacity-50"
            style={{ background: `linear-gradient(90deg, ${GOLD}, #e2c97e)`, color: '#1a2340' }}
          >
            {saving ? 'Création…' : 'Créer mon événement'}
          </button>
        </motion.form>
      </motion.div>
    </AnimatePresence>,
    document.body,
  );
}
