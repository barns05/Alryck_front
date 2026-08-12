import { useState, useMemo } from 'react';
import { X, ChevronLeft, ChevronRight } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Checkbox } from '@/components/ui/checkbox';
import { filterChampsVisibles } from '@/lib/conditionEngine';
import { useOptionsPrestationsChamp } from '@/hooks/useOptionsPrestationsChamp';
import { useFormulesPivot } from '@/hooks/useFormulesPivot';
import OptionsGroupedField from '@/components/formulaire/OptionsGroupedField';
import { sortChampsUniversel } from '@/lib/formulaireUniverselOrdre';


function renderField(field, value, onChange, reponsesChoix, formuleChoisie, choixMenu) {
  const baseProps = {
    value: value || '',
    onChange: (e) => onChange(field.id, e.target.value),
    className: 'w-full',
  };

  switch (field.type) {
    case 'texte':
      return <Input {...baseProps} placeholder={field.description || ''} type="text" />;

    case 'nombre':
      return (
        <Input
          {...baseProps}
          type="number"
          placeholder={field.description || ''}
        />
      );

    case 'date':
      return (
        <Input
          {...baseProps}
          type="date"
        />
      );

    case 'choix_unique':
      return (
        <div className="space-y-2">
          {field.options?.map((opt, i) => (
            <label key={i} className="flex items-center gap-3 cursor-pointer">
              <input
                type="radio"
                name={field.id}
                value={opt}
                checked={value === opt}
                onChange={(e) => onChange(field.id, e.target.value)}
                className="w-4 h-4 accent-primary"
              />
              <span className="text-sm">{opt}</span>
            </label>
          ))}
        </div>
      );

    case 'cases_a_cocher':
      return (
        <div className="space-y-2">
          {field.options?.map((opt, i) => (
            <label key={i} className="flex items-center gap-3 cursor-pointer">
              <Checkbox
                checked={(value || []).includes(opt)}
                onCheckedChange={(checked) => {
                  const arr = value || [];
                  if (checked) {
                    onChange(field.id, [...arr, opt]);
                  } else {
                    onChange(field.id, arr.filter(v => v !== opt));
                  }
                }}
              />
              <span className="text-sm">{opt}</span>
            </label>
          ))}
        </div>
      );

    case 'liste':
      return (
        <select
          value={value || ''}
          onChange={(e) => onChange(field.id, e.target.value)}
          className="flex h-9 w-full rounded-md border border-input bg-transparent px-3 py-1 text-sm shadow-sm focus-visible:outline-none focus-visible:ring-1 focus-visible:ring-ring"
        >
          <option value="">— Sélectionner</option>
          {field.options?.map((opt, i) => (
            <option key={i} value={opt}>
              {opt}
            </option>
          ))}
        </select>
      );

    case 'oui_non':
      return (
        <div className="flex gap-3">
          {['OUI', 'NON'].map(opt => (
            <label key={opt} className="flex items-center gap-2 cursor-pointer">
              <input
                type="radio"
                name={field.id}
                value={opt}
                checked={value === opt}
                onChange={(e) => onChange(field.id, e.target.value)}
                className="w-4 h-4 accent-primary"
              />
              <span className="text-sm">{opt}</span>
            </label>
          ))}
        </div>
      );

    case 'heure':
      return (
        <Input
          {...baseProps}
          type="time"
        />
      );

    case 'upload':
      return (
        <label className="flex items-center gap-2 px-4 py-3 border border-dashed border-border rounded-lg cursor-pointer hover:bg-muted/30 transition-colors">
          <span className="text-sm text-muted-foreground">Cliquer pour télécharger</span>
          <input type="file" className="hidden" onChange={(e) => onChange(field.id, e.target.files?.[0]?.name || '')} />
        </label>
      );

    case 'options_grouped':
      return (
        <OptionsGroupedField
          champ={field}
          value={value}
          onChange={(val) => onChange(field.id, val)}
          reponsesChoix={reponsesChoix}
          formuleChoisie={formuleChoisie}
          choixMenu={choixMenu}
        />
      );

    default:
      return <Input {...baseProps} />;
  }
}

