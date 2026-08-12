import { useState, useEffect } from 'react';
import { useMutation, useQueryClient } from '@tanstack/react-query';
import { base44 } from '@/api/base44Client';
import { X } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { addDays, format } from 'date-fns';

const CATEGORIES = ['Sécurité incendie', 'Electricité', 'Hygiène', 'Structure', 'Administratif', 'Autre'];

const FREQUENCES = [
  { label: 'Mensuel', jours: 30 },
  { label: 'Annuel', jours: 365 },
  { label: 'Biannuel', jours: 730 },
  { label: '3 ans', jours: 1095 },
  { label: '5 ans', jours: 1825 },
];

export default function ControleModal({ controle, onClose, onSaved }) {
  const qc = useQueryClient();
  const [form, setForm] = useState({
    nom: controle.nom || '',
    categorie: controle.categorie || 'Autre',
    frequence_jours: controle.frequence_jours || 365,
    derniere_date_controle: controle.derniere_date_controle || '',
    organisme_intervenant: controle.organisme_intervenant || '',
    contact_organisme: controle.contact_organisme || '',
    notes: controle.notes || '',
  });

  useEffect(() => {
    // Calculer prochaine_date_prevue si derniere_date_controle est définie
    if (form.derniere_date_controle) {
      const lastDate = new Date(form.derniere_date_controle);
      const nextDate = addDays(lastDate, form.frequence_jours);
      setForm(prev => ({
        ...prev,
        prochaine_date_prevue: format(nextDate, 'yyyy-MM-dd')
      }));
    }
  }, [form.derniere_date_controle, form.frequence_jours]);

  const saveMutation = useMutation({
    mutationFn: async () => {
      const data = {
        ...form,
        actif: true
      };

      if (controle.id) {
        await base44.entities.ControleSecurite.update(controle.id, data);
      } else {
        await base44.entities.ControleSecurite.create(data);
      }
    },
    onSuccess: () => {
      qc.invalidateQueries(['controles-securite']);
      onSaved();
    }
  });

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/40 backdrop-blur-sm p-4">
      <div className="bg-card rounded-2xl border border-border shadow-xl w-full max-w-md p-6 space-y-4">
        <div className="flex items-center justify-between">
          <h3 className="font-semibold text-lg">
            {controle.id ? 'Éditer le contrôle' : 'Nouveau contrôle'}
          </h3>
          <button onClick={onClose} className="p-1 rounded hover:bg-muted"><X size={16} /></button>
        </div>

        <div className="space-y-3 max-h-96 overflow-y-auto">
          {/* Nom */}
          <div className="space-y-1.5">
            <label className="text-sm font-medium">Nom du contrôle *</label>
            <Input
              value={form.nom}
              onChange={e => setForm({ ...form, nom: e.target.value })}
              placeholder="Ex: Vérification extincteurs"
            />
          </div>

          {/* Catégorie */}
          <div className="space-y-1.5">
            <label className="text-sm font-medium">Catégorie *</label>
            <select
              value={form.categorie}
              onChange={e => setForm({ ...form, categorie: e.target.value })}
              className="w-full rounded border border-input bg-background px-3 py-2 text-sm focus-visible:outline-none focus-visible:ring-1 focus-visible:ring-ring"
            >
              {CATEGORIES.map(c => (
                <option key={c} value={c}>{c}</option>
              ))}
            </select>
          </div>

          {/* Fréquence */}
          <div className="space-y-1.5">
            <label className="text-sm font-medium">Fréquence *</label>
            <select
              value={form.frequence_jours}
              onChange={e => setForm({ ...form, frequence_jours: parseInt(e.target.value) })}
              className="w-full rounded border border-input bg-background px-3 py-2 text-sm focus-visible:outline-none focus-visible:ring-1 focus-visible:ring-ring"
            >
              {FREQUENCES.map(f => (
                <option key={f.jours} value={f.jours}>{f.label}</option>
              ))}
            </select>
          </div>

          {/* Dernière date de contrôle */}
          <div className="space-y-1.5">
            <label className="text-sm font-medium">Dernière date de contrôle</label>
            <input
              type="date"
              value={form.derniere_date_controle}
              onChange={e => setForm({ ...form, derniere_date_controle: e.target.value })}
              className="w-full rounded border border-input bg-background px-3 py-2 text-sm focus-visible:outline-none focus-visible:ring-1 focus-visible:ring-ring"
            />
          </div>

          {/* Organisme intervenant */}
          <div className="space-y-1.5">
            <label className="text-sm font-medium">Organisme intervenant</label>
            <Input
              value={form.organisme_intervenant}
              onChange={e => setForm({ ...form, organisme_intervenant: e.target.value })}
              placeholder="Ex: SécuriTest SARL"
            />
          </div>

          {/* Contact organisme */}
          <div className="space-y-1.5">
            <label className="text-sm font-medium">Contact organisme</label>
            <Input
              value={form.contact_organisme}
              onChange={e => setForm({ ...form, contact_organisme: e.target.value })}
              placeholder="Email ou téléphone"
            />
          </div>

          {/* Notes */}
          <div className="space-y-1.5">
            <label className="text-sm font-medium">Notes</label>
            <textarea
              value={form.notes}
              onChange={e => setForm({ ...form, notes: e.target.value })}
              placeholder="Remarques additionnelles..."
              className="w-full rounded border border-input bg-transparent px-3 py-2 text-sm min-h-20 resize-none focus-visible:outline-none focus-visible:ring-1 focus-visible:ring-ring"
            />
          </div>

          {/* Prochaine date (info) */}
          {form.prochaine_date_prevue && (
            <div className="bg-muted/30 rounded-lg p-3 text-sm">
              <p className="font-medium text-muted-foreground">Prochaine date prévue</p>
              <p className="font-semibold text-foreground">{form.prochaine_date_prevue}</p>
            </div>
          )}
        </div>

        {/* Boutons */}
        <div className="flex gap-2 pt-4 border-t border-border">
          <Button variant="outline" onClick={onClose} className="flex-1">
            Annuler
          </Button>
          <Button
            onClick={() => saveMutation.mutate()}
            disabled={saveMutation.isPending || !form.nom || !form.categorie}
            className="flex-1"
          >
            {saveMutation.isPending ? 'Enregistrement...' : 'Enregistrer'}
          </Button>
        </div>
      </div>
    </div>
  );
}