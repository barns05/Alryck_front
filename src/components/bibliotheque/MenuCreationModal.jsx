import { useState, useRef } from 'react';
import { base44 } from '@/api/base44Client';
import { X, Upload, Sparkles, Pencil, Loader2, GripVertical, Trash2, ChevronLeft, ChevronRight } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { DragDropContext, Droppable, Draggable } from '@hello-pangea/dnd';
import TypeEvenementMultiSelect, { normalizeTypes } from './TypeEvenementMultiSelect';

function genId() {
  return Math.random().toString(36).slice(2, 9);
}

// ─── Sélecteur de mode ────────────────────────────────────────────────────────
function ModeSelector({ onSelect }) {
  const modes = [
    {
      id: 'manuel',
      emoji: '✍️',
      title: 'Saisie manuelle',
      desc: 'Composez librement votre formule élément par élément.',
    },
    {
      id: 'images',
      emoji: '📸',
      title: 'Import image',
      desc: 'Uploadez des photos de votre menu. Elles s\'afficheront telles quelles pour le client.',
    },
    {
      id: 'amanda',
      emoji: '✨',
      title: 'Import avec Amanda',
      desc: 'Amanda analyse vos images et retranscrit automatiquement le contenu en structure modifiable.',
    },
  ];

  return (
    <div className="space-y-4">
      <p className="text-sm text-muted-foreground">Comment souhaitez-vous créer cette formule ?</p>
      <div className="grid grid-cols-1 gap-3">
        {modes.map(m => (
          <button
            key={m.id}
            onClick={() => onSelect(m.id)}
            className="flex items-start gap-4 p-4 rounded-xl border border-border bg-card hover:bg-muted/50 hover:border-primary/40 transition-all text-left group"
          >
            <span className="text-3xl mt-0.5">{m.emoji}</span>
            <div>
              <p className="font-semibold text-sm group-hover:text-primary transition-colors">{m.title}</p>
              <p className="text-xs text-muted-foreground mt-0.5">{m.desc}</p>
            </div>
          </button>
        ))}
      </div>
    </div>
  );
}

