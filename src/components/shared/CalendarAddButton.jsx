/**
 * CalendarAddButton — Bouton "Ajouter à mon calendrier"
 *
 * Ouvre une popup centrée avec overlay, proposant 3 choix :
 * Google Agenda (lien URL), Apple Calendar (.ics), Outlook (.ics).
 * Génération ponctuelle, pas de synchronisation permanente.
 *
 * Props:
 *   titre        — string (obligatoire) — titre de l'événement calendrier
 *   dateDebut    — string YYYY-MM-DD (obligatoire)
 *   dateFin      — string YYYY-MM-DD (optionnel, défaut = dateDebut)
 *   heureDebut   — string HH:MM (optionnel, si absent → événement journée entière)
 *   heureFin     — string HH:MM (optionnel, défaut = même heure que debut)
 *   lieu         — string (optionnel)
 *   description  — string (optionnel)
 *   allDay       — boolean (défaut false) — force l'événement en journée entière
 *   compact      — boolean (défaut false) — variante compacte pour intégration inline
 *   label        — string (défaut "Ajouter à mon calendrier")
 *   className    — string (optionnel)
 *   style        — object (optionnel)
 */
import { useState, useRef, useEffect } from 'react';
import { createPortal } from 'react-dom';
import { CalendarPlus, Calendar, X } from 'lucide-react';
import { toast } from 'sonner';

// ── Helpers ICS / Google URL (identiques au comportement précédent) ──────────

function escapeIcs(s) {
  return (s || '').replace(/[,;\\]/g, '\\$&').replace(/\n/g, '\\n');
}

function pad(n) {
  return String(n).padStart(2, '0');
}

function splitDate(dateStr) {
  if (!dateStr) return null;
  const parts = String(dateStr).split('-');
  if (parts.length !== 3) return null;
  return { y: parts[0], m: parts[1], d: parts[2] };
}

function splitTime(timeStr) {
  if (!timeStr) return null;
  const parts = String(timeStr).split(':');
  if (parts.length < 2) return null;
  return { h: parts[0] || '00', mn: parts[1] || '00' };
}

function getIcsStamp() {
  const now = new Date();
  return `${now.getFullYear()}${pad(now.getMonth() + 1)}${pad(now.getDate())}T${pad(now.getHours())}${pad(now.getMinutes())}00`;
}

function nextDayStr(dateStr) {
  const d = new Date(dateStr + 'T12:00:00');
  d.setDate(d.getDate() + 1);
  return `${d.getFullYear()}${pad(d.getMonth() + 1)}${pad(d.getDate())}`;
}

function generateIcs({ titre, dateDebut, dateFin, heureDebut, heureFin, lieu, description, allDay }) {
  const ds = splitDate(dateDebut);
  if (!ds) return null;

  const stamp = getIcsStamp();
  const lines = [
    'BEGIN:VCALENDAR',
    'VERSION:2.0',
    'PRODID:-//Alryck//Calendar//FR',
    'CALSCALE:GREGORIAN',
    'METHOD:PUBLISH',
    `X-WR-CALNAME:${escapeIcs(titre || 'Événement')}`,
    'BEGIN:VEVENT',
    `UID:${Date.now()}-${(titre || 'evt').replace(/[^a-zA-Z0-9]/g, '').slice(0, 20)}@alryck`,
    `DTSTAMP:${stamp}`,
  ];

  if (allDay || !heureDebut) {
    lines.push(`DTSTART;VALUE=DATE:${ds.y}${ds.m}${ds.d}`);
    if (dateFin) {
      const df = splitDate(dateFin);
      if (df) lines.push(`DTEND;VALUE=DATE:${df.y}${df.m}${df.d}`);
    } else {
      lines.push(`DTEND;VALUE=DATE:${nextDayStr(dateDebut)}`);
    }
  } else {
    const ht = splitTime(heureDebut) || { h: '00', mn: '00' };
    lines.push(`DTSTART:${ds.y}${ds.m}${ds.d}T${pad(ht.h)}${pad(ht.mn)}00`);

    const endDateStr = dateFin || dateDebut;
    const df = splitDate(endDateStr);
    const hf = splitTime(heureFin);
    if (hf) {
      lines.push(`DTEND:${df.y}${df.m}${df.d}T${pad(hf.h)}${pad(hf.mn)}00`);
    } else {
      lines.push(`DTEND:${df.y}${df.m}${df.d}T${pad(ht.h)}${pad(ht.mn)}00`);
    }
  }

  lines.push(`SUMMARY:${escapeIcs(titre || 'Événement')}`);
  if (description) lines.push(`DESCRIPTION:${escapeIcs(description)}`);
  if (lieu) lines.push(`LOCATION:${escapeIcs(lieu)}`);
  lines.push('STATUS:CONFIRMED');
  lines.push('END:VEVENT');
  lines.push('END:VCALENDAR');

  return lines.join('\r\n');
}

