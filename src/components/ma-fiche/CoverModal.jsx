/**
 * CoverModal — Sélecteur de photo de couverture (galerie / upload).
 * Extrait de IdentiteTab pour réutilisation.
 */
import { useState, useRef } from 'react';
import { useQuery } from '@tanstack/react-query';
import { base44 } from '@/api/base44Client';
import { Button } from '@/components/ui/button';
import { Upload, X, Check } from 'lucide-react';

export default function CoverModal({ currentUrl, onConfirm, onClose }) {
  const [tab, setTab] = useState('galerie');
  const [pending, setPending] = useState(currentUrl || '');
  const [uploading, setUploading] = useState(false);
  const [uploadedPreview, setUploadedPreview] = useState(null);
  const fileInputRef = useRef(null);

  const { data: galeriePhotos = [] } = useQuery({
    queryKey: ['galerie-vitrine-all-photos'],
    queryFn: () => base44.entities.GalerieVitrine.list(),
    select: list => list.filter(m => m.type === 'photo').sort((a, b) => (a.ordre || 0) - (b.ordre || 0)),
  });

  const handleUpload = async (e) => {
    const file = e.target.files?.[0];
    if (!file) return;
    setUploading(true);
    const { file_url } = await base44.integrations.Core.UploadFile({ file });
    setUploadedPreview(file_url);
    setPending(file_url);
    setUploading(false);
  };

  return (
    <>
      <div className="fixed inset-0 z-[60] bg-black/50" onClick={onClose} />
      <div className="fixed z-[70] bg-background shadow-2xl flex flex-col bottom-0 left-0 right-0 md:bottom-auto md:left-1/2 md:top-1/2 md:-translate-x-1/2 md:-translate-y-1/2 md:w-full md:max-w-lg"
        style={{ height: '70vh', borderRadius: '20px 20px 0 0' }}>
        <div className="flex items-center justify-between px-5 border-b border-border shrink-0" style={{ height: 56 }}>
          <h3 className="font-semibold text-base">Photo de couverture</h3>
          <button onClick={onClose} className="w-8 h-8 flex items-center justify-center rounded-full hover:bg-muted transition-colors text-muted-foreground">
            <X size={18} />
          </button>
        </div>
        <div className="flex border-b border-border shrink-0">
          {[{ id: 'galerie', label: '🖼️ Depuis ma galerie' }, { id: 'upload', label: '⬆️ Uploader' }].map(t => (
            <button key={t.id} onClick={() => setTab(t.id)}
              className={`flex-1 py-2.5 text-sm font-medium transition-colors border-b-2 ${tab === t.id ? 'border-primary text-primary' : 'border-transparent text-muted-foreground hover:text-foreground'}`}>
              {t.label}
            </button>
          ))}
        </div>
        <div className="flex-1 overflow-y-auto px-5 py-4" style={{ paddingBottom: 100 }}>
          {tab === 'galerie' && (
            <div>
              {galeriePhotos.length === 0
                ? <p className="text-sm text-muted-foreground italic text-center py-8">Aucune photo dans la galerie.</p>
                : (
                  <div className="grid grid-cols-3 gap-2">
                    <button onClick={() => setPending('')}
                      className={`relative rounded-xl border-2 overflow-hidden flex flex-col items-center justify-center gap-1 p-2 transition-all ${pending === '' ? 'border-amber-400 bg-amber-50' : 'border-border bg-muted/30 hover:border-muted-foreground'}`}
                      style={{ aspectRatio: '16/9' }}>
                      <span className="text-lg">🚫</span>
                      <span className="text-[10px] font-medium text-muted-foreground">Aucune</span>
                      {pending === '' && <div className="absolute top-1 right-1 w-4 h-4 rounded-full bg-amber-400 flex items-center justify-center"><Check size={10} className="text-white" /></div>}
                    </button>
                    {galeriePhotos.map(photo => (
                      <button key={photo.id} onClick={() => setPending(photo.url)}
                        className={`relative rounded-xl border-2 overflow-hidden transition-all ${pending === photo.url ? 'border-amber-400 ring-2 ring-amber-200' : 'border-border hover:border-muted-foreground'}`}
                        style={{ aspectRatio: '16/9' }}>
                        <img src={photo.url} alt={photo.titre || 'Photo'} className="w-full h-full object-cover" />
                        {pending === photo.url && <div className="absolute top-1 right-1 w-4 h-4 rounded-full bg-amber-400 flex items-center justify-center"><Check size={10} className="text-white" /></div>}
                      </button>
                    ))}
                  </div>
                )
              }
            </div>
          )}
          {tab === 'upload' && (
            <div className="space-y-4">
              <input ref={fileInputRef} type="file" accept="image/*" className="hidden" onChange={handleUpload} />
              <button onClick={() => fileInputRef.current?.click()} disabled={uploading}
                className="w-full flex flex-col items-center justify-center gap-3 py-8 rounded-xl border-2 border-dashed border-border bg-muted/30 hover:bg-muted/50 transition-colors disabled:opacity-50">
                {uploading ? <div className="w-6 h-6 border-2 border-border border-t-primary rounded-full animate-spin" /> : <Upload size={24} className="text-muted-foreground" />}
                <span className="text-sm text-muted-foreground font-medium">{uploading ? 'Envoi en cours…' : 'Cliquer pour choisir une photo'}</span>
                <span className="text-xs text-muted-foreground">JPG, PNG, WEBP</span>
              </button>
              {uploadedPreview && (
                <div>
                  <p className="text-xs font-medium text-muted-foreground mb-2">Aperçu :</p>
                  <div className="rounded-xl overflow-hidden border border-border" style={{ aspectRatio: '16/6' }}>
                    <img src={uploadedPreview} alt="Aperçu" className="w-full h-full object-cover" />
                  </div>
                </div>
              )}
            </div>
          )}
        </div>
        <div className="absolute bottom-0 left-0 right-0 bg-background border-t border-border flex gap-3 px-4"
          style={{ paddingTop: 16, paddingBottom: 'calc(16px + env(safe-area-inset-bottom, 0px))' }}>
          <Button variant="outline" onClick={onClose} className="flex-1">Annuler</Button>
          <Button onClick={() => onConfirm(pending)} className="flex-1">Confirmer</Button>
        </div>
      </div>
    </>
  );
}