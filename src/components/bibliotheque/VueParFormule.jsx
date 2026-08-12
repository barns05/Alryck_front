/**
 * Vue "Par formule" du catalogue.
 * Cartes réduites par défaut, dépliables au clic.
 */
import { useMemo, useState, useRef, useEffect } from 'react';
import { useQueryClient, useMutation } from '@tanstack/react-query';
import { ChevronDown, ChevronRight, Trash2, Loader2, MoreHorizontal, Pencil, ToggleLeft, ToggleRight, X } from 'lucide-react';
import { base44 } from '@/api/base44Client';
import { ALLERGENES_14 } from '@/components/allergenes/AllergenesPicker';
import GenerateurFormuleModeles from './GenerateurFormuleModeles';
import { getSharedArticles, getSpecificArticles } from '@/lib/formulaUtils';
import { toast } from 'sonner';
import DeleteConfirmModal from '@/components/ui/DeleteConfirmModal';
import BulkSelectionBar from '@/components/ui/BulkSelectionBar';
import DeplacerFormuleModal from './DeplacerFormuleModal';
import EditArticleModal from './EditArticleModal';
import { Input } from '@/components/ui/input';
import { Button } from '@/components/ui/button';
import { Check } from 'lucide-react';

// ─── Modale prix fixe simple (formule principale) ────────────────────────────
function PrixFixeModal({ formule, onClose, onSaved }) {
  const qc = useQueryClient();
  const [prix, setPrix] = useState(formule.prix != null ? String(formule.prix) : '');
  const [saving, setSaving] = useState(false);

  const handleSave = async () => {
    setSaving(true);
    await base44.entities.CatalogueItem.update(formule.id, {
      prix: prix !== '' ? parseFloat(prix) : null,
    });
    qc.invalidateQueries(['catalogue-items']);
    onSaved?.();
    onClose();
  };

  return (
    <div className="fixed inset-0 z-[60] bg-black/50 backdrop-blur-sm flex items-center justify-center p-4" onClick={onClose}>
      <div className="bg-card rounded-2xl border border-border shadow-xl w-full max-w-xs" onClick={e => e.stopPropagation()}>
        <div className="flex items-center justify-between px-5 py-4 border-b border-border">
          <h2 className="font-bold text-base">✏️ Prix de {formule.nom.split('—')[0].trim()}</h2>
          <button onClick={onClose} className="p-1.5 rounded-lg hover:bg-muted text-muted-foreground"><X size={16} /></button>
        </div>
        <div className="px-5 py-4 space-y-3">
          <p className="text-sm font-medium text-muted-foreground">{formule.nom.split('—')[0].trim()}</p>
          <div className="space-y-1.5">
            <label className="text-xs font-semibold text-muted-foreground uppercase tracking-wider">Prix €/pers.</label>
            <Input
              type="number"
              min="0"
              step="0.01"
              value={prix}
              onChange={e => setPrix(e.target.value)}
              placeholder="ex: 89.00"
              autoFocus
            />
          </div>
        </div>
        <div className="flex gap-2 justify-end px-5 py-4 border-t border-border">
          <Button variant="outline" onClick={onClose}>Annuler</Button>
          <Button onClick={handleSave} disabled={saving}>
            <Check size={14} className="mr-1" /> Enregistrer
          </Button>
        </div>
      </div>
    </div>
  );
}

const CAT_ORDER = [
  'Apéritif', "Hors d'œuvre", 'Mise en bouche', 'Entrée', 'Plat',
  'Fromage', 'Trou normand', 'Pré-dessert', 'Dessert', 'Mignardises',
  'Pain', 'Atelier', 'Vin', 'Champagne', 'Boisson', 'Autre',
];

function groupByCategorie(items) {
  const grouped = {};
  items.forEach(item => {
    const cat = item.categorie || 'Autre';
    if (!grouped[cat]) grouped[cat] = [];
    grouped[cat].push(item);
  });
  return grouped;
}

