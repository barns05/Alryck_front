import { useState, useRef, useEffect, useMemo } from 'react';
import { useMutation, useQueryClient } from '@tanstack/react-query';
import { base44 } from '@/api/base44Client';
import { Plus, Pencil, Trash2, X, Check, ChevronDown, MoreVertical } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { toast } from 'sonner';
import DeleteConfirmModal from '@/components/ui/DeleteConfirmModal';

const TYPES_VEHICULE = ['Camionnette', 'Camion', 'Voiture', 'Remorque', 'Autre'];

function VehiculeMenu({ item, onEdit, onDelete }) {
  const [open, setOpen] = useState(false);
  const menuRef = useRef(null);

  useEffect(() => {
    const handleClickOutside = (e) => {
      if (menuRef.current && !menuRef.current.contains(e.target)) {
        setOpen(false);
      }
    };
    if (open) {
      document.addEventListener('mousedown', handleClickOutside);
      return () => document.removeEventListener('mousedown', handleClickOutside);
    }
  }, [open]);

  return (
    <div className="relative" ref={menuRef}>
      <button onClick={() => setOpen(!open)} className="p-1.5 rounded-lg hover:bg-muted text-muted-foreground hover:text-foreground shrink-0" title="Menu">
        <MoreVertical size={14} />
      </button>
      {open && (
        <div className="absolute right-0 top-full mt-1 bg-card border border-border rounded-lg shadow-lg z-50 min-w-[150px]">
          <button onClick={() => { onEdit(item); setOpen(false); }} className="w-full flex items-center gap-2 px-3 py-2 text-sm hover:bg-muted rounded-t-lg">
            <Pencil size={13} /> Modifier
          </button>
          <button onClick={() => { onDelete(item); setOpen(false); }} className="w-full flex items-center gap-2 px-3 py-2 text-sm text-destructive hover:bg-destructive/10 rounded-b-lg">
            <Trash2 size={13} /> Supprimer
          </button>
        </div>
      )}
    </div>
  );
}

function VehiculeForm({ vehicule, conducteurs, onSave, onCancel }) {
  const [form, setForm] = useState(vehicule || {});
  const set = (k, v) => setForm(f => ({ ...f, [k]: v }));

  return (
    <div className="bg-muted/30 border border-border rounded-xl p-4 space-y-3">
      <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
        <div>
          <label className="text-xs font-medium text-muted-foreground mb-1 block">Nom / Immatriculation *</label>
          <Input value={form.nom || ''} onChange={e => set('nom', e.target.value)} placeholder="ex: AB-123-CD" />
        </div>
        <div>
          <label className="text-xs font-medium text-muted-foreground mb-1 block">Type</label>
          <select value={form.type_vehicule || ''} onChange={e => set('type_vehicule', e.target.value)} className="flex h-9 w-full rounded-md border border-input bg-transparent px-3 text-sm">
            <option value="">— Sélectionner —</option>
            {TYPES_VEHICULE.map(t => <option key={t} value={t}>{t}</option>)}
          </select>
        </div>
        <div>
          <label className="text-xs font-medium text-muted-foreground mb-1 block">Capacité</label>
          <Input value={form.capacite || ''} onChange={e => set('capacite', e.target.value)} placeholder="ex: 20 m³ ou 1500 kg" />
        </div>
        <div className="md:col-span-1">
          <label className="text-xs font-medium text-muted-foreground mb-1 block">Chauffeur par défaut</label>
          <select value={form.chauffeur_id || ''} onChange={e => set('chauffeur_id', e.target.value)} className="flex h-9 w-full rounded-md border border-input bg-transparent px-3 text-sm">
            <option value="">— Aucun —</option>
            {conducteurs.map(c => <option key={c.id} value={c.id}>{c.nom}</option>)}
          </select>
        </div>
      </div>
      <div className="flex gap-2 justify-end pt-1 border-t border-border">
        <Button variant="outline" size="sm" onClick={onCancel}><X size={14} /> Annuler</Button>
        <Button size="sm" onClick={() => onSave(form)} disabled={!form.nom?.trim()}>
          <Check size={14} /> Enregistrer
        </Button>
      </div>
    </div>
  );
}

function VehiculeRow({ item, checked, onToggleCheck, onToggleActif, onEdit, onDelete }) {
  const actif = item.actif !== false;
  return (
    <div className="flex items-center gap-3 px-4 py-3 hover:bg-muted/30 transition-colors">
      <input
        type="checkbox"
        checked={checked}
        onChange={(e) => { e.stopPropagation(); onToggleCheck(); }}
        onClick={(e) => e.stopPropagation()}
        className="w-4 h-4 rounded accent-primary shrink-0"
      />
      <div className="flex-1 min-w-0">
        <p className="text-sm font-medium leading-snug">{item.nom}</p>
        <div className="flex flex-wrap gap-1.5 mt-0.5 text-xs text-muted-foreground">
          {item.type_vehicule && <span>{item.type_vehicule}</span>}
          {item.capacite && <span>· {item.capacite}</span>}
          {item.chauffeur_nom && <span>· 🚚 {item.chauffeur_nom}</span>}
        </div>
      </div>
      <button
        type="button"
        onClick={() => onToggleActif()}
        className={`relative inline-flex h-6 w-11 items-center rounded-full transition-colors shrink-0 ${actif ? 'bg-green-500' : 'bg-gray-300'}`}
        title={actif ? 'Actif' : 'Inactif'}
      >
        <span className={`inline-block h-4 w-4 transform rounded-full bg-white shadow transition-transform ${actif ? 'translate-x-6' : 'translate-x-1'}`} />
      </button>
      <VehiculeMenu item={item} onEdit={onEdit} onDelete={onDelete} />
    </div>
  );
}

