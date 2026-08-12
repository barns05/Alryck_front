import { useState, useRef, useEffect } from 'react';
import { useMutation, useQueryClient } from '@tanstack/react-query';
import { base44 } from '@/api/base44Client';
import { X, Upload, FileText, ChevronRight, RefreshCw, Check, Sparkles, AlertTriangle, Pencil, Plus, Trash2 } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { toast } from 'sonner';
import { createQuestionForOption } from '@/lib/optionQuestionSync';

const CONTENT_TYPES = [
  { id: 'formulaire', label: 'Formulaire de préparation', emoji: '📝', entity: 'ModeleFormulaire' },
  { id: 'menu', label: 'Menu et formule', emoji: '🍽️', entity: 'MenuCatalogue' },
  { id: 'programme', label: 'Programme de la journée', emoji: '📋', entity: 'ModeleProgramme' },
  { id: 'fiche_service', label: 'Fiche de service', emoji: '🗂️', entity: 'ModeleFicheService' },
  { id: 'options', label: 'Options et prestations', emoji: '🎯', entity: 'OptionPrestation' },
];

const ACCEPT = '.pdf,.jpg,.jpeg,.png,.docx,.xlsx';

function genId() { return Math.random().toString(36).slice(2, 9); }

// ─── Étape 1 : Upload ─────────────────────────────────────────────────────────
function StepUpload({ onFileSelected }) {
  const ref = useRef();
  const [dragging, setDragging] = useState(false);

  const handle = (file) => {
    if (!file) return;
    onFileSelected(file);
  };

  return (
    <div className="space-y-4">
      <div
        onDragOver={e => { e.preventDefault(); setDragging(true); }}
        onDragLeave={() => setDragging(false)}
        onDrop={e => { e.preventDefault(); setDragging(false); handle(e.dataTransfer.files[0]); }}
        onClick={() => ref.current?.click()}
        className={`border-2 border-dashed rounded-2xl p-10 flex flex-col items-center gap-3 cursor-pointer transition-colors
          ${dragging ? 'border-primary bg-primary/5' : 'border-border hover:border-primary/50 hover:bg-muted/50'}`}
      >
        <div className="w-14 h-14 rounded-2xl bg-primary/10 flex items-center justify-center">
          <Upload size={24} className="text-primary" />
        </div>
        <div className="text-center">
          <p className="font-semibold text-sm">Glissez votre document ici</p>
          <p className="text-xs text-muted-foreground mt-1">ou cliquez pour parcourir vos fichiers</p>
        </div>
        <p className="text-xs text-muted-foreground bg-muted px-3 py-1 rounded-full">
          PDF · JPG · PNG · DOCX · XLSX
        </p>
      </div>
      <input ref={ref} type="file" accept={ACCEPT} className="hidden" onChange={e => handle(e.target.files[0])} />
    </div>
  );
}

// ─── Étape 2 : Choisir le type ────────────────────────────────────────────────
function StepChooseType({ file, selectedType, onSelect, preselected }) {
  return (
    <div className="space-y-3">
      <div className="flex items-center gap-3 bg-muted/50 rounded-xl px-4 py-3">
        <FileText size={18} className="text-primary shrink-0" />
        <div className="min-w-0">
          <p className="text-sm font-medium truncate">{file.name}</p>
          <p className="text-xs text-muted-foreground">{(file.size / 1024).toFixed(0)} Ko</p>
        </div>
      </div>
      <p className="text-sm font-medium text-muted-foreground">Que souhaitez-vous créer à partir de ce document ?</p>
      <div className="space-y-2">
        {CONTENT_TYPES.map(ct => (
          <button
            key={ct.id}
            onClick={() => onSelect(ct.id)}
            disabled={preselected && ct.id !== preselected}
            className={`w-full flex items-center gap-3 px-4 py-3 rounded-xl border text-left transition-colors
              ${selectedType === ct.id ? 'border-primary bg-primary/5 text-primary' : 'border-border hover:border-primary/30 hover:bg-muted/40'}
              ${preselected && ct.id !== preselected ? 'opacity-40 cursor-not-allowed' : ''}`}
          >
            <span className="text-xl">{ct.emoji}</span>
            <span className="text-sm font-medium">{ct.label}</span>
            {selectedType === ct.id && <Check size={15} className="ml-auto text-primary shrink-0" />}
          </button>
        ))}
      </div>
    </div>
  );
}

