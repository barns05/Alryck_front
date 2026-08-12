import { useState, useMemo } from 'react';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { base44 } from '@/api/base44Client';
import { Search, Plus, Archive, RotateCcw, Check, X, GripVertical, Pencil, Copy } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import EtapeModal from './EtapeModal';
import { DragDropContext, Droppable, Draggable } from '@hello-pangea/dnd';
import { formatDuree } from '@/lib/programmeUtils';

const CATEGORIES = ['Accueil', 'Cocktail', 'Repas', 'Animation', 'Logistique', 'Départ'];

const ETAPES_PAR_DEFAUT = [
  // Accueil
  { nom: 'Accueil des convives', categorie: 'Accueil', duree_heures: 0, duree_minutes: 30, etat: 'incluse', ordre: 0 },
  { nom: 'Installation des invités', categorie: 'Accueil', duree_heures: 0, duree_minutes: 15, etat: 'disponible', ordre: 1 },
  { nom: 'Cérémonie laïque', categorie: 'Accueil', duree_heures: 0, duree_minutes: 30, etat: 'disponible', ordre: 2 },

  // Cocktail
  { nom: 'Cocktail / vin d\'honneur', categorie: 'Cocktail', duree_heures: 1, duree_minutes: 30, etat: 'incluse', ordre: 0 },
  { nom: 'Animation cocktail', categorie: 'Cocktail', duree_heures: 0, duree_minutes: 30, etat: 'disponible', ordre: 1 },

  // Repas
  { nom: 'Entrée', categorie: 'Repas', duree_heures: 0, duree_minutes: 30, etat: 'incluse', ordre: 0 },
  { nom: 'Plat', categorie: 'Repas', duree_heures: 0, duree_minutes: 45, etat: 'incluse', ordre: 1 },
  { nom: 'Fromages', categorie: 'Repas', duree_heures: 0, duree_minutes: 20, etat: 'disponible', ordre: 2 },
  { nom: 'Trou normand', categorie: 'Repas', duree_heures: 0, duree_minutes: 15, etat: 'disponible', ordre: 3 },
  { nom: 'Dessert', categorie: 'Repas', duree_heures: 0, duree_minutes: 30, etat: 'incluse', ordre: 4 },
  { nom: 'Café & mignardises', categorie: 'Repas', duree_heures: 0, duree_minutes: 20, etat: 'disponible', ordre: 5 },
  { nom: 'Pièce montée / gâteau', categorie: 'Repas', duree_heures: 0, duree_minutes: 20, etat: 'disponible', ordre: 6 },

  // Animation
  { nom: 'Première danse', categorie: 'Animation', duree_heures: 0, duree_minutes: 15, etat: 'disponible', ordre: 0 },
  { nom: 'Animation musicale', categorie: 'Animation', duree_heures: 1, duree_minutes: 0, etat: 'disponible', ordre: 1 },
  { nom: 'Discours / témoignages', categorie: 'Animation', duree_heures: 0, duree_minutes: 20, etat: 'disponible', ordre: 2 },
  { nom: 'Jeux & animations', categorie: 'Animation', duree_heures: 0, duree_minutes: 30, etat: 'disponible', ordre: 3 },
  { nom: 'Feu d\'artifice', categorie: 'Animation', duree_heures: 0, duree_minutes: 15, etat: 'disponible', ordre: 4 },

  // Logistique
  { nom: 'Installation de la salle', categorie: 'Logistique', duree_heures: 1, duree_minutes: 0, etat: 'disponible', ordre: 0 },
  { nom: 'Mise en place des tables', categorie: 'Logistique', duree_heures: 0, duree_minutes: 45, etat: 'disponible', ordre: 1 },
  { nom: 'Briefing de l\'équipe', categorie: 'Logistique', duree_heures: 0, duree_minutes: 15, etat: 'disponible', ordre: 2 },
  { nom: 'Débarrassage / nettoyage', categorie: 'Logistique', duree_heures: 0, duree_minutes: 30, etat: 'disponible', ordre: 3 },

  // Départ
  { nom: 'Départ des convives', categorie: 'Départ', duree_heures: 0, duree_minutes: 30, etat: 'incluse', ordre: 0 },
  { nom: 'Remise des clés / fin de soirée', categorie: 'Départ', duree_heures: 0, duree_minutes: 15, etat: 'disponible', ordre: 1 },
];

