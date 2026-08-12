import { useState } from 'react';
import { useMutation, useQueryClient } from '@tanstack/react-query';
import { base44 } from '@/api/base44Client';
import { X } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';

const TYPES_PRESTATAIRES = ['DJ', 'Chanteur', 'Photographe', 'Vidéaste', 'Animateur', 'Fleuriste', 'Traiteur', 'Musicien', 'Autre'];

export default function PrestataireModal({ onClose }) {
  const qc = useQueryClient();
  const [form, setForm] = useState({ nom: '', poste: '', telephone: '', email: '', notes: '', actif: true });
  const set = (k, v) => setForm(f => ({ ...f, [k]: v }));

  const saveMutation = useMutation({
    mutationFn: () => base44.entities.Extra.create(form),
    onSuccess: () => {
      qc.invalidateQueries(['extras']);
      onClose();
    },
  });

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/40 backdrop-blur-sm p-4">
      <div className="bg-card rounded-2xl border border-border shadow-xl w-full max-w-md p-6 space-y-5">
        <div className="flex items-center justify-between">
          <h3 className="font-semibold text-lg">Ajouter un prestataire</h3>
          <button onClick={onClose} className="p-1.5 rounded-lg hover:bg-muted text-muted-foreground"><X size={16} /></button>
        </div>

        <div className="space-y-4">
          <div className="space-y-1.5">
            <Label>Type de prestataire *</Label>
            <Select value={form.poste} onValueChange={v => set('poste', v)}>
              <SelectTrigger><SelectValue placeholder="Sélectionner..." /></SelectTrigger>
              <SelectContent>
                {TYPES_PRESTATAIRES.map(t => <SelectItem key={t} value={t}>{t}</SelectItem>)}
              </SelectContent>
            </Select>
          </div>
          <div className="space-y-1.5">
            <Label>Nom / Société *</Label>
            <Input value={form.nom} onChange={e => set('nom', e.target.value)} placeholder="ex: DJ Max, Studio Photo Belle" />
          </div>
          <div className="grid grid-cols-2 gap-3">
            <div className="space-y-1.5">
              <Label>Téléphone</Label>
              <Input value={form.telephone} onChange={e => set('telephone', e.target.value)} placeholder="06 00 00 00 00" />
            </div>
            <div className="space-y-1.5">
              <Label>Email</Label>
              <Input value={form.email} onChange={e => set('email', e.target.value)} placeholder="contact@..." />
            </div>
          </div>
          <div className="space-y-1.5">
            <Label>Notes</Label>
            <Input value={form.notes} onChange={e => set('notes', e.target.value)} placeholder="Informations..." />
          </div>
        </div>

        <div className="flex justify-end gap-2">
          <Button variant="outline" onClick={onClose}>Annuler</Button>
          <Button onClick={() => saveMutation.mutate()} disabled={!form.nom || !form.poste || saveMutation.isPending}>
            {saveMutation.isPending ? 'Ajout...' : 'Ajouter'}
          </Button>
        </div>
      </div>
    </div>
  );
}