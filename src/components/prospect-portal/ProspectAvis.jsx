import { useQuery } from '@tanstack/react-query';
import { base44 } from '@/api/base44Client';
import { Star } from 'lucide-react';

export default function ProspectAvis({ settings }) {
  const { data: avis = [] } = useQuery({
    queryKey: ['avis-evenement-prospect'],
    queryFn: () => base44.entities.AvisEvenement.filter({ statut: 'Avis reçu' }),
  });

  const avisEnAvant = settings?.avis_mis_en_avant || [];
  const avisSelectionnes = avisEnAvant.length > 0
    ? avis.filter(a => avisEnAvant.includes(a.id))
    : avis.filter(a => a.commentaire).slice(0, 5);

  if (avisSelectionnes.length === 0) {
    return <p className="text-sm text-muted-foreground py-4 text-center">Aucun avis disponible pour le moment.</p>;
  }

  return (
    <div className="space-y-3 pt-4">
      {avisSelectionnes.map(a => (
        <div key={a.id} className="bg-muted/30 rounded-xl p-4 border border-border">
          <div className="flex items-center justify-between mb-2">
            <p className="text-sm font-semibold">{a.client_nom || 'Client'}</p>
            {a.note && (
              <div className="flex items-center gap-0.5">
                {Array.from({ length: 5 }).map((_, i) => (
                  <Star
                    key={i}
                    size={12}
                    className={i < a.note ? 'text-amber-400 fill-amber-400' : 'text-muted-foreground/30'}
                  />
                ))}
              </div>
            )}
          </div>
          {a.evenement_nom && <p className="text-[11px] text-muted-foreground mb-2">{a.type_evenement || ''} · {a.evenement_nom}</p>}
          {a.commentaire && (
            <p className="text-xs text-foreground/80 italic leading-relaxed">"{a.commentaire}"</p>
          )}
        </div>
      ))}
    </div>
  );
}