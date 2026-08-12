import { useState } from 'react';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { base44 } from '@/api/base44Client';
import { Plus, Pencil, Trash2, X, Check, Copy, GripVertical, Eye, EyeOff, ChevronDown, ChevronUp, ImageIcon } from 'lucide-react';
import { Button } from '@/components/ui/button';
import HelpTooltip from '@/components/HelpTooltip';
import { Input } from '@/components/ui/input';
import { DragDropContext, Droppable, Draggable } from '@hello-pangea/dnd';
import ImportDocumentModal from './ImportDocumentModal';
import MenuImagesUploader from './MenuImagesUploader';
import TypeEvenementMultiSelect, { normalizeTypes, typesLabel, TYPES } from './TypeEvenementMultiSelect';
import CreerModal from './CreerModal';
import AllergenesPicker from '@/components/allergenes/AllergenesPicker';

function genId() {
  return Math.random().toString(36).slice(2, 9);
}

const DEFAULT_ELEMENTS = [
  { id: genId(), intitule: '', description: '', au_choix: false },
];

// ─── Formulaire de formule (édition manuelle) ─────────────────────────────────
function MenuFormulaire({ menu, onSave, onCancel }) {
  const [nom, setNom] = useState(menu?.nom || '');
  const [typesEv, setTypesEv] = useState(normalizeTypes(menu?.types_evenement || menu?.type_evenement));
  const [prix, setPrix] = useState(menu?.prix_par_personne || '');
  const [description, setDescription] = useState(menu?.description || '');
  const [elements, setElements] = useState(
    menu?.elements?.length ? menu.elements.map(e => ({ ...e, id: e.id || genId() })) : DEFAULT_ELEMENTS
  );
  const [showPreview, setShowPreview] = useState(false);

  const setEl = (id, key, val) =>
    setElements(els => els.map(e => e.id === id ? { ...e, [key]: val } : e));

  const addEl = () =>
    setElements(els => [...els, { id: genId(), intitule: '', description: '', au_choix: false }]);

  const removeEl = (id) =>
    setElements(els => els.filter(e => e.id !== id));

  const onDragEnd = (result) => {
    if (!result.destination) return;
    const arr = [...elements];
    const [moved] = arr.splice(result.source.index, 1);
    arr.splice(result.destination.index, 0, moved);
    setElements(arr);
  };

  const handleSave = () => {
    if (!nom.trim()) return;
    onSave({
      nom: nom.trim(),
      types_evenement: typesEv,
      type_evenement: typesEv.length === 1 ? typesEv[0] : (typesEv.length === 0 ? 'Tous' : null),
      prix_par_personne: prix ? parseFloat(prix) : null,
      description: description.trim() || null,
      elements: elements.filter(e => e.intitule.trim()),
      actif: menu?.actif !== false,
    });
  };

  return (
    <div className="bg-muted/30 rounded-2xl border border-border p-5 space-y-5">
      <div className="grid grid-cols-1 md:grid-cols-3 gap-3">
        <div className="md:col-span-1">
          <label className="text-xs font-medium text-muted-foreground mb-1 block">Nom de la formule *</label>
          <Input value={nom} onChange={e => setNom(e.target.value)} placeholder="ex: Formule Prestige" />
        </div>
        <div>
          <label className="text-xs font-medium text-muted-foreground mb-1 block">Prix par personne (€)</label>
          <Input type="number" value={prix} onChange={e => setPrix(e.target.value)} placeholder="0" />
        </div>
        <div className="md:col-span-3">
          <label className="text-xs font-medium text-muted-foreground mb-2 block">Types d'événement</label>
          <TypeEvenementMultiSelect value={typesEv} onChange={setTypesEv} />
        </div>
        <div className="md:col-span-3">
          <label className="text-xs font-medium text-muted-foreground mb-1 block">Description courte (optionnel)</label>
          <Input value={description} onChange={e => setDescription(e.target.value)} placeholder="ex: Menu raffiné avec produits locaux…" />
        </div>
      </div>

      <div>
        <div className="flex items-center justify-between mb-3">
          <p className="text-sm font-semibold">Composition de la formule</p>
          <button onClick={() => setShowPreview(v => !v)} className="flex items-center gap-1.5 text-xs text-muted-foreground hover:text-foreground transition-colors">
            {showPreview ? <EyeOff size={13} /> : <Eye size={13} />}
            {showPreview ? 'Masquer aperçu' : 'Aperçu'}
          </button>
        </div>

        {showPreview ? (
          <MenuApercu nom={nom} typesEv={typesEv} prix={prix} description={description} elements={elements} />
        ) : (
          <DragDropContext onDragEnd={onDragEnd}>
            <Droppable droppableId="elements">
              {(provided) => (
                <div ref={provided.innerRef} {...provided.droppableProps} className="space-y-2">
                  {elements.map((el, idx) => (
                    <Draggable key={el.id} draggableId={el.id} index={idx}>
                      {(prov) => (
                        <div ref={prov.innerRef} {...prov.draggableProps} className="flex items-start gap-2 bg-card border border-border rounded-xl p-3">
                          <div {...prov.dragHandleProps} className="mt-2 text-muted-foreground hover:text-foreground cursor-grab shrink-0">
                            <GripVertical size={15} />
                          </div>
                          <div className="flex-1 space-y-2">
                             <div className="grid grid-cols-1 md:grid-cols-2 gap-2">
                               <Input value={el.intitule} onChange={e => setEl(el.id, 'intitule', e.target.value)} placeholder={`Élément ${idx + 1}`} />
                               <Input value={el.description} onChange={e => setEl(el.id, 'description', e.target.value)} placeholder="Description optionnelle" />
                             </div>
                             {/* Allergènes par élément */}
                             <details className="group">
                               <summary className="text-[11px] text-muted-foreground cursor-pointer hover:text-foreground select-none flex items-center gap-1">
                                 <span className="group-open:rotate-90 inline-block transition-transform">▶</span>
                                 Allergènes {el.allergenes?.length > 0 ? <span className="text-amber-600 font-medium">({el.allergenes.length})</span> : ''}
                               </summary>
                               <div className="mt-2 pl-2">
                                 <AllergenesPicker
                                   value={el.allergenes || []}
                                   onChange={v => setEl(el.id, 'allergenes', v)}
                                   compact
                                 />
                               </div>
                             </details>
                           </div>
                           <label className="flex items-center gap-1.5 mt-2 cursor-pointer shrink-0">
                             <input type="checkbox" checked={!!el.au_choix} onChange={e => setEl(el.id, 'au_choix', e.target.checked)} className="rounded" />
                             <span className="text-xs text-muted-foreground whitespace-nowrap">Au choix</span>
                           </label>
                          <button onClick={() => removeEl(el.id)} className="mt-2 p-1 rounded hover:bg-red-50 text-muted-foreground hover:text-red-500 shrink-0">
                            <X size={13} />
                          </button>
                        </div>
                      )}
                    </Draggable>
                  ))}
                  {provided.placeholder}
                </div>
              )}
            </Droppable>
          </DragDropContext>
        )}

        {!showPreview && (
          <button onClick={addEl} className="mt-2 flex items-center gap-1.5 text-xs text-primary hover:text-primary/80 font-medium transition-colors">
            <Plus size={13} /> Ajouter un élément
          </button>
        )}
      </div>

      <div className="flex gap-2 justify-end pt-1 border-t border-border">
        <Button variant="outline" size="sm" onClick={onCancel}><X size={14} /> Annuler</Button>
        <Button size="sm" onClick={handleSave} disabled={!nom.trim()}>
          <Check size={14} /> Enregistrer
        </Button>
      </div>
    </div>
  );
}

