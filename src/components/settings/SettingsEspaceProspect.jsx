import { useState, useEffect, useRef } from 'react';
import { useQuery, useQueryClient } from '@tanstack/react-query';
import { base44 } from '@/api/base44Client';
import { Button } from '@/components/ui/button';
import { toast } from 'sonner';
import { Check, Eye, Upload, X, ImageIcon } from 'lucide-react';
import TerminologieSection from '@/components/settings/TerminologieSection';
import TagInput from '@/components/settings/TagInput';
import { useOwnerCompanySettings } from '@/hooks/useOwnerCompanySettings';

// ─── Groupes de métiers ───────────────────────────────────────────────────────
const METIERS_GROUPES = [
  { groupe: 'Lieux et réception', metiers: ['Salle de réception','Lieu de prestige / Château','Domaine viticole / Château viticole','Domaine privé','Mas / Bastide','Villa privatisable','Espace plein air / Jardin','Salle de spectacle','Salon événementiel','Restaurant privatisable','Espace atypique','Péniche / Bateau','Rooftop',"Musée / Galerie d'art"] },
  { groupe: 'Restauration et traiteur', metiers: ['Traiteur événementiel','Chef à domicile','Pâtissier / Wedding cake','Candy bar / Sweet table','Food truck événementiel'] },
  { groupe: 'Image et souvenir', metiers: ['Photographe','Vidéaste','Photobooth'] },
  { groupe: 'Musique et animation', metiers: ['DJ','Musicien / Groupe','Animateur','Magicien / Artiste','Sonorisation / Éclairage'] },
  { groupe: 'Organisation', metiers: ['Wedding Planner','Chef de projet événementiel','Maître de cérémonie'] },
  { groupe: 'Décoration et floral', metiers: ['Fleuriste','Décorateur','Scénographe'] },
  { groupe: 'Beauté et bien-être', metiers: ['Coiffeur / Maquilleur','Spa événementiel'] },
  { groupe: 'Transport et prestige', metiers: ['Limousine / VTC prestige','Hélicoptère événementiel'] },
  { groupe: 'Logistique et technique', metiers: ['Location de matériel','Sécurité événementielle'] },
  { groupe: 'Autre', metiers: ['Autre prestataire'] },
];

// ─── Icônes par métier ────────────────────────────────────────────────────────
const ICONES_PAR_METIER = {
  'Salle de réception':                  ['🏛️','✨','🌟','🥂','🎊'],
  'Lieu de prestige / Château':          ['🏰','✨','🌟','🥂','🍾'],
  'Domaine viticole / Château viticole': ['🍇','🌿','🍾','🥂','✨'],
  'Domaine privé':                       ['🌿','🏡','✨','🌳','🍃'],
  'Mas / Bastide':                       ['🏡','🌿','☀️','🌸','✨'],
  'Villa privatisable':                  ['✨','🌟','🏡','🥂','🌊'],
  'Espace plein air / Jardin':           ['🌳','🌿','🌸','☀️','🍃'],
  'Salle de spectacle':                  ['🎭','✨','🌟','🎊','🎬'],
  'Salon événementiel':                  ['🌟','✨','🥂','🎊','🏛️'],
  'Restaurant privatisable':             ['🍽️','🥂','✨','🌟','🏊'],
  'Espace atypique':                     ['✨','🌟','🎨','🎭','🚀'],
  'Péniche / Bateau':                    ['🛥️','⛵','🌊','✨','🌅'],
  'Rooftop':                             ['🌇','✨','🥂','🌆','🌃'],
  "Musée / Galerie d'art":               ['🖼️','🏛️','🎨','✨','🌟'],
  'Traiteur événementiel':               ['🍽️','🔔','🥂','🍾','👨‍🍳'],
  'Chef à domicile':                     ['👨‍🍳','🍽️','🔪','🥗','✨'],
  'Pâtissier / Wedding cake':            ['🎂','🍰','🧁','🔔','✨'],
  'Candy bar / Sweet table':             ['🍭','🍬','🎂','✨','🌈'],
  'Food truck événementiel':             ['🚚','🍔','🌮','🍕','✨'],
  'Photographe':                         ['📷','📸','🎬','🎥','🖼️'],
  'Vidéaste':                            ['🎬','🎥','📹','📸','🎞️'],
  'Photobooth':                          ['📸','🤳','🎠','✨','🎭'],
  'DJ':                                  ['🎧','🎵','🎼','🎹','🎸'],
  'Musicien / Groupe':                   ['🎵','🎼','🎹','🎸','🎻'],
  'Animateur':                           ['🎤','🎊','🎭','✨','🎉'],
  'Magicien / Artiste':                  ['🎩','✨','🌟','🎭','🃏'],
  'Sonorisation / Éclairage':            ['💡','🔊','🎛️','✨','🌟'],
  'Wedding Planner':                     ['💍','💐','🤍','✨','🎊'],
  'Chef de projet événementiel':         ['📋','🎊','✨','🤝','🌟'],
  'Maître de cérémonie':                 ['🎙️','✨','🤍','🎊','💐'],
  'Fleuriste':                           ['🌸','🌺','🌿','🪷','💐'],
  'Décorateur':                          ['🎨','✨','🌿','🖼️','🌸'],
  'Scénographe':                         ['🎨','🖼️','✨','🎭','🌟'],
  'Coiffeur / Maquilleur':               ['💄','💅','✂️','✨','💋'],
  'Spa événementiel':                    ['💆','✨','🌿','🕯️','🌸'],
  'Limousine / VTC prestige':            ['🚗','🎩','⭐','✨','🌟'],
  'Hélicoptère événementiel':            ['🚁','✨','⭐','🌟','🎊'],
  'Location de matériel':                ['📦','🔧','💡','🛠️','✨'],
  'Sécurité événementielle':             ['🛡️','🔒','✅','💪','🌟'],
  'Autre prestataire':                   ['⭐','🎉','🎊','✨','💫','🌟','🎈','🎁','🏆','🤝','💼','🎯'],
};

