import { useState } from 'react';
import { base44 } from '@/api/base44Client';
import { X, Upload, Trash2, ExternalLink, Send } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { useToast } from '@/components/ui/use-toast';

export default function PlanTablePanel({ evenement, onClose, onUpdated }) {
  const { toast } = useToast();
  const [uploading, setUploading] = useState(false);
  const [sending, setSending] = useState(false);

  const handleUpload = async (e) => {
    const file = e.target.files[0];
    if (!file) return;
    setUploading(true);
    const { file_url } = await base44.integrations.Core.UploadFile({ file });
    await base44.entities.Evenement.update(evenement.id, {
      plan_table_url: file_url,
      plan_table_nom: file.name,
      plan_table_envoye: false,
    });
    toast({ title: '✅ Plan de table uploadé' });
    onUpdated();
    setUploading(false);
  };

  const handleDelete = async () => {
    if (!confirm('Supprimer le plan de table ?')) return;
    await base44.entities.Evenement.update(evenement.id, {
      plan_table_url: '',
      plan_table_nom: '',
      plan_table_envoye: false,
    });
    toast({ title: 'Plan de table supprimé' });
    onUpdated();
  };

  const handleMarkSent = async () => {
    setSending(true);
    await base44.entities.Evenement.update(evenement.id, { plan_table_envoye: true });
    toast({ title: '📨 Plan de table marqué comme envoyé' });
    onUpdated();
    setSending(false);
  };

  return (
    <div className="border-t border-border bg-muted/30 rounded-b-2xl px-4 py-4">
      <div className="flex items-center justify-between mb-3">
        <h4 className="text-sm font-semibold flex items-center gap-1.5">🗺️ Plan de table</h4>
        <button onClick={onClose} className="p-1 rounded-lg hover:bg-muted text-muted-foreground">
          <X size={14} />
        </button>
      </div>

      {evenement.plan_table_url ? (
        <div className="space-y-3">
          <div className="flex items-center gap-2 bg-card rounded-xl border border-border px-3 py-2.5">
            <span className="text-sm flex-1 truncate font-medium">📄 {evenement.plan_table_nom || 'Plan de table'}</span>
            <a href={evenement.plan_table_url} target="_blank" rel="noopener noreferrer"
              className="text-xs text-primary hover:underline flex items-center gap-1 shrink-0">
              <ExternalLink size={12} /> Voir
            </a>
            <button onClick={handleDelete} className="text-destructive hover:text-destructive/80 shrink-0">
              <Trash2 size={13} />
            </button>
          </div>

          <div className="flex items-center gap-2 flex-wrap">
            {evenement.plan_table_envoye ? (
              <span className="text-xs font-semibold px-2.5 py-1 rounded-full bg-blue-100 text-blue-700">
                📨 Envoyé aux équipes
              </span>
            ) : (
              <Button size="sm" variant="outline" className="gap-1.5 h-8 text-xs" onClick={handleMarkSent} disabled={sending}>
                <Send size={12} /> Marquer comme envoyé
              </Button>
            )}
            <label className={`flex items-center gap-1.5 h-8 px-3 rounded-md border border-dashed border-border cursor-pointer hover:bg-muted/40 text-xs text-muted-foreground transition-colors ${uploading ? 'opacity-60 pointer-events-none' : ''}`}>
              <Upload size={12} />
              {uploading ? 'Upload…' : 'Remplacer'}
              <input type="file" accept="image/*,.pdf" className="hidden" onChange={handleUpload} />
            </label>
          </div>
        </div>
      ) : (
        <div className="text-center py-4">
          <p className="text-xs text-muted-foreground mb-3">Aucun plan de table uploadé</p>
          <label className={`inline-flex items-center gap-2 px-4 py-2 rounded-lg border border-dashed border-border cursor-pointer hover:bg-muted/40 text-sm font-medium text-muted-foreground transition-colors ${uploading ? 'opacity-60 pointer-events-none' : ''}`}>
            <Upload size={14} />
            {uploading ? 'Upload en cours…' : 'Uploader un plan (image ou PDF)'}
            <input type="file" accept="image/*,.pdf" className="hidden" onChange={handleUpload} />
          </label>
        </div>
      )}
    </div>
  );
}