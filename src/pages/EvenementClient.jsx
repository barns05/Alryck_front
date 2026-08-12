import { useEffect, useState } from 'react';
import { base44 } from '@/api/base44Client';
import { Calendar, MapPin, Users, Clock, MessageSquare, CheckCircle, PartyPopper } from 'lucide-react';
import { format, parseISO, differenceInDays, differenceInHours, differenceInMinutes } from 'date-fns';
import { fr } from 'date-fns/locale';

const statutColors = {
  'En préparation': 'bg-amber-100 text-amber-700',
  'Confirmé':       'bg-emerald-100 text-emerald-700',
  'En cours':       'bg-blue-100 text-blue-700',
  'Terminé':        'bg-slate-100 text-slate-600',
  'Annulé':         'bg-red-100 text-red-600',
};

const typeIcons = {
  'Mariage':             '💍',
  'Baptême':             '🕊️',
  'Anniversaire':        '🎂',
  "Soirée d'entreprise": '🏢',
  'Cocktail':            '🥂',
  'Gala':                '✨',
  'Autre':               '🎉',
};

function Section({ icon: Icon, title, children }) {
  return (
    <div className="bg-white rounded-2xl border border-slate-200 shadow-sm p-5 space-y-3">
      <div className="flex items-center gap-2 text-slate-800">
        <div className="w-8 h-8 rounded-lg bg-primary/10 flex items-center justify-center">
          <Icon size={16} className="text-primary" />
        </div>
        <h3 className="font-semibold text-sm uppercase tracking-wide text-slate-500">{title}</h3>
      </div>
      {children}
    </div>
  );
}

function Countdown({ date }) {
  const [now, setNow] = useState(new Date());

  useEffect(() => {
    const timer = setInterval(() => setNow(new Date()), 60000);
    return () => clearInterval(timer);
  }, []);

  const eventDate = parseISO(date);
  const totalDays = differenceInDays(eventDate, now);
  const totalHours = differenceInHours(eventDate, now);

  if (totalDays < 0) return null;

  if (totalDays === 0) {
    const hours = differenceInHours(eventDate, now);
    return (
      <div className="bg-gradient-to-r from-primary to-primary/80 rounded-2xl p-5 text-white text-center">
        <p className="text-sm font-medium mb-2 opacity-80">C'est aujourd'hui ! 🎊</p>
        {hours > 0 && (
          <p className="text-lg font-semibold">{hours}h restantes avant votre événement</p>
        )}
        {hours === 0 && <p className="text-xl font-bold">C'est l'heure ! 🥂</p>}
      </div>
    );
  }

  const weeks = Math.floor(totalDays / 7);
  const days = totalDays % 7;
  const months = Math.floor(totalDays / 30);

  return (
    <div className="bg-gradient-to-r from-primary to-primary/80 rounded-2xl p-5 text-white">
      <p className="text-sm font-medium mb-3 opacity-80 text-center">Compte à rebours</p>
      <div className="grid grid-cols-3 gap-3">
        {months > 0 && (
          <div className="bg-white/20 rounded-xl p-3 text-center">
            <p className="text-2xl font-bold">{months}</p>
            <p className="text-xs opacity-75">mois</p>
          </div>
        )}
        <div className="bg-white/20 rounded-xl p-3 text-center">
          <p className="text-2xl font-bold">{totalDays}</p>
          <p className="text-xs opacity-75">jours</p>
        </div>
        {weeks > 0 && (
          <div className="bg-white/20 rounded-xl p-3 text-center">
            <p className="text-2xl font-bold">{weeks}</p>
            <p className="text-xs opacity-75">semaines</p>
          </div>
        )}
        {months === 0 && (
          <div className="bg-white/20 rounded-xl p-3 text-center">
            <p className="text-2xl font-bold">{totalHours}</p>
            <p className="text-xs opacity-75">heures</p>
          </div>
        )}
      </div>
      <p className="text-center text-sm mt-3 opacity-75 capitalize">
        {format(eventDate, "EEEE d MMMM yyyy", { locale: fr })}
      </p>
    </div>
  );
}

