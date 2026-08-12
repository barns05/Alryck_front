/**
 * PersonnalisationContent — Contenu du drawer "Personnalisation".
 *
 * Regroupe : photo de profil, ApparenceCard (photo de fond / couleur / mode),
 * style du compte à rebours, et ThemePickerGrid (thème visuel ProgrammeJourJ).
 *
 * Les modifications sont sauvegardées en live (même comportement que les composants
  existants). Le bouton "Enregistrer" applique le style de compte à rebours et ferme.
 */
import { useState, useRef } from 'react';
import { createPortal } from 'react-dom';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { base44 } from '@/api/base44Client';
import { Camera, Loader2 } from 'lucide-react';
import ApparenceCard from './ApparenceCard';
import ThemePickerGrid from '@/components/programme/ThemePickerGrid';
import ProgrammePreview from '@/components/programme/ProgrammePreview';
import { useInviteTheme } from '@/components/invite-portal/useInviteTheme';
import PersonnalisationProgress from './PersonnalisationProgress';

function compressImage(file, maxWidth = 1200, quality = 0.75) {
  return new Promise((resolve) => {
    const img = new Image();
    const url = URL.createObjectURL(file);
    img.onload = () => {
      URL.revokeObjectURL(url);
      const scale = Math.min(1, maxWidth / img.width);
      const canvas = document.createElement('canvas');
      canvas.width = Math.round(img.width * scale);
      canvas.height = Math.round(img.height * scale);
      const ctx = canvas.getContext('2d');
      ctx.drawImage(img, 0, 0, canvas.width, canvas.height);
      canvas.toBlob(
        (blob) => resolve(blob ? new File([blob], file.name, { type: 'image/jpeg' }) : file),
        'image/jpeg',
        quality
      );
    };
    img.onerror = () => { URL.revokeObjectURL(url); resolve(file); };
    img.src = url;
  });
}

