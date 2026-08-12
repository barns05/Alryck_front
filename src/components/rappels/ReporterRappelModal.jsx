import { useState } from 'react';
import { X, RotateCcw } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { base44 } from '@/api/base44Client';

export default function ReporterRappelModal({ rappel, onClose, onSaved }) {
  const [newDate, setNewDate] = useState('');
  const [newHeure, setNewHeure] = useState(rappel.heure_rappel || '');
  const [saving, setSaving] = useState(false);

  const handleReporter = async () => {
    if (!newDate) return;
    setSaving(true);
    await base44.entities.Rappel.update(rappel.id, {
      date_rappel: newDate,
      heure_rappel: newHeure,
      statut: 'Reporté',
    });
    // Créer un nouveau rappel En attente à la nouvelle date
    await base44.entities.Rappel.create({
      titre: rappel.titre,
      date_rappel: newDate,
      heure_rappel: newHeure,
      type: rappel.type,
      type_lie: rappel.type_lie,
      evenement_id: rappel.evenement_id,
      evenement_nom: rappel.evenement_nom,
      client_id: rappel.client_id,
      client_nom: rappel.client_nom,
      prospect_id: rappel.prospect_id,
      prospect_nom: rappel.prospect_nom,
      notes: rappel.notes,
      statut: 'En attente',
    });
    setSaving(false);
    onSaved?.();
    onClose();
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/40 backdrop-blur-sm p-4">
      <div className="bg-card rounded-2xl border border-border shadow-xl w-full max-w-sm">
        <div className="flex items-center justify-between px-5 py-4 border-b border-border">
          <div className="flex items-center gap-2">
            <RotateCcw size={16} className="text-amber-600" />
            <h3 className="font-semibold">Reporter ce rappel</h3>
          </div>
          <button onClick={onClose} className="p-1.5 rounded-lg hover:bg-muted"><X size={15} /></button>
        </div>
        <div className="p-5 space-y-4">
          <p className="text-sm text-muted-foreground">Reporter <span className="font-medium text-foreground">"{rappel.titre}"</span> à :</p>
          <div className="grid grid-cols-2 gap-3">
            <div className="space-y-1.5">
              <label className="text-sm font-medium">Nouvelle date *</label>
              <Input type="date" value={newDate} onChange={e => setNewDate(e.target.value)} />
            </div>
            <div className="space-y-1.5">
              <label className="text-sm font-medium">Heure</label>
              <Input type="time" value={newHeure} onChange={e => setNewHeure(e.target.value)} />
            </div>
          </div>
          <div className="flex justify-end gap-2">
            <Button variant="outline" onClick={onClose}>Annuler</Button>
            <Button onClick={handleReporter} disabled={!newDate || saving} className="bg-amber-600 hover:bg-amber-700">
              {saving ? 'Enregistrement…' : 'Reporter'}
            </Button>
          </div>
        </div>
      </div>
    </div>
  );
}