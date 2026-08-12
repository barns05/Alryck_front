/*
 * BrochureImportModal — Modale d'import IA unifiée
 * Utilisable pour le Catalogue (multi-fichiers, CatalogueItem) et Options & Prestations (OptionPrestation)
 * Props:
 *   preselectedType: 'catalogue' | 'options' | null
 *   initialFiles: File[] (pré-chargés depuis CreerModal)
 *   onClose, onCreated
 */
import { useState, useRef, useCallback, useEffect, useMemo } from 'react';
import { useQueryClient } from '@tanstack/react-query';
import { base44 } from '@/api/base44Client';
import * as XLSX from 'xlsx';
import { X, Upload, Check, ChevronDown, ChevronUp, AlertCircle, Sparkles, Pencil, Trash2 } from 'lucide-react';
import AmandaMessage from '@/components/AmandaMessage';
import AmandaProcessing from '@/components/AmandaProcessing';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { useToast } from '@/components/ui/use-toast';
import { createQuestionForOption } from '@/lib/optionQuestionSync';
import ValidationAmandaModal from './ValidationAmandaModal';
import LoadingCristal from '@/components/LoadingCristal';

// ─── Avatar Amanda (base64 tronqué → fallback emoji) ──────────────────────────
const AMANDA_AVATAR = "data:image/png;base64,iVBORw0KGgoAAAANSUhEUgAAAFAAAABQCAIAAAABc2X6AAAq3klEQVR42uV8d5hd1XXvWnvvc8495/bpVZpRRxUhUQQCRBHFGMcxNjjGTkziRgzOs57nPJ7jkLjg2CGx4zw/B8e949iAG00IAhgV1OtoZjSSRpo+c3s5be+93h93JI0a4JfvS/K+d74p35y9987+ndV+qw1qreH/p4f4L3IOIiAgAEDE6SszPvH05f/HARMBADBWw3MSE2kAAERAPHVREQER+3fjFv95UAkRGUMC8F3f8/yCJyfdMBdQMVCeJDSELaAxIlocoz1uRhwLkAGA0sT+HajxP96GCQABEDEIValULla8w2XY5lo9vjVYFfmAB4BKgdaAoC2moiLs5sGVieD6bagPm7ZEQLQWv/fSfs/GjARMcaUhmw2V6hUd2Wtx084G4aMqRKCBGBgRpBHEE3kDjIBEIAKQVnAK7RSlN65sLy21VzcnhSGIZXmv7us/0MB19CWK+5UNrtj0vjnXc5zfdKx9Pw21t7CnQTDCFfIKi7kK5CtQr6KRclUyKJKQwoLo1ifd29bWemIBO9fFetqS0oNCPqkS6PTXuC/AuAa2mw21zNc/MGh5PP9amkXW7fKiLaYEyEbK7J8GaougAbBgAmwDFJaj0/p/jEYHYSwqoxZwh3RMFxY2E3VgvuNt1nrL2sCJn4nw/4PAqyJOGOjE5mNh/Ibx+rn1ZvvulIcM4xfHIb9xyBXBI+AAJgBzCDGUSMggmViLEqORbKqBg74R/okj5uYqYaVaqJRLOwO11/ElsT4DZ3xpoa4JsL/IoBraAdHp545kDOSTW9bbDtR8/P76dmjIDk5SSQLlCbSwBADCb4CwSEiICRJD3RIlgmJuK5MBHt2ycJU0GKX2hcmIWrH0qJrFrVT8QYKrp3fQoz95wOuoT0+lnty98jVF89Z0mJvK9Fn9lBZQboBlICKCyQRCTwFoYZUhNocYi5kJ2B4ggoVCDySrpaBihoyEvH7D/sqJGk6XBAHNnu29ba3RFc3llrGSmvmNjPO/jMBEwFjWCy7j73Ue/vVi+vjZp+nvzsFvsRxoKoHFQ+EQIlQ9aDVUvPSGFZwcBCGclAm0BZoBqRB+xRUoDwi1fFC82IWCGNyXJebYm2zxdSQ9Kbo4zcZf3GJNzaYXTKvDQheI2D9DoDfkBM85yVa6e29I2pW46XxSCZUGli7ARvL9LnjkNTATKwgJEivSwMCvDzIxksAFhAHIpIKpAalQWnQgJWczhWhaSFPAzQawViP2+dF3nyd5Zb1Mzv0R5eL+xYVp/Lhos56rfWFuOgbBVyjflSjgm9YvMiwZ2D0WGOykHCMvAKJb2/A3gA2FvWYhz0elkO9xqG3NuMTebZ9FNpiVAQouRiGoBUFCqSCUAMBkoKQw0ee2x9I+t66JWaKL2um2EDl2SH80G3ODWm45zG9bCG/ODbxzoZ4NG7TBXwYf/DBB9/I6QNFgVQGZ29QzrUgNDZZOCbM3vpY34j82laeZ3jAgx+M09oUOgYVXXVngj7YwXsU7ivBnR3gGTBahlChYAQMNAAwSDrAOCiLdY7kvvCtl1YfGV85Mrn74s6SyS9ZYM0Jgx/0QbpeFE14bAvZHRbPTS1uSugLKPbrA9YEjOErefmzw8HVraZ+TQs59WCMVVz/WLayJV034aonX2ChhAzDPRMQEfjbPBQr8t2d7KZ6sc+D32bp+jSui+I1DoIJOYKAUCMqxNVNUFEwP0bHDHb99p61u8a85pZZXnXWUL53TU";

import { CATEGORIES_16, ALLERGENES_14, normalizeAllergen } from '@/constants/catalogue';

const CATEGORIES_MAP = { 'Apéritif':'Apéritif','Entrée':'Entrée','Plat':'Plat','Dessert':'Dessert','Boissons':'Boissons','Inclusions':'Services inclus','Services inclus':'Services inclus','Autre':'Autre' };

const TYPES = [
  { id: 'catalogue', label: 'Formules & Menus (formules & articles)', emoji: '🍽️', desc: 'Brochure, menu multi-formules, carte complète' },
  { id: 'options', label: 'Options & Prestations', emoji: '🎯', desc: 'Animations, décoration, son, matériel…' },
  { id: 'materiel', label: 'Matériel & Logistique', emoji: '📦', desc: 'Liste de matériel, vaisselle, mobilier…' },
];

const STEPS = ['Upload', 'Questionnaire', 'Analyse', 'Validation'];

const NB_FORMULES_OPTIONS = [
  { id: '1', label: '1 seule formule' },
  { id: '2-5', label: '2 à 5 formules' },
  { id: '5+', label: 'Plus de 5 formules' },
];
const STRUCTURE_OPTIONS = [
  { id: 'menu-complet', label: 'Un menu complet sur plusieurs pages' },
  { id: 'menus-distincts', label: 'Plusieurs menus distincts' },
  { id: 'brochure', label: 'Une brochure commerciale complète' },
];

const NB_ARTICLES_OPTIONS = [
  { id: 'peu', label: 'Moins de 20 articles' },
  { id: 'moyen', label: '20 à 50 articles' },
  { id: 'beaucoup', label: 'Plus de 50 articles' },
];
const STRUCTURE_MATERIEL_OPTIONS = [
  { id: 'liste', label: 'Une liste simple (une colonne)' },
  { id: 'tableau', label: 'Un tableau avec plusieurs colonnes' },
  { id: 'document', label: 'Un document texte ou PDF' },
];

// ─── Stepper ──────────────────────────────────────────────────────────────────
function Stepper({ currentStep }) {
  const activeIdx = currentStep - 1;

  return (
    <div className="flex items-center px-6 py-3 border-b border-border shrink-0 gap-1">
      {STEPS.map((s, i) => {
        const done = i < activeIdx;
        const active = i === activeIdx;
        return (
          <div key={s} className="flex items-center gap-1 flex-1 min-w-0">
            <div className={`shrink-0 w-6 h-6 rounded-full flex items-center justify-center text-xs font-bold transition-colors
              ${done ? 'bg-emerald-500 text-white' : active ? 'bg-primary text-primary-foreground' : 'bg-muted text-muted-foreground'}`}>
              {done ? <Check size={11} /> : i + 1}
            </div>
            <span className={`text-xs truncate ${active ? 'text-foreground font-medium' : 'text-muted-foreground'}`}>{s}</span>
            {i < STEPS.length - 1 && <div className="flex-1 h-px bg-border mx-1 shrink-0" />}
          </div>
        );
      })}
    </div>
  );
}

const MAX_FILE_SIZE = 20 * 1024 * 1024; // 20 MB
const ALLOWED_MIME_TYPES = new Set([
  'application/pdf',
  'image/jpeg', 'image/png', 'image/webp',
  'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet', // xlsx
  'application/vnd.ms-excel', // xls
  'application/vnd.oasis.opendocument.spreadsheet', // ods
  'text/csv', 'text/plain', 'application/csv',
]);

