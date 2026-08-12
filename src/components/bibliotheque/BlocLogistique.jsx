import { useState, useMemo } from 'react';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import BlocLogistiqueMateriel from './BlocLogistiqueMateriel';
import BlocLogistiqueVehicules from './BlocLogistiqueVehicules';
import BlocLogistiqueChauffeurs from './BlocLogistiqueChauffeurs';
import { base44 } from '@/api/base44Client';
import { Plus, Pencil, Trash2, X, Check, ChevronDown, ChevronUp, Sparkles } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { toast } from 'sonner';


const TYPES_VEHICULE = ['Camionnette', 'Camion', 'Voiture', 'Remorque', 'Autre'];

// Composant InlineForm et SectionBloc conservés pour compatibilité
function InlineForm({ fields, initial, onSave, onCancel }) {
  const [form, setForm] = useState(initial || {});
  const set = (k, v) => setForm(f => ({ ...f, [k]: v }));
  const requiredKey = fields.find(f => f.required)?.key;

  return (
    <div className="bg-muted/30 border border-border rounded-xl p-4 space-y-3">
      <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
        {fields.map(f => (
          <div key={f.key} className={f.full ? 'md:col-span-2' : ''}>
            <label className="text-xs font-medium text-muted-foreground mb-1 block">{f.label}{f.required ? ' *' : ''}</label>
            {f.type === 'select' ? (
              <select
                value={form[f.key] || ''}
                onChange={e => set(f.key, e.target.value)}
                className="flex h-9 w-full rounded-md border border-input bg-transparent px-3 text-sm shadow-sm focus-visible:outline-none focus-visible:ring-1 focus-visible:ring-ring"
              >
                <option value="">— Sélectionner —</option>
                {f.options.map(o => <option key={o.value || o} value={o.value || o}>{o.label || o}</option>)}
              </select>
            ) : (
              <Input
                type={f.inputType || 'text'}
                value={form[f.key] || ''}
                onChange={e => set(f.key, e.target.value)}
                placeholder={f.placeholder || ''}
              />
            )}
          </div>
        ))}
      </div>
      <div className="flex gap-2 justify-end pt-1 border-t border-border">
        <Button variant="outline" size="sm" onClick={onCancel}><X size={14} /> Annuler</Button>
        <Button size="sm" onClick={() => onSave(form)} disabled={requiredKey ? !form[requiredKey]?.trim?.() : false}>
          <Check size={14} /> Enregistrer
        </Button>
      </div>
    </div>
  );
}

function SectionBloc({ emoji, titre, items, fields, renderRow, onCreate, onUpdate, onDelete }) {
  const [open, setOpen] = useState(false);
  const [showForm, setShowForm] = useState(false);
  const [editItem, setEditItem] = useState(null);

  return (
    <div className="border border-border rounded-2xl overflow-hidden">
      <button
        className="w-full flex items-center justify-between px-5 py-4 bg-card hover:bg-muted/30 transition-colors"
        onClick={() => setOpen(v => !v)}
      >
        <div className="flex items-center gap-3">
          <span className="text-2xl">{emoji}</span>
          <div className="text-left">
            <p className="font-semibold">{titre}</p>
            <p className="text-xs text-muted-foreground">{items.length} élément{items.length !== 1 ? 's' : ''}</p>
          </div>
        </div>
        <div className="flex items-center gap-2">
          <Button size="sm" variant="outline" className="gap-1" onClick={e => { e.stopPropagation(); setOpen(true); setShowForm(true); setEditItem(null); }}>
            <Plus size={13} /> Ajouter
          </Button>
          {open ? <ChevronUp size={16} className="text-muted-foreground" /> : <ChevronDown size={16} className="text-muted-foreground" />}
        </div>
      </button>

      {open && (
        <div className="border-t border-border px-5 py-4 space-y-3">
          {showForm && !editItem && (
            <InlineForm
              fields={fields}
              onSave={(data) => { onCreate(data); setShowForm(false); }}
              onCancel={() => setShowForm(false)}
            />
          )}
          <div className="space-y-2">
            {items.map(item => (
              <div key={item.id}>
                {editItem?.id === item.id ? (
                  <InlineForm
                    fields={fields}
                    initial={item}
                    onSave={(data) => { onUpdate(item.id, data); setEditItem(null); }}
                    onCancel={() => setEditItem(null)}
                  />
                ) : (
                  <div className="flex items-center gap-3 p-3 rounded-xl bg-muted/20 hover:bg-muted/40 group transition-colors">
                    <div className="flex-1 min-w-0">{renderRow(item)}</div>
                    <div className="flex items-center gap-1 opacity-0 group-hover:opacity-100 transition-opacity shrink-0">
                      <button onClick={() => setEditItem(item)} className="p-1.5 rounded-lg hover:bg-muted text-muted-foreground hover:text-foreground">
                        <Pencil size={13} />
                      </button>
                      <button onClick={() => onDelete(item.id)} className="p-1.5 rounded-lg hover:bg-red-50 text-muted-foreground hover:text-red-600">
                        <Trash2 size={13} />
                      </button>
                    </div>
                  </div>
                )}
              </div>
            ))}
            {items.length === 0 && !showForm && (
              <p className="text-sm text-muted-foreground text-center py-4">Aucun élément. Cliquez sur "+ Ajouter".</p>
            )}
          </div>
        </div>
      )}
    </div>
  );
}

