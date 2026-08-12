import { useState, useEffect } from 'react';
import { parseISO, differenceInDays, differenceInHours, differenceInMinutes, differenceInSeconds, isPast } from 'date-fns';
import { fr } from 'date-fns/locale';
import { format } from 'date-fns';
import { formatEvenementDate, isEvenementDateExacte } from '@/lib/evenementDate';

export default function CountdownSection({ evenement }) {
  const [timeLeft, setTimeLeft] = useState({ days: 0, hours: 0, minutes: 0, seconds: 0 });
  const [isPassed, setIsPassed] = useState(false);

  useEffect(() => {
    if (!evenement.date) return;
    // Forcer midi heure locale pour éviter les problèmes de fuseau horaire
    const eventDate = new Date(evenement.date + 'T12:00:00');

    const calc = () => {
      const now = new Date();
      if (isPast(eventDate)) {
        setIsPassed(true);
        return;
      }
      const days = differenceInDays(eventDate, now);
      const hours = differenceInHours(eventDate, now) % 24;
      const minutes = differenceInMinutes(eventDate, now) % 60;
      const seconds = differenceInSeconds(eventDate, now) % 60;
      setTimeLeft({ days, hours, minutes, seconds });
    };
    calc();
    const interval = setInterval(calc, 1000);
    return () => clearInterval(interval);
  }, [evenement.date]);

  const TypeIcon = { Mariage: '💍', Baptême: '🍼', Anniversaire: '🎂', "Soirée d'entreprise": '🏢', Cocktail: '🥂', Gala: '✨', Autre: '🎉' };
  const icon = TypeIcon[evenement.type_evenement] || '🎉';

  const isExacte = isEvenementDateExacte(evenement);
  const dateLabel = isExacte
    ? format(new Date(evenement.date + 'T12:00:00'), 'EEEE d MMMM yyyy', { locale: fr })
    : formatEvenementDate(evenement).label;

  return (
    <div className="text-white rounded-2xl p-6 shadow-lg" style={{ background: 'linear-gradient(135deg, #1e1b4b, #2d2a6e)' }}>
      <div className="text-center mb-5">
        <div className="text-4xl mb-2">{icon}</div>
        <h2 className="text-xl font-bold">{evenement.nom}</h2>
        <p className="text-white/70 text-sm mt-1 capitalize">
          {evenement.type_evenement} · {dateLabel}
        </p>
      </div>

      {!isExacte ? (
        <div className="text-center bg-white/10 rounded-xl py-6">
          <p className="text-lg font-semibold">🗓️ Date à préciser</p>
          <p className="text-white/70 text-sm mt-1">La date exacte sera confirmée prochainement.</p>
        </div>
      ) : isPassed ? (
        <div className="text-center bg-white/10 rounded-xl py-4">
          <p className="text-lg font-semibold">Événement terminé 🎊</p>
          <p className="text-white/70 text-sm mt-1">Merci d'avoir fait confiance à notre équipe !</p>
        </div>
      ) : (
        <>
          <p className="text-center text-white/70 text-xs uppercase tracking-widest mb-3">Compte à rebours</p>
          <div className="grid grid-cols-4 gap-2">
            {[
              { val: timeLeft.days, label: 'Jours' },
              { val: timeLeft.hours, label: 'Heures' },
              { val: timeLeft.minutes, label: 'Min' },
              { val: timeLeft.seconds, label: 'Sec' },
            ].map(({ val, label }) => (
              <div key={label} className="bg-white/15 rounded-xl p-3 text-center">
                <p className="text-2xl font-bold tabular-nums">{String(val ?? 0).padStart(2, '0')}</p>
                <p className="text-[10px] text-white/60 mt-0.5">{label}</p>
              </div>
            ))}
          </div>
        </>
      )}
    </div>
  );
}