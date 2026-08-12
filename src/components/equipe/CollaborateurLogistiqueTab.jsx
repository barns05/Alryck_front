import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { base44 } from '@/api/base44Client';
import { format, parseISO } from 'date-fns';
import { fr } from 'date-fns/locale';
import { Package } from 'lucide-react';

const TYPE_LABELS = {
  sur_place: '🏛️ Sur place',
  livraison: '🚚 Livraison simple',
  prestation_complete: '👨‍🍳 Prestation complète',
};

export default function CollaborateurLogistiqueTab({ collaborateur }) {
  const qc = useQueryClient();

  const { data: logistiques = [] } = useQuery({
    queryKey: ['logistique-collab', collaborateur.id],
    queryFn: () => base44.entities.LogistiqueEvenement.list('-creneau_date', 100),
    select: (data) => data.filter(l => l.chauffeur_id === collaborateur.id),
  });

  const { data: evenements = [] } = useQuery({
    queryKey: ['evenements'],
    queryFn: () => base44.entities.Evenement.list('-date', 200),
  });

  const updateMutation = useMutation({
    mutationFn: ({ id, checklist }) => base44.entities.LogistiqueEvenement.update(id, { checklist_materiel: checklist }),
    onSuccess: (_, vars) => {
      qc.invalidateQueries(['logistique-collab', collaborateur.id]);
      qc.invalidateQueries(['logistique-ev', vars.evenement_id]);
      qc.invalidateQueries(['logistique-ev-all']);
    },
  });

  const toggleItem = (log, idx, field) => {
    const updated = log.checklist_materiel.map((item, i) =>
      i === idx ? { ...item, [field]: !item[field] } : item
    );
    updateMutation.mutate({ id: log.id, checklist: updated, evenement_id: log.evenement_id });
  };

  if (logistiques.length === 0) {
    return (
      <div className="text-center py-16 text-muted-foreground">
        <Package size={36} className="mx-auto mb-3 opacity-30" />
        <p className="font-medium text-sm">Aucune livraison assignée</p>
        <p className="text-xs mt-1">Ce collaborateur apparaîtra ici quand il sera assigné comme chauffeur/responsable d'une livraison.</p>
      </div>
    );
  }

  return (
    <div className="space-y-4">
      {logistiques.map(log => {
        const ev = evenements.find(e => e.id === log.evenement_id);
        const checklist = log.checklist_materiel || [];
        const typeLabel = TYPE_LABELS[log.type_prestation] || log.type_prestation;
        const showRetour = log.type_prestation === 'prestation_complete';

        return (
          <div key={log.id} className="bg-card border border-border rounded-2xl overflow-hidden">
            {/* En-tête événement */}
            <div className="px-4 py-3 bg-muted/30 border-b border-border">
              <div className="flex items-start justify-between gap-2">
                <div>
                  <p className="font-semibold text-sm">{ev?.nom || log.evenement_id}</p>
                  {ev?.date && (
                    <p className="text-xs text-muted-foreground capitalize">
                      {format(parseISO(ev.date), 'EEEE d MMMM yyyy', { locale: fr })}
                    </p>
                  )}
                </div>
                <span className="text-xs px-2 py-0.5 rounded-full bg-primary/10 text-primary border border-primary/20 font-medium shrink-0">
                  {typeLabel}
                </span>
              </div>
              {(log.creneau_date || log.creneau_heure) && (
                <p className="text-xs text-muted-foreground mt-1">
                  🕐 Départ : {log.creneau_date ? format(parseISO(log.creneau_date), 'd MMM', { locale: fr }) : ''}{log.creneau_heure ? ` à ${log.creneau_heure}` : ''}
                  {log.adresse_livraison ? ` · 📍 ${log.adresse_livraison}` : ''}
                </p>
              )}
            </div>

            {/* Checklist */}
            {checklist.length === 0 ? (
              <p className="text-sm text-muted-foreground px-4 py-3">Aucun article dans la checklist.</p>
            ) : (
              <div>
                <div className={`grid text-xs font-medium text-muted-foreground bg-muted/20 px-4 py-2 gap-2 ${showRetour ? 'grid-cols-[1fr_64px_60px_60px]' : 'grid-cols-[1fr_64px_64px]'}`}>
                  <span>Article</span>
                  <span className="text-center">Qté</span>
                  <span className="text-center">Chargé</span>
                  {showRetour && <span className="text-center">Retour</span>}
                </div>
                {checklist.map((item, idx) => (
                  <div
                    key={idx}
                    className={`grid items-center px-4 py-2.5 gap-2 border-t border-border hover:bg-muted/10 ${showRetour ? 'grid-cols-[1fr_64px_60px_60px]' : 'grid-cols-[1fr_64px_64px]'}`}
                  >
                    <span className={`text-sm font-medium ${item.charge ? 'line-through text-muted-foreground' : ''}`}>
                      {item.nom}{item.unite ? ` (${item.unite})` : ''}
                    </span>
                    <span className="text-sm text-center text-muted-foreground">{item.quantite}</span>
                    <div className="flex justify-center">
                      <input
                        type="checkbox"
                        checked={item.charge || false}
                        onChange={() => toggleItem(log, idx, 'charge')}
                        className="w-5 h-5 accent-primary cursor-pointer"
                      />
                    </div>
                    {showRetour && (
                      <div className="flex justify-center">
                        <input
                          type="checkbox"
                          checked={item.retour || false}
                          onChange={() => toggleItem(log, idx, 'retour')}
                          className="w-5 h-5 accent-primary cursor-pointer"
                        />
                      </div>
                    )}
                  </div>
                ))}
                <div className="px-4 py-2 border-t border-border flex items-center justify-between">
                  <span className={`text-xs font-medium ${checklist.every(i => i.charge) ? 'text-emerald-600' : 'text-blue-600'}`}>
                    {checklist.filter(i => i.charge).length}/{checklist.length} chargés
                  </span>
                </div>
              </div>
            )}
          </div>
        );
      })}
    </div>
  );
}