// ─── Étape 3 : Analyse IA ─────────────────────────────────────────────────────
function StepAnalyse() {
  return (
    <div className="flex flex-col items-center gap-6 py-10">
      <div className="relative">
        <div className="w-20 h-20 rounded-full bg-primary/10 flex items-center justify-center">
          <Sparkles size={32} className="text-primary animate-pulse" />
        </div>
        <div className="absolute inset-0 rounded-full border-4 border-primary/30 animate-spin border-t-primary" />
      </div>
      <div className="text-center space-y-1">
        <p className="font-semibold text-base">Amanda analyse votre document…</p>
        <p className="text-sm text-muted-foreground">Extraction des informations en cours, merci de patienter.</p>
      </div>
    </div>
  );
}

// ─── Éditeur multi-formules (menu) ───────────────────────────────────────────
function MenuMultiEditor({ formules, onChange }) {
  const setFormule = (idx, updated) => onChange(formules.map((f, i) => i === idx ? updated : f));
  const setField = (idx, key, val) => setFormule(idx, { ...formules[idx], [key]: val });

  return (
    <div className="space-y-4">
      {formules.map((f, idx) => (
        <div key={idx} className="bg-card border border-border rounded-xl p-3 space-y-2">
          <div className="flex items-center justify-between gap-2">
            <span className="text-xs font-semibold text-primary bg-primary/10 px-2 py-0.5 rounded-full">Formule {idx + 1}</span>
            {formules.length > 1 && (
              <button onClick={() => onChange(formules.filter((_, i) => i !== idx))} className="p-1 rounded hover:bg-red-50 text-muted-foreground hover:text-red-500">
                <Trash2 size={12} />
              </button>
            )}
          </div>
          <FieldRow label="Nom" value={f.nom} onChange={v => setField(idx, 'nom', v)} />
          <div className="grid grid-cols-3 gap-2">
            <FieldRow label="Prix adulte (€)" value={f.prix_par_personne} onChange={v => setField(idx, 'prix_par_personne', v)} type="number" />
            <FieldRow label="Prix enfant (€)" value={f.prix_enfant} onChange={v => setField(idx, 'prix_enfant', v)} type="number" />
            <FieldRow label="Prix prestataire (€)" value={f.prix_prestataire} onChange={v => setField(idx, 'prix_prestataire', v)} type="number" />
          </div>
          <FieldRow label="Description" value={f.description} onChange={v => setField(idx, 'description', v)} />
          <ArrayEditor
            label="Éléments inclus"
            items={f.elements || []}
            onChange={els => setField(idx, 'elements', els)}
            renderItem={(el, i, onChg) => (
              <div className="flex-1 grid grid-cols-2 gap-2">
                <Input value={el.intitule || ''} onChange={e => onChg({ ...el, intitule: e.target.value })} placeholder="Intitulé" className="text-xs h-8" />
                <Input value={el.description || ''} onChange={e => onChg({ ...el, description: e.target.value })} placeholder="Description" className="text-xs h-8" />
              </div>
            )}
            newItem={() => ({ id: genId(), intitule: '', description: '', au_choix: false })}
          />
        </div>
      ))}
      <button
        onClick={() => onChange([...formules, { nom: '', prix_par_personne: null, elements: [], description: '' }])}
        className="w-full flex items-center justify-center gap-1.5 py-2 rounded-xl border-2 border-dashed border-border text-xs text-muted-foreground hover:border-primary hover:text-primary transition-colors"
      >
        <Plus size={12} /> Ajouter une formule
      </button>
    </div>
  );
}

