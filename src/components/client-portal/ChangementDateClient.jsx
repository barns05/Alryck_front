import { useState } from 'react';
import { useQuery, useQueryClient } from '@tanstack/react-query';
import { base44 } from '@/api/base44Client';
import { toast } from 'sonner';
import { CalendarClock, CheckCircle2, XCircle, Clock, ChevronRight } from 'lucide-react';
import { format, parseISO } from 'date-fns';
import { fr } from 'date-fns/locale';
import { statutPropositionLabel } from '@/lib/propositionDateLabels';

/**
 * ChangementDateClient — bloc affiché dans l'espace client (onglet « Gérer l'événement »
 * du menu Mon compte).
 *
 *  - Si AUCUNE proposition en_attente : bouton « Proposer un changement de date »
 *    (date exacte uniquement, cohérent avec la règle déjà en place) → creerPropositionDate
 *    avec initiee_par='client' + client_token (evenement.lien_client_token).
 *  - Si une proposition en_attente existe : récapitulatif (libellé de statut, comptage
 *    dispo/indispo/attente par prestataire) avec boutons « Finaliser cette date » et
 *    « Refuser » → finalizePropositionDate / refuserPropositionDate (client_token).
 *
 * N'apparaît que si l'événement n'est pas déjà Annulé.
 */
function dateLabel(prop) {
  if (!prop) return '';
  if (prop.nouvelle_date_type === 'mois' && prop.nouvelle_date_mois) {
    const names = ['Janvier','Février','Mars','Avril','Mai','Juin','Juillet','Août','Septembre','Octobre','Novembre','Décembre'];
    const [y, m] = prop.nouvelle_date_mois.split('-');
    const idx = parseInt(m, 10) - 1;
    return idx >= 0 && idx < 12 ? `${names[idx]} ${y}` : prop.nouvelle_date_mois;
  }
  if (prop.nouvelle_date_type === 'periode' && prop.nouvelle_date_periode) {
    return prop.nouvelle_date_periode;
  }
  try {
    return format(parseISO(prop.nouvelle_date), 'd MMMM yyyy', { locale: fr });
  } catch {
    return prop.nouvelle_date || '';
  }
}

