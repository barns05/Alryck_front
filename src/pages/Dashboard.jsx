import { useQuery } from '@tanstack/react-query';
import { useMemo } from 'react';
import { base44 } from '@/api/base44Client';
import { Calendar, CheckCircle, AlertTriangle, Clock, Bell, UserPlus } from 'lucide-react';
import InviterPrestataireModal from '@/components/prestataires/InviterPrestataireModal';
import { Button } from '@/components/ui/button';
import DashboardNotifications from '@/components/dashboard/DashboardNotifications';
import { format, parseISO, differenceInDays } from 'date-fns';
import { fr } from 'date-fns/locale';
import { useNavigate } from 'react-router-dom';
import { useState } from 'react';
import SendNotificationModal from '@/components/notifications/SendNotificationModal';
import { useModules } from '@/hooks/useModules';
import { getTachesManquantes, getEventStatus } from '@/utils/dossier';
import DateBadge from '@/components/ui/DateBadge';
import { isEvenementDateExacte } from '@/lib/evenementDate';
import { useOwnerCompanySettings } from '@/hooks/useOwnerCompanySettings';

function getDossierStatus(ev, fichesService, formulaires, modules = {}) {
  const manquantes = getTachesManquantes(ev, fichesService, formulaires, modules);
  const taches = ev.taches_requises || { formulaire: true, programme: true, plan_table: true, fiche_service: true };
  const total = Object.values(taches).filter(Boolean).length;
  if (total === 0) return { type: 'none', done: 0, total: 0 };
  const done = total - manquantes.length;
  if (done === total) return { type: 'complete', done, total };
  if (done === 0) return { type: 'none', done, total };
  return { type: 'partial', done, total };
}

// ─── Dashboard ────────────────────────────────────────────────────────────────

