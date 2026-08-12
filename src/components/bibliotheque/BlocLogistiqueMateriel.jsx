import { useState } from 'react';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { base44 } from '@/api/base44Client';
import { Plus, Pencil, Trash2, X, Check, Sparkles, Upload, ChevronRight, Package, ArrowUpDown, FileImage, MoreVertical } from 'lucide-react';
import BrochureImportModal from '@/components/bibliotheque/BrochureImportModal';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { toast } from 'sonner';
import DeleteConfirmModal from '@/components/ui/DeleteConfirmModal';
import RegleMateriauModal from '@/components/bibliotheque/RegleMateriauModal';

const CATEGORIES = [
  { key: 'Vaisselle',                        emoji: '🍽️', desc: 'assiettes, bols, plats de service, verres, tasses...' },
  { key: 'Couverts',                         emoji: '🥄', desc: 'fourchettes, couteaux, cuillères, ustensiles de service...' },
  { key: 'Mobilier',                         emoji: '🪑', desc: 'tables, chaises, mange-debout, tabourets, bancs, étagères, chariots de service, dessertes...' },
  { key: 'Linge de table',                   emoji: '🧺', desc: 'nappes, serviettes de table, chemins de table, housses de table...' },
  { key: 'Ustensiles & Cuisine',             emoji: '🔪', desc: 'couteaux de chef, planches à découper, bacs gastro, GN, louches, pinces, spatules, fouets...' },
  { key: 'Batterie de cuisine',              emoji: '🥘', desc: 'casseroles, poêles, faitouts, cocottes, woks, sauteuses, marmites, rondeaux, bains-marie...' },
  { key: 'Appareils de cuisson',             emoji: '🔥', desc: 'plancha, brasero, étuve, plaque à induction, four, bain-marie, réchaud...' },
  { key: 'Electroménager & Petit matériel',  emoji: '☕', desc: 'machines à café, percolateurs, centrifugeuses, robots, mixeurs, trancheurs, grille-pain...' },
  { key: 'Froid & Conservation',             emoji: '❄️', desc: 'frigos, congélateurs, armoires frigorifiques, chambres froides, caisses isothermes, accumulateurs de froid, sacs isothermes, bacs réfrigérés, vitrines réfrigérées...' },
  { key: 'Son & Lumières',                   emoji: '🎵', desc: 'enceintes, amplis, micros, câbles, pieds, projecteurs, lasers, stroboscopes, tables de mixage, éclairages LED...' },
  { key: 'Matériel de transport',            emoji: '🚛', desc: 'caisses, chariots, sangles, glacières, conteneurs isothermes, bacs de transport...' },
  { key: 'Autre',                            emoji: '📦', desc: 'autres articles' },
];
const catEmoji = Object.fromEntries(CATEGORIES.map(c => [c.key, c.emoji]));

// ── Formulaire article ─────────────────────────────────────────────────────────
function ArticleForm({ article, defaultCategorie, onSave, onCancel }) {
  const [form, setForm] = useState({
    nom: article?.nom || '',
    categorie: article?.categorie || defaultCategorie || 'Autre',
    notes: article?.notes || '',
  });
  const set = (k, v) => setForm(f => ({ ...f, [k]: v }));

  return (
    <div className="bg-muted/30 rounded-xl border border-border p-4 space-y-3">
      <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
        <div className="md:col-span-2">
          <label className="text-xs font-medium text-muted-foreground mb-1 block">Nom de l'article *</label>
          <Input value={form.nom} onChange={e => set('nom', e.target.value)} placeholder="ex: Assiette plate" />
        </div>
        <div>
          <label className="text-xs font-medium text-muted-foreground mb-1 block">Catégorie</label>
          <select
            value={form.categorie}
            onChange={e => set('categorie', e.target.value)}
            className="flex h-9 w-full rounded-md border border-input bg-transparent px-3 py-1 text-sm shadow-sm focus-visible:outline-none focus-visible:ring-1 focus-visible:ring-ring"
          >
            {CATEGORIES.map(c => <option key={c.key} value={c.key}>{c.emoji} {c.key}</option>)}
          </select>
        </div>
        <div>
          <label className="text-xs font-medium text-muted-foreground mb-1 block">Notes</label>
          <Input value={form.notes} onChange={e => set('notes', e.target.value)} placeholder="Optionnel…" />
        </div>
      </div>
      <div className="flex gap-2 justify-end pt-1 border-t border-border">
        <Button variant="outline" size="sm" onClick={onCancel}><X size={14} /> Annuler</Button>
        <Button size="sm" onClick={() => form.nom.trim() && onSave(form)} disabled={!form.nom.trim()}>
          <Check size={14} /> Enregistrer
        </Button>
      </div>
    </div>
  );
}

