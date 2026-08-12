import { useState } from 'react';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { base44 } from '@/api/base44Client';
import { X, Check, Plus, Loader2 } from 'lucide-react';
import { toast } from 'sonner';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';

const STATUTS = ['Recommandé', 'Contacté', 'Confirmé', 'Annulé'];
const statutColors = {
  'Recommandé': 'bg-amber-100 text-amber-700',
  'Contacté':    'bg-blue-100 text-blue-700',
  'Confirmé':    'bg-emerald-100 text-emerald-700',
  'Annulé':      'bg-red-100 text-red-600',
};

export default function AssocierPrestataireModal({ evenement, onClose }) {
  const qc = useQueryClient();
  const [selectedPrestataire, setSelectedPrestataire] = useState(null);
  const [statut, setStatut] = useState('Recommandé');
  const [montant, setMontant] = useState('');
  const [notes, setNotes] = useState('');
  const [search, setSearch] = useState('');

  const { data: prestataires = [] } = useQuery({
    queryKey: ['prestataires'],
    queryFn: () => base44.entities.Prestataire.list(),
  });

  const { data: associations = [] } = useQuery({
    queryKey: ['evenement-prestataires', evenement.id],
    queryFn: () => base44.entities.EvenementPrestataire.filter({ evenement_id: evenement.id }),
  });

  const addMutation = useMutation({
    mutationFn: async () => {
      // Déterminer le nom du recommandeur (uniquement pour le statut Recommandé)
      let recommande_par;
      if (statut === 'Recommandé') {
        try {
          const initiateurs = await base44.entities.EvenementPrestataire.filter({
            evenement_id: evenement.id,
            initiateur: true,
          });
          if (initiateurs.length > 0 && initiateurs[0].prestataire_nom) {
            recommande_par = initiateurs[0].prestataire_nom;
          } else {
            const companies = await base44.entities.CompanySettings.list();
            const owner = companies.find(cs => cs.is_owner === true);
            if (owner?.company_name) recommande_par = owner.company_name;
          }
        } catch (e) { /* silencieux */ }
      }

      return base44.entities.EvenementPrestataire.create({
        evenement_id: evenement.id,
        evenement_nom: evenement.nom,
        prestataire_id: selectedPrestataire.id,
        prestataire_nom: selectedPrestataire.nom,
        prestataire_domaine: selectedPrestataire.domaine,
        statut,
        recommande_par,
        montant: parseFloat(montant) || undefined,
        notes,
      });
    },
    onSuccess: () => {
      qc.invalidateQueries(['evenement-prestataires', evenement.id]);
      toast.success('Prestataire ajouté');
      setSelectedPrestataire(null);
      setMontant('');
      setNotes('');
      setSearch('');
    },
    onError: () => {
      toast.error('Erreur lors de l\'ajout');
    },
  });

  const updateStatutMutation = useMutation({
    mutationFn: ({ id, statut }) => base44.entities.EvenementPrestataire.update(id, { statut }),
    onSuccess: () => qc.invalidateQueries(['evenement-prestataires', evenement.id]),
  });

  const deleteMutation = useMutation({
    mutationFn: (id) => base44.entities.EvenementPrestataire.delete(id),
    onSuccess: () => qc.invalidateQueries(['evenement-prestataires', evenement.id]),
  });

  const alreadyIds = associations.map(a => a.prestataire_id);
  const filtered = prestataires.filter(p =>
    p.actif !== false &&
    !alreadyIds.includes(p.id) &&
    (p.nom.toLowerCase().includes(search.toLowerCase()) || (p.domaine || '').toLowerCase().includes(search.toLowerCase()))
  );

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/40 backdrop-blur-sm p-4">
      <div className="bg-card rounded-2xl border border-border shadow-xl w-full max-w-lg p-6 space-y-5 max-h-[90vh] overflow-y-auto">
        <div className="flex items-center justify-between">
          <div>
            <h3 className="font-semibold text-lg">Prestataires</h3>
            <p className="text-xs text-muted-foreground mt-0.5">{evenement.nom}</p>
          </div>
          <button onClick={onClose} className="p-1.5 rounded-lg hover:bg-muted text-muted-foreground"><X size={16} /></button>
        </div>

        {/* Associations existantes */}
        {associations.length > 0 && (
          <div className="space-y-2">
            <Label className="text-xs uppercase tracking-wide text-muted-foreground">Prestataires associés</Label>
            {associations.map(a => (
              <div key={a.id} className="flex items-center gap-2 bg-muted/40 rounded-xl px-3 py-2">
                <div className="flex-1 min-w-0">
                  <p className="font-medium text-sm truncate">{a.prestataire_nom}</p>
                  <p className="text-xs text-muted-foreground">{a.prestataire_domaine}{a.montant ? ` · ${a.montant}€` : ''}</p>
                </div>
                <Select value={a.statut} onValueChange={v => updateStatutMutation.mutate({ id: a.id, statut: v })}>
                  <SelectTrigger className={`w-32 h-7 text-xs border-0 ${statutColors[a.statut]}`}>
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    {STATUTS.map(s => <SelectItem key={s} value={s}>{s}</SelectItem>)}
                  </SelectContent>
                </Select>
                <button onClick={() => deleteMutation.mutate(a.id)} className="p-1 text-muted-foreground hover:text-destructive rounded">
                  <X size={13} />
                </button>
              </div>
            ))}
          </div>
        )}

        {/* Ajouter un prestataire */}
        <div className="space-y-3 border-t border-border pt-4">
          <Label className="text-xs uppercase tracking-wide text-muted-foreground">Associer un prestataire</Label>
          <Input
            placeholder="Rechercher par nom ou domaine..."
            value={search}
            onChange={e => setSearch(e.target.value)}
          />
          <div className="space-y-1.5 max-h-40 overflow-y-auto">
            {filtered.length === 0 && (
              <p className="text-sm text-muted-foreground text-center py-3">Aucun prestataire disponible</p>
            )}
            {filtered.map(p => (
              <button
                key={p.id}
                onClick={() => setSelectedPrestataire(selectedPrestataire?.id === p.id ? null : p)}
                className={`w-full flex items-center justify-between px-3 py-2 rounded-xl text-sm transition-colors border ${
                  selectedPrestataire?.id === p.id
                    ? 'bg-primary/10 border-primary/30 text-primary'
                    : 'bg-card border-transparent hover:bg-muted'
                }`}
              >
                <div className="text-left">
                  <p className="font-medium">{p.nom}</p>
                  <p className="text-xs text-muted-foreground">{p.domaine || '—'}{p.tarif ? ` · ~${p.tarif}€` : ''}</p>
                </div>
                {selectedPrestataire?.id === p.id && <Check size={14} />}
              </button>
            ))}
          </div>

          {selectedPrestataire && (
            <div className="space-y-2 bg-muted/30 rounded-xl p-3">
              <p className="text-xs font-semibold text-muted-foreground">Détails pour {selectedPrestataire.nom}</p>
              <div className="space-y-2">
                <Label className="text-xs">Mode d'ajout</Label>
                <div className="grid grid-cols-2 gap-2">
                  {[
                    { value: 'Recommandé', icon: '📌', label: 'Proposer au client', desc: 'Apparaît dans "Sélection", le client peut confirmer' },
                    { value: 'Confirmé',    icon: '✅', label: 'Confirmer directement', desc: 'Apparaît dans "Mon événement" immédiatement' },
                  ].map(opt => (
                    <button
                      key={opt.value}
                      type="button"
                      onClick={() => setStatut(opt.value)}
                      className={`text-left px-3 py-2.5 rounded-xl border-2 transition-all ${
                        statut === opt.value
                          ? 'border-primary bg-primary/5'
                          : 'border-border bg-muted/30 hover:border-muted-foreground/30'
                      }`}
                    >
                      <p className="text-xs font-semibold">{opt.icon} {opt.label}</p>
                      <p className="text-[10px] text-muted-foreground mt-0.5 leading-tight">{opt.desc}</p>
                    </button>
                  ))}
                </div>
              </div>
              <div className="space-y-1">
                <Label className="text-xs">Montant (€)</Label>
                <Input className="h-8 text-xs" type="number" value={montant} onChange={e => setMontant(e.target.value)} placeholder="0" />
              </div>
              <Input className="text-xs" value={notes} onChange={e => setNotes(e.target.value)} placeholder="Notes spécifiques..." />
              <Button size="sm" className="w-full gap-1" onClick={() => addMutation.mutate()} disabled={addMutation.isPending}>
                {addMutation.isPending ? <Loader2 size={13} className="animate-spin" /> : <Plus size={13} />}
                {addMutation.isPending ? 'Ajout en cours…' : 'Ajouter'}
              </Button>
            </div>
          )}
        </div>
      </div>
    </div>
  );
}