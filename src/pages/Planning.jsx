import { useState, useMemo } from 'react';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { base44 } from '@/api/base44Client';
import { Plus, ChevronLeft, ChevronRight, Calendar, LayoutGrid, Users, PartyPopper, Briefcase, Trash2, X, MapPin } from 'lucide-react';
import { Button } from '@/components/ui/button';
import {
  format, startOfMonth, endOfMonth, startOfWeek, endOfWeek,
  addDays, addMonths, subMonths, addWeeks, subWeeks,
  parseISO, isSameDay, isSameMonth, isToday, addYears, subYears
} from 'date-fns';
import { fr } from 'date-fns/locale';
import ServiceModal from '@/components/planning/ServiceModal';
import ServiceCard from '@/components/planning/ServiceCard';
import ServicePrestataireModal from '@/components/planning/ServicePrestataireModal';
import EvenementModal from '@/components/evenements/EvenementModal';
import YearView from '@/components/planning/YearView';
import NouveauTunnel from '@/components/planning/NouveauTunnel';

import { POSTE_COLORS as posteColorsImported } from '@/constants/colors';

export const posteColors = Object.fromEntries(
  Object.entries(posteColorsImported).map(([k, v]) => [k, v + ' border-border'])
);

const LAYERS = {
  extras:       { label: 'Extras',        icon: Users,       activeClass: 'bg-blue-500 text-white border-blue-500',     inactiveClass: 'bg-card border-border text-muted-foreground/50 hover:text-muted-foreground hover:bg-muted/50' },
  prestataires: { label: 'Prestataires',  icon: Briefcase,   activeClass: 'bg-purple-500 text-white border-purple-500', inactiveClass: 'bg-card border-border text-muted-foreground/50 hover:text-muted-foreground hover:bg-muted/50' },
  evenements:   { label: 'Événements',    icon: PartyPopper, activeClass: 'bg-orange-500 text-white border-orange-500', inactiveClass: 'bg-card border-border text-muted-foreground/50 hover:text-muted-foreground hover:bg-muted/50' },
  rdvClients:   { label: 'RDV Clients',   icon: Calendar,    activeClass: 'bg-emerald-500 text-white border-emerald-500', inactiveClass: 'bg-card border-border text-muted-foreground/50 hover:text-muted-foreground hover:bg-muted/50' },
};

const statutPrestColors = {
  'En attente': 'bg-amber-100 text-amber-700',
  'Confirmé':   'bg-emerald-100 text-emerald-700',
  'Indispo':    'bg-red-100 text-red-600',
  'Annulé':     'bg-slate-100 text-slate-500',
  'Terminé':    'bg-slate-100 text-slate-500',
};

