import { useMemo } from 'react';
import { format, parseISO, isSameDay, isSameMonth } from 'date-fns';
import { fr } from 'date-fns/locale';
import { CheckCircle, AlertCircle, MapPin, Users, Send } from 'lucide-react';
import { Button } from '@/components/ui/button';

const POSTES = ['Serveur', 'Barman', 'Cuisinier', 'Plongeur', 'Chef de rang', 'Hôte/Hôtesse', 'Autre'];

const statutColors = {
  'Confirmé':   'bg-emerald-100 text-emerald-700',
  'En attente': 'bg-amber-100 text-amber-700',
  'Dispo':      'bg-blue-100 text-blue-700',
  'Indispo':    'bg-red-100 text-red-600',
  'Annulé':     'bg-slate-100 text-slate-500',
};

export default function AgendaView({
  currentDate,
  evenements,
  services,
  assignments,
  extras,
  effectifSettings,
  onOpenEvent,
  onSendDay,
  sendPending,
}) {
  // Événements du mois courant, triés par date
  const monthEvents = useMemo(() =>
    evenements
      .filter(e => e.date && isSameMonth(parseISO(e.date), currentDate))
      .sort((a, b) => a.date.localeCompare(b.date)),
    [evenements, currentDate]
  );

  const getActivePostes = (typeEvenement) => {
    const setting = effectifSettings.find(s => s.type_evenement === typeEvenement);
    if (!setting?.postes_actifs) return POSTES;
    return POSTES.filter(p => setting.postes_actifs[p] !== false);
  };

  const getTranchesNeeded = (evenement, poste) => {
    const setting = effectifSettings.find(s => s.type_evenement === evenement.type_evenement);
    const tranches = setting?.tranches?.[poste] || [];
    const convives = evenement.nb_invites || 0;
    if (!convives || !tranches.length) return 0;
    for (const t of tranches) {
      if (convives >= t.min && convives <= t.max) return t.personnel;
    }
    return tranches[tranches.length - 1]?.personnel || 0;
  };

  const getDayServices = (evenement) =>
    services.filter(s => s.date && s.date === evenement.date);

  const getAssignmentsForEvent = (evenement) => {
    const dayServiceIds = new Set(getDayServices(evenement).map(s => s.id));
    return assignments.filter(a => dayServiceIds.has(a.service_id) && a.statut !== 'Annulé');
  };

  const getEffectifStatus = (evenement) => {
    const activePostes = getActivePostes(evenement.type_evenement);
    const dayServiceIds = new Set(getDayServices(evenement).map(s => s.id));

    let allOk = true;
    const details = [];

    for (const poste of activePostes) {
      const needed = getTranchesNeeded(evenement, poste);
      if (needed === 0) continue;
      const posteServiceIds = new Set(
        getDayServices(evenement).filter(s => s.poste === poste).map(s => s.id)
      );
      const assigned = assignments.filter(a =>
        posteServiceIds.has(a.service_id) && a.statut !== 'Annulé'
      ).length;
      const ok = assigned >= needed;
      if (!ok) allOk = false;
      details.push({ poste, needed, assigned, ok });
    }

    return { allOk, details: details.filter(d => d.needed > 0) };
  };

  const getExtrasForEvent = (evenement) => {
    const evtAssignments = getAssignmentsForEvent(evenement);
    return evtAssignments.map(a => {
      const extra = extras.find(e => e.id === a.extra_id || e.email === a.extra_id || e.email === a.extra_email);
      const service = services.find(s => s.id === a.service_id);
      return { assignment: a, extra, poste: service?.poste || '' };
    }).filter(x => x.extra);
  };

  if (monthEvents.length === 0) {
    return (
      <div className="text-center py-20 text-muted-foreground">
        <AlertCircle size={40} className="mx-auto mb-3 opacity-25" />
        <p className="font-medium">Aucun événement ce mois-ci</p>
      </div>
    );
  }

  return (
    <div className="space-y-4">
      {monthEvents.map(evenement => {
        const { allOk, details } = getEffectifStatus(evenement);
        const extrasAssigned = getExtrasForEvent(evenement);
        const dateObj = parseISO(evenement.date);

        return (
          <div
            key={evenement.id}
            className="bg-card rounded-2xl border border-border shadow-sm overflow-hidden"
          >
            {/* Header événement */}
            <div
              className={`px-5 py-4 border-b border-border flex items-start justify-between gap-3 cursor-pointer hover:bg-muted/20 transition-colors`}
              onClick={() => onOpenEvent(evenement)}
            >
              <div className="flex items-start gap-4">
                {/* Date badge */}
                <div className="shrink-0 text-center bg-primary/10 rounded-xl px-3 py-2 min-w-[52px]">
                  <p className="text-[10px] font-semibold uppercase text-primary opacity-70">
                    {format(dateObj, 'MMM', { locale: fr })}
                  </p>
                  <p className="text-xl font-bold text-primary leading-none">{format(dateObj, 'd')}</p>
                  <p className="text-[10px] text-muted-foreground capitalize">{format(dateObj, 'EEE', { locale: fr })}</p>
                </div>
                <div>
                  <p className="font-bold text-base leading-tight">{evenement.nom}</p>
                  {evenement.type_evenement && (
                    <p className="text-xs text-muted-foreground mt-0.5">{evenement.type_evenement}</p>
                  )}
                  <div className="flex flex-wrap items-center gap-3 mt-1.5 text-xs text-muted-foreground">
                    {evenement.lieu_nom && (
                      <span className="flex items-center gap-1"><MapPin size={11} />{evenement.lieu_nom}</span>
                    )}
                    {evenement.nb_invites > 0 && (
                      <span className="flex items-center gap-1"><Users size={11} />{evenement.nb_invites} invités</span>
                    )}
                    {evenement.heure_debut && (
                      <span>{evenement.heure_debut}{evenement.heure_fin ? ` – ${evenement.heure_fin}` : ''}</span>
                    )}
                  </div>
                </div>
              </div>

              <div className="flex flex-col items-end gap-2 shrink-0">
                {/* Badge effectif */}
                <span className={`flex items-center gap-1.5 text-xs font-semibold px-3 py-1.5 rounded-full ${
                  allOk ? 'bg-emerald-100 text-emerald-700' : 'bg-amber-100 text-amber-700'
                }`}>
                  {allOk ? <CheckCircle size={13} /> : <AlertCircle size={13} />}
                  {allOk ? 'Complet' : 'Incomplet'}
                </span>
                <Button
                  size="sm"
                  variant="outline"
                  className="gap-1.5 text-xs h-7"
                  disabled={sendPending}
                  onClick={(e) => { e.stopPropagation(); onSendDay(dateObj, evenement.date); }}
                >
                  <Send size={11} /> Envoyer
                </Button>
              </div>
            </div>

            {/* Corps */}
            <div className="px-5 py-4 space-y-3">
              {/* Effectif par poste */}
              {details.length > 0 && (
                <div className="flex flex-wrap gap-2">
                  {details.map(d => (
                    <span
                      key={d.poste}
                      className={`text-xs px-2.5 py-1 rounded-full font-medium flex items-center gap-1 ${
                        d.ok ? 'bg-emerald-50 text-emerald-700 border border-emerald-200' :
                        d.assigned > 0 ? 'bg-amber-50 text-amber-700 border border-amber-200' :
                        'bg-red-50 text-red-600 border border-red-200'
                      }`}
                    >
                      {d.ok ? <CheckCircle size={10} /> : <AlertCircle size={10} />}
                      {d.assigned}/{d.needed} {d.poste.toLowerCase()}{d.assigned > 1 ? 's' : ''}
                      {!d.ok && ` · ${d.needed - d.assigned} manquant${d.needed - d.assigned > 1 ? 's' : ''}`}
                    </span>
                  ))}
                </div>
              )}

              {/* Liste extras attribués */}
              {extrasAssigned.length > 0 ? (
                <div className="grid grid-cols-2 sm:grid-cols-3 gap-2">
                  {extrasAssigned.map(({ assignment, extra, poste }, i) => (
                    <div key={i} className="flex items-center gap-2 bg-muted/30 rounded-lg px-3 py-2">
                      <div className="w-7 h-7 rounded-full bg-primary/10 text-primary font-bold text-xs flex items-center justify-center shrink-0">
                        {extra.nom.charAt(0).toUpperCase()}
                      </div>
                      <div className="min-w-0">
                        <p className="text-xs font-semibold truncate">{extra.nom}</p>
                        <div className="flex items-center gap-1 mt-0.5">
                          {poste && <span className="text-[10px] text-primary/70 font-medium">{poste}</span>}
                          <span className={`text-[10px] px-1.5 rounded-full font-medium ${statutColors[assignment.statut] || ''}`}>
                            {assignment.statut}
                          </span>
                        </div>
                      </div>
                    </div>
                  ))}
                </div>
              ) : (
                <p className="text-xs text-muted-foreground italic">Aucun extra attribué — cliquez pour gérer les attributions</p>
              )}
            </div>
          </div>
        );
      })}
    </div>
  );
}