// ─── Upload images partagé ────────────────────────────────────────────────────
function ImageUploadZone({ images, setImages, uploading, setUploading }) {
  const inputRef = useRef();

  const handleFiles = async (files) => {
    setUploading(true);
    const newImages = [];
    for (const file of files) {
      const { file_url } = await base44.integrations.Core.UploadFile({ file });
      newImages.push({ id: genId(), url: file_url, nom: file.name });
    }
    setImages(prev => [...prev, ...newImages]);
    setUploading(false);
  };

  const onDragEnd = (result) => {
    if (!result.destination) return;
    const arr = [...images];
    const [moved] = arr.splice(result.source.index, 1);
    arr.splice(result.destination.index, 0, moved);
    setImages(arr);
  };

  return (
    <div className="space-y-3">
      <div
        className="border-2 border-dashed border-border rounded-xl p-6 text-center cursor-pointer hover:border-primary/40 hover:bg-primary/5 transition-colors"
        onClick={() => inputRef.current?.click()}
        onDragOver={e => e.preventDefault()}
        onDrop={e => { e.preventDefault(); handleFiles(Array.from(e.dataTransfer.files)); }}
      >
        {uploading ? (
          <div className="flex items-center justify-center gap-2 text-primary">
            <Loader2 size={18} className="animate-spin" />
            <span className="text-sm font-medium">Upload en cours…</span>
          </div>
        ) : (
          <>
            <Upload size={24} className="mx-auto text-muted-foreground mb-2" />
            <p className="text-sm font-medium">Glissez vos images ici</p>
            <p className="text-xs text-muted-foreground mt-1">ou cliquez pour parcourir</p>
          </>
        )}
        <input
          ref={inputRef}
          type="file"
          accept="image/*"
          multiple
          className="hidden"
          onChange={e => handleFiles(Array.from(e.target.files))}
        />
      </div>

      {images.length > 0 && (
        <DragDropContext onDragEnd={onDragEnd}>
          <Droppable droppableId="images" direction="horizontal">
            {(provided) => (
              <div
                ref={provided.innerRef}
                {...provided.droppableProps}
                className="flex gap-2 flex-wrap"
              >
                {images.map((img, idx) => (
                  <Draggable key={img.id} draggableId={img.id} index={idx}>
                    {(prov) => (
                      <div
                        ref={prov.innerRef}
                        {...prov.draggableProps}
                        className="relative group rounded-lg overflow-hidden border border-border w-24 h-24"
                      >
                        <div {...prov.dragHandleProps} className="absolute top-1 left-1 z-10 bg-black/40 rounded p-0.5 cursor-grab opacity-0 group-hover:opacity-100 transition-opacity">
                          <GripVertical size={12} className="text-white" />
                        </div>
                        <img src={img.url} alt={img.nom} className="w-full h-full object-cover" />
                        <div className="absolute inset-0 bg-black/0 group-hover:bg-black/20 transition-colors" />
                        <button
                          onClick={() => setImages(prev => prev.filter(i => i.id !== img.id))}
                          className="absolute top-1 right-1 z-10 bg-red-500 rounded-full p-0.5 opacity-0 group-hover:opacity-100 transition-opacity"
                        >
                          <X size={10} className="text-white" />
                        </button>
                        <div className="absolute bottom-0 left-0 right-0 bg-black/50 text-white text-[9px] px-1 py-0.5 truncate">
                          Page {idx + 1}
                        </div>
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
    </div>
  );
}

// ─── Mode Manuel ──────────────────────────────────────────────────────────────
const DEFAULT_ELEMENTS = [{ id: 'init', intitule: '', description: '', au_choix: false }];

function ModeManuel({ onSave, onCancel }) {
  const [nom, setNom] = useState('');
  const [typesEv, setTypesEv] = useState([]);
  const [prix, setPrix] = useState('');
  const [description, setDescription] = useState('');
  const [elements, setElements] = useState(DEFAULT_ELEMENTS.map(e => ({ ...e, id: genId() })));

  const setEl = (id, key, val) => setElements(els => els.map(e => e.id === id ? { ...e, [key]: val } : e));
  const addEl = () => setElements(els => [...els, { id: genId(), intitule: '', description: '', au_choix: false }]);
  const removeEl = (id) => setElements(els => els.filter(e => e.id !== id));

  const onDragEnd = (result) => {
    if (!result.destination) return;
    const arr = [...elements];
    const [moved] = arr.splice(result.source.index, 1);
    arr.splice(result.destination.index, 0, moved);
    setElements(arr);
  };

  return (
    <div className="space-y-4">
      <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
        <div>
          <label className="text-xs font-medium text-muted-foreground mb-1 block">Nom de la formule *</label>
          <Input value={nom} onChange={e => setNom(e.target.value)} placeholder="ex: Formule Prestige" />
        </div>
        <div>
          <label className="text-xs font-medium text-muted-foreground mb-1 block">Prix / personne (€)</label>
          <Input type="number" value={prix} onChange={e => setPrix(e.target.value)} placeholder="0" />
        </div>
        <div className="md:col-span-2">
          <label className="text-xs font-medium text-muted-foreground mb-1 block">Description courte</label>
          <Input value={description} onChange={e => setDescription(e.target.value)} placeholder="ex: Menu raffiné avec produits locaux…" />
        </div>
      </div>
      <div>
        <label className="text-xs font-medium text-muted-foreground mb-2 block">Types d'événement</label>
        <TypeEvenementMultiSelect value={typesEv} onChange={setTypesEv} />
      </div>
      <div>
        <p className="text-sm font-semibold mb-2">Composition</p>
        <DragDropContext onDragEnd={onDragEnd}>
          <Droppable droppableId="els">
            {(provided) => (
              <div ref={provided.innerRef} {...provided.droppableProps} className="space-y-2">
                {elements.map((el, idx) => (
                  <Draggable key={el.id} draggableId={el.id} index={idx}>
                    {(prov) => (
                      <div ref={prov.innerRef} {...prov.draggableProps} className="flex items-start gap-2 bg-card border border-border rounded-xl p-3">
                        <div {...prov.dragHandleProps} className="mt-2 text-muted-foreground cursor-grab shrink-0"><GripVertical size={14} /></div>
                        <div className="flex-1 grid grid-cols-1 md:grid-cols-2 gap-2">
                          <Input value={el.intitule} onChange={e => setEl(el.id, 'intitule', e.target.value)} placeholder={`Élément ${idx + 1}`} />
                          <Input value={el.description} onChange={e => setEl(el.id, 'description', e.target.value)} placeholder="Description optionnelle" />
                        </div>
                        <label className="flex items-center gap-1.5 mt-2 cursor-pointer shrink-0">
                          <input type="checkbox" checked={!!el.au_choix} onChange={e => setEl(el.id, 'au_choix', e.target.checked)} className="rounded" />
                          <span className="text-xs text-muted-foreground">Au choix</span>
                        </label>
                        <button onClick={() => removeEl(el.id)} className="mt-2 p-1 rounded hover:bg-red-50 text-muted-foreground hover:text-red-500 shrink-0"><X size={13} /></button>
                      </div>
                    )}
                  </Draggable>
                ))}
                {provided.placeholder}
              </div>
            )}
          </Droppable>
        </DragDropContext>
        <button onClick={addEl} className="mt-2 flex items-center gap-1.5 text-xs text-primary hover:text-primary/80 font-medium">
          <Pencil size={12} /> Ajouter un élément
        </button>
      </div>
      <div className="flex gap-2 justify-end pt-1 border-t border-border">
        <Button variant="outline" size="sm" onClick={onCancel}><X size={14} /> Annuler</Button>
        <Button size="sm" onClick={() => onSave({ nom, typesEv, prix, description, elements: elements.filter(e => e.intitule.trim()), mode: 'manuel' })} disabled={!nom.trim()}>
          Enregistrer
        </Button>
      </div>
    </div>
  );
}

// ─── Mode Images ──────────────────────────────────────────────────────────────
function ModeImages({ onSave, onCancel }) {
  const [nom, setNom] = useState('');
  const [typesEv, setTypesEv] = useState([]);
  const [prix, setPrix] = useState('');
  const [images, setImages] = useState([]);
  const [uploading, setUploading] = useState(false);

  return (
    <div className="space-y-4">
      <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
        <div>
          <label className="text-xs font-medium text-muted-foreground mb-1 block">Nom de la formule *</label>
          <Input value={nom} onChange={e => setNom(e.target.value)} placeholder="ex: Formule Prestige" />
        </div>
        <div>
          <label className="text-xs font-medium text-muted-foreground mb-1 block">Prix par personne (€)</label>
          <Input type="number" value={prix} onChange={e => setPrix(e.target.value)} placeholder="0" />
        </div>
      </div>
      <div>
        <label className="text-xs font-medium text-muted-foreground mb-2 block">Types d'événement</label>
        <TypeEvenementMultiSelect value={typesEv} onChange={setTypesEv} />
      </div>

      <div>
        <label className="text-xs font-medium text-muted-foreground mb-2 block">Pages du menu (images)</label>
        <ImageUploadZone images={images} setImages={setImages} uploading={uploading} setUploading={setUploading} />
      </div>

      <div className="flex gap-2 justify-end pt-1 border-t border-border">
        <Button variant="outline" size="sm" onClick={onCancel}><X size={14} /> Annuler</Button>
        <Button size="sm" onClick={() => onSave({ nom, typesEv, prix, images, mode: 'images' })} disabled={!nom.trim() || images.length === 0 || uploading}>
          Enregistrer
        </Button>
      </div>
    </div>
  );
}

// ─── Mode Amanda ───────────────────────────────────────────────────────────────
function ModeAmanda({ onSave, onCancel }) {
  const [nom, setNom] = useState('');
  const [typesEv, setTypesEv] = useState([]);
  const [prix, setPrix] = useState('');
  const [images, setImages] = useState([]);
  const [uploading, setUploading] = useState(false);
  const [analyzing, setAnalyzing] = useState(false);
  const [elements, setElements] = useState(null);

  const handleAnalyze = async () => {
    if (images.length === 0) return;
    setAnalyzing(true);
    const result = await base44.integrations.Core.InvokeLLM({
      prompt: `Analyse ces images de menu de traiteur/restauration événementielle et retranscris le contenu de manière structurée.
Extrais tous les éléments du menu (entrées, plats, desserts, boissons, options…) avec leurs intitulés et descriptions.
Réponds en JSON avec la structure suivante.`,
      file_urls: images.map(i => i.url),
      response_json_schema: {
        type: 'object',
        properties: {
          elements: {
            type: 'array',
            items: {
              type: 'object',
              properties: {
                intitule: { type: 'string' },
                description: { type: 'string' },
                au_choix: { type: 'boolean' },
              },
            },
          },
        },
      },
    });
    setElements((result.elements || []).map(e => ({ ...e, id: genId() })));
    setAnalyzing(false);
  };

  const setEl = (id, key, val) =>
    setElements(els => els.map(e => e.id === id ? { ...e, [key]: val } : e));

  return (
    <div className="space-y-4">
      <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
        <div>
          <label className="text-xs font-medium text-muted-foreground mb-1 block">Nom de la formule *</label>
          <Input value={nom} onChange={e => setNom(e.target.value)} placeholder="ex: Formule Prestige" />
        </div>
        <div>
          <label className="text-xs font-medium text-muted-foreground mb-1 block">Prix par personne (€)</label>
          <Input type="number" value={prix} onChange={e => setPrix(e.target.value)} placeholder="0" />
        </div>
      </div>
      <div>
        <label className="text-xs font-medium text-muted-foreground mb-2 block">Types d'événement</label>
        <TypeEvenementMultiSelect value={typesEv} onChange={setTypesEv} />
      </div>

      <div>
        <label className="text-xs font-medium text-muted-foreground mb-2 block">Images du menu à analyser</label>
        <ImageUploadZone images={images} setImages={setImages} uploading={uploading} setUploading={setUploading} />
      </div>

      {!elements && (
        <Button
          onClick={handleAnalyze}
          disabled={images.length === 0 || uploading || analyzing}
          className="gap-2 w-full"
          variant="outline"
        >
          {analyzing ? <Loader2 size={16} className="animate-spin" /> : <Sparkles size={16} />}
          {analyzing ? 'Amanda analyse vos images…' : 'Demander à Amanda de retranscrire'}
        </Button>
      )}

      {elements && (
        <div className="space-y-2">
          <div className="flex items-center justify-between">
            <p className="text-sm font-semibold">Contenu extrait — vérifiez et corrigez</p>
            <button onClick={handleAnalyze} disabled={analyzing} className="text-xs text-primary hover:underline flex items-center gap-1">
              {analyzing ? <Loader2 size={12} className="animate-spin" /> : <Sparkles size={12} />} Relancer
            </button>
          </div>
          <div className="space-y-2 max-h-64 overflow-y-auto">
            {elements.map((el, idx) => (
              <div key={el.id} className="flex items-start gap-2 bg-card border border-border rounded-xl p-3">
                <div className="flex-1 grid grid-cols-1 md:grid-cols-2 gap-2">
                  <Input value={el.intitule} onChange={e => setEl(el.id, 'intitule', e.target.value)} placeholder={`Élément ${idx + 1}`} />
                  <Input value={el.description || ''} onChange={e => setEl(el.id, 'description', e.target.value)} placeholder="Description optionnelle" />
                </div>
                <label className="flex items-center gap-1.5 mt-2 cursor-pointer shrink-0">
                  <input type="checkbox" checked={!!el.au_choix} onChange={e => setEl(el.id, 'au_choix', e.target.checked)} className="rounded" />
                  <span className="text-xs text-muted-foreground whitespace-nowrap">Au choix</span>
                </label>
                <button onClick={() => setElements(prev => prev.filter(e => e.id !== el.id))} className="mt-2 p-1 rounded hover:bg-red-50 text-muted-foreground hover:text-red-500 shrink-0">
                  <X size={13} />
                </button>
              </div>
            ))}
          </div>
        </div>
      )}

      <div className="flex gap-2 justify-end pt-1 border-t border-border">
        <Button variant="outline" size="sm" onClick={onCancel}><X size={14} /> Annuler</Button>
        <Button
          size="sm"
          onClick={() => onSave({ nom, typesEv, prix, images, elements, mode: 'amanda' })}
          disabled={!nom.trim() || !elements || uploading}
        >
          Enregistrer
        </Button>
      </div>
    </div>
  );
}

// ─── Modal principale ─────────────────────────────────────────────────────────
export default function MenuCreationModal({ onSave, onCancel, embedded = false }) {
  const [selectedMode, setSelectedMode] = useState(null);

  const handleSave = (data) => {
    const payload = {
      nom: data.nom.trim(),
      types_evenement: data.typesEv || [],
      type_evenement: data.typesEv?.length === 1 ? data.typesEv[0] : (data.typesEv?.length === 0 ? 'Tous' : null),
      prix_par_personne: data.prix ? parseFloat(data.prix) : null,
      description: data.description?.trim() || null,
      elements: data.elements?.filter(e => e.intitule?.trim()) || [],
      images: data.images || [],
      mode_creation: data.mode,
      actif: true,
    };
    onSave(payload);
  };

  // En mode embedded (dans AjoutRapideModal), pas de wrapper propre — juste le contenu
  const header = (
    <div className="flex items-center gap-2 mb-4">
      {selectedMode && (
        <button onClick={() => setSelectedMode(null)} className="p-1 rounded hover:bg-muted text-muted-foreground hover:text-foreground">
          <ChevronLeft size={16} />
        </button>
      )}
      <p className="text-sm font-semibold text-muted-foreground">
        {!selectedMode && 'Choisissez un mode de création'}
        {selectedMode === 'manuel' && '✍️ Saisie manuelle'}
        {selectedMode === 'images' && '📸 Import image'}
        {selectedMode === 'amanda' && '✨ Import avec Amanda'}
      </p>
    </div>
  );

  if (embedded) {
    return (
      <div>
        {header}
        {!selectedMode && <ModeSelector onSelect={setSelectedMode} />}
        {selectedMode === 'manuel' && <ModeManuel onSave={handleSave} onCancel={() => setSelectedMode(null)} />}
        {selectedMode === 'images' && <ModeImages onSave={handleSave} onCancel={() => setSelectedMode(null)} />}
        {selectedMode === 'amanda' && <ModeAmanda onSave={handleSave} onCancel={() => setSelectedMode(null)} />}
      </div>
    );
  }

  return (
    <div className="bg-muted/30 rounded-2xl border border-border p-5 space-y-4">
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-2">
          {selectedMode && (
            <button onClick={() => setSelectedMode(null)} className="p-1 rounded hover:bg-muted text-muted-foreground hover:text-foreground">
              <ChevronLeft size={16} />
            </button>
          )}
          <p className="text-sm font-semibold">
            {!selectedMode && 'Créer une nouvelle formule'}
            {selectedMode === 'manuel' && '✍️ Saisie manuelle'}
            {selectedMode === 'images' && '📸 Import image'}
            {selectedMode === 'amanda' && '✨ Import avec Amanda'}
          </p>
        </div>
        <button onClick={onCancel} className="p-1 rounded hover:bg-muted text-muted-foreground">
          <X size={16} />
        </button>
      </div>

      {!selectedMode && <ModeSelector onSelect={setSelectedMode} />}
      {selectedMode === 'manuel' && <ModeManuel onSave={handleSave} onCancel={onCancel} />}
      {selectedMode === 'images' && <ModeImages onSave={handleSave} onCancel={onCancel} />}
      {selectedMode === 'amanda' && <ModeAmanda onSave={handleSave} onCancel={onCancel} />}
    </div>
  );
}