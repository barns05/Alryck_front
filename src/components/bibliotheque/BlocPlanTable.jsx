import { useState, useRef } from 'react';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { base44 } from '@/api/base44Client';
import { Trash2, Pencil, X, Check, Upload, FileImage, ExternalLink, PenTool, CheckCheck } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import CreerModal from './CreerModal';
import EspaceEditor from './EspaceEditor';
import PropositionsCurationModal from './PropositionsCurationModal';
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
} from '@/components/ui/alert-dialog';

function PlanForm({ plan, onSave, onCancel }) {
  const [nom, setNom] = useState(plan?.nom || '');
  const [capacite, setCapacite] = useState(plan?.capacite_max || '');
  const [fileUrl, setFileUrl] = useState(plan?.file_url || '');
  const [fileNom, setFileNom] = useState(plan?.file_nom || '');
  const [uploading, setUploading] = useState(false);
  const fileRef = useRef();

  const handleFile = async (e) => {
    const file = e.target.files?.[0];
    if (!file) return;
    setUploading(true);
    const { file_url } = await base44.integrations.Core.UploadFile({ file });
    setFileUrl(file_url);
    setFileNom(file.name);
    setUploading(false);
  };

  const handleSave = () => {
    if (!nom.trim()) return;
    onSave({
      nom: nom.trim(),
      capacite_max: capacite ? parseInt(capacite) : null,
      file_url: fileUrl || null,
      file_nom: fileNom || null,
      actif: plan?.actif !== false,
    });
  };

  return (
    <div className="bg-muted/30 rounded-2xl border border-border p-5 space-y-4">
      <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
        <div>
          <label className="text-xs font-medium text-muted-foreground mb-1 block">Nom du plan *</label>
          <Input value={nom} onChange={e => setNom(e.target.value)} placeholder="ex: 6 tables + table d'honneur" />
        </div>
        <div>
          <label className="text-xs font-medium text-muted-foreground mb-1 block">Capacité maximale (personnes)</label>
          <Input type="number" value={capacite} onChange={e => setCapacite(e.target.value)} placeholder="ex: 120" />
        </div>
      </div>

      {/* Upload */}
      <div>
        <label className="text-xs font-medium text-muted-foreground mb-1 block">Plan de salle (JPG, PNG, PDF)</label>
        {fileUrl ? (
          <div className="flex items-center gap-3 p-3 bg-card border border-border rounded-xl">
            <FileImage size={16} className="text-primary shrink-0" />
            <span className="text-sm flex-1 truncate">{fileNom || 'Fichier uploadé'}</span>
            <a href={fileUrl} target="_blank" rel="noopener noreferrer" className="text-primary hover:underline text-xs flex items-center gap-1">
              Voir <ExternalLink size={11} />
            </a>
            <button onClick={() => { setFileUrl(''); setFileNom(''); }} className="p-1 rounded hover:bg-red-50 text-muted-foreground hover:text-red-500">
              <X size={13} />
            </button>
          </div>
        ) : (
          <button
            onClick={() => fileRef.current?.click()}
            disabled={uploading}
            className="w-full border-2 border-dashed border-border rounded-xl p-6 flex flex-col items-center gap-2 text-muted-foreground hover:border-primary/40 hover:text-primary transition-colors"
          >
            {uploading ? (
              <div className="w-5 h-5 border-2 border-primary border-t-transparent rounded-full animate-spin" />
            ) : (
              <Upload size={20} />
            )}
            <span className="text-sm">{uploading ? 'Envoi en cours…' : 'Cliquez pour uploader le plan'}</span>
            <span className="text-xs">JPG, PNG, PDF acceptés</span>
          </button>
        )}
        <input ref={fileRef} type="file" accept="image/*,.pdf" className="hidden" onChange={handleFile} />
      </div>

      <div className="flex gap-2 justify-end border-t border-border pt-3">
        <Button variant="outline" size="sm" onClick={onCancel}><X size={14} /> Annuler</Button>
        <Button size="sm" onClick={handleSave} disabled={!nom.trim() || uploading}>
          <Check size={14} /> Enregistrer
        </Button>
      </div>
    </div>
  );
}

