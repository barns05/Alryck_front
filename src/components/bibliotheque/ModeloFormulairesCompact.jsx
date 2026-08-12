import { useState } from 'react';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { base44 } from '@/api/base44Client';
import { Plus, Trash2, Pencil, FileText, Copy, Play } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { useToast } from '@/components/ui/use-toast';
import ModeleFormulaireModal from '@/components/formulaire/ModeleFormulaireModal';
import FormulaireModeTest from '@/components/formulaire/FormulaireModeTest';
import ImportDocumentModal from './ImportDocumentModal';
import GenerationOrchestrator from '@/components/formulaire/GenerationOrchestrator';
import CreerModal from './CreerModal';
import DeleteConfirmModal from '@/components/ui/DeleteConfirmModal';
import BulkSelectionBar from '@/components/ui/BulkSelectionBar';

function ModeloCard({ modele, onEdit, onDuplicate, onDelete, onTest, isSelected, onToggleSelect }) {
  const isExemple = modele.is_exemple;

  return (
    <div className={`rounded-xl border p-4 space-y-3 transition-all hover:shadow-lg ${isSelected ? 'ring-2 ring-primary' : ''} ${
      isExemple
        ? 'bg-gradient-to-br from-blue-50 to-blue-50/50 dark:from-blue-950/20 dark:to-blue-950/10 border-blue-200 dark:border-blue-900'
        : 'bg-gradient-to-br from-card to-card border-border'
    }`}>
      <div className="flex items-start gap-2">
        {!isExemple && (
          <input
            type="checkbox"
            checked={isSelected}
            onChange={onToggleSelect}
            onClick={e => e.stopPropagation()}
            className="mt-0.5 shrink-0 accent-primary"
          />
        )}
      <div className="flex-1 space-y-1.5">
        <div className="flex items-start justify-between gap-2">
          <h4 className="font-semibold text-sm leading-snug flex-1">{modele.nom}</h4>
          {isExemple && (
            <span className="text-xs bg-blue-100 dark:bg-blue-900 text-blue-700 dark:text-blue-300 px-2 py-0.5 rounded-full shrink-0 whitespace-nowrap">
              Exemple
            </span>
          )}
        </div>
        <p className="text-xs text-muted-foreground">
          {modele.champs?.length || 0} question{(modele.champs?.length || 0) !== 1 ? 's' : ''}
          {modele.type_evenement && ` · ${modele.type_evenement}`}
        </p>
      </div>

      </div>
      {modele.champs?.length > 0 && (
        <div className="space-y-1">
          <p className="text-xs font-medium text-muted-foreground">Aperçu :</p>
          <div className="flex flex-wrap gap-1">
            {modele.champs.slice(0, 3).map((c, i) => (
              <span key={i} className="text-xs bg-muted/50 px-2 py-0.5 rounded truncate max-w-xs">
                {c.label}
              </span>
            ))}
            {modele.champs.length > 3 && (
              <span className="text-xs text-muted-foreground">+{modele.champs.length - 3}</span>
            )}
          </div>
        </div>
      )}
      <div className="flex gap-1.5 pt-1">
        <Button
          size="sm"
          variant="outline"
          className="flex-1 h-8 text-xs gap-1"
          onClick={() => onTest()}
        >
          <Play size={12} /> Tester
        </Button>
        {isExemple ? (
          <Button
            size="sm"
            className="flex-1 h-8 text-xs gap-1"
            onClick={() => onDuplicate()}
          >
            <Copy size={12} /> Dupliquer
          </Button>
        ) : (
          <Button
            size="sm"
            variant="outline"
            className="h-8 w-8 p-0 shrink-0"
            onClick={() => onEdit()}
            title="Modifier"
          >
            <Pencil size={12} />
          </Button>
        )}
        {!isExemple && (
          <Button
            size="sm"
            variant="outline"
            className="h-8 w-8 p-0 shrink-0 text-destructive hover:text-destructive"
            onClick={() => onDelete()}
            title="Supprimer"
          >
            <Trash2 size={12} />
          </Button>
        )}
      </div>
    </div>
  );
}

