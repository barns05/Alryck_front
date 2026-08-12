/**
 * ExtractionContratModal — chemin 2 : « Uploader + extraction IA »
 *
 * Upload d'un contrat PDF existant → l'IA (InvokeLLM + file_urls) analyse le
 * document et propose une extraction du texte avec des balises {{CHAMP}} à la
 * place des informations spécifiques détectées (nom client, date, montant…).
 *
 * RÈGLES DE SÉCURITÉ (non négociables) :
 * A. Aucune application automatique — écran de relecture éditable avant sauvegarde.
 * B. Bandeau d'avertissement visible à chaque étape.
 * C. Diff visuel clair — texte avec placeholders vs variables détectées.
 * D. Produit uniquement un modèle (type='modele'), jamais un contrat client.
 * E. Stockage dans contenu_dynamique (distinct de modele_url).
 * F. Pas de signature électronique, pas d'automatisation de statut.
 */
import { useState, useRef } from 'react';
import { useQuery, useQueryClient } from '@tanstack/react-query';
import { base44 } from '@/api/base44Client';
import { X, Upload, AlertTriangle, Loader2, Check, RefreshCw, Sparkles, BookOpen } from 'lucide-react';
import AmandaProcessing from '@/components/AmandaProcessing';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { toast } from 'sonner';
import { generateContratPDF } from './generateContratPDF';
import BibliothequeArticlesPanel from './BibliothequeArticlesPanel';
import { appendArticleToText } from '@/lib/bibliothequeArticles';
import TypeEvenementMultiSelect from '@/components/bibliotheque/TypeEvenementMultiSelect';

const TYPES_EVENEMENT = [
  'Mariage', 'Pacs', 'Anniversaire de mariage', 'Baptême', 'Anniversaire',
  "Soirée d'entreprise", 'Séminaire', 'Cocktail', 'Gala', 'Location', 'Autre',
];

const IA_PROMPT = `Tu es un assistant juridique spécialisé dans l'analyse de contrats de prestation de services événementiels.

Analyse ce document contractuel (contrat, convention, devis signé, etc.).
Ta mission :

1. EXTRAIRE l'intégralité du texte du contrat, en préservant la structure (articles, clauses, mentions légales, signatures).

2. IDENTIFIER toutes les informations spécifiques au client/événement qui varieraient d'un contrat à l'autre :
   - Nom et prénom du client, adresse du client
   - Nom de l'entreprise prestataire, adresse, RCS/SIRET
   - Date de l'événement, date du contrat, date de signature
   - Nombre de personnes/invités
   - Description de la prestation
   - Montants (HT, TVA, TTC)
   - Conditions de paiement (acompte, solde…)
   - Délai d'annulation, frais d'annulation
   - Nom de l'assureur
   - Localité (lieu de signature)

3. REMPLACER chaque information spécifique détectée par un placeholder au format {{NOM_DESCRIPTIF}} (ex : {{NOM_CLIENT}}, {{DATE_EVENEMENT}}, {{MONTANT_HT}}). Utilise des noms UPPERCASE avec underscores, clairs et descriptifs.

4. CONSERVER le texte fixe (articles juridiques, mentions légales, clauses types) inchangé — seul le contenu variable est remplacé par des placeholders.

Retourne le texte complet avec les placeholders ET la liste des variables détectées avec leur valeur d'origine.`;

const IA_SCHEMA = {
  type: 'object',
  properties: {
    texte_avec_placeholders: {
      type: 'string',
      description: 'Texte complet du contrat avec les informations variables remplacées par des placeholders {{CHAMP}}',
    },
    variables: {
      type: 'array',
      items: {
        type: 'object',
        properties: {
          placeholder: { type: 'string', description: 'Nom du placeholder sans les accolades (ex: NOM_CLIENT)' },
          label: { type: 'string', description: 'Libellé lisible en français (ex: Nom du client)' },
          valeur_originale: { type: 'string', description: 'Valeur exacte extraite du document original' },
        },
      },
    },
  },
};

