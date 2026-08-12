import { useState } from 'react';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { base44 } from '@/api/base44Client';
import { RefreshCw, X, Eye, Filter } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { format, parseISO } from 'date-fns';
import { fr } from 'date-fns/locale';
import { toast } from 'sonner';

const TYPE_LABELS = {
  formulaire_envoi: 'Formulaire · Envoi',
  formulaire_rappel: 'Formulaire · Rappel',
  formulaire_relance: 'Formulaire · Relance',
  programme_provisoire: 'Programme provisoire',
  programme_definitif: 'Programme définitif',
  programme_rappel: 'Programme · Rappel',
  fiche_prestataires: 'Fiche service · Prestataires',
  fiche_extras: 'Fiche service · Extras',
  fiche_rappel: 'Fiche service · Rappel',
  acompte_alerte: 'Acompte · Alerte',
  solde_alerte: 'Solde · Alerte',
  avis_envoi: 'Avis client · Envoi',
  avis_relance: 'Avis client · Relance',
  prospect_relance: 'Prospect · Relance',
};

const STATUT_CONFIG = {
  'Envoyé':    { emoji: '✅', cls: 'bg-emerald-100 text-emerald-700' },
  'Programmé': { emoji: '🕐', cls: 'bg-blue-100 text-blue-700' },
  'Échoué':    { emoji: '❌', cls: 'bg-red-100 text-red-600' },
  'En attente':{ emoji: '⚠️', cls: 'bg-amber-100 text-amber-700' },
};

