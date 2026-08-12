import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { base44 } from '@/api/base44Client';
import { X, CheckCircle, XCircle, Clock, MapPin, PartyPopper, Plus } from 'lucide-react';
import { format, parseISO, isPast } from 'date-fns';
import { fr } from 'date-fns/locale';
import { Button } from '@/components/ui/button';
import { useState } from 'react';
import ServicePrestataireModal from '@/components/planning/ServicePrestataireModal';

const statutColors = {
  'En attente': 'bg-amber-100 text-amber-700 border-amber-200',
  'Confirmé':   'bg-emerald-100 text-emerald-700 border-emerald-200',
  'Indispo':    'bg-red-100 text-red-600 border-red-200',
  'Annulé':     'bg-slate-100 text-slate-500 border-slate-200',
  'Terminé':    'bg-slate-100 text-slate-500 border-slate-200',
};

export default function PrestataireDisposModal({ prestataire, onClose }) {
  const qc = useQueryClient();
  const [showNewDispo, setShowNewDispo] = useState(false);

  const { data: dispos = [], isLoading } = useQuery({
    queryKey: ['dispos-prestataire', prestataire.id],
    queryFn: () => base44.entities.DispoPrestataire.filter({ prestataire_id: prestataire.id }, '-date', 100),
  });

  const updateMutation = useMutation({
    mutationFn: ({ id, statut }) => base44.entities.DispoPrestataire.update(id, { statut }),
    onSuccess: () => qc.invalidateQueries(['dispos-prestataire', prestataire.id]),
  });

  const deleteMutation = useMutation({
    mutationFn: (id) => base44.entities.DispoPrestataire.delete(id),
    onSuccess: () => qc.invalidateQueries(['dispos-prestataire', prestataire.id]),
  });

  const upcoming = dispos.filter(d => d.date && !isPast(parseISO(d.date)));
  const past = dispos.filter(d => d.date && isPast(parseISO(d.date)));

  return (
    <>
      <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/40 backdrop-blur-sm p-4">
        <div className="bg-card rounded-2xl border border-border shadow-xl w-full max-w-lg flex flex-col max-h-[85vh]">
          {/* Header */}
          <div className="flex items-center justify-between px-5 py-4 border-b border-border">
            <div>
              <h3 className="font-semibold text-lg">Disponibilités — {prestataire.nom}</h3>
              <p className="text-xs text-muted-foreground mt-0.5">{prestataire.domaine || ''}</p>
            </div>
            <div className="flex items-center gap-2">
              <Button size="sm" onClick={() => setShowNewDispo(true)} className="gap-1.5 bg-purple-600 hover:bg-purple-700 text-white text-xs h-8">
                <Plus size={13} /> Nouvelle demande
              </Button>
              <button onClick={onClose} className="p-1.5 rounded-lg hover:bg-muted text-muted-foreground">
                <X size={16} />
              </button>
            </div>
          </div>

          {/* Content */}
          <div className="flex-1 overflow-y-auto p-4 space-y-5">
            {isLoading && (
              <div className="flex justify-center py-10">
                <div className="w-7 h-7 border-4 border-muted border-t-purple-500 rounded-full animate-spin" />
              </div>
            )}

            {!isLoading && dispos.length === 0 && (
              <div className="text-center py-12 text-muted-foreground">
                <Clock size={36} className="mx-auto mb-3 opacity-30" />
                <p className="font-medium text-sm">Aucune disponibilité pour {prestataire.nom}</p>
                <p className="text-xs mt-1">Cliquez sur "Nouvelle demande" pour en créer une.</p>
              </div>
            )}

            {upcoming.length > 0 && (
              <div className="space-y-2">
                <p className="text-xs font-semibold text-muted-foreground uppercase tracking-wide">À venir ({upcoming.length})</p>
                {upcoming.map(d => (
                  <DispoItem key={d.id} dispo={d} onUpdate={updateMutation} onDelete={deleteMutation} />
                ))}
              </div>
            )}

            {past.length > 0 && (
              <div className="space-y-2">
                <p className="text-xs font-semibold text-muted-foreground uppercase tracking-wide">Passées ({past.length})</p>
                {past.map(d => (
                  <DispoItem key={d.id} dispo={d} onUpdate={updateMutation} onDelete={deleteMutation} past />
                ))}
              </div>
            )}
          </div>
        </div>
      </div>

      {showNewDispo && (
        <ServicePrestataireModal
          onClose={() => {
            setShowNewDispo(false);
            qc.invalidateQueries(['dispos-prestataire', prestataire.id]);
          }}
          defaultPrestataire={prestataire}
        />
      )}
    </>
  );
}

