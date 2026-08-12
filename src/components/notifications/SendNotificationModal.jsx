import { useState } from 'react';
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import { base44 } from '@/api/base44Client';
import { X, Send, Bell, Check } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';

const POSTES = ['Serveur', 'Barman', 'Cuisinier', 'Plongeur', 'Chef de rang', 'Hôte/Hôtesse', 'Autre'];
const DOMAINES = ['Traiteur', 'DJ / Musique', 'Photographe', 'Vidéaste', 'Fleuriste', 'Décoration', 'Animation', 'Transport', 'Sécurité', 'Sono / Lumières', 'Autre'];
const TYPES_EVENEMENT = ['Mariage', 'Pacs', 'Anniversaire de mariage', 'Baptême', 'Anniversaire', 'Soirée d\'entreprise', 'Séminaire', 'Cocktail', 'Gala', 'Location', 'Autre'];
const MOIS = ['Janvier', 'Février', 'Mars', 'Avril', 'Mai', 'Juin', 'Juillet', 'Août', 'Septembre', 'Octobre', 'Novembre', 'Décembre'];

function MultiSelect({ options, selected, onChange, placeholder }) {
  const toggle = (val) => {
    if (selected.includes(val)) {
      onChange(selected.filter(v => v !== val));
    } else {
      onChange([...selected, val]);
    }
  };

  return (
    <div className="flex flex-wrap gap-1.5">
      {options.map(opt => (
        <button
          key={opt}
          type="button"
          onClick={() => toggle(opt)}
          className={`flex items-center gap-1 px-2.5 py-1 rounded-lg text-xs font-medium border transition-all
            ${selected.includes(opt)
              ? 'bg-primary text-primary-foreground border-primary'
              : 'bg-card border-border text-foreground hover:bg-muted'}`}
        >
          {selected.includes(opt) && <Check size={10} />}
          {opt}
        </button>
      ))}
    </div>
  );
}

