/**
 * Constructeur de champs pour les formulaires de préparation.
 * Permet d'ajouter, éditer, réordonner et supprimer des champs.
 */
import { useState } from 'react';
import { Plus, Trash2, GripVertical } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import ConditionEditor from './ConditionEditor';
import { DragDropContext, Droppable, Draggable } from '@hello-pangea/dnd';

const TYPES = [
  { value: 'texte', label: 'Texte libre' },
  { value: 'nombre', label: 'Nombre' },
  { value: 'date', label: 'Date' },
  { value: 'cases_a_cocher', label: 'Cases à cocher' },
  { value: 'choix_unique', label: 'Choix unique' },
  { value: 'liste', label: 'Liste déroulante' },
  { value: 'upload', label: 'Fichier / Photo' },
];

function generateId() {
  return Math.random().toString(36).slice(2, 9);
}

function ChampEditor({ champ, onChange, onDelete, dragHandleProps, parentChamps = [] }) {
  const [open, setOpen] = useState(!champ.label);
  const hasOptions = ['cases_a_cocher', 'choix_unique', 'liste'].includes(champ.type);

  const update = (field, value) => onChange({ ...champ, [field]: value });

  const addOption = () => {
    const opts = [...(champ.options || []), ''];
    update('options', opts);
  };

  const updateOption = (idx, val) => {
    const opts = [...(champ.options || [])];
    opts[idx] = val;
    update('options', opts);
  };

  const removeOption = (idx) => {
    const opts = (champ.options || []).filter((_, i) => i !== idx);
    update('options', opts);
  };

  return (
    <div className="border border-border rounded-xl bg-card">
      {/* Header */}
      <div className="flex items-center gap-2 px-3 py-2">
        <div {...dragHandleProps} className="cursor-grab active:cursor-grabbing text-muted-foreground hover:text-foreground touch-none shrink-0">
          <GripVertical size={16} />
        </div>
        <div className="flex-1 min-w-0">
          <p className="text-sm font-medium truncate">{champ.label || <span className="text-muted-foreground italic">Champ sans titre</span>}</p>
          <p className="text-xs text-muted-foreground">{TYPES.find(t => t.value === champ.type)?.label}</p>
        </div>
        <div className="flex gap-1 shrink-0">
          <button onClick={() => setOpen(v => !v)} className="text-xs text-muted-foreground hover:text-foreground px-1.5 py-1 rounded-md hover:bg-muted transition-colors">
            {open ? 'Réduire' : 'Modifier'}
          </button>
          <button onClick={onDelete} className="text-destructive hover:text-destructive/80 p-1 rounded-md hover:bg-destructive/10 transition-colors">
            <Trash2 size={13} />
          </button>
        </div>
      </div>

      {/* Form */}
      {open && (
        <div className="px-3 pb-3 space-y-3 border-t border-border pt-3">
          <div className="grid grid-cols-2 gap-2">
            <div className="space-y-1">
              <label className="text-xs text-muted-foreground">Libellé *</label>
              <Input
                value={champ.label}
                onChange={e => update('label', e.target.value)}
                placeholder="Ex: Nombre d'invités"
                className="text-sm h-8"
              />
            </div>
            <div className="space-y-1">
              <label className="text-xs text-muted-foreground">Type de champ</label>
              <select
                value={champ.type}
                onChange={e => update('type', e.target.value)}
                className="flex h-8 w-full rounded-md border border-input bg-transparent px-2 py-1 text-sm shadow-sm focus-visible:outline-none focus-visible:ring-1 focus-visible:ring-ring"
              >
                {TYPES.map(t => (
                  <option key={t.value} value={t.value}>{t.label}</option>
                ))}
              </select>
            </div>
          </div>

          <div className="space-y-1">
            <label className="text-xs text-muted-foreground">Description / aide (optionnel)</label>
            <Input
              value={champ.description || ''}
              onChange={e => update('description', e.target.value)}
              placeholder="Ex: Adultes uniquement"
              className="text-sm h-8"
            />
          </div>

          <label className="flex items-center gap-2 cursor-pointer">
            <input
              type="checkbox"
              checked={champ.obligatoire || false}
              onChange={e => update('obligatoire', e.target.checked)}
              className="rounded"
            />
            <span className="text-xs text-muted-foreground">Champ obligatoire</span>
          </label>

          {hasOptions && (
            <div className="space-y-2">
              <p className="text-xs font-medium text-muted-foreground">Options</p>
              {(champ.options || []).map((opt, idx) => (
                <div key={idx} className="flex gap-2 items-center">
                  <Input
                    value={opt}
                    onChange={e => updateOption(idx, e.target.value)}
                    placeholder={`Option ${idx + 1}`}
                    className="text-sm h-8 flex-1"
                  />
                  <button onClick={() => removeOption(idx)} className="text-destructive hover:text-destructive/80">
                    <Trash2 size={13} />
                  </button>
                </div>
              ))}
              <button onClick={addOption} className="text-xs text-primary hover:underline flex items-center gap-1">
                <Plus size={12} /> Ajouter une option
              </button>
            </div>
          )}

          <ConditionEditor
            conditions={champ.conditions || []}
            onChange={conditions => update('conditions', conditions)}
            champsDisponibles={parentChamps}
            champActuelId={champ.id}
          />
          </div>
          )}
          </div>
          );
          }

export default function FormulaireBuilder({ champs, onChange }) {
  const addChamp = () => {
    onChange([...champs, { id: generateId(), type: 'texte', label: '', obligatoire: false, options: [] }]);
  };

  const updateChamp = (idx, updated) => {
    const next = [...champs];
    next[idx] = updated;
    onChange(next);
  };

  const deleteChamp = (idx) => {
    onChange(champs.filter((_, i) => i !== idx));
  };

  const handleDragEnd = (result) => {
    const { source, destination } = result;
    if (!destination || destination.index === source.index) return;
    const next = [...champs];
    const [moved] = next.splice(source.index, 1);
    next.splice(destination.index, 0, moved);
    onChange(next);
  };

  return (
    <DragDropContext onDragEnd={handleDragEnd}>
      <Droppable droppableId="champs">
        {(provided) => (
          <div className="space-y-2" ref={provided.innerRef} {...provided.droppableProps}>
            {champs.length === 0 && (
              <p className="text-sm text-muted-foreground text-center py-4 border border-dashed border-border rounded-xl">
                Aucun champ. Cliquez sur "Ajouter un champ" pour commencer à construire votre questionnaire.
              </p>
            )}
            {champs.map((champ, idx) => (
              <Draggable key={champ.id || idx} draggableId={String(champ.id || idx)} index={idx}>
                {(drag) => (
                  <div ref={drag.innerRef} {...drag.draggableProps}>
                    <ChampEditor
                      champ={champ}
                      onChange={(updated) => updateChamp(idx, updated)}
                      onDelete={() => deleteChamp(idx)}
                      dragHandleProps={drag.dragHandleProps}
                      parentChamps={champs}
                    />
                  </div>
                )}
              </Draggable>
            ))}
            {provided.placeholder}
            <Button type="button" variant="outline" size="sm" className="w-full gap-1 text-xs" onClick={addChamp}>
              <Plus size={13} /> Ajouter un champ
            </Button>
          </div>
        )}
      </Droppable>
    </DragDropContext>
  );
}