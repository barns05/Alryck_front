import { useState } from 'react';
import { useQuery, useQueryClient } from '@tanstack/react-query';
import { base44 } from '@/api/base44Client';
import { X, CheckCircle, XCircle } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { format, parseISO, isSameDay } from 'date-fns';
import { fr } from 'date-fns/locale';

const assignmentStatusColors = {
  'En attente': 'bg-amber-100 text-amber-700',
  'Dispo':      'bg-blue-100 text-blue-700',
  'Indispo':    'bg-red-100 text-red-600',
  'Confirmé':   'bg-emerald-100 text-emerald-700',
  'Annulé':     'bg-slate-100 text-slate-500',
};

export default function DayOverviewModal({ date, services = [], extras = [], onClose }) {
  const qc = useQueryClient();
  const [pendingActions, setPendingActions] = useState({});

  const dateLabel = format(parseISO(date), 'EEEE d MMMM yyyy', { locale: fr });

  // Services du jour
  const dayServices = services.filter(s => s.date && isSameDay(parseISO(s.date), parseISO(date)));

  // Charger tous les assignments en live
  const { data: allAssignments = [] } = useQuery({
    queryKey: ['assignments'],
    queryFn: () => base44.entities.ServiceAssignment.list('-created_date', 500),
  });

  const dayServiceIds = new Set(dayServices.map(s => s.id));

  // Tous les assignments du jour, groupés par service
  const assignmentsByService = dayServices.map(service => {
    const serviceAssignments = allAssignments.filter(a => a.service_id === service.id);
    return { service, assignments: serviceAssignments };
  }).filter(g => g.assignments.length > 0);

  const handleConfirm = async (assignment, statut) => {
    setPendingActions(prev => ({ ...prev, [assignment.id]: statut }));
    try {
      await base44.entities.ServiceAssignment.update(assignment.id, { statut });
      // Email à l'extra
      const emailExtra = assignment.extra_email;
      if (emailExtra) {
        const service = dayServices.find(s => s.id === assignment.service_id);
        const isConfirmed = statut === 'Confirmé';
        try {
          await base44.integrations.Core.SendEmail({
            to: emailExtra,
            subject: isConfirmed ? '✅ Service confirmé !' : '❌ Service annulé',
            body: `Bonjour ${assignment.extra_nom},\n\nVotre service du ${dateLabel}${service?.heure_debut ? ` (${service.heure_debut} – ${service.heure_fin})` : ''}${service?.lieu ? ` · ${service.lieu}` : ''} a été ${isConfirmed ? '✅ CONFIRMÉ' : '❌ ANNULÉ'} par l'organisateur.\n\nCordialement,\nL'équipe`,
          });
        } catch (_) {}
      }
      qc.invalidateQueries(['assignments']);
    } finally {
      setPendingActions(prev => { const n = { ...prev }; delete n[assignment.id]; return n; });
    }
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/40 backdrop-blur-sm p-4">
      <div className="bg-card rounded-2xl border border-border shadow-xl w-full max-w-md p-5 space-y-4 max-h-[85vh] overflow-y-auto">
        {/* Header */}
        <div className="flex items-center justify-between">
          <div>
            <p className="font-semibold text-base capitalize">{dateLabel}</p>
            <p className="text-xs text-muted-foreground">{dayServices.length} service(s) ce jour</p>
          </div>
          <button onClick={onClose} className="p-1.5 rounded-lg hover:bg-muted text-muted-foreground"><X size={15} /></button>
        </div>

        {assignmentsByService.length === 0 ? (
          <p className="text-sm text-muted-foreground text-center py-6">Aucun extra assigné ce jour.</p>
        ) : (
          <div className="space-y-4">
            {assignmentsByService.map(({ service, assignments }) => (
              <div key={service.id} className="space-y-2">
                {/* Entête du service */}
                <div className="bg-muted/40 rounded-xl px-3 py-2 text-xs font-semibold text-foreground flex items-center gap-2">
                  {service.poste && <span>{service.poste}</span>}
                  {service.heure_debut && <span className="text-muted-foreground font-normal">{service.heure_debut}–{service.heure_fin}</span>}
                  {service.lieu && <span className="text-muted-foreground font-normal">· {service.lieu}</span>}
                </div>

                {/* Extras assignés à ce service */}
                {assignments.map(a => {
                  const currentStatut = a.statut;
                  const isPending = !!pendingActions[a.id];
                  return (
                    <div key={a.id} className="border border-border rounded-xl px-3 py-2.5 space-y-2 text-xs ml-2">
                      <div className="flex items-center justify-between">
                        <span className="font-medium text-sm">{a.extra_nom}</span>
                        <span className={`px-2 py-0.5 rounded-full font-medium text-[10px] ${assignmentStatusColors[currentStatut] || 'bg-muted text-muted-foreground'}`}>
                          {currentStatut}
                        </span>
                      </div>
                      {a.extra_email && <p className="text-muted-foreground">{a.extra_email}</p>}
                      {/* Boutons indépendants par assignment */}
                      <div className="flex gap-2 pt-0.5">
                        <button
                          onClick={() => handleConfirm(a, 'Confirmé')}
                          disabled={isPending || currentStatut === 'Confirmé'}
                          className={`flex-1 flex items-center justify-center gap-1.5 py-1.5 rounded-lg border font-medium transition-colors
                            ${currentStatut === 'Confirmé'
                              ? 'bg-emerald-100 border-emerald-300 text-emerald-700 opacity-60 cursor-not-allowed'
                              : 'bg-emerald-50 border-emerald-300 text-emerald-700 hover:bg-emerald-100'}`}
                        >
                          <CheckCircle size={12} /> {pendingActions[a.id] === 'Confirmé' ? '...' : 'Confirmer'}
                        </button>
                        <button
                          onClick={() => handleConfirm(a, 'Annulé')}
                          disabled={isPending || currentStatut === 'Annulé'}
                          className={`flex-1 flex items-center justify-center gap-1.5 py-1.5 rounded-lg border font-medium transition-colors
                            ${currentStatut === 'Annulé'
                              ? 'bg-red-50 border-red-300 text-red-400 opacity-60 cursor-not-allowed'
                              : 'bg-red-50 border-red-300 text-red-600 hover:bg-red-100'}`}
                        >
                          <XCircle size={12} /> {pendingActions[a.id] === 'Annulé' ? '...' : 'Annuler'}
                        </button>
                      </div>
                    </div>
                  );
                })}
              </div>
            ))}
          </div>
        )}

        <div className="flex justify-end pt-1">
          <Button variant="outline" size="sm" onClick={onClose}>Fermer</Button>
        </div>
      </div>
    </div>
  );
}