// ── Modale changement catégorie ────────────────────────────────────────────────
function CategoryChangeModal({ item, onConfirm, onClose }) {
  const [newCat, setNewCat] = useState(item?.categorie || 'Autre');
  if (!item) return null;
  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/40 backdrop-blur-sm p-4">
      <div className="bg-card rounded-2xl border border-border shadow-xl p-6 w-full max-w-xs">
        <h3 className="font-semibold mb-4">Changer la catégorie</h3>
        <select value={newCat} onChange={e => setNewCat(e.target.value)} className="flex h-9 w-full rounded-md border border-input bg-transparent px-3 py-1 text-sm mb-4 focus-visible:outline-none focus-visible:ring-1 focus-visible:ring-ring">
          {CATEGORIES.map(c => <option key={c.key} value={c.key}>{c.emoji} {c.key}</option>)}
        </select>
        <div className="flex gap-2 justify-end">
          <button onClick={onClose} className="px-3 py-1.5 rounded-lg border border-border text-sm hover:bg-muted">Annuler</button>
          <button onClick={() => { onConfirm(newCat); onClose(); }} className="px-3 py-1.5 rounded-lg bg-primary text-primary-foreground text-sm hover:bg-primary/90">Valider</button>
        </div>
      </div>
    </div>
  );
}

// ── Menu article (⋮) ───────────────────────────────────────────────────────────
function ArticleMenu({ item, onEdit, onDelete, onChangeCategory }) {
  const [open, setOpen] = useState(false);
  return (
    <div className="relative">
      <button onClick={() => setOpen(o => !o)} className="p-1.5 rounded-lg hover:bg-muted text-muted-foreground hover:text-foreground shrink-0">
        <MoreVertical size={13} />
      </button>
      {open && (
        <>
          <div className="fixed inset-0 z-10" onClick={() => setOpen(false)} />
          <div className="absolute right-0 top-full mt-1 bg-card border border-border rounded-lg shadow-lg z-20 min-w-[180px] overflow-hidden">
            <button onClick={() => { onEdit(item); setOpen(false); }} className="w-full text-left px-4 py-2 text-xs hover:bg-muted flex items-center gap-2">
              <Pencil size={12} /> Modifier
            </button>
            <button onClick={() => { onChangeCategory(item); setOpen(false); }} className="w-full text-left px-4 py-2 text-xs hover:bg-muted flex items-center gap-2">
              <span role="img" aria-label="tag">🏷️</span> Changer de catégorie
            </button>
            <div className="border-t border-border my-1" />
            <button onClick={() => { onDelete(item); setOpen(false); }} className="w-full text-left px-4 py-2 text-xs hover:bg-red-50 text-red-600 flex items-center gap-2">
              <Trash2 size={12} /> Supprimer
            </button>
          </div>
        </>
      )}
    </div>
  );
}

// ── Ligne article ──────────────────────────────────────────────────────────────
function ArticleRow({ item, checked, onToggleCheck, onEdit, onDelete, onToggleActif, onChangeCategory }) {
  const actif = item.actif !== false;
  return (
    <div className="flex items-center gap-3 px-4 py-3 hover:bg-muted/30 transition-colors">
      <input type="checkbox" checked={checked} onChange={onToggleCheck} className="w-4 h-4 rounded accent-primary shrink-0" />
      <div className="flex-1 min-w-0">
        <p className={`text-sm font-medium ${!actif ? 'opacity-50' : ''}`}>{item.nom}</p>
        {item.notes && <p className="text-xs text-muted-foreground">{item.notes}</p>}
      </div>
      <button
        onClick={onToggleActif}
        className={`h-6 w-11 rounded-full flex items-center px-0.5 transition-all shrink-0 ${actif ? 'bg-emerald-600' : 'bg-gray-300'}`}
        title={actif ? 'Désactiver' : 'Activer'}
      >
        <span className={`h-5 w-5 rounded-full bg-white shadow transition-transform ${actif ? 'translate-x-5' : 'translate-x-0'}`} />
      </button>
      <ArticleMenu item={item} onEdit={onEdit} onDelete={onDelete} onChangeCategory={onChangeCategory} />
    </div>
  );
}

