import { useState } from 'react';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { base44 } from '@/api/base44Client';
import { Clapperboard, Download, ChevronLeft, FolderOpen, Folder, Image } from 'lucide-react';
import { format, parseISO } from 'date-fns';
import { fr } from 'date-fns/locale';

const STATUTS = ['En attente', 'Approuvée', 'Publiée'];
const TABS = [
  { key: 'client', label: 'Clients' },
  { key: 'extra', label: 'Extras' },
  { key: 'prestataire', label: 'Prestataires' },
  { key: 'lieu', label: 'Lieux' },
];
const TYPE_FILTERS = ['Tout', 'Photos', 'Vidéos'];

const statutConfig = {
  'En attente': { color: 'bg-amber-100 text-amber-700' },
  'Approuvée':  { color: 'bg-emerald-100 text-emerald-700' },
  'Publiée':    { color: 'bg-blue-100 text-blue-700' },
};

function isVideo(media) {
  const name = media.nom_fichier || media.file_url || '';
  return /\.(mp4|mov|avi|webm)$/i.test(name);
}

function MediaCard({ media, onStatutChange }) {
  const cfg = statutConfig[media.statut] || statutConfig['En attente'];
  const statutsDisponibles = media.autorisation_reseaux ? STATUTS : STATUTS.filter(s => s !== 'Publiée');
  const video = isVideo(media);

  return (
    <div className="bg-card rounded-2xl border border-border overflow-hidden">
      <div className="relative aspect-square overflow-hidden bg-muted">
        {video ? (
          <video
            src={media.file_url}
            controls
            className="w-full h-full object-cover"
            preload="metadata"
          />
        ) : (
          <img src={media.file_url} alt="" className="w-full h-full object-cover" />
        )}
        {video && (
          <div className="absolute top-2 left-2 bg-black/60 text-white text-[10px] font-bold px-1.5 py-0.5 rounded-md pointer-events-none">
            🎬 Vidéo
          </div>
        )}
      </div>
      <div className="p-3 space-y-2">
        <p className="text-xs text-muted-foreground">
          {media.created_date ? format(parseISO(media.created_date), 'd MMM', { locale: fr }) : ''}
        </p>

        {media.commentaire && (
          <p className="text-xs text-muted-foreground italic bg-muted/40 rounded-lg px-2 py-1 leading-relaxed">
            "{media.commentaire}"
          </p>
        )}

        <div className={`flex items-center gap-1.5 text-[10px] font-medium px-2 py-1 rounded-lg ${media.autorisation_reseaux ? 'bg-emerald-50 text-emerald-700' : 'bg-red-50 text-red-600'}`}>
          <span>{media.autorisation_reseaux ? '✅' : '❌'}</span>
          <span>Autorisation réseaux : {media.autorisation_reseaux ? 'Oui' : 'Non'}</span>
        </div>

        <select
          value={media.statut || 'En attente'}
          onChange={e => onStatutChange(media.id, e.target.value)}
          className={`w-full px-2 py-1 rounded-lg text-xs font-medium border-0 cursor-pointer focus:outline-none focus:ring-1 focus:ring-ring ${cfg.color}`}
        >
          {statutsDisponibles.map(s => (
            <option key={s} value={s}>{s}</option>
          ))}
        </select>

        <button
          onClick={() => window.open(media.file_url, '_blank')}
          className="flex items-center gap-1.5 w-full justify-center px-2 py-1.5 rounded-lg bg-muted hover:bg-muted/70 text-xs text-muted-foreground hover:text-foreground transition-colors"
        >
          <Download size={12} />
          {video ? 'Télécharger la vidéo' : 'Télécharger'}
        </button>
      </div>
    </div>
  );
}

