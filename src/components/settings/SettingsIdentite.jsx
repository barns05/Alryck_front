import { useState, useEffect } from 'react';
import { useQueryClient, useQuery, useMutation } from '@tanstack/react-query';
import { base44 } from '@/api/base44Client';
import { Button } from '@/components/ui/button';
import { toast } from 'sonner';
import { Input } from '@/components/ui/input';
import { Upload, Save, Phone, Mail, Globe, MapPin, Hash, CheckCircle2, Trash2, Clock } from 'lucide-react';
import { AlertDialog, AlertDialogAction, AlertDialogCancel, AlertDialogContent, AlertDialogDescription, AlertDialogFooter, AlertDialogHeader, AlertDialogTitle } from '@/components/ui/alert-dialog';
import GoogleImportModal from '@/components/settings/GoogleImportModal';
import OnboardingModal from '@/components/onboarding/OnboardingModal';
import { useOwnerCompanySettings } from '@/hooks/useOwnerCompanySettings';

export default function SettingsIdentite({ onSaved }) {
  const qc = useQueryClient();
  const { settings } = useOwnerCompanySettings();
  const [companyName, setCompanyName] = useState('');
  const [logoUrl, setLogoUrl] = useState('');
  const [adresse, setAdresse] = useState('');
  const [telephone, setTelephone] = useState('');
  const [emailContact, setEmailContact] = useState('');
  const [siteWeb, setSiteWeb] = useState('');
  const [siret, setSiret] = useState('');
  const [ipAdresse, setIpAdresse] = useState('');
  const [ipGps, setIpGps] = useState('');
  const [ipHoraires, setIpHoraires] = useState('');
  const [ipContact, setIpContact] = useState('');
  const [ipNotes, setIpNotes] = useState('');
  const [uploading, setUploading] = useState(false);
  const [saving, setSaving] = useState(false);
  const [showGoogleImport, setShowGoogleImport] = useState(false);
  const [importSuccess, setImportSuccess] = useState(false);
  const [confirmClearDemo, setConfirmClearDemo] = useState(false);
  const [previewOnboarding, setPreviewOnboarding] = useState(false);

  const clearDemoMutation = useMutation({
    mutationFn: async () => {
      await base44.functions.invoke('clearDemoData', {});
    },
    onSuccess: () => {
      qc.invalidateQueries();
      setConfirmClearDemo(false);
    },
  });

  useEffect(() => {
    if (settings) {
      setCompanyName(settings.company_name || '');
      setLogoUrl(settings.company_logo_url || '');
      setAdresse(settings.adresse || '');
      setTelephone(settings.telephone || '');
      setEmailContact(settings.email_contact || '');
      setSiteWeb(settings.site_web || '');
      setSiret(settings.siret || '');
      setIpAdresse(settings.infos_pratiques_adresse || '');
      setIpGps(settings.infos_pratiques_gps || '');
      setIpHoraires(settings.infos_pratiques_horaires || '');
      setIpContact(settings.infos_pratiques_contact || '');
      setIpNotes(settings.infos_pratiques_notes || '');
    }
  }, [settings]);

  const handleLogoUpload = async (e) => {
    const file = e.target.files?.[0];
    if (!file) return;
    setUploading(true);
    const { file_url } = await base44.integrations.Core.UploadFile({ file });
    setLogoUrl(file_url);
    setUploading(false);
  };

  const handleGoogleImport = (data) => {
    if (data.company_name) setCompanyName(data.company_name);
    if (data.adresse) setAdresse(data.adresse);
    if (data.telephone) setTelephone(data.telephone);
    if (data.site_web) setSiteWeb(data.site_web);
    // Persist social networks if available
    if (data.social_networks?.length && settings?.id) {
      base44.entities.CompanySettings.update(settings.id, { social_networks: data.social_networks });
    }
    setImportSuccess(true);
    setTimeout(() => setImportSuccess(false), 6000);
  };

  const handleSave = async () => {
    if (!settings?.id) {
      toast.error('Configurez d\'abord votre identité dans Paramètres.');
      return;
    }
    setSaving(true);
    const data = {
      company_name: companyName,
      company_logo_url: logoUrl,
      adresse,
      telephone,
      email_contact: emailContact,
      site_web: siteWeb,
      siret,
      infos_pratiques_adresse: ipAdresse,
      infos_pratiques_gps: ipGps,
      infos_pratiques_horaires: ipHoraires,
      infos_pratiques_contact: ipContact,
      infos_pratiques_notes: ipNotes,
    };
    if (!settings?.id) {
      toast.error('Paramètres introuvables. Configurez d\'abord votre identité dans Paramètres.');
      setSaving(false);
      return;
    }
    await base44.entities.CompanySettings.update(settings.id, data);
    qc.invalidateQueries(['company-settings']);
    qc.invalidateQueries(['company-settings-vitrine']);
    setSaving(false);
    onSaved?.();
  };

  return (
    <div className="bg-card rounded-2xl border border-border p-6 space-y-4">

      {/* Bouton Google Import */}
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

      <div className="space-y-1.5">
        <label className="text-sm font-medium">Nom de l'entreprise</label>
        <Input value={companyName} onChange={e => setCompanyName(e.target.value)} placeholder="Ex : L'alize" />
      </div>

      <div className="space-y-1.5">
        <label className="text-sm font-medium">Logo</label>
        <div className="flex items-center gap-3">
          <label className="cursor-pointer">
            <input type="file" accept="image/*" className="hidden" onChange={handleLogoUpload} />
            <div className="flex items-center gap-2 border border-input rounded-lg px-3 py-2 text-sm hover:bg-muted/50 transition-colors">
              <Upload size={14} />
              {uploading ? 'Chargement...' : 'Choisir un fichier'}
            </div>
          </label>
          {logoUrl && <img src={logoUrl} alt="Logo" className="h-10 w-auto object-contain rounded border border-border" />}
        </div>
        {logoUrl && <Input value={logoUrl} onChange={e => setLogoUrl(e.target.value)} placeholder="URL du logo" className="text-xs" />}
      </div>

      <div className="space-y-1.5">
        <label className="text-sm font-medium flex items-center gap-1.5"><MapPin size={13} className="text-muted-foreground" /> Adresse du siège</label>
        <Input value={adresse} onChange={e => setAdresse(e.target.value)} placeholder="Ex : 12 rue des Fleurs, 75001 Paris" />
      </div>

      <div className="grid grid-cols-2 gap-3">
        <div className="space-y-1.5">
          <label className="text-sm font-medium flex items-center gap-1.5"><Phone size={13} className="text-muted-foreground" /> Téléphone de l'entreprise</label>
          <Input value={telephone} onChange={e => setTelephone(e.target.value)} placeholder="06 00 00 00 00" />
        </div>
        <div className="space-y-1.5">
          <label className="text-sm font-medium flex items-center gap-1.5"><Mail size={13} className="text-muted-foreground" /> Email</label>
          <Input value={emailContact} onChange={e => setEmailContact(e.target.value)} placeholder="contact@..." type="email" />
        </div>
      </div>

      <div className="grid grid-cols-2 gap-3">
        <div className="space-y-1.5">
          <label className="text-sm font-medium flex items-center gap-1.5"><Globe size={13} className="text-muted-foreground" /> Site web</label>
          <Input value={siteWeb} onChange={e => setSiteWeb(e.target.value)} placeholder="https://..." />
        </div>
        <div className="space-y-1.5">
          <label className="text-sm font-medium flex items-center gap-1.5"><Hash size={13} className="text-muted-foreground" /> SIRET</label>
          <Input value={siret} onChange={e => setSiret(e.target.value)} placeholder="123 456 789 00010" />
        </div>
      </div>

      {/* Informations pratiques */}
      <div className="border-t border-border pt-4 mt-4 space-y-3">
        <h3 className="text-sm font-semibold mb-1">ℹ️ Informations pratiques</h3>
        <p className="text-xs text-muted-foreground mb-3">
          Ces informations sont affichées à vos clients (espace client) et sur la fiche événement (popover prestataires) pour faciliter la coordination le jour J. Tous les champs sont optionnels.
        </p>
        <div className="space-y-3">
          <div className="space-y-1.5">
            <label className="text-sm font-medium flex items-center gap-1.5"><MapPin size={13} className="text-muted-foreground" /> Adresse / lieu d'intervention</label>
            <Input value={ipAdresse} onChange={e => setIpAdresse(e.target.value)} placeholder="Ex : Domaine de la Rose, accès par le portail nord" />
          </div>
          <div className="space-y-1.5">
            <label className="text-sm font-medium flex items-center gap-1.5"><Globe size={13} className="text-muted-foreground" /> Lien GPS / coordonnées</label>
            <Input value={ipGps} onChange={e => setIpGps(e.target.value)} placeholder="https://maps.google.com/… ou 48.8566,2.3522" />
          </div>
          <div className="space-y-1.5">
            <label className="text-sm font-medium flex items-center gap-1.5"><Clock size={13} className="text-muted-foreground" /> Horaires d'installation / intervention</label>
            <Input value={ipHoraires} onChange={e => setIpHoraires(e.target.value)} placeholder="Ex : Installation 14h, prestation 18h–02h" />
          </div>
          <div className="space-y-1.5">
            <label className="text-sm font-medium flex items-center gap-1.5"><Phone size={13} className="text-muted-foreground" /> Contact opérationnel jour J</label>
            <p className="text-[11px] text-muted-foreground -mt-1">Peut différer du téléphone de l'entreprise (ex : chef d'équipe sur place)</p>
            <Input value={ipContact} onChange={e => setIpContact(e.target.value)} placeholder="Ex : 06 12 34 56 78 (chef d'équipe)" />
          </div>
          <div className="space-y-1.5">
            <label className="text-sm font-medium">Notes libres (accès, parking, code porte…)</label>
            <textarea
              value={ipNotes}
              onChange={e => setIpNotes(e.target.value)}
              placeholder="Ex : Stationner sur le parking B, code porte 1234, repérage la veille à 16h…"
              rows={3}
              className="w-full rounded-lg border border-input bg-background px-3 py-2 text-sm focus:outline-none focus:ring-1 focus:ring-ring resize-none"
            />
          </div>
        </div>
      </div>

      <div className="sticky bottom-20 z-10 bg-card border-t border-border pt-4 mt-4 flex gap-3 flex-wrap">
        <Button onClick={handleSave} disabled={saving || !companyName || !settings?.id} className="flex-1 gap-2 min-w-fit">
          <Save size={15} /> {saving ? 'Enregistrement...' : 'Enregistrer'}
        </Button>
        <Button
          onClick={() => setConfirmClearDemo(true)}
          variant="outline"
          className="gap-2"
          title="Réinitialiser uniquement les données de démonstration"
        >
          <Trash2 size={15} /> Réinitialiser démo
        </Button>
      </div>



      {showGoogleImport && (
        <GoogleImportModal onImport={handleGoogleImport} onClose={() => setShowGoogleImport(false)} />
      )}

      {previewOnboarding && (
        <OnboardingModal
          user={{ role: 'admin', full_name: 'Aperçu' }}
          onComplete={() => setPreviewOnboarding(false)}
          isPreview={true}
        />
      )}

      <AlertDialog open={confirmClearDemo} onOpenChange={setConfirmClearDemo}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Réinitialiser les données de démo ?</AlertDialogTitle>
            <AlertDialogDescription>
              Cette action supprimera toutes les données de démonstration (prospects, événements, clients…). Votre configuration personnelle sera conservée. Cette action est irréversible.
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel>Annuler</AlertDialogCancel>
            <AlertDialogAction
              onClick={() => clearDemoMutation.mutate()}
              className="bg-destructive text-destructive-foreground hover:bg-destructive/90"
              disabled={clearDemoMutation.isPending}
            >
              {clearDemoMutation.isPending ? 'Suppression...' : 'Réinitialiser'}
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </div>
  );
}