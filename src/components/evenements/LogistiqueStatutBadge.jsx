import { useQuery } from '@tanstack/react-query';
import { base44 } from '@/api/base44Client';

const STATUTS = {
  en_preparation: { label: 'En préparation', className: 'bg-blue-100 text-blue-700 border-blue-200' },
  pret:           { label: 'Prêt',           className: 'bg-emerald-100 text-emerald-700 border-emerald-200' },
  en_route:       { label: 'En route',        className: 'bg-amber-100 text-amber-700 border-amber-200' },
  sur_place:      { label: 'Sur place',        className: 'bg-violet-100 text-violet-700 border-violet-200' },
  livre:          { label: 'Livré',           className: 'bg-emerald-200 text-emerald-800 border-emerald-300' },
  realise:        { label: 'Réalisé',         className: 'bg-emerald-200 text-emerald-800 border-emerald-300' },
  signe:          { label: 'Signé',           className: 'bg-emerald-200 text-emerald-800 border-emerald-300' },
};

export default function LogistiqueStatutBadge({ evenementId, onClick }) {
  const { data = [] } = useQuery({
    queryKey: ['logistique-ev', evenementId],
    queryFn: () => base44.entities.LogistiqueEvenement.filter({ evenement_id: evenementId }),
    staleTime: 0,
    gcTime: 30000,
    refetchOnWindowFocus: true,
  });

  const log = data[0];
  const statut = log ? (STATUTS[log.statut_livraison] || STATUTS['en_preparation']) : null;

  return (
    <button
      onClick={onClick}
      className={`text-xs px-2 py-0.5 rounded-md border font-medium transition-opacity hover:opacity-80 ${statut ? statut.className : 'bg-slate-100 text-slate-600 border-slate-200'}`}
    >
      {statut ? statut.label : 'À configurer'}
    </button>
  );
}