import { useState } from 'react';
import { Save } from 'lucide-react';
import { Button } from '@/components/ui/button';
import DelaiInput from '../DelaiInput';
import HelpTooltip from '@/components/HelpTooltip';

export default function BlocFacturationRegles({ config, onSave }) {
  const [form, setForm] = useState({
    acompte_delai_j: config.acompte_delai_j ?? 7,
    acompte_alerte_j: config.acompte_alerte_j ?? 14,
    solde_limite_j: config.solde_limite_j ?? -3,
    solde_alerte_j: config.solde_alerte_j ?? -1,
  });
  const set = (k, v) => setForm(f => ({ ...f, [k]: v }));

  return (
    <div className="space-y-4">
      <div className="flex items-center gap-2">
        <p className="text-sm text-muted-foreground">Délais de réception des paiements et alertes automatiques.</p>
        <HelpTooltip text="Les alertes de paiement vous notifient automatiquement si un acompte ou solde n'est pas reçu dans les délais." />
      </div>
      <div className="grid grid-cols-2 gap-4">
        <div className="bg-muted/30 rounded-xl border border-border p-4 space-y-3">
          <p className="text-xs font-semibold uppercase tracking-wide text-muted-foreground">Acompte</p>
          <div className="grid grid-cols-2 gap-3">
            <DelaiInput label="Délai après signature (j)" value={form.acompte_delai_j} onChange={v => set('acompte_delai_j', v)} positive />
            <DelaiInput label="Alerte si non reçu après (j)" value={form.acompte_alerte_j} onChange={v => set('acompte_alerte_j', v)} positive />
          </div>
        </div>
        <div className="bg-muted/30 rounded-xl border border-border p-4 space-y-3">
          <p className="text-xs font-semibold uppercase tracking-wide text-muted-foreground">Solde</p>
          <div className="grid grid-cols-2 gap-3">
            <DelaiInput label="Date limite solde" value={form.solde_limite_j} onChange={v => set('solde_limite_j', v)} />
            <DelaiInput label="Alerte si pas reçu" value={form.solde_alerte_j} onChange={v => set('solde_alerte_j', v)} />
          </div>
        </div>
      </div>
      <div className="flex justify-end">
        <Button size="sm" className="gap-1.5" onClick={() => onSave(form)}>
          <Save size={13} /> Enregistrer
        </Button>
      </div>
    </div>
  );
}