export default function BlocLogistique() {
  const qc = useQueryClient();
  const [activeLogTab, setActiveLogTab] = useState('materiel');

  const { data: articles = [] } = useQuery({ queryKey: ['logistique-articles'], queryFn: () => base44.entities.LogistiqueArticle.list() }); // eslint-disable-line
  const { data: vehicules = [] } = useQuery({ queryKey: ['logistique-vehicules'], queryFn: () => base44.entities.LogistiqueVehicule.list() });
  const { data: extras = [] } = useQuery({ queryKey: ['extras'], queryFn: () => base44.entities.Extra.list() });
  const { data: collaborateurs = [] } = useQuery({ queryKey: ['collaborateurs'], queryFn: () => base44.entities.Collaborateur.list() });

  // Toutes les personnes pouvant conduire (chauffeurs en tête, autres ensuite)
  const conducteurs = useMemo(() => {
    const liste = [
      ...extras.filter(e => e.actif !== false).map(e => ({ id: e.id, nom: e.nom, type: 'extra', isChauffeur: (e.competences || []).includes('Chauffeur / Livreur') })),
      ...collaborateurs.filter(c => c.actif !== false).map(c => ({ id: c.id, nom: c.nom, type: 'collaborateur', isChauffeur: c.poste_fonction === 'Chauffeur / Livreur' })),
    ];
    return [
      ...liste.filter(p => p.isChauffeur),
      ...liste.filter(p => !p.isChauffeur),
    ];
  }, [extras, collaborateurs]);

  // artCreate/artUpdate/artDelete sont délégués à BlocLogistiqueMateriel

  const vehCreate = useMutation({ mutationFn: d => base44.entities.LogistiqueVehicule.create(d), onSuccess: () => { qc.invalidateQueries(['logistique-vehicules']); toast.success('✓ Créé'); } });
  const vehUpdate = useMutation({ mutationFn: ({ id, data }) => base44.entities.LogistiqueVehicule.update(id, data), onSuccess: () => { qc.invalidateQueries(['logistique-vehicules']); toast.success('✓ Mis à jour'); } });
  const vehDelete = useMutation({ mutationFn: id => base44.entities.LogistiqueVehicule.delete(id), onSuccess: () => { qc.invalidateQueries(['logistique-vehicules']); toast.success('✓ Supprimé'); } });



  const vehiculeFields = [
    { key: 'nom', label: 'Nom / Immatriculation', required: true, placeholder: 'ex: AB-123-CD', full: true },
    { key: 'type_vehicule', label: 'Type', type: 'select', options: TYPES_VEHICULE },
    { key: 'capacite', label: 'Capacité', placeholder: 'ex: 20 m³ ou 1500 kg' },
    {
      key: 'chauffeur_id',
      label: '🚚 Chauffeur assigné (optionnel)',
      type: 'select',
      full: true,
      options: [
        { value: '', label: '— Aucun chauffeur —' },
        ...conducteurs.filter(c => c.isChauffeur).map(c => ({ value: c.id, label: `🚚 ${c.nom}` })),
        ...conducteurs.filter(c => !c.isChauffeur).map(c => ({ value: c.id, label: c.nom })),
      ],
    },
  ];

  const handleVehiculeCreate = (data) => {
    const conducteur = conducteurs.find(c => c.id === data.chauffeur_id);
    vehCreate.mutate({ ...data, chauffeur_nom: conducteur?.nom || '', chauffeur_type: conducteur?.type || '' });
  };
  const handleVehiculeUpdate = (id, data) => {
    const conducteur = conducteurs.find(c => c.id === data.chauffeur_id);
    vehUpdate.mutate({ id, data: { ...data, chauffeur_nom: conducteur?.nom || '', chauffeur_type: conducteur?.type || '' } });
  };

  return (
    <div className="space-y-4">
      {/* Matériel & Règles */}
      <BlocLogistiqueMateriel onTabChange={setActiveLogTab} />

      {activeLogTab === 'materiel' && (
        <>
          <div className="border-t border-border pt-2" />
          <BlocLogistiqueVehicules
            vehicules={vehicules}
            conducteurs={conducteurs}
            onCreateVehicule={handleVehiculeCreate}
            onUpdateVehicule={handleVehiculeUpdate}
            onDeleteVehicule={id => vehDelete.mutate(id)}
          />
          <BlocLogistiqueChauffeurs chauffeurs={conducteurs.filter(c => c.isChauffeur)} />
        </>
      )}
    </div>
  );
}