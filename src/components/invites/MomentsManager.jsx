/**
 * MomentsManager — Gestion des moments d'un événement
 * Props: evenementId, onClose
 */
import { useState } from 'react';
import { useQuery, useQueryClient } from '@tanstack/react-query';
import { base44 } from '@/api/base44Client';
import { X, Plus, AlertTriangle, Users } from 'lucide-react';
import MomentConfigCard from './MomentConfigCard';

const DEFAULT_CONFIG = {
  collect_allergenes: true,
  collect_hebergement: false,
  collect_message: false,
};

const DEFAULT_CONFIG_PRINCIPALE = {
  collect_allergenes: true,
  collect_hebergement: false,
  collect_message: false,
};

export default function MomentsManager({ evenementId, evenement, onClose }) {
  const qc = useQueryClient();
  const [saving, setSaving] = useState(false);
  const [creatingPrincipale, setCreatingPrincipale] = useState(false);
  const [confirmInfo, setConfirmInfo] = useState(null);

  const { data: moments = [], isLoading } = useQuery({
    queryKey: ['moments', evenementId],
    queryFn: () => base44.entities.MomentEvenement.filter({ evenement_id: evenementId }, 'ordre', 50),
    enabled: !!evenementId,
  });

  // Créer automatiquement l'étape principale si elle n'existe pas encore
  const principaleExiste = moments.some(m => m.is_principale);
  const [principaleCreee, setPrincipaleCreee] = useState(false);

  if (!isLoading && !principaleExiste && !principaleCreee && !creatingPrincipale && evenementId) {
    setCreatingPrincipale(true);
    const nomPrincipale = evenement?.nom || evenement?.type_evenement || 'Événement principal';
    base44.entities.MomentEvenement.create({
      evenement_id: evenementId,
      nom: nomPrincipale,
      ordre: 0,
      date: evenement?.date || null,
      heure: evenement?.heure_debut || null,
      lieu: evenement?.lieu_nom || null,
      is_principale: true,
      config: { ...DEFAULT_CONFIG_PRINCIPALE },
    }).then(() => {
      setPrincipaleCreee(true);
      setCreatingPrincipale(false);
      qc.invalidateQueries(['moments', evenementId]);
    });
  }

  // État local pour les modifications en cours
  const [localMoments, setLocalMoments] = useState(null);
  const displayed = localMoments ?? moments;

  const handleChange = (updated) => {
    setLocalMoments(prev => (prev ?? moments).map(m => m.id === updated.id ? updated : m));
  };

  const handleDelete = async (id) => {
    // Protéger le temps fort principal
    const moment = displayed.find(m => m.id === id);
    if (moment?.is_principale) return;
    setConfirmInfo({ id, loading: true, count: 0, momentName: moment?.nom || 'ce temps fort' });
    try {
      const invites = await base44.entities.Invite.filter({ evenement_id: evenementId }, null, 500);
      const responded = invites.filter(inv =>
        (inv.statut_rsvp && inv.statut_rsvp !== 'En attente') &&
        ((Array.isArray(inv.moments_ids) && inv.moments_ids.includes(id)) || inv.moment_id === id)
      );
      setConfirmInfo({ id, loading: false, count: responded.length, momentName: moment?.nom || 'ce temps fort' });
    } catch {
      setConfirmInfo({ id, loading: false, count: 0, momentName: moment?.nom || 'ce temps fort' });
    }
  };

  const performDelete = async (purgeResponses = false) => {
    const id = confirmInfo?.id;
    if (!id) return;
    setConfirmInfo(null);
    if (purgeResponses) {
      // Retirer ce temps fort des réponses des invités concernés
      const invites = await base44.entities.Invite.filter({ evenement_id: evenementId }, null, 500);
      const concerned = invites.filter(inv =>
        (Array.isArray(inv.moments_ids) && inv.moments_ids.includes(id)) || inv.moment_id === id
      );
      const updates = concerned.map(inv => {
        const ids = inv.moments_ids || [];
        const noms = inv.moments_noms || [];
        const keepIdx = ids.map((mid, i) => mid !== id ? i : -1).filter(i => i >= 0);
        const upd = {
          id: inv.id,
          moments_ids: keepIdx.map(i => ids[i]),
          moments_noms: keepIdx.map(i => noms[i]),
        };
        if (inv.moment_id === id) upd.moment_id = null;
        return upd;
      });
      if (updates.length) await base44.entities.Invite.bulkUpdate(updates);
      qc.invalidateQueries({ queryKey: ['invites'] });
    }
    await base44.entities.MomentEvenement.delete(id);
    qc.invalidateQueries(['moments', evenementId]);
    setLocalMoments(null);
  };

  const handleAdd = async () => {
    const newOrdre = displayed.length;
    await base44.entities.MomentEvenement.create({
      evenement_id: evenementId,
      nom: '',
      ordre: newOrdre,
      config: { ...DEFAULT_CONFIG },
    });
    qc.invalidateQueries(['moments', evenementId]);
    setLocalMoments(null);
  };

  const handleSaveAll = async () => {
    if (!localMoments) { onClose(); return; }
    setSaving(true);
    await Promise.all(
      localMoments.map(m => base44.entities.MomentEvenement.update(m.id, {
        nom: m.nom,
        date: m.date || null,
        heure: m.heure || null,
        ordre: m.ordre,
        config: m.config,
      }))
    );
    qc.invalidateQueries(['moments', evenementId]);
    setSaving(false);
    setLocalMoments(null);
    onClose();
  };

  return (
    <div className="fixed inset-0 z-[9999] flex items-end justify-center" onClick={onClose}>
      <div className="absolute inset-0 bg-black/50" />
      <div
        className="relative w-full max-w-lg rounded-t-3xl shadow-2xl flex flex-col"
        style={{ maxHeight: '92vh', backgroundColor: '#ffffff' }}
        onClick={e => e.stopPropagation()}
      >
        {/* Header */}
        <div className="flex items-center justify-between px-5 pt-5 pb-3 border-b shrink-0" style={{ borderColor: '#f1f5f9' }}>
          <div>
            <h3 className="font-bold text-base" style={{ color: '#1e1b4b' }}>🗓️ Temps forts de l'événement</h3>
            <p className="text-xs text-gray-400 mt-0.5">Définissez les temps forts proposés aux invités et les questions à leur poser.</p>
          </div>
          <button onClick={onClose} className="text-gray-400 hover:text-gray-600"><X size={20} /></button>
        </div>

        {/* Phrase d'aide */}
        <div className="px-4 pt-3 pb-0 shrink-0">
          <div className="flex items-start gap-2 bg-indigo-50 rounded-xl px-3 py-2.5">
            <span className="text-sm shrink-0">💡</span>
            <p className="text-xs text-indigo-700 leading-relaxed">
              Les invités recevront un seul lien. Ils pourront indiquer à quels temps forts ils seront présents.
            </p>
          </div>
        </div>

        <div className="overflow-y-auto flex-1 px-4 py-4 space-y-3">
          {isLoading ? (
            <div className="flex items-center justify-center py-8">
              <div className="w-6 h-6 border-2 border-purple-200 border-t-purple-600 rounded-full animate-spin" />
            </div>
          ) : displayed.length === 0 ? (
            <div className="text-center py-8 space-y-2">
              <p className="text-3xl">⏱️</p>
              <p className="text-sm text-gray-400">Aucun temps fort défini</p>
              <p className="text-xs text-gray-300">Ajoutez des temps forts pour personnaliser les invitations</p>
            </div>
          ) : (
            displayed
              .slice()
              .sort((a, b) => (a.ordre ?? 0) - (b.ordre ?? 0))
              .map(m => (
                <MomentConfigCard
                  key={m.id}
                  moment={m}
                  onChange={handleChange}
                  onDelete={handleDelete}
                />
              ))
          )}

          {/* Bouton ajouter */}
          <button
            onClick={handleAdd}
            className="w-full flex items-center justify-center gap-2 py-3 rounded-2xl text-sm font-semibold text-white transition-colors"
            style={{ background: '#1e1b4b' }}
          >
            <Plus size={15} /> Ajouter un temps fort
          </button>
        </div>

        {/* Footer */}
        <div className="px-5 pb-8 pt-3 border-t shrink-0 flex gap-3" style={{ borderColor: '#f1f5f9' }}>
          <button onClick={onClose} className="flex-1 py-3 rounded-2xl border-2 text-sm font-semibold text-gray-500"
            style={{ borderColor: '#e2e8f0' }}>
            Annuler
          </button>
          <button
            onClick={handleSaveAll}
            disabled={saving}
            className="flex-1 py-3 rounded-2xl text-white text-sm font-semibold disabled:opacity-40 flex items-center justify-center gap-2"
            style={{ background: '#1e1b4b' }}
          >
            {saving ? (
              <div className="w-4 h-4 border-2 border-white border-t-transparent rounded-full animate-spin" />
            ) : '✅ Enregistrer'}
          </button>
        </div>
      </div>

      {/* ── Confirmation suppression d'un temps fort ── */}
      {confirmInfo && (
        <div
          className="absolute inset-0 z-[10000] flex items-center justify-center p-6 bg-black/50"
          onClick={(e) => { e.stopPropagation(); setConfirmInfo(null); }}
        >
          <div
            className="w-full max-w-sm bg-white rounded-2xl shadow-2xl p-5 space-y-4"
            onClick={e => e.stopPropagation()}
          >
            {confirmInfo.loading ? (
              <div className="flex items-center justify-center py-6">
                <div className="w-6 h-6 border-2 border-purple-200 border-t-purple-600 rounded-full animate-spin" />
              </div>
            ) : confirmInfo.count > 0 ? (
              <>
                <div className="flex items-center gap-3">
                  <div className="w-10 h-10 rounded-full bg-red-50 flex items-center justify-center shrink-0">
                    <AlertTriangle size={20} className="text-red-500" />
                  </div>
                  <div>
                    <p className="font-bold text-base" style={{ color: '#1e1b4b' }}>Supprimer « {confirmInfo.momentName} » ?</p>
                    <p className="text-xs text-gray-500 mt-0.5 flex items-center gap-1">
                      <Users size={12} />
                      {confirmInfo.count} invité{confirmInfo.count > 1 ? 's' : ''} a déjà répondu à ce temps fort.
                    </p>
                  </div>
                </div>
                <div className="space-y-2">
                  <button
                    onClick={() => performDelete(false)}
                    className="w-full text-left p-3 rounded-2xl border-2 transition-colors"
                    style={{ borderColor: '#fcd34d', background: '#fffbeb' }}
                  >
                    <p className="text-sm font-semibold" style={{ color: '#92400e' }}>Conserver les réponses</p>
                    <p className="text-[11px] text-amber-600 mt-0.5">Supprimer le temps fort, les réponses restent en base (non rattachées).</p>
                  </button>
                  <button
                    onClick={() => performDelete(true)}
                    className="w-full text-left p-3 rounded-2xl border-2 transition-colors"
                    style={{ borderColor: '#fca5a5', background: '#fef2f2' }}
                  >
                    <p className="text-sm font-semibold text-red-600">Supprimer le temps fort et les réponses</p>
                    <p className="text-[11px] text-red-500 mt-0.5">Retire ce temps fort des réponses des invités concernés.</p>
                  </button>
                </div>
                <button
                  onClick={() => setConfirmInfo(null)}
                  className="w-full py-3 rounded-2xl border-2 text-sm font-semibold text-gray-500"
                  style={{ borderColor: '#e2e8f0' }}
                >
                  Annuler
                </button>
              </>
            ) : (
              <>
                <div className="flex items-center gap-3">
                  <div className="w-10 h-10 rounded-full bg-red-50 flex items-center justify-center shrink-0">
                    <AlertTriangle size={20} className="text-red-500" />
                  </div>
                  <div>
                    <p className="font-bold text-base" style={{ color: '#1e1b4b' }}>Supprimer « {confirmInfo.momentName} » ?</p>
                    <p className="text-xs text-gray-500 mt-0.5">Aucun invité n'a encore répondu à ce temps fort.</p>
                  </div>
                </div>
                <div className="flex gap-2">
                  <button
                    onClick={() => setConfirmInfo(null)}
                    className="flex-1 py-3 rounded-2xl border-2 text-sm font-semibold text-gray-500"
                    style={{ borderColor: '#e2e8f0' }}
                  >
                    Annuler
                  </button>
                  <button
                    onClick={() => performDelete(false)}
                    className="flex-1 py-3 rounded-2xl bg-red-600 text-white text-sm font-semibold"
                  >
                    Supprimer
                  </button>
                </div>
              </>
            )}
          </div>
        </div>
      )}
    </div>
  );
}