// ─── Aperçu formule ───────────────────────────────────────────────────────────
function MenuApercu({ nom, typesEv, prix, description, elements }) {
  return (
    <div className="bg-white border-2 border-primary/20 rounded-xl p-5 space-y-3">
      <div className="flex items-start justify-between gap-3">
        <div>
          <p className="text-lg font-bold">{nom || 'Sans nom'}</p>
          {description && <p className="text-sm text-muted-foreground mt-0.5">{description}</p>}
        </div>
        <div className="text-right shrink-0 space-y-1">
          {typesEv?.length > 0 && typesEv.map(t => (
            <span key={t} className="text-xs bg-primary/10 text-primary px-2 py-0.5 rounded-full font-medium block">{t}</span>
          ))}
          {prix && (
            <span className="text-sm font-bold text-primary block">{prix} € / pers.</span>
          )}
        </div>
      </div>
      {elements.filter(e => e.intitule.trim()).length > 0 && (
        <div className="space-y-1.5 pt-2 border-t border-border">
          {elements.filter(e => e.intitule.trim()).map((el, i) => (
            <div key={el.id || i} className="flex items-start gap-2">
              <span className="w-1.5 h-1.5 rounded-full bg-primary mt-1.5 shrink-0" />
              <div>
                <span className="text-sm font-medium">{el.intitule}</span>
                {el.au_choix && <span className="ml-1.5 text-xs bg-amber-100 text-amber-700 px-1.5 py-0.5 rounded font-medium">au choix</span>}
                {el.description && <p className="text-xs text-muted-foreground">{el.description}</p>}
              </div>
            </div>
          ))}
        </div>
      )}
    </div>
  );
}