// ── Carte catégorie ────────────────────────────────────────────────────────────
function CategorieCard({ categorie, emoji, items, editing, setEditing, onCreate, onUpdate, onDelete, onToggleActif, selected, onToggleCheck, setCategoryModal }) {
  const [expanded, setExpanded] = useState(false);
  const [showForm, setShowForm] = useState(false);
  const [categoryModal, setLocalCategoryModal] = useState(null);
  const onCategoryChange = (item) => setCategoryModal(item);
  const allSelected = items.length > 0 && items.every(i => selected.has(i.id));

  return (
    <div className="bg-card border border-border rounded-2xl overflow-hidden">
      <div className="flex items-center gap-3 px-4 py-3 cursor-pointer hover:bg-muted/30 transition-colors" onClick={() => setExpanded(e => !e)}>
        <span className="text-xl">{emoji}</span>
        <div className="flex-1 min-w-0">
          <p className="font-semibold text-sm">{categorie}</p>
          <p className="text-xs text-muted-foreground">{items.length} article{items.length !== 1 ? 's' : ''}</p>
        </div>
        <ChevronRight size={16} className={`text-muted-foreground shrink-0 transition-transform ${expanded ? 'rotate-90' : ''}`} />
      </div>
      {expanded && (
        <div className="border-t border-border">
          {items.length > 0 && (
            <div className="flex items-center gap-2 px-4 py-2 border-b border-border/50 bg-muted/20">
              <input
                type="checkbox"
                checked={allSelected}
                onChange={() => {
                  if (allSelected) onToggleCheck(null, items.map(i => i.id), 'remove');
                  else onToggleCheck(null, items.map(i => i.id), 'add');
                }}
                className="h-4 w-4 rounded border-border accent-primary cursor-pointer"
              />
              <span className="text-xs text-muted-foreground">Tout sélectionner</span>
            </div>
          )}
          {items.map((item, i) => (
            <div key={item.id}>
              {i > 0 && <div className="border-t border-border/50" />}
              {editing?.id === item.id ? (
                <div className="px-4 pb-3 pt-2">
                  <ArticleForm
                    article={item}
                    defaultCategorie={categorie}
                    onSave={d => { onUpdate(item.id, d); setEditing(null); }}
                    onCancel={() => setEditing(null)}
                  />
                </div>
              ) : (
                <ArticleRow
                  item={item}
                  checked={selected.has(item.id)}
                  onToggleCheck={() => onToggleCheck(item.id)}
                  onEdit={setEditing}
                  onDelete={onDelete}
                  onToggleActif={() => onToggleActif(item.id, item.actif)}
                  onChangeCategory={onCategoryChange}
                />
              )}
            </div>
          ))}
          {items.length === 0 && !showForm && (
            <p className="text-xs text-muted-foreground px-4 py-3">Aucun article dans cette catégorie.</p>
          )}
          {showForm && (
            <div className="px-4 pb-3 pt-2">
              <ArticleForm
                defaultCategorie={categorie}
                onSave={d => { onCreate({ ...d, categorie }); setShowForm(false); }}
                onCancel={() => setShowForm(false)}
              />
            </div>
          )}
          <div className="px-4 py-2 border-t border-border/50">
            <button onClick={() => setShowForm(s => !s)} className="flex items-center gap-1.5 text-xs text-primary hover:underline font-medium">
              <Plus size={12} /> Ajouter un article
            </button>
          </div>
        </div>
      )}
    </div>
  );
}

