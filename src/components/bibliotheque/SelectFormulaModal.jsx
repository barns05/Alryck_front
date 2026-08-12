import { useState, useMemo, useEffect } from 'react';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { useNavigate } from 'react-router-dom';
import { base44 } from '@/api/base44Client';
import { X, Loader2, Check, Sparkles, Info } from 'lucide-react';
import AmandaProcessing from '@/components/AmandaProcessing';
import { Button } from '@/components/ui/button';
import { useToast } from '@/components/ui/use-toast';
import { isRelevantForFormula, getArticlesForFormula } from '@/lib/formulaUtils';
import { ORDRE_CATEGORIES_REPAS } from '@/constants/catalogue';
import { sortChampsUniversel } from '@/lib/formulaireUniverselOrdre';

// ─── Constantes ───────────────────────────────────────────────────────────────
const CATEGORIES = [
  'Identification client',
  'Générales',
  'Logistique',
  'Décoration',
  'Menu',
  'Matériel & Équipement',
  'Lieu — mobile',
  'Médias & Souvenir',
  'Spécifiques Mariage',
  'Sécurité'
];

const TOUS_TYPES_EVENEMENT = [
  'Mariage', 'Pacs', 'Anniversaire de mariage', 'Baptême', 'Anniversaire',
  "Soirée d'entreprise", 'Séminaire', 'Cocktail', 'Gala', 'Location', 'Autre'
];

const CATS_ALIMENTAIRES = ['Apéritif', 'Entrée', 'Plat', 'Dessert'];

const PATTERNS_CHOIX_MULTIPLE = [
  /\b2\s*choix\b/i, /\bdeux\s*choix\b/i,
  /\b2\s*options\b/i, /\bdeux\s*options\b/i,
  /\b2\s*parfums\b/i, /\bdeux\s*parfums\b/i,
  /possibilit[eé]\s*de\s*2\b/i,
  /au\s*choix\s*parmi\b/i,
  /\d+\s*choix\s*possibles?\b/i,
];

const LABEL_CHOIX2_PAR_CATEGORIE = {
  'Apéritif': "Choix de l'apéritif 2",
  'Entrée': "Choix de l'entrée 2",
  'Plat': 'Choix du plat 2',
  'Dessert': 'Choix du dessert 2',
};

// IDs internes réservés pour les champs pivots
const ID_TYPE_EVENEMENT = 'type_evenement';
const ID_FORMULE_CHOISIE = 'formule_choisie';

// ─── Helpers ──────────────────────────────────────────────────────────────────
function genId() { return Math.random().toString(36).slice(2, 9); }

function détecterCatégoriesChoixMultiple(menuItems, formulaName) {
  const nomSeul = formulaName.split('—')[0].trim();
  const items = getArticlesForFormula(menuItems, nomSeul);
  const catsDétectées = new Set();
  const catsDéjà = new Set();
  items.forEach(item => {
    if (catsDéjà.has(item.categorie)) return;
    const texte = [item.nom, item.description].filter(Boolean).join(' ');
    if (PATTERNS_CHOIX_MULTIPLE.some(re => re.test(texte))) catsDétectées.add(item.categorie);
    catsDéjà.add(item.categorie);
  });
  return catsDétectées;
}

function analyserMenuPourPresélection(menuItems, formulaName) {
  const nomSeul = formulaName.split('—')[0].trim();
  const suggestions = new Set();
  const itemsDeLaFormule = getArticlesForFormula(menuItems, nomSeul);
  const aChoisirParCategorie = {};
  itemsDeLaFormule.forEach(item => { if (item.a_choisir) aChoisirParCategorie[item.categorie] = true; });
  if (aChoisirParCategorie['Apéritif']) suggestions.add("Choix de l'entrée");
  if (aChoisirParCategorie['Plat']) suggestions.add('Choix du plat');
  if (aChoisirParCategorie['Dessert']) suggestions.add('Choix du dessert');
  suggestions.add('Allergies / régimes spéciaux ?');
  suggestions.add('Préciser allergie et nombre de personnes');
  suggestions.add("Nombre d'adultes");
  suggestions.add("Nombre d'ados");
  suggestions.add('Nombre de menus enfants');
  return suggestions;
}

