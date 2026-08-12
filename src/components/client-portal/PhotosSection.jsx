import { useState } from 'react';
import { useQuery, useQueryClient } from '@tanstack/react-query';
import { base44 } from '@/api/base44Client';
import { Clapperboard, Upload, CheckSquare, Square, Loader2, X } from 'lucide-react';

const MAX_VIDEO_SIZE = 500 * 1024 * 1024;

function isVideo(media) {
  const name = media.nom_fichier || media.file_url || '';
  return /\.(mp4|mov|avi|webm)$/i.test(name);
}

export default function PhotosSection({ evenement, clientNom }) {
  const qc = useQueryClient();
  const [autorisation, setAutorisation] = useState(false);
  const [uploading, setUploading] = useState(false);
  const [uploadedCount, setUploadedCount] = useState(0);
  const [pendingFiles, setPendingFiles] = useState(null);
  const [showConfirm, setShowConfirm] = useState(false);
  const [sizeError, setSizeError] = useState(null);

  const { data: medias = [] } = useQuery({
    queryKey: ['photos-client', evenement.id],
    queryFn: () => base44.entities.PhotoClient.filter({ evenement_id: evenement.id }),
  });

  const doUpload = async (files) => {
    setUploading(true);
    setShowConfirm(false);

    for (const file of files) {
      const { file_url } = await base44.integrations.Core.UploadFile({ file });
      await base44.entities.PhotoClient.create({
        source_type: 'client',
        source_id: evenement.client_id || evenement.id,
        evenement_id: evenement.id,
        evenement_nom: evenement.nom,
        client_nom: clientNom,
        file_url,
        autorisation_reseaux: autorisation,
        statut: 'En attente',
        nom_fichier: file.name,
      });
    }

    const nb = files.length;
    const hasVideo = files.some(f => /\.(mp4|mov|avi|webm)$/i.test(f.name));
    await base44.entities.Notification.create({
      titre: '📸 Nouveaux médias reçus',
      message: `${clientNom} a partagé ${nb > 1 ? `${nb} fichiers` : hasVideo ? 'une vidéo' : 'une photo'} pour l'événement "${evenement.nom}"${autorisation ? ' (avec autorisation réseaux sociaux)' : ''}.`,
      type: 'evenement',
      lu: false,
      lien: '/galerie-photos',
    });

    setUploadedCount(prev => prev + nb);
    setUploading(false);
    setPendingFiles(null);
    qc.invalidateQueries(['photos-client', evenement.id]);
  };

  const handleFileChange = (e) => {
    const files = Array.from(e.target.files || []);
    if (!files.length) return;
    setSizeError(null);

    for (const f of files) {
      if (/\.(mp4|mov|avi|webm)$/i.test(f.name) && f.size > MAX_VIDEO_SIZE) {
        setSizeError(`Votre vidéo "${f.name}" dépasse la limite de 500 Mo. Veuillez envoyer une vidéo plus courte.`);
        e.target.value = '';
        return;
      }
    }

    setPendingFiles(files);
    setShowConfirm(true);
    e.target.value = '';
  };

  const handleConfirm = () => { if (pendingFiles) doUpload(pendingFiles); };
  const handleCancel = () => { setPendingFiles(null); setShowConfirm(false); };

  return (
    <div className="bg-card rounded-2xl border border-border p-5 space-y-4">
      <div className="flex items-center gap-2">
        <Clapperboard size={16} className="text-purple-500" />
        <h3 className="font-semibold text-base">Mes médias</h3>
      </div>

      <p className="text-sm text-muted-foreground">
        Partagez vos plus belles photos et vidéos de l'événement avec votre organisateur.
      </p>

      {/* Erreur taille */}
      {sizeError && (
        <div className="bg-red-50 border border-red-200 text-red-700 text-sm rounded-xl px-4 py-3">
          ⚠️ {sizeError}
        </div>
      )}

      {/* Upload */}
      <label className="cursor-pointer block">
        <input
          type="file"
          accept="image/*,video/mp4,video/quicktime,.mp4,.mov"
          multiple
          className="hidden"
          onChange={handleFileChange}
          disabled={uploading}
        />
        <div className={`flex items-center justify-center gap-2 border-2 border-dashed rounded-xl py-4 transition-colors
          ${uploading ? 'border-muted bg-muted/20 cursor-not-allowed' : 'border-primary/30 hover:border-primary/60 hover:bg-primary/5 text-primary'}`}>
          {uploading
            ? <><Loader2 size={16} className="animate-spin text-muted-foreground" /><span className="text-sm text-muted-foreground">Envoi en cours...</span></>
            : <><Upload size={16} /><span className="text-sm font-medium">Partager des médias</span></>
          }
        </div>
      </label>
      <p className="text-xs text-muted-foreground">Photos (JPG, PNG…) et vidéos (MP4, MOV) — Vidéos max 500 Mo</p>

      {/* Galerie */}
      {medias.length > 0 && (
        <div className="space-y-2">
          <p className="text-xs text-muted-foreground">{medias.length} fichier{medias.length > 1 ? 's' : ''} partagé{medias.length > 1 ? 's' : ''}</p>
          <div className="grid grid-cols-3 gap-2">
            {medias.map(m => (
              <div key={m.id} className="relative aspect-square rounded-xl overflow-hidden border border-border bg-muted">
                {isVideo(m) ? (
                  <video src={m.file_url} className="w-full h-full object-cover" muted playsInline />
                ) : (
                  <img src={m.file_url} alt="" className="w-full h-full object-cover" />
                )}
                {isVideo(m) && (
                  <div className="absolute top-1 right-1 bg-black/60 rounded px-1 py-0.5 text-[10px] text-white pointer-events-none">🎬</div>
                )}
                <div className="absolute bottom-0 left-0 right-0 bg-black/50 px-1.5 py-1">
                  <span className={`text-[10px] font-medium
                    ${m.statut === 'Approuvée' ? 'text-emerald-300' :
                      m.statut === 'Publiée' ? 'text-blue-300' :
                      'text-white/70'}`}>
                    {m.statut}
                  </span>
                </div>
              </div>
            ))}
          </div>
        </div>
      )}

      {uploadedCount > 0 && (
        <p className="text-xs text-emerald-600 font-medium">
          ✓ {uploadedCount} fichier{uploadedCount > 1 ? 's' : ''} envoyé{uploadedCount > 1 ? 's' : ''} avec succès
        </p>
      )}

      {/* Modale de confirmation */}
      {showConfirm && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 p-4">
          <div className="bg-card rounded-2xl border border-border shadow-xl p-6 max-w-sm w-full space-y-4">
            <div className="flex items-center justify-between">
              <h3 className="font-semibold text-base">Confirmer l'envoi</h3>
              <button onClick={handleCancel} className="text-muted-foreground hover:text-foreground">
                <X size={16} />
              </button>
            </div>
            <p className="text-sm text-muted-foreground">
              Confirmez-vous le partage de {pendingFiles?.length > 1 ? `ces ${pendingFiles.length} fichiers` : 'ce fichier'} ?
            </p>
            <button
              type="button"
              onClick={() => setAutorisation(v => !v)}
              className="flex items-start gap-2.5 text-sm w-full text-left p-3 rounded-xl border border-border hover:bg-muted/50 transition-colors"
            >
              {autorisation
                ? <CheckSquare size={18} className="text-primary mt-0.5 shrink-0" />
                : <Square size={18} className="text-muted-foreground mt-0.5 shrink-0" />
              }
              <span className={autorisation ? 'text-foreground' : 'text-muted-foreground'}>
                J'autorise l'utilisation de ces médias sur les réseaux sociaux de l'organisateur <span className="text-xs italic">(optionnel)</span>
              </span>
            </button>
            <div className="flex gap-2 pt-1">
              <button onClick={handleCancel}
                className="flex-1 px-4 py-2 rounded-xl border border-border text-sm font-medium hover:bg-muted transition-colors">
                Annuler
              </button>
              <button onClick={handleConfirm}
                className="flex-1 px-4 py-2 rounded-xl bg-primary text-primary-foreground text-sm font-medium hover:bg-primary/90 transition-colors">
                Confirmer l'envoi
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}