function DispoItem({ dispo, onUpdate, onDelete, past }) {
  return (
    <div className={`bg-card border border-border rounded-xl p-3 space-y-2 ${past ? 'opacity-60' : ''}`}>
      <div className="flex items-start justify-between gap-2">
        <div className="flex-1 min-w-0">
          <p className="font-semibold text-sm capitalize">
            {dispo.date ? format(parseISO(dispo.date), 'EEEE d MMMM yyyy', { locale: fr }) : '—'}
          </p>
          <div className="flex flex-wrap gap-2 mt-1 text-xs text-muted-foreground">
            {(dispo.heure_debut || dispo.heure_fin) && (
              <span className="flex items-center gap-1"><Clock size={10} />{dispo.heure_debut} – {dispo.heure_fin}</span>
            )}
            {dispo.lieu && <span className="flex items-center gap-1"><MapPin size={10} />{dispo.lieu}</span>}
            {dispo.evenement_nom && <span className="flex items-center gap-1"><PartyPopper size={10} />{dispo.evenement_nom}</span>}
          </div>
          {dispo.notes && (
            <p className="text-xs text-muted-foreground italic mt-1">{dispo.notes}</p>
          )}
        </div>
        <span className={`text-[11px] px-2.5 py-1 rounded-full border font-medium shrink-0 ${statutColors[dispo.statut] || 'bg-slate-100 text-slate-600'}`}>
          {dispo.statut}
        </span>
      </div>

      {!past && dispo.statut !== 'Annulé' && dispo.statut !== 'Terminé' && (
        <div className="flex gap-2 pt-1 border-t border-border">
          <button
            disabled={dispo.statut === 'Confirmé' || onUpdate.isPending}
            onClick={() => onUpdate.mutate({ id: dispo.id, statut: 'Confirmé' })}
            className={`flex-1 flex items-center justify-center gap-1.5 text-xs py-1.5 rounded-lg font-medium transition-colors
              ${dispo.statut === 'Confirmé'
                ? 'bg-emerald-100 text-emerald-700 cursor-default'
                : 'bg-emerald-50 text-emerald-700 hover:bg-emerald-100 border border-emerald-200'}`}
          >
            <CheckCircle size={12} />
            {dispo.statut === 'Confirmé' ? 'Confirmé ✓' : 'Confirmer'}
          </button>
          <button
            disabled={dispo.statut === 'Indispo' || onUpdate.isPending}
            onClick={() => onUpdate.mutate({ id: dispo.id, statut: 'Indispo' })}
            className={`flex-1 flex items-center justify-center gap-1.5 text-xs py-1.5 rounded-lg font-medium transition-colors
              ${dispo.statut === 'Indispo'
                ? 'bg-red-100 text-red-600 cursor-default'
                : 'bg-red-50 text-red-600 hover:bg-red-100 border border-red-200'}`}
          >
            <XCircle size={12} />
            {dispo.statut === 'Indispo' ? 'Indispo ✓' : 'Indispo'}
          </button>
          <button
            disabled={onUpdate.isPending}
            onClick={() => onUpdate.mutate({ id: dispo.id, statut: 'Annulé' })}
            className="px-2 py-1.5 text-xs rounded-lg text-muted-foreground hover:bg-muted hover:text-foreground transition-colors border border-border"
          >
            Annuler
          </button>
        </div>
      )}
    </div>
  );
}