export default function Planning() {
  const qc = useQueryClient();
  const [view, setView] = useState('month');
  const [currentDate, setCurrentDate] = useState(new Date());
  const [tunnelOpen, setTunnelOpen] = useState(false);
  const [modalOpen, setModalOpen] = useState(false);
  const [prestataireModalOpen, setPrestataireModalOpen] = useState(false);
  const [evenementModalOpen, setEvenementModalOpen] = useState(false);
  const [defaultDate, setDefaultDate] = useState(null);
  const [selectedDay, setSelectedDay] = useState(null);
  const [activeLayers, setActiveLayers] = useState({ extras: true, evenements: true, prestataires: true, rdvClients: true });

  const { data: services = [] } = useQuery({
    queryKey: ['services'],
    queryFn: () => base44.entities.Service.list('-date', 300),
  });

  const { data: allAssignments = [] } = useQuery({
    queryKey: ['assignments'],
    queryFn: () => base44.entities.ServiceAssignment.list('-created_date', 500),
  });

  const { data: evenements = [] } = useQuery({
    queryKey: ['evenements', 'all'],
    queryFn: () => base44.entities.Evenement.list('-date', 200),
  });

  const { data: evPrestataires = [] } = useQuery({
    queryKey: ['ev-prestataires-planning'],
    queryFn: () => base44.entities.EvenementPrestataire.list('-created_date', 500),
  });

  const { data: dispoPrestataires = [] } = useQuery({
    queryKey: ['dispoprestataires'],
    queryFn: () => base44.entities.DispoPrestataire.list('-date', 500),
  });

  const { data: allRdvs = [] } = useQuery({
    queryKey: ['rendezvous'],
    queryFn: () => base44.entities.RendezVous.list('-date_confirmee', 300),
  });

  const rdvsForDay = (day) =>
    allRdvs.filter(r => r.date_confirmee && isSameDay(parseISO(r.date_confirmee), day));

  // --- Calendar grids ---
  const monthStart = startOfMonth(currentDate);
  const monthEnd = endOfMonth(currentDate);
  const monthGridStart = startOfWeek(monthStart, { weekStartsOn: 1 });
  const monthGridEnd = endOfWeek(monthEnd, { weekStartsOn: 1 });
  const monthDays = [];
  let d = monthGridStart;
  while (d <= monthGridEnd) { monthDays.push(d); d = addDays(d, 1); }

  const weekStart = startOfWeek(currentDate, { weekStartsOn: 1 });
  const weekDays = Array.from({ length: 7 }, (_, i) => addDays(weekStart, i));

  const servicesForDay = useMemo(() => {
    return (day) => services.filter(s => s.date && isSameDay(parseISO(s.date), day))
      .sort((a, b) => a.heure_debut?.localeCompare(b.heure_debut));
  }, [services]);

  const evenementsForDay = useMemo(() => {
    return (day) => evenements.filter(e => e.date && isSameDay(parseISO(e.date), day));
  }, [evenements]);

  const prestatairesForDay = useMemo(() => {
    return (day) => dispoPrestataires.filter(p => p.date && isSameDay(parseISO(p.date), day));
  }, [dispoPrestataires]);

  const assignmentsForService = useMemo(() => {
    return (serviceId) => allAssignments.filter(a => a.service_id === serviceId);
  }, [allAssignments]);

  const updateDispoStatut = useMutation({
    mutationFn: ({ id, statut }) => base44.entities.DispoPrestataire.update(id, { statut }),
    onSuccess: (_, { id }) => qc.invalidateQueries(['dispoprestataires', id]),
  });

  const deleteDispoPrestataire = useMutation({
    mutationFn: (id) => base44.entities.DispoPrestataire.delete(id),
    onSuccess: (_, id) => {
      qc.invalidateQueries(['dispoprestataires', id]);
      setSelectedDay(null);
    },
  });

  const deleteRendezVous = useMutation({
    mutationFn: (id) => base44.entities.RendezVous.delete(id),
    onSuccess: () => {
      qc.invalidateQueries(['rendezvous']);
    },
  });

  const goBack = () => {
    if (view === 'year') return setCurrentDate(d => subYears(d, 1));
    if (view === 'month') return setCurrentDate(d => subMonths(d, 1));
    setCurrentDate(d => subWeeks(d, 1));
  };

  const goForward = () => {
    if (view === 'year') return setCurrentDate(d => addYears(d, 1));
    if (view === 'month') return setCurrentDate(d => addMonths(d, 1));
    setCurrentDate(d => addWeeks(d, 1));
  };

  const headerLabel = view === 'year'
    ? format(currentDate, 'yyyy')
    : view === 'month'
    ? format(currentDate, 'MMMM yyyy', { locale: fr })
    : `${format(weekStart, 'd MMM', { locale: fr })} – ${format(addDays(weekStart, 6), 'd MMM yyyy', { locale: fr })}`;

  const dayLabels = ['Lun', 'Mar', 'Mer', 'Jeu', 'Ven', 'Sam', 'Dim'];

  const toggleLayer = (key) => setActiveLayers(prev => ({ ...prev, [key]: !prev[key] }));

  function DayCell({ day, inMonth }) {
    const todayDay = isToday(day);
    const isSelected = selectedDay && isSameDay(day, selectedDay);
    const dayServices = activeLayers.extras ? servicesForDay(day) : [];
    const dayEvents = activeLayers.evenements ? evenementsForDay(day) : [];
    const dayPrestataires = activeLayers.prestataires ? prestatairesForDay(day) : [];
    const dayRdvs = activeLayers.rdvClients ? rdvsForDay(day) : [];
    const hasContent = dayServices.length > 0 || dayEvents.length > 0 || dayPrestataires.length > 0 || dayRdvs.length > 0;

    return (
      <div
        onClick={() => inMonth && setSelectedDay(isSameDay(day, selectedDay) ? null : day)}
        className={`min-h-[100px] p-1.5 cursor-pointer transition-colors
          ${inMonth ? 'bg-card hover:bg-muted/30' : 'bg-muted/20'}
          ${isSelected ? 'ring-2 ring-inset ring-primary/30 bg-primary/5' : ''}
        `}
      >
        <div className="flex items-center justify-between mb-1">
          <span className={`text-xs font-bold w-6 h-6 flex items-center justify-center rounded-full
            ${todayDay ? 'bg-primary text-primary-foreground' : inMonth ? 'text-foreground' : 'text-muted-foreground/40'}
          `}>
            {format(day, 'd')}
          </span>
          {inMonth && (
            <button
              onClick={(e) => { e.stopPropagation(); setDefaultDate(format(day, 'yyyy-MM-dd')); setTunnelOpen(true); }}
              className="text-muted-foreground hover:text-primary p-0.5 rounded opacity-0 hover:opacity-100 transition-colors"
            >
              <Plus size={11} />
            </button>
          )}
        </div>

        <div className="space-y-0.5">
          {/* Événements — orange */}
          {dayEvents.slice(0, 1).map(ev => (
            <div key={ev.id} className="rounded border px-1.5 py-0.5 text-[9px] bg-orange-100 text-orange-700 border-orange-200 truncate font-semibold">
              🎉 {ev.nom.slice(0, 14)}
            </div>
          ))}
          {dayEvents.length > 1 && (
            <div className="rounded border px-1.5 py-0.5 text-[9px] bg-orange-50 text-orange-500 border-orange-100 truncate">
              +{dayEvents.length - 1} évén.
            </div>
          )}

          {/* Extras / Services — bleu */}
          {dayServices.slice(0, 1).map(service => {
            const assigns = assignmentsForService(service.id);
            return (
              <div key={service.id} className="rounded border px-1.5 py-0.5 text-[9px] bg-blue-100 text-blue-700 border-blue-200 truncate">
                👥 {service.heure_debut} · {assigns.length} extra{assigns.length > 1 ? 's' : ''}
              </div>
            );
          })}
          {dayServices.length > 1 && (
            <div className="rounded border px-1.5 py-0.5 text-[9px] bg-blue-50 text-blue-500 border-blue-100 truncate">
              +{dayServices.length - 1} service{dayServices.length - 1 > 1 ? 's' : ''}
            </div>
          )}

          {/* Prestataires — violet */}
          {dayPrestataires.slice(0, 1).map(p => (
            <div key={p.id} className="rounded border px-1.5 py-0.5 text-[9px] bg-purple-100 text-purple-700 border-purple-200 truncate">
              🤝 {p.prestataire_nom.slice(0, 12)}
            </div>
          ))}
          {dayPrestataires.length > 1 && (
            <div className="rounded border px-1.5 py-0.5 text-[9px] bg-purple-50 text-purple-500 border-purple-100 truncate">
              +{dayPrestataires.length - 1} presta.
            </div>
          )}

          {/* RDV — vert (confirmé) ou jaune (en attente) */}
          {dayRdvs.slice(0, 1).map(rdv => (
            <div key={rdv.id} className={`rounded border px-1.5 py-0.5 text-[9px] truncate ${rdv.statut === 'En attente' ? 'bg-amber-50 text-amber-600 border-amber-200' : 'bg-emerald-100 text-emerald-700 border-emerald-200'}`}>
              📅 {rdv.client_nom?.slice(0, 12)}{rdv.heure_confirmee ? ` · ${rdv.heure_confirmee}` : ''}
            </div>
          ))}
          {(() => {
            const enAttente = dayRdvs.filter(r => r.statut === 'En attente').length;
            return enAttente > 1 ? (
              <div className="rounded border px-1.5 py-0.5 text-[9px] bg-amber-50 text-amber-500 border-amber-100 truncate">
                {enAttente} en attente
              </div>
            ) : null;
          })()}
        </div>
      </div>
    );
  }

  const selectedDayServices = selectedDay ? servicesForDay(selectedDay) : [];
  const selectedDayEvents = selectedDay ? evenementsForDay(selectedDay) : [];
  const selectedDayPrestataires = selectedDay ? prestatairesForDay(selectedDay) : [];
  const selectedDayRdvs = selectedDay ? rdvsForDay(selectedDay) : [];

  return (
    <div className="p-4 md:p-6 space-y-5 max-w-7xl mx-auto">
      {/* Ligne 1 : Navigation vue + navigation date */}
      <div className="flex items-center justify-between gap-3 flex-wrap">
        <div>
          <h2 className="text-2xl font-bold">Calendrier</h2>
          <p className="text-muted-foreground text-sm mt-1 capitalize">{headerLabel}</p>
        </div>
        <div className="flex items-center gap-2 flex-wrap">
          <div className="flex bg-muted rounded-xl p-1 gap-1">
            <button onClick={() => setView('year')} className={`flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-xs font-medium transition-colors ${view === 'year' ? 'bg-card shadow text-foreground' : 'text-muted-foreground hover:text-foreground'}`}>
              <Calendar size={13} /> Année
            </button>
            <button onClick={() => setView('month')} className={`flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-xs font-medium transition-colors ${view === 'month' ? 'bg-card shadow text-foreground' : 'text-muted-foreground hover:text-foreground'}`}>
              <LayoutGrid size={13} /> Mois
            </button>
            <button onClick={() => setView('week')} className={`flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-xs font-medium transition-colors ${view === 'week' ? 'bg-card shadow text-foreground' : 'text-muted-foreground hover:text-foreground'}`}>
              <Calendar size={13} /> Semaine
            </button>
          </div>
          <Button variant="outline" size="icon" onClick={goBack}><ChevronLeft size={16} /></Button>
          <Button variant="outline" size="sm" onClick={() => setCurrentDate(new Date())}>Aujourd'hui</Button>
          <Button variant="outline" size="icon" onClick={goForward}><ChevronRight size={16} /></Button>
        </div>
      </div>

      {/* Ligne 2 : Bouton + Nouveau */}
      <Button
        className="w-full gap-2 bg-primary hover:bg-primary/90 text-primary-foreground"
        onClick={() => { setDefaultDate(selectedDay ? format(selectedDay, 'yyyy-MM-dd') : null); setTunnelOpen(true); }}
      >
        <Plus size={16} /> Nouveau
      </Button>

      {/* Ligne 3 : Filtres discrets */}
      <div className="flex items-center gap-2 flex-wrap">
        <span className="text-xs text-muted-foreground font-medium">Afficher :</span>
        {Object.entries(LAYERS).map(([key, { label, icon: Icon, activeClass, inactiveClass }]) => (
          <button
            key={key}
            onClick={() => toggleLayer(key)}
            className={`flex items-center gap-1.5 px-2.5 py-1 rounded-lg text-xs font-medium border transition-all ${activeLayers[key] ? activeClass : inactiveClass}`}
          >
            <Icon size={12} /> {label}
          </button>
        ))}
      </div>

      <div className="relative">
        {/* Vue Année */}
        {view === 'year' && (
          <YearView
            currentDate={currentDate}
            evenements={activeLayers.evenements ? evenements : []}
            services={activeLayers.extras ? services : []}
            dispoPrestataires={activeLayers.prestataires ? dispoPrestataires : []}
            allRdvs={activeLayers.rdvClients ? allRdvs : []}
            onDayClick={(day) => { setCurrentDate(day); setView('month'); setSelectedDay(day); }}
            onMonthClick={(month) => { setCurrentDate(month); setView('month'); }}
          />
        )}

        {/* Calendrier Mois/Semaine */}
        {view !== 'year' && <div className="bg-card rounded-2xl border border-border shadow-sm overflow-hidden">
          <div className="grid grid-cols-7 border-b border-border">
            {dayLabels.map(wd => (
              <div key={wd} className="py-2.5 text-center text-xs font-semibold text-muted-foreground uppercase tracking-wide">{wd}</div>
            ))}
          </div>

          {view === 'month' ? (
            <div className="grid grid-cols-7 divide-x divide-y divide-border">
              {monthDays.map(day => (
                <DayCell key={day.toISOString()} day={day} inMonth={isSameMonth(day, currentDate)} />
              ))}
            </div>
          ) : (
            <div className="hidden md:grid grid-cols-7 divide-x divide-border">
              {weekDays.map(day => {
                const dayServices = activeLayers.extras ? servicesForDay(day) : [];
                const dayEvents = activeLayers.evenements ? evenementsForDay(day) : [];
                const dayPrest = activeLayers.prestataires ? prestatairesForDay(day) : [];
                const dayRdvsWeek = activeLayers.rdvClients ? rdvsForDay(day) : [];
                const todayDay = isToday(day);
                const isSelected = selectedDay && isSameDay(day, selectedDay);
                return (
                  <div
                    key={day.toISOString()}
                    onClick={() => setSelectedDay(isSameDay(day, selectedDay) ? null : day)}
                    className={`min-h-[300px] p-2 cursor-pointer transition-colors hover:bg-muted/30 ${isSelected ? 'ring-2 ring-inset ring-primary/30 bg-primary/5' : 'bg-card'}`}
                  >
                    <div className="text-center mb-2">
                      <p className="text-xs text-muted-foreground capitalize">{format(day, 'EEE', { locale: fr })}</p>
                      <span className={`text-sm font-bold w-7 h-7 flex items-center justify-center rounded-full mx-auto ${todayDay ? 'bg-primary text-primary-foreground' : 'text-foreground'}`}>
                        {format(day, 'd')}
                      </span>
                    </div>
                    <div className="space-y-1">
                      {/* Événements — orange */}
                      {dayEvents.map(ev => (
                        <div key={ev.id} className="rounded px-1.5 py-1 text-xs bg-orange-100 text-orange-700 font-semibold truncate border border-orange-200">🎉 {ev.nom}</div>
                      ))}
                      {/* Extras — bleu */}
                      {dayServices.map(service => {
                        const assigns = assignmentsForService(service.id);
                        return (
                          <div key={service.id} className="rounded border px-1.5 py-1 text-xs bg-blue-100 text-blue-700 border-blue-200 truncate">
                            👥 {service.heure_debut} · {assigns.length} extra{assigns.length > 1 ? 's' : ''}
                          </div>
                        );
                      })}
                      {/* Prestataires — violet */}
                      {dayPrest.slice(0, 2).map(p => (
                        <div key={p.id} className="rounded px-1.5 py-1 text-xs bg-purple-100 text-purple-700 truncate border border-purple-200">🤝 {p.prestataire_nom}</div>
                      ))}
                      {dayPrest.length > 2 && (
                        <div className="rounded px-1.5 py-1 text-[10px] bg-purple-50 text-purple-500 truncate border border-purple-100">+{dayPrest.length - 2} presta.</div>
                      )}
                      {/* RDV — vert ou jaune selon statut */}
                      {dayRdvsWeek.map(rdv => (
                        <div key={rdv.id} className={`rounded px-1.5 py-1 text-[10px] truncate border ${rdv.statut === 'En attente' ? 'bg-amber-50 text-amber-600 border-amber-200' : 'bg-emerald-100 text-emerald-700 border-emerald-200'}`}>
                          📅 {rdv.client_nom} · {rdv.heure_confirmee}
                          {rdv.statut === 'En attente' && <span className="ml-1 text-[9px]">(en attente)</span>}
                        </div>
                      ))}
                    </div>
                    <button
                      onClick={(e) => { e.stopPropagation(); setDefaultDate(format(day, 'yyyy-MM-dd')); setTunnelOpen(true); }}
                      className="mt-2 w-full text-xs text-muted-foreground hover:text-primary flex items-center justify-center gap-1 py-1 rounded hover:bg-muted"
                    >
                      <Plus size={10} /> Ajouter
                    </button>
                  </div>
                );
              })}
            </div>
          )}
        </div>}

        {/* Panneau détail jour - slide-over depuis la droite */}
        {selectedDay && (
        <>
         {/* Overlay */}
         <div
           className="fixed inset-0 z-40 bg-black/20"
           style={{ top: 'env(safe-area-inset-top)', bottom: 'env(safe-area-inset-bottom)' }}
           onClick={() => setSelectedDay(null)}
         />
         {/* Panneau */}
         <div className="fixed top-0 right-0 h-full w-full max-w-sm bg-card/95 border-l border-border shadow-2xl z-50 flex flex-col" style={{ top: 'env(safe-area-inset-top)', bottom: 'env(safe-area-inset-bottom)' }}>
              {/* Header */}
              <div className="flex items-center justify-between px-5 py-4 border-b border-border">
                <div>
                  <h3 className="font-semibold capitalize text-sm">{format(selectedDay, 'EEEE d MMMM', { locale: fr })}</h3>
                  <p className="text-xs text-muted-foreground mt-0.5">
                    {selectedDayEvents.length + selectedDayServices.length + selectedDayRdvs.length + selectedDayPrestataires.length} élément(s)
                  </p>
                </div>
                <div className="flex items-center gap-2">
                  <Button size="sm" className="gap-1 text-xs h-7 px-3" onClick={() => { setDefaultDate(format(selectedDay, 'yyyy-MM-dd')); setTunnelOpen(true); }}>
                    <Plus size={11} /> Nouveau
                  </Button>
                  <button onClick={() => setSelectedDay(null)} className="p-1.5 rounded-lg hover:bg-muted text-muted-foreground">
                    ✕
                  </button>
                </div>
              </div>

              {/* Contenu scrollable */}
              <div className="flex-1 overflow-y-auto p-4 space-y-4">

                {/* Événements du jour */}
                {selectedDayEvents.length > 0 && (
                  <div className="space-y-2">
                    <p className="text-xs font-semibold text-muted-foreground uppercase tracking-wide">Événements</p>
                    {selectedDayEvents.map(ev => (
                      <div key={ev.id} className="bg-orange-50 border border-orange-200 rounded-xl p-3">
                        <p className="font-semibold text-sm">🎉 {ev.nom}</p>
                        <p className="text-xs text-muted-foreground mt-0.5">{ev.type_evenement} · {ev.nb_invites || 0} invités</p>
                        {ev.lieu_nom && <p className="text-xs text-muted-foreground">📍 {ev.lieu_nom}</p>}
                        {ev.heure_debut && <p className="text-xs text-muted-foreground">🕐 {ev.heure_debut} – {ev.heure_fin}</p>}
                      </div>
                    ))}
                  </div>
                )}

                {/* Prestataires du jour */}
                {selectedDayPrestataires.length > 0 && (
                  <div className="space-y-2">
                    <p className="text-xs font-semibold text-muted-foreground uppercase tracking-wide">Prestataires</p>
                    {selectedDayPrestataires.map(p => (
                                    <PrestataireCard
                                      key={p.id}
                                      p={p}
                                      onUpdateStatut={(id, statut) => updateDispoStatut.mutate({ id, statut })}
                                      onUpdateLieu={(id, lieu) => base44.entities.DispoPrestataire.update(id, { lieu }).then(() => qc.invalidateQueries(['dispoprestataires']))}
                                      onDelete={(id) => { if (window.confirm('Supprimer cette disponibilité ?')) deleteDispoPrestataire.mutate(id); }}
                                      statutPrestColors={statutPrestColors}
                                    />
                                  ))}
                  </div>
                )}

                {/* RDV Clients du jour */}
                {selectedDayRdvs.length > 0 && (
                  <div className="space-y-2">
                    <p className="text-xs font-semibold text-muted-foreground uppercase tracking-wide">Rendez-vous clients</p>
                    {selectedDayRdvs.map(rdv => (
                      <div key={rdv.id} className="bg-emerald-50 border border-emerald-200 rounded-xl p-3 space-y-2">
                        <div className="flex items-start justify-between gap-2">
                          <div>
                            <p className="font-semibold text-sm">📅 {rdv.client_nom}</p>
                            <p className="text-xs text-muted-foreground mt-0.5">🕐 {rdv.heure_confirmee} · {rdv.motif}</p>
                            {rdv.notes_admin && <p className="text-xs text-muted-foreground italic mt-0.5">💬 {rdv.notes_admin}</p>}
                            <span className={`text-[10px] px-2 py-0.5 rounded-full font-medium mt-1 inline-block ${
                              rdv.statut === 'Confirmé' ? 'bg-emerald-100 text-emerald-700' :
                              rdv.statut === 'En attente' ? 'bg-yellow-100 text-yellow-700' :
                              'bg-slate-100 text-slate-600'
                            }`}>{rdv.statut}</span>
                          </div>
                          <button
                            onClick={() => { if (window.confirm('Supprimer ce rendez-vous ?')) deleteRendezVous.mutate(rdv.id); }}
                            className="p-1.5 rounded-lg hover:bg-red-100 hover:text-red-600 transition-colors shrink-0 text-muted-foreground"
                            title="Supprimer"
                          >
                            <Trash2 size={13} />
                          </button>
                        </div>
                      </div>
                    ))}
                  </div>
                )}

                {/* Services / Extras du jour */}
                {selectedDayServices.length > 0 && (
                  <div className="space-y-2">
                    <p className="text-xs font-semibold text-muted-foreground uppercase tracking-wide">Services (extras)</p>
                    {selectedDayServices.map(service => (
                      <ServiceCard key={service.id} service={service} assignments={assignmentsForService(service.id)} />
                    ))}
                  </div>
                )}

                {/* Rien ce jour */}
                {selectedDayServices.length === 0 && selectedDayEvents.length === 0 && selectedDayRdvs.length === 0 && selectedDayPrestataires.length === 0 && (
                  <div className="flex flex-col items-center justify-center py-16 text-muted-foreground text-sm gap-2">
                    <span className="text-3xl">📭</span>
                    <p>Rien de prévu ce jour</p>
                  </div>
                )}
              </div>
            </div>
          </>
        )}
      </div>

      {/* Légende */}
      <div className="flex flex-wrap gap-2">
        <span className="text-xs px-2.5 py-1 rounded-full border font-medium bg-orange-100 text-orange-700 border-orange-200">🎉 Événement</span>
        <span className="text-xs px-2.5 py-1 rounded-full border font-medium bg-blue-100 text-blue-700 border-blue-200">👥 Extras</span>
        <span className="text-xs px-2.5 py-1 rounded-full border font-medium bg-purple-100 text-purple-700 border-purple-200">🤝 Prestataire</span>
        <span className="text-xs px-2.5 py-1 rounded-full border font-medium bg-emerald-100 text-emerald-700 border-emerald-200">📅 RDV confirmé</span>
        <span className="text-xs px-2.5 py-1 rounded-full border font-medium bg-amber-50 text-amber-600 border-amber-200">📅 RDV en attente</span>
      </div>

      {modalOpen && <ServiceModal defaultDate={defaultDate} onClose={() => { setModalOpen(false); setDefaultDate(null); }} />}
      {prestataireModalOpen && <ServicePrestataireModal defaultDate={defaultDate} onClose={() => { setPrestataireModalOpen(false); setDefaultDate(null); }} />}
      {evenementModalOpen && <EvenementModal onClose={() => setEvenementModalOpen(false)} />}
      {tunnelOpen && (
        <NouveauTunnel
          defaultDate={defaultDate}
          onClose={() => { setTunnelOpen(false); setDefaultDate(null); }}
          onOpenEvenementModal={() => setEvenementModalOpen(true)}
        />
      )}
    </div>
  );
}

