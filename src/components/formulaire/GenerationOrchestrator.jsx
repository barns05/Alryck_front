/**
 * Orchestrateur de génération de formulaire depuis une formule catalogue.
 * Flux en 3 étapes claires :
 *   Étape 1 — Choix du mode (intelligent vs document)
 *   Étape 2 — Choix du type de formulaire (universel vs dédié) — formulaires uniquement
 *   Étape 3 — Gestion du conflit si formulaire existant
 */
import { useState } from 'react';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { base44 } from '@/api/base44Client';
import { X, Zap, FileText, RefreshCw, Pencil, Plus, Loader2, Upload, Globe, BookOpen } from 'lucide-react';
import AmandaMessage from '@/components/AmandaMessage';
import AmandaProcessing from '@/components/AmandaProcessing';
import { Button } from '@/components/ui/button';
import { useToast } from '@/components/ui/use-toast';
import SelectFormulaModal from '@/components/bibliotheque/SelectFormulaModal';
import ModeleFormulaireModal from '@/components/formulaire/ModeleFormulaireModal';
import ModeleProgrammeModal from '@/components/programme/ModeleProgrammeModal';

// ─── Composant de base pour toutes les modales ────────────────────────────────
function ModalShell({ title, subtitle, onClose, children }) {
  return (
    <div className="fixed inset-0 z-50 bg-black/50 backdrop-blur-sm flex items-center justify-center p-4" onClick={onClose}>
      <div
        className="bg-white rounded-2xl border border-slate-200 shadow-xl w-full max-w-md flex flex-col overflow-hidden"
        onClick={e => e.stopPropagation()}
        style={{ maxHeight: '90vh' }}
      >
        {/* Header */}
        <div className="flex items-start justify-between px-5 pt-5 pb-4 border-b border-slate-100 shrink-0">
          <div className="flex-1 min-w-0 pr-3">
            <h2 className="font-bold text-base text-slate-900">{title}</h2>
            {subtitle && <p className="text-sm text-slate-500 mt-0.5">{subtitle}</p>}
          </div>
          <button
            onClick={onClose}
            className="p-1.5 rounded-lg hover:bg-slate-100 text-slate-400 hover:text-slate-600 shrink-0 transition-colors"
          >
            <X size={16} />
          </button>
        </div>

        {/* Content */}
        <div className="overflow-y-auto flex-1 p-5" style={{ paddingBottom: 'max(1.25rem, env(safe-area-inset-bottom) + 110px)' }}>
          {children}
        </div>
      </div>
    </div>
  );
}

// ─── Carte d'option ───────────────────────────────────────────────────────────
function OptionCard({ icon, title, subtitle, onClick, highlighted, disabled }) {
  return (
    <button
      onClick={onClick}
      disabled={disabled}
      className={`w-full flex items-start gap-4 p-4 rounded-xl border-2 text-left transition-all disabled:opacity-50 disabled:cursor-not-allowed
        ${highlighted
          ? 'border-primary bg-primary/5 hover:bg-primary/10'
          : 'border-slate-200 bg-white hover:bg-slate-50 hover:border-slate-300'
        }`}
    >
      <div className={`w-10 h-10 rounded-xl flex items-center justify-center shrink-0 mt-0.5 text-xl
        ${highlighted ? 'bg-primary/10' : 'bg-slate-100'}`}>
        {icon}
      </div>
      <div className="flex-1 min-w-0">
        <p className="text-sm font-semibold text-slate-900 leading-snug">{title}</p>
        {subtitle && <p className="text-xs text-slate-500 mt-1 leading-relaxed">{subtitle}</p>}
      </div>
    </button>
  );
}

