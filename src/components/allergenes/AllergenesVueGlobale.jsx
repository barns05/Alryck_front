/**
 * Vue globale des allergènes dans Bibliothèque → Allergènes.
 * Alimentée depuis le Catalogue (CatalogueItem) + Options/Prestations.
 * Groupée par étape de service : Apéritif, Plat, Dessert, Boissons.
 */
import { useState, useMemo } from 'react';
import { useQuery } from '@tanstack/react-query';
import { base44 } from '@/api/base44Client';
import { ALLERGENES_14 } from './AllergenesPicker';
import { ChevronDown, ChevronUp } from 'lucide-react';

// Étapes de service dans l'ordre d'affichage
const ETAPES = [
  { id: 'Apéritif',  emoji: '🥂', label: 'Apéritif',  source: 'alimentaire' },
  { id: 'Entrée',    emoji: '🥗', label: 'Entrée',    source: 'alimentaire' },
  { id: 'Plat',      emoji: '🍽️', label: 'Plat',      source: 'alimentaire' },
  { id: 'Dessert',   emoji: '🍰', label: 'Dessert',   source: 'alimentaire' },
  { id: 'Boissons',  emoji: '🍷', label: 'Boissons',  source: 'boissons'    },
  { id: 'Options',   emoji: '🎯', label: 'Options & Prestations', source: 'option' },
];

function allergenLabel(aId) {
  const a = ALLERGENES_14.find(x => x.id === aId);
  return a ? `${a.emoji} ${a.label}` : aId;
}

function EtapeCard({ etape, items, selectedAllergene }) {
  const [open, setOpen] = useState(true);

  // Filtrer les items qui ont des allergènes (et par sélection si active)
  const itemsFiltres = items.filter(item =>
    item.allergenes?.length > 0 &&
    (!selectedAllergene || item.allergenes.includes(selectedAllergene))
  );

  if (itemsFiltres.length === 0) return null;

  // Tous les allergènes distincts de cette étape
  const allergenesEtape = [...new Set(itemsFiltres.flatMap(i => i.allergenes || []))];

  return (
    <div className="border border-border rounded-2xl overflow-hidden">
      <button
        className="w-full flex items-center justify-between px-5 py-3 bg-card hover:bg-muted/30 transition-colors"
        onClick={() => setOpen(v => !v)}
      >
        <div className="flex items-center gap-3">
          <span className="text-xl">{etape.emoji}</span>
          <div className="text-left">
            <p className="font-semibold text-sm">{etape.label}</p>
            <p className="text-xs text-muted-foreground">{itemsFiltres.length} article{itemsFiltres.length > 1 ? 's' : ''} avec allergènes</p>
          </div>
        </div>
        <div className="flex items-center gap-2">
          <div className="flex flex-wrap gap-1 justify-end max-w-xs">
            {allergenesEtape.map(aId => {
              const a = ALLERGENES_14.find(x => x.id === aId);
              return a ? (
                <span key={aId} className={`text-[10px] px-2 py-0.5 rounded-full font-medium ${
                  selectedAllergene === aId ? 'bg-amber-500 text-white' : 'bg-amber-100 text-amber-800'
                }`}>
                  {a.emoji} {a.label}
                </span>
              ) : null;
            })}
          </div>
          {open ? <ChevronUp size={15} className="text-muted-foreground shrink-0" /> : <ChevronDown size={15} className="text-muted-foreground shrink-0" />}
        </div>
      </button>

      {open && (
        <div className="p-4 border-t border-border bg-muted/10 space-y-2">
          {itemsFiltres.map(item => (
            <div key={item.id} className="bg-card border border-border rounded-xl px-4 py-3 flex items-start justify-between gap-3">
              <div className="min-w-0 flex-1">
                <p className="text-sm font-medium">{item.nom}</p>
                {item.description && <p className="text-xs text-muted-foreground">{item.description}</p>}
              </div>
              <div className="flex flex-wrap gap-1 justify-end shrink-0 max-w-[55%]">
                {(item.allergenes || []).map(aId => {
                  const a = ALLERGENES_14.find(x => x.id === aId);
                  return a ? (
                    <span key={aId} className={`text-[10px] px-2 py-0.5 rounded-full font-medium whitespace-nowrap ${
                      selectedAllergene === aId ? 'bg-amber-500 text-white' : 'bg-amber-100 text-amber-800'
                    }`}>
                      {a.emoji} {a.label}
                    </span>
                  ) : null;
                })}
              </div>
            </div>
          ))}
        </div>
      )}
    </div>
  );
}

