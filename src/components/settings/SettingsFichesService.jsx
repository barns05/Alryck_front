import { useState, useEffect } from 'react';
import { useQueryClient, useQuery } from '@tanstack/react-query';
import { base44 } from '@/api/base44Client';
import { Button } from '@/components/ui/button';
import { Save, Clock } from 'lucide-react';
import { useOwnerCompanySettings } from '@/hooks/useOwnerCompanySettings';

export default function SettingsFichesService({ onSaved }) {
  const qc = useQueryClient();
  const { settings } = useOwnerCompanySettings();
  const [joursAvant, setJoursAvant] = useState(1);
  const [heure, setHeure] = useState('09:00');
  const [saving, setSaving] = useState(false);

  useEffect(() => {
    if (settings) {
      setJoursAvant(settings.fiche_envoi_jours_avant ?? 1);
      setHeure(settings.fiche_envoi_heure ?? '09:00');
    }
  }, [settings]);

  const handleSave = async () => {
    if (!settings?.id) return;
    setSaving(true);
    await base44.entities.CompanySettings.update(settings.id, {
      fiche_envoi_jours_avant: parseInt(joursAvant) || 1,
      fiche_envoi_heure: heure || '09:00',
    });
    qc.invalidateQueries(['company-settings']);
    setSaving(false);
    onSaved?.();
  };

  return (
    <div className="bg-card rounded-2xl border border-border p-6 space-y-5">
      <p className="text-sm text-muted-foreground">
        Ces valeurs sont pré-remplies à chaque nouvelle fiche. L'admin peut les modifier au cas par cas lors de la génération.
      </p>

      <div className="flex items-end gap-4 flex-wrap">
        <div className="space-y-1.5">
          <label className="text-sm font-medium flex items-center gap-1.5">
            <Clock size={14} className="text-muted-foreground" /> Délai d'envoi par défaut
          </label>
          <div className="flex items-center gap-2">
            <span className="text-sm font-semibold text-muted-foreground">J -</span>
            <input
              type="number"
              min={0}
              max={30}
              value={joursAvant}
              onChange={e => setJoursAvant(Math.max(0, parseInt(e.target.value) || 0))}
              className="w-16 px-2 py-1.5 text-sm rounded-lg border border-input bg-background text-center focus:outline-none focus:ring-1 focus:ring-ring font-semibold"
            />
            <span className="text-sm text-muted-foreground">jours avant l'événement</span>
          </div>
        </div>

        <div className="space-y-1.5">
          <label className="text-sm font-medium">Heure d'envoi par défaut</label>
          <input
            type="time"
            value={heure}
            onChange={e => setHeure(e.target.value)}
            className="px-3 py-1.5 text-sm rounded-lg border border-input bg-background focus:outline-none focus:ring-1 focus:ring-ring font-semibold"
          />
        </div>
      </div>

      <div className="bg-blue-50 border border-blue-200 rounded-xl p-3">
        <p className="text-xs text-blue-700">
          Exemple actuel : envoi <strong>J-{joursAvant}</strong> à <strong>{heure}</strong> — soit {joursAvant} jour{joursAvant > 1 ? 's' : ''} avant l'événement à {heure}.
        </p>
      </div>

      <div className="sticky bottom-20 z-10 bg-card border-t border-border pt-4">
        <Button onClick={handleSave} disabled={saving || !settings?.id} className="w-full gap-2">
          <Save size={15} /> {saving ? 'Enregistrement...' : 'Enregistrer'}
        </Button>
      </div>
    </div>
  );
}