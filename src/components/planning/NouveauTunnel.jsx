/**
 * NouveauTunnel — Tunnel universel de création
 * Accessible depuis le Calendrier (bouton "+ Nouveau") ou directement depuis le Planning équipe.
 *
 * Props:
 *   onClose: fn
 *   defaultStep: 'type' | 'dispo'   — si 'dispo', saute directement à la sélection du type destinataire
 *   defaultDestinataire: 'extras' | 'prestataires' | 'lieux' | 'clients'   — pré-sélectionne le type
 *   defaultDate: string (yyyy-MM-dd) — date pré-sélectionnée
 *   onOpenEvenementModal: fn  — ouvre le modal événement
 */

import { useState } from 'react';
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import { base44 } from '@/api/base44Client';
import { X, ChevronLeft, ChevronRight } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { format, parseISO } from 'date-fns';
import { fr } from 'date-fns/locale';

// ─── Constantes ────────────────────────────────────────────────────────────────

const CRENEAUX = [
  { id: 'matin',      label: 'Matin',             heure_debut: '08:00', heure_fin: '12:00' },
  { id: 'aprem',      label: 'Après-midi',         heure_debut: '14:00', heure_fin: '18:00' },
  { id: 'soir',       label: 'Soir',               heure_debut: '18:00', heure_fin: '23:00' },
  { id: 'journee',    label: 'Journée complète',   heure_debut: '08:00', heure_fin: '23:00' },
  { id: 'preciser',   label: 'Préciser les horaires', heure_debut: '', heure_fin: '' },
];

// ─── Composant principal ───────────────────────────────────────────────────────

