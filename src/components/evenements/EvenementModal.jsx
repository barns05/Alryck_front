import { useState } from 'react';
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import { base44 } from '@/api/base44Client';
import { toast } from 'sonner';
import { X, Briefcase, Upload, Trash2 } from 'lucide-react';
import AssocierPrestataireModal from '@/components/prestataires/AssocierPrestataireModal';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { useModules } from '@/hooks/useModules';
import LieuxInlineModal from '@/components/evenements/LieuxInlineModal';
import { normalizeEvenementDate } from '@/lib/evenementDate';
import { gererChangementDate } from '@/lib/propositionDate';
import PropositionDateRecap from '@/components/evenements/PropositionDateRecap';
import DemandeAnnulationRecap from '@/components/evenements/DemandeAnnulationRecap';

const TYPES = ['Mariage', 'Baptême', 'Anniversaire', "Soirée d'entreprise", 'Cocktail', 'Gala', 'Autre'];
const STATUTS = [
  { value: 'En attente', label: '⚪ En attente', manual: true },
  { value: 'Confirmé', label: '🟡 Confirmé', manual: true },
  { value: 'En préparation', label: '🔵 En préparation', manual: true },
  { value: 'Prêt', label: '🟢 Prêt', manual: true },
  { value: 'En cours', label: '🟠 En cours', manual: false },
  { value: 'Terminé', label: '🟣 Terminé', manual: false },
  { value: 'Annulé', label: '🔴 Annulé', manual: true },
];
const STATUTS_MANUELS = STATUTS.filter(s => s.manual).map(s => s.value);

const DEFAULT_TACHES = {
  'Mariage':            { formulaire: true, programme: true, plan_table: true, fiche_service: true, equipe_extras: true },
  'Anniversaire':       { formulaire: true, programme: true, plan_table: false, fiche_service: true, equipe_extras: true },
  "Soirée d'entreprise": { formulaire: true, programme: true, plan_table: false, fiche_service: true, equipe_extras: true },
  'Cocktail':           { formulaire: true, programme: false, plan_table: false, fiche_service: true, equipe_extras: true },
  'Gala':               { formulaire: true, programme: true, plan_table: true, fiche_service: true, equipe_extras: true },
  'default':            { formulaire: true, programme: true, plan_table: true, fiche_service: true, equipe_extras: true, logistique: false },
};

const statutColors = {
  'À contacter': 'bg-amber-100 text-amber-700',
  'Contacté':    'bg-blue-100 text-blue-700',
  'Confirmé':    'bg-emerald-100 text-emerald-700',
  'Annulé':      'bg-red-100 text-red-600',
};

function PrestatairesInline({ evenementId, onOpen }) {
  const { data: prestataires = [], isLoading } = useQuery({
    queryKey: ['evenement-prestataires', evenementId],
    queryFn: () => base44.entities.EvenementPrestataire.filter({ evenement_id: evenementId }),
  });
  if (isLoading) {
    return (
      <div className="space-y-1.5 animate-pulse">
        <div className="h-7 bg-muted/50 rounded-lg" />
        <div className="h-7 bg-muted/50 rounded-lg" />
      </div>
    );
  }
  if (prestataires.length === 0) {
    return <p className="text-xs text-muted-foreground">Aucun prestataire associé. <button onClick={onOpen} className="text-primary hover:underline">+ Ajouter</button></p>;
  }
  return (
    <div className="space-y-1.5">
      {prestataires.map(p => (
        <div key={p.id} className="flex items-center justify-between bg-muted/40 rounded-lg px-3 py-1.5">
          <div>
            <span className="text-sm font-medium">{p.prestataire_nom}</span>
            {p.prestataire_domaine && <span className="text-xs text-muted-foreground ml-2">{p.prestataire_domaine}</span>}
          </div>
          <span className={`text-xs px-2 py-0.5 rounded-full font-medium ${statutColors[p.statut] || 'bg-muted text-muted-foreground'}`}>{p.statut}</span>
        </div>
      ))}
    </div>
  );
}

