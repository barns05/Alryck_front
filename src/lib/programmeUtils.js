/**
 * Utilitaires pour le calcul des horaires en cascade du programme
 */

/** Convertit heure + minutes en minutes totales */
export function toMinutes(h, m) {
  return (parseInt(h) || 0) * 60 + (parseInt(m) || 0);
}

/** Formate un nb de minutes en string lisible "1h30" ou "45 min" */
export function formatDuree(heures, minutes) {
  const h = parseInt(heures) || 0;
  const m = parseInt(minutes) || 0;
  if (h === 0 && m === 0) return '';
  if (h === 0) return `${m} min`;
  if (m === 0) return `${h}h`;
  return `${h}h${String(m).padStart(2, '0')}`;
}

/** Calcule la durée totale en minutes d'une liste d'étapes */
export function totalMinutes(etapes) {
  return etapes.reduce((acc, e) => acc + toMinutes(e.duree_heures, e.duree_minutes), 0);
}

/** Formate un total de minutes en "3h15" */
export function formatTotalMinutes(total) {
  const h = Math.floor(total / 60);
  const m = total % 60;
  return formatDuree(h, m);
}

/**
 * À partir d'une heure de début (string "HH:MM") et d'une liste d'étapes avec durées,
 * recalcule les horaires de chaque étape en cascade.
 * Retourne les étapes avec heure calculée.
 */
export function calculerHoraires(heureDebut, etapes) {
  if (!heureDebut || !etapes.length) return etapes;
  const [hInit, mInit] = heureDebut.split(':').map(Number);
  let cursor = hInit * 60 + mInit;

  return etapes.map((etape) => {
    const hh = Math.floor(cursor / 60) % 24;
    const mm = cursor % 60;
    const heure = `${String(hh).padStart(2, '0')}:${String(mm).padStart(2, '0')}`;
    cursor += toMinutes(etape.duree_heures, etape.duree_minutes);
    return { ...etape, heure };
  });
}