export default function BlocLogistiqueVehicules({ vehicules, conducteurs, onCreateVehicule, onUpdateVehicule, onDeleteVehicule }) {
  const [open, setOpen] = useState(false);
  const [showForm, setShowForm] = useState(false);
  const [editing, setEditing] = useState(null);
  const [selected, setSelected] = useState(new Set());
  const [deleteModal, setDeleteModal] = useState(null);

  const createMutation = useMutation({
    mutationFn: d => onCreateVehicule(d),
    onSuccess: () => { setShowForm(false); toast.success('✓ Véhicule créé'); },
    onError: () => toast.error('❌ Une erreur est survenue'),
  });
  const updateMutation = useMutation({
    mutationFn: ({ id, data }) => onUpdateVehicule(id, data),
    onSuccess: () => { setEditing(null); toast.success('✓ Mis à jour'); },
    onError: () => toast.error('❌ Une erreur est survenue'),
  });
  const deleteMutation = useMutation({
    mutationFn: id => onDeleteVehicule(id),
    onSuccess: () => { setDeleteModal(null); setSelected(prev => { const s = new Set(prev); s.delete(deleteModal.id); return s; }); toast.success('✓ Supprimé'); },
    onError: () => toast.error('❌ Une erreur est survenue'),
  });
  const bulkDeleteMutation = useMutation({
    mutationFn: async (ids) => { for (const id of ids) await onDeleteVehicule(id); },
    onSuccess: () => { setSelected(new Set()); toast.success('✓ Véhicules supprimés'); },
    onError: () => toast.error('❌ Une erreur est survenue'),
  });

  const toggleAll = () => {
    if (selected.size === vehicules.length) {
      setSelected(new Set());
    } else {
      setSelected(new Set(vehicules.map(v => v.id)));
    }
  };

  return (
    <div className="border border-border rounded-2xl overflow-hidden">
      <button
        className="w-full flex items-center justify-between px-5 py-4 bg-card hover:bg-muted/30 transition-colors"
        onClick={() => setOpen(v => !v)}
      >
        <div className="flex items-center gap-3">
          <span className="text-2xl">🚚</span>
          <div className="text-left">
            <p className="font-semibold">Véhicules</p>
            <p className="text-xs text-muted-foreground">{vehicules.length} véhicule{vehicules.length !== 1 ? 's' : ''}</p>
          </div>
        </div>
        {open ? <ChevronDown size={16} className="text-muted-foreground" /> : <ChevronDown size={16} className="text-muted-foreground rotate-180" />}
      </button>

      {open && (
        <div className="border-t border-border px-5 py-4 space-y-3">
          {showForm && !editing && (
            <VehiculeForm
              conducteurs={conducteurs}
              onSave={(data) => createMutation.mutate(data)}
              onCancel={() => setShowForm(false)}
            />
          )}

          {vehicules.length > 0 && (
            <div className="flex items-center gap-3 px-3 py-2 bg-muted/20 rounded-lg">
              <input type="checkbox" checked={selected.size > 0 && selected.size === vehicules.length} onChange={toggleAll} className="w-4 h-4 rounded accent-primary" />
              <span className="text-xs text-muted-foreground">{selected.size > 0 ? `${selected.size} sélectionné(s)` : 'Sélectionner tous'}</span>
            </div>
          )}

          <div className="bg-card border border-border rounded-2xl overflow-hidden divide-y divide-border/50">
            {vehicules.length === 0 ? (
              <p className="text-sm text-muted-foreground text-center py-8">Aucun véhicule.</p>
            ) : vehicules.map((item) => (
              <div key={item.id}>
                {editing?.id === item.id ? (
                  <div className="px-4 py-3">
                    <VehiculeForm
                      vehicule={item}
                      conducteurs={conducteurs}
                      onSave={(data) => updateMutation.mutate({ id: item.id, data })}
                      onCancel={() => setEditing(null)}
                    />
                  </div>
                ) : (
                  <VehiculeRow
                    item={item}
                    checked={selected.has(item.id)}
                    onToggleCheck={() => setSelected(prev => { const s = new Set(prev); if (s.has(item.id)) s.delete(item.id); else s.add(item.id); return s; })}
                    onToggleActif={() => updateMutation.mutate({ id: item.id, data: { actif: item.actif === false ? true : false } })}
                    onEdit={setEditing}
                    onDelete={setDeleteModal}
                  />
                )}
              </div>
            ))}
          </div>

          <Button variant="outline" size="sm" className="gap-1" onClick={() => { setShowForm(!showForm); setEditing(null); }}>
            <Plus size={13} /> {showForm ? 'Annuler' : 'Ajouter un véhicule'}
          </Button>
        </div>
      )}

      {selected.size > 0 && (
        <div className="fixed bottom-20 left-0 right-0 px-4 py-3 bg-card border-t border-border shadow-lg flex items-center justify-between gap-2">
          <span className="text-sm text-muted-foreground">{selected.size} véhicule{selected.size !== 1 ? 's' : ''} sélectionné{selected.size !== 1 ? 's' : ''}</span>
          <button onClick={() => bulkDeleteMutation.mutate(Array.from(selected))} className="px-3 py-1.5 rounded-lg bg-destructive text-destructive-foreground text-xs hover:bg-destructive/90 disabled:opacity-50" disabled={bulkDeleteMutation.isPending}>
            {bulkDeleteMutation.isPending ? '⏳' : '🗑️'} Supprimer
          </button>
        </div>
      )}

      <DeleteConfirmModal
        open={!!deleteModal}
        title={`Supprimer « ${deleteModal?.nom} » ?`}
        onConfirm={() => deleteMutation.mutate(deleteModal.id)}
        onCancel={() => setDeleteModal(null)}
        loading={deleteMutation.isPending}
      />
    </div>
  );
}