import { useState } from 'react';
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import { base44 } from '@/api/base44Client';
import { Upload, Link as LinkIcon, Trash2, File } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { useToast } from '@/components/ui/use-toast';

const TYPES = ['Contrat', 'Offre commerciale', 'Menu', 'Programme', 'Facture', 'Autre'];

export default function ClientDocumentsAdmin({ clientId, evenementId }) {
  const qc = useQueryClient();
  const { toast } = useToast();
  const [uploadingFile, setUploadingFile] = useState(null);
  const [form, setForm] = useState({ nom: '', type_document: 'Autre', notes: '' });

  const { data: docs = [] } = useQuery({
    queryKey: ['client-documents', clientId],
    queryFn: () => base44.entities.ClientDocument.filter({ client_id: clientId }),
    enabled: !!clientId,
  });

  const uploadMutation = useMutation({
    mutationFn: async (file) => {
      if (!file) return null;
      const uploadRes = await base44.integrations.Core.UploadFile({ file });
      return uploadRes.file_url;
    },
  });

  const saveMutation = useMutation({
    mutationFn: async (fileUrl) => {
      return base44.entities.ClientDocument.create({
        client_id: clientId,
        evenement_id: evenementId || null,
        nom: form.nom || uploadingFile.name,
        type_document: form.type_document,
        file_url: fileUrl,
        notes: form.notes,
      });
    },
    onSuccess: () => {
      qc.invalidateQueries(['client-documents']);
      toast({ title: '✅ Document ajouté', description: 'Le document est maintenant accessible au client.' });
      setForm({ nom: '', type_document: 'Autre', notes: '' });
      setUploadingFile(null);
    },
  });

  const deleteMutation = useMutation({
    mutationFn: (docId) => base44.entities.ClientDocument.delete(docId),
    onSuccess: () => {
      qc.invalidateQueries(['client-documents']);
      toast({ title: '✅ Document supprimé' });
    },
  });

  const handleFileSelect = async (e) => {
    const file = e.target.files?.[0];
    if (!file) return;

    setUploadingFile(file);
    const fileUrl = await uploadMutation.mutateAsync(file);

    if (fileUrl) {
      await saveMutation.mutateAsync(fileUrl);
    }
  };

  const isLoading = uploadMutation.isPending || saveMutation.isPending;

  return (
    <div className="bg-card rounded-2xl border border-border p-5 space-y-4">
      <div className="flex items-center justify-between">
        <h3 className="font-semibold text-base">📄 Documents du client</h3>
      </div>

      {/* Formulaire upload */}
      <div className="border border-border rounded-xl p-4 bg-muted/20 space-y-3">
        <div className="space-y-1.5">
          <Label>Nom du document (optionnel)</Label>
          <Input
            value={form.nom}
            onChange={(e) => setForm({ ...form, nom: e.target.value })}
            placeholder="Ex: Devis mariage"
            disabled={isLoading}
          />
        </div>

        <div className="grid grid-cols-2 gap-3">
          <div className="space-y-1.5">
            <Label>Type</Label>
            <Select value={form.type_document} onValueChange={(v) => setForm({ ...form, type_document: v })} disabled={isLoading}>
              <SelectTrigger><SelectValue /></SelectTrigger>
              <SelectContent>
                {TYPES.map((t) => (
                  <SelectItem key={t} value={t}>{t}</SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>
          <div className="space-y-1.5">
            <Label>Fichier</Label>
            <label className="relative block">
              <input
                type="file"
                onChange={handleFileSelect}
                disabled={isLoading}
                className="hidden"
                accept=".pdf,.doc,.docx,.xls,.xlsx,.ppt,.pptx,.jpg,.jpeg,.png"
              />
              <div className="w-full inline-flex items-center justify-center gap-2 whitespace-nowrap rounded-md text-sm font-medium transition-colors hover:bg-accent hover:text-accent-foreground cursor-pointer border border-input bg-background shadow-sm h-9 px-4 py-2">
                <Upload size={14} />
                {uploadingFile ? uploadingFile.name : 'Choisir fichier'}
              </div>
            </label>
          </div>
        </div>

        <div className="space-y-1.5">
          <Label>Notes (optionnel)</Label>
          <Input
            value={form.notes}
            onChange={(e) => setForm({ ...form, notes: e.target.value })}
            placeholder="À signer avant la date, contient les tarifs..."
            disabled={isLoading}
          />
        </div>

        <Button
          onClick={() => uploadingFile && saveMutation.mutate()}
          disabled={!uploadingFile || isLoading}
          className="w-full gap-2"
        >
          {isLoading ? 'Upload en cours...' : 'Ajouter le document'}
        </Button>
      </div>

      {/* Liste documents */}
      {docs.length === 0 ? (
        <p className="text-sm text-muted-foreground text-center py-4">Aucun document encore</p>
      ) : (
        <div className="space-y-2">
          {docs.map((doc) => (
            <div
              key={doc.id}
              className="flex items-center justify-between p-3 rounded-lg border border-border hover:bg-muted/30 transition-colors"
            >
              <div className="flex items-center gap-2 flex-1 min-w-0">
                <File size={16} className="shrink-0 text-muted-foreground" />
                <div className="min-w-0 flex-1">
                  <p className="text-sm font-medium truncate">{doc.nom}</p>
                  <div className="flex items-center gap-2 text-xs text-muted-foreground mt-0.5">
                    <span className="px-1.5 py-0.5 bg-primary/10 text-primary rounded">{doc.type_document}</span>
                    {doc.notes && <span className="truncate">{doc.notes}</span>}
                  </div>
                </div>
              </div>
              <div className="flex items-center gap-2 shrink-0 ml-2">
                <a
                  href={doc.file_url}
                  target="_blank"
                  rel="noopener noreferrer"
                  className="p-2 rounded-lg hover:bg-primary/10 text-primary transition-colors"
                  title="Télécharger"
                >
                  <LinkIcon size={16} />
                </a>
                <button
                  onClick={() => deleteMutation.mutate(doc.id)}
                  disabled={deleteMutation.isPending}
                  className="p-2 rounded-lg hover:bg-red-500/10 text-red-500 transition-colors"
                  title="Supprimer"
                >
                  <Trash2 size={16} />
                </button>
              </div>
            </div>
          ))}
        </div>
      )}
    </div>
  );
}