import { useState } from 'react';
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import { base44 } from '@/api/base44Client';
import { X, ImageIcon } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';

const DOMAINES = ['Traiteur', 'DJ / Musique', 'Photographe', 'Vidéaste', 'Fleuriste', 'Décoration', 'Animation', 'Transport', 'Sécurité', 'Sono / Lumières', 'Autre'];
const TYPES_EVENEMENT = ['Mariage', 'Pacs', 'Anniversaire de mariage', 'Baptême', 'Anniversaire', "Soirée d'entreprise", 'Séminaire', 'Cocktail', 'Gala', 'Location', 'Autre'];

function Toggle({ value, onChange, label, description }) {
  return (
    <button
      type="button"
      onClick={() => onChange(!value)}
      className={`flex items-center justify-between w-full px-3 py-2.5 rounded-xl border transition-colors ${
        value ? 'border-primary/40 bg-primary/5' : 'border-border bg-muted/30'
      }`}
    >
      <div className="text-left">
        <p className="text-sm font-medium">{label}</p>
        {description && <p className="text-xs text-muted-foreground">{description}</p>}
      </div>
      <div className={`relative w-10 h-5 rounded-full transition-colors shrink-0 ${value ? 'bg-primary' : 'bg-muted-foreground/30'}`}>
        <div className={`absolute top-0.5 h-4 w-4 rounded-full bg-white shadow transition-transform ${value ? 'translate-x-5' : 'translate-x-0.5'}`} />
      </div>
    </button>
  );
}

function ImageFieldWithPreview({ label, value, onChange, placeholder, hint }) {
  return (
    <div className="space-y-1.5">
      <Label>{label}</Label>
      {hint && <p className="text-xs text-muted-foreground">{hint}</p>}
      <Input value={value} onChange={e => onChange(e.target.value)} placeholder={placeholder || 'https://...'} />
      {value && (
        <div className="relative rounded-xl overflow-hidden border border-border" style={{ height: 80 }}>
          <img
            src={value}
            alt={label}
            className="w-full h-full object-cover"
            onError={e => { e.target.style.display = 'none'; e.target.nextSibling.style.display = 'flex'; }}
          />
          <div className="w-full h-full items-center justify-center bg-muted text-muted-foreground text-xs hidden" style={{ display: 'none' }}>
            <ImageIcon size={16} className="mr-1" /> URL invalide
          </div>
        </div>
      )}
    </div>
  );
}

