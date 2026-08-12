import { useState } from 'react';
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import { base44 } from '@/api/base44Client';
import { X, Upload, AlertCircle } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { toast } from 'sonner';
import TypeEvenementMultiSelect from '@/components/bibliotheque/TypeEvenementMultiSelect';

export default function ModeleContratModal({ onClose }) {
  const qc = useQueryClient();
  const [nom, setNom] = useState('');
  const [typeEvenement, setTypeEvenement] = useState([]);
  const [file, setFile] = useState(null);
  const [fileName, setFileName] = useState('');

  const { data: company } = useQuery({
    queryKey: ['company-settings-owner'],
    queryFn: () => base44.entities.CompanySettings.list().then(r => r.find(cs => cs.is_owner === true) || null),
    staleTime: 60000,
  });

  const saveMutation = useMutation({
    mutationFn: async () => {
      if (!nom || !file) throw new Error('Nom et fichier requis');
      
      const { file_url } = await base44.integrations.Core.UploadFile({ file });
      const modeleNom = file.name;

      // Créer un modèle (type='modele', non rattaché à un client)
      await base44.entities.Contrat.create({
        titre: nom,
        type: 'modele',
        client_id: null,
        type_evenement: typeEvenement.length > 0 ? typeEvenement : null,
        modele_url: file_url,
        modele_nom: modeleNom,
        prestataire_id: company?.prestataire_id || null,
      });
    },
    onSuccess: () => {
      qc.invalidateQueries(['contrats']);
      qc.invalidateQueries(['modeles']);
      toast.success('Modèle enregistré dans « Mes modèles »');
      onClose();
    },
    onError: (e) => toast.error(e.message),
  });

  const handleFileSelect = (e) => {
    const f = e.target.files?.[0];
    if (f) {
      setFile(f);
      setFileName(f.name);
    }
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/40 backdrop-blur-sm p-4">
      <div className="bg-card rounded-2xl border border-border shadow-xl w-full max-w-lg p-6 space-y-5">
        <div className="flex items-center justify-between">
          <h3 className="font-semibold text-lg">Mon propre contrat</h3>
          <button onClick={onClose} className="p-1.5 rounded-lg hover:bg-muted text-muted-foreground">
            <X size={16} />
          </button>
        </div>

        <div className="bg-blue-50 border border-blue-200 rounded-xl p-3 flex gap-3">
          <AlertCircle size={16} className="text-blue-700 shrink-0 mt-0.5" />
          <p className="text-sm text-blue-700">Téléchargez votre modèle de contrat PDF et nommez-le pour le retrouver facilement lors de la création d'événements.</p>
        </div>

        <div className="space-y-4">
          {/* Nom du modèle */}
          <div className="space-y-1.5">
            <label className="text-sm font-medium">Nom du modèle *</label>
            <Input
              value={nom}
              onChange={e => setNom(e.target.value)}
              placeholder="ex: Contrat mariage 2026"
              autoComplete="off"
              autoCorrect="off"
              spellCheck={false}
            />
          </div>

          {/* Type d'événement */}
          <div className="space-y-1.5">
            <label className="text-sm font-medium">Type(s) d'événement associé(s) <span className="text-xs text-muted-foreground font-normal">(optionnel)</span></label>
            <TypeEvenementMultiSelect
              value={typeEvenement}
              onChange={setTypeEvenement}
            />
          </div>

          {/* Upload fichier */}
          <div className="space-y-1.5">
            <label className="text-sm font-medium">Fichier PDF *</label>
            <label className="flex items-center justify-center gap-2 border-2 border-dashed border-border rounded-xl p-6 bg-muted/30 hover:bg-muted/50 cursor-pointer transition-colors">
              <Upload size={18} className="text-muted-foreground" />
              <div className="text-center">
                <p className="text-sm font-medium">{fileName || 'Cliquez ou déposez votre PDF'}</p>
                <p className="text-xs text-muted-foreground mt-0.5">PDF uniquement</p>
              </div>
              <input
                type="file"
                accept=".pdf"
                onChange={handleFileSelect}
                className="hidden"
              />
            </label>
          </div>
        </div>

        <div className="flex justify-end gap-2 pt-2">
          <Button variant="outline" onClick={onClose}>Annuler</Button>
          <Button
            onClick={() => saveMutation.mutate()}
            disabled={!nom || !file || saveMutation.isPending}
          >
            {saveMutation.isPending ? 'Enregistrement...' : 'Enregistrer'}
          </Button>
        </div>
      </div>
    </div>
  );
}