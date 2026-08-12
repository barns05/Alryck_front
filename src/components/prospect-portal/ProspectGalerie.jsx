import { useQuery } from '@tanstack/react-query';
import { base44 } from '@/api/base44Client';
import { Play } from 'lucide-react';

function getYouTubeId(url) {
  const match = url?.match(/(?:youtube\.com\/watch\?v=|youtu\.be\/)([^&\s]+)/);
  return match ? match[1] : null;
}

function getVimeoId(url) {
  const match = url?.match(/vimeo\.com\/(\d+)/);
  return match ? match[1] : null;
}

export default function ProspectGalerie() {
  const { data: medias = [] } = useQuery({
    queryKey: ['galerie-vitrine-prospect'],
    queryFn: () => base44.entities.GalerieVitrine.filter({ visible_prospect: true }),
  });

  const photos = medias.filter(m => m.type === 'photo').sort((a, b) => (a.ordre || 0) - (b.ordre || 0));
  const videos = medias.filter(m => m.type === 'video').sort((a, b) => (a.ordre || 0) - (b.ordre || 0));

  if (medias.length === 0) {
    return <p className="text-sm text-muted-foreground py-4 text-center">Aucun média disponible pour le moment.</p>;
  }

  return (
    <div className="space-y-4 pt-4">
      {photos.length > 0 && (
        <div>
          <p className="text-xs font-medium text-muted-foreground mb-2">Photos</p>
          <div className="grid grid-cols-2 gap-2">
            {photos.map(p => (
              <a key={p.id} href={p.url} target="_blank" rel="noopener noreferrer" className="block">
                <img
                  src={p.url}
                  alt={p.titre || 'Photo'}
                  className="w-full h-32 object-cover rounded-xl border border-border hover:opacity-90 transition-opacity"
                />
              </a>
            ))}
          </div>
        </div>
      )}

      {videos.length > 0 && (
        <div>
          <p className="text-xs font-medium text-muted-foreground mb-2">Vidéos</p>
          <div className="space-y-2">
            {videos.map(v => {
              const ytId = getYouTubeId(v.url);
              const viId = getVimeoId(v.url);
              return (
                <div key={v.id} className="rounded-xl overflow-hidden border border-border">
                  {ytId ? (
                    <iframe
                      src={`https://www.youtube.com/embed/${ytId}`}
                      className="w-full aspect-video"
                      allowFullScreen
                      title={v.titre || 'Vidéo'}
                    />
                  ) : viId ? (
                    <iframe
                      src={`https://player.vimeo.com/video/${viId}`}
                      className="w-full aspect-video"
                      allowFullScreen
                      title={v.titre || 'Vidéo'}
                    />
                  ) : (
                    <a href={v.url} target="_blank" rel="noopener noreferrer"
                      className="flex items-center gap-3 p-3 hover:bg-muted/50 transition-colors">
                      <Play size={20} className="text-primary" />
                      <span className="text-sm">{v.titre || 'Voir la vidéo'}</span>
                    </a>
                  )}
                </div>
              );
            })}
          </div>
        </div>
      )}
    </div>
  );
}