export default function AutomationHistorique({ evenementId = null }) {
  const qc = useQueryClient();
  const [filterType, setFilterType] = useState('');
  const [filterStatut, setFilterStatut] = useState('');
  const [filterEvenement, setFilterEvenement] = useState('');
  const [filterPeriode, setFilterPeriode] = useState('');
  const [selectedLog, setSelectedLog] = useState(null);

  const { data: logs = [], isLoading } = useQuery({
    queryKey: ['automation-logs', evenementId],
    queryFn: () => evenementId
      ? base44.entities.AutomationLog.filter({ evenement_id: evenementId }, '-created_date', 200)
      : base44.entities.AutomationLog.list('-created_date', 200),
  });

  const updateLog = useMutation({
    mutationFn: ({ id, data }) => base44.entities.AutomationLog.update(id, data),
    onSuccess: () => { qc.invalidateQueries(['automation-logs', evenementId]); toast.success('Mis à jour'); },
  });

  const filtered = logs.filter(log => {
    if (filterType && log.type_action !== filterType) return false;
    if (filterStatut && log.statut !== filterStatut) return false;
    if (filterEvenement && !log.evenement_nom?.toLowerCase().includes(filterEvenement.toLowerCase())) return false;
    if (filterPeriode) {
      const logDate = log.created_date?.substring(0, 10);
      if (logDate < filterPeriode) return false;
    }
    return true;
  });

  const formatDate = (iso) => {
    if (!iso) return '—';
    try { return format(parseISO(iso), 'dd/MM/yyyy HH:mm', { locale: fr }); } catch { return iso; }
  };

  return (
    <div className="space-y-4">
      {/* Filtres */}
      <div className="bg-card border border-border rounded-2xl p-4 space-y-3">
        <div className="flex items-center gap-2 text-sm font-medium">
          <Filter size={15} className="text-muted-foreground" /> Filtres
        </div>
        <div className="grid grid-cols-2 md:grid-cols-4 gap-3">
          <select
            value={filterType}
            onChange={e => setFilterType(e.target.value)}
            className="flex h-8 w-full rounded-md border border-input bg-transparent px-3 text-xs focus-visible:outline-none focus-visible:ring-1 focus-visible:ring-ring"
          >
            <option value="">Tous les types</option>
            {Object.entries(TYPE_LABELS).map(([k, v]) => <option key={k} value={k}>{v}</option>)}
          </select>
          <select
            value={filterStatut}
            onChange={e => setFilterStatut(e.target.value)}
            className="flex h-8 w-full rounded-md border border-input bg-transparent px-3 text-xs focus-visible:outline-none focus-visible:ring-1 focus-visible:ring-ring"
          >
            <option value="">Tous les statuts</option>
            {Object.keys(STATUT_CONFIG).map(s => <option key={s} value={s}>{s}</option>)}
          </select>
          {!evenementId && (
            <input
              type="text"
              placeholder="Chercher un événement..."
              value={filterEvenement}
              onChange={e => setFilterEvenement(e.target.value)}
              className="flex h-8 w-full rounded-md border border-input bg-transparent px-3 text-xs focus-visible:outline-none focus-visible:ring-1 focus-visible:ring-ring"
            />
          )}
          <input
            type="date"
            value={filterPeriode}
            onChange={e => setFilterPeriode(e.target.value)}
            className="flex h-8 w-full rounded-md border border-input bg-transparent px-3 text-xs focus-visible:outline-none focus-visible:ring-1 focus-visible:ring-ring"
          />
        </div>
        {(filterType || filterStatut || filterEvenement || filterPeriode) && (
          <button
            onClick={() => { setFilterType(''); setFilterStatut(''); setFilterEvenement(''); setFilterPeriode(''); }}
            className="text-xs text-muted-foreground hover:text-foreground flex items-center gap-1"
          >
            <X size={12} /> Réinitialiser les filtres
          </button>
        )}
      </div>

      {/* Tableau */}
      <div className="bg-card border border-border rounded-2xl overflow-hidden">
        <div className="px-5 py-3 border-b border-border flex items-center justify-between">
          <p className="text-sm font-medium">{filtered.length} action{filtered.length !== 1 ? 's' : ''}</p>
          <Button size="sm" variant="ghost" className="gap-1.5 h-7 text-xs" onClick={() => qc.invalidateQueries(['automation-logs'])}>
            <RefreshCw size={12} /> Actualiser
          </Button>
        </div>

        {isLoading ? (
          <div className="text-center py-12 text-muted-foreground text-sm">Chargement...</div>
        ) : filtered.length === 0 ? (
          <div className="text-center py-12 text-muted-foreground">
            <p className="text-2xl mb-2">📭</p>
            <p className="text-sm">Aucune action dans l'historique.</p>
          </div>
        ) : (
          <div className="divide-y divide-border">
            {filtered.map(log => {
              const sc = STATUT_CONFIG[log.statut] || STATUT_CONFIG['En attente'];
              return (
                <div key={log.id} className="flex items-center gap-3 px-5 py-3 hover:bg-muted/20 transition-colors">
                  <div className="flex-1 min-w-0 space-y-0.5">
                    <div className="flex items-center gap-2 flex-wrap">
                      <span className="text-sm font-medium">{TYPE_LABELS[log.type_action] || log.type_action}</span>
                      <span className={`text-xs px-2 py-0.5 rounded-full font-medium ${sc.cls}`}>
                        {sc.emoji} {log.statut}
                      </span>
                    </div>
                    <div className="flex items-center gap-3 text-xs text-muted-foreground flex-wrap">
                      {log.evenement_nom && <span>📅 {log.evenement_nom}</span>}
                      {log.destinataire && <span>📬 {log.destinataire}</span>}
                      <span>🕐 {formatDate(log.date_programmee || log.created_date)}</span>
                    </div>
                  </div>
                  <div className="flex items-center gap-1 shrink-0">
                    {log.statut === 'Échoué' && (
                      <Button size="sm" variant="outline" className="h-7 text-xs gap-1 text-red-600 border-red-200 hover:bg-red-50"
                        onClick={() => updateLog.mutate({ id: log.id, data: { statut: 'Programmé' } })}>
                        <RefreshCw size={11} /> Relancer
                      </Button>
                    )}
                    {log.statut === 'Programmé' && (
                      <Button size="sm" variant="outline" className="h-7 text-xs gap-1"
                        onClick={() => updateLog.mutate({ id: log.id, data: { statut: 'En attente' } })}>
                        <X size={11} /> Annuler
                      </Button>
                    )}
                    <Button size="sm" variant="ghost" className="h-7 w-7 p-0" onClick={() => setSelectedLog(log)}>
                      <Eye size={13} />
                    </Button>
                  </div>
                </div>
              );
            })}
          </div>
        )}
      </div>

      {/* Modal détail */}
      {selectedLog && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/40 backdrop-blur-sm p-4">
          <div className="bg-card rounded-2xl border border-border shadow-xl w-full max-w-md p-6 space-y-4">
            <div className="flex items-center justify-between">
              <h3 className="font-bold">Détail de l'action</h3>
              <button onClick={() => setSelectedLog(null)} className="p-1.5 rounded-lg hover:bg-muted"><X size={16} /></button>
            </div>
            <div className="space-y-2 text-sm">
              <div className="flex justify-between"><span className="text-muted-foreground">Type</span><span className="font-medium">{TYPE_LABELS[selectedLog.type_action]}</span></div>
              <div className="flex justify-between"><span className="text-muted-foreground">Statut</span>
                <span className={`text-xs px-2 py-0.5 rounded-full font-medium ${STATUT_CONFIG[selectedLog.statut]?.cls || ''}`}>
                  {STATUT_CONFIG[selectedLog.statut]?.emoji} {selectedLog.statut}
                </span>
              </div>
              {selectedLog.evenement_nom && <div className="flex justify-between"><span className="text-muted-foreground">Événement</span><span className="font-medium">{selectedLog.evenement_nom}</span></div>}
              {selectedLog.destinataire && <div className="flex justify-between"><span className="text-muted-foreground">Destinataire</span><span className="font-medium">{selectedLog.destinataire}</span></div>}
              <div className="flex justify-between"><span className="text-muted-foreground">Date programmée</span><span className="font-medium">{formatDate(selectedLog.date_programmee)}</span></div>
              {selectedLog.date_execution && <div className="flex justify-between"><span className="text-muted-foreground">Date d'exécution</span><span className="font-medium">{formatDate(selectedLog.date_execution)}</span></div>}
              {selectedLog.details && (
                <div className="mt-2">
                  <p className="text-muted-foreground mb-1">Détails</p>
                  <p className="bg-muted/40 rounded-lg p-3 text-xs">{selectedLog.details}</p>
                </div>
              )}
            </div>
            <Button className="w-full" variant="outline" onClick={() => setSelectedLog(null)}>Fermer</Button>
          </div>
        </div>
      )}
    </div>
  );
}