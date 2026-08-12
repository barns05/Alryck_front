import { useState } from 'react';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { base44 } from '@/api/base44Client';
import LinkMenuChoicesModal from './LinkMenuChoicesModal';
import { Plus, Pencil, Trash2, X, Check, Upload, ChevronDown, ChevronRight, LayoutGrid, List, Settings2 } from 'lucide-react';
import { toast } from 'sonner';
import DeleteConfirmModal from '@/components/ui/DeleteConfirmModal';
import BulkSelectionBar from '@/components/ui/BulkSelectionBar';
import { Button } from '@/components/ui/button';
import HelpTooltip from '@/components/HelpTooltip';
import { Input } from '@/components/ui/input';
import BrochureImportModal from './BrochureImportModal';

import CreerModal from './CreerModal';
import AllergenesPicker from '@/components/allergenes/AllergenesPicker';
import { useOwnerCompanySettings } from '@/hooks/useOwnerCompanySettings';
import { createQuestionForOption, updateQuestionForOption, archiveQuestionForOption } from '@/lib/optionQuestionSync';
import ChangerCategorieModal from './ChangerCategorieModal';
import { useTVASuggestion, TVA_TAUX } from '@/hooks/useTVASuggestion';

const CATEGORIES = ['Animations', 'Son & Lumières', 'Décoration', 'Location Matériel', 'Prestataires externes', 'Animations culinaires', 'Autre'];

const TYPES_EVENEMENTS = [
  'Mariage', 'Pacs', 'Anniversaire de mariage',
  'Baptême', 'Communion', 'Anniversaire',
  'Gender reveal', 'Baby shower',
  'Fête de fin d\'année', 'Soirée d\'entreprise',
  'Séminaire', 'Cocktail', 'Gala', 'Location', 'Autre'
];

const catColors = {
  'Animations': 'bg-green-100 text-green-700',
  'Son & Lumières': 'bg-purple-100 text-purple-700',
  'Décoration': 'bg-pink-100 text-pink-700',
  'Location Matériel': 'bg-blue-100 text-blue-700',
  'Prestataires externes': 'bg-amber-100 text-amber-700',
  'Animations culinaires': 'bg-orange-100 text-orange-700',
  'Autre': 'bg-slate-100 text-slate-600',
};

const catEmojis = {
  'Animations': '🎭',
  'Son & Lumières': '🎵',
  'Décoration': '🌸',
  'Location Matériel': '📦',
  'Prestataires externes': '🤝',
  'Animations culinaires': '👨‍🍳',
  'Autre': '✨',
};

const UNITES_PRIX = ['Forfait', 'Par personne', 'Par heure', 'Par unité'];

function PrixParAnneeEditor({ value = [], onChange }) {
  const [newAnnee, setNewAnnee] = useState('');
  const [newPrix, setNewPrix] = useState('');

  const ajouter = () => {
    const annee = parseInt(newAnnee);
    const prix = parseFloat(newPrix);
    if (!annee || isNaN(prix)) return;
    const updated = [...value.filter(p => p.annee !== annee), { annee, prix }]
      .sort((a, b) => a.annee - b.annee);
    onChange(updated);
    setNewAnnee('');
    setNewPrix('');
  };

  const supprimer = (annee) => onChange(value.filter(p => p.annee !== annee));

  return (
    <div className="space-y-2">
      {value.map(p => (
        <div key={p.annee} className="flex items-center gap-2 bg-muted/40 rounded-lg px-3 py-1.5">
          <span className="text-xs font-semibold text-muted-foreground w-12">{p.annee}</span>
          <span className="text-xs font-bold text-primary flex-1">{p.prix} €</span>
          <button type="button" onClick={() => supprimer(p.annee)} className="text-muted-foreground hover:text-destructive transition-colors">
            <X size={13} />
          </button>
        </div>
      ))}
      <div className="flex items-center gap-2">
        <input
          type="number" value={newAnnee} onChange={e => setNewAnnee(e.target.value)}
          placeholder="Année" min="2024" max="2035"
          className="flex h-8 w-24 rounded-md border border-input bg-transparent px-2 text-xs focus-visible:outline-none focus-visible:ring-1 focus-visible:ring-ring"
        />
        <input
          type="number" value={newPrix} onChange={e => setNewPrix(e.target.value)}
          placeholder="Prix €" min="0" step="0.01"
          className="flex h-8 flex-1 rounded-md border border-input bg-transparent px-2 text-xs focus-visible:outline-none focus-visible:ring-1 focus-visible:ring-ring"
        />
        <button type="button" onClick={ajouter}
          className="flex items-center gap-1 h-8 px-2 rounded-md bg-primary/10 text-primary text-xs font-medium hover:bg-primary/20 transition-colors">
          <Plus size={12} /> Ajouter
        </button>
      </div>
    </div>
  );
}