// ─── Étape 4 : Validation formulaire ─────────────────────────────────────────
function StepValidate({ result, contentType, onValidate, onRestart, loading }) {
  const [data, setData] = useState(() => {
    // Pour les menus, normalise en tableau formules
    if (contentType === 'menu') {
      const formules = result.formules?.length
        ? result.formules
        : [{ nom: result.nom || '', prix_par_personne: result.prix_par_personne || null, prix_enfant: result.prix_enfant || null, prix_prestataire: result.prix_prestataire || null, description: result.description || '', elements: result.elements || [] }];
      return { ...result, formules };
    }
    return result;
  });

  const setField = (key, val) => setData(d => ({ ...d, [key]: val }));

  const nbFormules = contentType === 'menu' ? (data.formules?.length || 0) : null;

  // Formulaire d'affichage selon le type
  const renderEditor = () => {
    if (contentType === 'menu') {
      return (
        <div className="space-y-3">
          {nbFormules > 1 && (
            <div className="flex items-center gap-2 bg-blue-50 border border-blue-200 rounded-xl px-3 py-2">
              <Sparkles size={13} className="text-blue-600 shrink-0" />
              <p className="text-xs text-blue-800 font-medium">
                Amanda a détecté <strong>{nbFormules} formules</strong> — elles seront toutes créées dans la bibliothèque.
              </p>
            </div>
          )}
          {data.notes_generales && (
            <div className="bg-muted/50 rounded-xl px-3 py-2">
              <p className="text-xs text-muted-foreground"><span className="font-medium">Note générale :</span> {data.notes_generales}</p>
            </div>
          )}
          <MenuMultiEditor formules={data.formules || []} onChange={formules => setField('formules', formules)} />
        </div>
      );
    }
    if (contentType === 'programme') {
      return (
        <div className="space-y-3">
          <FieldRow label="Nom du modèle" value={data.nom} onChange={v => setField('nom', v)} />
          <FieldRow label="Type d'événement" value={data.type_evenement} onChange={v => setField('type_evenement', v)} />
          <ArrayEditor
            label="Étapes"
            items={data.etapes || []}
            onChange={etapes => setField('etapes', etapes)}
            renderItem={(e, idx, onChange) => (
              <div className="flex-1 grid grid-cols-2 gap-2">
                <Input value={e.nom || ''} onChange={ev => onChange({ ...e, nom: ev.target.value })} placeholder="Nom de l'étape" className="text-xs h-8" />
                <Input value={e.heure || ''} onChange={ev => onChange({ ...e, heure: ev.target.value })} placeholder="Heure (ex: 18:00)" className="text-xs h-8" />
              </div>
            )}
            newItem={() => ({ nom: '', heure: '', categorie: 'Autre' })}
          />
        </div>
      );
    }
    if (contentType === 'formulaire') {
      return (
        <div className="space-y-3">
          <FieldRow label="Nom du formulaire" value={data.nom} onChange={v => setField('nom', v)} />
          <FieldRow label="Type d'événement" value={data.type_evenement} onChange={v => setField('type_evenement', v)} />
          <ArrayEditor
            label="Champs"
            items={data.champs || []}
            onChange={champs => setField('champs', champs)}
            renderItem={(c, idx, onChange) => (
              <div className="flex-1 grid grid-cols-2 gap-2">
                <Input value={c.label || ''} onChange={e => onChange({ ...c, label: e.target.value })} placeholder="Label du champ" className="text-xs h-8" />
                <select value={c.type || 'texte'} onChange={e => onChange({ ...c, type: e.target.value })} className="text-xs h-8 border border-input rounded-md px-2 bg-transparent">
                  {['texte', 'nombre', 'cases_a_cocher', 'choix_unique', 'liste', 'date', 'upload'].map(t => <option key={t} value={t}>{t}</option>)}
                </select>
              </div>
            )}
            newItem={() => ({ id: genId(), label: '', type: 'texte', obligatoire: false })}
          />
        </div>
      );
    }
    if (contentType === 'fiche_service') {
      return (
        <div className="space-y-3">
          <FieldRow label="Nom de la fiche" value={data.nom} onChange={v => setField('nom', v)} />
          {data.notes_generales && (
            <div className="space-y-1">
              <label className="text-xs font-medium text-muted-foreground">Contenu extrait</label>
              <div className="bg-muted/50 rounded-xl px-3 py-2 text-xs text-muted-foreground whitespace-pre-wrap max-h-40 overflow-y-auto">{data.notes_generales}</div>
            </div>
          )}
        </div>
      );
    }
    if (contentType === 'options') {
      const opts = data.options || [];
      return (
        <div className="space-y-3">
          <div className="flex items-center gap-2 bg-blue-50 border border-blue-200 rounded-xl px-3 py-2">
            <Sparkles size={13} className="text-blue-600 shrink-0" />
            <p className="text-xs text-blue-800 font-medium">
              Amanda a détecté <strong>{opts.length} option{opts.length !== 1 ? 's' : ''}</strong> — elles seront toutes créées.
            </p>
          </div>
          <div className="space-y-2 max-h-60 overflow-y-auto">
            {opts.map((opt, i) => (
              <div key={i} className="bg-card border border-border rounded-lg px-3 py-2 text-xs space-y-0.5">
                <p className="font-semibold">{opt.nom}</p>
                <div className="flex flex-wrap gap-2 text-muted-foreground">
                  <span>{opt.categorie}</span>
                  {opt.prix > 0 && <span>· {opt.prix} € {opt.unite ? `(${opt.unite})` : ''}</span>}
                  {opt.allergenes?.length > 0 && <span>· ⚠️ {opt.allergenes.length} allergène(s)</span>}
                </div>
                {opt.description && <p className="text-muted-foreground">{opt.description}</p>}
              </div>
            ))}
          </div>
        </div>
      );
    }
    return <pre className="text-xs bg-muted p-3 rounded-xl overflow-auto max-h-60">{JSON.stringify(data, null, 2)}</pre>;
  };

  const btnLabel = contentType === 'menu' && nbFormules > 1
    ? `Valider et créer ${nbFormules} formules`
    : 'Valider et créer';

  return (
    <div className="space-y-4">
      <div className="flex items-center gap-2 text-emerald-600 bg-emerald-50 border border-emerald-200 rounded-xl px-4 py-2.5">
        <Check size={15} className="shrink-0" />
        <p className="text-sm font-medium">Amanda a analysé votre document avec succès !</p>
      </div>
      <p className="text-sm text-muted-foreground">Vérifiez et ajustez les informations extraites avant de valider :</p>
      <div className="bg-muted/30 rounded-2xl border border-border p-4 max-h-80 overflow-y-auto">
        {renderEditor()}
      </div>
      <div className="flex gap-2 pt-1">
        <Button variant="outline" size="sm" className="gap-1.5 flex-1" onClick={onRestart}>
          <RefreshCw size={13} /> Recommencer
        </Button>
        <Button size="sm" className="gap-1.5 flex-1" disabled={loading} onClick={() => onValidate(data)}>
          {loading ? <div className="w-3 h-3 border-2 border-white border-t-transparent rounded-full animate-spin" /> : <Check size={13} />}
          {btnLabel}
        </Button>
      </div>
    </div>
  );
}

