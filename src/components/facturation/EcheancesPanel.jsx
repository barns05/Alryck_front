import { useState } from 'react';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { base44 } from '@/api/base44Client';
import { Plus, Check, Clock, AlertTriangle, Pencil, Trash2, X, Save } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { format, parseISO, isPast } from 'date-fns';
import { fr } from 'date-fns/locale';
import { toast } from 'sonner';

const statutConfig = {
  'En attente': { icon: Clock, color: 'text-amber-600', bg: 'bg-amber-50', label: 'En attente' },
  'Reçu':       { icon: Check, color: 'text-emerald-600', bg: 'bg-emerald-50', label: 'Reçu' },
  'En retard':  { icon: AlertTriangle, color: 'text-red-600', bg: 'bg-red-50', label: 'En retard' },
};

function EcheanceForm({ devisId, evenementId, totalTTC, echeance, onSave, onCancel }) {
  const [form, setForm] = useState(echeance || {
    type: 'Acompte 1',
    mode_calcul: 'pourcentage',
    pourcentage: 30,
    montant_fixe: 0,
    date_prevue: '',
    statut: 'En attente',
    notes: '',
  });
  const set = (k, v) => setForm(f => ({ ...f, [k]: v }));

  const montantCalcule = form.mode_calcul === 'pourcentage'
    ? (totalTTC * (form.pourcentage || 0)) / 100
    : (form.montant_fixe || 0);

  const handleSave = () => {
    onSave({ ...form, montant_calcule: montantCalcule, devis_id: devisId, evenement_id: evenementId });
  };

  return (
    <div className="bg-muted/30 rounded-xl border border-border p-4 space-y-3">
      <div className="grid grid-cols-2 gap-3">
        <div>
          <label className="text-xs font-medium text-muted-foreground mb-1 block">Type</label>
          <Input value={form.type} onChange={e => set('type', e.target.value)} placeholder="Acompte 1, Solde…" className="h-8 text-sm" />
        </div>
        <div>
          <label className="text-xs font-medium text-muted-foreground mb-1 block">Date prévue</label>
          <Input type="date" value={form.date_prevue} onChange={e => set('date_prevue', e.target.value)} className="h-8 text-sm" />
        </div>
        <div>
          <label className="text-xs font-medium text-muted-foreground mb-1 block">Mode de calcul</label>
          <div className="flex gap-1.5">
            {['pourcentage', 'fixe'].map(m => (
              <button
                key={m}
                onClick={() => set('mode_calcul', m)}
                className={`flex-1 text-xs py-1.5 rounded-lg border font-medium transition-colors ${form.mode_calcul === m ? 'bg-primary text-primary-foreground border-primary' : 'border-border bg-card text-muted-foreground hover:bg-muted'}`}
              >
                {m === 'pourcentage' ? '% du TTC' : '€ fixe'}
              </button>
            ))}
          </div>
        </div>
        <div>
          <label className="text-xs font-medium text-muted-foreground mb-1 block">
            {form.mode_calcul === 'pourcentage' ? 'Pourcentage (%)' : 'Montant (€)'}
          </label>
          {form.mode_calcul === 'pourcentage' ? (
            <Input type="number" value={form.pourcentage || ''} onChange={e => set('pourcentage', parseFloat(e.target.value) || 0)} placeholder="30" className="h-8 text-sm" />
          ) : (
            <Input type="number" value={form.montant_fixe || ''} onChange={e => set('montant_fixe', parseFloat(e.target.value) || 0)} placeholder="0.00" className="h-8 text-sm" />
          )}
        </div>
      </div>
      {totalTTC > 0 && (
        <p className="text-sm text-primary font-semibold">Montant calculé : {montantCalcule.toFixed(2)} €</p>
      )}
      <div className="flex gap-2 justify-end">
        <Button variant="outline" size="sm" onClick={onCancel}><X size={13} /> Annuler</Button>
        <Button size="sm" onClick={handleSave}><Save size={13} /> Enregistrer</Button>
      </div>
    </div>
  );
}