function OptionForm({ option, onSave, onCancel, defaultCategorie }) {
  const [form, setForm] = useState({
    nom: option?.nom || '',
    categorie: option?.categorie || defaultCategorie || 'Autre',
    unite: option?.unite || option?.type_prix || 'Forfait',
    prix_par_annee: option?.prix_par_annee || [],
    description: option?.description || '',
    photo_url: option?.photo_url || '',
    allergenes: option?.allergenes || [],
    actif: option?.actif !== false,
    s_applique_a: option?.s_applique_a || [],
    formules_liees: option?.formules_liees || [],
  });
  const { settings } = useOwnerCompanySettings();
  const assujetti = settings?.assujetti_tva !== false;
  const { tvaTaux, changeTaux, prixHT, setPrixHT, prixTTC, setPrixTTC, suggestingTVA, suggestTVA } = useTVASuggestion({
    initialTaux: option?.tva_taux ?? 20,
    initialPrixHT: option?.prix || '',
    initialPrixTTC: option?.prix_ttc || '',
  });
  // Mode saisie : 'ttc' par défaut (saisir TTC, HT calculé auto)
  const [modeSaisie, setModeSaisie] = useState('ttc');
  const [uploading, setUploading] = useState(false);
  const [showAvances, setShowAvances] = useState(false);
  const set = (k, v) => setForm(f => ({ ...f, [k]: v }));

  const { data: catalogueItems = [] } = useQuery({
    queryKey: ['catalogue-items-formules'],
    queryFn: () => base44.entities.CatalogueItem.filter({ type_tarif: 'formule' }),
  });

  const handlePhotoUpload = async (e) => {
    const file = e.target.files?.[0];
    if (!file) return;
    setUploading(true);
    const { file_url } = await base44.integrations.Core.UploadFile({ file });
    set('photo_url', file_url);
    setUploading(false);
  };

  return (
    <div className="bg-muted/30 rounded-xl border border-border p-4 space-y-3">
      <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
        <div>
          <label className="text-xs font-medium text-muted-foreground mb-1 block">Nom de l'option *</label>
          <Input
            value={form.nom}
            onChange={e => set('nom', e.target.value)}
            onBlur={e => { if (assujetti && !option) suggestTVA(e.target.value, form.description); }}
            placeholder="ex: Bar à cocktails"
          />
        </div>
        <div>
          <label className="text-xs font-medium text-muted-foreground mb-1 block">Catégorie</label>
          <select
            value={form.categorie}
            onChange={e => set('categorie', e.target.value)}
            className="flex h-9 w-full rounded-md border border-input bg-transparent px-3 py-1 text-sm shadow-sm focus-visible:outline-none focus-visible:ring-1 focus-visible:ring-ring"
          >
            {CATEGORIES.map(c => <option key={c} value={c}>{c}</option>)}
          </select>
        </div>
        <div className="md:col-span-2">
          <label className="text-xs font-medium text-muted-foreground mb-1 block">Description courte</label>
          <Input
            value={form.description}
            onChange={e => set('description', e.target.value)}
            onBlur={e => { if (assujetti && !option) suggestTVA(form.nom, e.target.value); }}
            placeholder="Description de l'option…"
          />
        </div>
        <div>
          <label className="text-xs font-medium text-muted-foreground mb-1 block">Unité de prix</label>
          <div className="flex flex-wrap gap-1.5">
            {UNITES_PRIX.map(t => (
              <button key={t} type="button" onClick={() => set('unite', t)}
                className={`text-xs py-1.5 px-3 rounded-lg border transition-colors font-medium ${
                  form.unite === t ? 'bg-primary text-primary-foreground border-primary' : 'bg-card border-border text-muted-foreground hover:bg-muted'
                }`}>{t}</button>
            ))}
          </div>
        </div>
        {/* TVA — masqué si franchise */}
        {assujetti && (
          <div>
            <label className="text-xs font-medium text-muted-foreground mb-1 flex items-center gap-2 block">
              Taux TVA
              {suggestingTVA && <span className="text-[10px] text-primary animate-pulse">✨ Amanda analyse…</span>}
            </label>
            <div className="flex gap-1.5">
              {TVA_TAUX.map(t => (
                <button
                  key={t}
                  type="button"
                  onClick={() => changeTaux(t)}
                  className={`flex-1 text-xs py-1.5 rounded-lg border font-semibold transition-colors ${
                    tvaTaux === t ? 'bg-primary text-primary-foreground border-primary' : 'bg-card border-border text-muted-foreground hover:bg-muted'
                  }`}
                >
                  {t}%
                </button>
              ))}
            </div>
          </div>
        )}
        {/* Toggle mode saisie TTC / HT (assujetti seulement) */}
        {assujetti && (
          <div className="md:col-span-2">
            <div className="flex rounded-lg border border-input overflow-hidden w-fit">
              {['ttc', 'ht'].map(m => (
                <button
                  key={m}
                  type="button"
                  onClick={() => setModeSaisie(m)}
                  className={`px-4 py-1.5 text-xs font-semibold transition-colors ${modeSaisie === m ? 'bg-primary text-primary-foreground' : 'bg-transparent text-muted-foreground hover:bg-muted'}`}
                >
                  Saisir en {m.toUpperCase()}
                </button>
              ))}
            </div>
          </div>
        )}
        {/* Champ principal (TTC si mode ttc, HT si mode ht ou franchise) */}
        {assujetti && modeSaisie === 'ttc' ? (
          <>
            <div>
              <label className="text-xs font-medium text-muted-foreground mb-1 block">Prix TTC (€)</label>
              <Input type="number" value={prixTTC} onChange={e => setPrixTTC(e.target.value)} placeholder="0" />
            </div>
            <div>
              <label className="text-xs font-medium text-muted-foreground mb-1 block">Prix HT (calculé)</label>
              <Input type="number" value={prixHT} readOnly tabIndex={-1}
                className="bg-muted/40 text-muted-foreground cursor-default" placeholder="—" />
            </div>
          </>
        ) : (
          <>
            <div>
              <label className="text-xs font-medium text-muted-foreground mb-1 block">{assujetti ? 'Prix HT (€)' : 'Prix (€)'}</label>
              <Input type="number" value={prixHT} onChange={e => setPrixHT(e.target.value)} placeholder="0" />
            </div>
            {assujetti && (
              <div>
                <label className="text-xs font-medium text-muted-foreground mb-1 block">Prix TTC (calculé)</label>
                <Input type="number" value={prixTTC} readOnly tabIndex={-1}
                  className="bg-muted/40 text-muted-foreground cursor-default" placeholder="—" />
              </div>
            )}
          </>
        )}
        <div className="md:col-span-2">
          <label className="text-xs font-medium text-muted-foreground mb-1 block">Prix par année <span className="text-muted-foreground/60 font-normal">(prioritaire sur le prix par défaut)</span></label>
          <PrixParAnneeEditor value={form.prix_par_annee} onChange={v => set('prix_par_annee', v)} />
        </div>
        <div className="md:col-span-2">
          <label className="text-xs font-medium text-muted-foreground mb-1 block">Photo</label>
          <div className="flex items-center gap-3">
            <label className="cursor-pointer">
              <input type="file" accept="image/*" className="hidden" onChange={handlePhotoUpload} disabled={uploading} />
              <div className="flex items-center gap-2 border border-input rounded-lg px-3 py-2 text-xs hover:bg-muted/50 transition-colors">
                <Upload size={13} />
                {uploading ? 'Chargement...' : 'Ajouter une photo'}
              </div>
            </label>
            {form.photo_url && <img src={form.photo_url} alt="Preview" className="h-12 w-12 rounded-lg object-cover border border-border" />}
          </div>
        </div>
      </div>

      {/* Paramètres avancés */}
      <div className="border border-border rounded-lg overflow-hidden">
        <button
          type="button"
          onClick={() => setShowAvances(v => !v)}
          className="w-full flex items-center justify-between px-3 py-2.5 bg-muted/40 hover:bg-muted/60 transition-colors text-left"
        >
          <span className="flex items-center gap-2 text-xs font-semibold text-primary uppercase tracking-wide underline underline-offset-2">
            <Settings2 size={13} /> Paramètres avancés
          </span>
          {showAvances ? <ChevronDown size={14} className="text-muted-foreground" /> : <ChevronRight size={14} className="text-muted-foreground" />}
        </button>
        {showAvances && (
          <div className="p-3 space-y-3">
            {/* Allergènes */}
            <div className="space-y-1.5">
              <label className="text-xs font-medium text-muted-foreground block">🌾 Allergènes</label>
              <AllergenesPicker value={form.allergenes} onChange={v => set('allergenes', v)} compact />
            </div>
            {/* Types d'événements */}
            <div className="space-y-1.5">
              <div>
                <label className="text-xs font-medium text-muted-foreground block">Types d'événements</label>
                <p className="text-xs text-muted-foreground">Laisser vide = visible pour tous</p>
              </div>
              <div className="flex flex-wrap gap-1.5">
                {TYPES_EVENEMENTS.map(type => {
                  const selected = form.s_applique_a.includes(type);
                  return (
                    <button
                      key={type}
                      type="button"
                      onClick={() => set('s_applique_a', selected
                        ? form.s_applique_a.filter(t => t !== type)
                        : [...form.s_applique_a, type]
                      )}
                      className={`text-xs px-2.5 py-1 rounded-full border font-medium transition-colors ${
                        selected
                          ? 'bg-primary text-primary-foreground border-primary'
                          : 'bg-card border-border text-muted-foreground hover:border-primary/50 hover:text-foreground'
                      }`}
                    >
                      {type}
                    </button>
                  );
                })}
              </div>
            </div>
            {/* Associer à une formule */}
            {catalogueItems.length > 0 && (
              <div className="space-y-1.5">
                <label className="text-xs font-medium text-muted-foreground block">Associer à une formule</label>
                <div className="flex flex-wrap gap-1.5">
                  {catalogueItems.map(item => {
                    const selected = form.formules_liees.includes(item.nom);
                    return (
                      <button
                        key={item.id}
                        type="button"
                        onClick={() => set('formules_liees', selected
                          ? form.formules_liees.filter(n => n !== item.nom)
                          : [...form.formules_liees, item.nom]
                        )}
                        className={`text-xs px-2.5 py-1 rounded-full border font-medium transition-colors ${
                          selected
                            ? 'bg-primary text-primary-foreground border-primary'
                            : 'bg-card border-border text-muted-foreground hover:border-primary/50 hover:text-foreground'
                        }`}
                      >
                        {item.nom}
                      </button>
                    );
                  })}
                </div>
              </div>
            )}
          </div>
        )}
      </div>

      <div className="flex gap-2 justify-end">
        <Button variant="outline" size="sm" onClick={onCancel}><X size={14} /> Annuler</Button>
        <Button size="sm" onClick={() => form.nom.trim() && onSave({
          ...form,
          prix: prixHT !== '' ? parseFloat(prixHT) : null,
          prix_ttc: prixTTC !== '' ? parseFloat(prixTTC) : null,
          tva_taux: tvaTaux,
        })} disabled={!form.nom.trim()}>
          <Check size={14} /> Enregistrer
        </Button>
      </div>
    </div>
  );
}

