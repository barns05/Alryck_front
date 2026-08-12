import { useState } from 'react';
import { X, Check } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import TypeEvenementMultiSelect from './TypeEvenementMultiSelect';

export default function ProgrammeInlineForm({ onSave, onCancel }) {
  const [nom, setNom] = useState('');
  const [typesEv, setTypesEv] = useState([]);

  return (
    <div className="space-y-4">
      <div className="bg-blue-50 border border-blue-200 rounded-xl px-4 py-3 text-sm text-blue-800">
        💡 Un modèle de programme vide sera créé. Vous pourrez ensuite y ajouter les étapes directement depuis la section <strong>Programme de la journée</strong>.
      </div>
      <div>
        <label className="text-xs font-medium text-muted-foreground mb-1 block">Nom du modèle *</label>
        <Input value={nom} onChange={e => setNom(e.target.value)} placeholder="ex: Programme Mariage standard" />
      </div>
      <div>
        <label className="text-xs font-medium text-muted-foreground mb-2 block">Types d'événement</label>
        <TypeEvenementMultiSelect value={typesEv} onChange={setTypesEv} />
      </div>
      <div className="flex gap-2 justify-end border-t border-border pt-3">
        <Button variant="outline" size="sm" onClick={onCancel}><X size={14} /> Annuler</Button>
        <Button size="sm" onClick={() => onSave({ nom: nom.trim(), types_evenement: typesEv, type_evenement: typesEv[0] || null, etapes: [] })} disabled={!nom.trim()}>
          <Check size={14} /> Créer le modèle
        </Button>
      </div>
    </div>
  );
}