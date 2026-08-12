import { useState } from 'react';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { base44 } from '@/api/base44Client';
import { Plus, Trash2, ExternalLink, Check, X, Pencil, Eye } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';

const TYPES = ['Cérémonie', 'Réception', 'Cocktail', 'Repas', 'Autre'];

function Section({ title, children }) {
  return (
    <div className="space-y-2">
      <h4 className="text-xs font-semibold uppercase tracking-wider text-muted-foreground">{title}</h4>
      {children}
    </div>
  );
}

export default function LieuxSection({ evenementId }) {
  const qc = useQueryClient();
  const [showAddForm, setShowAddForm] = useState(false);
  const [formData, setFormData] = useState({ lieu_nom: '', lieu_ville: '', lieu_lien_google_maps: '', type: 'Réception' });
  const [editingId, setEditingId] = useState(null);
  const [showRefused, setShowRefused] = useState(false);

  const { data: lieuxEvenement = [] } = useQuery({
    queryKey: ['lieux-evenement', evenementId],
    queryFn: () => base44.entities.LieuEvenement.filter({ evenement_id: evenementId }),
  });

  const { data: lieux = [] } = useQuery({
    queryKey: ['lieux'],
    queryFn: () => base44.entities.Lieu.list(),
  });

  const createMutation = useMutation({
    mutationFn: (data) => {
      if (editingId) {
        return base44.entities.LieuEvenement.update(editingId, data);
      }
      return base44.entities.LieuEvenement.create({
        ...data,
        evenement_id: evenementId,
        ordre: lieuxEvenement.length,
      });
    },
    onSuccess: () => {
      qc.invalidateQueries(['lieux-evenement', evenementId]);
      setFormData({ lieu_nom: '', lieu_ville: '', lieu_lien_google_maps: '', type: 'Réception' });
      setShowAddForm(false);
      setEditingId(null);
    },
  });

  const deleteMutation = useMutation({
    mutationFn: (id) => base44.entities.LieuEvenement.delete(id),
    onSuccess: () => qc.invalidateQueries(['lieux-evenement', evenementId]),
  });

  const validateMutation = useMutation({
    mutationFn: (lieu_id) => base44.functions.invoke('traiterPropositionLieu', { lieu_id, action: 'valider' }),
    onSuccess: () => qc.invalidateQueries(['lieux-evenement', evenementId]),
  });

  const refuseMutation = useMutation({
    mutationFn: ({ lieu_id, motif_refus }) =>
      base44.functions.invoke('traiterPropositionLieu', { lieu_id, action: 'refuser', motif_refus }),
    onSuccess: () => qc.invalidateQueries(['lieux-evenement', evenementId]),
  });

  const visibles = lieuxEvenement.filter((le) => (le.statut_validation || 'valide') !== 'refuse');
  const refused = lieuxEvenement.filter((le) => le.statut_validation === 'refuse');

  return (
    <Section title={`Lieu${lieuxEvenement.length !== 1 ? 'x' : ''} (${lieuxEvenement.length})`}>
      {lieuxEvenement.length === 0 && !showAddForm ? (
        <p className="text-sm text-muted-foreground">Aucun lieu associé.</p>
      ) : (
        <div className="space-y-2">
          {visibles.map((le) => {
            const isPropose = (le.statut_validation || 'valide') === 'propose_client';
            return (
              <div
                key={le.id}
                className={`flex items-start justify-between rounded-lg px-3 py-2.5 gap-2 ${isPropose ? 'bg-amber-50 border border-amber-200' : 'bg-muted/40'}`}
              >
                <div className="flex-1 min-w-0">
                  <div className="flex items-center gap-2 flex-wrap">
                    <span className="text-sm font-semibold truncate">{le.lieu_nom}</span>
                    {le.type && <span className="text-xs bg-primary/10 text-primary px-2 py-0.5 rounded-full font-medium shrink-0">{le.type}</span>}
                    {isPropose && <span className="text-[10px] font-semibold px-2 py-0.5 rounded-full bg-amber-200 text-amber-800 shrink-0">Proposé par le client</span>}
                  </div>
                  {le.lieu_ville && <p className="text-xs text-muted-foreground mt-0.5">📍 {le.lieu_ville}</p>}
                  {le.lieu_lien_google_maps && (
                    <a href={le.lieu_lien_google_maps} target="_blank" rel="noopener noreferrer" className="text-xs text-primary hover:underline mt-0.5 flex items-center gap-1">
                      Google Maps <ExternalLink size={10} />
                    </a>
                  )}
                </div>
                {isPropose ? (
                  <div className="flex items-center gap-1 shrink-0">
                    <button onClick={() => validateMutation.mutate(le.id)} disabled={validateMutation.isPending} title="Valider" className="p-1.5 rounded-md hover:bg-emerald-50 text-emerald-600 hover:text-emerald-700 transition-colors">
                      <Check size={14} />
                    </button>
                    <button
                      onClick={() => {
                        setEditingId(le.id);
                        setFormData({ lieu_nom: le.lieu_nom, lieu_ville: le.lieu_ville || '', lieu_lien_google_maps: le.lieu_lien_google_maps || '', type: le.type || 'Réception' });
                        setShowAddForm(true);
                      }}
                      title="Modifier"
                      className="p-1.5 rounded-md hover:bg-blue-50 text-blue-600 hover:text-blue-700 transition-colors"
                    >
                      <Pencil size={13} />
                    </button>
                    <button
                      onClick={() => {
                        const motif = window.prompt('Motif du refus (optionnel) :', '');
                        if (motif !== null) refuseMutation.mutate({ lieu_id: le.id, motif_refus: motif });
                      }}
                      disabled={refuseMutation.isPending}
                      title="Refuser"
                      className="p-1.5 rounded-md hover:bg-red-50 text-red-500 hover:text-red-600 transition-colors"
                    >
                      <X size={14} />
                    </button>
                  </div>
                ) : (
                  <button onClick={() => deleteMutation.mutate(le.id)} disabled={deleteMutation.isPending} className="p-1.5 rounded-md hover:bg-red-50 text-red-500 hover:text-red-600 shrink-0 transition-colors">
                    <Trash2 size={13} />
                  </button>
                )}
              </div>
            );
          })}

          {refused.length > 0 && (
            <button onClick={() => setShowRefused((s) => !s)} className="text-xs text-muted-foreground hover:text-foreground mt-1 flex items-center gap-1">
              <Eye size={11} /> {showRefused ? 'Masquer les refusés' : `Voir les refusés (${refused.length})`}
            </button>
          )}
          {showRefused && refused.map((le) => (
            <div key={le.id} className="flex items-start justify-between bg-red-50 border border-red-200 rounded-lg px-3 py-2.5 gap-2 opacity-70">
              <div className="flex-1 min-w-0">
                <div className="flex items-center gap-2 flex-wrap">
                  <span className="text-sm font-semibold truncate line-through">{le.lieu_nom}</span>
                  <span className="text-[10px] font-semibold px-2 py-0.5 rounded-full bg-red-200 text-red-800 shrink-0">Refusé</span>
                </div>
                {le.motif_refus && <p className="text-xs text-red-600 mt-0.5">Motif : {le.motif_refus}</p>}
              </div>
            </div>
          ))}
        </div>
      )}

      {showAddForm && (
        <div className="bg-primary/5 border border-primary/20 rounded-lg p-4 space-y-3">
          {editingId && <p className="text-xs font-semibold text-amber-700">Modifier la proposition avant validation</p>}
          <div className="space-y-1.5">
            <Label className="text-xs">Sélectionner un lieu existant</Label>
            <select
              value=""
              onChange={(e) => {
                if (e.target.value) {
                  const lieu = lieux.find((l) => l.id === e.target.value);
                  if (lieu) {
                    setFormData({ lieu_nom: lieu.nom, lieu_ville: lieu.ville || '', lieu_lien_google_maps: lieu.lien_google_maps || '', type: 'Réception' });
                  }
                }
              }}
              className="flex h-9 w-full rounded-md border border-input bg-transparent px-3 py-1 text-sm shadow-sm focus-visible:outline-none focus-visible:ring-1 focus-visible:ring-ring"
            >
              <option value="">— Ou saisir un lieu manuel —</option>
              {lieux.map((l) => (
                <option key={l.id} value={l.id}>
                  {l.nom}{l.ville ? ` · ${l.ville}` : ''}
                </option>
              ))}
            </select>
          </div>

          <div className="space-y-1.5">
            <Label className="text-xs">Nom du lieu *</Label>
            <Input value={formData.lieu_nom} onChange={(e) => setFormData({ ...formData, lieu_nom: e.target.value })} placeholder="Salle des fêtes..." />
          </div>
          <div className="space-y-1.5">
            <Label className="text-xs">Ville</Label>
            <Input value={formData.lieu_ville} onChange={(e) => setFormData({ ...formData, lieu_ville: e.target.value })} placeholder="Paris" />
          </div>
          <div className="space-y-1.5">
            <Label className="text-xs">Lien Google Maps</Label>
            <Input value={formData.lieu_lien_google_maps} onChange={(e) => setFormData({ ...formData, lieu_lien_google_maps: e.target.value })} placeholder="https://maps.google.com/..." />
          </div>
          <div className="space-y-1.5">
            <Label className="text-xs">Type</Label>
            <Select value={formData.type} onValueChange={(v) => setFormData({ ...formData, type: v })}>
              <SelectTrigger><SelectValue /></SelectTrigger>
              <SelectContent>
                {TYPES.map((t) => (<SelectItem key={t} value={t}>{t}</SelectItem>))}
              </SelectContent>
            </Select>
          </div>

          <div className="flex gap-2 pt-1">
            <Button size="sm" onClick={() => createMutation.mutate(formData)} disabled={!formData.lieu_nom || createMutation.isPending} className="flex-1 text-xs h-8">
              {createMutation.isPending ? 'Enregistrement...' : (editingId ? 'Enregistrer' : 'Ajouter')}
            </Button>
            <Button size="sm" variant="outline" onClick={() => { setShowAddForm(false); setEditingId(null); setFormData({ lieu_nom: '', lieu_ville: '', lieu_lien_google_maps: '', type: 'Réception' }); }} className="text-xs h-8">
              Annuler
            </Button>
          </div>
        </div>
      )}

      {!showAddForm && (
        <button onClick={() => setShowAddForm(true)} className="text-xs text-primary hover:underline mt-1">+ Ajouter un lieu</button>
      )}
    </Section>
  );
}