function ArticleRow({ item, onMoveToOptions, formuleNoms = [], onToggleAChoisir, onDelete }) {
  const [menuOpen, setMenuOpen] = useState(false);
  const [moveModal, setMoveModal] = useState(false);
  const [editModal, setEditModal] = useState(false);
  const [deleteModal, setDeleteModal] = useState(false);
  const [moving, setMoving] = useState(false);
  const formCount = item?.formules_associees?.length || 0;
  const menuRef = useRef(null);

  useEffect(() => {
    if (!menuOpen) return;
    const handler = (e) => {
      if (!menuRef.current?.contains(e.target)) setMenuOpen(false);
    };
    document.addEventListener('mousedown', handler);
    document.addEventListener('touchstart', handler);
    return () => {
      document.removeEventListener('mousedown', handler);
      document.removeEventListener('touchstart', handler);
    };
  }, [menuOpen]);

  return (
    <div className="flex items-start gap-2 py-1 border-b border-border/40 last:border-0">
      <div className="flex-1 min-w-0">
        <span className="text-sm font-medium">{item.nom}</span>
        {item.description && <span className="text-xs text-muted-foreground ml-2">{item.description}</span>}
        {item.quantite_par_personne > 0 && (
          <span className="text-xs text-muted-foreground ml-2">· {item.quantite_par_personne} {item.unite || ''} {item.par_table ? '/ table' : '/ pers.'}</span>
        )}
      </div>
      <div className="flex items-center gap-1 shrink-0">
        <button
          onClick={e => { e.stopPropagation(); onToggleAChoisir?.(item); }}
          className="p-1 min-h-[44px] flex items-center justify-center transition-colors"
          title={item.a_choisir ? 'Retirer "À choisir"' : 'Marquer "À choisir"'}
        >
          {item.a_choisir
            ? <ToggleRight size={20} className="text-violet-600" />
            : <ToggleLeft size={20} className="text-gray-400" />
          }
        </button>
        {item.allergenes?.length > 0 && <span className="text-[10px] bg-amber-100 text-amber-700 px-1.5 py-0.5 rounded-full">⚠️ {item.allergenes.length}</span>}
        {item.fournisseur_nom && <span className="text-[10px] text-muted-foreground">🏥 {item.fournisseur_nom}</span>}
        {/* Bouton édition */}
        <button
          onClick={e => { e.stopPropagation(); setEditModal(true); }}
          className="p-1 rounded hover:bg-primary/10 text-muted-foreground hover:text-primary transition-colors"
          title="Modifier cet article"
        >
          <Pencil size={12} />
        </button>
        {onMoveToOptions && (
          <div className="relative" ref={menuRef}>
            <button
              onClick={e => { e.stopPropagation(); setMenuOpen(v => !v); }}
              className="p-1 rounded hover:bg-muted text-muted-foreground"
            >
              <MoreHorizontal size={13} />
            </button>
            {menuOpen && (
              <div className="absolute right-0 top-7 z-50 bg-white border border-border rounded-xl shadow-lg py-1 min-w-[220px]" onClick={e => e.stopPropagation()}>
                <button
                  onClick={() => { setMenuOpen(false); setMoveModal(true); }}
                  className="w-full flex items-center gap-2 px-3 py-2 text-sm hover:bg-muted/50 transition-colors text-left"
                >
                  ↗️ Déplacer vers Options & Prestations
                </button>
                <button
                  onClick={() => { setMenuOpen(false); setDeleteModal(true); }}
                  className="w-full flex items-center gap-2 px-3 py-2 text-sm hover:bg-red-50 transition-colors text-left text-red-600"
                >
                  <Trash2 size={14} /> Supprimer
                </button>
              </div>
            )}
          </div>
        )}
      </div>
      {editModal && (
        <EditArticleModal
          item={item}
          formules={formuleNoms}
          onClose={() => setEditModal(false)}
        />
      )}
      <DeleteConfirmModal
        open={deleteModal}
        title="Supprimer cet article ?"
        description="Cette action est irréversible."
        onConfirm={() => { onDelete?.(item); setDeleteModal(false); }}
        onCancel={() => setDeleteModal(false)}
      />
      <DeleteConfirmModal
        open={moveModal}
        title={formCount > 1
          ? `« ${item.nom} » est partagé dans ${formCount} formules. Le déplacer le retirera de toutes ces formules.`
          : `Déplacer « ${item.nom} » vers Options & Prestations ?`
        }
        description={formCount > 1 ? '' : 'Il sera retiré du Catalogue et recréé dans Options & Prestations.'}
        confirmLabel={formCount > 1 ? 'Déplacer quand même' : 'Déplacer'}
        confirmClassName="px-4 py-2 rounded-lg bg-blue-600 text-white text-sm font-medium hover:bg-blue-700 transition-colors disabled:opacity-50"
        loading={moving}
        onCancel={() => setMoveModal(false)}
        onConfirm={async () => {
          setMoving(true);
          await onMoveToOptions(item);
          setMoveModal(false);
          setMoving(false);
        }}
      />
    </div>
  );
}