export default function BibliothequeEtapes() {
  const qc = useQueryClient();
  const [searchText, setSearchText] = useState('');
  const [etapeModal, setEtapeModal] = useState(null);
  const [catOrder, setCatOrder] = useState(() => {
    try {
      const saved = localStorage.getItem('bibliotheque-etapes-cat-order');
      if (saved) {
        const parsed = JSON.parse(saved);
        return [...parsed, ...CATEGORIES.filter(c => !parsed.includes(c))];
      }
    } catch {}
    return CATEGORIES;
  });

  const { data: etapes = [], isLoading } = useQuery({
    queryKey: ['etapes-bibliotheque'],
    queryFn: async () => {
      const existing = await base44.entities.EtapeBibliotheque.list('ordre', 500);
      if (existing.length === 0) {
        await base44.entities.EtapeBibliotheque.bulkCreate(ETAPES_PAR_DEFAUT);
        return base44.entities.EtapeBibliotheque.list('ordre', 500);
      }
      const nomsExistants = new Set(existing.map(e => e.nom));
      const manquantes = ETAPES_PAR_DEFAUT.filter(e => !nomsExistants.has(e.nom));
      if (manquantes.length > 0) {
        await base44.entities.EtapeBibliotheque.bulkCreate(manquantes);
        return base44.entities.EtapeBibliotheque.list('ordre', 500);
      }
      return existing;
    },
  });

  const updateEtape = useMutation({
    mutationFn: (data) => base44.entities.EtapeBibliotheque.update(data.id, data),
    onSuccess: () => qc.invalidateQueries(['etapes-bibliotheque']),
  });

  const batchUpdate = async (updates) => {
    await Promise.all(updates.map(e => base44.entities.EtapeBibliotheque.update(e.id, e)));
    qc.invalidateQueries(['etapes-bibliotheque']);
  };

  const createEtape = useMutation({
    mutationFn: (data) => base44.entities.EtapeBibliotheque.create(data),
    onSuccess: () => qc.invalidateQueries(['etapes-bibliotheque']),
  });

  const deleteEtape = useMutation({
    mutationFn: (id) => base44.entities.EtapeBibliotheque.delete(id),
    onSuccess: () => qc.invalidateQueries(['etapes-bibliotheque']),
  });

  const handleToggleEtat = (etape) => {
    const nouvelEtat = etape.etat === 'incluse' ? 'disponible' : 'incluse';
    updateEtape.mutate({ ...etape, etat: nouvelEtat });
  };

  const handleArchiver = (etape) => updateEtape.mutate({ ...etape, etat: 'archivee' });
  const handleRestaurer = (etape) => updateEtape.mutate({ ...etape, etat: 'disponible' });

  const handleDupliquer = (etape) => {
    const { id, created_date, updated_date, created_by, ...rest } = etape;
    createEtape.mutate({ ...rest, nom: `${etape.nom} (copie)`, etat: 'disponible' });
  };

  const handleDragEnd = (result) => {
    const { source, destination, type } = result;
    if (!destination) return;

    if (type === 'CATEGORY') {
      const newOrder = [...catOrder];
      const [moved] = newOrder.splice(source.index, 1);
      newOrder.splice(destination.index, 0, moved);
      setCatOrder(newOrder);
      try { localStorage.setItem('bibliotheque-etapes-cat-order', JSON.stringify(newOrder)); } catch {}
      return;
    }

    const srcCat = source.droppableId;
    const dstCat = destination.droppableId;
    const srcItems = etapes
      .filter(e => e.categorie === srcCat && e.etat !== 'archivee')
      .sort((a, b) => (a.ordre ?? 0) - (b.ordre ?? 0));

    if (srcCat === dstCat) {
      const reordered = [...srcItems];
      const [moved] = reordered.splice(source.index, 1);
      reordered.splice(destination.index, 0, moved);
      batchUpdate(reordered.map((e, i) => ({ ...e, ordre: i })));
    } else {
      const movedE = srcItems[source.index];
      if (!movedE) return;
      const dstItems = etapes.filter(e => e.categorie === dstCat && e.etat !== 'archivee').sort((a, b) => (a.ordre ?? 0) - (b.ordre ?? 0));
      const newDst = [...dstItems];
      newDst.splice(destination.index, 0, movedE);
      const newSrc = srcItems.filter(e => e.id !== movedE.id);
      batchUpdate([
        { ...movedE, categorie: dstCat, ordre: destination.index },
        ...newDst.filter(e => e.id !== movedE.id).map((e, i) => ({ ...e, ordre: i < destination.index ? i : i + 1 })),
        ...newSrc.map((e, i) => ({ ...e, ordre: i })),
      ]);
    }
  };

  const filtered = useMemo(() => etapes.filter(e => e.nom?.toLowerCase().includes(searchText.toLowerCase())), [etapes, searchText]);

  const grouped = catOrder.reduce((acc, cat) => {
    const items = filtered.filter(e => e.categorie === cat && e.etat !== 'archivee').sort((a, b) => (a.ordre ?? 0) - (b.ordre ?? 0));
    if (items.length > 0) acc[cat] = items;
    return acc;
  }, {});

  const archivees = filtered.filter(e => e.etat === 'archivee');

  return (
    <div className="bg-card border border-border rounded-2xl overflow-hidden">
      <div className="flex items-center justify-between px-5 py-4 border-b border-border">
        <h3 className="font-semibold text-base">📚 Bibliothèque d'étapes</h3>
        <Button size="sm" className="gap-1.5" onClick={() => setEtapeModal('new')}>
          <Plus size={14} /> Ajouter
        </Button>
      </div>

      <div className="p-4 space-y-4">
        <div className="relative">
          <Search size={16} className="absolute left-3 top-1/2 -translate-y-1/2 text-muted-foreground" />
          <Input
            placeholder="Rechercher une étape…"
            value={searchText}
            onChange={(e) => setSearchText(e.target.value)}
            className="pl-9"
          />
        </div>

        {isLoading ? (
          <p className="text-sm text-muted-foreground text-center py-8">Chargement…</p>
        ) : (
          <>
            <DragDropContext onDragEnd={searchText ? undefined : handleDragEnd}>
              <Droppable droppableId="etapes-categories" type="CATEGORY">
                {(provided) => (
                  <div className="space-y-4" ref={provided.innerRef} {...provided.droppableProps}>
                    {catOrder.filter(cat => grouped[cat]).map((cat, catIdx) => (
                      <Draggable key={cat} draggableId={`cat-${cat}`} index={catIdx}>
                        {(catProvided) => (
                          <div ref={catProvided.innerRef} {...catProvided.draggableProps}>
                            <div className="flex items-center gap-2 mb-2">
                              <div {...catProvided.dragHandleProps} className="cursor-grab text-muted-foreground hover:text-foreground">
                                <GripVertical size={14} />
                              </div>
                              <p className="text-xs font-semibold uppercase tracking-wider text-muted-foreground">{cat}</p>
                            </div>

                            <Droppable droppableId={cat} type="ETAPE">
                              {(eProvided) => (
                                <div className="space-y-1.5" ref={eProvided.innerRef} {...eProvided.droppableProps}>
                                  {(grouped[cat] || []).map((e, eIdx) => (
                                    <Draggable key={e.id} draggableId={e.id} index={eIdx}>
                                      {(eDrag) => (
                                        <div
                                          ref={eDrag.innerRef}
                                          {...eDrag.draggableProps}
                                          className="flex items-center gap-2 px-3 py-2 rounded-lg border bg-background border-border"
                                        >
                                          <div {...eDrag.dragHandleProps} className="cursor-grab text-muted-foreground">
                                            <GripVertical size={14} />
                                          </div>

                                          <button
                                            onClick={() => handleToggleEtat(e)}
                                            className={`shrink-0 w-5 h-5 rounded-full border-2 flex items-center justify-center transition-all ${
                                              e.etat === 'incluse' ? 'border-emerald-500 bg-emerald-500' : 'border-muted-foreground bg-transparent'
                                            }`}
                                          >
                                            {e.etat === 'incluse' && <Check size={12} className="text-white" />}
                                          </button>

                                          <div className="flex-1 min-w-0">
                                            <p className="text-sm font-medium truncate">{e.nom}</p>
                                            <p className="text-xs text-muted-foreground">{formatDuree(e.duree_heures, e.duree_minutes) || '—'}</p>
                                          </div>

                                          <div className="flex items-center gap-1 shrink-0">
                                            <Button size="icon" variant="ghost" className="h-7 w-7" title="Modifier" onClick={() => setEtapeModal(e)}>
                                              <Pencil size={13} />
                                            </Button>
                                            <Button size="icon" variant="ghost" className="h-7 w-7" title="Dupliquer"
                                              disabled={createEtape.isPending} onClick={() => handleDupliquer(e)}>
                                              <Copy size={13} />
                                            </Button>
                                            <Button size="icon" variant="ghost" className="h-7 w-7" title="Archiver" onClick={() => handleArchiver(e)}>
                                              <Archive size={13} />
                                            </Button>
                                            <Button size="icon" variant="ghost" className="h-7 w-7 text-destructive hover:text-destructive" title="Supprimer"
                                              onClick={() => { if (confirm('Supprimer cette étape ?')) deleteEtape.mutate(e.id); }}>
                                              <X size={13} />
                                            </Button>
                                          </div>
                                        </div>
                                      )}
                                    </Draggable>
                                  ))}
                                  {eProvided.placeholder}
                                </div>
                              )}
                            </Droppable>
                          </div>
                        )}
                      </Draggable>
                    ))}
                    {provided.placeholder}
                  </div>
                )}
              </Droppable>
            </DragDropContext>

            {archivees.length > 0 && (
              <div className="pt-4 border-t border-border">
                <p className="text-xs font-semibold uppercase tracking-wider text-muted-foreground mb-2">Archivées ({archivees.length})</p>
                <div className="space-y-1.5 opacity-50">
                  {archivees.map(e => (
                    <div key={e.id} className="flex items-center gap-2 px-3 py-2 rounded-lg border border-border bg-muted/40">
                      <GripVertical size={14} className="text-muted-foreground" />
                      <div className="flex-1 min-w-0">
                        <p className="text-sm font-medium truncate line-through">{e.nom}</p>
                      </div>
                      <Button size="icon" variant="ghost" className="h-7 w-7" onClick={() => handleRestaurer(e)}>
                        <RotateCcw size={13} />
                      </Button>
                    </div>
                  ))}
                </div>
              </div>
            )}
          </>
        )}
      </div>

      {etapeModal && (
        <EtapeModal
          etape={etapeModal === 'new' ? null : etapeModal}
          onClose={() => setEtapeModal(null)}
        />
      )}
    </div>
  );
}