export default function ChangementDateClient({ evenement, clientToken }) {
  const qc = useQueryClient();
  const [mode, setMode] = useState('rest'); // 'rest' | 'form'
  const [newDate, setNewDate] = useState('');
  const [submitting, setSubmitting] = useState(false);
  const [finalizing, setFinalizing] = useState(false);
  const [refusing, setRefusing] = useState(false);

  const token = clientToken || evenement?.lien_client_token || null;

  const { data: prop } = useQuery({
    queryKey: ['proposition-date-active-client', evenement?.id],
    queryFn: async () => {
      const all = await base44.entities.PropositionDateEvenement.filter({ evenement_id: evenement.id });
      return (all || []).find((p) => p.statut === 'en_attente') || null;
    },
    enabled: !!evenement?.id,
  });

  const { data: eps = [] } = useQuery({
    queryKey: ['prop-date-eps-client', evenement?.id, prop?.id],
    queryFn: async () => {
      if (!prop) return [];
      const all = await base44.entities.EvenementPrestataire.filter({ evenement_id: evenement.id });
      return (all || []).filter((ep) => ep.proposition_date_id === prop.id);
    },
    enabled: !!prop,
  });

  if (!evenement || evenement.statut === 'Annulé') return null;

  const invalidateAll = () => {
    qc.invalidateQueries(['evenement-portal', evenement.id]);
    qc.invalidateQueries(['proposition-date-active-client', evenement.id]);
    qc.invalidateQueries(['prop-date-eps-client', evenement.id]);
  };

  const proposer = async () => {
    if (!newDate) { toast.error('Veuillez sélectionner une date.'); return; }
    const label = format(parseISO(newDate), 'd MMMM yyyy', { locale: fr });
    if (!confirm(
      `Proposer de déplacer votre événement « ${evenement.nom || ''} » au ${label} ?\n\n` +
      `Les prestataires confirmés seront notifiés et devront confirmer leur disponibilité. ` +
      `La date actuelle reste conservée tant que la nouvelle date n'est pas finalisée.`
    )) return;
    setSubmitting(true);
    try {
      await base44.functions.invoke('creerPropositionDate', {
        evenement_id: evenement.id,
        nouvelle_date: newDate,
        nouvelle_date_type: 'exacte',
        initiee_par: 'client',
        client_token: token,
      });
      toast.success('✓ Changement de date proposé. Les prestataires confirmés ont été notifiés.');
      setNewDate('');
      setMode('rest');
      invalidateAll();
    } catch (e) {
      const msg = e?.message || e?.error || '';
      if (typeof msg === 'string' && msg.toLowerCase().includes('déjà')) {
        toast.error(`📅 ${msg}`, { duration: 7000 });
      } else {
        toast.error('❌ Impossible de créer la proposition de date');
      }
    }
    setSubmitting(false);
  };

  const finalize = async () => {
    if (!confirm(
      `Finaliser la nouvelle date (${dateLabel(prop)}) ?\n\n` +
      `La date de l'événement sera modifiée. Les prestataires ayant répondu « indisponible » seront annulés. ` +
      `Cette action est irréversible.`
    )) return;
    setFinalizing(true);
    try {
      await base44.functions.invoke('finalizePropositionDate', {
        proposition_id: prop.id,
        client_token: token,
      });
      toast.success('✓ Date finalisée et appliquée à l\'événement');
      invalidateAll();
    } catch {
      toast.error('❌ Erreur lors de la finalisation');
    }
    setFinalizing(false);
  };

  const refuser = async () => {
    if (!confirm('Refuser cette proposition de date ? La date actuelle restera inchangée.')) return;
    setRefusing(true);
    try {
      await base44.functions.invoke('refuserPropositionDate', {
        proposition_id: prop.id,
        client_token: token,
      });
      toast.success('✓ Proposition refusée. La date initiale est maintenue.');
      invalidateAll();
    } catch {
      toast.error('❌ Erreur lors du refus');
    }
    setRefusing(false);
  };

  // ── Proposition en_attente : récapitulatif + actions ──
  if (prop) {
    const counts = {
      dispo: eps.filter((e) => e.reponse_date_proposee === 'dispo').length,
      indispo: eps.filter((e) => e.reponse_date_proposee === 'indispo').length,
      attente: eps.filter((e) => !e.reponse_date_proposee).length,
    };
    return (
      <div className="border border-amber-200 bg-amber-50 rounded-2xl p-4 space-y-3">
        <div>
          <p className="text-sm font-semibold text-amber-900 flex items-center gap-1.5">
            <CalendarClock size={15} /> Changement de date en cours
          </p>
          <p className="text-xs text-amber-800 mt-0.5">
            Nouvelle date proposée : <strong>{dateLabel(prop)}</strong>
          </p>
          <p className="text-[11px] text-amber-700 italic">{statutPropositionLabel(prop)}</p>
        </div>

        <div className="space-y-1.5">
          {eps.map((ep) => {
            const rep = ep.reponse_date_proposee;
            return (
              <div key={ep.id} className="flex items-center justify-between bg-white rounded-lg px-3 py-1.5 border border-amber-100">
                <span className="text-sm font-medium truncate">{ep.prestataire_nom}</span>
                <span className={`text-xs px-2 py-0.5 rounded-full font-medium flex items-center gap-1 shrink-0 ${
                  rep === 'dispo' ? 'bg-emerald-100 text-emerald-700'
                  : rep === 'indispo' ? 'bg-red-100 text-red-600'
                  : 'bg-amber-100 text-amber-700'
                }`}>
                  {rep === 'dispo' ? <><CheckCircle2 size={11} /> Disponible</>
                    : rep === 'indispo' ? <><XCircle size={11} /> Indisponible</>
                    : <><Clock size={11} /> En attente</>}
                </span>
              </div>
            );
          })}
        </div>

        <div className="flex flex-col gap-2 pt-1 border-t border-amber-200">
          <p className="text-[11px] text-amber-700">
            {counts.dispo} dispo · {counts.indispo} indispo · {counts.attente} en attente
          </p>
          <div className="flex gap-2">
            <button
              onClick={finalize}
              disabled={finalizing || refusing || eps.length === 0}
              className="flex-1 flex items-center justify-center gap-1.5 text-xs py-2 rounded-xl font-medium bg-amber-600 text-white disabled:opacity-50"
            >
              {finalizing ? <div className="w-3.5 h-3.5 border-2 border-white border-t-transparent rounded-full animate-spin" /> : <CheckCircle2 size={13} />}
              Finaliser cette date
            </button>
            <button
              onClick={refuser}
              disabled={finalizing || refusing}
              className="flex-1 flex items-center justify-center gap-1.5 text-xs py-2 rounded-xl font-medium border border-red-200 text-red-600 bg-white hover:bg-red-50 disabled:opacity-50"
            >
              {refusing ? <div className="w-3.5 h-3.5 border-2 border-red-400 border-t-transparent rounded-full animate-spin" /> : <XCircle size={13} />}
              Refuser
            </button>
          </div>
        </div>
        <p className="text-[11px] text-amber-600">
          La finalisation applique la nouvelle date. Les prestataires « indisponibles » passent en Annulé. Les autres restent Confirmés.
        </p>
      </div>
    );
  }

  // ── Aucune proposition : bouton « Proposer un changement de date » ──
  if (mode === 'rest') {
    return (
      <div className="px-4 pt-2">
        <button
          onClick={() => setMode('form')}
          className="w-full flex items-center justify-between gap-1.5 text-xs py-2.5 rounded-xl font-medium border border-amber-200 text-amber-700 bg-white hover:bg-amber-50"
        >
          <span className="flex items-center gap-1.5"><CalendarClock size={13} /> Proposer un changement de date</span>
          <ChevronRight size={13} />
        </button>
      </div>
    );
  }

  // ── Formulaire de proposition ──
  return (
    <div className="px-4 pt-2 space-y-3">
      <div className="border border-amber-200 bg-amber-50 rounded-2xl p-4 space-y-3">
        <p className="text-sm font-semibold text-amber-900 flex items-center gap-1.5">
          <CalendarClock size={15} /> Proposer une nouvelle date
        </p>
        <p className="text-[11px] text-amber-700 leading-snug">
          Sélectionnez la nouvelle date souhaitée. Les prestataires confirmés seront notifiés et devront confirmer leur disponibilité. La date actuelle restera conservée tant que la nouvelle date ne sera pas finalisée.
        </p>
        <input
          type="date"
          value={newDate}
          onChange={e => setNewDate(e.target.value)}
          className="w-full rounded-xl border px-3 py-2.5 text-[16px] focus:outline-none focus:ring-2 focus:ring-amber-500/30 bg-white"
          style={{ borderColor: '#e8e4dc' }}
        />
        <div className="flex gap-2">
          <button
            onClick={() => { setMode('rest'); setNewDate(''); }}
            disabled={submitting}
            className="flex-1 py-2 rounded-xl border border-gray-200 text-xs font-medium text-gray-500 bg-white"
          >
            Annuler
          </button>
          <button
            onClick={proposer}
            disabled={submitting || !newDate}
            className="flex-1 flex items-center justify-center gap-1.5 py-2 rounded-xl bg-amber-600 text-white text-xs font-medium disabled:opacity-50"
          >
            {submitting ? <div className="w-3.5 h-3.5 border-2 border-white border-t-transparent rounded-full animate-spin" /> : <CalendarClock size={13} />}
            Proposer cette date
          </button>
        </div>
      </div>
    </div>
  );
}