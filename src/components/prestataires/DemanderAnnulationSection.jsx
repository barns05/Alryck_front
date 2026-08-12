import { useState } from 'react';
import { useQuery, useQueryClient } from '@tanstack/react-query';
import { base44 } from '@/api/base44Client';
import { toast } from 'sonner';
import { Ban, X } from 'lucide-react';

/**
 * DemanderAnnulationSection — pour chaque événement où le prestataire est Confirmé
 * ET sans DemandeAnnulationEvenement 'en_attente' déjà active, affiche un bouton
 * discret « Demander l'annulation » ouvrant un champ motif optionnel.
 * Appelle demanderAnnulationEvenement.
 *
 * Si une demande est déjà active pour cet événement, l'événement n'apparaît pas ici
 * (il bascule dans l'affichage de suivi, et le 409 serveur protège en plus).
 */
export default function DemanderAnnulationSection({ prestataireId }) {
  const qc = useQueryClient();
  const [pickerFor, setPickerFor] = useState(null); // ep.id
  const [motif, setMotif] = useState('');
  const [submitting, setSubmitting] = useState(false);

  const { data: eps = [] } = useQuery({
    queryKey: ['annulation-proposable', prestataireId],
    queryFn: async () => {
      const all = await base44.entities.EvenementPrestataire.filter({ prestataire_id: prestataireId });
      return (all || []).filter((ep) => ep.statut === 'Confirmé');
    },
    enabled: !!prestataireId,
  });

  // Événements ayant déjà une demande en_attente → exclus du bouton
  const evenementIds = [...new Set(eps.map((ep) => ep.evenement_id))];
  const { data: demandesActives = [] } = useQuery({
    queryKey: ['demandes-annulation-actives-prest', evenementIds.join(',')],
    queryFn: async () => {
      if (evenementIds.length === 0) return [];
      const all = await base44.entities.DemandeAnnulationEvenement.list('-created_date', 200);
      return (all || []).filter((d) => d.statut === 'en_attente' && evenementIds.includes(d.evenement_id));
    },
    enabled: evenementIds.length > 0,
  });
  const eventIdsAvecDemande = new Set(demandesActives.map((d) => d.evenement_id));

  // On filtre aussi les événements déjà Annulés (statut de l'ep ou de l'événement)
  const { data: evenementsById = {} } = useQuery({
    queryKey: ['evenements-proposable-annulation', evenementIds.join(',')],
    queryFn: async () => {
      if (evenementIds.length === 0) return {};
      const all = await base44.entities.Evenement.filter({ id: { $in: evenementIds } }).catch(async () => {
        // fallback : list puis filtre local (certaines SDK ne supportent pas $in sur id)
        const list = await base44.entities.Evenement.list('-created_date', 200);
        return (list || []).filter((e) => evenementIds.includes(e.id));
      });
      const map = {};
      (all || []).forEach((e) => { map[e.id] = e; });
      return map;
    },
    enabled: evenementIds.length > 0,
  });

  const eligibles = eps.filter((ep) => {
    if (eventIdsAvecDemande.has(ep.evenement_id)) return false;
    const ev = evenementsById[ep.evenement_id];
    if (ev && ev.statut === 'Annulé') return false;
    return true;
  });

  if (eligibles.length === 0) return null;

  const demander = async (ep) => {
    setSubmitting(true);
    try {
      await base44.functions.invoke('demanderAnnulationEvenement', {
        evenement_id: ep.evenement_id,
        motif: motif.trim() || null,
      });
      toast.success(
        '🔴 Demande d\'annulation envoyée à l\'organisateur. Vous serez notifié de sa décision.',
        { duration: 7000 }
      );
      setPickerFor(null);
      setMotif('');
      qc.invalidateQueries(['annulation-proposable', prestataireId]);
      qc.invalidateQueries(['demandes-annulation-actives-prest']);
    } catch (e) {
      const serverMsg = e?.message || e?.error || '';
      if (typeof serverMsg === 'string' && serverMsg.toLowerCase().includes('déjà')) {
        toast.error(`🔴 ${serverMsg}`, { duration: 7000 });
      } else {
        toast.error('❌ Impossible d\'envoyer la demande');
      }
    }
    setSubmitting(false);
  };

  return (
    <div className="space-y-3">
      <h2 className="font-semibold text-sm uppercase tracking-wide text-muted-foreground">
        🔴 Demander l'annulation d'un événement
      </h2>
      {eligibles.map((ep) => (
        <div key={ep.id} className="bg-card border border-border rounded-2xl p-3 space-y-2">
          <div className="flex items-center justify-between gap-2">
            <div className="min-w-0">
              <p className="text-sm font-medium truncate">{ep.evenement_nom || 'Événement'}</p>
              <p className="text-[11px] text-muted-foreground">
                Vous êtes confirmé — demandez l'annulation si un empêché majeur survient.
              </p>
            </div>
            {pickerFor !== ep.id ? (
              <button
                onClick={() => { setPickerFor(ep.id); setMotif(''); }}
                className="flex items-center gap-1.5 text-xs px-3 py-1.5 rounded-xl border border-red-200 text-red-600 hover:bg-red-50 font-medium shrink-0"
              >
                <Ban size={13} /> Demander l'annulation
              </button>
            ) : (
              <button
                onClick={() => { setPickerFor(null); setMotif(''); }}
                className="p-1 rounded-lg hover:bg-muted text-muted-foreground shrink-0"
              >
                <X size={14} />
              </button>
            )}
          </div>

          {pickerFor === ep.id && (
            <div className="flex flex-col gap-2 pt-2 border-t border-border">
              <textarea
                value={motif}
                onChange={(e) => setMotif(e.target.value)}
                placeholder="Motif (optionnel)…"
                rows={2}
                className="w-full rounded-xl border border-input bg-transparent px-3 py-2 text-sm resize-none focus-visible:outline-none focus-visible:ring-1 focus-visible:ring-ring"
              />
              <button
                onClick={() => demander(ep)}
                disabled={submitting}
                className="flex items-center justify-center gap-1.5 text-xs py-2 rounded-xl font-medium bg-red-600 text-white disabled:opacity-50"
              >
                {submitting
                  ? <div className="w-3.5 h-3.5 border-2 border-white border-t-transparent rounded-full animate-spin" />
                  : <Ban size={13} />}
                Confirmer la demande d'annulation
              </button>
            </div>
          )}
        </div>
      ))}
    </div>
  );
}