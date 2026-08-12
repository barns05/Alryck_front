import { useQuery } from '@tanstack/react-query';
import { base44 } from '@/api/base44Client';
import { FileText, Users, Clock, Utensils, MessageSquare, Map } from 'lucide-react';

export default function FicheServiceView({ serviceId, service }) {
  const { data: fiches = [], isLoading } = useQuery({
    queryKey: ['fiches', serviceId],
    queryFn: () => base44.entities.FicheService.filter({ service_id: serviceId }),
  });

  const fiche = fiches[0];

  if (isLoading) return null;
  if (!fiche) return null;

  const total = (fiche.nb_adultes || 0) + (fiche.nb_enfants || 0) + (fiche.nb_ados || 0) + (fiche.nb_prestataires || 0);

  return (
    <div className="mt-3 border-t border-border pt-3 space-y-3">
      <div className="flex items-center gap-1.5 text-primary">
        <FileText size={13} />
        <p className="text-xs font-semibold uppercase tracking-wide">Fiche de service</p>
      </div>

      <div className="grid grid-cols-2 gap-2 text-xs">
        {fiche.type_evenement && (
          <div className="col-span-2 bg-primary/5 rounded-lg px-3 py-1.5">
            <span className="font-semibold">🎉 {fiche.type_evenement}</span>
            {fiche.nom_client && <span className="text-muted-foreground"> · {fiche.nom_client}</span>}
          </div>
        )}

        {fiche.heure_arrivee_staff && (
          <div className="flex items-center gap-1.5 bg-muted/50 rounded-lg px-3 py-1.5">
            <Clock size={11} className="text-primary" />
            <div>
              <p className="text-muted-foreground">Arrivée staff</p>
              <p className="font-semibold">{fiche.heure_arrivee_staff}</p>
            </div>
          </div>
        )}

        {total > 0 && (
          <div className="flex items-center gap-1.5 bg-muted/50 rounded-lg px-3 py-1.5">
            <Users size={11} className="text-primary" />
            <div>
              <p className="text-muted-foreground">Invités</p>
              <p className="font-semibold">{total} pers.</p>
            </div>
          </div>
        )}
      </div>

      {total > 0 && (
        <div className="grid grid-cols-4 gap-1.5 text-xs text-center">
          {[
            { label: 'Adultes', val: fiche.nb_adultes },
            { label: 'Ados', val: fiche.nb_ados },
            { label: 'Enfants', val: fiche.nb_enfants },
            { label: 'Presta.', val: fiche.nb_prestataires },
          ].filter(i => i.val > 0).map(({ label, val }) => (
            <div key={label} className="bg-muted/50 rounded-lg py-1.5">
              <p className="font-bold text-sm">{val}</p>
              <p className="text-muted-foreground text-[10px]">{label}</p>
            </div>
          ))}
        </div>
      )}

      {fiche.plan_de_salle && (
        <div className="space-y-1">
          <div className="flex items-center gap-1 text-muted-foreground text-xs font-medium">
            <Map size={11} /> Plan de salle
          </div>
          <p className="text-xs bg-muted/50 rounded-lg px-3 py-2 whitespace-pre-wrap">{fiche.plan_de_salle}</p>
        </div>
      )}

      {fiche.options_choisies && (
        <div className="space-y-1">
          <div className="flex items-center gap-1 text-muted-foreground text-xs font-medium">
            <Utensils size={11} /> Options / Menu
          </div>
          <p className="text-xs bg-muted/50 rounded-lg px-3 py-2 whitespace-pre-wrap">{fiche.options_choisies}</p>
        </div>
      )}

      {fiche.commentaire && (
        <div className="space-y-1">
          <div className="flex items-center gap-1 text-muted-foreground text-xs font-medium">
            <MessageSquare size={11} /> Commentaires
          </div>
          <p className="text-xs bg-muted/50 rounded-lg px-3 py-2 whitespace-pre-wrap">{fiche.commentaire}</p>
        </div>
      )}
    </div>
  );
}