export default function PrestataireModal({ prestataire, onClose }) {
  const qc = useQueryClient();
  const { data: lieux = [] } = useQuery({ queryKey: ['lieux'], queryFn: () => base44.entities.Lieu.list() });

  const [form, setForm] = useState({
    nom: prestataire?.nom || '',
    contact: prestataire?.contact || '',
    telephone: prestataire?.telephone || '',
    email: prestataire?.email || '',
    domaine: prestataire?.domaine || '',
    ville: prestataire?.ville || '',
    tarif: prestataire?.tarif || '',
    lieu_id: prestataire?.lieu_id || '',
    lieu_nom: prestataire?.lieu_nom || '',
    notes: prestataire?.notes || '',
    actif: prestataire?.actif ?? true,
    types_evenement_defaut: prestataire?.types_evenement_defaut || [],
    logo_url: prestataire?.logo_url || '',
    cover_url: prestataire?.cover_url || '',
    description: prestataire?.description || '',
    site_web: prestataire?.site_web || '',
    formulaire_actif: prestataire?.formulaire_actif ?? false,
    messagerie_active: prestataire?.messagerie_active ?? false,
  });

  const set = (k, v) => setForm(f => ({ ...f, [k]: v }));

  const [lieuMode, setLieuMode] = useState(prestataire?.lieu_id ? 'liste' : (prestataire?.lieu_nom ? 'libre' : 'liste'));

  const handleLieuChange = (v) => {
    if (v === '__aucun__') {
      setLieuMode('liste');
      setForm(f => ({ ...f, lieu_id: '', lieu_nom: '' }));
    } else if (v === '__libre__') {
      setLieuMode('libre');
      setForm(f => ({ ...f, lieu_id: '', lieu_nom: '' }));
    } else {
      setLieuMode('liste');
      const lieu = lieux.find(l => l.id === v);
      setForm(f => ({ ...f, lieu_id: v, lieu_nom: lieu?.nom || '' }));
    }
  };

  const mutation = useMutation({
    mutationFn: async () => {
      const emailNormalized = form.email?.toLowerCase().trim() || null;
      const data = {
        ...form,
        tarif: parseFloat(form.tarif) || undefined,
        portal_email: emailNormalized,
      };
      const saved = prestataire
        ? await base44.entities.Prestataire.update(prestataire.id, data)
        : await base44.entities.Prestataire.create(data);

      if (!prestataire && form.email) {
        try {
          await base44.functions.invoke('inviteUser', { email: form.email.toLowerCase().trim(), role: 'prestataire' });
        } catch (e) {
          console.warn('Invitation prestataire non envoyée:', e.message);
        }
      }
      return saved;
    },
    onSuccess: () => { qc.invalidateQueries(['prestataires']); onClose(); },
  });

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/40 backdrop-blur-sm p-4">
      <div className="bg-card rounded-2xl border border-border shadow-xl w-full max-w-md max-h-[90vh] overflow-y-auto">
        <div className="flex items-center justify-between p-6 pb-4 border-b border-border sticky top-0 bg-card z-10">
          <h3 className="font-semibold text-lg">{prestataire ? 'Modifier le prestataire' : 'Nouveau prestataire'}</h3>
          <button onClick={onClose} className="p-1.5 rounded-lg hover:bg-muted text-muted-foreground"><X size={16} /></button>
        </div>

        <div className="p-6 pt-4 space-y-4">

          {/* ── Identité ── */}
          <div className="space-y-1.5">
            <Label>Nom *</Label>
            <Input value={form.nom} onChange={e => set('nom', e.target.value)} placeholder="Nom ou société" />
          </div>

          <div className="grid grid-cols-2 gap-3">
            <div className="space-y-1.5">
              <Label>Contact</Label>
              <Input value={form.contact} onChange={e => set('contact', e.target.value)} placeholder="Prénom Nom" />
            </div>
            <div className="space-y-1.5">
              <Label>Domaine</Label>
              <Select value={form.domaine} onValueChange={v => set('domaine', v)}>
                <SelectTrigger><SelectValue placeholder="Domaine" /></SelectTrigger>
                <SelectContent>
                  {DOMAINES.map(d => <SelectItem key={d} value={d}>{d}</SelectItem>)}
                </SelectContent>
              </Select>
            </div>
          </div>

          <div className="grid grid-cols-2 gap-3">
            <div className="space-y-1.5">
              <Label>Téléphone</Label>
              <Input value={form.telephone} onChange={e => set('telephone', e.target.value)} placeholder="06..." />
            </div>
            <div className="space-y-1.5">
              <Label>Email</Label>
              <Input type="email" value={form.email} onChange={e => set('email', e.target.value)} placeholder="email@..." />
            </div>
          </div>

          <div className="grid grid-cols-2 gap-3">
            <div className="space-y-1.5">
              <Label>Ville</Label>
              <Input value={form.ville} onChange={e => set('ville', e.target.value)} placeholder="Paris, Lyon..." />
            </div>
            <div className="space-y-1.5">
              <Label>Tarif indicatif (€)</Label>
              <Input type="number" value={form.tarif} onChange={e => set('tarif', e.target.value)} placeholder="0" />
            </div>
          </div>

          <div className="space-y-1.5">
            <Label>Site web</Label>
            <Input type="url" value={form.site_web} onChange={e => set('site_web', e.target.value)} placeholder="https://..." />
          </div>

          {/* ── Présentation ── */}
          <div className="space-y-1.5">
            <Label>Présentation</Label>
            <textarea
              value={form.description}
              onChange={e => set('description', e.target.value)}
              placeholder="Description visible dans l'espace client..."
              rows={3}
              className="flex w-full rounded-xl border border-input bg-background px-3 py-2 text-sm focus-visible:outline-none focus-visible:ring-1 focus-visible:ring-ring resize-none"
            />
          </div>

          {/* ── Médias ── */}
          <ImageFieldWithPreview
            label="Logo (URL)"
            hint="Affiché dans les cartes prestataire côté client"
            value={form.logo_url}
            onChange={v => set('logo_url', v)}
            placeholder="https://..."
          />
          <ImageFieldWithPreview
            label="Photo de couverture (URL)"
            hint="Bannière en haut de la carte prestataire"
            value={form.cover_url}
            onChange={v => set('cover_url', v)}
            placeholder="https://..."
          />

          {/* ── Lieu habituel ── */}
          <div className="space-y-1.5">
            <Label>Lieu habituel</Label>
            <Select value={lieuMode === 'libre' ? '__libre__' : (form.lieu_id || '__aucun__')} onValueChange={handleLieuChange}>
              <SelectTrigger><SelectValue placeholder="Sélectionner un lieu..." /></SelectTrigger>
              <SelectContent>
                <SelectItem value="__aucun__">— Aucun</SelectItem>
                {lieux.map(l => <SelectItem key={l.id} value={l.id}>{l.nom}{l.ville ? ` · ${l.ville}` : ''}</SelectItem>)}
                <SelectItem value="__libre__">✏️ Saisir manuellement</SelectItem>
              </SelectContent>
            </Select>
            {lieuMode === 'libre' && (
              <Input value={form.lieu_nom} onChange={e => setForm(f => ({ ...f, lieu_nom: e.target.value }))} placeholder="Nom du lieu..." />
            )}
          </div>

          {/* ── Notes ── */}
          <div className="space-y-1.5">
            <Label>Notes internes</Label>
            <Input value={form.notes} onChange={e => set('notes', e.target.value)} placeholder="Informations utiles..." />
          </div>

          {/* ── Modules ── */}
          <div className="space-y-2 pt-1">
            <p className="text-xs font-semibold text-muted-foreground uppercase tracking-wide">Modules activés côté client</p>
            <Toggle
              value={form.formulaire_actif}
              onChange={v => set('formulaire_actif', v)}
              label="📝 Questionnaire"
              description="Affiche le chip Questionnaire dans l'espace client"
            />
            <Toggle
              value={form.messagerie_active}
              onChange={v => set('messagerie_active', v)}
              label="💬 Messagerie"
              description="Affiche le chip Messages dans l'espace client"
            />
          </div>

          {/* ── Types événements par défaut ── */}
          <div className="space-y-2 pt-1">
            <Label>Associer par défaut à ces types d'événements</Label>
            <p className="text-xs text-muted-foreground">Ce prestataire sera pré-sélectionné lors de la configuration de tout nouveau événement de ce type.</p>
            <div className="grid grid-cols-2 gap-1.5">
              {TYPES_EVENEMENT.map(t => {
                const active = (form.types_evenement_defaut || []).includes(t);
                return (
                  <button
                    key={t}
                    type="button"
                    onClick={() => {
                      const current = form.types_evenement_defaut || [];
                      set('types_evenement_defaut', active ? current.filter(x => x !== t) : [...current, t]);
                    }}
                    className={`text-xs px-2.5 py-1.5 rounded-lg border text-left transition-colors ${active ? 'bg-primary/10 border-primary text-primary font-medium' : 'border-border text-muted-foreground hover:bg-muted/50'}`}
                  >
                    {active ? '✓ ' : ''}{t}
                  </button>
                );
              })}
            </div>
          </div>

          <div className="modal-footer">
            <Button variant="outline" onClick={onClose}>Annuler</Button>
            <Button onClick={() => mutation.mutate()} disabled={!form.nom || mutation.isPending}>
              {mutation.isPending ? 'Sauvegarde...' : 'Sauvegarder'}
            </Button>
          </div>
        </div>
      </div>
    </div>
  );
}