import { useState } from 'react';
import { Save } from 'lucide-react';
import { Button } from '@/components/ui/button';
import DelaiInput from '../DelaiInput';
import HelpTooltip from '@/components/HelpTooltip';

export default function BlocFormulairesRegles({ modelesForm, getConfig, onSave }) {
  return (
    <div className="space-y-4">
      <div className="flex items-center gap-2">
        <p className="text-sm text-muted-foreground">Pour chaque modèle de questionnaire, configurez les délais d'envoi automatique.</p>
        <HelpTooltip text="Ces règles s'appliquent automatiquement à tous vos événements. Vous pouvez les ajuster au cas par cas depuis chaque fiche événement." />
      </div>
      {modelesForm.length === 0 && (
        <p className="text-sm text-muted-foreground italic">Aucun modèle de questionnaire dans la bibliothèque.</p>
      )}
      {modelesForm.map(modele => (
        <FormuleRegleForm key={modele.id} modele={modele} config={getConfig('formulaire', modele.id)} onSave={onSave} />
      ))}
      {/* Règle générique (sans formulaire spécifique) */}
      <FormuleRegleForm modele={null} config={getConfig('formulaire', null)} onSave={onSave} />
    </div>
  );
}

function FormuleRegleForm({ modele, config, onSave }) {
  const [form, setForm] = useState({
    envoi_j: config.envoi_j ?? -60,
    fenetre_reponse_j: config.fenetre_reponse_j ?? 15,
    rappel_j: config.rappel_j ?? -30,
    relance_j: config.relance_j ?? -15,
  });
  const set = (k, v) => setForm(f => ({ ...f, [k]: v }));

  return (
    <div className="bg-muted/30 rounded-xl border border-border p-4 space-y-3">
      <p className="font-medium text-sm">{modele ? modele.nom : '📌 Règle générique (tous les questionnaires)'}</p>
      {modele?.type_evenement && <p className="text-xs text-muted-foreground">Type : {modele.type_evenement}</p>}
      <div className="grid grid-cols-2 md:grid-cols-4 gap-3">
        <DelaiInput label="Envoi automatique" value={form.envoi_j} onChange={v => set('envoi_j', v)} tooltip="J-60 signifie 60 jours avant la date de l'événement. J+1 signifie 1 jour après." />
        <DelaiInput label="Délai de réponse (j)" value={form.fenetre_reponse_j} onChange={v => set('fenetre_reponse_j', v)} positive />
        <DelaiInput label="Rappel si non rempli" value={form.rappel_j} onChange={v => set('rappel_j', v)} tooltip="J-60 signifie 60 jours avant la date de l'événement. J+1 signifie 1 jour après." />
        <DelaiInput label="Relance finale" value={form.relance_j} onChange={v => set('relance_j', v)} tooltip="J-60 signifie 60 jours avant la date de l'événement. J+1 signifie 1 jour après." />
      </div>
      <div className="flex justify-end">
        <Button size="sm" className="gap-1.5" onClick={() => onSave({ bloc: 'formulaire', formulaire_id: modele?.id || null, formulaire_nom: modele?.nom || null, config: form })}>
          <Save size={13} /> Enregistrer
        </Button>
      </div>
    </div>
  );
}