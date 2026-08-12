import { X, Calendar } from 'lucide-react';
import { format, parseISO } from 'date-fns';
import { fr } from 'date-fns/locale';
import { Button } from '@/components/ui/button';

const statutColors = {
  'Confirmé':   'bg-emerald-100 text-emerald-700',
  'En attente': 'bg-amber-100 text-amber-700',
  'Dispo':      'bg-blue-100 text-blue-700',
  'Indispo':    'bg-red-100 text-red-600',
  'Annulé':     'bg-slate-100 text-slate-500',
  'Terminé':    'bg-slate-100 text-slate-600',
};

export default function ExtraWorkedDaysModal({ extra, workedDays, onClose }) {
  // workedDays: [{ date, evenementNom, poste, heureDebut, statut }]
  const sorted = [...workedDays].sort((a, b) => a.date.localeCompare(b.date));

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/40 backdrop-blur-sm p-4">
      <div className="bg-card rounded-2xl border border-border shadow-xl w-full max-w-md flex flex-col max-h-[85vh]">
        {/* Header */}
        <div className="flex items-start justify-between p-5 border-b border-border shrink-0">
          <div>
            <p className="font-bold text-base">{extra.nom}</p>
            <p className="text-sm text-muted-foreground mt-0.5">
              {extra.poste && <span className="font-medium text-foreground">{extra.poste} · </span>}
              {sorted.length} jour{sorted.length > 1 ? 's' : ''} travaillé{sorted.length > 1 ? 's' : ''}
            </p>
          </div>
          <button onClick={onClose} className="p-1.5 rounded-lg hover:bg-muted text-muted-foreground">
            <X size={15} />
          </button>
        </div>

        {/* Liste */}
        <div className="overflow-y-auto flex-1 p-4 space-y-2">
          {sorted.length === 0 ? (
            <div className="text-center py-10 text-muted-foreground">
              <Calendar size={32} className="mx-auto mb-2 opacity-30" />
              <p className="text-sm">Aucun jour travaillé sur cette période</p>
            </div>
          ) : sorted.map((day, i) => (
            <div key={i} className="flex items-center justify-between bg-muted/40 rounded-xl px-3 py-2.5">
              <div className="space-y-0.5">
                <p className="text-sm font-semibold capitalize">
                  {format(parseISO(day.date), 'EEEE d MMMM yyyy', { locale: fr })}
                </p>
                <div className="flex flex-wrap items-center gap-2 text-xs text-muted-foreground">
                  {day.evenementNom && <span className="font-medium text-foreground">{day.evenementNom}</span>}
                  {day.poste && <span>{day.poste}</span>}
                  {day.heureDebut && <span>· {day.heureDebut}</span>}
                </div>
              </div>
              {day.statut && (
                <span className={`text-xs px-2.5 py-0.5 rounded-full font-medium shrink-0 ${statutColors[day.statut] || 'bg-gray-100 text-gray-600'}`}>
                  {day.statut}
                </span>
              )}
            </div>
          ))}
        </div>

        <div className="flex justify-end p-4 border-t border-border shrink-0">
          <Button variant="outline" onClick={onClose}>Fermer</Button>
        </div>
      </div>
    </div>
  );
}