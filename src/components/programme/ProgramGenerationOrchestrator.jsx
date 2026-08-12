/**
 * Orchestrateur de génération de programme depuis une formule catalogue.
 * Flux linéaire : Mode → Vérification conflit → Résolution → Sélection étapes
 */
import { useState, useEffect } from 'react';
import { useQuery, useQueryClient } from '@tanstack/react-query';
import { base44 } from '@/api/base44Client';
import { X, Zap, FileText, RefreshCw, Pencil, Plus, Loader2, Upload, AlertCircle } from 'lucide-react';
import AmandaProcessing from '@/components/AmandaProcessing';
import { Button } from '@/components/ui/button';
import { useToast } from '@/components/ui/use-toast';
import SelectEtapesModal from '@/components/programme/SelectEtapesModal';
import ModeleProgrammeModal from '@/components/programme/ModeleProgrammeModal';

// ─── Étape 1 : Choix du mode ────────────────────────────────────────────────

function ChoixModeModal({ displayName, onSelectMode, onClose }) {
  return (
    <div className="fixed inset-0 z-50 bg-black/50 backdrop-blur-sm flex items-center justify-center p-4" onClick={onClose}>
      <div className="bg-card rounded-2xl border border-border shadow-xl w-full max-w-md overflow-hidden" onClick={e => e.stopPropagation()}>
        <div className="flex items-center justify-between px-5 py-4 border-b border-border">
          <div>
            <h2 className="font-bold text-base">Générer le programme</h2>
            <p className="text-xs text-muted-foreground mt-0.5">Menu : <strong>{displayName}</strong></p>
          </div>
          <button onClick={onClose} className="p-1.5 rounded-lg hover:bg-muted text-muted-foreground">
            <X size={16} />
          </button>
        </div>

        <div className="p-5 space-y-3">
          <p className="text-sm text-muted-foreground">Comment souhaitez-vous créer votre programme ?</p>

          <button
            onClick={() => onSelectMode('intelligent')}
            className="w-full flex items-start gap-4 p-4 rounded-xl border-2 border-primary bg-primary/5 hover:bg-primary/10 transition-colors text-left"
          >
            <div className="w-9 h-9 rounded-xl bg-primary/15 flex items-center justify-center shrink-0 mt-0.5">
              <Zap size={18} className="text-primary" />
            </div>
            <div>
              <p className="text-sm font-semibold">📅 Générer automatiquement depuis le menu</p>
              <p className="text-xs text-muted-foreground mt-0.5 leading-relaxed">
                Création automatique des étapes basée sur votre menu. Recommandé.
              </p>
            </div>
          </button>

          <button
            onClick={() => onSelectMode('document')}
            className="w-full flex items-start gap-4 p-4 rounded-xl border border-border hover:bg-muted/40 transition-colors text-left"
          >
            <div className="w-9 h-9 rounded-xl bg-muted flex items-center justify-center shrink-0 mt-0.5">
              <FileText size={18} className="text-muted-foreground" />
            </div>
            <div>
              <p className="text-sm font-semibold">📄 Uploader un document</p>
              <p className="text-xs text-muted-foreground mt-0.5 leading-relaxed">
                Upload d'une image ou d'un PDF envoyé directement au client, sans logique conditionnelle.
              </p>
            </div>
          </button>
        </div>
      </div>
    </div>
  );
}

// ─── Étape 3 : Gestion du conflit (programme existant) ────────────────────

