import { useState } from 'react';
import { base44 } from '@/api/base44Client';
import { Plus, Star, Clock, Check, X, Pencil, Trash2 } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { formatDuree } from '@/lib/programmeUtils';

const statutColors = {
  'En attente': 'bg-amber-100 text-amber-700',
  'Validé':     'bg-emerald-100 text-emerald-700',
  'Refusé':     'bg-red-100 text-red-600',
};

function MomentForm({ onSave, onCancel, initial = {} }) {
  const [form, setForm] = useState({
    intitule: initial.intitule || '',
    heure_souhaitee: initial.heure_souhaitee || '',
    duree_heures: initial.duree_heures ?? 0,
    duree_minutes: initial.duree_minutes ?? 15,
    note_organisateur: initial.note_organisateur || '',
  });
  const [saving, setSaving] = useState(false);

  const handleSave = async () => {
    if (!form.intitule.trim()) return;
    setSaving(true);
    await onSave(form);
    setSaving(false);
  };

  return (
    <div className="bg-amber-50 border border-amber-200 rounded-xl p-4 space-y-3">
      <p className="text-xs font-bold text-amber-800 flex items-center gap-1.5">
        <Star size={13} className="text-amber-500" /> Ajouter un moment personnel
      </p>
      <input
        value={form.intitule}
        onChange={e => setForm(f => ({ ...f, intitule: e.target.value }))}
        placeholder="Ex : Discours de mamie, Surprise pour les mariés..."
        className="w-full px-3 py-2 text-sm rounded-lg border border-amber-300 bg-white focus:outline-none focus:ring-1 focus:ring-amber-400"
      />
      <div className="flex gap-2">
        <div className="flex-1">
          <label className="text-xs text-muted-foreground mb-1 block">Heure souhaitée</label>
          <input
            type="time"
            value={form.heure_souhaitee}
            onChange={e => setForm(f => ({ ...f, heure_souhaitee: e.target.value }))}
            className="w-full px-3 py-2 text-sm rounded-lg border border-amber-300 bg-white focus:outline-none focus:ring-1 focus:ring-amber-400"
          />
        </div>
        <div className="flex-1">
          <label className="text-xs text-muted-foreground mb-1 block">Durée estimée</label>
          <div className="flex gap-1">
            <select
              value={form.duree_heures}
              onChange={e => setForm(f => ({ ...f, duree_heures: Number(e.target.value) }))}
              className="flex-1 px-2 py-2 text-sm rounded-lg border border-amber-300 bg-white focus:outline-none"
            >
              {[0,1,2,3].map(h => <option key={h} value={h}>{h}h</option>)}
            </select>
            <select
              value={form.duree_minutes}
              onChange={e => setForm(f => ({ ...f, duree_minutes: Number(e.target.value) }))}
              className="flex-1 px-2 py-2 text-sm rounded-lg border border-amber-300 bg-white focus:outline-none"
            >
              {[0,5,10,15,20,30,45].map(m => <option key={m} value={m}>{m}min</option>)}
            </select>
          </div>
        </div>
      </div>
      <textarea
        value={form.note_organisateur}
        onChange={e => setForm(f => ({ ...f, note_organisateur: e.target.value }))}
        placeholder="Note pour l'organisateur (optionnel)..."
        rows={2}
        className="w-full px-3 py-2 text-sm rounded-lg border border-amber-300 bg-white focus:outline-none focus:ring-1 focus:ring-amber-400 resize-none"
      />
      <div className="flex gap-2 pt-1">
        <Button
          size="sm"
          onClick={handleSave}
          disabled={saving || !form.intitule.trim()}
          className="flex-1 bg-amber-500 hover:bg-amber-600 text-white text-xs h-8 gap-1"
        >
          <Check size={13} /> {saving ? 'Envoi...' : 'Envoyer à l\'organisateur'}
        </Button>
        <Button size="sm" variant="outline" onClick={onCancel} className="text-xs h-8">
          Annuler
        </Button>
      </div>
    </div>
  );
}

