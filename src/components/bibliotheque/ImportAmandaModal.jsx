/**
 * Modal d'import IA pour brochures.
 * Étapes : upload → analyse → validation → création en masse
 */
import { useState, useRef } from 'react';
import { motion } from 'framer-motion';
import { base44 } from '@/api/base44Client';
import { X, Upload, AlertCircle, CheckCircle2, ArrowRight } from 'lucide-react';
import AmandaMessage from '@/components/AmandaMessage';
import AmandaProcessing from '@/components/AmandaProcessing';
import { Button } from '@/components/ui/button';
import { useToast } from '@/components/ui/use-toast';
import ValidationAmandaModal from './ValidationAmandaModal';

export default function ImportAmandaModal({ onClose, onCreated, initialFiles = [] }) {
  const fileRef = useRef();
  const { toast } = useToast();
  
  const [step, setStep] = useState('upload'); // 'upload' | 'analyzing' | 'validation'
  const [files, setFiles] = useState(initialFiles); // pré-chargé si fichier sélectionné depuis CreerModal
  const [analyzing, setAnalyzing] = useState(false);
  const [analysisResult, setAnalysisResult] = useState(null);
  const [error, setError] = useState(null);

  const handleFiles = (fileList) => {
    if (!fileList || fileList.length === 0) return;
    const newFiles = Array.from(fileList);
    setFiles(prev => [...prev, ...newFiles]);
    setError(null);
  };

  const removeFile = (index) => {
    setFiles(prev => prev.filter((_, i) => i !== index));
  };

  const convertPdfToImages = async (pdfFile) => {
    // Utilise pdfjs pour convertir le PDF en images
    // Retourne un tableau de Blob (images PNG)
    const formData = new FormData();
    formData.append('file', pdfFile);
    
    // Upload le PDF d'abord
    const { file_url } = await base44.integrations.Core.UploadFile({ file: pdfFile });
    
    // Utilise l'IA pour reconnaître et extraire le contenu du PDF
    // (le PDF est traité directement par l'IA comme une image multi-page)
    return { file_url, isPdf: true };
  };

  const analyzeDocument = async () => {
    if (files.length === 0) return;
    
    setAnalyzing(true);
    setError(null);
    
    try {
      // Upload tous les fichiers et récupère les URLs
      const fileUrls = [];
      for (const f of files) {
        const { file_url } = await base44.integrations.Core.UploadFile({ file: f });
        fileUrls.push(file_url);
      }

      // Prompt IA pour extraction structurée à partir de plusieurs images/PDF
      const prompt = `Analyser ce document qui est une brochure ou un menu de professionnel de l'événementiel (traiteur, lieu de réception, prestataire). Le document peut s'étendre sur plusieurs pages ou images — analyser l'intégralité comme un seul document.

Extraire toutes les formules et menus avec leurs articles en respectant ces règles strictes :

FORMULES :
- Extraire chaque formule avec son nom exact, son prix par personne et le minimum de personnes si mentionné
- Une formule peut s'appeler Menu, Formule, Prestation, Pack, Offre ou autre

ARTICLES :
- Extraire CHAQUE article individuellement — ne jamais regrouper plusieurs articles en un seul
- Si une liste contient des items séparés par virgules, tirets ou sauts de ligne → créer un article distinct pour chacun
- Extraire CHAQUE boisson individuellement (ex : Pastis 51, Ricard, Whisky, Martini rouge, Martini blanc, Malibu, Vodka, Rhum — un article par boisson)
- Extraire TOUS les plats, entrées, desserts sans en oublier — analyser chaque ligne
- Extraire le contenu des buffets article par article
- Extraire les animations, options et prestations supplémentaires
- Extraire les tarifs spéciaux (enfants, ados, prestataires, suppléments)
- Extraire les inclusions (location salle, parking, nappages, service…)

CATÉGORIES — utiliser EXACTEMENT l'une des 16 valeurs suivantes :
- Apéritif : boissons et bouchées à l'apéritif (cocktail, gougères, toasts…)
- Hors d'œuvre : amuse-bouches, verrines, canapés servis avant l'entrée à table
- Mise en bouche : petites bouchées d'une seule bouchée servies en début de repas
- Entrée : entrées chaudes ou froides servies à table (salade, foie gras, terrine…)
- Plat : plats principaux chauds ou froids
- Fromage : plateau de fromages, service fromage entre plat et dessert
- Trou normand : sorbet alcoolisé ou non servi entre les plats pour nettoyer le palais — mettre a_choisir: true si plusieurs parfums sont proposés
- Pré-dessert : petite préparation sucrée servie avant le dessert principal
- Dessert : desserts principaux (gâteaux, pièces montées, entremets…)
- Mignardises : petits fours, chocolats, friandises sucrées servies en fin de repas
- Pain : pain, baguette, viennoiseries, accompagnements bread
- Atelier : atelier cocktail, atelier cuisine, dégustation animée
- Vin : vins rouges, blancs, rosés servis au repas
- Champagne : coupe de champagne, prosecco, crémant (ex : Bollinger, Moët…)
- Boisson : toutes les autres boissons (eau, sodas, jus, café, thé, alcools hors vin/champagne)
- Autre : tout ce qui ne rentre pas dans les catégories précédentes (inclusions, location, service…)

ARTICLES PARTAGÉS :
- Si un article apparaît dans plusieurs formules → formules_associees: ["Formule1", "Formule2"]
- Si un article apparaît dans TOUTES les formules → formules_associees: []
- Détecter automatiquement les articles partagés en comparant le contenu de chaque formule

ALLERGÈNES (si mentionnés) :
Gluten / Crustacés / Œufs / Poissons / Arachides / Soja / Lait / Fruits à coque / Céleri / Moutarde / Sésame / Sulfites / Lupin / Mollusques

HÉRITAGE DE CATÉGORIE PAR BLOC VISUEL :
- Certaines brochures regroupent des items dans des encadrés, tableaux ou blocs visuels avec un titre au-dessus (ex : "PLAT", "ENTRÉE", "DESSERT", "APÉRITIF"…)
- Tous les items à l'intérieur d'un tel bloc héritent automatiquement de la catégorie indiquée par le titre du bloc, même s'ils ne mentionnent pas cette catégorie individuellement
- Si un titre de bloc correspond à l'une des 16 catégories (même approximativement, ex : "PLATS" → "Plat", "ENTRÉES" → "Entrée"), appliquer cette catégorie à tous les items du bloc
- Cette règle s'applique aussi aux sous-sections imbriquées dans une formule

CHOIX CLIENT :
- Si un article est proposé AU CHOIX parmi plusieurs options → a_choisir: true
- Si l'article est fixe et inclus automatiquement → a_choisir: false

Retourner UNIQUEMENT un JSON valide sans texte avant ou après.`;

      const result = await base44.integrations.Core.InvokeLLM({
        prompt,
        file_urls: fileUrls, // Passe toutes les images/PDFs
        response_json_schema: {
          type: 'object',
          properties: {
            formules: {
              type: 'array',
              items: {
                type: 'object',
                properties: {
                  nom: { type: 'string' },
                  prix: { type: 'number' },
                  minimum_personnes: { type: 'number' },
                },
              },
            },
            articles: {
              type: 'array',
              items: {
                type: 'object',
                properties: {
                  nom: { type: 'string' },
                  categorie: { type: 'string' },
                  formules_associees: { type: 'array', items: { type: 'string' } },
                  quantite_par_personne: { type: 'number' },
                  unite: { type: 'string' },
                  allergenes: { type: 'array', items: { type: 'string' } },
                  a_choisir: { type: 'boolean' },
                },
              },
            },
          },
        },
      });

      setAnalysisResult(result);
      setStep('validation');
    } catch (err) {
      setError(err.message || 'Erreur lors de l\'analyse');
      toast({ title: '❌ Analyse échouée', description: err.message, variant: 'destructive' });
    } finally {
      setAnalyzing(false);
    }
  };

  // ─── Étape 1 : Upload ───
  if (step === 'upload') {
    return (
      <div className="fixed inset-0 z-50 bg-black/50 backdrop-blur-sm flex items-center justify-center p-4" onMouseDown={onClose}>
      <div className="bg-card rounded-2xl border border-border shadow-xl w-full max-w-lg flex flex-col overflow-hidden relative" onMouseDown={e => e.stopPropagation()}>
          <div className="flex items-center justify-between px-5 py-4 border-b border-border shrink-0">
            <div>
              <h2 className="font-bold text-base">✨ Analyser une brochure avec Amanda</h2>
              <p className="text-xs text-muted-foreground mt-0.5">Import IA multi-pages</p>
            </div>
            <button onClick={onClose} className="p-1.5 rounded-lg hover:bg-muted text-muted-foreground"><X size={16} /></button>
          </div>

          <div className="p-5 space-y-4 flex-1 overflow-y-auto">
            <p className="text-sm text-muted-foreground">
              Uploadez plusieurs images ou un PDF. L'IA analysera toutes les pages ensemble pour extraire les formules et articles.
            </p>

            <label className={`flex flex-col items-center gap-3 border-2 border-dashed rounded-xl py-10 px-4 cursor-pointer transition-colors ${files.length > 0 ? 'border-primary bg-primary/5' : 'border-border hover:border-primary/50'}`}>
              <input ref={fileRef} type="file" accept=".pdf,.jpg,.jpeg,.png,.webp" multiple className="hidden" onChange={e => handleFiles(e.target.files)} />
              <Upload size={32} className={files.length > 0 ? 'text-primary' : 'text-muted-foreground'} />
              <div className="text-center">
                <p className="text-sm font-medium">{files.length > 0 ? `${files.length} fichier(s) sélectionné(s)` : 'Cliquer pour uploader'}</p>
                <p className="text-xs text-muted-foreground">PDF, JPG, PNG, WebP — multi-sélection autorisée</p>
              </div>
            </label>

            {/* Liste des fichiers sélectionnés */}
            {files.length > 0 && (
              <div className="space-y-2">
                <p className="text-xs font-medium text-muted-foreground uppercase">Fichiers à analyser</p>
                <div className="space-y-1.5 max-h-48 overflow-y-auto">
                  {files.map((f, idx) => (
                    <div key={idx} className="flex items-center justify-between p-2 bg-muted/30 rounded-lg border border-border/50">
                      <div className="flex items-center gap-2 min-w-0 flex-1">
                        <span className="text-lg shrink-0">{f.type === 'application/pdf' ? '📄' : '🖼️'}</span>
                        <div className="min-w-0">
                          <p className="text-xs font-medium truncate">{f.name}</p>
                          <p className="text-[10px] text-muted-foreground">{(f.size / 1024 / 1024).toFixed(1)} Mo</p>
                        </div>
                      </div>
                      <button
                        type="button"
                        onClick={() => removeFile(idx)}
                        className="p-1 rounded hover:bg-red-50 text-muted-foreground hover:text-red-600 shrink-0"
                      >
                        <X size={14} />
                      </button>
                    </div>
                  ))}
                </div>
                <button
                  type="button"
                  onClick={() => fileRef.current?.click()}
                  className="w-full text-xs py-1.5 px-2 text-primary hover:bg-primary/10 rounded-lg border border-primary/20 transition-colors font-medium"
                >
                  + Ajouter plus de fichiers
                </button>
              </div>
            )}

            {error && (
              <div className="p-3 bg-red-50 border border-red-200 rounded-lg flex items-start gap-2">
                <AlertCircle size={16} className="text-red-600 shrink-0 mt-0.5" />
                <p className="text-xs text-red-700">{error}</p>
              </div>
            )}
          </div>

          {analyzing && (
            <div className="absolute inset-0 bg-white rounded-2xl flex flex-col items-center justify-center gap-4 z-10">
              <AmandaProcessing size="lg" variant="light" />
            </div>
          )}
          <div className="modal-footer">
            <Button variant="outline" onClick={onClose}>Annuler</Button>
            <Button onClick={analyzeDocument} disabled={files.length === 0 || analyzing}>
              {analyzing ? <><AmandaProcessing size="sm" /> Analyse…</> : <><Upload size={14} /> Analyser {files.length > 0 && `(${files.length})`}</>}
            </Button>
          </div>
        </div>
      </div>
    );
  }

  // ─── Étape 2 : Validation + Création ───
  if (step === 'validation' && analysisResult) {
    return (
      <ValidationAmandaModal
        analysisResult={analysisResult}
        fileName={files.map(f => f.name).join(', ')}
        onClose={onClose}
        onCreated={onCreated}
      />
    );
  }

  return null;
}