// Bandeau d'avertissement permanent (règle B)
function WarningBanner() {
  return (
    <div className="bg-amber-50 border border-amber-300 rounded-xl p-3 flex gap-2.5 shrink-0">
      <AlertTriangle size={16} className="text-amber-700 shrink-0 mt-0.5" />
      <p className="text-xs text-amber-900 leading-relaxed">
        <strong>L'extraction par IA peut contenir des erreurs.</strong> Vérifiez attentivement chaque champ détecté
        et le texte généré avant de l'utiliser. Pour les clauses sensibles (responsabilité, annulation, paiement),
        nous recommandons une vérification par un professionnel du droit.
      </p>
    </div>
  );
}

function PlaceholderTag({ name }) {
  return <code className="px-1.5 py-0.5 rounded bg-primary/10 text-primary font-mono text-[10px] shrink-0">{'{{' + name + '}}'}</code>;
}

export default function ExtractionContratModal({ onClose }) {
  const qc = useQueryClient();
  const fileRef = useRef();
  const [step, setStep] = useState('upload'); // 'upload' | 'analyzing' | 'review' | 'error'
  const [file, setFile] = useState(null);
  const [nomModele, setNomModele] = useState('');
  const [typeEvenement, setTypeEvenement] = useState([]);
  const [texte, setTexte] = useState('');
  const [variables, setVariables] = useState([]);
  const [saving, setSaving] = useState(false);
  const [showBibliotheque, setShowBibliotheque] = useState(false);

  const { data: company } = useQuery({
    queryKey: ['company-settings-owner'],
    queryFn: () => base44.entities.CompanySettings.list().then(r => r.find(cs => cs.is_owner === true) || null),
    staleTime: 60000,
  });

  const handleFile = (f) => {
    if (!f) return;
    setFile(f);
    launchAnalysis(f);
  };

  const launchAnalysis = async (f) => {
    setStep('analyzing');
    try {
      const { file_url } = await base44.integrations.Core.UploadFile({ file: f });
      const response = await base44.integrations.Core.InvokeLLM({
        prompt: IA_PROMPT,
        file_urls: [file_url],
        response_json_schema: IA_SCHEMA,
      });

      if (!response?.texte_avec_placeholders) {
        setStep('error');
        return;
      }

      setTexte(response.texte_avec_placeholders);
      setVariables(response.variables || []);
      setStep('review');
    } catch (e) {
      console.error(e);
      setStep('error');
    }
  };

  const handleRestart = () => {
    setFile(null);
    setTexte('');
    setVariables([]);
    setStep('upload');
  };

  const handleSave = async () => {
    if (!nomModele) { toast.error('Veuillez nommer votre modèle'); return; }
    if (!texte.trim()) { toast.error('Le contenu du modèle est vide'); return; }
    setSaving(true);
    try {
      // Générer un PDF d'aperçu (placeholders {{CHAMP}} visibles) via le générateur unifié
      const safeName = (nomModele || 'modele-dynamique').replace(/[^a-zA-Z0-9-_]/g, '_');
      const doc = generateContratPDF({
        bodyText: texte,
        company,
        titreModele: nomModele,
        fields: {},
      });
      const pdfBlob = doc.output('blob');
      const pdfFileName = `${safeName}.pdf`;
      const pdfFile = new File([pdfBlob], pdfFileName, { type: 'application/pdf' });
      const { file_url: modeleUrl } = await base44.integrations.Core.UploadFile({ file: pdfFile });

      await base44.entities.Contrat.create({
        titre: nomModele,
        type: 'modele',
        client_id: null,
        type_evenement: typeEvenement.length > 0 ? typeEvenement : null,
        contenu_dynamique: texte,
        modele_url: modeleUrl,
        modele_nom: pdfFileName,
        prestataire_id: company?.prestataire_id || null,
      });

      qc.invalidateQueries(['contrats']);
      qc.invalidateQueries(['modeles']);

      toast.success('Modèle dynamique enregistré dans « Mes modèles ».');
      onClose();
    } catch (e) {
      toast.error("Erreur lors de l'enregistrement : " + (e?.message || 'erreur'));
    } finally {
      setSaving(false);
    }
  };

  const updateVariable = (index, field, value) => {
    setVariables(prev => prev.map((v, i) => i === index ? { ...v, [field]: value } : v));
  };

  const removeVariable = (index) => {
    setVariables(prev => prev.filter((_, i) => i !== index));
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/40 backdrop-blur-sm p-4">
      <div className="bg-card rounded-2xl border border-border shadow-2xl w-full max-w-2xl max-h-[92vh] flex flex-col">
        {/* Header */}
        <div className="px-6 py-4 border-b border-border flex items-center justify-between shrink-0">
          <div className="flex items-center gap-2">
            <div className="w-8 h-8 rounded-lg bg-primary/10 flex items-center justify-center">
              <Sparkles size={16} className="text-primary" />
            </div>
            <div>
              <h3 className="font-semibold text-sm">Extraction IA d'un contrat</h3>
              <p className="text-xs text-muted-foreground">Upload + détection des champs variables</p>
            </div>
          </div>
          <button onClick={onClose} className="p-1.5 rounded-lg hover:bg-muted text-muted-foreground">
            <X size={18} />
          </button>
        </div>

        {/* Bandeau d'avertissement permanent (règle B) */}
        <div className="px-6 pt-4 shrink-0">
          <WarningBanner />
        </div>

        {/* Contenu */}
        <div className="flex-1 overflow-y-auto px-6 py-4 space-y-4">

          {/* Étape upload */}
          {step === 'upload' && (
            <div
              onClick={() => fileRef.current?.click()}
              className="border-2 border-dashed rounded-2xl p-10 flex flex-col items-center gap-3 cursor-pointer transition-colors border-border hover:border-primary/50 hover:bg-muted/50"
            >
              <div className="w-14 h-14 rounded-2xl bg-primary/10 flex items-center justify-center">
                <Upload size={24} className="text-primary" />
              </div>
              <div className="text-center">
                <p className="font-semibold text-sm">Glissez votre contrat ici</p>
                <p className="text-xs text-muted-foreground mt-1">ou cliquez pour parcourir</p>
              </div>
              <p className="text-xs text-muted-foreground bg-muted px-3 py-1 rounded-full">PDF uniquement</p>
              <input
                ref={fileRef}
                type="file"
                accept=".pdf"
                className="hidden"
                onChange={e => handleFile(e.target.files?.[0])}
              />
            </div>
          )}

          {/* Étape analyse */}
          {step === 'analyzing' && (
            <div className="flex flex-col items-center gap-4 py-10">
              <AmandaProcessing size="lg" variant="light" message="Amanda analyse votre contrat…" />
              <p className="text-sm text-muted-foreground">Extraction du texte et détection des champs variables en cours.</p>
              {file && <p className="text-xs text-muted-foreground">{file.name}</p>}
            </div>
          )}

          {/* Étape erreur */}
          {step === 'error' && (
            <div className="flex flex-col items-center gap-5 py-8">
              <div className="w-14 h-14 rounded-full bg-amber-50 border border-amber-200 flex items-center justify-center">
                <AlertTriangle size={24} className="text-amber-500" />
              </div>
              <div className="text-center space-y-1">
                <p className="font-semibold">Amanda n'a pas pu analyser ce document.</p>
                <p className="text-sm text-muted-foreground">Le contenu n'a pas pu être extrait automatiquement.</p>
              </div>
              <Button variant="outline" className="gap-1.5" onClick={handleRestart}>
                <RefreshCw size={13} /> Recommencer
              </Button>
            </div>
          )}

          {/* Étape relecture (règle A + C) */}
          {step === 'review' && (
            <>
              {/* Métadonnées du modèle */}
              <div className="grid grid-cols-2 gap-3">
                <div className="space-y-1.5">
                  <label className="text-sm font-medium">Nom du modèle *</label>
                  <Input
                    value={nomModele}
                    onChange={e => setNomModele(e.target.value)}
                    placeholder="ex: Contrat mariage dynamique"
                    autoComplete="off"
                    autoCorrect="off"
                    spellCheck={false}
                  />
                </div>
                <div className="space-y-1.5">
                  <label className="text-sm font-medium">Type(s) d'événement</label>
                  <TypeEvenementMultiSelect
                    value={typeEvenement}
                    onChange={setTypeEvenement}
                  />
                </div>
              </div>

              {/* Diff visuel (règle C) : variables détectées */}
              {variables.length > 0 && (
                <div>
                  <p className="text-xs font-semibold uppercase tracking-wider text-muted-foreground mb-2">
                    Variables détectées par l'IA ({variables.length})
                  </p>
                  <div className="space-y-2 bg-muted/30 rounded-xl border border-border p-3 max-h-48 overflow-y-auto">
                    {variables.map((v, i) => (
                      <div key={i} className="flex items-center gap-2 text-xs">
                        <PlaceholderTag name={v.placeholder} />
                        <input
                          value={v.label}
                          onChange={e => updateVariable(i, 'label', e.target.value)}
                          className="flex-1 min-w-0 rounded border border-input bg-transparent px-2 py-0.5 text-xs text-foreground"
                          placeholder="Libellé"
                        />
                        <input
                          value={v.valeur_originale}
                          onChange={e => updateVariable(i, 'valeur_originale', e.target.value)}
                          className="flex-1 min-w-0 rounded border border-input bg-transparent px-2 py-0.5 text-xs text-muted-foreground"
                          placeholder="Valeur d'origine"
                        />
                        <button
                          onClick={() => removeVariable(i)}
                          className="p-1 rounded hover:bg-red-50 text-muted-foreground hover:text-destructive shrink-0"
                        >
                          <X size={12} />
                        </button>
                      </div>
                    ))}
                  </div>
                </div>
              )}

              {/* Diff visuel (règle C) : texte avec placeholders éditable */}
              <div>
                <p className="text-xs font-semibold uppercase tracking-wider text-muted-foreground mb-2">
                  Texte du modèle (avec placeholders) — éditable
                </p>
                <textarea
                  value={texte}
                  onChange={e => setTexte(e.target.value)}
                  rows={12}
                  className="w-full rounded-lg border border-border bg-white p-3 text-xs text-foreground font-mono whitespace-pre-wrap resize-none focus-visible:outline-none focus-visible:ring-1 focus-visible:ring-ring"
                  placeholder="Texte extrait avec {{CHAMP}}…"
                />
                <p className="text-[11px] text-muted-foreground mt-1">
                  Les balises <code className="text-primary">{'{{CHAMP}}'}</code> seront substituées automatiquement
                  lors de la création d'un contrat client depuis ce modèle.
                </p>
                <button
                  onClick={() => setShowBibliotheque(true)}
                  className="text-xs text-primary hover:underline mt-2 flex items-center gap-1"
                >
                  <BookOpen size={12} /> Parcourir la bibliothèque d'articles
                </button>
              </div>
            </>
          )}
        </div>

        {/* Footer */}
        {step === 'review' && (
          <div className="px-6 py-4 border-t border-border flex justify-end gap-3 shrink-0">
            <Button variant="outline" onClick={handleRestart} className="gap-1.5">
              <RefreshCw size={14} /> Recommencer
            </Button>
            <Button onClick={handleSave} disabled={!nomModele || saving || !texte.trim()} className="gap-1.5">
              {saving ? <Loader2 size={14} className="animate-spin" /> : <Check size={14} />}
              {saving ? 'Enregistrement…' : 'Valider et enregistrer'}
            </Button>
          </div>
        )}
      </div>
      {showBibliotheque && (
        <BibliothequeArticlesPanel
          company={company}
          onAddArticle={(article) => setTexte(prev => appendArticleToText(prev, article))}
          onClose={() => setShowBibliotheque(false)}
        />
      )}
    </div>
  );
}