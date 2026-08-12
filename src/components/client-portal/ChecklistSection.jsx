import { useMutation, useQueryClient } from '@tanstack/react-query';
import { base44 } from '@/api/base44Client';
import { CheckCircle2, Circle } from 'lucide-react';

export default function ChecklistSection({ evenement, queryKey }) {
  const qc = useQueryClient();
  const checklist = evenement.checklist || [];

  const toggleMutation = useMutation({
    mutationFn: async (taskId) => {
      const updated = checklist.map(t =>
        t.id === taskId ? { ...t, checked: !t.checked } : t
      );
      await base44.entities.Evenement.update(evenement.id, { checklist: updated });
    },
    onSuccess: () => qc.invalidateQueries(queryKey),
  });

  if (checklist.length === 0) return null;

  const done = checklist.filter(t => t.checked).length;
  const total = checklist.length;
  const pct = total > 0 ? Math.round((done / total) * 100) : 0;

  return (
    <div className="bg-card rounded-2xl border border-border p-5 space-y-4">
      <div className="flex items-center justify-between">
        <h3 className="font-semibold text-base">✅ Fiche de préparation</h3>
        <span className="text-sm font-semibold text-primary">{done}/{total}</span>
      </div>

      {/* Barre de progression */}
      <div className="space-y-1.5">
        <div className="w-full bg-muted rounded-full h-2.5 overflow-hidden">
          <div
            className="h-full bg-primary rounded-full transition-all duration-500"
            style={{ width: `${pct}%` }}
          />
        </div>
        <p className="text-xs text-muted-foreground">
          {done === total && total > 0
            ? '🎉 Tout est prêt !'
            : `${done} étape${done > 1 ? 's' : ''} complétée${done > 1 ? 's' : ''} sur ${total}`}
        </p>
      </div>

      {/* Liste des tâches */}
      <div className="space-y-2">
        {checklist.map(task => (
          <button
            key={task.id}
            onClick={() => toggleMutation.mutate(task.id)}
            className="flex items-center gap-3 w-full text-left p-2.5 rounded-xl hover:bg-muted/40 transition-colors"
          >
            {task.checked
              ? <CheckCircle2 size={18} className="text-primary shrink-0" />
              : <Circle size={18} className="text-muted-foreground shrink-0" />
            }
            <span className={`text-sm ${task.checked ? 'line-through text-muted-foreground' : ''}`}>
              {task.label}
            </span>
          </button>
        ))}
      </div>
    </div>
  );
}