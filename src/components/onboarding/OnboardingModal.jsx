import { useState, useRef } from 'react';
import { useQuery, useQueryClient } from '@tanstack/react-query';
import { base44 } from '@/api/base44Client';
import { ChevronRight, Upload, X } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { ALRYCK_CRISTAL_URL } from '@/lib/brandAssets';
import { useOwnerCompanySettings } from '@/hooks/useOwnerCompanySettings';

// ─── Liste complète des métiers groupés ───────────────────────────────────────
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

const TOTAL_STEPS = 3;

// Métiers "lieu" pour lesquels on pose la question de restauration intégrée
const LIEU_NON_FOOD_METIERS = [
  'Salle de réception', 'Lieu de prestige / Château', 'Domaine viticole / Château viticole',
  'Domaine privé', 'Mas / Bastide', 'Villa privatisable', 'Espace plein air / Jardin',
  'Salle de spectacle', 'Salon événementiel', 'Restaurant privatisable', 'Espace atypique',
  'Péniche / Bateau', 'Rooftop', "Musée / Galerie d'art",
];

// ─── Composant upload d'image ─────────────────────────────────────────────────
function ImageUpload({ label, value, onChange, round = false }) {
  const inputRef = useRef(null);
  const [uploading, setUploading] = useState(false);

  const handleFile = async (e) => {
    const file = e.target.files?.[0];
    if (!file) return;
    setUploading(true);
    const { file_url } = await base44.integrations.Core.UploadFile({ file });
    onChange(file_url);
    setUploading(false);
  };

  return (
    <div className="space-y-1.5">
      <label className="text-sm font-medium">{label}</label>
      <div
        onClick={() => inputRef.current?.click()}
        className={`cursor-pointer border-2 border-dashed border-border hover:border-primary/60 bg-muted/30 hover:bg-muted/50 transition-colors flex flex-col items-center justify-center gap-2 overflow-hidden
          ${round ? 'rounded-full w-24 h-24 mx-auto' : 'rounded-xl w-full h-28'}`}
      >
        {value ? (
          <img src={value} alt="Aperçu" className={`w-full h-full object-cover ${round ? 'rounded-full' : 'rounded-xl'}`} />
        ) : uploading ? (
          <div className="w-5 h-5 border-2 border-muted-foreground border-t-primary rounded-full animate-spin" />
        ) : (
          <>
            <Upload size={18} className="text-muted-foreground" />
            <span className="text-xs text-muted-foreground text-center px-3">Cliquer pour uploader</span>
          </>
        )}
      </div>
      {value && (
        <button
          type="button"
          onClick={() => onChange('')}
          className="flex items-center gap-1 text-xs text-muted-foreground hover:text-destructive transition-colors mx-auto"
        >
          <X size={11} /> Supprimer
        </button>
      )}
      <input ref={inputRef} type="file" accept="image/*" className="hidden" onChange={handleFile} />
    </div>
  );
}