function CategoryHeader({ cat, currentFormule, onRenameComplete }) {
  const [dropdownOpen, setDropdownOpen] = useState(false);
  const [renaming, setRenaming] = useState(false);
  const ref = useRef(null);

  // Fermer si clic extérieur (mousedown + touchstart)
  useEffect(() => {
    if (!dropdownOpen) return;
    const handler = (e) => {
      if (!ref.current?.contains(e.target)) setDropdownOpen(false);
    };
    document.addEventListener('mousedown', handler);
    document.addEventListener('touchstart', handler);
    return () => {
      document.removeEventListener('mousedown', handler);
      document.removeEventListener('touchstart', handler);
    };
  }, [dropdownOpen]);

  const handleSelect = async (nouvelleCat) => {
    if (nouvelleCat === cat) { setDropdownOpen(false); return; }
    setDropdownOpen(false);
    setRenaming(true);
    try {
      const res = await base44.functions.invoke('renameCategoryItems', {
        ancienne_categorie: cat,
        nouvelle_categorie: nouvelleCat,
        formule_id: currentFormule,
      });
      const count = res.data?.updated ?? 0;
      toast.success(`${count} article${count > 1 ? 's' : ''} déplacé${count > 1 ? 's' : ''} vers ${nouvelleCat}`, {
        position: 'top-center', duration: 3000, style: { background: '#16a34a', color: '#fff' }
      });
      onRenameComplete?.();
    } catch (e) {
      toast.error(`Erreur : ${e.message}`);
    }
    setRenaming(false);
  };

  return (
    <div className="relative" ref={ref}>
      <div className="flex items-center gap-2 mt-3 mb-1">
        <div className="h-px flex-1 bg-gray-200" />
        <button
          onClick={() => setDropdownOpen(v => !v)}
          className="flex items-center gap-1 text-[10px] font-semibold text-gray-500 uppercase tracking-widest cursor-pointer hover:text-primary whitespace-nowrap transition-colors"
          disabled={renaming}
        >
          {renaming ? <Loader2 size={10} className="animate-spin" /> : cat}
          {!renaming && <ChevronDown size={10} />}
        </button>
        <div className="h-px flex-1 bg-gray-200" />
      </div>
      {dropdownOpen && (
        <div className="absolute left-0 top-6 z-50 bg-white border border-border rounded-xl shadow-lg py-1 min-w-[180px] max-h-64 overflow-y-auto">
          {CAT_ORDER.map(c => (
            <button
              key={c}
              onClick={() => handleSelect(c)}
              className={`w-full text-left px-3 py-2 text-xs hover:bg-muted/60 transition-colors ${c === cat ? 'font-semibold text-primary' : 'text-foreground'}`}
            >
              {c === cat ? '✓ ' : ''}{c}
            </button>
          ))}
        </div>
      )}
    </div>
  );
}

function SectionItems({ label, items, onMoveToOptions, formuleNoms = [], onToggleAChoisir, currentFormule, onRefresh, onDeleteArticle }) {
  const [addModal, setAddModal] = useState(null); // cat string | null

  const defaultCategorieForSection = label === 'Boissons' ? 'Boisson' : 'Autre';
  const defaultSectionForLabel = label === 'Boissons' ? 'boissons' : label === 'Inclusions' ? 'inclusions' : 'alimentaire';

  if (label === 'Alimentaire') {
    const grouped = groupByCategorie(items);
    const catsInOrder = CAT_ORDER.filter(c => grouped[c]);
    const catsExtra = Object.keys(grouped).filter(c => !CAT_ORDER.includes(c));
    const cats = [...catsInOrder, ...catsExtra];
    return (
      <div className="space-y-2">
        <p className="text-[10px] text-gray-400 italic mb-1">🔘 = proposer au choix du client</p>
        {cats.map(cat => (
          <div key={cat}>
            <CategoryHeader cat={cat} currentFormule={currentFormule} onRenameComplete={onRefresh} />
            {grouped[cat].map(item => <ArticleRow key={item.id} item={item} onMoveToOptions={onMoveToOptions} formuleNoms={formuleNoms} onToggleAChoisir={onToggleAChoisir} onDelete={onDeleteArticle} />)}
            <button
              onClick={() => setAddModal(cat)}
              className="mt-1 w-full text-xs text-primary border border-dashed border-primary/30 rounded-lg px-3 py-2 hover:bg-primary/5 transition-colors text-left"
            >
              + Ajouter un article
            </button>
          </div>
        ))}
        {addModal && (
          <EditArticleModal
            defaultCategorie={addModal}
            defaultFormule={currentFormule}
            formules={formuleNoms}
            onClose={() => setAddModal(null)}
          />
        )}
      </div>
    );
  }

  return (
    <div className="space-y-0">
      {items.map(item => <ArticleRow key={item.id} item={item} onMoveToOptions={onMoveToOptions} formuleNoms={formuleNoms} onToggleAChoisir={onToggleAChoisir} onDelete={onDeleteArticle} />)}
      <button
        onClick={() => setAddModal(defaultCategorieForSection)}
        className="mt-1 w-full text-xs text-primary border border-dashed border-primary/30 rounded-lg px-3 py-2 hover:bg-primary/5 transition-colors text-left"
      >
        + Ajouter un article
      </button>
      {addModal && (
        <EditArticleModal
          defaultCategorie={addModal}
          defaultFormule={currentFormule}
          defaultSection={defaultSectionForLabel}
          formules={formuleNoms}
          onClose={() => setAddModal(null)}
        />
      )}
    </div>
  );
}

