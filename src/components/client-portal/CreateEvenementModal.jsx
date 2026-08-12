/**
 * CreateEvenementModal — Création d'un événement par le client depuis son portail.
 *
 * Formulaire minimal : Nom, Type, Date, Lieu (optionnel).
 * Pré-remplit client_id / client_nom / client_email / client_telephone / lien_client_token
 * depuis le client connecté, et marque l'événement cree_par_client = true.
 *
 * Props:
 *  - client        : entité Client résolue (doit contenir lien_client_token)
 *  - creating      : boolean (état de chargement piloté par le parent)
 *  - onClose       : fn
 *  - onSubmit      : async (payload) => createdEvent  (piloté par le parent)
 */
import { useState } from 'react';
import { X, Loader2 } from 'lucide-react';
import { normalizeEvenementDate } from '@/lib/evenementDate';

// Même liste que côté admin (EvenementModal.jsx).
const TYPES = ['Mariage', 'Baptême', 'Anniversaire', "Soirée d'entreprise", 'Cocktail', 'Gala', 'Autre'];

export default function CreateEvenementModal({ client, creating, onClose, onSubmit }) {
  const [form, setForm] = useState({ nom: '', type_evenement: '', date_type: 'exacte', date: '', date_periode: '', date_mois: '', lieu_nom: '' });
  const [error, setError] = useState('');

  const set = (k, v) => setForm(f => ({ ...f, [k]: v }));

  const handleSubmit = async (e) => {
    e.preventDefault();
    setError('');
    if (!form.nom.trim()) { setError('Veuillez saisir un nom d\'événement.'); return; }

    // Détermination du date_type réel selon le mode UI et les champs remplis.
    // Sous « Pas encore fixée » : periode prioritaire sur mois (le texte est plus précis),
    // mais le mois est conservé pour le calcul de la date technique.
    let realDateType;
    if (form.date_type === 'exacte') {
      if (!form.date) { setError('Veuillez saisir une date.'); return; }
      realDateType = 'exacte';
    } else {
      const hasPeriode = form.date_periode.trim().length > 0;
      const hasMois = !!form.date_mois;
      if (!hasPeriode && !hasMois) {
        setError('Veuillez préciser une période ou un mois approximatif.'); return;
      }
      realDateType = hasPeriode ? 'periode' : 'mois';
    }

    // Date technique de fallback pour un nouvel événement en mode periode sans mois
    // (pas de date existante à conserver — la date n'est jamais affichée telle quelle).
    const todayStr = new Date().toISOString().split('T')[0];
    const normalized = normalizeEvenementDate({
      date_type: realDateType,
      date: form.date || todayStr,
      date_mois: form.date_mois || null,
      date_periode: form.date_periode.trim() || null,
    });

    if (!normalized.date) {
      setError('Impossible de déterminer la date de l\'événement.'); return;
    }

    const clientNom = `${client?.prenom || ''} ${client?.nom || ''}`.trim()
      + (client?.prenom2 ? ' & ' + client.prenom2 + ' ' + (client.nom2 || client.nom) : '');

    const payload = {
      nom: form.nom.trim(),
      type_evenement: form.type_evenement || 'Autre',
      date: normalized.date,
      date_type: normalized.date_type,
      date_mois: normalized.date_mois || undefined,
      date_periode: normalized.date_periode || undefined,
      lieu_nom: form.lieu_nom.trim() || undefined,
      client_id: client?.id || undefined,
      client_nom: clientNom || undefined,
      client_email: client?.email || undefined,
      client_telephone: client?.telephone || undefined,
      lien_client_token: client?.lien_client_token || undefined,
      couleur_theme: client?.couleur_theme || undefined,
      statut: 'En attente',
      cree_par_client: true,
    };

    try {
      await onSubmit(payload);
    } catch (err) {
      setError(err?.message || 'Une erreur est survenue lors de la création.');
    }
  };

  return (
    <div
      className="fixed inset-0 z-[200] flex items-end sm:items-center justify-center bg-black/50 p-0 sm:p-4 overflow-x-hidden"
      onClick={onClose}
    >
      <div
        className="relative w-full max-w-md max-w-[100vw] box-border bg-white rounded-t-3xl sm:rounded-2xl shadow-2xl flex flex-col overflow-hidden"
        style={{ maxHeight: '92vh' }}
        onClick={e => e.stopPropagation()}
      >
        {/* Header */}
        <div
          className="flex items-center justify-between px-5 pt-5 pb-3 border-b shrink-0"
          style={{ borderColor: '#f1f5f9' }}
        >
          <div>
            <h3 className="font-bold text-base" style={{ color: '#1e1b4b' }}>✨ Créer un nouvel événement</h3>
            <p className="text-xs text-gray-400 mt-0.5">Ajoutez un événement à votre espace.</p>
          </div>
          <button onClick={onClose} className="text-gray-400 hover:text-gray-600">
            <X size={20} />
          </button>
        </div>

        {/* Corps */}
        <form onSubmit={handleSubmit} className="overflow-y-auto overflow-x-hidden flex-1 px-5 py-4 space-y-4 w-full box-border">
          {/* Nom */}
          <div className="space-y-1.5">
            <label className="text-sm font-medium" style={{ color: '#1e1b4b' }}>Nom de l'événement *</label>
            <input
              value={form.nom}
              onChange={e => set('nom', e.target.value)}
              placeholder="Ex : Mariage Dubois"
              className="w-full rounded-xl border px-3 py-2.5 text-[16px] focus:outline-none focus:ring-2 focus:ring-[#1e1b4b]/30"
              style={{ borderColor: '#e2e8f0' }}
              autoFocus
            />
          </div>

          {/* Type */}
          <div className="space-y-1.5">
            <label className="text-sm font-medium" style={{ color: '#1e1b4b' }}>Type d'événement</label>
            <select
              value={form.type_evenement}
              onChange={e => set('type_evenement', e.target.value)}
              className="w-full rounded-xl border px-3 py-2.5 text-[16px] focus:outline-none focus:ring-2 focus:ring-[#1e1b4b]/30 bg-white"
              style={{ borderColor: '#e2e8f0' }}
            >
              <option value="">— Sélectionner —</option>
              {TYPES.map(t => <option key={t} value={t}>{t}</option>)}
            </select>
          </div>

          {/* Date — mode de saisie */}
          <div className="space-y-1.5">
            <label className="text-sm font-medium" style={{ color: '#1e1b4b' }}>
              {form.date_type === 'approximative' ? 'Période souhaitée *' : 'Date *'}
            </label>
            <div className="flex gap-2">
              {[
                { v: 'exacte', label: 'Date précise' },
                { v: 'approximative', label: 'Pas encore fixée' },
              ].map(opt => (
                <button
                  key={opt.v}
                  type="button"
                  onClick={() => set('date_type', opt.v)}
                  className={`flex-1 py-2 rounded-xl text-sm font-medium border transition-colors ${
                    form.date_type === opt.v ? 'text-white' : 'bg-white text-gray-500'
                  }`}
                  style={form.date_type === opt.v ? { background: '#1e1b4b', borderColor: '#1e1b4b' } : { borderColor: '#e2e8f0' }}
                >
                  {opt.label}
                </button>
              ))}
            </div>

            {form.date_type === 'exacte' ? (
              <input
                type="date"
                required
                value={form.date}
                onChange={e => set('date', e.target.value)}
                className="w-full rounded-xl border px-3 py-2.5 text-[16px] focus:outline-none focus:ring-2 focus:ring-[#1e1b4b]/30"
                style={{ borderColor: '#e2e8f0' }}
              />
            ) : (
              <div className="space-y-2">
                <input
                  value={form.date_periode}
                  onChange={e => set('date_periode', e.target.value)}
                  placeholder="Précisez votre période (ex : Été 2026)"
                  className="w-full rounded-xl border px-3 py-2.5 text-[16px] focus:outline-none focus:ring-2 focus:ring-[#1e1b4b]/30"
                  style={{ borderColor: '#e2e8f0' }}
                />
                <div className="flex items-center gap-2 my-1">
                  <span className="flex-1 h-px" style={{ background: '#e2e8f0' }} />
                  <span className="text-[11px] font-semibold uppercase tracking-wide text-gray-400">OU</span>
                  <span className="flex-1 h-px" style={{ background: '#e2e8f0' }} />
                </div>
                <div className="min-w-0">
                  <input
                    type="month"
                    value={form.date_mois}
                    onChange={e => set('date_mois', e.target.value)}
                    className="w-full rounded-xl border px-3 py-2.5 text-[16px] focus:outline-none focus:ring-2 focus:ring-[#1e1b4b]/30 bg-white"
                    style={{ borderColor: '#e2e8f0', boxSizing: 'border-box', maxWidth: '100%' }}
                  />
                  <p className="text-[11px] text-gray-400 mt-1">Mois approximatif — utilisé pour positionner votre événement dans le planning.</p>
                </div>
              </div>
            )}
          </div>

          {/* Lieu (optionnel) */}
          <div className="space-y-1.5">
            <label className="text-sm font-medium" style={{ color: '#1e1b4b' }}>
              Lieu <span className="text-xs text-gray-400">(optionnel)</span>
            </label>
            <input
              value={form.lieu_nom}
              onChange={e => set('lieu_nom', e.target.value)}
              placeholder="Ex : Salle des fêtes, ville…"
              className="w-full rounded-xl border px-3 py-2.5 text-[16px] focus:outline-none focus:ring-2 focus:ring-[#1e1b4b]/30"
              style={{ borderColor: '#e2e8f0' }}
            />
          </div>

          {error && (
            <p className="text-sm text-red-600 bg-red-50 rounded-lg px-3 py-2">{error}</p>
          )}

          {/* Actions — dans le flux du scroll (iOS-safe) */}
          <div className="modal-footer-full pt-2">
            <button
              type="button"
              onClick={onClose}
              className="w-full py-3 rounded-2xl border-2 text-sm font-semibold text-gray-500 mb-2"
              style={{ borderColor: '#e2e8f0' }}
            >
              Annuler
            </button>
            <button
              type="submit"
              disabled={creating}
              className="w-full py-3 rounded-2xl text-white text-sm font-semibold flex items-center justify-center gap-2 disabled:opacity-60"
              style={{ background: '#1e1b4b' }}
            >
              {creating
                ? <><Loader2 size={15} className="animate-spin" /> Création…</>
                : '✅ Créer l\'événement'}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
}