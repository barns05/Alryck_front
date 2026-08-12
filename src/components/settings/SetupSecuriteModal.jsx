import { useState } from 'react';
import { useMutation, useQueryClient } from '@tanstack/react-query';
import { base44 } from '@/api/base44Client';
import { X, ChevronRight, ChevronLeft } from 'lucide-react';
import { Button } from '@/components/ui/button';

const CONTROLES_PAR_TYPE = {
  'Salle de réception': [
    { nom: 'Vérification extincteurs', categorie: 'Sécurité incendie', frequence_jours: 365 },
    { nom: 'Système désenfumage', categorie: 'Sécurité incendie', frequence_jours: 365 },
    { nom: 'Alarme incendie', categorie: 'Sécurité incendie', frequence_jours: 365 },
    { nom: 'Éclairage de sécurité', categorie: 'Sécurité incendie', frequence_jours: 365 },
    { nom: 'Commission de sécurité', categorie: 'Sécurité incendie', frequence_jours: 1095 }, // 3 ans
    { nom: 'Vérification installation électrique', categorie: 'Electricité', frequence_jours: 1825 }, // 5 ans
    { nom: 'Tableau électrique', categorie: 'Electricité', frequence_jours: 1825 },
    { nom: 'Prises de terre', categorie: 'Electricité', frequence_jours: 1825 },
    { nom: 'Contrôle sanitaire', categorie: 'Hygiène', frequence_jours: 730 }, // 2 ans
    { nom: 'Formation HACCP', categorie: 'Hygiène', frequence_jours: 1095 }, // 3 ans
    { nom: 'Relevés températures', categorie: 'Hygiène', frequence_jours: 30 },
    { nom: 'Vérification charpente', categorie: 'Structure', frequence_jours: 1095 },
    { nom: 'Contrôle climatisation', categorie: 'Structure', frequence_jours: 365 },
    { nom: 'Vérification chauffage', categorie: 'Structure', frequence_jours: 365 },
    { nom: 'Assurance responsabilité civile', categorie: 'Administratif', frequence_jours: 365 },
    { nom: 'Licence IV si applicable', categorie: 'Administratif', frequence_jours: 1095 },
    { nom: 'Registre du personnel', categorie: 'Administratif', frequence_jours: 730 },
    { nom: 'Affichages obligatoires', categorie: 'Administratif', frequence_jours: 365 },
  ],
  'Restaurant': [
    { nom: 'Vérification extincteurs', categorie: 'Sécurité incendie', frequence_jours: 365 },
    { nom: 'Alarme incendie', categorie: 'Sécurité incendie', frequence_jours: 365 },
    { nom: 'Éclairage de sécurité', categorie: 'Sécurité incendie', frequence_jours: 365 },
    { nom: 'Vérification installation électrique', categorie: 'Electricité', frequence_jours: 1825 },
    { nom: 'Tableau électrique', categorie: 'Electricité', frequence_jours: 1825 },
    { nom: 'Contrôle sanitaire', categorie: 'Hygiène', frequence_jours: 730 },
    { nom: 'Formation HACCP', categorie: 'Hygiène', frequence_jours: 1095 },
    { nom: 'Relevés températures', categorie: 'Hygiène', frequence_jours: 30 },
    { nom: 'Vérification chauffage', categorie: 'Structure', frequence_jours: 365 },
    { nom: 'Licence IV', categorie: 'Administratif', frequence_jours: 1095 },
    { nom: 'Assurance responsabilité civile', categorie: 'Administratif', frequence_jours: 365 },
  ],
  'Hôtel': [
    { nom: 'Vérification extincteurs', categorie: 'Sécurité incendie', frequence_jours: 365 },
    { nom: 'Système désenfumage', categorie: 'Sécurité incendie', frequence_jours: 365 },
    { nom: 'Alarme incendie', categorie: 'Sécurité incendie', frequence_jours: 365 },
    { nom: 'Éclairage de sécurité', categorie: 'Sécurité incendie', frequence_jours: 365 },
    { nom: 'Vérification installation électrique', categorie: 'Electricité', frequence_jours: 1825 },
    { nom: 'Contrôle sanitaire', categorie: 'Hygiène', frequence_jours: 730 },
    { nom: 'Assurance responsabilité civile', categorie: 'Administratif', frequence_jours: 365 },
  ],
  'Salle de spectacle': [
    { nom: 'Vérification extincteurs', categorie: 'Sécurité incendie', frequence_jours: 365 },
    { nom: 'Système désenfumage', categorie: 'Sécurité incendie', frequence_jours: 365 },
    { nom: 'Alarme incendie', categorie: 'Sécurité incendie', frequence_jours: 365 },
    { nom: 'Éclairage de sécurité', categorie: 'Sécurité incendie', frequence_jours: 365 },
    { nom: 'Commission de sécurité', categorie: 'Sécurité incendie', frequence_jours: 1095 },
    { nom: 'Vérification installation électrique', categorie: 'Electricité', frequence_jours: 1825 },
    { nom: 'Assurance responsabilité civile', categorie: 'Administratif', frequence_jours: 365 },
  ],
  'Autre': [],
};