// ─── Onboarding principal (Niveau 1 — gratuit) ─────────────────────────────────
export default function OnboardingModal({ user, onComplete, isPreview = false }) {
  const qc = useQueryClient();
  const [step, setStep] = useState(1);
  const [saving, setSaving] = useState(false);

  // Étape 1
  const [companyName, setCompanyName] = useState('');
  const [metier, setMetier] = useState('');
  const [telephone, setTelephone] = useState('');
  const [restaurationIntegree, setRestaurationIntegree] = useState(null); // null = non répondu

  // Étape 2
  const [logoUrl, setLogoUrl] = useState('');
  const [coverUrl, setCoverUrl] = useState('');
  const [accroche, setAccroche] = useState('');
  const [ville, setVille] = useState('');

  // Étape 3
  const [messagerieActive, setMessagerieActive] = useState(false);
  const [zoneIntervention, setZoneIntervention] = useState('');

  const { query } = useOwnerCompanySettings({ enabled: !isPreview });
  const companySettings = query.data ?? [];

  // ── Sauvegarde par étape ────────────────────────────────────────────────────
  const upsertSettings = async (payload) => {
    const existing = companySettings.find(cs => cs.is_owner === true) || (await base44.entities.CompanySettings.list()).find(cs => cs.is_owner === true);
    if (existing?.id) {
      await base44.entities.CompanySettings.update(existing.id, payload);
    } else {
      await base44.entities.CompanySettings.create(payload);
    }
    await qc.invalidateQueries(['company-settings']);
  };

  const handleNext = async () => {
    if (isPreview) { setStep(s => s + 1); return; }
    setSaving(true);
    if (step === 1) {
      const payload = { company_name: companyName, metier, telephone };
      if (LIEU_NON_FOOD_METIERS.includes(metier)) {
        payload.restauration_integree = restaurationIntegree === true;
      }
      await upsertSettings(payload);
    } else if (step === 2) {
      await upsertSettings({ company_logo_url: logoUrl, company_cover_url: coverUrl, accroche, ville });
    }
    setSaving(false);
    setStep(s => s + 1);
  };

  const handleFinish = async () => {
    if (isPreview) { onComplete?.(); return; }
    setSaving(true);
    await upsertSettings({ messagerie_active: messagerieActive, notes: zoneIntervention || undefined });
    await base44.auth.updateMe({ onboarding_completed: true });
    qc.invalidateQueries();
    setSaving(false);
    window.location.href = '/Dashboard';
  };

  const handleSkip = async () => {
    await base44.auth.updateMe({ onboarding_completed: true });
    onComplete?.();
  };

  const canProceed = step === 1 ? companyName.trim().length > 0 : true;

  // ── Rendu des étapes ────────────────────────────────────────────────────────
  const renderStep = () => {
    if (step === 1) return (
      <div className="space-y-5">
        <div className="text-center space-y-2 pb-2">
          <img
            src={ALRYCK_CRISTAL_URL}
            alt="Alryck"
            className="w-14 h-14 object-contain mx-auto"
          />
          <h2 className="text-xl font-bold">Bienvenue sur Alryck !</h2>
          <p className="text-sm text-muted-foreground">Configurez votre espace en 3 étapes — moins de 2 minutes.</p>
        </div>

        <div className="space-y-3">
          <div className="space-y-1.5">
            <label className="text-sm font-medium">Nom de votre entreprise <span className="text-destructive">*</span></label>
            <Input
              value={companyName}
              onChange={e => setCompanyName(e.target.value)}
              placeholder="Ex : Dupont Traiteur"
            />
          </div>

          <div className="space-y-1.5">
            <label className="text-sm font-medium">Votre métier</label>
            <select
              value={metier}
              onChange={e => setMetier(e.target.value)}
              className="flex h-9 w-full rounded-md border border-input bg-transparent px-3 text-sm focus-visible:outline-none focus-visible:ring-1 focus-visible:ring-ring"
            >
              <option value="">— Choisir votre métier —</option>
              {METIERS_GROUPES.map(g => (
                <optgroup key={g.groupe} label={g.groupe}>
                  {g.metiers.map(m => <option key={m} value={m}>{m}</option>)}
                </optgroup>
              ))}
            </select>
          </div>

          {/* Question restauration intégrée — lieux non-Food uniquement */}
          {LIEU_NON_FOOD_METIERS.includes(metier) && (
            <div className="space-y-2">
              <label className="text-sm font-medium">Proposez-vous une restauration intégrée ou des prestations alimentaires à vos clients ?</label>
              <div className="grid grid-cols-2 gap-2">
                <button
                  type="button"
                  onClick={() => setRestaurationIntegree(true)}
                  className={`py-2.5 rounded-xl border text-sm font-medium transition-colors ${
                    restaurationIntegree === true
                      ? 'bg-primary text-primary-foreground border-primary'
                      : 'border-input bg-muted/30 hover:bg-muted/60'
                  }`}
                >
                  ✅ Oui
                </button>
                <button
                  type="button"
                  onClick={() => setRestaurationIntegree(false)}
                  className={`py-2.5 rounded-xl border text-sm font-medium transition-colors ${
                    restaurationIntegree === false
                      ? 'bg-primary text-primary-foreground border-primary'
                      : 'border-input bg-muted/30 hover:bg-muted/60'
                  }`}
                >
                  ❌ Non
                </button>
              </div>
            </div>
          )}

          <div className="space-y-1.5">
            <label className="text-sm font-medium">Téléphone</label>
            <Input
              type="tel"
              value={telephone}
              onChange={e => setTelephone(e.target.value)}
              placeholder="Ex : 06 12 34 56 78"
            />
          </div>
        </div>
      </div>
    );

    if (step === 2) return (
      <div className="space-y-5">
        <div className="space-y-1">
          <h2 className="text-xl font-bold">Votre vitrine</h2>
          <p className="text-sm text-muted-foreground">Ces éléments s'affichent dans votre espace prospect.</p>
        </div>

        <div className="grid grid-cols-2 gap-4 items-start">
          <ImageUpload label="Logo" value={logoUrl} onChange={setLogoUrl} round />
          <ImageUpload label="Photo de couverture" value={coverUrl} onChange={setCoverUrl} />
        </div>

        <div className="space-y-1.5">
          <label className="text-sm font-medium">Accroche courte</label>
          <Input
            value={accroche}
            onChange={e => setAccroche(e.target.value)}
            placeholder="Ex : Excellence événementielle depuis 2007"
            maxLength={120}
          />
        </div>

        <div className="space-y-1.5">
          <label className="text-sm font-medium">Ville</label>
          <Input
            value={ville}
            onChange={e => setVille(e.target.value)}
            placeholder="Ex : Aix-en-Provence"
          />
        </div>
      </div>
    );

    if (step === 3) return (
      <div className="space-y-5">
        <div className="space-y-1">
          <h2 className="text-xl font-bold">Vos disponibilités</h2>
          <p className="text-sm text-muted-foreground">Quelques réglages pour votre espace partenaire.</p>
        </div>

        {/* Toggle messagerie */}
        <div
          onClick={() => setMessagerieActive(v => !v)}
          className="flex items-center justify-between p-4 rounded-xl border border-border bg-card cursor-pointer hover:bg-muted/30 transition-colors"
        >
          <div>
            <p className="font-medium text-sm">Messagerie interne</p>
            <p className="text-xs text-muted-foreground mt-0.5">Permettre aux clients de vous contacter directement</p>
          </div>
          <div className={`relative w-11 h-6 rounded-full transition-colors shrink-0 ${messagerieActive ? 'bg-emerald-500' : 'bg-slate-300'}`}>
            <span className={`absolute top-0.5 w-5 h-5 bg-white rounded-full shadow transition-transform ${messagerieActive ? 'translate-x-5' : 'translate-x-0.5'}`} />
          </div>
        </div>

        <div className="space-y-1.5">
          <label className="text-sm font-medium">Zone d'intervention</label>
          <Input
            value={zoneIntervention}
            onChange={e => setZoneIntervention(e.target.value)}
            placeholder="Ex : PACA et alentours, France entière…"
          />
        </div>

        <div className="bg-primary/5 border border-primary/20 rounded-xl p-3.5">
          <p className="text-sm font-semibold text-primary">🎉 C'est prêt !</p>
          <p className="text-xs text-muted-foreground mt-1">Cliquez sur "Découvrir Alryck" pour accéder à votre tableau de bord.</p>
        </div>
      </div>
    );
  };

  // ── Rendu principal ─────────────────────────────────────────────────────────
  return (
    <>
      {isPreview && (
        <div className="fixed top-0 left-0 right-0 z-40 bg-amber-50 border-b border-amber-200 px-4 py-3 flex items-center justify-between">
          <p className="text-sm text-amber-900 font-medium">🔍 Mode prévisualisation — vos données ne sont pas affectées</p>
          <button onClick={() => onComplete?.()} className="p-1 rounded hover:bg-amber-100 text-amber-700">
            <X size={18} />
          </button>
        </div>
      )}

      <div className={`fixed inset-0 z-50 bg-black/40 backdrop-blur-sm flex items-center justify-center p-4 ${isPreview ? 'mt-14' : ''}`}>
        <div className="bg-card rounded-2xl border border-border shadow-xl w-full max-w-md flex flex-col max-h-[92vh]">

          {/* Progress bar */}
          <div className="px-6 pt-5 pb-4 border-b border-border shrink-0">
            <div className="flex items-center gap-2">
              {[1, 2, 3].map(s => (
                <div key={s} className={`h-1.5 flex-1 rounded-full transition-colors ${s <= step ? 'bg-primary' : 'bg-muted'}`} />
              ))}
            </div>
            <p className="text-xs text-muted-foreground mt-2">Étape {step}/{TOTAL_STEPS}</p>
          </div>

          {/* Content scrollable */}
          <div className="flex-1 overflow-y-auto px-6 py-5">
            {renderStep()}
          </div>

          {/* Footer */}
          <div className="px-6 py-4 border-t border-border shrink-0 space-y-2">
            <div className="flex gap-3">
              {step > 1 && (
                <Button variant="outline" onClick={() => setStep(s => s - 1)} disabled={saving} className="flex-1">
                  Précédent
                </Button>
              )}
              {step < TOTAL_STEPS ? (
                <Button onClick={handleNext} disabled={saving || !canProceed} className="flex-1 gap-1.5">
                  {saving ? 'Sauvegarde…' : 'Suivant'}
                  <ChevronRight size={15} />
                </Button>
              ) : (
                <Button onClick={handleFinish} disabled={saving} className="flex-1">
                  {saving ? 'Finalisation…' : '🚀 Découvrir Alryck'}
                </Button>
              )}
            </div>

            {!isPreview && (
              <button
                onClick={handleSkip}
                className="w-full text-center text-xs text-muted-foreground hover:text-foreground transition-colors py-1"
              >
                Passer et configurer plus tard →
              </button>
            )}
          </div>
        </div>
      </div>
    </>
  );
}

// ─── Point d'entrée Niveau 2 (Onboarding Pro — à implémenter) ─────────────────
// export function triggerProOnboarding() {
//   // Déclenché depuis un module payant ou le bouton "Passer Pro" du Dashboard
//   // À implémenter : modal/page dédiée avec configuration avancée (terminologie,
//   // questionnaires, facturation, etc.)
// }