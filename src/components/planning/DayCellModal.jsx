import { useState } from 'react';
import { useQueryClient, useQuery } from '@tanstack/react-query';
import { base44 } from '@/api/base44Client';
import { X, CheckCircle, XCircle, Pencil, AlertTriangle } from 'lucide-react';
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

export default function DayCellModal({ extra, date, shifts, services = [], onClose }) {
  const qc = useQueryClient();
  const [notes, setNotes] = useState('');
  // { [assignmentId]: bool } — mode "modifier" actif pour un assignment confirmé
  const [editMode, setEditMode] = useState({});
  const [pendingActions, setPendingActions] = useState({});

  const dateLabel = format(parseISO(date), 'EEEE d MMMM yyyy', { locale: fr });

  const { data: allAssignments = [] } = useQuery({
    queryKey: ['assignments'],
    queryFn: () => base44.entities.ServiceAssignment.list('-created_date', 500),
  });

  const dayServiceIds = new Set(
    services.filter(s => s.date && isSameDay(parseISO(s.date), parseISO(date))).map(s => s.id)
  );
  const assignments = allAssignments.filter(a =>
    dayServiceIds.has(a.service_id) &&
    (a.extra_id === extra.email || a.extra_id === extra.id || a.extra_email === extra.email)
  );

  const handleAction = async (assignment, statut) => {
    setPendingActions(prev => ({ ...prev, [assignment.id]: statut }));
    try {
      const wasConfirmed = assignment.statut === 'Confirmé';
      await base44.entities.ServiceAssignment.update(assignment.id, { statut });

      // Si l'extra était confirmé et passe à Indispo → notification admin urgence
      if (wasConfirmed && statut === 'Indispo') {
        const service = services.find(s => s.id === assignment.service_id);
        const evenementNom = service?.evenement_nom || '';
        // Notifier les admins
        const admins = await base44.entities.User?.list?.() || [];
        for (const admin of admins.filter(u => u.role === 'admin')) {
          await base44.entities.Notification.create({
            titre: `⚠️ ${extra.nom} est indisponible`,
            message: `${extra.nom} s'est déclaré(e) indisponible${evenementNom ? ` pour ${evenementNom}` : ''}. Le poste ${service?.poste || ''} est à pourvoir en urgence.`,
            type: 'service',
            lu: false,
            user_email: admin.email,
            lien: '/PlanningExtras',
          });
        }
      }

      // Email à l'extra si Confirmé ou Annulé
      if (statut === 'Confirmé' || statut === 'Annulé') {
        const emailExtra = extra.email || assignment.extra_email;
        if (emailExtra) {
          const service = services.find(s => s.id === assignment.service_id);
          const dateStr = service?.date ? format(parseISO(service.date), 'EEEE d MMMM yyyy', { locale: fr }) : date;
          const isConfirmed = statut === 'Confirmé';
          try {
            await base44.integrations.Core.SendEmail({
              to: emailExtra,
              subject: isConfirmed ? '✅ Service confirmé !' : '❌ Service annulé',
              body: `Bonjour ${extra.nom},\n\nVotre service du ${dateStr}${service?.heure_debut ? ` (${service.heure_debut} – ${service.heure_fin})` : ''}${service?.lieu ? ` · ${service.lieu}` : ''} a été ${isConfirmed ? '✅ CONFIRMÉ' : '❌ ANNULÉ'} par l'organisateur.\n\n${isConfirmed ? "Merci d'être présent(e) à l'heure indiquée." : 'Nous vous informerons si de nouvelles opportunités se présentent.'}\n\nCordialement,\nL'équipe`,
            });
          } catch (_) {}
        }
      }

      qc.invalidateQueries(['assignments']);
      setEditMode(prev => { const n = { ...prev }; delete n[assignment.id]; return n; });
    } finally {
      setPendingActions(prev => { const n = { ...prev }; delete n[assignment.id]; return n; });
    }
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/40 backdrop-blur-sm p-4">
      <div className="bg-card rounded-2xl border border-border shadow-xl w-full max-w-sm p-5 space-y-4">
        <div className="flex items-center justify-between">
          <div>
            <p className="font-semibold text-base">{extra.nom}</p>
            <p className="text-xs text-muted-foreground capitalize">{dateLabel}</p>
          </div>
          <button onClick={onClose} className="p-1.5 rounded-lg hover:bg-muted text-muted-foreground"><X size={15} /></button>
        </div>

        {assignments.length > 0 && (
          <div className="space-y-2">
            <p className="text-xs font-semibold text-muted-foreground uppercase tracking-wide">Services assignés</p>
            {assignments.map(a => {
              const service = services.find(s => s.id === a.service_id);
              const evNom = service?.evenement_nom;
              const currentStatut = a.statut;
              const isEditing = editMode[a.id];
              const canAct = currentStatut !== 'Annulé';

              return (
                <div key={a.id} className="bg-muted/30 border border-border rounded-xl px-3 py-2.5 space-y-2 text-xs">
                  <div className="flex items-center justify-between">
                    <div>
                      {evNom && <div className="text-[10px] text-primary font-medium mb-0.5">📋 {evNom}</div>}
                      {service?.poste && <span className="font-semibold">{service.poste}</span>}
                      {service?.heure_debut && <span className="text-muted-foreground ml-2">{service.heure_debut}–{service.heure_fin}</span>}
                      {service?.lieu && <span className="text-muted-foreground ml-2">· {service.lieu}</span>}
                    </div>
                    <div className="flex items-center gap-1.5">
                      <span className={`px-2 py-0.5 rounded-full font-medium text-[10px] ${assignmentStatusColors[currentStatut] || 'bg-muted text-muted-foreground'}`}>
                        {currentStatut}
                      </span>
                      {/* Bouton Modifier — toujours disponible sauf si Annulé */}
                      {canAct && (
                        <button
                          onClick={() => setEditMode(prev => ({ ...prev, [a.id]: !prev[a.id] }))}
                          className="p-1 rounded hover:bg-muted text-muted-foreground hover:text-foreground transition-colors"
                          title="Modifier"
                        >
                          <Pencil size={11} />
                        </button>
                      )}
                    </div>
                  </div>

                  {/* Alerte Indispo */}
                  {currentStatut === 'Indispo' && (
                    <div className="flex items-center gap-1.5 text-red-600 bg-red-50 rounded-lg px-2 py-1.5">
                      <AlertTriangle size={11} /> L'extra s'est déclaré indisponible — poste à pourvoir
                    </div>
                  )}

                  {/* Actions : affiché si statuts actifs OU si mode "Modifier" activé */}
                  {(isEditing || ['Dispo', 'Indispo', 'En attente'].includes(currentStatut)) && canAct && (
                    <div className="flex gap-2 pt-0.5">
                      <button
                        onClick={() => handleAction(a, 'Confirmé')}
                        disabled={!!pendingActions[a.id] || (currentStatut !== 'Dispo' && !isEditing)}
                        title={currentStatut !== 'Dispo' && !isEditing ? "L'extra doit confirmer sa disponibilité" : ''}
                        className={`flex-1 flex items-center justify-center gap-1.5 py-1.5 rounded-lg border font-medium transition-colors
                          ${currentStatut !== 'Dispo' && !isEditing
                            ? 'bg-muted border-border text-muted-foreground opacity-50 cursor-not-allowed'
                            : 'bg-emerald-50 border-emerald-300 text-emerald-700 hover:bg-emerald-100'}`}
                      >
                        <CheckCircle size={12} /> {pendingActions[a.id] === 'Confirmé' ? '...' : 'Confirmer'}
                      </button>
                      <button
                        onClick={() => handleAction(a, 'Annulé')}
                        disabled={!!pendingActions[a.id]}
                        className="flex-1 flex items-center justify-center gap-1.5 py-1.5 rounded-lg border font-medium transition-colors bg-red-500 border-red-600 text-white hover:bg-red-600"
                      >
                        <XCircle size={12} /> {pendingActions[a.id] === 'Annulé' ? '...' : 'Annuler'}
                      </button>
                    </div>
                  )}

                  {currentStatut === 'Annulé' && (
                    <div className="flex items-center gap-1.5 text-xs font-medium text-white bg-red-500 rounded-lg px-3 py-1.5 justify-center">
                      <XCircle size={12} /> Service annulé
                    </div>
                  )}
                  {currentStatut === 'Confirmé' && !isEditing && (
                    <div className="flex items-center gap-1.5 text-xs font-medium text-white bg-emerald-500 rounded-lg px-3 py-1.5 justify-center">
                      <CheckCircle size={12} /> Service confirmé — cliquez ✏️ pour modifier
                    </div>
                  )}
                </div>
              );
            })}
          </div>
        )}

        <input
          value={notes}
          onChange={e => setNotes(e.target.value)}
          placeholder="Notes (optionnel)..."
          className="flex h-8 w-full rounded-md border border-input bg-transparent px-3 py-1 text-sm placeholder:text-muted-foreground focus-visible:outline-none focus-visible:ring-1 focus-visible:ring-ring"
        />

        <div className="flex justify-end pt-1">
          <Button variant="outline" size="sm" onClick={onClose}>Fermer</Button>
        </div>
      </div>
    </div>
  );
}