function generateGoogleUrl({ titre, dateDebut, dateFin, heureDebut, heureFin, lieu, description, allDay }) {
  const ds = splitDate(dateDebut);
  if (!ds) return null;

  const params = new URLSearchParams();
  params.set('action', 'TEMPLATE');
  params.set('text', titre || 'Événement');

  if (allDay || !heureDebut) {
    const start = `${ds.y}${ds.m}${ds.d}`;
    const df = dateFin ? splitDate(dateFin) : null;
    const end = df ? `${df.y}${df.m}${df.d}` : nextDayStr(dateDebut);
    params.set('dates', `${start}/${end}`);
  } else {
    const ht = splitTime(heureDebut) || { h: '00', mn: '00' };
    const start = `${ds.y}${ds.m}${ds.d}T${pad(ht.h)}${pad(ht.mn)}00`;

    const endDateStr = dateFin || dateDebut;
    const df = splitDate(endDateStr);
    const hf = splitTime(heureFin);
    const endH = hf ? pad(hf.h) : pad(ht.h);
    const endM = hf ? pad(hf.mn) : pad(ht.mn);
    const end = `${df.y}${df.m}${df.d}T${endH}${endM}00`;
    params.set('dates', `${start}/${end}`);
  }

  if (description) params.set('details', description);
  if (lieu) params.set('location', lieu);
  params.set('ctz', 'Europe/Paris');

  return `https://calendar.google.com/calendar/render?${params.toString()}`;
}

function downloadIcs(filename, content) {
  const blob = new Blob([content], { type: 'text/calendar;charset=utf-8' });
  const url = URL.createObjectURL(blob);
  const a = document.createElement('a');
  a.href = url;
  a.download = filename;
  document.body.appendChild(a);
  a.click();
  document.body.removeChild(a);
  URL.revokeObjectURL(url);
}

// ── Logo Apple Calendar (SVG inline — calendrier rouge/blanc daté) ───────────

function AppleCalendarLogo({ size = 32 }) {
  return (
    <svg width={size} height={size} viewBox="0 0 32 32" fill="none" xmlns="http://www.w3.org/2000/svg">
      <rect width="32" height="32" rx="7" fill="white" />
      <rect width="32" height="9" fill="#FF3B30" />
      <text x="16" y="24" textAnchor="middle" fontSize="14" fontWeight="700" fill="#1a1a1a" fontFamily="system-ui, -apple-system, sans-serif">17</text>
    </svg>
  );
}

// ── Composant principal ──────────────────────────────────────────────────────

