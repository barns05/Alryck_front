import { useState } from 'react';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { base44 } from '@/api/base44Client';
import { Plus, ChevronLeft, ChevronRight, Pencil, Trash2, Calendar, LayoutGrid } from 'lucide-react';
import { Button } from '@/components/ui/button';
import {
  format, startOfMonth, endOfMonth, startOfWeek, endOfWeek,
  addDays, addMonths, subMonths, addWeeks, subWeeks,
  parseISO, isSameDay, isSameMonth, isToday, isWithinInterval
} from 'date-fns';
import { fr } from 'date-fns/locale';
import CollaborateurEntreeModal from './CollaborateurEntreeModal';

const TYPE_COLORS = {
  'Congé':          'bg-sky-100 text-sky-700 border-sky-200',
  'Repos':          'bg-slate-100 text-slate-600 border-slate-200',
  'Indisponibilité':'bg-red-100 text-red-600 border-red-200',
  'Formation':      'bg-violet-100 text-violet-700 border-violet-200',
  'Tâche interne':  'bg-amber-100 text-amber-700 border-amber-200',
  'Autre':          'bg-gray-100 text-gray-600 border-gray-200',
};

const STATUT_COLORS = {
  'Planifié': 'bg-blue-100 text-blue-700',
  'En cours': 'bg-amber-100 text-amber-700',
  'Terminé':  'bg-emerald-100 text-emerald-700',
  'Annulé':   'bg-slate-100 text-slate-500 line-through',
};

// Vérifie si une entrée couvre un jour donné (mono ou multi-jours)
function entreeCoversDay(entree, day) {
  const start = parseISO(entree.date);
  const end = entree.date_fin ? parseISO(entree.date_fin) : start;
  return isWithinInterval(day, { start, end });
}

