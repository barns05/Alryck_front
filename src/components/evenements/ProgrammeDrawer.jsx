/**
 * Drawer déroulant sur la carte événement pour gérer le programme de la journée.
 * Utilise ProgrammeEditor pour le calcul en cascade.
 */
import { useState } from 'react';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { base44 } from '@/api/base44Client';
import { X, Save, Loader2 } from 'lucide-react';
import { Button } from '@/components/ui/button';
import ProgrammeEditor from '@/components/programme/ProgrammeEditor';

/**
 * Badge statut programme :
 * ⚪ À faire — aucune étape
 * 🟡 En cours — au moins 1 étape mais pas encore "prêt"
 * 🟢 Prêt — programme finalisé (heure de début renseignée + au moins 1 heure calculée)
 */
export function ProgrammeStatutBadge({ evenement }) {
  const prog = evenement.programme_journee || [];
  if (prog.length === 0) {
    return (
      <span className="text-xs px-2 py-0.5 rounded-md bg-slate-100 text-slate-600 font-medium">
        À faire
      </span>
    );
  }
  const aDesHeures = prog.some(e => e.heure && e.heure !== '--:--');
  if (aDesHeures) {
    return (
      <span className="text-xs px-2 py-0.5 rounded-md bg-emerald-100 text-emerald-700 font-medium">
        Prêt
      </span>
    );
  }
  return (
    <span className="text-xs px-2 py-0.5 rounded-md bg-amber-100 text-amber-700 font-medium">
      En cours
    </span>
  );
}

export default function ProgrammeDrawer({ evenement, onClose }) {
  const qc = useQueryClient();
  const [programme, setProgramme] = useState(evenement.programme_journee || []);

  const save = useMutation({
    mutationFn: () =>
      base44.entities.Evenement.update(evenement.id, { programme_journee: programme }),
    onSuccess: () => {
      qc.invalidateQueries(['evenements']);
      onClose();
    },
  });

  return (
    <div className="border-t border-border bg-muted/30 rounded-b-2xl">
      <div className="p-4 space-y-4">
        {/* Header */}
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-2">
            <span className="text-sm font-semibold">🗓️ Programme de la journée</span>
            <ProgrammeStatutBadge evenement={{ ...evenement, programme_journee: programme }} />
          </div>
          <div className="flex items-center gap-1.5">
            <Button
              size="sm"
              className="text-xs gap-1 h-7"
              onClick={() => save.mutate()}
              disabled={save.isPending}
            >
              {save.isPending ? <Loader2 size={11} className="animate-spin" /> : <Save size={11} />}
              Enregistrer
            </Button>
            <button onClick={onClose} className="ml-1 text-muted-foreground hover:text-foreground p-1 rounded">
              <X size={15} />
            </button>
          </div>
        </div>

        {/* Éditeur programme */}
        <ProgrammeEditor programme={programme} onChange={setProgramme} formuleNom={evenement.formule_nom} />
      </div>
    </div>
  );
}