export default function CalendarAddButton({
  titre,
  dateDebut,
  dateFin = null,
  heureDebut = null,
  heureFin = null,
  lieu = null,
  description = null,
  allDay = false,
  compact = false,
  label = 'Ajouter à mon calendrier',
  className = '',
  style = {},
}) {
  const [open, setOpen] = useState(false);
  const btnRef = useRef(null);

  useEffect(() => {
    if (!open) return;
    const handleEsc = (e) => { if (e.key === 'Escape') setOpen(false); };
    document.addEventListener('keydown', handleEsc);
    document.body.style.overflow = 'hidden';
    return () => {
      document.removeEventListener('keydown', handleEsc);
      document.body.style.overflow = '';
    };
  }, [open]);

  const safeName = (titre || 'evenement').replace(/[^a-zA-Z0-9]/g, '-').toLowerCase().slice(0, 40);

  const handleGoogle = () => {
    const url = generateGoogleUrl({ titre, dateDebut, dateFin, heureDebut, heureFin, lieu, description, allDay });
    if (!url) {
      toast.error("Aucune date n'est définie.");
      setOpen(false);
      return;
    }
    window.open(url, '_blank', 'noopener,noreferrer');
    setOpen(false);
  };

  const handleIcs = () => {
    const ics = generateIcs({ titre, dateDebut, dateFin, heureDebut, heureFin, lieu, description, allDay });
    if (!ics) {
      toast.error("Aucune date n'est définie.");
      setOpen(false);
      return;
    }
    downloadIcs(`${safeName}.ics`, ics);
    toast.success('Fichier calendrier téléchargé !');
    setOpen(false);
  };

  const isRdv = (titre || '').toLowerCase().includes('rendez');
  const popupTitle = `Ajouter ${isRdv ? 'le rendez-vous' : "l'événement"} à votre calendrier`;

  const btnClasses = compact
    ? 'inline-flex items-center gap-1.5 text-xs font-medium px-2.5 py-1.5 rounded-lg transition-colors hover:brightness-95'
    : 'w-full flex items-center justify-center gap-2 py-3 rounded-2xl text-sm font-semibold transition-all active:scale-[0.98] hover:brightness-95';

  const calOptionClass =
    'flex flex-col items-center gap-2.5 p-3 rounded-2xl border-2 border-slate-100 hover:border-slate-300 hover:bg-slate-50 transition-all active:scale-95';

  return (
    <div className={`relative ${compact ? 'inline-block' : 'w-full'} ${className}`}>
      <button
        ref={btnRef}
        onClick={() => setOpen(v => !v)}
        className={btnClasses}
        style={{ background: '#fffbeb', color: '#b45309', border: '1px solid #fde68a', ...style }}
      >
        <CalendarPlus size={compact ? 13 : 16} /> {label}
      </button>

      {open && createPortal(
        <div
          className="fixed inset-0 flex items-center justify-center p-4"
          style={{ zIndex: 99998, background: 'rgba(15,15,30,0.5)' }}
          onClick={() => setOpen(false)}
        >
          <div
            className="relative bg-white rounded-3xl shadow-2xl w-full max-w-sm overflow-hidden"
            style={{ zIndex: 99999 }}
            onClick={(e) => e.stopPropagation()}
          >
            {/* Bouton fermeture */}
            <button
              onClick={() => setOpen(false)}
              className="absolute top-4 right-4 w-8 h-8 rounded-full flex items-center justify-center hover:bg-slate-100 transition-colors z-10"
            >
              <X size={18} className="text-slate-400" />
            </button>

            {/* Contenu */}
            <div className="px-6 pt-8 pb-7 text-center">
              {/* Icône en-tête */}
              <div
                className="w-16 h-16 mx-auto rounded-full flex items-center justify-center mb-4"
                style={{ background: '#fffbeb' }}
              >
                <CalendarPlus size={30} style={{ color: '#b45309' }} />
              </div>

              {/* Titre + sous-titre */}
              <h3 className="text-base font-bold text-slate-900 mb-1 leading-snug px-4">
                {popupTitle}
              </h3>
              <p className="text-sm text-slate-500 mb-6">
                Choisissez votre application de calendrier
              </p>

              {/* 3 boutons côte à côte */}
              <div className="grid grid-cols-3 gap-3">
                {/* Google Agenda */}
                <button onClick={handleGoogle} className={calOptionClass}>
                  <div
                    className="w-12 h-12 rounded-xl flex items-center justify-center"
                    style={{ background: '#4285F4' }}
                  >
                    <img
                      src="https://cdn.jsdelivr.net/npm/simple-icons@latest/icons/googlecalendar.svg"
                      alt="Google Agenda"
                      className="w-6 h-6"
                      style={{ filter: 'brightness(0) invert(1)' }}
                    />
                  </div>
                  <span className="text-[11px] font-semibold text-slate-700 leading-tight">Google Agenda</span>
                </button>

                {/* Apple Calendar */}
                <button onClick={handleIcs} className={calOptionClass}>
                  <div
                    className="w-12 h-12 rounded-xl flex items-center justify-center overflow-hidden"
                    style={{ background: '#FF3B30' }}
                  >
                    <AppleCalendarLogo size={36} />
                  </div>
                  <span className="text-[11px] font-semibold text-slate-700 leading-tight">Apple Calendar</span>
                </button>

                {/* Outlook */}
                <button onClick={handleIcs} className={calOptionClass}>
                  <div
                    className="w-12 h-12 rounded-xl flex items-center justify-center"
                    style={{ background: '#0078D4' }}
                  >
                    <img
                      src="https://cdn.jsdelivr.net/npm/simple-icons@latest/icons/microsoftoutlook.svg"
                      alt="Outlook"
                      className="w-6 h-6"
                      style={{ filter: 'brightness(0) invert(1)' }}
                    />
                  </div>
                  <span className="text-[11px] font-semibold text-slate-700 leading-tight">Outlook</span>
                </button>
              </div>
            </div>
          </div>
        </div>,
        document.body
      )}
    </div>
  );
}