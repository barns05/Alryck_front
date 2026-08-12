/**
 * Modal de validation des articles extraits par l'IA.
 * Affiche récapitulatif avec édition inline ✏️ et crée les articles en masse.
 * Utilisé depuis BrochureImportModal (flux principal) et ImportAmandaModal.
 *
 * Props:
 *   analysisResult: { formules, articles, suspects_options }
 *   fileName: string
 *   onClose: fn
 *   onCreated: fn (callback après création réussie)
 *   onConfirm: fn(articlesEdited, suspects_options) | null
 *     - Si fourni : délègue la création à l'appelant (BrochureImportModal)
 *     - Si null : crée directement (ancien comportement ImportAmandaModal)
 *   saving: boolean (état de sauvegarde piloté par l'appelant)
 */
import { useState, useMemo } from 'react';
import { useQueryClient } from '@tanstack/react-query';
import { base44 } from '@/api/base44Client';
import { X, Loader2, CheckCircle2, ChevronDown, ChevronUp, Pencil, Check, Trash2 } from 'lucide-react';
import AmandaMessage from '@/components/AmandaMessage';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { useToast } from '@/components/ui/use-toast';

import { CATEGORIES_16, ALLERGENES_14, normalizeAllergen } from '@/constants/catalogue';

// Mapping des catégories IA → valeurs schéma (fallback)
const CATEGORIES_MAPPING = {
  'Apéritif': 'Apéritif',
  "Hors d'œuvre": "Hors d'œuvre",
  'Mise en bouche': 'Mise en bouche',
  'Entrée': 'Entrée',
  'Plat': 'Plat',
  'Fromage': 'Fromage',
  'Trou normand': 'Trou normand',
  'Pré-dessert': 'Pré-dessert',
  'Dessert': 'Dessert',
  'Mignardises': 'Mignardises',
  'Pain': 'Pain',
  'Atelier': 'Atelier',
  'Vin': 'Vin',
  'Champagne': 'Champagne',
  'Boisson': 'Boisson',
  'Boissons': 'Boisson',
  'Inclusions': 'Autre',
  'Autre': 'Autre',
};

// Mots-clés suspects → Options & Prestations
const OPTION_KEYWORDS = ['dj', 'son ', 'sono', 'lumière', 'lumiere', 'éclairage', 'eclairage', 'animation', 'décoration', 'decoration', 'décor', 'vidéo', 'video', 'photographe', 'vidéaste', 'orchestre', 'groupe', 'artiste', 'magicien', 'karaoké', 'karaoke', 'podium', 'scène', 'micro', 'food truck', 'food-truck', 'photobooth', 'photobox'];
const isSuspectOption = (nom) => OPTION_KEYWORDS.some(kw => (nom || '').toLowerCase().includes(kw));

