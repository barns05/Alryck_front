import { useState, useRef } from 'react';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { base44 } from '@/api/base44Client';
import { Plus, Pencil, Trash2, X, Check, Upload, ExternalLink } from 'lucide-react';
import LoadingCristal from '@/components/LoadingCristal';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import DeleteConfirmModal from '@/components/ui/DeleteConfirmModal';

const TYPES_EVENEMENT = ['Mariage', 'Pacs', 'Anniversaire de mariage', 'Baptême', 'Anniversaire', 'Soirée d\'entreprise', 'Séminaire', 'Cocktail', 'Gala', 'Location', 'Autre'];

function InlineForm({ form, sel, toggleType, fileRef, uploading, handleFile, onCancel, onSave }) {
  return (
    <>
      <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
        <div className="md:col-span-2">
          <label className="text-xs font-medium text-muted-foreground mb-1 block">Nom de la brochure *</label>
          <Input value={form.nom} onChange={e => sel('nom', e.target.value)} placeholder="ex: Brochure Tendance 2025" />
        </div>
        <div className="md:col-span-2">
          <label className="text-xs font-medium text-muted-foreground mb-1.5 block">
            Types d'événements associés
            <span className="ml-2 font-normal text-muted-foreground">
              {form.types_evenement.length === 0 ? '— Tous types' : `${form.types_evenement.length} sélectionné(s)`}
            </span>
          </label>
          <div className="flex flex-wrap gap-1.5">
            {TYPES_EVENEMENT.map(t => {
              const active = form.types_evenement.includes(t);
              return (
                <button key={t} type="button" onClick={() => toggleType(t)}
                  className={`px-2.5 py-1 rounded-full border text-xs font-medium transition-all ${
                    active ? 'bg-primary text-primary-foreground border-primary' : 'bg-card border-border text-foreground hover:border-primary/50'
                  }`}>
                  {t}
                </button>
              );
            })}
          </div>
        </div>
        <div>
          <label className="text-xs font-medium text-muted-foreground mb-1 block">Fichier (PDF ou image)</label>
          <input ref={fileRef} type="file" accept=".pdf,.jpg,.jpeg,.png,.webp" className="hidden" onChange={e => handleFile(e.target.files[0])} />
          <button type="button" onClick={() => fileRef.current?.click()}
            className="flex items-center gap-2 w-full h-9 px-3 rounded-md border border-input bg-transparent text-sm text-muted-foreground hover:bg-muted/50 transition-colors">
            {uploading ? <LoadingCristal size={16} /> : <Upload size={14} />}
            {form.fichier_nom ? <span className="truncate text-foreground">{form.fichier_nom}</span> : <span>Choisir un fichier…</span>}
          </button>
        </div>
      </div>
      <div className="flex gap-2 justify-end pt-1 border-t border-border">
        <Button variant="outline" size="sm" onClick={onCancel}><X size={14} /> Annuler</Button>
        <Button size="sm" onClick={onSave} disabled={!form.nom.trim() || uploading}><Check size={14} /> Enregistrer</Button>
      </div>
    </>
  );
}

