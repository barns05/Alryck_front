/**
 * ProgrammeIcsButton — Bouton "Ajouter à mon calendrier"
 * Génère et télécharge un fichier .ics figé contenant un événement unique
 * correspondant à la date principale de l'événement, avec un résumé des étapes
 * dans la description.
 *
 * Contrairement à l'abonnement webcal de MonAgenda, c'est un fichier ponctuel
 * non évolutif : pas de lien d'abonnement, juste un téléchargement unique.
 *
 * Props: evenement, etapes
 */
import { CalendarPlus, Download } from 'lucide-react';
import { toast } from 'sonner';

function escapeIcs(s) {
  return (s || '').replace(/[,;\\]/g, '\\$&').replace(/\n/g, '\\n');
}

function generateProgrammeIcs(evenement, etapes) {
  if (!evenement.date) return null;

  const [y, m, d] = evenement.date.split('-');
  const heure = evenement.heure_debut || (etapes.length > 0
    ? etapes.slice().sort((a, b) => (a.ordre || 0) - (b.ordre || 0)).find(e => e.heure)?.heure
    : null);

  let dtstart;
  if (heure) {
    const [h, mn] = heure.split(':');
    dtstart = `${y}${m}${d}T${(h || '00').padStart(2, '0')}${(mn || '00').padStart(2, '0')}00`;
  } else {
    dtstart = `${y}${m}${d}`;
  }

  const now = new Date();
  const stamp = `${now.getFullYear()}${String(now.getMonth() + 1).padStart(2, '0')}${String(now.getDate()).padStart(2, '0')}T${String(now.getHours()).padStart(2, '0')}${String(now.getMinutes()).padStart(2, '0')}00`;

  const sortedEtapes = etapes.slice().sort((a, b) => (a.ordre || 0) - (b.ordre || 0));
  const etapesSummary = sortedEtapes
    .map(e => {
      let line = e.nom || '';
      if (e.heure) line += ` à ${e.heure}`;
      if (e.lieu) line += ` — ${e.lieu}`;
      return line;
    })
    .join('\\n');

  const lines = [
    'BEGIN:VCALENDAR',
    'VERSION:2.0',
    'PRODID:-//ProgrammeJourJ//FR',
    'CALSCALE:GREGORIAN',
    'METHOD:PUBLISH',
    `X-WR-CALNAME:${escapeIcs(evenement.nom || 'Programme du Jour J')}`,
    'BEGIN:VEVENT',
    `UID:prog-${evenement.id}@programmejourj`,
    `DTSTAMP:${stamp}`,
  ];

  if (heure) {
    lines.push(`DTSTART:${dtstart}`);
    lines.push(`DTEND:${dtstart}`);
  } else {
    lines.push(`DTSTART;VALUE=DATE:${dtstart}`);
  }

  lines.push(`SUMMARY:${escapeIcs(evenement.nom || 'Programme du Jour J')}`);
  if (etapesSummary) {
    lines.push(`DESCRIPTION:${escapeIcs('Programme :\\n' + etapesSummary)}`);
  }
  if (evenement.lieu_nom) {
    lines.push(`LOCATION:${escapeIcs(evenement.lieu_nom)}`);
  }
  lines.push('STATUS:CONFIRMED');
  lines.push('END:VEVENT');
  lines.push('END:VCALENDAR');

  return lines.join('\r\n');
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

export default function ProgrammeIcsButton({ evenement, etapes, theme }) {
  const handleDownload = () => {
    const ics = generateProgrammeIcs(evenement, etapes);
    if (!ics) {
      toast.error("Aucune date n'est définie pour cet événement.");
      return;
    }
    const safeName = (evenement.nom || 'programme').replace(/[^a-zA-Z0-9]/g, '-').toLowerCase();
    downloadIcs(`${safeName}.ics`, ics);
    toast.success('Fichier calendrier téléchargé !');
  };

  const btnStyle = theme
    ? { background: theme.buttonBg || theme.accentBg, color: theme.buttonText || theme.accent, border: theme.buttonBorder || `1px solid ${theme.cardBorder}`, boxShadow: theme.buttonShadow || 'none', borderRadius: theme.buttonRadius }
    : { background: '#fffbeb', color: '#b45309', border: '1px solid #fde68a' };

  return (
    <button
      onClick={handleDownload}
      className="w-full flex items-center justify-center gap-2 py-3 rounded-2xl text-sm font-semibold transition-all hover:scale-[1.01] active:scale-[0.98]"
      style={btnStyle}
    >
      <CalendarPlus size={16} /> Ajouter à mon calendrier
    </button>
  );
}