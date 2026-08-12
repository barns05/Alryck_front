import { useState } from 'react';
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import { base44 } from '@/api/base44Client';
import { X } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';

const COMPETENCES = ['Serveur', 'Maître d\'hôtel', 'Barman', 'Chef de rang', 'Cuisinier', 'Plongeur', 'Hôte/Hôtesse', 'Chauffeur / Livreur', 'Autre'];

export default function ExtraModal({ extra, onClose }) {
  const qc = useQueryClient();
  const isEdit = !!extra;
  const { data: lieux = [] } = useQuery({ queryKey: ['lieux'], queryFn: () => base44.entities.Lieu.list() });

  const [form, setForm] = useState({
    nom: extra?.nom || '',
    telephone: extra?.telephone || '',
    email: extra?.email || '',
    competences: extra?.competences || (extra?.poste ? [extra.poste] : []),
    competence_autre: extra?.competence_autre || '',
    lieu_id: extra?.lieu_id || '',
    lieu_nom: extra?.lieu_nom || '',
    notes: extra?.notes || '',
    actif: extra?.actif !== false,
  });

  const toggleCompetence = (c) => {
    setForm(f => {
      const has = f.competences.includes(c);
      return { ...f, competences: has ? f.competences.filter(x => x !== c) : [...f.competences, c] };
    });
  };
  const [lieuMode, setLieuMode] = useState(extra?.lieu_id ? 'liste' : (extra?.lieu_nom ? 'libre' : 'liste'));

  const set = (k, v) => setForm(f => ({ ...f, [k]: v }));

  const handleLieuChange = (v) => {
    if (v === '__aucun__') {
      setLieuMode('liste');
      setForm(f => ({ ...f, lieu_id: '', lieu_nom: '' }));
    } else if (v === '__libre__') {
      setLieuMode('libre');
      setForm(f => ({ ...f, lieu_id: '', lieu_nom: '' }));
    } else {
      setLieuMode('liste');
      const lieu = lieux.find(l => l.id === v);
      setForm(f => ({ ...f, lieu_id: v, lieu_nom: lieu?.nom || '' }));
    }
  };

  const saveMutation = useMutation({
    mutationFn: async (data) => {
      const saved = isEdit
        ? await base44.entities.Extra.update(extra.id, data)
        : await base44.entities.Extra.create(data);

      // Invitation automatique uniquement à la création si email renseigné
      if (!isEdit && data.email) {
        try {
          await base44.functions.invoke('inviteUser', { email: data.email.toLowerCase().trim(), role: 'extra' });
        } catch (e) {
          console.warn('Invitation extra non envoyée:', e.message);
        }
      }
      return saved;
    },
    onSuccess: () => { qc.invalidateQueries(['extras']); onClose(); },
  });

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/40 backdrop-blur-sm p-4">
      <div className="bg-card rounded-2xl border border-border shadow-xl w-full max-w-md max-h-[90vh] overflow-y-auto">
        <div className="flex items-center justify-between p-6 pb-4 border-b border-border sticky top-0 bg-card z-10">
          <h3 className="font-semibold text-lg">{isEdit ? 'Modifier l\'extra' : 'Nouvel extra'}</h3>
          <button onClick={onClose} className="p-1.5 rounded-lg hover:bg-muted text-muted-foreground"><X size={16} /></button>
        </div>

        <div className="p-6 pt-4 space-y-4">
          <div className="space-y-1.5">
            <Label>Nom complet *</Label>
            <Input value={form.nom} onChange={e => set('nom', e.target.value)} placeholder="Jean Dupont" />
          </div>
          <div className="grid grid-cols-2 gap-3">
            <div className="space-y-1.5">
              <Label>Téléphone</Label>
              <Input value={form.telephone} onChange={e => set('telephone', e.target.value)} placeholder="06 12 34 56 78" />
            </div>
            <div className="space-y-1.5">
              <Label>Email</Label>
              <Input value={form.email} onChange={e => set('email', e.target.value)} placeholder="jean@mail.com" />
            </div>
          </div>
          <div className="space-y-2">
            <Label>Compétences</Label>
            <div className="grid grid-cols-2 gap-2">
              {COMPETENCES.map(c => (
                <label key={c} className={`flex items-center gap-2.5 px-3 py-2 rounded-xl border cursor-pointer transition-colors text-sm ${
                  form.competences.includes(c)
                    ? 'bg-primary/10 border-primary/40 text-primary font-medium'
                    : 'bg-muted/30 border-border hover:bg-muted/50'
                }`}>
                  <input
                    type="checkbox"
                    checked={form.competences.includes(c)}
                    onChange={() => toggleCompetence(c)}
                    className="w-4 h-4 rounded accent-primary"
                  />
                  {c}
                </label>
              ))}
            </div>
            {form.competences.includes('Autre') && (
              <Input
                value={form.competence_autre}
                onChange={e => set('competence_autre', e.target.value)}
                placeholder="Précisez la compétence..."
                className="mt-1"
              />
            )}
          </div>
          <div className="space-y-1.5">
            <Label>Lieu habituel</Label>
            <Select value={lieuMode === 'libre' ? '__libre__' : (form.lieu_id || '__aucun__')} onValueChange={handleLieuChange}>
              <SelectTrigger><SelectValue placeholder="Sélectionner un lieu..." /></SelectTrigger>
              <SelectContent>
                <SelectItem value="__aucun__">— Aucun</SelectItem>
                {lieux.map(l => <SelectItem key={l.id} value={l.id}>{l.nom}{l.ville ? ` · ${l.ville}` : ''}</SelectItem>)}
                <SelectItem value="__libre__">✏️ Saisir manuellement</SelectItem>
              </SelectContent>
            </Select>
            {lieuMode === 'libre' && (
              <Input value={form.lieu_nom} onChange={e => setForm(f => ({ ...f, lieu_nom: e.target.value }))} placeholder="Nom du lieu..." />
            )}
          </div>
          <div className="space-y-1.5">
            <Label>Notes</Label>
            <Input value={form.notes} onChange={e => set('notes', e.target.value)} placeholder="Disponible weekends..." />
          </div>
          <div className="flex items-center gap-2">
            <input type="checkbox" id="actif" checked={form.actif} onChange={e => set('actif', e.target.checked)} className="rounded" />
            <Label htmlFor="actif" className="cursor-pointer">Actif</Label>
          </div>

          <div className="modal-footer">
            <Button variant="outline" onClick={onClose}>Annuler</Button>
            <Button onClick={() => saveMutation.mutate(form)} disabled={!form.nom || saveMutation.isPending}>
              {saveMutation.isPending ? 'Enregistrement...' : 'Enregistrer'}
            </Button>
          </div>
        </div>
      </div>
    </div>
  );
}