// ── Vue par catégorie ─────────────────────────────────────────────────────────

function OptionRow({ opt, editing, setEditing, onUpdate, onDelete, onToggleActif, onChangeCat, selected, onToggleSelect, onLierMenu }) {
  const [openMenu, setOpenMenu] = useState(false);
  if (editing?.id === opt.id) {
    return (
      <div className="px-4 pb-3">
        <OptionForm option={opt} onSave={(data) => onUpdate(opt.id, data)} onCancel={() => setEditing(null)} />
      </div>
    );
  }
  return (
    <div className={`flex items-start gap-3 px-4 py-3 transition-opacity ${opt.actif === false ? 'opacity-50' : ''}`}>
      <input
        type="checkbox"
        checked={!!selected}
        onChange={() => onToggleSelect(opt.id)}
        onClick={e => e.stopPropagation()}
        className="mt-1 h-4 w-4 rounded border-border accent-primary shrink-0 cursor-pointer"
      />
      {opt.photo_url && (
        <img src={opt.photo_url} alt={opt.nom} className="h-12 w-12 rounded-lg object-cover border border-border shrink-0" />
      )}
      <div className="flex-1 min-w-0">
        <div className="flex items-center gap-2 flex-wrap">
          <p className="font-medium text-sm">{opt.nom}</p>
          {(opt.prix_ttc > 0 || opt.prix > 0) && (
            <span className="text-xs bg-primary/10 text-primary px-2 py-0.5 rounded-full font-medium">
              {opt.prix_ttc > 0
                ? `${opt.prix_ttc} € TTC`
                : `${opt.prix} € HT`
              }
            </span>
          )}
        </div>
        {opt.description && <p className="text-xs text-muted-foreground mt-0.5">{opt.description}</p>}
        {opt.allergenes?.length > 0 && (
          <p className="text-xs text-amber-700 mt-0.5 font-medium">⚠️ {opt.allergenes.length} allergène{opt.allergenes.length > 1 ? 's' : ''}</p>
        )}
      </div>
      <div className="flex items-center gap-1.5 shrink-0">
       <button
         onClick={() => onToggleActif(opt)}
         className={`relative w-10 h-5 rounded-full transition-colors ${opt.actif !== false ? 'bg-emerald-400' : 'bg-slate-300'}`}
         title={opt.actif !== false ? 'Actif' : 'Inactif'}
       >
         <span className={`absolute top-0.5 w-4 h-4 bg-white rounded-full shadow transition-transform ${opt.actif !== false ? 'translate-x-5' : 'translate-x-0.5'}`} />
       </button>
       <button onClick={() => { setEditing(opt); }} className="p-1.5 rounded-lg hover:bg-muted text-muted-foreground hover:text-foreground">
         <Pencil size={14} />
       </button>
       <button onClick={() => onDelete(opt)} className="p-1.5 rounded-lg hover:bg-red-50 text-muted-foreground hover:text-red-600">
         <Trash2 size={14} />
       </button>
       <button onClick={() => onLierMenu(opt)} className="p-1.5 rounded-lg hover:bg-muted text-muted-foreground hover:text-foreground">
         🔗
       </button>
       <button onClick={() => onChangeCat(opt)} className="p-1.5 rounded-lg hover:bg-muted text-muted-foreground hover:text-foreground">
         ↕️
       </button>
      </div>
    </div>
  );
}

