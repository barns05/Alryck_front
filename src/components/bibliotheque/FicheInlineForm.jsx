import { useState } from 'react';
import { X, Check } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';

const DESTINATAIRES = [
  { value: 'extras_salle', label: '👥 Extras Salle' },
  { value: 'extras_cuisine', label: '👨‍🍳 Extras Cuisine' },
  { value: 'prestataires', label: '🎯 Prestataires' },
  { value: 'responsable_soir', label: '👔 Responsable du soir' },
  { value: 'tous', label: '🌐 Tous' },
];

export default function FicheInlineForm({ onSave, onCancel }) {
  const [nom, setNom] = useState('');
  const [destinataires, setDestinataires] = useState([]);

  const toggleDest = (v) =>
    setDestinataires(prev => prev.includes(v) ? prev.filter(d => d !== v) : [...prev, v]);

  return (
    <div className="space-y-4">
      <div className="bg-slate-50 border border-slate-200 rounded-xl px-4 py-3 text-sm text-slate-700">
        💡 Un modèle vide sera créé. Vous pourrez ensuite configurer ses sections depuis la section <strong>Fiches de service</strong>.
      </div>
      <div>
        <label className="text-xs font-medium text-muted-foreground mb-1 block">Nom de la fiche *</label>
        <Input value={nom} onChange={e => setNom(e.target.value)} placeholder="ex: Fiche J — Mariage" />
      </div>
      <div>
        <label className="text-xs font-medium text-muted-foreground mb-2 block">Destinataires</label>
        <div className="flex flex-wrap gap-2">
          {DESTINATAIRES.map(d => (
            <button
              key={d.value}
              type="button"
              onClick={() => toggleDest(d.value)}
              className={`text-xs px-3 py-1.5 rounded-full border font-medium transition-colors ${
                destinataires.includes(d.value)
                  ? 'bg-primary text-primary-foreground border-primary'
                  : 'bg-card border-border text-muted-foreground hover:bg-muted'
              }`}
            >
              {d.label}
            </button>
          ))}
        </div>
      </div>
      <div className="flex gap-2 justify-end border-t border-border pt-3">
        <Button variant="outline" size="sm" onClick={onCancel}><X size={14} /> Annuler</Button>
        <Button size="sm" onClick={() => onSave({ nom: nom.trim(), destinataires, sections: {} })} disabled={!nom.trim()}>
          <Check size={14} /> Créer la fiche
        </Button>
      </div>
    </div>
  );
}