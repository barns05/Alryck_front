/**
 * AgendaCalendar — Vue calendrier mensuelle simple
 * Points colorés selon le type : bleu (prestataire confirmé), jaune (en attente), vert (note perso)
 * Navigation libre dans le passé et le futur
 */
import { useState } from 'react';
import { format, startOfMonth, endOfMonth, startOfWeek, endOfWeek, eachDayOfInterval, isSameDay, addMonths, subMonths } from 'date-fns';
import { fr } from 'date-fns/locale';
import { ChevronLeft, ChevronRight } from 'lucide-react';

const DOT_COLORS = {
  prestataire_confirme: '#1d4ed8',
  prestataire_attente: '#b45309',
  personnel: '#15803d',
  autre: '#9ca3af',
};

function getDotColor(rdv) {
  if (rdv.statut === 'Annulé' || rdv.statut === 'Terminé') return DOT_COLORS.autre;
  if (rdv.origine === 'Personnel') return DOT_COLORS.personnel;
  if (rdv.origine === 'Prestataire') {
    return rdv.statut === 'Confirmé' ? DOT_COLORS.prestataire_confirme : DOT_COLORS.prestataire_attente;
  }
  return DOT_COLORS.autre;
}

function getRdvDate(rdv) {
  return rdv.statut === 'Confirmé' ? rdv.date_confirmee : rdv.date_souhaitee;
}

function getRdvHeure(rdv) {
  return rdv.statut === 'Confirmé' ? rdv.heure_confirmee : rdv.heure_souhaitee;
}

function getRdvTitre(rdv) {
  return rdv.origine === 'Personnel' ? (rdv.titre || 'Note personnelle') : (rdv.motif || 'Rendez-vous');
}

