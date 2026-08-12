import { useState, useEffect } from 'react';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { base44 } from '@/api/base44Client';
import { useToast } from '@/components/ui/use-toast';

function ToggleRow({ label, description, checked, onChange, disabled }) {
  return (
    <label className={`flex items-start gap-4 p-4 rounded-xl border transition-all cursor-pointer ${
      disabled ? 'opacity-50 cursor-not-allowed' : 'hover:bg-muted/50'
    } ${checked && !disabled ? 'border-primary/30 bg-primary/5' : 'border-border'}`}>
      <div className="relative mt-0.5 shrink-0">
        <input
          type="checkbox"
          checked={checked}
          disabled={disabled}
          onChange={e => !disabled && onChange(e.target.checked)}
          className="sr-only"
        />
        <div
          onClick={() => !disabled && onChange(!checked)}
          className={`w-11 h-6 rounded-full transition-colors ${
            checked && !disabled ? 'bg-primary' : 'bg-muted-foreground/30'
          }`}
        >
          <div className={`absolute top-1 left-1 w-4 h-4 rounded-full bg-white transition-transform shadow ${
            checked && !disabled ? 'translate-x-5' : 'translate-x-0'
          }`} />
        </div>
      </div>
      <div>
        <p className="font-medium text-sm">{label}</p>
        <p className="text-xs text-muted-foreground mt-0.5">{description}</p>
      </div>
    </label>
  );
}

export default function SettingsModuleRH() {
  const qc = useQueryClient();
  const { toast } = useToast();

  const { data: settingsList = [], isLoading } = useQuery({
    queryKey: ['rh-settings'],
    queryFn: () => base44.entities.RHSettings.list(),
  });

  const settings = settingsList[0] || {};

  const [form, setForm] = useState({
    module_rh_actif: false,
    tableau_de_bord_actif: false,
    alertes_reglementaires_actif: false,
    suivi_timings_actif: false,
  });

  useEffect(() => {
    if (settings.id) {
      setForm({
        module_rh_actif: settings.module_rh_actif ?? false,
        tableau_de_bord_actif: settings.tableau_de_bord_actif ?? false,
        alertes_reglementaires_actif: settings.alertes_reglementaires_actif ?? false,
        suivi_timings_actif: settings.suivi_timings_actif ?? false,
      });
    }
  }, [settings.id]);

  const mutation = useMutation({
    mutationFn: async (data) => {
      if (settings.id) {
        return base44.entities.RHSettings.update(settings.id, data);
      }
      return base44.entities.RHSettings.create(data);
    },
    onSuccess: () => {
      qc.invalidateQueries(['rh-settings']);
      toast({ title: '✅ Paramètres RH sauvegardés' });
    },
  });

  const handleChange = (key, value) => {
    let next = { ...form, [key]: value };
    // Si on désactive le module global, désactiver les sous-toggles
    if (key === 'module_rh_actif' && !value) {
      next = {
        ...next,
        tableau_de_bord_actif: false,
        alertes_reglementaires_actif: false,
        suivi_timings_actif: false,
      };
    }
    setForm(next);
    mutation.mutate(next);
  };

  if (isLoading) {
    return <div className="py-12 text-center text-muted-foreground text-sm">Chargement…</div>;
  }

  return (
    <div className="space-y-6">
      {/* Toggle global */}
      <div className="bg-card border border-border rounded-2xl p-5 space-y-3">
        <div className="flex items-center justify-between">
          <div>
            <p className="font-semibold text-base">Module RH</p>
            <p className="text-sm text-muted-foreground mt-0.5">
              Active les fonctionnalités de gestion des ressources humaines pour votre équipe.
            </p>
          </div>
          <div
            onClick={() => handleChange('module_rh_actif', !form.module_rh_actif)}
            className={`relative w-12 h-6 rounded-full transition-colors cursor-pointer shrink-0 ${
              form.module_rh_actif ? 'bg-primary' : 'bg-muted-foreground/30'
            }`}
          >
            <div className={`absolute top-1 left-1 w-4 h-4 rounded-full bg-white transition-transform shadow ${
              form.module_rh_actif ? 'translate-x-6' : 'translate-x-0'
            }`} />
          </div>
        </div>
      </div>

      {/* Sous-toggles */}
      <div className="space-y-3">
        <p className="text-xs font-semibold text-muted-foreground uppercase tracking-wider px-1">Fonctionnalités</p>

        <ToggleRow
          label="📊 Tableau de bord équipe"
          description="Heures travaillées, taux horaire, coût total par personne, récapitulatif mensuel et vision globale du budget personnel."
          checked={form.tableau_de_bord_actif}
          onChange={v => handleChange('tableau_de_bord_actif', v)}
          disabled={!form.module_rh_actif}
        />

        <ToggleRow
          label="⚠️ Alertes réglementaires"
          description="Indicateurs d'aide à la gestion : durée max journalière, pause obligatoire, délai de prévenance, seuils de déclaration. Note : le code du travail s'applique indépendamment."
          checked={form.alertes_reglementaires_actif}
          onChange={v => handleChange('alertes_reglementaires_actif', v)}
          disabled={!form.module_rh_actif}
        />

        <ToggleRow
          label="🕐 Suivi des timings"
          description="Saisie des heures d'arrivée et de départ par extra/collaborateur sur chaque événement. Calcul automatique des heures réelles vs prévues."
          checked={form.suivi_timings_actif}
          onChange={v => handleChange('suivi_timings_actif', v)}
          disabled={!form.module_rh_actif}
        />
      </div>

      {form.module_rh_actif && (
        <div className="bg-amber-50 border border-amber-200 rounded-xl px-4 py-3 text-sm text-amber-800">
          <strong>Rappel :</strong> Les alertes réglementaires sont des indicateurs d'aide à la gestion. Le respect du code du travail est obligatoire indépendamment de leur activation.
        </div>
      )}
    </div>
  );
}