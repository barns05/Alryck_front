import { useState } from 'react';
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import { base44 } from '@/api/base44Client';
import { X, Check, Plus } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import PrestataireModal from '@/components/extras/PrestataireModal';

const POSTES = ['Serveur', 'Barman', 'Cuisinier', 'Plongeur', 'Chef de rang', 'Hôte/Hôtesse', 'Autre'];

export default function ServiceModal({ defaultDate, onClose }) {
  const qc = useQueryClient();

  const { data: extrasData = [] } = useQuery({
    queryKey: ['extras-list'],
    queryFn: () => base44.entities.Extra.list(),
  });
  const extras = extrasData.filter(e => e.actif !== false);

  const { data: lieux = [] } = useQuery({ queryKey: ['lieux'], queryFn: () => base44.entities.Lieu.list() });

  const { data: evenements = [] } = useQuery({ queryKey: ['evenements'], queryFn: () => base44.entities.Evenement.list('-date', 200) });
  const [evenementSearch, setEvenementSearch] = useState('');
  const [evenementMode, setEvenementMode] = useState('liste'); // 'liste' | 'libre'
  const [dateConflict, setDateConflict] = useState(null); // { eventDate, eventNom }

  const filteredEvenements = evenements.filter(e => {
    const q = evenementSearch.toLowerCase();
    return !q || `${e.nom} ${e.client_nom || ''} ${e.date || ''}`.toLowerCase().includes(q);
  });

  const [form, setForm] = useState({
    date: defaultDate || '',
    heure_debut: '',
    heure_fin: '',
    poste: '',
    lieu_id: '',
    lieu: '',
    notes: '',
    taux_horaire: '',
    evenement_id: '',
    evenement_nom: '',
  });
  const [lieuMode, setLieuMode] = useState('liste'); // 'liste' | 'libre'
  const [selectedExtras, setSelectedExtras] = useState([]);
  const [prestataireOpen, setPrestataireOpen] = useState(false);
  const set = (k, v) => setForm(f => ({ ...f, [k]: v }));

  const handleEvenementChange = (id) => {
    if (id === '__libre__') {
      setEvenementMode('libre');
      setForm(f => ({ ...f, evenement_id: '', evenement_nom: '' }));
      return;
    }
    setEvenementMode('liste');
    const ev = evenements.find(e => e.id === id);
    if (ev && form.date && ev.date && ev.date !== form.date) {
      setDateConflict({ eventDate: ev.date, eventNom: ev.nom, eventId: ev.id });
    } else {
      setForm(f => ({ ...f, evenement_id: id, evenement_nom: ev?.nom || '', date: ev?.date || f.date }));
    }
  };

  const resolveConflict = (useEventDate) => {
    const ev = evenements.find(e => e.id === dateConflict.eventId);
    setForm(f => ({
      ...f,
      evenement_id: dateConflict.eventId,
      evenement_nom: dateConflict.eventNom,
      date: useEventDate ? dateConflict.eventDate : f.date,
    }));
    setDateConflict(null);
  };

  const toggleExtra = (extra) => {
    setSelectedExtras(prev =>
      prev.find(e => e.id === extra.id)
        ? prev.filter(e => e.id !== extra.id)
        : [...prev, extra]
    );
  };

  const saveMutation = useMutation({
    mutationFn: async () => {
      // 1. Créer le service
      const service = await base44.entities.Service.create({
        ...form,
        taux_horaire: parseFloat(form.taux_horaire) || undefined,
      });

      // 2. Créer les assignments
      for (const extra of selectedExtras) {
        await base44.entities.ServiceAssignment.create({
          service_id: service.id,
          extra_id: extra.email || extra.id,
          extra_nom: extra.nom,
          extra_email: extra.email,
          statut: 'En attente',
        });
      }

      // 3. Envoyer les emails en arrière-plan (pas d'await)
      selectedExtras.forEach(extra => {
        if (extra.email) {
          base44.integrations.Core.SendEmail({
            to: extra.email,
            subject: '📅 Nouveau service planifié',
            body: `Bonjour ${extra.nom},\n\nUn nouveau service vous a été assigné :\n- Date : ${form.date}\n- Horaires : ${form.heure_debut} – ${form.heure_fin}\n${form.poste ? `- Poste : ${form.poste}\n` : ''}${form.lieu ? `- Lieu : ${form.lieu}\n` : ''}\nMerci de confirmer votre disponibilité depuis votre espace Mon Planning.\n\nBonne journée !`,
          }).catch(() => {});
        }
      });
    },
    onSuccess: () => {
      qc.invalidateQueries(['services']);
      qc.invalidateQueries(['assignments']);
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

  const canSave = form.date && selectedExtras.length > 0;

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/40 backdrop-blur-sm p-4">
      <div className="bg-card rounded-2xl border border-border shadow-xl w-full max-w-lg p-6 space-y-5 max-h-[90vh] overflow-y-auto">
        <div className="flex items-center justify-between">
          <h3 className="font-semibold text-lg">Nouveau service</h3>
          <button onClick={onClose} className="p-1.5 rounded-lg hover:bg-muted text-muted-foreground"><X size={16} /></button>
        </div>

        <div className="space-y-4">
          {/* Date & Heures */}
          <div className="grid grid-cols-3 gap-3">
            <div className="space-y-1.5">
              <Label>Date *</Label>
              <Input type="date" value={form.date} onChange={e => set('date', e.target.value)} />
            </div>
            <div className="space-y-1.5">
              <Label>Heure début</Label>
              <Input type="time" value={form.heure_debut} onChange={e => set('heure_debut', e.target.value)} />
            </div>
            <div className="space-y-1.5">
              <Label>Heure fin</Label>
              <Input type="time" value={form.heure_fin} onChange={e => set('heure_fin', e.target.value)} />
            </div>
          </div>

          {/* Lieu */}
          <div className="space-y-1.5">
            <Label>Lieu</Label>
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
            <Label>Événement associé (optionnel)</Label>
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
                  mais la date du formulaire est <strong>{form.date}</strong>.
                </p>
                <div className="flex gap-2">
                  <button type="button" onClick={() => resolveConflict(true)} className="flex-1 text-xs bg-orange-500 text-white rounded-md px-2 py-1.5 hover:bg-orange-600">
                    Adopter la date de l'événement ({dateConflict.eventDate})
                  </button>
                  <button type="button" onClick={() => resolveConflict(false)} className="flex-1 text-xs bg-muted text-foreground rounded-md px-2 py-1.5 hover:bg-secondary">
                    Conserver ma date ({form.date})
                  </button>
                </div>
              </div>
            )}
          </div>

          {/* Poste */}
          <div className="space-y-1.5">
            <Label>Poste</Label>
            <Select value={form.poste} onValueChange={v => set('poste', v)}>
              <SelectTrigger><SelectValue placeholder="Sélectionner un poste" /></SelectTrigger>
              <SelectContent>
                {POSTES.map(p => <SelectItem key={p} value={p}>{p}</SelectItem>)}
              </SelectContent>
            </Select>
          </div>

          {/* Taux horaire */}
          <div className="space-y-1.5">
            <Label>Taux horaire (€)</Label>
            <Input type="number" step="0.01" value={form.taux_horaire} onChange={e => set('taux_horaire', e.target.value)} placeholder="0.00" />
          </div>

          {/* Notes */}
          <div className="space-y-1.5">
            <Label>Notes</Label>
            <Input value={form.notes} onChange={e => set('notes', e.target.value)} placeholder="Informations complémentaires..." />
          </div>

          {/* Sélection extras */}
          <div className="space-y-2">
            <div className="flex items-center justify-between">
              <Label>Extras à notifier * <span className="text-muted-foreground font-normal">(sélection multiple)</span></Label>
              <button
                type="button"
                onClick={() => setPrestataireOpen(true)}
                className="flex items-center gap-1 text-xs font-semibold px-2.5 py-1 rounded-lg bg-orange-500 text-white hover:bg-orange-600 transition-colors"
              >
                <Plus size={11} /> Nouveau prestataire
              </button>
            </div>
            <div className="space-y-2 max-h-48 overflow-y-auto border border-border rounded-xl p-2">
              {extras.length === 0 && (
                <p className="text-sm text-muted-foreground text-center py-3">Aucun extra disponible</p>
              )}
              {extras.map(extra => {
                const selected = !!selectedExtras.find(e => e.id === extra.id);
                return (
                  <button
                    key={extra.id}
                    type="button"
                    onClick={() => toggleExtra(extra)}
                    className={`w-full flex items-center justify-between px-3 py-2 rounded-lg text-sm transition-colors ${
                      selected ? 'bg-primary/10 text-primary border border-primary/30' : 'hover:bg-muted border border-transparent'
                    }`}
                  >
                    <div className="text-left pointer-events-none">
                      <p className="font-medium">{extra.nom}</p>
                      <p className="text-xs text-muted-foreground">{extra.poste || '—'}{extra.email ? ` · ${extra.email}` : ' · pas d\'email'}</p>
                    </div>
                    {selected && <Check size={14} className="text-primary shrink-0 pointer-events-none" />}
                  </button>
                );
              })}
            </div>
            {selectedExtras.length > 0 && (
              <p className="text-xs text-emerald-600 bg-emerald-50 rounded-xl px-3 py-2">
                📧 {selectedExtras.filter(e => e.email).length} email(s) seront envoyés à la création
                {selectedExtras.filter(e => !e.email).length > 0 && ` (${selectedExtras.filter(e => !e.email).length} extra(s) sans email)`}
              </p>
            )}
          </div>
        </div>

      {prestataireOpen && <PrestataireModal onClose={() => { setPrestataireOpen(false); qc.invalidateQueries(['extras-list']); }} />}

        <div className="flex justify-end gap-2 pt-1">
          <Button variant="outline" onClick={onClose}>Annuler</Button>
          <Button onClick={() => saveMutation.mutate()} disabled={!canSave || saveMutation.isPending}>
            {saveMutation.isPending ? 'Création...' : `Créer le service (${selectedExtras.length} extra${selectedExtras.length > 1 ? 's' : ''})`}
          </Button>
        </div>
      </div>
    </div>
  );
}