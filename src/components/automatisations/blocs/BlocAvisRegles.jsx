import { useState } from 'react';
import { Save } from 'lucide-react';
import { Button } from '@/components/ui/button';
import DelaiInput from '../DelaiInput';

export default function BlocAvisRegles({ config, onSave }) {
  const [form, setForm] = useState({
    avis_envoi_j: config.avis_envoi_j ?? 1,
    avis_relance_j: config.avis_relance_j ?? 7,
  });
  const set = (k, v) => setForm(f => ({ ...f, [k]: v }));

  return (
    <div className="space-y-4">
      <p className="text-sm text-muted-foreground">Délais d'envoi et de relance pour les demandes d'avis clients.</p>
      <div className="grid grid-cols-2 gap-3 max-w-md">
        <DelaiInput label="Envoi demande d'avis" value={form.avis_envoi_j} onChange={v => set('avis_envoi_j', v)} />
        <DelaiInput label="Relance si pas de réponse (j)" value={form.avis_relance_j} onChange={v => set('avis_relance_j', v)} positive />
      </div>
      <div className="flex justify-end">
        <Button size="sm" className="gap-1.5" onClick={() => onSave(form)}>
          <Save size={13} /> Enregistrer
        </Button>
      </div>
    </div>
  );
}