export default function Dashboard() {
  const navigate = useNavigate();
  const modules = useModules();
  const [notifModalOpen, setNotifModalOpen] = useState(false);
  const [inviterModalOpen, setInviterModalOpen] = useState(false);

  const today = useMemo(() => new Date(), []);

  const { settings: company } = useOwnerCompanySettings();

  const { data: evenements = [] } = useQuery({ queryKey: ['evenements'], queryFn: () => base44.entities.Evenement.list('-date', 500) });
  const { data: fichesService = [] } = useQuery({ queryKey: ['fiches-service'], queryFn: () => base44.entities.FicheService.list('-created_date', 200) });
  const { data: formulaires = [] } = useQuery({ queryKey: ['formulaires'], queryFn: () => base44.entities.FormulairePreparation.list('-created_date', 500) });
  const { data: allRdvs = [] } = useQuery({ queryKey: ['rendezvous'], queryFn: () => base44.entities.RendezVous.list('-date_confirmee', 200) });

  // Bloc 2 — Alertes
  const in60days = new Date(today); in60days.setDate(today.getDate() + 60);
  const alertes = evenements
    .filter(e => {
      if (!e.date || e.statut === 'Annulé' || e.statut === 'Terminé') return false;
      const d = parseISO(e.date);
      if (d < today || d > in60days) return false;
      return getTachesManquantes(e, fichesService, formulaires, modules).length > 0;
    })
    .sort((a, b) => a.date.localeCompare(b.date));

  // Bloc 3 — Événements à venir
  const upcomingEvs = evenements
    .filter(e => e.date && parseISO(e.date) >= today && e.statut !== 'Annulé')
    .sort((a, b) => a.date.localeCompare(b.date))
    .slice(0, 8);

  // Bloc 4 — Prochains RDV
  const upcomingRdvs = allRdvs
    .filter(r => r.date_confirmee && parseISO(r.date_confirmee) >= today && r.statut !== 'Annulé')
    .sort((a, b) => a.date_confirmee.localeCompare(b.date_confirmee))
    .slice(0, 6);

  return (
    <div className="p-4 md:p-6 max-w-5xl mx-auto space-y-6 pb-[calc(2rem+env(safe-area-inset-bottom)]">
      {/* Header */}
      <div className="flex flex-col gap-3">
        <div className="flex items-center gap-3">
          {company?.company_logo_url && (
            <img src={company.company_logo_url} alt="Logo" className="h-10 w-10 rounded-xl object-contain border-0 p-0" />
          )}
          <div>
            {company?.company_name && <p className="text-xs text-muted-foreground font-medium">{company.company_name}</p>}
            <h2 className="text-2xl font-bold">Tableau de bord</h2>
            <p className="text-muted-foreground text-sm mt-0.5 capitalize">{format(today, "EEEE d MMMM yyyy", { locale: fr })}</p>
          </div>
        </div>
        <div className="grid grid-cols-2 gap-2">
          <Button variant="outline" onClick={() => setInviterModalOpen(true)} className="gap-2 w-full text-xs sm:text-sm">
            <UserPlus size={15} /> Inviter un partenaire
          </Button>
          <Button onClick={() => setNotifModalOpen(true)} className="gap-2 w-full text-xs sm:text-sm">
            <Bell size={15} /> Envoyer une notif
          </Button>
        </div>
      </div>

      {/* Bloc 1 — Notifications récentes */}
      <section>
        <h3 className="text-xs font-semibold uppercase tracking-wider text-muted-foreground mb-3 flex items-center gap-2">
          <Bell size={13} /> Notifications récentes
        </h3>
        <DashboardNotifications />
      </section>

      {/* Bloc 2 — Alertes & tâches */}
      {alertes.length > 0 && (
        <section>
          <h3 className="text-xs font-semibold uppercase tracking-wider text-muted-foreground mb-3 flex items-center gap-2">
            <AlertTriangle size={13} /> Alertes & tâches
            <span className="bg-orange-500 text-white text-[10px] font-bold px-2 py-0.5 rounded-full">{alertes.length}</span>
          </h3>
          <div className="bg-card rounded-2xl border border-border shadow-sm p-4 space-y-2">
            {alertes.map(ev => {
              const jours = differenceInDays(parseISO(ev.date), today);
              const urgent = jours < 7;
              const manquantes = getTachesManquantes(ev, fichesService, formulaires, modules);
              return (
                <div
                  key={ev.id}
                  onClick={() => navigate(`/Evenements?open=${ev.id}`)}
                  className={`flex items-start gap-3 py-2.5 px-3 rounded-xl cursor-pointer transition-colors ${urgent ? 'bg-red-50 hover:bg-red-100 border border-red-200' : 'bg-orange-50 hover:bg-orange-100 border border-orange-200'}`}
                >
                  <div className="text-center min-w-[40px] shrink-0">
                    <DateBadge evenement={ev} date={ev.date} />
                    <p className={`text-[10px] font-semibold ${urgent ? 'text-red-600' : 'text-orange-600'}`}>{isEvenementDateExacte(ev) ? `J-${jours}` : 'À confirmer'}</p>
                  </div>
                  <div className="flex-1 min-w-0">
                    <p className="text-sm font-semibold truncate">{ev.nom}</p>
                    <div className="flex flex-wrap gap-1 mt-1">
                      {manquantes.map(t => (
                        <span key={t} className={`text-[10px] px-2 py-0.5 rounded-full font-medium ${urgent ? 'bg-red-100 text-red-700' : 'bg-orange-100 text-orange-700'}`}>
                          {t} — À faire
                        </span>
                      ))}
                    </div>
                  </div>
                  <span className={`shrink-0 text-[10px] font-bold px-2 py-0.5 rounded-full ${urgent ? 'bg-red-500 text-white' : 'bg-orange-400 text-white'}`}>
                    {urgent ? 'Urgent' : 'À faire'}
                  </span>
                </div>
              );
            })}
          </div>
        </section>
      )}

      {/* Bloc 3 — Événements à venir */}
      <section>
        <h3 className="text-xs font-semibold uppercase tracking-wider text-muted-foreground mb-3 flex items-center gap-2">
          <Calendar size={13} /> Événements à venir
          <button onClick={() => navigate('/Evenements')} className="ml-auto text-xs text-primary hover:underline normal-case tracking-normal font-medium">Voir tous →</button>
        </h3>
        <div className="bg-card rounded-2xl border border-border shadow-sm p-4">
          {upcomingEvs.length === 0 ? (
            <p className="text-muted-foreground text-sm text-center py-6">Aucun événement à venir</p>
          ) : (
            <div className="space-y-1">
              {upcomingEvs.map(ev => {
                const dossier = getDossierStatus(ev, fichesService, formulaires, modules);
                return (
                  <div
                    key={ev.id}
                    onClick={() => navigate(`/Evenements?open=${ev.id}`)}
                    className={`flex items-center gap-3 py-2.5 px-3 rounded-xl cursor-pointer transition-colors ${dossier.type === 'complete' ? 'bg-emerald-50 hover:bg-emerald-100' : 'hover:bg-muted/50'}`}
                  >
                    <DateBadge evenement={ev} date={ev.date} />
                    <div className="flex-1 min-w-0">
                      <p className="text-sm font-semibold truncate">{ev.nom}</p>
                      {ev.lieu_nom && <p className="text-[11px] text-muted-foreground truncate">{ev.lieu_nom}</p>}
                    </div>
                    {dossier.type === 'complete' && (
                      <div className="shrink-0 w-7 h-7 rounded-full bg-emerald-100 flex items-center justify-center" title="Dossier complet">
                        <CheckCircle size={14} className="text-emerald-600" />
                      </div>
                    )}
                    {dossier.type === 'partial' && (
                      <div className="shrink-0 px-2 py-1 rounded-full bg-orange-100 text-orange-700 text-[10px] font-bold border border-orange-300">
                        {dossier.done}/{dossier.total}
                      </div>
                    )}
                    {dossier.type === 'none' && (
                      <div className="shrink-0 w-7 h-7 rounded-full bg-slate-100 flex items-center justify-center">
                        <span className="w-2.5 h-2.5 rounded-full bg-slate-400 block" />
                      </div>
                    )}
                  </div>
                );
              })}
            </div>
          )}
        </div>
      </section>

      {/* Bloc 4 — Prochains rendez-vous */}
      <section>
        <h3 className="text-xs font-semibold uppercase tracking-wider text-muted-foreground mb-3 flex items-center gap-2">
          <Clock size={13} /> Prochains rendez-vous
          <button onClick={() => navigate('/Planning')} className="ml-auto text-xs text-primary hover:underline normal-case tracking-normal font-medium">Voir le calendrier →</button>
        </h3>
        <div className="bg-card rounded-2xl border border-border shadow-sm p-4">
          {upcomingRdvs.length === 0 ? (
            <p className="text-muted-foreground text-sm text-center py-6">Aucun rendez-vous à venir</p>
          ) : (
            <div className="space-y-1">
              {upcomingRdvs.map(rdv => (
                <div key={rdv.id} className="flex items-center gap-3 py-2.5 px-3 rounded-xl hover:bg-muted/50 transition-colors">
                  <DateBadge date={rdv.date_confirmee} />
                  <div className="flex-1 min-w-0">
                    <p className="text-sm font-semibold truncate">📅 {rdv.client_nom}</p>
                    <p className="text-[11px] text-muted-foreground truncate">
                      {rdv.heure_confirmee && `${rdv.heure_confirmee} · `}{rdv.motif || ''}
                    </p>
                  </div>
                  <span className={`shrink-0 text-[10px] px-2 py-0.5 rounded-full font-medium ${
                    rdv.statut === 'Confirmé' ? 'bg-emerald-100 text-emerald-700' :
                    rdv.statut === 'En attente' ? 'bg-amber-100 text-amber-700' :
                    'bg-slate-100 text-slate-600'
                  }`}>{rdv.statut}</span>
                </div>
              ))}
            </div>
          )}
        </div>
      </section>

      {notifModalOpen && <SendNotificationModal onClose={() => setNotifModalOpen(false)} />}
      {inviterModalOpen && <InviterPrestataireModal onClose={() => setInviterModalOpen(false)} />}
    </div>
  );
}