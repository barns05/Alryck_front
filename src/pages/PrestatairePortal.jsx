import { useEffect, useState } from 'react';
import { base44 } from '@/api/base44Client';
import PortalAuthModal from '@/components/portal/PortalAuthModal';
import { usePortalAuth } from '@/hooks/usePortalAuth';
import { format, parseISO, isPast } from 'date-fns';
import { fr } from 'date-fns/locale';
import { Calendar, MapPin, Clock, Briefcase, Phone, Mail, CheckCircle, XCircle, PartyPopper, ChevronLeft, ChevronRight, LogOut } from 'lucide-react';
import { format as formatDate, startOfMonth, endOfMonth, startOfWeek, endOfWeek, addDays, isSameMonth, isSameDay, isToday as isTodayFn } from 'date-fns';
import PrestataireChatPortal from '@/components/prestataires/PrestataireChatPortal';
import PropositionsDateSection from '@/components/prestataires/PropositionsDateSection';
import PortalHeader from '@/components/portal/PortalHeader';
import PortalPhotosSection from '@/components/portal/PortalPhotosSection';
import { Button } from '@/components/ui/button';
import PlanSallePrestataireSection from '@/components/prestataires/PlanSallePrestataireSection';
import { peutVoirPlanSalle } from '@/lib/planSalleAccess';

const statutColors = {
  'En attente': 'bg-amber-100 text-amber-700 border-amber-200',
  'Confirmé':   'bg-emerald-100 text-emerald-700 border-emerald-200',
  'Indispo':    'bg-red-100 text-red-600 border-red-200',
  'Annulé':     'bg-slate-100 text-slate-500 border-slate-200',
  'Terminé':    'bg-slate-100 text-slate-500 border-slate-200',
};