// ─── ÉTAPE 1 : Choix du mode ──────────────────────────────────────────────────
function Etape1ChoixMode({ formulaName, isProgramme, onSelectMode, onClose }) {
  const label = isProgramme ? 'programme' : 'questionnaire';
  return (
    <ModalShell
      title={`Générer le ${label}`}
      subtitle={`${isProgramme ? 'Menu' : 'Formule'} : ${formulaName}`}
      onClose={onClose}
    >
      <div className="space-y-3">
        <OptionCard
          icon="⚡"
          title={isProgramme ? 'Générer automatiquement depuis le menu' : 'Questionnaire intelligent'}
          subtitle={
            isProgramme
              ? 'Amanda analyse votre menu et génère les étapes automatiquement. Recommandé.'
              : 'Amanda analyse votre formule et génère les questions adaptées automatiquement pour votre questionnaire.'
          }
          onClick={() => onSelectMode('intelligent')}
          highlighted
        />
        <OptionCard
          icon="📄"
          title={isProgramme ? 'Créer manuellement' : 'Envoyer un document'}
          subtitle={
            isProgramme
              ? "Création manuelle avec l'éditeur de programme."
              : 'Uploadez votre propre questionnaire PDF ou image. Il sera envoyé tel quel à votre client, sans logique conditionnelle.'
          }
          onClick={() => onSelectMode(isProgramme ? 'manuel' : 'document')}
        />
      </div>
    </ModalShell>
  );
}

// ─── ÉTAPE 2 : Choix du type de formulaire (universel vs dédié) ───────────────
function Etape2ChoixType({ formulaName, onSelectType, onClose }) {
  return (
    <ModalShell
      title="Comment souhaitez-vous générer ce questionnaire ?"
      subtitle={null}
      onClose={onClose}
    >
      <div className="space-y-3">
        <OptionCard
          icon={<Globe size={18} className="text-primary" />}
          title="🌐 Ajouter au questionnaire universel"
          subtitle="Les questions spécifiques à cette formule seront ajoutées au questionnaire universel existant. Un seul questionnaire s'adapte automatiquement à tous vos clients selon leur formule choisie. Recommandé."
          onClick={() => onSelectType('universel')}
          highlighted
        />
        <OptionCard
          icon={<BookOpen size={18} className="text-slate-500" />}
          title="📋 Questionnaire dédié à cette formule"
          subtitle="Créer un questionnaire unique pour cette formule uniquement. Idéal si cette formule a des questions très différentes des autres."
          onClick={() => onSelectType('dedie')}
        />
      </div>
    </ModalShell>
  );
}

// ─── ÉTAPE 3A : Conflit formulaire universel ──────────────────────────────────
function Etape3ConflitUniversel({ onEdit, onRegenerate, onClose, isLoading }) {
  return (
    <ModalShell
      title="⚠️ Questionnaire universel existant"
      subtitle="Des questions existent déjà dans votre questionnaire universel."
      onClose={onClose}
    >
      <div className="space-y-3">
        <OptionCard
          icon={<Pencil size={18} className="text-primary" />}
          title="✏️ Modifier l'existant"
          subtitle="Ouvrir le questionnaire universel en édition pour ajuster les questions."
          onClick={onEdit}
          disabled={isLoading}
        />
        <OptionCard
          icon={<RefreshCw size={18} className="text-amber-600" />}
          title="🔄 Régénérer"
          subtitle="Recréer les questions depuis la bibliothèque en tenant compte de cette formule. Les questions existantes seront conservées."
          onClick={onRegenerate}
          disabled={isLoading}
        />
        {isLoading && (
          <div className="flex items-center justify-center py-2">
            <AmandaProcessing size="sm" message="Traitement en cours…" />
          </div>
        )}
      </div>
    </ModalShell>
  );
}