export default function BlocBrochures() {
  const qc = useQueryClient();
  const fileRef = useRef();
  const [showForm, setShowForm] = useState(false);
  const [editItem, setEditItem] = useState(null);
  const [uploading, setUploading] = useState(false);
  const [form, setForm] = useState({ nom: '', types_evenement: [], fichier_url: '', fichier_nom: '', fichier_type: '' });
  const [deleteBrochure, setDeleteBrochure] = useState(null);

  const { data: brochures = [] } = useQuery({
    queryKey: ['brochures-catalogue'],
    queryFn: () => base44.entities.BrochureCatalogue.list('-created_date', 200),
  });

  const toggleType = (t) => setForm(f => {
    const list = f.types_evenement || [];
    return { ...f, types_evenement: list.includes(t) ? list.filter(x => x !== t) : [...list, t] };
  });

  const createMutation = useMutation({
    mutationFn: (data) => base44.entities.BrochureCatalogue.create(data),
    onSuccess: () => { qc.invalidateQueries(['brochures-catalogue']); setShowForm(false); setForm({ nom: '', types_evenement: [], fichier_url: '', fichier_nom: '', fichier_type: '' }); },
  });
  const updateMutation = useMutation({
    mutationFn: ({ id, data }) => base44.entities.BrochureCatalogue.update(id, data),
    onSuccess: () => { qc.invalidateQueries(['brochures-catalogue']); setEditItem(null); },
  });
  const deleteMutation = useMutation({
    mutationFn: (id) => base44.entities.BrochureCatalogue.delete(id),
    onSuccess: () => qc.invalidateQueries(['brochures-catalogue']),
  });
  const toggleMutation = useMutation({
    mutationFn: ({ id, actif }) => base44.entities.BrochureCatalogue.update(id, { actif }),
    onSuccess: () => qc.invalidateQueries(['brochures-catalogue']),
  });

  const handleFile = async (file) => {
    if (!file) return;
    setUploading(true);
    const { file_url } = await base44.integrations.Core.UploadFile({ file });
    const isPdf = file.type === 'application/pdf';
    setForm(f => ({ ...f, fichier_url: file_url, fichier_nom: file.name, fichier_type: isPdf ? 'pdf' : 'image' }));
    if (!form.nom) setForm(f => ({ ...f, nom: file.name.replace(/\.[^/.]+$/, '') }));
    setUploading(false);
  };

  const openForm = (item = null) => {
    if (item) {
      // Si on reclique sur le même item, on ferme le formulaire inline
      if (editItem?.id === item.id) { setEditItem(null); return; }
      setShowForm(false);
      // Rétrocompat : si l'enregistrement a encore l'ancien champ type_evenement (string)
      let types = item.types_evenement || [];
      if (!types.length && item.type_evenement && item.type_evenement !== 'Tous') {
        types = [item.type_evenement];
      }
      setEditItem(item);
      setForm({ nom: item.nom, types_evenement: types, fichier_url: item.fichier_url || '', fichier_nom: item.fichier_nom || '', fichier_type: item.fichier_type || '' });
    } else {
      setEditItem(null);
      setForm({ nom: '', types_evenement: [], fichier_url: '', fichier_nom: '', fichier_type: '' });
      setShowForm(true);
    }
  };

  const handleSave = () => {
    if (!form.nom.trim()) return;
    const payload = { nom: form.nom.trim(), types_evenement: form.types_evenement, fichier_url: form.fichier_url, fichier_nom: form.fichier_nom, fichier_type: form.fichier_type, actif: true };
    if (editItem) updateMutation.mutate({ id: editItem.id, data: payload });
    else createMutation.mutate(payload);
  };

  const sel = (k, v) => setForm(f => ({ ...f, [k]: v }));

  return (
    <div className="space-y-4">
      <div className="flex items-center justify-between">
        <p className="text-sm text-muted-foreground">{brochures.length} brochure{brochures.length !== 1 ? 's' : ''}</p>
        <Button size="sm" className="gap-1.5" onClick={() => openForm()}>
          <Plus size={14} /> Ajouter
        </Button>
      </div>

      {showForm && (
        <div className="bg-muted/30 border border-border rounded-xl p-4 space-y-3">
          <InlineForm form={form} sel={sel} toggleType={toggleType} fileRef={fileRef} uploading={uploading} handleFile={handleFile} onCancel={() => { setShowForm(false); setEditItem(null); }} onSave={handleSave} />
        </div>
      )}

      {brochures.length === 0 && !showForm && (
        <p className="text-center text-sm text-muted-foreground py-8">Aucune brochure. Cliquez sur "Ajouter" pour uploader un PDF ou une image.</p>
      )}

      <div className="space-y-2">
        {brochures.map(b => (
          <div key={b.id}>
            <div className={`bg-card border border-border rounded-xl px-4 py-3 flex items-center justify-between gap-3 ${b.actif === false ? 'opacity-60' : ''}`}>
              <div className="flex items-center gap-3 min-w-0 flex-1">
                <span className="text-xl shrink-0">{b.fichier_type === 'pdf' ? '📄' : '🖼️'}</span>
                <div className="min-w-0">
                  <p className="font-medium text-sm truncate">{b.nom}</p>
                  <div className="flex items-center gap-2 text-xs text-muted-foreground flex-wrap">
                    {(b.types_evenement?.length > 0
                      ? b.types_evenement
                      : b.type_evenement && b.type_evenement !== 'Tous' ? [b.type_evenement] : []
                    ).length === 0 ? (
                      <span className="bg-primary/10 text-primary px-2 py-0.5 rounded-full">Tous types</span>
                    ) : (
                      (b.types_evenement?.length > 0 ? b.types_evenement : [b.type_evenement]).map(t => (
                        <span key={t} className="bg-primary/10 text-primary px-2 py-0.5 rounded-full">{t}</span>
                      ))
                    )}
                    {b.fichier_nom && <span className="truncate">{b.fichier_nom}</span>}
                    {b.actif !== false && <span className="text-emerald-600 font-medium">● Partagée</span>}
                  </div>
                </div>
              </div>
              <div className="flex items-center gap-3 shrink-0">
                {b.fichier_url && (
                  <a href={b.fichier_url} target="_blank" rel="noreferrer" className="p-1.5 rounded-lg hover:bg-muted text-muted-foreground hover:text-foreground" title="Ouvrir">
                    <ExternalLink size={13} />
                  </a>
                )}
                <button onClick={() => toggleMutation.mutate({ id: b.id, actif: !b.actif })}
                  className={`relative w-9 h-5 rounded-full transition-colors ${b.actif !== false ? 'bg-emerald-400' : 'bg-slate-300'}`}
                  title={b.actif !== false ? 'Visible — cliquer pour masquer' : 'Masquée — cliquer pour activer'}>
                  <span className={`absolute top-0.5 w-4 h-4 bg-white rounded-full shadow transition-transform ${b.actif !== false ? 'translate-x-4' : 'translate-x-0.5'}`} />
                </button>
                <button onClick={() => openForm(b)} className="p-1.5 rounded-lg hover:bg-muted text-muted-foreground hover:text-foreground"><Pencil size={13} /></button>
                <button onClick={() => setDeleteBrochure(b)} className="p-1.5 rounded-lg hover:bg-red-50 text-muted-foreground hover:text-red-600"><Trash2 size={13} /></button>
              </div>
            </div>
            {editItem?.id === b.id && (
              <div className="bg-muted/30 border border-x border-b border-border rounded-b-xl px-4 pb-4 pt-3 space-y-3 -mt-1">
                <InlineForm form={form} sel={sel} toggleType={toggleType} fileRef={fileRef} uploading={uploading} handleFile={handleFile} onCancel={() => setEditItem(null)} onSave={handleSave} />
              </div>
            )}
          </div>
        ))}
      </div>

      <DeleteConfirmModal
        open={!!deleteBrochure}
        title={`Supprimer « ${deleteBrochure?.nom} » ?`}
        onConfirm={() => { deleteMutation.mutate(deleteBrochure.id); setDeleteBrochure(null); }}
        onCancel={() => setDeleteBrochure(null)}
        loading={deleteMutation.isPending}
      />
    </div>
  );
}