// ─── Étape 1 : Upload multi-fichiers ─────────────────────────────────────────
function StepUpload({ files, setFiles, instructions, setInstructions, onNext, onClose }) {
  const fileRef = useRef();
  const [dragging, setDragging] = useState(false);
  const { toast } = useToast();

  const validateAndAddFiles = useCallback((list) => {
    if (!list?.length) return;
    const valid = [];
    for (const file of Array.from(list)) {
      if (file.size > MAX_FILE_SIZE) {
        toast({ title: '❌ Fichier trop lourd', description: `${file.name} dépasse 20 Mo`, variant: 'destructive' });
        continue;
      }
      // Vérifier type MIME (avec fallback extension pour les tableurs)
      const ext = file.name.split('.').pop().toLowerCase();
      const extAllowed = ['pdf', 'jpg', 'jpeg', 'png', 'webp', 'xlsx', 'xls', 'ods', 'csv'].includes(ext);
      if (!ALLOWED_MIME_TYPES.has(file.type) && !extAllowed) {
        toast({ title: '❌ Format non supporté', description: `${file.name} — utilisez PDF, image ou tableur`, variant: 'destructive' });
        continue;
      }
      valid.push(file);
    }
    if (valid.length) setFiles(prev => [...prev, ...valid]);
  }, [setFiles, toast]);

  const addFiles = useCallback((list) => {
    validateAndAddFiles(list);
  }, [validateAndAddFiles]);

  return (
    <div className="flex flex-col flex-1 min-h-0">
      <div className="flex-1 overflow-y-auto p-6 space-y-4">
        <div
          onDragOver={e => { e.preventDefault(); setDragging(true); }}
          onDragLeave={() => setDragging(false)}
          onDrop={e => { e.preventDefault(); setDragging(false); addFiles(e.dataTransfer.files); }}
          onClick={() => fileRef.current?.click()}
          className={`border-2 border-dashed rounded-2xl py-10 px-4 flex flex-col items-center gap-3 cursor-pointer transition-colors
            ${dragging ? 'border-primary bg-primary/5' : files.length > 0 ? 'border-primary/50 bg-primary/5' : 'border-border hover:border-primary/50 hover:bg-muted/30'}`}
        >
          <input
            ref={fileRef}
            type="file"
            accept=".pdf,.jpg,.jpeg,.png,.webp,.xlsx,.xls,.ods,.csv"
            multiple
            className="hidden"
            onChange={e => addFiles(e.target.files)}
          />
          <div className="w-14 h-14 rounded-2xl bg-primary/10 flex items-center justify-center">
            <Upload size={24} className={files.length > 0 ? 'text-primary' : 'text-muted-foreground'} />
          </div>
          <div className="text-center">
            <p className="text-sm font-semibold">
              {files.length > 0 ? `${files.length} fichier${files.length > 1 ? 's' : ''} sélectionné${files.length > 1 ? 's' : ''}` : 'Glissez vos fichiers ici'}
            </p>
            <p className="text-xs text-muted-foreground mt-1">PDF, JPG, PNG, WebP, Excel (.xlsx, .xls), ODS, CSV — multi-sélection autorisée</p>
          </div>
        </div>

        {files.length > 0 && (
          <div className="space-y-2">
            <p className="text-xs font-medium text-muted-foreground uppercase tracking-wide">Fichiers à analyser</p>
            <div className="space-y-1.5 max-h-48 overflow-y-auto">
              {files.map((f, idx) => (
                <div key={idx} className="flex items-center gap-2 px-3 py-2 bg-muted/30 rounded-lg border border-border/50">
                  <span className="text-base shrink-0">{f.type === 'application/pdf' ? '📄' : '🖼️'}</span>
                  <div className="flex-1 min-w-0">
                    <p className="text-xs font-medium truncate">{f.name}</p>
                    <p className="text-[10px] text-muted-foreground">{(f.size / 1024 / 1024).toFixed(1)} Mo</p>
                  </div>
                  <button onClick={() => setFiles(prev => prev.filter((_, i) => i !== idx))}
                    className="p-1 rounded hover:bg-red-50 text-muted-foreground hover:text-red-600 shrink-0">
                    <X size={13} />
                  </button>
                </div>
              ))}
            </div>
            <button onClick={() => fileRef.current?.click()}
              className="w-full text-xs py-1.5 text-primary hover:bg-primary/10 rounded-lg border border-primary/20 transition-colors font-medium">
              + Ajouter plus de fichiers
            </button>
          </div>
        )}
      </div>
      <div
        className="shrink-0 bg-card flex gap-2 justify-end px-6 py-4 border-t border-border"
        style={{ paddingBottom: 'calc(env(safe-area-inset-bottom, 16px) + 16px)' }}
      >
        <Button variant="outline" onClick={onClose}>Annuler</Button>
        <Button onClick={onNext} disabled={files.length === 0}>Suivant</Button>
      </div>
    </div>
  );
}

const TYPES_SERVICE_OPTIONS = [
  { id: 'repas_assis', label: 'Repas assis à table' },
  { id: 'cocktail_buffet', label: 'Cocktail / Buffet debout' },
  { id: 'animations', label: 'Animations / Ateliers culinaires' },
  { id: 'vin_honneur', label: "Vin d'honneur / Apéritif" },
  { id: 'mises_en_bouche', label: 'Mises en bouche' },
];

const CHOIX_PLATS_OPTIONS = [
  { id: 'au_choix', label: 'Au choix parmi plusieurs options' },
  { id: 'menu_fixe', label: 'Menu fixe inclus automatiquement' },
  { id: 'mixte', label: 'Mixte (certains au choix)' },
];

const CHOIX_DESSERT_OPTIONS = [
  { id: 'oui', label: 'Oui, le client choisit parmi plusieurs desserts ou parfums' },
  { id: 'non', label: 'Non, le dessert est fixe' },
];

// ─── Étape 2 : Questionnaire ──────────────────────────────────────────────────
function StepQuestionnaire({ nbFormules, setNbFormules, structure, setStructure, instructions, setInstructions, typesService, setTypesService, choixPlats, setChoixPlats, choixDessert, setChoixDessert, onNext, onBack, type }) {
  const isMateriel = type === 'materiel';
  const isCatalogue = type === 'catalogue';
  const nbOptions = isMateriel ? NB_ARTICLES_OPTIONS : NB_FORMULES_OPTIONS;
  const structOptions = isMateriel ? STRUCTURE_MATERIEL_OPTIONS : STRUCTURE_OPTIONS;
  const q1 = isMateriel ? "Combien d'articles contient ce document ?" : 'Combien de formules contient ce document ?';
  const q2 = 'Comment est structuré ce document ?';

  const toggleService = (id) => {
    setTypesService(prev =>
      prev.includes(id) ? prev.filter(s => s !== id) : [...prev, id]
    );
  };

  const hasRepasAssis = typesService.includes('repas_assis');

  return (
    <div className="flex flex-col flex-1 min-h-0">
      <div className="flex-1 overflow-y-auto p-6 space-y-5">
        <div className="space-y-2.5">
          <p className="text-sm font-semibold">{q1}</p>
          <div className="flex flex-col gap-2">
            {nbOptions.map(opt => (
              <button key={opt.id} onClick={() => setNbFormules(opt.id)}
                className={`w-full text-left px-4 py-2.5 rounded-xl border text-sm font-medium transition-colors
                  ${nbFormules === opt.id ? 'border-primary bg-primary/5 text-primary' : 'border-border hover:border-primary/40 hover:bg-muted/40'}`}>
                {opt.label}
              </button>
            ))}
          </div>
        </div>

        <div className="space-y-2.5">
          <p className="text-sm font-semibold">{q2}</p>
          <div className="flex flex-col gap-2">
            {structOptions.map(opt => (
              <button key={opt.id} onClick={() => setStructure(opt.id)}
                className={`w-full text-left px-4 py-2.5 rounded-xl border text-sm font-medium transition-colors
                  ${structure === opt.id ? 'border-primary bg-primary/5 text-primary' : 'border-border hover:border-primary/40 hover:bg-muted/40'}`}>
                {opt.label}
              </button>
            ))}
          </div>
        </div>

        {isCatalogue && (
          <div className="space-y-2.5">
            <p className="text-sm font-semibold">Quel est le type de service proposé ? <span className="text-xs font-normal text-muted-foreground">(plusieurs choix possibles)</span></p>
            <div className="flex flex-col gap-2">
              {TYPES_SERVICE_OPTIONS.map(opt => {
                const checked = typesService.includes(opt.id);
                return (
                  <button key={opt.id} onClick={() => toggleService(opt.id)}
                    className={`w-full text-left px-4 py-2.5 rounded-xl border text-sm font-medium transition-colors flex items-center gap-2
                      ${checked ? 'border-primary bg-primary/10 text-primary' : 'bg-muted/30 border-border hover:border-primary/40 hover:bg-muted/40'}`}>
                    <span className={`w-4 h-4 rounded border-2 flex items-center justify-center shrink-0 transition-colors ${checked ? 'bg-primary border-primary' : 'border-muted-foreground/40'}`}>
                      {checked && <span className="text-white text-[10px] font-bold">✓</span>}
                    </span>
                    {opt.label}
                  </button>
                );
              })}
            </div>
          </div>
        )}

        {isCatalogue && hasRepasAssis && (
          <div className="space-y-2.5">
            <p className="text-sm font-semibold">Les entrées et plats sont-ils proposés au choix ?</p>
            <div className="flex flex-col gap-2">
              {CHOIX_PLATS_OPTIONS.map(opt => (
                <button key={opt.id} onClick={() => setChoixPlats(opt.id)}
                  className={`w-full text-left px-4 py-2.5 rounded-xl border text-sm font-medium transition-colors
                    ${choixPlats === opt.id ? 'border-primary bg-primary/5 text-primary' : 'border-border hover:border-primary/40 hover:bg-muted/40'}`}>
                  {opt.label}
                </button>
              ))}
            </div>
          </div>
        )}

        {isCatalogue && hasRepasAssis && (
          <div className="space-y-2.5">
            <p className="text-sm font-semibold">Y a-t-il un choix de dessert ou gâteau ?</p>
            <div className="flex flex-col gap-2">
              {CHOIX_DESSERT_OPTIONS.map(opt => (
                <button key={opt.id} onClick={() => setChoixDessert(opt.id)}
                  className={`w-full text-left px-4 py-2.5 rounded-xl border text-sm font-medium transition-colors
                    ${choixDessert === opt.id ? 'border-primary bg-primary/5 text-primary' : 'border-border hover:border-primary/40 hover:bg-muted/40'}`}>
                  {opt.label}
                </button>
              ))}
            </div>
          </div>
        )}

        <div className="space-y-1.5">
          <label className="text-xs font-medium text-muted-foreground">Instructions spéciales pour Amanda <span className="font-normal">(optionnel)</span></label>
          <textarea
            rows={3}
            value={instructions}
            onChange={e => setInstructions(e.target.value)}
            placeholder="Ex: Les prestations DJ page 15 sont à mettre dans Options & Prestations, pas dans le Catalogue"
            className="w-full resize-none text-sm px-3 py-2 border border-border rounded-lg bg-[#F9FAFB] placeholder:text-muted-foreground/60 focus:outline-none focus:ring-1 focus:ring-primary/40"
          />
        </div>
      </div>
      <div
        className="shrink-0 bg-card flex gap-2 justify-end px-6 py-4 border-t border-border"
        style={{ paddingBottom: 'calc(20px + env(safe-area-inset-bottom))' }}
      >
        <Button variant="outline" onClick={onBack}>Retour</Button>
        <Button onClick={onNext} disabled={!nbFormules || !structure}>Suivant</Button>
      </div>
    </div>
  );
}

// ─── Étape 3 : Analyse ────────────────────────────────────────────────────────
function StepAnalyse() {
  return (
    <div className="flex-1 flex flex-col items-center justify-center gap-6 py-12 px-6 bg-muted/20">
      <AmandaProcessing size="lg" variant="light" message="Amanda traite votre document… Extraction des informations en cours, merci de patienter." />
    </div>
  );
}

// ─── Bulle Amanda ─────────────────────────────────────────────────────────────
function AmandaBubble({ total, nbFormules, nbCats }) {
  let message;
  if (total === 0) {
    message = "J'ai fait de mon mieux mais je n'ai pas trouvé d'éléments dans ce document. Vérifiez que le document est bien lisible et n'hésitez pas à ajouter manuellement ce qui manque.";
  } else if (total < 5) {
    message = `J'ai détecté ${total} éléments mais certaines parties n'étaient pas claires. Vérifiez bien la liste avant de valider !`;
  } else {
    const repartition = nbFormules > 0
      ? `${nbFormules} formule${nbFormules > 1 ? 's' : ''}`
      : `${nbCats} catégorie${nbCats > 1 ? 's' : ''}`;
    message = `J'ai analysé votre document et préparé ${total} éléments répartis dans ${repartition} ! Jetez un œil avant de valider — je fais de mon mieux mais quelques ajustements peuvent être nécessaires. 😊`;
  }

  const tips = [
    'Vérifiez les noms des articles (orthographe, majuscules)',
    'Contrôlez les allergènes détectés pour chaque article',
    'Assurez-vous que les articles sont dans la bonne catégorie',
    'Vérifiez les quantités par personne si elles sont indiquées',
    'Confirmez les formules et leurs prix associés',
  ];

  return <AmandaMessage type="info" message={message} tips={tips} />;
}