export default function PersonnalisationContent({ evenement, clientId, clientNom, onClose }) {
  const qc = useQueryClient();
  const profilInputRef = useRef(null);
  const bandeauInputRef = useRef(null);
  const [uploadingProfil, setUploadingProfil] = useState(false);
  const [uploadingBandeau, setUploadingBandeau] = useState(false);
  const [saving, setSaving] = useState(false);
  const [previewMode, setPreviewMode] = useState(false);
  const [previewProgramme, setPreviewProgramme] = useState(null);
  const [previewInitialThemeId, setPreviewInitialThemeId] = useState(null);
  const [applyingId, setApplyingId] = useState(null);

  const { data: client } = useQuery({
    queryKey: ['client-personnalisation', clientId],
    queryFn: () => base44.entities.Client.filter({ id: clientId }).then(r => r[0] || null),
    enabled: !!clientId,
  });

  const { theme, themeId, programme, updateTheme } = useInviteTheme(evenement?.id);

  // ── Progression 3 étapes (même logique que PersonnalisationCard) ──────────
  const step1Done = !!(client?.photo_profil_url && String(client.photo_profil_url).trim() !== '');
  const step2Done = !!(evenement?.photo_bandeau_url?.trim() || evenement?.couleur_theme?.trim());
  const step3Done = !!themeId && themeId !== 'navy_cristal';

  const updateEvenement = useMutation({
    mutationFn: (data) => base44.entities.Evenement.update(evenement?.id, data),
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ['evenement-portal', evenement?.id] });
      qc.invalidateQueries({ queryKey: ['evenement', evenement?.id] });
    },
  });

  const handleUploadProfil = async (e) => {
    const file = e.target.files?.[0];
    if (!file || !clientId) return;
    try {
      setUploadingProfil(true);
      const compressed = await compressImage(file);
      const { file_url } = await base44.integrations.Core.UploadFile({ file: compressed });
      await base44.entities.Client.update(clientId, { photo_profil_url: file_url });
      qc.invalidateQueries({ queryKey: ['client-personnalisation', clientId] });
    } finally {
      setUploadingProfil(false);
    }
  };

  const handleUploadBandeau = async (e) => {
    const file = e.target.files?.[0];
    if (!file) return;
    try {
      setUploadingBandeau(true);
      const compressed = await compressImage(file);
      const { file_url } = await base44.integrations.Core.UploadFile({ file: compressed });
      await updateEvenement.mutateAsync({ photo_bandeau_url: file_url });
    } finally {
      setUploadingBandeau(false);
    }
  };

  const handleApplyTheme = async (newThemeId) => {
    setApplyingId(newThemeId);
    try {
      if (!programme?.id) {
        await base44.entities.ProgrammeJourJ.create({
          evenement_id: evenement.id,
          theme_id: newThemeId,
        });
        qc.invalidateQueries({ queryKey: ['invite-theme-programme', evenement.id] });
      } else {
        await updateTheme(newThemeId);
      }
    } finally {
      setApplyingId(null);
    }
  };

  const handlePreviewTheme = async (themeIdForPreview) => {
    let prog = programme;
    if (!prog?.id) {
      prog = await base44.entities.ProgrammeJourJ.create({
        evenement_id: evenement.id,
        theme_id: themeIdForPreview,
      });
      qc.invalidateQueries({ queryKey: ['invite-theme-programme', evenement.id] });
    }
    setPreviewProgramme(prog);
    setPreviewInitialThemeId(themeIdForPreview);
    setPreviewMode(true);
  };

  const handleSave = async () => {
    try {
      setSaving(true);
      await base44.entities.Evenement.update(evenement.id, { countdown_style: 'evenement' });
      qc.invalidateQueries({ queryKey: ['evenement-portal', evenement.id] });
      qc.invalidateQueries({ queryKey: ['evenement', evenement.id] });
      onClose();
    } finally {
      setSaving(false);
    }
  };

  const couleurActive = evenement?.couleur_theme || '#1e1b4b';

  return (
    <div className="space-y-5">
      {/* ── Indicateur de progression 3 étapes ── */}
      <PersonnalisationProgress
        step1Done={step1Done}
        step2Done={step2Done}
        step3Done={step3Done}
        variant="drawer"
      />

      {/* ── ÉTAPE 1 — Photo de profil ── */}
      <div className="space-y-2">
        <div>
          <p className="text-xs font-bold uppercase tracking-wide" style={{ color: '#1e1b4b' }}>1. Photo de profil</p>
        </div>
        <div className="flex items-center gap-4">
          <div className="shrink-0">
            {client?.photo_profil_url ? (
              <img src={client.photo_profil_url} alt="Photo" className="w-16 h-16 rounded-full object-cover" style={{ border: '2px solid #e8e4dc' }} />
            ) : (
              <div className="w-16 h-16 rounded-full flex items-center justify-center text-lg font-bold" style={{ background: '#c9a84c', color: '#1e1b4b' }}>
                {(clientNom || '?').charAt(0)}
              </div>
            )}
          </div>
          <input ref={profilInputRef} type="file" accept="image/*" className="hidden" onChange={handleUploadProfil} />
          <button
            onClick={() => profilInputRef.current?.click()}
            disabled={uploadingProfil}
            className="flex items-center gap-2 px-3 py-2 rounded-xl text-xs font-semibold border transition-all active:scale-[0.97] disabled:opacity-50"
            style={{ borderColor: '#e8e4dc', color: '#1e1b4b' }}
          >
            {uploadingProfil ? <Loader2 size={13} className="animate-spin" /> : <Camera size={13} />}
            {uploadingProfil ? 'Envoi…' : (client?.photo_profil_url ? 'Changer' : 'Ajouter')}
          </button>
        </div>
      </div>

      {/* ── ÉTAPE 2 — Ambiance de votre événement ── */}
      <div className="space-y-2">
        <div>
          <p className="text-xs font-bold uppercase tracking-wide" style={{ color: '#1e1b4b' }}>2. Photo ou couleur de votre espace</p>
        </div>
        <ApparenceCard
          evenement={evenement}
          couleurActive={couleurActive}
          onCouleur={(hex) => updateEvenement.mutate({ couleur_theme: hex })}
          onUploadBandeau={handleUploadBandeau}
          onSupprimerBandeau={() => updateEvenement.mutate({ photo_bandeau_url: '' })}
          onSauvegarderMode={(mode) => updateEvenement.mutate({ mode_bandeau: mode })}
          uploadingBandeau={uploadingBandeau}
          bandeauInputRef={bandeauInputRef}
        />
        <input ref={bandeauInputRef} type="file" accept="image/*" className="hidden" onChange={handleUploadBandeau} />
      </div>

      {/* ── ÉTAPE 3 — Thème de votre espace ── */}
      <div className="space-y-2">
        <div>
          <p className="text-xs font-bold uppercase tracking-wide" style={{ color: '#1e1b4b' }}>3. Thème de vos invitations et programme Jour J</p>
        </div>
        <ThemePickerGrid
          currentThemeId={themeId}
          themesDebloques={programme?.themes_debloques || []}
          applyingId={applyingId}
          onApply={handleApplyTheme}
          onPreview={handlePreviewTheme}
        />
      </div>

      {/* ── Bouton Enregistrer ── */}
      <div className="modal-footer-full">
        <button
          onClick={handleSave}
          disabled={saving}
          className="w-full py-3 rounded-2xl text-sm font-semibold text-white flex items-center justify-center gap-2 disabled:opacity-60"
          style={{ background: '#1e1b4b' }}
        >
          {saving ? <Loader2 size={16} className="animate-spin" /> : null}
          {saving ? 'Enregistrement…' : 'Enregistrer'}
        </button>
      </div>

      {/* ── Preview du thème (portal plein écran) ── */}
      {previewMode && previewProgramme && createPortal(
        <ProgrammePreview
          programme={previewProgramme}
          evenement={evenement}
          initialThemeId={previewInitialThemeId ?? themeId}
          onExit={() => {
            setPreviewMode(false);
            qc.invalidateQueries({ queryKey: ['invite-theme-programme', evenement.id] });
          }}
        />,
        document.body
      )}
    </div>
  );
}