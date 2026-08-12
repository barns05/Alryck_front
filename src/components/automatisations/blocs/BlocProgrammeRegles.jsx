import { useState } from 'react';
import { Save } from 'lucide-react';
import { Button } from '@/components/ui/button';
import DelaiInput from '../DelaiInput';

export default function BlocProgrammeRegles({ config, onSave }) {
  const [form, setForm] = useState({
    envoi_provisoire_j: config.envoi_provisoire_j ?? -30,
    envoi_definitif_j: config.envoi_definitif_j ?? -7,
    rappel_validation_j: config.rappel_validation_j ?? -3,
  });
  const set = (k, v) => setForm(f => ({ ...f, [k]: v }));

  return (
    <div className="space-y-4">
      <p className="text-sm text-muted-foreground">Délais d'envoi du programme au client et rappels de validation.</p>
      <div className="grid grid-cols-2 md:grid-cols-3 gap-3">
        <DelaiInput label="Programme provisoire" value={form.envoi_provisoire_j} onChange={v => set('envoi_provisoire_j', v)} />
        <DelaiInput label="Programme définitif" value={form.envoi_definitif_j} onChange={v => set('envoi_definitif_j', v)} />
        <DelaiInput label="Rappel si pas validé" value={form.rappel_validation_j} onChange={v => set('rappel_validation_j', v)} />
      </div>
      <div className="flex justify-end">
        <Button size="sm" className="gap-1.5" onClick={() => onSave(form)}>
          <Save size={13} /> Enregistrer
        </Button>
      </div>
    </div>
  );
}