// Mots-clés suspects → fallback front si le LLM rate
const OPTION_KEYWORDS = ['dj', 'son ', 'sono', 'lumière', 'lumiere', 'éclairage', 'eclairage', 'animation', 'décoration', 'decoration', 'décor', 'vidéo', 'video', 'photographe', 'vidéaste', 'orchestre', 'groupe', 'artiste', 'magicien', 'karaoké', 'karaoke', 'podium', 'scène', 'micro', 'food truck', 'food-truck', 'photobooth', 'photobox'];
const isSuspectOption = (nom) => OPTION_KEYWORDS.some(kw => (nom || '').toLowerCase().includes(kw));

// ─── Ligne article éditable dans StepValidationCatalogue ─────────────────────
function ArticleRowSimple({ article, onSave, onDelete }) {
  const [editing, setEditing] = useState(false);
  const [draft, setDraft] = useState({ ...article });
  const [confirmDel, setConfirmDel] = useState(false);

  const CATEGORIES_16 = ['Apéritif', "Hors d'œuvre", 'Mise en bouche', 'Entrée', 'Plat', 'Fromage', 'Trou normand', 'Pré-dessert', 'Dessert', 'Mignardises', 'Pain', 'Atelier', 'Vin', 'Champagne', 'Boisson', 'Autre'];

  if (editing) {
    return (
      <div className="text-xs border border-border rounded-lg px-3 py-2 bg-muted/20 space-y-2 mb-1.5">
        <Input value={draft.nom} onChange={e => setDraft(d => ({ ...d, nom: e.target.value }))} className="h-7 text-xs" placeholder="Nom" />
        <div className="flex gap-2">
          <select value={draft.categorie || 'Autre'} onChange={e => setDraft(d => ({ ...d, categorie: e.target.value }))} className="flex-1 h-7 rounded border border-input bg-white px-2 text-xs">
            {CATEGORIES_16.map(c => <option key={c} value={c}>{c}</option>)}
          </select>
          <Input type="number" min="0" step="0.01" value={draft.quantite_par_personne ?? ''} onChange={e => setDraft(d => ({ ...d, quantite_par_personne: e.target.value === '' ? null : Number(e.target.value) }))} className="h-7 text-xs w-20" placeholder="Qté" />
          <Input value={draft.unite || ''} onChange={e => setDraft(d => ({ ...d, unite: e.target.value }))} className="h-7 text-xs w-20" placeholder="unité" />
        </div>
        <div className="flex justify-end gap-1.5">
          <button onClick={() => setEditing(false)} className="text-xs px-2.5 py-1 border border-border rounded-lg text-muted-foreground hover:bg-muted">Annuler</button>
          <button onClick={() => { onSave?.(article, draft); setEditing(false); }} className="text-xs px-2.5 py-1 bg-emerald-500 text-white rounded-lg hover:bg-emerald-600 font-medium">✓ OK</button>
        </div>
      </div>
    );
  }

  return (
    <div className="text-xs flex items-start gap-2 py-1 border-b border-border/30 last:border-0 mb-0.5">
      <div className="flex-1 min-w-0">
        <p className="font-medium truncate">{article.nom}</p>
        <div className="text-muted-foreground flex flex-wrap gap-2 mt-0.5">
          {article.quantite_par_personne > 0 && <span>· {article.quantite_par_personne} {article.unite || ''}</span>}
          {article.allergenes?.length > 0 && <span>· ⚠️ {article.allergenes.length} allergène(s)</span>}
          {article.a_choisir && <span>· ✋ À choisir</span>}
          {article.formules_associees?.length > 0 && <span>· 📋 {article.formules_associees.join(', ')}</span>}
        </div>
      </div>
      <div className="flex items-center gap-0.5 shrink-0">
        <button onClick={() => setEditing(true)} className="p-1.5 rounded hover:bg-primary/10 text-muted-foreground hover:text-primary transition-colors" title="Modifier"><Pencil size={12} /></button>
        {confirmDel
          ? <>
              <button onClick={() => onDelete(article.nom)} className="text-[10px] px-1.5 py-0.5 bg-red-600 text-white rounded font-medium">Oui</button>
              <button onClick={() => setConfirmDel(false)} className="text-[10px] px-1.5 py-0.5 border border-border rounded text-muted-foreground">Non</button>
            </>
          : <button onClick={() => setConfirmDel(true)} className="p-1.5 rounded hover:bg-red-50 text-muted-foreground hover:text-red-600 transition-colors" title="Supprimer"><Trash2 size={12} /></button>
        }
      </div>
    </div>
  );
}

