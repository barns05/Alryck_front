import { useState } from 'react';
import { useQuery, useQueryClient } from '@tanstack/react-query';
import { base44 } from '@/api/base44Client';
import { toast } from 'sonner';
import { CalendarPlus, X } from 'lucide-react';

/**
 * ProposerDateSection — pour chaque événement où le prestataire est Confirmé
 * ET sans PropositionDateEvenement en_attente (pas de proposition_date_id sur l'ep),
 * affiche un bouton « Proposer un changement de date » ouvrant un sélecteur date exacte.
 * Appelle creerPropositionDate avec initiee_par='prestataire'.
 *
 * Si une proposition est déjà active (ep.proposition_date_id renseigné), l'événement
 * n'apparaît pas ici : il bascule dans PropositionsDateSection (carte de réponse).
 */
export default function ProposerDateSection({ prestataireId }) {
  const qc = useQueryClient();
  const [pickerFor, setPickerFor] = useState(null); // ep.id
  const [pickDate, setPickDate] = useState('');
  const [submitting, setSubmitting] = useState(false);

  const { data: eps = [] } = useQuery({
    queryKey: ['prop-date-proposable', prestataireId],
    queryFn: async () => {
      const all = await base44.entities.EvenementPrestataire.filter({ prestataire_id: prestataireId });
      return (all || []).filter((ep) => ep.statut === 'Confirmé' && !ep.proposition_date_id);
    },
    enabled: !!prestataireId,
  });

  if (eps.length === 0) return null;

  const proposer = async (ep) => {
    if (!pickDate) {
      toast.error('Choisissez une date');
      return;
    }
    setSubmitting(true);
    try {
      await base44.functions.invoke('creerPropositionDate', {
        evenement_id: ep.evenement_id,
        nouvelle_date: pickDate,
        nouvelle_date_type: 'exacte',
        initiee_par: 'prestataire',
      });
      toast.success(
        '📅 Changement de date proposé aux autres prestataires. L\'organisateur a été informé. Votre disponibilité est enregistrée.',
        { duration: 7000 }
      );
      setPickerFor(null);
      setPickDate('');
      qc.invalidateQueries(['prop-date-proposable', prestataireId]);
      qc.invalidateQueries(['prop-date-eps-prestataire', prestataireId]);
    } catch (e) {
      const serverMsg = e?.message || e?.error || '';
      if (typeof serverMsg === 'string' && serverMsg.toLowerCase().includes('déjà')) {
        toast.error(`📅 ${serverMsg}`, { duration: 7000 });
      } else {
        toast.error('❌ Impossible de proposer la date');
      }
    }
    setSubmitting(false);
  };

  return (
    <div className="space-y-3">
      <h2 className="font-semibold text-sm uppercase tracking-wide text-muted-foreground">
        📅 Proposer un changement de date
      </h2>
      {eps.map((ep) => (
        <div key={ep.id} className="bg-card border border-border rounded-2xl p-3 space-y-2">
          <div className="flex items-center justify-between gap-2">
            <div className="min-w-0">
              <p className="text-sm font-medium truncate">{ep.evenement_nom || 'Événement'}</p>
              <p className="text-[11px] text-muted-foreground">
                Vous êtes confirmé — proposez une nouvelle date si un empêché survient.
              </p>
            </div>
            {pickerFor !== ep.id ? (
              <button
                onClick={() => { setPickerFor(ep.id); setPickDate(''); }}
                className="flex items-center gap-1.5 text-xs px-3 py-1.5 rounded-xl border border-primary/30 text-primary hover:bg-primary/5 font-medium shrink-0"
              >
                <CalendarPlus size={13} /> Proposer une date
              </button>
            ) : (
              <button
                onClick={() => { setPickerFor(null); setPickDate(''); }}
                className="p-1 rounded-lg hover:bg-muted text-muted-foreground shrink-0"
              >
                <X size={14} />
              </button>
            )}
          </div>

          {pickerFor === ep.id && (
            <div className="flex flex-col gap-2 pt-2 border-t border-border">
              <input
                type="date"
                value={pickDate}
                onChange={(e) => setPickDate(e.target.value)}
                className="flex h-9 rounded-md border border-input bg-transparent px-3 py-1 text-base md:text-sm focus-visible:outline-none focus-visible:ring-1 focus-visible:ring-ring"
              />
              <button
                onClick={() => proposer(ep)}
                disabled={submitting || !pickDate}
                className="flex items-center justify-center gap-1.5 text-xs py-2 rounded-xl font-medium bg-primary text-primary-foreground disabled:opacity-50"
              >
                {submitting
                  ? <div className="w-3.5 h-3.5 border-2 border-white border-t-transparent rounded-full animate-spin" />
                  : <CalendarPlus size={13} />}
                Confirmer la proposition
              </button>
            </div>
          )}
        </div>
      ))}
    </div>
  );
}