// ─── Étape : Sélection des types d'événements ─────────────────────────────────
function SelectTypesEvenementScreen({ formulaName, onConfirm, onClose }) {
  const [selected, setSelected] = useState(new Set(TOUS_TYPES_EVENEMENT));

  const toggleType = (type) => {
    setSelected(prev => {
      const next = new Set(prev);
      if (next.has(type)) { next.delete(type); } else { next.add(type); }
      return next;
    });
  };

  const toggleTous = () => {
    if (selected.size === TOUS_TYPES_EVENEMENT.length) {
      setSelected(new Set());
    } else {
      setSelected(new Set(TOUS_TYPES_EVENEMENT));
    }
  };

  const tousCoches = selected.size === TOUS_TYPES_EVENEMENT.length;

  return (
    <div className="fixed inset-0 z-50 bg-black/50 backdrop-blur-sm flex items-center justify-center p-4" onClick={onClose}>
      <div
        className="bg-card rounded-2xl border border-border shadow-xl w-full max-w-sm flex flex-col overflow-hidden"
        style={{ maxHeight: '90vh' }}
        onClick={e => e.stopPropagation()}
      >
        <div className="flex items-center justify-between px-5 py-4 border-b border-border shrink-0">
          <div>
            <h2 className="font-bold text-base">🎯 Types d'événements</h2>
            <p className="text-xs text-muted-foreground mt-0.5">Pour quels types ce questionnaire s'applique-t-il ?</p>
          </div>
          <button onClick={onClose} className="p-1 rounded hover:bg-muted text-muted-foreground">
            <X size={14} />
          </button>
        </div>

        <div className="flex-1 overflow-y-auto px-5 py-4 space-y-2">
          {/* Tout sélectionner */}
          <button
            onClick={toggleTous}
            className={`w-full flex items-center gap-3 px-3 py-2.5 rounded-lg border transition-all text-left font-medium ${
              tousCoches ? 'border-primary bg-primary/5' : 'border-border hover:bg-muted/50'
            }`}
          >
            <div className={`w-5 h-5 rounded-md border-2 flex items-center justify-center shrink-0 ${
              tousCoches ? 'bg-primary border-primary' : 'border-muted-foreground bg-transparent'
            }`}>
              {tousCoches && <Check size={11} className="text-white" />}
            </div>
            <span className="text-sm">Tous les types</span>
          </button>

          <div className="border-t border-border/50 my-1" />

          {TOUS_TYPES_EVENEMENT.map(type => {
            const actif = selected.has(type);
            return (
              <button
                key={type}
                onClick={() => toggleType(type)}
                className={`w-full flex items-center gap-3 px-3 py-2.5 rounded-lg border transition-all text-left ${
                  actif ? 'border-primary bg-primary/5' : 'border-border hover:bg-muted/50'
                }`}
              >
                <div className={`w-5 h-5 rounded-md border-2 flex items-center justify-center shrink-0 transition-all ${
                  actif ? 'bg-primary border-primary' : 'border-muted-foreground bg-transparent'
                }`}>
                  {actif && <Check size={11} className="text-white" />}
                </div>
                <span className="text-sm">{type}</span>
              </button>
            );
          })}
        </div>

        <div className="px-5 pb-[110px] pt-3 border-t border-border shrink-0">
          <Button
            className="w-full"
            onClick={() => onConfirm([...selected])}
            disabled={selected.size === 0}
          >
            Continuer ({selected.size} type{selected.size !== 1 ? 's' : ''})
          </Button>
        </div>
      </div>
    </div>
  );
}

