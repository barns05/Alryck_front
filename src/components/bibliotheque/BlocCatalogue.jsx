import { useState, useMemo, useRef } from 'react';
import { useQuery, useQueryClient, useMutation } from '@tanstack/react-query';
import { Plus, Trash2, MoreHorizontal, ChevronDown, ChevronUp, X, Check } from 'lucide-react';
import { base44 } from '@/api/base44Client';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import AllergenesPicker from '@/components/allergenes/AllergenesPicker';
import DeleteConfirmModal from '@/components/ui/DeleteConfirmModal';
import BulkSelectionBar from '@/components/ui/BulkSelectionBar';
import VueParFormule from './VueParFormule';
import VueTarifs from './VueTarifs';
import TarifWizardModal from './TarifWizardModal';
import CreerModal from './CreerModal';
import BrochureImportModal from './BrochureImportModal';
import GenerationOrchestrator from '@/components/formulaire/GenerationOrchestrator';
import { toast } from 'sonner';

const CATEGORIES_ALIM = ['Apéritif', 'Entrée', 'Plat', 'Dessert', 'Autre'];
const TYPES_TARIF = [
  { id: 'formule', label: 'Formule/Menu' },
  { id: 'supplement', label: 'Supplément' },
  { id: 'enfant', label: 'Tarif enfant' },
  { id: 'ado', label: 'Tarif ado' },
  { id: 'prestataire', label: 'Prestataire' },
  { id: 'heure_supp', label: 'Heure supplémentaire' },
  { id: 'autre', label: 'Autre' },
];

// ─── Sélecteur de formules associées ──────────────────────────────────────────
function FormulesAssocieesField({ value, onChange, formules }) {
  if (formules.length === 0) return null;
  const isToutesFormules = !value || value.length === 0;
  return (
    <div className="md:col-span-2 space-y-2">
      <label className="text-xs font-medium text-muted-foreground block">📋 Formules associées</label>
      <div className="flex flex-wrap gap-1.5">
        <button
          type="button"
          onClick={() => onChange([])}
          className={`text-xs px-2.5 py-1 rounded-full border font-medium transition-colors ${isToutesFormules ? 'bg-primary text-primary-foreground border-primary' : 'bg-card border-border text-muted-foreground hover:bg-muted'}`}
        >
          ✓ Toutes les formules
        </button>
        {formules.map(f => {
          const checked = value && value.includes(f);
          return (
            <button
              key={f}
              type="button"
              onClick={() => onChange(checked ? value.filter(x => x !== f) : [...(value || []), f])}
              className={`text-xs px-2.5 py-1 rounded-full border font-medium transition-colors ${checked ? 'bg-primary text-primary-foreground border-primary' : 'bg-card border-border text-muted-foreground hover:bg-muted'}`}
            >
              {f}
            </button>
          );
        })}
      </div>
    </div>
  );
}

