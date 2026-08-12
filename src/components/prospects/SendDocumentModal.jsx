/**
 * SendDocumentModal — Upload un fichier et l'envoie au prospect.
 *
 * Upload le fichier via UploadFile, crée un ProspectMessage (admin → prospect)
 * avec le lien, et tente d'envoyer un email.
 */
import { useState } from 'react';
import { useQueryClient } from '@tanstack/react-query';
import { base44 } from '@/api/base44Client';
import { X, Upload, Loader2, Send } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { toast } from 'sonner';

export default function SendDocumentModal({ prospect, onClose }) {
  const qc = useQueryClient();
  const [file, setFile] = useState(null);
  const [fileUrl, setFileUrl] = useState(null);
  const [uploading, setUploading] = useState(false);
  const [sending, setSending] = useState(false);

  const handleUpload = async (selectedFile) => {
    setUploading(true);
    try {
      const { file_url } = await base44.integrations.Core.UploadFile({ file: selectedFile });
      setFile(selectedFile);
      setFileUrl(file_url);
      toast.success('Fichier uploadé');
    } catch (e) {
      toast.error("Erreur lors de l'upload");
    } finally {
      setUploading(false);
    }
  };

  const handleSend = async () => {
    if (!fileUrl) return;
    setSending(true);
    try {
      await base44.entities.ProspectMessage.create({
        prospect_id: prospect.id,
        auteur: 'admin',
        message: `📄 Document partagé : ${file?.name || 'document'}\nConsulter : ${fileUrl}`,
      });

      if (prospect.email) {
        try {
          await base44.integrations.Core.SendEmail({
            to: prospect.email,
            subject: `Document : ${file?.name || 'document'}`,
            body: `<p>Bonjour ${prospect.prenom || ''},</p><p>Voici un document : <strong>${file?.name || 'document'}</strong>.</p><p><a href="${fileUrl}" style="display:inline-block;padding:10px 20px;background:#1e40af;color:white;text-decoration:none;border-radius:8px;font-weight:600;">Consulter le document →</a></p><p>Retrouvez tous vos documents dans votre espace prospect.</p>`,
          });
        } catch (e) { /* non bloquant */ }
      }

      qc.invalidateQueries(['prospect-messages']);
      toast.success('Document envoyé au prospect');
      onClose();
    } catch (e) {
      toast.error("Erreur lors de l'envoi");
    } finally {
      setSending(false);
    }
  };

  return (
    <div className="fixed inset-0 z-[60] flex items-center justify-center bg-black/40 backdrop-blur-sm p-4">
      <div className="bg-card rounded-2xl border border-border shadow-xl w-full max-w-md max-h-[90vh] flex flex-col">
        <div className="px-5 py-4 border-b border-border flex items-center justify-between shrink-0">
          <h3 className="font-semibold text-base flex items-center gap-2">
            <Upload size={16} /> Envoyer un document
          </h3>
          <button onClick={onClose} className="p-1.5 rounded-lg hover:bg-muted text-muted-foreground">
            <X size={18} />
          </button>
        </div>

        <div className="flex-1 overflow-y-auto px-5 py-4">
          <label className="block border border-dashed border-border rounded-xl p-6 text-center cursor-pointer hover:bg-muted/30 transition-colors">
            <Upload size={24} className="mx-auto mb-2 text-muted-foreground" />
            {uploading ? (
              <p className="text-xs text-muted-foreground">Upload en cours…</p>
            ) : file ? (
              <p className="text-xs text-emerald-600 font-medium">✓ {file.name}</p>
            ) : (
              <p className="text-xs text-muted-foreground">Cliquez pour sélectionner un fichier</p>
            )}
            <input
              type="file"
              className="hidden"
              disabled={uploading}
              onChange={e => e.target.files?.[0] && handleUpload(e.target.files[0])}
            />
          </label>
        </div>

        <div className="px-5 py-4 border-t border-border flex justify-end gap-2 shrink-0">
          <Button variant="outline" size="sm" onClick={onClose}>Annuler</Button>
          <Button size="sm" onClick={handleSend} disabled={!fileUrl || sending} className="gap-1.5">
            {sending ? <Loader2 size={14} className="animate-spin" /> : <Send size={14} />}
            {sending ? 'Envoi…' : 'Envoyer'}
          </Button>
        </div>
      </div>
    </div>
  );
}