// ─── ÉTAPE 3B : Conflit formulaire dédié ─────────────────────────────────────
function Etape3ConflitDedie({ formulaName, onReplace, onEdit, onCreateNew, onClose, isLoading }) {
  return (
    <ModalShell
      title={`⚠️ Questionnaire existant pour ${formulaName}`}
      subtitle="Un questionnaire dédié existe déjà pour cette formule."
      onClose={onClose}
    >
      <div className="space-y-3">
        <OptionCard
          icon={<RefreshCw size={18} className="text-amber-600" />}
          title="🔄 Remplacer"
          subtitle="Supprimer l'ancien et régénérer un nouveau questionnaire dédié."
          onClick={onReplace}
          disabled={isLoading}
        />
        <OptionCard
          icon={<Pencil size={18} className="text-primary" />}
          title="✏️ Modifier l'existant"
          subtitle="Ouvrir ce questionnaire en édition pour l'ajuster manuellement."
          onClick={onEdit}
          disabled={isLoading}
        />
        <OptionCard
          icon={<Plus size={18} className="text-emerald-600" />}
          title="➕ Créer un nouveau"
          subtitle="Générer un questionnaire supplémentaire avec un nom distinct. Vous pourrez choisir lequel envoyer à chaque client."
          onClick={onCreateNew}
          disabled={isLoading}
        />
        {isLoading && (
          <div className="flex items-center justify-center py-2">
            <AmandaProcessing size="sm" message="Traitement en cours…" />
          </div>
        )}
      </div>
    </ModalShell>
  );
}

// ─── Mode document — upload simple ───────────────────────────────────────────
function DocumentUploadModal({ formulaName, onClose, onCreated, existingSuffix }) {
  const qc = useQueryClient();
  const { toast } = useToast();
  const [uploading, setUploading] = useState(false);
  const [file, setFile] = useState(null);

  const handleUpload = async () => {
    if (!file) return;
    setUploading(true);
    const { file_url } = await base44.integrations.Core.UploadFile({ file });
    const suffix = existingSuffix ? ` (${existingSuffix})` : '';
    await base44.entities.ModeleFormulaire.create({
      nom: `Questionnaire — ${formulaName}${suffix}`,
      champs: [],
      document_url: file_url,
      document_nom: file.name,
    });
    qc.invalidateQueries(['modeles-formulaire']);
    toast({ title: '✅ Document enregistré', description: 'Il sera envoyé directement au client.' });
    onCreated();
    onClose();
    setUploading(false);
  };

  return (
    <ModalShell
      title="📄 Envoyer un document"
      subtitle="Image ou PDF — envoyé directement au client"
      onClose={onClose}
    >
      <div className="space-y-4">
        <label className={`flex flex-col items-center gap-3 border-2 border-dashed rounded-xl py-10 px-4 cursor-pointer transition-colors
          ${file ? 'border-primary bg-primary/5' : 'border-slate-200 hover:border-primary/50 hover:bg-slate-50'}`}>
          <input type="file" accept="image/*,.pdf" className="hidden" onChange={e => setFile(e.target.files?.[0] || null)} />
          <Upload size={28} className={file ? 'text-primary' : 'text-slate-400'} />
          {file ? (
            <div className="text-center">
              <p className="text-sm font-medium text-primary">{file.name}</p>
              <p className="text-xs text-slate-500">{(file.size / 1024).toFixed(0)} Ko</p>
            </div>
          ) : (
            <div className="text-center">
              <p className="text-sm font-medium text-slate-700">Cliquer pour uploader</p>
              <p className="text-xs text-slate-500">PDF, JPG, PNG acceptés</p>
            </div>
          )}
        </label>

        <div className="flex gap-2 justify-end">
          <Button variant="outline" onClick={onClose} disabled={uploading}>Annuler</Button>
          <Button onClick={handleUpload} disabled={!file || uploading}>
            {uploading ? <><Loader2 size={14} className="animate-spin mr-1" /> Upload…</> : '✓ Enregistrer'}
          </Button>
        </div>
      </div>
    </ModalShell>
  );
}

// ─── Orchestrateur principal ──────────────────────────────────────────────────

