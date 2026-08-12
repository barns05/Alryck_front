/**
 * Modal pour créer / modifier un modèle de formulaire.
 */
import { useState } from 'react';
import { useMutation, useQueryClient } from '@tanstack/react-query';
import { base44 } from '@/api/base44Client';
import { X, Loader2 } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import FormulaireBuilder from '@/components/formulaire/FormulaireBuilder';
import TypeEvenementMultiSelect, { normalizeTypes } from '@/components/bibliotheque/TypeEvenementMultiSelect';

const DELAIS_DEFAUT = { 'Mariage': 60, 'Pacs': 60, 'Anniversaire de mariage': 45, 'Anniversaire': 30, 'default': 30 };

export default function ModeleFormulaireModal({ modele, onClose }) {
  const qc = useQueryClient();
  const [form, setForm] = useState({
    nom: modele?.nom || '',
    types_evenement: normalizeTypes(modele?.types_evenement || modele?.type_evenement),
    type_evenement: modele?.type_evenement || '',
    champs: modele?.champs || [],
    jours_avant_envoi_defaut: modele?.jours_avant_envoi_defaut ?? 30,
    fenetre_reponse_defaut: modele?.fenetre_reponse_defaut ?? 5,
  });

  const mutation = useMutation({
    mutationFn: () => {
      const payload = { ...form, type_evenement: form.types_evenement?.[0] || null };
      return modele
        ? base44.entities.ModeleFormulaire.update(modele.id, payload)
        : base44.entities.ModeleFormulaire.create(payload);
    },
    onSuccess: () => { qc.invalidateQueries(['modeles-formulaire']); onClose(); },
  });

  return (
    <div className="fixed inset-0 z-[60] flex items-center justify-center bg-black/50 p-4">
      <div className="bg-card rounded-2xl border border-border shadow-xl w-full max-w-xl max-h-[90vh] overflow-y-auto">
        <div className="flex items-center justify-between p-5 border-b border-border sticky top-0 bg-card z-10">
          <h3 className="font-semibold text-lg">{modele ? 'Modifier le modèle' : 'Nouveau modèle'}</h3>
          <button onClick={onClose} className="p-1.5 rounded-lg hover:bg-muted text-muted-foreground"><X size={16} /></button>
        </div>

        <div className="p-5 space-y-4">
          <div className="space-y-3">
            <div className="space-y-1">
              <label className="text-xs text-muted-foreground">Nom du modèle *</label>
              <Input value={form.nom} onChange={e => setForm(f => ({ ...f, nom: e.target.value }))} placeholder="Ex: Mariage standard" />
            </div>
            <div className="space-y-1">
              <label className="text-xs text-muted-foreground">Types d'événement</label>
              <TypeEvenementMultiSelect
                value={form.types_evenement}
                onChange={types => setForm(f => ({ ...f, types_evenement: types, jours_avant_envoi_defaut: DELAIS_DEFAUT[types[0]] || 30 }))}
              />
            </div>
          </div>

          <div className="grid grid-cols-2 gap-3">
            <div className="space-y-1">
              <label className="text-xs text-muted-foreground">Délai d'envoi par défaut (jours avant événement)</label>
              <Input
                type="number"
                value={form.jours_avant_envoi_defaut}
                onChange={e => setForm(f => ({ ...f, jours_avant_envoi_defaut: parseInt(e.target.value) || 30 }))}
                min={1}
              />
            </div>
            <div className="space-y-1">
              <label className="text-xs text-muted-foreground">Fenêtre de réponse (jours)</label>
              <select
                value={form.fenetre_reponse_defaut}
                onChange={e => setForm(f => ({ ...f, fenetre_reponse_defaut: parseInt(e.target.value) }))}
                className="flex h-9 w-full rounded-md border border-input bg-transparent px-3 py-1 text-sm shadow-sm focus-visible:outline-none focus-visible:ring-1 focus-visible:ring-ring"
              >
                <option value={4}>4 jours</option>
                <option value={5}>5 jours</option>
                <option value={6}>6 jours</option>
              </select>
            </div>
          </div>

          <div className="space-y-2">
            <label className="text-xs font-semibold uppercase tracking-wider text-muted-foreground">Champs du questionnaire</label>
            <FormulaireBuilder champs={form.champs} onChange={champs => setForm(f => ({ ...f, champs }))} />
          </div>
          <div className="modal-footer">
            <Button variant="outline" onClick={onClose}>Annuler</Button>
            <Button onClick={() => mutation.mutate()} disabled={!form.nom || mutation.isPending}>
              {mutation.isPending ? <><Loader2 size={14} className="animate-spin" /> Sauvegarde...</> : 'Sauvegarder'}
            </Button>
          </div>
        </div>
      </div>
    </div>
  );
}