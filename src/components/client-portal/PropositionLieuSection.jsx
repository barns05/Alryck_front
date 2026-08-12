import { useState } from 'react';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { base44 } from '@/api/base44Client';
import { MapPin, ChevronDown, ChevronUp, Check, X, Clock } from 'lucide-react';

const TYPES = ['Cérémonie', 'Réception', 'Cocktail', 'Repas', 'Autre'];

/**
 * PropositionLieuSection — bandeau repliable côté client permettant de proposer
 * un lieu (jardin, domicile...) à l'admin pour validation. Affiche l'état des
 * propositions déjà faites par le client (en attente / validé / refusé).
 */
export default function PropositionLieuSection({ evenementId, clientId, clientNom, evenementNom }) {
  const qc = useQueryClient();
  const [open, setOpen] = useState(false);
  const [form, setForm] = useState({ lieu_nom: '', type: 'Réception', lieu_ville: '', lieu_lien_google_maps: '' });

  const { data: lieuxEvenement = [] } = useQuery({
    queryKey: ['lieux-evenement-client', evenementId],
    queryFn: () => base44.entities.LieuEvenement.filter({ evenement_id: evenementId }),
    enabled: !!evenementId,
  });

  const mesPropositions = lieuxEvenement.filter((le) => le.propose_par_client_id === clientId);

  const proposerMutation = useMutation({
    mutationFn: (data) =>
      base44.functions.invoke('proposerLieuClient', {
        evenement_id: evenementId,
        evenement_nom: evenementNom,
        client_id: clientId,
        client_nom: clientNom,
        ...data,
      }),
    onSuccess: () => {
      qc.invalidateQueries(['lieux-evenement-client', evenementId]);
      setForm({ lieu_nom: '', type: 'Réception', lieu_ville: '', lieu_lien_google_maps: '' });
      setOpen(false);
    },
  });

  const statutBadge = (le) => {
    const s = le.statut_validation || 'valide';
    if (s === 'propose_client') return { bg: '#fef3c7', color: '#b45309', label: 'En attente', Icon: Clock };
    if (s === 'valide') return { bg: '#f0fdf4', color: '#16a34a', label: 'Validé ✓', Icon: Check };
    if (s === 'refuse') return { bg: '#fff1f2', color: '#be123c', label: 'Refusé', Icon: X };
    return null;
  };

  return (
    <div className="mx-4 mt-3">
      {/* Bandeau repliable */}
      <button
        onClick={() => setOpen((o) => !o)}
        className="w-full flex items-center justify-between gap-2.5 px-3.5 py-2.5 rounded-xl border"
        style={{ borderColor: '#e8e4dc', background: '#faf8f4' }}
      >
        <div className="flex items-center gap-2.5 min-w-0">
          <MapPin size={14} className="shrink-0" style={{ color: '#1e1b4b' }} />
          <span className="text-[11px] font-medium leading-snug truncate" style={{ color: '#1e1b4b' }}>
            Proposer un lieu (jardin, domicile...)
            {mesPropositions.length > 0 && (
              <span className="text-gray-400"> · {mesPropositions.length} proposition{mesPropositions.length > 1 ? 's' : ''}</span>
            )}
          </span>
        </div>
        {open ? <ChevronUp size={14} className="shrink-0" style={{ color: '#9ca3af' }} /> : <ChevronDown size={14} className="shrink-0" style={{ color: '#9ca3af' }} />}
      </button>

      {/* Mes propositions existantes */}
      {mesPropositions.length > 0 && (
        <div className="mt-2 space-y-1.5">
          {mesPropositions.map((le) => {
            const b = statutBadge(le);
            const Icon = b?.Icon;
            return (
              <div key={le.id} className="flex items-start justify-between gap-2 px-3 py-2 rounded-lg border" style={{ borderColor: '#e8e4dc', background: '#fff' }}>
                <div className="flex-1 min-w-0">
                  <div className="flex items-center gap-2 flex-wrap">
                    <span className="text-sm font-medium truncate" style={{ color: '#1e1b4b' }}>{le.lieu_nom}</span>
                    {le.type && <span className="text-[10px] px-1.5 py-0.5 rounded-full bg-gray-100 text-gray-600">{le.type}</span>}
                    {b && (
                      <span className="text-[10px] font-semibold px-2 py-0.5 rounded-full flex items-center gap-1 shrink-0" style={{ background: b.bg, color: b.color }}>
                        {Icon && <Icon size={10} />}{b.label}
                      </span>
                    )}
                  </div>
                  {le.lieu_ville && <p className="text-xs text-gray-400 mt-0.5">📍 {le.lieu_ville}</p>}
                  {le.statut_validation === 'refuse' && le.motif_refus && (
                    <p className="text-xs mt-0.5" style={{ color: '#be123c' }}>Motif : {le.motif_refus}</p>
                  )}
                </div>
              </div>
            );
          })}
        </div>
      )}

      {/* Formulaire */}
      {open && (
        <div className="mt-2 p-4 rounded-xl border space-y-3" style={{ borderColor: '#e8e4dc', background: '#fff' }}>
          <div className="space-y-1">
            <label className="text-[11px] font-semibold text-gray-500">Nom du lieu *</label>
            <input
              value={form.lieu_nom}
              onChange={(e) => setForm({ ...form, lieu_nom: e.target.value })}
              placeholder="Jardin de mes parents..."
              className="w-full h-9 rounded-lg border px-3 text-sm"
              style={{ fontSize: 16, borderColor: '#e8e4dc' }}
            />
          </div>
          <div className="space-y-1">
            <label className="text-[11px] font-semibold text-gray-500">Type</label>
            <select
              value={form.type}
              onChange={(e) => setForm({ ...form, type: e.target.value })}
              className="w-full h-9 rounded-lg border px-3 text-sm"
              style={{ fontSize: 16, borderColor: '#e8e4dc' }}
            >
              {TYPES.map((t) => (
                <option key={t} value={t}>{t}</option>
              ))}
            </select>
          </div>
          <div className="space-y-1">
            <label className="text-[11px] font-semibold text-gray-500">Ville</label>
            <input
              value={form.lieu_ville}
              onChange={(e) => setForm({ ...form, lieu_ville: e.target.value })}
              placeholder="Aix-en-Provence"
              className="w-full h-9 rounded-lg border px-3 text-sm"
              style={{ fontSize: 16, borderColor: '#e8e4dc' }}
            />
          </div>
          <div className="space-y-1">
            <label className="text-[11px] font-semibold text-gray-500">Lien Google Maps (optionnel)</label>
            <input
              value={form.lieu_lien_google_maps}
              onChange={(e) => setForm({ ...form, lieu_lien_google_maps: e.target.value })}
              placeholder="https://maps.google.com/..."
              className="w-full h-9 rounded-lg border px-3 text-sm"
              style={{ fontSize: 16, borderColor: '#e8e4dc' }}
            />
          </div>
          <button
            onClick={() => proposerMutation.mutate(form)}
            disabled={!form.lieu_nom || proposerMutation.isPending}
            className="w-full h-10 rounded-xl text-sm font-semibold text-white transition-colors disabled:opacity-50"
            style={{ background: '#1e1b4b' }}
          >
            {proposerMutation.isPending ? 'Envoi...' : 'Envoyer ma proposition'}
          </button>
        </div>
      )}
    </div>
  );
}