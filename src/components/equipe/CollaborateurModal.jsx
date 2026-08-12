import { useState } from 'react';
import { useMutation, useQueryClient } from '@tanstack/react-query';
import { base44 } from '@/api/base44Client';
import { X, User, Calendar, Package } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import CollaborateurPlanningTab from './CollaborateurPlanningTab';
import CollaborateurLogistiqueTab from './CollaborateurLogistiqueTab';

const POSTES = ['Responsable de salle', 'Serveur', 'Barman', 'Cuisinier', 'Plongeur', 'Chef de rang', 'Hôte/Hôtesse', 'Manager', 'Chauffeur / Livreur', 'Autre'];
const TYPES_EVENEMENT = ['Mariage', 'Pacs', 'Anniversaire de mariage', 'Baptême', 'Anniversaire', "Soirée d'entreprise", 'Séminaire', 'Cocktail', 'Gala', 'Location', 'Autre'];

function Toggle({ value, onChange, label, description }) {
  return (
    <div className="flex items-center justify-between">
      <div>
        <p className="text-sm font-medium">{label}</p>
        {description && <p className="text-xs text-muted-foreground mt-0.5">{description}</p>}
      </div>
      <button
        type="button"
        onClick={() => onChange(!value)}
        className={`relative inline-flex h-6 w-11 items-center rounded-full transition-colors ${value ? 'bg-primary' : 'bg-gray-200'}`}
      >
        <span className={`inline-block h-4 w-4 transform rounded-full bg-white shadow transition-transform ${value ? 'translate-x-6' : 'translate-x-1'}`} />
      </button>
    </div>
  );
}

