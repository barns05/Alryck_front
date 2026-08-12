import { useState, useEffect } from 'react';
import { useQueryClient, useQuery } from '@tanstack/react-query';
import { base44 } from '@/api/base44Client';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Save, Upload, CheckCircle2, Trash2 } from 'lucide-react';
import SettingsEmailTemplates from '@/components/settings/SettingsEmailTemplates';
import { useOwnerCompanySettings } from '@/hooks/useOwnerCompanySettings';

export default function SettingsFacturation({ onSaved }) {
  const qc = useQueryClient();
  const { settings } = useOwnerCompanySettings();
  const [saving, setSaving] = useState(false);

  const [moduleActif, setModuleActif] = useState(false);
  const [assujetti, setAssujetti] = useState(true);
  const [tva, setTva] = useState('');
  const [tvaMode, setTvaMode] = useState('HT');
  const [tvaTauxDefaut, setTvaTauxDefaut] = useState(10);
  const [conditionsPaiement, setConditionsPaiement] = useState('');
  const [mentionsLegales, setMentionsLegales] = useState('');
  const [iban, setIban] = useState('');
  const [bic, setBic] = useState('');
  const [nomBanque, setNomBanque] = useState('');
  const [ribUrl, setRibUrl] = useState('');
  const [ribMode, setRibMode] = useState('manuel');
  const [uploadingRib, setUploadingRib] = useState(false);
  const [emailSettings, setEmailSettings] = useState({ email_signature: '', email_templates: {} });
  const [savingEmail, setSavingEmail] = useState(false);
  const [autoValidationProspect, setAutoValidationProspect] = useState(false);

  useEffect(() => {
    if (settings) {
      setModuleActif(settings.modules_actifs?.facturation ?? false);
      setAssujetti(settings.assujetti_tva !== false); // true par défaut
      setTva(settings.tva_intracommunautaire || '');
      setTvaMode(settings.tva_mode || 'HT');
      setTvaTauxDefaut(settings.tva_taux_defaut ?? 10);
      setConditionsPaiement(settings.conditions_paiement_defaut || '');
      setMentionsLegales(settings.mentions_legales || '');
      setIban(settings.iban || '');
      setBic(settings.bic || '');
      setNomBanque(settings.nom_banque || '');
      setRibUrl(settings.rib_url || '');
      if (settings.rib_url) setRibMode('upload');
      setEmailSettings({
        email_signature: settings.email_signature || '',
        email_templates: settings.email_templates || {},
      });
      setAutoValidationProspect(settings.accepter_devis_auto_validation_prospect === true);
    }
  }, [settings]);

  const handleSaveEmail = async () => {
    if (!settings?.id) return;
    setSavingEmail(true);
    await base44.entities.CompanySettings.update(settings.id, {
      email_signature: emailSettings.email_signature,
      email_templates: emailSettings.email_templates,
    });
    qc.invalidateQueries(['company-settings']);
    setSavingEmail(false);
  };

  const handleToggle = async () => {
    if (!settings?.id) return;
    const newVal = !moduleActif;
    setModuleActif(newVal);
    await base44.entities.CompanySettings.update(settings.id, {
      modules_actifs: { ...(settings.modules_actifs || {}), facturation: newVal },
    });
    qc.invalidateQueries(['company-settings']);
  };

  const handleRibUpload = async (e) => {
    const file = e.target.files?.[0];
    if (!file) return;
    setUploadingRib(true);
    const { file_url } = await base44.integrations.Core.UploadFile({ file });
    setRibUrl(file_url);
    setUploadingRib(false);
  };

  const handleSave = async () => {
    if (!settings?.id) return;
    setSaving(true);
    await base44.entities.CompanySettings.update(settings.id, {
      assujetti_tva: assujetti,
      tva_intracommunautaire: tva,
      tva_mode: tvaMode,
      tva_taux_defaut: tvaTauxDefaut,
      conditions_paiement_defaut: conditionsPaiement,
      mentions_legales: mentionsLegales,
      iban,
      bic,
      nom_banque: nomBanque,
      rib_url: ribUrl,
      modules_actifs: { ...(settings?.modules_actifs || {}), facturation: moduleActif },
      accepter_devis_auto_validation_prospect: autoValidationProspect,
    });
    qc.invalidateQueries(['company-settings']);
    setSaving(false);
    onSaved?.();
  };

  return (
    <div className="bg-card rounded-2xl border border-border p-6 space-y-6">
      {/* Toggle module */}
      <div className="flex items-center justify-between">
        <div>
          <p className="font-semibold text-sm">Activer le module Facturation</p>
          <p className="text-xs text-muted-foreground mt-0.5">Dévis, factures, échéances et gestion financière</p>
        </div>
        <button
          onClick={handleToggle}
          className={`relative inline-flex h-6 w-11 items-center rounded-full transition-colors ${moduleActif ? 'bg-primary' : 'bg-muted'}`}
        >
          <span className={`inline-block h-4 w-4 transform rounded-full bg-white shadow transition-transform ${moduleActif ? 'translate-x-6' : 'translate-x-1'}`} />
        </button>
      </div>

      {/* Formulaire visible uniquement si module actif */}
      {moduleActif && (
        <div className="space-y-5 border-t border-border pt-5">
          {/* Assujettissement TVA */}
          <div className="space-y-3">
            <label className="text-sm font-medium block">Assujettissement à la TVA</label>
            <div className="flex gap-2">
              {[{ val: true, label: 'Oui — assujetti à la TVA' }, { val: false, label: 'Non — franchise TVA (art. 293 B CGI)' }].map(({ val, label }) => (
                <button
                  key={String(val)}
                  type="button"
                  onClick={() => setAssujetti(val)}
                  className={`flex-1 py-2.5 px-3 rounded-lg border text-sm font-medium transition-colors text-left ${
                    assujetti === val
                      ? val ? 'bg-primary text-primary-foreground border-primary' : 'bg-amber-500 text-white border-amber-500'
                      : 'border-input bg-background hover:bg-muted text-foreground'
                  }`}
                >
                  {val ? '✅' : '🔓'} {label}
                </button>
              ))}
            </div>
            {!assujetti && (
              <div className="flex items-start gap-2 bg-amber-50 border border-amber-200 rounded-xl px-3 py-2.5 text-sm text-amber-800">
                <span className="shrink-0">ℹ️</span>
                <span>En franchise TVA : les champs TVA seront masqués partout et la mention <strong>« TVA non applicable - art. 293 B du CGI »</strong> sera automatiquement ajoutée à vos documents.</span>
              </div>
            )}
          </div>

          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            {assujetti && (
              <div className="space-y-1.5 md:col-span-2">
                <label className="text-sm font-medium">N° TVA intracommunautaire</label>
                <Input value={tva} onChange={e => setTva(e.target.value)} placeholder="FR12 345 678 901" />
              </div>
            )}

            {/* Mode HT / TTC — visible seulement si assujetti */}
            {assujetti && (
              <div className="space-y-1.5">
                <label className="text-sm font-medium">Mode de saisie des prix</label>
                <div className="flex gap-2">
                  {['HT', 'TTC'].map(mode => (
                    <button
                      key={mode}
                      type="button"
                      onClick={() => setTvaMode(mode)}
                      className={`flex-1 py-2 rounded-lg border text-sm font-semibold transition-colors ${
                        tvaMode === mode
                          ? 'bg-primary text-primary-foreground border-primary'
                          : 'border-input bg-background hover:bg-muted'
                      }`}
                    >
                      {mode}
                    </button>
                  ))}
                </div>
                <p className="text-xs text-muted-foreground">
                  {tvaMode === 'HT' ? 'Les prix sont saisis hors taxes.' : 'Les prix sont saisis toutes taxes comprises.'}
                </p>
              </div>
            )}

            {/* Taux de TVA par défaut — visible seulement si assujetti */}
            {assujetti && (
              <div className="space-y-1.5">
                <label className="text-sm font-medium">Taux de TVA par défaut</label>
                <select
                  value={tvaTauxDefaut}
                  onChange={e => setTvaTauxDefaut(parseFloat(e.target.value))}
                  className="flex h-9 w-full rounded-md border border-input bg-transparent px-3 py-1 text-sm shadow-sm focus-visible:outline-none focus-visible:ring-1 focus-visible:ring-ring"
                >
                  <option value={0}>0 % (exonéré)</option>
                  <option value={5.5}>5,5 % (alimentaire de base)</option>
                  <option value={10}>10 % (restauration)</option>
                  <option value={20}>20 % (taux normal)</option>
                </select>
                <p className="text-xs text-muted-foreground">Pré-rempli sur chaque nouvelle ligne de devis.</p>
              </div>
            )}
          </div>

          {/* RIB & Coordonnées bancaires */}
          <div className="border-t border-border pt-4">
            <h3 className="text-sm font-semibold mb-1">💳 RIB & Coordonnées bancaires</h3>
            <p className="text-xs text-muted-foreground mb-4">Ces informations apparaissent en pied de page de vos documents de facturation.</p>
            <div className="flex gap-2 mb-4">
              <button
                onClick={() => setRibMode('manuel')}
                className={`px-3 py-1.5 rounded-lg text-sm font-medium transition-colors border ${ribMode === 'manuel' ? 'bg-primary text-primary-foreground border-primary' : 'border-input hover:bg-muted'}`}
              >
                ✏️ Saisir manuellement
              </button>
              <button
                onClick={() => setRibMode('upload')}
                className={`px-3 py-1.5 rounded-lg text-sm font-medium transition-colors border ${ribMode === 'upload' ? 'bg-primary text-primary-foreground border-primary' : 'border-input hover:bg-muted'}`}
              >
                📎 Uploader un RIB
              </button>
            </div>
            {ribMode === 'manuel' && (
              <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
                <div className="space-y-1.5">
                  <label className="text-sm font-medium">IBAN</label>
                  <Input value={iban} onChange={e => setIban(e.target.value)} placeholder="ex: FR76 3000 6000 0112 3456 7890 189" />
                </div>
                <div className="space-y-1.5">
                  <label className="text-sm font-medium">BIC</label>
                  <Input value={bic} onChange={e => setBic(e.target.value)} placeholder="ex: BNPAFRPP" />
                </div>
                <div className="space-y-1.5 md:col-span-2">
                  <label className="text-sm font-medium">Nom de la banque</label>
                  <Input value={nomBanque} onChange={e => setNomBanque(e.target.value)} placeholder="ex: BNP Paribas" />
                </div>
              </div>
            )}
            {ribMode === 'upload' && (
              <div className="space-y-3">
                <label className="cursor-pointer block">
                  <input type="file" accept="image/*,application/pdf" className="hidden" onChange={handleRibUpload} />
                  <div className="flex items-center gap-2 border-2 border-dashed border-input rounded-xl px-4 py-6 text-center hover:bg-muted/50 transition-colors cursor-pointer justify-center">
                    <Upload size={18} className="text-muted-foreground" />
                    <span className="text-sm text-muted-foreground">
                      {uploadingRib ? 'Chargement...' : 'Cliquer pour uploader une photo ou un PDF du RIB'}
                    </span>
                  </div>
                </label>
                {ribUrl && (
                  <div className="flex items-center gap-2 bg-emerald-50 border border-emerald-200 rounded-xl px-3 py-2 text-sm text-emerald-800">
                    <CheckCircle2 size={15} className="shrink-0 text-emerald-600" />
                    <a href={ribUrl} target="_blank" rel="noopener noreferrer" className="hover:underline truncate">RIB uploadé — cliquer pour voir</a>
                    <button onClick={() => setRibUrl('')} className="ml-auto text-emerald-600 hover:text-destructive transition-colors shrink-0">
                      <Trash2 size={14} />
                    </button>
                  </div>
                )}
              </div>
            )}
          </div>

          {/* Acceptation automatique du devis à la validation prospect */}
          <div className="border-t border-border pt-4 space-y-2">
            <div className="flex items-center justify-between gap-3">
              <div>
                <p className="text-sm font-medium">Accepter automatiquement le devis quand le prospect valide son projet</p>
                <p className="text-xs text-muted-foreground mt-0.5">Le statut du devis lié passe à « Accepté » dès que le prospect clique sur « Valider mon projet » depuis son espace.</p>
              </div>
              <button
                type="button"
                onClick={() => setAutoValidationProspect(v => !v)}
                className={`relative inline-flex h-6 w-11 items-center rounded-full transition-colors shrink-0 ${autoValidationProspect ? 'bg-primary' : 'bg-muted'}`}
              >
                <span className={`inline-block h-4 w-4 transform rounded-full bg-white shadow transition-transform ${autoValidationProspect ? 'translate-x-6' : 'translate-x-1'}`} />
              </button>
            </div>
            {!autoValidationProspect && (
              <p className="text-xs text-muted-foreground">Désactivé par défaut : l'acceptation reste modifiable manuellement côté admin. Idéal si vous gérez l'acceptation réelle via un contrat séparé signé après coup.</p>
            )}
          </div>

          <div className="space-y-1.5">
            <label className="text-sm font-medium">Conditions de paiement par défaut</label>
            <textarea
              value={conditionsPaiement}
              onChange={e => setConditionsPaiement(e.target.value)}
              rows={3}
              placeholder="Ex : Acompte de 30 % à la signature, solde 3 jours avant l'événement."
              className="flex w-full rounded-md border border-input bg-transparent px-3 py-2 text-sm shadow-sm resize-none focus-visible:outline-none focus-visible:ring-1 focus-visible:ring-ring"
            />
          </div>

          <div className="space-y-1.5">
            <label className="text-sm font-medium">Mentions légales personnalisées</label>
            <textarea
              value={mentionsLegales}
              onChange={e => setMentionsLegales(e.target.value)}
              rows={4}
              placeholder="Ex : TVA non applicable, article 293 B du CGI. Pénalités de retard : taux légal en vigueur…"
              className="flex w-full rounded-md border border-input bg-transparent px-3 py-2 text-sm shadow-sm resize-none focus-visible:outline-none focus-visible:ring-1 focus-visible:ring-ring"
            />
          </div>

          <div className="sticky bottom-20 z-10 bg-card border-t border-border pt-4">
            <Button onClick={handleSave} disabled={saving} className="gap-2">
              <Save size={15} /> {saving ? 'Enregistrement…' : 'Enregistrer'}
            </Button>
          </div>

          {/* Messages & signatures email */}
          <div className="border-t border-border pt-5">
            <h3 className="text-sm font-semibold mb-1">📧 Messages et signatures email</h3>
            <p className="text-xs text-muted-foreground mb-4">Configurez la signature email globale et les modèles de messages par type de document.</p>
            <SettingsEmailTemplates value={emailSettings} onChange={setEmailSettings} />
            <div className="pt-4">
              <Button onClick={handleSaveEmail} disabled={savingEmail} className="gap-2">
                <Save size={15} /> {savingEmail ? 'Enregistrement…' : 'Enregistrer les modèles'}
              </Button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}