// ─── Étape 4 : Validation Catalogue ──────────────────────────────────────────
function StepValidationCatalogue({ result, fileName, onConfirm, onClose, saving }) {
  const { formules = [], articles = [], suspects_options: llmSuspects = [], suspects_achoisir: llmSuspectsAChoisir = [] } = result;
  const [expandedSections, setExpandedSections] = useState({});
  const [movedToOptions, setMovedToOptions] = useState(new Set());
  const [keptInMenu, setKeptInMenu] = useState(new Set());
  const [aChoisirConfirmed, setAChoisirConfirmed] = useState(new Set());
  const [aChoisirRejected, setAChoisirRejected] = useState(new Set());
  const [parVarianteConfirmed, setParVarianteConfirmed] = useState(new Set());
  const [parVarianteEnAttente, setParVarianteEnAttente] = useState(null);
  const [variantesInjectees, setVariantesInjectees] = useState([]);

  const confirmerAChoisir = (nom) => { setAChoisirConfirmed(prev => new Set([...prev, nom])); setParVarianteConfirmed(prev => { const n = new Set(prev); [...n].forEach(obj => { if ((typeof obj === 'object' ? obj.nom : obj) === nom) n.delete(obj); }); return n; }); setVariantesInjectees(prev => prev.filter(v => v._sourceNom !== nom)); setParVarianteEnAttente(prev => prev?.nom === nom ? null : prev); };
  const rejeterAChoisir = (nom) => { setAChoisirRejected(prev => new Set([...prev, nom])); setParVarianteConfirmed(prev => { const n = new Set(prev); [...n].forEach(obj => { if ((typeof obj === 'object' ? obj.nom : obj) === nom) n.delete(obj); }); return n; }); setVariantesInjectees(prev => prev.filter(v => v._sourceNom !== nom)); setParVarianteEnAttente(prev => prev?.nom === nom ? null : prev); };
  const demanderParVariante = (a) => { setParVarianteEnAttente(a); };
  const confirmerParVariante = (a) => {
    setParVarianteConfirmed(prev => new Set([...prev, a]));
    setAChoisirConfirmed(prev => { const n = new Set(prev); n.delete(a.nom); return n; });
    setAChoisirRejected(prev => { const n = new Set(prev); n.delete(a.nom); return n; });
    const artOriginal = articles.find(art => art.nom === a.nom);
    const categorieOriginale = artOriginal?.categorie || a.categorie || 'Dessert';
    const nouvelles = (a.options || []).filter(v => typeof v === 'string' && v.trim()).map(v => ({
      nom: v.trim(),
      categorie: categorieOriginale,
      a_choisir: true,
      allergenes: a.allergenes || [],
      formules_associees: a.formules_associees || [],
      _sourceNom: a.nom,
      _isVariante: true,
    }));
    setVariantesInjectees(prev => [...prev.filter(v => v._sourceNom !== a.nom), ...nouvelles]);
    setParVarianteEnAttente(null);
  };

  const parVarianteNomSet = useMemo(
    () => new Set([...parVarianteConfirmed].map(obj => typeof obj === 'object' ? obj.nom : obj)),
    [parVarianteConfirmed]
  );

  const llmSuspectNames = useMemo(() => new Set(llmSuspects.map(s => s.nom)), [llmSuspects]);

  const articlesAll = useMemo(() => {
    const articlesFiltered2 = articles.filter(a => !movedToOptions.has(a.nom) && !llmSuspectNames.has(a.nom) && !parVarianteNomSet.has(a.nom));
    const keptFromLlm = llmSuspects.filter(s => keptInMenu.has(s.nom));
    return [...articlesFiltered2, ...keptFromLlm, ...variantesInjectees];
  }, [articles, movedToOptions, llmSuspectNames, parVarianteNomSet, llmSuspects, keptInMenu, variantesInjectees]);

  const { byCategory, sharedArticles } = useMemo(() => {
    const byCategory = {};
    const sharedArticles = [];
    articlesAll.forEach(a => {
      const cat = a.categorie || 'Autre';
      byCategory[cat] = (byCategory[cat] || 0) + 1;
      if (!a.formules_associees || a.formules_associees.length === 0) sharedArticles.push(a.nom);
    });
    return { byCategory, sharedArticles };
  }, [articlesAll]);

  const optionsSuspects = useMemo(
    () => [...llmSuspects.filter(s => !keptInMenu.has(s.nom)), ...articles.filter(a => movedToOptions.has(a.nom))],
    [llmSuspects, keptInMenu, articles, movedToOptions]
  );

  const suspectsAChoisirPending = useMemo(
    () => llmSuspectsAChoisir.filter(a => !aChoisirConfirmed.has(a.nom) && !aChoisirRejected.has(a.nom) && !parVarianteNomSet.has(a.nom)),
    [llmSuspectsAChoisir, aChoisirConfirmed, aChoisirRejected, parVarianteNomSet]
  );

  const allSuspectsPending = useMemo(() => {
    const frontSuspects = articles.filter(a => isSuspectOption(a.nom) && !llmSuspectNames.has(a.nom) && !keptInMenu.has(a.nom));
    const suspectsPending = frontSuspects.filter(a => !movedToOptions.has(a.nom));
    return [...llmSuspects.filter(s => !keptInMenu.has(s.nom)), ...suspectsPending];
  }, [articles, llmSuspectNames, keptInMenu, movedToOptions, llmSuspects]);

  return (
    <div className="flex flex-col flex-1 min-h-0">
      <div className="flex-1 overflow-y-auto p-6 space-y-4">
        <AmandaBubble total={articlesAll.length} nbFormules={formules.length} nbCats={Object.keys(byCategory).length} />
        <p className="text-xs text-blue-600 italic mb-3">✏️ Après l'import, vous pourrez modifier chaque article depuis la formule.</p>

        {allSuspectsPending.length > 0 && (
          <div className="bg-amber-50 border border-amber-300 rounded-xl p-4 space-y-3">
            <p className="text-sm font-semibold text-amber-800">⚠️ Ces éléments semblent être des Options &amp; Prestations plutôt que des Formules &amp; Menus :</p>
            <div className="space-y-2">
              {allSuspectsPending.map((a, i) => (
                <div key={i} className="bg-white border border-amber-200 rounded-lg px-3 py-2 flex items-center justify-between gap-2">
                  <span className="text-sm font-medium text-amber-900 flex-1 min-w-0 truncate">{a.nom}</span>
                  <div className="flex items-center gap-1.5 shrink-0">
                    <button onClick={() => setMovedToOptions(prev => new Set([...prev, a.nom]))} className="text-xs px-2.5 py-1 bg-blue-600 text-white rounded-lg font-medium hover:bg-blue-700 transition-colors">↗ Options</button>
                    <button onClick={() => setKeptInMenu(prev => new Set([...prev, a.nom]))} className="text-xs px-2.5 py-1 bg-slate-200 text-slate-700 rounded-lg font-medium hover:bg-slate-300 transition-colors">Garder ici</button>
                  </div>
                </div>
              ))}
            </div>
            {optionsSuspects.length > 0 && <p className="text-xs text-amber-700">✓ {optionsSuspects.length} élément(s) seront créés dans Options &amp; Prestations</p>}
          </div>
        )}
        {suspectsAChoisirPending.length > 0 && (
          <div className="bg-violet-50 border border-violet-300 rounded-xl p-4 space-y-3">
            <p className="text-sm font-semibold text-violet-800">🎯 Ces articles semblent proposés au choix — confirmez-vous ?</p>
            <div className="space-y-2">
              {suspectsAChoisirPending.map((a, i) => (
                <div key={i} className="bg-white border border-violet-200 rounded-lg overflow-hidden">
                  <div className="px-3 py-2 flex items-start justify-between gap-2">
                    <div className="flex-1 min-w-0">
                      <span className="text-sm font-medium text-violet-900 block truncate">{a.nom}</span>
                      {a.raison && <span className="text-xs text-violet-600">{a.raison}</span>}
                    </div>
                    <div className="flex flex-col items-end gap-1 shrink-0">
                      <div className="flex items-center gap-1.5">
                        <button onClick={() => confirmerAChoisir(a.nom)} className="text-xs px-2.5 py-1 bg-violet-600 text-white rounded-lg font-medium hover:bg-violet-700 transition-colors">✅ Au choix</button>
                        <button onClick={() => rejeterAChoisir(a.nom)} className="text-xs px-2.5 py-1 bg-slate-200 text-slate-700 rounded-lg font-medium hover:bg-slate-300 transition-colors">❌ Fixe</button>
                      </div>
                      {a.options?.length > 0 && (
                        <button
                          onClick={() => parVarianteEnAttente?.nom === a.nom ? setParVarianteEnAttente(null) : demanderParVariante(a)}
                          className={`text-xs px-2.5 py-1 rounded-lg font-medium transition-colors border ${parVarianteEnAttente?.nom === a.nom ? 'bg-indigo-600 text-white border-indigo-600' : 'bg-indigo-100 text-indigo-700 border-indigo-300 hover:bg-indigo-200'}`}
                        >
                          📋 Par variante
                        </button>
                      )}
                    </div>
                  </div>
                  {/* Panel de confirmation variantes */}
                  {parVarianteEnAttente?.nom === a.nom && (
                    <div className="border-t border-indigo-200 bg-indigo-50 px-3 py-3 space-y-2">
                      <p className="text-xs font-semibold text-indigo-800">Variantes détectées — un article sera créé pour chacune :</p>
                      <div className="flex flex-wrap gap-1.5">
                        {a.options.map((opt, oi) => (
                          <span key={oi} className="px-2 py-1 bg-white border border-indigo-300 text-indigo-800 rounded-full text-xs font-medium">
                            {opt}
                          </span>
                        ))}
                      </div>
                      <div className="flex gap-2 pt-1">
                        <button
                          onClick={() => confirmerParVariante(a)}
                          className="flex-1 text-xs px-3 py-1.5 bg-indigo-600 text-white rounded-lg font-medium hover:bg-indigo-700 transition-colors"
                        >
                          ✓ Confirmer — créer {a.options.length} articles
                        </button>
                        <button
                          onClick={() => setParVarianteEnAttente(null)}
                          className="text-xs px-3 py-1.5 bg-white border border-slate-300 text-slate-600 rounded-lg hover:bg-slate-50 transition-colors"
                        >
                          Annuler
                        </button>
                      </div>
                    </div>
                  )}
                </div>
              ))}
            </div>
            {(aChoisirConfirmed.size > 0 || aChoisirRejected.size > 0 || parVarianteConfirmed.size > 0) && (
              <p className="text-xs text-violet-700">✓ {aChoisirConfirmed.size} au choix · {aChoisirRejected.size} fixe · {parVarianteNomSet.size} par variante</p>
            )}
          </div>
        )}
        {formules.length > 0 && (
          <div className="bg-primary/5 border border-primary/20 rounded-xl p-4 space-y-2">
            <h3 className="font-semibold text-sm text-primary">💰 Formules détectées ({formules.length})</h3>
            <div className="grid grid-cols-1 md:grid-cols-2 gap-2">
              {formules.map((f, i) => (
                <div key={i} className="bg-white/60 rounded-lg px-3 py-2 flex items-center justify-between">
                  <span className="text-sm font-medium">{f.nom}</span>
                  {f.prix && <span className="text-xs bg-primary/10 text-primary px-2 py-0.5 rounded font-semibold">{f.prix}€/pers.</span>}
                </div>
              ))}
            </div>
          </div>
        )}
        <div className="space-y-2">
          <h3 className="font-semibold text-sm">🍽️ Articles ({articlesAll.length})</h3>
          {sharedArticles.length > 0 && (
            <div className="bg-emerald-50 border border-emerald-200 rounded-lg p-3">
              <p className="text-xs font-semibold text-emerald-700 mb-1">📋 Articles partagés ({sharedArticles.length}) — présents dans toutes les formules</p>
              <div className="text-xs text-emerald-600 space-y-0.5">
                {sharedArticles.slice(0, 5).map((n, i) => <p key={i}>• {n}</p>)}
                {sharedArticles.length > 5 && <p className="text-muted-foreground italic">+ {sharedArticles.length - 5} autre(s)</p>}
              </div>
            </div>
          )}
          {Object.entries(byCategory).map(([cat, count]) => (
            <div key={cat} className="border border-border rounded-lg overflow-hidden">
              <button onClick={() => setExpandedSections(prev => ({ ...prev, [cat]: !prev[cat] }))} className="w-full flex items-center justify-between px-4 py-2.5 hover:bg-muted/30 transition-colors">
                <span className="text-sm font-medium">{cat}</span>
                <div className="flex items-center gap-2">
                  <span className="text-xs bg-primary/10 text-primary px-2 py-0.5 rounded-full font-semibold">{count}</span>
                  {expandedSections[cat] ? <ChevronUp size={14} /> : <ChevronDown size={14} />}
                </div>
              </button>
              {expandedSections[cat] && (
                <div className="px-4 py-3 bg-muted/20 border-t border-border space-y-1.5">
                  {articlesAll.filter(a => (a.categorie || 'Autre') === cat).map((a, i) => (
                    <ArticleRowSimple key={i} article={a} onDelete={(nom) => {
                      // suppression locale dans articlesAll via movedToOptions trick
                      setMovedToOptions(prev => new Set([...prev, nom]));
                      setKeptInMenu(prev => { const n = new Set(prev); n.delete(nom); return n; });
                    }} />
                  ))}
                </div>
              )}
            </div>
          ))}
        </div>
      </div>
      <div
        className="shrink-0 bg-card flex gap-2 justify-end px-6 py-4 border-t border-border"
        style={{ paddingBottom: 'calc(20px + env(safe-area-inset-bottom))' }}
      >
        <Button variant="outline" onClick={onClose} disabled={saving}>Annuler</Button>
        <Button onClick={() => onConfirm(articlesAll, optionsSuspects, aChoisirConfirmed, aChoisirRejected, parVarianteConfirmed)} disabled={(articlesAll.length === 0 && optionsSuspects.length === 0) || saving}>
          {saving ? '⏳ Création…' : `✓ Valider et importer (${articlesAll.length + optionsSuspects.length} éléments)`}
        </Button>
      </div>
    </div>
  );
}

// ─── Étape 4 : Validation Matériel (avec édition) ─────────────────────────────
function StepValidationMateriel({ result, onConfirm, onClose, saving }) {
  const { toast } = useToast();
  const [articles, setArticles] = useState(result?.articles || []);
  const [editingId, setEditingId] = useState(null);
  const [editForm, setEditForm] = useState({ nom: '', categorie: '', quantite_par_personne: '', unite: '', notes: '' });

  const byCategory = {};
  articles.forEach(a => {
    const cat = a.categorie || 'Autre';
    byCategory[cat] = (byCategory[cat] || 0) + 1;
  });
  const [expandedSections, setExpandedSections] = useState({});

  const CATEGORIES_MATERIEL = [
    { key: 'Vaisselle', emoji: '🍽️' },
    { key: 'Couverts', emoji: '🥄' },
    { key: 'Mobilier', emoji: '🪑' },
    { key: 'Linge de table', emoji: '🧺' },
    { key: 'Ustensiles & Cuisine', emoji: '🔪' },
    { key: 'Appareils de cuisson', emoji: '🔥' },
    { key: 'Matériel de transport', emoji: '🚛' },
    { key: 'Autre', emoji: '📦' },
  ];

  const startEdit = (art, idx) => {
    setEditingId(idx);
    setEditForm({
      nom: art.nom || '',
      categorie: art.categorie || 'Autre',
      quantite_par_personne: art.quantite_par_personne ?? '',
      unite: art.unite || '',
      notes: art.notes || '',
    });
  };

  const saveEdit = () => {
    const updated = [...articles];
    updated[editingId] = {
      ...updated[editingId],
      nom: editForm.nom,
      categorie: editForm.categorie,
      quantite_par_personne: editForm.quantite_par_personne ? parseFloat(editForm.quantite_par_personne) : null,
      unite: editForm.unite,
      notes: editForm.notes,
    };
    setArticles(updated);
    setEditingId(null);
  };

  const deleteArticle = (idx) => {
    const updated = articles.filter((_, i) => i !== idx);
    setArticles(updated);
  };

  return (
    <div className="flex flex-col flex-1 min-h-0">
      <div className="flex-1 overflow-y-auto p-6 space-y-4">
        <AmandaBubble total={articles.length} nbFormules={0} nbCats={Object.keys(byCategory).length} />
        <div className="space-y-2">
          <h3 className="font-semibold text-sm">📦 Matériel détecté ({articles.length})</h3>
          <p className="text-xs text-muted-foreground">Modifiez chaque article si nécessaire avant validation</p>
          {Object.entries(byCategory).map(([cat, count]) => (
            <div key={cat} className="border border-border rounded-lg overflow-hidden">
              <button
                onClick={() => setExpandedSections(prev => ({ ...prev, [cat]: !prev[cat] }))}
                className="w-full flex items-center justify-between px-4 py-2.5 hover:bg-muted/30 transition-colors">
                <span className="text-sm font-medium">{cat}</span>
                <div className="flex items-center gap-2">
                  <span className="text-xs bg-primary/10 text-primary px-2 py-0.5 rounded-full font-semibold">{count}</span>
                  {expandedSections[cat] ? <ChevronUp size={14} /> : <ChevronDown size={14} />}
                </div>
              </button>
              {expandedSections[cat] && (
                <div className="px-4 py-3 bg-muted/20 border-t border-border space-y-2">
                  {articles.filter((a, i) => (a.categorie || 'Autre') === cat).map((a, idxInFiltered) => {
                    const originalIdx = articles.findIndex((art, i) => art === a);
                    const isEditing = editingId === originalIdx;
                    return (
                      <div key={originalIdx} className="bg-card border border-border rounded-lg p-3 space-y-2">
                        {isEditing ? (
                          <div className="space-y-2">
                            <div>
                              <label className="text-[10px] text-muted-foreground block mb-1">Nom *</label>
                              <Input value={editForm.nom} onChange={e => setEditForm(f => ({ ...f, nom: e.target.value }))} className="h-8 text-xs" />
                            </div>
                            <div className="grid grid-cols-2 gap-2">
                              <div>
                                <label className="text-[10px] text-muted-foreground block mb-1">Catégorie</label>
                                <select value={editForm.categorie} onChange={e => setEditForm(f => ({ ...f, categorie: e.target.value }))} className="flex h-8 w-full rounded-md border border-input bg-transparent px-2 py-1 text-xs">
                                  {CATEGORIES_MATERIEL.map(c => <option key={c.key} value={c.key}>{c.emoji} {c.key}</option>)}
                                </select>
                              </div>
                              <div>
                                <label className="text-[10px] text-muted-foreground block mb-1">Unité</label>
                                <Input value={editForm.unite} onChange={e => setEditForm(f => ({ ...f, unite: e.target.value }))} className="h-8 text-xs" placeholder="pièce, lot..." />
                              </div>
                            </div>
                            <div className="grid grid-cols-2 gap-2">
                              <div>
                                <label className="text-[10px] text-muted-foreground block mb-1">Qté/personne</label>
                                <Input type="number" step="any" value={editForm.quantite_par_personne} onChange={e => setEditForm(f => ({ ...f, quantite_par_personne: e.target.value }))} className="h-8 text-xs" placeholder="0" />
                              </div>
                              <div>
                                <label className="text-[10px] text-muted-foreground block mb-1">Notes</label>
                                <Input value={editForm.notes} onChange={e => setEditForm(f => ({ ...f, notes: e.target.value }))} className="h-8 text-xs" placeholder="Optionnel" />
                              </div>
                            </div>
                            <div className="flex gap-2 justify-end pt-1">
                              <Button variant="outline" size="sm" onClick={() => setEditingId(null)}>Annuler</Button>
                              <Button size="sm" onClick={saveEdit} disabled={!editForm.nom.trim()}>Enregistrer</Button>
                            </div>
                          </div>
                        ) : (
                          <div className="flex items-start justify-between gap-2">
                            <div className="flex-1 min-w-0">
                              <p className="text-xs font-semibold">{a.nom}</p>
                              <div className="text-muted-foreground flex flex-wrap gap-2 mt-1">
                                {a.quantite_par_personne !== undefined && a.quantite_par_personne !== null && (
                                  <span className="text-[10px]">· {a.quantite_par_personne} {a.unite || ''}/pers</span>
                                )}
                                {a.notes && <span className="text-[10px]">· {a.notes}</span>}
                              </div>
                            </div>
                            <div className="flex items-center gap-1 shrink-0">
                              <button onClick={() => startEdit(a, originalIdx)} className="p-1.5 rounded-lg hover:bg-muted text-muted-foreground hover:text-foreground">
                                <Pencil size={12} />
                              </button>
                              <button onClick={() => deleteArticle(originalIdx)} className="p-1.5 rounded-lg hover:bg-red-50 text-muted-foreground hover:text-red-600">
                                <Trash2 size={12} />
                              </button>
                            </div>
                          </div>
                        )}
                      </div>
                    );
                  })}
                </div>
              )}
            </div>
          ))}
        </div>
      </div>
      <div
        className="shrink-0 bg-card flex gap-2 justify-end px-6 py-4 border-t border-border"
        style={{ paddingBottom: 'calc(env(safe-area-inset-bottom, 16px) + 16px)' }}
      >
        <Button variant="outline" onClick={onClose} disabled={saving}>Annuler</Button>
        <Button onClick={() => onConfirm({ ...result, articles })} disabled={articles.length === 0 || saving}>
          {saving ? '⏳ Création…' : `✓ Valider et créer (${articles.length} articles)`}
        </Button>
      </div>
    </div>
  );
}