export default function EvenementModal({ evenement, onClose }) {
  const qc = useQueryClient();
  const modules = useModules();
  const [prestataireModalOpen, setPrestataireModalOpen] = useState(false);

  const [clientSearch, setClientSearch] = useState('');
  const { data: clients = [] } = useQuery({ queryKey: ['clients'], queryFn: () => base44.entities.Client.list() });
  const filteredClients = clients.filter(c => {
    const q = clientSearch.toLowerCase();
    return !q || `${c.prenom} ${c.nom} ${c.email || ''}`.toLowerCase().includes(q);
  });
  const { data: lieux = [] } = useQuery({ queryKey: ['lieux'], queryFn: () => base44.entities.Lieu.list() });
  const { data: prestatairesEv = [], isLoading: loadingPrestatairesEv } = useQuery({
    queryKey: ['evenement-prestataires', evenement?.id],
    queryFn: () => evenement?.id ? base44.entities.EvenementPrestataire.filter({ evenement_id: evenement.id }) : [],
    enabled: !!evenement?.id,
  });
  // Verrouillage en mode « Date exacte » dès qu'un prestataire est confirmé :
  // le workflow PropositionDateEvenement n'a de sens qu'avec une date précise à proposer.
  // Pendant le chargement on conserve l'état précédent (dateLockedExacte reste faux)
  // pour éviter un saut visuel brutal du sélecteur de mode date à l'ouverture.
  const dateLockedExacte = !loadingPrestatairesEv && (prestatairesEv || []).some(p => p.statut === 'Confirmé');

  const [form, setForm] = useState({
    nom: evenement?.nom || '',
    type_evenement: evenement?.type_evenement || '',
    statut: evenement?.statut || 'En préparation',
    date: evenement?.date || '',
    date_type: evenement?.date_type || 'exacte',
    date_mois: evenement?.date_mois || '',
    date_periode: evenement?.date_periode || '',
    heure_debut: evenement?.heure_debut || '10:00',
    heure_fin: evenement?.heure_fin || '23:00',
    lieu_id: evenement?.lieu_id || '',
    lieu_nom: evenement?.lieu_nom || '',
    client_id: evenement?.client_id || '',
    client_nom: evenement?.client_nom || '',
    client_email: evenement?.client_email || '',
    client_telephone: evenement?.client_telephone || '',
    nb_invites: evenement?.nb_invites || '',
    notes_internes: evenement?.notes_internes || '',
    budget: evenement?.budget || '',
    couleur_theme: evenement?.couleur_theme || '',
    plan_table_actif: evenement?.plan_table_actif !== false,
    plan_table_url: evenement?.plan_table_url || '',
    plan_table_nom: evenement?.plan_table_nom || '',
    taches_requises: {
      formulaire: evenement?.taches_requises?.formulaire ?? true,
      programme: evenement?.taches_requises?.programme ?? true,
      plan_table: evenement?.taches_requises?.plan_table ?? true,
      fiche_service: evenement?.taches_requises?.fiche_service ?? true,
      equipe_extras: evenement?.taches_requises?.equipe_extras ?? true,
      logistique: evenement?.taches_requises?.logistique ?? (modules.logistique ? true : false),
    },
  });
  const [uploadingPlan, setUploadingPlan] = useState(false);

  const set = (k, v) => setForm(f => ({ ...f, [k]: v }));

  const dateValid = form.date_type === 'exacte' ? !!form.date
    : form.date_type === 'mois' ? !!form.date_mois
    : form.date_type === 'periode' ? !!form.date_periode.trim()
    : !!form.date;

  const handleClientChange = (clientId) => {
    const client = clients.find(c => c.id === clientId);
    set('client_id', clientId);
    if (client) {
      setForm(f => ({
        ...f,
        client_id: clientId,
        client_nom: `${client.prenom || ''} ${client.nom}`.trim(),
        client_email: client.email || '',
        client_telephone: client.telephone || '',
        // Appliquer la couleur du client si l'événement n'en a pas encore
        ...(!f.couleur_theme && client.couleur_theme ? { couleur_theme: client.couleur_theme } : {}),
      }));
    }
  };

  const handleLieuChange = (lieuId) => {
    const lieu = lieux.find(l => l.id === lieuId);
    setForm(f => ({ ...f, lieu_id: lieuId, lieu_nom: lieu?.nom || '' }));
  };

  const saveMutation = useMutation({
    mutationFn: async () => {
      const normalized = normalizeEvenementDate({
        date_type: form.date_type || 'exacte',
        date: form.date,
        date_mois: form.date_mois || null,
        date_periode: form.date_periode || null,
      });
      // Fallback technique pour un nouvel événement en mode periode sans mois
      // (pas de date existante à conserver).
      let dateTech = normalized.date;
      if (!dateTech) {
        dateTech = new Date().toISOString().split('T')[0];
      }

      // ── Workflow changement de date (prestataires confirmés) ──
      // Si l'admin modifie la date d'un événement ayant des prestataires confirmés,
      // on ne l'applique pas directement : on crée une PropositionDateEvenement et
      // on conserve la date actuelle jusqu'à finalisation.
      let appliedDate = dateTech;
      let appliedType = normalized.date_type;
      let appliedMois = normalized.date_mois;
      let appliedPeriode = normalized.date_periode;
      let propositionCreated = false;
      // Verrouillage défensif : si des prestataires sont confirmés, on force le mode exacte.
      if (dateLockedExacte) {
        appliedType = 'exacte';
        appliedMois = null;
        appliedPeriode = null;
      }
      if (evenement && evenement.id) {
        try {
          const res = await gererChangementDate({
            evenementId: evenement.id,
            originalDate: evenement.date,
            proposed: { date: dateTech, date_type: normalized.date_type, date_mois: normalized.date_mois, date_periode: normalized.date_periode },
            initiee_par: 'admin',
          });
          if (res.propositionCreated) {
            propositionCreated = true;
            appliedDate = evenement.date;
            appliedType = evenement.date_type || 'exacte';
            appliedMois = evenement.date_mois || null;
            appliedPeriode = evenement.date_periode || null;
          }
        } catch { /* erreur déjà toastée ; on continue sans bloquer la sauvegarde des autres champs */ }
      }

      const data = { ...form, date: appliedDate, date_type: appliedType, date_mois: appliedMois, date_periode: appliedPeriode, nb_invites: parseInt(form.nb_invites) || 0, budget: parseFloat(form.budget) || undefined, plan_table_actif: form.plan_table_actif };
      console.log('[EvenementModal] Saving event with data:', data);
      if (evenement && evenement.id) {
        console.log('[EvenementModal] Updating event ID:', evenement.id);
        await base44.entities.Evenement.update(evenement.id, data);
        return { propositionCreated };
      } else {
        console.log('[EvenementModal] Creating new event');
        await base44.entities.Evenement.create(data);
        return { propositionCreated };
      }
    },
    onSuccess: async ({ propositionCreated }) => {
      await qc.invalidateQueries({ queryKey: ['evenements'] });
      await qc.refetchQueries({ queryKey: ['evenements'] });
      // Si une proposition de date a été créée, gererChangementDate a déjà affiché un
      // toast info clair et complet — on n'affiche PAS le toast de succès générique
      // pour qu'un seul message reste visible et lisible.
      if (!propositionCreated) {
        toast.success('✅ Événement mis à jour', {
          style: { background: '#10b981', color: 'white', borderRadius: '0.5rem' },
          position: 'top-center',
          duration: 3000,
        });
      }
      onClose();
    },
    onError: (error) => {
      console.error('[EvenementModal] Save failed:', error);
      toast.error('❌ Erreur lors de la sauvegarde', {
        style: { background: '#ef4444', color: 'white', borderRadius: '0.5rem' },
        position: 'top-center',
        duration: 3000,
      });
    },
  });

  return (
    <>
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/40 backdrop-blur-sm p-4">
      <div className="bg-card rounded-2xl border border-border shadow-xl w-full max-w-2xl max-h-[90vh] overflow-y-auto">
        <div className="flex items-center justify-between p-6 pb-4 border-b border-border sticky top-0 bg-card z-10">
          <h3 className="font-semibold text-lg">{evenement ? 'Modifier l\'événement' : 'Nouvel événement'}</h3>
          <button onClick={onClose} className="p-1.5 rounded-lg hover:bg-muted text-muted-foreground"><X size={16} /></button>
        </div>

        <div className="p-6 pt-4 space-y-4">
          {/* Nom + Type */}
          <div className="grid grid-cols-2 gap-3">
            <div className="space-y-1.5 min-w-0">
              <Label>Nom de l'événement *</Label>
              <Input value={form.nom} onChange={e => set('nom', e.target.value)} placeholder="Ex: Mariage Dupont" />
            </div>
            <div className="space-y-1.5 min-w-0">
              <Label>Type</Label>
              <Select value={form.type_evenement} onValueChange={v => {
                const defaults = DEFAULT_TACHES[v] || DEFAULT_TACHES['default'];
                // N'écraser que si c'est un nouvel événement (pas de taches_requises existantes)
                setForm(f => ({
                  ...f,
                  type_evenement: v,
                  taches_requises: evenement?.taches_requises ? f.taches_requises : { ...defaults, logistique: modules.logistique ? true : false },
                }));
              }}>
                <SelectTrigger><SelectValue placeholder="Type d'événement" /></SelectTrigger>
                <SelectContent>{TYPES.map(t => <SelectItem key={t} value={t}>{t}</SelectItem>)}</SelectContent>
              </Select>
            </div>
          </div>

          {/* Date + Heures */}
          <div className="space-y-3">
            <div className="space-y-1.5">
              <Label>Date *</Label>
              {dateLockedExacte ? (
                <>
                  <Input type="date" value={form.date} onChange={e => set('date', e.target.value)} />
                  <p className="text-[11px] text-muted-foreground">
                    📅 Date exacte requise — des prestataires sont déjà confirmés. Si vous changez la date, ils devront donner leur accord avant que la nouvelle date ne soit appliquée.
                  </p>
                </>
              ) : (
                <>
                  <div className="flex flex-wrap gap-1.5">
                    {[
                      { id: 'exacte', label: '📅 Date exacte' },
                      { id: 'mois', label: '🗓️ Mois' },
                      { id: 'periode', label: '🌸 Période' },
                    ].map(opt => (
                      <button
                        key={opt.id}
                        type="button"
                        onClick={() => set('date_type', opt.id)}
                        className={`text-xs px-3 py-1.5 rounded-lg border font-medium transition-colors ${form.date_type === opt.id ? 'bg-primary text-primary-foreground border-primary' : 'bg-card border-border text-muted-foreground hover:bg-muted'}`}
                      >
                        {opt.label}
                      </button>
                    ))}
                  </div>
                  {form.date_type === 'exacte' && (
                    <Input type="date" value={form.date} onChange={e => set('date', e.target.value)} />
                  )}
                  {form.date_type === 'mois' && (
                    <div className="flex gap-2">
                      <select
                        value={form.date_mois ? form.date_mois.split('-')[1] : ''}
                        onChange={e => {
                          const year = form.date_mois ? form.date_mois.split('-')[0] : new Date().getFullYear();
                          set('date_mois', e.target.value ? `${year}-${e.target.value}` : '');
                        }}
                        className="flex h-9 flex-1 rounded-md border border-input bg-transparent px-3 py-1 text-sm shadow-sm focus-visible:outline-none focus-visible:ring-1 focus-visible:ring-ring"
                      >
                        <option value="">— Mois —</option>
                        {['01','02','03','04','05','06','07','08','09','10','11','12'].map((m, i) => (
                          <option key={m} value={m}>{['Janvier','Février','Mars','Avril','Mai','Juin','Juillet','Août','Septembre','Octobre','Novembre','Décembre'][i]}</option>
                        ))}
                      </select>
                      <select
                        value={form.date_mois ? form.date_mois.split('-')[0] : ''}
                        onChange={e => {
                          const month = form.date_mois ? form.date_mois.split('-')[1] : '01';
                          set('date_mois', e.target.value ? `${e.target.value}-${month}` : '');
                        }}
                        className="flex h-9 w-24 rounded-md border border-input bg-transparent px-3 py-1 text-sm shadow-sm focus-visible:outline-none focus-visible:ring-1 focus-visible:ring-ring"
                      >
                        <option value="">— Année —</option>
                        {Array.from({ length: 8 }, (_, i) => new Date().getFullYear() + i).map(y => (
                          <option key={y} value={y}>{y}</option>
                        ))}
                      </select>
                    </div>
                  )}
                  {form.date_type === 'periode' && (
                    <Input value={form.date_periode} onChange={e => set('date_periode', e.target.value)} placeholder="Ex : Printemps 2028, Été 2027…" />
                  )}
                </>
              )}
            </div>
            <div className="grid grid-cols-2 gap-3">
              <div className="space-y-1.5 min-w-0">
                <Label>Heure début</Label>
                <Input type="time" value={form.heure_debut} onChange={e => set('heure_debut', e.target.value)} />
              </div>
              <div className="space-y-1.5 min-w-0">
                <Label>Heure fin</Label>
                <Input type="time" value={form.heure_fin} onChange={e => set('heure_fin', e.target.value)} />
              </div>
            </div>
          </div>

          {/* Statut */}
          <div className="grid grid-cols-2 gap-3">
            <div className="space-y-1.5 min-w-0">
              <Label>Statut</Label>
              <Select value={form.statut} onValueChange={v => {
                if (v === 'Annulé') {
                  if (confirm('Êtes-vous sûr de vouloir annuler cet événement ?')) {
                    set('statut', v);
                  }
                } else {
                  set('statut', v);
                }
              }}>
                <SelectTrigger><SelectValue /></SelectTrigger>
                <SelectContent>
                  {STATUTS.map(s => (
                    <SelectItem key={s.value} value={s.value}>
                      {s.label}{!s.manual ? ' (auto)' : ''}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
              <p className="text-xs text-muted-foreground mt-1">
                {STATUTS.find(s => s.value === form.statut)?.manual 
                  ? 'Manuel' 
                  : 'Automatique (mis à jour le jour J)'}
              </p>
            </div>
            <div className="space-y-1.5 min-w-0">
              <Label>Nombre d'invités</Label>
              <Input type="number" value={form.nb_invites} onChange={e => set('nb_invites', e.target.value)} placeholder="0" />
            </div>
          </div>

          {/* Client */}
          <div className="space-y-1.5">
            <Label>Client</Label>
            <Input
              placeholder="🔍 Rechercher un client..."
              value={clientSearch}
              onChange={e => setClientSearch(e.target.value)}
              className="mb-1"
            />
            <select
              value={form.client_id}
              onChange={e => handleClientChange(e.target.value)}
              className="flex h-9 w-full rounded-md border border-input bg-transparent px-3 py-1 text-sm shadow-sm focus-visible:outline-none focus-visible:ring-1 focus-visible:ring-ring"
            >
              <option value="">— Sélectionner un client</option>
              {filteredClients.map(c => (
                <option key={c.id} value={c.id}>{c.prenom} {c.nom}{c.email ? ` · ${c.email}` : ''}</option>
              ))}
            </select>
            {form.client_id && (
              <p className="text-xs text-muted-foreground mt-1">
                {form.client_email && `📧 ${form.client_email}`}{form.client_telephone && ` · 📞 ${form.client_telephone}`}
              </p>
            )}
          </div>



          {/* Plan de table */}
          <div className="space-y-2 border border-border rounded-xl p-4">
            <div className="flex items-center justify-between">
              <div>
                <Label>🗺️ Plan de table</Label>
                <p className="text-xs text-muted-foreground mt-0.5">Désactiver pour cocktail debout, livraison, domicile…</p>
              </div>
              <button
                type="button"
                onClick={() => set('plan_table_actif', !form.plan_table_actif)}
                className={`relative inline-flex h-6 w-11 items-center rounded-full transition-colors ${form.plan_table_actif ? 'bg-primary' : 'bg-gray-200'}`}
              >
                <span className={`inline-block h-4 w-4 transform rounded-full bg-white shadow transition-transform ${form.plan_table_actif ? 'translate-x-6' : 'translate-x-1'}`} />
              </button>
            </div>

            {form.plan_table_actif && (
              <div className="mt-3">
                {form.plan_table_url ? (
                  <div className="flex items-center gap-2 bg-muted/50 rounded-lg px-3 py-2">
                    <span className="text-sm flex-1 truncate">📄 {form.plan_table_nom || 'Plan de table'}</span>
                    <a href={form.plan_table_url} target="_blank" rel="noopener noreferrer" className="text-xs text-primary hover:underline shrink-0">Voir</a>
                    <button
                      type="button"
                      onClick={() => setForm(f => ({ ...f, plan_table_url: '', plan_table_nom: '' }))}
                      className="text-destructive hover:text-destructive/80"
                    >
                      <Trash2 size={13} />
                    </button>
                  </div>
                ) : (
                  <label className={`flex items-center gap-2 px-3 py-2 rounded-lg border border-dashed border-border cursor-pointer hover:bg-muted/30 transition-colors ${uploadingPlan ? 'opacity-60 pointer-events-none' : ''}`}>
                    <Upload size={14} className="text-muted-foreground" />
                    <span className="text-sm text-muted-foreground">{uploadingPlan ? 'Upload en cours…' : 'Uploader le plan (image ou PDF)'}</span>
                    <input
                      type="file"
                      accept="image/*,.pdf"
                      className="hidden"
                      onChange={async (e) => {
                        const file = e.target.files[0];
                        if (!file) return;
                        setUploadingPlan(true);
                        const { file_url } = await base44.integrations.Core.UploadFile({ file });
                        setForm(f => ({ ...f, plan_table_url: file_url, plan_table_nom: file.name }));
                        setUploadingPlan(false);
                      }}
                    />
                  </label>
                )}
              </div>
            )}
          </div>

          {/* Tâches requises pour ce dossier */}
          <div className="space-y-2 border border-border rounded-xl p-4">
            <Label>📋 Tâches requises pour ce dossier</Label>
            <p className="text-xs text-muted-foreground">Cochez les éléments à préparer pour cet événement. Le tableau de bord utilisera cette liste pour suivre l'avancement.</p>
            <div className="grid grid-cols-2 gap-2 mt-2">
              {[
                { key: 'formulaire',    label: 'Questionnaire client' },
                { key: 'programme',     label: 'Programme de la journée' },
                { key: 'fiche_service', label: 'Fiche de service' },
                { key: 'plan_table',    label: 'Plan de table' },
                { key: 'equipe_extras', label: '👥 Équipe extras complète' },
                ...(modules.logistique ? [{ key: 'logistique', label: '📦 Logistique & Livraisons' }] : []),
              ].map(({ key, label }) => (
                <label key={key} className="flex items-center gap-2 cursor-pointer group min-w-0">
                  <input
                    type="checkbox"
                    checked={form.taches_requises?.[key] ?? true}
                    onChange={e => set('taches_requises', { ...form.taches_requises, [key]: e.target.checked })}
                    className="w-4 h-4 rounded accent-primary"
                  />
                  <span className="text-sm group-hover:text-foreground text-foreground/80">{label}</span>
                </label>
              ))}
            </div>
          </div>

          {/* Budget */}
          <div className="space-y-1.5">
            <Label>Budget (€)</Label>
            <Input type="number" value={form.budget} onChange={e => set('budget', e.target.value)} placeholder="ex: 15000" />
          </div>

          {/* Notes internes */}
          <div className="space-y-1.5">
            <Label>Notes internes <span className="text-xs text-muted-foreground">(admin uniquement)</span></Label>
            <textarea
              className="w-full rounded-md border border-input bg-transparent px-3 py-2 text-sm min-h-[60px] focus-visible:outline-none focus-visible:ring-1 focus-visible:ring-ring resize-none"
              value={form.notes_internes}
              onChange={e => set('notes_internes', e.target.value)}
              placeholder="Notes confidentielles..."
            />
          </div>

          {/* Prestataires et Lieux */}
          {evenement?.id && (
            <>
              <div className="space-y-1.5 border-t border-border pt-4">
                <div className="flex items-center justify-between">
                  <Label>Prestataires associés</Label>
                  <Button size="sm" variant="outline" className="gap-1 h-7 text-xs" onClick={() => setPrestataireModalOpen(true)}>
                    <Briefcase size={12} /> Gérer
                  </Button>
                </div>
                <PrestatairesInline evenementId={evenement.id} onOpen={() => setPrestataireModalOpen(true)} />
              </div>

              <LieuxInlineModal evenementId={evenement.id} />

              <PropositionDateRecap evenementId={evenement.id} />

              <DemandeAnnulationRecap evenementId={evenement.id} />
            </>
          )}
        </div>

          <div className="modal-footer">
            <Button variant="outline" onClick={onClose}>Annuler</Button>
            <Button onClick={() => saveMutation.mutate()} disabled={!form.nom || !dateValid || saveMutation.isPending}>
              {saveMutation.isPending ? 'Enregistrement...' : 'Enregistrer'}
            </Button>
          </div>
        </div>
      </div>

    {prestataireModalOpen && evenement?.id && (
      <AssocierPrestataireModal evenement={{ ...evenement, ...form }} onClose={() => setPrestataireModalOpen(false)} />
    )}
    </>
  );
}