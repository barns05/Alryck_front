/**
 * IdentiteVisuelPage — Sous-page « Identité & Visuel » de Ma Vitrine.
 * Champs essentiels : nom, accroche, métier, icône, appellation, logo, cover.
 * Tiroirs : Informations légales + Options avancées.
 */
import { useState, useEffect, useRef } from 'react';
import { useQueryClient } from '@tanstack/react-query';
import { base44 } from '@/api/base44Client';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Upload, Save, ImageIcon, CheckCircle2, FileText, Settings } from 'lucide-react';
import { toast } from 'sonner';
import GoogleImportModal from '@/components/settings/GoogleImportModal';
import CoverModal from '@/components/ma-fiche/CoverModal';
import InfosLegalesDrawer from '@/components/ma-fiche/InfosLegalesDrawer';
import OptionsAvanceesDrawer from '@/components/ma-fiche/OptionsAvanceesDrawer';
import { getEmojisSuggestions, getGroupesMetiers, getMetiersByGroupe, getDomaineFromMetier } from '@/config/metierConfig';
import { useVitrineCompletion } from '@/hooks/useVitrineCompletion';
import CompletionBanner from '@/components/ma-fiche/CompletionBanner';

const SUGGESTIONS_APPELLATION = [
  'Formules & Devis','Menus & Devis','Prestations & Devis',
  'Forfaits & Devis','Offres & Devis','Espaces & Devis',
  'Services & Devis','Disponibilités & Devis',
];

function parseVilleFromAdresse(adresse) {
  if (!adresse) return '';
  const parts = adresse.split(',').map(s => s.trim()).filter(Boolean);
  if (parts.length >= 2) {
    return parts[parts.length - 1].replace(/^\d{5}\s*/, '').trim();
  }
  return '';
}

async function syncPrestataireFiche({ csId, userEmail, nom, logoUrl, coverUrl, accroche, metier }) {
  if (!userEmail) return;
  const freshCs = await base44.entities.CompanySettings.list('created_date', 1).then(r => r[0] || null);
  const emailNorm = userEmail.toLowerCase().trim();
  const domaine = getDomaineFromMetier(metier);
  const fiches = await base44.entities.Prestataire.filter({ portal_email: emailNorm });
  const ficheData = {
    nom: nom || '',
    portal_email: emailNorm,
    logo_url: logoUrl || '',
    cover_url: coverUrl || '',
    description: accroche || '',
    domaine,
    actif: true,
    telephone: freshCs?.telephone || '',
    email: freshCs?.email_contact || '',
    site_web: freshCs?.site_web || '',
    ville: parseVilleFromAdresse(freshCs?.adresse),
  };
  let prestataireId;
  if (fiches.length > 0) {
    await base44.entities.Prestataire.update(fiches[0].id, ficheData);
    prestataireId = fiches[0].id;
  } else {
    const created = await base44.entities.Prestataire.create(ficheData);
    prestataireId = created.id;
  }
  if (csId) {
    await base44.entities.CompanySettings.update(csId, { prestataire_id: prestataireId });
  }
}