export default function AllergenesVueGlobale() {
  const [selectedAllergene, setSelectedAllergene] = useState(null);
  const [selectedFormule, setSelectedFormule] = useState('');

  const { data: catalogueItems = [] } = useQuery({
    queryKey: ['catalogue-items-allergenes'],
    queryFn: () => base44.entities.CatalogueItem.filter({ actif: true }),
  });

  const { data: options = [] } = useQuery({
    queryKey: ['options-prestations'],
    queryFn: () => base44.entities.OptionPrestation.filter({ actif: true }),
  });

  // Liste des formules disponibles
  const formules = useMemo(() =>
    catalogueItems
      .filter(i => i.section === 'tarifs' && i.type_tarif === 'formule')
      .map(i => i.nom),
    [catalogueItems]
  );

  // Items filtrés par formule sélectionnée
  const itemsFiltresParFormule = useMemo(() => {
    if (!selectedFormule) return catalogueItems;
    return catalogueItems.filter(i =>
      i.toutes_formules !== false ||
      (i.formules_associees || []).includes(selectedFormule)
    );
  }, [catalogueItems, selectedFormule]);

  // Construire la map étape → items
  const itemsParEtape = useMemo(() => {
    const map = {};
    ETAPES.forEach(e => { map[e.id] = []; });

    itemsFiltresParFormule.forEach(item => {
      if (item.section === 'alimentaire' && item.categorie && map[item.categorie] !== undefined) {
        map[item.categorie].push({ id: item.id, nom: item.nom, allergenes: item.allergenes || [], description: item.description });
      }
      if (item.section === 'boissons') {
        map['Boissons'].push({ id: item.id, nom: item.nom, allergenes: item.allergenes || [], description: item.description });
      }
    });

    // Options
    options.forEach(opt => {
      if (opt.allergenes?.length > 0) {
        map['Options'].push({ id: `opt-${opt.id}`, nom: opt.nom, allergenes: opt.allergenes || [], description: opt.description });
      }
    });

    return map;
  }, [itemsFiltresParFormule, options]);

  // Statistiques globales par allergène
  const statsByAllergene = useMemo(() => {
    const stats = {};
    ALLERGENES_14.forEach(a => { stats[a.id] = 0; });
    Object.values(itemsParEtape).flat().forEach(item => {
      (item.allergenes || []).forEach(aId => {
        if (stats[aId] !== undefined) stats[aId]++;
      });
    });
    return stats;
  }, [itemsParEtape]);

  const allergenesConcernes = ALLERGENES_14.filter(a => statsByAllergene[a.id] > 0);
  const totalArticles = Object.values(itemsParEtape).flat().filter(i => i.allergenes?.length > 0).length;

  return (
    <div className="space-y-5">
      {/* Filtre formule */}
      {formules.length > 0 && (
        <div className="flex items-center gap-2 flex-wrap">
          <span className="text-xs font-medium text-muted-foreground">Formule :</span>
          <button
            onClick={() => setSelectedFormule('')}
            className={`text-xs px-3 py-1.5 rounded-full border font-medium transition-colors ${!selectedFormule ? 'bg-primary text-primary-foreground border-primary' : 'border-border text-muted-foreground hover:bg-muted'}`}
          >
            Toutes
          </button>
          {formules.map(f => (
            <button
              key={f}
              onClick={() => setSelectedFormule(selectedFormule === f ? '' : f)}
              className={`text-xs px-3 py-1.5 rounded-full border font-medium transition-colors ${selectedFormule === f ? 'bg-primary text-primary-foreground border-primary' : 'border-border text-muted-foreground hover:bg-muted'}`}
            >
              {f}
            </button>
          ))}
        </div>
      )}

      {/* Filtres allergènes */}
      <div className="space-y-2">
        <p className="text-sm font-medium">Filtrer par allergène ({totalArticles} article{totalArticles !== 1 ? 's' : ''} concerné{totalArticles !== 1 ? 's' : ''})</p>
        {allergenesConcernes.length === 0 ? (
          <p className="text-xs text-muted-foreground">Aucun allergène renseigné dans le catalogue actif.</p>
        ) : (
          <div className="flex flex-wrap gap-2">
            <button
              onClick={() => setSelectedAllergene(null)}
              className={`text-xs px-3 py-1.5 rounded-full border font-medium transition-colors ${!selectedAllergene ? 'bg-primary text-primary-foreground border-primary' : 'border-border text-muted-foreground hover:bg-muted'}`}
            >
              Tous ({totalArticles})
            </button>
            {allergenesConcernes.map(a => (
              <button
                key={a.id}
                onClick={() => setSelectedAllergene(selectedAllergene === a.id ? null : a.id)}
                className={`text-xs px-3 py-1.5 rounded-full border font-medium transition-colors ${
                  selectedAllergene === a.id
                    ? 'bg-amber-500 text-white border-amber-500'
                    : 'bg-amber-50 border-amber-200 text-amber-800 hover:bg-amber-100'
                }`}
              >
                {a.emoji} {a.label} ({statsByAllergene[a.id]})
              </button>
            ))}
          </div>
        )}
      </div>

      {/* Carte par étape de service */}
      <div className="space-y-3">
        {ETAPES.map(etape => (
          <EtapeCard
            key={etape.id}
            etape={etape}
            items={itemsParEtape[etape.id] || []}
            selectedAllergene={selectedAllergene}
          />
        ))}
      </div>

      {allergenesConcernes.length === 0 && (
        <div className="text-center py-10 text-muted-foreground text-sm">
          <p className="text-3xl mb-2">⚗️</p>
          <p>Aucun allergène renseigné dans le catalogue.</p>
          <p className="text-xs mt-1">Ajoutez des allergènes sur vos articles dans le Catalogue.</p>
        </div>
      )}

      {/* Note réglementaire */}
      <div className="bg-blue-50 border border-blue-200 rounded-xl p-3 text-xs text-blue-800 flex items-start gap-2">
        <span className="shrink-0">ℹ️</span>
        <span>Cette carte est générée automatiquement depuis le Catalogue et associée aux fiches de service. Vérifiez toujours les informations avec vos fournisseurs et fabricants.</span>
      </div>
    </div>
  );
}