export default function CollaborateurPlanningTab({ collaborateur }) {
  const qc = useQueryClient();
  const [view, setView] = useState('month');
  const [currentDate, setCurrentDate] = useState(new Date());
  const [entreeModal, setEntreeModal] = useState(null); // null | 'new' | entree object

  const { data: entrees = [] } = useQuery({
    queryKey: ['collab-entrees', collaborateur.id],
    queryFn: () => base44.entities.CollaborateurEntree.filter({ collaborateur_id: collaborateur.id }),
  });

  const { data: evenements = [] } = useQuery({
    queryKey: ['evenements'],
    queryFn: () => base44.entities.Evenement.list('-date', 200),
  });

  const deleteMutation = useMutation({
    mutationFn: (id) => base44.entities.CollaborateurEntree.delete(id),
    onSuccess: () => qc.invalidateQueries(['collab-entrees', collaborateur.id]),
  });

  // Événements affectés via placement_auto ou manuellement (filtré sur type_evenement)
  const eventsForCollab = evenements.filter(ev =>
    collaborateur.placement_auto &&
    collaborateur.types_evenements_auto?.includes(ev.type_evenement) &&
    ev.statut !== 'Annulé'
  );

  // Grilles calendrier
  const monthStart = startOfMonth(currentDate);
  const monthEnd = endOfMonth(currentDate);
  const gridStart = startOfWeek(monthStart, { weekStartsOn: 1 });
  const gridEnd = endOfWeek(monthEnd, { weekStartsOn: 1 });
  const monthDays = [];
  let d = gridStart;
  while (d <= gridEnd) { monthDays.push(new Date(d)); d = addDays(d, 1); }

  const weekStart = startOfWeek(currentDate, { weekStartsOn: 1 });
  const weekDays = Array.from({ length: 7 }, (_, i) => addDays(weekStart, i));

  const entreesForDay = (day) => entrees.filter(e => entreeCoversDay(e, day));
  const eventsForDay = (day) => eventsForCollab.filter(ev => ev.date && isSameDay(parseISO(ev.date), day));

  const goBack = () => view === 'month' ? setCurrentDate(d => subMonths(d, 1)) : setCurrentDate(d => subWeeks(d, 1));
  const goForward = () => view === 'month' ? setCurrentDate(d => addMonths(d, 1)) : setCurrentDate(d => addWeeks(d, 1));

  const headerLabel = view === 'month'
    ? format(currentDate, 'MMMM yyyy', { locale: fr })
    : `${format(weekStart, 'd MMM', { locale: fr })} – ${format(addDays(weekStart, 6), 'd MMM yyyy', { locale: fr })}`;

  // Liste pour vue semaine — toutes les entrées + événements de la semaine
  const allWeekItems = weekDays.flatMap(day => [
    ...eventsForDay(day).map(ev => ({ day, type: 'event', data: ev })),
    ...entreesForDay(day).map(e => ({ day, type: 'entree', data: e })),
  ]).sort((a, b) => a.day - b.day);

  return (
    <div className="space-y-4">
      {/* Toolbar */}
      <div className="flex items-center justify-between flex-wrap gap-2">
        <div className="flex items-center gap-2">
          <div className="flex bg-muted rounded-xl p-1 gap-1">
            <button onClick={() => setView('month')} className={`flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-xs font-medium transition-colors ${view === 'month' ? 'bg-card shadow text-foreground' : 'text-muted-foreground hover:text-foreground'}`}>
              <LayoutGrid size={12} /> Mois
            </button>
            <button onClick={() => setView('week')} className={`flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-xs font-medium transition-colors ${view === 'week' ? 'bg-card shadow text-foreground' : 'text-muted-foreground hover:text-foreground'}`}>
              <Calendar size={12} /> Semaine
            </button>
          </div>
          <button onClick={goBack} className="p-1.5 rounded-lg border border-border hover:bg-muted"><ChevronLeft size={14} /></button>
          <span className="text-sm font-medium capitalize min-w-[140px] text-center">{headerLabel}</span>
          <button onClick={goForward} className="p-1.5 rounded-lg border border-border hover:bg-muted"><ChevronRight size={14} /></button>
          <button onClick={() => setCurrentDate(new Date())} className="text-xs px-2.5 py-1.5 rounded-lg border border-border hover:bg-muted">Aujourd'hui</button>
        </div>
        <Button size="sm" className="gap-1.5" onClick={() => setEntreeModal('new')}>
          <Plus size={14} /> Ajouter une entrée
        </Button>
      </div>

      {/* Vue MOIS */}
      {view === 'month' && (
        <div className="bg-card rounded-xl border border-border overflow-hidden">
          <div className="grid grid-cols-7 border-b border-border">
            {['Lun', 'Mar', 'Mer', 'Jeu', 'Ven', 'Sam', 'Dim'].map(l => (
              <div key={l} className="py-2 text-center text-xs font-semibold text-muted-foreground uppercase tracking-wide">{l}</div>
            ))}
          </div>
          <div className="grid grid-cols-7 divide-x divide-y divide-border">
            {monthDays.map(day => {
              const inMonth = isSameMonth(day, currentDate);
              const todayDay = isToday(day);
              const dayEntrees = inMonth ? entreesForDay(day) : [];
              const dayEvents = inMonth ? eventsForDay(day) : [];
              return (
                <div key={day.toISOString()} className={`min-h-[80px] p-1.5 ${inMonth ? 'bg-card' : 'bg-muted/20'}`}>
                  <span className={`text-xs font-bold w-6 h-6 flex items-center justify-center rounded-full mb-1
                    ${todayDay ? 'bg-primary text-primary-foreground' : inMonth ? 'text-foreground' : 'text-muted-foreground/40'}`}>
                    {format(day, 'd')}
                  </span>
                  <div className="space-y-0.5">
                    {dayEvents.slice(0, 1).map(ev => (
                      <div key={ev.id} className="rounded border px-1 py-0.5 text-[9px] bg-orange-100 text-orange-700 border-orange-200 truncate font-semibold">
                        🎉 {ev.nom}
                      </div>
                    ))}
                    {dayEntrees.slice(0, 2).map(e => (
                      <div key={e.id} className={`rounded border px-1 py-0.5 text-[9px] truncate ${TYPE_COLORS[e.type] || TYPE_COLORS['Autre']}`}>
                        {e.titre || e.type}
                      </div>
                    ))}
                    {(dayEvents.length + dayEntrees.length) > 3 && (
                      <p className="text-[9px] text-muted-foreground px-0.5">+{dayEvents.length + dayEntrees.length - 3}</p>
                    )}
                  </div>
                </div>
              );
            })}
          </div>
        </div>
      )}

      {/* Vue SEMAINE — liste */}
      {view === 'week' && (
        <div className="space-y-3">
          {weekDays.map(day => {
            const dayEntrees = entreesForDay(day);
            const dayEvents = eventsForDay(day);
            const todayDay = isToday(day);
            if (dayEntrees.length === 0 && dayEvents.length === 0) {
              return (
                <div key={day.toISOString()} className="flex items-center gap-3 py-2 px-3 rounded-xl bg-muted/30">
                  <div className={`text-center min-w-[48px] shrink-0`}>
                    <p className="text-[10px] text-muted-foreground uppercase">{format(day, 'EEE', { locale: fr })}</p>
                    <p className={`text-lg font-bold leading-none ${todayDay ? 'text-primary' : 'text-foreground'}`}>{format(day, 'd')}</p>
                  </div>
                  <p className="text-xs text-muted-foreground italic">Rien de prévu</p>
                </div>
              );
            }
            return (
              <div key={day.toISOString()} className={`rounded-xl border ${todayDay ? 'border-primary/30 bg-primary/5' : 'border-border bg-card'} p-3 space-y-2`}>
                <div className="flex items-center gap-2">
                  <div className="text-center min-w-[48px] shrink-0">
                    <p className="text-[10px] text-muted-foreground uppercase">{format(day, 'EEE', { locale: fr })}</p>
                    <p className={`text-lg font-bold leading-none ${todayDay ? 'text-primary' : 'text-foreground'}`}>{format(day, 'd')}</p>
                  </div>
                  <div className="flex-1 space-y-1.5">
                    {dayEvents.map(ev => (
                      <div key={ev.id} className="flex items-center gap-2 bg-orange-50 border border-orange-200 rounded-lg px-3 py-1.5">
                        <span className="text-sm">🎉</span>
                        <div>
                          <p className="text-xs font-semibold text-orange-800">{ev.nom}</p>
                          <p className="text-[10px] text-orange-600">{ev.type_evenement}{ev.heure_debut ? ` · ${ev.heure_debut}` : ''}</p>
                        </div>
                      </div>
                    ))}
                    {dayEntrees.map(e => (
                      <div key={e.id} className={`flex items-center justify-between gap-2 rounded-lg px-3 py-1.5 border ${TYPE_COLORS[e.type] || TYPE_COLORS['Autre']}`}>
                        <div className="flex-1 min-w-0">
                          <p className="text-xs font-semibold">{e.titre || e.type}</p>
                          <div className="flex items-center gap-2 mt-0.5 flex-wrap">
                            <span className="text-[10px] opacity-70">{e.type}</span>
                            {e.heure_debut && <span className="text-[10px] opacity-70">{e.heure_debut}{e.heure_fin ? `–${e.heure_fin}` : ''}</span>}
                            <span className={`text-[10px] px-1.5 py-0.5 rounded-full font-medium ${STATUT_COLORS[e.statut] || ''}`}>{e.statut}</span>
                          </div>
                        </div>
                        <div className="flex gap-1 shrink-0">
                          <button onClick={() => setEntreeModal(e)} className="p-1 rounded hover:bg-black/5 text-muted-foreground"><Pencil size={12} /></button>
                          <button onClick={() => deleteMutation.mutate(e.id)} className="p-1 rounded hover:bg-red-100 text-muted-foreground hover:text-red-600"><Trash2 size={12} /></button>
                        </div>
                      </div>
                    ))}
                  </div>
                </div>
              </div>
            );
          })}
        </div>
      )}

      {/* Légende */}
      <div className="flex flex-wrap gap-2 pt-1">
        {Object.entries(TYPE_COLORS).map(([label, cls]) => (
          <span key={label} className={`text-xs px-2 py-0.5 rounded-full border font-medium ${cls}`}>{label}</span>
        ))}
        <span className="text-xs px-2 py-0.5 rounded-full border font-medium bg-orange-100 text-orange-700 border-orange-200">🎉 Événement</span>
      </div>

      {entreeModal && (
        <CollaborateurEntreeModal
          collaborateur={collaborateur}
          entree={entreeModal === 'new' ? null : entreeModal}
          onClose={() => setEntreeModal(null)}
        />
      )}
    </div>
  );
}