function PlanCard({ plan, onEdit, onDelete, onToggle }) {
  const isPdf = plan.file_nom?.toLowerCase().endsWith('.pdf');
  return (
    <div className={`bg-card border border-border rounded-xl overflow-hidden transition-opacity ${plan.actif === false ? 'opacity-60' : ''}`}>
      <div className="flex items-center gap-3 p-4">
        {/* Thumbnail / icône */}
        <div className="w-14 h-14 rounded-lg bg-muted flex items-center justify-center shrink-0 overflow-hidden border border-border">
          {plan.file_url && !isPdf ? (
            <img src={plan.file_url} alt={plan.nom} className="w-full h-full object-cover" />
          ) : (
            <FileImage size={22} className="text-muted-foreground" />
          )}
        </div>

        <div className="flex-1 min-w-0">
          <p className="font-semibold">{plan.nom}</p>
          <div className="flex items-center gap-2 mt-0.5 flex-wrap">
            {plan.capacite_max && (
              <span className="text-xs bg-blue-100 text-blue-700 px-2 py-0.5 rounded-full font-medium">
                {plan.capacite_max} pers. max
              </span>
            )}
            {plan.file_url ? (
              <a href={plan.file_url} target="_blank" rel="noopener noreferrer"
                className="text-xs text-primary hover:underline flex items-center gap-1">
                Voir le fichier <ExternalLink size={10} />
              </a>
            ) : (
              <span className="text-xs text-muted-foreground italic">Aucun fichier</span>
            )}
          </div>
        </div>

        <div className="flex items-center gap-1.5 shrink-0">
          <button
            onClick={() => onToggle(plan)}
            className={`relative w-9 h-5 rounded-full transition-colors ${plan.actif !== false ? 'bg-emerald-400' : 'bg-slate-300'}`}
          >
            <span className={`absolute top-0.5 w-4 h-4 bg-white rounded-full shadow transition-transform ${plan.actif !== false ? 'translate-x-4' : 'translate-x-0.5'}`} />
          </button>
          <button onClick={() => onEdit(plan)} className="p-1.5 rounded-lg hover:bg-muted text-muted-foreground hover:text-foreground">
            <Pencil size={13} />
          </button>
          <button
            onClick={() => { if (window.confirm('Supprimer ce plan ?')) onDelete(plan.id); }}
            className="p-1.5 rounded-lg hover:bg-red-50 text-muted-foreground hover:text-red-600"
          >
            <Trash2 size={13} />
          </button>
        </div>
      </div>
    </div>
  );
}

