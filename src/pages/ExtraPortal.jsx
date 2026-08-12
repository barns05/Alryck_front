import { useEffect, useState } from 'react';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { base44 } from '@/api/base44Client';
import { format, parseISO, differenceInDays, isSameMonth, isSameDay, startOfMonth, endOfMonth, startOfWeek, endOfWeek, addDays, isToday } from 'date-fns';
import { fr } from 'date-fns/locale';
import { CheckCircle, XCircle, Calendar, Clock, ChevronLeft, ChevronRight, MapPin, LogOut, Bell } from 'lucide-react';
import { Button } from '@/components/ui/button';
import ExtraChatPortal from '@/components/extras/ExtraChatPortal';
import PortalHeader from '@/components/portal/PortalHeader';
import PortalPhotosSection from '@/components/portal/PortalPhotosSection';
import FicheServiceView from '@/components/extras/FicheServiceView';
import PortalAuthModal from '@/components/portal/PortalAuthModal';
import { usePortalAuth } from '@/hooks/usePortalAuth';

const statusConfig = {
  'En attente': { color: 'bg-amber-100 text-amber-700', label: 'En attente de réponse' },
  'Dispo':      { color: 'bg-blue-100 text-blue-700',   label: 'Disponible ✓' },
  'Indispo':    { color: 'bg-red-100 text-red-600',     label: 'Indisponible' },
  'Confirmé':   { color: 'bg-emerald-100 text-emerald-700', label: 'Confirmé ✅' },
  'Annulé':     { color: 'bg-slate-100 text-slate-500', label: 'Annulé' },
};

