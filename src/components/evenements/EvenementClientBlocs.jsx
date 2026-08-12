/**
 * Composant admin pour gérer les blocs client :
 * Programme de la journée, Menu, Plan de table, Checklist
 */
import { useState } from 'react';
import { useMutation, useQueryClient } from '@tanstack/react-query';
import { base44 } from '@/api/base44Client';
import { Plus, Trash2, Upload, Loader2, GripVertical } from 'lucide-react';
import { Input } from '@/components/ui/input';
import { Button } from '@/components/ui/button';

function SectionHeader({ title, emoji }) {
  return (
    <h4 className="text-xs font-semibold uppercase tracking-wider text-muted-foreground mb-3 flex items-center gap-1.5">
      <span>{emoji}</span> {title}
    </h4>
  );
}

export default function EvenementClientBlocs({ evenement }) {
  const qc = useQueryClient();
  const [saving, setSaving] = useState(false);

  // Programme
  const [programme, setProgramme] = useState(evenement.programme_journee || []);
  const [newHeure, setNewHeure] = useState('');
  const [newIntitule, setNewIntitule] = useState('');

  // Menu
  const [menu, setMenu] = useState(evenement.menu || { entree: '', plat: '', dessert: '', boissons: '', options_speciales: '' });

  // Plan de table
  const [uploadingPlan, setUploadingPlan] = useState(false);
  const planUrl = evenement.plan_table_url;
  const planNom = evenement.plan_table_nom;

  // Checklist
  const [checklist, setChecklist] = useState(evenement.checklist || []);
  const [newTask, setNewTask] = useState('');

  const save = async (data) => {
    setSaving(true);
    await base44.entities.Evenement.update(evenement.id, data);
    qc.invalidateQueries(['evenements']);
    setSaving(false);
  };

  // Programme
  const addEtape = () => {
    if (!newIntitule.trim()) return;
    const updated = [...programme, { heure: newHeure, intitule: newIntitule.trim() }];
    setProgramme(updated);
    setNewHeure('');
    setNewIntitule('');
    save({ programme_journee: updated });
  };
  const removeEtape = (i) => {
    const updated = programme.filter((_, idx) => idx !== i);
    setProgramme(updated);
    save({ programme_journee: updated });
  };

  // Menu
  const saveMenu = () => save({ menu });

  // Plan de table
  const handlePlanUpload = async (e) => {
    const file = e.target.files?.[0];
    if (!file) return;
    setUploadingPlan(true);
    const { file_url } = await base44.integrations.Core.UploadFile({ file });
    await save({ plan_table_url: file_url, plan_table_nom: file.name });
    setUploadingPlan(false);
    e.target.value = '';
  };
  const removePlan = () => save({ plan_table_url: '', plan_table_nom: '' });

  // Checklist
  const addTask = () => {
    if (!newTask.trim()) return;
    const updated = [...checklist, { id: Date.now().toString(), label: newTask.trim(), checked: false }];
    setChecklist(updated);
    setNewTask('');
    save({ checklist: updated });
  };
  const removeTask = (id) => {
    const updated = checklist.filter(t => t.id !== id);
    setChecklist(updated);
    save({ checklist: updated });
  };

  return (
    <div className="space-y-6">

      {/* Programme de la journée */}
      <div>
        <SectionHeader title="Programme de la journée" emoji="🗓️" />
        <div className="space-y-1.5 mb-2">
          {programme.map((etape, i) => (
            <div key={i} className="flex items-center gap-2 bg-muted/40 rounded-lg px-3 py-2">
              <span className="text-xs font-mono text-muted-foreground w-12 shrink-0">{etape.heure}</span>
              <span className="text-sm flex-1">{etape.intitule}</span>
              <button onClick={() => removeEtape(i)} className="text-muted-foreground hover:text-destructive transition-colors">
                <Trash2 size={13} />
              </button>
            </div>
          ))}
        </div>
        <div className="flex gap-2">
          <Input
            type="time"
            value={newHeure}
            onChange={e => setNewHeure(e.target.value)}
            className="w-28 shrink-0"
            placeholder="Heure"
          />
          <Input
            value={newIntitule}
            onChange={e => setNewIntitule(e.target.value)}
            placeholder="Ex: Cocktail d'accueil"
            onKeyDown={e => e.key === 'Enter' && addEtape()}
          />
          <Button size="sm" variant="outline" onClick={addEtape} disabled={!newIntitule.trim()}>
            <Plus size={14} />
          </Button>
        </div>
      </div>

      {/* Menu */}
      <div>
        <SectionHeader title="Menu" emoji="🍽️" />
        <div className="space-y-2">
          {[
            { key: 'entree', label: 'Entrée', placeholder: 'Ex: Velouté de butternut...' },
            { key: 'plat', label: 'Plat principal', placeholder: 'Ex: Filet de bœuf...' },
            { key: 'dessert', label: 'Dessert', placeholder: 'Ex: Pièce montée...' },
            { key: 'boissons', label: 'Boissons', placeholder: 'Ex: Champagne, vins...' },
            { key: 'options_speciales', label: 'Options spéciales', placeholder: 'Ex: Menu végétarien disponible, sans gluten...' },
          ].map(({ key, label, placeholder }) => (
            <div key={key} className="space-y-0.5">
              <label className="text-xs text-muted-foreground">{label}</label>
              <Input
                value={menu[key] || ''}
                onChange={e => setMenu(m => ({ ...m, [key]: e.target.value }))}
                placeholder={placeholder}
              />
            </div>
          ))}
        </div>
        <Button size="sm" className="mt-2" onClick={saveMenu} disabled={saving}>
          {saving ? <Loader2 size={13} className="animate-spin" /> : 'Sauvegarder le menu'}
        </Button>
      </div>

      {/* Plan de table */}
      <div>
        <SectionHeader title="Plan de table" emoji="🪑" />
        {planUrl ? (
          <div className="space-y-2">
            <div className="flex items-center gap-2 bg-muted/40 rounded-lg px-3 py-2">
              <span className="text-sm flex-1 truncate">{planNom || 'Plan de table'}</span>
              <a href={planUrl} target="_blank" rel="noopener noreferrer" className="text-xs text-primary hover:underline shrink-0">Voir</a>
              <button onClick={removePlan} className="text-muted-foreground hover:text-destructive transition-colors shrink-0">
                <Trash2 size={13} />
              </button>
            </div>
          </div>
        ) : (
          <label className="cursor-pointer block">
            <input type="file" accept="image/*,.pdf" className="hidden" onChange={handlePlanUpload} disabled={uploadingPlan} />
            <div className={`flex items-center justify-center gap-2 border-2 border-dashed rounded-xl py-3 transition-colors text-sm
              ${uploadingPlan ? 'border-muted text-muted-foreground' : 'border-primary/30 text-primary hover:border-primary/60 hover:bg-primary/5'}`}>
              {uploadingPlan ? <><Loader2 size={14} className="animate-spin" /> Upload en cours...</> : <><Upload size={14} /> Uploader image ou PDF</>}
            </div>
          </label>
        )}
      </div>

      {/* Checklist */}
      <div>
        <SectionHeader title="Fiche de préparation" emoji="✅" />
        <div className="space-y-1.5 mb-2">
          {checklist.map(task => (
            <div key={task.id} className="flex items-center gap-2 bg-muted/40 rounded-lg px-3 py-2">
              <span className="text-sm flex-1">{task.label}</span>
              {task.checked && <span className="text-xs text-emerald-600 font-medium shrink-0">✓ Coché</span>}
              <button onClick={() => removeTask(task.id)} className="text-muted-foreground hover:text-destructive transition-colors shrink-0">
                <Trash2 size={13} />
              </button>
            </div>
          ))}
        </div>
        {checklist.length > 0 && (
          <div className="mb-2 text-xs text-muted-foreground">
            Progression : {checklist.filter(t => t.checked).length}/{checklist.length} étapes complétées
          </div>
        )}
        <div className="flex gap-2">
          <Input
            value={newTask}
            onChange={e => setNewTask(e.target.value)}
            placeholder="Ex: Confirmer le traiteur"
            onKeyDown={e => e.key === 'Enter' && addTask()}
          />
          <Button size="sm" variant="outline" onClick={addTask} disabled={!newTask.trim()}>
            <Plus size={14} />
          </Button>
        </div>
      </div>
    </div>
  );
}