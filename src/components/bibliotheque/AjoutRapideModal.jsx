import { useState } from 'react';
import { X, ChevronLeft } from 'lucide-react';
import { useQueryClient, useMutation } from '@tanstack/react-query';
import { base44 } from '@/api/base44Client';

// Sous-formulaires inline légers pour chaque catégorie
import MenuCreationModal from './MenuCreationModal';
import PlanTableInlineForm from './PlanTableInlineForm';
import OptionInlineForm from './OptionInlineForm';
import ProgrammeInlineForm from './ProgrammeInlineForm';
import FormulaireInlineForm from './FormulaireInlineForm';
import FicheInlineForm from './FicheInlineForm';

const CATEGORIES = [
  { id: 'formulaire', emoji: '📝', label: 'Formulaire de préparation', desc: 'Questionnaire envoyé aux clients avant l\'événement' },
  { id: 'programme', emoji: '📋', label: 'Programme de la journée', desc: 'Modèle de séquence d\'étapes' },
  { id: 'menu', emoji: '🍽️', label: 'Menu et formule', desc: 'Formule traiteur avec composition et prix' },
  { id: 'fiche', emoji: '📄', label: 'Fiche de service', desc: 'Document envoyé aux équipes le jour J' },
  { id: 'plan_table', emoji: '🗺️', label: 'Plan de table', desc: 'Plan de salle ou disposition des tables' },
  { id: 'option', emoji: '🎯', label: 'Option et prestation', desc: 'Prestation à la carte, animation, décoration…' },
];

export default function AjoutRapideModal({ onClose, onCreated }) {
  const [step, setStep] = useState('choose'); // 'choose' | catId
  const qc = useQueryClient();

  const selected = CATEGORIES.find(c => c.id === step);

  const handleBack = () => setStep('choose');

  const handleDone = (catId) => {
    qc.invalidateQueries();
    onCreated?.(catId);
    onClose();
  };

  return (
    <div className="fixed inset-0 z-50 bg-black/50 backdrop-blur-sm flex items-center justify-center p-4" onClick={onClose}>
      <div
        className="bg-card rounded-2xl border border-border shadow-xl w-full max-w-lg max-h-[90vh] overflow-y-auto"
        onClick={e => e.stopPropagation()}
      >
        {/* Header */}
        <div className="flex items-center gap-3 px-5 py-4 border-b border-border sticky top-0 bg-card z-10">
          {step !== 'choose' && (
            <button onClick={handleBack} className="p-1 rounded hover:bg-muted text-muted-foreground hover:text-foreground">
              <ChevronLeft size={18} />
            </button>
          )}
          <div className="flex-1">
            <h2 className="font-bold text-base">
              {step === 'choose' ? '+ Ajouter à la bibliothèque' : `${selected?.emoji} ${selected?.label}`}
            </h2>
            {step === 'choose' && (
              <p className="text-xs text-muted-foreground mt-0.5">Où voulez-vous ajouter ?</p>
            )}
          </div>
          <button onClick={onClose} className="p-1.5 rounded-lg hover:bg-muted text-muted-foreground">
            <X size={16} />
          </button>
        </div>

        {/* Contenu */}
        <div className="p-5">
          {step === 'choose' && (
            <div className="space-y-2">
              {CATEGORIES.map(cat => (
                <button
                  key={cat.id}
                  onClick={() => setStep(cat.id)}
                  className="w-full flex items-center gap-4 p-4 rounded-xl border border-border bg-card hover:bg-muted/50 hover:border-primary/40 transition-all text-left group"
                >
                  <span className="text-2xl">{cat.emoji}</span>
                  <div className="flex-1 min-w-0">
                    <p className="font-semibold text-sm group-hover:text-primary transition-colors">{cat.label}</p>
                    <p className="text-xs text-muted-foreground mt-0.5">{cat.desc}</p>
                  </div>
                  <ChevronLeft size={14} className="text-muted-foreground rotate-180 shrink-0" />
                </button>
              ))}
            </div>
          )}

          {step === 'menu' && (
            <MenuCreationModal
              onSave={async (data) => {
                await base44.entities.MenuCatalogue.create({
                  nom: data.nom,
                  type_evenement: data.type_evenement,
                  prix_par_personne: data.prix_par_personne,
                  description: data.description,
                  elements: data.elements || [],
                  images: data.images || [],
                  mode_creation: data.mode_creation,
                  actif: true,
                });
                handleDone('menu');
              }}
              onCancel={handleBack}
              embedded
            />
          )}

          {step === 'plan_table' && (
            <PlanTableInlineForm
              onSave={async (data) => {
                await base44.entities.PlanSalle.create(data);
                handleDone('plan_table');
              }}
              onCancel={handleBack}
            />
          )}

          {step === 'option' && (
            <OptionInlineForm
              onSave={async (data) => {
                await base44.entities.OptionPrestation.create(data);
                handleDone('option');
              }}
              onCancel={handleBack}
            />
          )}

          {step === 'programme' && (
            <ProgrammeInlineForm
              onSave={async (data) => {
                await base44.entities.ModeleProgramme.create(data);
                handleDone('programme');
              }}
              onCancel={handleBack}
            />
          )}

          {step === 'formulaire' && (
            <FormulaireInlineForm
              onSave={async (data) => {
                await base44.entities.ModeleFormulaire.create(data);
                handleDone('formulaire');
              }}
              onCancel={handleBack}
            />
          )}

          {step === 'fiche' && (
            <FicheInlineForm
              onSave={async (data) => {
                await base44.entities.ModeleFicheService.create(data);
                handleDone('fiche');
              }}
              onCancel={handleBack}
            />
          )}
        </div>
      </div>
    </div>
  );
}