export default function AgendaCalendar({ rdvs, selectedDate, onDateSelect }) {
  const [currentMonth, setCurrentMonth] = useState(new Date());

  const monthStart = startOfMonth(currentMonth);
  const monthEnd = endOfMonth(currentMonth);
  const calendarStart = startOfWeek(monthStart, { weekStartsOn: 1 });
  const calendarEnd = endOfWeek(monthEnd, { weekStartsOn: 1 });
  const days = eachDayOfInterval({ start: calendarStart, end: calendarEnd });

  // Indexer les RDV par date
  const rdvsByDate = {};
  rdvs.forEach(rdv => {
    const dateStr = getRdvDate(rdv);
    if (dateStr) {
      if (!rdvsByDate[dateStr]) rdvsByDate[dateStr] = [];
      rdvsByDate[dateStr].push(rdv);
    }
  });

  const weekDays = ['Lun', 'Mar', 'Mer', 'Jeu', 'Ven', 'Sam', 'Dim'];

  const handleDayClick = (day) => {
    const dateStr = format(day, 'yyyy-MM-dd');
    onDateSelect?.(dateStr);
  };

  const isToday = (day) => isSameDay(day, new Date());

  // selectedDay dérivé de selectedDate (string yyyy-MM-dd)
  const selectedDayDate = selectedDate ? new Date(selectedDate + 'T00:00:00') : null;
  const selectedDayRdvs = selectedDate ? (rdvsByDate[selectedDate] || []) : [];

  return (
    <div className="space-y-3">
      {/* Navigation mois */}
      <div className="flex items-center justify-between">
        <button onClick={() => setCurrentMonth(m => subMonths(m, 1))}
          className="w-8 h-8 flex items-center justify-center rounded-lg border hover:bg-muted transition-colors"
          style={{ borderColor: '#e2e8f0' }}>
          <ChevronLeft size={16} style={{ color: '#1e1b4b' }} />
        </button>
        <p className="font-semibold text-sm capitalize" style={{ color: '#1e1b4b' }}>
          {format(currentMonth, 'MMMM yyyy', { locale: fr })}
        </p>
        <button onClick={() => setCurrentMonth(m => addMonths(m, 1))}
          className="w-8 h-8 flex items-center justify-center rounded-lg border hover:bg-muted transition-colors"
          style={{ borderColor: '#e2e8f0' }}>
          <ChevronRight size={16} style={{ color: '#1e1b4b' }} />
        </button>
      </div>

      {/* En-têtes jours */}
      <div className="grid grid-cols-7 gap-1">
        {weekDays.map(d => (
          <div key={d} className="text-center text-[10px] font-semibold text-gray-400 py-1">{d}</div>
        ))}
      </div>

      {/* Grille mensuelle */}
      <div className="grid grid-cols-7 gap-1">
        {days.map((day, i) => {
          const dateStr = format(day, 'yyyy-MM-dd');
          const dayRdvs = rdvsByDate[dateStr] || [];
          const isCurrentMonth = day.getMonth() === currentMonth.getMonth();
          const isSelected = selectedDayDate && isSameDay(day, selectedDayDate);
          const today = isToday(day);
          return (
            <button
              key={i}
              onClick={() => handleDayClick(day)}
              className="aspect-square rounded-lg flex flex-col items-center justify-center gap-0.5 transition-colors"
              style={{
                background: isSelected ? '#eef2ff' : (dayRdvs.length > 0 ? '#f8faff' : 'transparent'),
                opacity: isCurrentMonth ? 1 : 0.3,
                border: today ? '1.5px solid #1d4ed8' : '1px solid transparent',
              }}
            >
              <span className="font-medium text-xs" style={{ color: isCurrentMonth ? '#1e1b4b' : '#9ca3af' }}>
                {format(day, 'd')}
              </span>
              {dayRdvs.length > 0 && (
                <div className="flex gap-0.5 flex-wrap justify-center">
                  {dayRdvs.slice(0, 3).map((rdv, idx) => (
                    <span key={idx} className="w-1.5 h-1.5 rounded-full" style={{ background: getDotColor(rdv) }} />
                  ))}
                </div>
              )}
            </button>
          );
        })}
      </div>

      {/* Légende */}
      <div className="flex gap-3 justify-center flex-wrap">
        <div className="flex items-center gap-1">
          <span className="w-2 h-2 rounded-full" style={{ background: DOT_COLORS.prestataire_confirme }} />
          <span className="text-[10px] text-gray-400">Prestataire confirmé</span>
        </div>
        <div className="flex items-center gap-1">
          <span className="w-2 h-2 rounded-full" style={{ background: DOT_COLORS.prestataire_attente }} />
          <span className="text-[10px] text-gray-400">En attente</span>
        </div>
        <div className="flex items-center gap-1">
          <span className="w-2 h-2 rounded-full" style={{ background: DOT_COLORS.personnel }} />
          <span className="text-[10px] text-gray-400">Note perso</span>
        </div>
      </div>

      {/* Détail du jour sélectionné */}
      {selectedDayDate && (
        <div className="rounded-xl border p-3 space-y-2" style={{ borderColor: '#e2e8f0', background: '#f8faff' }}>
          <p className="text-xs font-bold capitalize" style={{ color: '#1e1b4b' }}>
            {format(selectedDayDate, 'EEEE d MMMM yyyy', { locale: fr })}
          </p>
          {selectedDayRdvs.length === 0 ? (
            <p className="text-xs text-gray-400">Aucun événement ce jour</p>
          ) : (
            <div className="space-y-1.5">
              {selectedDayRdvs.map(rdv => (
                <div key={rdv.id} className="flex items-center gap-2 text-xs">
                  <span className="w-2 h-2 rounded-full shrink-0" style={{ background: getDotColor(rdv) }} />
                  <span className="font-medium flex-1 truncate" style={{ color: '#1e1b4b' }}>
                    {getRdvTitre(rdv)}
                  </span>
                  {getRdvHeure(rdv) && (
                    <span className="text-gray-400">{getRdvHeure(rdv)}</span>
                  )}
                </div>
              ))}
            </div>
          )}
        </div>
      )}
    </div>
  );
}