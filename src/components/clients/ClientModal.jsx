import { useState } from 'react';
import { useMutation, useQueryClient } from '@tanstack/react-query';
import { base44 } from '@/api/base44Client';
import { X } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { capitalizeWords } from '@/lib/capitalize';

export default function ClientModal({ client, onClose }) {
  const qc = useQueryClient();
  const [form, setForm] = useState({
    nom: client?.nom || '',
    prenom: client?.prenom || '',
    nom2: client?.nom2 || '',
    prenom2: client?.prenom2 || '',
    telephone: client?.telephone || '',
    telephone2: client?.telephone2 || '',
    email: client?.email || '',
    adresse: client?.adresse || '',
    notes: client?.notes || '',
  });
  const set = (k, v) => setForm(f => ({ ...f, [k]: v }));

  const saveMutation = useMutation({
    mutationFn: async () => {
      const capitalizedForm = {
        ...form,
        nom: capitalizeWords(form.nom),
        prenom: capitalizeWords(form.prenom),
      };

      const savedClient = client
        ? await base44.entities.Client.update(client.id, capitalizedForm)
        : await base44.entities.Client.create(capitalizedForm);

      // Invitation automatique uniquement à la création si email renseigné
      if (!client && form.email) {
        try {
          await base44.functions.invoke('inviteUser', { email: form.email.toLowerCase().trim(), role: 'user' });
        } catch (e) {
          console.warn('Invitation client non envoyée:', e.message);
        }
      }

      return savedClient;
    },
    onSuccess: () => {
      qc.invalidateQueries(['clients']);
      qc.invalidateQueries(['evenements']);
      onClose();
    },
    onError: (error) => {
      console.error('saveMutation error:', error);
    },
  });

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/40 backdrop-blur-sm p-4">
      <div className="bg-card rounded-2xl border border-border shadow-xl w-full max-w-lg max-h-[90vh] overflow-y-auto">
        <div className="flex items-center justify-between p-6 pb-4 border-b border-border sticky top-0 bg-card z-10">
          <h3 className="font-semibold text-lg">{client ? 'Modifier le client' : 'Nouveau client'}</h3>
          <button onClick={onClose} className="p-1.5 rounded-lg hover:bg-muted text-muted-foreground"><X size={16} /></button>
        </div>

        <div className="p-6 pt-4 space-y-4">
          {/* Identité */}
          <div className="grid grid-cols-2 gap-3">
            <div className="space-y-1.5">
              <Label>Prénom *</Label>
              <Input value={form.prenom} onChange={e => set('prenom', e.target.value)} placeholder="Prénom" />
            </div>
            <div className="space-y-1.5">
              <Label>Nom *</Label>
              <Input value={form.nom} onChange={e => set('nom', e.target.value)} placeholder="Nom de famille" />
            </div>
          </div>

          {/* 2ème personne */}
          <div className="space-y-1.5">
            <Label>2ème personne <span className="text-xs text-muted-foreground font-normal">(optionnel)</span></Label>
            <div className="grid grid-cols-2 gap-2">
              <Input value={form.prenom2} onChange={e => set('prenom2', e.target.value)} placeholder="Prénom" />
              <Input value={form.nom2} onChange={e => set('nom2', e.target.value)} placeholder="Nom de famille" />
            </div>
            <Input value={form.telephone2} onChange={e => set('telephone2', e.target.value)} placeholder="Téléphone de la 2ème personne" />
          </div>

          <div className="grid grid-cols-2 gap-3">
            <div className="space-y-1.5">
              <Label>Téléphone</Label>
              <Input value={form.telephone} onChange={e => set('telephone', e.target.value)} placeholder="06 00 00 00 00" />
            </div>
            <div className="space-y-1.5">
              <Label>Email</Label>
              <Input value={form.email} onChange={e => set('email', e.target.value)} placeholder="email@..." />
            </div>
          </div>

          <div className="space-y-1.5">
            <Label>Adresse postale</Label>
            <Input value={form.adresse} onChange={e => set('adresse', e.target.value)} placeholder="Rue, numéro, ville..." />
          </div>

          {!client && (
            <div className="flex items-start gap-3 rounded-xl border border-primary/20 bg-primary/5 px-4 py-3">
              <span className="text-lg leading-none mt-0.5">💡</span>
              <p className="text-xs text-muted-foreground leading-relaxed">
                Une fois le client enregistré, créez son premier événement depuis sa fiche détaillée
                (bouton « Ajouter un événement » dans la section Historique des événements).
              </p>
            </div>
          )}

          <div className="space-y-1.5">
            <Label>Notes</Label>
            <Input value={form.notes} onChange={e => set('notes', e.target.value)} placeholder="Informations complémentaires..." />
          </div>

          <div className="modal-footer">
            <Button variant="outline" onClick={onClose}>Annuler</Button>
            <Button onClick={() => saveMutation.mutate()} disabled={!form.nom || !form.prenom || saveMutation.isPending}>
              {saveMutation.isPending ? 'Enregistrement...' : 'Enregistrer'}
            </Button>
          </div>
        </div>
      </div>
    </div>
  );
}