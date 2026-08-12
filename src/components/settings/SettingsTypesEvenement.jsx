import { useState } from 'react';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { base44 } from '@/api/base44Client';
import { Plus, Pencil, Trash2, X, Check } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { ALL_DEFAULTS } from '@/hooks/useTypesEvenement';

const CATEGORIES = ['Particulier', 'Professionnel'];

const CAT_COLORS = {
  Particulier: 'bg-pink-50 border-pink-200 text-pink-700',
  Professionnel: 'bg-blue-50 border-blue-200 text-blue-700',
};

function TypeRow({ type, onToggle, onEdit, onDelete }) {
  const isDefault = type.is_default;
  return (
    <div className="flex items-center justify-between py-2.5 px-3 rounded-xl border border-border bg-card hover:bg-muted/30 transition-colors">
      <div className="flex items-center gap-3 flex-1 min-w-0">
        <button
          onClick={() => onToggle(type)}
          className={`relative inline-flex h-5 w-9 items-center rounded-full transition-colors shrink-0 ${type.actif !== false ? 'bg-primary' : 'bg-gray-200'}`}
        >
          <span className={`inline-block h-3.5 w-3.5 transform rounded-full bg-white shadow transition-transform ${type.actif !== false ? 'translate-x-4' : 'translate-x-0.5'}`} />
        </button>
        <span className={`text-sm font-medium ${type.actif === false ? 'line-through text-muted-foreground' : 'text-foreground'}`}>
          {type.nom}
        </span>
        {isDefault && (
          <span className="text-xs text-muted-foreground bg-muted px-1.5 py-0.5 rounded-md shrink-0">défaut</span>
        )}
      </div>
      {!isDefault && (
        <div className="flex items-center gap-1 shrink-0 ml-2">
          <button
            onClick={() => onEdit(type)}
            className="p-1.5 rounded-lg hover:bg-muted text-muted-foreground hover:text-foreground transition-colors"
          >
            <Pencil size={13} />
          </button>
          <button
            onClick={() => onDelete(type)}
            className="p-1.5 rounded-lg hover:bg-destructive/10 text-muted-foreground hover:text-destructive transition-colors"
          >
            <Trash2 size={13} />
          </button>
        </div>
      )}
    </div>
  );
}

function CreateEditModal({ type, onClose, onSaved }) {
  const qc = useQueryClient();
  const [form, setForm] = useState({
    nom: type?.nom || '',
    categorie: type?.categorie || 'Particulier',
  });

  const saveMutation = useMutation({
    mutationFn: () => {
      if (type?.id) {
        return base44.entities.TypeEvenement.update(type.id, form);
      }
      return base44.entities.TypeEvenement.create({ ...form, actif: true, is_default: false, ordre: 50 });
    },
    onSuccess: () => {
      qc.invalidateQueries(['types-evenement']);
      onSaved();
    },
  });

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/40 backdrop-blur-sm p-4">
      <div className="bg-card rounded-2xl border border-border shadow-xl w-full max-w-sm p-5 space-y-4">
        <div className="flex items-center justify-between">
          <h3 className="font-semibold">{type?.id ? 'Modifier le type' : 'Nouveau type d\'événement'}</h3>
          <button onClick={onClose} className="p-1.5 rounded-lg hover:bg-muted text-muted-foreground"><X size={15} /></button>
        </div>
        <div className="space-y-3">
          <div className="space-y-1.5">
            <Label>Nom *</Label>
            <Input
              value={form.nom}
              onChange={e => setForm(f => ({ ...f, nom: e.target.value }))}
              placeholder="Ex: Bar mitzvah"
            />
          </div>
          <div className="space-y-1.5">
            <Label>Catégorie *</Label>
            <div className="flex gap-2">
              {CATEGORIES.map(cat => (
                <button
                  key={cat}
                  type="button"
                  onClick={() => setForm(f => ({ ...f, categorie: cat }))}
                  className={`flex-1 py-2 rounded-xl border text-sm font-medium transition-colors ${form.categorie === cat ? 'border-primary bg-primary/10 text-primary' : 'border-border hover:bg-muted text-muted-foreground'}`}
                >
                  {cat === 'Particulier' ? '👤' : '🏢'} {cat}
                </button>
              ))}
            </div>
          </div>
        </div>
        <div className="flex justify-end gap-2">
          <Button variant="outline" size="sm" onClick={onClose}>Annuler</Button>
          <Button
            size="sm"
            onClick={() => saveMutation.mutate()}
            disabled={!form.nom.trim() || saveMutation.isPending}
          >
            {saveMutation.isPending ? '...' : <><Check size={13} /> Enregistrer</>}
          </Button>
        </div>
      </div>
    </div>
  );
}

