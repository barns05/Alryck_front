import { X, Send, CheckCircle, AlertTriangle, MapPin, Calendar, Clock, ArrowLeft } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { format, parseISO, isSameDay } from 'date-fns';
import { fr } from 'date-fns/locale';

const POSTES = ['Serveur', 'Barman', 'Cuisinier', 'Plongeur', 'Chef de rang', 'Hôte/Hôtesse', 'Autre'];

/**
 * Affiche un récapitulatif complet avant envoi des demandes aux extras.
 *
 * Props :
 *   days          — tableau de Date (les jours avec événements à envoyer)
 *   evenements    — liste complète des événements
 *   services      — liste complète des services
 *   assignments   — liste complète des assignments
 *   extras        — liste des extras actifs
 *   effectifSettings — paramètres d'effectif
 *   onConfirm(days) — appelé avec les dayStr à envoyer
 *   onClose       — fermer sans envoyer
 *   isPending     — loading state
 */
export default function SendRecapModal({
  days,
  evenements,
  services,
  assignments,
  extras,
  effectifSettings,
  onConfirm,
  onClose,
  isPending,
}) {
  // Construire le récap par événement (un bloc par événement, pas par jour)
  const recap = days.flatMap(dayStr => {
    const dayEvenements = evenements.filter(e => e.date === dayStr);
    if (dayEvenements.length === 0) {
      // Pas d'événement connu : afficher un bloc générique pour le jour
      const dayServices = services.filter(s => s.date === dayStr);
      const dayServiceIds = new Set(dayServices.map(s => s.id));
      const dayAssignments = assignments.filter(a => dayServiceIds.has(a.service_id) && a.statut !== 'Annulé');
      const extrasList = dayAssignments.map(a => {
        const svc = dayServices.find(s => s.id === a.service_id);
        const extra = extras.find(e => e.id === a.extra_id || e.email === a.extra_id || e.email === a.extra_email);
        return { nom: extra?.nom || a.extra_nom || '—', poste: svc?.poste || '—', evenementNom: '', heure_debut: svc?.heure_debut || '', heure_fin: svc?.heure_fin || '', statut: a.statut };
      });
      return [{ dayStr, evenement: null, extrasList, isComplete: true, postesStatus: [] }];
    }

    return dayEvenements.map(evenement => {
      // Services liés à cet événement précis
      const evServices = services.filter(s => s.date === dayStr && (s.evenement_id === evenement.id || (!s.evenement_id && !dayEvenements.find(e2 => e2.id !== evenement.id && services.some(s2 => s2.evenement_id === e2.id && s2.id === s.id)))));
      const evServiceIds = new Set(evServices.map(s => s.id));
      const evAssignments = assignments.filter(a => evServiceIds.has(a.service_id) && a.statut !== 'Annulé');

      // Dédupliquer : une ligne par (extra, poste, événement)
      const seen = new Set();
      const extrasList = [];
      for (const a of evAssignments) {
        const svc = evServices.find(s => s.id === a.service_id);
        const extra = extras.find(e => e.id === a.extra_id || e.email === a.extra_id || e.email === a.extra_email);
        const nom = extra?.nom || a.extra_nom || '—';
        const poste = svc?.poste || extra?.poste || '—';
        const key = `${nom}|${poste}|${evenement.id}`;
        if (seen.has(key)) continue;
        seen.add(key);
        extrasList.push({ nom, poste, evenementNom: evenement.nom, heure_debut: svc?.heure_debut || '', heure_fin: svc?.heure_fin || '', statut: a.statut });
      }

      // Vérifier si effectif complet
      const setting = effectifSettings.find(s => s.type_evenement === evenement.type_evenement);
      const activePostes = setting?.postes_actifs ? POSTES.filter(p => setting.postes_actifs[p] !== false) : POSTES;

      let isComplete = true;
      const postesStatus = [];
      for (const poste of activePostes) {
        const tranches = setting?.tranches?.[poste] || [];
        const convives = evenement.nb_invites || 0;
        let needed = 0;
        if (convives > 0 && tranches.length > 0) {
          for (const t of tranches) { if (convives >= t.min && convives <= t.max) { needed = t.personnel; break; } }
          if (needed === 0) needed = tranches[tranches.length - 1]?.personnel || 0;
        }
        if (needed === 0) continue;
        const posteServiceIds = new Set(evServices.filter(s => s.poste === poste).map(s => s.id));
        const assigned = evAssignments.filter(a => posteServiceIds.has(a.service_id)).length;
        if (assigned < needed) isComplete = false;
        postesStatus.push({ poste, needed, assigned });
      }

      return { dayStr, evenement, extrasList, isComplete, postesStatus };
    });
  });

  const totalDemandes = recap.reduce((sum, r) => sum + r.extrasList.length, 0);
  const uniqueDayStrs = [...new Set(recap.map(r => r.dayStr))];

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 backdrop-blur-sm p-4">
      <div className="bg-card rounded-2xl border border-border shadow-2xl w-full max-w-2xl flex flex-col max-h-[90vh]">

        {/* Header */}
        <div className="flex items-center justify-between px-6 py-4 border-b border-border shrink-0">
          <div>
            <h2 className="font-bold text-lg">Récapitulatif avant envoi</h2>
            <p className="text-sm text-muted-foreground mt-0.5">
              {recap.length} événement{recap.length > 1 ? 's' : ''} · {totalDemandes} demande{totalDemandes > 1 ? 's' : ''} à envoyer
            </p>
          </div>
          <button onClick={onClose} className="p-1.5 rounded-lg hover:bg-muted text-muted-foreground">
            <X size={16} />
          </button>
        </div>

        {/* Corps — liste des événements */}
        <div className="overflow-y-auto flex-1 px-6 py-4 space-y-4">
          {recap.map(({ dayStr, evenement, extrasList, isComplete, postesStatus }) => (
            <div key={`${dayStr}-${evenement?.id || 'noev'}`} className={`rounded-xl border p-4 space-y-3 ${
              isComplete ? 'border-emerald-200 bg-emerald-50/40' : 'border-amber-200 bg-amber-50/40'
            }`}>
              {/* En-tête événement */}
              <div className="flex items-start justify-between gap-2">
                <div className="space-y-0.5">
                  <p className="font-bold text-base leading-tight">
                    {evenement?.nom || `Événement du ${format(parseISO(dayStr), 'd MMMM', { locale: fr })}`}
                  </p>
                  <div className="flex flex-wrap items-center gap-3 text-xs text-muted-foreground">
                    <span className="flex items-center gap-1">
                      <Calendar size={11} />
                      {format(parseISO(dayStr), 'EEEE d MMMM yyyy', { locale: fr })}
                    </span>
                    {evenement?.lieu_nom && (
                      <span className="flex items-center gap-1">
                        <MapPin size={11} />
                        {evenement.lieu_nom}
                      </span>
                    )}
                  </div>
                </div>
                <span className={`shrink-0 flex items-center gap-1.5 text-xs font-semibold px-2.5 py-1 rounded-full ${
                  isComplete
                    ? 'bg-emerald-100 text-emerald-700'
                    : 'bg-amber-100 text-amber-700'
                }`}>
                  {isComplete ? <CheckCircle size={12} /> : <AlertTriangle size={12} />}
                  {isComplete ? 'Effectif complet' : 'Effectif incomplet'}
                </span>
              </div>

              {/* Postes manquants si incomplet */}
              {!isComplete && (
                <div className="flex flex-wrap gap-1.5">
                  {postesStatus.filter(p => p.assigned < p.needed).map(p => (
                    <span key={p.poste} className="text-xs bg-amber-200 text-amber-800 px-2 py-0.5 rounded-full font-medium">
                      {p.poste} : {p.assigned}/{p.needed}
                    </span>
                  ))}
                </div>
              )}

              {/* Liste des extras */}
              {extrasList.length > 0 ? (
                <div className="space-y-1.5">
                  <p className="text-xs font-semibold text-muted-foreground uppercase tracking-wide">
                    {extrasList.length} extra{extrasList.length > 1 ? 's' : ''} attribué{extrasList.length > 1 ? 's' : ''}
                  </p>
                  <div className="grid gap-1.5">
                    {extrasList.map((e, i) => (
                      <div key={i} className="flex items-center justify-between bg-white/70 rounded-lg px-3 py-2 border border-border/60">
                        <div className="flex items-center gap-2 flex-wrap">
                          <span className="font-medium text-sm">{e.nom}</span>
                          <span className="text-xs bg-primary/10 text-primary px-2 py-0.5 rounded-full font-medium">{e.poste}</span>
                        </div>
                        {e.heure_debut && (
                          <span className="flex items-center gap-1 text-xs text-muted-foreground shrink-0">
                            <Clock size={10} />
                            {e.heure_debut}{e.heure_fin ? ` – ${e.heure_fin}` : ''}
                          </span>
                        )}
                      </div>
                    ))}
                  </div>
                </div>
              ) : (
                <p className="text-xs text-muted-foreground italic">Aucun extra attribué pour cet événement.</p>
              )}
            </div>
          ))}

          {recap.length === 0 && (
            <div className="text-center py-10 text-muted-foreground text-sm">
              Aucun événement à envoyer ce mois-ci.
            </div>
          )}
        </div>

        {/* Footer */}
        <div className="px-6 py-4 border-t border-border shrink-0 space-y-3">
          <div className="bg-muted/50 rounded-xl px-4 py-3 flex items-center justify-between">
            <span className="text-sm text-muted-foreground">Demandes à envoyer</span>
            <span className="font-bold text-lg">{totalDemandes}</span>
          </div>
          <div className="flex gap-2">
            <Button variant="outline" className="flex-1 gap-2" onClick={onClose} disabled={isPending}>
              <ArrowLeft size={14} /> Modifier
            </Button>
            <Button
              className="flex-1 gap-2 bg-primary hover:bg-primary/90"
              onClick={() => onConfirm(uniqueDayStrs)}
              disabled={isPending || totalDemandes === 0}
            >
              {isPending ? (
                <span className="flex items-center gap-2"><span className="w-4 h-4 border-2 border-white/40 border-t-white rounded-full animate-spin" /> Envoi...</span>
              ) : (
                <><Send size={14} /> Confirmer l'envoi</>
              )}
            </Button>
          </div>
        </div>
      </div>
    </div>
  );
}