export default function PrestatairePortal() {
  const [prestataire, setPrestataire] = useState(null);
  const [dispos, setDispos] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);
  const [updatingId, setUpdatingId] = useState(null);
  const [currentDate, setCurrentDate] = useState(new Date());
  const [selectedDay, setSelectedDay] = useState(null);

  const token = new URLSearchParams(window.location.search).get('token');

  useEffect(() => {
    if (!token) { setError('Lien invalide.'); setLoading(false); return; }
    (async () => {
      const results = await base44.entities.Prestataire.filter({ lien_token: token });
      if (!results || results.length === 0) {
        setError('Espace introuvable. Vérifiez le lien ou contactez votre organisateur.');
        setLoading(false);
        return;
      }
      const p = results[0];
      setPrestataire(p);
      const d = await base44.entities.DispoPrestataire.filter({ prestataire_id: p.id }, '-date', 200);
      setDispos(d.sort((a, b) => (a.date || '').localeCompare(b.date || '')));
      setLoading(false);
    })();
  }, [token]);

  const { authStep, authError, isAuthenticated, handleRegister, handleLogin, handleForgotPassword, handleSkip, handleLogout } = usePortalAuth({
    token,
    entityType: 'prestataire',
    entityId: prestataire?.id,
    entityEmail: prestataire?.email,
    portalPassword: prestataire?.portal_password,
    onSavePassword: async (hash, email) => {
      await base44.entities.Prestataire.update(prestataire.id, { portal_password: hash, portal_email: email });
      setPrestataire(prev => ({ ...prev, portal_password: hash, portal_email: email }));
    },
    onSendForgotLink: async (email) => {
      await base44.integrations.Core.SendEmail({
        to: email,
        subject: 'Accès à votre espace prestataire',
        body: `Bonjour,\n\nVoici votre lien d'accès à votre espace prestataire :\n${window.location.href}\n\nCordialement`,
      });
    },
  });

  const updateStatut = async (id, statut) => {
    setUpdatingId(id);
    await base44.entities.DispoPrestataire.update(id, { statut });
    setDispos(prev => prev.map(d => d.id === id ? { ...d, statut } : d));
    setUpdatingId(null);
  };

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

  const upcoming = dispos.filter(d => d.date && !isPast(parseISO(d.date)));
  const past = dispos.filter(d => d.date && isPast(parseISO(d.date)));
  const confirmed = dispos.filter(d => d.statut === 'Confirmé').length;
  const pending = dispos.filter(d => d.statut === 'En attente').length;

  // Calendrier
  const monthStart = startOfMonth(currentDate);
  const monthEnd = endOfMonth(currentDate);
  const gridStart = startOfWeek(monthStart, { weekStartsOn: 1 });
  const gridEnd = endOfWeek(monthEnd, { weekStartsOn: 1 });
  const calDays = [];
  let calD = gridStart;
  while (calD <= gridEnd) { calDays.push(calD); calD = addDays(calD, 1); }

  const dispoDateMap = {};
  dispos.forEach(d => {
    if (d.date) {
      if (!dispoDateMap[d.date]) dispoDateMap[d.date] = [];
      dispoDateMap[d.date].push(d);
    }
  });

  const selectedDayDispos = selectedDay
    ? (dispoDateMap[formatDate(selectedDay, 'yyyy-MM-dd')] || [])
    : [];

  const dayLabels = ['Lun', 'Mar', 'Mer', 'Jeu', 'Ven', 'Sam', 'Dim'];

  return (
    <div className="min-h-screen bg-background">
      {authStep && (
        <PortalAuthModal
          mode={authStep}
          entityEmail={prestataire?.portal_email || prestataire?.email || ''}
          entityNom={prestataire?.nom}
          onRegister={handleRegister}
          onLogin={handleLogin}
          onForgotPassword={handleForgotPassword}
          onSkip={handleSkip}
          error={authError}
          portalType="prestataire"
        />
      )}
      <PortalHeader
        subtitle="Votre espace prestataire"
        userLabel={prestataire.nom}
        userSub={prestataire.domaine}
        portalType="prestataire"
      />

      <div className="max-w-2xl mx-auto px-4 py-6 space-y-6">
        {isAuthenticated && prestataire?.portal_password && (
          <div className="flex justify-end">
            <button onClick={handleLogout} className="flex items-center gap-1.5 text-xs text-muted-foreground hover:text-foreground transition-colors">
              <LogOut size={13} /> Se déconnecter
            </button>
          </div>
        )}
        {/* Infos prestataire */}
        <div className="bg-card rounded-2xl border border-border p-5">
          <div className="flex items-center gap-3 mb-3">
            <div className="w-10 h-10 bg-primary/10 rounded-xl flex items-center justify-center">
              <Briefcase size={18} className="text-primary" />
            </div>
            <div>
              <h2 className="font-bold">{prestataire.nom}</h2>
              {prestataire.domaine && (
                <span className="text-xs text-muted-foreground">{prestataire.domaine}</span>
              )}
            </div>
          </div>
          <div className="flex flex-wrap gap-3 text-xs text-muted-foreground">
            {prestataire.telephone && <span className="flex items-center gap-1"><Phone size={11} />{prestataire.telephone}</span>}
            {prestataire.email && <span className="flex items-center gap-1"><Mail size={11} />{prestataire.email}</span>}
          </div>
        </div>

        {/* Stats */}
        <div className="grid grid-cols-4 gap-3">
          <div className="bg-card rounded-2xl border border-border p-3 text-center">
            <p className="text-xl font-bold">{dispos.length}</p>
            <p className="text-xs text-muted-foreground mt-0.5">Total</p>
          </div>
          <div className="bg-amber-50 border border-amber-200 rounded-2xl p-3 text-center">
            <p className="text-xl font-bold text-amber-600">{pending}</p>
            <p className="text-xs text-amber-500 mt-0.5">En attente</p>
          </div>
          <div className="bg-emerald-50 border border-emerald-200 rounded-2xl p-3 text-center">
            <p className="text-xl font-bold text-emerald-600">{confirmed}</p>
            <p className="text-xs text-emerald-500 mt-0.5">Confirmés</p>
          </div>
          <div className="bg-blue-50 border border-blue-200 rounded-2xl p-3 text-center">
            <p className="text-xl font-bold text-blue-600">{upcoming.length}</p>
            <p className="text-xs text-blue-500 mt-0.5">À venir</p>
          </div>
        </div>

        {/* Changements de date à confirmer */}
        <PropositionsDateSection prestataireId={prestataire.id} />

        {/* Calendrier */}
        <div className="bg-card rounded-2xl border border-border shadow-sm overflow-hidden">
          <div className="flex items-center justify-between px-4 py-3 border-b border-border">
            <h3 className="font-semibold capitalize">{formatDate(currentDate, 'MMMM yyyy', { locale: fr })}</h3>
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
            {calDays.map(day => {
              const key = formatDate(day, 'yyyy-MM-dd');
              const items = dispoDateMap[key] || [];
              const inMonth = isSameMonth(day, currentDate);
              const todayDay = isTodayFn(day);
              const isSelected = selectedDay && isSameDay(day, selectedDay);
              return (
                <div
                  key={day.toISOString()}
                  onClick={() => items.length > 0 && inMonth && setSelectedDay(isSameDay(day, selectedDay) ? null : day)}
                  className={`min-h-[64px] p-1.5 transition-colors
                    ${inMonth ? 'bg-card' : 'bg-muted/20'}
                    ${isSelected ? 'ring-2 ring-inset ring-primary/30 bg-primary/5' : ''}
                    ${items.length > 0 && inMonth ? 'cursor-pointer hover:bg-muted/30' : ''}
                  `}
                >
                  <span className={`text-xs font-bold w-6 h-6 flex items-center justify-center rounded-full mb-1
                    ${todayDay ? 'bg-primary text-primary-foreground' : inMonth ? 'text-foreground' : 'text-muted-foreground/40'}
                  `}>
                    {formatDate(day, 'd')}
                  </span>
                  {items.length > 0 && inMonth && (
                    <div className="space-y-0.5">
                      {items.slice(0, 2).map((item, i) => (
                        <div key={i} className={`rounded text-[9px] px-1 py-0.5 truncate font-medium
                          ${item.statut === 'Confirmé' ? 'bg-emerald-100 text-emerald-700' :
                            item.statut === 'En attente' ? 'bg-amber-100 text-amber-700' :
                            item.statut === 'Indispo' ? 'bg-red-100 text-red-600' :
                            'bg-slate-100 text-slate-500'}
                        `}>
                          {item.heure_debut || item.evenement_nom || item.lieu || '•'}
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
        {selectedDay && selectedDayDispos.length > 0 && (
          <div className="space-y-3">
            <h3 className="font-semibold capitalize">{formatDate(selectedDay, 'EEEE d MMMM yyyy', { locale: fr })}</h3>
            {selectedDayDispos.map(d => (
              <DispoCard key={d.id} dispo={d} onUpdate={updateStatut} isUpdating={updatingId === d.id} past={isPast(parseISO(d.date))} domaine={prestataire.domaine} />
            ))}
          </div>
        )}

        {/* Demandes à venir */}
        {upcoming.length > 0 ? (
          <div className="space-y-3">
            <h2 className="font-semibold text-sm uppercase tracking-wide text-muted-foreground">Demandes à venir</h2>
            {upcoming.map(d => (
              <DispoCard key={d.id} dispo={d} onUpdate={updateStatut} isUpdating={updatingId === d.id} domaine={prestataire.domaine} />
            ))}
          </div>
        ) : (
          <div className="bg-card rounded-2xl border border-border p-10 text-center">
            <Calendar size={36} className="mx-auto mb-3 text-muted-foreground/30" />
            <p className="text-muted-foreground font-medium">Aucune demande à venir</p>
          </div>
        )}

        {/* Passées */}
        {past.length > 0 && (
          <div className="space-y-3">
            <h2 className="font-semibold text-sm uppercase tracking-wide text-muted-foreground">Passées</h2>
            {past.map(d => (
              <DispoCard key={d.id} dispo={d} onUpdate={updateStatut} isUpdating={updatingId === d.id} past domaine={prestataire.domaine} />
            ))}
          </div>
        )}

        {/* Photos */}
        <PortalPhotosSection
          sourceType="prestataire"
          sourceId={prestataire.id}
          sourceNom={prestataire.nom}
        />

        {/* Messagerie */}
        <PrestataireChatPortal
          prestataireId={prestataire.id}
          prestataireNom={prestataire.nom}
          prestataireEmail={prestataire.email}
        />
      </div>
    </div>
  );
}

function DispoCard({ dispo, onUpdate, isUpdating, past, domaine }) {
  return (
    <div className={`bg-card rounded-2xl border border-border shadow-sm p-4 space-y-3 ${past ? 'opacity-60' : ''}`}>
      <div className="flex items-start justify-between gap-3">
        <div>
          <p className="font-semibold capitalize">
            {dispo.date ? format(parseISO(dispo.date), 'EEEE d MMMM yyyy', { locale: fr }) : '—'}
          </p>
          <div className="flex flex-wrap gap-3 mt-1 text-xs text-muted-foreground">
            {(dispo.heure_debut || dispo.heure_fin) && (
              <span className="flex items-center gap-1"><Clock size={11} />{dispo.heure_debut} – {dispo.heure_fin}</span>
            )}
            {dispo.lieu && <span className="flex items-center gap-1"><MapPin size={11} />{dispo.lieu}</span>}
            {dispo.evenement_nom && <span className="flex items-center gap-1"><PartyPopper size={11} />{dispo.evenement_nom}</span>}
          </div>
          {dispo.notes && (
            <p className="text-xs text-muted-foreground italic mt-1.5 bg-muted rounded-lg px-2.5 py-1.5">{dispo.notes}</p>
          )}
        </div>
        <span className={`text-[11px] px-2.5 py-1 rounded-full border font-medium shrink-0 ${statutColors[dispo.statut] || 'bg-slate-100 text-slate-600'}`}>
          {dispo.statut}
        </span>
      </div>

      {!past && dispo.statut !== 'Annulé' && dispo.statut !== 'Terminé' && (
        <div className="flex gap-2 pt-1 border-t border-border">
          <button
            disabled={isUpdating || dispo.statut === 'Confirmé'}
            onClick={() => onUpdate(dispo.id, 'Confirmé')}
            className={`flex-1 flex items-center justify-center gap-1.5 text-xs py-2 rounded-xl font-medium transition-colors
              ${dispo.statut === 'Confirmé' ? 'bg-emerald-100 text-emerald-700 cursor-default' : 'bg-emerald-50 text-emerald-700 hover:bg-emerald-100 border border-emerald-200'}`}
          >
            <CheckCircle size={13} />
            {dispo.statut === 'Confirmé' ? 'Confirmé ✓' : 'Je suis disponible'}
          </button>
          <button
            disabled={isUpdating || dispo.statut === 'Indispo'}
            onClick={() => onUpdate(dispo.id, 'Indispo')}
            className={`flex-1 flex items-center justify-center gap-1.5 text-xs py-2 rounded-xl font-medium transition-colors
              ${dispo.statut === 'Indispo' ? 'bg-red-100 text-red-600 cursor-default' : 'bg-red-50 text-red-600 hover:bg-red-100 border border-red-200'}`}
          >
            <XCircle size={13} />
            {dispo.statut === 'Indispo' ? 'Indisponible ✓' : 'Je suis indisponible'}
          </button>
        </div>
      )}
      {dispo.statut === 'Confirmé' && dispo.evenement_id && peutVoirPlanSalle(domaine) && (
        <PlanSallePrestataireSection evenementId={dispo.evenement_id} />
      )}
    </div>
  );
}