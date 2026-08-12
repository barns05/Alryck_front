import { useState, useRef } from 'react';
import { base44 } from '@/api/base44Client';
import { Upload, X, Check, FileImage, ExternalLink } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';

export default function PlanTableInlineForm({ onSave, onCancel }) {
  const [nom, setNom] = useState('');
  const [capacite, setCapacite] = useState('');
  const [fileUrl, setFileUrl] = useState('');
  const [fileNom, setFileNom] = useState('');
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

  return (
    <div className="space-y-4">
      <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
        <div>
          <label className="text-xs font-medium text-muted-foreground mb-1 block">Nom du plan *</label>
          <Input value={nom} onChange={e => setNom(e.target.value)} placeholder="ex: 6 tables + table d'honneur" />
        </div>
        <div>
          <label className="text-xs font-medium text-muted-foreground mb-1 block">Capacité max (personnes)</label>
          <Input type="number" value={capacite} onChange={e => setCapacite(e.target.value)} placeholder="ex: 120" />
        </div>
      </div>

      <div>
        <label className="text-xs font-medium text-muted-foreground mb-1 block">Plan de salle (JPG, PNG, PDF)</label>
        {fileUrl ? (
          <div className="flex items-center gap-3 p-3 bg-muted/30 border border-border rounded-xl">
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
            className="w-full border-2 border-dashed border-border rounded-xl p-5 flex flex-col items-center gap-2 text-muted-foreground hover:border-primary/40 hover:text-primary transition-colors"
          >
            {uploading ? (
              <div className="w-5 h-5 border-2 border-primary border-t-transparent rounded-full animate-spin" />
            ) : (
              <Upload size={18} />
            )}
            <span className="text-sm">{uploading ? 'Envoi en cours…' : 'Cliquez pour uploader'}</span>
          </button>
        )}
        <input ref={fileRef} type="file" accept="image/*,.pdf" className="hidden" onChange={handleFile} />
      </div>

      <div className="flex gap-2 justify-end border-t border-border pt-3">
        <Button variant="outline" size="sm" onClick={onCancel}><X size={14} /> Annuler</Button>
        <Button size="sm" onClick={() => onSave({ nom: nom.trim(), capacite_max: capacite ? parseInt(capacite) : null, file_url: fileUrl || null, file_nom: fileNom || null, actif: true })} disabled={!nom.trim() || uploading}>
          <Check size={14} /> Enregistrer
        </Button>
      </div>
    </div>
  );
}