// ─── Helpers UI ───────────────────────────────────────────────────────────────
function FieldRow({ label, value, onChange, type = 'text' }) {
  return (
    <div className="space-y-1">
      <label className="text-xs font-medium text-muted-foreground">{label}</label>
      <Input type={type} value={value || ''} onChange={e => onChange(e.target.value)} className="text-sm" />
    </div>
  );
}

function ArrayEditor({ label, items, onChange, renderItem, newItem }) {
  return (
    <div className="space-y-2">
      <div className="flex items-center justify-between">
        <label className="text-xs font-medium text-muted-foreground">{label} ({items.length})</label>
        <button onClick={() => onChange([...items, newItem()])} className="text-xs text-primary hover:underline flex items-center gap-1">
          <Plus size={11} /> Ajouter
        </button>
      </div>
      {items.map((item, idx) => (
        <div key={item.id || idx} className="flex items-center gap-2">
          {renderItem(item, idx, (updated) => onChange(items.map((it, i) => i === idx ? updated : it)))}
          <button onClick={() => onChange(items.filter((_, i) => i !== idx))} className="p-1 hover:bg-red-50 text-muted-foreground hover:text-red-500 rounded shrink-0">
            <Trash2 size={12} />
          </button>
        </div>
      ))}
    </div>
  );
}

