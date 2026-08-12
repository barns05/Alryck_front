import { useState, useEffect } from 'react';
import { useQuery } from '@tanstack/react-query';
import { base44 } from '@/api/base44Client';
import { Button } from '@/components/ui/button';
import { X, Check } from 'lucide-react';
import { toast } from 'sonner';

const CAT_EMOJIS = {
  'Animations': '🎭',
  'Son & Lumières': '🎵',
  'Décoration': '🌸',
  'Location Matériel': '📦',
  'Prestataires externes': '🤝',
  'Animations culinaires': '👨‍🍳',
  'Autre': '✨',
};

export default function LinkMenuChoicesModal({ option, onClose, onSave }) {
  const [selected, setSelected] = useState([]);

  const { data: choices = [] } = useQuery({
    queryKey: ['menu-choices'],
    queryFn: () => base44.entities.CatalogueItem.filter({ a_choisir: true, actif: true }),
  });

  // Initialiser la sélection avec les choix existants
  useEffect(() => {
    if (option?.choix_menu_lies && Array.isArray(option.choix_menu_lies)) {
      setSelected(option.choix_menu_lies);
    }
  }, [option]);

  // Grouper par catégorie
  const grouped = choices.reduce((acc, item) => {
    const cat = item.categorie || 'Autre';
    if (!acc[cat]) acc[cat] = [];
    acc[cat].push(item);
    return acc;
  }, {});

  const handleToggle = (itemId) => {
    setSelected(prev =>
      prev.includes(itemId) ? prev.filter(id => id !== itemId) : [...prev, itemId]
    );
  };

  const handleSave = async () => {
    try {
      await onSave({ choix_menu_lies: selected });
      toast.success('✓ Choix du menu enregistrés', { position: 'top-center' });
      onClose();
    } catch (err) {
      toast.error('Erreur lors de l\'enregistrement');
    }
  };

  return (
    <div className="fixed inset-0 z-50 bg-black/40 flex items-center justify-center p-4">
      <div className="bg-white dark:bg-slate-900 rounded-2xl shadow-2xl w-full max-w-2xl max-h-[80vh] overflow-hidden flex flex-col">
        {/* Header */}
        <div className="flex items-center justify-between p-4 border-b border-border">
          <h2 className="text-lg font-semibold">Associer des choix au menu</h2>
          <button onClick={onClose} className="p-1 rounded-lg hover:bg-muted">
            <X size={18} />
          </button>
        </div>

        {/* Bandeau explicatif */}
         <div className="px-4 py-3 bg-blue-50 dark:bg-blue-950/20 border-b border-blue-200 dark:border-blue-900/50">
           <p className="text-sm text-blue-900 dark:text-blue-100">
             Ces choix permettent de détecter automatiquement si cette option est déjà incluse dans le menu du client. Si le client sélectionne ce choix dans son questionnaire, l'option apparaîtra comme ✓ Inclus dans votre formule.
           </p>
         </div>

        {/* Contenu scrollable */}
        <div className="flex-1 overflow-y-auto p-4 space-y-4">
          {Object.entries(grouped).length === 0 ? (
            <p className="text-sm text-muted-foreground text-center py-6">
              Aucun choix disponible. Créez d'abord des articles à choix actifs.
            </p>
          ) : (
            Object.entries(grouped).map(([cat, items]) => (
              <div key={cat} className="rounded-2xl border border-border overflow-hidden">
                <div className="px-4 py-2 bg-muted/40 border-b border-border">
                  <span className="text-xs font-semibold uppercase tracking-wider text-muted-foreground">
                    {CAT_EMOJIS[cat] || '✨'} {cat}
                  </span>
                </div>
                <div className="px-4 py-3 space-y-2">
                  <div className="flex flex-wrap gap-2">
                    {items.map(item => {
                      const checked = selected.includes(item.id);
                      return (
                        <button
                          key={item.id}
                          onClick={() => handleToggle(item.id)}
                          className={`flex items-center gap-1.5 px-3 py-1.5 rounded-full text-sm font-medium transition-colors border ${
                            checked
                              ? 'bg-primary text-primary-foreground border-primary'
                              : 'bg-white border-border text-foreground hover:border-primary/50'
                          }`}
                        >
                          {checked && <Check size={14} />}
                          {item.nom}
                          {item.prix > 0 && <span className="text-xs opacity-75">({item.prix}€)</span>}
                        </button>
                      );
                    })}
                  </div>
                </div>
              </div>
            ))
          )}
        </div>

        {/* Footer */}
        <div className="flex gap-2 justify-end px-4 py-3 border-t border-border bg-muted/20">
          <Button variant="outline" size="sm" onClick={onClose}>
            <X size={14} /> Annuler
          </Button>
          <Button size="sm" onClick={handleSave}>
            <Check size={14} /> Enregistrer ({selected.length})
          </Button>
        </div>
      </div>
    </div>
  );
}