export default function GenerationOrchestrator({ formulaName, onClose, onCreated, resourceType = 'formulaire' }) {
  const qc = useQueryClient();
  const { toast } = useToast();

  const isProgramme = resourceType === 'programme';
  const Entity = isProgramme ? base44.entities.ModeleProgramme : base44.entities.ModeleFormulaire;
  const queryKey = isProgramme ? 'modeles-programme' : 'modeles-formulaire';

  // NOM DU FORMULAIRE UNIVERSEL
  const NOM_UNIVERSEL = '🌐 Questionnaire universel';

  // États
  const [step, setStep] = useState('etape1'); // 'etape1' | 'etape2' | 'etape3_universel' | 'etape3_dedie' | 'selection' | 'document' | 'builder'
  const [typeChoisi, setTypeChoisi] = useState(null); // 'universel' | 'dedie'
  const [ressourceExistante, setRessourceExistante] = useState(null);
  const [modeleGenere, setModeleGenere] = useState(null);
  const [loadingConflit, setLoadingConflit] = useState(false);
  const [suffix, setSuffix] = useState('');

  const { data: modeles = [] } = useQuery({
    queryKey: [queryKey],
    queryFn: () => Entity.list(),
  });

  // ── Étape 1 : Sélection du mode ──
  const handleSelectMode = (mode) => {
    if (mode === 'document') {
      setStep('document');
    } else if (isProgramme && mode === 'manuel') {
      setModeleGenere('new');
      setStep('builder');
    } else {
      // Mode intelligent → étape 2 (sauf pour programmes)
      if (isProgramme) {
        // Pour les programmes : pas d'étape 2, on cherche directement le conflit
        const nomCible = formulaName;
        const existant = modeles.find(m => m.nom?.includes(nomCible) && !m.is_exemple);
        if (existant) {
          setRessourceExistante(existant);
          setTypeChoisi('dedie');
          setStep('etape3_dedie');
        } else {
          setStep('selection');
        }
      } else {
        setStep('etape2');
      }
    }
  };

  // ── Étape 2 : Sélection du type (universel / dédié) ──
  const handleSelectType = (type) => {
    setTypeChoisi(type);

    if (type === 'universel') {
      const existant = modeles.find(m => m.nom === NOM_UNIVERSEL);
      if (existant) {
        setRessourceExistante(existant);
        setStep('etape3_universel');
      } else {
        // Pas de formulaire universel → générer directement avec le nom universel
        setStep('selection');
      }
    } else {
      // Dédié
      const existant = modeles.find(m => m.nom?.includes(formulaName) && m.nom !== NOM_UNIVERSEL && !m.is_exemple);
      if (existant) {
        setRessourceExistante(existant);
        setStep('etape3_dedie');
      } else {
        setStep('selection');
      }
    }
  };

  // ── Étape 3A : Actions sur formulaire universel ──
  const handleUniverselEdit = () => {
    setModeleGenere(ressourceExistante);
    setStep('builder');
  };

  const handleUniverselRegenerate = () => {
    // Régénérer = aller à la sélection avec le nom universel (sans supprimer l'existant)
    setStep('selection');
  };

  // ── Étape 3B : Actions sur formulaire dédié ──
  const handleDedieReplace = async () => {
    setLoadingConflit(true);
    await Entity.delete(ressourceExistante.id);
    qc.invalidateQueries([queryKey]);
    setLoadingConflit(false);
    setRessourceExistante(null);
    setStep('selection');
  };

  const handleDedieEdit = () => {
    setModeleGenere(ressourceExistante);
    setStep('builder');
  };

  const handleDedieCreateNew = () => {
    const count = modeles.filter(m => m.nom?.includes(formulaName) && !m.is_exemple).length;
    setSuffix(`${count + 1}`);
    setStep('selection');
  };

  // ── Après génération intelligente → ouvrir le builder ──
  const handleAfterGeneration = () => {
    qc.invalidateQueries([queryKey]);
    setStep('success_amanda');
  };

  const handleAfterSuccess = () => {
    // Mode universel : pas de nouveau formulaire créé → fermer directement
    if (typeChoisi === 'universel') {
      onCreated?.();
      onClose();
      return;
    }

    // Mode dédié : retrouver le formulaire créé et ouvrir le builder
    const nomCible = formulaName;
    Entity.list().then(tous => {
      const created = tous
        .filter(m => m.nom?.includes(nomCible) && !m.is_exemple)
        .sort((a, b) => new Date(b.created_date) - new Date(a.created_date))[0];
      if (created) {
        setModeleGenere(created);
        setStep('builder');
      } else {
        onCreated?.();
        onClose();
      }
    });
  };

  // ── Nom cible selon le type choisi ──
  const nomCible = typeChoisi === 'universel'
    ? NOM_UNIVERSEL
    : (isProgramme ? formulaName : formulaName);

  // ── Rendu selon l'étape ──

  if (step === 'etape1') {
    return (
      <Etape1ChoixMode
        formulaName={formulaName}
        isProgramme={isProgramme}
        onSelectMode={handleSelectMode}
        onClose={onClose}
      />
    );
  }

  if (step === 'etape2') {
    return (
      <Etape2ChoixType
        formulaName={formulaName}
        onSelectType={handleSelectType}
        onClose={onClose}
      />
    );
  }

  if (step === 'etape3_universel') {
    return (
      <Etape3ConflitUniversel
        onEdit={handleUniverselEdit}
        onRegenerate={handleUniverselRegenerate}
        onClose={onClose}
        isLoading={loadingConflit}
      />
    );
  }

  if (step === 'etape3_dedie') {
    return (
      <Etape3ConflitDedie
        formulaName={formulaName}
        onReplace={handleDedieReplace}
        onEdit={handleDedieEdit}
        onCreateNew={handleDedieCreateNew}
        onClose={onClose}
        isLoading={loadingConflit}
      />
    );
  }

  if (step === 'success_amanda') {
    const label = isProgramme ? 'programme' : 'questionnaire';
    return (
      <div className="fixed inset-0 z-50 bg-black/50 backdrop-blur-sm flex items-center justify-center p-4" onClick={handleAfterSuccess}>
        <div className="bg-white rounded-2xl shadow-2xl px-8 py-6 flex flex-col items-center" style={{ maxWidth: 340 }} onClick={e => e.stopPropagation()}>
          <AmandaMessage
            type="success"
            message={`Le ${label} a été généré depuis votre formule ! Vérifiez-le et ajustez si besoin.`}
          />
          <button
            onClick={handleAfterSuccess}
            className="mt-4 px-6 py-2 rounded-full text-sm font-semibold bg-primary text-white hover:bg-primary/90 transition-colors"
          >
            Voir le {label} →
          </button>
        </div>
      </div>
    );
  }

  if (step === 'selection') {
    return (
      <SelectFormulaModal
        formulaName={typeChoisi === 'universel' ? formulaName : nomCible}
        nameSuffix={suffix}
        onClose={onClose}
        onGenerated={handleAfterGeneration}
        isUniversel={typeChoisi === 'universel'}
        existingModele={typeChoisi === 'universel' ? ressourceExistante : null}
      />
    );
  }

  if (step === 'document') {
    return (
      <DocumentUploadModal
        formulaName={formulaName}
        existingSuffix={suffix}
        onClose={onClose}
        onCreated={() => { onCreated?.(); }}
      />
    );
  }

  if (step === 'builder' && modeleGenere) {
    const BuilderComponent = isProgramme ? ModeleProgrammeModal : ModeleFormulaireModal;
    return (
      <BuilderComponent
        modele={modeleGenere === 'new' ? null : modeleGenere}
        onClose={() => { onCreated?.(); onClose(); }}
      />
    );
  }

  return null;
}