export default function ModeloFormulairesCompact() {
  const qc = useQueryClient();
  const { toast } = useToast();
  const [modeleFormModal, setModeleFormModal] = useState(null);
  const [modeTest, setModeTest] = useState(null);
  const [deleteModal, setDeleteModal] = useState(null);
  const [bulkDeleteModal, setBulkDeleteModal] = useState(false);
  const [selectedIds, setSelectedIds] = useState([]);
  const [creerModal, setCreerModal] = useState(false);
  const [amandaFile, setAmandaFile] = useState(null);
  const [orchestratorFormula, setOrchestratorFormula] = useState(null);

  const { data: modeles = [], isLoading } = useQuery({
    queryKey: ['modeles-formulaire'],
    queryFn: () => base44.entities.ModeleFormulaire.list(),
  });

  // Trier par récents en premier
  const sortedModeles = [...modeles].sort((a, b) => {
    const dateA = new Date(a.updated_date || a.created_date);
    const dateB = new Date(b.updated_date || b.created_date);
    return dateB - dateA;
  });

  const deleteModele = useMutation({
    mutationFn: (id) => base44.entities.ModeleFormulaire.delete(id),
    onSuccess: () => {
      qc.invalidateQueries(['modeles-formulaire']);
      setDeleteModal(null);
      toast({ title: '✓ Questionnaire supprimé' });
    },
  });

  const bulkDelete = useMutation({
    mutationFn: () => Promise.all(selectedIds.map(id => base44.entities.ModeleFormulaire.delete(id))),
    onSuccess: () => {
      qc.invalidateQueries(['modeles-formulaire']);
      setSelectedIds([]);
      setBulkDeleteModal(false);
      toast({ title: `✓ ${selectedIds.length} questionnaire(s) supprimé(s)` });
    },
  });

  const toggleSelect = (id) => {
    const m = modeles.find(m => m.id === id);
    if (m?.is_exemple) return;
    setSelectedIds(prev => prev.includes(id) ? prev.filter(i => i !== id) : [...prev, id]);
  };

  const duplicateModele = useMutation({
    mutationFn: async (m) => {
      const copy = { ...m };
      delete copy.id;
      delete copy.created_date;
      delete copy.updated_date;
      delete copy.created_by;
      copy.nom = `${m.nom} (copie)`;
      copy.is_exemple = false;
      return base44.entities.ModeleFormulaire.create(copy);
    },
    onSuccess: () => {
      qc.invalidateQueries(['modeles-formulaire']);
      toast({ title: '✓ Modèle dupliqué', description: 'Vous pouvez maintenant le modifier.' });
    },
  });

  // Séparer exemples et custom (déjà triés par récents)
  const exemples = sortedModeles.filter(m => m.is_exemple);
  const custom = sortedModeles.filter(m => !m.is_exemple);

  return (
    <div className="bg-card border border-border rounded-2xl overflow-hidden">
      <div className="flex items-center justify-between px-5 py-4 border-b border-border">
        <div>
          <h3 className="font-semibold text-base">📝 Questionnaires</h3>
          <p className="text-xs text-muted-foreground mt-0.5">
            {sortedModeles.length} modèle{sortedModeles.length !== 1 ? 's' : ''}
          </p>
        </div>
        <Button size="sm" className="gap-1.5" onClick={() => setCreerModal(true)}>
          <Plus size={14} /> Créer
        </Button>
      </div>

      <div className="p-4">
        {isLoading ? (
          <p className="text-sm text-muted-foreground text-center py-6">Chargement...</p>
        ) : sortedModeles.length === 0 ? (
          <div className="text-center py-10 text-muted-foreground">
            <FileText size={28} className="mx-auto mb-2 opacity-20" />
            <p className="text-sm font-medium">Aucun modèle de questionnaire</p>
            <p className="text-xs mt-1">Créez des modèles pour préparer vos événements rapidement</p>
          </div>
        ) : (
          <div className="space-y-6">
            {/* Modèles personnalisés (en haut) */}
            {custom.length > 0 && (
              <div className="space-y-3">
                <div className="flex items-center gap-2">
                  <input type="checkbox"
                    checked={custom.length > 0 && custom.every(m => selectedIds.includes(m.id))}
                    onChange={e => {
                      if (e.target.checked) setSelectedIds(prev => [...new Set([...prev, ...custom.map(m => m.id)])]);
                      else setSelectedIds(prev => prev.filter(id => !custom.map(m => m.id).includes(id)));
                    }}
                    className="accent-primary"
                  />
                  <h4 className="text-xs font-semibold text-muted-foreground uppercase">Mes modèles</h4>
                </div>
                <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-3">
                  {custom.map(m => (
                    <ModeloCard
                      key={m.id}
                      modele={m}
                      onEdit={() => setModeleFormModal(m)}
                      onDuplicate={() => duplicateModele.mutate(m)}
                      onDelete={() => setDeleteModal(m)}
                      onTest={() => setModeTest(m)}
                      isSelected={selectedIds.includes(m.id)}
                      onToggleSelect={() => toggleSelect(m.id)}
                    />
                  ))}
                </div>
              </div>
            )}

            {/* Modèles exemples (en bas) */}
            {exemples.length > 0 && (
              <div className="space-y-3">
                <div className="flex items-center gap-2">
                  <h4 className="text-xs font-semibold text-muted-foreground uppercase">Modèles exemples</h4>
                </div>
                <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-3">
                  {exemples.map(m => (
                    <ModeloCard
                      key={m.id}
                      modele={m}
                      onEdit={() => setModeleFormModal(m)}
                      onDuplicate={() => duplicateModele.mutate(m)}
                      onDelete={() => setDeleteModal(m)}
                      onTest={() => setModeTest(m)}
                      isSelected={selectedIds.includes(m.id)}
                      onToggleSelect={() => toggleSelect(m.id)}
                    />
                  ))}
                </div>
              </div>
            )}
          </div>
        )}
      </div>

      {/* Modales */}
      {creerModal && (
        <CreerModal
          title="Questionnaire"
          onManual={() => setModeleFormModal('new')}
          onImageSimple={async (file) => {
            const { file_url } = await base44.integrations.Core.UploadFile({ file });
            await base44.entities.ModeleFormulaire.create({ nom: file.name.replace(/\.[^/.]+$/, '') });
            qc.invalidateQueries(['modeles-formulaire']);
          }}
          onImageAmanda={(file) => setAmandaFile(file)}
          onGenerateFromFormula={() => setOrchestratorFormula('__catalogue__')}
          onClose={() => setCreerModal(false)}
        />
      )}
      {amandaFile && (
        <ImportDocumentModal
          preselectedType="formulaire"
          initialFile={amandaFile}
          onClose={() => setAmandaFile(null)}
          onCreated={() => qc.invalidateQueries(['modeles-formulaire'])}
        />
      )}

      {modeleFormModal && (
        <ModeleFormulaireModal
          modele={modeleFormModal === 'new' ? null : modeleFormModal}
          onClose={() => setModeleFormModal(null)}
        />
      )}

      <DeleteConfirmModal
        open={!!deleteModal}
        title={`Supprimer « ${deleteModal?.nom} » ?`}
        onConfirm={() => deleteModele.mutate(deleteModal.id)}
        onCancel={() => setDeleteModal(null)}
        loading={deleteModele.isPending}
      />
      <DeleteConfirmModal
        open={bulkDeleteModal}
        title={`Supprimer ${selectedIds.length} questionnaire(s) ?`}
        onConfirm={() => bulkDelete.mutate()}
        onCancel={() => setBulkDeleteModal(false)}
        loading={bulkDelete.isPending}
      />
      <BulkSelectionBar
        count={selectedIds.length}
        onDelete={() => setBulkDeleteModal(true)}
        onClear={() => setSelectedIds([])}
      />

      {modeTest && (
        <FormulaireModeTest modele={modeTest} onClose={() => setModeTest(null)} />
      )}

      {orchestratorFormula && (
        <GenerationOrchestrator
          formulaName={orchestratorFormula === '__catalogue__' ? null : orchestratorFormula}
          onClose={() => setOrchestratorFormula(null)}
          onCreated={() => qc.invalidateQueries(['modeles-formulaire'])}
        />
      )}
    </div>
  );
}