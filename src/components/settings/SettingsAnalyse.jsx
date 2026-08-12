import { useState, useEffect } from 'react';
import { useQueryClient, useQuery } from '@tanstack/react-query';
import { base44 } from '@/api/base44Client';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Save, Target } from 'lucide-react';
import { useOwnerCompanySettings } from '@/hooks/useOwnerCompanySettings';

export default function SettingsAnalyse({ onSaved }) {
  const qc = useQueryClient();
  const { settings } = useOwnerCompanySettings();
  const [objectifAnnuel, setObjectifAnnuel] = useState('');
  const [saving, setSaving] = useState(false);

  useEffect(() => {
    if (settings) setObjectifAnnuel(settings.objectif_annuel || '');
  }, [settings]);

  const handleSave = async () => {
    if (!settings?.id) return;
    setSaving(true);
    await base44.entities.CompanySettings.update(settings.id, {
      objectif_annuel: parseInt(objectifAnnuel) || 0,
    });
    qc.invalidateQueries(['company-settings']);
    setSaving(false);
    onSaved?.();
  };

  return (
    <div className="bg-card rounded-2xl border border-border p-6 space-y-4">
      <p className="text-sm text-muted-foreground">
        Utilisé dans la section Analyse — Vision N+1 pour mesurer votre progression annuelle.
      </p>
      <div className="space-y-1.5">
        <label className="text-sm font-medium flex items-center gap-1.5">
          <Target size={14} className="text-muted-foreground" /> Nombre d'événements cible par an
        </label>
        <Input
          type="number"
          value={objectifAnnuel}
          onChange={e => setObjectifAnnuel(e.target.value)}
          placeholder="Ex : 30"
          className="max-w-[160px]"
        />
      </div>
      <Button onClick={handleSave} disabled={saving || !settings?.id} className="w-full gap-2">
        <Save size={15} /> {saving ? 'Enregistrement...' : 'Enregistrer'}
      </Button>
    </div>
  );
}