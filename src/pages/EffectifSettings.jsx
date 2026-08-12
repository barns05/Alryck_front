import { useState, useEffect } from 'react';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { base44 } from '@/api/base44Client';
import { ArrowLeft, Plus } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { useToast } from '@/components/ui/use-toast';
import { useNavigate } from 'react-router-dom';
import TypeEvenementCard from '@/components/effectif/TypeEvenementCard';
import EffectifConfigPanel from '@/components/effectif/EffectifConfigPanel';

const TYPES_EV_STANDARD = ['Mariage', 'Pacs', 'Anniversaire de mariage', 'Baptême', 'Anniversaire', "Soirée d'entreprise", 'Séminaire', 'Cocktail', 'Gala', 'Location', 'Autre'];
const POSTES = ['Serveur', 'Barman', 'Cuisinier', 'Plongeur', 'Chef de rang', 'Hôte/Hôtesse', 'Autre'];

const DEFAULT_TRANCHES = {
  'Mariage': {
    'Serveur': [{ min: 1, max: 30, personnel: 1 }, { min: 31, max: 60, personnel: 2 }, { min: 61, max: 90, personnel: 3 }],
    'Barman': [{ min: 1, max: 60, personnel: 1 }, { min: 61, max: 120, personnel: 2 }],
    'Cuisinier': [{ min: 1, max: 100, personnel: 1 }, { min: 101, max: 200, personnel: 2 }],
    'Plongeur': [{ min: 1, max: 150, personnel: 1 }],
    'Chef de rang': [{ min: 1, max: 50, personnel: 1 }],
    'Hôte/Hôtesse': [{ min: 1, max: 80, personnel: 1 }],
    'Autre': [{ min: 1, max: 100, personnel: 1 }]
  },
  'Gala': {
    'Serveur': [{ min: 1, max: 20, personnel: 1 }, { min: 21, max: 50, personnel: 2 }, { min: 51, max: 80, personnel: 3 }],
    'Barman': [{ min: 1, max: 40, personnel: 1 }, { min: 41, max: 80, personnel: 2 }],
    'Cuisinier': [{ min: 1, max: 80, personnel: 1 }, { min: 81, max: 160, personnel: 2 }],
    'Plongeur': [{ min: 1, max: 120, personnel: 1 }],
    'Chef de rang': [{ min: 1, max: 40, personnel: 1 }],
    'Hôte/Hôtesse': [{ min: 1, max: 60, personnel: 1 }],
    'Autre': [{ min: 1, max: 80, personnel: 1 }]
  }
};