// ─── Carte d'une formule ──────────────────────────────────────────────────────
function MenuCard({ menu, onEdit, onDuplicate, onDelete, onToggle, onAddImages }) {
  const [expanded, setExpanded] = useState(false);

  const hasImages = (menu.images || []).length > 0;

  return (
    <div className={`bg-card border rounded-xl transition-opacity ${menu.actif === false ? 'opacity-60' : ''}`}>
      <div className="flex items-center gap-3 px-4 py-3">
        <button onClick={() => setExpanded(v => !v)} className="flex-1 min-w-0 flex items-center gap-3 text-left">
          {expanded ? <ChevronUp size={15} className="text-muted-foreground shrink-0" /> : <ChevronDown size={15} className="text-muted-foreground shrink-0" />}
          <div className="min-w-0">
            <div className="flex items-center gap-2 flex-wrap">
            <p className="font-semibold">{menu.nom}</p>
            {(() => {
              const types = normalizeTypes(menu.types_evenement || menu.type_evenement);
              if (types.length === 0) return null;
              return types.slice(0, 2).map(t => (
                <span key={t} className="text-xs bg-primary/10 text-primary px-2 py-0.5 rounded-full font-medium">{t}</span>
              )).concat(types.length > 2 ? [<span key="more" className="text-xs bg-primary/10 text-primary px-2 py-0.5 rounded-full font-medium">+{types.length - 2}</span>] : []);
            })()}
              {menu.prix_par_personne > 0 && (
                <span className="text-xs bg-emerald-100 text-emerald-700 px-2 py-0.5 rounded-full font-medium">{menu.prix_par_personne} €/pers.</span>
              )}
              {hasImages && (
                <span className="text-xs bg-blue-100 text-blue-700 px-2 py-0.5 rounded-full font-medium flex items-center gap-1">
                  <ImageIcon size={10} /> {menu.images.length} page{menu.images.length > 1 ? 's' : ''}
                </span>
              )}
            </div>
            {menu.description && <p className="text-xs text-muted-foreground mt-0.5 truncate">{menu.description}</p>}
          </div>
          {!hasImages && (
            <span className="ml-auto text-xs text-muted-foreground shrink-0">{(menu.elements || []).filter(e => e.intitule).length} élément(s)</span>
          )}
        </button>

        <div className="flex items-center gap-1 shrink-0">
          <button
            onClick={() => onToggle(menu)}
            className={`relative w-9 h-5 rounded-full transition-colors ${menu.actif !== false ? 'bg-emerald-400' : 'bg-slate-300'}`}
          >
            <span className={`absolute top-0.5 w-4 h-4 bg-white rounded-full shadow transition-transform ${menu.actif !== false ? 'translate-x-4' : 'translate-x-0.5'}`} />
          </button>
          <button onClick={() => onAddImages(menu)} className="p-1.5 rounded-lg hover:bg-muted text-muted-foreground hover:text-foreground" title="Ajouter des pages images">
            <ImageIcon size={13} />
          </button>
          <button onClick={() => onDuplicate(menu)} className="p-1.5 rounded-lg hover:bg-muted text-muted-foreground hover:text-foreground" title="Dupliquer">
            <Copy size={13} />
          </button>
          <button onClick={() => onEdit(menu)} className="p-1.5 rounded-lg hover:bg-muted text-muted-foreground hover:text-foreground" title="Modifier">
            <Pencil size={13} />
          </button>
          <button onClick={() => { if (window.confirm('Supprimer cette formule ?')) onDelete(menu.id); }} className="p-1.5 rounded-lg hover:bg-red-50 text-muted-foreground hover:text-red-600" title="Supprimer">
            <Trash2 size={13} />
          </button>
        </div>
      </div>

      {expanded && (
        <div className="px-4 pb-3 pt-0 border-t border-border">
          {hasImages && (
            <div className="mt-2 flex gap-2 flex-wrap">
              {menu.images.map((img, idx) => (
                <div key={img.id || idx} className="relative rounded-lg overflow-hidden border border-border w-16 h-16">
                  <img src={img.url} alt={`Page ${idx + 1}`} className="w-full h-full object-cover" />
                  <div className="absolute bottom-0 left-0 right-0 bg-black/50 text-white text-[9px] text-center py-0.5">
                    {idx + 1}
                  </div>
                </div>
              ))}
            </div>
          )}
          {(menu.elements || []).filter(e => e.intitule).length > 0 && (
            <div className="space-y-1.5 mt-2">
              {(menu.elements || []).filter(e => e.intitule).map((el, i) => (
                <div key={el.id || i} className="flex items-start gap-2">
                  <span className="w-1.5 h-1.5 rounded-full bg-primary mt-1.5 shrink-0" />
                  <div>
                    <span className="text-sm font-medium">{el.intitule}</span>
                    {el.au_choix && <span className="ml-1.5 text-xs bg-amber-100 text-amber-700 px-1.5 py-0.5 rounded font-medium">au choix</span>}
                    {el.allergenes?.length > 0 && (
                      <span className="ml-1.5 text-xs bg-red-100 text-red-700 px-1.5 py-0.5 rounded font-medium">⚠️ {el.allergenes.length} allergène{el.allergenes.length > 1 ? 's' : ''}</span>
                    )}
                    {el.description && <p className="text-xs text-muted-foreground">{el.description}</p>}
                  </div>
                </div>
              ))}
            </div>
          )}
        </div>
      )}
    </div>
  );
}

