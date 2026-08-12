import { useState } from 'react';
import { useQuery } from '@tanstack/react-query';
import { base44 } from '@/api/base44Client';
import { FileSignature, ArrowRight } from 'lucide-react';
import { Button } from '@/components/ui/button';
import DevisModal from '@/components/facturation/DevisModal';

/**
 * Bandeau de suggestion : affiché quand un contrat est signé (statut 'Signé')
 * pour cet événement mais qu'aucune facture d'acompte n'a encore été créée.
 */
export default function AcompteSuggestionBanner({ evenement }) {
  const [showModal, setShowModal] = useState(false);

  // Contrats liés à cet événement
  const { data: contrats = [] } = useQuery({
    queryKey: ['contrats-evenement', evenement?.id],
    queryFn: () => base44.entities.Contrat.filter({ evenement_id: evenement.id }),
    enabled: !!evenement?.id,
  });

  // Devis liés à cet événement (pour vérifier s'il existe déjà une facture d'acompte)
  const { data: devisList = [] } = useQuery({
    queryKey: ['devis-evenement-acompte', evenement?.id],
    queryFn: () => base44.entities.Devis.filter({ evenement_id: evenement.id }),
    enabled: !!evenement?.id,
  });

  if (!evenement?.id) return null;

  const contratSigne = contrats.find(c => c.statut === 'Signé');
  if (!contratSigne) return null;

  const hasAcompte = devisList.some(
    d => d.type_document === "Facture d'acompte" && !d.archived
  );
  if (hasAcompte) return null;

  return (
    <>
      <div className="flex items-center gap-3 rounded-xl border border-amber-200 bg-amber-50 px-4 py-2.5">
        <FileSignature size={18} className="text-amber-600 shrink-0" />
        <div className="flex-1 min-w-0">
          <p className="text-sm font-medium text-amber-900">Contrat signé — acompte à facturer</p>
          <p className="text-xs text-amber-700 truncate">
            Le contrat « {contratSigne.titre} » est signé. Créez la facture d'acompte.
          </p>
        </div>
        <Button
          size="sm"
          className="gap-1.5 h-8 text-xs shrink-0 bg-amber-600 hover:bg-amber-700 text-white"
          onClick={() => setShowModal(true)}
        >
          Créer l'acompte <ArrowRight size={13} />
        </Button>
      </div>

      {showModal && (
        <DevisModal
          evenementId={evenement.id}
          evenement={evenement}
          initialTypeDocument="Facture d'acompte"
          section="facturation"
          clientNom={evenement.client_nom}
          clientEmail={evenement.client_email}
          clientTelephone={evenement.client_telephone}
          onClose={() => setShowModal(false)}
          onSaved={() => setShowModal(false)}
        />
      )}
    </>
  );
}