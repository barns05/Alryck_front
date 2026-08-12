import { useState } from 'react';
import { useQuery } from '@tanstack/react-query';
import { base44 } from '@/api/base44Client';
import { X, BarChart2 } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { parseISO, isWithinInterval, startOfQuarter, endOfQuarter, startOfYear, endOfYear } from 'date-fns';

export default function RecapJoursModal({ extras, getWorkedDaysDetail, currentDate, onClose }) {
  const [period, setPeriod] = useState('month');

  const { data: allAssignments = [] } = useQuery({
    queryKey: ['assignments-recap', period],
    queryFn: () => base44.entities.ServiceAssignment.list('-created_date', 1500),
    enabled: period !== 'month',
    staleTime: 5 * 60 * 1000,
  });

  const { data: allServices = [] } = useQuery({
    queryKey: ['services-recap', period],
    queryFn: () => base44.entities.Service.list('-date', 600),
    enabled: period !== 'month',
    staleTime: 5 * 60 * 1000,
  });

  const getWorkedDaysDetailLocal = (extra, p) => {
    if (p === 'month') return getWorkedDaysDetail(extra, p);

    const now = currentDate || new Date();
    const interval = p === 'quarter'
      ? { start: startOfQuarter(now), end: endOfQuarter(now) }
      : { start: startOfYear(now), end: endOfYear(now) };

    const result = [];
    allAssignments.forEach(a => {
      if (a.statut === 'Annulé' || a.statut === 'Indispo') return;
      if (a.extra_id !== extra.id && a.extra_id !== extra.email && a.extra_email !== extra.email) return;
      const svc = allServices.find(s => s.id === a.service_id);
      if (!svc?.date) return;
      const svcDate = parseISO(svc.date);
      if (!isWithinInterval(svcDate, interval)) return;
      result.push({ date: svc.date, statut: a.statut });
    });

    const seen = new Set();
    return result.filter(d => {
      if (seen.has(d.date)) return false;
      seen.add(d.date);
      return true;
    });
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/40 backdrop-blur-sm p-4">
      <div className="bg-card rounded-2xl border border-border shadow-xl w-full max-w-sm flex flex-col max-h-[80vh]">
        {/* Header */}
        <div className="flex items-center justify-between px-5 py-4 border-b border-border shrink-0">
          <div className="flex items-center gap-2">
            <BarChart2 size={16} className="text-primary" />
            <span className="font-bold text-base">Récapitulatif des jours</span>
          </div>
          <button onClick={onClose} className="p-1.5 rounded-lg hover:bg-muted text-muted-foreground">
            <X size={15} />
          </button>
        </div>

        {/* Filtres période */}
        <div className="px-5 pt-3 pb-2 shrink-0">
          <div className="flex rounded-lg border border-border overflow-hidden w-fit">
            {[
              { key: 'month', label: 'Mois' },
              { key: 'quarter', label: 'Trimestre' },
              { key: 'year', label: 'Année' },
            ].map(({ key, label }) => (
              <button
                key={key}
                onClick={() => setPeriod(key)}
                className={`px-3 py-1.5 text-xs font-medium transition-colors border-r last:border-r-0 border-border ${
                  period === key ? 'bg-primary text-primary-foreground' : 'bg-card text-muted-foreground hover:bg-muted'
                }`}
              >
                {label}
              </button>
            ))}
          </div>
        </div>

        {/* Liste extras */}
        <div className="overflow-y-auto flex-1 px-5 pb-4 space-y-1.5">
          {extras.map(extra => {
            const days = getWorkedDaysDetailLocal(extra, period);
            const count = days.length;
            return (
              <div key={extra.id} className="flex items-center justify-between py-2 border-b border-border/50 last:border-0">
                <span className="text-sm font-medium truncate max-w-[60%]">{extra.nom}</span>
                <span className={`text-sm font-bold px-2.5 py-0.5 rounded-full ${
                  count > 5 ? 'bg-red-100 text-red-600' :
                  count > 3 ? 'bg-amber-100 text-amber-700' :
                  count > 0 ? 'bg-emerald-100 text-emerald-700' :
                  'bg-muted text-muted-foreground'
                }`}>
                  {count} j.
                </span>
              </div>
            );
          })}
          {extras.length === 0 && (
            <p className="text-center text-sm text-muted-foreground py-8">Aucun extra actif</p>
          )}
        </div>

        <div className="flex justify-end px-5 pb-4 shrink-0">
          <Button variant="outline" size="sm" onClick={onClose}>Fermer</Button>
        </div>
      </div>
    </div>
  );
}