function AmandaBubble({ stats, formules }) {
  const total = stats.total;
  const nbFormules = formules.length;
  const nbCats = Object.keys(stats.byCategory).length;

  let message;
  if (total === 0) {
    message = "J'ai fait de mon mieux mais je n'ai pas trouvé d'éléments dans ce document. Vérifiez que le document est bien lisible et n'hésitez pas à ajouter manuellement ce qui manque.";
  } else if (total < 5) {
    message = "J'ai fait de mon mieux mais je n'ai pas trouvé beaucoup d'éléments dans ce document. Vérifiez que le document est bien lisible et n'hésitez pas à ajouter manuellement ce qui manque.";
  } else if (total < 10) {
    message = `J'ai détecté ${total} éléments mais certaines parties du document n'étaient pas claires pour moi. Vérifiez bien la liste avant de valider !`;
  } else {
    const repartition = nbFormules > 0
      ? `${nbFormules} formule${nbFormules > 1 ? 's' : ''}`
      : `${nbCats} catégorie${nbCats > 1 ? 's' : ''}`;
    message = `J'ai analysé votre document et préparé ${total} articles répartis dans ${repartition} ! Jetez un œil aux catégories et aux allergènes avant de valider — je fais de mon mieux mais je peux parfois me tromper sur quelques détails. 😊`;
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

// ─── Édition inline d'un article ──────────────────────────────────────────────
function ArticleEditRow({ article, index, onSave, onDelete }) {
  const [editing, setEditing] = useState(false);
  const [draft, setDraft] = useState({ ...article });
  const [confirmDelete, setConfirmDelete] = useState(false);
  const set = (k, v) => setDraft(d => ({ ...d, [k]: v }));

  const toggleAllergen = (id) => {
    const cur = draft.allergenes || [];
    set('allergenes', cur.includes(id) ? cur.filter(a => a !== id) : [...cur, id]);
  };

  const confirm = () => { onSave(index, draft); setEditing(false); };

  const cur = editing ? draft : article;

  return (
    <div className="text-xs border border-border rounded-lg overflow-visible mb-1.5">
      {/* Ligne résumé toujours visible */}
      <div className="flex items-start gap-2 px-3 py-2 bg-white/60">
        <div className="flex-1 min-w-0">
          <p className="font-semibold text-foreground truncate">{article.nom}</p>
          <div className="flex flex-wrap gap-1 mt-1">
            <span className="bg-slate-100 text-slate-600 px-1.5 py-0.5 rounded text-[10px] font-medium">{article.categorie || 'Autre'}</span>
            {article.quantite_par_personne > 0 && <span className="text-[10px] text-muted-foreground">· {article.quantite_par_personne} {article.unite || ''}</span>}
            {article.allergenes?.length > 0 && <span className="bg-amber-100 text-amber-700 px-1.5 py-0.5 rounded text-[10px] font-medium">⚠️ {article.allergenes.length} allergène{article.allergenes.length > 1 ? 's' : ''}</span>}
            {article.a_choisir && <span className="bg-violet-100 text-violet-700 px-1.5 py-0.5 rounded text-[10px] font-medium">✋ À choisir</span>}
          </div>
        </div>
        <div className="flex items-center gap-1 shrink-0">
          <button
            onClick={() => setEditing(v => !v)}
            className={`min-w-[44px] min-h-[44px] flex items-center justify-center rounded-lg transition-colors ${editing ? 'bg-primary/10 text-primary' : 'text-blue-500 hover:text-blue-700 hover:bg-blue-50'}`}
            title="Modifier"
          >
            <Pencil size={16} />
          </button>
          <button
            onClick={() => setConfirmDelete(true)}
            className="min-w-[44px] min-h-[44px] flex items-center justify-center rounded-lg text-red-400 hover:text-red-600 hover:bg-red-50 transition-colors"
            title="Supprimer"
          >
            <Trash2 size={16} />
          </button>
        </div>
      </div>
      {confirmDelete && (
        <div className="px-3 py-2 bg-red-50 border-t border-red-200 flex items-center justify-between gap-2">
          <span className="text-xs text-red-700 font-medium">Supprimer cet article ?</span>
          <div className="flex gap-1.5">
            <button onClick={() => setConfirmDelete(false)} className="text-xs px-2.5 py-1 bg-white border border-slate-200 rounded-lg text-slate-700 hover:bg-slate-50 transition-colors">Non</button>
            <button onClick={() => onDelete(index)} className="text-xs px-2.5 py-1 bg-red-600 text-white rounded-lg hover:bg-red-700 transition-colors font-medium">Oui</button>
          </div>
        </div>
      )}

      {/* Formulaire d'édition inline */}
      {editing && (
        <div className="px-3 py-3 bg-muted/20 border-t border-border/50 space-y-3">
          {/* Nom */}
          <Input
            value={draft.nom}
            onChange={e => set('nom', e.target.value)}
            placeholder="Nom de l'article"
            className="text-xs h-8"
          />

          {/* Catégorie + À choisir */}
          <div className="flex gap-2">
            <select
              value={draft.categorie || 'Autre'}
              onChange={e => set('categorie', e.target.value)}
              className="flex-1 h-8 rounded-md border border-input bg-white px-2 text-xs focus-visible:outline-none focus-visible:ring-1 focus-visible:ring-ring"
            >
              {CATEGORIES_16.map(c => <option key={c} value={c}>{c}</option>)}
            </select>
            <button
              onClick={() => set('a_choisir', !draft.a_choisir)}
              className={`flex items-center gap-1.5 px-2.5 h-8 rounded-md border text-xs font-medium transition-all ${
                draft.a_choisir ? 'border-violet-400 bg-violet-50 text-violet-700' : 'border-border text-muted-foreground hover:bg-muted/50'
              }`}
            >
              ✋ {draft.a_choisir ? 'À choisir' : 'Fixe'}
            </button>
          </div>

          {/* Quantité + unité */}
          <div className="flex gap-2">
            <Input
              type="number"
              min="0"
              step="0.01"
              value={draft.quantite_par_personne ?? ''}
              onChange={e => set('quantite_par_personne', e.target.value === '' ? null : Number(e.target.value))}
              placeholder="Quantité"
              className="text-xs h-8 w-24"
            />
            <Input
              value={draft.unite || ''}
              onChange={e => set('unite', e.target.value)}
              placeholder="unité (pièce, cl…)"
              className="text-xs h-8 flex-1"
            />
          </div>

          {/* Allergènes */}
          <div>
            <p className="text-[10px] font-semibold text-muted-foreground uppercase tracking-wider mb-1.5">Allergènes</p>
            <div className="grid grid-cols-2 gap-1">
              {ALLERGENES_14.map(a => {
                const checked = (draft.allergenes || []).includes(a.id);
                return (
                  <button
                    key={a.id}
                    onClick={() => toggleAllergen(a.id)}
                    className={`flex items-center gap-1.5 px-2 py-1 rounded border text-[10px] text-left transition-all ${
                      checked ? 'border-amber-400 bg-amber-50 text-amber-800' : 'border-border hover:bg-muted/50 text-muted-foreground'
                    }`}
                  >
                    <div className={`w-3 h-3 rounded border flex items-center justify-center shrink-0 ${checked ? 'bg-amber-400 border-amber-400' : 'border-muted-foreground'}`}>
                      {checked && <Check size={8} className="text-white" />}
                    </div>
                    {a.label}
                  </button>
                );
              })}
            </div>
          </div>

          {/* Confirmer */}
          <div className="flex justify-end">
            <button
              onClick={confirm}
              className="flex items-center gap-1.5 px-3 py-1.5 bg-emerald-500 text-white rounded-lg text-xs font-medium hover:bg-emerald-600 transition-colors"
            >
              <Check size={12} /> Confirmer
            </button>
          </div>
        </div>
      )}
    </div>
  );
}

export default function ValidationAmandaModal({
  analysisResult,
  fileName,
  onClose,
  onCreated,
  onConfirm = null,  // Si fourni, délègue la création à l'appelant
  saving = false,    // État de sauvegarde piloté par l'appelant (si onConfirm fourni)
  standalone = true, // false = embarqué dans BrochureImportModal (pas d'overlay propre)
}) {
  const qc = useQueryClient();
  const { toast } = useToast();

  const [articles, setArticles] = useState(analysisResult.articles || []);
  const [formules] = useState(analysisResult.formules || []);
  const [creatingItems, setCreatingItems] = useState(false);
  const [expandedSections, setExpandedSections] = useState(() => {
    const cats = [...new Set(articles.map(a => a.categorie || 'Autre'))];
    return Object.fromEntries(cats.map(c => [c, true]));
  });

  // Gestion suspects_options (depuis BrochureImportModal via llm)
  const llmSuspects = analysisResult.suspects_options || [];
  const [movedToOptions, setMovedToOptions] = useState(new Set());
  const [keptInMenu, setKeptInMenu] = useState(new Set());

  const llmSuspectNames = new Set(llmSuspects.map(s => s.nom));
  const frontSuspects = articles.filter(a => isSuspectOption(a.nom) && !llmSuspectNames.has(a.nom) && !keptInMenu.has(a.nom));
  const articlesFiltered = articles.filter(a => !movedToOptions.has(a.nom) && !llmSuspectNames.has(a.nom));
  const keptFromLlm = llmSuspects.filter(s => keptInMenu.has(s.nom));
  const articlesAll = [...articlesFiltered, ...keptFromLlm];
  const optionsSuspects = [...llmSuspects.filter(s => !keptInMenu.has(s.nom)), ...articles.filter(a => movedToOptions.has(a.nom))];
  const suspectsPending = frontSuspects.filter(a => !movedToOptions.has(a.nom));
  const allSuspectsPending = [...llmSuspects.filter(s => !keptInMenu.has(s.nom)), ...suspectsPending];

  const updateArticle = (index, updated) => {
    setArticles(prev => prev.map((a, i) => i === index ? updated : a));
  };

  const stats = useMemo(() => {
    const byCategory = {};
    const sharedArticles = [];

    articlesAll.forEach(art => {
      const cat = art.categorie || 'Autre';
      byCategory[cat] = (byCategory[cat] || 0) + 1;
      if (!art.formules_associees || art.formules_associees.length === 0) {
        sharedArticles.push(art.nom);
      }
    });

    return { byCategory, sharedArticles, total: articlesAll.length };
  }, [articlesAll]);

  const toggleSection = (cat) => {
    setExpandedSections(prev => ({ ...prev, [cat]: !prev[cat] }));
  };

  // ─── Création directe (mode autonome sans onConfirm) ─────────────────────────
  const createItemsDirectly = async () => {
    if (articlesAll.length === 0) {
      toast({ title: '⚠️ Aucun article', description: 'Veuillez garder au moins un article.', variant: 'destructive' });
      return;
    }

    setCreatingItems(true);

    try {
      for (const f of formules) {
        await base44.entities.CatalogueItem.create({
          section: 'tarifs',
          type_tarif: 'formule',
          nom: f.nom,
          prix: f.prix || null,
          description: f.minimum_personnes ? `Minimum ${f.minimum_personnes} personnes` : null,
          actif: true,
        });
      }

      for (const art of articlesAll) {
        let section = 'alimentaire';
        if (art.categorie === 'Boisson' || art.categorie === 'Boissons' || art.categorie === 'Vin' || art.categorie === 'Champagne') section = 'boissons';
        else if (art.categorie === 'Inclusions' || art.categorie === 'Autre') section = 'alimentaire';

        const normalizedAllergenes = (art.allergenes || []).map(normalizeAllergen).filter(Boolean);

        await base44.entities.CatalogueItem.create({
          section,
          nom: art.nom,
          categorie: CATEGORIES_MAPPING[art.categorie] || art.categorie || 'Autre',
          quantite_par_personne: art.quantite_par_personne || null,
          unite: art.unite || null,
          allergenes: normalizedAllergenes,
          formules_associees: art.formules_associees || [],
          a_choisir: art.a_choisir || false,
          actif: true,
        });
      }

      qc.invalidateQueries(['catalogue-items']);
      toast({
        title: '✅ Import réussi',
        description: `${formules.length} formule(s) et ${stats.total} article(s) créé(s)`,
      });

      onCreated?.();
      onClose();
    } catch (err) {
      toast({
        title: '❌ Erreur lors de la création',
        description: err.message,
        variant: 'destructive',
      });
    } finally {
      setCreatingItems(false);
    }
  };

  const handleValidate = () => {
    if (onConfirm) {
      // Délègue à l'appelant (BrochureImportModal → handleConfirmCatalogue)
      onConfirm(articlesAll, optionsSuspects);
    } else {
      createItemsDirectly();
    }
  };

  const isCreating = onConfirm ? saving : creatingItems;
  const totalElements = articlesAll.length + (onConfirm ? optionsSuspects.length : 0);

  const content = (
    <div className={standalone ? "bg-card rounded-2xl border border-border shadow-xl w-full max-w-2xl flex flex-col" : "flex flex-col"} style={{ maxHeight: '85vh' }}>
      {/* Header */}
      <div className="flex items-center justify-between px-5 py-4 border-b border-border shrink-0">
        <div>
          <h2 className="font-bold text-base flex items-center gap-2">
            <CheckCircle2 size={18} className="text-emerald-600" /> Validation des articles
          </h2>
          {fileName && <p className="text-xs text-muted-foreground mt-0.5">{fileName}</p>}
        </div>
        <button onClick={onClose} disabled={isCreating} className="p-1.5 rounded-lg hover:bg-muted text-muted-foreground disabled:opacity-50"><X size={16} /></button>
      </div>

      {/* Contenu scrollable */}
      <div className="px-5 py-4 space-y-4 flex-1 overflow-y-auto">
        {/* Bulle Amanda */}
        <AmandaBubble stats={stats} formules={formules} />

        {/* Bloc suspects Options & Prestations */}
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

        {/* Formules détectées */}
        {formules.length > 0 && (
          <div className="bg-primary/5 border border-primary/20 rounded-xl p-4 space-y-2">
            <h3 className="font-semibold text-sm text-primary flex items-center gap-2">
              💰 Formules détectées ({formules.length})
            </h3>
            <div className="grid grid-cols-1 md:grid-cols-2 gap-2">
              {formules.map((f, i) => (
                <div key={i} className="bg-white/50 rounded-lg px-3 py-2 flex items-center justify-between">
                  <span className="text-sm font-medium">{f.nom}</span>
                  {f.prix && <span className="text-xs bg-primary/10 text-primary px-2 py-1 rounded font-semibold">{f.prix}€/pers.</span>}
                </div>
              ))}
            </div>
          </div>
        )}

        {/* Aperçu articles avec édition inline */}
        <div className="space-y-2">
          <h3 className="font-semibold text-sm flex items-center gap-2">
            🍽️ Articles ({stats.total})
          </h3>
          {stats.sharedArticles.length > 0 && (
            <div className="bg-emerald-50 border border-emerald-200 rounded-lg p-3 space-y-1.5">
              <p className="text-xs font-semibold text-emerald-700">
                📋 Articles partagés ({stats.sharedArticles.length}) — Présents dans TOUTES les formules :
              </p>
              <div className="text-xs text-emerald-600 space-y-0.5">
                {stats.sharedArticles.slice(0, 5).map((name, i) => (
                  <p key={i}>• {name}</p>
                ))}
                {stats.sharedArticles.length > 5 && <p className="text-muted-foreground italic">+ {stats.sharedArticles.length - 5} autre(s)</p>}
              </div>
            </div>
          )}

          {Object.entries(stats.byCategory).map(([cat, count]) => (
            <div key={cat} className="border border-border rounded-lg">
              <button
                onClick={() => toggleSection(cat)}
                className="w-full flex items-center justify-between px-4 py-2.5 hover:bg-muted/30 transition-colors"
              >
                <span className="text-sm font-medium">{cat}</span>
                <div className="flex items-center gap-2">
                  <span className="text-xs bg-primary/10 text-primary px-2 py-1 rounded-full font-semibold">{count}</span>
                  {expandedSections[cat] ? <ChevronUp size={14} /> : <ChevronDown size={14} />}
                </div>
              </button>

              {expandedSections[cat] && (
                <div className="px-3 py-3 bg-muted/20 border-t border-border">
                  {articlesAll
                    .map((a, globalIdx) => ({ a, globalIdx }))
                    .filter(({ a }) => (a.categorie || 'Autre') === cat)
                    .map(({ a, globalIdx }) => (
                      <ArticleEditRow
                        key={globalIdx}
                        article={a}
                        index={globalIdx}
                        onSave={(idx, updated) => {
                          const target = articlesAll[idx];
                          if (!target) return;
                          setArticles(prev => prev.map(a =>
                            a === target ? updated : a
                          ));
                        }}
                        onDelete={(idx) => {
                          const target = articlesAll[idx];
                          if (!target) return;
                          setArticles(prev => prev.filter(a => a !== target));
                        }}
                      />
                    ))}
                </div>
              )}
            </div>
          ))}
        </div>

        {/* Données brutes (debug) */}
        <details className="text-xs text-muted-foreground">
          <summary className="cursor-pointer font-medium mb-2">🔍 Données brutes (JSON)</summary>
          <pre className="bg-muted/50 p-3 rounded-lg overflow-x-auto text-[10px]">{JSON.stringify({ formules, articles: articlesAll }, null, 2)}</pre>
        </details>
      </div>

      {/* Footer dans le flux normal */}
      <div
        className="shrink-0 bg-white border-t border-border flex gap-2 justify-end px-5 py-4"
        style={{ paddingBottom: 'env(safe-area-inset-bottom, 16px)' }}
      >
        <Button variant="outline" onClick={onClose} disabled={isCreating}>Annuler</Button>
        <Button onClick={handleValidate} disabled={(articlesAll.length === 0 && optionsSuspects.length === 0) || isCreating}>
          {isCreating
            ? <><Loader2 size={14} className="animate-spin" /> Création…</>
            : `✓ Valider et importer (${totalElements} éléments)`}
        </Button>
      </div>
    </div>
  );

  if (!standalone) return content;

  return (
    <div className="fixed inset-0 z-50 bg-black/50 backdrop-blur-sm flex items-center justify-center p-4" onClick={onClose}>
      <div onClick={e => e.stopPropagation()}>
        {content}
      </div>
    </div>
  );
}