export default function SettingsTypesEvenement() {
  const qc = useQueryClient();
  const [modalOpen, setModalOpen] = useState(false);
  const [editing, setEditing] = useState(null);

  const { data: dbTypes = [] } = useQuery({
    queryKey: ['types-evenement'],
    queryFn: () => base44.entities.TypeEvenement.list('ordre', 500),
  });

  // Fusionner defaults non encore en DB
  const dbNoms = new Set(dbTypes.map(t => t.nom));
  const defaultsNotInDb = ALL_DEFAULTS.filter(d => !dbNoms.has(d.nom)).map(d => ({ ...d, id: null, actif: true }));
  const allTypes = [...dbTypes, ...defaultsNotInDb].sort((a, b) => {
    if (a.categorie !== b.categorie) return a.categorie === 'Particulier' ? -1 : 1;
    return (a.ordre || 0) - (b.ordre || 0);
  });

  const particuliers = allTypes.filter(t => t.categorie === 'Particulier');
  const professionnels = allTypes.filter(t => t.categorie === 'Professionnel');

  const toggleMutation = useMutation({
    mutationFn: async (type) => {
      const newActif = type.actif === false ? true : false;
      if (type.id) {
        return base44.entities.TypeEvenement.update(type.id, { actif: newActif });
      } else {
        // Créer en DB pour persister l'état
        return base44.entities.TypeEvenement.create({
          nom: type.nom,
          categorie: type.categorie,
          actif: newActif,
          is_default: true,
          ordre: type.ordre || 0,
        });
      }
    },
    onSuccess: () => qc.invalidateQueries(['types-evenement']),
  });

  const deleteMutation = useMutation({
    mutationFn: (id) => base44.entities.TypeEvenement.delete(id),
    onSuccess: () => qc.invalidateQueries(['types-evenement']),
  });

  const handleDelete = (type) => {
    if (!type.id) return;
    if (confirm(`Supprimer le type "${type.nom}" ?`)) {
      deleteMutation.mutate(type.id);
    }
  };

  const TypeSection = ({ label, emoji, types, colorClass }) => (
    <div className="space-y-2">
      <div className={`inline-flex items-center gap-2 px-3 py-1 rounded-lg border text-sm font-semibold ${colorClass}`}>
        <span>{emoji}</span>
        <span>{label}</span>
        <span className="text-xs font-normal opacity-70">({types.filter(t => t.actif !== false).length} actifs)</span>
      </div>
      <div className="space-y-1.5">
        {types.map((type, i) => (
          <TypeRow
            key={type.id || `default-${i}`}
            type={type}
            onToggle={toggleMutation.mutate}
            onEdit={(t) => { setEditing(t); setModalOpen(true); }}
            onDelete={handleDelete}
          />
        ))}
      </div>
    </div>
  );

  return (
    <div className="space-y-6">
      <p className="text-sm text-muted-foreground">
        Les types désactivés n'apparaissent plus dans les menus de création d'événements et de clients.
      </p>

      <div className="flex justify-end">
        <Button
          size="sm"
          className="gap-2"
          onClick={() => { setEditing(null); setModalOpen(true); }}
        >
          <Plus size={14} /> Créer un type
        </Button>
      </div>

      <div className="space-y-6">
        <TypeSection
          label="Particuliers"
          emoji="👤"
          types={particuliers}
          colorClass={CAT_COLORS.Particulier}
        />
        <TypeSection
          label="Professionnels"
          emoji="🏢"
          types={professionnels}
          colorClass={CAT_COLORS.Professionnel}
        />
      </div>

      {modalOpen && (
        <CreateEditModal
          type={editing}
          onClose={() => { setModalOpen(false); setEditing(null); }}
          onSaved={() => { setModalOpen(false); setEditing(null); }}
        />
      )}
    </div>
  );
}