export default function EcheancesPanel({ devisId, evenementId, totalTTC = 0, disabled = false }) {
  const qc = useQueryClient();
  const [showForm, setShowForm] = useState(false);
  const [editing, setEditing] = useState(null);

  const { data: echeances = [] } = useQuery({
    queryKey: ['echeances', devisId],
    queryFn: () => base44.entities.Echeance.filter({ devis_id: devisId }),
    enabled: !!devisId,
  });

  const createMutation = useMutation({
    mutationFn: data => base44.entities.Echeance.create(data),
    onSuccess: () => { qc.invalidateQueries(['echeances', devisId]); setShowForm(false); toast.success('Échéance ajoutée'); },
  });

  const updateMutation = useMutation({
    mutationFn: ({ id, data }) => base44.entities.Echeance.update(id, data),
    onSuccess: () => { qc.invalidateQueries(['echeances', devisId]); setEditing(null); toast.success('Échéance mise à jour'); },
  });

  const deleteMutation = useMutation({
    mutationFn: id => base44.entities.Echeance.delete(id),
    onSuccess: () => qc.invalidateQueries(['echeances', devisId]),
  });

  const toggleStatut = (e) => {
    const next = e.statut === 'En attente' ? 'Reçu' : e.statut === 'Reçu' ? 'En attente' : 'Reçu';
    updateMutation.mutate({ id: e.id, data: { statut: next, date_reception: next === 'Reçu' ? new Date().toISOString().split('T')[0] : null } });
  };

  const totalRecu = echeances.filter(e => e.statut === 'Reçu').reduce((s, e) => s + (e.montant_calcule || 0), 0);
  const soldeRestant = totalTTC - totalRecu;

  return (
    <div className="space-y-4">
      {/* Récap — une seule ligne : Total TTC grand à gauche, Reçu/Restant à droite */}
      <div className="flex items-baseline justify-between gap-4 pb-3 border-b border-border">
        <div>
          <p className="text-[10px] font-semibold uppercase tracking-wider text-muted-foreground">Total TTC</p>
          <p className="text-2xl font-bold text-primary">{totalTTC.toFixed(2)} €</p>
        </div>
        <div className="flex items-baseline gap-4">
          <div className="text-right">
            <p className="text-[10px] font-semibold uppercase tracking-wider text-muted-foreground">Reçu</p>
            <p className="text-sm font-medium text-emerald-600">{totalRecu.toFixed(2)} €</p>
          </div>
          <div className="text-right">
            <p className="text-[10px] font-semibold uppercase tracking-wider text-muted-foreground">Restant</p>
            <p className={`text-sm font-bold ${soldeRestant > 0 ? 'text-primary' : 'text-muted-foreground'}`}>{soldeRestant.toFixed(2)} €</p>
          </div>
        </div>
      </div>

      {/* Liste échéances — lignes simples avec bordure fine en bas */}
      <div className="divide-y divide-border">
        {echeances.map(e => {
          const cfg = statutConfig[e.statut] || statutConfig['En attente'];
          const Icon = cfg.icon;
          const isLate = e.statut === 'En attente' && e.date_prevue && isPast(parseISO(e.date_prevue));

          return (
            <div key={e.id}>
              {!disabled && editing?.id === e.id ? (
                <EcheanceForm
                  devisId={devisId}
                  evenementId={evenementId}
                  totalTTC={totalTTC}
                  echeance={editing}
                  onSave={data => updateMutation.mutate({ id: e.id, data })}
                  onCancel={() => setEditing(null)}
                />
              ) : (
                <div className={`flex items-center justify-between gap-3 py-3 ${isLate ? 'bg-red-50/50 -mx-2 px-2 rounded' : ''}`}>
                  <div className="flex items-center gap-3 flex-1 min-w-0">
                    <button
                      onClick={() => toggleStatut(e)}
                      className={`p-1.5 rounded-full ${cfg.bg} ${cfg.color} shrink-0 hover:opacity-80 transition-opacity`}
                      title="Changer le statut"
                    >
                      <Icon size={14} />
                    </button>
                    <div className="min-w-0">
                      <p className="font-medium text-sm">{e.type}</p>
                      <p className="text-xs text-muted-foreground">
                        {e.date_prevue ? format(parseISO(e.date_prevue), 'd MMM yyyy', { locale: fr }) : 'Pas de date'}
                        {isLate && <span className="ml-2 text-red-500 font-medium">En retard</span>}
                      </p>
                    </div>
                  </div>
                  <div className="text-right shrink-0">
                    <p className="font-semibold">{(e.montant_calcule || 0).toFixed(2)} €</p>
                    {e.mode_calcul === 'pourcentage' && <p className="text-xs text-muted-foreground">{e.pourcentage}%</p>}
                  </div>
                  {!disabled && (
                    <div className="flex gap-1 shrink-0">
                      <button onClick={() => setEditing(e)} className="p-1.5 rounded-lg hover:bg-muted text-muted-foreground hover:text-foreground">
                        <Pencil size={13} />
                      </button>
                      <button onClick={() => { if (window.confirm('Supprimer cette échéance ?')) deleteMutation.mutate(e.id); }} className="p-1.5 rounded-lg hover:bg-red-50 text-muted-foreground hover:text-red-500">
                        <Trash2 size={13} />
                      </button>
                    </div>
                  )}
                </div>
              )}
            </div>
          );
        })}

        {echeances.length === 0 && !showForm && (
          <p className="text-sm text-muted-foreground text-center py-6">Aucune échéance définie.</p>
        )}
      </div>

      {!disabled && showForm && (
        <EcheanceForm
          devisId={devisId}
          evenementId={evenementId}
          totalTTC={totalTTC}
          onSave={data => createMutation.mutate(data)}
          onCancel={() => setShowForm(false)}
        />
      )}

      {!disabled && !showForm && (
        <Button variant="outline" size="sm" className="gap-1.5" onClick={() => setShowForm(true)}>
          <Plus size={13} /> Ajouter une échéance
        </Button>
      )}
    </div>
  );
}