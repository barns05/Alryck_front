import { useState } from 'react';
import { X, Check } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import TypeEvenementMultiSelect from './TypeEvenementMultiSelect';

export default function FormulaireInlineForm({ onSave, onCancel }) {
  const [nom, setNom] = useState('');
  const [typesEv, setTypesEv] = useState([]);

  return (
    <div className="space-y-4">
      <div className="bg-amber-50 border border-amber-200 rounded-xl px-4 py-3 text-sm text-amber-800">
        💡 Un modèle vide sera créé. Vous pourrez ensuite y ajouter les champs depuis la section <strong>Formulaires</strong>.
      </div>
      <div>
        <label className="text-xs font-medium text-muted-foreground mb-1 block">Nom du modèle *</label>
        <Input value={nom} onChange={e => setNom(e.target.value)} placeholder="ex: Formulaire Mariage" />
      </div>
      <div>
        <label className="text-xs font-medium text-muted-foreground mb-2 block">Types d'événement</label>
        <TypeEvenementMultiSelect value={typesEv} onChange={setTypesEv} />
      </div>
      <div className="flex gap-2 justify-end border-t border-border pt-3">
        <Button variant="outline" size="sm" onClick={onCancel}><X size={14} /> Annuler</Button>
        <Button size="sm" onClick={() => onSave({ nom: nom.trim(), types_evenement: typesEv, type_evenement: typesEv[0] || null, champs: [] })} disabled={!nom.trim()}>
          <Check size={14} /> Créer le modèle
        </Button>
      </div>
    </div>
  );
}