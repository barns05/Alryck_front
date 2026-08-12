/**
 * RecommandationBandeau — Rappel contextuel dans la fiche événement.
 * Affiché quand recommandation_statut === 'a_faire', événement créé >= 2 jours,
 * et aucun prestataire avec statut 'Recommandé'.
 * 3 actions : Recommander maintenant / Me rappeler dans 3 jours / Ne pas recommander.
 */
import { useState } from 'react';
import { useQueryClient } from '@tanstack/react-query';
import { base44 } from '@/api/base44Client';
import { Sparkles, Clock, X } from 'lucide-react';
import { toast } from 'sonner';

export default function RecommandationBandeau({ evenement, prestatairesEv, onRecommander }) {
  const qc = useQueryClient();
  const [hidden, setHidden] = useState(false);

  const hasRecommande = (prestatairesEv || []).some(p => p.statut === 'Recommandé');
  const statut = evenement.recommandation_statut || 'a_faire';

  let ageDays = 0;
  if (evenement.created_date) {
    ageDays = Math.floor((Date.now() - new Date(evenement.created_date).getTime()) / 86400000);
  }

  const visible = !hidden && statut === 'a_faire' && ageDays >= 2 && !hasRecommande;
  if (!visible) return null;

  const reporter = async () => {
    const d = new Date();
    d.setDate(d.getDate() + 3);
    const dateRappel = d.toISOString().split('T')[0];
    try {
      await base44.entities.Evenement.update(evenement.id, {
        recommandation_statut: 'reporte',
        recommandation_date_rappel: dateRappel,
      });
      setHidden(true);
      qc.invalidateQueries(['evenements']);
      toast.success('Rappel programmé dans 3 jours');
    } catch {
      toast.error('Erreur lors du report');
    }
  };

  const refuser = async () => {
    try {
      await base44.entities.Evenement.update(evenement.id, { recommandation_statut: 'refuse' });
      setHidden(true);
      qc.invalidateQueries(['evenements']);
      toast.success('Recommandation fermée pour cet événement');
    } catch {
      toast.error('Erreur lors de la fermeture');
    }
  };

  return (
    <div className="rounded-2xl border border-amber-200 bg-amber-50 p-4">
      <div className="flex items-start gap-3">
        <div className="w-9 h-9 rounded-full bg-amber-100 flex items-center justify-center shrink-0">
          <Sparkles size={18} className="text-amber-600" />
        </div>
        <div className="flex-1 min-w-0">
          <p className="font-semibold text-sm text-amber-900">Recommandez des prestataires</p>
          <p className="text-xs text-amber-800 mt-0.5">
            Aucun prestataire recommandé pour cet événement. Pensez à en proposer un à votre client.
          </p>
          <div className="flex flex-wrap gap-2 mt-3">
            <button
              onClick={onRecommander}
              className="inline-flex items-center gap-1.5 text-xs font-semibold px-3 py-2 rounded-xl bg-amber-600 text-white hover:bg-amber-700 transition-colors active:scale-95"
            >
              <Sparkles size={13} /> Recommander maintenant
            </button>
            <button
              onClick={reporter}
              className="inline-flex items-center gap-1.5 text-xs font-semibold px-3 py-2 rounded-xl bg-white border border-amber-300 text-amber-800 hover:bg-amber-100 transition-colors active:scale-95"
            >
              <Clock size={13} /> Me rappeler dans 3 jours
            </button>
            <button
              onClick={refuser}
              className="inline-flex items-center gap-1.5 text-xs font-semibold px-3 py-2 rounded-xl bg-white border border-amber-200 text-amber-700 hover:bg-amber-50 transition-colors active:scale-95"
            >
              <X size={13} /> Ne pas recommander
            </button>
          </div>
        </div>
      </div>
    </div>
  );
}