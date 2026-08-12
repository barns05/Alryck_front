import { useState } from 'react';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { base44 } from '@/api/base44Client';
import { Plus, Trash2, Pencil, BookOpen, X, RefreshCw, Loader2 } from 'lucide-react';
import { Button } from '@/components/ui/button';
import HelpTooltip from '@/components/HelpTooltip';
import ModeleProgrammeModal from '@/components/programme/ModeleProgrammeModal';
import BibliothequeEtapes from '@/components/programme/BibliothequeEtapes';
import GenerationOrchestrator from '@/components/formulaire/GenerationOrchestrator';
import { formatDuree, formatTotalMinutes, totalMinutes } from '@/lib/programmeUtils';
import ImportDocumentModal from './ImportDocumentModal';
import CreerModal from './CreerModal';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import DeleteConfirmModal from '@/components/ui/DeleteConfirmModal';
import BulkSelectionBar from '@/components/ui/BulkSelectionBar';

// Carte Programme compacte
function ProgrammeCard({ modele, onEdit, onDelete, onSelect, isSelected, onToggleSelect }) {
  const total = totalMinutes(modele.etapes || []);
  return (
    <div className={`flex items-center gap-2 rounded-xl border border-border ${isSelected ? 'ring-2 ring-primary' : ''}`}>
      <input
        type="checkbox"
        checked={isSelected}
        onChange={onToggleSelect}
        className="ml-3 shrink-0 accent-primary"
        onClick={e => e.stopPropagation()}
      />
    <button
      onClick={() => onSelect(modele.id)}
      className="flex-1 text-left flex items-center justify-between p-4 hover:bg-primary/5 transition-colors group rounded-r-xl"
    >
      <div className="flex-1 min-w-0">
        <p className="font-medium text-sm">{modele.nom}</p>
        <div className="flex gap-2 mt-1 text-xs text-muted-foreground flex-wrap">
          {modele.type_evenement && <span>📅 {modele.type_evenement}</span>}
          <span>{modele.etapes?.length || 0} étapes</span>
          {total > 0 && <span>⏱ {formatTotalMinutes(total)}</span>}
        </div>
      </div>
      <div className="flex items-center gap-1 shrink-0">
        <Button
          size="icon"
          variant="ghost"
          className="h-7 w-7"
          onClick={(e) => { e.stopPropagation(); onEdit(modele); }}
          title="Modifier"
        >
          <Pencil size={13} />
        </Button>
        <Button
          size="icon"
          variant="ghost"
          className="h-7 w-7 text-destructive hover:text-destructive"
          onClick={(e) => { e.stopPropagation(); onDelete(modele.id); }}
          title="Supprimer"
        >
          <Trash2 size={13} />
        </Button>
      </div>
    </button>
    </div>
  );
}

