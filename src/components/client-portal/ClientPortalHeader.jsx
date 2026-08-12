import { useState, useEffect } from 'react';
import { differenceInDays, isPast } from 'date-fns';
import { format } from 'date-fns';
import { fr } from 'date-fns/locale';
import { MapPin } from 'lucide-react';
import { formatEvenementDate, isEvenementDateExacte } from '@/lib/evenementDate';

const AMBIANCES = [
  { primary: '#5A734D', secondary: '#D7C88A' },
  { primary: '#1E1B4B', secondary: '#D6C08D' },
  { primary: '#B97A57', secondary: '#F0D8B6' },
  { primary: '#2A2A2A', secondary: '#C8A449' },
  { primary: '#C54B8C', secondary: '#F4B4D5' },
  { primary: '#3F7AA3', secondary: '#D7EEF7' },
  { primary: '#6B4CE6', secondary: '#FF9BCB' },
];

const TYPE_ICONS = {
  Mariage: '💍', Baptême: '🍼', Anniversaire: '🎂',
  "Soirée d'entreprise": '🏢', Cocktail: '🥂', Gala: '✨',
  Pacs: '💑', Séminaire: '📊', Location: '🏛️', Autre: '🎉',
  'Anniversaire de mariage': '💐',
};

function getProgress(createdDate, eventDate) {
  if (!createdDate || !eventDate) return 0;
  const start = new Date(createdDate).getTime();
  const end   = new Date(eventDate + 'T12:00:00').getTime();
  const now   = Date.now();
  if (end <= start) return 0;
  return Math.min(100, Math.max(0, Math.round(((now - start) / (end - start)) * 100)));
}

function getLuminance(hex) {
  const r = parseInt(hex.slice(1, 3), 16) / 255;
  const g = parseInt(hex.slice(3, 5), 16) / 255;
  const b = parseInt(hex.slice(5, 7), 16) / 255;
  const toLinear = c => c <= 0.03928 ? c / 12.92 : Math.pow((c + 0.055) / 1.055, 2.4);
  return 0.2126 * toLinear(r) + 0.7152 * toLinear(g) + 0.0722 * toLinear(b);
}

function darkenHex(hex, amount = 0.3) {
  const r = parseInt(hex.slice(1, 3), 16);
  const g = parseInt(hex.slice(3, 5), 16);
  const b = parseInt(hex.slice(5, 7), 16);
  const dr = Math.max(0, Math.round(r * (1 - amount)));
  const dg = Math.max(0, Math.round(g * (1 - amount)));
  const db = Math.max(0, Math.round(b * (1 - amount)));
  return `#${dr.toString(16).padStart(2, '0')}${dg.toString(16).padStart(2, '0')}${db.toString(16).padStart(2, '0')}`;
}

function lightenHex(hex, amount = 0.4) {
  const r = parseInt(hex.slice(1, 3), 16);
  const g = parseInt(hex.slice(3, 5), 16);
  const b = parseInt(hex.slice(5, 7), 16);
  const lr = Math.min(255, Math.round(r + (255 - r) * amount));
  const lg = Math.min(255, Math.round(g + (255 - g) * amount));
  const lb = Math.min(255, Math.round(b + (255 - b) * amount));
  return `#${lr.toString(16).padStart(2, '0')}${lg.toString(16).padStart(2, '0')}${lb.toString(16).padStart(2, '0')}`;
}

function pad(n) { return String(n).padStart(2, '0'); }

