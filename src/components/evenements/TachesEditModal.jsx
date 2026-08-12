import { useState } from 'react';
import { useMutation, useQueryClient } from '@tanstack/react-query';
import { base44 } from '@/api/base44Client';
import { X, Check } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { useModules } from '@/hooks/useModules';
import { toast } from 'sonner';

const TACHES_DEF = [
  { key: 'formulaire',    label: 'Formulaire de préparation', emoji: '📝' },
  { key: 'programme',     label: 'Programme de la journée',   emoji: '📋' },
  { key: 'menu',          label: 'Menu / Formule',            emoji: '🍽️' },
  { key: 'plan_table',    label: 'Plan de table',             emoji: '🗺️' },
  { key: 'fiche_service', label: 'Fiche de service',          emoji: '🗒️' },
  { key: 'equipe_extras', label: 'Extras & planning',         emoji: '👥' },
  { key: 'logistique',    label: 'Logistique & Livraisons',   emoji: '📦', moduleKey: 'logistique' },
];

export default function TachesEditModal({ evenement, onClose }) {
  const modules = useModules();
  const qc = useQueryClient();
  const [taches, setTaches] = useState(() => {
    const t = evenement.taches_requises || {};
    const init = {};
    TACHES_DEF.forEach(td => {
      init[td.key] = t[td.key] !== undefined ? !!t[td.key] : true;
    });
    return init;
  });

  const mutation = useMutation({
    mutationFn: () => base44.entities.Evenement.update(evenement.id, { taches_requises: taches }),
    onSuccess: () => {
      qc.invalidateQueries(['evenements']);
      toast.success('Configuration mise à jour');
      onClose();
    },
  });

  const toggle = (key) => setTaches(p => ({ ...p, [key]: !p[key] }));

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/40 backdrop-blur-sm p-4">
      <div className="bg-card rounded-2xl border border-border shadow-xl w-full max-w-md flex flex-col max-h-[90vh]">
        {/* Header */}
        <div className="p-5 border-b border-border flex items-center justify-between shrink-0">
          <div>
            <h3 className="font-bold text-base">Ce dont on a besoin</h3>
            <p className="text-xs text-muted-foreground mt-0.5">{evenement.nom}</p>
          </div>
          <button onClick={onClose} className="p-2 rounded-xl hover:bg-muted transition-colors text-muted-foreground">
            <X size={16} />
          </button>
        </div>

        {/* Liste scrollable */}
        <div className="overflow-y-auto flex-1 p-5 space-y-3 pb-40">
          {TACHES_DEF.filter(t => !t.moduleKey || modules[t.moduleKey]).map(t => {
            const checked = !!taches[t.key];
            return (
              <div
                key={t.key}
                onClick={() => toggle(t.key)}
                className={`rounded-xl border p-3 flex items-center gap-3 cursor-pointer transition-colors ${checked ? 'border-primary bg-primary/5' : 'border-border hover:bg-muted/30'}`}
              >
                <div className={`w-5 h-5 rounded border-2 flex items-center justify-center shrink-0 transition-colors ${checked ? 'bg-primary border-primary' : 'border-muted-foreground/40'}`}>
                  {checked && <Check size={11} className="text-white" />}
                </div>
                <span className="text-sm font-medium">{t.emoji} {t.label}</span>
              </div>
            );
          })}
        </div>

        {/* Bouton sticky */}
        <div style={{ position: 'sticky', bottom: '80px', background: 'white', padding: '16px', borderTop: '1px solid #e5e7eb', zIndex: 10 }}>
          <Button
            className="w-full"
            onClick={() => mutation.mutate()}
            disabled={mutation.isPending}
          >
            {mutation.isPending ? <div className="w-4 h-4 border-2 border-white border-t-transparent rounded-full animate-spin" /> : <Check size={15} />}
            Sauvegarder les modifications
          </Button>
        </div>
      </div>
    </div>
  );
}