// ─── Modal principal ──────────────────────────────────────────────────────────
export default function ImportDocumentModal({ onClose, preselectedType, onCreated, initialFile }) {
  const qc = useQueryClient();
  const [step, setStep] = useState(initialFile ? (preselectedType ? 3 : 2) : 1);
  const [file, setFile] = useState(initialFile || null);
  const [contentType, setContentType] = useState(preselectedType || null);
  const [result, setResult] = useState(null);
  const [saving, setSaving] = useState(false);

  const STEPS = ['Upload', 'Type', 'Analyse', 'Validation'];

  const handleFileSelected = (f) => {
    setFile(f);
    setStep(2);
  };

  // Auto-lancer l'analyse si on arrive avec initialFile + preselectedType
  useEffect(() => {
    if (initialFile && preselectedType && step === 3 && !result) {
      handleLaunchAnalysis();
    }
  }, []); // eslint-disable-line react-hooks/exhaustive-deps

  const handleLaunchAnalysis = async () => {
    if (!contentType) return;
    setStep(3);

    try {
      // Upload du fichier
      const { file_url } = await base44.integrations.Core.UploadFile({ file });

      // Prompt selon le type
      const typeInfo = CONTENT_TYPES.find(t => t.id === contentType);
      const prompts = {
        formulaire: `Analyse ce document et extrait un formulaire de préparation d'événement. Retourne un JSON avec: nom (string), type_evenement (string, l'un de: Mariage, Baptême, Anniversaire, Soirée d'entreprise, Cocktail, Gala, Autre), champs (array d'objets avec: id(string aléatoire), label(string), type(string: texte|nombre|cases_a_cocher|choix_unique|liste|date|upload), obligatoire(boolean), options(array de strings si choix_unique ou cases_a_cocher)).`,
        menu: `Analyse ce document (brochure, carte, tarif) et extrait TOUTES les formules/menus présents. Pour chaque formule, identifie: le nom, le prix par personne adulte, la description, la liste complète des plats et services inclus (apéritif, entrée, plat, dessert, café, etc.), les animations incluses ou optionnelles, les tarifs enfants et prestataires si mentionnés, les options disponibles. Retourne un JSON avec: formules (array d'objets avec: nom(string), prix_par_personne(number|null), prix_enfant(number|null), prix_prestataire(number|null), description(string), elements(array d'objets avec id(string aléatoire), intitule(string), description(string), au_choix(boolean))). Si une seule formule, retournes-en une dans le tableau. Extrait aussi: notes_generales(string) pour toute info générale sur la brochure.`,
        programme: `Analyse ce document et extrait un programme de journée complet. Retourne un JSON avec: nom (string), type_evenement (string), etapes (array d'objets avec: nom(string), heure(string format HH:MM), intitule(string), duree_heures(number), duree_minutes(number), categorie(string: Cérémonie|Cocktail|Repas|Animation|Logistique|Accueil|Autre)).`,
        fiche_service: `Analyse ce document (fiche de service, briefing, note d'instructions) et extrait toutes les informations de service. Retourne un JSON avec: nom (string, titre de la fiche), type (string: generale|salle|cuisine|prestataires|custom), destinataires (array de strings parmi: extras_salle, extras_cuisine, prestataires, responsable_soir, tous), notes_generales(string, contenu principal de la fiche).`,
        options: `Analyser ce document qui présente des options et prestations proposées par un professionnel de l'événementiel. Extraire TOUTES les options et prestations disponibles.

Retourner UNIQUEMENT un JSON valide avec cette structure :
{
  "options": [
    {
      "nom": "Nom de l'option",
      "categorie": "Animations|Son & Lumières|Décoration|Location Matériel|Prestataires externes|Animations culinaires|Autre",
      "prix": 150,
      "unite": "Par personne|Par heure|Par unité|Forfait",
      "description": "Description courte",
      "allergenes": ["gluten", "lait"]
    }
  ]
}

Règles :
- Extraire CHAQUE option individuellement — ne jamais regrouper
- Si plusieurs tarifs pour une même option → créer une entrée par tarif
- Détecter les allergènes si l'option est alimentaire
- Si prix par personne → unite: "Par personne"
- Si prix fixe → unite: "Forfait"`,
      };

      const schema = {
        type: 'object',
        properties: { result: { type: 'object' } },
      };

      const schemasParType = {
        options: {
          type: 'object',
          properties: {
            options: {
              type: 'array',
              items: {
                type: 'object',
                properties: {
                  nom: { type: 'string' },
                  categorie: { type: 'string' },
                  prix: { type: 'number' },
                  unite: { type: 'string' },
                  description: { type: 'string' },
                  allergenes: { type: 'array', items: { type: 'string' } },
                },
              },
            },
          },
        },
        default: {
          type: 'object',
          properties: {
            nom: { type: 'string' },
            type_evenement: { type: 'string' },
            description: { type: 'string' },
            prix_par_personne: { type: 'number' },
            prix: { type: 'number' },
            categorie: { type: 'string' },
            type_prix: { type: 'string' },
            elements: { type: 'array', items: { type: 'object' } },
            etapes: { type: 'array', items: { type: 'object' } },
            champs: { type: 'array', items: { type: 'object' } },
            destinataires: { type: 'array', items: { type: 'string' } },
            type: { type: 'string' },
            formules: { type: 'array', items: { type: 'object' } },
            notes_generales: { type: 'string' },
            prix_enfant: { type: 'number' },
            prix_prestataire: { type: 'number' },
          },
        },
      };

      const response = await base44.integrations.Core.InvokeLLM({
        prompt: prompts[contentType],
        file_urls: [file_url],
        response_json_schema: schemasParType[contentType] || schemasParType.default,
      });

      // Validation selon le type
      if (contentType === 'options') {
        if (!response?.options?.length) { setStep('error'); return; }
      } else if (!response || (!response.nom && !response.formules?.length)) {
        setStep('error');
        return;
      }

      setResult(response);
      setStep(4);
    } catch (e) {
      console.error(e);
      toast.error(`Amanda : ${e.message || 'Erreur lors de l\'analyse'}`);
      setStep('error');
    }
  };

  const handleValidate = async (data) => {
    setSaving(true);
    try {
      const typeInfo = CONTENT_TYPES.find(t => t.id === contentType);
      const entityName = typeInfo.entity;

      const queryMap = {
        formulaire: 'modeles-formulaire',
        menu: 'menus-catalogue',
        programme: 'modeles-programme',
        fiche_service: 'modeles-fiche-service',
        options: 'options-prestations',
      };

      // Cas spécial : options multi (liste)
      if (contentType === 'options' && data.options?.length > 0) {
        const createdOpts = await Promise.all(data.options.map(opt => base44.entities.OptionPrestation.create({
          nom: opt.nom || 'Option sans nom',
          categorie: opt.categorie || 'Autre',
          prix: opt.prix ? parseFloat(opt.prix) : undefined,
          unite: opt.unite || 'Forfait',
          description: opt.description || '',
          allergenes: opt.allergenes || [],
          actif: true,
        })));
        // Créer les questions correspondantes dans la bibliothèque
        Promise.all(createdOpts.map(opt => createQuestionForOption(opt))).catch(() => {});
        qc.invalidateQueries(['options-prestations']);
        onCreated?.();
        onClose();
        return;
      }

      // Cas spécial : menu multi-formules
      if (contentType === 'menu' && data.formules?.length > 0) {
        await Promise.all(data.formules.map(f => {
          const payload = {
            nom: f.nom || 'Formule sans nom',
            prix_par_personne: f.prix_par_personne ? parseFloat(f.prix_par_personne) : null,
            description: f.description || '',
            elements: (f.elements || []).map(e => ({ ...e, id: e.id || genId() })),
            actif: true,
            mode_creation: 'amanda',
          };
          // Stocker prix enfant/prestataire dans notes si présents
          const extras = [];
          if (f.prix_enfant) extras.push(`Enfant : ${f.prix_enfant} €`);
          if (f.prix_prestataire) extras.push(`Prestataire : ${f.prix_prestataire} €`);
          if (extras.length) payload.description = [payload.description, extras.join(' | ')].filter(Boolean).join(' — ');
          return base44.entities.MenuCatalogue.create(payload);
        }));
        qc.invalidateQueries(['menus-catalogue']);
        onCreated?.();
        onClose();
        return;
      }

      // Cas standard
      let payload = { ...data };
      if (contentType === 'formulaire') {
        payload.champs = (payload.champs || []).map(c => ({ ...c, id: c.id || genId() }));
      }
      if (contentType === 'menu') {
        payload.elements = (payload.elements || []).map(e => ({ ...e, id: e.id || genId() }));
        if (payload.prix_par_personne) payload.prix_par_personne = parseFloat(payload.prix_par_personne);
        payload.actif = true;
        payload.mode_creation = 'amanda';
      }
      if (contentType === 'options') {
        if (payload.prix) payload.prix = parseFloat(payload.prix);
        payload.actif = true;
      }
      if (contentType === 'programme') {
        payload.etapes = (payload.etapes || []).map(e => ({ ...e }));
      }
      if (contentType === 'fiche_service') {
        // Stocker les notes générales extraites dans un champ texte
        payload.actif = true;
      }

      await base44.entities[entityName].create(payload);
      qc.invalidateQueries([queryMap[contentType]]);
      onCreated?.();
      onClose();
    } catch (e) {
      console.error(e);
    } finally {
      setSaving(false);
    }
  };

  const handleRestart = () => {
    setFile(null);
    setContentType(preselectedType || null);
    setResult(null);
    setStep(1);
  };

  const stepNum = step === 'error' ? null : step;

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 backdrop-blur-sm p-4">
      <div className="bg-card rounded-2xl border border-border shadow-2xl w-full max-w-lg flex flex-col max-h-[90vh]">
        {/* Header */}
        <div className="flex items-center justify-between px-6 py-4 border-b border-border shrink-0">
          <div className="flex items-center gap-2">
            <div className="w-8 h-8 rounded-lg bg-primary/10 flex items-center justify-center">
              <Sparkles size={16} className="text-primary" />
            </div>
            <div>
              <p className="font-semibold text-sm">Importer un document</p>
              <p className="text-xs text-muted-foreground">Amanda analyse et structure automatiquement</p>
            </div>
          </div>
          <button onClick={onClose} className="p-1.5 rounded-lg hover:bg-muted text-muted-foreground">
            <X size={16} />
          </button>
        </div>

        {/* Indicateur d'étapes */}
        {stepNum && (
          <div className="px-6 py-3 border-b border-border shrink-0">
            <div className="flex items-center gap-1">
              {STEPS.map((s, i) => (
                <div key={s} className="flex items-center gap-1 flex-1">
                  <div className={`flex items-center justify-center w-6 h-6 rounded-full text-xs font-bold transition-colors
                    ${i + 1 < stepNum ? 'bg-emerald-500 text-white' : i + 1 === stepNum ? 'bg-primary text-primary-foreground' : 'bg-muted text-muted-foreground'}`}>
                    {i + 1 < stepNum ? <Check size={11} /> : i + 1}
                  </div>
                  <span className={`text-xs ${i + 1 === stepNum ? 'text-foreground font-medium' : 'text-muted-foreground'}`}>{s}</span>
                  {i < STEPS.length - 1 && <ChevronRight size={12} className="text-muted-foreground ml-auto mr-1 shrink-0" />}
                </div>
              ))}
            </div>
          </div>
        )}

        {/* Contenu */}
        <div className="p-6 overflow-y-auto flex-1">
          {step === 1 && <StepUpload onFileSelected={handleFileSelected} />}
          {step === 2 && (
            <StepChooseType
              file={file}
              selectedType={contentType}
              onSelect={setContentType}
              preselected={preselectedType}
            />
          )}
          {step === 3 && <StepAnalyse />}
          {step === 4 && (
            <StepValidate
              result={result}
              contentType={contentType}
              onValidate={handleValidate}
              onRestart={handleRestart}
              loading={saving}
            />
          )}
          {step === 'error' && (
            <div className="flex flex-col items-center gap-5 py-8">
              <div className="w-14 h-14 rounded-full bg-amber-50 border border-amber-200 flex items-center justify-center">
                <AlertTriangle size={24} className="text-amber-500" />
              </div>
              <div className="text-center space-y-1">
                <p className="font-semibold">Amanda n'a pas pu analyser ce document.</p>
                <p className="text-sm text-muted-foreground">Le contenu n'a pas pu être extrait automatiquement.</p>
              </div>
              <div className="flex gap-2 w-full">
                <Button variant="outline" className="flex-1 gap-1.5" onClick={handleRestart}>
                  <RefreshCw size={13} /> Recommencer
                </Button>
                <Button className="flex-1 gap-1.5" onClick={onClose}>
                  <Pencil size={13} /> Créer manuellement
                </Button>
              </div>
            </div>
          )}
        </div>

        {/* Footer étape 2 */}
        {step === 2 && (
          <div className="px-6 pb-5 shrink-0">
            <Button
              className="w-full gap-2"
              disabled={!contentType}
              onClick={handleLaunchAnalysis}
            >
              <Sparkles size={15} /> Lancer l'analyse IA
            </Button>
          </div>
        )}
      </div>
    </div>
  );
}