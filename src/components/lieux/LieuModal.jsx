import { useState } from 'react';
import { useMutation, useQueryClient } from '@tanstack/react-query';
import { base44 } from '@/api/base44Client';
import { X } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';

const TYPES_LIEU = ['Salle de réception', 'Château', 'Restaurant', 'Hôtel', 'Plein air', 'Autre'];
const TYPES_EVENEMENT = ['Mariage', 'Pacs', 'Anniversaire de mariage', 'Baptême', 'Anniversaire', "Soirée d'entreprise", 'Séminaire', 'Cocktail', 'Gala', 'Location', 'Autre'];

export default function LieuModal({ lieu, onClose }) {
  const qc = useQueryClient();
  const [form, setForm] = useState({
    nom: lieu?.nom || '',
    type_lieu: lieu?.type_lieu || '',
    adresse: lieu?.adresse || '',
    ville: lieu?.ville || '',
    code_postal: lieu?.code_postal || '',
    telephone: lieu?.telephone || '',
    email: lieu?.email || '',
    capacite: lieu?.capacite || '',
    lien_google_maps: lieu?.lien_google_maps || '',
    notes: lieu?.notes || '',
    types_evenement_defaut: lieu?.types_evenement_defaut || [],
  });
  const set = (k, v) => setForm(f => ({ ...f, [k]: v }));

  const saveMutation = useMutation({
    mutationFn: async () => {
      const cleanedForm = { ...form };
      if (!cleanedForm.lien_google_maps) delete cleanedForm.lien_google_maps;
      const saved = lieu
        ? await base44.entities.Lieu.update(lieu.id, cleanedForm)
        : await base44.entities.Lieu.create(cleanedForm);

      // Invitation automatique uniquement à la création si email renseigné
      if (!lieu && form.email) {
        try {
          await base44.functions.invoke('inviteUser', { email: form.email.toLowerCase().trim(), role: 'lieu' });
        } catch (e) {
          console.warn('Invitation lieu non envoyée:', e.message);
        }
      }
      return saved;
    },
    onSuccess: () => {
      qc.invalidateQueries(['lieux']);
      onClose();
    },
  });

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/40 backdrop-blur-sm p-4">
      <div className="bg-card rounded-2xl border border-border shadow-xl w-full max-w-lg max-h-[90vh] overflow-y-auto">
        <div className="flex items-center justify-between p-6 pb-4 border-b border-border sticky top-0 bg-card z-10">
          <h3 className="font-semibold text-lg">{lieu ? 'Modifier le lieu' : 'Nouveau lieu'}</h3>
          <button onClick={onClose} className="p-1.5 rounded-lg hover:bg-muted text-muted-foreground"><X size={16} /></button>
        </div>

        <div className="p-6 pt-4 space-y-4">
          <div className="grid grid-cols-2 gap-3">
            <div className="space-y-1.5">
              <Label>Nom *</Label>
              <Input value={form.nom} onChange={e => set('nom', e.target.value)} placeholder="Nom du lieu" />
            </div>
            <div className="space-y-1.5">
              <Label>Type</Label>
              <Select value={form.type_lieu} onValueChange={v => set('type_lieu', v)}>
                <SelectTrigger><SelectValue placeholder="Sélectionner..." /></SelectTrigger>
                <SelectContent>
                  {TYPES_LIEU.map(t => <SelectItem key={t} value={t}>{t}</SelectItem>)}
                </SelectContent>
              </Select>
            </div>
          </div>

          <div className="space-y-1.5">
            <Label>Adresse</Label>
            <Input value={form.adresse} onChange={e => set('adresse', e.target.value)} placeholder="Rue, numéro..." />
          </div>

          <div className="grid grid-cols-2 gap-3">
            <div className="space-y-1.5">
              <Label>Ville</Label>
              <Input value={form.ville} onChange={e => set('ville', e.target.value)} placeholder="Ville" />
            </div>
            <div className="space-y-1.5">
              <Label>Code postal</Label>
              <Input value={form.code_postal} onChange={e => set('code_postal', e.target.value)} placeholder="75000" />
            </div>
          </div>

          <div className="grid grid-cols-2 gap-3">
            <div className="space-y-1.5">
              <Label>Téléphone</Label>
              <Input value={form.telephone} onChange={e => set('telephone', e.target.value)} placeholder="01 00 00 00 00" />
            </div>
            <div className="space-y-1.5">
              <Label>Email</Label>
              <Input value={form.email} onChange={e => set('email', e.target.value)} placeholder="contact@..." />
            </div>
          </div>

          <div className="space-y-1.5">
           <Label>Capacité (personnes)</Label>
           <Input type="number" value={form.capacite} onChange={e => set('capacite', parseInt(e.target.value) || '')} placeholder="ex: 200" />
          </div>

          <div className="space-y-1.5">
           <Label>Lien Google Maps</Label>
           <Input value={form.lien_google_maps} onChange={e => set('lien_google_maps', e.target.value)} placeholder="Coller le lien de la fiche établissement Google Maps" />
           <p className="text-xs text-muted-foreground">Le client pourra cliquer sur ce lien pour voir la fiche, les photos et l'itinéraire.</p>
          </div>

          <div className="space-y-1.5">
           <Label>Notes</Label>
           <Input value={form.notes} onChange={e => set('notes', e.target.value)} placeholder="Parking, équipements..." />
          </div>

          {/* Défaut par type d'événement */}
          <div className="space-y-2 pt-1">
            <Label>Associer par défaut à ces types d'événements</Label>
            <p className="text-xs text-muted-foreground">Ce lieu sera pré-sélectionné lors de la configuration de tout nouveau événement de ce type.</p>
            <div className="grid grid-cols-2 gap-1.5">
              {TYPES_EVENEMENT.map(t => {
                const active = (form.types_evenement_defaut || []).includes(t);
                return (
                  <button
                    key={t}
                    type="button"
                    onClick={() => {
                      const current = form.types_evenement_defaut || [];
                      set('types_evenement_defaut', active ? current.filter(x => x !== t) : [...current, t]);
                    }}
                    className={`text-xs px-2.5 py-1.5 rounded-lg border text-left transition-colors ${active ? 'bg-primary/10 border-primary text-primary font-medium' : 'border-border text-muted-foreground hover:bg-muted/50'}`}
                  >
                    {active ? '✓ ' : ''}{t}
                  </button>
                );
              })}
            </div>
          </div>

          <div className="modal-footer">
            <Button variant="outline" onClick={onClose}>Annuler</Button>
            <Button onClick={() => saveMutation.mutate()} disabled={!form.nom || saveMutation.isPending}>
              {saveMutation.isPending ? 'Enregistrement...' : 'Enregistrer'}
            </Button>
          </div>
        </div>
      </div>
    </div>
  );
}