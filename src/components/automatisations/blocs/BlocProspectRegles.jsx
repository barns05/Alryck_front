import { useState } from 'react';
import { Save } from 'lucide-react';
import { Button } from '@/components/ui/button';
import DelaiInput from '../DelaiInput';

export default function BlocProspectRegles({ config, onSave }) {
  const [form, setForm] = useState({
    prospect_alerte_j: config.prospect_alerte_j ?? 5,
    prospect_statut_j: config.prospect_statut_j ?? 10,
  });
  const set = (k, v) => setForm(f => ({ ...f, [k]: v }));

  return (
    <div className="space-y-4">
      <p className="text-sm text-muted-foreground">Délais de relance et de passage de statut pour les prospects sans réponse.</p>
      <div className="grid grid-cols-2 gap-3 max-w-md">
        <DelaiInput label="Alerte relance après (j)" value={form.prospect_alerte_j} onChange={v => set('prospect_alerte_j', v)} positive />
        <DelaiInput label="Passage en A relancer après (j)" value={form.prospect_statut_j} onChange={v => set('prospect_statut_j', v)} positive />
      </div>
      <div className="flex justify-end">
        <Button size="sm" className="gap-1.5" onClick={() => onSave(form)}>
          <Save size={13} /> Enregistrer
        </Button>
      </div>
    </div>
  );
}