export default function IdentiteVisuelPage({ cs, qc }) {
  const [currentUser, setCurrentUser] = useState(null);
  const lastCsId = useRef(null);

  const [nom, setNom] = useState('');
  const [logoUrl, setLogoUrl] = useState('');
  const [coverUrl, setCoverUrl] = useState('');
  const [accroche, setAccroche] = useState('');
  const [metier, setMetier] = useState('');
  const [iconeCommerciale, setIconeCommerciale] = useState('');
  const [appellationCommerciale, setAppellationCommerciale] = useState('');
  const [uploadingLogo, setUploadingLogo] = useState(false);
  const [saving, setSaving] = useState(false);
  const [showCoverModal, setShowCoverModal] = useState(false);
  const [showGoogleImport, setShowGoogleImport] = useState(false);
  const [showLegales, setShowLegales] = useState(false);
  const [showOptions, setShowOptions] = useState(false);
  const [importSuccess, setImportSuccess] = useState(false);
  const { sections } = useVitrineCompletion();

  useEffect(() => {
    base44.auth.me().then(setCurrentUser).catch(() => {});
  }, []);

  useEffect(() => {
    if (cs?.id && cs.id !== lastCsId.current) {
      setNom(cs.company_name || '');
      setLogoUrl(cs.company_logo_url || '');
      setCoverUrl(cs.company_cover_url || '');
      setAccroche(cs.accroche || '');
      setMetier(cs.metier || '');
      setIconeCommerciale(cs.icone_commerciale || '');
      setAppellationCommerciale(cs.appellation_commerciale || '');
      lastCsId.current = cs.id;
    }
  }, [cs]);

  const uploadFile = async (file) => {
    const { file_url } = await base44.integrations.Core.UploadFile({ file });
    return file_url;
  };

  const handleGoogleImport = (data) => {
    if (data.company_name) setNom(data.company_name);
    if (data.telephone) { /* sera sauvegardé via cs directement */ }
    if (data.social_networks?.length && cs?.id) {
      base44.entities.CompanySettings.update(cs.id, { social_networks: data.social_networks });
    }
    setImportSuccess(true);
    setTimeout(() => setImportSuccess(false), 6000);
  };

  const handleSave = async () => {
    if (!cs?.id) return;
    setSaving(true);
    await base44.entities.CompanySettings.update(cs.id, {
      company_name: nom,
      company_logo_url: logoUrl,
      company_cover_url: coverUrl,
      accroche,
      metier,
      icone_commerciale: iconeCommerciale,
      appellation_commerciale: appellationCommerciale,
    });
    qc.invalidateQueries(['company-settings']);
    qc.invalidateQueries(['company-settings-vitrine']);
    qc.invalidateQueries(['company-settings-vitrine-completion']);
    syncPrestataireFiche({
      csId: cs.id,
      userEmail: currentUser?.email,
      nom, logoUrl, coverUrl, accroche, metier,
    }).catch(() => {});
    setSaving(false);
    toast.success('Identité enregistrée');
  };

  const iconesDisponibles = metier ? getEmojisSuggestions(metier) : [];

  return (
    <div className="space-y-5">
      {sections?.identite && sections.identite.percentage < 100 && (
        <CompletionBanner section={sections.identite} />
      )}
      {/* Import Google */}
      <div className="flex items-center justify-between pb-1">
        <p className="text-sm text-muted-foreground">Remplissez votre fiche ou importez depuis Google</p>
        <Button variant="outline" size="sm" className="gap-2 shrink-0" onClick={() => setShowGoogleImport(true)}>
          <svg viewBox="0 0 24 24" className="w-4 h-4" fill="none">
            <path d="M22.56 12.25c0-.78-.07-1.53-.2-2.25H12v4.26h5.92c-.26 1.37-1.04 2.53-2.21 3.31v2.77h3.57c2.08-1.92 3.28-4.74 3.28-8.09z" fill="#4285F4"/>
            <path d="M12 23c2.97 0 5.46-.98 7.28-2.66l-3.57-2.77c-.98.66-2.23 1.06-3.71 1.06-2.86 0-5.29-1.93-6.16-4.53H2.18v2.84C3.99 20.53 7.7 23 12 23z" fill="#34A853"/>
            <path d="M5.84 14.09c-.22-.66-.35-1.36-.35-2.09s.13-1.43.35-2.09V7.07H2.18C1.43 8.55 1 10.22 1 12s.43 3.45 1.18 4.93l3.66-2.84z" fill="#FBBC05"/>
            <path d="M12 5.38c1.62 0 3.06.56 4.21 1.64l3.15-3.15C17.45 2.09 14.97 1 12 1 7.7 1 3.99 3.47 2.18 7.07l3.66 2.84c.87-2.6 3.3-4.53 6.16-4.53z" fill="#EA4335"/>
          </svg>
          Importer depuis Google
        </Button>
      </div>

      {importSuccess && (
        <div className="flex items-center gap-2 text-emerald-700 bg-emerald-50 border border-emerald-200 rounded-xl px-4 py-2.5 text-sm">
          <CheckCircle2 size={15} className="shrink-0" />
          Votre fiche a été importée depuis Google ✅ Vérifiez et complétez les informations manquantes.
        </div>
      )}

      {/* Aperçu couverture + logo */}
      <div className="relative rounded-xl overflow-hidden border border-border" style={{ height: 140 }}>
        {coverUrl
          ? <img src={coverUrl} alt="Couverture" className="w-full h-full object-cover" />
          : <div className="w-full h-full" style={{ background: 'linear-gradient(135deg,#1e1b4b,#3730a3)' }} />
        }
        <div className="absolute inset-0 flex items-end p-3 gap-3">
          {logoUrl
            ? <img src={logoUrl} alt="Logo" className="w-14 h-14 rounded-xl object-contain bg-white border-2 border-white shadow-lg" />
            : <div className="w-14 h-14 rounded-xl bg-white/20 border-2 border-white flex items-center justify-center text-white text-xl font-bold">{nom?.slice(0,2).toUpperCase() || '?'}</div>
          }
          <p className="text-white font-bold text-sm drop-shadow">{nom || 'Votre nom'}</p>
        </div>
        <button onClick={() => setShowCoverModal(true)}
          className="absolute top-2 right-2 bg-black/50 text-white text-xs font-medium px-2 py-1 rounded-lg flex items-center gap-1 hover:bg-black/70 transition-colors">
          <ImageIcon size={11} /> Photo de couverture
        </button>
      </div>

      {/* Logo */}
      <div className="space-y-1.5">
        <label className="text-sm font-medium">Logo</label>
        <div className="flex gap-2">
          <label className="cursor-pointer flex items-center gap-1.5 px-3 py-1.5 rounded-lg border border-border bg-muted/40 text-xs font-medium hover:bg-muted transition-colors shrink-0">
            <Upload size={12} /> {uploadingLogo ? '…' : 'Changer'}
            <input type="file" accept="image/*" className="hidden" onChange={async e => {
              const f = e.target.files[0]; if (!f) return;
              setUploadingLogo(true); setLogoUrl(await uploadFile(f)); setUploadingLogo(false);
            }} />
          </label>
          <Input value={logoUrl} onChange={e => setLogoUrl(e.target.value)} placeholder="URL du logo (optionnel)" className="text-xs flex-1" />
        </div>
      </div>

      {/* Nom */}
      <div className="space-y-1.5">
        <label className="text-sm font-medium">Nom de l'entreprise</label>
        <Input value={nom} onChange={e => setNom(e.target.value)} placeholder="Ex : L'alize" />
      </div>

      {/* Accroche */}
      <div className="space-y-1.5">
        <label className="text-sm font-medium">Accroche <span className="font-normal text-muted-foreground">(phrase courte visible sur votre vitrine)</span></label>
        <Input value={accroche} onChange={e => setAccroche(e.target.value)} placeholder="Ex : Spécialiste du mariage en Provence depuis 2010" maxLength={120} />
        <p className="text-[11px] text-muted-foreground text-right">{accroche.length}/120</p>
      </div>

      {/* Métier */}
      <div className="space-y-1.5">
        <label className="text-sm font-medium">Métier principal</label>
        <select value={metier} onChange={e => { setMetier(e.target.value); setIconeCommerciale(''); }}
          className="flex h-9 w-full rounded-md border border-input bg-transparent px-3 py-1 text-sm shadow-sm focus-visible:outline-none focus-visible:ring-1 focus-visible:ring-ring">
          <option value="">— Choisir —</option>
          {getGroupesMetiers().map(groupe => (
            <optgroup key={groupe} label={groupe}>
              {getMetiersByGroupe(groupe).map(m => <option key={m} value={m}>{m}</option>)}
            </optgroup>
          ))}
        </select>
      </div>

      {/* Icône commerciale */}
      {iconesDisponibles.length > 0 && (
        <div className="space-y-2">
          <label className="text-sm font-medium">Icône de vos offres</label>
          <div className="flex flex-wrap gap-2">
            {iconesDisponibles.map(ic => (
              <button key={ic} type="button" onClick={() => setIconeCommerciale(ic)}
                className={`w-11 h-11 rounded-xl text-2xl flex items-center justify-center border-2 transition-all ${iconeCommerciale === ic ? 'border-primary bg-primary/5 scale-110' : 'border-border bg-background hover:border-muted-foreground'}`}>
                {ic}
              </button>
            ))}
          </div>
          {iconeCommerciale && (
            <p className="text-xs text-muted-foreground">
              Sélectionnée : <span className="text-lg">{iconeCommerciale}</span>
              <button onClick={() => setIconeCommerciale('')} className="ml-2 text-destructive text-xs underline">Effacer</button>
            </p>
          )}
        </div>
      )}
      {iconesDisponibles.length === 0 && (
        <div className="space-y-1.5">
          <label className="text-sm font-medium">Icône commerciale <span className="font-normal text-muted-foreground">(emoji)</span></label>
          <Input value={iconeCommerciale} onChange={e => setIconeCommerciale(e.target.value)} placeholder="🍽️" className="w-24" />
        </div>
      )}

      {/* Appellation commerciale */}
      <div className="space-y-1.5">
        <label className="text-sm font-medium">Appellation des offres</label>
        <Input value={appellationCommerciale} onChange={e => setAppellationCommerciale(e.target.value)} placeholder="Nos formules" />
        <div className="flex flex-wrap gap-1.5">
          {SUGGESTIONS_APPELLATION.map(s => (
            <button key={s} type="button" onClick={() => setAppellationCommerciale(s)}
              className={`text-[11px] px-2.5 py-1 rounded-full border transition-all ${appellationCommerciale === s ? 'border-primary bg-primary/5 text-primary font-medium' : 'border-border bg-background text-muted-foreground hover:border-muted-foreground'}`}>
              {s}
            </button>
          ))}
        </div>
      </div>

      {/* Boutons tiroirs */}
      <div className="grid grid-cols-2 gap-3 pt-2">
        <button
          onClick={() => setShowLegales(true)}
          className="flex items-center gap-2 px-4 py-3 rounded-xl border border-border bg-card hover:bg-muted/50 transition-colors text-left"
        >
          <FileText size={16} className="text-muted-foreground shrink-0" />
          <div>
            <p className="text-sm font-medium">Informations légales</p>
            <p className="text-[11px] text-muted-foreground">SIRET, adresse siège</p>
          </div>
        </button>
        <button
          onClick={() => setShowOptions(true)}
          className="flex items-center gap-2 px-4 py-3 rounded-xl border border-border bg-card hover:bg-muted/50 transition-colors text-left"
        >
          <Settings size={16} className="text-muted-foreground shrink-0" />
          <div>
            <p className="text-sm font-medium">Options avancées</p>
            <p className="text-[11px] text-muted-foreground">Terminologie, relance, restauration</p>
          </div>
        </button>
      </div>

      <Button onClick={handleSave} disabled={saving || !cs?.id} className="w-full gap-2">
        <Save size={15} /> {saving ? 'Enregistrement…' : 'Enregistrer'}
      </Button>

      {showCoverModal && (
        <CoverModal
          currentUrl={coverUrl}
          onConfirm={(url) => { setCoverUrl(url); setShowCoverModal(false); }}
          onClose={() => setShowCoverModal(false)}
        />
      )}

      {showGoogleImport && (
        <GoogleImportModal onImport={handleGoogleImport} onClose={() => setShowGoogleImport(false)} />
      )}

      <InfosLegalesDrawer open={showLegales} onOpenChange={setShowLegales} cs={cs} qc={qc} />
      <OptionsAvanceesDrawer open={showOptions} onOpenChange={setShowOptions} cs={cs} qc={qc} />
    </div>
  );
}