// ── Modale import Amanda (simple) ────────────────────────────────────────────────
function AmandaImportModal({ onClose, onImported }) {
  const [step, setStep] = useState(1);
  const [file, setFile] = useState(null);
  const [fileUrl, setFileUrl] = useState(null);
  const [uploading, setUploading] = useState(false);
  const [loading, setLoading] = useState(false);
  const [articles, setArticles] = useState([]);

  const ACCEPTED_EXTS = ['.jpg', '.jpeg', '.png', '.webp', '.pdf'];

  const handleFile = async (f) => {
    const ext = '.' + f.name.split('.').pop().toLowerCase();
    if (!ACCEPTED_EXTS.includes(ext)) {
      toast.error(`Format non supporté : ${f.name}. Utilisez une image, PDF, Excel (.xlsx), ODS ou CSV.`);
      return;
    }
    setFile(f);
    setUploading(true);
    const { file_url } = await base44.integrations.Core.UploadFile({ file: f });
    setFileUrl(file_url);
    setUploading(false);
  };

  const importer = async () => {
    if (!fileUrl) return;
    setLoading(true);

    toast.error('Aucun article détecté dans le fichier. Utilisez "Importer avec Amanda" pour une analyse IA.');
    setLoading(false);
    onImported();
    onClose();
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 backdrop-blur-sm p-4">
      <div className="bg-card rounded-2xl border border-border shadow-2xl w-full max-w-lg max-h-[90vh] flex flex-col">
        <div className="flex items-center justify-between px-6 py-4 border-b border-border">
          <div className="flex items-center gap-2">
            <FileImage size={18} className="text-amber-600" />
            <h3 className="font-semibold">Import image simple</h3>
          </div>
          <button onClick={onClose} className="p-1.5 rounded-lg hover:bg-muted text-muted-foreground"><X size={16} /></button>
        </div>
        <div className="p-6 space-y-4">
          <label className="block">
            <input type="file" accept=".pdf,.jpg,.jpeg,.png,.webp" className="hidden" onChange={e => { if (e.target.files?.[0]) { handleFile(e.target.files[0]); e.target.value = ''; } }} />
            <div className={`border-2 border-dashed rounded-xl p-8 text-center cursor-pointer transition-colors ${file ? 'border-primary/40 bg-primary/5' : 'border-border hover:border-primary/40 hover:bg-muted/30'}`}>
              <Upload size={28} className="mx-auto text-muted-foreground mb-2" />
              {uploading
                ? <p className="text-sm text-muted-foreground">Chargement…</p>
                : file
                  ? <p className="text-sm font-medium text-primary">{file.name}</p>
                  : <>
                      <p className="text-sm font-medium text-foreground">Image ou PDF uniquement</p>
                      <p className="text-xs text-muted-foreground mt-1">Formats acceptés : JPG, PNG, WebP, PDF</p>
                    </>
              }
            </div>
          </label>
          <p className="text-xs text-muted-foreground text-center">Pour analyser un Excel, ODS ou CSV, utilisez <strong>Importer avec Amanda</strong>.</p>
          <Button type="button" className="w-full gap-2" onClick={importer} disabled={!fileUrl || uploading || loading}>
            {loading ? 'Import…' : '📥 Importer'}
          </Button>
        </div>
      </div>
    </div>
  );
}

// ── Modale de création (3 choix) ───────────────────────────────────────────────
function CreateModal({ onClose, onManual, onImageSimple, onAmanda }) {
  const OPTIONS = [
    {
      icon: <Plus size={20} className="text-primary" />,
      title: 'Saisie manuelle',
      desc: 'Créer un article à la main',
      iconBg: 'bg-primary/10',
      border: 'border-border hover:border-primary/50 hover:bg-primary/5',
      titleColor: 'text-primary',
      onClick: onManual,
    },
    {
      icon: <FileImage size={20} className="text-amber-600" />,
      title: 'Import image simple',
      desc: 'Photo ou PDF — import rapide',
      iconBg: 'bg-amber-50',
      border: 'border-border hover:border-amber-400 hover:bg-amber-50/60',
      titleColor: 'text-amber-700',
      onClick: onImageSimple,
    },
    {
      icon: <Sparkles size={20} className="text-blue-600" />,
      title: 'Importer avec Amanda',
      desc: 'Analyse IA complète en 4 étapes',
      iconBg: 'bg-blue-50',
      border: 'border-border hover:border-blue-400 hover:bg-blue-50/60',
      titleColor: 'text-blue-700',
      onClick: onAmanda,
    },
  ];
  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 backdrop-blur-sm p-4" onClick={onClose}>
      <div className="bg-card rounded-2xl border border-border shadow-2xl w-full max-w-sm overflow-hidden" onClick={e => e.stopPropagation()}>
        <div className="flex items-center justify-between px-5 py-4 border-b border-border">
          <p className="font-semibold">Ajouter du matériel</p>
          <button onClick={onClose} className="p-1.5 rounded-lg hover:bg-muted text-muted-foreground"><X size={16} /></button>
        </div>
        <div className="p-4 space-y-3">
          {OPTIONS.map(opt => (
            <button
              key={opt.title}
              onClick={() => { onClose(); opt.onClick(); }}
              className={`w-full flex items-center gap-4 px-4 py-4 rounded-xl border transition-colors text-left ${opt.border}`}
            >
              <span className={`w-12 h-12 rounded-xl ${opt.iconBg} flex items-center justify-center shrink-0`}>{opt.icon}</span>
              <div>
                <p className={`font-semibold text-sm ${opt.titleColor}`}>{opt.title}</p>
                <p className="text-xs text-muted-foreground mt-0.5">{opt.desc}</p>
              </div>
            </button>
          ))}
        </div>
      </div>
    </div>
  );
}