// ─── Formulaire générique par section ────────────────────────────────────────
function ItemForm({ section, item, fournisseurs, formules, onSave, onCancel }) {
  const [form, setForm] = useState({
    section,
    nom: item?.nom || '',
    categorie: item?.categorie || 'Autre',
    quantite_par_personne: item?.quantite_par_personne || '',
    unite: item?.unite || '',
    par_table: item?.par_table || false,
    allergenes: item?.allergenes || [],
    fournisseur_id: item?.fournisseur_id || '',
    fournisseur_nom: item?.fournisseur_nom || '',
    type_tarif: item?.type_tarif || 'formule',
    prix: item?.prix || '',
    description: item?.description || '',
    formules_associees: item?.formules_associees || [],
    a_choisir: item?.a_choisir || false,
    actif: item?.actif !== false,
  });

  const set = (k, v) => setForm(f => ({ ...f, [k]: v }));

  const handleFournisseur = (id) => {
    const f = fournisseurs.find(x => x.id === id);
    set('fournisseur_id', id);
    set('fournisseur_nom', f?.nom || '');
  };

  const buildPayload = () => {
    const p = { ...form };
    if (p.quantite_par_personne) p.quantite_par_personne = parseFloat(p.quantite_par_personne);
    if (p.prix) p.prix = parseFloat(p.prix);
    return p;
  };

  return (
    <div className="bg-muted/30 border border-border rounded-xl p-4 space-y-3">
      <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
        {/* Nom — toujours */}
        <div className="md:col-span-2">
          <label className="text-xs font-medium text-muted-foreground mb-1 block">Nom *</label>
          <Input value={form.nom} onChange={e => set('nom', e.target.value)} placeholder="ex: Samossas de crevettes" />
        </div>

        {/* Alimentaire */}
        {section === 'alimentaire' && (
          <>
            <div>
              <label className="text-xs font-medium text-muted-foreground mb-1 block">Catégorie</label>
              <select value={form.categorie} onChange={e => set('categorie', e.target.value)}
                className="flex h-9 w-full rounded-md border border-input bg-transparent px-3 text-sm shadow-sm focus-visible:outline-none focus-visible:ring-1 focus-visible:ring-ring">
                {CATEGORIES_ALIM.map(c => <option key={c} value={c}>{c}</option>)}
              </select>
            </div>
            <div className="flex items-center gap-2 mt-1">
              <input type="checkbox" id="a_choisir" checked={form.a_choisir} onChange={e => set('a_choisir', e.target.checked)} className="rounded" />
              <label htmlFor="a_choisir" className="text-xs text-muted-foreground cursor-pointer">À choisir par le client (proposé dans le formulaire)</label>
            </div>
            <div className="flex gap-2">
              <div className="flex-1">
                <label className="text-xs font-medium text-muted-foreground mb-1 block">Qté / personne</label>
                <Input type="number" value={form.quantite_par_personne} onChange={e => set('quantite_par_personne', e.target.value)} placeholder="ex: 5" />
              </div>
              <div className="flex-1">
                <label className="text-xs font-medium text-muted-foreground mb-1 block">Unité</label>
                <Input value={form.unite} onChange={e => set('unite', e.target.value)} placeholder="pièce, g, cl…" />
              </div>
            </div>
          </>
        )}

        {/* Boissons */}
        {section === 'boissons' && (
          <>
            <div className="flex gap-2">
              <div className="flex-1">
                <label className="text-xs font-medium text-muted-foreground mb-1 block">Quantité</label>
                <Input type="number" value={form.quantite_par_personne} onChange={e => set('quantite_par_personne', e.target.value)} placeholder="ex: 75" />
              </div>
              <div className="flex-1">
                <label className="text-xs font-medium text-muted-foreground mb-1 block">Unité</label>
                <Input value={form.unite} onChange={e => set('unite', e.target.value)} placeholder="cl, bouteille…" />
              </div>
            </div>
            <div className="flex items-center gap-2 mt-1">
              <input type="checkbox" id="par_table" checked={form.par_table} onChange={e => set('par_table', e.target.checked)} className="rounded" />
              <label htmlFor="par_table" className="text-xs text-muted-foreground cursor-pointer">Quantité par table (et non par personne)</label>
            </div>
          </>
        )}

        {/* Tarifs */}
        {section === 'tarifs' && (
          <>
            <div>
              <label className="text-xs font-medium text-muted-foreground mb-1 block">Type de tarif</label>
              <select value={form.type_tarif} onChange={e => set('type_tarif', e.target.value)}
                className="flex h-9 w-full rounded-md border border-input bg-transparent px-3 text-sm shadow-sm focus-visible:outline-none focus-visible:ring-1 focus-visible:ring-ring">
                {TYPES_TARIF.map(t => <option key={t.id} value={t.id}>{t.label}</option>)}
              </select>
            </div>
            <div>
              <label className="text-xs font-medium text-muted-foreground mb-1 block">Prix (€)</label>
              <Input type="number" value={form.prix} onChange={e => set('prix', e.target.value)} placeholder="ex: 60" />
            </div>
            <div className="md:col-span-2">
              <label className="text-xs font-medium text-muted-foreground mb-1 block">Description / détails</label>
              <Input value={form.description} onChange={e => set('description', e.target.value)} placeholder="ex: min. 45 personnes, inclus service…" />
            </div>
          </>
        )}

        {/* Inclusions */}
        {section === 'inclusions' && (
          <div className="md:col-span-2">
            <label className="text-xs font-medium text-muted-foreground mb-1 block">Description / détails</label>
            <Input value={form.description} onChange={e => set('description', e.target.value)} placeholder="ex: Location salle avec terrasse" />
          </div>
        )}

        {/* Fournisseur — alimentaire et boissons */}
        {(section === 'alimentaire' || section === 'boissons') && (
          <div className="md:col-span-2">
            <label className="text-xs font-medium text-muted-foreground mb-1 block">Fournisseur</label>
            <select value={form.fournisseur_id} onChange={e => handleFournisseur(e.target.value)}
              className="flex h-9 w-full rounded-md border border-input bg-transparent px-3 text-sm shadow-sm focus-visible:outline-none focus-visible:ring-1 focus-visible:ring-ring">
              <option value="">— Aucun fournisseur —</option>
              {fournisseurs.map(f => <option key={f.id} value={f.id}>{f.nom}</option>)}
            </select>
          </div>
        )}

        {/* Allergènes — alimentaire et boissons */}
        {(section === 'alimentaire' || section === 'boissons') && (
          <div className="md:col-span-2 space-y-1.5">
            <label className="text-xs font-medium text-muted-foreground block">🌾 Allergènes</label>
            <AllergenesPicker value={form.allergenes} onChange={v => set('allergenes', v)} compact />
          </div>
        )}

        {/* Formules associées — toutes sections */}
        <FormulesAssocieesField
          value={form.formules_associees}
          onChange={v => set('formules_associees', v)}
          formules={formules}
        />
      </div>

      <div className="flex gap-2 justify-end pt-1 border-t border-border">
        <Button variant="outline" size="sm" onClick={onCancel}><X size={14} /> Annuler</Button>
        <Button size="sm" onClick={() => form.nom.trim() && onSave(buildPayload())} disabled={!form.nom.trim()}>
          <Check size={14} /> Enregistrer
        </Button>
      </div>
    </div>
  );
}