// ─── Étape 4 : Validation Options ────────────────────────────────────────────
function StepValidationOptions({ result, onConfirm, onClose, saving }) {
  const options = result.options || [];
  return (
    <div className="flex flex-col flex-1 min-h-0">
      <div className="flex-1 overflow-y-auto p-6 space-y-4">
        <AmandaBubble total={options.length} nbFormules={0} nbCats={[...new Set(options.map(o => o.categorie))].length} />
        <div className="space-y-2">
          <h3 className="font-semibold text-sm">🎯 Options détectées ({options.length})</h3>
          <div className="space-y-2 max-h-80 overflow-y-auto">
            {options.map((opt, i) => (
              <div key={i} className="bg-card border border-border rounded-lg px-3 py-2 text-xs space-y-0.5">
                <p className="font-semibold">{opt.nom}</p>
                <div className="flex flex-wrap gap-2 text-muted-foreground">
                  <span className="bg-muted px-1.5 py-0.5 rounded">{opt.categorie}</span>
                  {opt.prix > 0 && <span>· {opt.prix} € {opt.unite ? `(${opt.unite})` : ''}</span>}
                  {opt.allergenes?.length > 0 && <span>· ⚠️ {opt.allergenes.length} allergène(s)</span>}
                </div>
                {opt.description && <p className="text-muted-foreground">{opt.description}</p>}
              </div>
            ))}
          </div>
        </div>
      </div>
      <div
        className="shrink-0 bg-card flex gap-2 justify-end px-6 py-4 border-t border-border"
        style={{ paddingBottom: 'calc(env(safe-area-inset-bottom, 16px) + 16px)' }}
      >
        <Button variant="outline" onClick={onClose} disabled={saving}>Annuler</Button>
        <Button onClick={onConfirm} disabled={options.length === 0 || saving}>
          {saving ? '⏳ Création…' : `✓ Valider et créer (${options.length} options)`}
        </Button>
      </div>
    </div>
  );
}

// ─── Prompts IA ───────────────────────────────────────────────────────────────
const CATALOGUE_PROMPT = `Analyser ce document qui est une brochure ou un menu de professionnel de l'événementiel (traiteur, lieu de réception, prestataire). Le document peut s'étendre sur plusieurs pages ou images — analyser l'intégralité comme un seul document.

Extraire toutes les formules et menus avec leurs articles en respectant ces règles strictes :

FORMULES :
- Extraire chaque formule avec son nom exact, son prix par personne et le minimum de personnes si mentionné
- Une formule peut s'appeler Menu, Formule, Prestation, Pack, Offre ou autre

ARTICLES :
- Extraire CHAQUE article individuellement — ne jamais regrouper plusieurs articles en un seul
- Si une liste contient des items séparés par virgules, tirets ou sauts de ligne → créer un article distinct pour chacun
- EXCEPTION — NE PAS éclater en articles séparés si :
  * Le titre contient "assortiment", "plateau", "sélection", "mélange", "corbeille", "composition", "duo", "trio" ou tout terme indiquant un ensemble
  * Dans ce cas → créer UN seul article avec ce titre
  * Les éléments listés dessous vont dans la description de cet article unique
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

RÈGLE PRIORITAIRE — Respecter la nomenclature du traiteur :
- Si le document utilise un titre de section spécifique pour regrouper des articles (ex : "Les mises en bouche", "Nos bouchées salées", "Pièces cocktail", "Apéritif"…) → utiliser la catégorie la plus proche parmi les 16 disponibles
- Ne JAMAIS subdiviser un groupe en plusieurs catégories différentes si le traiteur les a regroupés sous un seul titre : tous les articles sous ce titre vont dans LA MÊME catégorie
- La catégorie est déterminée par le titre du traiteur, pas par la nature individuelle des articles

JARGON RESTAURATION — interpréter ces termes correctement :

Quantités / service :
- "à discrétion" / "à volonté" / "en libre service" → unite: "à volonté", quantite_par_personne: null
- "farandole" → type de service à la française, pas un article séparé — ajouter en description du plat concerné
- "servi à table" / "à l'assiette" → mention de service, pas un article — ignorer ou mettre en description
- "plateau" → contenant, pas un article — ignorer

Types de service :
- "vin d'honneur" → catégorie Apéritif, c'est un moment pas un article
- "trou normand" → catégorie Trou normand
- "mignardises" / "petits fours" → catégorie Mignardises
- "corbeille de pain" / "pain" → catégorie Pain
- "café" / "café gourmand" → catégorie Boisson

Formules :
- "clef en main" / "tout inclus" / "package" → mention dans description de la formule, pas un article
- "sur mesure" → mention dans description, pas un article

Titres de section à NE PAS créer comme articles :
- Tout texte en majuscules seul sur une ligne (ENTRÉE, PLAT…)
- Tout intitulé décoratif sans prix ni quantité
- "Notre sélection de…"
- "Vous aurez le choix entre…"

DESCRIPTION DE FORMULE :
- Extraire une description courte (2-3 phrases max) qui résume :
  * Le type de service (assis, buffet, cocktail...)
  * Les inclusions principales (apéritif, vin, café...)
  * La durée approximative si mentionnée
  * Le style / ambiance si précisé (élégant, convivial, festif...)
- Si aucune description explicite n'est présente dans le document, construire une description courte à partir des articles détectés
- Exemples : "Formule repas assis avec apéritif, entrée au choix, plat, dessert, vins et café inclus. Idéale pour les mariages et grandes réceptions."

LAYOUTS EN COLONNES :
- Certaines brochures présentent des articles en plusieurs colonnes ou encadrés côte à côte
- Lire TOUTES les colonnes et TOUS les encadrés sans exception
- Chaque encadré avec un titre est un groupe distinct
- Ne jamais mélanger les articles de groupes différents

ANIMATIONS ET ATELIERS :
- Si le document présente des animations, ateliers, shows, lives, corners ou stations culinaires regroupés sous un titre commun :
  * Catégorie : Atelier
  * Créer UN article par animation avec son nom comme label
  * a_choisir: true si le client choisit parmi plusieurs
  * Mettre les détails/sous-éléments dans la description
  * Ne pas éclater les sous-éléments en articles séparés
- Si un titre général comme "X animations culinaires", "nos animations" ou similaire introduit une liste d'ateliers :
  * Ignorer le titre général — ne pas créer un article "animations culinaires" ou "nos animations"
  * Créer UN article par atelier listé en dessous, chacun avec son propre nom

CHOIX DE VARIANTES :
- Si un article propose plusieurs options séparées par "ou", "/", des parenthèses ou une liste :
  → a_choisir: true
  → options: [liste des variantes]
- Appliquer à tout type d'article : desserts, plats, boissons, garnitures, sauces, etc.

ALLERGÈNES IMPLICITES :
- Déduire les allergènes depuis les ingrédients détectés, même sans mention explicite
- Appliquer cette déduction systématiquement sur CHAQUE article extrait — pas seulement sur ceux qui mentionnent explicitement un allergène
- Pour chaque article, analyser ses ingrédients un par un et appliquer les correspondances standards de la réglementation européenne sur les 14 allergènes
- Exemples de logique à appliquer (non exhaustifs — illustrent le raisonnement à généraliser sur tout type de brochure) :
  * Beignet de crabe → Crustacés
  * Beignet de calamar → Mollusques
  * Samossas de crevettes → Crustacés
  * Mousse saumon → Poissons
  * Minis croque-monsieur → Gluten + Lait
  * Pizza fromage → Gluten + Lait
  * Pesto → Fruits à coque
  * Gâteau Royal choco → Gluten + Lait + Œufs
  * Fromages → Lait
  * Foie gras, charcuterie → pas d'allergène majeur (sauf si préparation spécifique)

CHOIX CLIENT :
- Si l'article est fixe et inclus automatiquement → a_choisir: false

RÈGLE OBLIGATOIRE — suspects_achoisir :

Tu DOIS analyser CHAQUE article et vérifier s'il contient des variantes entre parenthèses, après "ou", après "/" ou dans une liste de choix.

Si oui → l'article VA OBLIGATOIREMENT dans suspects_achoisir. C'est NON NÉGOCIABLE.

Format strict :
{
  "nom": "nom exact de l'article",
  "raison": "Variantes détectées : [liste des variantes]",
  "options": ["variante1", "variante2", "variante3"]
}

NE PAS mettre a_choisir: true sur ces articles — laisser a_choisir: false et mettre dans suspects_achoisir.

Si aucune variante détectée → suspects_achoisir: []

RÈGLE SÉPARATION OPTIONS & PRESTATIONS :

Un article va dans "suspects_options" UNIQUEMENT si :
- C'est clairement une prestation externe non alimentaire (DJ, sono, sonorisation, éclairage, jeux de lumières, scène, podium, micro, orchestre, groupe musical, artiste, chanteur, karaoké, magicien, photobooth, photobox, animation enfants, casino, photographe, vidéaste, film, reportage, décoration florale, arche florale, décoration de salle)
- OU si le document le présente explicitement comme une option payante supplémentaire avec un prix séparé du menu (ex : "Option fontaine à chocolat +15€/pers", "Bar à cocktails en option : 20€/pers")

Un article RESTE dans "articles" si :
- C'est un aliment ou une boisson inclus dans le menu, même s'il s'agit d'un "extra" ou d'un élément festif comme une fontaine à chocolat, une corbeille de fruits, un bar à bonbons, une pièce montée, une barbe à papa — s'il est listé dans le menu sans prix séparé, c'est un article du menu
- S'il est listé dans la formule sans mention de prix additionnel, il appartient à "articles"
- Les fruits, corbeilles de fruits et desserts sucrés ne sont JAMAIS des options — ils restent toujours dans "articles"

La distinction clé :
- Inclus dans le menu (sans prix séparé) → "articles"
- Prix séparé explicite ou option payante en supplément → "suspects_options"
- Prestation externe non alimentaire (son, lumière, photo, déco, animation externe) → "suspects_options"

RÈGLES D'EXTRACTION DES QUANTITÉS (obligatoire) :
- Une quantité ne s'applique QU'à l'article auquel elle est explicitement associée dans le texte.
- Si aucune quantité n'est mentionnée pour un article : laisser quantite_par_personne à null.
- Ne jamais copier, propager ou deviner la quantité d'un article vers un autre.

RÈGLES D'EXTRACTION DES PRIX (obligatoire) :
- Détecter tous les formats : 45€, 45 €, 45.00€, 45,00 €, à partir de 45€, dès 45€, 45€/pers, 45€ par personne. Extraire le nombre seul.
- Le prix doit toujours être associé à sa formule ou son article spécifique, jamais mis en global.
- Si plusieurs prix selon le nombre de personnes, prendre le prix de base le plus bas et noter les variantes dans la description.
- Si le prix est sur devis ou non clairement renseigné : laisser le champ prix vide (null), ne jamais inventer un chiffre.

Retourner UNIQUEMENT un JSON valide sans texte avant ou après.`;

