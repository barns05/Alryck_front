/**
 * TrameContratModal — chemin 3 : « Je n'ai pas de contrat »
 *
 * Orchestrateur du questionnaire guidé (6 étapes). Garde tout le state,
 * la logique de sauvegarde, la navigation entre étapes, et le bandeau d'avertissement.
 * Le rendu de chaque étape est délégué aux composants de trame-steps/.
 */
import { useState, useMemo, useEffect } from 'react';
import { useQuery, useQueryClient } from '@tanstack/react-query';
import { base44 } from '@/api/base44Client';
import { X, AlertTriangle, Loader2, Check, ChevronRight } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { toast } from 'sonner';
import { getClaudesPourMetier, getCategorieMetier } from './clausesLibrary';
import { generateContratPDF } from './generateContratPDF';
import TrameStepQualification from './trame-steps/TrameStepQualification';
import TrameStepPrestataire from './trame-steps/TrameStepPrestataire';
import TrameStepPrestation from './trame-steps/TrameStepPrestation';
import TrameStepAnnulation from './trame-steps/TrameStepAnnulation';
import TrameStepSpecifique from './trame-steps/TrameStepSpecifique';
import TrameStepVerification from './trame-steps/TrameStepVerification';

const STEPS_BASE = [
  { id: 1, label: 'Qualification' },
  { id: 2, label: 'Prestataire' },
  { id: 3, label: 'Prestation' },
  { id: 4, label: 'Annulation' },
  { id: 5, label: 'Spécifique' },
  { id: 6, label: 'Vérification' },
];