function ConflitModal({ displayName, programmeExistant, onReplace, onEdit, onCreateNew, onClose, isLoading }) {
  return (
    <div className="fixed inset-0 z-50 bg-black/50 backdrop-blur-sm flex items-center justify-center p-4" onClick={onClose}>
      <div className="bg-card rounded-2xl border border-border shadow-xl w-full max-w-md overflow-hidden" onClick={e => e.stopPropagation()}>
        <div className="flex items-center justify-between px-5 py-4 border-b border-border">
          <div className="flex items-center gap-2.5">
            <AlertCircle size={18} className="text-amber-600" />
            <h2 className="font-bold text-base">Programme existant</h2>
          </div>
          <button onClick={onClose} className="p-1.5 rounded-lg hover:bg-muted text-muted-foreground">
            <X size={16} />
          </button>
        </div>

        <div className="p-5 space-y-4">
          <p className="text-sm text-muted-foreground">
            Un programme existe déjà pour le menu <strong>{displayName}</strong>. Que souhaitez-vous faire ?
          </p>

          <div className="space-y-2">
            <button
              onClick={onReplace}
              disabled={isLoading}
              className="w-full flex items-center gap-3 p-3.5 rounded-xl border border-border hover:bg-muted/40 transition-colors text-left disabled:opacity-50"
            >
              <RefreshCw size={16} className="text-amber-600 shrink-0" />
              <div>
                <p className="text-sm font-medium">🔄 Remplacer</p>
                <p className="text-xs text-muted-foreground">Supprimer l'ancien et générer un nouveau</p>
              </div>
            </button>

            <button
              onClick={onEdit}
              disabled={isLoading}
              className="w-full flex items-center gap-3 p-3.5 rounded-xl border border-border hover:bg-muted/40 transition-colors text-left disabled:opacity-50"
            >
              <Pencil size={16} className="text-primary shrink-0" />
              <div>
                <p className="text-sm font-medium">✏️ Modifier l'existant</p>
                <p className="text-xs text-muted-foreground">Ouvrir le programme existant en édition</p>
              </div>
            </button>

            <button
              onClick={onCreateNew}
              disabled={isLoading}
              className="w-full flex items-center gap-3 p-3.5 rounded-xl border border-border hover:bg-muted/40 transition-colors text-left disabled:opacity-50"
            >
              <Plus size={16} className="text-emerald-600 shrink-0" />
              <div>
                <p className="text-sm font-medium">➕ Créer un nouveau</p>
                <p className="text-xs text-muted-foreground">Générer un programme supplémentaire avec un nom distinct</p>
              </div>
            </button>
          </div>

          {isLoading && (
            <div className="flex items-center justify-center py-2">
              <AmandaProcessing size="sm" message="Traitement en cours…" />
            </div>
          )}
        </div>
      </div>
    </div>
  );
}

// ─── Mode document — upload simple ───────────────────────────────────────

function DocumentUploadModal({ displayName, programmeName, onClose, onCreated, nameSuffix = '' }) {
  const qc = useQueryClient();
  const { toast } = useToast();
  const [uploading, setUploading] = useState(false);
  const [file, setFile] = useState(null);

  const handleUpload = async () => {
    if (!file) return;
    setUploading(true);
    const { file_url } = await base44.integrations.Core.UploadFile({ file });
    const finalName = `Programme — ${programmeName}${nameSuffix ? ` ${nameSuffix}` : ''}`;
    await base44.entities.ModeleProgramme.create({
      nom: finalName,
      etapes: [],
      document_url: file_url,
      document_nom: file.name,
    });
    qc.invalidateQueries(['modeles-programme']);
    toast({ title: '✅ Document enregistré', description: 'Il sera envoyé directement au client.' });
    onCreated?.();
    onClose();
    setUploading(false);
  };

  return (
    <div className="fixed inset-0 z-50 bg-black/50 backdrop-blur-sm flex items-center justify-center p-4" onClick={onClose}>
      <div className="bg-card rounded-2xl border border-border shadow-xl w-full max-w-md flex flex-col overflow-hidden" onClick={e => e.stopPropagation()}>
        <div className="flex items-center justify-between px-5 py-4 border-b border-border shrink-0">
          <div>
            <h2 className="font-bold text-base">📄 Uploader un document</h2>
            <p className="text-xs text-muted-foreground mt-0.5">{displayName} — Image ou PDF</p>
          </div>
          <button onClick={onClose} className="p-1.5 rounded-lg hover:bg-muted text-muted-foreground"><X size={16} /></button>
        </div>

        <div className="p-5 space-y-4 flex-1 overflow-y-auto">
          <label className={`flex flex-col items-center gap-3 border-2 border-dashed rounded-xl py-10 px-4 cursor-pointer transition-colors ${file ? 'border-primary bg-primary/5' : 'border-border hover:border-primary/50 hover:bg-muted/30'}`}>
            <input type="file" accept="image/*,.pdf" className="hidden" onChange={e => setFile(e.target.files?.[0] || null)} />
            <Upload size={28} className={file ? 'text-primary' : 'text-muted-foreground'} />
            {file ? (
              <div className="text-center">
                <p className="text-sm font-medium text-primary">{file.name}</p>
                <p className="text-xs text-muted-foreground">{(file.size / 1024).toFixed(0)} Ko</p>
              </div>
            ) : (
              <div className="text-center">
                <p className="text-sm font-medium">Cliquer pour uploader</p>
                <p className="text-xs text-muted-foreground">PDF, JPG, PNG acceptés</p>
              </div>
            )}
          </label>
        </div>
        <div className="modal-footer">
          <Button variant="outline" onClick={onClose} disabled={uploading}>Annuler</Button>
          <Button onClick={handleUpload} disabled={!file || uploading}>
            {uploading ? <><Loader2 size={14} className="animate-spin" /> Upload…</> : '✓ Enregistrer'}
          </Button>
        </div>
      </div>
    </div>
  );
}

// ─── Orchestrateur principal ──────────────────────────────────────────────

