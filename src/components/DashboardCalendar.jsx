import { useState } from 'react';
import { useQuery } from '@tanstack/react-query';
import { base44 } from '@/api/base44Client';
import {
  format, startOfMonth, endOfMonth, startOfWeek, endOfWeek,
  addDays, addMonths, subMonths, parseISO, isSameDay, isSameMonth, isToday
} from 'date-fns';
import { fr } from 'date-fns/locale';
import { ChevronLeft, ChevronRight } from 'lucide-react';
import { Button } from '@/components/ui/button';

const posteColors = {
  'Serveur':       'bg-blue-100 text-blue-700 border-blue-200',
  'Barman':        'bg-purple-100 text-purple-700 border-purple-200',
  'Cuisinier':     'bg-orange-100 text-orange-700 border-orange-200',
  'Plongeur':      'bg-slate-100 text-slate-600 border-slate-200',
  'Chef de rang':  'bg-emerald-100 text-emerald-700 border-emerald-200',
  'Hôte/Hôtesse':  'bg-pink-100 text-pink-700 border-pink-200',
  'Autre':         'bg-gray-100 text-gray-600 border-gray-200',
};

const statutPrestColors = {
  'En attente': 'bg-amber-100 text-amber-700',
  'Confirmé':   'bg-emerald-100 text-emerald-700',
  'Indispo':    'bg-red-100 text-red-600',
  'Annulé':     'bg-slate-100 text-slate-500',
  'Terminé':    'bg-slate-100 text-slate-500',
};

