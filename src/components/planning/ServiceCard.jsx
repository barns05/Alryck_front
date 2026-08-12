import { useState } from 'react';
import { useMutation, useQueryClient, useQuery } from '@tanstack/react-query';
import { base44 } from '@/api/base44Client';
import { Check, X, Trash2, FileText } from 'lucide-react';
import { Button } from '@/components/ui/button';
import FicheServiceModal from './FicheServiceModal';

const assignmentStatusColors = {
  'En attente': 'bg-amber-100 text-amber-700',
  'Dispo': 'bg-blue-100 text-blue-700',
  'Indispo': 'bg-red-100 text-red-600',
  'Confirmé': 'bg-emerald-100 text-emerald-700',
  'Annulé': 'bg-slate-100 text-slate-500',
};

export default function ServiceCard({ service, assignments }) {
  const qc = useQueryClient();
  const [ficheOpen, setFicheOpen] = useState(false);

  const { data: fiches = [] } = useQuery({
    queryKey: ['fiches', service.id],
    queryFn: () => base44.entities.FicheService.filter({ service_id: service.id }),
  });
  const hasFiche = fiches.length > 0;
  const ficheEnvoyee = fiches[0]?.envoyee;

  const updateAssignment = useMutation({
    mutationFn: async ({ id, statut, extra_email, extra_nom }) => {
      await base44.entities.ServiceAssignment.update(id, { statut });
      if ((statut === 'Confirmé' || statut === 'Annulé') && extra_email) {
        await base44.integrations.Core.SendEmail({
          to: extra_email,
          subject: statut === 'Confirmé' ? '✅ Votre service a été confirmé !' : '❌ Service annulé',
          body: `Bonjour ${extra_nom},\n\nVotre service du ${service.date} de ${service.heure_debut} à ${service.heure_fin}${service.lieu ? ` (${service.lieu})` : ''} a été ${statut === 'Confirmé' ? 'confirmé ✅' : 'annulé ❌'}.\n\nCordialement.`,
        });
      }
    },
    onSuccess: () => qc.invalidateQueries(['assignments']),
  });

  const deleteService = useMutation({
    mutationFn: async () => {
      for (const a of assignments) await base44.entities.ServiceAssignment.delete(a.id);
      await base44.entities.Service.delete(service.id);
    },
    onSuccess: () => {
      qc.invalidateQueries(['services']);
      qc.invalidateQueries(['assignments']);
    },
  });

  return (
    <>
      <div className="bg-card rounded-2xl border border-border shadow-sm p-4 space-y-3">
        <div className="flex items-start justify-between">
          <div>
            <p className="font-semibold text-sm">{service.heure_debut} – {service.heure_fin}</p>
            <p className="text-xs text-muted-foreground">{service.poste || '—'}{service.lieu ? ` · ${service.lieu}` : ''}</p>
          </div>
          <div className="flex items-center gap-1">
            <button
              onClick={() => setFicheOpen(true)}
              title="Fiche de service"
              className={`p-1 rounded hover:bg-primary/10 transition-colors ${hasFiche ? 'text-primary' : 'text-muted-foreground'}`}
            >
              <FileText size={14} />
              {ficheEnvoyee && <span className="sr-only">Envoyée</span>}
            </button>
            {ficheEnvoyee && (
              <span className="text-[10px] text-emerald-600 font-medium">✓ Envoyée</span>
            )}
            <button
              onClick={() => deleteService.mutate()}
              className="p-1 rounded hover:bg-destructive/10 text-muted-foreground hover:text-destructive transition-colors"
            >
              <Trash2 size={13} />
            </button>
          </div>
        </div>

        <div className="space-y-2">
          {assignments.map(a => (
            <div key={a.id} className="flex items-center justify-between bg-muted/40 rounded-xl px-3 py-2">
              <div>
                <p className="text-sm font-medium">{a.extra_nom}</p>
                <span className={`text-xs px-2 py-0.5 rounded-full font-medium ${assignmentStatusColors[a.statut]}`}>
                  {a.statut}
                </span>
              </div>
              {a.statut === 'Dispo' && (
                <div className="flex gap-1">
                  <Button
                    size="sm"
                    variant="outline"
                    className="h-7 px-2 text-xs border-emerald-300 text-emerald-700 hover:bg-emerald-50"
                    onClick={() => updateAssignment.mutate({ id: a.id, statut: 'Confirmé', extra_email: a.extra_email, extra_nom: a.extra_nom })}
                    disabled={updateAssignment.isPending}
                  >
                    <Check size={11} /> Confirmer
                  </Button>
                  <Button
                    size="sm"
                    variant="outline"
                    className="h-7 px-2 text-xs border-red-300 text-red-600 hover:bg-red-50"
                    onClick={() => updateAssignment.mutate({ id: a.id, statut: 'Annulé', extra_email: a.extra_email, extra_nom: a.extra_nom })}
                    disabled={updateAssignment.isPending}
                  >
                    <X size={11} /> Annuler
                  </Button>
                </div>
              )}
              {a.statut === 'Indispo' && (
                <span className="text-xs text-red-500">Indisponible</span>
              )}
            </div>
          ))}
          {assignments.length === 0 && (
            <p className="text-xs text-muted-foreground text-center py-1">Aucun extra assigné</p>
          )}
        </div>
      </div>

      {ficheOpen && (
        <FicheServiceModal
          service={service}
          assignments={assignments}
          onClose={() => setFicheOpen(false)}
        />
      )}
    </>
  );
}