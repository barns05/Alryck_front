import { useState } from 'react';
import { useMutation, useQueryClient } from '@tanstack/react-query';
import { base44 } from '@/api/base44Client';
import { X } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';

const TYPES = ['Congé', 'Repos', 'Indisponibilité', 'Formation', 'Tâche interne', 'Autre'];
const STATUTS = ['Planifié', 'En cours', 'Terminé', 'Annulé'];

export default function CollaborateurEntreeModal({ collaborateur, entree, onClose }) {
  const qc = useQueryClient();
  const [form, setForm] = useState({
    type: entree?.type || 'Congé',
    titre: entree?.titre || '',
    date: entree?.date || '',
    date_fin: entree?.date_fin || '',
    heure_debut: entree?.heure_debut || '',
    heure_fin: entree?.heure_fin || '',
    statut: entree?.statut || 'Planifié',
    notes: entree?.notes || '',
  });

  const set = (k, v) => setForm(f => ({ ...f, [k]: v }));

  const saveMutation = useMutation({
    mutationFn: () => {
      const data = {
        ...form,
        collaborateur_id: collaborateur.id,
        collaborateur_nom: collaborateur.nom,
      };
      return entree?.id
        ? base44.entities.CollaborateurEntree.update(entree.id, data)
        : base44.entities.CollaborateurEntree.create(data);
    },
    onSuccess: () => {
      qc.invalidateQueries(['collab-entrees', collaborateur.id]);
      onClose();
    },
  });

  return (
    <div className="fixed inset-0 z-[60] flex items-center justify-center bg-black/40 backdrop-blur-sm p-4">
      <div className="bg-card rounded-2xl border border-border shadow-xl w-full max-w-md p-6 space-y-4">
        <div className="flex items-center justify-between">
          <h3 className="font-semibold">{entree ? 'Modifier l\'entrée' : 'Nouvelle entrée'}</h3>
          <button onClick={onClose} className="p-1.5 rounded-lg hover:bg-muted text-muted-foreground"><X size={16} /></button>
        </div>

        <div className="grid grid-cols-2 gap-3">
          <div className="space-y-1.5">
            <Label>Type *</Label>
            <Select value={form.type} onValueChange={v => set('type', v)}>
              <SelectTrigger><SelectValue /></SelectTrigger>
              <SelectContent>{TYPES.map(t => <SelectItem key={t} value={t}>{t}</SelectItem>)}</SelectContent>
            </Select>
          </div>
          <div className="space-y-1.5">
            <Label>Statut</Label>
            <Select value={form.statut} onValueChange={v => set('statut', v)}>
              <SelectTrigger><SelectValue /></SelectTrigger>
              <SelectContent>{STATUTS.map(s => <SelectItem key={s} value={s}>{s}</SelectItem>)}</SelectContent>
            </Select>
          </div>
          <div className="space-y-1.5 col-span-2">
            <Label>Titre <span className="text-muted-foreground text-xs">(optionnel)</span></Label>
            <Input value={form.titre} onChange={e => set('titre', e.target.value)} placeholder="Ex: Congés été, Formation hygiène…" />
          </div>
          <div className="space-y-1.5">
            <Label>Date de début *</Label>
            <Input type="date" value={form.date} onChange={e => set('date', e.target.value)} />
          </div>
          <div className="space-y-1.5">
            <Label>Date de fin <span className="text-muted-foreground text-xs">(optionnel)</span></Label>
            <Input type="date" value={form.date_fin} onChange={e => set('date_fin', e.target.value)} min={form.date} />
          </div>
          <div className="space-y-1.5">
            <Label>Heure début <span className="text-muted-foreground text-xs">(optionnel)</span></Label>
            <Input type="time" value={form.heure_debut} onChange={e => set('heure_debut', e.target.value)} />
          </div>
          <div className="space-y-1.5">
            <Label>Heure fin <span className="text-muted-foreground text-xs">(optionnel)</span></Label>
            <Input type="time" value={form.heure_fin} onChange={e => set('heure_fin', e.target.value)} />
          </div>
          <div className="space-y-1.5 col-span-2">
            <Label>Notes</Label>
            <textarea
              className="w-full rounded-md border border-input bg-transparent px-3 py-2 text-sm min-h-[50px] focus-visible:outline-none focus-visible:ring-1 focus-visible:ring-ring resize-none"
              value={form.notes}
              onChange={e => set('notes', e.target.value)}
              placeholder="Remarques…"
            />
          </div>
        </div>

        <div className="flex justify-end gap-2 pt-1">
          <Button variant="outline" onClick={onClose}>Annuler</Button>
          <Button onClick={() => saveMutation.mutate()} disabled={!form.date || saveMutation.isPending}>
            {saveMutation.isPending ? 'Enregistrement...' : 'Enregistrer'}
          </Button>
        </div>
      </div>
    </div>
  );
}