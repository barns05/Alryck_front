import { useState } from 'react';
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import { base44 } from '@/api/base44Client';
import { X } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';

const POSTES = ['Serveur', 'Barman', 'Cuisinier', 'Plongeur', 'Chef de rang', 'Hôte/Hôtesse', 'Autre'];
const STATUTS = ['En attente', 'Dispo', 'Indispo', 'Confirmé', 'Annulé', 'Terminé'];

export default function ShiftModal({ shift, defaultDate, onClose }) {
  const qc = useQueryClient();
  const isEdit = !!shift;

  const { data: extrasData = [] } = useQuery({
    queryKey: ['extras-list'],
    queryFn: () => base44.entities.Extra.list(),
  });

  const extras = extrasData.filter(e => e.actif !== false);

  const [form, setForm] = useState({
    extra_id: shift?.extra_id || '',
    extra_nom: shift?.extra_nom || '',
    extra_email: shift?.extra_email || '',
    date: shift?.date || defaultDate || '',
    heure_debut: shift?.heure_debut || '09:00',
    heure_fin: shift?.heure_fin || '17:00',
    poste: shift?.poste || '',
    lieu: shift?.lieu || '',
    statut: shift?.statut || 'En attente',
    notes: shift?.notes || '',
    taux_horaire: shift?.taux_horaire || '',
  });

  const set = (k, v) => setForm(f => ({ ...f, [k]: v }));

  const handleExtraChange = (email) => {
    const extra = extras.find(e => e.email === email);
    setForm(f => ({
      ...f,
      extra_id: email,
      extra_email: email,
      extra_nom: extra?.nom || '',
      poste: f.poste || extra?.poste || '',
    }));
  };

  const wasConfirmed = shift?.statut === 'Confirmé';
  const isNowConfirmed = form.statut === 'Confirmé';
  const wasAnnule = shift?.statut === 'Annulé';
  const isNowAnnule = form.statut === 'Annulé';

  const saveMutation = useMutation({
    mutationFn: async (data) => {
      const extra = extras.find(e => e.email === data.extra_email);
      const extraName = extra?.nom || '';

      if (!isEdit) {
        // Nouveau service → email à l'extra
        const saved = await base44.entities.Shift.create(data);
        if (data.extra_email) {
          await base44.integrations.Core.SendEmail({
            to: data.extra_email,
            subject: '📅 Nouveau service planifié',
            body: `Bonjour ${extraName},\n\nUn nouveau service vous a été assigné :\n- Date : ${data.date}\n- Horaires : ${data.heure_debut} – ${data.heure_fin}\n${data.poste ? `- Poste : ${data.poste}\n` : ''}${data.lieu ? `- Lieu : ${data.lieu}\n` : ''}\nMerci de confirmer votre disponibilité depuis votre espace personnel.\n\nBonne journée !`,
          });
        }
        return saved;
      } else {
        const saved = await base44.entities.Shift.update(shift.id, data);
        // Confirmation service → email à l'extra
        if (!wasConfirmed && isNowConfirmed && data.extra_email) {
          await base44.integrations.Core.SendEmail({
            to: data.extra_email,
            subject: '✅ Votre service a été confirmé !',
            body: `Bonjour ${extraName},\n\nVotre service du ${data.date} de ${data.heure_debut} à ${data.heure_fin}${data.lieu ? ` (${data.lieu})` : ''} a été confirmé.\n\nBonne journée !`,
          });
        }
        // Annulation → email à l'extra
        if (!wasAnnule && isNowAnnule && data.extra_email) {
          await base44.integrations.Core.SendEmail({
            to: data.extra_email,
            subject: '❌ Service annulé',
            body: `Bonjour ${extraName},\n\nVotre service du ${data.date} de ${data.heure_debut} à ${data.heure_fin}${data.lieu ? ` (${data.lieu})` : ''} a été annulé.\n\nNous vous contacterons pour toute nouvelle planification.\n\nCordialement.`,
          });
        }
        return saved;
      }
    },
    onSuccess: () => { qc.invalidateQueries(['shifts']); onClose(); },
  });

  const canSave = form.extra_id && form.date && form.heure_debut && form.heure_fin;

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/40 backdrop-blur-sm p-4">
      <div className="bg-card rounded-2xl border border-border shadow-xl w-full max-w-md p-6 space-y-5 max-h-[90vh] overflow-y-auto">
        <div className="flex items-center justify-between">
          <h3 className="font-semibold text-lg">{isEdit ? 'Modifier le service' : 'Nouveau service'}</h3>

          <button onClick={onClose} className="p-1.5 rounded-lg hover:bg-muted text-muted-foreground"><X size={16} /></button>
        </div>

        <div className="space-y-4">
          <div className="space-y-1.5">
            <Label>Extra *</Label>
            <Select value={form.extra_id} onValueChange={handleExtraChange}>
              <SelectTrigger><SelectValue placeholder="Sélectionner un extra" /></SelectTrigger>
              <SelectContent>
                {extras.map(e => (
                  <SelectItem key={e.email || e.id} value={e.email || e.id}>
                    {e.nom}{e.poste ? ` — ${e.poste}` : ''}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>

          <div className="space-y-1.5">
            <Label>Date *</Label>
            <Input type="date" value={form.date} onChange={e => set('date', e.target.value)} />
          </div>

          <div className="grid grid-cols-2 gap-3">
            <div className="space-y-1.5">
              <Label>Heure début *</Label>
              <Input type="time" value={form.heure_debut} onChange={e => set('heure_debut', e.target.value)} />
            </div>
            <div className="space-y-1.5">
              <Label>Heure fin *</Label>
              <Input type="time" value={form.heure_fin} onChange={e => set('heure_fin', e.target.value)} />
            </div>
          </div>

          <div className="grid grid-cols-2 gap-3">
            <div className="space-y-1.5">
              <Label>Poste</Label>
              <Select value={form.poste} onValueChange={v => set('poste', v)}>
                <SelectTrigger><SelectValue placeholder="Poste" /></SelectTrigger>
                <SelectContent>
                  {POSTES.map(p => <SelectItem key={p} value={p}>{p}</SelectItem>)}
                </SelectContent>
              </Select>
            </div>
            <div className="space-y-1.5">
              <Label>Statut</Label>
              <Select value={form.statut} onValueChange={v => set('statut', v)}>
                <SelectTrigger><SelectValue /></SelectTrigger>
                <SelectContent>
                  {STATUTS.map(s => <SelectItem key={s} value={s}>{s}</SelectItem>)}
                </SelectContent>
              </Select>
            </div>
          </div>

          <div className="grid grid-cols-2 gap-3">
            <div className="space-y-1.5">
              <Label>Lieu / Événement</Label>
              <Input value={form.lieu} onChange={e => set('lieu', e.target.value)} placeholder="Restaurant ABC" />
            </div>
            <div className="space-y-1.5">
              <Label>Taux horaire (€)</Label>
              <Input type="number" value={form.taux_horaire} onChange={e => set('taux_horaire', parseFloat(e.target.value) || '')} placeholder="12.50" />
            </div>
          </div>

          <div className="space-y-1.5">
            <Label>Notes</Label>
            <Input value={form.notes} onChange={e => set('notes', e.target.value)} placeholder="Informations complémentaires..." />
          </div>

          {!isEdit && form.extra_id && (
            <p className="text-xs text-emerald-600 bg-emerald-50 rounded-xl px-3 py-2">
              📧 Un email sera envoyé à {form.extra_email} à la création
            </p>
          )}
        </div>

        <div className="flex justify-end gap-2 pt-1">
          <Button variant="outline" onClick={onClose}>Annuler</Button>
          <Button onClick={() => saveMutation.mutate(form)} disabled={!canSave || saveMutation.isPending}>
            {saveMutation.isPending ? 'Enregistrement...' : 'Enregistrer'}
          </Button>
        </div>
      </div>
    </div>
  );
}