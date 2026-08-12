import { useState } from 'react';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { base44 } from '@/api/base44Client';
import { ChevronLeft, ChevronRight, AlertTriangle, Send, Check, AlertCircle, Settings, LayoutList, CalendarDays, BarChart2, MoreVertical } from 'lucide-react';
import HelpTooltip from '@/components/HelpTooltip';
import AgendaView from '@/components/planning/AgendaView';
import RecapJoursModal from '@/components/planning/RecapJoursModal';
import { Button } from '@/components/ui/button';
import { useToast } from '@/components/ui/use-toast';
import { useNavigate } from 'react-router-dom';
import {
  format, startOfMonth, endOfMonth, eachDayOfInterval,
  parseISO, isSameDay, addMonths, subMonths, isWeekend,
  startOfYear, startOfQuarter, endOfQuarter, endOfYear, isWithinInterval
} from 'date-fns';
import { fr } from 'date-fns/locale';
import DayCellModal from '@/components/planning/DayCellModal.jsx';
import PosteDropdownCell from '@/components/planning/PosteDropdownCell.jsx';
import DayOverviewModal from '@/components/planning/DayOverviewModal';
import EventAssignmentModal from '@/components/planning/EventAssignmentModal.jsx';
import ExtraWorkedDaysModal from '@/components/planning/ExtraWorkedDaysModal';
import SendRecapModal from '@/components/planning/SendRecapModal';
import DispoGroupeeModal from '@/components/planning/DispoGroupeeModal';
import NouveauTunnel from '@/components/planning/NouveauTunnel';
import MonthNavigator from '@/components/MonthNavigator';

const statutColors = {
  'Confirmé':   'bg-emerald-500 text-white',
  'En attente': 'bg-amber-400 text-white',
  'Dispo':      'bg-blue-400 text-white',
  'Indispo':    'bg-slate-400 text-white',
  'Annulé':     'bg-gray-300 text-gray-600',
  'Terminé':   'bg-slate-400 text-white',
  'Repos':      'bg-slate-200 text-slate-600',
  'Vacances':   'bg-sky-200 text-sky-700',
  'Maladie':    'bg-red-200 text-red-700',
};

const POSTES = ['Serveur', 'Barman', 'Cuisinier', 'Plongeur', 'Chef de rang', 'Hôte/Hôtesse', 'Autre'];

function hasTwoDaysInARow(workedDates) {
  const sorted = [...workedDates].sort();
  for (let i = 0; i < sorted.length - 1; i++) {
    const a = parseISO(sorted[i]);
    const b = parseISO(sorted[i + 1]);
    const diff = (b - a) / (1000 * 60 * 60 * 24);
    if (diff === 1) return true;
  }
  return false;
}