function CategorieCard({ categorie, options, editing, setEditing, onUpdate, onDelete, onToggleActif, onAdd, onChangeCat, selectedIds, onToggleSelect, onLierMenu }) {
  const [expanded, setExpanded] = useState(false);
  const [showForm, setShowForm] = useState(false);
  const actifs = options.filter(o => o.actif !== false).length;
  const allergenes = options.filter(o => o.allergenes?.length > 0).length;
  const allActif = options.length > 0 && options.every(o => o.actif !== false);
  const allSelected = options.length > 0 && options.every(o => selectedIds.includes(o.id));

  return (
    <div className="bg-card border border-border rounded-2xl overflow-hidden">
      <div
        className="flex items-center gap-3 px-4 py-3 cursor-pointer hover:bg-muted/30 transition-colors"
        onClick={() => setExpanded(e => !e)}
      >
        <span className="text-xl">{catEmojis[categorie] || '✨'}</span>
        <div className="flex-1 min-w-0">
          <p className="font-semibold text-sm">{categorie}</p>
          <div className="flex items-center gap-3 mt-0.5">
            <span className="text-xs text-muted-foreground">{options.length} option{options.length !== 1 ? 's' : ''}</span>
            <span className="text-xs text-emerald-600">{actifs} active{actifs !== 1 ? 's' : ''}</span>
            {allergenes > 0 && <span className="text-xs text-amber-600">⚠️ {allergenes} allergène{allergenes > 1 ? 's' : ''}</span>}
          </div>
        </div>
        <div className="flex items-center gap-4 shrink-0" onClick={e => e.stopPropagation()}>
          <button
            onClick={() => {
              const newActif = !allActif;
              options.forEach(o => onToggleActif({ ...o, actif: !newActif }));
            }}
            className={`relative w-10 h-5 rounded-full transition-colors ${allActif ? 'bg-emerald-400' : 'bg-slate-300'}`}
            title={allActif ? 'Désactiver tout' : 'Activer tout'}
          >
            <span className={`absolute top-0.5 w-4 h-4 bg-white rounded-full shadow transition-transform ${allActif ? 'translate-x-5' : 'translate-x-0.5'}`} />
          </button>
          {expanded ? <ChevronDown size={16} className="text-muted-foreground" /> : <ChevronRight size={16} className="text-muted-foreground" />}
        </div>
      </div>

      {expanded && (
        <div className="border-t border-border">
          {options.length > 0 && (
            <div className="flex items-center gap-2 px-4 py-2 border-b border-border/50 bg-muted/20">
              <input
                type="checkbox"
                checked={allSelected}
                onChange={() => {
                  if (allSelected) onToggleSelect(null, options.map(o => o.id), 'remove');
                  else onToggleSelect(null, options.map(o => o.id), 'add');
                }}
                className="h-4 w-4 rounded border-border accent-primary cursor-pointer"
              />
              <span className="text-xs text-muted-foreground">Tout sélectionner</span>
            </div>
          )}
          {options.map((opt, i) => (
            <div key={opt.id}>
              {i > 0 && <div className="border-t border-border/50" />}
              <OptionRow
                opt={opt}
                editing={editing}
                setEditing={setEditing}
                onUpdate={onUpdate}
                onDelete={onDelete}
                onToggleActif={onToggleActif}
                onChangeCat={onChangeCat}
                selected={selectedIds.includes(opt.id)}
                onToggleSelect={(id) => onToggleSelect(id)}
                onLierMenu={onLierMenu}
              />
              </div>
              ))}
              {options.length === 0 && !showForm && (
              <p className="text-xs text-muted-foreground px-4 py-3">Aucune option dans cette catégorie.</p>
              )}
          {showForm && (
            <div className="px-4 pb-3 pt-2">
              <OptionForm
                defaultCategorie={categorie}
                onSave={(data) => { onAdd({ ...data, categorie }); setShowForm(false); }}
                onCancel={() => setShowForm(false)}
              />
            </div>
          )}
          <div className="px-4 py-2 border-t border-border/50">
            <button
              onClick={() => setShowForm(s => !s)}
              className="flex items-center gap-1.5 text-xs text-primary hover:underline font-medium"
            >
              <Plus size={12} /> Ajouter une option
            </button>
          </div>
        </div>
      )}
    </div>
  );
}

