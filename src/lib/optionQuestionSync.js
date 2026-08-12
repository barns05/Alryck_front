/**
 * Synchronisation automatique des questions de bibliothèque
 * depuis les options/prestations.
 *
 * Règles :
 *  - Une option simple (pas de groupe) → question OUI/NON
 *  - Plusieurs options partageant le même "groupe" (même préfixe) → question liste déroulante
 *  - Option alimentaire avec allergènes → description enrichie
 */
import { base44 } from '@/api/base44Client';

const CATEGORIE_QUESTION = 'OPTIONS';

/**
 * Construit le label de question pour une option.
 */
function buildLabel(option) {
  const prixLabel = option.prix > 0
    ? ` (${option.prix} €${option.unite === 'Par personne' ? '/pers.' : ' forfait'})`
    : '';
  return `Souhaitez-vous ${option.nom}${prixLabel} ?`;
}

/**
 * Construit la description incluant les allergènes si présents.
 */
function buildDescription(option) {
  if (option.allergenes?.length > 0) {
    return `⚠️ Allergènes : ${option.allergenes.join(', ')}`;
  }
  return option.description || '';
}

/**
 * Crée une question OUI/NON dans la bibliothèque pour une option.
 * Retourne la question créée.
 */
export async function createQuestionForOption(option) {
  const question = await base44.entities.BibliothequeQuestion.create({
    label: buildLabel(option),
    description: buildDescription(option),
    type: 'oui_non',
    options: ['OUI', 'NON'],
    categorie: CATEGORIE_QUESTION,
    etat: 'disponible',
    est_personnalisee: true,
    option_source_id: option.id, // lien retour pour update/delete
  });
  return question;
}

/**
 * Met à jour la question liée à une option.
 */
export async function updateQuestionForOption(option) {
  const existing = await base44.entities.BibliothequeQuestion.filter({ option_source_id: option.id });
  if (!existing?.length) {
    // Si la question n'existe plus, la recréer
    return createQuestionForOption(option);
  }
  const q = existing[0];
  if (q.etat === 'archivee') return; // Ne pas modifier les questions archivées manuellement
  await base44.entities.BibliothequeQuestion.update(q.id, {
    label: buildLabel(option),
    description: buildDescription(option),
  });
}

/**
 * Archive la question liée à une option supprimée.
 */
export async function archiveQuestionForOption(optionId) {
  const existing = await base44.entities.BibliothequeQuestion.filter({ option_source_id: optionId });
  if (!existing?.length) return;
  for (const q of existing) {
    if (q.etat !== 'archivee') {
      await base44.entities.BibliothequeQuestion.update(q.id, { etat: 'archivee' });
    }
  }
}