// ─── Composant principal ──────────────────────────────────────────────────────
export default function BlocMenus() {
  const qc = useQueryClient();
  const [mode, setMode] = useState(null); // null | 'create' | { menu } (edit)
  const [filterType, setFilterType] = useState('Tous');
  const [creerModal, setCreerModal] = useState(false);
  const [amandaFile, setAmandaFile] = useState(null);
  const [imagesUploader, setImagesUploader] = useState(null); // menu à modifier

  const { data: menus = [] } = useQuery({
    queryKey: ['menus-catalogue'],
    queryFn: () => base44.entities.MenuCatalogue.list(),
  });

  const createMutation = useMutation({
    mutationFn: (data) => base44.entities.MenuCatalogue.create(data),
    onSuccess: () => { qc.invalidateQueries(['menus-catalogue']); setMode(null); },
  });

  const updateMutation = useMutation({
    mutationFn: ({ id, data }) => base44.entities.MenuCatalogue.update(id, data),
    onSuccess: () => { qc.invalidateQueries(['menus-catalogue']); setMode(null); setImagesUploader(null); },
  });

  const deleteMutation = useMutation({
    mutationFn: (id) => base44.entities.MenuCatalogue.delete(id),
    onSuccess: () => qc.invalidateQueries(['menus-catalogue']),
  });

  const handleDuplicate = (menu) => {
    const { id, created_date, updated_date, created_by, ...rest } = menu;
    createMutation.mutate({ ...rest, nom: `${rest.nom} (copie)`, elements: (rest.elements || []).map(e => ({ ...e, id: genId() })) });
  };

  const handleToggle = (menu) =>
    updateMutation.mutate({ id: menu.id, data: { actif: !menu.actif } });

  const handleCreateSave = (data) => {
    createMutation.mutate({
      nom: data.nom,
      type_evenement: data.type_evenement,
      prix_par_personne: data.prix_par_personne,
      description: data.description,
      elements: data.elements || [],
      images: data.images || [],
      mode_creation: data.mode_creation,
      actif: true,
    });
  };

  const handleImageSimple = async (file) => {
    const { file_url } = await base44.integrations.Core.UploadFile({ file });
    createMutation.mutate({
      nom: file.name.replace(/\.[^/.]+$/, ''),
      images: [{ id: Math.random().toString(36).slice(2), url: file_url, nom: file.name }],
      mode_creation: 'images',
      actif: true,
    });
  };

  const allTypes = [...new Set(menus.flatMap(m => normalizeTypes(m.types_evenement || m.type_evenement)))];
  const types = ['Tous', ...allTypes];
  const filtered = filterType === 'Tous'
    ? menus
    : menus.filter(m => {
        const t = normalizeTypes(m.types_evenement || m.type_evenement);
        return t.length === 0 || t.includes(filterType);
      });

  return (
    <div className="space-y-4">
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-2">
          <p className="text-sm text-muted-foreground">{menus.length} formule{menus.length !== 1 ? 's' : ''}</p>
          <HelpTooltip text="Composez vos formules librement avec autant d'éléments que vous souhaitez. Elles apparaîtront dans vos devis et fiches de service." />
        </div>
        {!mode && (
          <Button size="sm" onClick={() => setCreerModal(true)} className="gap-1.5">
            <Plus size={14} /> Créer
          </Button>
        )}
      </div>

      {/* Création manuelle directe */}
      {mode === 'create' && (
        <MenuFormulaire
          onSave={handleCreateSave}
          onCancel={() => setMode(null)}
        />
      )}

      {/* Édition manuelle existante */}
      {mode && mode !== 'create' && (
        <MenuFormulaire
          menu={mode}
          onSave={(data) => updateMutation.mutate({ id: mode.id, data })}
          onCancel={() => setMode(null)}
        />
      )}

      {/* Upload images pour un menu existant */}
      {imagesUploader && (
        <MenuImagesUploader
          menu={imagesUploader}
          onSave={(images) => updateMutation.mutate({ id: imagesUploader.id, data: { images } })}
          onCancel={() => setImagesUploader(null)}
        />
      )}

      {/* Filtres */}
      {!mode && !imagesUploader && menus.length > 0 && (
        <div className="flex flex-wrap gap-1.5">
          {types.map(t => (
            <button
              key={t}
              onClick={() => setFilterType(t)}
              className={`text-xs px-3 py-1 rounded-full border font-medium transition-colors ${filterType === t ? 'bg-primary text-primary-foreground border-primary' : 'bg-card border-border text-muted-foreground hover:bg-muted'}`}
            >
              {t}
            </button>
          ))}
        </div>
      )}

      {creerModal && (
        <CreerModal
          title="Menu / Formule"
          onManual={() => { setCreerModal(false); setMode('create'); }}
          onImageSimple={handleImageSimple}
          onImageAmanda={(file) => { setCreerModal(false); setAmandaFile(file); }}
          onClose={() => setCreerModal(false)}
        />
      )}
      {amandaFile && (
        <ImportDocumentModal
          preselectedType="menu"
          initialFile={amandaFile}
          onClose={() => setAmandaFile(null)}
          onCreated={() => qc.invalidateQueries(['menus-catalogue'])}
        />
      )}

      {/* Liste */}
      {!mode && !imagesUploader && (
        <div className="space-y-2">
          {filtered.map(menu => (
            <MenuCard
              key={menu.id}
              menu={menu}
              onEdit={(m) => setMode(m)}
              onDuplicate={handleDuplicate}
              onDelete={(id) => deleteMutation.mutate(id)}
              onToggle={handleToggle}
              onAddImages={(m) => setImagesUploader(m)}
            />
          ))}
          {filtered.length === 0 && (
            <div className="text-center py-12 text-muted-foreground text-sm">
              <p className="text-3xl mb-2">🍽️</p>
              <p>Aucune formule créée. Commencez par ajouter votre première formule.</p>
            </div>
          )}
        </div>
      )}
    </div>
  );
}