/**
 * planSalleAccess — Contrôle d'accès au Plan de salle côté prestataire.
 *
 * Autorise les métiers dont le groupe est « Lieux et réception » ou
 * « Restauration et traiteur » (résolu via getMetierConfig). Accepte aussi
 * directement une valeur de `Prestataire.domaine` en repli (« Lieu de
 * réception » / « Traiteur ») quand aucun `CompanySettings.metier` n'est
 * disponible.
 *
 * Pour étendre plus tard à d'autres prestataires confirmés (DJ, photographe…),
 * il suffit d'ajouter des groupes/domaines aux deux listes ci-dessous.
 */
import { getMetierConfig } from '@/config/metierConfig';

const GROUPES_AUTORISES = ['Lieux et réception', 'Restauration et traiteur'];
const DOMAINES_AUTORISES = ['Lieu de réception', 'Traiteur'];

export function peutVoirPlanSalle(metierOuDomaine) {
  if (!metierOuDomaine) return false;
  const cfg = getMetierConfig(metierOuDomaine);
  if (GROUPES_AUTORISES.includes(cfg.groupe)) return true;
  return DOMAINES_AUTORISES.includes(metierOuDomaine);
}

export default peutVoirPlanSalle;