// ── Vue globale ───────────────────────────────────────────────────────────────

function SectionGlobale({ categorie, options, editing, setEditing, onUpdate, onDelete, onToggleActif, onAdd, onChangeCat, selectedIds, onToggleSelect, onLierMenu }) {
  const [expanded, setExpanded] = useState(true);
  const [showForm, setShowForm] = useState(false);
  const allSelected = options.length > 0 && options.every(o => selectedIds.includes(o.id));

  return (
    <div className="bg-card border border-border rounded-2xl overflow-hidden">
      <div
        className="flex items-center gap-3 px-4 py-3 cursor-pointer hover:bg-muted/30 transition-colors"
        onClick={() => setExpanded(e => !e)}
      >
        <span className="text-lg">{catEmojis[categorie] || '✨'}</span>
        <p className="flex-1 font-semibold text-sm">{categorie}</p>
        <span className="text-xs text-muted-foreground mr-2">{options.length}</span>
        {expanded ? <ChevronDown size={15} className="text-muted-foreground" /> : <ChevronRight size={15} className="text-muted-foreground" />}
      </div>

      {expanded && (
        <div className="border-t border-border">
          {options.length > 0 && (
            <div className="flex items-center gap-2 px-4 py-2 border-b border-border/50 bg-muted/20">
              <input
                type="checkbox"
                checked={allSelected}
                onChange={() => {
                  if (allSelected) onToggleSelect(null, options.map(o => o.id), 'remove');
                  else onToggleSelect(null, options.map(o => o.id), 'add');
                }}
                className="h-4 w-4 rounded border-border accent-primary cursor-pointer"
              />
              <span className="text-xs text-muted-foreground">Tout sélectionner</span>
            </div>
          )}
          {options.map((opt, i) => (
            <div key={opt.id}>
              {i > 0 && <div className="border-t border-border/50" />}
              <OptionRow
                opt={opt}
                editing={editing}
                setEditing={setEditing}
                onUpdate={onUpdate}
                onDelete={onDelete}
                onToggleActif={onToggleActif}
                onChangeCat={onChangeCat}
                selected={selectedIds.includes(opt.id)}
                onToggleSelect={(id) => onToggleSelect(id)}
                onLierMenu={onLierMenu}
              />
              </div>
              ))}
              {showForm && (
              <div className="px-4 pb-3 pt-2">
              <OptionForm
                defaultCategorie={categorie}
                onSave={(data) => { onAdd({ ...data, categorie }); setShowForm(false); }}
                onCancel={() => setShowForm(false)}
              />
              </div>
              )}
              <div className="px-4 py-2 border-t border-border/50">
              <button
              onClick={() => setShowForm(s => !s)}
              className="flex items-center gap-1.5 text-xs text-primary hover:underline font-medium"
              >
              <Plus size={12} /> Ajouter
              </button>
              </div>
              </div>
              )}
              </div>
              );
              }