export default function DashboardCalendar() {
  const [currentDate, setCurrentDate] = useState(new Date());
  const [selectedDay, setSelectedDay] = useState(null);

  const { data: services = [] } = useQuery({
    queryKey: ['services'],
    queryFn: () => base44.entities.Service.list('-date', 300),
  });
  const { data: allAssignments = [] } = useQuery({
    queryKey: ['assignments'],
    queryFn: () => base44.entities.ServiceAssignment.list('-created_date', 500),
  });
  const { data: evenements = [] } = useQuery({
    queryKey: ['evenements'],
    queryFn: () => base44.entities.Evenement.list('-date', 200),
  });
  const { data: dispoPrestataires = [] } = useQuery({
    queryKey: ['dispoprestataires'],
    queryFn: () => base44.entities.DispoPrestataire.list('-date', 500),
  });
  const { data: allRdvs = [] } = useQuery({
    queryKey: ['rendezvous'],
    queryFn: () => base44.entities.RendezVous.list('-date_confirmee', 300),
  });

  const monthStart = startOfMonth(currentDate);
  const monthEnd = endOfMonth(currentDate);
  const gridStart = startOfWeek(monthStart, { weekStartsOn: 1 });
  const gridEnd = endOfWeek(monthEnd, { weekStartsOn: 1 });
  const monthDays = [];
  let d = gridStart;
  while (d <= gridEnd) { monthDays.push(d); d = addDays(d, 1); }

  const servicesForDay = (day) => services.filter(s => s.date && isSameDay(parseISO(s.date), day));
  const evenementsForDay = (day) => evenements.filter(e => e.date && isSameDay(parseISO(e.date), day));
  const prestatairesForDay = (day) => dispoPrestataires.filter(p => p.date && isSameDay(parseISO(p.date), day));
  const rdvsForDay = (day) => allRdvs.filter(r => r.date_confirmee && isSameDay(parseISO(r.date_confirmee), day));
  const assignmentsForService = (id) => allAssignments.filter(a => a.service_id === id);

  const dayLabels = ['Lun', 'Mar', 'Mer', 'Jeu', 'Ven', 'Sam', 'Dim'];

  function DayCell({ day, inMonth }) {
    const todayDay = isToday(day);
    const isSelected = selectedDay && isSameDay(day, selectedDay);
    const dayEvents = evenementsForDay(day);
    const dayServices = servicesForDay(day);
    const dayPrestataires = prestatairesForDay(day);
    const dayRdvs = rdvsForDay(day);
    const total = dayEvents.length + dayServices.length + dayPrestataires.length + dayRdvs.length;

    return (
      <div
        onClick={() => inMonth && setSelectedDay(isSameDay(day, selectedDay) ? null : day)}
        className={`min-h-[90px] p-1.5 cursor-pointer transition-colors
          ${inMonth ? 'bg-card hover:bg-muted/30' : 'bg-muted/20'}
          ${isSelected ? 'ring-2 ring-inset ring-primary/30 bg-primary/5' : ''}
        `}
      >
        <span className={`text-xs font-bold w-6 h-6 flex items-center justify-center rounded-full mb-1
          ${todayDay ? 'bg-primary text-primary-foreground' : inMonth ? 'text-foreground' : 'text-muted-foreground/40'}
        `}>
          {format(day, 'd')}
        </span>
        <div className="space-y-0.5">
          {dayEvents.slice(0, 1).map(ev => (
            <div key={ev.id} className="rounded border px-1.5 py-0.5 text-[9px] bg-orange-100 text-orange-700 border-orange-200 truncate font-semibold">
              🎉 {ev.nom}
            </div>
          ))}
          {dayServices.slice(0, 1).map(s => {
            const color = posteColors[s.poste] || posteColors['Autre'];
            const assigns = assignmentsForService(s.id);
            return (
              <div key={s.id} className={`rounded border px-1.5 py-0.5 text-[9px] ${color} truncate`}>
                👤 {s.heure_debut} · {assigns.length} extra{assigns.length > 1 ? 's' : ''}
              </div>
            );
          })}
          {dayPrestataires.slice(0, 1).map(p => (
            <div key={p.id} className="rounded border px-1.5 py-0.5 text-[9px] bg-purple-100 text-purple-700 border-purple-200 truncate">
              🤝 {p.prestataire_nom}
            </div>
          ))}
          {dayRdvs.slice(0, 1).map(rdv => (
            <div key={rdv.id} className="rounded border px-1.5 py-0.5 text-[9px] bg-emerald-100 text-emerald-700 border-emerald-200 truncate">
              📅 {rdv.client_nom}
            </div>
          ))}
          {total > 1 && (
            <p className="text-[9px] text-muted-foreground px-1">+{total - 1} autre{total - 1 > 1 ? 's' : ''}</p>
          )}
        </div>
      </div>
    );
  }

  const selEvents = selectedDay ? evenementsForDay(selectedDay) : [];
  const selServices = selectedDay ? servicesForDay(selectedDay) : [];
  const selPrest = selectedDay ? prestatairesForDay(selectedDay) : [];
  const selRdvs = selectedDay ? rdvsForDay(selectedDay) : [];

  return (
    <>
      <div className="bg-card rounded-2xl border border-border shadow-sm overflow-hidden">
        <div className="flex items-center justify-between px-4 py-3 border-b border-border">
          <Button variant="outline" size="icon" onClick={() => setCurrentDate(d => subMonths(d, 1))}><ChevronLeft size={16} /></Button>
          <h3 className="font-semibold capitalize">{format(currentDate, 'MMMM yyyy', { locale: fr })}</h3>
          <Button variant="outline" size="icon" onClick={() => setCurrentDate(d => addMonths(d, 1))}><ChevronRight size={16} /></Button>
        </div>
        <div className="grid grid-cols-7 border-b border-border">
          {dayLabels.map(wd => (
            <div key={wd} className="py-2 text-center text-xs font-semibold text-muted-foreground uppercase tracking-wide">{wd}</div>
          ))}
        </div>
        <div className="grid grid-cols-7 divide-x divide-y divide-border">
          {monthDays.map(day => (
            <DayCell key={day.toISOString()} day={day} inMonth={isSameMonth(day, currentDate)} />
          ))}
        </div>
      </div>

      {selectedDay && (
        <>
          <div className="fixed inset-0 z-40 bg-black/20" onClick={() => setSelectedDay(null)} />
          <div className="fixed top-0 right-0 h-full w-full max-w-sm bg-card border-l border-border shadow-2xl z-50 flex flex-col">
            <div className="flex items-center justify-between px-5 py-4 border-b border-border">
              <div>
                <h3 className="font-semibold capitalize text-sm">{format(selectedDay, 'EEEE d MMMM', { locale: fr })}</h3>
                <p className="text-xs text-muted-foreground mt-0.5">
                  {selEvents.length + selServices.length + selRdvs.length + selPrest.length} élément(s)
                </p>
              </div>
              <button onClick={() => setSelectedDay(null)} className="p-1.5 rounded-lg hover:bg-muted text-muted-foreground">✕</button>
            </div>
            <div className="flex-1 overflow-y-auto p-4 space-y-4">
              {selEvents.length > 0 && (
                <div className="space-y-2">
                  <p className="text-xs font-semibold text-muted-foreground uppercase tracking-wide">Événements</p>
                  {selEvents.map(ev => (
                    <div key={ev.id} className="bg-orange-50 border border-orange-200 rounded-xl p-3">
                      <p className="font-semibold text-sm">🎉 {ev.nom}</p>
                      <p className="text-xs text-muted-foreground mt-0.5">{ev.type_evenement} · {ev.nb_invites || 0} invités</p>
                      {ev.lieu_nom && <p className="text-xs text-muted-foreground">📍 {ev.lieu_nom}</p>}
                      {ev.heure_debut && <p className="text-xs text-muted-foreground">🕐 {ev.heure_debut} – {ev.heure_fin}</p>}
                    </div>
                  ))}
                </div>
              )}
              {selPrest.length > 0 && (
                <div className="space-y-2">
                  <p className="text-xs font-semibold text-muted-foreground uppercase tracking-wide">Prestataires</p>
                  {selPrest.map(p => (
                    <div key={p.id} className="bg-purple-50 border border-purple-200 rounded-xl p-3">
                      <div className="flex items-start justify-between gap-2">
                        <div>
                          <p className="font-semibold text-sm">🤝 {p.prestataire_nom}</p>
                          <p className="text-xs text-muted-foreground">{p.prestataire_domaine}{p.heure_debut ? ` · ${p.heure_debut}–${p.heure_fin}` : ''}</p>
                          {p.evenement_nom && <p className="text-xs text-muted-foreground">🎉 {p.evenement_nom}</p>}
                        </div>
                        <span className={`text-[10px] px-2 py-0.5 rounded-full font-medium shrink-0 ${statutPrestColors[p.statut] || 'bg-gray-100 text-gray-600'}`}>
                          {p.statut}
                        </span>
                      </div>
                    </div>
                  ))}
                </div>
              )}
              {selRdvs.length > 0 && (
                <div className="space-y-2">
                  <p className="text-xs font-semibold text-muted-foreground uppercase tracking-wide">Rendez-vous clients</p>
                  {selRdvs.map(rdv => (
                    <div key={rdv.id} className="bg-emerald-50 border border-emerald-200 rounded-xl p-3">
                      <p className="font-semibold text-sm">📅 {rdv.client_nom}</p>
                      <p className="text-xs text-muted-foreground mt-0.5">{rdv.heure_confirmee && `🕐 ${rdv.heure_confirmee} · `}{rdv.motif}</p>
                      <span className={`text-[10px] px-2 py-0.5 rounded-full font-medium mt-1 inline-block ${
                        rdv.statut === 'Confirmé' ? 'bg-emerald-100 text-emerald-700' :
                        rdv.statut === 'En attente' ? 'bg-yellow-100 text-yellow-700' :
                        'bg-slate-100 text-slate-600'
                      }`}>{rdv.statut}</span>
                    </div>
                  ))}
                </div>
              )}
              {selServices.length > 0 && (
                <div className="space-y-2">
                  <p className="text-xs font-semibold text-muted-foreground uppercase tracking-wide">Services (extras)</p>
                  {selServices.map(s => {
                    const assigns = assignmentsForService(s.id);
                    return (
                      <div key={s.id} className="bg-blue-50 border border-blue-200 rounded-xl p-3">
                        <p className="font-semibold text-sm">👤 {s.poste || 'Service'} · {s.heure_debut}–{s.heure_fin}</p>
                        {s.lieu && <p className="text-xs text-muted-foreground">📍 {s.lieu}</p>}
                        {assigns.length > 0 && (
                          <p className="text-xs text-muted-foreground mt-1">
                            {assigns.map(a => a.extra_nom).join(', ')}
                          </p>
                        )}
                      </div>
                    );
                  })}
                </div>
              )}
              {selEvents.length === 0 && selServices.length === 0 && selRdvs.length === 0 && selPrest.length === 0 && (
                <div className="flex flex-col items-center justify-center py-16 text-muted-foreground text-sm gap-2">
                  <span className="text-3xl">📭</span>
                  <p>Rien de prévu ce jour</p>
                </div>
              )}
            </div>
          </div>
        </>
      )}
    </>
  );
}