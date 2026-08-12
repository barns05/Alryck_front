import { useState, useEffect, useMemo } from 'react';
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import { base44 } from '@/api/base44Client';
import { X, Save, Loader2, Plus, Trash2, GripVertical, Search, Pencil, Copy, Archive, Check } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { DragDropContext, Droppable, Draggable } from '@hello-pangea/dnd';
import { formatDuree, formatTotalMinutes, totalMinutes } from '@/lib/programmeUtils';
import TypeEvenementMultiSelect, { normalizeTypes } from '@/components/bibliotheque/TypeEvenementMultiSelect';

const CATEGORIES = ['Accueil', 'Cocktail', 'Repas', 'Animation', 'Logistique', 'Départ'];

function genId() { return Math.random().toString(36).slice(2, 9); }

function EtapeRow({ etape, idx, onUpdate, onDelete, onAddAfter, bibliotheque, onSelectFromBiblio }) {
  const [isEditing, setIsEditing] = useState(!etape.nom);
  const [localEtape, setLocalEtape] = useState(etape);

  const handleSave = () => {
    onUpdate(idx, localEtape);
    setIsEditing(false);
  };

  const handleDuplicate = () => {
    onAddAfter(idx, { ...localEtape, id: genId(), nom: `${localEtape.nom} (copie)` });
  };

  return (
    <div className="space-y-1">
      <Draggable draggableId={etape.id} index={idx}>
        {(provided, snapshot) => (
          <div
            ref={provided.innerRef}
            {...provided.draggableProps}
            className={`flex items-center gap-2 px-3 py-2 rounded-lg border transition-all ${
              snapshot.isDragging ? 'bg-primary/10 border-primary' : 'bg-background border-border'
            }`}
          >
            <div {...provided.dragHandleProps} className="cursor-grab text-muted-foreground shrink-0">
              <GripVertical size={14} />
            </div>

            {isEditing ? (
              <>
                <Input
                  value={localEtape.nom}
                  onChange={e => setLocalEtape(prev => ({ ...prev, nom: e.target.value }))}
                  placeholder="Nom de l'étape"
                  className="flex-1 h-7 text-sm"
                  autoFocus
                />
                <Input
                  type="number" min={0} max={12}
                  value={localEtape.duree_heures}
                  onChange={e => setLocalEtape(prev => ({ ...prev, duree_heures: parseInt(e.target.value) || 0 }))}
                  className="w-12 h-7 text-xs text-center"
                />
                <span className="text-xs text-muted-foreground shrink-0">h</span>
                <Input
                  type="number" min={0} max={59} step={5}
                  value={localEtape.duree_minutes}
                  onChange={e => setLocalEtape(prev => ({ ...prev, duree_minutes: parseInt(e.target.value) || 0 }))}
                  className="w-12 h-7 text-xs text-center"
                />
                <span className="text-xs text-muted-foreground shrink-0">min</span>
                <Button size="icon" variant="ghost" className="h-7 w-7" onClick={handleSave}>
                  <Check size={13} className="text-green-600" />
                </Button>
                <Button size="icon" variant="ghost" className="h-7 w-7" onClick={() => setIsEditing(false)}>
                  <X size={13} className="text-destructive" />
                </Button>
              </>
            ) : (
              <>
                <div className="flex-1 min-w-0">
                  <p className="text-sm font-medium truncate">{localEtape.nom}</p>
                  {(localEtape.duree_heures || localEtape.duree_minutes) && (
                    <p className="text-xs text-muted-foreground">{formatDuree(localEtape.duree_heures, localEtape.duree_minutes)}</p>
                  )}
                </div>
                <div className="flex items-center gap-1 shrink-0">
                  <Button size="icon" variant="ghost" className="h-7 w-7" onClick={() => setIsEditing(true)} title="Modifier">
                    <Pencil size={13} />
                  </Button>
                  <Button size="icon" variant="ghost" className="h-7 w-7" onClick={handleDuplicate} title="Dupliquer">
                    <Copy size={13} />
                  </Button>
                  <Button size="icon" variant="ghost" className="h-7 w-7 text-destructive hover:text-destructive" onClick={() => onDelete(idx)} title="Supprimer">
                    <Trash2 size={13} />
                  </Button>
                </div>
              </>
            )}
          </div>
        )}
      </Draggable>

      {/* Bouton + Ajouter après cette étape */}
      <div className="flex gap-1 px-3 py-1">
        <button
          onClick={() => onSelectFromBiblio(idx)}
          className="flex-1 flex items-center justify-center gap-1 h-7 text-xs border border-dashed border-primary/40 rounded-lg text-primary hover:bg-primary/5 transition-colors"
          title="Ajouter une étape après celle-ci"
        >
          <Plus size={12} /> Ajouter
        </button>
      </div>
    </div>
  );
}