export default function CollaborateurModal({ collaborateur, onClose }) {
  const qc = useQueryClient();
  const [tab, setTab] = useState('infos');
  const [form, setForm] = useState({
    nom: collaborateur?.nom || '',
    telephone: collaborateur?.telephone || '',
    email: collaborateur?.email || '',
    poste_fonction: collaborateur?.poste_fonction || '',
    type_contrat: collaborateur?.type_contrat || '',
    placement_auto: collaborateur?.placement_auto || false,
    types_evenements_auto: collaborateur?.types_evenements_auto || [],
    visible_planning_equipe: collaborateur?.visible_planning_equipe !== false,
    notes: collaborateur?.notes || '',
    actif: collaborateur?.actif !== false,
  });

  const set = (k, v) => setForm(f => ({ ...f, [k]: v }));

  const toggleTypeEv = (type) => {
    set('types_evenements_auto',
      form.types_evenements_auto.includes(type)
        ? form.types_evenements_auto.filter(t => t !== type)
        : [...form.types_evenements_auto, type]
    );
  };

  const saveMutation = useMutation({
    mutationFn: () => collaborateur?.id
      ? base44.entities.Collaborateur.update(collaborateur.id, form)
      : base44.entities.Collaborateur.create(form),
    onSuccess: () => { qc.invalidateQueries(['collaborateurs']); onClose(); },
  });

  const isChauffeur = (collaborateur?.competences || []).includes('Chauffeur / Livreur') ||
    collaborateur?.poste_fonction === 'Chauffeur / Livreur';

  const tabs = [
    { key: 'infos', label: 'Informations', icon: User },
    ...(collaborateur?.id ? [{ key: 'planning', label: 'Planning', icon: Calendar }] : []),
    ...(collaborateur?.id && isChauffeur ? [{ key: 'logistique', label: 'Logistique', icon: Package }] : []),
  ];

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/40 backdrop-blur-sm p-4">
      <div className="bg-card rounded-2xl border border-border shadow-xl w-full max-w-2xl max-h-[90vh] flex flex-col">
        {/* Header */}
        <div className="flex items-center justify-between px-6 py-4 border-b border-border shrink-0">
          <div className="flex items-center gap-3">
            <div className="w-9 h-9 rounded-xl bg-blue-100 text-blue-700 flex items-center justify-center font-bold text-sm">
              {form.nom ? form.nom.split(' ').map(n => n[0]).join('').slice(0, 2).toUpperCase() : '?'}
            </div>
            <div>
              <h3 className="font-semibold">{collaborateur ? form.nom || 'Collaborateur' : 'Nouveau collaborateur'}</h3>
              {form.poste_fonction && <p className="text-xs text-muted-foreground">{form.poste_fonction}</p>}
            </div>
          </div>
          <button onClick={onClose} className="p-1.5 rounded-lg hover:bg-muted text-muted-foreground"><X size={16} /></button>
        </div>

        {/* Onglets */}
        {tabs.length > 1 && (
          <div className="flex gap-1 px-6 pt-3 border-b border-border shrink-0">
            {tabs.map(({ key, label, icon: Icon }) => (
              <button
                key={key}
                onClick={() => setTab(key)}
                className={`flex items-center gap-1.5 px-3 py-2 text-sm font-medium border-b-2 transition-colors -mb-px
                  ${tab === key ? 'border-primary text-primary' : 'border-transparent text-muted-foreground hover:text-foreground'}`}
              >
                <Icon size={14} /> {label}
              </button>
            ))}
          </div>
        )}

        {/* Contenu scrollable */}
        <div className="flex-1 overflow-y-auto p-6">
          {tab === 'infos' && (
            <div className="space-y-4">
              <div className="grid grid-cols-2 gap-3">
                <div className="space-y-1.5 col-span-2">
                  <Label>Nom complet *</Label>
                  <Input value={form.nom} onChange={e => set('nom', e.target.value)} placeholder="Prénom Nom" />
                </div>
                <div className="space-y-1.5">
                  <Label>Téléphone</Label>
                  <Input value={form.telephone} onChange={e => set('telephone', e.target.value)} placeholder="06..." />
                </div>
                <div className="space-y-1.5">
                  <Label>Email</Label>
                  <Input type="email" value={form.email} onChange={e => set('email', e.target.value)} placeholder="email@..." />
                </div>
                <div className="space-y-1.5">
                  <Label>Poste / Fonction</Label>
                  <Select value={form.poste_fonction} onValueChange={v => set('poste_fonction', v)}>
                    <SelectTrigger><SelectValue placeholder="Sélectionner..." /></SelectTrigger>
                    <SelectContent>{POSTES.map(p => <SelectItem key={p} value={p}>{p}</SelectItem>)}</SelectContent>
                  </Select>
                </div>
                <div className="space-y-1.5">
                  <Label>Type de contrat</Label>
                  <Select value={form.type_contrat} onValueChange={v => set('type_contrat', v)}>
                    <SelectTrigger><SelectValue placeholder="Sélectionner..." /></SelectTrigger>
                    <SelectContent>
                      <SelectItem value="CDI">CDI</SelectItem>
                      <SelectItem value="CDD">CDD</SelectItem>
                      <SelectItem value="Auto-entrepreneur">Auto-entrepreneur</SelectItem>
                    </SelectContent>
                  </Select>
                </div>
              </div>

              {/* Visibilité & placement */}
              <div className="space-y-3 border border-border rounded-xl p-4">
                <p className="text-xs font-semibold uppercase tracking-wide text-muted-foreground">Visibilité & affectation</p>
                <Toggle
                  value={form.visible_planning_equipe}
                  onChange={v => set('visible_planning_equipe', v)}
                  label="Afficher sur le Planning Équipe"
                  description="Si désactivé, ce collaborateur reste actif mais est masqué du planning global"
                />
                <div className="border-t border-border pt-3">
                  <Toggle
                    value={form.placement_auto}
                    onChange={v => set('placement_auto', v)}
                    label="Placement automatique"
                    description="Affecté d'office sur certains types d'événements"
                  />
                  {form.placement_auto && (
                    <div className="space-y-1.5 mt-3">
                      <Label className="text-xs">Types d'événements concernés</Label>
                      <div className="flex flex-wrap gap-1.5">
                        {TYPES_EVENEMENT.map(t => (
                          <button
                            key={t}
                            type="button"
                            onClick={() => toggleTypeEv(t)}
                            className={`px-2.5 py-1 rounded-lg text-xs font-medium border transition-all
                              ${form.types_evenements_auto.includes(t)
                                ? 'bg-primary text-primary-foreground border-primary'
                                : 'bg-card border-border text-foreground hover:bg-muted'}`}
                          >
                            {t}
                          </button>
                        ))}
                      </div>
                    </div>
                  )}
                </div>
              </div>

              <div className="space-y-1.5">
                <Label>Notes</Label>
                <textarea
                  className="w-full rounded-md border border-input bg-transparent px-3 py-2 text-sm min-h-[60px] focus-visible:outline-none focus-visible:ring-1 focus-visible:ring-ring resize-none"
                  value={form.notes}
                  onChange={e => set('notes', e.target.value)}
                  placeholder="Notes diverses..."
                />
              </div>
            </div>
          )}

          {tab === 'planning' && collaborateur?.id && (
            <CollaborateurPlanningTab collaborateur={{ ...collaborateur, ...form }} />
          )}

          {tab === 'logistique' && collaborateur?.id && (
            <CollaborateurLogistiqueTab collaborateur={collaborateur} />
          )}
        </div>

        {/* Footer — save seulement sur onglet infos */}
        {tab === 'infos' && (
          <div className="flex justify-end gap-2 px-6 py-4 border-t border-border shrink-0">
            <Button variant="outline" onClick={onClose}>Annuler</Button>
            <Button onClick={() => saveMutation.mutate()} disabled={!form.nom || saveMutation.isPending}>
              {saveMutation.isPending ? 'Enregistrement...' : 'Enregistrer'}
            </Button>
          </div>
        )}
      </div>
    </div>
  );
}