export default function MomentPersonnelSection({ evenement, clientNom, moments = [], onRefresh }) {
  const [showForm, setShowForm] = useState(false);
  const [editingId, setEditingId] = useState(null);

  const handleAdd = async (form) => {
    await base44.entities.MomentPersonnel.create({
      evenement_id: evenement.id,
      evenement_nom: evenement.nom,
      client_nom: clientNom || '',
      ...form,
      statut: 'En attente',
    });
    // Notification admin
    try {
      const admins = await base44.entities.User?.list?.() || [];
      for (const admin of admins.filter(u => u.role === 'admin')) {
        await base44.entities.Notification.create({
          titre: `⭐ ${clientNom || 'Le client'} a ajouté un moment personnel`,
          message: `"${form.intitule}"${form.heure_souhaitee ? ` à ${form.heure_souhaitee}` : ''} · ${evenement.nom}`,
          type: 'programme',
          lu: false,
          user_email: admin.email,
          lien: `/clients/${evenement.client_id}`,
        });
      }
    } catch (_) {}
    setShowForm(false);
    onRefresh();
  };

  const handleEdit = async (id, form) => {
    await base44.entities.MomentPersonnel.update(id, form);
    setEditingId(null);
    onRefresh();
  };

  const handleDelete = async (id) => {
    await base44.entities.MomentPersonnel.delete(id);
    onRefresh();
  };

  // Le client ne peut modifier que ses propres moments non encore validés
  const clientMoments = moments.filter(m => m.statut !== 'Validé' || true); // afficher tous

  if (moments.length === 0 && !showForm) {
    return (
      <button
        onClick={() => setShowForm(true)}
        className="w-full flex items-center justify-center gap-2 py-2.5 mt-2 text-xs font-medium text-amber-600 hover:bg-amber-50 rounded-xl transition-colors border border-dashed border-amber-300"
      >
        <Plus size={13} /> Ajouter un moment personnel
      </button>
    );
  }

  return (
    <div className="space-y-2 mt-3">
      {/* Moments existants */}
      {moments.map(m => {
        if (editingId === m.id) {
          return (
            <MomentForm
              key={m.id}
              initial={m}
              onSave={(form) => handleEdit(m.id, form)}
              onCancel={() => setEditingId(null)}
            />
          );
        }
        const canEdit = m.statut === 'En attente';
        return (
          <div key={m.id} className={`rounded-xl border px-3 py-2.5 space-y-1 text-sm ${
            m.statut === 'Validé' ? 'border-emerald-200 bg-emerald-50' :
            m.statut === 'Refusé' ? 'border-red-200 bg-red-50' :
            'border-amber-200 bg-amber-50'
          }`}>
            <div className="flex items-center justify-between gap-2">
              <div className="flex items-center gap-1.5 font-medium">
                <Star size={13} className="text-amber-500 shrink-0" />
                <span>{m.intitule}</span>
              </div>
              <div className="flex items-center gap-1.5 shrink-0">
                <span className={`text-[10px] px-2 py-0.5 rounded-full font-medium ${statutColors[m.statut]}`}>
                  {m.statut}
                </span>
                {canEdit && (
                  <>
                    <button onClick={() => setEditingId(m.id)} className="p-1 rounded hover:bg-white/60 text-muted-foreground">
                      <Pencil size={11} />
                    </button>
                    <button onClick={() => handleDelete(m.id)} className="p-1 rounded hover:bg-white/60 text-red-400">
                      <Trash2 size={11} />
                    </button>
                  </>
                )}
              </div>
            </div>
            <div className="flex flex-wrap gap-3 text-xs text-muted-foreground">
              {(m.heure_validee || m.heure_souhaitee) && (
                <span className="flex items-center gap-1">
                  <Clock size={11} />
                  {m.heure_validee ? `${m.heure_validee} (confirmé)` : `${m.heure_souhaitee} (souhaité)`}
                </span>
              )}
              {(m.duree_heures > 0 || m.duree_minutes > 0) && (
                <span>{formatDuree(m.duree_heures, m.duree_minutes)}</span>
              )}
            </div>
            {m.note_organisateur && (
              <p className="text-xs text-muted-foreground italic">{m.note_organisateur}</p>
            )}
            {m.message_refus && (
              <p className="text-xs text-red-600 bg-red-100 rounded-lg px-2 py-1.5 mt-1">
                💬 {m.message_refus}
              </p>
            )}
          </div>
        );
      })}

      {/* Formulaire ajout */}
      {showForm ? (
        <MomentForm onSave={handleAdd} onCancel={() => setShowForm(false)} />
      ) : (
        <button
          onClick={() => setShowForm(true)}
          className="w-full flex items-center justify-center gap-2 py-2 text-xs font-medium text-amber-600 hover:bg-amber-50 rounded-xl transition-colors border border-dashed border-amber-300"
        >
          <Plus size={13} /> Ajouter un moment personnel
        </button>
      )}
    </div>
  );
}