export default function EffectifSettingsPage() {
  const navigate = useNavigate();
  const qc = useQueryClient();
  const { toast } = useToast();
  const [settings, setSettings] = useState({});
  const [customTypes, setCustomTypes] = useState([]);
  const [selectedType, setSelectedType] = useState(null);
  const [showNewTypeForm, setShowNewTypeForm] = useState(false);
  const [newTypeName, setNewTypeName] = useState('');


  const { data: allSettings = [] } = useQuery({
    queryKey: ['effectif-settings'],
    queryFn: () => base44.entities.EffectifSettings.list(),
  });

  // Initialiser les paramètres
  useEffect(() => {
    const initialized = {};
    const allTypes = [...TYPES_EV_STANDARD, ...customTypes];

    allTypes.forEach(type => {
      const existing = allSettings.find(s => s.type_evenement === type);
      initialized[type] = {
        tranches: existing?.tranches || JSON.parse(JSON.stringify(DEFAULT_TRANCHES[type] || {})),
        postes_actifs: existing?.postes_actifs || {}
      };

      POSTES.forEach(poste => {
        if (!(poste in initialized[type].tranches)) {
          initialized[type].tranches[poste] = DEFAULT_TRANCHES[type]?.[poste]
            ? JSON.parse(JSON.stringify(DEFAULT_TRANCHES[type][poste]))
            : [{ min: 1, max: 100, personnel: 1 }];
        }
        if (!(poste in initialized[type].postes_actifs)) {
          initialized[type].postes_actifs[poste] = true;
        }
      });
    });

    setSettings(initialized);
  }, [allSettings, customTypes]);

  const saveMutation = useMutation({
    mutationFn: async () => {
      const allTypes = [...TYPES_EV_STANDARD, ...customTypes];
      const promises = allTypes.map(type => {
        const existing = allSettings.find(s => s.type_evenement === type);
        const data = {
          type_evenement: type,
          tranches: settings[type]?.tranches || {},
          postes_actifs: settings[type]?.postes_actifs || {},
          personnalise: !TYPES_EV_STANDARD.includes(type)
        };
        if (existing?.id) {
          return base44.entities.EffectifSettings.update(existing.id, data);
        } else {
          return base44.entities.EffectifSettings.create(data);
        }
      });
      return Promise.all(promises);
    },
    onSuccess: () => {
      qc.invalidateQueries(['effectif-settings']);
    },
    onError: (e) => {
      toast({ title: '❌ Erreur', description: e.message, variant: 'destructive' });
    },
  });

  const handleSettingsChange = (type, newTypeSettings) => {
    setSettings(prev => ({ ...prev, [type]: newTypeSettings }));
  };

  const addCustomType = () => {
    if (!newTypeName.trim()) return;
    if (customTypes.includes(newTypeName)) {
      toast({ title: '⚠️ Ce type existe déjà', variant: 'destructive' });
      return;
    }
    setCustomTypes(prev => [...prev, newTypeName]);
    setNewTypeName('');
    setShowNewTypeForm(false);
    toast({ title: `✅ Type "${newTypeName}" ajouté` });
  };

  const deleteCustomType = (type) => {
    setCustomTypes(prev => prev.filter(t => t !== type));
    setSettings(prev => {
      const copy = { ...prev };
      delete copy[type];
      return copy;
    });
    toast({ title: `Supprimé: ${type}` });
  };

  const allTypes = [...TYPES_EV_STANDARD, ...customTypes];
  const countActivePostes = (type) => {
    const postes_actifs = settings[type]?.postes_actifs || {};
    return POSTES.filter(p => postes_actifs[p] !== false).length;
  };

  return (
    <div className="p-4 md:p-6 space-y-6 max-w-6xl mx-auto">
      {/* Header */}
      <div className="flex items-center justify-between gap-3">
        <div className="flex items-center gap-3">
          <Button variant="outline" size="icon" onClick={() => navigate('/PlanningExtras')}>
            <ArrowLeft size={16} />
          </Button>
          <div>
            <h2 className="text-2xl font-bold">⚙️ Paramètres Effectifs</h2>
            <p className="text-muted-foreground text-sm mt-1">Gérez les tranches de personnel par type d'événement</p>
          </div>
        </div>
      </div>

      {/* Grille de cartes */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
        {allTypes.map(type => (
          <TypeEvenementCard
            key={type}
            type={type}
            postesCount={countActivePostes(type)}
            isCustom={customTypes.includes(type)}
            onConfigure={() => setSelectedType(type)}
            onDelete={() => deleteCustomType(type)}
          />
        ))}

        {/* Carte pour ajouter un type */}
        {!showNewTypeForm ? (
          <button
            onClick={() => setShowNewTypeForm(true)}
            className="bg-card rounded-2xl border-2 border-dashed border-border p-5 flex flex-col items-center justify-center gap-3 hover:border-primary/50 hover:bg-primary/5 transition-all cursor-pointer group"
          >
            <div className="text-3xl group-hover:scale-110 transition-transform">➕</div>
            <span className="font-medium text-foreground group-hover:text-primary transition-colors">
              Ajouter un type
            </span>
          </button>
        ) : (
          <div className="bg-card rounded-2xl border border-border p-4 space-y-3 col-span-1">
            <Label className="text-sm">Nom du type</Label>
            <Input
              value={newTypeName}
              onChange={(e) => setNewTypeName(e.target.value)}
              placeholder="Ex: Conférence..."
              autoFocus
              onKeyDown={(e) => {
                if (e.key === 'Enter') addCustomType();
                if (e.key === 'Escape') setShowNewTypeForm(false);
              }}
            />
            <div className="flex gap-2">
              <Button
                variant="outline"
                size="sm"
                onClick={() => setShowNewTypeForm(false)}
                className="flex-1"
              >
                Annuler
              </Button>
              <Button size="sm" onClick={addCustomType} className="flex-1">
                Créer
              </Button>
            </div>
          </div>
        )}
      </div>

      {/* Panel de configuration */}
      {selectedType && (
        <EffectifConfigPanel
          type={selectedType}
          settings={settings}
          onSettingsChange={handleSettingsChange}
          onSave={() => saveMutation.mutate()}
          onClose={() => setSelectedType(null)}
          defaultTranchesForType={DEFAULT_TRANCHES[selectedType]}
        />
      )}


    </div>
  );
}