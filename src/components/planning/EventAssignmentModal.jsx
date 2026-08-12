import { useState, useMemo } from 'react';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { base44 } from '@/api/base44Client';
import { X, CheckCircle, XCircle, AlertCircle, ChevronDown, ChevronUp, Plus, Search, AlertTriangle } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { format, parseISO, isSameDay } from 'date-fns';
import { fr } from 'date-fns/locale';

const POSTES = ['Serveur', 'Barman', 'Cuisinier', 'Plongeur', 'Chef de rang', 'Hôte/Hôtesse', 'Autre'];

const statutColor = {
  'Confirmé':   'bg-emerald-100 text-emerald-700',
  'En attente': 'bg-amber-100 text-amber-700',
  'Dispo':      'bg-blue-100 text-blue-700',
  'Indispo':    'bg-red-100 text-red-600',
  'Annulé':     'bg-slate-100 text-slate-500',
};

export default function EventAssignmentModal({ date, evenement, evenements = [], onClose }) {
  const qc = useQueryClient();
  const [expanded, setExpanded] = useState({});
  const [showRenfort, setShowRenfort] = useState(false);
  const [renfortSearch, setRenfortSearch] = useState('');
  const [renfortExtra, setRenfortExtra] = useState(null);
  const [renfortPoste, setRenfortPoste] = useState('');
  const [renfortPending, setRenfortPending] = useState(false);
  // Quand plusieurs événements : on peut filtrer par événement ou voir tous
  const allEvs = evenements.length > 0 ? evenements : (evenement ? [evenement] : []);
  const [selectedEvId, setSelectedEvId] = useState(allEvs[0]?.id || null);
  const activeEv = allEvs.find(e => e.id === selectedEvId) || allEvs[0] || evenement;

  const dateObj = parseISO(date);
  const dateLabel = format(dateObj, 'EEEE d MMMM yyyy', { locale: fr });

  const { data: extras = [] } = useQuery({
    queryKey: ['extras'],
    queryFn: () => base44.entities.Extra.list(),
  });
  const activeExtras = extras.filter(e => e.actif !== false);

  const { data: services = [] } = useQuery({
    queryKey: ['services'],
    queryFn: () => base44.entities.Service.list('-date', 300),
  });

  const { data: assignments = [] } = useQuery({
    queryKey: ['assignments'],
    queryFn: () => base44.entities.ServiceAssignment.list('-created_date', 500),
  });

  const { data: effectifSettings = [] } = useQuery({
    queryKey: ['effectif-settings'],
    queryFn: () => base44.entities.EffectifSettings.list(),
  });

  // Services du jour, filtrés par événement sélectionné si disponible
  const allDayServices = services.filter(s => s.date && isSameDay(parseISO(s.date), dateObj));
  const dayServices = activeEv
    ? allDayServices.filter(s => !s.evenement_id || s.evenement_id === activeEv.id)
    : allDayServices;

  const setting = effectifSettings.find(s => s.type_evenement === activeEv?.type_evenement);
  const activePostes = POSTES.filter(p => setting?.postes_actifs ? setting.postes_actifs[p] !== false : true);

  const getTranchesNeeded = (poste) => {
    if (!activeEv) return 0;
    const tranches = setting?.tranches?.[poste] || [];
    const convives = activeEv.nb_invites || 0;
    if (!convives || !tranches.length) return 0;
    for (const t of tranches) {
      if (convives >= t.min && convives <= t.max) return t.personnel;
    }
    return tranches[tranches.length - 1]?.personnel || 0;
  };

  const getAssignment = (extra, poste) => {
    const posteServiceIds = new Set(dayServices.filter(s => s.poste === poste).map(s => s.id));
    return assignments.find(a =>
      posteServiceIds.has(a.service_id) &&
      (a.extra_id === extra.id || a.extra_id === extra.email || a.extra_email === extra.email)
    );
  };

  const isAssigned = (extra, poste) => !!getAssignment(extra, poste);

  const getAssignedCount = (poste) => {
    const posteServiceIds = new Set(dayServices.filter(s => s.poste === poste).map(s => s.id));
    return assignments.filter(a => posteServiceIds.has(a.service_id) && a.statut !== 'Annulé').length;
  };

  const toggleMutation = useMutation({
    mutationFn: async ({ extra, poste, assign }) => {
      const existing = getAssignment(extra, poste);
      if (!assign) {
        if (existing) await base44.entities.ServiceAssignment.delete(existing.id);
        return;
      }
      let service = dayServices.find(s => s.poste === poste);
      if (!service) {
        service = await base44.entities.Service.create({
          date,
          poste,
          evenement_id: activeEv?.id,
          evenement_nom: activeEv?.nom,
          lieu: activeEv?.lieu_nom || '',
          statut: 'Ouvert',
        });
      }
      if (existing) {
        await base44.entities.ServiceAssignment.update(existing.id, { statut: 'En attente' });
      } else {
        await base44.entities.ServiceAssignment.create({
          service_id: service.id,
          extra_id: extra.id,
          extra_nom: extra.nom,
          extra_email: extra.email || '',
          statut: 'En attente',
        });
      }
    },
    onSuccess: () => {
      qc.invalidateQueries(['assignments']);
      qc.invalidateQueries(['services']);
    },
  });

  // Ajout renfort
  const handleAddRenfort = async () => {
    if (!renfortExtra || !renfortPoste) return;
    setRenfortPending(true);
    try {
      let service = dayServices.find(s => s.poste === renfortPoste);
      if (!service) {
        service = await base44.entities.Service.create({
          date,
          poste: renfortPoste,
          evenement_id: activeEv?.id,
          evenement_nom: activeEv?.nom,
          lieu: activeEv?.lieu_nom || '',
          statut: 'Ouvert',
        });
      }
      // Vérifier si déjà assigné
      const alreadyAssigned = assignments.find(a =>
        a.service_id === service.id &&
        (a.extra_id === renfortExtra.id || a.extra_id === renfortExtra.email)
      );
      if (!alreadyAssigned) {
        await base44.entities.ServiceAssignment.create({
          service_id: service.id,
          extra_id: renfortExtra.id,
          extra_nom: renfortExtra.nom,
          extra_email: renfortExtra.email || '',
          statut: 'Confirmé', // Renfort au pied levé = confirmé directement
        });
        // Notifier l'extra par email
        if (renfortExtra.email) {
          const dateStr = format(dateObj, 'EEEE d MMMM yyyy', { locale: fr });
          try {
            await base44.integrations.Core.SendEmail({
              to: renfortExtra.email,
              subject: '🚨 Renfort urgent — service confirmé',
              body: `Bonjour ${renfortExtra.nom},\n\nVous avez été ajouté(e) en renfort d'urgence pour le service du ${dateStr}${evenement?.nom ? ` (${evenement.nom})` : ''} en tant que ${renfortPoste}.\n\nVotre présence est confirmée. Merci d'être disponible.\n\nCordialement,\nL'équipe`,
            });
          } catch (_) {}
        }
      }
      qc.invalidateQueries(['assignments']);
      qc.invalidateQueries(['services']);
      setShowRenfort(false);
      setRenfortExtra(null);
      setRenfortPoste('');
      setRenfortSearch('');
    } finally {
      setRenfortPending(false);
    }
  };

  const getCompetences = (extra) => {
    if (extra.competences && extra.competences.length > 0) return extra.competences;
    if (extra.poste) return [extra.poste];
    return activePostes;
  };

  const getPostesForExtra = (extra) => {
    const comp = getCompetences(extra);
    return activePostes.filter(p => comp.includes(p));
  };

  const getAssignedPostes = (extra) => activePostes.filter(p => isAssigned(extra, p));

  const recap = useMemo(() =>
    activePostes
      .map(p => ({ poste: p, needed: getTranchesNeeded(p), assigned: getAssignedCount(p) }))
      .filter(r => r.needed > 0),
    [activePostes, assignments, dayServices, effectifSettings, selectedEvId]
  );

  // Alertes effectif hors norme
  const staffingAlerts = useMemo(() => {
    return recap
      .map(r => {
        if (r.assigned < r.needed) return { type: 'insufficient', poste: r.poste, manque: r.needed - r.assigned, needed: r.needed, assigned: r.assigned };
        if (r.assigned > r.needed) return { type: 'excess', poste: r.poste, surplus: r.assigned - r.needed, needed: r.needed, assigned: r.assigned };
        return null;
      })
      .filter(Boolean);
  }, [recap]);

  const toggleExpand = (extraId) =>
    setExpanded(prev => ({ ...prev, [extraId]: !prev[extraId] }));

  // Filtrage pour le renfort
  const renfortFiltered = activeExtras.filter(e =>
    e.nom.toLowerCase().includes(renfortSearch.toLowerCase())
  );

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/40 backdrop-blur-sm p-4">
      <div className="bg-card rounded-2xl border border-border shadow-xl w-full max-w-lg flex flex-col max-h-[90vh]">

        {/* Header */}
        <div className="flex items-start justify-between p-5 border-b border-border shrink-0">
          <div className="flex-1 min-w-0">
            <p className="font-bold text-base">{activeEv?.nom || 'Événement'}</p>
            <p className="text-xs text-muted-foreground capitalize mt-0.5">{dateLabel}</p>
            {activeEv?.lieu_nom && <p className="text-xs text-muted-foreground">{activeEv.lieu_nom}</p>}
            {activeEv?.nb_invites > 0 && (
              <p className="text-xs text-muted-foreground">{activeEv.nb_invites} invités</p>
            )}
          </div>
          <div className="flex items-center gap-2">
            <Button
              size="sm"
              variant="outline"
              onClick={() => setShowRenfort(!showRenfort)}
              className="gap-1.5 text-xs h-8 border-amber-400 text-amber-700 hover:bg-amber-50"
            >
              <Plus size={13} /> Renfort
            </Button>
            <button onClick={onClose} className="p-1.5 rounded-lg hover:bg-muted text-muted-foreground shrink-0">
              <X size={15} />
            </button>
          </div>
        </div>

        {/* Panneau Renfort */}
        {showRenfort && (
          <div className="mx-5 mt-4 p-4 bg-amber-50 border border-amber-200 rounded-xl space-y-3 shrink-0">
            <p className="text-xs font-bold text-amber-800 flex items-center gap-1.5">
              <Plus size={13} /> Ajouter un renfort au pied levé
            </p>
            {/* Recherche extra */}
            <div className="relative">
              <Search size={13} className="absolute left-2.5 top-2.5 text-muted-foreground" />
              <input
                value={renfortSearch}
                onChange={e => { setRenfortSearch(e.target.value); setRenfortExtra(null); }}
                placeholder="Rechercher un extra..."
                className="w-full pl-8 pr-3 py-2 text-xs rounded-lg border border-amber-300 bg-white focus:outline-none focus:ring-1 focus:ring-amber-400"
              />
            </div>
            {renfortSearch && !renfortExtra && (
              <div className="bg-white border border-amber-200 rounded-lg divide-y max-h-32 overflow-y-auto">
                {renfortFiltered.length === 0 && (
                  <p className="text-xs text-muted-foreground p-2">Aucun résultat</p>
                )}
                {renfortFiltered.map(e => (
                  <button
                    key={e.id}
                    onClick={() => { setRenfortExtra(e); setRenfortSearch(e.nom); }}
                    className="w-full text-left px-3 py-2 text-xs hover:bg-amber-50 transition-colors"
                  >
                    <span className="font-medium">{e.nom}</span>
                    {e.poste && <span className="text-muted-foreground ml-2">· {e.poste}</span>}
                  </button>
                ))}
              </div>
            )}
            {/* Sélection du poste */}
            <select
              value={renfortPoste}
              onChange={e => setRenfortPoste(e.target.value)}
              className="w-full py-2 px-3 text-xs rounded-lg border border-amber-300 bg-white focus:outline-none focus:ring-1 focus:ring-amber-400"
            >
              <option value="">— Sélectionner un poste —</option>
              {activePostes.map(p => <option key={p} value={p}>{p}</option>)}
            </select>
            <div className="flex gap-2 pt-1">
              <Button
                size="sm"
                onClick={handleAddRenfort}
                disabled={!renfortExtra || !renfortPoste || renfortPending}
                className="flex-1 bg-amber-500 hover:bg-amber-600 text-white text-xs h-8"
              >
                {renfortPending ? 'Ajout...' : '✅ Confirmer le renfort'}
              </Button>
              <Button size="sm" variant="outline" onClick={() => { setShowRenfort(false); setRenfortExtra(null); setRenfortSearch(''); setRenfortPoste(''); }} className="text-xs h-8">
                Annuler
              </Button>
            </div>
          </div>
        )}

        {/* Corps — liste par extra */}
        <div className="overflow-y-auto flex-1 p-5 space-y-2">
          {activeExtras.length === 0 && (
            <div className="text-center py-8 text-muted-foreground text-sm">
              <AlertCircle size={32} className="mx-auto mb-2 opacity-30" />
              Aucun extra actif.
            </div>
          )}

          {activeExtras.map(extra => {
            const postesDispos = getPostesForExtra(extra);
            const assignedPostes = getAssignedPostes(extra);
            const isOpen = expanded[extra.id];
            const hasAny = assignedPostes.length > 0;

            // Détecter si un poste est Indispo (urgence)
            const hasIndispo = assignedPostes.some(p => getAssignment(extra, p)?.statut === 'Indispo');

            return (
              <div
                key={extra.id}
                className={`rounded-xl border transition-colors ${
                  hasIndispo ? 'border-red-300 bg-red-50' :
                  hasAny ? 'border-primary/30 bg-primary/5' :
                  'border-border bg-muted/20'
                }`}
              >
                <button
                  onClick={() => toggleExpand(extra.id)}
                  className="w-full flex items-center justify-between px-4 py-2.5 text-left"
                >
                  <div className="flex items-center gap-2.5">
                    <span className="text-sm font-semibold">{extra.nom}</span>
                    {assignedPostes.length > 0 && (
                      <div className="flex flex-wrap gap-1">
                        {assignedPostes.map(p => {
                          const a = getAssignment(extra, p);
                          return (
                            <span key={p} className={`text-[10px] px-2 py-0.5 rounded-full font-medium ${statutColor[a?.statut] || 'bg-primary/10 text-primary'}`}>
                              {p}
                            </span>
                          );
                        })}
                      </div>
                    )}
                    {assignedPostes.length === 0 && (
                      <span className="text-xs text-muted-foreground">Non attribué</span>
                    )}
                    {hasIndispo && (
                      <span className="text-[10px] bg-red-500 text-white px-2 py-0.5 rounded-full font-bold">⚠️ Indispo</span>
                    )}
                  </div>
                  {isOpen ? <ChevronUp size={14} className="text-muted-foreground shrink-0" /> : <ChevronDown size={14} className="text-muted-foreground shrink-0" />}
                </button>

                {isOpen && (
                  <div className="px-4 pb-3 pt-1 border-t border-border/50 space-y-1.5">
                    {postesDispos.length === 0 && (
                      <p className="text-xs text-muted-foreground italic">Aucun poste compatible avec les compétences de cet extra.</p>
                    )}
                    {postesDispos.map(poste => {
                      const assigned = isAssigned(extra, poste);
                      const a = getAssignment(extra, poste);
                      const needed = getTranchesNeeded(poste);
                      const assignedCount = getAssignedCount(poste);
                      const isFull = needed > 0 && assignedCount >= needed && !assigned;
                      const isIndispo = a?.statut === 'Indispo';
                      return (
                        <label
                          key={poste}
                          className={`flex items-center justify-between px-3 py-2 rounded-lg border cursor-pointer transition-colors ${
                            isIndispo ? 'bg-red-50 border-red-300' :
                            assigned ? 'bg-primary/10 border-primary/30' :
                            'bg-card border-border hover:bg-muted/40'
                          }`}
                        >
                          <div className="flex items-center gap-2.5">
                            <input
                              type="checkbox"
                              checked={assigned}
                              onChange={e => toggleMutation.mutate({ extra, poste, assign: e.target.checked })}
                              disabled={toggleMutation.isPending}
                              className="w-4 h-4 rounded accent-primary"
                            />
                            <span className="text-sm font-medium">{poste}</span>
                            {isFull && <span className="text-[10px] text-amber-600 bg-amber-50 px-1.5 py-0.5 rounded-full">Complet</span>}
                            {isIndispo && <span className="text-[10px] text-red-600 font-bold">⚠️ À remplacer</span>}
                          </div>
                          {a?.statut && (
                            <span className={`text-[10px] px-2 py-0.5 rounded-full font-medium ${statutColor[a.statut]}`}>
                              {a.statut}
                            </span>
                          )}
                        </label>
                      );
                    })}
                    {activePostes.filter(p => !postesDispos.includes(p) && getTranchesNeeded(p) > 0).map(poste => (
                      <div key={poste} className="flex items-center gap-2.5 px-3 py-2 rounded-lg border border-dashed border-border opacity-40">
                        <input type="checkbox" disabled className="w-4 h-4 rounded" />
                        <span className="text-sm">{poste}</span>
                        <span className="text-[10px] text-muted-foreground">(hors compétences)</span>
                      </div>
                    ))}
                  </div>
                )}
              </div>
            );
          })}
        </div>

        {/* Récapitulatif staffing */}
        {recap.length > 0 && (
          <div className="px-5 py-3 border-t border-border bg-muted/30 shrink-0">
            <p className="text-[10px] font-semibold uppercase tracking-wider text-muted-foreground mb-2">Récapitulatif</p>
            <div className="flex flex-wrap gap-2">
              {recap.map(r => {
                const ok = r.assigned >= r.needed;
                const partial = r.assigned > 0 && r.assigned < r.needed;
                return (
                  <span
                    key={r.poste}
                    className={`flex items-center gap-1 text-xs px-2.5 py-1 rounded-full font-medium ${
                      ok ? 'bg-emerald-100 text-emerald-700' :
                      partial ? 'bg-amber-100 text-amber-700' :
                      'bg-red-100 text-red-600'
                    }`}
                  >
                    {ok ? <CheckCircle size={11} /> : <AlertCircle size={11} />}
                    {r.assigned} {r.poste.toLowerCase()}{r.assigned > 1 ? 's' : ''} {ok ? '✅' : `⚠️ (${r.needed - r.assigned} manquant${r.needed - r.assigned > 1 ? 's' : ''})`}
                  </span>
                );
              })}
            </div>
          </div>
        )}

        {/* Alertes effectif hors norme */}
        {staffingAlerts.length > 0 && (
          <div className="px-5 pb-3 shrink-0 space-y-2">
            {staffingAlerts.map(alert => (
              <div
                key={alert.poste}
                className={`flex items-start gap-2.5 rounded-xl border px-3 py-2.5 ${
                  alert.type === 'insufficient'
                    ? 'bg-red-50 border-red-200'
                    : 'bg-amber-50 border-amber-200'
                }`}
              >
                <span className="text-base leading-none mt-0.5">
                  {alert.type === 'insufficient' ? '🔴' : '🟡'}
                </span>
                <div className="flex-1 min-w-0">
                  <p className={`text-xs font-semibold ${alert.type === 'insufficient' ? 'text-red-700' : 'text-amber-700'}`}>
                    {alert.type === 'insufficient'
                      ? `Effectif insuffisant — ${alert.manque} ${alert.poste.toLowerCase()} manquant${alert.manque > 1 ? 's' : ''}`
                      : `Effectif supérieur au prévu — ${alert.surplus} ${alert.poste.toLowerCase()} en trop`
                    }
                  </p>
                  <p className="text-[10px] text-muted-foreground mt-0.5">
                    {alert.assigned} assigné{alert.assigned > 1 ? 's' : ''} · {alert.needed} prévu{alert.needed > 1 ? 's' : ''} ({alert.poste})
                  </p>
                </div>
              </div>
            ))}
          </div>
        )}

        {/* Footer */}
        <div className="flex justify-end gap-2 p-4 border-t border-border shrink-0">
          <Button variant="outline" onClick={onClose}>Fermer</Button>
          <Button onClick={onClose}>
            {staffingAlerts.length > 0 ? 'Valider quand même' : 'Valider'}
          </Button>
        </div>
      </div>
    </div>
  );
}