export default function BlocPlanTable() {
  const qc = useQueryClient();
  const [mode, setMode] = useState(null); // null | 'create' | { plan }
  const [creerModal, setCreerModal] = useState(false);
  const [showEspaceEditor, setShowEspaceEditor] = useState(null); // null | true | espace(édit)
  const [initialImportFile, setInitialImportFile] = useState(null); // File transmis à EspaceEditor pour import IA auto
  const [curationEspaceId, setCurationEspaceId] = useState(null); // id EspaceLieu dont on ouvre la curation
  const [espaceToDelete, setEspaceToDelete] = useState(null); // EspaceLieu en cours de confirmation de suppression

  const { data: plans = [] } = useQuery({
    queryKey: ['plans-salle'],
    queryFn: () => base44.entities.PlanSalle.list(),
  });

  const createMutation = useMutation({
    mutationFn: (data) => base44.entities.PlanSalle.create(data),
    onSuccess: () => { qc.invalidateQueries(['plans-salle']); setMode(null); },
  });

  const updateMutation = useMutation({
    mutationFn: ({ id, data }) => base44.entities.PlanSalle.update(id, data),
    onSuccess: () => { qc.invalidateQueries(['plans-salle']); setMode(null); },
  });

  const deleteMutation = useMutation({
    mutationFn: (id) => base44.entities.PlanSalle.delete(id),
    onSuccess: () => qc.invalidateQueries(['plans-salle']),
  });

  const { data: espaces = [] } = useQuery({
    queryKey: ['espaces-lieu'],
    queryFn: () => base44.entities.EspaceLieu.list(),
  });
  const deleteEspaceMutation = useMutation({
    // Cascade : supprimer d'abord les PropositionConfig liées (sinon orphelines en base),
    // puis l'espace.
    mutationFn: async (id) => {
      await base44.entities.PropositionConfig.deleteMany({ espace_lieu_id: id });
      return base44.entities.EspaceLieu.delete(id);
    },
    onSuccess: () => {
      qc.invalidateQueries(['espaces-lieu']);
      qc.invalidateQueries(['propositions-config-all']);
      setEspaceToDelete(null);
    },
  });

  // Comptage des PropositionConfig par espace (total + validées), côté client.
  const { data: propositionsAll = [] } = useQuery({
    queryKey: ['propositions-config-all'],
    queryFn: () => base44.entities.PropositionConfig.list('-updated_date', 500),
  });
  const propsByEspace = {};
  for (const p of propositionsAll) {
    const k = p.espace_lieu_id;
    if (!k) continue;
    if (!propsByEspace[k]) propsByEspace[k] = { total: 0, validees: 0 };
    propsByEspace[k].total++;
    if (p.statut === 'validee') propsByEspace[k].validees++;
  }

  const handleToggle = (plan) =>
    updateMutation.mutate({ id: plan.id, data: { actif: !plan.actif } });

  return (
    <div className="space-y-5">
      {/* En-tête : le workflow actif est « dessiner / importer un espace »
          (configurateur). L'ancien upload simple (PlanSalle) devient secondaire. */}
      <div className="flex items-start justify-between gap-3 flex-wrap">
        <div>
          <p className="text-sm font-semibold">Plans de salle</p>
          <p className="text-xs text-muted-foreground mt-0.5">
            Dessinez vos espaces, puis générez et validez les configurations de tables proposées aux clients.
          </p>
        </div>
        {!mode && (
          <div className="flex items-center gap-2">
            <Button size="sm" variant="outline" onClick={() => setCreerModal(true)} className="gap-1.5">
              <Upload size={14} /> Importer un plan
            </Button>
            <Button size="sm" onClick={() => setShowEspaceEditor(true)} className="gap-1.5">
              <PenTool size={14} /> Dessiner un espace
            </Button>
          </div>
        )}
      </div>

      {creerModal && (
        <CreerModal
          title="Plan de salle"
          onManual={null}
          onImageAmanda={(file) => {
            setCreerModal(false);
            // Ouvre EspaceEditor et lance l'extraction IA du contour automatiquement
            setInitialImportFile(file);
            setShowEspaceEditor(true);
          }}
          onClose={() => setCreerModal(false)}
        />
      )}

      {mode === 'create' && (
        <PlanForm onSave={(data) => createMutation.mutate(data)} onCancel={() => setMode(null)} />
      )}
      {mode && mode !== 'create' && (
        <PlanForm plan={mode} onSave={(data) => updateMutation.mutate({ id: mode.id, data })} onCancel={() => setMode(null)} />
      )}

      {/* Espaces dessinés — section principale (workflow actif) */}
      <div className="space-y-2">
        <div className="flex items-center gap-1.5">
          <PenTool size={14} className="text-primary" />
          <p className="text-sm font-semibold">
            Espaces dessinés <span className="text-muted-foreground font-normal">({espaces.length})</span>
          </p>
        </div>

        {espaces.length === 0 ? (
          <div className="text-center py-10 px-4 rounded-2xl border-2 border-dashed border-border bg-muted/20">
            <PenTool size={22} className="text-muted-foreground mx-auto mb-2" />
            <p className="text-sm font-medium">Aucun espace dessiné</p>
            <p className="text-xs text-muted-foreground mt-1 max-w-sm mx-auto">
              Dessinez le contour de votre salle ou importez un plan existant pour générer automatiquement
              des configurations de tables.
            </p>
            <Button size="sm" className="mt-3 gap-1.5" onClick={() => setShowEspaceEditor(true)}>
              <PenTool size={14} /> Dessiner un espace
            </Button>
          </div>
        ) : (
          espaces.map((es) => (
            <div key={es.id} className="flex items-center gap-3 p-3 bg-card border border-border rounded-xl">
              <div className="w-10 h-10 rounded-lg bg-muted flex items-center justify-center shrink-0">
                <PenTool size={14} className="text-primary" />
              </div>
              <div className="flex-1 min-w-0">
                <p className="font-semibold text-sm truncate">{es.nom}</p>
                <p className="text-xs text-muted-foreground">
                  {es.largeur}×{es.hauteur} · {(es.zones || []).length} zone{(es.zones || []).length > 1 ? 's' : ''}
                </p>
                {(() => {
                  const c = propsByEspace[es.id];
                  if (!c || c.total === 0) {
                    return (
                      <span className="inline-flex items-center gap-1 mt-1 px-2 py-0.5 rounded-full text-xs font-medium bg-muted text-muted-foreground border border-border">
                        Aucune proposition générée
                      </span>
                    );
                  }
                  return (
                    <button
                      onClick={() => setCurationEspaceId(es.id)}
                      className="inline-flex items-center gap-1 mt-1 px-2 py-0.5 rounded-full text-xs font-semibold bg-primary/10 text-primary border border-primary/20 hover:bg-primary/20 hover:border-primary/40 transition-colors"
                    >
                      <CheckCheck size={11} /> {c.total} proposition{c.total > 1 ? 's' : ''} · {c.validees} validée{c.validees > 1 ? 's' : ''}
                    </button>
                  );
                })()}
              </div>
              <button
                onClick={() => setShowEspaceEditor(es)}
                className="p-1.5 rounded-lg hover:bg-muted text-muted-foreground hover:text-foreground"
                title="Modifier l'espace"
              >
                <Pencil size={13} />
              </button>
              <button
                onClick={() => setEspaceToDelete(es)}
                className="p-1.5 rounded-lg hover:bg-red-50 text-muted-foreground hover:text-red-600"
                title="Supprimer l'espace"
              >
                <Trash2 size={13} />
              </button>
            </div>
          ))
        )}
      </div>

      {/* Plans uploadés — ancien système (images/PDF), section secondaire.
          Masqué quand aucun plan uploadé : le compteur « 0 plan » qui dominait
          en haut disparaît, l'attention reste sur les espaces dessinés. */}
      {plans.length > 0 && (
        <div className="space-y-2 pt-3 border-t border-border">
          <p className="text-xs font-semibold text-muted-foreground uppercase tracking-wider">
            Plans uploadés ({plans.length})
          </p>
          {plans.map(plan => (
            <PlanCard
              key={plan.id}
              plan={plan}
              onEdit={(p) => setMode(p)}
              onDelete={(id) => deleteMutation.mutate(id)}
              onToggle={handleToggle}
            />
          ))}
        </div>
      )}

      {showEspaceEditor && (
        <EspaceEditor
          espace={typeof showEspaceEditor === 'object' ? showEspaceEditor : null}
          initialImportFile={initialImportFile}
          onClose={() => {
            setShowEspaceEditor(false);
            setInitialImportFile(null);
          }}
          onSaved={() => {
            setShowEspaceEditor(false);
            setInitialImportFile(null);
            qc.invalidateQueries(['espaces-lieu']);
          }}
        />
      )}

      {curationEspaceId && (
        <PropositionsCurationModal
          espace_lieu_id={curationEspaceId}
          onClose={() => {
            qc.invalidateQueries(['propositions-config-all']);
            setCurationEspaceId(null);
          }}
        />
      )}

      {/* Confirmation de suppression d'un espace dessiné (avec cascade des PropositionConfig) */}
      <AlertDialog
        open={!!espaceToDelete}
        onOpenChange={(open) => { if (!open) setEspaceToDelete(null); }}
      >
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>
              Supprimer l'espace « {espaceToDelete?.nom} » ?
            </AlertDialogTitle>
            <AlertDialogDescription>
              {(() => {
                const n = espaceToDelete ? (propsByEspace[espaceToDelete.id]?.total || 0) : 0;
                if (n > 0) {
                  return `Cette action supprimera aussi ses ${n} proposition${n > 1 ? 's' : ''} de configuration associée${n > 1 ? 's' : ''} et ne peut pas être annulée.`;
                }
                return 'Cette action ne peut pas être annulée.';
              })()}
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel>Annuler</AlertDialogCancel>
            <AlertDialogAction
              className="bg-red-600 text-white hover:bg-red-700"
              onClick={() => {
                if (espaceToDelete) deleteEspaceMutation.mutate(espaceToDelete.id);
              }}
            >
              Supprimer
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </div>
  );
}