export default function BlocLogistiqueMateriel({ onTabChange }) {
  const [showAmanda, setShowAmanda] = useState(false);
  const [showAmandaSimple, setShowAmandaSimple] = useState(false);
  const [showCreateModal, setShowCreateModal] = useState(false);
  const qc = useQueryClient();
  const [activeTab, setActiveTab] = useState('materiel');
  const handleTabChange = (tab) => { setActiveTab(tab); onTabChange?.(tab); };
  const [editing, setEditing] = useState(null);
  const [showForm, setShowForm] = useState(false);
  const [deleteConfirm, setDeleteConfirm] = useState(null);
  const [categoryModal, setCategoryModal] = useState(null);
  const [selectedArticles, setSelectedArticles] = useState([]);
  const [selectedRegles, setSelectedRegles] = useState([]);
  const [showRegleModal, setShowRegleModal] = useState(false);
  const [editRegle, setEditRegle] = useState(null);
  const [bulkDeleteModal, setBulkDeleteModal] = useState(false);
  const [pagesByCategory, setPagesByCategory] = useState({});
  const ITEMS_PER_PAGE = 50;

  const { data: articles = [] } = useQuery({
    queryKey: ['logistique-articles'],
    queryFn: () => base44.entities.LogistiqueArticle.list(),
  });
  const { data: regles = [] } = useQuery({
    queryKey: ['regles-materiel'],
    queryFn: () => base44.entities.RegleMateriel.list('-created_date', 500),
  });
  const { data: formules = [] } = useQuery({
    queryKey: ['modeles-formules'],
    queryFn: () => base44.entities.ModeleFormulaire.list(),
  });

  const createMutation = useMutation({
    mutationFn: d => base44.entities.LogistiqueArticle.create(d),
    onSuccess: () => { qc.invalidateQueries(['logistique-articles']); setShowForm(false); toast.success('✓ Créé'); },
  });
  const updateMutation = useMutation({
    mutationFn: ({ id, data }) => base44.entities.LogistiqueArticle.update(id, data),
    onSuccess: () => { qc.invalidateQueries(['logistique-articles']); setEditing(null); toast.success('✓ Mis à jour'); },
  });
  const deleteMutation = useMutation({
    mutationFn: id => base44.entities.LogistiqueArticle.delete(id),
    onSuccess: () => { qc.invalidateQueries(['logistique-articles']); setDeleteConfirm(null); toast.success('✓ Supprimé'); },
  });
  const deleteRegleMutation = useMutation({
    mutationFn: id => base44.entities.RegleMateriel.delete(id),
    onSuccess: () => { qc.invalidateQueries(['regles-materiel']); setDeleteConfirm(null); toast.success('✓ Supprimé'); },
  });
  const bulkDeleteArticles = useMutation({
    mutationFn: () => Promise.all(selectedArticles.map(id => base44.entities.LogistiqueArticle.delete(id))),
    onSuccess: () => { qc.invalidateQueries(['logistique-articles']); setSelectedArticles([]); setBulkDeleteModal(false); },
  });
  const bulkDeleteRegles = useMutation({
    mutationFn: () => Promise.all(selectedRegles.map(id => base44.entities.RegleMateriel.delete(id))),
    onSuccess: () => { qc.invalidateQueries(['regles-materiel']); setSelectedRegles([]); setBulkDeleteModal(false); },
  });

  const toggleSelect = (id, ids, action) => {
    if (ids) {
      setSelectedArticles(prev =>
        action === 'add' ? [...new Set([...prev, ...ids])] : prev.filter(x => !ids.includes(x))
      );
    } else {
      setSelectedArticles(prev => prev.includes(id) ? prev.filter(x => x !== id) : [...prev, id]);
    }
  };
  const toggleRegle = id => setSelectedRegles(prev => prev.includes(id) ? prev.filter(i => i !== id) : [...prev, id]);
  const activeCount = activeTab === 'materiel' ? selectedArticles.length : selectedRegles.length;

  return (
    <div className="space-y-5">
      {/* Tabs */}
      <div className="flex gap-1 bg-muted/50 p-1 rounded-xl w-fit">
        {[
          { k: 'materiel', l: `📦 Matériel (${articles.length})` },
          { k: 'regles', l: `📋 Règles de matériel (${regles.length})` },
        ].map(({ k, l }) => (
          <button
            key={k}
            onClick={() => handleTabChange(k)}
            className={`px-4 py-2 text-sm font-medium rounded-lg transition-colors ${activeTab === k ? 'bg-card shadow-sm text-foreground' : 'text-muted-foreground hover:text-foreground'}`}
          >
            {l}
          </button>
        ))}
      </div>

      {/* ──────────── MATÉRIEL ──────────── */}
      {activeTab === 'materiel' && (
        <div className="space-y-4">
          <div className="flex items-center justify-between">
            <p className="text-sm text-muted-foreground">{articles.length} article{articles.length !== 1 ? 's' : ''} enregistré{articles.length !== 1 ? 's' : ''}</p>
            <Button size="sm" className="gap-1.5" onClick={() => setShowCreateModal(true)}>
              <Plus size={14} /> Créer
            </Button>
          </div>

          {showForm && (
            <ArticleForm
              onSave={d => createMutation.mutate(d)}
              onCancel={() => setShowForm(false)}
            />
          )}

          <div className="space-y-3">
            {CATEGORIES.map(cat => {
              const allItems = articles.filter(a => a.categorie === cat.key);
              const currentPage = pagesByCategory[cat.key] || 1;
              const displayedItems = allItems.slice(0, currentPage * ITEMS_PER_PAGE);
              const hasMore = displayedItems.length < allItems.length;
              return (
                <div key={cat.key}>
                  <CategorieCard
                    categorie={cat.key}
                    emoji={cat.emoji}
                    items={displayedItems}
                    editing={editing}
                    setEditing={setEditing}
                    onCreate={d => createMutation.mutate(d)}
                    onUpdate={(id, d) => updateMutation.mutate({ id, data: d })}
                    onDelete={item => setDeleteConfirm({ type: 'article', id: item.id, nom: item.nom })}
                    onToggleActif={(id, actif) => updateMutation.mutate({ id, data: { actif: actif === false ? true : false } })}
                    selected={new Set(selectedArticles)}
                     onToggleCheck={toggleSelect}
                     setCategoryModal={setCategoryModal}
                    />
                    {hasMore && (
                     <button
                       onClick={() => setPagesByCategory(prev => ({ ...prev, [cat.key]: (prev[cat.key] || 1) + 1 }))}
                       className="w-full mt-2 px-4 py-2 text-sm font-medium text-primary hover:bg-primary/5 rounded-lg border border-primary/20 transition-colors"
                     >
                       Charger plus ({allItems.length - displayedItems.length} restants)
                     </button>
                    )}
                    </div>
                    );
                    })}
                    {articles.filter(a => !CATEGORIES.find(c => c.key === a.categorie)).length > 0 && (() => {
                    const uncategorized = articles.filter(a => !CATEGORIES.find(c => c.key === a.categorie));
                    const currentPage = pagesByCategory['Sans catégorie'] || 1;
                    const displayedItems = uncategorized.slice(0, currentPage * ITEMS_PER_PAGE);
                    const hasMore = displayedItems.length < uncategorized.length;
                    return (
                    <div>
                    <CategorieCard
                     categorie="Sans catégorie"
                     emoji="📦"
                     items={displayedItems}
                     editing={editing}
                     setEditing={setEditing}
                     onCreate={d => createMutation.mutate(d)}
                     onUpdate={(id, d) => updateMutation.mutate({ id, data: d })}
                     onDelete={item => setDeleteConfirm({ type: 'article', id: item.id, nom: item.nom })}
                     onToggleActif={(id, actif) => updateMutation.mutate({ id, data: { actif: actif === false ? true : false } })}
                     selected={new Set(selectedArticles)}
                     onToggleCheck={toggleSelect}
                    setCategoryModal={setCategoryModal}
                  />
                  {hasMore && (
                    <button
                      onClick={() => setPagesByCategory(prev => ({ ...prev, ['Sans catégorie']: (prev['Sans catégorie'] || 1) + 1 }))}
                      className="w-full mt-2 px-4 py-2 text-sm font-medium text-primary hover:bg-primary/5 rounded-lg border border-primary/20 transition-colors"
                    >
                      Charger plus ({uncategorized.length - displayedItems.length} restants)
                    </button>
                  )}
                </div>
              );
            })()}
            {articles.length === 0 && !showForm && (
              <div className="text-center py-12 text-muted-foreground">
                <Package size={36} className="mx-auto mb-2 opacity-30" />
                <p className="text-sm">Aucun article. Créez votre premier article de matériel.</p>
              </div>
            )}
          </div>
        </div>
      )}

      {/* ──────────── RÈGLES DE MATÉRIEL ──────────── */}
      {activeTab === 'regles' && (
        <div className="space-y-4">
          <div className="flex items-center justify-between">
            <p className="text-sm text-muted-foreground">{regles.length} règle{regles.length !== 1 ? 's' : ''} configurée{regles.length !== 1 ? 's' : ''}</p>
            <Button size="sm" className="gap-1.5" onClick={() => { setEditRegle(null); setShowRegleModal(true); }} disabled={articles.length === 0} title={articles.length === 0 ? "Créez d'abord du matériel" : ''}>
              <Plus size={14} /> Nouvelle règle
            </Button>
          </div>

          {articles.length === 0 && (
            <div className="bg-amber-50 border border-amber-200 rounded-xl px-4 py-3 text-sm text-amber-700">
              ⚠️ Créez d'abord vos articles dans l'onglet "Matériel" avant d'ajouter des règles.
            </div>
          )}

          {regles.length === 0 ? (
            <div className="text-center py-12 text-muted-foreground">
              <ArrowUpDown size={36} className="mx-auto mb-2 opacity-30" />
              <p className="text-sm">Aucune règle. Associez vos articles à des formules avec les quantités par convive.</p>
            </div>
          ) : (
            <div className="space-y-2">
              <div className="flex items-center gap-2 pb-1">
                <input type="checkbox"
                  checked={regles.length > 0 && regles.every(r => selectedRegles.includes(r.id))}
                  onChange={e => e.target.checked ? setSelectedRegles(regles.map(r => r.id)) : setSelectedRegles([])}
                  className="accent-primary"
                />
                <span className="text-xs text-muted-foreground">Tout sélectionner</span>
              </div>
              {regles.map(r => (
                <div key={r.id} className={`bg-card border border-border rounded-xl p-4 ${selectedRegles.includes(r.id) ? 'ring-2 ring-primary' : ''}`}>
                  <div className="flex items-start justify-between gap-3">
                    <div className="flex-1 min-w-0 space-y-1">
                      <div className="flex items-center gap-2 flex-wrap">
                        <p className="text-sm font-medium text-muted-foreground">
                          {r.source_type === 'toutes' ? '🍽️ Toutes les formules' : `💰 ${r.formule_nom || r.formule_id}`}
                        </p>
                        <span className="text-muted-foreground">—</span>
                        <p className="font-semibold text-sm">{r.article_nom}</p>
                      </div>
                      <div className="flex flex-wrap gap-2 text-xs text-muted-foreground">
                        {r.mode_qte === 'fixe' ? (
                          <span>· {r.qte_fixe} {r.unite} (fixe)</span>
                        ) : (
                          <>
                            {r.qte_adulte > 0 && <span>Adulte : {r.qte_adulte} {r.unite}</span>}
                            {r.qte_adolescent > 0 && <span>Ado : {r.qte_adolescent} {r.unite}</span>}
                            {r.qte_enfant > 0 && <span>Enfant : {r.qte_enfant} {r.unite}</span>}
                          </>
                        )}
                        <span className="bg-muted px-1.5 py-0.5 rounded">
                          {r.arrondi === 'supérieur' ? '⬆️ Arrondi sup.' : '⬇️ Arrondi inf.'}
                        </span>
                      </div>
                      {r.notes && <p className="text-xs text-muted-foreground">{r.notes}</p>}
                    </div>
                    <div className="flex items-center gap-1 shrink-0">
                      <input type="checkbox" checked={selectedRegles.includes(r.id)} onChange={() => toggleRegle(r.id)} className="accent-primary" />
                      <button onClick={() => { setEditRegle(r); setShowRegleModal(true); }} className="p-1.5 rounded-lg hover:bg-muted text-muted-foreground hover:text-foreground">
                        <Pencil size={13} />
                      </button>
                      <button onClick={() => setDeleteConfirm({ type: 'regle', id: r.id, nom: r.article_nom })} className="p-1.5 rounded-lg hover:bg-red-50 text-muted-foreground hover:text-red-600">
                        <Trash2 size={13} />
                      </button>
                    </div>
                  </div>
                </div>
              ))}
            </div>
          )}
        </div>
      )}

      {/* Modale Créer */}
      {showCreateModal && (
        <CreateModal
          onClose={() => setShowCreateModal(false)}
          onManual={() => { setEditing(null); setShowForm(true); }}
          onImageSimple={() => setShowAmandaSimple(true)}
          onAmanda={() => setShowAmanda(true)}
        />
      )}
      {showAmanda && (
        <BrochureImportModal
          preselectedType="materiel"
          onClose={() => setShowAmanda(false)}
          onCreated={() => qc.invalidateQueries(['logistique-articles'])}
        />
      )}
      {showAmandaSimple && (
        <AmandaImportModal
          onClose={() => setShowAmandaSimple(false)}
          onImported={() => { qc.invalidateQueries(['logistique-articles']); setShowAmandaSimple(false); }}
        />
      )}
      {showRegleModal && (
        <RegleMateriauModal
          regle={editRegle}
          articles={articles}
          formules={formules}
          onClose={() => { setShowRegleModal(false); setEditRegle(null); }}
        />
      )}
      {categoryModal && (
        <CategoryChangeModal
          item={categoryModal}
          onConfirm={newCat => { updateMutation.mutate({ id: categoryModal.id, data: { categorie: newCat } }); setCategoryModal(null); }}
          onClose={() => setCategoryModal(null)}
        />
      )}
      <DeleteConfirmModal
        open={!!deleteConfirm}
        title={`Supprimer « ${deleteConfirm?.nom} » ?`}
        onConfirm={() => deleteConfirm?.type === 'article' ? deleteMutation.mutate(deleteConfirm.id) : deleteRegleMutation.mutate(deleteConfirm.id)}
        onCancel={() => setDeleteConfirm(null)}
        loading={deleteMutation.isPending || deleteRegleMutation.isPending}
      />
      {activeCount > 0 && (
        <div className="fixed bottom-20 left-0 right-0 px-4 py-3 bg-card border-t border-border shadow-lg flex items-center justify-between gap-2">
          <span className="text-sm text-muted-foreground">{activeCount} élément{activeCount !== 1 ? 's' : ''} sélectionné{activeCount !== 1 ? 's' : ''}</span>
          <button onClick={() => setBulkDeleteModal(true)} className="px-3 py-1.5 rounded-lg bg-destructive text-destructive-foreground text-xs hover:bg-destructive/90">
            🗑️ Supprimer
          </button>
        </div>
      )}
      <DeleteConfirmModal
        open={bulkDeleteModal}
        title={`Supprimer ${activeCount} élément(s) ?`}
        onConfirm={() => activeTab === 'materiel' ? bulkDeleteArticles.mutate() : bulkDeleteRegles.mutate()}
        onCancel={() => setBulkDeleteModal(false)}
        loading={bulkDeleteArticles.isPending || bulkDeleteRegles.isPending}
      />
    </div>
  );
}