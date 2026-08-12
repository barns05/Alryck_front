import { useState, useMemo, useEffect } from 'react';
import { useQuery } from '@tanstack/react-query';
import { base44 } from '@/api/base44Client';
import { X, Search, Plus } from 'lucide-react';
import { Input } from '@/components/ui/input';
import { Button } from '@/components/ui/button';

const TYPES_TARIF_LABELS = {
  formule: 'Formule', supplement: 'Supplément', enfant: 'Menu enfant',
  ado: 'Menu ado', prestataire: 'Prestataire', heure_supp: 'Heure supplémentaire', autre: 'Autre',
};

export default function OptionsPrestationsModal({ onAdd, onClose }) {
  const [searchQuery, setSearchQuery] = useState('');
  const [tab, setTab] = useState('options'); // 'options' | 'catalogue'
  const [addedId, setAddedId] = useState(null); // ID de l'article récemment ajouté (badge vert)

  const showAdded = (id) => {
    setAddedId(id);
    setTimeout(() => setAddedId(null), 2000);
  };

  const { data: options = [] } = useQuery({
    queryKey: ['options-prestations-all'],
    queryFn: () => base44.entities.OptionPrestation.list('-created_date', 500),
  });

  const { data: catalogueItems = [] } = useQuery({
    queryKey: ['catalogue-tarifs'],
    queryFn: () => base44.entities.CatalogueItem.filter({ actif: true }),
    select: items => items.filter(i => i.section === 'tarifs' && i.prix > 0),
  });

  const filteredOptions = useMemo(() => {
    const q = searchQuery.toLowerCase();
    return options.filter(o => !q || o.nom?.toLowerCase().includes(q));
  }, [options, searchQuery]);

  const filteredCatalogue = useMemo(() => {
    const q = searchQuery.toLowerCase();
    return catalogueItems.filter(o => !q || o.nom?.toLowerCase().includes(q));
  }, [catalogueItems, searchQuery]);

  // Retourne le prix HT à partir d'un article (prix_ttc converti si nécessaire, sinon prix HT)
  const getPrixHT = (item, tvaTaux = 20) => {
    if (item.prix_ttc > 0) return Math.round(item.prix_ttc / (1 + tvaTaux / 100) * 100) / 100;
    return item.prix || 0;
  };

  const handleAddOption = (option) => {
    onAdd({
      id: crypto.randomUUID(),
      description: option.nom || '',
      quantite: 1,
      prix_unitaire_ht: getPrixHT(option),
      tva_taux: 20,
      total_ht: getPrixHT(option),
      remise: 0,
      remise_type: 'pct',
    });
    showAdded(option.id);
  };

  const handleAddCatalogue = (item) => {
    onAdd({
      id: crypto.randomUUID(),
      description: `${item.nom}${item.description ? ` — ${item.description}` : ''}`,
      quantite: 1,
      prix_unitaire_ht: getPrixHT(item),
      tva_taux: 20,
      total_ht: getPrixHT(item),
      remise: 0,
      remise_type: 'pct',
    });
    showAdded(item.id);
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/40 backdrop-blur-sm p-4">
      <div className="bg-card rounded-2xl border border-border shadow-2xl w-full max-w-md max-h-[80vh] flex flex-col">
        {/* Header */}
        <div className="px-5 py-4 border-b border-border flex items-center justify-between shrink-0">
          <h3 className="font-semibold">Ajouter depuis la bibliothèque</h3>
          <button onClick={onClose} className="p-1.5 rounded-lg hover:bg-muted text-muted-foreground">
            <X size={16} />
          </button>
        </div>

        {/* Tabs */}
        <div className="flex border-b border-border shrink-0">
          {[
            { id: 'options', label: `Options/Prestations (${options.length})` },
            { id: 'catalogue', label: `Tarifs catalogue (${catalogueItems.length})` },
          ].map(t => (
            <button key={t.id} onClick={() => setTab(t.id)}
              className={`flex-1 px-3 py-2.5 text-xs font-medium border-b-2 transition-colors ${tab === t.id ? 'border-primary text-primary' : 'border-transparent text-muted-foreground hover:text-foreground'}`}>
              {t.label}
            </button>
          ))}
        </div>

        {/* Contenu */}
        <div className="flex-1 overflow-y-auto p-4 space-y-3">
          {/* Recherche */}
          <div className="relative">
            <Search size={14} className="absolute left-2.5 top-1/2 -translate-y-1/2 text-muted-foreground" />
            <Input type="text" placeholder="Rechercher…" value={searchQuery}
              onChange={e => setSearchQuery(e.target.value)} autoFocus className="pl-8 h-9 text-sm" />
          </div>

          {/* Liste options */}
          {tab === 'options' && (
            filteredOptions.length === 0 ? (
              <p className="text-sm text-muted-foreground text-center py-8">Aucun article trouvé</p>
            ) : (
              <div className="space-y-2">
                {filteredOptions.map(option => (
                  <div key={option.id} className="bg-muted/30 rounded-xl p-3 flex items-start justify-between hover:bg-muted/50 transition-colors">
                    <div className="flex-1 min-w-0">
                      <p className="font-medium text-sm">{option.nom}</p>
                      {option.description && <p className="text-xs text-muted-foreground line-clamp-1 mt-0.5">{option.description}</p>}
                      <p className="text-sm font-bold text-primary mt-1">
                       {option.prix_ttc > 0
                         ? <>{option.prix_ttc.toFixed(2)} € TTC <span className="text-xs font-normal text-muted-foreground">({(option.prix || 0).toFixed(2)} HT)</span></>
                         : <>{(option.prix || 0).toFixed(2)} € HT</>
                       }
                      </p>
                    </div>
                    {addedId === option.id ? (
                     <span className="ml-2 px-2 py-1 rounded-lg bg-emerald-100 text-emerald-700 text-xs font-semibold shrink-0">✅ Ajouté !</span>
                    ) : (
                     <button onClick={() => handleAddOption(option)}
                       className="ml-2 p-1.5 rounded-lg bg-primary text-primary-foreground hover:bg-primary/90 transition-colors shrink-0">
                       <Plus size={16} />
                     </button>
                    )}
                  </div>
                ))}
              </div>
            )
          )}

          {/* Liste catalogue tarifs */}
          {tab === 'catalogue' && (
            filteredCatalogue.length === 0 ? (
              <p className="text-sm text-muted-foreground text-center py-8">Aucun tarif dans le catalogue. Ajoutez des articles de type "Tarifs" dans la Bibliothèque → Catalogue.</p>
            ) : (
              <div className="space-y-2">
                {filteredCatalogue.map(item => (
                  <div key={item.id} className="bg-muted/30 rounded-xl p-3 flex items-start justify-between hover:bg-muted/50 transition-colors">
                    <div className="flex-1 min-w-0">
                      <div className="flex items-center gap-2 flex-wrap">
                        <p className="font-medium text-sm">{item.nom}</p>
                        {item.type_tarif && (
                          <span className="text-xs bg-emerald-100 text-emerald-700 px-2 py-0.5 rounded-full">
                            {TYPES_TARIF_LABELS[item.type_tarif] || item.type_tarif}
                          </span>
                        )}
                      </div>
                      {item.description && <p className="text-xs text-muted-foreground line-clamp-1 mt-0.5">{item.description}</p>}
                      <p className="text-sm font-bold text-primary mt-1">
                        {item.prix_ttc > 0
                          ? <>{item.prix_ttc.toFixed(2)} € TTC <span className="text-xs font-normal text-muted-foreground">({(item.prix || 0).toFixed(2)} HT)</span></>
                          : <>{(item.prix || 0).toFixed(2)} € HT</>
                        }
                      </p>
                    </div>
                    {addedId === item.id ? (
                      <span className="ml-2 px-2 py-1 rounded-lg bg-emerald-100 text-emerald-700 text-xs font-semibold shrink-0">✅ Ajouté !</span>
                    ) : (
                      <button onClick={() => handleAddCatalogue(item)}
                        className="ml-2 p-1.5 rounded-lg bg-primary text-primary-foreground hover:bg-primary/90 transition-colors shrink-0">
                        <Plus size={16} />
                      </button>
                    )}
                  </div>
                ))}
              </div>
            )
          )}
        </div>

        {/* Footer */}
        <div className="px-4 py-3 border-t border-border shrink-0 flex justify-end">
          <Button size="sm" variant="outline" onClick={onClose}>Fermer</Button>
        </div>
      </div>
    </div>
  );
}