export default function FormulaireModeTest({ modele, onClose }) {
  const [currentStep, setCurrentStep] = useState(0);
  const [responses, setResponses] = useState({});

  // Champ groupé Options & Prestations — réagit dynamiquement au type d'événement choisi
  const typeEvenementPourOptions = responses?.['f-pivot-type'] || undefined;
  const { champOptions } = useOptionsPrestationsChamp(typeEvenementPourOptions);
  const { filtrerOptionsFormule } = useFormulesPivot();

  const allChamps = useMemo(() => {
    const fixes = [...(modele.champs || []), ...champOptions];
    return sortChampsUniversel(fixes);
  }, [modele.champs, champOptions]);

  // Filtrage conditionnel — recalculé à chaque changement de réponse
  const champsVisibles = useMemo(
    () => filterChampsVisibles(allChamps, responses),
    [allChamps, responses]
  );


  const totalSteps = champsVisibles.length;
  const safeStep = Math.min(currentStep, totalSteps - 1);
  const currentFieldRaw = champsVisibles[safeStep];
  const typeChoisiMemo = responses['f-pivot-type'];
  // Filtrage dynamique des options du pivot formule selon le type d'événement choisi
  const currentField = useMemo(() => {
    if (!currentFieldRaw) return currentFieldRaw;
    const isPivotFormule = currentFieldRaw.id === 'f-pivot-formule' || currentFieldRaw.id === 'formule_choisie';
    if (!isPivotFormule || !currentFieldRaw.options?.length) return currentFieldRaw;
    const optionsFiltrees = filtrerOptionsFormule(currentFieldRaw.options, typeChoisiMemo);
    return { ...currentFieldRaw, options: optionsFiltrees };
  }, [currentFieldRaw, typeChoisiMemo, filtrerOptionsFormule]);

  const formuleChoisie = responses?.['f-pivot-formule'] || null;
  const choixMenu = Object.entries(responses || {})
    .filter(([key, val]) => 
      key.startsWith('f-choix-') && 
      typeof val === 'string' && 
      val.trim() !== ''
    )
    .map(([, val]) => val);

  const isLastStep = safeStep >= totalSteps - 1;
  const isFirstStep = safeStep === 0;

  const handleFieldChange = (fieldId, value) => {
    setResponses(prev => {
      const next = { ...prev, [fieldId]: value };
      // Après mise à jour, vérifier si l'index courant reste valide
      const nextVisibles = filterChampsVisibles(allChamps, next);
      if (safeStep >= nextVisibles.length && nextVisibles.length > 0) {
        setCurrentStep(nextVisibles.length - 1);
      }
      return next;
    });
  };

  const handleNext = () => {
    if (!isLastStep) {
      setCurrentStep(safeStep + 1);
    }
  };

  const handlePrev = () => {
    if (!isFirstStep) {
      setCurrentStep(safeStep - 1);
    }
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/40 backdrop-blur-sm p-4">
      <div className="bg-card rounded-2xl border border-border shadow-xl w-full max-w-xl overflow-hidden flex flex-col max-h-[90vh]">
        {/* Bandeau test */}
        <div className="bg-amber-50 dark:bg-amber-950/30 border-b border-amber-200 dark:border-amber-900 px-4 py-2.5 flex items-center justify-between">
          <p className="text-xs font-medium text-amber-900 dark:text-amber-300">
            🧪 Mode test — les réponses ne seront pas enregistrées
          </p>
          <button onClick={onClose} className="text-amber-900 dark:text-amber-300 hover:opacity-70 p-0.5">
            <X size={16} />
          </button>
        </div>

        {/* Header */}
        <div className="px-6 py-4 border-b border-border">
          <h3 className="font-semibold text-base">{modele.nom}</h3>
          <p className="text-xs text-muted-foreground mt-1">
            Question {safeStep + 1} sur {totalSteps}
          </p>
          <div className="mt-3 bg-muted rounded-full h-1.5 overflow-hidden">
            <div
              className="h-full bg-primary transition-all duration-300"
              style={{ width: `${totalSteps > 0 ? ((safeStep + 1) / totalSteps) * 100 : 0}%` }}
            />
          </div>
        </div>

        {/* Contenu question */}
        <div className="flex-1 px-6 py-8 overflow-y-auto">
          {currentField && (
            <div className="space-y-4">
              <div>
                <label className="block font-medium text-sm mb-1">
                  {currentField.label}
                  {currentField.obligatoire && <span className="text-destructive">*</span>}
                </label>
                {currentField.description && (
                  <p className="text-xs text-muted-foreground mb-3">{currentField.description}</p>
                )}
              </div>

              <div>
                {renderField(currentField, responses[currentField.id], handleFieldChange, Object.values(responses || {}).flat(), formuleChoisie, choixMenu)}
              </div>
            </div>
          )}
        </div>

        {/* Navigation */}
        <div className="px-6 py-4 border-t border-border flex items-center justify-between gap-3">
          <Button
            variant="outline"
            onClick={handlePrev}
            disabled={isFirstStep}
            className="gap-1.5"
          >
            <ChevronLeft size={14} /> Précédent
          </Button>

          <span className="text-xs text-muted-foreground">
            {safeStep + 1} / {totalSteps}
          </span>

          <Button
            onClick={handleNext}
            disabled={isLastStep}
            className="gap-1.5"
          >
            {isLastStep ? 'Terminé' : 'Suivant'} <ChevronRight size={14} />
          </Button>
        </div>
      </div>
    </div>
  );
}