export default function GaleriePhotos() {
  const qc = useQueryClient();
  const [activeTab, setActiveTab] = useState('client');
  const [selectedSource, setSelectedSource] = useState(null);
  const [filtreStatut, setFiltreStatut] = useState('Tous');
  const [filtreType, setFiltreType] = useState('Tout');

  const { data: medias = [], isLoading } = useQuery({
    queryKey: ['medias-all'],
    queryFn: () => base44.entities.PhotoClient.list('-created_date', 500),
  });

  const updateStatutMutation = useMutation({
    mutationFn: ({ id, statut }) => base44.entities.PhotoClient.update(id, { statut }),
    onSuccess: () => qc.invalidateQueries(['medias-all']),
  });

  const autoApprove = async (sourceMedias) => {
    const enAttente = sourceMedias.filter(p => p.statut === 'En attente');
    for (const p of enAttente) {
      await base44.entities.PhotoClient.update(p.id, { statut: 'Approuvée' });
    }
    if (enAttente.length > 0) qc.invalidateQueries(['medias-all']);
  };

  const handleOpenFolder = (sourceKey, sourceMedias) => {
    setSelectedSource(sourceKey);
    setFiltreStatut('Tous');
    setFiltreType('Tout');
    autoApprove(sourceMedias);
  };

  const tabMedias = medias.filter(p => (p.source_type || 'client') === activeTab);

  const sourceGroups = tabMedias.reduce((acc, p) => {
    const key = p.client_nom || 'Inconnu';
    if (!acc[key]) acc[key] = [];
    acc[key].push(p);
    return acc;
  }, {});

  const enAttente = medias.filter(p => p.statut === 'En attente').length;

  // Vue dossier ouvert
  if (selectedSource) {
    const sourceMedias = sourceGroups[selectedSource] || [];
    let filtered = sourceMedias;
    if (filtreStatut !== 'Tous') filtered = filtered.filter(p => p.statut === filtreStatut);
    if (filtreType === 'Photos') filtered = filtered.filter(p => !isVideo(p));
    if (filtreType === 'Vidéos') filtered = filtered.filter(p => isVideo(p));

    const nbVideos = sourceMedias.filter(isVideo).length;
    const nbPhotos = sourceMedias.length - nbVideos;

    return (
      <div className="p-6 max-w-5xl mx-auto space-y-6">
        <div className="flex items-center gap-3">
          <button
            onClick={() => setSelectedSource(null)}
            className="flex items-center gap-1.5 text-sm text-muted-foreground hover:text-foreground transition-colors"
          >
            <ChevronLeft size={16} />
            Retour
          </button>
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 bg-purple-100 rounded-xl flex items-center justify-center">
              <FolderOpen size={20} className="text-purple-600" />
            </div>
            <div>
              <h1 className="text-xl font-bold">{selectedSource}</h1>
              <p className="text-sm text-muted-foreground">
                {nbPhotos > 0 && `${nbPhotos} photo${nbPhotos > 1 ? 's' : ''}`}
                {nbPhotos > 0 && nbVideos > 0 && ' · '}
                {nbVideos > 0 && `${nbVideos} vidéo${nbVideos > 1 ? 's' : ''}`}
              </p>
            </div>
          </div>
        </div>

        {/* Filtres type */}
        <div className="flex gap-1.5 flex-wrap items-center">
          <div className="flex gap-1 bg-muted rounded-xl p-1">
            {TYPE_FILTERS.map(t => (
              <button key={t} onClick={() => setFiltreType(t)}
                className={`px-3 py-1 rounded-lg text-xs font-medium transition-all
                  ${filtreType === t ? 'bg-card shadow-sm text-foreground' : 'text-muted-foreground hover:text-foreground'}`}>
                {t === 'Photos' ? <><Image size={11} className="inline mr-1" />Photos</> : t === 'Vidéos' ? <>🎬 Vidéos</> : 'Tout'}
              </button>
            ))}
          </div>
          <div className="w-px h-5 bg-border mx-1" />
          {['Tous', ...STATUTS].map(s => (
            <button key={s} onClick={() => setFiltreStatut(s)}
              className={`px-3 py-1.5 rounded-xl text-xs font-medium border transition-all
                ${filtreStatut === s ? 'bg-primary text-primary-foreground border-primary' : 'bg-card border-border text-foreground hover:bg-muted'}`}>
              {s}
            </button>
          ))}
        </div>

        {filtered.length === 0 ? (
          <p className="text-sm text-muted-foreground text-center py-8">Aucun média pour ce filtre.</p>
        ) : (
          <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 lg:grid-cols-5 gap-3">
            {filtered.map(media => (
              <MediaCard key={media.id} media={media}
                onStatutChange={(id, statut) => updateStatutMutation.mutate({ id, statut })} />
            ))}
          </div>
        )}
      </div>
    );
  }

  // Vue dossiers
  return (
    <div className="p-6 max-w-5xl mx-auto space-y-6">
      <div className="flex items-center justify-between flex-wrap gap-3">
        <div className="flex items-center gap-3">
          <div className="w-10 h-10 bg-purple-100 rounded-xl flex items-center justify-center">
            <Clapperboard size={20} className="text-purple-600" />
          </div>
          <div>
            <h1 className="text-xl font-bold">Médias</h1>
            <p className="text-sm text-muted-foreground">{medias.length} fichier{medias.length > 1 ? 's' : ''} au total</p>
          </div>
        </div>
        {enAttente > 0 && (
          <span className="bg-amber-100 text-amber-700 text-sm font-medium px-3 py-1.5 rounded-full">
            {enAttente} en attente
          </span>
        )}
      </div>

      {/* Sélecteur de source */}
      <div className="grid grid-cols-2 gap-2">
        {TABS.map(tab => {
          const count = medias.filter(p => (p.source_type || 'client') === tab.key).length;
          const isActive = activeTab === tab.key;
          return (
            <button
              key={tab.key}
              onClick={() => { setActiveTab(tab.key); setSelectedSource(null); }}
              className={`flex items-center justify-between px-4 py-3 rounded-xl font-semibold text-sm transition-all
                ${isActive ? 'bg-primary text-white shadow-sm' : 'bg-secondary text-secondary-foreground hover:bg-secondary/70'}`}
            >
              <span>{tab.label}</span>
              {count > 0 && (
                <span className={`text-xs px-2 py-0.5 rounded-full font-medium ${isActive ? 'bg-white/20 text-white' : 'bg-muted text-muted-foreground'}`}>
                  {count}
                </span>
              )}
            </button>
          );
        })}
      </div>

      {isLoading ? (
        <div className="flex items-center justify-center py-16">
          <div className="w-8 h-8 border-4 border-slate-200 border-t-primary rounded-full animate-spin"></div>
        </div>
      ) : Object.keys(sourceGroups).length === 0 ? (
        <div className="text-center py-16 text-muted-foreground">
          <Clapperboard size={40} className="mx-auto mb-3 opacity-30" />
          <p className="font-medium">Aucun média reçu</p>
          <p className="text-sm mt-1">Les photos et vidéos partagées apparaîtront ici</p>
        </div>
      ) : (
        <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 gap-4">
          {Object.entries(sourceGroups).map(([sourceNom, sourceMedias]) => {
            const enAttenteCount = sourceMedias.filter(p => p.statut === 'En attente').length;
            const nbVid = sourceMedias.filter(isVideo).length;
            const preview = sourceMedias.find(m => !isVideo(m)) || sourceMedias[0];
            return (
              <button key={sourceNom} onClick={() => handleOpenFolder(sourceNom, sourceMedias)}
                className="bg-card rounded-2xl border border-border overflow-hidden hover:shadow-md hover:border-primary/30 transition-all text-left">
                <div className="relative aspect-video bg-muted overflow-hidden">
                  {preview && !isVideo(preview) ? (
                    <img src={preview.file_url} alt="" className="w-full h-full object-cover opacity-80" />
                  ) : preview && isVideo(preview) ? (
                    <div className="w-full h-full flex items-center justify-center bg-slate-800">
                      <span className="text-3xl">🎬</span>
                    </div>
                  ) : (
                    <div className="w-full h-full flex items-center justify-center">
                      <Folder size={32} className="text-muted-foreground/30" />
                    </div>
                  )}
                  {sourceMedias.length > 1 && (
                    <div className="absolute bottom-2 right-2 bg-black/60 text-white text-xs font-medium px-2 py-0.5 rounded-full">
                      {sourceMedias.length}
                    </div>
                  )}
                  {enAttenteCount > 0 && (
                    <div className="absolute top-2 left-2 bg-amber-500 text-white text-[10px] font-bold px-1.5 py-0.5 rounded-full">
                      {enAttenteCount} à valider
                    </div>
                  )}
                  {nbVid > 0 && (
                    <div className="absolute top-2 right-2 bg-black/60 text-white text-[10px] px-1.5 py-0.5 rounded-full">
                      🎬 {nbVid}
                    </div>
                  )}
                </div>
                <div className="p-3">
                  <p className="font-semibold text-sm truncate">{sourceNom}</p>
                  <p className="text-xs text-muted-foreground mt-0.5">
                    {sourceMedias.filter(p => p.autorisation_reseaux).length > 0 ? '✓ Auth · ' : ''}
                    {sourceMedias.length - nbVid > 0 && `${sourceMedias.length - nbVid} photo${sourceMedias.length - nbVid > 1 ? 's' : ''}`}
                    {sourceMedias.length - nbVid > 0 && nbVid > 0 && ' · '}
                    {nbVid > 0 && `${nbVid} vidéo${nbVid > 1 ? 's' : ''}`}
                  </p>
                </div>
              </button>
            );
          })}
        </div>
      )}
    </div>
  );
}