export default function ExtraPortal() {
  const qc = useQueryClient();
  const [extra, setExtra] = useState(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);
  const [currentDate, setCurrentDate] = useState(new Date());
  const [selectedDay, setSelectedDay] = useState(null);

  const token = new URLSearchParams(window.location.search).get('token');

  useEffect(() => {
    if (!token) { setError('Lien invalide.'); setLoading(false); return; }
    base44.entities.Extra.filter({ lien_extra_token: token })
      .then(results => {
        if (!results || results.length === 0) {
          setError('Espace introuvable. Vérifiez le lien ou contactez votre organisateur.');
        } else {
          setExtra(results[0]);
        }
        setLoading(false);
      });
  }, [token]);

  const { authStep, authError, isAuthenticated, handleRegister, handleLogin, handleForgotPassword, handleSkip, handleLogout } = usePortalAuth({
    token,
    entityType: 'extra',
    entityId: extra?.id,
    entityEmail: extra?.email,
    portalPassword: extra?.portal_password,
    onSavePassword: async (hash, email) => {
      await base44.entities.Extra.update(extra.id, { portal_password: hash, portal_email: email });
      setExtra(prev => ({ ...prev, portal_password: hash, portal_email: email }));
    },
    onSendForgotLink: async (email) => {
      await base44.integrations.Core.SendEmail({
        to: email,
        subject: 'Accès à votre espace planning',
        body: `Bonjour,\n\nVoici votre lien d'accès à votre espace planning :\n${window.location.href}\n\nCordialement`,
      });
    },
  });

  const { data: assignments = [] } = useQuery({
    queryKey: ['portal-assignments', extra?.id],
    queryFn: async () => {
      // ServiceAssignment.extra_id peut être l'email OU l'id, on cherche les deux
      const [byEmail, byId] = await Promise.all([
        extra.email ? base44.entities.ServiceAssignment.filter({ extra_id: extra.email }, 'created_date', 200) : [],
        base44.entities.ServiceAssignment.filter({ extra_id: extra.id }, 'created_date', 200),
      ]);
      // Fusionner sans doublons
      const map = {};
      [...byEmail, ...byId].forEach(a => { map[a.id] = a; });
      return Object.values(map);
    },
    enabled: !!extra,
  });

  const { data: services = [] } = useQuery({
    queryKey: ['portal-services'],
    queryFn: () => base44.entities.Service.list('-date', 300),
    enabled: !!extra,
  });

  const { data: evenements = [] } = useQuery({
    queryKey: ['portal-evenements'],
    queryFn: () => base44.entities.Evenement.list('-date', 500),
    enabled: !!extra,
  });

  // Souscription temps réel aux assignments
  useEffect(() => {
    if (!extra) return;
    const unsubscribe = base44.entities.ServiceAssignment.subscribe(() => {
      qc.invalidateQueries(['portal-assignments', extra?.id]);
    });
    return unsubscribe;
  }, [extra?.id]);

  const updateMutation = useMutation({
    mutationFn: async ({ assignment, statut }) => {
      // Appel backend qui met à jour + notifie les admins
      await base44.functions.invoke('notifyExtraResponse', {
        assignmentId: assignment.id,
        statut,
        extraId: extra?.id,
        previousStatut: assignment.statut, // pour détecter Indispo après Confirmé
      });
    },
    onSuccess: () => qc.invalidateQueries(['portal-assignments', extra?.id]),
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

  const serviceDateMap = {};
  assignments.forEach(a => {
    const svc = getService(a.service_id);
    if (svc?.date) {
      if (!serviceDateMap[svc.date]) serviceDateMap[svc.date] = [];
      serviceDateMap[svc.date].push({ assignment: a, service: svc });
    }
  });

  const dayLabels = ['Lun', 'Mar', 'Mer', 'Jeu', 'Ven', 'Sam', 'Dim'];

  const activeAssignments = assignments
    .filter(a => a.statut !== 'Annulé')
    .sort((a, b) => (getService(a.service_id)?.date || '').localeCompare(getService(b.service_id)?.date || ''));

  const pending = activeAssignments.filter(a => a.statut === 'En attente');
  const confirmed = activeAssignments.filter(a => a.statut === 'Confirmé' || a.statut === 'Dispo');

  const selectedDayItems = selectedDay
    ? Object.entries(serviceDateMap)
        .filter(([date]) => isSameDay(parseISO(date), selectedDay))
        .flatMap(([, items]) => items)
    : [];

  if (loading) return (
    <div className="min-h-screen flex items-center justify-center bg-background">
      <div className="w-8 h-8 border-4 border-muted border-t-primary rounded-full animate-spin" />
    </div>
  );

  if (error) return (
    <div className="min-h-screen flex items-center justify-center bg-background p-4">
      <div className="text-center max-w-sm">
        <div className="text-5xl mb-4">🔒</div>
        <h2 className="text-xl font-bold mb-2">Accès impossible</h2>
        <p className="text-muted-foreground text-sm">{error}</p>
      </div>
    </div>
  );

  return (
    <div className="min-h-screen bg-background">
      {authStep && (
        <PortalAuthModal
          mode={authStep}
          entityEmail={extra?.portal_email || extra?.email || ''}
          entityNom={extra?.nom}
          onRegister={handleRegister}
          onLogin={handleLogin}
          onForgotPassword={handleForgotPassword}
          onSkip={handleSkip}
          error={authError}
          portalType="extra"
        />
      )}
      <PortalHeader
        subtitle="Votre espace planning"
        userLabel={extra.nom}
        userSub={extra.poste}
        portalType="extra"
      />

      <div className="max-w-2xl mx-auto px-4 py-6 space-y-6">
        {/* Déconnexion */}
        {isAuthenticated && extra?.portal_password && (
          <div className="flex justify-end">
            <button onClick={handleLogout} className="flex items-center gap-1.5 text-xs text-muted-foreground hover:text-foreground transition-colors">
              <LogOut size={13} /> Se déconnecter
            </button>
          </div>
        )}
        {/* Stats */}
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

        {/* À confirmer */}
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
                evenements={evenements}
                onUpdate={updateMutation}
                showActions
              />
            ))}
          </div>
        )}

        {/* Calendrier */}
        <div className="bg-card rounded-2xl border border-border shadow-sm overflow-hidden">
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

        {/* Détail jour */}
        {selectedDay && selectedDayItems.length > 0 && (
          <div className="space-y-3">
            <h3 className="font-semibold capitalize">{format(selectedDay, 'EEEE d MMMM yyyy', { locale: fr })}</h3>
            {selectedDayItems.map(({ assignment, service }) => (
              <AssignmentCard
                key={assignment.id}
                assignment={assignment}
                service={service}
                evenements={evenements}
                onUpdate={updateMutation}
                showActions={assignment.statut === 'En attente'}
              />
            ))}
          </div>
        )}

        {/* Mes services */}
        {confirmed.length > 0 && (
          <div className="space-y-3">
            <h3 className="font-semibold text-sm text-muted-foreground uppercase tracking-wide">Mes prochains services</h3>
            {confirmed.map(assignment => (
              <AssignmentCard
                key={assignment.id}
                assignment={assignment}
                service={getService(assignment.service_id)}
                evenements={evenements}
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

        {/* Fiches de service */}
        <FicheServiceView extraId={extra.id} />

        {/* Photos */}
        <PortalPhotosSection
          sourceType="extra"
          sourceId={extra.id}
          sourceNom={extra.nom}
        />

        {/* Messagerie */}
        <ExtraChatPortal
          extraId={extra.id}
          extraNom={extra.nom}
          extraEmail={extra.email}
        />
      </div>
    </div>
  );
}

function AssignmentCard({ assignment, service, evenements = [], onUpdate, showActions }) {
  const cfg = statusConfig[assignment.statut] || statusConfig['En attente'];
  const days = service?.date ? differenceInDays(new Date(service.date), new Date()) : null;

  // Trouver l'événement associé au service
  const evenement = evenements.find(e =>
    (service?.evenement_id && e.id === service.evenement_id) ||
    (service?.date && e.date === service.date)
  );

  const isPending = assignment.statut === 'En attente';
  const isConfirmed = assignment.statut === 'Confirmé';
  const isDispo = assignment.statut === 'Dispo';

  return (
    <div className={`bg-card rounded-2xl border shadow-sm p-4 space-y-3 transition-all ${
      isPending ? 'border-amber-300 ring-1 ring-amber-200' :
      isConfirmed ? 'border-emerald-300' :
      isDispo ? 'border-blue-300' :
      'border-border'
    }`}>
      {/* Badge statut + jours restants */}
      <div className="flex items-center justify-between">
        <span className={`text-xs px-2.5 py-1 rounded-full font-medium ${cfg.color}`}>
          {isPending && <Bell size={10} className="inline mr-1 animate-pulse" />}
          {cfg.label}
        </span>
        {days !== null && days >= 0 && (
          <span className="text-xs text-muted-foreground font-medium">
            {days === 0 ? "Aujourd'hui" : days === 1 ? 'Demain' : `J−${days}`}
          </span>
        )}
      </div>

      {/* Infos principales */}
      <div className="space-y-1.5">
        {evenement?.nom && (
          <p className="font-bold text-base leading-tight">{evenement.nom}</p>
        )}
        <p className="text-sm text-muted-foreground">
          {service?.date ? format(parseISO(service.date), 'EEEE d MMMM yyyy', { locale: fr }) : '—'}
        </p>
        <div className="flex flex-wrap items-center gap-3 text-sm mt-1">
          {service?.poste && (
            <span className="inline-flex items-center gap-1.5 bg-primary/10 text-primary font-semibold px-2.5 py-0.5 rounded-full text-xs">
              {service.poste}
            </span>
          )}
          {service?.heure_debut && (
            <span className="flex items-center gap-1 text-muted-foreground">
              <Clock size={12} />
              {service.heure_debut}{service.heure_fin ? ` – ${service.heure_fin}` : ''}
            </span>
          )}
          {(evenement?.lieu_nom || service?.lieu) && (
            <span className="flex items-center gap-1 text-muted-foreground">
              <MapPin size={12} />
              {evenement?.lieu_nom || service?.lieu}
            </span>
          )}
        </div>
      </div>

      {service?.notes && (
        <p className="text-xs text-muted-foreground border-t border-border pt-2">{service.notes}</p>
      )}

      {/* Boutons Confirmer / Décliner */}
      {showActions && (
        <div className="flex gap-2 pt-1">
          <Button
            size="sm"
            className="flex-1 gap-2 bg-emerald-500 hover:bg-emerald-600 text-white border-0"
            onClick={() => onUpdate.mutate({ assignment, statut: 'Dispo' })}
            disabled={onUpdate.isPending}
          >
            <CheckCircle size={14} /> ✅ Confirmer
          </Button>
          <Button
            size="sm" variant="outline"
            className="flex-1 gap-2 border-red-300 text-red-600 hover:bg-red-50"
            onClick={() => onUpdate.mutate({ assignment, statut: 'Indispo' })}
            disabled={onUpdate.isPending}
          >
            <XCircle size={14} /> ❌ Décliner
          </Button>
        </div>
      )}

      {(isConfirmed || isDispo) && (
        <div className="flex items-center gap-1.5 text-xs text-emerald-600 font-medium pt-1">
          <CheckCircle size={12} /> Vous avez confirmé votre présence
        </div>
      )}
    </div>
  );
}