// ─── Étape : Confirmation choix multiples ─────────────────────────────────────
function ConfirmChoixMultiplesScreen({ formulaName, catsDisponibles, onConfirm, onClose }) {
  const [catsAvecDouble, setCatsAvecDouble] = useState(new Set());

  const toggleCat = (cat) => {
    setCatsAvecDouble(prev => {
      const next = new Set(prev);
      if (next.has(cat)) next.delete(cat); else next.add(cat);
      return next;
    });
  };

  return (
    <div className="fixed inset-0 z-50 bg-black/50 backdrop-blur-sm flex items-center justify-center p-4" onClick={onClose}>
      <div
        className="bg-card rounded-2xl border border-border shadow-xl w-full max-w-sm flex flex-col overflow-hidden"
        onClick={e => e.stopPropagation()}
      >
        <div className="flex items-center justify-between px-5 py-4 border-b border-border">
          <h2 className="font-bold text-base">Choix multiples</h2>
          <button onClick={onClose} className="p-1 rounded hover:bg-muted text-muted-foreground"><X size={14} /></button>
        </div>

        <div className="px-5 py-4 space-y-4">
          <p className="text-sm text-muted-foreground">
            Si vous proposez plusieurs choix sur une catégorie, cochez-la :
          </p>
          {catsDisponibles.length > 0 ? (
            <div className="space-y-2">
              {catsDisponibles.map(cat => {
                const label2 = LABEL_CHOIX2_PAR_CATEGORIE[cat];
                if (!label2) return null;
                const actif = catsAvecDouble.has(cat);
                return (
                  <button
                    key={cat}
                    onClick={() => toggleCat(cat)}
                    className={`w-full flex items-center gap-3 px-3 py-2.5 rounded-lg border transition-all text-left ${
                      actif ? 'border-primary bg-primary/5' : 'border-border hover:bg-muted/50'
                    }`}
                  >
                    <div className={`w-5 h-5 rounded-md border-2 flex items-center justify-center shrink-0 ${
                      actif ? 'bg-primary border-primary' : 'border-muted-foreground bg-transparent'
                    }`}>
                      {actif && <Check size={11} className="text-white" />}
                    </div>
                    <div className="flex-1">
                      <p className="text-sm font-medium">{cat}</p>
                      <p className="text-xs text-muted-foreground">Ajoutera "{label2}"</p>
                    </div>
                  </button>
                );
              })}
            </div>
          ) : (
            <p className="text-xs text-muted-foreground italic">Aucune catégorie alimentaire détectée dans cette formule.</p>
          )}
        </div>

        <div className="px-5 pb-[110px] pt-3 border-t border-border">
          <Button className="w-full" onClick={() => onConfirm(catsAvecDouble)}>Continuer</Button>
        </div>
      </div>
    </div>
  );
}

// ─── buildChampsFromQuestions (exporté) ───────────────────────────────────────
/**
 * Génère des champs formulaire à partir de questions sélectionnées.
 * Utilisé en interne et exporté pour le flux universel.
 */
export function buildChampsFromQuestions(selectedQs, menuItems, formulaName) {
  const idMapping = {};
  selectedQs.forEach(q => { idMapping[q.id] = genId(); });

  return selectedQs.map((q) => {
    const validConditions = (q.conditions || []).filter(
      cond => cond.champ_declencheur_id && String(cond.champ_declencheur_id).trim() !== ''
    );
    const mappedConditions = validConditions
      .filter(cond => idMapping[cond.champ_declencheur_id])
      .map(cond => ({ ...cond, champ_declencheur_id: idMapping[cond.champ_declencheur_id] }));

    const nomSeul = (formulaName || '').split('—')[0].trim();
    const itemsDeLaFormule = getArticlesForFormula(menuItems, nomSeul);

    const champ = {
      id: idMapping[q.id],
      source_id: q.id, // ID de la BibliothequeQuestion source → utilisé pour l'anti-doublon
      label: q.label,
      description: q.description,
      type: q.type,
      obligatoire: q.obligatoire,
      options: q.options || [],
      conditions: mappedConditions,
    };

    if (q.label === "Choix de l'entrée") {
      const opts = itemsDeLaFormule.filter(i => i.categorie === 'Apéritif' && i.a_choisir).map(i => i.nom);
      if (opts.length > 0) { champ.options = opts; champ.type = 'liste'; }
    } else if (q.label === 'Choix du plat') {
      const opts = itemsDeLaFormule.filter(i => i.categorie === 'Plat' && i.a_choisir).map(i => i.nom);
      if (opts.length > 0) { champ.options = opts; champ.type = 'liste'; }
    } else if (q.label === 'Choix du dessert') {
      const opts = itemsDeLaFormule.filter(i => i.categorie === 'Dessert' && i.a_choisir).map(i => i.nom);
      if (opts.length > 0) { champ.options = opts; champ.type = 'liste'; }
    }
    return champ;
  });
}

// ─── Composant principal ───────────────────────────────────────────────────────
/**
 * SelectFormulaModal
 * 
 * Flux universel (isUniversel=true) :
 *   1. select_types  → quels types d'événements ?
 *   2. confirm_choix → choix multiples menu ?
 *   3. questions     → sélection des questions (filtrées par type)
 *   
 * Lors de la génération :
 *   - Injecte/met à jour les 2 champs pivots en tête (type_evenement + formule_choisie)
 *   - Ajoute conditions doubles (formule ET type) sur chaque nouveau champ
 *   - Filtre les questions selon les types sélectionnés ET types_evenements de la question
 */
