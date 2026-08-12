import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { base44 } from '@/api/base44Client';
import { useState, useEffect } from 'react';
import { format, parseISO, differenceInDays, isSameMonth, isSameDay, startOfMonth, endOfMonth, startOfWeek, endOfWeek, addDays, isToday } from 'date-fns';
import { fr } from 'date-fns/locale';
import { CheckCircle, XCircle, Calendar, Clock, ChevronLeft, ChevronRight, MapPin } from 'lucide-react';
import FicheServiceView from '@/components/planning/FicheServiceView';
import { Button } from '@/components/ui/button';

const statusConfig = {
  'En attente': { color: 'bg-amber-100 text-amber-700', label: 'En attente de réponse' },
  'Dispo':      { color: 'bg-blue-100 text-blue-700',   label: 'Disponible ✓' },
  'Indispo':    { color: 'bg-red-100 text-red-600',     label: 'Indisponible' },
  'Confirmé':   { color: 'bg-emerald-100 text-emerald-700', label: 'Confirmé ✅' },
  'Annulé':     { color: 'bg-slate-100 text-slate-500', label: 'Annulé' },
};

export default function MonPlanning() {
  const qc = useQueryClient();
  const [user, setUser] = useState(null);
  const [currentDate, setCurrentDate] = useState(new Date());
  const [selectedDay, setSelectedDay] = useState(null);

  useEffect(() => { base44.auth.me().then(setUser); }, []);

  const { data: assignments = [], isLoading } = useQuery({
    queryKey: ['my-assignments', user?.email],
    queryFn: () => base44.entities.ServiceAssignment.filter({ extra_id: user.email }, 'created_date', 100),
    enabled: !!user,
  });

  const { data: services = [] } = useQuery({
    queryKey: ['services'],
    queryFn: () => base44.entities.Service.list('-date', 300),
  });

  const updateMutation = useMutation({
    mutationFn: async ({ assignment, statut }) => {
      await base44.entities.ServiceAssignment.update(assignment.id, { statut });
      const admins = await base44.entities.User.list();
      const adminEmails = admins.filter(u => u.role === 'admin').map(u => u.email);
      const service = services.find(s => s.id === assignment.service_id);
      const label = statut === 'Dispo' ? 'disponible ✅' : 'indisponible ❌';
      for (const adminEmail of adminEmails) {
        await base44.integrations.Core.SendEmail({
          to: adminEmail,
          subject: `${statut === 'Dispo' ? '✅' : '❌'} ${user?.full_name} — réponse service`,
          body: `Bonjour,\n\n${user?.full_name} s'est déclaré(e) ${label} pour le service du ${service?.date || ''}${service?.heure_debut ? ` (${service.heure_debut} – ${service.heure_fin})` : ''}.\n\nRendez-vous sur le planning pour confirmer ou annuler.`,
        });
      }
    },
    onSuccess: () => qc.invalidateQueries(['my-assignments']),
  });

  const getService = (serviceId) => services.find(s => s.id === serviceId);

  // Calendar grid
  const monthStart = startOfMonth(currentDate);
  const monthEnd = endOfMonth(currentDate);
  const gridStart = startOfWeek(monthStart, { weekStartsOn: 1 });
  const gridEnd = endOfWeek(monthEnd, { weekStartsOn: 1 });
  const days = [];
  let d = gridStart;
  while (d <= gridEnd) { days.push(d); d = addDays(d, 1); }

  // Map service dates from assignments
  const serviceDateMap = {};
  assignments.forEach(a => {
    const svc = getService(a.service_id);
    if (svc?.date) {
      const key = svc.date;
      if (!serviceDateMap[key]) serviceDateMap[key] = [];
      serviceDateMap[key].push({ assignment: a, service: svc });
    }
  });

  const dayLabels = ['Lun', 'Mar', 'Mer', 'Jeu', 'Ven', 'Sam', 'Dim'];

  const activeAssignments = assignments
    .filter(a => a.statut !== 'Annulé')
    .sort((a, b) => {
      const sa = getService(a.service_id);
      const sb = getService(b.service_id);
      return (sa?.date || '').localeCompare(sb?.date || '');
    });

  const pending = activeAssignments.filter(a => a.statut === 'En attente');
  const confirmed = activeAssignments.filter(a => a.statut === 'Confirmé' || a.statut === 'Dispo');

  const selectedDayItems = selectedDay
    ? Object.entries(serviceDateMap)
        .filter(([date]) => isSameDay(parseISO(date), selectedDay))
        .flatMap(([, items]) => items)
    : [];

  if (isLoading) return (
    <div className="flex items-center justify-center h-64">
      <div className="w-8 h-8 border-4 border-muted border-t-primary rounded-full animate-spin" />
    </div>
  );

  return (
    <div className="p-4 md:p-6 max-w-4xl mx-auto space-y-6">
      <div>
        <h2 className="text-2xl font-bold">Mon Planning</h2>
        <p className="text-muted-foreground text-sm mt-1">Bonjour {user?.full_name} 👋</p>
      </div>

      {/* Stats rapides */}
      <div className="grid grid-cols-3 gap-3">
        <div className="bg-amber-50 border border-amber-200 rounded-2xl p-4 text-center">
          <p className="text-2xl font-bold text-amber-600">{pending.length}</p>
          <p className="text-xs text-amber-500 mt-0.5">À confirmer</p>
        </div>
        <div className="bg-emerald-50 border border-emerald-200 rounded-2xl p-4 text-center">
          <p className="text-2xl font-bold text-emerald-600">{confirmed.length}</p>
          <p className="text-xs text-emerald-500 mt-0.5">Confirmés</p>
        </div>
        <div className="bg-card border border-border rounded-2xl p-4 text-center">
          <p className="text-2xl font-bold text-foreground">{assignments.length}</p>
          <p className="text-xs text-muted-foreground mt-0.5">Total</p>
        </div>
      </div>

      {/* À confirmer (prioritaire) */}
      {pending.length > 0 && (
        <div className="space-y-3">
          <h3 className="font-semibold text-sm text-amber-600 uppercase tracking-wide flex items-center gap-2">
            <span className="w-2 h-2 rounded-full bg-amber-500 animate-pulse inline-block" />
            {pending.length} service{pending.length > 1 ? 's' : ''} à confirmer
          </h3>
          {pending.map(assignment => (
            <AssignmentCard
              key={assignment.id}
              assignment={assignment}
              service={getService(assignment.service_id)}
              onUpdate={updateMutation}
              showActions
            />
          ))}
        </div>
      )}

      {/* Calendrier */}
      <div className="bg-card rounded-2xl border border-border shadow-sm overflow-hidden">
        {/* Nav calendrier */}
        <div className="flex items-center justify-between px-4 py-3 border-b border-border">
          <h3 className="font-semibold capitalize">{format(currentDate, 'MMMM yyyy', { locale: fr })}</h3>
          <div className="flex items-center gap-1">
            <Button size="icon" variant="ghost" className="h-7 w-7" onClick={() => setCurrentDate(d => addDays(startOfMonth(d), -1))}>
              <ChevronLeft size={14} />
            </Button>
            <Button size="sm" variant="ghost" className="h-7 text-xs px-2" onClick={() => setCurrentDate(new Date())}>
              Aujourd'hui
            </Button>
            <Button size="icon" variant="ghost" className="h-7 w-7" onClick={() => setCurrentDate(d => addDays(endOfMonth(d), 1))}>
              <ChevronRight size={14} />
            </Button>
          </div>
        </div>

        <div className="grid grid-cols-7 border-b border-border">
          {dayLabels.map(wd => (
            <div key={wd} className="py-2 text-center text-xs font-semibold text-muted-foreground uppercase">{wd}</div>
          ))}
        </div>

        <div className="grid grid-cols-7 divide-x divide-y divide-border">
          {days.map(day => {
            const key = format(day, 'yyyy-MM-dd');
            const items = serviceDateMap[key] || [];
            const inMonth = isSameMonth(day, currentDate);
            const todayDay = isToday(day);
            const isSelected = selectedDay && isSameDay(day, selectedDay);
            const hasPending = items.some(i => i.assignment.statut === 'En attente');
            const hasConfirmed = items.some(i => i.assignment.statut === 'Confirmé');

            return (
              <div
                key={day.toISOString()}
                onClick={() => items.length > 0 && inMonth && setSelectedDay(isSameDay(day, selectedDay) ? null : day)}
                className={`min-h-[70px] p-1.5 transition-colors
                  ${inMonth ? 'bg-card' : 'bg-muted/20'}
                  ${isSelected ? 'ring-2 ring-inset ring-primary/30 bg-primary/5' : ''}
                  ${items.length > 0 && inMonth ? 'cursor-pointer hover:bg-muted/30' : ''}
                `}
              >
                <span className={`text-xs font-bold w-6 h-6 flex items-center justify-center rounded-full mb-1
                  ${todayDay ? 'bg-primary text-primary-foreground' : inMonth ? 'text-foreground' : 'text-muted-foreground/40'}
                `}>
                  {format(day, 'd')}
                </span>
                {items.length > 0 && inMonth && (
                  <div className="space-y-0.5">
                    {items.slice(0, 2).map((item, i) => (
                      <div key={i} className={`rounded text-[9px] px-1 py-0.5 truncate font-medium
                        ${item.assignment.statut === 'Confirmé' ? 'bg-emerald-100 text-emerald-700' :
                          item.assignment.statut === 'En attente' ? 'bg-amber-100 text-amber-700' :
                          item.assignment.statut === 'Dispo' ? 'bg-blue-100 text-blue-700' :
                          'bg-slate-100 text-slate-500'}
                      `}>
                        {item.service.heure_debut} {item.service.poste || ''}
                      </div>
                    ))}
                    {items.length > 2 && <p className="text-[9px] text-muted-foreground">+{items.length - 2}</p>}
                  </div>
                )}
              </div>
            );
          })}
        </div>
      </div>

      {/* Détail jour sélectionné */}
      {selectedDay && selectedDayItems.length > 0 && (
        <div className="space-y-3">
          <h3 className="font-semibold capitalize">{format(selectedDay, 'EEEE d MMMM yyyy', { locale: fr })}</h3>
          {selectedDayItems.map(({ assignment, service }) => (
            <AssignmentCard
              key={assignment.id}
              assignment={assignment}
              service={service}
              onUpdate={updateMutation}
              showActions={assignment.statut === 'En attente'}
            />
          ))}
        </div>
      )}

      {/* Liste complète */}
      {confirmed.length > 0 && (
        <div className="space-y-3">
          <h3 className="font-semibold text-sm text-muted-foreground uppercase tracking-wide">Mes prochains services</h3>
          {confirmed.map(assignment => (
            <AssignmentCard
              key={assignment.id}
              assignment={assignment}
              service={getService(assignment.service_id)}
              onUpdate={updateMutation}
            />
          ))}
        </div>
      )}

      {activeAssignments.length === 0 && (
        <div className="text-center py-16 text-muted-foreground">
          <Calendar size={40} className="mx-auto mb-3 opacity-30" />
          <p className="font-medium">Aucun service à venir</p>
        </div>
      )}
    </div>
  );
}

