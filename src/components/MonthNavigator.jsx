import { ChevronLeft, ChevronRight } from 'lucide-react';
import { addMonths, subMonths, format } from 'date-fns';
import { fr } from 'date-fns/locale';
import { useState } from 'react';

export default function MonthNavigator({ currentDate, onDateChange }) {
  const [lastClickTime, setLastClickTime] = useState(0);

  const handleMonthClick = () => {
    const now = Date.now();
    const timeSinceLastClick = now - lastClickTime;
    
    // Double tap ou appui long (si entre deux clics en moins de 300ms)
    if (timeSinceLastClick < 300) {
      onDateChange(new Date());
    }
    setLastClickTime(now);
  };

  const handlePrev = () => {
    onDateChange(subMonths(currentDate, 1));
    setLastClickTime(0);
  };

  const handleNext = () => {
    onDateChange(addMonths(currentDate, 1));
    setLastClickTime(0);
  };

  const monthLabel = format(currentDate, 'MMMM yyyy', { locale: fr });

  return (
    <div className="flex items-center gap-2 justify-center">
      <button
        onClick={handlePrev}
        className="p-1.5 rounded-lg hover:bg-muted transition-colors text-muted-foreground hover:text-foreground"
        title="Mois précédent"
        aria-label="Mois précédent"
      >
        <ChevronLeft size={18} />
      </button>
      <button
        onClick={handleMonthClick}
        onDoubleClick={e => e.preventDefault()}
        className="px-4 py-1.5 rounded-lg hover:bg-muted transition-colors text-sm font-medium min-w-[140px] text-center cursor-pointer"
        title="Double-clic pour aujourd'hui"
      >
        {monthLabel}
      </button>
      <button
        onClick={handleNext}
        className="p-1.5 rounded-lg hover:bg-muted transition-colors text-muted-foreground hover:text-foreground"
        title="Mois suivant"
        aria-label="Mois suivant"
      >
        <ChevronRight size={18} />
      </button>
    </div>
  );
}