export default function ClientPortalHeader({ evenement, lieu, couleurTheme, client, clientNom }) {
  const [daysLeft, setDaysLeft] = useState(null);
  const [isPassed, setIsPassed] = useState(false);
  const [timeLeft, setTimeLeft] = useState({ hours: 0, minutes: 0, seconds: 0 });

  useEffect(() => {
    if (!evenement?.date) return;
    const eventDate = new Date(evenement.date + 'T12:00:00');

    const calc = () => {
      // Réinitialise l'état à chaque calcul pour repartir d'un base propre
      // quand on bascule d'un événement passé vers un événement futur.
      setIsPassed(false);
      if (isPast(eventDate)) { setIsPassed(true); return; }
      const diff = eventDate - Date.now();
      setDaysLeft(Math.floor(diff / 86400000));
      setTimeLeft({
        hours:   Math.floor((diff % 86400000) / 3600000),
        minutes: Math.floor((diff % 3600000) / 60000),
        seconds: Math.floor((diff % 60000) / 1000),
      });
    };
    calc();
    const id = setInterval(calc, 1000);
    return () => clearInterval(id);
  }, [evenement?.date]);

  const icon = TYPE_ICONS[evenement?.type_evenement] || '🎉';
  // Mode approximatif = mois OU période (tout ce qui n'est pas 'exacte')
  const isApprox = !isEvenementDateExacte(evenement);
  const dateStr = evenement?.date
    ? format(new Date(evenement.date + 'T12:00:00'), 'EEEE d MMMM yyyy', { locale: fr })
    : '';
  // Libellé formaté pour les modes mois/periode (ex: « Août 2027 », « Été 2027 »)
  const periodeStr = isApprox ? formatEvenementDate(evenement).label : '';

  const progress = getProgress(evenement?.created_date, evenement?.date);

  const hasBandeau = !!evenement?.photo_bandeau_url;
  const couleur = couleurTheme || evenement?.couleur_theme;

  const getSecondary = (primary) => {
    const found = AMBIANCES.find(a => a.primary.toLowerCase() === primary.toLowerCase());
    return found ? found.secondary : darkenHex(primary);
  };

  const getBgStyle = () => {
    if (hasBandeau) return {
      backgroundImage: `linear-gradient(rgba(0,0,0,0.45), rgba(0,0,0,0.45)), url(${evenement.photo_bandeau_url})`,
      backgroundSize: 'cover',
      backgroundPosition: 'center',
    };
    if (couleur) return { background: `linear-gradient(160deg, ${couleur} 0%, ${getSecondary(couleur)} 100%)` };
    return { background: 'linear-gradient(160deg, #1e1b4b 0%, #D6C08D 100%)' };
  };

  let textPrimary, textSecondary, accentColor, progressColor, progressTrack;
  if (hasBandeau) {
    textPrimary   = '#ffffff';
    textSecondary = 'rgba(255,255,255,0.85)';
    accentColor   = '#ffffff';
    progressColor = 'rgba(255,255,255,0.50)';
    progressTrack = 'rgba(255,255,255,0.20)';
  } else {
    const bgColor     = couleur || '#1e1b4b';
    const bgSecondary = getSecondary(bgColor);
    const avgLuminance = (getLuminance(bgColor) + getLuminance(bgSecondary)) / 2;
    const lightBg = avgLuminance > 0.4;
    textPrimary   = lightBg ? darkenHex(bgColor, 0.5) : '#ffffff';
    textSecondary = lightBg ? darkenHex(bgColor, 0.3) + 'aa' : 'rgba(255,255,255,0.7)';
    accentColor   = lightBg ? darkenHex(bgColor, 0.4) : lightenHex(bgColor, 0.6);
    progressColor = lightBg ? bgColor : lightenHex(bgColor, 0.4);
    progressTrack = lightBg ? 'rgba(0,0,0,0.12)' : 'rgba(255,255,255,0.12)';
  }

  return (
    <div
      className="mx-0 px-5 pb-5 space-y-4"
      style={{ ...getBgStyle(), color: textPrimary, paddingTop: '1.5rem' }}
    >
      {/* Type + nom + photo de profil */}
      <div className="space-y-1">
        <div className="flex items-center gap-2">
          <span className="text-2xl">{icon}</span>
          <span
            className="text-xs font-semibold px-2.5 py-0.5 rounded-full"
            style={{ background: 'rgba(246,231,193,0.25)', color: '#F6E7C1' }}
          >
            {evenement?.type_evenement}
          </span>
        </div>
        <div className="flex items-center gap-3">
          {client?.photo_profil_url ? (
            <img
              src={client.photo_profil_url}
              alt={clientNom || ''}
              className="w-12 h-12 rounded-full object-cover shrink-0"
              style={{ border: '2px solid #ffffff' }}
            />
          ) : clientNom ? (
            <div
              className="w-12 h-12 rounded-full flex items-center justify-center text-sm font-bold shrink-0"
              style={{ background: 'rgba(255,255,255,0.2)', border: '2px solid #ffffff', color: '#fff' }}
            >
              {clientNom.split(' ').filter(Boolean).map(w => w[0]).join('').toUpperCase().slice(0, 2)}
            </div>
          ) : null}
          <h1 className="text-xl font-bold leading-snug" style={{ color: textPrimary }}>{evenement?.nom}</h1>
        </div>
      </div>

      {/* Date + lieu + invités */}
      <div className="flex flex-wrap gap-x-4 gap-y-1 text-sm" style={{ color: textSecondary }}>
        {isApprox ? (
          periodeStr && (
            <span className="flex items-center gap-1.5">📅 {periodeStr}</span>
          )
        ) : (
          dateStr && (
            <span className="flex items-center gap-1.5 capitalize">📅 {dateStr}</span>
          )
        )}
        {evenement?.lieu_nom && (
          <span className="flex items-center gap-1.5">
            <MapPin size={13} className="shrink-0" /> {evenement.lieu_nom}
          </span>
        )}
      </div>

      {/* Compte à rebours — ou affichage période si date approximative */}
      {isApprox ? (
        <p className="text-sm font-medium" style={{ color: textSecondary }}>
          🗓️ Date à préciser
        </p>
      ) : (
        <>
          {!isPassed && daysLeft !== null && (() => {
            const style = evenement?.countdown_style || 'classique';
            if (style === 'evenement') {
              return (
                <div className="flex items-center gap-3">
                  <span style={{
                    fontSize: 36, fontWeight: 700, fontStyle: 'italic',
                    fontFamily: 'Georgia, "Times New Roman", serif',
                    color: accentColor,
                    lineHeight: 1,
                    fontVariantNumeric: 'tabular-nums',
                    textShadow: '0 0 28px rgba(246,231,193,0.20)',
                  }}>
                    J-{daysLeft}
                  </span>
                  <span style={{ width: 1, height: 28, background: 'rgba(246,231,193,0.25)', display: 'inline-block' }} />
                  <span style={{
                    fontSize: 12,
                    color: hasBandeau ? 'rgba(255,255,255,0.55)' : textSecondary,
                    fontFamily: 'monospace',
                    fontVariantNumeric: 'tabular-nums',
                    letterSpacing: '0.08em',
                  }}>
                    {pad(timeLeft.hours)}h {pad(timeLeft.minutes)}m {pad(timeLeft.seconds)}s
                  </span>
                </div>
              );
            }
            return (
              <div className="flex items-end gap-2">
                <span className="text-5xl font-bold tabular-nums leading-none" style={{ color: accentColor }}>
                  {daysLeft}
                </span>
                <span className="text-sm mb-1" style={{ color: hasBandeau ? 'rgba(255,255,255,0.75)' : textSecondary }}>
                  {daysLeft === 1 ? 'jour restant' : 'jours restants'}
                </span>
              </div>
            );
          })()}
          {isPassed && (
            <p className="text-sm" style={{ color: textSecondary }}>Événement passé 🎊</p>
          )}
        </>
      )}

      {/* Barre de progression discrète */}
      {!isPassed && !isApprox && (
        <div className="space-y-1">
          <div className="h-1 rounded-full w-full" style={{ background: progressTrack }}>
            <div
              className="h-1 rounded-full transition-all duration-500"
              style={{ width: `${progress}%`, background: progressColor }}
            />
          </div>
        </div>
      )}
    </div>
  );
}