// ─── Suggestions d'appellation par métier ────────────────────────────────────
// Suggestions standardisées — identiques pour tous les métiers
const SUGGESTIONS_APPELLATION_STANDARD = [
  'Formules & Devis',
  'Menus & Devis',
  'Prestations & Devis',
  'Forfaits & Devis',
  'Offres & Devis',
  'Espaces & Devis',
  'Services & Devis',
  'Disponibilités & Devis',
];

const SUGGESTIONS_APPELLATION = Object.fromEntries(
  [
    'Salle de réception','Lieu de prestige / Château','Domaine viticole / Château viticole',
    'Domaine privé','Mas / Bastide','Villa privatisable','Espace plein air / Jardin',
    'Salle de spectacle','Salon événementiel','Restaurant privatisable','Espace atypique',
    'Péniche / Bateau','Rooftop',"Musée / Galerie d'art",'Traiteur événementiel',
    'Chef à domicile','Pâtissier / Wedding cake','Candy bar / Sweet table',
    'Food truck événementiel','Photographe','Vidéaste','Photobooth','DJ',
    'Musicien / Groupe','Animateur','Magicien / Artiste','Sonorisation / Éclairage',
    'Wedding Planner','Chef de projet événementiel','Maître de cérémonie',
    'Fleuriste','Décorateur','Scénographe','Coiffeur / Maquilleur','Spa événementiel',
    'Limousine / VTC prestige','Hélicoptère événementiel','Location de matériel',
    'Sécurité événementielle','Autre prestataire',
  ].map(m => [m, SUGGESTIONS_APPELLATION_STANDARD])
);

const FALLBACK_APPELLATION = Object.fromEntries(
  Object.entries(SUGGESTIONS_APPELLATION).map(([k, v]) => [k, v[0] || 'Nos offres'])
);