export default function ModeleProgrammeModal({ modele, onClose }) {
  const qc = useQueryClient();
  const [nom, setNom] = useState(modele?.nom || '');
  const [typesEv, setTypesEv] = useState(normalizeTypes(modele?.types_evenement || modele?.type_evenement));
  const [etapes, setEtapes] = useState(modele?.etapes || []);
  const [insertAfterIdx, setInsertAfterIdx] = useState(null);
  const [searchBiblio, setSearchBiblio] = useState('');

  useEffect(() => {
    setNom(modele?.nom || '');
    setTypesEv(normalizeTypes(modele?.types_evenement || modele?.type_evenement));
    setEtapes(modele?.etapes || []);
  }, [modele?.id]);

  const { data: bibliotheque = [] } = useQuery({
    queryKey: ['etapes-bibliotheque'],
    queryFn: () => base44.entities.EtapeBibliotheque.list('ordre', 500).then(items => 
      items.filter(e => e.etat !== 'archivee').sort((a, b) => (a.ordre ?? 0) - (b.ordre ?? 0))
    ),
  });

  const filteredBiblio = bibliotheque.filter(e =>
    !searchBiblio.toLowerCase() || e.nom.toLowerCase().includes(searchBiblio.toLowerCase())
  );

  const save = useMutation({
    mutationFn: () => {
      const data = { nom, types_evenement: typesEv, type_evenement: typesEv[0] || null, etapes };
      return modele
        ? base44.entities.ModeleProgramme.update(modele.id, data)
        : base44.entities.ModeleProgramme.create(data);
    },
    onSuccess: () => { qc.invalidateQueries(['modeles-programme']); onClose(); },
  });

  const addFromBiblio = (etapeBiblio, afterIdx = null) => {
    const newEtape = {
      id: genId(),
      nom: etapeBiblio.nom,
      duree_heures: etapeBiblio.duree_heures || 0,
      duree_minutes: etapeBiblio.duree_minutes || 0,
      categorie: etapeBiblio.categorie || 'Accueil',
    };
    if (afterIdx === null) {
      setEtapes(prev => [...prev, newEtape]);
    } else {
      setEtapes(prev => [...prev.slice(0, afterIdx + 1), newEtape, ...prev.slice(afterIdx + 1)]);
    }
    setInsertAfterIdx(null);
  };

  const addCustom = (afterIdx = null) => {
    const newEtape = { id: genId(), nom: '', duree_heures: 0, duree_minutes: 30, categorie: 'Accueil' };
    if (afterIdx === null) {
      setEtapes(prev => [...prev, newEtape]);
    } else {
      setEtapes(prev => [...prev.slice(0, afterIdx + 1), newEtape, ...prev.slice(afterIdx + 1)]);
    }
    setInsertAfterIdx(null);
  };

  const updateEtape = (idx, etape) => {
    setEtapes(prev => prev.map((e, i) => i === idx ? etape : e));
  };

  const removeEtape = (idx) => {
    setEtapes(prev => prev.filter((_, i) => i !== idx));
    setInsertAfterIdx(null);
  };

  const handleAddAfter = (idx, newEtape) => {
    setEtapes(prev => [...prev.slice(0, idx + 1), newEtape, ...prev.slice(idx + 1)]);
  };

  const onDragEnd = (result) => {
    if (!result.destination) return;
    const items = Array.from(etapes);
    const [moved] = items.splice(result.source.index, 1);
    items.splice(result.destination.index, 0, moved);
    setEtapes(items);
  };

  const total = totalMinutes(etapes);

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/40 p-4">
      <div className="bg-card border border-border rounded-2xl shadow-xl w-full max-w-3xl max-h-[90vh] flex flex-col overflow-hidden">
        <div className="flex items-center justify-between p-6 pb-4 border-b border-border shrink-0">
          <h3 className="font-semibold text-lg">{modele ? 'Modifier le modèle' : 'Nouveau modèle de programme'}</h3>
          <button onClick={onClose} className="text-muted-foreground hover:text-foreground"><X size={18} /></button>
        </div>

        <div className="flex-1 overflow-y-auto p-6 pt-4 space-y-5">
        {/* Infos générales */}
        <div className="space-y-3">
          <div className="space-y-1.5">
            <Label>Nom du modèle *</Label>
            <Input value={nom} onChange={e => setNom(e.target.value)} placeholder="Ex : Mariage cérémonie laïque + dîner" autoFocus />
          </div>
          <div className="space-y-1.5">
            <Label>Types d'événement</Label>
            <TypeEvenementMultiSelect value={typesEv} onChange={setTypesEv} />
          </div>
        </div>

        {/* Nouveau layout: Programme en full width avec insertion flexible */}
        <div className="space-y-3">
          <div className="flex items-center justify-between">
            <p className="text-xs font-semibold uppercase tracking-wider text-muted-foreground">📋 Programme ({etapes.length} étapes)</p>
            {total > 0 && (
              <span className="text-xs bg-primary/10 text-primary px-2 py-0.5 rounded-full font-medium">
                ⏱ Durée totale : {formatTotalMinutes(total)}
              </span>
            )}
          </div>

          {etapes.length === 0 ? (
            <div className="border-2 border-dashed border-border rounded-xl py-8 text-center space-y-2">
              <p className="text-xs text-muted-foreground">Aucune étape dans le programme</p>
              <button
                onClick={() => setInsertAfterIdx(-1)}
                className="inline-flex items-center gap-1.5 h-8 px-3 border border-primary/50 rounded-lg text-xs text-primary hover:bg-primary/5 transition-colors"
              >
                <Plus size={12} /> Ajouter une étape
              </button>
            </div>
          ) : (
            <DragDropContext onDragEnd={onDragEnd}>
              <Droppable droppableId="modele-etapes">
                {(provided) => (
                  <div ref={provided.innerRef} {...provided.droppableProps} className="space-y-0 max-h-80 overflow-y-auto pr-1">
                    {etapes.map((etape, idx) => (
                      <EtapeRow
                        key={etape.id}
                        etape={etape}
                        idx={idx}
                        onUpdate={updateEtape}
                        onDelete={removeEtape}
                        onAddAfter={handleAddAfter}
                        bibliotheque={bibliotheque}
                        onSelectFromBiblio={() => setInsertAfterIdx(idx)}
                      />
                    ))}
                    {provided.placeholder}
                  </div>
                )}
              </Droppable>
            </DragDropContext>
          )}

          {/* Modal insertion d'étape */}
          {insertAfterIdx !== null && (
            <div className="fixed inset-0 z-[70] bg-black/40 backdrop-blur-sm flex items-center justify-center p-4">
              <div className="bg-card rounded-2xl border border-border shadow-xl w-full max-w-sm overflow-hidden">
                <div className="flex items-center justify-between p-5 border-b border-border">
                  <h3 className="font-semibold text-base">Ajouter une étape</h3>
                  <button onClick={() => setInsertAfterIdx(null)} className="text-muted-foreground hover:text-foreground">
                    <X size={16} />
                  </button>
                </div>

                <div className="p-4 space-y-3">
                  <div className="relative">
                    <Search size={14} className="absolute left-2.5 top-1/2 -translate-y-1/2 text-muted-foreground" />
                    <Input
                      value={searchBiblio}
                      onChange={e => setSearchBiblio(e.target.value)}
                      placeholder="Rechercher une étape…"
                      className="pl-8 h-8 text-sm"
                      autoFocus
                    />
                  </div>

                  <div className="space-y-1.5 max-h-48 overflow-y-auto">
                    {filteredBiblio.length === 0 ? (
                      <p className="text-xs text-muted-foreground text-center py-4">Aucune étape</p>
                    ) : (
                      filteredBiblio.map(e => (
                        <button
                          key={e.id}
                          onClick={() => { addFromBiblio(e, insertAfterIdx); setSearchBiblio(''); }}
                          className="w-full flex items-center justify-between text-left px-3 py-2 rounded-lg border border-border hover:border-primary/50 hover:bg-primary/5 transition-colors group text-sm"
                        >
                          <div>
                            <p className="font-medium">{e.nom}</p>
                            <p className="text-xs text-muted-foreground">{e.categorie} · {formatDuree(e.duree_heures, e.duree_minutes)}</p>
                          </div>
                          <Plus size={13} className="text-muted-foreground group-hover:text-primary shrink-0" />
                        </button>
                      ))
                    )}
                  </div>

                  <button
                    onClick={() => { addCustom(insertAfterIdx); setSearchBiblio(''); }}
                    className="w-full flex items-center justify-center gap-1.5 py-2 border border-dashed border-primary/40 rounded-lg text-xs text-primary hover:bg-primary/5 transition-colors"
                  >
                    <Plus size={12} /> Étape personnalisée
                  </button>
                </div>
              </div>
            </div>
          )}
        </div>

        </div>

        <div className="flex justify-end gap-2 p-6 pt-4 border-t border-border shrink-0" style={{ paddingBottom: 'max(1.5rem, env(safe-area-inset-bottom))' }}>
          <Button variant="outline" size="sm" onClick={onClose}>Annuler</Button>
          <Button size="sm" onClick={() => save.mutate()} disabled={save.isPending || !nom.trim()}>
            {save.isPending ? <Loader2 size={13} className="animate-spin" /> : <><Save size={13} /> Enregistrer le modèle</>}
          </Button>
        </div>
      </div>
    </div>
  );
}