export default function EvenementClient() {
  const [evenement, setEvenement] = useState(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);

  useEffect(() => {
    const params = new URLSearchParams(window.location.search);
    const token = params.get('token');

    if (!token) {
      setError('Lien invalide. Aucun token trouvé.');
      setLoading(false);
      return;
    }

    base44.entities.Evenement.filter({ lien_client_token: token })
      .then(results => {
        if (!results || results.length === 0) {
          setError('Événement introuvable. Vérifiez le lien ou contactez votre organisateur.');
        } else {
          setEvenement(results[0]);
        }
        setLoading(false);
      })
      .catch(() => {
        setError("Impossible de charger l'événement.");
        setLoading(false);
      });
  }, []);

  if (loading) {
    return (
      <div className="min-h-screen bg-gradient-to-br from-slate-50 to-blue-50 flex items-center justify-center">
        <div className="text-center space-y-3">
          <div className="w-10 h-10 border-4 border-primary/20 border-t-primary rounded-full animate-spin mx-auto" />
          <p className="text-slate-500 text-sm">Chargement de votre événement...</p>
        </div>
      </div>
    );
  }

  if (error) {
    return (
      <div className="min-h-screen bg-gradient-to-br from-slate-50 to-blue-50 flex items-center justify-center p-4">
        <div className="bg-white rounded-2xl border border-red-200 p-8 text-center max-w-md shadow-sm">
          <div className="text-4xl mb-3">😕</div>
          <h2 className="font-semibold text-lg mb-2 text-slate-800">Événement introuvable</h2>
          <p className="text-slate-500 text-sm">{error}</p>
        </div>
      </div>
    );
  }

  const ev = evenement;
  const emoji = typeIcons[ev.type_evenement] || '🎉';

  return (
    <div className="min-h-screen bg-gradient-to-br from-slate-50 via-white to-blue-50">
      {/* Hero */}
      <div className="bg-gradient-to-r from-primary to-primary/80 text-white">
        <div className="max-w-2xl mx-auto px-4 py-10 text-center">
          <div className="text-5xl mb-4">{emoji}</div>
          <h1 className="text-3xl font-bold mb-2">{ev.nom}</h1>
          {ev.type_evenement && (
            <span className="inline-block bg-white/20 text-white text-sm px-3 py-1 rounded-full font-medium mb-3">
              {ev.type_evenement}
            </span>
          )}
          <br />
          {ev.statut && (
            <span className={`inline-block text-xs px-3 py-1 rounded-full font-semibold mt-2 ${statutColors[ev.statut]}`}>
              {ev.statut}
            </span>
          )}
          {ev.date && (
            <p className="mt-3 text-white/80 text-sm capitalize">
              {format(parseISO(ev.date), 'EEEE d MMMM yyyy', { locale: fr })}
            </p>
          )}
        </div>
      </div>

      <div className="max-w-2xl mx-auto px-4 py-8 space-y-4">

        {/* Compte à rebours */}
        {ev.date && <Countdown date={ev.date} />}

        {/* Infos clés */}
        <Section icon={Calendar} title="Votre événement">
          <div className="grid grid-cols-2 gap-3">
            {ev.date && (
              <div className="bg-slate-50 rounded-xl p-3">
                <p className="text-xs text-slate-400 mb-0.5">Date</p>
                <p className="font-semibold text-slate-800 text-sm capitalize">
                  {format(parseISO(ev.date), 'd MMMM yyyy', { locale: fr })}
                </p>
              </div>
            )}
            {(ev.heure_debut || ev.heure_fin) && (
              <div className="bg-slate-50 rounded-xl p-3">
                <p className="text-xs text-slate-400 mb-0.5">Horaires</p>
                <p className="font-semibold text-slate-800 text-sm">{ev.heure_debut} – {ev.heure_fin}</p>
              </div>
            )}
            {ev.lieu_nom && (
              <div className="bg-slate-50 rounded-xl p-3 flex items-start gap-2">
                <MapPin size={13} className="text-slate-400 mt-0.5 shrink-0" />
                <div>
                  <p className="text-xs text-slate-400 mb-0.5">Lieu</p>
                  <p className="font-semibold text-slate-800 text-sm">{ev.lieu_nom}</p>
                </div>
              </div>
            )}
            {ev.nb_invites > 0 && (
              <div className="bg-slate-50 rounded-xl p-3 flex items-start gap-2">
                <Users size={13} className="text-slate-400 mt-0.5 shrink-0" />
                <div>
                  <p className="text-xs text-slate-400 mb-0.5">Invités</p>
                  <p className="font-semibold text-slate-800 text-sm">{ev.nb_invites} personnes</p>
                </div>
              </div>
            )}
          </div>
        </Section>

        {/* Prestations */}
        {ev.prestations && (
          <Section icon={CheckCircle} title="Prestations choisies">
            <div className="space-y-1.5">
              {ev.prestations.split(',').map((p, i) => (
                <div key={i} className="flex items-center gap-2 text-sm text-slate-700">
                  <div className="w-1.5 h-1.5 rounded-full bg-primary shrink-0" />
                  {p.trim()}
                </div>
              ))}
            </div>
          </Section>
        )}

        {/* Déroulement */}
        {ev.deroulement && (
          <Section icon={Clock} title="Programme de la journée">
            <div className="space-y-2">
              {ev.deroulement.split('\n').filter(l => l.trim()).map((line, i) => {
                const match = line.match(/^(\d{1,2}[h:]\d{0,2})\s*[:–-]?\s*(.+)/);
                if (match) {
                  return (
                    <div key={i} className="flex items-start gap-3">
                      <span className="text-xs font-bold text-primary bg-primary/10 px-2 py-1 rounded-lg shrink-0 min-w-[52px] text-center">
                        {match[1]}
                      </span>
                      <span className="text-sm text-slate-700 pt-0.5">{match[2]}</span>
                    </div>
                  );
                }
                return <div key={i} className="text-sm text-slate-700 pl-1">{line}</div>;
              })}
            </div>
          </Section>
        )}

        {/* Message organisateur */}
        {ev.notes_client && (
          <Section icon={MessageSquare} title="Message de votre organisateur">
            <div className="bg-blue-50 rounded-xl p-4 text-sm text-blue-800 leading-relaxed">
              {ev.notes_client}
            </div>
          </Section>
        )}

        {/* Footer */}
        <div className="text-center pt-4 pb-8">
          <div className="flex items-center justify-center gap-2 text-slate-400 text-xs">
            <PartyPopper size={13} />
            <span>Page partagée par votre organisateur — ExtraPlanning</span>
          </div>
        </div>
      </div>
    </div>
  );
}