/**
 * Utilitaires pour calculer le statut d'un dossier d'événement
 */

const POSTES = ['Serveur', 'Barman', 'Cuisinier', 'Plongeur', 'Chef de rang', 'Hôte/Hôtesse', 'Autre'];

/**
 * Vérifie si l'équipe d'extras d'un événement est complète
 */
export function isEquipeComplete(
  ev: any,
  services: any[],
  assignments: any[],
  effectifSettings: any[]
): boolean {
  const evServices = services.filter(s => s.evenement_id === ev.id);
  const evServiceIds = new Set(evServices.map(s => s.id));
  const evAssignments = assignments.filter(a => evServiceIds.has(a.service_id) && a.statut !== 'Annulé');
  const setting = effectifSettings.find(s => s.type_evenement === ev.type_evenement);
  const activePostes = POSTES.filter(p => setting?.postes_actifs ? setting.postes_actifs[p] !== false : true);
  const tranches = setting?.tranches || {};
  const convives = ev.nb_invites || 0;

  for (const poste of activePostes) {
    const posteTransches = tranches[poste] || [];
    let needed = 0;
    if (convives && posteTransches.length) {
      for (const t of posteTransches) {
        if (convives >= t.min && convives <= t.max) {
          needed = t.personnel;
          break;
        }
      }
      if (!needed) needed = posteTransches[posteTransches.length - 1]?.personnel || 0;
    }
    if (needed === 0) continue;
    const confirmed = evAssignments.filter(a => {
      const svc = evServices.find(s => s.id === a.service_id);
      return svc?.poste === poste;
    }).length;
    if (confirmed < needed) return false;
  }
  return true;
}

/**
 * Récupère le statut global d'un dossier d'événement
 * Retourne { type: 'none' | 'partial' | 'complete', done: number, total: number }
 */
export function getEventStatus(
  ev: any,
  fichesService: any[],
  services: any[],
  assignments: any[],
  effectifSettings: any[],
  formulaires: any[],
  logistiqueRecords: any[] = []
): { type: 'none' | 'partial' | 'complete'; done: number; total: number } {
  const taches = ev.taches_requises || {
    formulaire: true,
    programme: true,
    plan_table: true,
    fiche_service: true,
    equipe_extras: true,
    logistique: false,
  };
  const items = [];

  if (taches.formulaire) {
    items.push(formulaires.some(f => f.evenement_id === ev.id && (f.statut === 'Complété' || f.statut === 'Clôturé')));
  }
  if (taches.programme) {
    items.push(!!(ev.programme_journee && ev.programme_journee.length > 0));
  }
  if (taches.plan_table && ev.plan_table_actif !== false) {
    items.push(!!(ev.plan_table_url));
  }
  if (taches.fiche_service) {
    items.push(fichesService.some(f => f.evenement_id === ev.id && (f.statut === 'Envoyee' || f.statut === 'Prete')));
  }
  if (taches.equipe_extras) {
    items.push(isEquipeComplete(ev, services, assignments, effectifSettings));
  }
  if (taches.logistique) {
    const log = logistiqueRecords.find((l: any) => l.evenement_id === ev.id);
    items.push(!!(log && ['livre', 'signe', 'realise', 'sur_place'].includes(log.statut_livraison)));
  }

  const total = items.length;
  if (total === 0) return { type: 'none', done: 0, total: 0 };
  const done = items.filter(Boolean).length;
  if (done === 0) return { type: 'none', done, total };
  if (done === total) return { type: 'complete', done, total };
  return { type: 'partial', done, total };
}

/**
 * Retourne les tâches manquantes d'un événement
 */
export function getTachesManquantes(
  ev: any,
  fichesService: any[],
  formulaires: any[],
  modules: Record<string, any> = {}
): string[] {
  const taches = ev.taches_requises || {
    formulaire: true,
    programme: true,
    plan_table: true,
    fiche_service: true,
  };
  const manquantes = [];

  if (
    modules.formulaire !== false &&
    taches.formulaire &&
    !formulaires.some(f => f.evenement_id === ev.id && (f.statut === 'Complété' || f.statut === 'Clôturé'))
  ) {
    manquantes.push('Formulaire');
  }
  if (modules.programme !== false && taches.programme && !(ev.programme_journee && ev.programme_journee.length > 0)) {
    manquantes.push('Programme');
  }
  if (
    modules.plan_table !== false &&
    taches.plan_table &&
    ev.plan_table_actif !== false &&
    !ev.plan_table_url
  ) {
    manquantes.push('Plan de table');
  }
  if (
    modules.fiche_service !== false &&
    taches.fiche_service &&
    !fichesService.some(f => f.evenement_id === ev.id && (f.statut === 'Envoyee' || f.statut === 'Prete'))
  ) {
    manquantes.push('Fiche de service');
  }

  return manquantes;
}