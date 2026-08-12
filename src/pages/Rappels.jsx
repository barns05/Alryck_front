import { useState } from 'react';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { base44 } from '@/api/base44Client';
import { toast } from 'sonner';
import { Bell, Plus, Check, RotateCcw, Clock, CalendarClock, History, ChevronRight, X } from 'lucide-react';
import EmptyState from '@/components/EmptyState';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { format, parseISO, isToday, isPast, isFuture, startOfDay } from 'date-fns';
import { fr } from 'date-fns/locale';
import RappelModal from '@/components/rappels/RappelModal';
import ReporterRappelModal from '@/components/rappels/ReporterRappelModal';

const STATUT_ICON = {
  'Fait':    { icon: Check, cls: 'bg-emerald-100 text-emerald-700', emoji: '✓' },
  'Manqué':  { icon: X, cls: 'bg-red-100 text-red-600', emoji: '❌' },
  'Reporté': { icon: RotateCcw, cls: 'bg-amber-100 text-amber-700', emoji: '🔄' },
  'En attente': { icon: Clock, cls: 'bg-slate-100 text-slate-600', emoji: '⏳' },
};

function ContextBadge({ rappel }) {
  const label = rappel.evenement_nom || rappel.client_nom || rappel.prospect_nom;
  if (!label) return null;
  return (
    <span className="text-xs bg-primary/10 text-primary px-2 py-0.5 rounded-full font-medium">{label}</span>
  );
}

function TypeBadge({ type }) {
  return (
    <span className={`text-xs px-2 py-0.5 rounded-full font-medium ${type === 'Automatique' ? 'bg-purple-100 text-purple-700' : 'bg-blue-100 text-blue-700'}`}>
      {type}
    </span>
  );
}

