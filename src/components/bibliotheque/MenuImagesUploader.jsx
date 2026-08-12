import { useState, useRef } from 'react';
import { base44 } from '@/api/base44Client';
import { Upload, X, GripVertical, Loader2 } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { DragDropContext, Droppable, Draggable } from '@hello-pangea/dnd';

function genId() {
  return Math.random().toString(36).slice(2, 9);
}

export default function MenuImagesUploader({ menu, onSave, onCancel }) {
  const [images, setImages] = useState(menu.images || []);
  const [uploading, setUploading] = useState(false);
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
    <div className="bg-muted/30 rounded-2xl border border-border p-4 space-y-3">
      <p className="text-sm font-semibold">Pages du menu — {menu.nom}</p>

      <div
        className="border-2 border-dashed border-border rounded-xl p-4 text-center cursor-pointer hover:border-primary/40 hover:bg-primary/5 transition-colors"
        onClick={() => inputRef.current?.click()}
        onDragOver={e => e.preventDefault()}
        onDrop={e => { e.preventDefault(); handleFiles(Array.from(e.dataTransfer.files)); }}
      >
        {uploading ? (
          <div className="flex items-center justify-center gap-2 text-primary">
            <Loader2 size={16} className="animate-spin" />
            <span className="text-sm">Upload en cours…</span>
          </div>
        ) : (
          <>
            <Upload size={18} className="mx-auto text-muted-foreground mb-1" />
            <p className="text-xs font-medium">Ajouter des pages</p>
          </>
        )}
        <input ref={inputRef} type="file" accept="image/*" multiple className="hidden" onChange={e => handleFiles(Array.from(e.target.files))} />
      </div>

      {images.length > 0 && (
        <DragDropContext onDragEnd={onDragEnd}>
          <Droppable droppableId="images" direction="horizontal">
            {(provided) => (
              <div ref={provided.innerRef} {...provided.droppableProps} className="flex gap-2 flex-wrap">
                {images.map((img, idx) => (
                  <Draggable key={img.id} draggableId={img.id} index={idx}>
                    {(prov) => (
                      <div ref={prov.innerRef} {...prov.draggableProps} className="relative group rounded-lg overflow-hidden border border-border w-20 h-20">
                        <div {...prov.dragHandleProps} className="absolute top-1 left-1 z-10 bg-black/40 rounded p-0.5 cursor-grab opacity-0 group-hover:opacity-100 transition-opacity">
                          <GripVertical size={10} className="text-white" />
                        </div>
                        <img src={img.url} alt={img.nom} className="w-full h-full object-cover" />
                        <button
                          onClick={() => setImages(prev => prev.filter(i => i.id !== img.id))}
                          className="absolute top-1 right-1 z-10 bg-red-500 rounded-full p-0.5 opacity-0 group-hover:opacity-100 transition-opacity"
                        >
                          <X size={10} className="text-white" />
                        </button>
                        <div className="absolute bottom-0 left-0 right-0 bg-black/50 text-white text-[9px] px-1 py-0.5 text-center">
                          {idx + 1}
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

      <div className="flex gap-2 justify-end pt-1 border-t border-border">
        <Button variant="outline" size="sm" onClick={onCancel}><X size={13} /> Annuler</Button>
        <Button size="sm" onClick={() => onSave(images)} disabled={uploading}>Enregistrer</Button>
      </div>
    </div>
  );
}