function AllergeneBadges({ allergeneIds }) {
  if (!allergeneIds || allergeneIds.length === 0) return null;
  return (
    <div className="flex flex-wrap gap-1">
      {allergeneIds.map(id => {
        const a = ALLERGENES_14.find(x => x.id === id);
        return a ? (
          <span key={id} className="text-[10px] bg-amber-100 text-amber-800 px-1.5 py-0.5 rounded-full font-medium">
            {a.emoji} {a.label}
          </span>
        ) : null;
      })}
    </div>
  );
}

function FormulaireCard({ formule, articlesPartagés, specifiques, items, onGenerateFormulaire, onDelete, isDeleting, selected, onToggleSelect, onToggleActif, onMoveToOptions, onMoveFormule, deleteProgress, formuleNoms, formulesItems, onToggleAChoisir, onRefresh, onDeleteArticle }) {
  const [open, setOpen] = useState(false);
  const [deleteModal, setDeleteModal] = useState(false);
  const [menuOpen, setMenuOpen] = useState(false);
  const [moveModal, setMoveModal] = useState(false);
  const [editPrixModal, setEditPrixModal] = useState(false);
  const [moving, setMoving] = useState(false);
  const nomSeul = formule.nom.split('—')[0].trim();
  const isActif = formule.actif !== false;

  const tousArticles = [...articlesPartagés, ...specifiques];
  const alimentaire = tousArticles.filter(i => i.section === 'alimentaire');
  const boissons = tousArticles.filter(i => i.section === 'boissons');
  const inclusions = tousArticles.filter(i => i.section === 'inclusions');
  const totalArticles = alimentaire.length + boissons.length + inclusions.length;

  const allergeneIds = useMemo(() => {
    const set = new Set();
    [...articlesPartagés, ...specifiques].forEach(item =>
      (item.allergenes || []).forEach(a => set.add(a))
    );
    return [...set];
  }, [articlesPartagés, specifiques]);

  const aRegles = useMemo(() => items.some(i =>
    i.section === 'tarifs' &&
    i.type_tarif !== 'formule' &&
    i.formule_parente === nomSeul
  ), [items, nomSeul]);



  return (
    <div className={`bg-card border border-border rounded-2xl overflow-hidden transition-opacity ${!isActif ? 'opacity-60' : ''}`}>
      {/* Carte réduite — toujours visible */}
      <div className="px-5 py-4 space-y-3 hover:bg-muted/30 transition-colors">
        {/* Ligne titre : checkbox | chevron+nom | toggle */}
        <div className="flex items-center gap-3">
          {/* Checkbox sélection */}
          <label className="p-1 shrink-0" onClick={e => e.stopPropagation()}>
            <input
              type="checkbox"
              checked={selected}
              onChange={() => onToggleSelect(formule.id)}
              className="accent-primary"
            />
          </label>
          {/* Bouton dépliable */}
          <button
            className="flex-1 text-left flex items-center gap-3 min-w-0"
            onClick={() => setOpen(v => !v)}
          >
            <div className="shrink-0 text-muted-foreground">
              {open ? <ChevronDown size={16} /> : <ChevronRight size={16} />}
            </div>
            <div className="flex-1 min-w-0 space-y-1">
              <div className="flex items-center gap-2 flex-wrap">
                <p className="font-bold text-base leading-tight">{nomSeul}</p>
                {(formule.prix > 0 || formule.prix_ttc > 0) ? (
                  <span className="text-sm font-semibold text-primary bg-primary/10 px-2 py-0.5 rounded-full">
                    {formule.prix_ttc > 0
                      ? <>{formule.prix_ttc} €<span className="text-xs font-normal text-primary/70"> TTC/pers.</span></>
                      : <>{formule.prix} €<span className="text-xs font-normal text-primary/70"> HT/pers.</span></>
                    }
                  </span>
                ) : aRegles ? (
                  <span className="text-xs font-semibold text-blue-700 bg-blue-100 px-2 py-0.5 rounded-full border border-blue-200">
                    💰 Prix variable
                  </span>
                ) : (
                  <span className="text-xs font-semibold text-amber-700 bg-amber-100 px-2 py-0.5 rounded-full border border-amber-200">
                    ⚠️ Prix manquant
                  </span>
                )}
                <span className="text-xs text-muted-foreground bg-muted px-2 py-0.5 rounded-full">
                  {totalArticles} article{totalArticles !== 1 ? 's' : ''}
                </span>
                {specifiques.length > 0 && (
                  <span className="text-[10px] text-blue-700 bg-blue-50 border border-blue-200 px-1.5 py-0.5 rounded-full font-medium">
                    ✦ {specifiques.length} exclusif{specifiques.length > 1 ? 's' : ''}
                  </span>
                )}
                {!isActif && (
                  <span className="text-xs bg-slate-100 text-slate-500 px-2 py-0.5 rounded-full font-medium">Inactive</span>
                )}
              </div>
              {!open && allergeneIds.length > 0 && <AllergeneBadges allergeneIds={allergeneIds} />}
              {formule.description && !open && (
                <p className="text-xs text-muted-foreground truncate">{formule.description}</p>
              )}
            </div>
          </button>
          {/* Toggle actif — aligné à droite du titre */}
          <button
            onClick={() => onToggleActif(formule)}
            className={`relative w-10 h-5 rounded-full transition-colors shrink-0 ${isActif ? 'bg-emerald-400' : 'bg-slate-300'}`}
            title={isActif ? 'Active — cliquer pour désactiver' : 'Inactive — cliquer pour activer'}
          >
            <span className={`absolute top-0.5 w-4 h-4 bg-white rounded-full shadow transition-transform ${isActif ? 'translate-x-5' : 'translate-x-0.5'}`} />
          </button>
          {/* Menu ⋮ — déplacé sur la ligne 1 */}
          <div className="relative shrink-0">
            <button
              onClick={e => { e.stopPropagation(); setMenuOpen(v => !v); }}
              className="p-2 rounded-lg hover:bg-muted text-muted-foreground hover:text-foreground transition-colors"
              title="Plus d'actions"
            >
              <MoreHorizontal size={16} />
            </button>
            {menuOpen && (
              <div className="absolute right-0 top-full mt-1 z-50 bg-white border border-border rounded-xl shadow-lg py-1 min-w-[240px]" onClick={e => e.stopPropagation()}>
                <button
                  onClick={() => { setMenuOpen(false); setEditPrixModal(true); }}
                  className="w-full flex items-center gap-2 px-3 py-2 text-sm hover:bg-muted/50 transition-colors text-left"
                >
                  ✏️ Modifier le prix
                </button>

                <button
                  onClick={() => { setMenuOpen(false); setMoveModal(true); }}
                  className="w-full flex items-center gap-2 px-3 py-2 text-sm hover:bg-muted/50 transition-colors text-left"
                >
                  ↗️ Déplacer vers Options & Prestations
                </button>
              </div>
            )}
          </div>
        </div>

        {/* Ligne actions : générer + corbeille */}
        <div className="flex items-center justify-between gap-2">
          <GenerateurFormuleModeles formuleName={formule.nom} compact onGenerateFormulaire={() => onGenerateFormulaire?.(formule.nom)} />
          <button
            onClick={() => setDeleteModal(true)}
            disabled={isDeleting}
            className="p-2.5 rounded-lg hover:bg-red-50 text-muted-foreground hover:text-red-600 transition-colors shrink-0 disabled:opacity-40 disabled:cursor-not-allowed"
            title="Supprimer cette formule"
          >
            {isDeleting ? <Loader2 size={16} className="animate-spin" /> : <Trash2 size={16} />}
          </button>
        </div>
      </div>

      {/* Détail déplié */}
      {open && (
        <div className="border-t border-border px-5 py-4 space-y-4 bg-muted/10">
          {formule.description && (
            <p className="text-sm text-muted-foreground italic">{formule.description}</p>
          )}
          {allergeneIds.length > 0 && (
            <div className="space-y-1">
              <p className="text-[11px] font-semibold text-amber-700 uppercase tracking-wider">⚠️ Allergènes présents</p>
              <AllergeneBadges allergeneIds={allergeneIds} />
            </div>
          )}
          {totalArticles === 0 && (
            <p className="text-xs text-muted-foreground italic text-center py-4">Aucun article associé à cette formule.</p>
          )}
          <div>
            <p className="text-xs font-semibold text-muted-foreground uppercase tracking-wider mb-2">🍽️ Alimentaire</p>
            <SectionItems label="Alimentaire" items={alimentaire} onMoveToOptions={onMoveToOptions} formuleNoms={formuleNoms} onToggleAChoisir={onToggleAChoisir} currentFormule={nomSeul} onRefresh={onRefresh} onDeleteArticle={onDeleteArticle} />
          </div>
          <div>
            <p className="text-xs font-semibold text-muted-foreground uppercase tracking-wider mb-2">🥂 Boissons</p>
            <SectionItems label="Boissons" items={boissons} onMoveToOptions={onMoveToOptions} formuleNoms={formuleNoms} onToggleAChoisir={onToggleAChoisir} currentFormule={nomSeul} onRefresh={onRefresh} onDeleteArticle={onDeleteArticle} />
          </div>
          <div>
            <p className="text-xs font-semibold text-muted-foreground uppercase tracking-wider mb-2">📋 Services inclus</p>
            <SectionItems label="Inclusions" items={inclusions} onMoveToOptions={onMoveToOptions} formuleNoms={formuleNoms} onToggleAChoisir={onToggleAChoisir} currentFormule={nomSeul} onRefresh={onRefresh} onDeleteArticle={onDeleteArticle} />
          </div>
        </div>
      )}

      {/* Modal édition prix */}
      {editPrixModal && (
        <PrixFixeModal
          formule={formule}
          onClose={() => setEditPrixModal(false)}
          onSaved={onRefresh}
        />
      )}

      {/* Modal déplacement formule */}
      {moveModal && (
       <DeplacerFormuleModal
         formule={formule}
         articles={[...articlesPartagés, ...specifiques]}
         loading={moving}
         onCancel={() => setMoveModal(false)}
         onConfirm={async ({ mode, categorie }) => {
           // Fermer la modale
           setMoveModal(false);
           // Exécuter le traitement async
           await onMoveFormule?.({ formule, articles: [...articlesPartagés, ...specifiques], mode, categorie });
           // Toast APRÈS fin async
           toast.success('✓ Déplacé avec succès', { position: 'top-center', duration: 3000, style: { background: '#16a34a', color: '#fff' } });
           }}
           />
           )}
           <DeleteConfirmModal
           open={deleteModal}
           title={`Supprimer la formule « ${nomSeul} » ?`}
           description={
             deleteProgress
               ? `Suppression en cours… (${deleteProgress.current} / ${deleteProgress.total})`
               : "Les articles exclusifs seront supprimés. Les articles partagés resteront dans les autres formules."
           }
           onConfirm={() => {
             onDelete?.(formule, () => setDeleteModal(false));
           }}
           onCancel={() => { if (!deleteProgress) setDeleteModal(false); }}
           loading={!!deleteProgress}
           />
           </div>
  );
}