export default function Rappels() {
  const qc = useQueryClient();
  const [tab, setTab] = useState('aujourd_hui');
  const [modalOpen, setModalOpen] = useState(false);
  const [reporterRappel, setReporterRappel] = useState(null);
  const [filterType, setFilterType] = useState('');
  const [filterEv, setFilterEv] = useState('');
  const [searchHisto, setSearchHisto] = useState('');

  const { data: rappels = [], isLoading } = useQuery({
    queryKey: ['rappels'],
    queryFn: () => base44.entities.Rappel.list('-date_rappel', 500),
  });

  const { data: evenements = [] } = useQuery({
    queryKey: ['evenements-mini'],
    queryFn: () => base44.entities.Evenement.list('-date', 200),
  });

  const updateMutation = useMutation({
    mutationFn: ({ id, data }) => base44.entities.Rappel.update(id, data),
    onSuccess: () => { qc.invalidateQueries(['rappels']); toast.success('✓ Rappel mis à jour'); },
    onError: () => toast.error('❌ Une erreur est survenue'),
  });

  const today = startOfDay(new Date());

  const rapAujourdhui = rappels.filter(r =>
    r.statut === 'En attente' && r.date_rappel && isToday(parseISO(r.date_rappel))
  ).sort((a, b) => (a.heure_rappel || '').localeCompare(b.heure_rappel || ''));

  const rapAVenir = rappels.filter(r =>
    r.statut === 'En attente' && r.date_rappel && isFuture(startOfDay(parseISO(r.date_rappel)))
  );

  const rapHistorique = rappels.filter(r =>
    r.statut !== 'En attente' ||
    (r.date_rappel && isPast(startOfDay(parseISO(r.date_rappel))) && !isToday(parseISO(r.date_rappel)))
  );

  const filteredAVenir = rapAVenir.filter(r => {
    const matchType = !filterType || r.type === filterType;
    const matchEv = !filterEv || r.evenement_id === filterEv;
    return matchType && matchEv;
  }).sort((a, b) => a.date_rappel.localeCompare(b.date_rappel));

  const filteredHisto = rapHistorique.filter(r => {
    const q = searchHisto.toLowerCase();
    return !q || (r.titre || '').toLowerCase().includes(q) || (r.evenement_nom || '').toLowerCase().includes(q);
  }).sort((a, b) => b.date_rappel.localeCompare(a.date_rappel));

  const markFait = (id) => updateMutation.mutate({ id, data: { statut: 'Fait' } });

  const tabs = [
    { id: 'aujourd_hui', label: "Aujourd'hui", icon: Clock, badge: rapAujourdhui.length },
    { id: 'a_venir', label: 'À venir', icon: CalendarClock, badge: rapAVenir.length },
    { id: 'historique', label: 'Historique', icon: History },
  ];

  return (
    <div className="p-4 md:p-6 space-y-5 max-w-7xl mx-auto pb-[calc(2rem+env(safe-area-inset-bottom)]">
      {/* Header */}
      <div className="flex items-center justify-between flex-wrap gap-3">
        <div>
          <h2 className="text-2xl font-bold flex items-center gap-2"><Bell size={22} className="text-primary" /> Rappels</h2>
          <p className="text-sm text-muted-foreground mt-0.5">
            {rapAujourdhui.length > 0
              ? <span className="text-amber-600 font-medium">{rapAujourdhui.length} rappel{rapAujourdhui.length > 1 ? 's' : ''} aujourd'hui</span>
              : `${rapAVenir.length} rappel${rapAVenir.length > 1 ? 's' : ''} à venir`}
          </p>
        </div>
        <Button className="gap-1.5" onClick={() => setModalOpen(true)}>
          <Plus size={15} /> Nouveau rappel
        </Button>
      </div>

      {/* Onglets */}
      <div className="flex gap-1 border-b border-border">
        {tabs.map(t => (
          <button
            key={t.id}
            onClick={() => setTab(t.id)}
            className={`flex items-center gap-2 px-4 py-2.5 text-sm font-medium border-b-2 transition-colors -mb-px ${tab === t.id ? 'border-primary text-primary' : 'border-transparent text-muted-foreground hover:text-foreground'}`}
          >
            <t.icon size={14} />
            {t.label}
            {t.badge > 0 && (
              <span className={`text-[10px] px-1.5 py-0.5 rounded-full font-bold ${t.id === 'aujourd_hui' ? 'bg-red-500 text-white' : 'bg-primary/20 text-primary'}`}>
                {t.badge}
              </span>
            )}
          </button>
        ))}
      </div>

      {/* ===== AUJOURD'HUI ===== */}
      {tab === 'aujourd_hui' && (
        <div className="space-y-3">
          {rapAujourdhui.length === 0 ? (
            <EmptyState
              icon={Bell}
              title="Aucun rappel aujourd'hui"
              description="Bien joué ! Vous êtes à jour avec tous vos rappels."
            />
          ) : (
            rapAujourdhui.map(r => (
              <div key={r.id} className="bg-amber-50 border border-amber-200 rounded-2xl p-4 flex items-start justify-between gap-4">
                <div className="flex-1 min-w-0 space-y-1">
                  <div className="flex items-center gap-2 flex-wrap">
                    <p className="font-semibold text-amber-900">{r.titre}</p>
                    <TypeBadge type={r.type} />
                  </div>
                  <div className="flex items-center gap-2 flex-wrap text-sm text-amber-700">
                    {r.heure_rappel && <span className="flex items-center gap-1"><Clock size={12} /> {r.heure_rappel}</span>}
                    <ContextBadge rappel={r} />
                  </div>
                  {r.notes && <p className="text-xs text-amber-600/80 mt-1">{r.notes}</p>}
                </div>
                <div className="flex items-center gap-2 shrink-0">
                  <Button size="sm" variant="outline" className="gap-1 text-amber-700 border-amber-300 hover:bg-amber-100" onClick={() => setReporterRappel(r)}>
                    <RotateCcw size={13} /> Reporter
                  </Button>
                  <Button size="sm" className="gap-1 bg-emerald-600 hover:bg-emerald-700" onClick={() => markFait(r.id)}>
                    <Check size={13} /> Fait
                  </Button>
                </div>
              </div>
            ))
          )}
        </div>
      )}

      {/* ===== À VENIR ===== */}
      {tab === 'a_venir' && (
        <div className="space-y-4">
          {/* Filtres */}
          <div className="flex flex-wrap gap-3 items-center">
            <select value={filterType} onChange={e => setFilterType(e.target.value)} className="h-9 rounded-lg border border-input bg-background px-3 text-sm focus-visible:outline-none focus-visible:ring-1 focus-visible:ring-ring">
              <option value="">Tous les types</option>
              <option value="Manuel">Manuel</option>
              <option value="Automatique">Automatique</option>
            </select>
            <select value={filterEv} onChange={e => setFilterEv(e.target.value)} className="h-9 rounded-lg border border-input bg-background px-3 text-sm focus-visible:outline-none focus-visible:ring-1 focus-visible:ring-ring">
              <option value="">Tous les événements</option>
              {evenements.map(ev => <option key={ev.id} value={ev.id}>{ev.nom}</option>)}
            </select>
          </div>

          {filteredAVenir.length === 0 ? (
            <EmptyState
              icon={CalendarClock}
              title="Aucun rappel à venir"
              description="Tous les rappels en attente ont été résolus ou archivés."
            />
          ) : (
            <div className="space-y-2">
              {filteredAVenir.map(r => (
                <div key={r.id} className="bg-card border border-border rounded-2xl p-4 flex items-start justify-between gap-4 hover:shadow-sm transition-shadow">
                  <div className="flex items-start gap-3 flex-1 min-w-0">
                    <div className="w-10 h-10 rounded-xl bg-primary/10 flex items-center justify-center shrink-0">
                      <Bell size={16} className="text-primary" />
                    </div>
                    <div className="flex-1 min-w-0 space-y-1">
                      <p className="font-medium">{r.titre}</p>
                      <div className="flex items-center gap-2 flex-wrap text-sm text-muted-foreground">
                        <span>{r.date_rappel ? format(parseISO(r.date_rappel), 'd MMM yyyy', { locale: fr }) : '—'}</span>
                        {r.heure_rappel && <span>à {r.heure_rappel}</span>}
                        <ContextBadge rappel={r} />
                        <TypeBadge type={r.type} />
                      </div>
                      {r.notes && <p className="text-xs text-muted-foreground">{r.notes}</p>}
                    </div>
                  </div>
                  <div className="flex items-center gap-2 shrink-0">
                    <Button size="sm" variant="outline" onClick={() => setReporterRappel(r)}><RotateCcw size={13} /></Button>
                    <Button size="sm" className="bg-emerald-600 hover:bg-emerald-700" onClick={() => markFait(r.id)}><Check size={13} /></Button>
                  </div>
                </div>
              ))}
            </div>
          )}
        </div>
      )}

      {/* ===== HISTORIQUE ===== */}
      {tab === 'historique' && (
        <div className="space-y-4">
          <div className="relative">
            <Input value={searchHisto} onChange={e => setSearchHisto(e.target.value)} placeholder="Rechercher dans l'historique…" className="pl-9" />
            <History size={14} className="absolute left-3 top-1/2 -translate-y-1/2 text-muted-foreground" />
          </div>
          {filteredHisto.length === 0 ? (
            <EmptyState
              icon={History}
              title="Aucun historique"
              description="Les rappels résolus ou archivés apparaîtront ici."
            />
          ) : (
            <div className="space-y-2">
              {filteredHisto.map(r => {
                const s = STATUT_ICON[r.statut] || STATUT_ICON['En attente'];
                return (
                  <div key={r.id} className="bg-card border border-border rounded-2xl p-4 flex items-start justify-between gap-4 opacity-80">
                    <div className="flex items-start gap-3 flex-1 min-w-0">
                      <div className={`w-9 h-9 rounded-xl flex items-center justify-center text-lg shrink-0 ${s.cls}`}>{s.emoji}</div>
                      <div className="flex-1 min-w-0 space-y-1">
                        <p className="font-medium">{r.titre}</p>
                        <div className="flex items-center gap-2 flex-wrap text-sm text-muted-foreground">
                          <span>{r.date_rappel ? format(parseISO(r.date_rappel), 'd MMM yyyy', { locale: fr }) : '—'}</span>
                          {r.heure_rappel && <span>à {r.heure_rappel}</span>}
                          <ContextBadge rappel={r} />
                          <TypeBadge type={r.type} />
                        </div>
                        {r.notes && <p className="text-xs text-muted-foreground">{r.notes}</p>}
                      </div>
                    </div>
                    <span className={`text-xs px-2.5 py-1 rounded-full font-medium shrink-0 ${s.cls}`}>{r.statut}</span>
                  </div>
                );
              })}
            </div>
          )}
        </div>
      )}

      {modalOpen && (
        <RappelModal
          onClose={() => setModalOpen(false)}
          onSaved={() => qc.invalidateQueries(['rappels'])}
        />
      )}
      {reporterRappel && (
        <ReporterRappelModal
          rappel={reporterRappel}
          onClose={() => setReporterRappel(null)}
          onSaved={() => qc.invalidateQueries(['rappels'])}
        />
      )}
    </div>
  );
}