export default function TrameContratModal({ onClose }) {
  const qc = useQueryClient();
  const [step, setStep] = useState(1);
  const [saving, setSaving] = useState(false);

  const { data: company } = useQuery({
    queryKey: ['company-settings-owner'],
    queryFn: () => base44.entities.CompanySettings.list().then(r => r.find(cs => cs.is_owner === true) || null),
    staleTime: 60000,
  });

  const [fields, setFields] = useState({
    NOM_MODELE: '',
    TYPE_EVENEMENT: [],
    // ─── Qualification juridique (étape 1) ───
    TYPE_CLIENT: 'particulier',
    MODE_VERSEMENT: 'arrhes',
    MODE_TARIFICATION: 'pourcentage',
    ECHEANCIER: [],
    DROIT_IMAGE_AUTORISE: false,
    DATE_DETERMINEE: true,
    DUREE_DROIT_IMAGE: '5',
    // ─── Prestataire (pré-rempli, étape 2) ───
    NOM_ENTREPRISE: '',
    FORME_JURIDIQUE: '',
    SIRET: '',
    ADRESSE_ENTREPRISE: '',
    ADRESSE_VILLE: '',
    EMAIL_ENTREPRISE: '',
    TELEPHONE_ENTREPRISE: '',
    NOM_ASSUREUR: '',
    NUMERO_POLICE: '',
    REFERENT_PRESTATAIRE: '',
    TELEPHONE_REFERENT_PRESTATAIRE: '',
    NOM_MEDIATEUR: '',
    ADRESSE_MEDIATEUR: '',
    SITE_MEDIATEUR: '',
    // ─── Prestation (étape 3 — allégée) ───
    DESCRIPTION_PRESTATION: '',
    DATE_EVENEMENT: '',
    LIEU_EVENEMENT: '',
    NB_PERSONNES: '',
    MONTANT_HT: '',
    TAUX_TVA: '10',
    POURCENTAGE_ACOMPTE: '30',
    BASE_CALCUL_ACOMPTE: 'TTC',
    // ─── Annulation (étape 4) ───
    PALIERS_ANNULATION: [
      { delai_jours: 90, pourcentage_retenu: 0 },
      { delai_jours: 30, pourcentage_retenu: 50 },
      { delai_jours: 0, pourcentage_retenu: 100 },
    ],
    LIEU_SIGNATURE: '',
    DATE: new Date().toLocaleDateString('fr-FR'),
    // ─── B1 : Lieux / Traiteurs (champs conservés) ───
    DELAI_VALIDATION_MENU: '15',
    DELAI_RESTITUTION_CAUTION: '15',
    MOBILIER_FOURNI: '',
    CAPACITE_MAX_ERP: '',
    CAPACITE_MAX_ASSIS: '',
    CAPACITE_MAX_DEBOUT: '',
    // ─── B1 : Options avancées ───
    BESOIN_ELECTRICITE: '',
    BESOIN_ESPACE: '',
    CONDITIONS_ACCES: '',
    MATERIEL_PRETE_DETAIL: '',
    DEPOT_GARANTIE_MATERIEL: '',
    // ─── B2 : Image / Son / Déco / Location (champs conservés) ───
    CESSION_DROITS_DETAIL: '',
    USAGE_CEDE: '',
    DUREE_CONSERVATION_FICHIERS: '12',
    NOMBRE_RETOUCHES_INCLUSES: '10',
    DETAILS_REPAS_PRESTATAIRE: '',
    // ─── B3 : Beauté / Sécurité / Transport (champs conservés) ───
    CONDITIONS_SPECIFIQUES_METIER: '',
    DETAILS_SECURITE: '',
    NUMERO_CNAPS: '',
    EFFECTIF_AGENTS: '',
    PERIMETRE_MISSION_SECURITE: '',
    TEMPS_ATTENTE_INCLUS: '15',
    DELAI_TOLERANCE_RETARD: '30',
    HABILITATION_SPECIFIQUE: '',
  });

  useEffect(() => {
    if (company) {
      setFields(prev => ({
        ...prev,
        NOM_ENTREPRISE: company.company_name || '',
        SIRET: company.siret || '',
        ADRESSE_ENTREPRISE: company.adresse || '',
        ADRESSE_VILLE: [company.adresse_code_postal, company.adresse_ville].filter(Boolean).join(' '),
        EMAIL_ENTREPRISE: company.email_contact || '',
        TELEPHONE_ENTREPRISE: company.telephone || '',
        REFERENT_PRESTATAIRE: company.company_name || '',
        TELEPHONE_REFERENT_PRESTATAIRE: company.telephone || '',
        LIEU_SIGNATURE: company.adresse_ville || '',
      }));
    }
  }, [company]);

  const setField = (key, value) => setFields(prev => ({ ...prev, [key]: value }));

  const addEcheance = () => setFields(prev => ({
    ...prev,
    ECHEANCIER: [...(prev.ECHEANCIER || []), { libelle: '', montant: '', delai: '' }],
  }));
  const removeEcheance = (i) => setFields(prev => ({
    ...prev,
    ECHEANCIER: (prev.ECHEANCIER || []).filter((_, idx) => idx !== i),
  }));
  const updateEcheance = (i, field, value) => setFields(prev => ({
    ...prev,
    ECHEANCIER: (prev.ECHEANCIER || []).map((ech, idx) => idx === i ? { ...ech, [field]: value } : ech),
  }));

  const addPalier = () => setFields(prev => ({
    ...prev,
    PALIERS_ANNULATION: [...(prev.PALIERS_ANNULATION || []), { delai_jours: 60, pourcentage_retenu: 25 }],
  }));
  const removePalier = (i) => setFields(prev => ({
    ...prev,
    PALIERS_ANNULATION: (prev.PALIERS_ANNULATION || []).filter((_, idx) => idx !== i),
  }));
  const updatePalier = (i, field, value) => setFields(prev => ({
    ...prev,
    PALIERS_ANNULATION: (prev.PALIERS_ANNULATION || []).map((pal, idx) => idx === i ? { ...pal, [field]: value } : pal),
  }));

  const categorie = useMemo(() => getCategorieMetier(company?.metier), [company?.metier]);

  const answers = useMemo(() => ({
    type_client: fields.TYPE_CLIENT,
    mode_versement: fields.MODE_VERSEMENT,
    mode_paiement: fields.MODE_TARIFICATION,
    base_calcul_acompte: fields.BASE_CALCUL_ACOMPTE,
    echeancier: fields.ECHEANCIER,
    paliers_annulation: fields.PALIERS_ANNULATION,
    droit_image_autorise: fields.DROIT_IMAGE_AUTORISE,
    date_determinee: fields.DATE_DETERMINEE,
  }), [fields.TYPE_CLIENT, fields.MODE_VERSEMENT, fields.MODE_TARIFICATION, fields.BASE_CALCUL_ACOMPTE, fields.ECHEANCIER, fields.PALIERS_ANNULATION, fields.DROIT_IMAGE_AUTORISE, fields.DATE_DETERMINEE]);

  const { blocA, blocB, categorieLabel } = useMemo(
    () => getClaudesPourMetier(company?.metier, answers),
    [company?.metier, answers]
  );

  const steps = categorie ? STEPS_BASE : STEPS_BASE.filter(s => s.id !== 5);
  const showStep5 = !!categorie;
  const allClauses = useMemo(() => [...blocA, ...blocB], [blocA, blocB]);

  const canNext = () => {
    if (step === 1) return fields.NOM_MODELE.trim() && fields.TYPE_CLIENT;
    return true;
  };

  const handleGenerateAndSave = async () => {
    setSaving(true);
    try {
      // ─── Calculer les montants ──────────────────────────────────────────────
      const ht = parseFloat(fields.MONTANT_HT) || 0;
      const tvaRate = parseFloat(fields.TAUX_TVA) || 0;
      const tva = ht * tvaRate / 100;
      const ttc = ht + tva;
      const pct = parseFloat(fields.POURCENTAGE_ACOMPTE) || 0;
      const baseAcompte = fields.BASE_CALCUL_ACOMPTE === 'HT' ? ht : ttc;
      const finalFields = { ...fields };
      finalFields.MONTANT_TVA = tva.toFixed(2);
      finalFields.MONTANT_TTC = ttc.toFixed(2);
      finalFields.MONTANT_ACOMPTE = (baseAcompte * pct / 100).toFixed(2);
      finalFields.MONTANT_SOLDE = (ttc - baseAcompte * pct / 100).toFixed(2);

      // ─── Construire l'objet de substitution (valeurs non vides uniquement) ─
      const substFields = {};
      for (const [key, value] of Object.entries(finalFields)) {
        if (value !== '' && value !== null && value !== undefined) {
          substFields[key] = String(value);
        }
      }

      // ─── Assembler le texte avec les clauses (balises {{CHAMP}} pour les inconnus)
      const assembledText = allClauses.map((clause, i) => {
        const rawCorps = clause.corps || '';
        let substituted = rawCorps;
        for (const [key, value] of Object.entries(substFields)) {
          substituted = substituted.replace(new RegExp(`\\{\\{${key}\\}\\}`, 'g'), value);
        }
        return `Article ${i + 1} — ${clause.titre}\n${substituted}`;
      }).join('\n\n');

      // ─── Générer le PDF d'aperçu (balises {{CHAMP}} visibles) ───────────────
      const doc = generateContratPDF({
        bodyText: assembledText,
        company,
        titreModele: fields.NOM_MODELE || 'Contrat de prestation',
        fields: substFields,
      });

      const safeName = (fields.NOM_MODELE || 'modele-contrat').replace(/[^a-zA-Z0-9-_]/g, '_');
      const pdfBlob = doc.output('blob');
      const fileName = `${safeName}.pdf`;
      const pdfFile = new File([pdfBlob], fileName, { type: 'application/pdf' });
      const { file_url } = await base44.integrations.Core.UploadFile({ file: pdfFile });

      // ─── Stocker en tant que modèle dynamique (contenu_dynamique) ───────────
      await base44.entities.Contrat.create({
        titre: fields.NOM_MODELE,
        type: 'modele',
        client_id: null,
        type_evenement: fields.TYPE_EVENEMENT && fields.TYPE_EVENEMENT.length > 0 ? fields.TYPE_EVENEMENT : null,
        contenu_dynamique: assembledText,
        modele_url: file_url,
        modele_nom: fileName,
        prestataire_id: company?.prestataire_id || null,
        mode_paiement: fields.MODE_TARIFICATION,
        taux_tva_modele: fields.MODE_TARIFICATION === 'pourcentage' ? (parseFloat(fields.TAUX_TVA) || null) : null,
        pourcentage_acompte_modele: fields.MODE_TARIFICATION === 'pourcentage' ? (parseFloat(fields.POURCENTAGE_ACOMPTE) || null) : null,
        base_calcul_acompte_modele: fields.MODE_TARIFICATION === 'pourcentage' ? fields.BASE_CALCUL_ACOMPTE : null,
        paliers_annulation: fields.PALIERS_ANNULATION || null,
        echeancier_modele: fields.MODE_TARIFICATION === 'echeancier' ? (fields.ECHEANCIER || []) : null,
      });

      qc.invalidateQueries(['contrats']);
      qc.invalidateQueries(['modeles']);

      toast.success('Modèle dynamique enregistré dans « Mes modèles ».');
      onClose();
    } catch (e) {
      toast.error("Erreur lors de la génération : " + (e?.message || 'erreur'));
    } finally {
      setSaving(false);
    }
  };

  const renderStep = () => {
    switch (step) {
      case 1:
        return (
          <TrameStepQualification
            fields={fields}
            setField={setField}
            company={company}
            categorie={categorie}
            categorieLabel={categorieLabel}
            addEcheance={addEcheance}
            removeEcheance={removeEcheance}
            updateEcheance={updateEcheance}
          />
        );
      case 2:
        return <TrameStepPrestataire fields={fields} setField={setField} />;
      case 3:
        return <TrameStepPrestation fields={fields} setField={setField} />;
      case 4:
        return <TrameStepAnnulation fields={fields} setField={setField} addPalier={addPalier} removePalier={removePalier} updatePalier={updatePalier} />;
      case 5:
        return showStep5 ? <TrameStepSpecifique fields={fields} setField={setField} categorie={categorie} /> : null;
      case 6:
        return (
          <TrameStepVerification
            fields={fields}
            allClauses={allClauses}
            blocA={blocA}
            blocB={blocB}
            categorieLabel={categorieLabel}
          />
        );
      default:
        return null;
    }
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/40 backdrop-blur-sm p-4">
      <div className="bg-card rounded-2xl border border-border shadow-xl w-full max-w-2xl max-h-[90vh] flex flex-col">
        <div className="px-6 py-4 border-b border-border flex items-center justify-between shrink-0">
          <h3 className="font-semibold text-base">Questionnaire guidé</h3>
          <button onClick={onClose} className="p-1.5 rounded-lg hover:bg-muted text-muted-foreground"><X size={18} /></button>
        </div>

        <div className="px-6 pt-4 shrink-0">
          <div className="bg-amber-50 border border-amber-300 rounded-xl p-3 flex gap-2.5">
            <AlertTriangle size={16} className="text-amber-700 shrink-0 mt-0.5" />
            <p className="text-xs text-amber-900 leading-relaxed">
              <strong>Ce document ne constitue pas une consultation juridique.</strong> Le modèle généré est fourni à titre indicatif et doit être validé par un avocat ou un professionnel du droit avant toute utilisation. Les clauses sensibles (annulation, responsabilité, paiement) nécessitent une vérification particulière.
            </p>
          </div>
        </div>

        <div className="px-6 py-3 shrink-0">
          <div className="flex items-center gap-1">
            {steps.map((s, i) => (
              <div key={s.id} className="flex items-center gap-1 flex-1">
                <div className={`flex items-center justify-center w-6 h-6 rounded-full text-xs font-bold transition-colors shrink-0
                  ${i + 1 < step ? 'bg-emerald-500 text-white' : i + 1 === step ? 'bg-primary text-primary-foreground' : 'bg-muted text-muted-foreground'}`}>
                  {i + 1 < step ? <Check size={11} /> : i + 1}
                </div>
                <span className={`text-xs hidden sm:inline ${i + 1 === step ? 'text-foreground font-medium' : 'text-muted-foreground'}`}>{s.label}</span>
                {i < steps.length - 1 && <ChevronRight size={12} className="text-muted-foreground ml-auto mr-1 shrink-0" />}
              </div>
            ))}
          </div>
        </div>

        <div className="flex-1 overflow-y-auto px-6 py-4">
          {renderStep()}
        </div>

        <div className="px-6 py-4 border-t border-border flex justify-between gap-3 shrink-0">
          {step > 1 ? <Button variant="outline" onClick={() => setStep(s => s - 1)}>Précédent</Button> : <Button variant="outline" onClick={onClose}>Annuler</Button>}
          {step < 6 ? (
            <Button onClick={() => setStep(s => s + 1)} disabled={!canNext()} className="gap-1.5">Suivant <ChevronRight size={14} /></Button>
          ) : (
            <Button onClick={handleGenerateAndSave} disabled={saving} className="gap-1.5">
              {saving ? <Loader2 size={14} className="animate-spin" /> : <Check size={14} />}
              {saving ? 'Génération…' : 'Enregistrer le modèle'}
            </Button>
          )}
        </div>
      </div>
    </div>
  );
}