const OPTIONS_PROMPT = `Analyser ce document qui présente des options et prestations proposées par un professionnel de l'événementiel. Extraire TOUTES les options et prestations disponibles individuellement — ne jamais regrouper.
Catégories : Animations|Son & Lumières|Décoration|Location Matériel|Prestataires externes|Animations culinaires|Autre.

REGLES D'EXTRACTION DES PRIX (obligatoire) :
- Détecter tous les formats : 45€, 45 €, 45.00€, 45,00 €, à partir de 45€, dès 45€, 45€/pers, 45€ par personne, 45€/heure. Extraire le nombre seul.
- Le prix doit toujours être associé à l'option ou la prestation spécifique, jamais mis en global.
- Si plusieurs prix selon configuration, prendre le prix de base et noter les variantes dans la description.
- Si le prix est sur devis, nous consulter, à définir ou non clairement renseigné : laisser le champ prix vide (null), ne jamais inventer un chiffre.

Retourner UNIQUEMENT un JSON valide.`;

const MATERIEL_PROMPT = `Analyse ce document et extrais la liste du matériel avec pour chaque article :
- Nom de l'article
- Catégorie parmi (EXACTEMENT ces 12 catégories, SANS EMOJI) :
  1. Vaisselle — assiettes, bols, plats de service, verres, tasses...
  2. Couverts — fourchettes, couteaux, cuillères, ustensiles de service...
  3. Mobilier — tables, chaises, mange-debout, tabourets, bancs, étagères, chariots de service, dessertes...
  4. Linge de table — nappes, serviettes de table, chemins de table, housses de table...
  5. Ustensiles & Cuisine — couteaux de chef, planches à découper, bacs gastro, GN, louches, pinces, spatules, fouets...
  6. Batterie de cuisine — casseroles, poêles, faitouts, cocottes, woks, sauteuses, marmites, rondeaux, bains-marie...
  7. Appareils de cuisson — plancha, brasero, étuve, plaque à induction, four, bain-marie, réchaud...
  8. Electroménager & Petit matériel — machines à café, percolateurs, centrifugeuses, robots, mixeurs, trancheurs, grille-pain...
  9. Froid & Conservation — frigidaire, congélateur, armoire frigorifique, chambre froide, caisse isotherme, accumulateur de froid, sac isotherme, bac réfrigéré, vitrine réfrigérée, groupe froid...
  10. Son & Lumières — enceintes, amplis, micros, câbles, pieds, projecteurs, lasers, stroboscopes, tables de mixage, éclairages LED...
  11. Matériel de transport — caisses, chariots, sangles, glacières, conteneurs isothermes, bacs de transport...
  12. Autre — tout article ne correspondant pas aux catégories ci-dessus

IMPORTANT : Retourner les catégories SANS EMOJI. Exemple: "Froid & Conservation" et NON "❄️ Froid & Conservation".
- Quantité par personne si mentionnée
- Unité (pièce, lot, kg, m²...)

RÈGLE ABSOLUE : Utiliser EXACTEMENT les noms de catégories ci-dessus. Ne pas inventer d'autres catégories.

Si le document est un tableau Excel ou CSV, lire chaque ligne comme un article distinct.
Si c'est un document texte ou PDF, détecter les listes et tableaux de matériel.

Ne pas inventer de données manquantes.
Laisser vide si l'information n'est pas présente.

Retourner UNIQUEMENT un JSON valide.`;

const CATALOGUE_SCHEMA = {
  type: 'object',
  properties: {
    formules: { type: 'array', items: { type: 'object', properties: { nom: { type: 'string' }, prix: { type: 'number' }, minimum_personnes: { type: 'number' }, description: { type: 'string' } } } },
    articles: { type: 'array', items: { type: 'object', properties: { nom: { type: 'string' }, categorie: { type: 'string' }, formules_associees: { type: 'array', items: { type: 'string' } }, quantite_par_personne: { type: 'number' }, unite: { type: 'string' }, allergenes: { type: 'array', items: { type: 'string' } }, a_choisir: { type: 'boolean' }, options: { type: 'array', items: { type: 'string' }, description: 'Liste des options si a_choisir est true — ex: parfums, variantes, choix' } } } },
    suspects_options: { type: 'array', items: { type: 'object', properties: { nom: { type: 'string' }, categorie: { type: 'string' }, prix: { type: 'number' }, unite: { type: 'string' }, description: { type: 'string' }, allergenes: { type: 'array', items: { type: 'string' } } } } },
    suspects_achoisir: { type: 'array', items: { type: 'object', properties: { nom: { type: 'string' }, raison: { type: 'string' }, options: { type: 'array', items: { type: 'string' } } } } },
  },
};

const OPTIONS_SCHEMA = {
  type: 'object',
  properties: {
    options: { type: 'array', items: { type: 'object', properties: { nom: { type: 'string' }, categorie: { type: 'string' }, prix: { type: 'number' }, unite: { type: 'string' }, description: { type: 'string' }, allergenes: { type: 'array', items: { type: 'string' } } } } },
  },
};

const MATERIEL_SCHEMA = {
  type: 'object',
  properties: {
    articles: { type: 'array', items: { type: 'object', properties: { nom: { type: 'string' }, categorie: { type: 'string' }, quantite_par_personne: { type: 'number' }, unite: { type: 'string' }, notes: { type: 'string' } } } },
  },
};

