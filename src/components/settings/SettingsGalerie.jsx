import { useState } from 'react';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { base44 } from '@/api/base44Client';
import { DragDropContext, Droppable, Draggable } from '@hello-pangea/dnd';
import { Plus, Trash2, GripVertical, Eye, EyeOff, Link, Upload, Star, StarOff, Quote } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { useOwnerCompanySettings } from '@/hooks/useOwnerCompanySettings';

// ─── Onglet Photos ────────────────────────────────────────────────────────────
function TabPhotos() {
  const qc = useQueryClient();
  const [uploading, setUploading] = useState(false);
  const [editTitreId, setEditTitreId] = useState(null);
  const [titreTmp, setTitreTmp] = useState('');

  const { data: photos = [] } = useQuery({
    queryKey: ['galerie-photos'],
    queryFn: () => base44.entities.GalerieVitrine.filter({ type: 'photo' }, 'ordre', 100),
  });

  const createMutation = useMutation({
    mutationFn: (data) => base44.entities.GalerieVitrine.create(data),
    onSuccess: () => qc.invalidateQueries(['galerie-photos']),
  });
  const updateMutation = useMutation({
    mutationFn: ({ id, data }) => base44.entities.GalerieVitrine.update(id, data),
    onSuccess: () => qc.invalidateQueries(['galerie-photos']),
  });
  const deleteMutation = useMutation({
    mutationFn: (id) => base44.entities.GalerieVitrine.delete(id),
    onSuccess: () => qc.invalidateQueries(['galerie-photos']),
  });

  const handleUpload = async (e) => {
    const file = e.target.files[0];
    if (!file) return;
    setUploading(true);
    const { file_url } = await base44.integrations.Core.UploadFile({ file });
    await createMutation.mutateAsync({
      type: 'photo',
      url: file_url,
      titre: '',
      visible_prospect: true,
      ordre: photos.length,
    });
    setUploading(false);
    e.target.value = '';
  };

  const onDragEnd = (result) => {
    if (!result.destination) return;
    const sorted = [...photos].sort((a, b) => (a.ordre || 0) - (b.ordre || 0));
    const [moved] = sorted.splice(result.source.index, 1);
    sorted.splice(result.destination.index, 0, moved);
    sorted.forEach((p, i) => {
      if (p.ordre !== i) updateMutation.mutate({ id: p.id, data: { ordre: i } });
    });
  };

  const sorted = [...photos].sort((a, b) => (a.ordre || 0) - (b.ordre || 0));

  return (
    <div className="space-y-4">
      <div className="flex items-center justify-between">
        <p className="text-sm text-muted-foreground">{photos.length} photo{photos.length !== 1 ? 's' : ''}</p>
        <label className={`cursor-pointer flex items-center gap-1.5 px-3 py-1.5 rounded-lg bg-primary text-primary-foreground text-xs font-medium hover:bg-primary/90 transition-colors ${uploading ? 'opacity-60 pointer-events-none' : ''}`}>
          <Upload size={13} /> {uploading ? 'Upload…' : 'Ajouter une photo'}
          <input type="file" accept="image/*" className="hidden" onChange={handleUpload} disabled={uploading} />
        </label>
      </div>

      {sorted.length === 0 && (
        <div className="text-center py-10 text-muted-foreground text-sm">
          <p className="text-3xl mb-2">🖼️</p>
          <p>Aucune photo. Uploadez vos plus belles images.</p>
        </div>
      )}

      <DragDropContext onDragEnd={onDragEnd}>
        <Droppable droppableId="photos">
          {(provided) => (
            <div ref={provided.innerRef} {...provided.droppableProps} className="grid grid-cols-2 sm:grid-cols-3 gap-3">
              {sorted.map((photo, idx) => (
                <Draggable key={photo.id} draggableId={photo.id} index={idx}>
                  {(prov) => (
                    <div ref={prov.innerRef} {...prov.draggableProps} className="relative group rounded-xl overflow-hidden border border-border aspect-video bg-muted">
                      <img src={photo.url} alt={photo.titre || ''} className="w-full h-full object-cover" />
                      {/* Drag handle */}
                      <div {...prov.dragHandleProps} className="absolute top-1 left-1 p-1 rounded bg-black/40 text-white opacity-0 group-hover:opacity-100 transition-opacity cursor-grab">
                        <GripVertical size={13} />
                      </div>
                      {/* Toggle visibilité */}
                      <button
                        onClick={() => updateMutation.mutate({ id: photo.id, data: { visible_prospect: !photo.visible_prospect } })}
                        className="absolute top-1 right-7 p-1 rounded bg-black/40 text-white opacity-0 group-hover:opacity-100 transition-opacity"
                        title={photo.visible_prospect ? 'Masquer aux prospects' : 'Rendre visible'}
                      >
                        {photo.visible_prospect ? <Eye size={13} /> : <EyeOff size={13} />}
                      </button>
                      {/* Supprimer */}
                      <button
                        onClick={() => { if (window.confirm('Supprimer cette photo ?')) deleteMutation.mutate(photo.id); }}
                        className="absolute top-1 right-1 p-1 rounded bg-black/40 text-white opacity-0 group-hover:opacity-100 transition-opacity hover:bg-red-500/70"
                      >
                        <Trash2 size={13} />
                      </button>
                      {/* Badge visible */}
                      {!photo.visible_prospect && (
                        <div className="absolute bottom-1 left-1 bg-black/60 text-white text-[10px] px-1.5 py-0.5 rounded">Masquée</div>
                      )}
                      {/* Titre */}
                      <div className="absolute bottom-0 left-0 right-0 bg-black/50 px-2 py-1">
                        {editTitreId === photo.id ? (
                          <input
                            autoFocus
                            className="w-full text-xs bg-transparent text-white outline-none placeholder:text-white/60"
                            value={titreTmp}
                            onChange={e => setTitreTmp(e.target.value)}
                            onBlur={() => { updateMutation.mutate({ id: photo.id, data: { titre: titreTmp } }); setEditTitreId(null); }}
                            onKeyDown={e => { if (e.key === 'Enter') { updateMutation.mutate({ id: photo.id, data: { titre: titreTmp } }); setEditTitreId(null); } }}
                            placeholder="Titre…"
                          />
                        ) : (
                          <p
                            onClick={() => { setEditTitreId(photo.id); setTitreTmp(photo.titre || ''); }}
                            className="text-xs text-white/80 cursor-text truncate min-h-[16px]"
                          >
                            {photo.titre || <span className="opacity-40 italic">Ajouter un titre…</span>}
                          </p>
                        )}
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
    </div>
  );
}

// ─── Onglet Vidéos ────────────────────────────────────────────────────────────
function TabVideos() {
  const qc = useQueryClient();
  const [lien, setLien] = useState('');
  const [titreLien, setTitreLien] = useState('');
  const [uploading, setUploading] = useState(false);

  const { data: videos = [] } = useQuery({
    queryKey: ['galerie-videos'],
    queryFn: () => base44.entities.GalerieVitrine.filter({ type: 'video' }, 'ordre', 100),
  });

  const createMutation = useMutation({
    mutationFn: (data) => base44.entities.GalerieVitrine.create(data),
    onSuccess: () => { qc.invalidateQueries(['galerie-videos']); setLien(''); setTitreLien(''); },
  });
  const updateMutation = useMutation({
    mutationFn: ({ id, data }) => base44.entities.GalerieVitrine.update(id, data),
    onSuccess: () => qc.invalidateQueries(['galerie-videos']),
  });
  const deleteMutation = useMutation({
    mutationFn: (id) => base44.entities.GalerieVitrine.delete(id),
    onSuccess: () => qc.invalidateQueries(['galerie-videos']),
  });

  const handleUploadVideo = async (e) => {
    const file = e.target.files[0];
    if (!file) return;
    setUploading(true);
    const { file_url } = await base44.integrations.Core.UploadFile({ file });
    await createMutation.mutateAsync({ type: 'video', url: file_url, titre: '', est_lien_externe: false, visible_prospect: true, ordre: videos.length });
    setUploading(false);
    e.target.value = '';
  };

  const handleAddLien = () => {
    if (!lien.trim()) return;
    createMutation.mutate({ type: 'video', url: lien.trim(), titre: titreLien.trim() || '', est_lien_externe: true, visible_prospect: true, ordre: videos.length });
  };

  const getEmbedUrl = (url) => {
    if (url.includes('youtube.com/watch')) return url.replace('watch?v=', 'embed/');
    if (url.includes('youtu.be/')) return url.replace('youtu.be/', 'www.youtube.com/embed/');
    if (url.includes('vimeo.com/')) {
      const id = url.split('vimeo.com/')[1];
      return `https://player.vimeo.com/video/${id}`;
    }
    return url;
  };

  return (
    <div className="space-y-5">
      {/* Ajouter lien */}
      <div className="bg-muted/40 rounded-xl border border-border p-4 space-y-3">
        <p className="text-xs font-semibold text-muted-foreground uppercase tracking-wide">Ajouter un lien YouTube / Vimeo</p>
        <div className="flex gap-2">
          <Input value={lien} onChange={e => setLien(e.target.value)} placeholder="https://www.youtube.com/watch?v=..." className="flex-1" />
          <Input value={titreLien} onChange={e => setTitreLien(e.target.value)} placeholder="Titre (optionnel)" className="w-40" />
          <Button size="sm" onClick={handleAddLien} disabled={!lien.trim()} className="gap-1.5 shrink-0">
            <Link size={13} /> Ajouter
          </Button>
        </div>
      </div>

      {/* Upload vidéo */}
      <div className="flex items-center gap-3">
        <label className={`cursor-pointer flex items-center gap-1.5 px-3 py-1.5 rounded-lg border border-border bg-card text-xs font-medium hover:bg-muted transition-colors ${uploading ? 'opacity-60 pointer-events-none' : ''}`}>
          <Upload size={13} /> {uploading ? 'Upload…' : 'Uploader une vidéo'}
          <input type="file" accept="video/*" className="hidden" onChange={handleUploadVideo} disabled={uploading} />
        </label>
        <p className="text-xs text-muted-foreground">{videos.length} vidéo{videos.length !== 1 ? 's' : ''}</p>
      </div>

      {videos.length === 0 && (
        <div className="text-center py-10 text-muted-foreground text-sm">
          <p className="text-3xl mb-2">🎬</p>
          <p>Aucune vidéo. Ajoutez un lien YouTube/Vimeo ou uploadez un fichier.</p>
        </div>
      )}

      <div className="space-y-3">
        {[...videos].sort((a, b) => (a.ordre || 0) - (b.ordre || 0)).map(video => (
          <div key={video.id} className="bg-card border border-border rounded-xl overflow-hidden">
            {video.est_lien_externe ? (
              <div className="aspect-video">
                <iframe
                  src={getEmbedUrl(video.url)}
                  className="w-full h-full"
                  allow="accelerometer; autoplay; clipboard-write; encrypted-media; gyroscope; picture-in-picture"
                  allowFullScreen
                  title={video.titre || 'Vidéo'}
                />
              </div>
            ) : (
              <div className="aspect-video bg-black">
                <video src={video.url} controls className="w-full h-full" />
              </div>
            )}
            <div className="flex items-center gap-3 px-3 py-2">
              <p className="flex-1 text-sm font-medium truncate">{video.titre || <span className="text-muted-foreground italic text-xs">Sans titre</span>}</p>
              <button
                onClick={() => updateMutation.mutate({ id: video.id, data: { visible_prospect: !video.visible_prospect } })}
                className={`p-1.5 rounded-lg transition-colors ${video.visible_prospect ? 'text-emerald-600 hover:bg-emerald-50' : 'text-muted-foreground hover:bg-muted'}`}
                title={video.visible_prospect ? 'Visible prospects' : 'Masquée'}
              >
                {video.visible_prospect ? <Eye size={14} /> : <EyeOff size={14} />}
              </button>
              <button
                onClick={() => { if (window.confirm('Supprimer cette vidéo ?')) deleteMutation.mutate(video.id); }}
                className="p-1.5 rounded-lg text-muted-foreground hover:text-red-500 hover:bg-red-50 transition-colors"
              >
                <Trash2 size={14} />
              </button>
            </div>
          </div>
        ))}
      </div>
    </div>
  );
}

// ─── Onglet Avis mis en avant ─────────────────────────────────────────────────
function TabAvisMisEnAvant() {
  const qc = useQueryClient();
  const MAX = 5;

  const { data: avis = [] } = useQuery({
    queryKey: ['avis-evenement-all'],
    queryFn: () => base44.entities.AvisEvenement.filter({ statut: 'Avis reçu' }),
  });

  const { data: evenements = [] } = useQuery({
    queryKey: ['evenements'],
    queryFn: () => base44.entities.Evenement.list(),
  });

  // On stocke les IDs mis en avant dans CompanySettings
  const { query } = useOwnerCompanySettings();
  const settings = query.data ?? [];

  const setting = settings[0] || {};
  const avisMisEnAvant = setting.avis_mis_en_avant || [];

  const updateMutation = useMutation({
    mutationFn: ({ id, data }) => base44.entities.CompanySettings.update(id, data),
    onSuccess: () => qc.invalidateQueries(['company-settings']),
  });

  const toggleAvis = (avisId) => {
    let newList;
    if (avisMisEnAvant.includes(avisId)) {
      newList = avisMisEnAvant.filter(id => id !== avisId);
    } else {
      if (avisMisEnAvant.length >= MAX) return;
      newList = [...avisMisEnAvant, avisId];
    }
    if (setting.id) {
      updateMutation.mutate({ id: setting.id, data: { avis_mis_en_avant: newList } });
    }
  };

  const getTypeEv = (avisItem) => {
    const ev = evenements.find(e => e.id === avisItem.evenement_id);
    return ev?.type_evenement || '';
  };

  const misEnAvantAvis = avis.filter(a => avisMisEnAvant.includes(a.id));
  const autresAvis = avis.filter(a => !avisMisEnAvant.includes(a.id));

  return (
    <div className="space-y-5">
      <div className="flex items-center justify-between">
        <p className="text-sm text-muted-foreground">{avisMisEnAvant.length}/{MAX} avis sélectionnés</p>
        {avisMisEnAvant.length >= MAX && (
          <span className="text-xs bg-amber-100 text-amber-700 px-2 py-0.5 rounded-full font-medium">Maximum atteint</span>
        )}
      </div>

      {/* Avis mis en avant */}
      {misEnAvantAvis.length > 0 && (
        <div>
          <p className="text-xs font-semibold text-muted-foreground uppercase tracking-wide mb-2">Mis en avant</p>
          <div className="space-y-2">
            {misEnAvantAvis.map(a => (
              <AvisCard key={a.id} avis={a} typeEv={getTypeEv(a)} selected onToggle={() => toggleAvis(a.id)} />
            ))}
          </div>
        </div>
      )}

      {/* Autres avis disponibles */}
      {autresAvis.length > 0 && (
        <div>
          <p className="text-xs font-semibold text-muted-foreground uppercase tracking-wide mb-2">
            Autres avis reçus ({autresAvis.length})
          </p>
          <div className="space-y-2">
            {autresAvis.map(a => (
              <AvisCard
                key={a.id}
                avis={a}
                typeEv={getTypeEv(a)}
                selected={false}
                disabled={avisMisEnAvant.length >= MAX}
                onToggle={() => toggleAvis(a.id)}
              />
            ))}
          </div>
        </div>
      )}

      {avis.length === 0 && (
        <div className="text-center py-10 text-muted-foreground text-sm">
          <p className="text-3xl mb-2">⭐</p>
          <p>Aucun avis reçu pour l'instant. Les avis apparaîtront ici une fois collectés.</p>
        </div>
      )}
    </div>
  );
}

function AvisCard({ avis, typeEv, selected, disabled, onToggle }) {
  return (
    <div className={`bg-card border rounded-xl p-4 flex items-start gap-3 transition-colors ${selected ? 'border-primary/40 bg-primary/5' : 'border-border'} ${disabled && !selected ? 'opacity-50' : ''}`}>
      <Quote size={16} className={`shrink-0 mt-0.5 ${selected ? 'text-primary' : 'text-muted-foreground'}`} />
      <div className="flex-1 min-w-0">
        <p className="text-sm text-muted-foreground italic line-clamp-2">
          {avis.commentaire || <span className="not-italic">Avis reçu sans commentaire</span>}
        </p>
        <div className="flex items-center gap-2 mt-1.5">
          <span className="text-xs font-semibold">{avis.client_nom}</span>
          {typeEv && <span className="text-xs bg-muted text-muted-foreground px-2 py-0.5 rounded-full">{typeEv}</span>}
        </div>
      </div>
      <button
        onClick={onToggle}
        disabled={disabled && !selected}
        className={`shrink-0 p-1.5 rounded-lg transition-colors ${selected ? 'text-primary hover:bg-primary/10' : 'text-muted-foreground hover:bg-muted'}`}
        title={selected ? 'Retirer de la sélection' : 'Mettre en avant'}
      >
        {selected ? <Star size={16} className="fill-primary" /> : <Star size={16} />}
      </button>
    </div>
  );
}

// ─── Composant principal ──────────────────────────────────────────────────────
export default function SettingsGalerie() {
  const [tab, setTab] = useState('photos');

  const tabs = [
    { id: 'photos', label: '🖼️ Photos' },
    { id: 'videos', label: '🎬 Vidéos' },
    { id: 'avis', label: '⭐ Avis mis en avant' },
  ];

  return (
    <div className="space-y-5">
      {/* Onglets */}
      <div className="flex gap-1 bg-muted/50 rounded-xl p-1">
        {tabs.map(t => (
          <button
            key={t.id}
            onClick={() => setTab(t.id)}
            className={`flex-1 text-sm py-2 px-3 rounded-lg font-medium transition-colors ${tab === t.id ? 'bg-card shadow-sm text-foreground' : 'text-muted-foreground hover:text-foreground'}`}
          >
            {t.label}
          </button>
        ))}
      </div>

      {tab === 'photos' && <TabPhotos />}
      {tab === 'videos' && <TabVideos />}
      {tab === 'avis' && <TabAvisMisEnAvant />}
    </div>
  );
}