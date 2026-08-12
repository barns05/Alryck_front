import { useState } from 'react';
import { Save } from 'lucide-react';
import { Button } from '@/components/ui/button';
import DelaiInput from '../DelaiInput';

export default function BlocFicheServiceRegles({ config, onSave }) {
  const [form, setForm] = useState({
    envoi_prestataires_j: config.envoi_prestataires_j ?? -3,
    envoi_extras_j: config.envoi_extras_j ?? -2,
    rappel_fiche_j: config.rappel_fiche_j ?? -1,
  });
  const set = (k, v) => setForm(f => ({ ...f, [k]: v }));

  return (
    <div className="space-y-4">
      <p className="text-sm text-muted-foreground">Délais d'envoi des fiches de service et rappels de consultation.</p>
      <div className="grid grid-cols-2 md:grid-cols-3 gap-3">
        <DelaiInput label="Envoi aux prestataires" value={form.envoi_prestataires_j} onChange={v => set('envoi_prestataires_j', v)} />
        <DelaiInput label="Envoi aux extras" value={form.envoi_extras_j} onChange={v => set('envoi_extras_j', v)} />
        <DelaiInput label="Rappel si non consultée" value={form.rappel_fiche_j} onChange={v => set('rappel_fiche_j', v)} />
      </div>
      <div className="flex justify-end">
        <Button size="sm" className="gap-1.5" onClick={() => onSave(form)}>
          <Save size={13} /> Enregistrer
        </Button>
      </div>
    </div>
  );
}