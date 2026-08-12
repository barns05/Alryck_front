import { useState } from 'react';
import { useQuery } from '@tanstack/react-query';
import { base44 } from '@/api/base44Client';
import { Plus } from 'lucide-react';
import { format, parseISO } from 'date-fns';
import { fr } from 'date-fns/locale';
import DevisModal from './DevisModal';

const DOC_TYPES_ORDER = ['Devis', 'Contrat', "Facture d'acompte", 'Facture intermédiaire', 'Facture', 'Avoir', 'Solde'];

function getStatutGlobal(devisList) {
  if (!devisList.length) return null;
  const hasAvoir = devisList.some(d => d.type_document === 'Avoir');
  if (hasAvoir) return { label: 'Avoir ⚠️', color: 'bg-orange-100 text-orange-700 border-orange-200' };
  const hasSolde = devisList.some(d => d.type_document === 'Solde' || d.statut === 'Accepté');
  if (hasSolde) return { label: 'Soldé ✅', color: 'bg-emerald-100 text-emerald-700 border-emerald-200' };
  return { label: 'En cours', color: 'bg-slate-100 text-slate-600 border-slate-200' };
}

export default function FacturationBadge({ evenement }) {
  const [showModal, setShowModal] = useState(false);

  const { data: devisList = [], refetch } = useQuery({
    queryKey: ['devis-evenement', evenement.id],
    queryFn: () => base44.entities.Devis.filter({ evenement_id: evenement.id }),
    enabled: !!evenement.id,
  });

  // Trier par date de création
  const sorted = [...devisList].sort((a, b) => new Date(a.created_date) - new Date(b.created_date));

  const statut = getStatutGlobal(sorted);

  if (sorted.length === 0) {
    return (
      <>
        <button
          onClick={e => { e.stopPropagation(); setShowModal(true); }}
          className="flex items-center gap-1 text-xs font-medium text-muted-foreground hover:text-foreground transition-colors"
        >
          <span className="text-xs px-2 py-0.5 rounded-full bg-slate-100 text-slate-600 border border-slate-200 font-medium">+ Créer</span>
        </button>
        {showModal && (
          <DevisModal
            evenementId={evenement.id}
            clientNom={evenement.client_nom}
            clientEmail={evenement.client_email}
            clientTelephone={evenement.client_telephone}
            onClose={() => setShowModal(false)}
            onSaved={() => refetch()}
          />
        )}
      </>
    );
  }

  return (
    <>
      <button
        onClick={e => { e.stopPropagation(); setShowModal(true); }}
        className={`text-xs px-2 py-0.5 rounded-full font-medium border transition-colors hover:opacity-80 ${statut ? statut.color : 'bg-slate-100 text-slate-600 border-slate-200'}`}
      >
        {statut ? statut.label : 'En cours'}
      </button>
      {showModal && (
        <DevisModal
          devisId={sorted[sorted.length - 1]?.id}
          evenementId={evenement.id}
          clientNom={evenement.client_nom}
          clientEmail={evenement.client_email}
          clientTelephone={evenement.client_telephone}
          onClose={() => setShowModal(false)}
          onSaved={() => refetch()}
        />
      )}
    </>
  );
}