export default function BlocProgramme() {
  const qc = useQueryClient();
  const [modeleProgModal, setModeleProgModal] = useState(null);
  const [creerModal, setCreerModal] = useState(false);
  const [amandaFile, setAmandaFile] = useState(null);
  const [orchestratorFormula, setOrchestratorFormula] = useState(null);
  const [deleteConfirm, setDeleteConfirm] = useState(null); // id à supprimer
  const [bulkDeleteModal, setBulkDeleteModal] = useState(false);
  const [selectedIds, setSelectedIds] = useState([]);

  const { data: modeles = [], isLoading } = useQuery({
    queryKey: ['modeles-programme'],
    queryFn: () => base44.entities.ModeleProgramme.list(),
  });

  const deleteModele = useMutation({
    mutationFn: (id) => base44.entities.ModeleProgramme.delete(id),
    onSuccess: () => { qc.invalidateQueries(['modeles-programme']); setDeleteConfirm(null); },
  });

  const bulkDelete = useMutation({
    mutationFn: () => Promise.all(selectedIds.map(id => base44.entities.ModeleProgramme.delete(id))),
    onSuccess: () => { qc.invalidateQueries(['modeles-programme']); setSelectedIds([]); setBulkDeleteModal(false); },
  });

  const toggleSelect = (id) => setSelectedIds(prev => prev.includes(id) ? prev.filter(i => i !== id) : [...prev, id]);

  return (
    <div className="bg-card border border-border rounded-2xl overflow-hidden">
      {/* Header */}
      <div className="flex items-center justify-between px-5 py-4 border-b border-border">
        <div className="flex items-center gap-2">
          <div>
            <h3 className="font-semibold text-base">📋 Programme de la journée</h3>
            <p className="text-xs text-muted-foreground mt-0.5">{modeles.length} modèle{modeles.length !== 1 ? 's' : ''} de programme</p>
          </div>
          <HelpTooltip text="Créez vos étapes types une fois et réutilisez-les pour chaque événement. Les horaires se calculent automatiquement." />
        </div>
        <Button size="sm" className="gap-1.5" onClick={() => setCreerModal(true)}>
          <Plus size={14} /> Créer
        </Button>
      </div>

      <div className="p-4">
        <Tabs defaultValue="modeles">
          <TabsList className="w-full mb-4">
            <TabsTrigger value="modeles" className="flex-1">Modèles</TabsTrigger>
            <TabsTrigger value="bibliotheque" className="flex-1">Bibliothèque d'étapes</TabsTrigger>
          </TabsList>

          {/* ── Onglet Modèles ── */}
          <TabsContent value="modeles" className="space-y-4 mt-0">
            {/* Liste des modèles en cartes */}
            {modeles.length === 0 ? (
              <div className="text-center py-10 text-muted-foreground">
                <BookOpen size={28} className="mx-auto mb-2 opacity-20" />
                <p className="text-sm font-medium">Aucun modèle de programme</p>
                <p className="text-xs mt-1">Créez des séquences d'étapes réutilisables</p>
              </div>
            ) : (
              <div className="space-y-2">
                <div className="flex items-center gap-2 pb-1">
                  <input type="checkbox"
                    checked={modeles.length > 0 && modeles.every(m => selectedIds.includes(m.id))}
                    onChange={e => e.target.checked ? setSelectedIds(modeles.map(m => m.id)) : setSelectedIds([])}
                    className="accent-primary"
                  />
                  <span className="text-xs text-muted-foreground">Tout sélectionner</span>
                </div>
                {modeles.map(m => (
                  <ProgrammeCard
                    key={m.id}
                    modele={m}
                    onEdit={(modele) => setModeleProgModal(modele)}
                    onDelete={(id) => setDeleteConfirm(id)}
                    onSelect={() => {}}
                    isSelected={selectedIds.includes(m.id)}
                    onToggleSelect={() => toggleSelect(m.id)}
                  />
                ))}
              </div>
            )}
          </TabsContent>

          {/* ── Onglet Bibliothèque d'étapes ── */}
          <TabsContent value="bibliotheque" className="mt-0">
            <BibliothequeEtapes />
          </TabsContent>
        </Tabs>
      </div>

      {creerModal && (
        <CreerModal
          title="Programme"
          onManual={() => { setModeleProgModal('new'); setCreerModal(false); }}
          onImageSimple={async (file) => {
            const { file_url } = await base44.integrations.Core.UploadFile({ file });
            await base44.entities.ModeleProgramme.create({ nom: file.name.replace(/\.[^/.]+$/, ''), etapes: [] });
            qc.invalidateQueries(['modeles-programme']);
            setCreerModal(false);
          }}
          onImageAmanda={(file) => { setAmandaFile(file); setCreerModal(false); }}
          onClose={() => setCreerModal(false)}
        />
      )}

      {amandaFile && (
        <ImportDocumentModal
          preselectedType="programme"
          initialFile={amandaFile}
          onClose={() => setAmandaFile(null)}
          onCreated={() => qc.invalidateQueries(['modeles-programme'])}
        />
      )}

      {modeleProgModal && (
        <ModeleProgrammeModal
          modele={modeleProgModal === 'new' ? null : modeleProgModal}
          onClose={() => setModeleProgModal(null)}
        />
      )}

      {orchestratorFormula && (
        <GenerationOrchestrator
          formulaName={orchestratorFormula === '__catalogue__' ? null : orchestratorFormula}
          resourceType="programme"
          onClose={() => setOrchestratorFormula(null)}
          onCreated={() => qc.invalidateQueries(['modeles-programme'])}
        />
      )}

      <DeleteConfirmModal
        open={!!deleteConfirm}
        title="Supprimer ce modèle de programme ?"
        onConfirm={() => deleteModele.mutate(deleteConfirm)}
        onCancel={() => setDeleteConfirm(null)}
        loading={deleteModele.isPending}
      />
      <DeleteConfirmModal
        open={bulkDeleteModal}
        title={`Supprimer ${selectedIds.length} modèle(s) ?`}
        onConfirm={() => bulkDelete.mutate()}
        onCancel={() => setBulkDeleteModal(false)}
        loading={bulkDelete.isPending}
      />
      <BulkSelectionBar
        count={selectedIds.length}
        onDelete={() => setBulkDeleteModal(true)}
        onClear={() => setSelectedIds([])}
      />
    </div>
  );
}