export default function ProgramGenerationOrchestrator({ programmeName, onClose, onCreated }) {
  const qc = useQueryClient();
  const { toast } = useToast();

  // Sécurité : afficher "Sans nom" si programmeName est vide
  const displayName = programmeName?.trim() || 'Sans nom';
  const programmeKey = `Programme — ${displayName}`;

  // États
  const [step, setStep] = useState('mode');
  const [mode, setMode] = useState(null); // 'intelligent' | 'document'
  const [nameSuffix, setNameSuffix] = useState('');
  const [existingProgram, setExistingProgram] = useState(null);
  const [isResolving, setIsResolving] = useState(false);

  // Charger la liste des ModeleProgramme
  const { data: allPrograms = [], isLoading: loadingPrograms } = useQuery({
    queryKey: ['modeles-programme'],
    queryFn: () => base44.entities.ModeleProgramme.list(),
  });

  // ── Étape 1 : Choix du mode ──
  const handleModeSelected = (selectedMode) => {
    setMode(selectedMode);
    
    // Si mode document, aller directement à l'upload
    if (selectedMode === 'document') {
      setStep('document');
      return;
    }

    // Si mode intelligent, vérifier le conflit
    if (loadingPrograms) {
      // Les données se chargent, attendre
      setStep('conflict_check');
      return;
    }

    // Données chargées, chercher conflit
    const existing = allPrograms.find(p => p.nom === programmeKey && !p.is_exemple);
    
    if (existing) {
      setExistingProgram(existing);
      setStep('conflict');
    } else {
      setStep('selection');
    }
  };

  // ── Effet : quand les données se chargent et on est en attente de conflit ──
  useEffect(() => {
    if (step === 'conflict_check' && !loadingPrograms) {
      const existing = allPrograms.find(p => p.nom === programmeKey && !p.is_exemple);
      if (existing) {
        setExistingProgram(existing);
        setStep('conflict');
      } else {
        setStep('selection');
      }
    }
  }, [loadingPrograms, step, allPrograms, programmeKey]);

  // ── Étape 3 : Résolution du conflit ──
  const handleReplace = async () => {
    setIsResolving(true);
    try {
      await base44.entities.ModeleProgramme.delete(existingProgram.id);
      qc.invalidateQueries(['modeles-programme']);
      setExistingProgram(null);
      setStep('selection');
    } catch (error) {
      toast({ title: '❌ Erreur', description: error.message, variant: 'destructive' });
    } finally {
      setIsResolving(false);
    }
  };

  const handleEdit = () => {
    setStep('builder');
  };

  const handleCreateNew = () => {
    const count = allPrograms.filter(p => 
      p.nom?.startsWith(programmeKey) && !p.is_exemple
    ).length;
    setNameSuffix(`(${count + 1})`);
    setStep('selection');
  };

  const handleCloseAll = () => {
    qc.invalidateQueries(['modeles-programme']);
    onCreated?.();
    onClose();
  };

  // ─── Rendu selon l'étape ───

  // Étape 1 : Choix du mode
  if (step === 'mode') {
    return (
      <ChoixModeModal
        displayName={displayName}
        onSelectMode={handleModeSelected}
        onClose={onClose}
      />
    );
  }

  // Attente de chargement des données pour vérifier conflit
  if (step === 'conflict_check') {
    return (
      <div className="fixed inset-0 z-50 bg-black/50 backdrop-blur-sm flex items-center justify-center p-4">
        <div className="bg-card rounded-2xl border border-border shadow-xl p-6 flex items-center gap-3">
          <AmandaProcessing size="sm" message="Vérification du conflit…" />
        </div>
      </div>
    );
  }

  // Étape 3 : Conflit détecté
  if (step === 'conflict') {
    return (
      <ConflitModal
        displayName={displayName}
        programmeExistant={existingProgram}
        onReplace={handleReplace}
        onEdit={handleEdit}
        onCreateNew={handleCreateNew}
        onClose={onClose}
        isLoading={isResolving}
      />
    );
  }

  // Étape 4 : Sélection des étapes
  if (step === 'selection') {
    return (
      <SelectEtapesModal
        formulaName={displayName}
        nameSuffix={nameSuffix}
        onClose={handleCloseAll}
        onGenerated={handleCloseAll}
      />
    );
  }

  // Mode document : upload
  if (step === 'document') {
    return (
      <DocumentUploadModal
        displayName={displayName}
        programmeName={displayName}
        nameSuffix={nameSuffix}
        onClose={onClose}
        onCreated={handleCloseAll}
      />
    );
  }

  // Édition d'un programme existant
  if (step === 'builder' && existingProgram) {
    return (
      <ModeleProgrammeModal
        modele={existingProgram}
        onClose={handleCloseAll}
      />
    );
  }

  return null;
}