export default function PlanningExtras({ embedded, onOpenSettings }) {
  const navigate = useNavigate();
  const [monthDate, setMonthDate] = useState(new Date());
  const [selectedCell, setSelectedCell] = useState(null);
  const [selectedDay, setSelectedDay] = useState(null);
  const [selectedEventDay, setSelectedEventDay] = useState(null); // { date, evenement, evenements }
  const [showRecapModal, setShowRecapModal] = useState(false);
  const [workedDaysModal, setWorkedDaysModal] = useState(null);
  const [showRecapJours, setShowRecapJours] = useState(false);
  const [viewMode, setViewMode] = useState('planning');
  const [showDispoGroupee, setShowDispoGroupee] = useState(false);
  const [showMenuDots, setShowMenuDots] = useState(false);
  const { toast } = useToast();
  const qc = useQueryClient();

  const monthStart = startOfMonth(monthDate);
  const monthEnd = endOfMonth(monthDate);
  const allDays = eachDayOfInterval({ start: monthStart, end: monthEnd });

  const { data: extras = [] } = useQuery({
    queryKey: ['extras'],
    queryFn: () => base44.entities.Extra.list(),
    staleTime: 0,
  });

  const { data: collaborateurs = [] } = useQuery({
    queryKey: ['collaborateurs'],
    queryFn: () => base44.entities.Collaborateur.list(),
    staleTime: 0,
  });

  // Collaborateurs actifs ET visibles sur le planning équipe
  const collabsVisibles = collaborateurs
    .filter(c => c.actif !== false && c.visible_planning_equipe !== false)
    .map(c => ({ ...c, _isCollab: true }));

  const activeExtras = [
    ...extras.filter(e => e.actif !== false),
    ...collabsVisibles,
  ];

  const { data: shifts = [] } = useQuery({
    queryKey: ['shifts', format(monthDate, 'yyyy-MM')],
    queryFn: () => base44.entities.Shift.filter({}, '-date', 150),
  });

  const { data: services = [] } = useQuery({
    queryKey: ['services', format(monthDate, 'yyyy-MM')],
    queryFn: () => base44.entities.Service.list('-date', 300),
  });

  const { data: assignments = [] } = useQuery({
    queryKey: ['assignments'],
    queryFn: () => base44.entities.ServiceAssignment.list('-created_date', 500),
  });

  const { data: evenements = [] } = useQuery({
    queryKey: ['evenements', 'all'],
    queryFn: () => base44.entities.Evenement.list('-date', 200),
  });

  const { data: dayStatuses = [] } = useQuery({
    queryKey: ['extra-day-status', format(monthDate, 'yyyy-MM')],
    queryFn: () => base44.entities.ExtraDayStatus.list('-date', 150),
  });

  const { data: effectifSettings = [] } = useQuery({
    queryKey: ['effectif-settings'],
    queryFn: () => base44.entities.EffectifSettings.list(),
  });

  const monthServices = services.filter(s => s.date?.startsWith(format(monthDate, 'yyyy-MM')));
  const monthShifts = shifts.filter(s => s.date?.startsWith(format(monthDate, 'yyyy-MM')));
  const monthStatuses = dayStatuses.filter(s => s.date?.startsWith(format(monthDate, 'yyyy-MM')));

  // ─── COLONNES : un événement = une colonne, triés par date ─────────────────
  const monthEvenements = evenements
    .filter(e => e.date && e.date.startsWith(format(monthDate, 'yyyy-MM')))
    .sort((a, b) => a.date.localeCompare(b.date) || a.nom.localeCompare(b.nom));

  // ─── Helpers ───────────────────────────────────────────────────────────────

  const getShiftsForExtraDay = (extraId, day) =>
    monthShifts.filter(s => s.extra_id === extraId && s.date && isSameDay(parseISO(s.date), day));

  const getDayStatus = (extraId, day) =>
    monthStatuses.find(s => s.extra_id === extraId && s.date && isSameDay(parseISO(s.date), day));

  // Assignments d'un extra pour un événement précis
  const getAssignmentsForExtraEvent = (extra, evenement) => {
    const evServiceIds = new Set(
      monthServices
        .filter(s => s.evenement_id === evenement.id ||
          (s.date && isSameDay(parseISO(s.date), parseISO(evenement.date)) && !s.evenement_id))
        .map(s => s.id)
    );
    return assignments.filter(a =>
      evServiceIds.has(a.service_id) &&
      (a.extra_id === extra.email || a.extra_id === extra.id || a.extra_email === extra.email)
    );
  };

  // Infos de cellule pour un extra sur un événement
  const getCellInfo = (extra, evenement) => {
    const evAssignments = getAssignmentsForExtraEvent(extra, evenement);
    const day = parseISO(evenement.date);
    const manualStatus = getDayStatus(extra.id, day);

    if (evAssignments.length > 0) {
      return {
        type: 'assignment',
        assignments: evAssignments,
        statut: evAssignments[0].statut,
      };
    }
    if (manualStatus) {
      return { type: 'manual', label: manualStatus.statut, statut: manualStatus.statut };
    }
    return null;
  };

  // ─── Besoins par événement et poste ────────────────────────────────────────

  const getTranches = (typeEvenement) => {
    const s = effectifSettings.find(s => s.type_evenement === typeEvenement);
    return s?.tranches || {};
  };

  const getActivePostes = (typeEvenement) => {
    const s = effectifSettings.find(s => s.type_evenement === typeEvenement);
    if (!s?.postes_actifs) return POSTES;
    return POSTES.filter(p => s.postes_actifs[p] !== false);
  };

  const getNeedForEventPoste = (evenement, poste) => {
    const convives = evenement.nb_invites || 0;
    if (!convives) return 0;
    const tranches = getTranches(evenement.type_evenement);
    const posteTransches = tranches[poste] || [];
    for (const t of posteTransches) {
      if (convives >= t.min && convives <= t.max) return t.personnel;
    }
    return posteTransches[posteTransches.length - 1]?.personnel || 0;
  };

  const getConfirmedForEventPoste = (evenement, poste) => {
    const evServiceIds = new Set(
      monthServices
        .filter(s =>
          (s.evenement_id === evenement.id || (s.date && isSameDay(parseISO(s.date), parseISO(evenement.date)) && !s.evenement_id))
          && s.poste === poste
        )
        .map(s => s.id)
    );
    return assignments.filter(a => evServiceIds.has(a.service_id) && a.statut !== 'Annulé').length;
  };

  // ─── Jours travaillés (pour récap et alertes consécutives) ─────────────────

  const getWorkedDates = (extra) =>
    allDays
      .filter(day => {
        // Vérifier si assigné à n'importe quel événement ce jour
        const eventsOnDay = monthEvenements.filter(e => e.date && isSameDay(parseISO(e.date), day));
        return eventsOnDay.some(ev => {
          const cell = getCellInfo(extra, ev);
          return cell && cell.type === 'assignment' &&
            (cell.statut === 'Confirmé' || cell.statut === 'En attente' || cell.statut === 'Dispo');
        });
      })
      .map(d => format(d, 'yyyy-MM-dd'));

  const getPeriodInterval = (period = 'month') => {
    const now = monthDate;
    if (period === 'month') return { start: monthStart, end: monthEnd };
    if (period === 'quarter') return { start: startOfQuarter(now), end: endOfQuarter(now) };
    return { start: startOfYear(now), end: endOfYear(now) };
  };

  const getWorkedDaysDetail = (extra, period = 'month') => {
    const interval = getPeriodInterval(period);
    const result = [];
    assignments.forEach(a => {
      if (a.statut === 'Annulé' || a.statut === 'Indispo') return;
      if (a.extra_id !== extra.id && a.extra_id !== extra.email && a.extra_email !== extra.email) return;
      const svc = services.find(s => s.id === a.service_id);
      if (!svc?.date) return;
      const svcDate = parseISO(svc.date);
      if (!isWithinInterval(svcDate, interval)) return;
      const ev = evenements.find(e => e.date && isSameDay(parseISO(e.date), svcDate));
      result.push({
        date: svc.date,
        evenementNom: ev?.nom || svc.evenement_nom || '',
        poste: svc.poste || extra.poste || '',
        heureDebut: svc.heure_debut || '',
        statut: a.statut,
      });
    });
    const seen = new Set();
    return result.filter(d => { if (seen.has(d.date)) return false; seen.add(d.date); return true; });
  };

  const getWorkedDaysCount = (extra, period = 'month') => getWorkedDaysDetail(extra, period).length;

  // ─── Envoi ─────────────────────────────────────────────────────────────────

  const sendMutation = useMutation({
    mutationFn: async (dayStrs) => {
      const arr = Array.isArray(dayStrs) ? dayStrs : [dayStrs];
      let totalSent = 0;
      for (const dayStr of arr) {
        const res = await base44.functions.invoke('sendPlanningEmails', { date: dayStr });
        totalSent += res.data?.sent || 0;
      }
      return totalSent;
    },
    onSuccess: (totalSent) => {
      toast({ title: '✅ Emails envoyés', description: `${totalSent} email(s) envoyé(s)` });
      qc.invalidateQueries(['assignments']);
      setShowRecapModal(false);
    },
    onError: (e) => {
      toast({ title: '❌ Erreur', description: e.message, variant: 'destructive' });
    },
  });

  const isAllConfirmedForEvent = (evenement) => {
    const activePostes = getActivePostes(evenement.type_evenement);
    for (const poste of activePostes) {
      const needed = getNeedForEventPoste(evenement, poste);
      if (needed > 0 && getConfirmedForEventPoste(evenement, poste) < needed) return false;
    }
    return true;
  };

  const getMissingPostes = (evenement) => {
    const activePostes = getActivePostes(evenement.type_evenement);
    return activePostes
      .map(poste => ({ poste, needed: getNeedForEventPoste(evenement, poste), confirmed: getConfirmedForEventPoste(evenement, poste) }))
      .filter(r => r.needed > 0 && r.confirmed < r.needed)
      .map(r => ({ ...r, manque: r.needed - r.confirmed }));
  };

  const headerLabel = format(monthDate, 'MMMM yyyy', { locale: fr });

  const openModal = (extra, day, e) => {
    e.stopPropagation();
    setSelectedCell({ extra, date: format(day, 'yyyy-MM-dd') });
  };

  // Tous les postes actifs sur le mois (union)
  const allActivePostes = POSTES.filter(poste =>
    monthEvenements.some(ev => getActivePostes(ev.type_evenement).includes(poste))
  );

  return (
    <div className="p-4 md:p-6 space-y-5 max-w-full mx-auto">
      {/* Header */}
      <div className="flex items-center justify-between flex-wrap gap-3">
        <div>
          <h2 className="text-2xl font-bold">Planning Équipe</h2>
          <p className="text-muted-foreground text-sm mt-1 capitalize">{headerLabel}</p>
        </div>
        <div className="flex items-center gap-3 justify-center flex-wrap">
          <div className="flex rounded-lg border border-border overflow-hidden">
            <button
              onClick={() => setViewMode('planning')}
              className={`flex items-center gap-1.5 px-3 py-1.5 text-xs font-medium transition-colors ${
                viewMode === 'planning' ? 'bg-primary text-primary-foreground' : 'bg-card text-muted-foreground hover:bg-muted'
              }`}
            >
              <LayoutList size={13} /> Planning
            </button>
            <button
              onClick={() => setViewMode('agenda')}
              className={`flex items-center gap-1.5 px-3 py-1.5 text-xs font-medium transition-colors border-l border-border ${
                viewMode === 'agenda' ? 'bg-primary text-primary-foreground' : 'bg-card text-muted-foreground hover:bg-muted'
              }`}
            >
              <CalendarDays size={13} /> Agenda
            </button>
          </div>
          <MonthNavigator currentDate={monthDate} onDateChange={setMonthDate} />
          <div className="relative">
            <Button variant="outline" size="icon" className="h-9 w-9" onClick={() => setShowMenuDots(!showMenuDots)}><MoreVertical size={16} /></Button>
            {showMenuDots && (
              <div className="absolute right-0 top-full mt-2 w-48 bg-card border border-border rounded-lg shadow-lg py-1 z-10">
                <button onClick={() => { setShowDispoGroupee(true); setShowMenuDots(false); }} className="w-full text-left px-3 py-2 text-sm hover:bg-muted transition-colors flex items-center gap-2">📋 Demande de dispo</button>
                <button onClick={() => { setShowRecapJours(true); setShowMenuDots(false); }} className="w-full text-left px-3 py-2 text-sm hover:bg-muted transition-colors flex items-center gap-2"><BarChart2 size={14} /> Réponses</button>
                <button onClick={() => { (onOpenSettings ? onOpenSettings() : navigate('/effectif-settings')); setShowMenuDots(false); }} className="w-full text-left px-3 py-2 text-sm hover:bg-muted transition-colors flex items-center gap-2"><Settings size={14} /> Paramètres</button>
              </div>
            )}
          </div>
        </div>
      </div>

      {/* Vue Agenda */}
      {viewMode === 'agenda' && (
        <AgendaView
          currentDate={monthDate}
          evenements={evenements}
          services={monthServices}
          assignments={assignments}
          extras={activeExtras}
          effectifSettings={effectifSettings}
          onOpenEvent={(ev) => {
            const dayEvs = evenements.filter(e => e.date === ev.date);
            setSelectedEventDay({ date: ev.date, evenement: ev, evenements: dayEvs });
          }}
          onSendDay={(day) => setShowRecapModal([day])}
          sendPending={sendMutation.isPending}
        />
      )}

      {viewMode === 'planning' && <>
      {/* Légende */}
      <div className="flex flex-wrap gap-2 items-center">
        <span className="text-xs text-muted-foreground font-medium">Légende :</span>
        {Object.entries(statutColors).map(([s, cls]) => (
          <span key={s} className={`text-xs px-2 py-0.5 rounded-full font-medium ${cls}`}>{s}</span>
        ))}
      </div>

      {monthEvenements.length === 0 && (
        <div className="bg-card rounded-2xl border border-border p-12 text-center text-muted-foreground text-sm">
          Aucun événement ce mois-ci.
        </div>
      )}

      {monthEvenements.length > 0 && (
      <div className="space-y-3">
        <div className="flex items-center gap-2">
          <span className="text-xs text-muted-foreground font-medium">Tableau de planning</span>
          <HelpTooltip text="Définissez vos tranches d'effectifs dans les paramètres pour que le nombre d'extras nécessaires soit calculé automatiquement selon le nombre d'invités." />
        </div>
        <div className="bg-card rounded-2xl border border-border shadow-sm overflow-x-auto">
        <table className="w-full text-xs border-collapse">
          <thead>
            <tr className="border-b border-border">
              {/* Colonne Équipe */}
              <th className="text-left px-3 py-2.5 font-semibold text-sm sticky left-0 bg-card z-10 min-w-[120px] border-r border-border">
                Équipe
              </th>
              {/* Une colonne par événement */}
              {monthEvenements.map(ev => {
                const evDate = parseISO(ev.date);
                const weekend = isWeekend(evDate);
                const allDone = isAllConfirmedForEvent(ev);
                const isToday = isSameDay(evDate, new Date());
                return (
                  <th
                    key={ev.id}
                    onClick={() => setSelectedEventDay({ date: ev.date, evenement: ev, evenements: [ev] })}
                    className={`text-center px-2 py-2 min-w-[80px] max-w-[100px] font-medium cursor-pointer hover:bg-primary/10 transition-colors border-r border-border ${allDone ? 'bg-emerald-50' : weekend ? 'bg-muted/40' : ''}`}
                    title={`${ev.nom} — Gérer les attributions`}
                  >
                    {/* Jour abrégé */}
                    <div className="text-[10px] text-muted-foreground capitalize">
                      {format(evDate, 'EEE', { locale: fr })}
                    </div>
                    {/* Numéro du jour */}
                    <div className={`text-sm font-bold mb-1 ${
                      isToday ? 'bg-primary text-primary-foreground rounded-full w-6 h-6 flex items-center justify-center mx-auto' : ''
                    }`}>
                      {format(evDate, 'd')}
                    </div>
                    {/* Nom de l'événement */}
                    <div className="text-[10px] font-semibold text-primary leading-tight truncate max-w-[90px] mx-auto px-1 py-0.5 bg-primary/10 rounded">
                      {ev.nom}
                    </div>
                    {/* Nb invités */}
                    {ev.nb_invites > 0 && (
                      <div className="text-[9px] text-muted-foreground mt-0.5">{ev.nb_invites} pers.</div>
                    )}
                  </th>
                );
              })}
              <th className="min-w-[0px] border-l border-border w-0 p-0"></th>
            </tr>
          </thead>
          <tbody>
            {/* Lignes par extra */}
            {activeExtras.map((extra, idx) => {
              const workedDates = getWorkedDates(extra);
              const hasConsecutive = hasTwoDaysInARow(workedDates);
              return (
                <tr key={extra.id} className={`border-b border-border ${idx % 2 === 0 ? 'bg-white' : 'bg-muted/30'}`}>
                  <td className={`px-3 py-2 sticky left-0 z-10 border-r border-border font-medium ${idx % 2 === 0 ? 'bg-white' : 'bg-muted/30'}`}>
                    <div className="flex items-center gap-1.5">
                      {hasConsecutive && (
                        <AlertTriangle size={12} className="text-amber-500 shrink-0" title="Jours consécutifs détectés" />
                      )}
                      <span className="truncate max-w-[110px]">{extra.nom}</span>
                      {extra._isCollab && (
                        <span className="shrink-0 text-[9px] px-1.5 py-0.5 rounded bg-blue-100 text-blue-700 font-semibold leading-none">●</span>
                      )}
                    </div>
                  </td>
                  {monthEvenements.map(ev => {
                    const evAssignments = getAssignmentsForExtraEvent(extra, ev);
                    const cell = getCellInfo(extra, ev);
                    const evDate = parseISO(ev.date);
                    const weekend = isWeekend(evDate);
                    const evActivePostes = getActivePostes(ev.type_evenement);
                    return (
                      <td
                        key={ev.id}
                        className={`text-center px-1 py-1 border-r border-border ${weekend ? 'bg-muted/20' : ''}`}
                      >
                        <PosteDropdownCell
                          extra={extra}
                          evenement={ev}
                          assignments={assignments}
                          services={monthServices}
                          activePostes={evActivePostes}
                          evAssignments={evAssignments}
                          allEvenements={evenements}
                        />
                      </td>
                    );
                  })}
                  <td className="border-l border-border w-0 p-0"></td>
                </tr>
              );
            })}

            {/* Lignes de besoins par poste */}
            {allActivePostes.map(poste => (
              <tr key={`needs-${poste}`} className="border-b border-border bg-slate-50">
                <td className="px-3 py-2 sticky left-0 z-10 border-r border-border font-semibold text-[10px] uppercase tracking-wider text-slate-700 bg-slate-50">
                  {poste}
                </td>
                {monthEvenements.map(ev => {
                  const needed = getNeedForEventPoste(ev, poste);
                  const confirmed = getConfirmedForEventPoste(ev, poste);
                  const isCovered = confirmed >= needed && needed > 0;
                  const isPartial = confirmed > 0 && confirmed < needed;
                  const isActive = getActivePostes(ev.type_evenement).includes(poste);

                  if (!isActive || needed === 0) {
                    return (
                      <td key={ev.id} className="text-center px-1 py-2 border-r border-border">
                        <span className="text-muted-foreground/40 text-[10px]">—</span>
                      </td>
                    );
                  }
                  return (
                    <td
                      key={ev.id}
                      className="text-center px-1 py-2 border-r border-border cursor-pointer hover:bg-primary/5 transition-colors"
                      onClick={() => setSelectedEventDay({ date: ev.date, evenement: ev, evenements: [ev] })}
                    >
                      <div className="flex items-center justify-center gap-0.5">
                        <span className={`text-xs font-bold ${isCovered ? 'text-emerald-600' : isPartial ? 'text-amber-600' : 'text-red-600'}`}>
                          {confirmed}/{needed}
                        </span>
                        {isCovered
                          ? <Check size={10} className="text-emerald-600" />
                          : <AlertCircle size={10} className={isPartial ? 'text-amber-600' : 'text-red-600'} />
                        }
                      </div>
                    </td>
                  );
                })}
                <td className="border-l border-border w-0 p-0"></td>
              </tr>
            ))}

            {/* Boutons Envoyer par événement */}
            <tr className="border-t-2 border-border bg-card">
              <td className="px-3 py-3 sticky left-0 z-10 border-r border-border font-semibold text-[10px] uppercase tracking-wider">
                Actions
              </td>
              {monthEvenements.map(ev => {
                const allConfirmed = isAllConfirmedForEvent(ev);
                return (
                  <td key={ev.id} className={`text-center px-1 py-2 border-r border-border ${allConfirmed ? 'bg-emerald-50' : ''}`}>
                    <Button
                      size="xs"
                      variant="default"
                      disabled={sendMutation.isPending}
                      onClick={() => setShowRecapModal([ev.date])}
                      className={`gap-1 text-[10px] h-7 px-2 ${allConfirmed ? 'bg-emerald-500 hover:bg-emerald-600 border-emerald-500' : 'bg-orange-500 hover:bg-orange-600 border-orange-500'}`}
                    >
                      <Send size={11} />
                      Envoyer
                    </Button>
                  </td>
                );
              })}
              <td className="border-l border-border w-0 p-0"></td>
            </tr>
          </tbody>
        </table>
        {activeExtras.length === 0 && (
          <div className="text-center text-muted-foreground text-sm py-12">Aucun extra actif trouvé.</div>
        )}
      </div>
        </div>
      )}
      </> /* end planning view */}

      {selectedDay && (
        <DayOverviewModal
          date={selectedDay}
          services={services}
          extras={activeExtras}
          onClose={() => setSelectedDay(null)}
        />
      )}

      {selectedEventDay && (
        <EventAssignmentModal
          date={selectedEventDay.date}
          evenement={selectedEventDay.evenement}
          evenements={selectedEventDay.evenements || [selectedEventDay.evenement]}
          onClose={() => setSelectedEventDay(null)}
        />
      )}

      {showRecapModal && (
        <SendRecapModal
          days={showRecapModal}
          evenements={evenements}
          services={monthServices}
          assignments={assignments}
          extras={activeExtras}
          effectifSettings={effectifSettings}
          onConfirm={(dayStrs) => sendMutation.mutate(dayStrs)}
          onClose={() => setShowRecapModal(false)}
          isPending={sendMutation.isPending}
        />
      )}

      {workedDaysModal && (
        <ExtraWorkedDaysModal
          extra={workedDaysModal.extra}
          workedDays={workedDaysModal.workedDays}
          onClose={() => setWorkedDaysModal(null)}
        />
      )}

      {selectedCell && (
        <DayCellModal
          extra={selectedCell.extra}
          date={selectedCell.date}
          shifts={getShiftsForExtraDay(selectedCell.extra.id, parseISO(selectedCell.date))}
          assignments={assignments.filter(a => {
            const svc = monthServices.find(s => s.id === a.service_id && s.date === selectedCell.date);
            return svc && (a.extra_id === selectedCell.extra.id || a.extra_email === selectedCell.extra.email);
          })}
          services={services}
          onClose={() => setSelectedCell(null)}
        />
      )}

      {showRecapJours && (
        <RecapJoursModal
          extras={activeExtras}
          getWorkedDaysDetail={getWorkedDaysDetail}
          currentDate={monthDate}
          onClose={() => setShowRecapJours(false)}
        />
      )}

      {showDispoGroupee && (
        <NouveauTunnel
          defaultStep="dispo"
          defaultDestinataire="extras"
          onClose={() => setShowDispoGroupee(false)}
        />
      )}
    </div>
  );
}