// ─── Modal principal ──────────────────────────────────────────────────────────
export default function BrochureImportModal({ onClose, onCreated, preselectedType = null, initialFiles = [] }) {
  const qc = useQueryClient();
  const { toast } = useToast();

  const [step, setStep] = useState(1);
  const [files, setFiles] = useState(initialFiles);
  const [instructions, setInstructions] = useState('');
  const [nbFormules, setNbFormules] = useState(null);
  const [structure, setStructure] = useState(null);
  const [typesService, setTypesService] = useState([]);
  const [choixPlats, setChoixPlats] = useState(null);
  const [choixDessert, setChoixDessert] = useState(null);
  const [type] = useState(preselectedType);
  const [result, setResult] = useState(null);
  const [error, setError] = useState(null);
  const [saving, setSaving] = useState(false);
  const [progressMateriel, setProgressMateriel] = useState({ current: 0, total: 0 });
  const [failedAtIndex, setFailedAtIndex] = useState(null);
  const [remainingArticles, setRemainingArticles] = useState([]);
  const wakeLockRef = useRef(null);

  const isTabular = (file) => 
    ['.xlsx', '.xls', '.ods', '.csv'].some(ext => file.name.toLowerCase().endsWith(ext));

  const parseTabularFile = async (file) => {
    try {
      const arrayBuffer = await file.arrayBuffer();
      const workbook = XLSX.read(arrayBuffer, { type: 'array' });
      const firstSheet = workbook.Sheets[workbook.SheetNames[0]];
      const csv = XLSX.utils.sheet_to_csv(firstSheet);
      return csv;
    } catch (err) {
      throw new Error(`Erreur lecture ${file.name}: ${err.message}`);
    }
  };

  useEffect(() => {
    if (step === 3) {
      if ('wakeLock' in navigator) {
        navigator.wakeLock.request('screen').then(lock => {
          wakeLockRef.current = lock;
        }).catch(() => {});
      }
    } else {
      wakeLockRef.current?.release().catch(() => {});
      wakeLockRef.current = null;
    }
    return () => { wakeLockRef.current?.release().catch(() => {}); };
  }, [step]);

  useEffect(() => {
    const handleVisibilityChange = () => {
      if (document.visibilityState === 'visible' && step === 3) {
        if ('wakeLock' in navigator && !wakeLockRef.current) {
          navigator.wakeLock.request('screen').then(lock => {
            wakeLockRef.current = lock;
          }).catch(() => {});
        }
      }
    };
    document.addEventListener('visibilitychange', handleVisibilityChange);
    return () => document.removeEventListener('visibilitychange', handleVisibilityChange);
  }, [step]);

  // Pour le type "options", le questionnaire est non pertinent : on passe directement à l'analyse
  const handleUploadNext = () => {
    if (type === 'options') {
      runAnalysis();
    } else {
      setStep(2);
    }
  };

  const handleQuestionnaireNext = () => {
    if (!nbFormules || !structure) return;
    runAnalysis();
  };

  const runAnalysis = async () => {
    setStep(3);
    setError(null);
    try {
      const fileUrls = [];
      const tabularContents = [];

      for (const f of files) {
        if (isTabular(f)) {
          const csv = await parseTabularFile(f);
          tabularContents.push({ name: f.name, content: csv });
        } else {
          const { file_url } = await base44.integrations.Core.UploadFile({ file: f });
          fileUrls.push(file_url);
        }
      }

      const nbFormulesLabel = NB_FORMULES_OPTIONS.find(o => o.id === nbFormules)?.label || nbFormules;
      const structureLabel = STRUCTURE_OPTIONS.find(o => o.id === structure)?.label || structure;

      const resolvedType = type || 'catalogue';
      const typesServiceLabels = TYPES_SERVICE_OPTIONS.filter(o => typesService.includes(o.id)).map(o => o.label);
      const hasRepasAssis = typesService.includes('repas_assis');

      const choixPlatsLine = (() => {
        if (!hasRepasAssis || !choixPlats) return null;
        if (choixPlats === 'au_choix') return '- Les entrées et plats sont proposés au choix du client : mettre a_choisir: true sur chaque entrée et chaque plat';
        if (choixPlats === 'menu_fixe') return '- Les entrées et plats sont fixes et inclus automatiquement : mettre a_choisir: false sur chaque entrée et chaque plat';
        if (choixPlats === 'mixte') return '- Les entrées et plats sont mixtes : certains sont proposés au choix (a_choisir: true), d\'autres sont fixes (a_choisir: false) — détecter au cas par cas dans le document';
        return null;
      })();

      const priorityHeader = [
        'INSTRUCTIONS PRIORITAIRES :',
        `- Ce document contient ${nbFormulesLabel}`,
        `- Structure du document : ${structureLabel}`,
        resolvedType === 'catalogue' && typesServiceLabels.length > 0 ? `- Ce document contient : ${typesServiceLabels.join(', ')}` : null,
        choixPlatsLine,
        (() => {
          if (!hasRepasAssis || !choixDessert) return null;
          if (choixDessert === 'oui') return '- Les desserts et gâteaux sont proposés au choix : si plusieurs variantes sont listées pour un dessert (séparées par ou, /, ou entre parenthèses) mettre a_choisir: true et lister les options[]';
          if (choixDessert === 'non') return '- Les desserts sont fixes : a_choisir: false sauf indication contraire explicite';
          return null;
        })(),
        instructions.trim() ? `- ${instructions.trim()}` : null,
        'Respecter ces informations absolument avant toute autre règle d\'extraction.',
      ].filter(Boolean).join('\n');

      let basePrompt, schema;
      if (resolvedType === 'catalogue') {
        basePrompt = CATALOGUE_PROMPT;
        schema = CATALOGUE_SCHEMA;
      } else if (resolvedType === 'options') {
        basePrompt = OPTIONS_PROMPT;
        schema = OPTIONS_SCHEMA;
      } else if (resolvedType === 'materiel') {
        basePrompt = MATERIEL_PROMPT;
        schema = MATERIEL_SCHEMA;
      }

      let prompt = `${priorityHeader}\n\n${basePrompt}`;
      
      if (tabularContents.length > 0) {
        const tabularText = tabularContents
          .map(t => `--- CONTENU DU FICHIER: ${t.name} ---\n${t.content}`)
          .join('\n\n');
        prompt = `${priorityHeader}\n\n${tabularText}\n\n${basePrompt}`;
      }

      const res = await base44.integrations.Core.InvokeLLM({
        prompt,
        file_urls: fileUrls.length > 0 ? fileUrls : undefined,
        response_json_schema: schema,
        model: "claude_sonnet_4_6",
      });

      // Normaliser : InvokeLLM wrappe parfois dans { response: ... }
      const normalized = res?.response || res;
      setResult(normalized);
      setStep(4);
    } catch (err) {
      if (err.message?.includes('XLSX') || err.message?.includes('Erreur lecture')) {
        const errorMsg = 'Format non supporté — utilisez PDF, image, ou convertissez votre fichier en CSV';
        setError(errorMsg);
        toast({ title: '❌ Format non supporté', description: errorMsg, variant: 'destructive' });
      } else {
        setError(err.message || 'Erreur lors de l\'analyse');
        toast({ title: '❌ Analyse échouée', description: err.message, variant: 'destructive' });
      }
      setStep(2);
    }
  };

  const handleConfirmCatalogue = async (articlesFiltered, optionsSuspects, aChoisirConfirmed = new Set(), aChoisirRejected = new Set(), parVarianteConfirmed = new Set()) => {
    if (!result) return;
    const { formules = [] } = result;
    const rawArticles = articlesFiltered || result.articles || [];
    // Exclure tout article dont le nom n'est pas une string valide
    const articles = rawArticles.filter(a => typeof a.nom === 'string' && a.nom.trim() !== '');
    const opts = optionsSuspects || [];
    setSaving(true);

    try {
      // Charger les articles existants une seule fois pour la déduplication
      const existingItems = await base44.entities.CatalogueItem.list();

      for (const f of formules) {
        // Vérifier si la formule (tarif) existe déjà
        const existingFormule = existingItems.find(
          i => i.section === 'tarifs' && i.type_tarif === 'formule' &&
               (typeof i.nom === 'string' ? i.nom : '').toLowerCase().trim() === (typeof f.nom === 'string' ? f.nom : '').toLowerCase().trim()
        );
        if (!existingFormule) {
          await base44.entities.CatalogueItem.create({
            section: 'tarifs', type_tarif: 'formule',
            nom: f.nom, prix: f.prix || null,
            description: f.description || '',
            actif: true,
          });
        }
      }
      // ── Créer un article par variante pour les suspects marqués "par variante" ──
      for (const artObj of parVarianteConfirmed) {
        // artObj est l'objet complet {nom, options, raison} stocké depuis confirmerParVariante(a)
        const artName = typeof artObj === 'object' ? artObj.nom : artObj;
        const options = (typeof artObj === 'object' ? artObj.options : null) || [];
        // Chercher dans articles filtrés, puis dans tous les articles du résultat brut
        const artOriginal = articles.find(a => a.nom === artName)
          || result.articles?.find(a => a.nom === artName);
        const baseArt = artOriginal || artObj || {};
        if (options.length === 0) continue;

        const categorie = typeof baseArt.categorie === 'string' ? baseArt.categorie : 'Autre';
        let section = 'alimentaire';
        if (categorie === 'Boisson' || categorie === 'Boissons' || categorie === 'Vin' || categorie === 'Champagne') section = 'boissons';
        else if (categorie === 'Inclusions') section = 'inclusions';
        const formulesAssociees = formules.length === 1
          ? [formules[0].nom]
          : (baseArt.formules_associees?.length > 0
            ? baseArt.formules_associees
            : [formules[0]?.nom].filter(Boolean));
        const toutesFormules = formulesAssociees.length === 0;
        const allergenes = (baseArt.allergenes || []).map(normalizeAllergen).filter(Boolean);

        for (const variante of options) {
          if (typeof variante !== 'string' || !variante.trim()) continue;
          const varianteExistante = existingItems.find(i =>
            (i.nom || '').toLowerCase().trim() === variante.toLowerCase().trim() &&
            i.section === section
          );
          if (varianteExistante) {
            const merged = [...new Set([
              ...(varianteExistante.formules_associees || []),
              ...formulesAssociees,
            ])].filter(f => f);
            await base44.entities.CatalogueItem.update(varianteExistante.id, {
              formules_associees: merged,
              a_choisir: true,
            });
          } else {
            await base44.entities.CatalogueItem.create({
              section,
              nom: variante.trim(),
              categorie: CATEGORIES_MAP[categorie] || categorie || 'Autre',
              quantite_par_personne: baseArt.quantite_par_personne || null,
              unite: baseArt.unite || null,
              allergenes,
              formules_associees: formulesAssociees,
              toutes_formules: toutesFormules,
              a_choisir: true,
              options: [],
              actif: true,
            });
          }
        }
      }

      // Noms des articles traités "par variante" à exclure de la boucle principale
      const parVarianteNoms = new Set([
        ...[...parVarianteConfirmed].map(obj => typeof obj === 'object' ? obj.nom : obj),
        ...[...parVarianteConfirmed].flatMap(obj => typeof obj === 'object' ? (obj.options || []) : []),
      ]);

      for (const art of articles.filter(a => !parVarianteNoms.has(a.nom))) {
        const categorie = typeof art.categorie === 'string' ? art.categorie : '';
        let section = 'alimentaire';
        if (categorie === 'Boisson' || categorie === 'Boissons' || categorie === 'Vin' || categorie === 'Champagne') section = 'boissons';
        else if (categorie === 'Inclusions') section = 'inclusions';
        const price = art.prix ? String(art.prix).replace(',', '.') : null;

        // Si le LLM retourne formules_associees: [], on associe l'article à toutes les formules
        // SAUF s'il n'y a qu'une seule formule dans le document : dans ce cas, on l'associe explicitement
        const nomFormule = formules.length === 1 ? formules[0].nom : null;
        const formulesAssociees = (!art.formules_associees || art.formules_associees.length === 0)
          ? (nomFormule ? [nomFormule] : [])
          : art.formules_associees;
        const toutesFormules = formulesAssociees.length === 0;

        // Vérifier si un article avec même nom + même section existe déjà
        const artNomNorm = (typeof art.nom === 'string' ? art.nom : '').toLowerCase().trim();
        const existingArt = existingItems.find(
          i => i.section === section &&
               (typeof i.nom === 'string' ? i.nom : '').toLowerCase().trim() === artNomNorm
        );

        if (existingArt) {
          // Fusionner formules_associees sans doublon ni valeur vide
          const merged = [
            ...new Set([
              ...(existingArt.formules_associees || []),
              ...formulesAssociees,
            ])
          ].filter(f => f);
          // toutes_formules reste true seulement si l'existant ET le nouvel sont tous-formules
          const mergedToutesFormules = (existingArt.toutes_formules !== false) && toutesFormules;
          await base44.entities.CatalogueItem.update(existingArt.id, {
            formules_associees: merged,
            toutes_formules: mergedToutesFormules,
            ...(art.options?.length > 0 ? { options: art.options } : {}),
          });
        } else {
          await base44.entities.CatalogueItem.create({
            section,
            nom: art.nom,
            categorie: CATEGORIES_MAP[art.categorie] || art.categorie || 'Autre',
            quantite_par_personne: art.quantite_par_personne || null,
            unite: art.unite || null,
            allergenes: (art.allergenes || []).map(normalizeAllergen).filter(Boolean),
            formules_associees: formulesAssociees,
            toutes_formules: toutesFormules,
            a_choisir: aChoisirConfirmed.has(art.nom) ? true : aChoisirRejected.has(art.nom) ? false : (art.a_choisir || false),
            options: art.options || [],
            prix: price ? parseFloat(price) : null,
            actif: true,
          });
        }
      }
      for (const opt of opts) {
        const price = opt.prix ? String(opt.prix).replace(',', '.') : undefined;
        await base44.entities.OptionPrestation.create({
          nom: opt.nom,
          categorie: 'Autre',
          unite: 'Forfait',
          prix: price ? parseFloat(price) : undefined,
          description: opt.description || '',
          allergenes: (opt.allergenes || []).map(normalizeAllergen).filter(Boolean),
          actif: true,
        });
      }
      qc.invalidateQueries(['catalogue-items']);
      qc.invalidateQueries(['options-prestations']);
      qc.invalidateQueries(['catalogue-items-allergenes']);
      const desc = [formules.length > 0 ? `${formules.length} formule(s)` : null, articles.length > 0 ? `${articles.length} article(s)` : null, opts.length > 0 ? `${opts.length} option(s)` : null].filter(Boolean).join(', ');
      toast({ title: '✅ Import réussi', description: desc + ' créé(s)' });
      onCreated?.();
      onClose();
    } catch (err) {
      toast({ title: '❌ Erreur', description: err.message, variant: 'destructive' });
    } finally {
      setSaving(false);
    }
  };

  const handleConfirmMateriel = async (resultOverride, startFromIndex = 0) => {
    const dataToUse = resultOverride || result;
    if (!dataToUse?.articles?.length) {
  
      return;
    }
    setSaving(true);
    setFailedAtIndex(null);
    const articlesToProcess = dataToUse.articles.slice(startFromIndex);
    const totalArticles = dataToUse.articles.length;
    setProgressMateriel({ current: startFromIndex, total: totalArticles });

    try {
      const BATCH_SIZE = 5;
      const BATCH_DELAY = 300; // 300ms entre les lots
      let created = startFromIndex;
      const LIMIT_THRESHOLD = 140; // Limite estimée API
      for (let i = 0; i < articlesToProcess.length; i += BATCH_SIZE) {
        const batch = articlesToProcess.slice(i, i + BATCH_SIZE);
        try {
          await Promise.all(batch.map(art => {
            const payload = {
              nom: art.nom,
              categorie: art.categorie || 'Autre',
              quantite_par_personne: art.quantite_par_personne || null,
              unite: art.unite || '',
              notes: art.notes || '',
            };
            return base44.entities.LogistiqueArticle.create(payload);
          }));
          created += batch.length;
          setProgressMateriel({ current: created, total: totalArticles });
        } catch (batchErr) {
          // Si on atteint ~140 articles, arrêter et proposer reprise
          if (created >= LIMIT_THRESHOLD) {
            console.warn(`⚠️ Limite API atteinte (~${LIMIT_THRESHOLD} articles). Arrêt de la création.`);
            const remaining = dataToUse.articles.slice(created);
            setFailedAtIndex(created);
            setRemainingArticles(remaining);
            setSaving(false);
            toast({
              title: '✅ Création stoppée',
              description: `${created} articles créés avec succès. ${totalArticles - created} restants.`,
              variant: 'default',
            });
            return;
          }
          console.warn(`⚠️ Lot ${Math.floor(i / BATCH_SIZE) + 1} échoué, nouvelle tentative…`);
          try {
            await Promise.all(batch.map(art => {
              const payload = {
                nom: art.nom,
                categorie: art.categorie || 'Autre',
                quantite_par_personne: art.quantite_par_personne || null,
                unite: art.unite || '',
                notes: art.notes || '',
              };
              return base44.entities.LogistiqueArticle.create(payload);
            }));
            created += batch.length;
            setProgressMateriel({ current: created, total: totalArticles });
          } catch (retryErr) {
            if (created >= LIMIT_THRESHOLD) {
              console.warn(`⚠️ Limite API atteinte (~${LIMIT_THRESHOLD} articles). Arrêt de la création.`);
              const remaining = dataToUse.articles.slice(created);
              setFailedAtIndex(created);
              setRemainingArticles(remaining);
              setSaving(false);
              toast({
                title: '✅ Création stoppée',
                description: `${created} articles créés avec succès. ${totalArticles - created} restants.`,
                variant: 'default',
              });
              return;
            }
            throw retryErr;
          }
        }
        // Pause entre les lots
        if (i + BATCH_SIZE < articlesToProcess.length) {
          await new Promise(resolve => setTimeout(resolve, BATCH_DELAY));
        }
      }
      qc.invalidateQueries(['logistique-articles']);
      toast({ title: '✅ Import réussi', description: `${totalArticles} article(s) créé(s)` });
      onCreated?.();
      onClose();
    } catch (err) {

      toast({ title: '❌ Erreur', description: err.message, variant: 'destructive' });
    } finally {
      setSaving(false);
    }
  };

  const handleConfirmOptions = async () => {
    if (!result?.options?.length) return;
    setSaving(true);
    try {
      const created = await Promise.all(result.options.map(opt => {
        const price = opt.prix ? String(opt.prix).replace(',', '.') : undefined;
        return base44.entities.OptionPrestation.create({
          nom: opt.nom || 'Option sans nom',
          categorie: opt.categorie || 'Autre',
          prix: price ? parseFloat(price) : undefined,
          unite: opt.unite || 'Forfait',
          description: opt.description || '',
          allergenes: (opt.allergenes || []).map(normalizeAllergen).filter(Boolean),
          actif: true,
        });
      }));
      Promise.all(created.map(opt => createQuestionForOption(opt))).catch(() => {});
      qc.invalidateQueries(['options-prestations']);
      qc.invalidateQueries(['catalogue-items-allergenes']);
      toast({ title: '✅ Import réussi', description: `${result.options.length} option(s) créée(s) — allergènes ajoutés à la carte globale` });
      onCreated?.();
      onClose();
    } catch (err) {
      toast({ title: '❌ Erreur', description: err.message, variant: 'destructive' });
    } finally {
      setSaving(false);
    }
  };

  const canCloseOnBackdrop = step < 3;

  return (
    <div className="fixed inset-0 z-50 bg-black/50 backdrop-blur-sm flex items-center justify-center p-4" onClick={canCloseOnBackdrop ? onClose : undefined}>
      <div className="bg-card rounded-2xl border border-border shadow-2xl w-full max-w-lg flex flex-col" style={{ maxHeight: '85vh' }} onClick={e => e.stopPropagation()}>
        {/* Header */}
        <div className="flex items-center justify-between px-6 py-4 border-b border-border shrink-0">
          <div className="flex items-center gap-2.5">
            <div className="w-8 h-8 rounded-lg bg-blue-100 flex items-center justify-center text-lg">✨</div>
            <div>
              <p className="font-semibold text-sm">Analyser avec Amanda</p>
              <p className="text-xs text-muted-foreground">Import IA — analyse automatique</p>
            </div>
          </div>
          <button onClick={onClose} disabled={saving} className="p-1.5 rounded-lg hover:bg-muted text-muted-foreground disabled:opacity-50 disabled:cursor-not-allowed"><X size={16} /></button>
        </div>

        {/* Stepper — masqué pour options (questionnaire ignoré) */}
        {step !== 3 && type !== 'options' && <Stepper currentStep={step} />}

        {/* Contenu des étapes — chaque Step gère son propre scroll + footer */}
        <div className="flex flex-col flex-1 min-h-0">

        {/* Erreur */}
        {error && step !== 3 && (
          <div className="mx-6 mt-4 p-3 bg-red-50 border border-red-200 rounded-lg flex items-start gap-2">
            <AlertCircle size={15} className="text-red-600 shrink-0 mt-0.5" />
            <p className="text-xs text-red-700">{error}</p>
          </div>
        )}

        {/* Contenu par étape */}
        {step === 1 && <StepUpload files={files} setFiles={setFiles} instructions={instructions} setInstructions={setInstructions} onNext={handleUploadNext} onClose={onClose} />}

        {step === 2 && (
          <StepQuestionnaire
            nbFormules={nbFormules} setNbFormules={setNbFormules}
            structure={structure} setStructure={setStructure}
            instructions={instructions} setInstructions={setInstructions}
            typesService={typesService} setTypesService={setTypesService}
            choixPlats={choixPlats} setChoixPlats={setChoixPlats}
            choixDessert={choixDessert} setChoixDessert={setChoixDessert}
            onNext={handleQuestionnaireNext}
            onBack={() => setStep(1)}
            type={type || 'catalogue'}
          />
        )}
        {step === 3 && <StepAnalyse />}
        {step === 4 && result && (type || 'catalogue') === 'catalogue' && (
          <StepValidationCatalogue
            result={result}
            fileName={files.map(f => f.name).join(', ')}
            onConfirm={(articlesFiltered, optionsSuspects, aChoisirConfirmed, aChoisirRejected, parVarianteConfirmed) => handleConfirmCatalogue(articlesFiltered, optionsSuspects, aChoisirConfirmed, aChoisirRejected, parVarianteConfirmed)}
            onClose={onClose}
            saving={saving}
          />
        )}
        {step === 4 && result && (type || 'catalogue') === 'catalogue' && false && (
          <ValidationAmandaModal
            analysisResult={result}
            fileName={files.map(f => f.name).join(', ')}
            onConfirm={(articlesFiltered, optionsSuspects) => handleConfirmCatalogue(articlesFiltered, optionsSuspects)}
            onClose={onClose}
            saving={saving}
            standalone={false}
          />
        )}
        {step === 4 && result && (type || 'catalogue') === 'options' && (
          <StepValidationOptions
            result={result}
            onConfirm={handleConfirmOptions}
            onClose={onClose}
            saving={saving}
          />
        )}
        {step === 4 && result && (type || 'catalogue') === 'materiel' && (
          <>
            {progressMateriel.total > 0 && (
              <div className="mx-6 mt-4 p-4 bg-blue-50 border border-blue-200 rounded-lg">
                <p className="text-sm font-medium text-blue-900">Création en cours... [{progressMateriel.current} / {progressMateriel.total} articles]</p>
                <div className="mt-2 h-2 bg-blue-200 rounded-full overflow-hidden">
                  <div className="h-full bg-blue-600 transition-all duration-300" style={{width: `${(progressMateriel.current / progressMateriel.total) * 100}%`}} />
                </div>
              </div>
            )}
            {failedAtIndex !== null && remainingArticles.length > 0 && (
              <div className="mx-6 mt-4 p-4 bg-amber-50 border border-amber-200 rounded-lg space-y-3">
                <div className="space-y-1">
                  <p className="text-sm font-semibold text-amber-900">✅ {failedAtIndex} articles créés avec succès</p>
                  <p className="text-sm text-amber-800">⚠️ {remainingArticles.length} articles restants</p>
                </div>
                <button
                  onClick={() => {
                    const mergedResult = { ...result, articles: [...(result?.articles?.slice(0, failedAtIndex) || []), ...remainingArticles] };
                    handleConfirmMateriel(mergedResult, failedAtIndex);
                  }}
                  disabled={saving}
                  className="w-full px-4 py-2 text-sm font-medium bg-primary text-primary-foreground rounded-lg hover:bg-primary/90 transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
                >
                  Continuer l'import ({remainingArticles.length} restants)
                </button>
              </div>
            )}
            <StepValidationMateriel
              result={result}
              onConfirm={(updatedResult) => handleConfirmMateriel(updatedResult)}
              onClose={onClose}
              saving={saving}
            />
          </>
        )}
        </div>
      </div>
    </div>
  );
}