import { useState } from 'react';
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import { base44 } from '@/api/base44Client';
import { X, Check } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';

export default function ServicePrestataireModal({ defaultDate, onClose, defaultPrestataire }) {
  const qc = useQueryClient();

  const { data: prestatairesData = [] } = useQuery({
    queryKey: ['prestataires'],
    queryFn: () => base44.entities.Prestataire.list(),
  });
  const prestataires = prestatairesData.filter(p => p.actif !== false);

  const { data: evenements = [] } = useQuery({
    queryKey: ['evenements'],
    queryFn: () => base44.entities.Evenement.list('-date', 100),
  });

  const [form, setForm] = useState({
    date: defaultDate || '',
    heure_debut: '09:00',
    heure_fin: '17:00',
    lieu: '',
    notes: '',
    evenement_id: '',
  });
  const [selectedPrestataires, setSelectedPrestataires] = useState(defaultPrestataire ? [defaultPrestataire] : []);
  const set = (k, v) => setForm(f => ({ ...f, [k]: v }));

  const toggle = (p) => {
    setSelectedPrestataires(prev =>
      prev.find(e => e.id === p.id)
        ? prev.filter(e => e.id !== p.id)
        : [...prev, p]
    );
  };

  const selectedEvenement = evenements.find(e => e.id === form.evenement_id);

  const saveMutation = useMutation({
    mutationFn: async () => {
      for (const p of selectedPrestataires) {
        await base44.entities.DispoPrestataire.create({
          prestataire_id: p.id,
          prestataire_nom: p.nom,
          prestataire_email: p.email || '',
          prestataire_domaine: p.domaine || '',
          date: form.date,
          heure_debut: form.heure_debut,
          heure_fin: form.heure_fin,
          lieu: form.lieu,
          notes: form.notes,
          statut: 'En attente',
          evenement_id: form.evenement_id || '',
          evenement_nom: selectedEvenement?.nom || '',
        });

        if (p.email) {
          try {
            await base44.integrations.Core.SendEmail({
              to: p.email,
              subject: '📅 Demande de disponibilité',
              body: `Bonjour ${p.nom},\n\nNous souhaiterions connaître votre disponibilité pour :\n- Date : ${form.date}\n- Horaires : ${form.heure_debut} – ${form.heure_fin}\n${form.lieu ? `- Lieu : ${form.lieu}\n` : ''}${selectedEvenement ? `- Événement : ${selectedEvenement.nom}\n` : ''}${form.notes ? `- Notes : ${form.notes}\n` : ''}\nMerci de confirmer votre disponibilité.\n\nCordialement.`,
            });
          } catch (e) {
            console.warn('Email non envoyé à', p.email, e.message);
          }
        }
      }
    },
    onSuccess: () => {
      qc.invalidateQueries(['dispoprestataires']);
      onClose();
    },
  });

  const canSave = form.date && form.heure_debut && form.heure_fin && selectedPrestataires.length > 0;

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/40 backdrop-blur-sm p-4">
      <div className="bg-card rounded-2xl border border-border shadow-xl w-full max-w-lg p-6 space-y-5 max-h-[90vh] overflow-y-auto">
        <div className="flex items-center justify-between">
          <div>
            <h3 className="font-semibold text-lg">Demande de disponibilité</h3>
            <p className="text-xs text-muted-foreground mt-0.5">Envoyer une demande aux prestataires</p>
          </div>
          <button onClick={onClose} className="p-1.5 rounded-lg hover:bg-muted text-muted-foreground"><X size={16} /></button>
        </div>

        <div className="space-y-4">
          {/* Date & Heures */}
          <div className="grid grid-cols-2 gap-3">
            <div className="space-y-1.5">
              <Label>Date *</Label>
              <Input type="date" value={form.date} onChange={e => set('date', e.target.value)} />
            </div>
            <div className="space-y-1.5">
              <Label>Heure début *</Label>
              <Input type="time" value={form.heure_debut} onChange={e => set('heure_debut', e.target.value)} />
            </div>
          </div>

          <div className="grid grid-cols-2 gap-3">
            <div className="space-y-1.5">
              <Label>Heure fin *</Label>
              <Input type="time" value={form.heure_fin} onChange={e => set('heure_fin', e.target.value)} />
            </div>
            <div className="space-y-1.5">
              <Label>Lieu</Label>
              <Input value={form.lieu} onChange={e => set('lieu', e.target.value)} placeholder="Salle, adresse..." />
            </div>
          </div>

          {/* Événement associé */}
          <div className="space-y-1.5">
            <Label>Événement associé (optionnel)</Label>
            <select
              value={form.evenement_id}
              onChange={e => set('evenement_id', e.target.value)}
              className="flex h-9 w-full rounded-md border border-input bg-transparent px-3 py-1 text-sm shadow-sm focus-visible:outline-none focus-visible:ring-1 focus-visible:ring-ring"
            >
              <option value="">Aucun événement</option>
              {evenements.map(ev => (
                <option key={ev.id} value={ev.id}>{ev.nom} · {ev.date}</option>
              ))}
            </select>
          </div>

          {/* Notes */}
          <div className="space-y-1.5">
            <Label>Notes</Label>
            <Input value={form.notes} onChange={e => set('notes', e.target.value)} placeholder="Informations complémentaires..." />
          </div>

          {/* Prestataires */}
          <div className="space-y-2">
            <Label>Prestataires à notifier * <span className="text-muted-foreground font-normal">(sélection multiple)</span></Label>
            <div className="space-y-2 max-h-48 overflow-y-auto border border-border rounded-xl p-2">
              {prestataires.length === 0 && (
                <p className="text-sm text-muted-foreground text-center py-3">Aucun prestataire disponible</p>
              )}
              {prestataires.map(p => {
                const selected = selectedPrestataires.find(e => e.id === p.id);
                return (
                  <button
                    key={p.id}
                    type="button"
                    onClick={() => toggle(p)}
                    className={`w-full flex items-center justify-between px-3 py-2 rounded-lg text-sm transition-colors ${
                      selected ? 'bg-purple-50 text-purple-700 border border-purple-300' : 'hover:bg-muted border border-transparent'
                    }`}
                  >
                    <div className="text-left">
                      <p className="font-medium">{p.nom}</p>
                      <p className="text-xs text-muted-foreground">{p.domaine || '—'}{p.email ? ` · ${p.email}` : ' · pas d\'email'}</p>
                    </div>
                    {selected && <Check size={14} className="text-purple-600 shrink-0" />}
                  </button>
                );
              })}
            </div>
            {selectedPrestataires.length > 0 && (
              <p className="text-xs text-purple-700 bg-purple-50 rounded-xl px-3 py-2">
                📧 {selectedPrestataires.filter(e => e.email).length} email(s) seront envoyés à la création
                {selectedPrestataires.filter(e => !e.email).length > 0 && ` (${selectedPrestataires.filter(e => !e.email).length} sans email)`}
              </p>
            )}
          </div>
        </div>

        <div className="flex justify-end gap-2 pt-1">
          <Button variant="outline" onClick={onClose}>Annuler</Button>
          <Button
            onClick={() => saveMutation.mutate()}
            disabled={!canSave || saveMutation.isPending}
            className="bg-purple-500 hover:bg-purple-600 text-white"
          >
            {saveMutation.isPending ? 'Envoi...' : `Envoyer demande (${selectedPrestataires.length})`}
          </Button>
        </div>
      </div>
    </div>
  );
}