export default function SendNotificationModal({ onClose }) {
  const qc = useQueryClient();
  const [titre, setTitre] = useState('');
  const [message, setMessage] = useState('');
  const [cible, setCible] = useState('extras');
  const [filtrePostes, setFiltrePostes] = useState([]);
  const [filtreDomaines, setFiltreDomaines] = useState([]);
  const [filtreTypesEvenement, setFiltreTypesEvenement] = useState([]);
  const [filtreMois, setFiltreMois] = useState('');
  const [filtreAnnee, setFiltreAnnee] = useState('');
  const [sent, setSent] = useState(false);

  const { data: extras = [] } = useQuery({ queryKey: ['extras'], queryFn: () => base44.entities.Extra.list() });
  const { data: evenements = [] } = useQuery({ queryKey: ['evenements'], queryFn: () => base44.entities.Evenement.list('-date', 500) });
  const { data: prestataires = [] } = useQuery({ queryKey: ['prestataires'], queryFn: () => base44.entities.Prestataire.list() });
  const { data: lieux = [] } = useQuery({ queryKey: ['lieux'], queryFn: () => base44.entities.Lieu.list() });

  const getDestinataires = () => {
    if (cible === 'extras') {
      let list = extras.filter(e => e.actif !== false && e.email);
      if (filtrePostes.length > 0) list = list.filter(e => filtrePostes.includes(e.poste));
      return list.map(e => ({ nom: e.nom, email: e.email }));
    }
    if (cible === 'evenements') {
      let list = evenements.filter(e => e.client_email);
      if (filtreTypesEvenement.length > 0) list = list.filter(e => filtreTypesEvenement.includes(e.type_evenement));
      if (filtreMois) list = list.filter(e => e.date && parseInt(e.date.split('-')[1], 10) === parseInt(filtreMois, 10));
      if (filtreAnnee) list = list.filter(e => e.date?.startsWith(filtreAnnee));
      return list.map(e => ({ nom: e.client_nom || e.nom, email: e.client_email }));
    }
    if (cible === 'prestataires') {
      let list = prestataires.filter(p => p.actif !== false && p.email);
      if (filtreDomaines.length > 0) list = list.filter(p => filtreDomaines.includes(p.domaine));
      return list.map(p => ({ nom: p.nom, email: p.email }));
    }
    if (cible === 'lieux') {
      return lieux.filter(l => l.email).map(l => ({ nom: l.nom, email: l.email }));
    }
    if (cible === 'tous_extras') {
      return extras.filter(e => e.actif !== false && e.email).map(e => ({ nom: e.nom, email: e.email }));
    }
    return [];
  };

  const destinataires = getDestinataires();

  const sendMutation = useMutation({
    mutationFn: async () => {
      await Promise.all(destinataires.map(d =>
        base44.entities.Notification.create({ user_email: d.email, titre, message, type: 'info', lu: false })
      ));
      destinataires.forEach(d => {
        base44.integrations.Core.SendEmail({
          to: d.email,
          subject: titre,
          body: `Bonjour ${d.nom},\n\n${message}\n\nCe message vous a été envoyé via Planyse.`,
        }).catch(() => {});
      });
    },
    onSuccess: () => { qc.invalidateQueries(['notifications']); setSent(true); },
  });

  const canSend = titre.trim() && message.trim() && destinataires.length > 0;

  const CIBLES = [
    { key: 'extras', label: '👤 Extras' },
    { key: 'tous_extras', label: '👥 Tous les extras' },
    { key: 'prestataires', label: '🎵 Prestataires' },
    { key: 'lieux', label: '📍 Lieux' },
    { key: 'evenements', label: '🎉 Clients événements' },
  ];

  if (sent) {
    return (
      <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50 p-4">
        <div className="bg-card rounded-2xl shadow-xl w-full max-w-md p-8 flex flex-col items-center gap-4 text-center">
          <div className="w-14 h-14 rounded-full bg-emerald-100 flex items-center justify-center">
            <Send size={24} className="text-emerald-600" />
          </div>
          <h2 className="text-lg font-bold">Notifications envoyées !</h2>
          <p className="text-sm text-muted-foreground">{destinataires.length} destinataire{destinataires.length > 1 ? 's' : ''} notifié{destinataires.length > 1 ? 's' : ''}.</p>
          <Button onClick={onClose} className="w-full mt-2">Fermer</Button>
        </div>
      </div>
    );
  }

  return (
    <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50 p-4">
      <div className="bg-card rounded-2xl shadow-xl w-full max-w-lg max-h-[90vh] flex flex-col">
        <div className="flex items-center justify-between p-5 border-b border-border">
          <div className="flex items-center gap-2">
            <Bell size={18} className="text-primary" />
            <h2 className="font-semibold text-base">Envoyer une notification</h2>
          </div>
          <button onClick={onClose} className="text-muted-foreground hover:text-foreground p-1 rounded-lg hover:bg-muted">
            <X size={18} />
          </button>
        </div>

        <div className="flex-1 overflow-y-auto p-5 space-y-5">
          <div className="space-y-1.5">
            <Label className="text-xs">Titre *</Label>
            <Input value={titre} onChange={e => setTitre(e.target.value)} placeholder="Ex: Nouvelle tenue obligatoire" />
          </div>
          <div className="space-y-1.5">
            <Label className="text-xs">Message *</Label>
            <textarea
              value={message}
              onChange={e => setMessage(e.target.value)}
              placeholder="Écrivez votre message ici..."
              rows={3}
              className="flex w-full rounded-md border border-input bg-transparent px-3 py-2 text-sm shadow-sm placeholder:text-muted-foreground focus-visible:outline-none focus-visible:ring-1 focus-visible:ring-ring resize-none"
            />
          </div>

          {/* Cible */}
          <div className="space-y-2">
            <Label className="text-xs">Destinataires *</Label>
            <div className="flex flex-wrap gap-2">
              {CIBLES.map(opt => (
                <button
                  key={opt.key}
                  onClick={() => { setCible(opt.key); setFiltrePostes([]); setFiltreDomaines([]); setFiltreTypesEvenement([]); setFiltreMois(''); setFiltreAnnee(''); }}
                  className={`px-3 py-2 rounded-xl text-xs font-medium border transition-all
                    ${cible === opt.key ? 'bg-primary text-primary-foreground border-primary' : 'bg-card border-border text-foreground hover:bg-muted'}`}
                >
                  {opt.label}
                </button>
              ))}
            </div>
          </div>

          {/* Filtre extras */}
          {cible === 'extras' && (
            <div className="space-y-1.5 rounded-xl bg-muted/40 p-3">
              <Label className="text-xs">Filtrer par poste (sélection multiple)</Label>
              <MultiSelect options={POSTES} selected={filtrePostes} onChange={setFiltrePostes} />
              {filtrePostes.length === 0 && <p className="text-xs text-muted-foreground italic">Tous les postes inclus</p>}
            </div>
          )}

          {/* Filtre prestataires */}
          {cible === 'prestataires' && (
            <div className="space-y-1.5 rounded-xl bg-muted/40 p-3">
              <Label className="text-xs">Filtrer par domaine (sélection multiple)</Label>
              <MultiSelect options={DOMAINES} selected={filtreDomaines} onChange={setFiltreDomaines} />
              {filtreDomaines.length === 0 && <p className="text-xs text-muted-foreground italic">Tous les domaines inclus</p>}
            </div>
          )}

          {/* Filtres événements */}
          {cible === 'evenements' && (
            <div className="space-y-3 rounded-xl bg-muted/40 p-3">
              <div className="space-y-1.5">
                <Label className="text-xs">Filtrer par type d'événement (sélection multiple)</Label>
                <MultiSelect options={TYPES_EVENEMENT} selected={filtreTypesEvenement} onChange={setFiltreTypesEvenement} />
                {filtreTypesEvenement.length === 0 && <p className="text-xs text-muted-foreground italic">Tous les types inclus</p>}
              </div>
              <div className="grid grid-cols-2 gap-3">
                <div className="space-y-1.5">
                  <Label className="text-xs">Mois</Label>
                  <select
                    value={filtreMois}
                    onChange={e => setFiltreMois(e.target.value)}
                    className="flex h-9 w-full rounded-md border border-input bg-transparent px-3 py-1 text-sm shadow-sm focus-visible:outline-none focus-visible:ring-1 focus-visible:ring-ring"
                  >
                    <option value="">Tous les mois</option>
                    {MOIS.map((m, i) => <option key={i} value={String(i + 1).padStart(2, '0')}>{m}</option>)}
                  </select>
                </div>
                <div className="space-y-1.5">
                  <Label className="text-xs">Année</Label>
                  <Input value={filtreAnnee} onChange={e => setFiltreAnnee(e.target.value)} placeholder="Ex: 2026" maxLength={4} />
                </div>
              </div>
            </div>
          )}

          {/* Preview destinataires */}
          <div className="rounded-xl border border-border bg-muted/20 p-3 space-y-2">
            <p className="text-xs font-semibold text-muted-foreground uppercase tracking-wide">
              Destinataires ({destinataires.length})
            </p>
            {destinataires.length === 0 ? (
              <p className="text-xs text-muted-foreground italic">Aucun destinataire avec les filtres actuels</p>
            ) : (
              <div className="flex flex-wrap gap-1.5 max-h-28 overflow-y-auto">
                {destinataires.map((d, i) => (
                  <span key={i} className="text-xs bg-primary/10 text-primary px-2 py-0.5 rounded-full">{d.nom}</span>
                ))}
              </div>
            )}
          </div>
        </div>

        <div className="flex gap-2 p-5 border-t border-border">
          <Button variant="outline" className="flex-1" onClick={onClose}>Annuler</Button>
          <Button
            className="flex-1 gap-2"
            disabled={!canSend || sendMutation.isPending}
            onClick={() => sendMutation.mutate()}
          >
            <Send size={14} />
            {sendMutation.isPending ? 'Envoi...' : `Envoyer à ${destinataires.length} personne${destinataires.length > 1 ? 's' : ''}`}
          </Button>
        </div>
      </div>
    </div>
  );
}