// ── Composant principal ───────────────────────────────────────────────────────

export default function BlocOptions() {
  const qc = useQueryClient();
  const [vue, setVue] = useState('categorie'); // 'categorie' | 'globale'
  const [editing, setEditing] = useState(null);
  const [showForm, setShowForm] = useState(false);
  const [creerModal, setCreerModal] = useState(false);
  const [amandaFile, setAmandaFile] = useState(null);
  const [deleteModal, setDeleteModal] = useState(null);
  const [bulkDeleteModal, setBulkDeleteModal] = useState(false);
  const [changeCatModal, setChangeCatModal] = useState(null);
  const [changingCat, setChangingCat] = useState(false);
  const [lienMenuOption, setLienMenuOption] = useState(null);
  const [selectedIds, setSelectedIds] = useState([]);

  const { data: options = [] } = useQuery({
    queryKey: ['options-prestations'],
    queryFn: () => base44.entities.OptionPrestation.list(),
  });

  const createMutation = useMutation({
    mutationFn: async (data) => {
      const opt = await base44.entities.OptionPrestation.create(data);
      createQuestionForOption(opt).catch(() => {});
      return opt;
    },
    onSuccess: () => { qc.invalidateQueries(['options-prestations']); setShowForm(false); },
  });

  const updateMutation = useMutation({
    mutationFn: async ({ id, data }) => {
      const opt = await base44.entities.OptionPrestation.update(id, data);
      updateQuestionForOption({ ...data, id }).catch(() => {});
      return opt;
    },
    onSuccess: () => { qc.invalidateQueries(['options-prestations']); setEditing(null); },
  });

  const deleteMutation = useMutation({
    mutationFn: async (id) => {
      await archiveQuestionForOption(id).catch(() => {});
      return base44.entities.OptionPrestation.delete(id);
    },
    onSuccess: () => qc.invalidateQueries(['options-prestations']),
  });

  const toggleActif = (opt) => updateMutation.mutate({ id: opt.id, data: { actif: !opt.actif } });

  const toggleSelect = (id, ids, action) => {
    if (ids) {
      setSelectedIds(prev =>
        action === 'add' ? [...new Set([...prev, ...ids])] : prev.filter(x => !ids.includes(x))
      );
    } else {
      setSelectedIds(prev => prev.includes(id) ? prev.filter(x => x !== id) : [...prev, id]);
    }
  };

  const bulkDelete = useMutation({
    mutationFn: () => Promise.all(selectedIds.map(id => base44.entities.OptionPrestation.delete(id))),
    onSuccess: () => { qc.invalidateQueries(['options-prestations']); setSelectedIds([]); setBulkDeleteModal(false); },
  });

  return (
    <div className="space-y-4">
      {/* Header */}
      <div className="flex items-center justify-between flex-wrap gap-2">
        <div className="flex items-center gap-2">
          <p className="text-sm text-muted-foreground">
            {options.length} option{options.length !== 1 ? 's' : ''} — {options.filter(o => o.actif !== false).length} active{options.filter(o => o.actif !== false).length !== 1 ? 's' : ''}
          </p>
          <HelpTooltip text="Votre catalogue complet de prestations. Ces articles alimentent automatiquement vos devis et bons de commande." />
        </div>
        <div className="flex items-center gap-2">
          {/* Toggle vue */}
          <div className="flex items-center bg-muted rounded-lg p-0.5 border border-border">
            <button
              onClick={() => setVue('categorie')}
              className={`flex items-center gap-1.5 px-3 py-1.5 rounded-md text-xs font-medium transition-colors ${vue === 'categorie' ? 'bg-white text-foreground shadow-sm' : 'text-muted-foreground hover:text-foreground'}`}
            >
              <LayoutGrid size={13} /> Par catégorie
            </button>
            <button
              onClick={() => setVue('globale')}
              className={`flex items-center gap-1.5 px-3 py-1.5 rounded-md text-xs font-medium transition-colors ${vue === 'globale' ? 'bg-white text-foreground shadow-sm' : 'text-muted-foreground hover:text-foreground'}`}
            >
              <List size={13} /> Vue globale
            </button>
          </div>
          <Button size="sm" onClick={() => setCreerModal(true)} className="gap-1.5">
            <Plus size={14} /> Créer
          </Button>
        </div>
      </div>

      {/* Vue par catégorie */}
      {vue === 'categorie' && (
        <div className="space-y-3">
          {CATEGORIES.map(cat => (
            <CategorieCard
              key={cat}
              categorie={cat}
              options={options.filter(o => o.categorie === cat)}
              editing={editing}
              setEditing={setEditing}
              onUpdate={(id, data) => updateMutation.mutate({ id, data })}
              onDelete={setDeleteModal}
              onToggleActif={toggleActif}
              onChangeCat={setChangeCatModal}
              onAdd={(data) => createMutation.mutate(data)}
              selectedIds={selectedIds}
              onToggleSelect={toggleSelect}
              onLierMenu={setLienMenuOption}
            />
          ))}
        </div>
      )}

      {/* Vue globale */}
      {vue === 'globale' && (
        <div className="space-y-3">
          {CATEGORIES.map(cat => (
            <SectionGlobale
              key={cat}
              categorie={cat}
              options={options.filter(o => o.categorie === cat)}
              editing={editing}
              setEditing={setEditing}
              onUpdate={(id, data) => updateMutation.mutate({ id, data })}
              onDelete={setDeleteModal}
              onToggleActif={toggleActif}
              onChangeCat={setChangeCatModal}
              onAdd={(data) => createMutation.mutate(data)}
              selectedIds={selectedIds}
              onToggleSelect={toggleSelect}
              onLierMenu={setLienMenuOption}
            />
          ))}
        </div>
      )}

      {/* Modals */}
      {creerModal && (
        <CreerModal
          title="Option / Prestation"
          onManual={() => { setCreerModal(false); setShowForm(true); setEditing(null); }}
          onImageSimple={async (file) => {
            const { file_url } = await base44.integrations.Core.UploadFile({ file });
            await base44.entities.OptionPrestation.create({ nom: file.name.replace(/\.[^/.]+$/, ''), actif: true, categorie: 'Autre' });
            qc.invalidateQueries(['options-prestations']);
          }}
          onImageAmanda={(file) => { setCreerModal(false); setAmandaFile(file); }}
          onClose={() => setCreerModal(false)}
        />
      )}
      {showForm && !editing && (
        <div className="fixed inset-0 z-50 bg-black/50 backdrop-blur-sm flex items-end sm:items-center justify-center p-0 sm:p-4" onClick={() => setShowForm(false)}>
          <div
            className="bg-card rounded-t-2xl sm:rounded-2xl border border-border shadow-2xl w-full sm:max-w-2xl max-h-[92vh] overflow-y-auto"
            onClick={e => e.stopPropagation()}
          >
            <div className="flex items-center justify-between px-4 py-3 border-b border-border sticky top-0 bg-card z-10">
              <h2 className="font-bold text-base">Nouvelle option / prestation</h2>
              <button onClick={() => setShowForm(false)} className="p-1.5 rounded-lg hover:bg-muted text-muted-foreground">
                <X size={16} />
              </button>
            </div>
            <div className="p-4">
              <OptionForm
                onSave={(data) => { createMutation.mutate(data); setShowForm(false); }}
                onCancel={() => setShowForm(false)}
              />
            </div>
          </div>
        </div>
      )}
      {amandaFile && (
        <BrochureImportModal
          preselectedType="options"
          initialFiles={amandaFile ? [amandaFile] : []}
          onClose={() => setAmandaFile(null)}
          onCreated={() => qc.invalidateQueries(['options-prestations'])}
        />
      )}

      <DeleteConfirmModal
        open={!!deleteModal}
        title={`Supprimer « ${deleteModal?.nom} » ?`}
        onConfirm={() => { deleteMutation.mutate(deleteModal.id); setDeleteModal(null); }}
        onCancel={() => setDeleteModal(null)}
        loading={deleteMutation.isPending}
      />
      <DeleteConfirmModal
        open={bulkDeleteModal}
        title={`Supprimer ${selectedIds.length} option(s) ?`}
        onConfirm={() => bulkDelete.mutate()}
        onCancel={() => setBulkDeleteModal(false)}
        loading={bulkDelete.isPending}
      />
      <ChangerCategorieModal
        open={!!changeCatModal}
        item={changeCatModal}
        categories={CATEGORIES}
        loading={changingCat}
        onCancel={() => setChangeCatModal(null)}
        onConfirm={async (newCat) => {
          setChangingCat(true);
          await updateMutation.mutateAsync({ id: changeCatModal.id, data: { categorie: newCat } });
          toast.success('✓ Catégorie mise à jour', { position: 'top-center', duration: 3000, style: { background: '#16a34a', color: '#fff' } });
          setChangeCatModal(null);
          setChangingCat(false);
        }}
      />
      <BulkSelectionBar
        count={selectedIds.length}
        onDelete={() => setBulkDeleteModal(true)}
        onClear={() => setSelectedIds([])}
      />
      {lienMenuOption && (
        <LinkMenuChoicesModal
          option={lienMenuOption}
          onClose={() => setLienMenuOption(null)}
          onSave={(choixData) => {
            updateMutation.mutate({
              id: lienMenuOption.id,
              data: { choix_menu_lies: choixData.choix_menu_lies }
            });
            setLienMenuOption(null);
          }}
        />
      )}
    </div>
  );
}