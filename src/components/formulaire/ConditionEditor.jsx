/**
 * Interface pour configurer les conditions de visibilité d'un champ.
 */
import { useState } from 'react';
import { Plus, Trash2, ChevronDown, ChevronUp } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import CustomSelect from '@/components/ui/CustomSelect';

const OPERATEURS = [
  { value: 'egal', label: 'est égal à' },
  { value: 'different', label: 'est différent de' },
  { value: 'superieur', label: 'est supérieur à' },
  { value: 'inferieur', label: 'est inférieur à' },
  { value: 'contient', label: 'contient' },
];

function generateId() {
  return Math.random().toString(36).slice(2, 9);
}

export default function ConditionEditor({ conditions = [], onChange, champsDisponibles, champActuelId }) {
  const [open, setOpen] = useState(false);

  const addCondition = () => {
    const newCondition = {
      id: generateId(),
      champ_declencheur_id: '',
      champ_declencheur_label: '',
      operateur: 'egal',
      valeur: '',
      action: 'afficher',
    };
    onChange([...conditions, newCondition]);
  };

  const updateCondition = (idx, fields) => {
    const updated = [...conditions];
    updated[idx] = { ...updated[idx], ...fields };
    onChange(updated);
  };

  const removeCondition = (idx) => {
    onChange(conditions.filter((_, i) => i !== idx));
  };

  // Filtre les champs disponibles (exclut le champ actuel)
  const champsSelectionnables = champsDisponibles.filter(c => c.id !== champActuelId);

  return (
    <div className="border-t border-border pt-3 mt-3 space-y-2">
      <button
        type="button"
        onClick={() => setOpen(v => !v)}
        className="text-xs font-medium text-primary hover:underline flex items-center gap-1"
      >
        {open ? <ChevronUp size={12} /> : <ChevronDown size={12} />}
        {conditions.length > 0 ? `${conditions.length} condition(s)` : 'Ajouter une condition'}
      </button>

      {open && (
        <div className="space-y-2 pl-3 border-l-2 border-primary/30">
          {conditions.length === 0 && (
            <p className="text-xs text-muted-foreground italic py-2">Aucune condition. Cliquez sur "Ajouter une condition" pour en créer une.</p>
          )}

          {conditions.map((cond, idx) => {
            const champDepart = champsSelectionnables.find(c => c.id === cond.champ_declencheur_id);
            return (
              <div key={cond.id} className="bg-muted/40 rounded-lg p-2.5 space-y-2">
                {/* Ligne de condition */}
                <div className="grid grid-cols-12 gap-2 items-center text-xs">
                  {/* Champ déclencheur */}
                  <div className="col-span-4">
                    <CustomSelect
                      value={cond.champ_declencheur_id}
                      onChange={(val) => {
                        const selected = champsSelectionnables.find(c => c.id === val);
                        updateCondition(idx, {
                          champ_declencheur_id: val,
                          champ_declencheur_label: selected?.label || '',
                        });
                      }}
                      options={champsSelectionnables.map(c => ({ value: c.id, label: c.label }))}
                      placeholder="— Choisir —"
                    />
                  </div>

                  {/* Opérateur */}
                  <div className="col-span-3">
                    <CustomSelect
                      value={cond.operateur}
                      onChange={(val) => updateCondition(idx, { operateur: val })}
                      options={OPERATEURS.map(op => ({ value: op.value, label: op.label }))}
                    />
                  </div>

                  {/* Valeur */}
                  <div className="col-span-3">
                    {champDepart && ['choix_unique', 'liste', 'cases_a_cocher', 'oui_non'].includes(champDepart.type) ? (
                      <CustomSelect
                        value={cond.valeur}
                        onChange={(val) => updateCondition(idx, { valeur: val })}
                        options={(champDepart.options || []).map(opt => ({ value: opt, label: opt }))}
                        placeholder="— Valeur —"
                      />
                    ) : (
                      <Input
                        type={champDepart?.type === 'nombre' ? 'number' : 'text'}
                        value={cond.valeur}
                        onChange={e => updateCondition(idx, { valeur: e.target.value })}
                        placeholder="Valeur…"
                        className="text-sm h-8"
                      />
                    )}
                  </div>

                  {/* Bouton supprimer */}
                  <div className="col-span-2 flex justify-end">
                    <button onClick={() => removeCondition(idx)} className="text-destructive hover:text-destructive/80 p-1 rounded-md hover:bg-destructive/10">
                      <Trash2 size={12} />
                    </button>
                  </div>
                </div>

                {/* Action */}
                <div className="flex items-center gap-2">
                  <span className="text-xs font-medium text-muted-foreground">Alors :</span>
                  <CustomSelect
                    value={cond.action}
                    onChange={(val) => updateCondition(idx, { action: val })}
                    options={[
                      { value: 'afficher', label: 'Afficher ce champ' },
                      { value: 'masquer', label: 'Masquer ce champ' },
                    ]}
                    className="flex-1"
                  />
                </div>
              </div>
            );
          })}

          {champsSelectionnables.length > 0 && (
            <button onClick={addCondition} className="text-xs text-primary hover:underline flex items-center gap-1">
              <Plus size={12} /> Ajouter une condition
            </button>
          )}
        </div>
      )}
    </div>
  );
}