export default function SettingsEspaceProspect({ onSaved, setIsDirty }) {
  const qc = useQueryClient();
  const { settings, isLoading } = useOwnerCompanySettings();

  const [form, setForm] = useState({
    annee_creation: '',
    accroche: '',
    appellation_commerciale: '',
    metier: '',
    icone_commerciale: '',
    company_cover_url: '',
    lien_avis_externe: '',
    tarif_a_partir_de: '',
    zone_intervention: '',
    delai_reponse: '',
    capacite_min: '',
    capacite_max: '',
    langues_parlees: [],
    style_tags: [],
    type_lieu: '',
    hebergement: false,
    nb_photos_livrees: '',
    delai_livraison: '',
    video_incluse: false,
    type_musique: '',
    materiel_inclus: [],
    style_floral: '',
    prestations_florales: [],
  });
  const [terminologie, setTerminologie] = useState({ mode: 'unique', terme_unique: 'Formule', termes: [] });
  const [restaurationIntegree, setRestaurationIntegree] = useState(false);
  const [saving, setSaving] = useState(false);
  const [coverModalOpen, setCoverModalOpen] = useState(false);
  const [coverTab, setCoverTab] = useState('galerie'); // 'galerie' | 'upload'
  const [pendingCover, setPendingCover] = useState('');
  const [uploading, setUploading] = useState(false);
  const [uploadedPreview, setUploadedPreview] = useState(null);
  const fileInputRef = useRef(null);

  // Galerie complète pour le modal (sans filtre visible_prospect)
  const { data: galeriePhotos = [] } = useQuery({
    queryKey: ['galerie-vitrine-all-photos'],
    queryFn: () => base44.entities.GalerieVitrine.list(),
    select: list => list.filter(m => m.type === 'photo').sort((a, b) => (a.ordre || 0) - (b.ordre || 0)),
    enabled: coverModalOpen,
  });

  useEffect(() => {
    if (settings) {
      setForm({
        annee_creation: settings.annee_creation ?? '',
        accroche: settings.accroche ?? '',
        appellation_commerciale: settings.appellation_commerciale ?? '',
        metier: settings.metier ?? '',
        icone_commerciale: settings.icone_commerciale ?? '',
        company_cover_url: settings.company_cover_url ?? '',
        lien_avis_externe: settings.lien_avis_externe ?? '',
        tarif_a_partir_de: settings.tarif_a_partir_de ?? '',
        zone_intervention: settings.zone_intervention ?? '',
        delai_reponse: settings.delai_reponse ?? '',
        capacite_min: settings.capacite_min ?? '',
        capacite_max: settings.capacite_max ?? '',
        langues_parlees: settings.langues_parlees ?? [],
        style_tags: settings.style_tags ?? [],
        type_lieu: settings.type_lieu ?? '',
        hebergement: settings.hebergement ?? false,
        nb_photos_livrees: settings.nb_photos_livrees ?? '',
        delai_livraison: settings.delai_livraison ?? '',
        video_incluse: settings.video_incluse ?? false,
        type_musique: settings.type_musique ?? '',
        materiel_inclus: settings.materiel_inclus ?? [],
        style_floral: settings.style_floral ?? '',
        prestations_florales: settings.prestations_florales ?? [],
      });
      if (settings.terminologie_offres) setTerminologie(settings.terminologie_offres);
      setRestaurationIntegree(settings.restauration_integree === true);
    }
  }, [settings]);

  const handleChange = (field, value) => {
    setForm(f => ({ ...f, [field]: value }));
    setIsDirty?.(true);
  };

  const handleSave = async () => {
    if (isLoading || !settings) {
      toast.info('Les données se chargent encore, veuillez patienter…');
      return;
    }
    setSaving(true);
    const payload = {
      annee_creation: form.annee_creation !== '' ? Number(form.annee_creation) : null,
      accroche: form.accroche || null,
      appellation_commerciale: form.appellation_commerciale || null,
      metier: form.metier || null,
      icone_commerciale: form.icone_commerciale || null,
      company_cover_url: form.company_cover_url || null,
      lien_avis_externe: form.lien_avis_externe || null,
      terminologie_offres: terminologie,
      restauration_integree: restaurationIntegree,
      tarif_a_partir_de: form.tarif_a_partir_de !== '' ? Number(form.tarif_a_partir_de) : null,
      zone_intervention: form.zone_intervention || null,
      delai_reponse: form.delai_reponse || null,
      capacite_min: form.capacite_min !== '' ? Number(form.capacite_min) : null,
      capacite_max: form.capacite_max !== '' ? Number(form.capacite_max) : null,
      langues_parlees: form.langues_parlees,
      style_tags: form.style_tags,
      type_lieu: form.type_lieu || null,
      hebergement: form.hebergement,
      nb_photos_livrees: form.nb_photos_livrees !== '' ? Number(form.nb_photos_livrees) : null,
      delai_livraison: form.delai_livraison || null,
      video_incluse: form.video_incluse,
      type_musique: form.type_musique || null,
      materiel_inclus: form.materiel_inclus,
      style_floral: form.style_floral || null,
      prestations_florales: form.prestations_florales,
    };
    try {
      if (settings?.id) {
        await base44.entities.CompanySettings.update(settings.id, payload);
      } else {
        await base44.entities.CompanySettings.create({ company_name: 'Mon entreprise', ...payload });
      }
      await qc.invalidateQueries(['company-settings']);
      setIsDirty?.(false);
      toast.success('Paramètres espace prospect sauvegardés');
      onSaved?.();
    } catch (err) {
      toast.error('Erreur lors de la sauvegarde : ' + (err?.message || 'Erreur inconnue'));
    } finally {
      setSaving(false);
    }
  };

  const openCoverModal = () => {
    setPendingCover(form.company_cover_url || '');
    setUploadedPreview(null);
    setCoverTab('galerie');
    setCoverModalOpen(true);
  };

  const confirmCover = () => {
    handleChange('company_cover_url', pendingCover);
    setCoverModalOpen(false);
  };

  const handleFileUpload = async (e) => {
    const file = e.target.files?.[0];
    if (!file) return;
    setUploading(true);
    const { file_url } = await base44.integrations.Core.UploadFile({ file });
    setUploadedPreview(file_url);
    setPendingCover(file_url);
    setUploading(false);
  };

  if (isLoading) {
    return <div className="flex items-center justify-center py-10"><div className="w-6 h-6 border-2 border-border border-t-primary rounded-full animate-spin" /></div>;
  }

  const anneeActuelle = new Date().getFullYear();
  const anneesExp = form.annee_creation ? anneeActuelle - Number(form.annee_creation) : null;
  const iconesDisponibles = form.metier ? (ICONES_PAR_METIER[form.metier] || ICONES_PAR_METIER['Autre prestataire'] || []) : [];
  const placeholderAppellation = FALLBACK_APPELLATION[form.metier] || 'Nos offres';

  return (
    <div className="space-y-6">

      {/* Bouton prévisualisation */}
      <button
        type="button"
        onClick={() => window.open('/prospect-preview', '_blank')}
        className="w-full flex items-center justify-center gap-2 py-2.5 px-4 rounded-xl border border-border bg-background text-sm font-medium text-foreground hover:bg-muted/50 transition-colors"
      >
        <Eye size={16} className="text-muted-foreground" />
        Prévisualiser mon espace prospect
      </button>

      {/* Métier */}
      <div className="space-y-2">
        <label className="text-sm font-semibold">Votre métier</label>
        <p className="text-xs text-muted-foreground">Permet d'adapter l'espace prospect à votre activité.</p>
        <select
          value={form.metier}
          onChange={e => { handleChange('metier', e.target.value); handleChange('icone_commerciale', ''); }}
          className="flex h-9 w-full rounded-xl border border-input bg-background px-3 text-sm focus-visible:outline-none focus-visible:ring-1 focus-visible:ring-ring"
        >
          <option value="">— Choisir un métier —</option>
          {METIERS_GROUPES.map(g => (
            <optgroup key={g.groupe} label={g.groupe}>
              {g.metiers.map(m => <option key={m} value={m}>{m}</option>)}
            </optgroup>
          ))}
        </select>
      </div>

      {/* Icône commerciale */}
      {iconesDisponibles.length > 0 && (
        <div className="space-y-2">
          <label className="text-sm font-semibold">Icône de votre espace</label>
          <p className="text-xs text-muted-foreground">Affichée sur la tuile principale de l'espace prospect.</p>
          <div className="flex flex-wrap gap-2">
            {iconesDisponibles.map(ic => (
              <button
                key={ic}
                type="button"
                onClick={() => handleChange('icone_commerciale', ic)}
                className={`w-11 h-11 rounded-xl text-2xl flex items-center justify-center border-2 transition-all ${
                  form.icone_commerciale === ic
                    ? 'border-primary bg-primary/5 scale-110'
                    : 'border-border bg-background hover:border-muted-foreground'
                }`}
              >
                {ic}
              </button>
            ))}
            {form.icone_commerciale && !iconesDisponibles.includes(form.icone_commerciale) && (
              <button
                type="button"
                onClick={() => handleChange('icone_commerciale', form.icone_commerciale)}
                className="w-11 h-11 rounded-xl text-2xl flex items-center justify-center border-2 border-primary bg-primary/5 scale-110"
              >
                {form.icone_commerciale}
              </button>
            )}
          </div>
          {form.icone_commerciale && (
            <p className="text-xs text-muted-foreground">
              Sélectionnée : <span className="text-lg">{form.icone_commerciale}</span>
              <button onClick={() => handleChange('icone_commerciale', '')} className="ml-2 text-destructive text-xs underline">Effacer</button>
            </p>
          )}
        </div>
      )}

      {/* Photo de couverture */}
      <div className="space-y-2">
        <label className="text-sm font-semibold">Photo de couverture</label>
        <p className="text-xs text-muted-foreground">Affichée en haut de la carte établissement dans l'espace prospect.</p>

        {/* Aperçu de la couverture actuelle */}
        {form.company_cover_url && (
          <div className="relative rounded-xl overflow-hidden border border-border" style={{ aspectRatio: '16/6' }}>
            <img src={form.company_cover_url} alt="Couverture actuelle" className="w-full h-full object-cover" />
            <button
              type="button"
              onClick={() => handleChange('company_cover_url', '')}
              className="absolute top-2 right-2 w-7 h-7 rounded-full bg-black/50 text-white flex items-center justify-center hover:bg-black/70 transition-colors"
            >
              <X size={13} />
            </button>
          </div>
        )}

        <button
          type="button"
          onClick={openCoverModal}
          className="w-full flex items-center justify-center gap-2 py-2.5 px-4 rounded-xl border border-dashed border-border bg-muted/30 text-sm font-medium text-muted-foreground hover:bg-muted/50 transition-colors"
        >
          <ImageIcon size={15} />
          {form.company_cover_url ? 'Changer la photo de couverture' : 'Choisir une photo de couverture'}
        </button>
      </div>

      {/* Modal sélecteur de couverture */}
      {coverModalOpen && (
        <>
          {/* Backdrop — z-[60] pour être au-dessus du contenu mais sous le panel */}
          <div
            className="fixed inset-0 z-[60] bg-black/50"
            onClick={() => setCoverModalOpen(false)}
          />

          {/* Panel — mobile: bottom sheet 70vh, desktop: modal centré */}
          <div
            className="fixed z-[70] bg-background shadow-2xl flex flex-col
              bottom-0 left-0 right-0
              md:bottom-auto md:left-1/2 md:top-1/2 md:-translate-x-1/2 md:-translate-y-1/2 md:w-full md:max-w-lg"
            style={{
              height: '70vh',
              borderRadius: '20px 20px 0 0',
            }}
          >
            {/* Header — fixe 56px */}
            <div
              className="flex items-center justify-between px-5 border-b border-border shrink-0"
              style={{ height: 56 }}
            >
              <h3 className="font-semibold text-base">Photo de couverture</h3>
              <button
                type="button"
                onClick={() => setCoverModalOpen(false)}
                className="w-8 h-8 flex items-center justify-center rounded-full hover:bg-muted transition-colors text-muted-foreground hover:text-foreground"
              >
                <X size={18} />
              </button>
            </div>

            {/* Onglets */}
            <div className="flex border-b border-border shrink-0">
              {[{ id: 'galerie', label: '🖼️ Depuis ma galerie' }, { id: 'upload', label: '⬆️ Uploader une photo' }].map(tab => (
                <button
                  key={tab.id}
                  type="button"
                  onClick={() => setCoverTab(tab.id)}
                  className={`flex-1 py-2.5 text-sm font-medium transition-colors border-b-2 ${
                    coverTab === tab.id ? 'border-primary text-primary' : 'border-transparent text-muted-foreground hover:text-foreground'
                  }`}
                >
                  {tab.label}
                </button>
              ))}
            </div>

            {/* Contenu scrollable — padding-bottom 100px pour ne pas être masqué par le footer */}
            <div className="flex-1 overflow-y-auto px-5 py-4" style={{ paddingBottom: 100 }}>
              {coverTab === 'galerie' && (
                <div>
                  {galeriePhotos.length === 0 ? (
                    <p className="text-sm text-muted-foreground italic text-center py-8">Aucune photo dans la galerie. Ajoutez des photos depuis l'onglet Galerie.</p>
                  ) : (
                    <div className="grid grid-cols-3 gap-2">
                      {/* Option aucune photo */}
                      <button
                        type="button"
                        onClick={() => setPendingCover('')}
                        className={`relative rounded-xl border-2 overflow-hidden flex flex-col items-center justify-center gap-1 p-2 transition-all ${
                          pendingCover === '' ? 'border-amber-400 bg-amber-50' : 'border-border bg-muted/30 hover:border-muted-foreground'
                        }`}
                        style={{ aspectRatio: '16/9' }}
                      >
                        <span className="text-lg">🚫</span>
                        <span className="text-[10px] font-medium text-muted-foreground text-center leading-tight">Aucune</span>
                        {pendingCover === '' && (
                          <div className="absolute top-1 right-1 w-4 h-4 rounded-full bg-amber-400 flex items-center justify-center">
                            <Check size={10} className="text-white" />
                          </div>
                        )}
                      </button>

                      {galeriePhotos.map(photo => (
                        <button
                          key={photo.id}
                          type="button"
                          onClick={() => setPendingCover(photo.url)}
                          className={`relative rounded-xl border-2 overflow-hidden transition-all ${
                            pendingCover === photo.url ? 'border-amber-400 ring-2 ring-amber-200' : 'border-border hover:border-muted-foreground'
                          }`}
                          style={{ aspectRatio: '16/9' }}
                        >
                          <img src={photo.url} alt={photo.titre || 'Photo'} className="w-full h-full object-cover" />
                          {pendingCover === photo.url && (
                            <div className="absolute top-1 right-1 w-4 h-4 rounded-full bg-amber-400 flex items-center justify-center">
                              <Check size={10} className="text-white" />
                            </div>
                          )}
                        </button>
                      ))}
                    </div>
                  )}
                </div>
              )}

              {coverTab === 'upload' && (
                <div className="space-y-4">
                  <input ref={fileInputRef} type="file" accept="image/*" className="hidden" onChange={handleFileUpload} />
                  <button
                    type="button"
                    onClick={() => fileInputRef.current?.click()}
                    disabled={uploading}
                    className="w-full flex flex-col items-center justify-center gap-3 py-8 rounded-xl border-2 border-dashed border-border bg-muted/30 hover:bg-muted/50 transition-colors disabled:opacity-50"
                  >
                    {uploading ? (
                      <div className="w-6 h-6 border-2 border-border border-t-primary rounded-full animate-spin" />
                    ) : (
                      <Upload size={24} className="text-muted-foreground" />
                    )}
                    <span className="text-sm text-muted-foreground font-medium">
                      {uploading ? 'Envoi en cours…' : 'Cliquer pour choisir une photo'}
                    </span>
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

            {/* Footer — position absolute, toujours visible, dépasse la barre Safari */}
            <div
              className="absolute bottom-0 left-0 right-0 bg-background border-t border-border flex gap-3 px-4"
              style={{ paddingTop: 16, paddingBottom: 'calc(80px + env(safe-area-inset-bottom, 0px))' }}
            >
              <Button variant="outline" type="button" onClick={() => setCoverModalOpen(false)} className="flex-1">Annuler</Button>
              <Button type="button" onClick={confirmCover} className="flex-1">Confirmer</Button>
            </div>
          </div>
        </>
      )}

      {/* Appellation commerciale */}
      <div className="space-y-2">
        <label className="text-sm font-semibold">Appellation commerciale des offres</label>
        <p className="text-xs text-muted-foreground">Remplace « Formules & Devis » dans l'espace prospect.</p>
        <input
          type="text"
          value={form.appellation_commerciale}
          onChange={e => handleChange('appellation_commerciale', e.target.value)}
          placeholder={`Ex : ${placeholderAppellation}`}
          maxLength={60}
          className="flex h-9 w-full rounded-xl border border-input bg-background px-3 text-sm focus-visible:outline-none focus-visible:ring-1 focus-visible:ring-ring"
        />
        {form.metier && SUGGESTIONS_APPELLATION[form.metier]?.length > 0 && (
          <div className="flex flex-wrap gap-1.5 pt-0.5">
            {SUGGESTIONS_APPELLATION[form.metier].map(s => (
              <button
                key={s}
                type="button"
                onClick={() => handleChange('appellation_commerciale', s)}
                className={`text-[11px] px-2.5 py-1 rounded-full border transition-all ${
                  form.appellation_commerciale === s
                    ? 'border-primary bg-primary/5 text-primary font-medium'
                    : 'border-border bg-background text-muted-foreground hover:border-muted-foreground'
                }`}
              >
                {s}
              </button>
            ))}
          </div>
        )}
        {!form.appellation_commerciale && form.metier && (
          <p className="text-[11px] text-muted-foreground">→ Fallback automatique : « {placeholderAppellation} »</p>
        )}
      </div>

      {/* Année de création */}
      <div className="space-y-2">
        <label className="text-sm font-semibold">Année de création de l'entreprise</label>
        <p className="text-xs text-muted-foreground">Permet de calculer automatiquement les années d'expérience affichées dans l'espace prospect.</p>
        <input
          type="number"
          min="1900"
          max={anneeActuelle}
          value={form.annee_creation}
          onChange={e => handleChange('annee_creation', e.target.value)}
          placeholder="Ex : 2010"
          className="flex h-9 w-full rounded-xl border border-input bg-background px-3 text-sm focus-visible:outline-none focus-visible:ring-1 focus-visible:ring-ring"
        />
        {anneesExp !== null && anneesExp > 0 && (
          <p className="text-xs text-emerald-600 font-medium">→ Affichera « {anneesExp} ans d'expérience »</p>
        )}
      </div>

      {/* Accroche */}
      <div className="space-y-2">
        <label className="text-sm font-semibold">Accroche / présentation courte</label>
        <p className="text-xs text-muted-foreground">Phrase courte visible dans l'espace prospect (sous le nom et le logo).</p>
        <input
          type="text"
          value={form.accroche}
          onChange={e => handleChange('accroche', e.target.value)}
          placeholder="Ex : Spécialiste du mariage en Provence depuis 2010"
          maxLength={120}
          className="flex h-9 w-full rounded-xl border border-input bg-background px-3 text-sm focus-visible:outline-none focus-visible:ring-1 focus-visible:ring-ring"
        />
        <p className="text-[11px] text-muted-foreground text-right">{(form.accroche || '').length}/120</p>
      </div>

      {/* Lien avis externe */}
      <div className="space-y-2">
        <label className="text-sm font-semibold">Lien vers vos avis clients</label>
        <p className="text-xs text-muted-foreground">URL Google, Mariages.net, TripAdvisor… Un bouton « Voir nos avis » apparaîtra dans l'espace prospect.</p>
        <input
          type="url"
          value={form.lien_avis_externe}
          onChange={e => handleChange('lien_avis_externe', e.target.value)}
          placeholder="https://g.page/r/..."
          className="flex h-9 w-full rounded-xl border border-input bg-background px-3 text-sm focus-visible:outline-none focus-visible:ring-1 focus-visible:ring-ring"
        />
      </div>

      {/* ─── SECTION 1 : Informations commerciales (tous métiers) ─── */}
      <div className="border-t border-border pt-4 space-y-4">
        <h3 className="text-sm font-semibold">💰 Informations commerciales</h3>

        {/* Tarif à partir de + Délai de réponse */}
        <div className="grid grid-cols-2 gap-3">
          <div className="space-y-1">
            <label className="text-xs font-medium text-muted-foreground">Tarif à partir de (€)</label>
            <input
              type="number"
              min="0"
              value={form.tarif_a_partir_de}
              onChange={e => handleChange('tarif_a_partir_de', e.target.value)}
              placeholder="Ex : 4500"
              className="flex h-9 w-full rounded-xl border border-input bg-background px-3 text-sm focus-visible:outline-none focus-visible:ring-1 focus-visible:ring-ring"
            />
          </div>
          <div className="space-y-1">
            <label className="text-xs font-medium text-muted-foreground">Délai de réponse</label>
            <input
              type="text"
              value={form.delai_reponse}
              onChange={e => handleChange('delai_reponse', e.target.value)}
              placeholder="Ex : sous 24h"
              className="flex h-9 w-full rounded-xl border border-input bg-background px-3 text-sm focus-visible:outline-none focus-visible:ring-1 focus-visible:ring-ring"
            />
          </div>
        </div>

        {/* Zone d'intervention */}
        <div className="space-y-1">
          <label className="text-xs font-medium text-muted-foreground">Zone d'intervention</label>
          <input
            type="text"
            value={form.zone_intervention}
            onChange={e => handleChange('zone_intervention', e.target.value)}
            placeholder="Ex : PACA, France entière…"
            className="flex h-9 w-full rounded-xl border border-input bg-background px-3 text-sm focus-visible:outline-none focus-visible:ring-1 focus-visible:ring-ring"
          />
        </div>

        {/* Capacité min / max */}
        <div className="grid grid-cols-2 gap-3">
          <div className="space-y-1">
            <label className="text-xs font-medium text-muted-foreground">Capacité min (invités)</label>
            <input
              type="number"
              min="0"
              value={form.capacite_min}
              onChange={e => handleChange('capacite_min', e.target.value)}
              placeholder="Ex : 50"
              className="flex h-9 w-full rounded-xl border border-input bg-background px-3 text-sm focus-visible:outline-none focus-visible:ring-1 focus-visible:ring-ring"
            />
          </div>
          <div className="space-y-1">
            <label className="text-xs font-medium text-muted-foreground">Capacité max (invités)</label>
            <input
              type="number"
              min="0"
              value={form.capacite_max}
              onChange={e => handleChange('capacite_max', e.target.value)}
              placeholder="Ex : 300"
              className="flex h-9 w-full rounded-xl border border-input bg-background px-3 text-sm focus-visible:outline-none focus-visible:ring-1 focus-visible:ring-ring"
            />
          </div>
        </div>

        {/* Langues parlées */}
        <div className="space-y-1">
          <label className="text-xs font-medium text-muted-foreground">Langues parlées</label>
          <TagInput
            value={form.langues_parlees}
            onChange={v => { handleChange('langues_parlees', v); }}
            placeholder="Ex : Français, Anglais…"
          />
        </div>

        {/* Style tags */}
        <div className="space-y-1">
          <label className="text-xs font-medium text-muted-foreground">Style / ambiances</label>
          <TagInput
            value={form.style_tags}
            onChange={v => { handleChange('style_tags', v); }}
            placeholder="Ex : Champêtre, Élégant, Moderne…"
          />
        </div>
      </div>

      {/* ─── SECTION 2 : Informations spécifiques (conditionnées par métier) ─── */}
      {form.metier && (() => {
        const LIEU_METIERS = [
          'Salle de réception', 'Lieu de prestige / Château', 'Domaine viticole / Château viticole',
          'Domaine privé', 'Mas / Bastide', 'Villa privatisable', 'Espace plein air / Jardin',
          'Salle de spectacle', 'Salon événementiel', 'Restaurant privatisable', 'Espace atypique',
          'Péniche / Bateau', 'Rooftop', "Musée / Galerie d'art",
        ];
        const TRAITEUR_METIERS = ['Traiteur événementiel', 'Chef à domicile', 'Pâtissier / Wedding cake', 'Candy bar / Sweet table', 'Food truck événementiel'];
        const PHOTO_METIERS = ['Photographe', 'Vidéaste'];
        const MUSIQUE_METIERS = ['DJ', 'Musicien / Groupe', 'Sonorisation / Éclairage'];
        const FLORAL_METIERS = ['Fleuriste', 'Décorateur', 'Scénographe'];

        const isLieuOuTraiteur = LIEU_METIERS.includes(form.metier) || TRAITEUR_METIERS.includes(form.metier);
        const isPhoto = PHOTO_METIERS.includes(form.metier);
        const isMusique = MUSIQUE_METIERS.includes(form.metier);
        const isFloral = FLORAL_METIERS.includes(form.metier);

        if (!isLieuOuTraiteur && !isPhoto && !isMusique && !isFloral) return null;

        const ToggleField = ({ checked, onChange, label }) => (
          <label className="flex items-center gap-3 cursor-pointer">
            <div
              onClick={() => onChange(!checked)}
              className="relative flex-shrink-0"
              style={{ width: 44, height: 24, borderRadius: 999, background: checked ? 'hsl(var(--primary))' : 'hsl(var(--muted))', cursor: 'pointer', transition: 'background 0.2s' }}
            >
              <span style={{ position: 'absolute', top: 3, left: checked ? 23 : 3, width: 18, height: 18, borderRadius: '50%', background: 'white', transition: 'left 0.2s', display: 'block' }} />
            </div>
            <span className="text-sm">{label}</span>
          </label>
        );

        return (
          <div className="border-t border-border pt-4 space-y-4">
            <h3 className="text-sm font-semibold">📋 Informations spécifiques</h3>

            {isLieuOuTraiteur && (
              <>
                <div className="space-y-1">
                  <label className="text-xs font-medium text-muted-foreground">Type de lieu</label>
                  <input
                    type="text"
                    value={form.type_lieu}
                    onChange={e => handleChange('type_lieu', e.target.value)}
                    placeholder="Ex : Domaine, Salle, Plein air…"
                    className="flex h-9 w-full rounded-xl border border-input bg-background px-3 text-sm focus-visible:outline-none focus-visible:ring-1 focus-visible:ring-ring"
                  />
                </div>
                <ToggleField checked={form.hebergement} onChange={v => { handleChange('hebergement', v); }} label="Hébergement disponible sur place" />
              </>
            )}

            {isPhoto && (
              <>
                <div className="grid grid-cols-2 gap-3">
                  <div className="space-y-1">
                    <label className="text-xs font-medium text-muted-foreground">Nombre de photos livrées</label>
                    <input
                      type="number"
                      min="0"
                      value={form.nb_photos_livrees}
                      onChange={e => handleChange('nb_photos_livrees', e.target.value)}
                      placeholder="Ex : 400"
                      className="flex h-9 w-full rounded-xl border border-input bg-background px-3 text-sm focus-visible:outline-none focus-visible:ring-1 focus-visible:ring-ring"
                    />
                  </div>
                  <div className="space-y-1">
                    <label className="text-xs font-medium text-muted-foreground">Délai de livraison</label>
                    <input
                      type="text"
                      value={form.delai_livraison}
                      onChange={e => handleChange('delai_livraison', e.target.value)}
                      placeholder="Ex : 4 semaines"
                      className="flex h-9 w-full rounded-xl border border-input bg-background px-3 text-sm focus-visible:outline-none focus-visible:ring-1 focus-visible:ring-ring"
                    />
                  </div>
                </div>
                <ToggleField checked={form.video_incluse} onChange={v => { handleChange('video_incluse', v); }} label="Vidéo incluse dans la prestation" />
              </>
            )}

            {isMusique && (
              <>
                <div className="space-y-1">
                  <label className="text-xs font-medium text-muted-foreground">Type de musique</label>
                  <input
                    type="text"
                    value={form.type_musique}
                    onChange={e => handleChange('type_musique', e.target.value)}
                    placeholder="Ex : Pop, Rock, Jazz, DJ…"
                    className="flex h-9 w-full rounded-xl border border-input bg-background px-3 text-sm focus-visible:outline-none focus-visible:ring-1 focus-visible:ring-ring"
                  />
                </div>
                <div className="space-y-1">
                  <label className="text-xs font-medium text-muted-foreground">Matériel inclus</label>
                  <TagInput
                    value={form.materiel_inclus}
                    onChange={v => { handleChange('materiel_inclus', v); }}
                    placeholder="Ex : Sono, Lumières, Photobooth…"
                  />
                </div>
              </>
            )}

            {isFloral && (
              <>
                <div className="space-y-1">
                  <label className="text-xs font-medium text-muted-foreground">Style floral</label>
                  <input
                    type="text"
                    value={form.style_floral}
                    onChange={e => handleChange('style_floral', e.target.value)}
                    placeholder="Ex : Champêtre, Bohème, Classique…"
                    className="flex h-9 w-full rounded-xl border border-input bg-background px-3 text-sm focus-visible:outline-none focus-visible:ring-1 focus-visible:ring-ring"
                  />
                </div>
                <div className="space-y-1">
                  <label className="text-xs font-medium text-muted-foreground">Prestations florales</label>
                  <TagInput
                    value={form.prestations_florales}
                    onChange={v => { handleChange('prestations_florales', v); }}
                    placeholder="Ex : Bouquet mariée, Déco salle, Cérémonie…"
                  />
                </div>
              </>
            )}
          </div>
        );
      })()}

      {/* Terminologie des offres commerciales */}
      <div className="border-t border-border pt-4 space-y-2">
        <label className="text-sm font-semibold">🏷️ Terminologie des offres commerciales</label>
        <p className="text-xs text-muted-foreground">Le ou les termes choisis remplacent « Formule » partout dans l'application.</p>
        <TerminologieSection value={terminologie} onChange={setTerminologie} />
      </div>

      {/* Restauration intégrée — visible uniquement pour les lieux non-Food */}
      {(() => {
        const FOOD_METIERS = ['Traiteur événementiel', 'Chef à domicile', 'Food truck événementiel', 'Pâtissier / Wedding cake', 'Candy bar / Sweet table'];
        const LIEU_METIERS = [
          'Salle de réception', 'Lieu de prestige / Château', 'Domaine viticole / Château viticole',
          'Domaine privé', 'Mas / Bastide', 'Villa privatisable', 'Espace plein air / Jardin',
          'Salle de spectacle', 'Salon événementiel', 'Restaurant privatisable', 'Espace atypique',
          'Péniche / Bateau', 'Rooftop', "Musée / Galerie d'art",
        ];
        const metier = form.metier;
        const isLieuNonFood = metier && LIEU_METIERS.includes(metier) && !FOOD_METIERS.includes(metier);
        if (!isLieuNonFood) return null;
        return (
          <div className="border-t border-border pt-4">
            <h3 className="text-sm font-semibold mb-1">🍽️ Restauration intégrée</h3>
            <p className="text-xs text-muted-foreground mb-3">
              Activez cette option si votre établissement propose une restauration intégrée (menus, repas, service traiteur maison). Cela active la gestion des allergènes dans vos événements.
            </p>
            <label className="flex items-center gap-3 cursor-pointer">
              <div
                onClick={() => setRestaurationIntegree(v => !v)}
                className="relative flex-shrink-0"
                style={{
                  width: 44, height: 24, borderRadius: 999,
                  background: restaurationIntegree ? 'hsl(var(--primary))' : 'hsl(var(--muted))',
                  cursor: 'pointer', transition: 'background 0.2s',
                }}
              >
                <span style={{
                  position: 'absolute', top: 3,
                  left: restaurationIntegree ? 23 : 3,
                  width: 18, height: 18, borderRadius: '50%',
                  background: 'white', transition: 'left 0.2s', display: 'block',
                }} />
              </div>
              <span className="text-sm">
                {restaurationIntegree ? 'Restauration intégrée activée' : 'Propose une restauration intégrée'}
              </span>
            </label>
          </div>
        );
      })()}

      <Button onClick={handleSave} disabled={saving || isLoading} className="w-full">
        {saving ? 'Sauvegarde…' : '💾 Sauvegarder'}
      </Button>
    </div>
  );
}