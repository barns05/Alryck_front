import { useState } from 'react';
import { X, Bell, AlertCircle } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { base44 } from '@/api/base44Client';
import { useQuery } from '@tanstack/react-query';

export default function RappelModal({ onClose, onSaved, defaultContext = null }) {
  // defaultContext = { type: 'evenement'|'client'|'prospect', id, nom }
  const [step, setStep] = useState('form'); // 'form' | 'confirm'
  const [form, setForm] = useState({
    titre: '',
    date_rappel: '',
    heure_rappel: '',
    notes: '',
    type_lie: defaultContext?.type || 'aucun',
    evenement_id: defaultContext?.type === 'evenement' ? defaultContext.id : '',
    evenement_nom: defaultContext?.type === 'evenement' ? defaultContext.nom : '',
    client_id: defaultContext?.type === 'client' ? defaultContext.id : '',
    client_nom: defaultContext?.type === 'client' ? defaultContext.nom : '',
    prospect_id: defaultContext?.type === 'prospect' ? defaultContext.id : '',
    prospect_nom: defaultContext?.type === 'prospect' ? defaultContext.nom : '',
  });
  const [saving, setSaving] = useState(false);

  const { data: evenements = [] } = useQuery({
    queryKey: ['evenements-mini'],
    queryFn: () => base44.entities.Evenement.list('-date', 200),
    enabled: !defaultContext,
  });
  const { data: clients = [] } = useQuery({
    queryKey: ['clients-mini'],
    queryFn: () => base44.entities.Client.list('-created_date', 200),
    enabled: !defaultContext,
  });

  const set = (k, v) => setForm(f => ({ ...f, [k]: v }));

  const handleContextChange = (val) => {
    if (val === 'aucun') {
      setForm(f => ({ ...f, type_lie: 'aucun', evenement_id: '', evenement_nom: '', client_id: '', client_nom: '' }));
    } else if (val.startsWith('ev_')) {
      const ev = evenements.find(e => e.id === val.replace('ev_', ''));
      setForm(f => ({ ...f, type_lie: 'evenement', evenement_id: ev?.id || '', evenement_nom: ev?.nom || '', client_id: '', client_nom: '' }));
    } else if (val.startsWith('cl_')) {
      const cl = clients.find(c => c.id === val.replace('cl_', ''));
      setForm(f => ({ ...f, type_lie: 'client', client_id: cl?.id || '', client_nom: `${cl?.prenom || ''} ${cl?.nom || ''}`.trim(), evenement_id: '', evenement_nom: '' }));
    }
  };

  const getContextValue = () => {
    if (form.type_lie === 'evenement' && form.evenement_id) return `ev_${form.evenement_id}`;
    if (form.type_lie === 'client' && form.client_id) return `cl_${form.client_id}`;
    return 'aucun';
  };

  const getContextLabel = () => {
    if (form.type_lie === 'evenement' && form.evenement_nom) return `Événement : ${form.evenement_nom}`;
    if (form.type_lie === 'client' && form.client_nom) return `Client : ${form.client_nom}`;
    if (form.type_lie === 'prospect' && form.prospect_nom) return `Prospect : ${form.prospect_nom}`;
    return 'Aucun';
  };

  const handleConfirm = async () => {
    setSaving(true);
    await base44.entities.Rappel.create({ ...form, type: 'Manuel', statut: 'En attente' });
    setSaving(false);
    onSaved?.();
    onClose();
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/40 backdrop-blur-sm p-4">
      <div className="bg-card rounded-2xl border border-border shadow-xl w-full max-w-md">
        <div className="flex items-center justify-between px-6 py-4 border-b border-border">
          <div className="flex items-center gap-2">
            <Bell size={18} className="text-primary" />
            <h3 className="font-semibold">{step === 'confirm' ? 'Confirmer le rappel' : 'Nouveau rappel'}</h3>
          </div>
          <button onClick={onClose} className="p-1.5 rounded-lg hover:bg-muted"><X size={16} /></button>
        </div>

        {step === 'form' && (
          <div className="p-6 space-y-4">
            <div className="space-y-1.5">
              <label className="text-sm font-medium">Titre *</label>
              <Input value={form.titre} onChange={e => set('titre', e.target.value)} placeholder="Ex : Relancer le client pour le solde" />
            </div>
            <div className="grid grid-cols-2 gap-3">
              <div className="space-y-1.5">
                <label className="text-sm font-medium">Date *</label>
                <Input type="date" value={form.date_rappel} onChange={e => set('date_rappel', e.target.value)} />
              </div>
              <div className="space-y-1.5">
                <label className="text-sm font-medium">Heure</label>
                <Input type="time" value={form.heure_rappel} onChange={e => set('heure_rappel', e.target.value)} />
              </div>
            </div>
            {!defaultContext && (
              <div className="space-y-1.5">
                <label className="text-sm font-medium">Événement ou client concerné</label>
                <select
                  value={getContextValue()}
                  onChange={e => handleContextChange(e.target.value)}
                  className="flex h-9 w-full rounded-md border border-input bg-transparent px-3 text-sm"
                >
                  <option value="aucun">Aucun</option>
                  {evenements.length > 0 && (
                    <optgroup label="Événements">
                      {evenements.map(ev => <option key={ev.id} value={`ev_${ev.id}`}>{ev.nom}</option>)}
                    </optgroup>
                  )}
                  {clients.length > 0 && (
                    <optgroup label="Clients">
                      {clients.map(cl => <option key={cl.id} value={`cl_${cl.id}`}>{cl.prenom} {cl.nom}</option>)}
                    </optgroup>
                  )}
                </select>
              </div>
            )}
            {defaultContext && (
              <div className="bg-primary/5 border border-primary/20 rounded-lg px-3 py-2 text-sm text-primary font-medium">
                {getContextLabel()}
              </div>
            )}
            <div className="space-y-1.5">
              <label className="text-sm font-medium">Notes</label>
              <textarea
                value={form.notes}
                onChange={e => set('notes', e.target.value)}
                rows={3}
                placeholder="Détails supplémentaires…"
                className="flex w-full rounded-md border border-input bg-transparent px-3 py-2 text-sm resize-none focus-visible:outline-none focus-visible:ring-1 focus-visible:ring-ring"
              />
            </div>
            <div className="flex justify-end gap-2 pt-1">
              <Button variant="outline" onClick={onClose}>Annuler</Button>
              <Button onClick={() => setStep('confirm')} disabled={!form.titre || !form.date_rappel}>
                Continuer
              </Button>
            </div>
          </div>
        )}

        {step === 'confirm' && (
          <div className="p-6 space-y-4">
            <div className="bg-amber-50 border border-amber-200 rounded-xl p-4 flex gap-3">
              <AlertCircle size={18} className="text-amber-600 shrink-0 mt-0.5" />
              <p className="text-sm text-amber-800">Confirmer la création de ce rappel ?</p>
            </div>
            <div className="bg-muted/40 rounded-xl p-4 space-y-2 text-sm">
              <div className="flex justify-between">
                <span className="text-muted-foreground">Titre</span>
                <span className="font-medium">{form.titre}</span>
              </div>
              <div className="flex justify-between">
                <span className="text-muted-foreground">Date</span>
                <span className="font-medium">{form.date_rappel}{form.heure_rappel ? ` à ${form.heure_rappel}` : ''}</span>
              </div>
              {getContextLabel() !== 'Aucun' && (
                <div className="flex justify-between">
                  <span className="text-muted-foreground">Contexte</span>
                  <span className="font-medium">{getContextLabel()}</span>
                </div>
              )}
              {form.notes && (
                <div className="flex justify-between gap-4">
                  <span className="text-muted-foreground shrink-0">Notes</span>
                  <span className="font-medium text-right">{form.notes}</span>
                </div>
              )}
            </div>
            <div className="flex justify-end gap-2">
              <Button variant="outline" onClick={() => setStep('form')}>Modifier</Button>
              <Button onClick={handleConfirm} disabled={saving}>
                {saving ? 'Enregistrement…' : 'Confirmer'}
              </Button>
            </div>
          </div>
        )}
      </div>
    </div>
  );
}