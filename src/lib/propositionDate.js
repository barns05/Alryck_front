import { base44 } from '@/api/base44Client';
import { toast } from 'sonner';

/**
 * gererChangementDate
 * Gère le workflow de changement de date d'un événement.
 *
 * Si l'événement a au moins un EvenementPrestataire Confirmé ET que la date proposée
 * diffère de la date actuelle, on ne l'applique PAS directement : on crée une
 * PropositionDateEvenement (via la fonction backend creerPropositionDate) qui notifie
 * les prestataires confirmés. L'appelant doit alors conserver la date actuelle sur
 * l'Evenement jusqu'à la finalisation.
 *
 * @param {object} params
 * @param {string} params.evenementId
 * @param {string} params.originalDate  - date technique actuelle de l'Evenement
 * @param {object} params.proposed        - { date, date_type, date_mois, date_periode } normalisé
 * @param {'admin'|'client'} params.initiee_par
 * @returns {Promise<{propositionCreated: boolean}>}
 */
export async function gererChangementDate({ evenementId, originalDate, proposed, initiee_par = 'admin' }) {
  if (!evenementId) return { propositionCreated: false };
  if ((proposed.date || null) === (originalDate || null)) return { propositionCreated: false };

  try {
    const eps = await base44.entities.EvenementPrestataire.filter({ evenement_id: evenementId });
    const confirmes = (eps || []).filter((ep) => ep.statut === 'Confirmé');
    if (confirmes.length === 0) return { propositionCreated: false };

    await base44.functions.invoke('creerPropositionDate', {
      evenement_id: evenementId,
      nouvelle_date: proposed.date,
      nouvelle_date_type: proposed.date_type || 'exacte',
      nouvelle_date_mois: proposed.date_mois || null,
      nouvelle_date_periode: proposed.date_periode || null,
      initiee_par,
    });

    toast.info(
      `📅 Nouvelle date proposée à ${confirmes.length} prestataire${confirmes.length > 1 ? 's' : ''} confirmé${confirmes.length > 1 ? 's' : ''}. La date actuelle est conservée en attendant leur accord. Finalisez depuis la fiche événement une fois les réponses reçues.`,
      { duration: 8000 }
    );
    return { propositionCreated: true };
  } catch (e) {
    // 409 = une proposition est déjà en_attente : on ne crée pas d'écrasement.
    const serverMsg = e?.message || e?.error || '';
    if (typeof serverMsg === 'string' && serverMsg.toLowerCase().includes('déjà')) {
      toast.error(`📅 ${serverMsg}`, { duration: 7000 });
    } else {
      toast.error('❌ Impossible de créer la proposition de date');
    }
    throw e;
  }
}