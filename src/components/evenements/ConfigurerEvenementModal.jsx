import { useState } from 'react';
import { useMutation, useQueryClient } from '@tanstack/react-query';
import { base44 } from '@/api/base44Client';
import { X, Check, Settings } from 'lucide-react';
import { Button } from '@/components/ui/button';

const TACHES = [
  { key: 'formulaire',    label: 'Formulaire de préparation', emoji: '📝' },
  { key: 'programme',     label: 'Programme de la journée',   emoji: '📋' },
  { key: 'plan_table',    label: 'Plan de table',              emoji: '🗺️' },
  { key: 'fiche_service', label: 'Fiche de service',           emoji: '📋' },
  { key: 'equipe_extras', label: 'Extras & planning',          emoji: '👥' },
  { key: 'menu',          label: 'Menu',                       emoji: '🍽️' },
];

export default function ConfigurerEvenementModal({ evenement, onClose }) {
  const qc = useQueryClient();
  const initial = evenement.taches_requises || {};
  const [taches, setTaches] = useState(
    Object.fromEntries(TACHES.map(t => [t.key, initial[t.key] !== false]))
  );
  const [saving, setSaving] = useState(false);

  const toggle = (key) => setTaches(prev => ({ ...prev, [key]: !prev[key] }));

  const handleValider = async () => {
    setSaving(true);
    await base44.entities.Evenement.update(evenement.id, {
      statut: 'En préparation',
      taches_requises: taches,
    });
    qc.invalidateQueries(['evenements']);
    setSaving(false);
    onClose();
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 p-4">
      <div className="bg-card rounded-2xl shadow-xl w-full max-w-md">
        <div className="flex items-center justify-between px-5 py-4 border-b border-border">
          <h2 className="font-bold text-lg flex items-center gap-2">
            <Settings size={17} className="text-orange-500" /> Configurer l'événement
          </h2>
          <button onClick={onClose} className="p-1.5 rounded-lg hover:bg-muted text-muted-foreground"><X size={16} /></button>
        </div>

        <div className="px-5 py-5 space-y-4">
          <p className="text-sm text-muted-foreground">
            Cochez les éléments à préparer pour <strong>{evenement.nom}</strong>. Une fois validée, la checklist sera activée et le statut passera à <span className="font-semibold text-blue-600">En préparation</span>.
          </p>

          <div className="space-y-2">
            {TACHES.map(t => (
              <label
                key={t.key}
                className={`flex items-center gap-3 p-3 rounded-xl border cursor-pointer transition-colors ${taches[t.key] ? 'border-primary bg-primary/5' : 'border-border hover:bg-muted/30'}`}
              >
                <div className={`w-5 h-5 rounded border-2 flex items-center justify-center transition-colors flex-shrink-0 ${taches[t.key] ? 'bg-primary border-primary' : 'border-muted-foreground/40'}`}>
                  {taches[t.key] && <Check size={11} className="text-white" />}
                </div>
                <input type="checkbox" checked={taches[t.key]} onChange={() => toggle(t.key)} className="hidden" />
                <span className="text-sm">{t.emoji} {t.label}</span>
              </label>
            ))}
          </div>

          <div className="flex items-center justify-between pt-2 border-t border-border">
            <Button variant="outline" size="sm" onClick={onClose}>Annuler</Button>
            <Button
              size="sm"
              onClick={handleValider}
              disabled={saving || !Object.values(taches).some(Boolean)}
              className="bg-blue-600 hover:bg-blue-700 text-white gap-1.5"
            >
              {saving ? <div className="w-4 h-4 border-2 border-white border-t-transparent rounded-full animate-spin" /> : <Check size={14} />}
              Valider — Passer en préparation
            </Button>
          </div>
        </div>
      </div>
    </div>
  );
}