function PrestataireCard({ p, onUpdateStatut, onUpdateLieu, onDelete, statutPrestColors }) {
  const [editingLieu, setEditingLieu] = useState(false);
  const [lieu, setLieu] = useState(p.lieu || '');
  const [saving, setSaving] = useState(false);

  const saveLieu = async () => {
    setSaving(true);
    await onUpdateLieu(p.id, lieu);
    setSaving(false);
    setEditingLieu(false);
  };

  return (
    <div className="bg-purple-50 border border-purple-200 rounded-xl p-3 space-y-2">
      <div className="flex items-start justify-between gap-2">
        <div className="flex-1 min-w-0">
          <p className="font-semibold text-sm">🤝 {p.prestataire_nom}</p>
          <p className="text-xs text-muted-foreground">{p.prestataire_domaine}{p.heure_debut ? ` · ${p.heure_debut}–${p.heure_fin}` : ''}</p>
          {p.evenement_nom && <p className="text-xs text-muted-foreground">🎉 {p.evenement_nom}</p>}
          {p.notes && <p className="text-xs text-muted-foreground italic">💬 {p.notes}</p>}

          {/* Lieu - éditable */}
          <div className="mt-1.5">
            {editingLieu ? (
              <div className="flex items-center gap-1.5">
                <input
                  autoFocus
                  value={lieu}
                  onChange={e => setLieu(e.target.value)}
                  placeholder="Ajouter un lieu..."
                  className="flex-1 h-6 rounded border border-purple-300 bg-white px-2 text-xs focus:outline-none focus:ring-1 focus:ring-purple-400"
                  onKeyDown={e => { if (e.key === 'Enter') saveLieu(); if (e.key === 'Escape') setEditingLieu(false); }}
                />
                <button onClick={saveLieu} disabled={saving} className="text-[10px] px-2 py-1 rounded bg-purple-500 text-white hover:bg-purple-600 font-medium">
                  {saving ? '...' : 'OK'}
                </button>
                <button onClick={() => { setEditingLieu(false); setLieu(p.lieu || ''); }} className="text-[10px] px-2 py-1 rounded bg-slate-100 text-slate-500 hover:bg-slate-200">
                  ✕
                </button>
              </div>
            ) : (
              <button onClick={() => setEditingLieu(true)} className="flex items-center gap-1 text-xs text-purple-600 hover:text-purple-800 transition-colors">
                <MapPin size={11} />
                {p.lieu ? p.lieu : <span className="italic text-muted-foreground">Ajouter un lieu</span>}
                <span className="text-[9px] text-muted-foreground ml-1">✎</span>
              </button>
            )}
          </div>
        </div>
        <span className={`text-[10px] px-2 py-0.5 rounded-full font-medium shrink-0 ${statutPrestColors[p.statut] || 'bg-gray-100 text-gray-600'}`}>
          {p.statut}
        </span>
      </div>
      <div className="flex gap-2 pt-1">
        {p.statut === 'En attente' && (
          <>
            <button
              onClick={() => onUpdateStatut(p.id, 'Confirmé')}
              className="flex-1 text-xs py-1 rounded-lg bg-emerald-100 text-emerald-700 hover:bg-emerald-200 font-medium transition-colors"
            >
              ✓ Confirmer
            </button>
            <button
              onClick={() => onUpdateStatut(p.id, 'Annulé')}
              className="flex-1 text-xs py-1 rounded-lg bg-red-100 text-red-600 hover:bg-red-200 font-medium transition-colors"
            >
              ✕ Annuler
            </button>
          </>
        )}
        <button
          onClick={() => onDelete(p.id)}
          className="p-1.5 rounded-lg bg-slate-100 text-slate-500 hover:bg-red-100 hover:text-red-600 transition-colors"
          title="Supprimer"
        >
          <Trash2 size={13} />
        </button>
      </div>
    </div>
  );
}