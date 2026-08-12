import { useState } from 'react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { X, Plus, Trash2, RotateCcw, Save } from 'lucide-react';
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogTitle,
  AlertDialogTrigger,
} from '@/components/ui/alert-dialog';

const POSTES = ['Serveur', 'Barman', 'Cuisinier', 'Plongeur', 'Chef de rang', 'Hôte/Hôtesse', 'Autre'];
const ICONES_POSTES = {
  'Serveur': '🍽️',
  'Barman': '🍸',
  'Hôte/Hôtesse': '👤',
  'Cuisinier': '👨‍🍳',
  'Plongeur': '🪣',
  'Chef de rang': '🎩',
  'Autre': '👥'
};

const DEFAULT_TRANCHES = {
  'Mariage': {
    'Serveur': [{ min: 1, max: 30, personnel: 1 }, { min: 31, max: 60, personnel: 2 }, { min: 61, max: 90, personnel: 3 }],
    'Barman': [{ min: 1, max: 60, personnel: 1 }, { min: 61, max: 120, personnel: 2 }],
    'Cuisinier': [{ min: 1, max: 100, personnel: 1 }, { min: 101, max: 200, personnel: 2 }],
    'Plongeur': [{ min: 1, max: 150, personnel: 1 }],
    'Chef de rang': [{ min: 1, max: 50, personnel: 1 }],
    'Hôte/Hôtesse': [{ min: 1, max: 80, personnel: 1 }],
    'Autre': [{ min: 1, max: 100, personnel: 1 }]
  }
};

