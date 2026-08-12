import { useState, useEffect } from 'react';
import { useMutation, useQueryClient, useQuery } from '@tanstack/react-query';
import { base44 } from '@/api/base44Client';
import { X, Plus, Trash2, ChevronDown, ChevronUp } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import CustomSelect from '@/components/ui/CustomSelect';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';

const TYPES = ['texte', 'nombre', 'heure', 'date', 'oui_non', 'choix_unique', 'cases_a_cocher', 'liste', 'upload'];
const TYPES_EVENEMENT = [
  'Mariage', 'Pacs', 'Anniversaire de mariage', 'Baptême', 'Anniversaire',
  'Soirée d\'entreprise', 'Séminaire', 'Cocktail', 'Gala', 'Location', 'Autre'
];
const CATEGORIES = [
  'Identification client',
  'Générales',
  'Logistique',
  'Décoration',
  'Menu',
  'Matériel & Équipement',
  'Lieu — mobile',
  'Médias & Souvenir',
  'Spécifiques Mariage',
  'Sécurité',
  'OPTIONS',
];

const OPERATEURS = [
  { value: 'egal', label: 'est égal à' },
  { value: 'different', label: 'est différent de' },
  { value: 'superieur', label: 'est supérieur à' },
  { value: 'inferieur', label: 'est inférieur à' },
  { value: 'contient', label: 'contient' },
];

function ConditionsSection({ conditions, onChange, allQuestions }) {
  const [open, setOpen] = useState(false);

  const updateCondition = (idx, fields) => {
    const updated = [...conditions];
    updated[idx] = { ...updated[idx], ...fields };
    onChange(updated);
  };

  const removeCondition = (idx) => {
    onChange(conditions.filter((_, i) => i !== idx));
  };

  const addCondition = () => {
    onChange([
      ...conditions,
      {
        id: Math.random().toString(36).slice(2, 9),
        champ_declencheur_id: '',
        champ_declencheur_label: '',
        operateur: 'egal',
        valeur: '',
        action: 'afficher',
      }
    ]);
  };

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
            <p className="text-xs text-muted-foreground italic py-2">Aucune condition. Cliquez sur "Ajouter" pour en créer une.</p>
          )}

          {conditions.map((cond, idx) => (
            <div key={cond.id} className="bg-muted/40 rounded-lg p-2.5 space-y-2">
              <div className="grid grid-cols-12 gap-2 items-center text-xs">
                <div className="col-span-4">
                  <CustomSelect
                    value={cond.champ_declencheur_id || ''}
                    onChange={(selectedId) => {
                      const selectedQuestion = allQuestions.find(q => q.id === selectedId);
                      updateCondition(idx, {
                        champ_declencheur_id: selectedId,
                        champ_declencheur_label: selectedQuestion?.label || '',
                      });
                    }}
                    options={allQuestions.map(q => ({ value: q.id, label: q.label }))}
                    placeholder="— Sélectionner —"
                  />
                </div>

                <div className="col-span-3">
                  <CustomSelect
                    value={cond.operateur}
                    onChange={(val) => updateCondition(idx, { operateur: val })}
                    options={OPERATEURS.map(op => ({ value: op.value, label: op.label }))}
                  />
                </div>

                <div className="col-span-3">
                  <Input
                    value={cond.valeur}
                    onChange={(e) => updateCondition(idx, { valeur: e.target.value })}
                    placeholder="Valeur"
                    className="text-sm h-8"
                  />
                </div>

                <div className="col-span-2 flex justify-end">
                  <button onClick={() => removeCondition(idx)} className="text-destructive hover:text-destructive/80 p-1 rounded-md hover:bg-destructive/10">
                    <Trash2 size={12} />
                  </button>
                </div>
              </div>

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
          ))}

          <button onClick={addCondition} className="text-xs text-primary hover:underline flex items-center gap-1">
            <Plus size={12} /> Ajouter une condition
          </button>
        </div>
      )}
    </div>
  );
}