// ─── Section avec ses items ───────────────────────────────────────────────────
const SECTIONS_CATS = [
  { value: 'alimentaire', label: '🍽️ Alimentaire' },
  { value: 'boissons', label: '🥂 Boissons' },
  { value: 'tarifs', label: '💰 Tarifs' },
  { value: 'inclusions', label: '📋 Services inclus' },
];

function SectionBloc({ sectionDef, items, fournisseurs, formules, onAdd, onEdit, onDelete, onMoveToOptions }) {
  const [open, setOpen] = useState(false);
  const [showForm, setShowForm] = useState(false);
  const [editItem, setEditItem] = useState(null);
  const [deleteItem, setDeleteItem] = useState(null);
  const [selectedIds, setSelectedIds] = useState([]);
  const [bulkDeleteModal, setBulkDeleteModal] = useState(false);

  const toggleSelect = (id) => setSelectedIds(prev => prev.includes(id) ? prev.filter(i => i !== id) : [...prev, id]);

  const typeTarifLabel = (t) => TYPES_TARIF.find(x => x.id === t)?.label || t;

  return (
    <div className="border border-border rounded-2xl overflow-hidden">
      {/* Header section */}
      <button
        className="w-full flex items-center justify-between px-5 py-4 bg-card hover:bg-muted/30 transition-colors"
        onClick={() => setOpen(v => !v)}
      >
        <div className="flex items-center gap-3">
          <span className="text-2xl">{sectionDef.emoji}</span>
          <div className="text-left">
            <p className="font-semibold">{sectionDef.label}</p>
            <p className="text-xs text-muted-foreground">{items.length} article{items.length !== 1 ? 's' : ''} — {sectionDef.desc}</p>
          </div>
        </div>
        <div className="flex items-center gap-2">
          <Button size="sm" variant="outline" className="gap-1" onClick={e => { e.stopPropagation(); setOpen(true); setShowForm(true); setEditItem(null); }}>
            <Plus size={13} /> Ajouter
          </Button>
          {open ? <ChevronUp size={16} className="text-muted-foreground shrink-0" /> : <ChevronDown size={16} className="text-muted-foreground shrink-0" />}
        </div>
      </button>

      {/* Contenu déplié */}
      {open && (
        <div className="border-t border-border px-5 py-4 space-y-3">
          {/* Formulaire création/édition */}
          {showForm && (
            <ItemForm
              section={sectionDef.value}
              item={editItem}
              fournisseurs={fournisseurs}
              formules={formules}
              onSave={(data) => {
                if (editItem) {
                  onEdit(editItem.id, data);
                } else {
                  onAdd(data);
                }
                setShowForm(false);
                setEditItem(null);
              }}
              onCancel={() => { setShowForm(false); setEditItem(null); }}
            />
          )}

          {/* Liste des articles */}
          <div className="space-y-1">
            <div className="flex items-center gap-2 mb-2">
              <input
                type="checkbox"
                checked={items.length > 0 && items.every(i => selectedIds.includes(i.id))}
                onChange={e => e.target.checked ? setSelectedIds(items.map(i => i.id)) : setSelectedIds([])}
                className="accent-primary"
              />
              <span className="text-xs text-muted-foreground">Tous</span>
            </div>
            {items.map(item => (
              <div key={item.id} className="flex items-center gap-2 p-2 rounded-lg hover:bg-muted/30 group transition-colors">
                <input
                  type="checkbox"
                  checked={selectedIds.includes(item.id)}
                  onChange={() => toggleSelect(item.id)}
                  className="accent-primary"
                />
                <div className="flex-1 min-w-0">
                  <p className="text-sm font-medium truncate">{item.nom}</p>
                  {item.description && <p className="text-xs text-muted-foreground truncate">{item.description}</p>}
                </div>
                <div className="flex items-center gap-1 shrink-0 opacity-0 group-hover:opacity-100 transition-opacity">
                  <button onClick={() => { setEditItem(item); setShowForm(true); }} className="p-1 rounded hover:bg-muted text-muted-foreground hover:text-foreground">
                    ✏️
                  </button>
                  <button onClick={() => setDeleteItem(item)} className="p-1 rounded hover:bg-red-50 text-muted-foreground hover:text-red-600">
                    <Trash2 size={13} />
                  </button>
                </div>
              </div>
            ))}
          </div>
        </div>
      )}

      {/* Modales */}
      <DeleteConfirmModal
        open={!!deleteItem}
        title={`Supprimer « ${deleteItem?.nom} » ?`}
        onConfirm={() => { onDelete(deleteItem.id); setDeleteItem(null); }}
        onCancel={() => setDeleteItem(null)}
      />
      <BulkSelectionBar
        count={selectedIds.length}
        onDelete={() => setBulkDeleteModal(true)}
        onClear={() => setSelectedIds([])}
      />
      <DeleteConfirmModal
        open={bulkDeleteModal}
        title={`Supprimer ${selectedIds.length} article${selectedIds.length > 1 ? 's' : ''} ?`}
        onConfirm={() => {
          selectedIds.forEach(id => onDelete(id));
          setSelectedIds([]);
          setBulkDeleteModal(false);
        }}
        onCancel={() => setBulkDeleteModal(false)}
      />
    </div>
  );
}