export default function NouveauTunnel({
  onClose,
  defaultStep = 'type',
  defaultDestinataire = null,
  defaultDate = null,
  onOpenEvenementModal,
}) {
  const qc = useQueryClient();

  // flow: null = étape 0 (choix), 'rdv', 'dispo'
  const [flow, setFlow] = useState(defaultStep === 'dispo' ? 'dispo' : null);

  // État du formulaire RDV intégré
  const [rdvMode, setRdvMode] = useState('demande'); // 'demande' | 'confirme'
  const [rdvForm, setRdvForm] = useState({
    client_nom: '',
    date_confirmee: defaultDate || '',
    heure_confirmee: '',
    motif: '',
    notes_admin: '',
    statut: 'En attente',
  });
  const [rdvRappelActif, setRdvRappelActif] = useState(false);
  const [rdvRappelDelai, setRdvRappelDelai] = useState('veille');
  const [rdvSaving, setRdvSaving] = useState(false);

  // État du tunnel dispo
  const [dispoStep, setDispoStep] = useState(defaultDestinataire ? 2 : 1);
  // 1=type destinataire, 2=type demande, 3=sélection, 4=dates+créneau, 5=récap
  const [destinataire, setDestinataire] = useState(defaultDestinataire);
  const [typedemande, setTypeDemande] = useState(null); // 'individuelle' | 'groupee'
  const [selectedIds, setSelectedIds] = useState([]);
  const [selectedDates, setSelectedDates] = useState([]);
  const [creneau, setCreneau] = useState(null);
  const [heureDebut, setHeureDebut] = useState('');
  const [heureFin, setHeureFin] = useState('');
  const [message, setMessage] = useState('');

  // État des filtres (étape 3)
  const [filterSearch, setFilterSearch] = useState('');
  const [filterPoste, setFilterPoste] = useState('');
  const [filterCategorie, setFilterCategorie] = useState('');
  const [filterMois, setFilterMois] = useState('');
  const [filterTypeEv, setFilterTypeEv] = useState('');
  const [filterStatut, setFilterStatut] = useState(''); // 'client' | 'prospect' | ''

  // Données
  const { data: extras = [] } = useQuery({ queryKey: ['extras'], queryFn: () => base44.entities.Extra.list() });
  const { data: collaborateurs = [] } = useQuery({ queryKey: ['collaborateurs'], queryFn: () => base44.entities.Collaborateur.list() });
  const { data: prestataires = [] } = useQuery({ queryKey: ['prestataires'], queryFn: () => base44.entities.Prestataire.list('nom', 200) });
  const { data: lieux = [] } = useQuery({ queryKey: ['lieux'], queryFn: () => base44.entities.Lieu.list() });
  const { data: clients = [] } = useQuery({ queryKey: ['clients'], queryFn: () => base44.entities.Client.list('-date_evenement', 200) });
  const { data: prospects = [] } = useQuery({ queryKey: ['prospects'], queryFn: () => base44.entities.Prospect.list() });
  const { data: evenements = [] } = useQuery({ queryKey: ['evenements'], queryFn: () => base44.entities.Evenement.list('-date', 200) });

  const activeExtras = [
    ...extras.filter(e => e.actif !== false),
    ...collaborateurs.filter(c => c.actif !== false && c.visible_planning_equipe !== false).map(c => ({ ...c, _isCollab: true })),
  ];
  const futureEvenements = evenements
    .filter(e => e.date && new Date(e.date) >= new Date())
    .sort((a, b) => a.date.localeCompare(b.date));

  // ─── Helpers liste ──────────────────────────────────────────────────────────

  const getList = () => {
    if (destinataire === 'extras') return activeExtras;
    if (destinataire === 'prestataires') return prestataires.filter(p => p.actif !== false);
    if (destinataire === 'lieux') return lieux;
    if (destinataire === 'clients') return [...clients, ...prospects.map(p => ({ ...p, _isProspect: true, nom: `${p.prenom} ${p.nom} (prospect)` }))];
    return [];
  };

  const toggleId = (id) => setSelectedIds(prev => prev.includes(id) ? prev.filter(x => x !== id) : [...prev, id]);
  const toggleAll = () => {
    const list = getList();
    setSelectedIds(selectedIds.length === list.length ? [] : list.map(x => x.id));
  };

  const toggleDate = (dateStr) => setSelectedDates(prev => prev.includes(dateStr) ? prev.filter(d => d !== dateStr) : [...prev, dateStr]);

  // ─── Envoi ──────────────────────────────────────────────────────────────────

  const [sendError, setSendError] = useState(null);
  const [sendSuccess, setSendSuccess] = useState(false);

  const sendMutation = useMutation({
    mutationFn: async () => {
      const list = getList();
      const dispoGroupee = await base44.entities.DispoExtraGroupee.create({
        nom: `Demande groupée du ${format(new Date(), 'd MMM yyyy', { locale: fr })}`,
        extras_ids: selectedIds,
        dates_demandees: selectedDates,
        dates_par_extra: {},
        message: message || undefined,
        statut: 'En cours',
      });

      // Créer les réponses — dédupliquées par date
      const reponsesToCreate = [];
      selectedIds.forEach(id => {
        const item = list.find(x => x.id === id);
        const uniqueDates = [...new Set(selectedDates)];
        uniqueDates.forEach(dateStr => {
          reponsesToCreate.push({
            dispo_groupee_id: dispoGroupee.id,
            extra_id: id,
            extra_nom: item?.nom || '',
            date: dateStr,
            statut: 'En attente',
          });
        });
      });
      if (reponsesToCreate.length > 0) {
        await base44.entities.DispoExtraReponse.bulkCreate(reponsesToCreate);
      }

      // Envoi email
      for (const id of selectedIds) {
        const item = list.find(x => x.id === id);
        if (!item?.email) continue;
        const uniqueSortedDates = [...new Set(selectedDates)].sort();

        // Formater les lignes de dates selon le type de destinataire
        let datesList;
        if (destinataire === 'extras') {
          // Extras : par date unique, sans mention de l'événement
          datesList = uniqueSortedDates
            .map(d => `• ${format(parseISO(d), 'EEEE d MMMM yyyy', { locale: fr })}`)
            .join('\n');
        } else {
          // Prestataires, lieux : par événement (nom + date)
          datesList = uniqueSortedDates.map(d => {
            const ev = futureEvenements.find(e => e.date === d);
            const label = ev ? `${ev.nom} — ${format(parseISO(d), 'd MMMM yyyy', { locale: fr })}` : format(parseISO(d), 'd MMMM yyyy', { locale: fr });
            return `• ${label}`;
          }).join('\n');
        }

        // Ajout créneau dans l'email
        let creneauLine = '';
        if (creneau && creneau !== 'preciser') {
          const c = CRENEAUX.find(x => x.id === creneau);
          if (c) creneauLine = `\nCréneau souhaité : ${c.label} (${c.heure_debut} – ${c.heure_fin})`;
        } else if (creneau === 'preciser' && heureDebut) {
          creneauLine = `\nCréneau souhaité : ${heureDebut}${heureFin ? ` – ${heureFin}` : ''}`;
        }

        await base44.integrations.Core.SendEmail({
          to: item.email,
          subject: 'Demande de disponibilité',
          body: `Bonjour ${item.nom},\n\nPouvez-vous confirmer votre disponibilité pour les dates suivantes ?\n\n${datesList}${creneauLine}\n\n${message ? `${message}\n\n` : ''}Merci !`,
        });
      }
      return dispoGroupee;
    },
    onSuccess: () => {
      qc.invalidateQueries(['dispo-reponses']);
      setSendError(null);
      setSendSuccess(true);
      setTimeout(() => onClose(), 1500);
    },
    onError: () => {
      setSendError("Une erreur est survenue, veuillez réessayer.");
    },
  });

  // ─── Rendu étape 0 : choix du type d'action ──────────────────────────────

  if (!flow) {
    return (
      <TunnelShell onClose={onClose} title="Nouvelle action" step={null}>
        <p className="text-sm text-muted-foreground text-center">Que souhaitez-vous créer ?</p>
        <div className="space-y-3 pt-2">
          <ChoiceCard
            emoji="🎉"
            title="Nouvel événement"
            subtitle="Créer un mariage, gala, anniversaire…"
            onClick={() => { onClose(); onOpenEvenementModal?.(); }}
          />
          <ChoiceCard
            emoji="📅"
            title="Rendez-vous"
            subtitle="Client, prospect, prestataire ou tout autre contact"
            onClick={() => setFlow('rdv')}
          />
          <ChoiceCard
            emoji="📋"
            title="Demande de disponibilité"
            subtitle="Extras, prestataires, lieux ou clients"
            onClick={() => { setFlow('dispo'); setDispoStep(1); }}
          />
        </div>
      </TunnelShell>
    );
  }

  // ─── Formulaire RDV intégré ────────────────────────────────────────────────

  if (flow === 'rdv') {
    const isConfirme = rdvMode === 'confirme';

    const handleSaveRdv = async () => {
      if (!rdvForm.client_nom || !rdvForm.date_confirmee) return;
      setRdvSaving(true);
      const statut = isConfirme ? 'Confirmé' : 'En attente';
      const notes_rappel = isConfirme && rdvRappelActif ? rdvRappelDelai : undefined;
      await base44.entities.RendezVous.create({ ...rdvForm, statut, notes_rappel });
      qc.invalidateQueries(['rendezvous']);
      setRdvSaving(false);
      onClose();
    };

    const RAPPEL_OPTIONS = [
      { id: 'veille',   label: 'La veille' },
      { id: '2h_avant', label: '2h avant' },
      { id: '1h_avant', label: '1h avant' },
    ];

    return (
      <TunnelShell onClose={onClose} title="Rendez-vous" step={null}
        onBack={() => setFlow(null)}
        canContinue={!!rdvForm.client_nom && !!rdvForm.date_confirmee && !rdvSaving}
        onContinue={handleSaveRdv}
        continueLabel={rdvSaving ? 'Enregistrement...' : isConfirme ? 'Enregistrer le RDV' : 'Envoyer la demande'}
      >
        {/* Sélecteur de mode */}
        <div className="grid grid-cols-2 gap-2 p-1 bg-muted rounded-xl">
          <button
            onClick={() => { setRdvMode('demande'); setRdvForm(f => ({ ...f, statut: 'En attente' })); }}
            className={`flex flex-col items-center gap-1 px-3 py-2.5 rounded-lg text-sm font-medium transition-all ${!isConfirme ? 'bg-card shadow text-foreground' : 'text-muted-foreground hover:text-foreground'}`}
          >
            <span className="text-lg">📨</span>
            <span className="text-xs leading-tight text-center">Envoyer une<br />demande de RDV</span>
          </button>
          <button
            onClick={() => { setRdvMode('confirme'); setRdvForm(f => ({ ...f, statut: 'Confirmé' })); }}
            className={`flex flex-col items-center gap-1 px-3 py-2.5 rounded-lg text-sm font-medium transition-all ${isConfirme ? 'bg-card shadow text-foreground' : 'text-muted-foreground hover:text-foreground'}`}
          >
            <span className="text-lg">✅</span>
            <span className="text-xs leading-tight text-center">RDV déjà<br />confirmé</span>
          </button>
        </div>

        {/* Explication contextuelle */}
        <p className="text-xs text-muted-foreground bg-muted/50 rounded-lg px-3 py-2">
          {isConfirme
            ? '📅 Le RDV apparaîtra immédiatement dans le calendrier avec le statut "Confirmé". Aucun email ne sera envoyé.'
            : '📨 Un email sera envoyé au contact pour confirmer le rendez-vous.'}
        </p>

        <div className="space-y-3">
          <div className="space-y-1">
            <label className="text-sm font-medium">Contact *</label>
            <input value={rdvForm.client_nom} onChange={e => setRdvForm(f => ({ ...f, client_nom: e.target.value }))}
              placeholder="Ex : Martin Dupont, DJ Prestige…"
              className="flex h-9 w-full rounded-md border border-input bg-transparent px-3 py-1 text-sm focus-visible:outline-none focus-visible:ring-1 focus-visible:ring-ring"
            />
          </div>
          <div className="grid grid-cols-2 gap-3">
            <div className="space-y-1">
              <label className="text-sm font-medium">Date *</label>
              <input type="date" value={rdvForm.date_confirmee} onChange={e => setRdvForm(f => ({ ...f, date_confirmee: e.target.value }))}
                className="flex h-9 w-full rounded-md border border-input bg-transparent px-3 py-1 text-sm focus-visible:outline-none focus-visible:ring-1 focus-visible:ring-ring"
              />
            </div>
            <div className="space-y-1">
              <label className="text-sm font-medium">Heure</label>
              <input type="time" value={rdvForm.heure_confirmee} onChange={e => setRdvForm(f => ({ ...f, heure_confirmee: e.target.value }))}
                className="flex h-9 w-full rounded-md border border-input bg-transparent px-3 py-1 text-sm focus-visible:outline-none focus-visible:ring-1 focus-visible:ring-ring"
              />
            </div>
          </div>
          <div className="space-y-1">
            <label className="text-sm font-medium">Motif</label>
            <input value={rdvForm.motif} onChange={e => setRdvForm(f => ({ ...f, motif: e.target.value }))}
              placeholder="Ex : Visite de la salle, suivi devis…"
              className="flex h-9 w-full rounded-md border border-input bg-transparent px-3 py-1 text-sm focus-visible:outline-none focus-visible:ring-1 focus-visible:ring-ring"
            />
          </div>
          <div className="space-y-1">
            <label className="text-sm font-medium">Notes <span className="text-muted-foreground font-normal">(optionnel)</span></label>
            <textarea value={rdvForm.notes_admin} onChange={e => setRdvForm(f => ({ ...f, notes_admin: e.target.value }))}
              placeholder="Notes internes…"
              className="w-full rounded-xl border border-input bg-transparent px-3 py-2 text-sm min-h-16 focus-visible:outline-none focus-visible:ring-1 focus-visible:ring-ring resize-none"
            />
          </div>

          {/* Rappel — uniquement en mode confirmé */}
          {isConfirme && (
            <div className="rounded-xl border border-border bg-muted/30 p-3 space-y-3">
              <div className="flex items-center justify-between">
                <label className="text-sm font-medium cursor-pointer" htmlFor="toggle-rappel">
                  🔔 Envoyer un rappel
                </label>
                <button
                  id="toggle-rappel"
                  role="switch"
                  aria-checked={rdvRappelActif}
                  onClick={() => setRdvRappelActif(v => !v)}
                  className={`relative inline-flex h-5 w-9 items-center rounded-full transition-colors ${rdvRappelActif ? 'bg-primary' : 'bg-muted-foreground/30'}`}
                >
                  <span className={`inline-block h-4 w-4 rounded-full bg-white shadow transition-transform ${rdvRappelActif ? 'translate-x-4' : 'translate-x-0.5'}`} />
                </button>
              </div>
              {rdvRappelActif && (
                <div className="grid grid-cols-3 gap-2">
                  {RAPPEL_OPTIONS.map(opt => (
                    <button
                      key={opt.id}
                      onClick={() => setRdvRappelDelai(opt.id)}
                      className={`px-2 py-1.5 rounded-lg border text-xs font-medium transition-all text-center ${rdvRappelDelai === opt.id ? 'bg-primary/10 border-primary/40 text-primary' : 'bg-card border-border text-muted-foreground hover:text-foreground hover:bg-muted'}`}
                    >
                      {opt.label}
                    </button>
                  ))}
                </div>
              )}
            </div>
          )}
        </div>
      </TunnelShell>
    );
  }

  // ─── Rendu tunnel Dispo ────────────────────────────────────────────────────

  const totalSteps = 5;

  // Étape 1 : Type de destinataire
  if (dispoStep === 1) {
    return (
      <TunnelShell onClose={onClose} title="Demande de disponibilité" step={1} totalSteps={totalSteps}
        onBack={() => defaultStep === 'dispo' ? onClose() : setFlow(null)}
        canContinue={!!destinataire}
        onContinue={() => setDispoStep(2)}
      >
        <p className="text-sm text-muted-foreground">À qui s'adresse cette demande ?</p>
        <div className="space-y-3 pt-1">
          <ChoiceCard emoji="👥" title="Extras & Collaborateurs" subtitle="Personnel de salle, service, cuisine" active={destinataire === 'extras'} onClick={() => setDestinataire('extras')} />
          <ChoiceCard emoji="🤝" title="Prestataires" subtitle="DJ, photographe, traiteur…" active={destinataire === 'prestataires'} onClick={() => setDestinataire('prestataires')} />
          <ChoiceCard emoji="📍" title="Lieux" subtitle="Salles de réception, châteaux…" active={destinataire === 'lieux'} onClick={() => setDestinataire('lieux')} />
          <ChoiceCard emoji="👤" title="Clients & Prospects" subtitle="Rendez-vous de suivi ou de visite" active={destinataire === 'clients'} onClick={() => setDestinataire('clients')} />
        </div>
      </TunnelShell>
    );
  }

  // Étape 2 : Type de demande
  if (dispoStep === 2) {
    return (
      <TunnelShell onClose={onClose} title="Type de demande" step={2} totalSteps={totalSteps}
        onBack={() => setDispoStep(1)}
        canContinue={!!typedemande}
        onContinue={() => setDispoStep(3)}
      >
        <p className="text-sm text-muted-foreground">Quel type de demande souhaitez-vous envoyer ?</p>
        <div className="space-y-3 pt-1">
          <ChoiceCard emoji="👤" title="Demande individuelle / ponctuelle" subtitle="Une seule personne ou une seule date" active={typedemande === 'individuelle'} onClick={() => setTypeDemande('individuelle')} />
          <ChoiceCard emoji="📦" title="Demande groupée" subtitle="Plusieurs personnes et/ou plusieurs dates" active={typedemande === 'groupee'} onClick={() => setTypeDemande('groupee')} />
        </div>
      </TunnelShell>
    );
  }

  // Étape 3 : Sélection des personnes / lieux
  if (dispoStep === 3) {
    const list = getList();
    const listLabel = destinataire === 'extras' ? 'Extras & Collaborateurs' : destinataire === 'prestataires' ? 'Prestataires' : destinataire === 'lieux' ? 'Lieux' : 'Clients & Prospects';

    // Filtrage selon le type de destinataire
    const filteredList = list.filter(item => {
      const search = filterSearch.toLowerCase();
      const matchSearch = !search || item.nom?.toLowerCase().includes(search);

      if (destinataire === 'extras') {
        const matchPoste = !filterPoste || item.poste === filterPoste || item.competences?.includes(filterPoste);
        return matchSearch && matchPoste;
      }
      if (destinataire === 'prestataires') {
        const matchCat = !filterCategorie || item.domaine === filterCategorie;
        return matchSearch && matchCat;
      }
      if (destinataire === 'clients') {
        const matchMois = !filterMois || (item.date_evenement && item.date_evenement.startsWith(filterMois));
        const matchType = !filterTypeEv || item.type_evenement === filterTypeEv;
        const matchStatut = !filterStatut
          || (filterStatut === 'prospect' && item._isProspect)
          || (filterStatut === 'client' && !item._isProspect);
        return matchSearch && matchMois && matchType && matchStatut;
      }
      // lieux : juste la recherche
      return matchSearch;
    });

    // Options dynamiques
    const postesDispos = [...new Set(activeExtras.map(e => e.poste).filter(Boolean))].sort();
    const categoriesDispos = [...new Set(prestataires.filter(p => p.actif !== false).map(p => p.domaine).filter(Boolean))].sort();
    const typesEvenementDispos = [...new Set(list.map(c => c.type_evenement).filter(Boolean))].sort();
    const moisDispos = [...new Set(list.map(c => c.date_evenement?.slice(0, 7)).filter(Boolean))].sort();

    const inputCls = "flex h-8 w-full rounded-lg border border-input bg-transparent px-2.5 py-1 text-xs focus-visible:outline-none focus-visible:ring-1 focus-visible:ring-ring";

    return (
      <TunnelShell onClose={onClose} title={listLabel} step={3} totalSteps={totalSteps}
        onBack={() => setDispoStep(2)}
        canContinue={selectedIds.length > 0}
        onContinue={() => setDispoStep(4)}
      >
        {/* Filtres */}
        <div className="space-y-2 pb-3 border-b border-border">
          <input
            type="text"
            placeholder="Rechercher par nom…"
            value={filterSearch}
            onChange={e => setFilterSearch(e.target.value)}
            className={inputCls}
          />
          {destinataire === 'extras' && postesDispos.length > 0 && (
            <select value={filterPoste} onChange={e => setFilterPoste(e.target.value)} className={inputCls}>
              <option value="">Tous les postes</option>
              {postesDispos.map(p => <option key={p} value={p}>{p}</option>)}
            </select>
          )}
          {destinataire === 'prestataires' && categoriesDispos.length > 0 && (
            <select value={filterCategorie} onChange={e => setFilterCategorie(e.target.value)} className={inputCls}>
              <option value="">Toutes les catégories</option>
              {categoriesDispos.map(c => <option key={c} value={c}>{c}</option>)}
            </select>
          )}
          {destinataire === 'clients' && (
            <div className="grid grid-cols-3 gap-1.5">
              <select value={filterMois} onChange={e => setFilterMois(e.target.value)} className={inputCls}>
                <option value="">Tous les mois</option>
                {moisDispos.map(m => <option key={m} value={m}>{format(parseISO(m + '-01'), 'MMM yyyy', { locale: fr })}</option>)}
              </select>
              <select value={filterTypeEv} onChange={e => setFilterTypeEv(e.target.value)} className={inputCls}>
                <option value="">Tous types</option>
                {typesEvenementDispos.map(t => <option key={t} value={t}>{t}</option>)}
              </select>
              <select value={filterStatut} onChange={e => setFilterStatut(e.target.value)} className={inputCls}>
                <option value="">Tous</option>
                <option value="client">Clients</option>
                <option value="prospect">Prospects</option>
              </select>
            </div>
          )}
        </div>

        {/* Tout sélectionner */}
        <div className="flex items-center gap-2">
          <input type="checkbox" id="selAll" checked={filteredList.length > 0 && filteredList.every(i => selectedIds.includes(i.id))}
            onChange={() => {
              const filteredIds = filteredList.map(i => i.id);
              const allSelected = filteredIds.every(id => selectedIds.includes(id));
              if (allSelected) setSelectedIds(prev => prev.filter(id => !filteredIds.includes(id)));
              else setSelectedIds(prev => [...new Set([...prev, ...filteredIds])]);
            }}
            className="w-4 h-4 rounded accent-primary" />
          <label htmlFor="selAll" className="text-sm font-medium cursor-pointer">Tout sélectionner ({filteredList.length})</label>
        </div>

        <div className="max-h-52 overflow-y-auto space-y-1.5">
          {filteredList.map(item => (
            <label key={item.id} className="flex items-center gap-3 p-2 rounded-lg hover:bg-muted cursor-pointer">
              <input type="checkbox" checked={selectedIds.includes(item.id)} onChange={() => toggleId(item.id)}
                className="w-4 h-4 rounded accent-primary" />
              <div className="flex-1 min-w-0">
                <p className="text-sm font-medium truncate">
                  {item.nom}
                  {item._isCollab && <span className="ml-2 text-[10px] px-1.5 py-0.5 rounded bg-blue-100 text-blue-700">Collab.</span>}
                  {item._isProspect && <span className="ml-2 text-[10px] px-1.5 py-0.5 rounded bg-orange-100 text-orange-700">Prospect</span>}
                </p>
                {item.email && <p className="text-xs text-muted-foreground truncate">{item.email}</p>}
                {destinataire === 'prestataires' && item.domaine && <p className="text-xs text-muted-foreground">{item.domaine}</p>}
                {destinataire === 'clients' && item.type_evenement && <p className="text-xs text-muted-foreground">{item.type_evenement}{item.date_evenement ? ` · ${format(parseISO(item.date_evenement), 'd MMM yyyy', { locale: fr })}` : ''}</p>}
              </div>
            </label>
          ))}
          {filteredList.length === 0 && <p className="text-sm text-muted-foreground text-center py-6">Aucun résultat.</p>}
        </div>
        <p className="text-xs text-muted-foreground">{selectedIds.length} sélectionné(s) au total</p>
      </TunnelShell>
    );
  }

  // Étape 4 : Dates + créneau
  if (dispoStep === 4) {
    const showByEvent = destinataire === 'prestataires' || destinataire === 'lieux';

    // Dédupliquer par date pour extras/clients
    const seen = new Set();
    const uniqueDateItems = futureEvenements.filter(ev => {
      if (seen.has(ev.date)) return false;
      seen.add(ev.date);
      return true;
    });

    return (
      <TunnelShell onClose={onClose} title="Dates & Créneau" step={4} totalSteps={totalSteps}
        onBack={() => setDispoStep(3)}
        canContinue={selectedDates.length > 0}
        onContinue={() => setDispoStep(5)}
      >
        {/* Sélection des dates */}
        <div className="space-y-2">
          <p className="text-sm font-medium">Dates concernées</p>
          {destinataire === 'clients' ? (
            // Clients : saisie libre d'une date
            <input type="date" value={selectedDates[0] || ''} min={format(new Date(), 'yyyy-MM-dd')}
              onChange={e => setSelectedDates(e.target.value ? [e.target.value] : [])}
              className="flex h-9 w-full rounded-md border border-input bg-transparent px-3 py-1 text-sm focus-visible:outline-none focus-visible:ring-1 focus-visible:ring-ring"
            />
          ) : showByEvent ? (
            // Prestataires / Lieux : par événement
            <div className="max-h-52 overflow-y-auto space-y-1.5">
              {futureEvenements.map(ev => (
                <label key={ev.id} className="flex items-center gap-3 p-2 rounded-lg hover:bg-muted cursor-pointer">
                  <input type="checkbox" checked={selectedDates.includes(ev.date)} onChange={() => toggleDate(ev.date)}
                    className="w-4 h-4 rounded accent-primary" />
                  <div>
                    <p className="text-sm font-medium">{ev.nom}</p>
                    <p className="text-xs text-muted-foreground">{format(parseISO(ev.date), 'd MMMM yyyy', { locale: fr })}</p>
                  </div>
                </label>
              ))}
              {futureEvenements.length === 0 && <p className="text-sm text-muted-foreground text-center py-4">Aucun événement à venir.</p>}
            </div>
          ) : (
            // Extras : par date unique
            <div className="max-h-52 overflow-y-auto space-y-1.5">
              {uniqueDateItems.map(ev => {
                const sameDay = futureEvenements.filter(e => e.date === ev.date);
                return (
                  <label key={ev.date} className="flex items-center gap-3 p-2 rounded-lg hover:bg-muted cursor-pointer">
                    <input type="checkbox" checked={selectedDates.includes(ev.date)} onChange={() => toggleDate(ev.date)}
                      className="w-4 h-4 rounded accent-primary" />
                    <div>
                      <p className="text-sm font-medium">{format(parseISO(ev.date), 'd MMMM yyyy', { locale: fr })}
                        {sameDay.length > 1 && <span className="ml-2 text-xs text-muted-foreground font-normal">({sameDay.length} événements ce jour)</span>}
                      </p>
                      {sameDay.length === 1 && <p className="text-xs text-muted-foreground">{ev.nom}</p>}
                      {sameDay.length > 1 && <p className="text-xs text-muted-foreground">{sameDay.map(e => e.nom).join(', ')}</p>}
                    </div>
                  </label>
                );
              })}
              {uniqueDateItems.length === 0 && <p className="text-sm text-muted-foreground text-center py-4">Aucun événement à venir.</p>}
            </div>
          )}
        </div>

        {/* Créneau horaire */}
        <div className="space-y-2 pt-2 border-t border-border">
          <p className="text-sm font-medium">Créneau horaire <span className="text-muted-foreground font-normal">(optionnel)</span></p>
          <div className="grid grid-cols-2 gap-2">
            {CRENEAUX.map(c => (
              <button key={c.id} onClick={() => setCreneau(c.id === creneau ? null : c.id)}
                className={`flex flex-col items-start px-3 py-2 rounded-xl border text-left text-sm font-medium transition-all ${creneau === c.id ? 'bg-primary/10 border-primary/30 text-primary' : 'bg-card border-border text-foreground hover:bg-muted'}`}
              >
                <span>{c.label}</span>
                {c.heure_debut && <span className="text-xs text-muted-foreground font-normal">{c.heure_debut} – {c.heure_fin}</span>}
              </button>
            ))}
          </div>
          {creneau === 'preciser' && (
            <div className="flex gap-3 pt-1">
              <div className="flex-1 space-y-1">
                <label className="text-xs text-muted-foreground">Début</label>
                <input type="time" value={heureDebut} onChange={e => setHeureDebut(e.target.value)}
                  className="flex h-9 w-full rounded-md border border-input bg-transparent px-3 py-1 text-sm focus-visible:outline-none focus-visible:ring-1 focus-visible:ring-ring" />
              </div>
              <div className="flex-1 space-y-1">
                <label className="text-xs text-muted-foreground">Fin</label>
                <input type="time" value={heureFin} onChange={e => setHeureFin(e.target.value)}
                  className="flex h-9 w-full rounded-md border border-input bg-transparent px-3 py-1 text-sm focus-visible:outline-none focus-visible:ring-1 focus-visible:ring-ring" />
              </div>
            </div>
          )}
        </div>
      </TunnelShell>
    );
  }

  // Étape 5 : Récapitulatif + envoi
  if (dispoStep === 5) {
    const list = getList();
    const destinataireLabel = destinataire === 'extras' ? 'Extras & Collaborateurs' : destinataire === 'prestataires' ? 'Prestataires' : destinataire === 'lieux' ? 'Lieux' : 'Clients & Prospects';
    const creneauInfo = creneau && creneau !== 'preciser'
      ? CRENEAUX.find(c => c.id === creneau)?.label
      : creneau === 'preciser' && heureDebut ? `${heureDebut}${heureFin ? ` – ${heureFin}` : ''}` : null;

    const sansEmail = selectedIds
      .map(id => list.find(x => x.id === id))
      .filter(item => item && !item.email);

    return (
      <TunnelShell onClose={onClose} title="Récapitulatif" step={5} totalSteps={totalSteps}
        onBack={!sendSuccess ? () => setDispoStep(4) : undefined}
        canContinue={!sendMutation.isPending && !sendSuccess}
        onContinue={() => { setSendError(null); sendMutation.mutate(); }}
        continueLabel={sendMutation.isPending ? 'Envoi en cours...' : 'Envoyer les demandes'}
      >
        {sendSuccess && (
          <div className="rounded-xl border border-emerald-200 bg-emerald-50 p-4 text-center">
            <p className="text-emerald-700 font-semibold text-sm">✅ Demande(s) envoyée(s) avec succès</p>
            <p className="text-xs text-emerald-600 mt-1">Fermeture automatique…</p>
          </div>
        )}
        {sendError && (
          <div className="rounded-xl border border-red-200 bg-red-50 p-3">
            <p className="text-red-700 text-sm">❌ {sendError}</p>
          </div>
        )}
        <div className="bg-muted/40 rounded-xl p-4 space-y-3 text-sm">
          <RecapRow label="Destinataires" value={`${selectedIds.length} ${destinataireLabel}`} />
          <RecapRow label="Dates" value={[...new Set(selectedDates)].sort().map(d => format(parseISO(d), 'd MMM yyyy', { locale: fr })).join(', ')} />
          {creneauInfo && <RecapRow label="Créneau" value={creneauInfo} />}
        </div>

        {/* Avertissement contacts sans email */}
        {sansEmail.length > 0 && (
          <div className="rounded-xl border border-amber-200 bg-amber-50 p-4 space-y-2">
            <p className="text-sm font-semibold text-amber-800">
              ⚠️ {sansEmail.length} contact{sansEmail.length > 1 ? 's' : ''} n'ont pas d'adresse email et ne recevront pas la demande :
            </p>
            <p className="text-xs text-amber-700">{sansEmail.map(i => i.nom).join(', ')}</p>
            <p className="text-xs text-amber-600">La demande sera envoyée aux autres contacts uniquement.</p>
            <Button
              variant="outline"
              size="sm"
              className="border-amber-300 text-amber-800 hover:bg-amber-100 text-xs"
              onClick={() => setDispoStep(3)}
            >
              ← Retour à la sélection
            </Button>
          </div>
        )}

        <div className="space-y-1.5">
          <label className="text-sm font-medium">Message personnalisé <span className="text-muted-foreground font-normal">(optionnel)</span></label>
          <textarea value={message} onChange={e => setMessage(e.target.value)}
            placeholder="Ajoutez un message à la demande..."
            className="w-full rounded-xl border border-input bg-transparent px-3 py-2 text-sm min-h-20 focus-visible:outline-none focus-visible:ring-1 focus-visible:ring-ring resize-none"
          />
        </div>

        <div className="bg-muted/40 rounded-xl p-3 max-h-40 overflow-y-auto space-y-1">
          <p className="text-xs font-semibold text-muted-foreground uppercase tracking-wide mb-2">Personnes concernées</p>
          {selectedIds.map(id => {
            const item = list.find(x => x.id === id);
            return <p key={id} className="text-xs">{item?.nom} {item?.email ? <span className="text-muted-foreground">· {item.email}</span> : <span className="text-orange-500">⚠️ pas d'email</span>}</p>;
          })}
        </div>
      </TunnelShell>
    );
  }

  return null;
}

// ─── Sous-composants ──────────────────────────────────────────────────────────

function TunnelShell({ onClose, title, step, totalSteps, onBack, canContinue, onContinue, continueLabel = 'Suivant', children }) {
  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/40 backdrop-blur-sm p-4">
      <div className="bg-card rounded-2xl border border-border shadow-xl w-full max-w-md flex flex-col max-h-[90vh]">
        {/* Header */}
        <div className="flex items-center justify-between px-5 py-4 border-b border-border shrink-0">
          <div className="flex items-center gap-2">
            {onBack && (
              <button onClick={onBack} className="p-1 rounded-lg hover:bg-muted text-muted-foreground">
                <ChevronLeft size={16} />
              </button>
            )}
            <h3 className="font-semibold text-base">{title}</h3>
          </div>
          <div className="flex items-center gap-2">
            {step && <span className="text-xs text-muted-foreground">{step}/{totalSteps}</span>}
            <button onClick={onClose} className="p-1 rounded-lg hover:bg-muted text-muted-foreground"><X size={16} /></button>
          </div>
        </div>

        {/* Contenu scrollable */}
        <div className="flex-1 overflow-y-auto px-5 py-4 space-y-4">
          {children}
        </div>

        {/* Footer navigation */}
        {(onBack || onContinue) && (
          <div className="px-5 py-4 border-t border-border shrink-0 flex justify-end gap-2">
            {onBack && (
              <Button variant="outline" onClick={onBack} className="gap-1">
                <ChevronLeft size={14} /> Retour
              </Button>
            )}
            {onContinue && (
              <Button onClick={onContinue} disabled={!canContinue} className="gap-1">
                {continueLabel} {continueLabel === 'Suivant' && <ChevronRight size={14} />}
              </Button>
            )}
          </div>
        )}
      </div>
    </div>
  );
}

function ChoiceCard({ emoji, title, subtitle, active, onClick }) {
  return (
    <button onClick={onClick}
      className={`w-full text-left rounded-2xl border p-4 flex items-center gap-4 transition-all
        ${active ? 'bg-primary/10 border-primary/40 ring-2 ring-primary/20' : 'bg-card border-border hover:border-primary/30 hover:bg-primary/5'}`}
    >
      <span className="text-3xl shrink-0">{emoji}</span>
      <div>
        <p className="font-semibold text-sm">{title}</p>
        {subtitle && <p className="text-xs text-muted-foreground mt-0.5">{subtitle}</p>}
      </div>
      {active && <span className="ml-auto text-primary text-lg">✓</span>}
    </button>
  );
}

function RecapRow({ label, value }) {
  return (
    <div className="flex gap-2">
      <span className="text-muted-foreground shrink-0 w-28">{label}</span>
      <span className="font-medium">{value}</span>
    </div>
  );
}