function AssignmentCard({ assignment, service, onUpdate, showActions }) {
  const cfg = statusConfig[assignment.statut] || statusConfig['En attente'];
  const days = service?.date ? differenceInDays(new Date(service.date), new Date()) : null;

  return (
    <div className="bg-card rounded-2xl border border-border shadow-sm p-4 space-y-3">
      <div className="flex items-start justify-between">
        <div className="space-y-1">
          <p className="font-semibold">
            {service?.date ? format(parseISO(service.date), 'EEEE d MMMM yyyy', { locale: fr }) : '—'}
          </p>
          <div className="flex flex-wrap items-center gap-2 text-sm text-muted-foreground">
            {service?.heure_debut && (
              <span className="flex items-center gap-1"><Clock size={12} />{service.heure_debut} – {service.heure_fin}</span>
            )}
            {service?.poste && <span className="text-foreground font-medium">{service.poste}</span>}
            {service?.lieu && <span className="flex items-center gap-1"><MapPin size={12} />{service.lieu}</span>}
          </div>
        </div>
        <div className="flex flex-col items-end gap-1">
          <span className={`text-xs px-2.5 py-1 rounded-full font-medium ${cfg.color}`}>{cfg.label}</span>
          {days !== null && days >= 0 && !showActions && (
            <span className="text-xs text-muted-foreground">J−{days}</span>
          )}
        </div>
      </div>

      {service?.notes && (
        <p className="text-xs text-muted-foreground border-t border-border pt-2">{service.notes}</p>
      )}

      <FicheServiceView serviceId={assignment.service_id} service={service} />

      {showActions && (
        <div className="flex gap-2 pt-1">
          <Button
            size="sm" variant="outline"
            className="flex-1 gap-2 border-emerald-300 text-emerald-700 hover:bg-emerald-50"
            onClick={() => onUpdate.mutate({ assignment, statut: 'Dispo' })}
            disabled={onUpdate.isPending}
          >
            <CheckCircle size={14} /> Je suis disponible
          </Button>
          <Button
            size="sm" variant="outline"
            className="flex-1 gap-2 border-red-300 text-red-600 hover:bg-red-50"
            onClick={() => onUpdate.mutate({ assignment, statut: 'Indispo' })}
            disabled={onUpdate.isPending}
          >
            <XCircle size={14} /> Indisponible
          </Button>
        </div>
      )}
    </div>
  );
}