export default function VueParFormule({ items, onGenerateFormulaire, onMoveToOptions }) {
  const qc = useQueryClient();
  const [selectedIds, setSelectedIds] = useState([]);
  const [bulkDeleteModal, setBulkDeleteModal] = useState(false);
  const [deleteProgress, setDeleteProgress] = useState(null); // null | { current, total }

  const toggleSelect = (id) => setSelectedIds(prev => prev.includes(id) ? prev.filter(i => i !== id) : [...prev, id]);

  const formules = useMemo(() =>
    items.filter(i => i.section === 'tarifs' && i.type_tarif === 'formule'),
    [items]
  );

  const nonTarifsItems = useMemo(() => items.filter(i => i.section !== 'tarifs'), [items]);
  const articlesPartagés = useMemo(() => getSharedArticles(nonTarifsItems), [nonTarifsItems]);

  const articlesParFormule = useMemo(() => {
    const map = {};
    formules.forEach(f => {
      const nomSeul = f.nom.split('—')[0].trim();
      map[nomSeul] = getSpecificArticles(nonTarifsItems, nomSeul);
    });
    return map;
  }, [nonTarifsItems, formules]);

  const updateFormuleMutation = useMutation({
    mutationFn: ({ id, data }) => base44.entities.CatalogueItem.update(id, data),
    onSuccess: () => qc.invalidateQueries(['catalogue-items']),
  });

  const toggleAChoisirMutation = useMutation({
    mutationFn: async (item) => {
      try {
        await base44.entities.CatalogueItem.update(item.id, { a_choisir: !item.a_choisir });
      } catch (err) {
        if (err?.message?.includes('not found')) return; // stale reference
        throw err;
      }
    },
    onSuccess: () => {
      qc.invalidateQueries(['catalogue-items']);
      toast.success('Article mis à jour', { position: 'top-center', duration: 2000, style: { background: '#16a34a', color: '#fff' } });
    },
  });

  const bulkDeleteMutation = useMutation({
    mutationFn: async (ids) => {
      let deletedCount = 0;

      // WakeLock pour garder l'écran actif
      let wakeLock = null;
      try { wakeLock = await navigator.wakeLock?.request('screen'); } catch (_) {}

      // Bloquer le scroll
      document.body.style.overflow = 'hidden';

      // Charger la liste UNE SEULE FOIS avant la boucle
      const allItems = await base44.entities.CatalogueItem.list();

      try {
        for (const id of ids) {
          setDeleteProgress({ current: deletedCount, total: ids.length });
          const formule = formules.find(f => f.id === id);
          if (!formule) continue;

          const nomFormule = formule.nom.split('—')[0].trim();

          const exclusifs = allItems.filter(i =>
            i.section !== 'tarifs' && i.formules_associees?.length === 1 && i.formules_associees[0] === nomFormule
          );
          const partagesMulti = allItems.filter(i =>
            i.section !== 'tarifs' && i.formules_associees?.length > 1 && i.formules_associees.includes(nomFormule)
          );

          for (const art of exclusifs) await base44.entities.CatalogueItem.delete(art.id);
          for (const art of partagesMulti) {
            const nouvellesFormules = art.formules_associees.filter(f => f !== nomFormule);
            await base44.entities.CatalogueItem.update(art.id, { formules_associees: nouvellesFormules });
          }

          await base44.entities.CatalogueItem.delete(id);
          deletedCount++;
          setDeleteProgress({ current: deletedCount, total: ids.length });
        }

        const finalItems = await base44.entities.CatalogueItem.list();
        const orphelins = finalItems.filter(i =>
          i.section !== 'tarifs' && (!i.formules_associees || i.formules_associees.length === 0)
        );
        for (const art of orphelins) await base44.entities.CatalogueItem.delete(art.id);
      } finally {
        document.body.style.overflow = '';
        if (wakeLock) try { await wakeLock.release(); } catch (_) {}
      }

      return deletedCount;
    },
    onSuccess: (deletedCount) => {
      qc.invalidateQueries(['catalogue-items']);
      setSelectedIds([]);
      setBulkDeleteModal(false);
      setDeleteProgress(null);
      toast.success(`✓ ${deletedCount} formule${deletedCount > 1 ? 's' : ''} supprimée${deletedCount > 1 ? 's' : ''}`, { position: 'top-center', duration: 3000, style: { background: '#16a34a', color: '#fff' } });
    },
    onError: (err) => { setDeleteProgress(null); document.body.style.overflow = ''; toast.error(`Erreur : ${err.message}`); },
  });

  const deleteArticleMutation = useMutation({
    mutationFn: async (item) => {
      try {
        await base44.entities.CatalogueItem.delete(item.id);
      } catch (err) {
        if (err?.message?.includes('not found')) return; // already deleted
        throw err;
      }
    },
    onSuccess: () => {
      qc.invalidateQueries(['catalogue-items']);
      toast.success('Article supprimé', { position: 'top-center', duration: 2000, style: { background: '#16a34a', color: '#fff' } });
    },
    onError: (err) => toast.error(`Erreur : ${err.message}`),
  });

  const [singleDeleteProgress, setSingleDeleteProgress] = useState(null);

  const [deletingFormuleId, setDeletingFormuleId] = useState(null);

  const deleteFormuleMutation = useMutation({
    mutationFn: async ({ formule, onModalClose }) => {
      const nomFormule = formule.nom.split('—')[0].trim();
      const isLastFormule = formules.length === 1;
      const articlesExclusifs = items.filter(i =>
        i.section !== 'tarifs' &&
        i.formules_associees &&
        i.formules_associees.length === 1 &&
        i.formules_associees[0] === nomFormule
      );
      const articlesPartagesMulti = items.filter(i =>
        i.section !== 'tarifs' &&
        i.formules_associees &&
        i.formules_associees.length > 1 &&
        i.formules_associees.includes(nomFormule)
      );
      const total = articlesExclusifs.length + articlesPartagesMulti.length + 1;
      let done = 0;
      setDeletingFormuleId(formule.id);
      setSingleDeleteProgress({ current: done, total, formuleId: formule.id });
      for (const art of articlesExclusifs) {
        await base44.entities.CatalogueItem.delete(art.id);
        done++;
        setSingleDeleteProgress({ current: done, total, formuleId: formule.id });
      }
      for (const art of articlesPartagesMulti) {
        const nouvellesFormules = art.formules_associees.filter(f => f !== nomFormule);
        await base44.entities.CatalogueItem.update(art.id, { formules_associees: nouvellesFormules });
        done++;
        setSingleDeleteProgress({ current: done, total, formuleId: formule.id });
      }
      await base44.entities.CatalogueItem.delete(formule.id);
      done++;
      setSingleDeleteProgress({ current: done, total, formuleId: formule.id });
      if (isLastFormule) {
        const orphelins = items.filter(i =>
          i.section !== 'tarifs' && (!i.formules_associees || i.formules_associees.length === 0)
        );
        for (const art of orphelins) await base44.entities.CatalogueItem.delete(art.id);
      }
    },
    onSuccess: (_, { onModalClose }) => {
      qc.invalidateQueries(['catalogue-items']);
      setSingleDeleteProgress(null);
      setDeletingFormuleId(null);
      onModalClose?.();
      toast.success('Formule supprimée', { position: 'top-center', duration: 3000, style: { background: '#16a34a', color: '#fff' } });
    },
    onError: (err, { onModalClose }) => {
      setSingleDeleteProgress(null);
      setDeletingFormuleId(null);
      onModalClose?.();
      toast.error(`Erreur lors de la suppression : ${err.message}`, { position: 'top-center', duration: 4000 });
    },
  });

  const handleMoveFormule = async ({ formule, articles, mode, categorie }) => {
    if (mode === 'unique') {
      const allergenes = [...new Set(articles.flatMap(a => a.allergenes || []))];
      await base44.entities.OptionPrestation.create({
        nom: formule.nom.split('—')[0].trim(),
        prix: formule.prix || undefined,
        description: formule.description || '',
        allergenes,
        categorie,
        unite: 'Forfait',
        actif: true,
      });
    } else {
      for (const art of articles) {
        await base44.entities.OptionPrestation.create({
          nom: art.nom,
          prix: art.prix || undefined,
          description: art.description || '',
          allergenes: art.allergenes || [],
          categorie,
          unite: 'Forfait',
          actif: true,
        });
      }
    }
    qc.invalidateQueries(['options-prestations']);
    await deleteFormuleMutation.mutateAsync({ formule, onModalClose: undefined });
  };

  if (formules.length === 0) {
    return (
      <div className="text-center py-12 text-muted-foreground">
        <p className="text-4xl mb-3">💰</p>
        <p className="font-medium">Aucune formule créée</p>
        <p className="text-sm mt-1">Créez des articles de type "Formule" dans la section Tarifs du catalogue.</p>
      </div>
    );
  }

  return (
    <div className="space-y-2 pb-[160px]">
      {/* Tout sélectionner */}
      <div className="flex items-center gap-2 pb-1">
        <input
          type="checkbox"
          checked={formules.length > 0 && formules.every(f => selectedIds.includes(f.id))}
          onChange={e => e.target.checked ? setSelectedIds(formules.map(f => f.id)) : setSelectedIds([])}
          className="accent-primary"
        />
        <span className="text-xs text-muted-foreground">Tout sélectionner</span>
      </div>

      {formules.map(formule => {
        const nomSeul = formule.nom.split('—')[0].trim();
        return (
          <FormulaireCard
            key={formule.id}
            formule={formule}
            items={items}
            articlesPartagés={articlesPartagés}
            specifiques={articlesParFormule[nomSeul] || []}
            onGenerateFormulaire={onGenerateFormulaire}
            onDelete={(f, onModalClose) => deleteFormuleMutation.mutate({ formule: f, onModalClose })}
            selected={selectedIds.includes(formule.id)}
            onToggleSelect={toggleSelect}
            onToggleActif={(f) => updateFormuleMutation.mutate({ id: f.id, data: { actif: f.actif === false } })}
            onMoveToOptions={onMoveToOptions}
            onMoveFormule={handleMoveFormule}
            isDeleting={deletingFormuleId === formule.id}
            deleteProgress={singleDeleteProgress?.formuleId === formule.id ? singleDeleteProgress : null}
            formuleNoms={formules.map(f => f.nom.split('—')[0].trim())}
            formulesItems={formules}
            onToggleAChoisir={(item) => toggleAChoisirMutation.mutate(item)}
            onRefresh={() => qc.invalidateQueries(['catalogue-items'])}
            onDeleteArticle={(item) => deleteArticleMutation.mutate(item)}
          />
        );
      })}

      <BulkSelectionBar
        count={selectedIds.length}
        onDelete={() => setBulkDeleteModal(true)}
        onClear={() => setSelectedIds([])}
        progress={deleteProgress}
      />
      <DeleteConfirmModal
        open={bulkDeleteModal}
        title={`Supprimer ${selectedIds.length} formule${selectedIds.length > 1 ? 's' : ''} ?`}
        description="Cette action est irréversible. Les articles exclusifs seront également supprimés."
        onConfirm={() => bulkDeleteMutation.mutate(selectedIds)}
        onCancel={() => setBulkDeleteModal(false)}
        loading={bulkDeleteMutation.isPending}
      />
    </div>
  );
}