export default function SetupSecuriteModal({ onClose }) {
  const qc = useQueryClient();
  const [step, setStep] = useState(1);
  const [typeEtablissement, setTypeEtablissement] = useState('');
  const [controles, setControles] = useState([]);
  const [customControl, setCustomControl] = useState('');

  const setupMutation = useMutation({
    mutationFn: async () => {
      // Créer/mettre à jour ModuleSecurite
      const existing = await base44.entities.ModuleSecurite.list();
      const moduleData = {
        actif: true,
        type_etablissement: typeEtablissement,
        controles_configures: true
      };

      if (existing.length > 0) {
        await base44.entities.ModuleSecurite.update(existing[0].id, moduleData);
      } else {
        await base44.entities.ModuleSecurite.create(moduleData);
      }

      // Créer les contrôles
      for (const ctrl of controles) {
        await base44.entities.ControleSecurite.create(ctrl);
      }
    },
    onSuccess: () => {
      qc.invalidateQueries(['module-securite']);
      qc.invalidateQueries(['controles-securite']);
      onClose();
    }
  });

  const handleNextStep = () => {
    if (step === 1) {
      const baseControles = CONTROLES_PAR_TYPE[typeEtablissement] || [];
      setControles(baseControles.map(c => ({ ...c, selected: true })));
      setStep(2);
    }
  };

  const toggleControle = (idx) => {
    const newControles = [...controles];
    newControles[idx].selected = !newControles[idx].selected;
    setControles(newControles);
  };

  const addCustomControl = () => {
    if (customControl.trim()) {
      setControles([...controles, {
        nom: customControl,
        categorie: 'Autre',
        frequence_jours: 365,
        selected: true
      }]);
      setCustomControl('');
    }
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/40 backdrop-blur-sm p-4">
      <div className="bg-card rounded-2xl border border-border shadow-xl w-full max-w-lg p-6 space-y-5">
        <div className="flex items-center justify-between">
          <h3 className="font-semibold text-lg">Configuration Sécurité & Conformité</h3>
          <button onClick={onClose} className="p-1 rounded hover:bg-muted"><X size={16} /></button>
        </div>

        {/* Étape 1: Type d'établissement */}
        {step === 1 && (
          <div className="space-y-4">
            <p className="text-sm text-muted-foreground">Étape 1 — Sélectionnez le type d'établissement</p>
            <div className="grid grid-cols-1 gap-2">
              {Object.keys(CONTROLES_PAR_TYPE).map(type => (
                <button
                  key={type}
                  onClick={() => setTypeEtablissement(type)}
                  className={`p-3 rounded-lg border-2 transition-all text-left font-medium text-sm
                    ${typeEtablissement === type
                      ? 'border-primary bg-primary/10 text-primary'
                      : 'border-border bg-card hover:border-primary/30'
                    }`}
                >
                  {type}
                </button>
              ))}
            </div>
          </div>
        )}

        {/* Étape 2: Contrôles */}
        {step === 2 && (
          <div className="space-y-4">
            <p className="text-sm text-muted-foreground">Étape 2 — Configurez les contrôles obligatoires</p>
            
            <div className="max-h-64 overflow-y-auto space-y-2 border border-border rounded-lg p-3 bg-muted/20">
              {controles.length === 0 ? (
                <p className="text-xs text-muted-foreground">Aucun contrôle pré-configuré pour ce type.</p>
              ) : (
                controles.map((ctrl, idx) => (
                  <label key={idx} className="flex items-start gap-2.5 p-2 rounded hover:bg-muted/30 cursor-pointer">
                    <input
                      type="checkbox"
                      checked={ctrl.selected !== false}
                      onChange={() => toggleControle(idx)}
                      className="w-4 h-4 rounded accent-primary mt-0.5 shrink-0"
                    />
                    <div className="flex-1 min-w-0">
                      <p className="text-sm font-medium">{ctrl.nom}</p>
                      <p className="text-xs text-muted-foreground">
                        {ctrl.categorie} • {ctrl.frequence_jours === 30 ? 'Mensuel' : 
                          ctrl.frequence_jours === 365 ? 'Annuel' : 
                          ctrl.frequence_jours === 730 ? 'Biannuel' :
                          ctrl.frequence_jours === 1095 ? '3 ans' :
                          ctrl.frequence_jours === 1825 ? '5 ans' : ctrl.frequence_jours + 'j'}
                      </p>
                    </div>
                  </label>
                ))
              )}
            </div>

            <div className="space-y-2 pt-2 border-t border-border">
              <p className="text-xs font-medium text-muted-foreground">Ajouter un contrôle personnalisé</p>
              <div className="flex gap-2">
                <input
                  value={customControl}
                  onChange={e => setCustomControl(e.target.value)}
                  placeholder="Nom du contrôle..."
                  className="flex-1 rounded border border-input bg-transparent px-3 py-2 text-sm focus-visible:outline-none focus-visible:ring-1 focus-visible:ring-ring"
                  onKeyDown={e => e.key === 'Enter' && addCustomControl()}
                />
                <Button size="sm" onClick={addCustomControl} className="shrink-0">+</Button>
              </div>
            </div>
          </div>
        )}

        {/* Navigation */}
        <div className="flex justify-between gap-2 pt-4 border-t border-border">
          <Button
            variant="outline"
            onClick={() => step === 1 ? onClose() : setStep(1)}
            className="gap-2"
          >
            {step === 1 ? 'Annuler' : <>
              <ChevronLeft size={14} /> Retour
            </>}
          </Button>
          <div className="flex items-center gap-1 text-xs text-muted-foreground">
            Étape {step} / 2
          </div>
          {step === 1 ? (
            <Button
              onClick={handleNextStep}
              disabled={!typeEtablissement}
              className="gap-2"
            >
              Suivant <ChevronRight size={14} />
            </Button>
          ) : (
            <Button
              onClick={() => setupMutation.mutate()}
              disabled={setupMutation.isPending || controles.filter(c => c.selected !== false).length === 0}
              className="gap-2"
            >
              {setupMutation.isPending ? 'Activation...' : 'Activer le module'}
            </Button>
          )}
        </div>
      </div>
    </div>
  );
}