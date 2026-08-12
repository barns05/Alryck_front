import { useState } from 'react';
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import { base44 } from '@/api/base44Client';
import { X, CalendarCheck } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';

export default function RendezVousClientModal({ defaultDate, onClose }) {
  const qc = useQueryClient();
  const { data: lieux = [] } = useQuery({
    queryKey: ['lieux'],
    queryFn: () => base44.entities.Lieu.list(),
  });

  const [form, setForm] = useState({
    client_id: '',
    date_confirmee: defaultDate || '',
    heure_confirmee: '',
    motif: '',
    notes_admin: '',
    prestataire_id: '',
    lieu_id: '',
    lieu: '',
    evenement_id: '',
    evenement_nom: '',
  });
  const [lieuMode, setLieuMode] = useState('liste'); // 'liste' | 'libre'
  const [clientSearch, setClientSearch] = useState('');
  const [evenementSearch, setEvenementSearch] = useState('');
  const [evenementMode, setEvenementMode] = useState('liste'); // 'liste' | 'libre'
  const [dateConflict, setDateConflict] = useState(null); // { eventDate, eventNom }
  const set = (k, v) => setForm(f => ({ ...f, [k]: v }));

  const { data: clients = [] } = useQuery({
    queryKey: ['clients'],
    queryFn: () => base44.entities.Client.list('-date_evenement', 200),
  });

  const { data: prestataires = [] } = useQuery({
    queryKey: ['prestataires'],
    queryFn: () => base44.entities.Prestataire.list('nom', 200),
  });

  const { data: evenements = [] } = useQuery({
    queryKey: ['evenements'],
    queryFn: () => base44.entities.Evenement.list('-date', 200),
  });

  const selectedClient = clients.find(c => c.id === form.client_id);

  const filteredClients = clients.filter(c => {
    const q = clientSearch.toLowerCase();
    return !q || `${c.prenom} ${c.nom} ${c.email || ''}`.toLowerCase().includes(q);
  });

  const filteredEvenements = evenements.filter(e => {
    const q = evenementSearch.toLowerCase();
    return !q || `${e.nom} ${e.client_nom || ''} ${e.date || ''}`.toLowerCase().includes(q);
  });

  const handleEvenementChange = (id) => {
    if (id === '__libre__') {
      setEvenementMode('libre');
      setForm(f => ({ ...f, evenement_id: '', evenement_nom: '' }));
      return;
    }
    setEvenementMode('liste');
    const ev = evenements.find(e => e.id === id);
    if (ev && form.date_confirmee && ev.date && ev.date !== form.date_confirmee) {
      setDateConflict({ eventDate: ev.date, eventNom: ev.nom, eventId: ev.id });
    } else {
      setForm(f => ({ ...f, evenement_id: id, evenement_nom: ev?.nom || '', date_confirmee: ev?.date || f.date_confirmee }));
    }
  };

  const resolveConflict = (useEventDate) => {
    setForm(f => ({
      ...f,
      evenement_id: dateConflict.eventId,
      evenement_nom: dateConflict.eventNom,
      date_confirmee: useEventDate ? dateConflict.eventDate : f.date_confirmee,
    }));
    setDateConflict(null);
  };

  const createMutation = useMutation({
    mutationFn: () => {
      return base44.entities.RendezVous.create({
        client_id: form.client_id,
        evenement_id: form.evenement_id || '',
        client_nom: selectedClient ? `${selectedClient.prenom} ${selectedClient.nom}` : '',
        evenement_nom: form.evenement_nom || '',
        date_souhaitee: form.date_confirmee,
        heure_souhaitee: form.heure_confirmee,
        motif: form.motif,
        statut: 'Confirmé',
        date_confirmee: form.date_confirmee,
        heure_confirmee: form.heure_confirmee,
        notes_admin: form.notes_admin,
        lieu_id: form.lieu_id || undefined,
        lieu: form.lieu || undefined,
      });
    },
    onSuccess: () => {
      qc.invalidateQueries(['rendezvous']);
      onClose();
    },
  });

  const handleLieuChange = (v) => {
    if (v === '__libre__') {
      setLieuMode('libre');
      setForm(f => ({ ...f, lieu_id: '', lieu: '' }));
    } else {
      setLieuMode('liste');
      const found = lieux.find(l => l.id === v);
      setForm(f => ({ ...f, lieu_id: v, lieu: found?.nom || '' }));
    }
  };

  const canSubmit = form.client_id && form.date_confirmee && form.heure_confirmee && form.motif;

  return (
    <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50 p-4">
      <div className="bg-card rounded-2xl shadow-xl w-full max-w-md">
        <div className="flex items-center justify-between p-5 border-b border-border">
          <div className="flex items-center gap-2">
            <CalendarCheck size={18} className="text-primary" />
            <h2 className="font-semibold text-base">Nouveau RDV client</h2>
          </div>
          <button onClick={onClose} className="text-muted-foreground hover:text-foreground p-1 rounded-lg hover:bg-muted">
            <X size={18} />
          </button>
        </div>

        <div className="p-5 space-y-4">
          {/* Client */}
          <div className="space-y-1.5">
            <Label className="text-xs">Client *</Label>
            <Input
              placeholder="🔍 Rechercher un client..."
              value={clientSearch}
              onChange={e => setClientSearch(e.target.value)}
            />
            <select
              value={form.client_id}
              onChange={e => set('client_id', e.target.value)}
              className="flex h-9 w-full rounded-md border border-input bg-transparent px-3 py-1 text-sm shadow-sm focus-visible:outline-none focus-visible:ring-1 focus-visible:ring-ring"
            >
              <option value="">Sélectionner un client</option>
              {filteredClients.map(c => (
                <option key={c.id} value={c.id}>{c.prenom} {c.nom}{c.email ? ` · ${c.email}` : ''}</option>
              ))}
            </select>
          </div>

          {/* Date & Heure */}
          <div className="grid grid-cols-2 gap-3">
            <div className="space-y-1.5">
              <Label className="text-xs">Date *</Label>
              <Input type="date" value={form.date_confirmee} onChange={e => set('date_confirmee', e.target.value)} />
            </div>
            <div className="space-y-1.5">
              <Label className="text-xs">Heure *</Label>
              <Input type="time" value={form.heure_confirmee} onChange={e => set('heure_confirmee', e.target.value)} />
            </div>
          </div>

          {/* Lieu */}
          <div className="space-y-1.5">
            <Label className="text-xs">Lieu</Label>
            <select
              value={lieuMode === 'libre' ? '__libre__' : (form.lieu_id || '')}
              onChange={e => handleLieuChange(e.target.value)}
              className="flex h-9 w-full rounded-md border border-input bg-transparent px-3 py-1 text-sm shadow-sm focus-visible:outline-none focus-visible:ring-1 focus-visible:ring-ring"
            >
              <option value="">— Sélectionner</option>
              {lieux.map(l => <option key={l.id} value={l.id}>{l.nom}{l.ville ? ` · ${l.ville}` : ''}</option>)}
              <option value="__libre__">✏️ Saisir manuellement</option>
            </select>
            {lieuMode === 'libre' && (
              <Input value={form.lieu} onChange={e => set('lieu', e.target.value)} placeholder="Nom du lieu..." />
            )}
          </div>

          {/* Événement associé */}
          <div className="space-y-1.5">
            <Label className="text-xs">Événement associé (optionnel)</Label>
            {evenementMode === 'liste' ? (
              <>
                <Input
                  placeholder="🔍 Rechercher un événement..."
                  value={evenementSearch}
                  onChange={e => setEvenementSearch(e.target.value)}
                />
                <select
                  value={form.evenement_id}
                  onChange={e => handleEvenementChange(e.target.value)}
                  className="flex h-9 w-full rounded-md border border-input bg-transparent px-3 py-1 text-sm shadow-sm focus-visible:outline-none focus-visible:ring-1 focus-visible:ring-ring"
                >
                  <option value="">— Aucun événement</option>
                  {filteredEvenements.map(e => (
                    <option key={e.id} value={e.id}>{e.nom}{e.date ? ` · ${e.date}` : ''}{e.client_nom ? ` · ${e.client_nom}` : ''}</option>
                  ))}
                  <option value="__libre__">✏️ Saisir un événement non programmé</option>
                </select>
              </>
            ) : (
              <div className="flex gap-2">
                <Input
                  value={form.evenement_nom}
                  onChange={e => setForm(f => ({ ...f, evenement_nom: e.target.value }))}
                  placeholder="Nom de l'événement non programmé..."
                />
                <button
                  type="button"
                  onClick={() => { setEvenementMode('liste'); setForm(f => ({ ...f, evenement_id: '', evenement_nom: '' })); }}
                  className="text-xs text-muted-foreground hover:text-foreground px-2 border border-input rounded-md whitespace-nowrap"
                >
                  ← Liste
                </button>
              </div>
            )}
            {dateConflict && (
              <div className="rounded-lg border border-orange-300 bg-orange-50 p-3 space-y-2">
                <p className="text-sm text-orange-800 font-medium">⚠️ Conflit de date</p>
                <p className="text-xs text-orange-700">
                  L'événement <strong>{dateConflict.eventNom}</strong> est prévu le <strong>{dateConflict.eventDate}</strong>,
                  mais la date du formulaire est <strong>{form.date_confirmee}</strong>.
                </p>
                <div className="flex gap-2">
                  <button type="button" onClick={() => resolveConflict(true)} className="flex-1 text-xs bg-orange-500 text-white rounded-md px-2 py-1.5 hover:bg-orange-600">
                    Adopter la date de l'événement ({dateConflict.eventDate})
                  </button>
                  <button type="button" onClick={() => resolveConflict(false)} className="flex-1 text-xs bg-muted text-foreground rounded-md px-2 py-1.5 hover:bg-secondary">
                    Conserver ma date ({form.date_confirmee})
                  </button>
                </div>
              </div>
            )}
          </div>

          {/* Motif */}
          <div className="space-y-1.5">
            <Label className="text-xs">Motif *</Label>
            <Input
              value={form.motif}
              onChange={e => set('motif', e.target.value)}
              placeholder="Ex: Finaliser le menu, visite du lieu..."
            />
          </div>

          {/* Prestataire (optionnel) */}
          <div className="space-y-1.5">
            <Label className="text-xs">Prestataire associé (optionnel)</Label>
            <select
              value={form.prestataire_id}
              onChange={e => set('prestataire_id', e.target.value)}
              className="flex h-9 w-full rounded-md border border-input bg-transparent px-3 py-1 text-sm shadow-sm focus-visible:outline-none focus-visible:ring-1 focus-visible:ring-ring"
            >
              <option value="">Aucun prestataire</option>
              {prestataires.map(p => (
                <option key={p.id} value={p.id}>{p.nom} {p.domaine ? `· ${p.domaine}` : ''}</option>
              ))}
            </select>
          </div>

          {/* Notes */}
          <div className="space-y-1.5">
            <Label className="text-xs">Notes (optionnel)</Label>
            <Input
              value={form.notes_admin}
              onChange={e => set('notes_admin', e.target.value)}
              placeholder="Notes internes..."
            />
          </div>
        </div>

        <div className="flex gap-2 px-5 pb-5">
          <Button variant="outline" className="flex-1" onClick={onClose}>Annuler</Button>
          <Button
            className="flex-1"
            disabled={!canSubmit || createMutation.isPending}
            onClick={() => createMutation.mutate()}
          >
            {createMutation.isPending ? 'Création...' : 'Créer le RDV'}
          </Button>
        </div>
      </div>
    </div>
  );
}