export default function QuestionModal({ question, onClose }) {
  const qc = useQueryClient();
  
  // Récupérer toutes les questions disponibles pour les conditions
  const { data: allQuestions = [] } = useQuery({
    queryKey: ['bibliotheque-questions-all'],
    queryFn: () => base44.entities.BibliothequeQuestion.list('-created_date', 500),
  });
  
  const [form, setForm] = useState(() => {
    if (question) return question;
    return {
      label: '',
      description: '',
      type: 'texte',
      categorie: 'Générales',
      options: [],
      obligatoire: false,
      etat: 'disponible',
      est_personnalisee: true,
    };
  });
  const [newOption, setNewOption] = useState('');

  // Auto-set options for oui_non type
  useEffect(() => {
    if (form.type === 'oui_non' && (!form.options || form.options.length === 0)) {
      setForm(f => ({ ...f, options: ['OUI', 'NON'] }));
    }
  }, [form.type]);

  const save = useMutation({
    mutationFn: async (data) => {
      if (question?.id) {
        await base44.entities.BibliothequeQuestion.update(question.id, data);
      } else {
        await base44.entities.BibliothequeQuestion.create(data);
      }
    },
    onSuccess: () => {
      qc.invalidateQueries(['bibliotheque-questions']);
      onClose();
    },
  });

  const handleSave = () => {
    if (!form.label.trim()) {
      alert('Le libellé est obligatoire');
      return;
    }
    console.log('[QuestionModal] Saving form:', form);
    console.log('[QuestionModal] Conditions before save:', form.conditions);
    save.mutate(form);
  };

  const typesAvecOptions = ['choix_unique', 'cases_a_cocher', 'liste'];
  
  const typeLabels = {
    texte: '📝 Texte libre',
    nombre: '🔢 Nombre',
    heure: '⏰ Heure (HH:MM)',
    date: '📅 Date',
    oui_non: '✅ Oui / Non',
    choix_unique: '🔘 Choix unique',
    cases_a_cocher: '☑️ Cases à cocher',
    liste: '📋 Liste déroulante',
    upload: '📎 Upload de fichier',
  };

  return (
    <div className="fixed inset-0 z-50 flex items-end sm:items-center justify-center bg-black/40 backdrop-blur-sm p-4">
      <div className="bg-card rounded-3xl border border-border shadow-xl w-full max-w-lg max-h-[90vh] overflow-y-auto">
        {/* Header */}
        <div className="flex items-center justify-between px-6 py-4 border-b border-border sticky top-0 bg-card z-10">
          <h3 className="font-semibold text-lg">
            {question?.id ? '✏️ Modifier la question' : '➕ Nouvelle question'}
          </h3>
          <button onClick={onClose} className="text-muted-foreground hover:text-foreground">
            <X size={20} />
          </button>
        </div>

        <div className="p-6 space-y-4">
          {/* Label */}
          <div className="space-y-2">
            <label className="text-sm font-medium">Libellé *</label>
            <Input
              value={form.label}
              onChange={(e) => setForm({ ...form, label: e.target.value })}
              placeholder="Ex: Thème ou couleurs souhaitées"
            />
          </div>

          {/* Description */}
          <div className="space-y-2">
            <label className="text-sm font-medium">Description</label>
            <textarea
              value={form.description || ''}
              onChange={(e) => setForm({ ...form, description: e.target.value })}
              placeholder="Indication ou aide au remplissage"
              className="w-full rounded-md border border-input bg-background px-3 py-2 text-sm focus-visible:outline-none focus-visible:ring-1 focus-visible:ring-ring resize-none"
              rows={2}
            />
          </div>

          {/* Catégorie */}
          <div className="space-y-2">
            <label className="text-sm font-medium">Catégorie *</label>
            <Select value={form.categorie} onValueChange={(val) => setForm({ ...form, categorie: val })}>
              <SelectTrigger>
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                {CATEGORIES.map((cat) => (
                  <SelectItem key={cat} value={cat}>
                    {cat}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>

          {/* Type */}
          <div className="space-y-2">
            <label className="text-sm font-medium">Type de champ</label>
            <Select value={form.type} onValueChange={(val) => setForm({ ...form, type: val })}>
              <SelectTrigger>
                <SelectValue placeholder={typeLabels[form.type]} />
              </SelectTrigger>
              <SelectContent>
                {TYPES.map((type) => (
                  <SelectItem key={type} value={type}>
                    {typeLabels[type]}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>

          {/* Heure (pas d'options, juste confirmation) */}
          {form.type === 'heure' && (
            <div className="text-xs text-muted-foreground bg-blue-50 dark:bg-blue-950/20 px-3 py-2 rounded-lg border border-blue-200 dark:border-blue-900">
              ⏰ Format HH:MM (ex: 14:30)
            </div>
          )}

          {/* Oui/Non (options fixes) */}
          {form.type === 'oui_non' && (
            <div className="text-xs text-muted-foreground bg-blue-50 dark:bg-blue-950/20 px-3 py-2 rounded-lg border border-blue-200 dark:border-blue-900">
              ✅ Options fixes: OUI / NON
            </div>
          )}

          {/* Options (si applicable) */}
          {typesAvecOptions.includes(form.type) && (
            <div className="space-y-3 pt-2 border-t border-border">
              <label className="text-sm font-medium">Options</label>
              <div className="space-y-2">
                {form.options?.map((opt, i) => (
                  <div key={i} className="flex items-center gap-2">
                    <input
                      type="text"
                      value={opt}
                      onChange={(e) => {
                        const newOpts = [...form.options];
                        newOpts[i] = e.target.value;
                        setForm({ ...form, options: newOpts });
                      }}
                      className="flex-1 rounded-md border border-input bg-background px-3 py-2 text-sm"
                    />
                    <Button
                      size="icon"
                      variant="ghost"
                      className="h-8 w-8 text-destructive"
                      onClick={() => {
                        const newOpts = form.options.filter((_, idx) => idx !== i);
                        setForm({ ...form, options: newOpts });
                      }}
                    >
                      <Trash2 size={14} />
                    </Button>
                  </div>
                ))}
              </div>
              <div className="flex gap-2">
                <Input
                  value={newOption}
                  onChange={(e) => setNewOption(e.target.value)}
                  placeholder="Nouvelle option"
                  onKeyPress={(e) => {
                    if (e.key === 'Enter' && newOption.trim()) {
                      setForm({ ...form, options: [...(form.options || []), newOption] });
                      setNewOption('');
                    }
                  }}
                />
                <Button
                  size="icon"
                  onClick={() => {
                    if (newOption.trim()) {
                      setForm({ ...form, options: [...(form.options || []), newOption] });
                      setNewOption('');
                    }
                  }}
                >
                  <Plus size={16} />
                </Button>
              </div>
            </div>
          )}

          {/* Obligatoire */}
          <div className="flex items-center gap-2 pt-2">
            <input
              type="checkbox"
              id="obligatoire"
              checked={form.obligatoire || false}
              onChange={(e) => setForm({ ...form, obligatoire: e.target.checked })}
              className="rounded accent-primary"
            />
            <label htmlFor="obligatoire" className="text-sm font-medium">
              Question obligatoire
            </label>
          </div>

          {/* État */}
          <div className="space-y-2 pt-2 border-t border-border">
            <label className="text-sm font-medium">État initial</label>
            <div className="flex gap-2">
              {['incluse', 'disponible'].map((etat) => (
                <button
                  key={etat}
                  onClick={() => setForm({ ...form, etat })}
                  className={`flex-1 py-2 rounded-lg border-2 font-medium transition-all ${
                    form.etat === etat
                      ? 'border-primary bg-primary/10 text-primary'
                      : 'border-border bg-background'
                  }`}
                >
                  {etat === 'incluse' ? '✅ Incluse' : '⬜ Disponible'}
                </button>
              ))}
            </div>
          </div>

          {/* Types d'événements */}
          <div className="space-y-2 pt-2 border-t border-border">
            <label className="text-sm font-medium">Types d'événements concernés</label>
            <p className="text-xs text-muted-foreground">Vide = applicable à tous les types d'événements</p>
            <div className="flex flex-wrap gap-2">
              {TYPES_EVENEMENT.map(type => {
                const selected = (form.types_evenements || []).includes(type);
                return (
                  <button
                    key={type}
                    type="button"
                    onClick={() => {
                      const current = form.types_evenements || [];
                      const next = selected
                        ? current.filter(t => t !== type)
                        : [...current, type];
                      setForm({ ...form, types_evenements: next });
                    }}
                    className={`text-xs px-2.5 py-1 rounded-full border transition-all ${
                      selected
                        ? 'bg-primary text-primary-foreground border-primary'
                        : 'border-border bg-background hover:bg-muted'
                    }`}
                  >
                    {type}
                  </button>
                );
              })}
            </div>
            {(form.types_evenements || []).length > 0 && (
              <button
                type="button"
                onClick={() => setForm({ ...form, types_evenements: [] })}
                className="text-xs text-muted-foreground hover:text-foreground underline"
              >
                Réinitialiser (tous les types)
              </button>
            )}
          </div>

          {/* Conditions de visibilité */}
          <ConditionsSection
            conditions={form.conditions || []}
            onChange={(conds) => setForm(f => ({ ...f, conditions: conds }))}
            allQuestions={allQuestions}
          />

          {/* Footer */}
          <div className="modal-footer">
            <Button variant="outline" onClick={onClose} className="flex-1">
              Annuler
            </Button>
            <Button onClick={handleSave} disabled={save.isPending} className="flex-1">
              {save.isPending ? 'Enregistrement…' : 'Enregistrer'}
            </Button>
          </div>
        </div>
      </div>
    </div>
  );
}