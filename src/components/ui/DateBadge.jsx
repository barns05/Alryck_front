import { format, parseISO } from 'date-fns';
import { fr } from 'date-fns/locale';
import { formatEvenementDate, isEvenementDateExacte } from '@/lib/evenementDate';

/**
 * Mini-calendrier vertical : mois / jour / année
 * Utilisé dans les listes d'événements et de rendez-vous.
 *
 * Si un `evenement` est transmis et qu'il n'est pas en mode 'exacte' (mois ou période),
 * on affiche le libellé formaté (ex: « Août 2027 », « Été 2027 ») au lieu du calendrier,
 * car la date technique ne doit jamais être affichée telle quelle.
 */
export default function DateBadge({ date, evenement, className = '' }) {
  if (evenement && !isEvenementDateExacte(evenement)) {
    const info = formatEvenementDate(evenement);
    return (
      <div className={`text-center min-w-[44px] max-w-[60px] bg-muted rounded-xl py-2 px-1 shrink-0 flex flex-col justify-center ${className}`}>
        <p className="text-[10px] font-semibold text-muted-foreground leading-tight line-clamp-2">{info.label}</p>
      </div>
    );
  }

  if (!date) {
    return (
      <div className={`text-center min-w-[44px] bg-muted rounded-xl py-2 shrink-0 ${className}`}>
        <p className="text-xs text-muted-foreground">—</p>
        <p className="text-lg font-bold leading-none">—</p>
      </div>
    );
  }

  const parsed = typeof date === 'string' ? parseISO(date) : date;

  return (
    <div className={`text-center min-w-[44px] bg-muted rounded-xl py-2 shrink-0 ${className}`}>
      <p className="text-xs text-muted-foreground capitalize">{format(parsed, 'MMM', { locale: fr })}</p>
      <p className="text-lg font-bold leading-none">{format(parsed, 'd')}</p>
      <p className="text-xs text-muted-foreground">{format(parsed, 'yyyy')}</p>
    </div>
  );
}