// ─── Component principal ──────────────────────────────────────────────────────
const SECTIONS = [
  { id: 'alimentaire', emoji: '🍽️', label: 'Alimentaire', desc: 'Entrées, plats, desserts' },
  { id: 'boissons', emoji: '🥂', label: 'Boissons', desc: 'Vins, bières, jus, etc.' },
  { id: 'tarifs', emoji: '💰', label: 'Tarifs', desc: 'Formules, tarifs enfants, etc.' },
  { id: 'inclusions', emoji: '📋', label: 'Services inclus', desc: 'Prestations comprises dans la formule' },
];

export default function BlocCatalogue() {
  const qc = useQueryClient();

  const { data: items = [] } = useQuery({
    queryKey: ['catalogue-items'],
    queryFn: () => base44.entities.CatalogueItem.list('-created_date', 500),
  });

  const { data: fournisseurs = [] } = useQuery({
    queryKey: ['fournisseurs'],
    queryFn: () => base44.entities.Fournisseur.list('-created_date', 200),
  });
  const [vue, setVue] = useState('formule');
  const [creerModal, setCreerModal] = useState(false);
  const [amandaModal, setAmandaModal] = useState(false);
  const [amandaInitialFiles, setAmandaInitialFiles] = useState([]);
  const [selectFormulaModal, setSelectFormulaModal] = useState(null);
  const [tarifModal, setTarifModal] = useState(false);

  const formules = useMemo(() =>
    items.filter(i => i.section === 'tarifs' && i.type_tarif === 'formule').map(f => f.nom.split('—')[0].trim()),
    [items]
  );

  const createMutation = useMutation({
    mutationFn: (data) => base44.entities.CatalogueItem.create(data),
    onSuccess: () => { qc.invalidateQueries(['catalogue-items']); toast.success('✓ Créé'); },
    onError: (err) => toast.error(`Erreur : ${err.message}`),
  });

  const updateMutation = useMutation({
    mutationFn: ({ id, data }) => base44.entities.CatalogueItem.update(id, data),
    onSuccess: () => { qc.invalidateQueries(['catalogue-items']); toast.success('✓ Mis à jour'); },
    onError: (err) => toast.error(`Erreur : ${err.message}`),
  });

  const deleteMutation = useMutation({
    mutationFn: (id) => base44.entities.CatalogueItem.delete(id),
    onSuccess: () => { qc.invalidateQueries(['catalogue-items']); toast.success('✓ Supprimé'); },
    onError: (err) => toast.error(`Erreur : ${err.message}`),
  });

  const totalFormules = items.filter(i => i.section === 'tarifs' && i.type_tarif === 'formule').length;
  const actives = items.filter(i => i.section === 'tarifs' && i.type_tarif === 'formule' && i.actif !== false).length;

  return (
    <div className="space-y-4">
      {/* Header */}
      <div className="flex items-center justify-between flex-wrap gap-2">
        <p className="text-sm text-muted-foreground">
          {totalFormules} formule{totalFormules !== 1 ? 's' : ''} — {actives} active{actives !== 1 ? 's' : ''}
        </p>
        <div className="flex items-center gap-2 flex-wrap">
          {/* Toggle vue */}
          <div className="flex items-center bg-muted rounded-lg p-0.5 border border-border">
            <button
              onClick={() => setVue('formule')}
              className={`px-3 py-1.5 rounded-md text-xs font-medium transition-colors ${
                vue === 'formule' ? 'bg-white text-foreground shadow-sm' : 'text-muted-foreground hover:text-foreground'
              }`}
            >
              Par formule
            </button>
            <button
              onClick={() => setVue('globale')}
              className={`px-3 py-1.5 rounded-md text-xs font-medium transition-colors ${
                vue === 'globale' ? 'bg-white text-foreground shadow-sm' : 'text-muted-foreground hover:text-foreground'
              }`}
            >
              Vue globale
            </button>
            <button
              onClick={() => setVue('tarifs')}
              className={`px-3 py-1.5 rounded-md text-xs font-medium transition-colors ${
                vue === 'tarifs' ? 'bg-white text-foreground shadow-sm' : 'text-muted-foreground hover:text-foreground'
              }`}
            >
              Gérer les tarifs
            </button>
          </div>
          <Button size="sm" onClick={() => setCreerModal(true)} className="gap-1.5 shrink-0">
            <Plus size={14} /> Formule
          </Button>
          {vue !== 'tarifs' && (
            <Button size="sm" onClick={() => setTarifModal(true)} className="gap-1.5 shrink-0 bg-primary text-white">
              <Plus size={14} /> Tarif spécial
            </Button>
          )}

        </div>
      </div>

      {/* Vue par formule */}
      {vue === 'formule' && <VueParFormule items={items} onGenerateFormulaire={(formulaName) => setSelectFormulaModal(formulaName)} onMoveToOptions={async (item) => {
        await base44.entities.OptionPrestation.create({
          nom: item.nom,
          prix: item.prix || undefined,
          description: item.description || '',
          allergenes: item.allergenes || [],
          photo_url: item.photo_url || undefined,
          categorie: 'Autre',
          unite: 'Forfait',
          actif: true,
        });
        await base44.entities.CatalogueItem.delete(item.id);
        qc.invalidateQueries(['catalogue-items']);
        qc.invalidateQueries(['options-prestations']);
        toast.success('✓ Déplacé avec succès', { position: 'top-center', duration: 3000, style: { background: '#16a34a', color: '#fff' } });
      }} />}

      {/* Vue tarifs */}
      {vue === 'tarifs' && <VueTarifs items={items} />}

      {/* Vue globale */}
      {vue === 'globale' && (
        <div className="space-y-3">
          {SECTIONS.map(sec => (
            <SectionBloc
              key={sec.id}
              sectionDef={sec}
              items={items.filter(i => i.section === sec.id)}
              fournisseurs={fournisseurs}
              formules={formules}
              onAdd={(data) => createMutation.mutate(data)}
              onEdit={(id, data) => updateMutation.mutate({ id, data })}
              onDelete={(id) => deleteMutation.mutate(id)}
              onMoveToOptions={async (item) => {
                await base44.entities.OptionPrestation.create({
                  nom: item.nom,
                  prix: item.prix || undefined,
                  description: item.description || '',
                  allergenes: item.allergenes || [],
                  categorie: 'Autre',
                  unite: 'Forfait',
                  actif: true,
                });
                await base44.entities.CatalogueItem.delete(item.id);
                qc.invalidateQueries(['catalogue-items']);
                qc.invalidateQueries(['options-prestations']);
              }}
            />
          ))}
        </div>
      )}

      {creerModal && (
        <CreerModal
          title="Catalogue"
          onManual={() => { setCreerModal(false); }}
          onImageSimple={async (file) => {
            const { file_url } = await base44.integrations.Core.UploadFile({ file });
            await base44.entities.CatalogueItem.create({ section: 'inclusions', nom: file.name.replace(/\.[^/.]+$/, ''), actif: true });
            qc.invalidateQueries(['catalogue-items']);
          }}
          onImageAmanda={(file, allFiles) => { setCreerModal(false); setAmandaInitialFiles(allFiles || (file ? [file] : [])); setAmandaModal(true); }}
          onClose={() => setCreerModal(false)}
        />
      )}

      {amandaModal && (
        <BrochureImportModal
          preselectedType="catalogue"
          initialFiles={amandaInitialFiles}
          onClose={() => { setAmandaModal(false); setAmandaInitialFiles([]); }}
          onCreated={() => qc.invalidateQueries(['catalogue-items'])}
        />
      )}

      {selectFormulaModal && (
        <GenerationOrchestrator
          formulaName={selectFormulaModal}
          onClose={() => setSelectFormulaModal(null)}
        />
      )}

      {tarifModal && (
        <TarifWizardModal
          formulesItems={items.filter(i => i.section === 'tarifs' && i.type_tarif === 'formule')}
          onClose={() => setTarifModal(false)}
          onSaved={() => { qc.invalidateQueries(['catalogue-items']); setTarifModal(false); }}
        />
      )}
    </div>
  );
}