export default function SelectFormulaModal({
  formulaName,
  nameSuffix,
  onClose,
  onGenerated,
  isUniversel = false,
  existingModele = null,
}) {
  const qc = useQueryClient();
  const navigate = useNavigate();
  const { toast } = useToast();

  const [selectedQuestionIds, setSelectedQuestionIds] = useState(new Set());
  const [suggestedIds, setSuggestedIds] = useState(new Set());
  // 'loading' | 'select_types' | 'confirm_choix' | 'questions'
  const [etape, setEtape] = useState('loading');
  const [typesEvenementChoisis, setTypesEvenementChoisis] = useState([]);

  const { data: questions = [], isLoading: loadingQuestions } = useQuery({
    queryKey: ['bibliotheque-questions-all'],
    queryFn: () => base44.entities.BibliothequeQuestion.list('ordre', 500),
  });

  const { data: menuItems = [], isLoading: loadingMenu } = useQuery({
    queryKey: ['catalogue-items-alimentaire'],
    queryFn: () => base44.entities.CatalogueItem.filter({ section: 'alimentaire' }),
  });

  // Formules actives pour la question pivot "Formule choisie"
  const { data: formulesCatalogue = [] } = useQuery({
    queryKey: ['catalogue-tarifs-formules'],
    queryFn: () => base44.entities.CatalogueItem.filter({ section: 'tarifs', type_tarif: 'formule', actif: true }),
  });

  const isLoading = loadingQuestions || loadingMenu;

  useEffect(() => {
    if (isLoading || questions.length === 0) return;
    // Pré-sélection intelligente
    const labelsSuggérés = analyserMenuPourPresélection(menuItems, formulaName);
    const idsSuggérés = new Set(questions.filter(q => labelsSuggérés.has(q.label)).map(q => q.id));
    setSuggestedIds(idsSuggérés);
    const incluses = new Set(questions.filter(q => q.etat === 'incluse').map(q => q.id));
    setSelectedQuestionIds(new Set([...incluses, ...idsSuggérés]));

    // Flux universel → sélection des types d'abord
    if (isUniversel) {
      setEtape('select_types');
    } else {
      setEtape('confirm_choix');
    }
  }, [isLoading, questions.length, menuItems.length, formulaName, isUniversel]);

  const catsDisponibles = useMemo(() => {
    const nomSeul = formulaName.split('—')[0].trim();
    const items = getArticlesForFormula(menuItems, nomSeul);
    return CATS_ALIMENTAIRES.filter(cat =>
      items.some(i => i.categorie === cat && LABEL_CHOIX2_PAR_CATEGORIE[cat])
    );
  }, [menuItems, formulaName]);

  const handleConfirmTypes = (types) => {
    setTypesEvenementChoisis(types);
    // Mode universel sur formulaire existant → greffe auto, pas de sélection manuelle
    if (isUniversel && existingModele) {
      setTypesEvenementChoisis(types);
      // On déclenche la génération directement après le setState via un flag
      setEtape('auto_generate');
    } else {
      setEtape('confirm_choix');
    }
  };

  // Déclenche la génération auto dès que typesEvenementChoisis est prêt en mode auto
  useEffect(() => {
    if (etape === 'auto_generate' && typesEvenementChoisis.length > 0 && menuItems.length > 0) {
      generateModele.mutate();
    }
  }, [etape, typesEvenementChoisis.length, menuItems.length]);

  const handleConfirmChoix = (catsAvecDouble) => {
    const extraIds = new Set();
    catsAvecDouble.forEach(cat => {
      const label2 = LABEL_CHOIX2_PAR_CATEGORIE[cat];
      if (label2) {
        const q2 = questions.find(q => q.label === label2);
        if (q2) extraIds.add(q2.id);
      }
    });
    if (extraIds.size > 0) {
      setSelectedQuestionIds(prev => new Set([...prev, ...extraIds]));
      setSuggestedIds(prev => new Set([...prev, ...extraIds]));
    }
    setEtape('questions');
  };

  // Filtre les questions selon les types d'événements sélectionnés
  const questionsFiltrees = useMemo(() => {
    if (!isUniversel || typesEvenementChoisis.length === 0) return questions;
    return questions.filter(q => {
      const typesQ = q.types_evenements || [];
      if (typesQ.length === 0) return true; // applicable à tous
      return typesQ.some(t => typesEvenementChoisis.includes(t));
    });
  }, [questions, typesEvenementChoisis, isUniversel]);

  const generateModele = useMutation({
    mutationFn: async () => {
      if (isUniversel && existingModele) {
        // ── MODE UNIVERSEL AUTO : greffe uniquement les questions a_choisir du catalogue ──
        const nomFormule = formulaName.split('—')[0].trim();
        const itemsDeLaFormule = getArticlesForFormula(menuItems, nomFormule);
        // ── Refetch frais pour éviter d'écraser avec une version stale (bug cache React Query) ──
        const fraisModele = await base44.entities.ModeleFormulaire.get(existingModele.id);
        const champsExistants = [...(fraisModele?.champs || existingModele.champs || [])];
        const nomsFormules = formulesCatalogue.filter(f => f.actif !== false).map(f => f.nom);

        // ── Champ pivot 1 : Type d'événement ──
        // Recherche large : par ID connu OU par label (couvre f-pivot-type et type_evenement)
        let champTypeId = null;
        const champTypeExistant = champsExistants.find(
          c => c.id === ID_TYPE_EVENEMENT || c.id === 'f-pivot-type' ||
               c.label === "Type d'événement" || c.label === 'Quel est le type de votre événement ?'
        );
        if (champTypeExistant) {
          // Existe déjà → fusionner les options sans toucher à l'ordre
          const optionsMerged = [...new Set([...(champTypeExistant.options || []), ...typesEvenementChoisis])];
          const idx = champsExistants.indexOf(champTypeExistant);
          champsExistants[idx] = { ...champTypeExistant, options: optionsMerged };
          champTypeId = champTypeExistant.id;
        } else if (typesEvenementChoisis.length > 1) {
          // N'existe pas → créer en tête uniquement si plusieurs types
          const newChampType = {
            id: ID_TYPE_EVENEMENT,
            label: "Type d'événement",
            type: 'choix_unique',
            obligatoire: true,
            options: typesEvenementChoisis,
            description: 'Sélectionnez le type de votre événement',
            conditions: [],
          };
          champsExistants.unshift(newChampType);
          champTypeId = ID_TYPE_EVENEMENT;
        }

        // ── Champ pivot 2 : Formule choisie ──
        let champFormuleId = null;
        const champFormuleExistant = champsExistants.find(
          c => c.id === ID_FORMULE_CHOISIE || c.id === 'f-pivot-formule' ||
               c.label === 'Quelle formule avez-vous choisie ?'
        );
        if (champFormuleExistant) {
          // Ajouter uniquement la formule concernée aux options existantes
          const optionsMerged = [...new Set([...(champFormuleExistant.options || []), nomFormule])];
          const idx = champsExistants.indexOf(champFormuleExistant);
          champsExistants[idx] = { ...champFormuleExistant, options: optionsMerged };
          champFormuleId = champFormuleExistant.id;
        } else {
          // Insérer juste après le champ type (ou en position 0/1)
          const insertPos = champTypeId ? champsExistants.findIndex(c => c.id === champTypeId) + 1 : 0;
          const newChampFormule = {
            id: ID_FORMULE_CHOISIE,
            label: 'Quelle formule avez-vous choisie ?',
            type: 'choix_unique',
            obligatoire: true,
            options: nomsFormules,
            description: 'Sélectionnez votre formule',
            conditions: [],
          };
          champsExistants.splice(insertPos, 0, newChampFormule);
          champFormuleId = ID_FORMULE_CHOISIE;
        }

        // ── Générer les champs depuis les CatalogueItem a_choisir de la formule ──
        const categoriesAChoisir = [...new Set(
          itemsDeLaFormule
            .filter(i => i.a_choisir)
            .map(i => i.categorie)
            .filter(Boolean)
        )].sort((a, b) => {
          const ia = ORDRE_CATEGORIES_REPAS.indexOf(a);
          const ib = ORDRE_CATEGORIES_REPAS.indexOf(b);
          const ra = ia === -1 ? 9999 : ia;
          const rb = ib === -1 ? 9999 : ib;
          return ra - rb;
        });

        const slugify = (str) => str
          .toLowerCase()
          .normalize('NFD')
          .replace(/[\u0300-\u036f]/g, '')
          .replace(/\s+/g, '-')
          .replace(/[^a-z0-9-]/g, '');

        const nouveauxChampsAChoisir = [];
        categoriesAChoisir.forEach(cat => {
          const opts = itemsDeLaFormule
            .filter(i => i.categorie === cat && i.a_choisir)
            .map(i => i.nom);
          if (opts.length === 0) return;
          nouveauxChampsAChoisir.push({
            id: 'f-choix-' + slugify(cat),
            source_id: null,
            label: 'Choix — ' + cat,
            type: 'liste',
            obligatoire: false,
            options: opts,
            description: null,
            conditions: [],
          });
        });
        const nouveauxChamps = nouveauxChampsAChoisir;

        // ── Conditions doubles : formule ET type sur chaque nouveau champ ──
        const champsAvecConditions = nouveauxChamps.map(champ => {
          const conditions = [...(champ.conditions || [])];

          // Condition formule_choisie
          if (champFormuleId) {
            conditions.push({
              id: genId(),
              champ_declencheur_id: champFormuleId,
              champ_declencheur_label: 'Quelle formule avez-vous choisie ?',
              operateur: 'egal',
              valeur: nomFormule,
              action: 'afficher',
            });
          }

          // Condition type_evenement (si plusieurs types et un seul type choisi pour cette formule)
          if (champTypeId && typesEvenementChoisis.length === 1) {
            conditions.push({
              id: genId(),
              champ_declencheur_id: champTypeId,
              champ_declencheur_label: 'Quel est le type de votre événement ?',
              operateur: 'egal',
              valeur: typesEvenementChoisis[0],
              action: 'afficher',
            });
          }

          return { ...champ, conditions };
        });

        // ── Éviter les doublons : filtre sur source_id (BibliothequeQuestion) avec fallback label+formule ──
        // Les champs avec source_id identique sont des doublons certains.
        // Pour les champs dynamiques "Choix — [Cat]" (sans source_id), le doublon est défini par
        // label + formule (via conditions) : un même dessert pour Sirocco et Mistral doit coexister.
        const sourceIdsExistants = new Set(
          champsExistants.filter(c => c.source_id).map(c => c.source_id)
        );

        // Pour les champs "Choix — " : clé = label + formule (extraite des conditions)
        const getFormuleFromConditions = (champ) => {
          const cond = (champ.conditions || []).find(c => c.champ_declencheur_id === champFormuleId);
          return cond?.valeur || null;
        };
        const choixExistants = new Set(
          champsExistants
            .filter(c => !c.source_id && c.label?.startsWith('Choix — '))
            .map(c => `${c.label}||${getFormuleFromConditions(c)}`)
        );
        // Pour les autres champs sans source_id : unicité par label
        const labelsExistantsSansSourceId = new Set(
          champsExistants
            .filter(c => !c.source_id && !c.label?.startsWith('Choix — '))
            .map(c => c.label)
        );

        const champsAajouter = champsAvecConditions.filter(c => {
          if (c.source_id) return !sourceIdsExistants.has(c.source_id);
          if (c.label?.startsWith('Choix — ')) {
            const key = `${c.label}||${getFormuleFromConditions(c)}`;
            return !choixExistants.has(key);
          }
          return !labelsExistantsSansSourceId.has(c.label);
        });

        // Trouver la position du pivot formule pour insérer les champs à choisir juste après
        const posPivotFormule = champsExistants.findIndex(c =>
          c.id === ID_FORMULE_CHOISIE ||
          c.id === 'f-pivot-formule' ||
          c.label === 'Quelle formule avez-vous choisie ?'
        );
        const insertAt = posPivotFormule >= 0 ? posPivotFormule + 1 : 2;
        champsExistants.splice(insertAt, 0, ...champsAajouter);
        const champsFinaux = champsExistants;
        await base44.entities.ModeleFormulaire.update(existingModele.id, { champs: champsFinaux });

        // ── Mettre à jour s_applique_a du CatalogueItem de la formule ──
        if (typesEvenementChoisis.length > 0) {
          const catalogueFormule = formulesCatalogue.find(f => f.nom === nomFormule);
          if (catalogueFormule) {
            const existants = catalogueFormule.s_applique_a || [];
            const fusionnes = [...new Set([...existants, ...typesEvenementChoisis])];
            await base44.entities.CatalogueItem.update(catalogueFormule.id, { s_applique_a: fusionnes });
            qc.invalidateQueries(['catalogue-tarifs-formules-pivot']);
          }
        }

        return champsAajouter.length;

      } else {
        // ── MODE DÉDIÉ : créer un nouveau formulaire ──────────────────────────
        const selectedQs = questionsFiltrees.filter(q => selectedQuestionIds.has(q.id) && q.etat !== 'archivee');
        const sortedQs = [...selectedQs].sort((a, b) => (a.ordre ?? 9999) - (b.ordre ?? 9999));
        const champs = buildChampsFromQuestions(sortedQs, menuItems, formulaName);
        const nomCible = isUniversel
          ? '🌐 Questionnaire universel'
          : `Questionnaire — ${formulaName || 'Catalogue'}${nameSuffix ? ` (${nameSuffix})` : ''}`;
        const champsFinaux = isUniversel ? sortChampsUniversel(champs) : champs;
        await base44.entities.ModeleFormulaire.create({ nom: nomCible, champs: champsFinaux });

        // ── Mettre à jour s_applique_a du CatalogueItem de la formule ──
        if (typesEvenementChoisis.length > 0) {
          const nomFormuleDedié = formulaName.split('—')[0].trim();
          const catalogueFormule = formulesCatalogue.find(f => f.nom === nomFormuleDedié);
          if (catalogueFormule) {
            const existants = catalogueFormule.s_applique_a || [];
            const fusionnes = [...new Set([...existants, ...typesEvenementChoisis])];
            await base44.entities.CatalogueItem.update(catalogueFormule.id, { s_applique_a: fusionnes });
            qc.invalidateQueries(['catalogue-tarifs-formules-pivot']);
          }
        }
      }
    },
    onSuccess: (nbAjoutes) => {
      if (isUniversel && existingModele) {
        const nomFormule = formulaName.split('—')[0].trim();
        const nomModele = existingModele.nom || 'votre questionnaire';
        if (nbAjoutes === 0) {
          toast({ title: '✓ Questionnaire déjà à jour', description: `Les questions de "${nomFormule}" sont déjà présentes dans "${nomModele}".` });
        } else {
          toast({ title: `✓ ${nbAjoutes} question${nbAjoutes > 1 ? 's' : ''} ajoutée${nbAjoutes > 1 ? 's' : ''}`, description: `Choix menu de "${nomFormule}" intégrés dans "${nomModele}".` });
        }
      } else {
        toast({ title: '✅ Questionnaire généré', description: isUniversel ? 'Questionnaire universel créé.' : `Questionnaire "${formulaName}" créé.` });
      }
      qc.invalidateQueries(['modeles-formulaire']);
      if (onGenerated) { onGenerated(); } else { onClose(); navigate('/bibliotheque'); }
    },
    onError: (error) => {
      toast({ title: '❌ Erreur', description: error.message || 'Veuillez réessayer.', variant: 'destructive' });
    },
  });

  const toggleQuestion = (questionId) => {
    const newSet = new Set(selectedQuestionIds);
    if (newSet.has(questionId)) newSet.delete(questionId); else newSet.add(questionId);
    setSelectedQuestionIds(newSet);
  };

  const grouped = CATEGORIES.reduce((acc, cat) => {
    const items = questionsFiltrees.filter(q => q.categorie === cat && q.etat !== 'archivee');
    if (items.length > 0) acc[cat] = items;
    return acc;
  }, {});

  const detectedSections = useMemo(() => {
    if (!menuItems.length || !formulaName) return [];
    const nomSeul = formulaName.split('—')[0].trim();
    const items = getArticlesForFormula(menuItems, nomSeul);
    return [...new Set(items.filter(i => i.a_choisir).map(i => i.categorie))];
  }, [menuItems, formulaName]);

  // ── Rendu selon l'étape ──
  if (isLoading || etape === 'loading' || etape === 'auto_generate' || generateModele.isPending) {
    const msg = (etape === 'auto_generate' || generateModele.isPending) ? 'Intégration des questions menu…' : 'Analyse du catalogue en cours…';
    return (
      <div className="fixed inset-0 z-50 bg-black/50 backdrop-blur-sm flex items-center justify-center p-4">
        <div className="bg-card rounded-2xl border border-border shadow-xl p-8">
          <AmandaProcessing size="md" message={msg} />
        </div>
      </div>
    );
  }

  if (etape === 'select_types') {
    return (
      <SelectTypesEvenementScreen
        formulaName={formulaName}
        onConfirm={handleConfirmTypes}
        onClose={onClose}
      />
    );
  }

  if (etape === 'confirm_choix') {
    return (
      <ConfirmChoixMultiplesScreen
        formulaName={formulaName}
        catsDisponibles={catsDisponibles}
        onConfirm={handleConfirmChoix}
        onClose={onClose}
      />
    );
  }

  // ── Écran questions ──
  return (
    <div className="fixed inset-0 z-50 bg-black/50 backdrop-blur-sm flex items-center justify-center p-4" onClick={onClose}>
      <div
        className="bg-card rounded-2xl border border-border shadow-xl w-full max-w-2xl flex flex-col"
        style={{ maxHeight: '90vh' }}
        onClick={e => e.stopPropagation()}
      >
        {/* Header */}
        <div className="flex items-center justify-between px-5 py-4 border-b border-border shrink-0">
          <div>
            <h2 className="font-bold text-base">📚 Sélectionner les questions</h2>
            <p className="text-xs text-muted-foreground mt-0.5">
              {selectedQuestionIds.size} question{selectedQuestionIds.size !== 1 ? 's' : ''} sélectionnée{selectedQuestionIds.size !== 1 ? 's' : ''}
              {isUniversel && typesEvenementChoisis.length > 0 && (
                <span className="ml-2 text-primary">· {typesEvenementChoisis.length} type{typesEvenementChoisis.length !== 1 ? 's' : ''}</span>
              )}
            </p>
          </div>
          <button onClick={onClose} className="p-1.5 rounded-lg hover:bg-muted text-muted-foreground shrink-0">
            <X size={16} />
          </button>
        </div>

        {/* Info pivot universel */}
        {isUniversel && (
          <div className="px-5 py-3 bg-primary/5 border-b border-primary/20 flex items-start gap-2.5 shrink-0">
            <Sparkles size={14} className="text-primary mt-0.5 shrink-0" />
            <p className="text-xs text-muted-foreground">
              <span className="font-semibold text-primary">Mode universel</span> — 2 champs pivots seront ajoutés automatiquement en tête :
              {typesEvenementChoisis.length > 1 && ' "Type d\'événement"'}{' '}
              + "Formule choisie". Chaque question sera conditionnée sur la formule <strong>{formulaName.split('—')[0].trim()}</strong>.
            </p>
          </div>
        )}

        {detectedSections.length > 0 && (
          <div className="px-5 py-3 bg-muted/40 border-b border-border flex items-start gap-2.5 shrink-0">
            <Sparkles size={14} className="text-primary mt-0.5 shrink-0" />
            <p className="text-xs text-muted-foreground">
              <span className="font-semibold text-primary">Pré-sélection intelligente</span> — Catégories : {detectedSections.join(', ')}.
            </p>
          </div>
        )}

        {/* Questions */}
        <div className="flex-1 overflow-y-auto p-4 space-y-4">
          {Object.entries(grouped).map(([cat, items]) => (
            <div key={cat}>
              <p className="text-xs font-semibold uppercase tracking-wider text-muted-foreground mb-2">{cat}</p>
              <div className="space-y-1.5">
                {items.map(q => {
                  const isSelected = selectedQuestionIds.has(q.id);
                  const isSuggested = suggestedIds.has(q.id);
                  const typesQ = q.types_evenements || [];
                  return (
                    <button
                      key={q.id}
                      onClick={() => toggleQuestion(q.id)}
                      disabled={generateModele.isPending}
                      className={`w-full flex items-center gap-3 px-3 py-2.5 rounded-lg border transition-all text-left ${
                        isSelected ? 'border-primary bg-primary/5' : 'border-border hover:bg-muted/50'
                      } disabled:opacity-50`}
                    >
                      <div className={`w-5 h-5 rounded-md border-2 flex items-center justify-center shrink-0 transition-all ${
                        isSelected ? 'bg-primary border-primary' : 'border-muted-foreground bg-transparent'
                      }`}>
                        {isSelected && <Check size={12} className="text-white" />}
                      </div>
                      <div className="flex-1 min-w-0">
                        <p className="text-sm font-medium truncate">{q.label}</p>
                        {q.description && <p className="text-xs text-muted-foreground truncate">{q.description}</p>}
                        {typesQ.length > 0 && (
                          <p className="text-[10px] text-muted-foreground mt-0.5">{typesQ.join(', ')}</p>
                        )}
                      </div>
                      {isSuggested && (
                        <span className="text-[10px] font-medium px-1.5 py-0.5 rounded-full bg-primary/10 text-primary shrink-0">✨ suggéré</span>
                      )}
                    </button>
                  );
                })}
              </div>
            </div>
          ))}
        </div>

        {/* Footer */}
        <div className="flex gap-2 justify-end px-5 pb-[110px] pt-4 border-t border-border shrink-0">
          <Button variant="outline" onClick={onClose} disabled={generateModele.isPending}>Annuler</Button>
          <Button onClick={() => generateModele.mutate()} disabled={selectedQuestionIds.size === 0 || generateModele.isPending}>
            {generateModele.isPending
              ? <><Loader2 size={14} className="animate-spin" /> Génération…</>
              : '✓ Générer le questionnaire'
            }
          </Button>
        </div>
      </div>
    </div>
  );
}