export default function EffectifConfigPanel({
  type,
  settings,
  onSettingsChange,
  onSave,
  onClose,
  defaultTranchesForType
}) {
  // État local isolé pour éviter la réinitialisation depuis le parent
  const [localSettings, setLocalSettings] = useState(() => JSON.parse(JSON.stringify(settings[type] || {})));
  const [saved, setSaved] = useState(false);

  const tranches = localSettings.tranches || {};
  const postes_actifs = localSettings.postes_actifs || {};

  const updateLocal = (newSettings) => {
    setLocalSettings(newSettings);
  };

  const updateTranche = (poste, idx, field, value) => {
    const newSettings = JSON.parse(JSON.stringify(localSettings));
    if (!newSettings.tranches[poste]) newSettings.tranches[poste] = [];
    let numValue = parseInt(value) || '';
    if (numValue === 0) numValue = 1;
    if (numValue === '') numValue = '';
    newSettings.tranches[poste][idx] = { ...newSettings.tranches[poste][idx], [field]: numValue };
    updateLocal(newSettings);
  };

  const addTranche = (poste) => {
    const newSettings = JSON.parse(JSON.stringify(localSettings));
    if (!newSettings.tranches[poste]) newSettings.tranches[poste] = [];
    newSettings.tranches[poste].push({ min: 1, max: 100, personnel: 1 });
    updateLocal(newSettings);
  };

  const deleteTranche = (poste, idx) => {
    const newSettings = JSON.parse(JSON.stringify(localSettings));
    newSettings.tranches[poste].splice(idx, 1);
    updateLocal(newSettings);
  };

  const togglePoste = (poste) => {
    const newSettings = JSON.parse(JSON.stringify(localSettings));
    newSettings.postes_actifs[poste] = !newSettings.postes_actifs[poste];
    updateLocal(newSettings);
  };

  const resetToDefault = (poste) => {
    const defaultVal = defaultTranchesForType?.[poste];
    if (!defaultVal) return;
    const newSettings = JSON.parse(JSON.stringify(localSettings));
    newSettings.tranches[poste] = JSON.parse(JSON.stringify(defaultVal));
    updateLocal(newSettings);
  };

  const handleSave = () => {
    onSettingsChange(type, localSettings);
    onSave?.();
    setSaved(true);
    setTimeout(() => setSaved(false), 3000);
  };

  return (
    <div className="fixed inset-0 z-50 bg-black/50 overflow-y-auto">
      <div className="min-h-screen flex items-center justify-center p-4">
        <div className="bg-card rounded-2xl border border-border w-full max-w-2xl max-h-[90vh] overflow-y-auto space-y-5 p-6">
          {/* Header */}
          <div className="flex items-center justify-between gap-4 sticky top-0 bg-card pb-4 border-b border-border">
            <h2 className="text-xl font-bold">Configuration — {type}</h2>
            <Button variant="ghost" size="icon" onClick={onClose}>
              <X size={16} />
            </Button>
          </div>

          {/* Postes avec tranches */}
          <div className="space-y-5">
            {POSTES.map(poste => {
              const isActive = (postes_actifs[poste] !== false);
              const posteTransches = tranches[poste] || [];

              return (
                <div
                  key={poste}
                  className={`border rounded-xl p-4 transition-all ${
                    isActive ? 'bg-muted/30 border-border' : 'bg-muted/10 border-muted opacity-60'
                  }`}
                >
                  {/* Toggle + Titre */}
                  <div className="flex items-center justify-between mb-4">
                    <label className="flex items-center gap-2 cursor-pointer">
                      <input
                        type="checkbox"
                        checked={isActive}
                        onChange={() => togglePoste(poste)}
                        className="w-4 h-4 rounded cursor-pointer"
                      />
                      <span className="text-sm font-medium">
                        {ICONES_POSTES[poste]} {poste}
                      </span>
                    </label>
                    {isActive && defaultTranchesForType?.[poste] && (
                      <AlertDialog>
                        <AlertDialogTrigger asChild>
                          <button className="text-xs text-muted-foreground hover:text-foreground transition-colors inline-flex items-center gap-1">
                            <RotateCcw size={12} /> Réinitialiser
                          </button>
                        </AlertDialogTrigger>
                        <AlertDialogContent>
                          <AlertDialogTitle>Réinitialiser ?</AlertDialogTitle>
                          <AlertDialogDescription>
                            Restaurer les tranches par défaut pour {poste}.
                          </AlertDialogDescription>
                          <div className="flex justify-end gap-2">
                            <AlertDialogCancel>Annuler</AlertDialogCancel>
                            <AlertDialogAction onClick={() => resetToDefault(poste)}>
                              Confirmer
                            </AlertDialogAction>
                          </div>
                        </AlertDialogContent>
                      </AlertDialog>
                    )}
                  </div>

                  {/* Tranches */}
                  {isActive && (
                    <div className="space-y-4">
                      {posteTransches.map((tranche, idx) => (
                        <div
                          key={idx}
                          className="bg-background rounded-lg p-4 border border-input space-y-4"
                        >
                          {/* Ligne des convives */}
                          <div className="flex items-center gap-3 flex-wrap">
                            <span className="text-sm text-muted-foreground font-medium min-w-fit">De</span>
                            <div className="flex items-center gap-2 border-2 border-border rounded-lg px-3 py-2 bg-background">
                              <Input
                                type="number"
                                value={tranche.min || ''}
                                onChange={(e) => updateTranche(poste, idx, 'min', e.target.value)}
                                placeholder="ex: 1"
                                className="border-0 bg-transparent p-0 text-lg font-bold text-center w-16 focus:outline-none focus:ring-0 placeholder:text-muted-foreground/40"
                              />
                            </div>
                            <span className="text-sm text-muted-foreground font-medium">à</span>
                            <div className="flex items-center gap-2 border-2 border-border rounded-lg px-3 py-2 bg-background">
                              <Input
                                type="number"
                                value={tranche.max || ''}
                                onChange={(e) => updateTranche(poste, idx, 'max', e.target.value)}
                                placeholder="ex: 30"
                                className="border-0 bg-transparent p-0 text-lg font-bold text-center w-16 focus:outline-none focus:ring-0 placeholder:text-muted-foreground/40"
                              />
                            </div>
                            <span className="text-sm text-muted-foreground font-medium">convives</span>
                          </div>

                          {/* Ligne du personnel */}
                          <div className="flex items-center gap-3 flex-wrap">
                            <span className="text-sm text-muted-foreground font-medium min-w-fit">→</span>
                            <div className="flex items-center gap-2 border-2 border-border rounded-lg px-3 py-2 bg-background">
                              <Input
                                type="number"
                                value={tranche.personnel || ''}
                                onChange={(e) => updateTranche(poste, idx, 'personnel', e.target.value)}
                                placeholder="ex: 1"
                                className="border-0 bg-transparent p-0 text-lg font-bold text-center w-12 focus:outline-none focus:ring-0 placeholder:text-muted-foreground/40"
                              />
                            </div>
                            <span className="text-sm text-muted-foreground font-medium">{poste.toLowerCase()}(s)</span>

                            {/* Boutons +/- */}
                            <div className="flex items-center gap-2 ml-auto">
                              <Button
                                variant="outline"
                                className="h-10 w-10 p-0 text-lg font-bold"
                                onClick={() =>
                                  updateTranche(
                                    poste,
                                    idx,
                                    'personnel',
                                    Math.max(1, tranche.personnel - 1)
                                  )
                                }
                              >
                                −
                              </Button>
                              <Button
                                variant="outline"
                                className="h-10 w-10 p-0 text-lg font-bold"
                                onClick={() =>
                                  updateTranche(
                                    poste,
                                    idx,
                                    'personnel',
                                    tranche.personnel + 1
                                  )
                                }
                              >
                                +
                              </Button>

                              {posteTransches.length > 1 && (
                                <Button
                                  variant="ghost"
                                  size="icon"
                                  onClick={() => deleteTranche(poste, idx)}
                                  className="text-destructive hover:text-destructive/80 hover:bg-destructive/5 h-10 w-10"
                                >
                                  <Trash2 size={18} />
                                </Button>
                              )}
                            </div>
                          </div>
                        </div>
                      ))}

                      {/* Ajouter tranche */}
                      <Button
                        variant="outline"
                        size="sm"
                        onClick={() => addTranche(poste)}
                        className="gap-2 w-full"
                      >
                        <Plus size={16} /> Ajouter une tranche
                      </Button>


                      </div>
                      )}
                      </div>
                      );
                      })}
          </div>

          {/* Footer */}
          <div className="flex flex-col gap-2 pt-4 border-t border-border sticky bottom-0 bg-card">
            {saved && (
              <div className="text-center text-sm font-medium text-emerald-600 bg-emerald-50 border border-emerald-200 rounded-lg py-1.5 px-3">
                ✅ Paramètres sauvegardés
              </div>
            )}
            <div className="flex justify-end gap-2">
              <Button variant="outline" onClick={onClose}>Fermer</Button>
              <Button onClick={handleSave} className="gap-2">
                <Save size={14} /> Enregistrer
              </Button>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}