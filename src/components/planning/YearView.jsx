import { format, startOfMonth, endOfMonth, startOfWeek, endOfWeek, addDays, parseISO, isSameDay, isSameMonth, isToday } from 'date-fns';
import { fr } from 'date-fns/locale';

function MiniMonth({ monthDate, evenements, services, dispoPrestataires, allRdvs, onDayClick, onMonthClick }) {
  const monthStart = startOfMonth(monthDate);
  const monthEnd = endOfMonth(monthDate);
  const gridStart = startOfWeek(monthStart, { weekStartsOn: 1 });
  const gridEnd = endOfWeek(monthEnd, { weekStartsOn: 1 });

  const days = [];
  let d = gridStart;
  while (d <= gridEnd) { days.push(new Date(d)); d = addDays(d, 1); }

  const hasEvent = (day) =>
    evenements.some(e => e.date && isSameDay(parseISO(e.date), day)) ||
    services.some(s => s.date && isSameDay(parseISO(s.date), day)) ||
    dispoPrestataires.some(p => p.date && isSameDay(parseISO(p.date), day)) ||
    allRdvs.some(r => r.date_confirmee && isSameDay(parseISO(r.date_confirmee), day));

  const getEventColors = (day) => {
    const colors = [];
    if (evenements.some(e => e.date && isSameDay(parseISO(e.date), day))) colors.push('bg-orange-400');
    if (services.some(s => s.date && isSameDay(parseISO(s.date), day))) colors.push('bg-blue-400');
    if (dispoPrestataires.some(p => p.date && isSameDay(parseISO(p.date), day))) colors.push('bg-purple-400');
    if (allRdvs.some(r => r.date_confirmee && isSameDay(parseISO(r.date_confirmee), day))) colors.push('bg-emerald-400');
    return colors;
  };

  return (
    <div
      onClick={() => onMonthClick && onMonthClick(monthDate)}
      className="bg-card rounded-xl border border-border p-3 space-y-2 cursor-pointer hover:bg-primary/5 hover:border-primary/30 transition-colors group"
    >
      <p className="text-xs font-semibold text-center capitalize text-foreground group-hover:text-primary transition-colors">
        {format(monthDate, 'MMMM', { locale: fr })}
      </p>
      <div className="grid grid-cols-7 gap-0.5">
        {['L', 'M', 'M', 'J', 'V', 'S', 'D'].map((l, i) => (
          <div key={i} className="text-[9px] text-center text-muted-foreground font-medium py-0.5">{l}</div>
        ))}
        {days.map((day, i) => {
          const inMonth = isSameMonth(day, monthDate);
          const today = isToday(day);
          const colors = inMonth ? getEventColors(day) : [];
          return (
            <div
              key={i}
              onClick={(e) => { e.stopPropagation(); inMonth && onDayClick(day); }}
              className={`relative flex flex-col items-center justify-start pt-0.5 pb-1 rounded transition-colors
                ${inMonth ? 'cursor-pointer hover:bg-muted/50' : 'cursor-default'}
                ${!inMonth ? 'opacity-20' : ''}
              `}
            >
              <span className={`text-[10px] font-medium w-5 h-5 flex items-center justify-center rounded-full
                ${today ? 'bg-primary text-primary-foreground' : inMonth ? 'text-foreground' : 'text-muted-foreground'}
              `}>
                {format(day, 'd')}
              </span>
              {colors.length > 0 && (
                <div className="flex gap-0.5 mt-0.5">
                  {colors.slice(0, 3).map((c, ci) => (
                    <span key={ci} className={`w-1 h-1 rounded-full ${c}`} />
                  ))}
                </div>
              )}
            </div>
          );
        })}
      </div>
    </div>
  );
}

export default function YearView({ currentDate, evenements, services, dispoPrestataires, allRdvs, onDayClick, onMonthClick }) {
  const year = currentDate.getFullYear();
  const months = Array.from({ length: 12 }, (_, i) => new Date(year, i, 1));

  return (
    <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-4 gap-3">
      {months.map((m, i) => (
        <MiniMonth
          key={i}
          monthDate={m}
          evenements={evenements}
          services={services}
          dispoPrestataires={dispoPrestataires}
          allRdvs={allRdvs}
          onDayClick={onDayClick}
          onMonthClick={onMonthClick}
        />
      ))}
    </div>
  );
}