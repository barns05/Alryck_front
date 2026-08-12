/**
 * ModelePickerModal — sélection d'un modèle existant (type='modele') pour
 * créer un contrat client depuis ce modèle. Ouvert depuis ContratsSection
 * (« Depuis un modèle »). Au choix : onPick(modele) ferme le picker et ouvre
 * ContractModal avec modelePreselection (copie en snapshot du modele_url).
 */
import { useState } from 'react';
import { useQuery } from '@tanstack/react-query';
import { base44 } from '@/api/base44Client';
import { X, FileCheck } from 'lucide-react';
import { useTypesEvenement } from '@/hooks/useTypesEvenement';
import { normalizeTypes, typesLabel } from '@/components/bibliotheque/TypeEvenementMultiSelect';

export default function ModelePickerModal({ onClose, onPick }) {
  const [filterType, setFilterType] = useState('Tous');
  const { activeNoms = [] } = useTypesEvenement();

  const { data: modeles = [], isLoading } = useQuery({
    queryKey: ['modeles'],
    queryFn: () => base44.entities.Contrat.filter({ type: 'modele' }, '-created_date', 200),
  });

  const filteredModeles = filterType === 'Tous'
    ? modeles
    : modeles.filter(m => {
        const types = normalizeTypes(m.type_evenement);
        return types.length === 0 || types.includes(filterType);
      });

  const chips = ['Tous', ...activeNoms];

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/40 backdrop-blur-sm p-4">
      <div className="bg-card rounded-2xl border border-border shadow-xl w-full max-w-lg max-h-[80vh] flex flex-col">
        <div className="px-5 py-4 border-b border-border flex items-center justify-between shrink-0">
          <h3 className="font-semibold text-base">Choisir un modèle</h3>
          <button onClick={onClose} className="p-1.5 rounded-lg hover:bg-muted text-muted-foreground">
            <X size={16} />
          </button>
        </div>

        <div className="flex-1 overflow-y-auto p-4 space-y-3">
          {chips.length > 1 && (
            <div className="flex flex-wrap gap-1.5">
              {chips.map(t => (
                <button
                  key={t}
                  onClick={() => setFilterType(t)}
                  className={`px-2.5 py-1 rounded-full text-xs font-medium border transition-colors ${
                    filterType === t
                      ? 'bg-primary text-primary-foreground border-primary'
                      : 'bg-muted/50 text-muted-foreground border-border hover:bg-muted'
                  }`}
                >
                  {t}
                </button>
              ))}
            </div>
          )}

          {isLoading ? (
            <p className="text-xs text-muted-foreground text-center py-6">Chargement…</p>
          ) : filteredModeles.length === 0 ? (
            <div className="text-center py-6 space-y-1">
              <p className="text-sm text-muted-foreground">Aucun modèle disponible.</p>
              <p className="text-xs text-muted-foreground">Créez-en un depuis l'onglet « Mes modèles ».</p>
            </div>
          ) : (
            <div className="space-y-2">
              {filteredModeles.map(m => (
                <button
                  key={m.id}
                  onClick={() => onPick(m)}
                  className="w-full bg-card rounded-xl border border-border p-3 flex items-center gap-3 hover:bg-muted/30 hover:border-primary/30 transition-colors text-left"
                >
                  <FileCheck size={16} className="text-muted-foreground shrink-0" />
                  <div className="flex-1 min-w-0">
                    <p className="text-sm font-medium truncate">{m.titre || 'Modèle'}</p>
                    <p className="text-xs text-muted-foreground truncate">
                      {typesLabel(normalizeTypes(m.type_evenement))}
                      {m.contenu_dynamique ? ' · Dynamique IA' : ''}
                    </p>
                  </div>
                </button>
              ))}
            </div>
          )}
        </div>
      </div>
    </div>
  );
}