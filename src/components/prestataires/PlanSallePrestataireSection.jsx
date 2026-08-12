/**
 * PlanSallePrestataireSection — Bloc « Plan de salle » affiché dans la carte
 * d'un événement confirmé côté prestataire (lieu / traiteur).
 *
 * Résout l'espace actif via usePlanSalleConfig (mêmes données que côté client)
 * et les tables/invités de l'événement, puis propose un bouton générant à la
 * demande le PDF spatial (exportPlanDeSallePDF) — donnée toujours synchronisée,
 * sans envoi programmé. Ne renvoie rien si aucun espace/table n'est configuré.
 */
import { useState } from 'react';
import { useQuery } from '@tanstack/react-query';
import { base44 } from '@/api/base44Client';
import { usePlanSalleConfig } from '@/components/client-portal/usePlanSalleConfig';
import { exportPlanDeSallePDF } from '@/components/invites/exportPlanDeSallePDF';
import { Loader2, FileText } from 'lucide-react';

export default function PlanSallePrestataireSection({ evenementId }) {
  const [busy, setBusy] = useState(false);

  const { data: evenement } = useQuery({
    queryKey: ['evenement', evenementId],
    queryFn: () => base44.entities.Evenement.get(evenementId),
    enabled: !!evenementId,
    staleTime: 30000,
  });

  const { espaceActif } = usePlanSalleConfig(evenement || null);

  const { data: tables = [] } = useQuery({
    queryKey: ['tables', evenementId],
    queryFn: () => base44.entities.TableEvenement.filter({ evenement_id: evenementId }, 'ordre', 100),
    enabled: !!evenementId,
    staleTime: 10000,
  });
  const { data: invites = [] } = useQuery({
    queryKey: ['invites', evenementId],
    queryFn: () => base44.entities.Invite.filter({ evenement_id: evenementId }),
    enabled: !!evenementId,
    staleTime: 10000,
  });

  if (!espaceActif || tables.length === 0) return null;

  const invitesVisibles = invites.filter(
    (i) => !(i.archived && i.prenom === '_groupe_') && i.statut_rsvp !== 'Absent'
  );
  const places = invitesVisibles.filter((i) => i.table_attribuee).length;

  const handlePDF = async () => {
    setBusy(true);
    try {
      const result = await exportPlanDeSallePDF({
        espace: espaceActif,
        tables,
        invites: invitesVisibles,
        evenementNom: evenement?.nom,
        evenementDate: evenement?.date,
        coverUrl: evenement?.photo_bandeau_url || null,
      });
      const url = URL.createObjectURL(result.blob);
      window.open(url, '_blank');
      setTimeout(() => URL.revokeObjectURL(url), 60000);
    } catch (e) {
      console.error('plan salle prestataire PDF', e);
    } finally {
      setBusy(false);
    }
  };

  return (
    <div className="mt-2 pt-2 border-t" style={{ borderColor: '#f1f5f9' }}>
      <div className="flex items-center gap-2">
        <span className="w-7 h-7 rounded-lg flex items-center justify-center shrink-0 text-sm" style={{ background: 'rgba(197,160,89,0.15)' }}>🪑</span>
        <div className="flex-1 min-w-0">
          <p className="text-xs font-semibold" style={{ color: '#1e1b4b' }}>Plan de salle</p>
          <p className="text-[10px]" style={{ color: '#9ca3af' }}>
            {tables.length} table{tables.length > 1 ? 's' : ''} · {places} invité{places > 1 ? 's' : ''} placé{places > 1 ? 's' : ''}
            {espaceActif?.nom ? ` · ${espaceActif.nom}` : ''}
          </p>
        </div>
        <button
          onClick={handlePDF}
          disabled={busy}
          className="flex items-center gap-1.5 px-2.5 py-1.5 rounded-lg text-[11px] font-semibold border disabled:opacity-60"
          style={{ borderColor: '#C5A059', color: '#C5A059', background: '#FFFBF0' }}
        >
          {busy ? <Loader2 size={12} className="animate-spin" /> : <FileText size={12} />}
          {busy ? '…' : 'PDF'}
        </button>
      </div>
    </div>
  );
}