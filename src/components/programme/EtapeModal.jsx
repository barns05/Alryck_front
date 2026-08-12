import { useState } from 'react';
import { useMutation, useQueryClient } from '@tanstack/react-query';
import { base44 } from '@/api/base44Client';
import { X, Save, Loader2 } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';

const CATEGORIES = ['Accueil', 'Cocktail', 'Repas', 'Animation', 'Logistique', 'Départ'];

export default function EtapeModal({ etape, onClose }) {
  const qc = useQueryClient();
  const [form, setForm] = useState({
    nom: etape?.nom || '',
    duree_heures: etape?.duree_heures ?? 0,
    duree_minutes: etape?.duree_minutes ?? 30,
    categorie: etape?.categorie || 'Accueil',
    etat: etape?.etat || 'disponible',
    ordre: etape?.ordre ?? 99,
  });

  const save = useMutation({
    mutationFn: () => etape
      ? base44.entities.EtapeBibliotheque.update(etape.id, form)
      : base44.entities.EtapeBibliotheque.create(form),
    onSuccess: () => { qc.invalidateQueries(['etapes-bibliotheque']); onClose(); },
  });

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/40 p-4">
      <div className="bg-card border border-border rounded-2xl shadow-xl w-full max-w-sm p-6 space-y-4">
        <div className="flex items-center justify-between">
          <h3 className="font-semibold">{etape ? "Modifier l'étape" : 'Nouvelle étape'}</h3>
          <button onClick={onClose} className="text-muted-foreground hover:text-foreground"><X size={16} /></button>
        </div>

        <div className="space-y-3">
          <div className="space-y-1.5">
            <Label>Nom de l'étape *</Label>
            <Input
              value={form.nom}
              onChange={e => setForm(f => ({ ...f, nom: e.target.value }))}
              placeholder="Ex : Cérémonie laïque, Cocktail…"
              autoFocus
            />
          </div>

          <div className="space-y-1.5">
            <Label>Durée</Label>
            <div className="flex items-center gap-2">
              <div className="flex items-center gap-1.5 flex-1">
                <Input
                  type="number" min={0} max={12}
                  value={form.duree_heures}
                  onChange={e => setForm(f => ({ ...f, duree_heures: parseInt(e.target.value) || 0 }))}
                  className="h-9 text-center"
                />
                <span className="text-sm text-muted-foreground shrink-0">h</span>
              </div>
              <div className="flex items-center gap-1.5 flex-1">
                <Input
                  type="number" min={0} max={59} step={5}
                  value={form.duree_minutes}
                  onChange={e => setForm(f => ({ ...f, duree_minutes: parseInt(e.target.value) || 0 }))}
                  className="h-9 text-center"
                />
                <span className="text-sm text-muted-foreground shrink-0">min</span>
              </div>
            </div>
          </div>

          <div className="space-y-1.5">
            <Label>Catégorie</Label>
            <Select value={form.categorie} onValueChange={v => setForm(f => ({ ...f, categorie: v }))}>
              <SelectTrigger><SelectValue /></SelectTrigger>
              <SelectContent>
                {CATEGORIES.map(c => <SelectItem key={c} value={c}>{c}</SelectItem>)}
              </SelectContent>
            </Select>
          </div>

          <div className="space-y-1.5">
            <Label>État</Label>
            <Select value={form.etat} onValueChange={v => setForm(f => ({ ...f, etat: v }))}>
              <SelectTrigger><SelectValue /></SelectTrigger>
              <SelectContent>
                <SelectItem value="incluse">✅ Incluse par défaut</SelectItem>
                <SelectItem value="disponible">⬜ Disponible</SelectItem>
                <SelectItem value="archivee">📦 Archivée</SelectItem>
              </SelectContent>
            </Select>
          </div>
        </div>

        <div className="flex justify-end gap-2 pt-1">
          <Button variant="outline" size="sm" onClick={onClose}>Annuler</Button>
          <Button size="sm" onClick={() => save.mutate()} disabled={save.isPending || !form.nom.trim()}>
            {save.isPending ? <Loader2 size={13} className="animate-spin" /> : <><Save size={13} /> Enregistrer</>}
          </Button>
        </div>
      </div>
    </div>
  );
}