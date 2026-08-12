import { useState, useMemo, useEffect } from 'react';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { base44 } from '@/api/base44Client';
import { Plus, Search, Phone, Mail, Users, ChevronDown, ExternalLink, FileText, BookOpen, Paperclip, Bell, CalendarCheck, AlertCircle, ChevronRight, Pencil, Trash2, MessageSquare, Share2, Clock, CalendarClock } from 'lucide-react';
import { TYPE_COLORS } from '@/constants/colors';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { AlertDialog, AlertDialogAction, AlertDialogCancel, AlertDialogContent, AlertDialogDescription, AlertDialogFooter, AlertDialogHeader, AlertDialogTitle } from '@/components/ui/alert-dialog';
import EmptyState from '@/components/EmptyState';
import ProspectModal from '@/components/prospects/ProspectModal';
import ConvertirProspectModal from '@/components/prospects/ConvertirProspectModal';
import DevisModal from '@/components/facturation/DevisModal';
import { parseDevisMeta, enrichirLignesAvecPrix } from '@/components/notifications/DevisDemandeButton';
import PageCard from '@/components/PageCard';
import SendBrochureModal from '@/components/prospects/SendBrochureModal';
import SendDocumentModal from '@/components/prospects/SendDocumentModal';
import RappelModal from '@/components/rappels/RappelModal';
import ContratCreateModal from '@/components/juridique/ContratCreateModal';
import ContractModal from '@/components/juridique/ContractModal';
import ModelePickerModal from '@/components/juridique/ModelePickerModal';
import ProspectEditModal from '@/components/prospects/ProspectEditModal';
import RelanceDelaiPopover from '@/components/prospects/RelanceDelaiPopover';
import ProspectMessagesModal from '@/components/prospects/ProspectMessagesModal';
import ProspectReservationModal from '@/components/prospects/ProspectReservationModal';
import ProspectCard from '@/components/prospects/ProspectCard';
import { PROSPECT_STATUTS } from '@/lib/prospectConstants';
import { toast } from 'sonner';

function ProspectsList() {
  const qc = useQueryClient();
  const [search, setSearch] = useState('');
  const [filterStatut, setFilterStatut] = useState('Tous');
  const [onglet, setOnglet] = useState('actifs');
  const [modalOpen, setModalOpen] = useState(false);
  const [editing, setEditing] = useState(null);
  const [convertirProspect, setConvertirProspect] = useState(null);
  const [datesDemandees, setDatesDemandees] = useState([]);
  const [devisProspect, setDevisProspect] = useState(null);
  const [confirmDelete, setConfirmDelete] = useState(null);
  const [brochureProspect, setBrochureProspect] = useState(null);
  const [documentProspect, setDocumentProspect] = useState(null);
  const [rappelContext, setRappelContext] = useState(null);
  const [devisFromMessage, setDevisFromMessage] = useState(null);
  const [contratProspect, setContratProspect] = useState(null);
  const [contratCreateOpen, setContratCreateOpen] = useState(false);
  const [contratEditing, setContratEditing] = useState(null);
  const [contratModalOpen, setContratModalOpen] = useState(false);
  const [contratCreationMode, setContratCreationMode] = useState(null);
  const [modelePreselection, setModelePreselection] = useState(null);
  const [showModelePicker, setShowModelePicker] = useState(false);
  const [editModalProspect, setEditModalProspect] = useState(null);
  const [messagesProspect, setMessagesProspect] = useState(null);
  const [reservationProspect, setReservationProspect] = useState(null);
  const [relanceDelai, setRelanceDelai] = useState(3);
  const [savingRelance, setSavingRelance] = useState(false);
  const [showRelancePanel, setShowRelancePanel] = useState(false);

  const { data: companySettings } = useQuery({
    queryKey: ['company-settings-owner'],
    queryFn: () => base44.entities.CompanySettings.list().then(r => r.find(cs => cs.is_owner === true) || null),
    staleTime: 60000,
  });

  const { data: prospects = [] } = useQuery({
    queryKey: ['prospects'],
    queryFn: () => base44.entities.Prospect.list('-created_date', 200),
  });

  const { data: preResas = [] } = useQuery({
    queryKey: ['prereservations-badges'],
    queryFn: () => base44.entities.PreReservation.filter({ statut: 'En attente' }),
  });

  const { data: datesDemandes = [] } = useQuery({
    queryKey: ['dates-demandes-badges'],
    queryFn: () => base44.entities.ProspectDateDemande.filter({ statut: 'En attente' }),
  });

  const { data: datesRepondues = [] } = useQuery({
    queryKey: ['dates-repondues-badges'],
    queryFn: () => base44.entities.ProspectDateDemande.filter({ statut: 'Répondu' }),
  });

  const { data: datesConfirmees = [] } = useQuery({
    queryKey: ['dates-confirmees-badges'],
    queryFn: () => base44.entities.ProspectDateDemande.filter({ statut: 'Confirmée' }),
  });

  const { data: demandesResa = [] } = useQuery({
    queryKey: ['demandes-reservation-badges'],
    queryFn: () => base44.entities.DemandeReservation.filter({ statut: 'en_attente' }),
  });

  const { data: allMessages = [] } = useQuery({
    queryKey: ['prospect-messages-badges'],
    queryFn: () => base44.entities.ProspectMessage.filter({ auteur: 'prospect' }),
  });

  const { data: devisEnvoyes = [] } = useQuery({
    queryKey: ['devis-envoyes-prospects'],
    queryFn: () => base44.entities.Devis.list('-created_date', 500),
    select: (list) => list.filter(d =>
      d.prospect_id && ['Envoyé', 'Accepté'].includes(d.statut)
    ),
  });

  const devisEnvoyeByProspect = devisEnvoyes.reduce((acc, d) => {
    if (!acc[d.prospect_id] ||
      new Date(d.updated_date) > new Date(acc[d.prospect_id].updated_date)) {
      acc[d.prospect_id] = d;
    }
    return acc;
  }, {});

  // Index par prospect_id pour perf
  const preResaByProspect = preResas.reduce((acc, r) => { acc[r.prospect_id] = true; return acc; }, {});
  const datesByProspect = datesDemandes.reduce((acc, d) => { acc[d.prospect_id] = true; return acc; }, {});
  const datesReponduesByProspect = datesRepondues.reduce((acc, d) => { acc[d.prospect_id] = true; return acc; }, {});
  const datesConfirmeesByProspect = datesConfirmees.reduce((acc, d) => { acc[d.prospect_id] = true; return acc; }, {});
  const messagesByProspect = allMessages.reduce((acc, m) => {
    if (m.message?.startsWith('DEMANDE_DEVIS:')) return acc;
    if (m.message?.startsWith('DEMANDE_RESERVATION:')) return acc;
    if (!acc[m.prospect_id]) acc[m.prospect_id] = 0;
    acc[m.prospect_id]++;
    return acc;
  }, {});
  const devisDemandesByProspect = allMessages.reduce((acc, m) => {
    if (m.message?.startsWith('DEMANDE_DEVIS:')) {
      if (!acc[m.prospect_id] ||
        new Date(m.created_date) > new Date(acc[m.prospect_id].created_date)) {
        acc[m.prospect_id] = m;
      }
    }
    return acc;
  }, {});
  const reservationDemandeByProspect = demandesResa.reduce((acc, d) => { acc[d.prospect_id] = true; return acc; }, {});

  useEffect(() => {
    if (companySettings?.relance_prospect_jours != null) {
      setRelanceDelai(String(companySettings.relance_prospect_jours));
    }
  }, [companySettings]);

  const { data: prospectContrats = [] } = useQuery({
    queryKey: ['contrats-prospects'],
    queryFn: () => base44.entities.Contrat.list('-created_date', 500),
    select: (list) => list.filter(c => c.prospect_id && c.type !== 'modele'),
  });
  const prospectContratByProspect = prospectContrats.reduce((acc, c) => {
    if (c.prospect_id && (!acc[c.prospect_id] || new Date(c.created_date) > new Date(acc[c.prospect_id].created_date))) {
      acc[c.prospect_id] = c;
    }
    return acc;
  }, {});

  const { data: rappelsProspects = [] } = useQuery({
    queryKey: ['rappels-prospects-pending'],
    queryFn: () => base44.entities.Rappel.filter({ type_lie: 'prospect', statut: 'En attente' }),
  });
  const rappelByProspect = useMemo(() => {
    const map = {};
    for (const r of rappelsProspects) {
      if (!r.prospect_id || !r.date_rappel) continue;
      const existing = map[r.prospect_id];
      if (!existing || new Date(r.date_rappel) < new Date(existing.date_rappel)) {
        map[r.prospect_id] = r;
      }
    }
    return map;
  }, [rappelsProspects]);

  const updateMutation = useMutation({
    mutationFn: ({ id, data }) => base44.entities.Prospect.update(id, data),
    onSuccess: () => qc.invalidateQueries(['prospects']),
  });

  // ── Helpers : actions fusionnées ─────────────────────────────────
  const handleDevisClick = async (p) => {
    const msgDevis = allMessages.find(m => m.prospect_id === p.id && m.message?.startsWith('DEMANDE_DEVIS:'));
    const hasDevisEnvoye = devisEnvoyeByProspect[p.id];
    const demandeIsNewer = msgDevis && (!hasDevisEnvoye || new Date(msgDevis.created_date) > new Date(hasDevisEnvoye.updated_date));
    if (msgDevis && demandeIsNewer) {
      const meta = parseDevisMeta({ message: msgDevis.message, titre: `— ${p.prenom} ${p.nom}` });
      if (meta) {
        const lignesEnrichies = await enrichirLignesAvecPrix(meta.lignes_initiales || [], meta.annee_evenement);
        const objetDevis = [p.type_evenement || '', p.prenom + ' ' + p.nom + (p.prenom2 ? ' & ' + p.prenom2 + ' ' + (p.nom2 || p.nom) : '')].filter(Boolean).join(' ').trim();
        setDevisFromMessage({ ...meta, lignes_initiales: lignesEnrichies, objet: objetDevis });
        return;
      }
    }
    setDevisProspect(p);
  };

  const handleShareProspect = async (p) => {
    const portalUrl = `${window.location.origin}/prospect-portal?token=${p.lien_token}`;
    try { await navigator.clipboard.writeText(portalUrl); } catch {
      const input = document.createElement('input');
      input.value = portalUrl;
      document.body.appendChild(input);
      input.select();
      document.execCommand('copy');
      document.body.removeChild(input);
    }
    if (p.email) {
      try {
        await base44.functions.invoke('sendProspectWelcomeEmail', { to: p.email, prenom: p.prenom, url: portalUrl });
        toast.success(`Lien copié + email envoyé à ${p.email}`);
      } catch { toast.success('Lien copié (email non envoyé — erreur)'); }
    } else {
      toast.success('Lien copié (aucun email renseigné)');
    }
  };

  const handleContratClick = (p) => {
    setContratProspect(p);
    const existing = prospectContratByProspect[p.id];
    if (existing) {
      setContratEditing(existing);
      setContratModalOpen(true);
    } else {
      setContratCreateOpen(true);
    }
  };

  const handleSaveRelance = async () => {
    if (!companySettings?.id) return;
    setSavingRelance(true);
    try {
      await base44.entities.CompanySettings.update(companySettings.id, { relance_prospect_jours: Number(relanceDelai) });
      qc.invalidateQueries(['company-settings-owner']);
      toast.success('Paramètre de relance enregistré');
    } catch { toast.error('Erreur lors de la sauvegarde'); }
    finally { setSavingRelance(false); }
  };

  const handleConvertirFromReservation = async (p) => {
    const demandes = await base44.entities.ProspectDateDemande.filter({ prospect_id: p.id });
    const dates = demandes.flatMap(d => d.dates_proposees || []).filter(Boolean);
    const datesSouhaitee = (p.date_type === 'exacte' || !p.date_type) && p.date_evenement_souhaitee ? [p.date_evenement_souhaitee] : [];
    setDatesDemandees([...new Set([...datesSouhaitee, ...dates])]);
    setConvertirProspect(p);
  };

  const deleteMutation = useMutation({
    mutationFn: (id) => base44.entities.Prospect.delete(id),
    onSuccess: () => qc.invalidateQueries(['prospects']),
  });

  const actifs = prospects.filter(p => !p.converti && !p.archived);
  const convertis = prospects.filter(p => p.converti && !p.archived);
  const archives = prospects.filter(p => p.archived);
  const baseList = onglet === 'convertis' ? convertis : onglet === 'archives' ? archives : actifs;
  const filtered = baseList.filter(p => {
    const matchSearch = !search || `${p.prenom} ${p.nom} ${p.telephone || ''} ${p.email || ''}`.toLowerCase().includes(search.toLowerCase());
    const matchStatut = filterStatut === 'Tous' || p.statut === filterStatut;
    return matchSearch && matchStatut;
  });

  return (
    <div className="space-y-4">
      {/* Ligne 2 : compteur + bouton */}
      <div className="flex items-center justify-between gap-3">
        <p className="text-sm text-muted-foreground">{prospects.length} prospect{prospects.length !== 1 ? 's' : ''}</p>
        <Button onClick={() => { setEditing(null); setModalOpen(true); }} className="gap-1.5"><Plus size={15} /> Nouveau prospect</Button>
      </div>

      {/* Ligne 3 : 2 menus déroulants côte à côte */}
      <div className="grid grid-cols-2 gap-2">
        <select
          value={onglet}
          onChange={e => { setOnglet(e.target.value); setFilterStatut('Tous'); }}
          className="h-9 rounded-md border border-input bg-background px-3 text-sm focus-visible:outline-none focus-visible:ring-1 focus-visible:ring-ring"
        >
          <option value="actifs">Statut : Actifs ({actifs.length})</option>
          <option value="convertis">Convertis ({convertis.length})</option>
          <option value="archives">🗃️ Archivés ({archives.length})</option>
        </select>
        <select
          value={filterStatut}
          onChange={e => setFilterStatut(e.target.value)}
          className="h-9 rounded-md border border-input bg-background px-3 text-sm focus-visible:outline-none focus-visible:ring-1 focus-visible:ring-ring"
        >
          <option value="Tous">Pipeline : Tous</option>
          {PROSPECT_STATUTS.map(s => <option key={s} value={s}>{s}</option>)}
        </select>
      </div>

      {/* Ligne 4 : recherche */}
      <div className="relative">
        <Search size={15} className="absolute left-3 top-1/2 -translate-y-1/2 text-muted-foreground" />
        <Input value={search} onChange={e => setSearch(e.target.value)} placeholder="Rechercher un prospect…" className="pl-9" />
      </div>

      {/* Lien d'action : paramètres de relance */}
      <div className="flex justify-end -mt-1">
        <button onClick={() => setShowRelancePanel(s => !s)} className="flex items-center gap-1.5 text-xs font-medium text-primary hover:underline">
          <Clock size={12} /> Paramètres de relance
        </button>
      </div>
      {showRelancePanel && (
        <div className="rounded-xl border border-primary/20 bg-primary/5 p-3 space-y-2">
          <label className="text-xs text-muted-foreground">Délai (jours) avant affichage du bloc « Toujours intéressé ? » dans l'espace prospect, après envoi du devis</label>
          <div className="flex gap-2 items-center">
            <Input type="number" min="1" max="30" value={relanceDelai} onChange={e => setRelanceDelai(e.target.value)} className="w-24" />
            <Button size="sm" onClick={handleSaveRelance} disabled={savingRelance}>{savingRelance ? 'Enregistrement…' : 'Enregistrer'}</Button>
          </div>
        </div>
      )}

      {/* Bandeau archivés */}
      {onglet === 'archives' && (
        <div className="bg-amber-50 border border-amber-200 rounded-xl px-4 py-2 text-xs text-amber-700 font-medium">
          🗃️ Prospects archivés — restaurez ou supprimez définitivement
        </div>
      )}

      {filtered.length === 0 ? (
        <EmptyState icon={AlertCircle} title="Aucun prospect trouvé" description={prospects.length === 0 ? "Créez votre premier prospect." : "Affinez votre recherche."} actionLabel={prospects.length === 0 ? "Créer un prospect" : undefined} onAction={prospects.length === 0 ? () => { setEditing(null); setModalOpen(true); } : undefined} />
      ) : (
        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
          {filtered.map(p => (
            <ProspectCard
              key={p.id}
              prospect={p}
              onStatutChange={async (s) => {
                if (s === 'Signé' && !p.converti) {
                  await updateMutation.mutateAsync({ id: p.id, data: { statut: 'Signé' } });
                  const demandes = await base44.entities.ProspectDateDemande.filter({ prospect_id: p.id });
                  const dates = demandes.flatMap(d => d.dates_proposees || []).filter(Boolean);
                  const datesSouhaitee = (p.date_type === 'exacte' || !p.date_type) && p.date_evenement_souhaitee ? [p.date_evenement_souhaitee] : [];
                  setDatesDemandees([...new Set([...datesSouhaitee, ...dates])]);
                  setConvertirProspect(p);
                } else { updateMutation.mutate({ id: p.id, data: { statut: s } }); }
              }}
              onMessages={() => setMessagesProspect(p)}
              onEdit={() => setEditModalProspect(p)}
              onDelete={() => setConfirmDelete(p)}
              onArchive={(archived) => updateMutation.mutate({ id: p.id, data: { archived } })}
              onDevis={() => handleDevisClick(p)}
              onBrochure={() => setBrochureProspect(p)}
              onDocument={() => setDocumentProspect(p)}
              onContrat={() => handleContratClick(p)}
              onReservation={() => setReservationProspect(p)}
              onRappel={() => setRappelContext({ type: 'prospect', id: p.id, nom: `${p.prenom} ${p.nom}` })}
              onShare={() => handleShareProspect(p)}
              onRelanceDelaiSave={(valeur) => updateMutation.mutateAsync({ id: p.id, data: { relance_delai_jours: valeur } })}
              badgeData={{
                datesEnAttente: datesByProspect[p.id],
                datesRepondues: datesReponduesByProspect[p.id],
                datesConfirmees: datesConfirmeesByProspect[p.id],
                nbMessages: messagesByProspect[p.id],
                contrat: prospectContratByProspect[p.id],
                rappel: rappelByProspect[p.id],
              }}
            />
          ))}
        </div>
      )}

      <AlertDialog open={!!confirmDelete} onOpenChange={open => { if (!open) setConfirmDelete(null); }}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Supprimer ce prospect ?</AlertDialogTitle>
            <AlertDialogDescription>Cette action supprimera définitivement <strong>{confirmDelete?.prenom} {confirmDelete?.nom}</strong>. Irréversible.</AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel>Annuler</AlertDialogCancel>
            <AlertDialogAction className="bg-destructive text-destructive-foreground hover:bg-destructive/90" onClick={() => { deleteMutation.mutate(confirmDelete.id); setConfirmDelete(null); }}>Supprimer définitivement</AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
      {modalOpen && <ProspectModal onClose={() => { setModalOpen(false); setEditing(null); }} />}
      {devisProspect && (() => {
        const objetDevis = (devisProspect.type_evenement || '') + 
          ' ' + devisProspect.prenom + ' ' + devisProspect.nom +
          (devisProspect.prenom2 ? ' & ' + devisProspect.prenom2 + 
            ' ' + (devisProspect.nom2 || devisProspect.nom) : '');
        return <DevisModal prospectId={devisProspect.id} clientNom={`${devisProspect.prenom} ${devisProspect.nom}`} clientEmail={devisProspect.email} clientTelephone={devisProspect.telephone} objet={objetDevis.trim()} onClose={() => setDevisProspect(null)} />;
      })()}
      {brochureProspect && <SendBrochureModal prospect={brochureProspect} onClose={() => setBrochureProspect(null)} />}
      {documentProspect && <SendDocumentModal prospect={documentProspect} onClose={() => setDocumentProspect(null)} />}
      {rappelContext && (
        <RappelModal
          defaultContext={rappelContext}
          onClose={() => setRappelContext(null)}
          onSaved={() => { qc.invalidateQueries(['rappels-prospects-pending']); setRappelContext(null); }}
        />
      )}
      {editModalProspect && (
        <ProspectEditModal
          prospect={editModalProspect}
          onClose={() => setEditModalProspect(null)}
          onDelete={(id) => { deleteMutation.mutate(id); setEditModalProspect(null); }}
        />
      )}
      {contratCreateOpen && contratProspect && (
        <ContratCreateModal
          onClose={() => { setContratCreateOpen(false); setContratProspect(null); }}
          onPickUpload={() => { setContratCreateOpen(false); setContratCreationMode('signe'); setContratModalOpen(true); }}
          onPickSigner={() => { setContratCreateOpen(false); setContratCreationMode('a_signer'); setContratModalOpen(true); }}
          onPickModele={() => { setContratCreateOpen(false); setShowModelePicker(true); }}
        />
      )}
      {contratModalOpen && (
        <ContractModal
          contrat={contratEditing}
          creationMode={contratCreationMode}
          modelePreselection={modelePreselection}
          prospectId={contratProspect?.id || contratEditing?.prospect_id}
          prospectNom={contratProspect ? `${contratProspect.prenom} ${contratProspect.nom}` : null}
          prospectEmail={contratProspect?.email}
          onClose={() => { setContratModalOpen(false); setContratEditing(null); setContratCreationMode(null); setModelePreselection(null); setContratProspect(null); qc.invalidateQueries(['contrats-prospects']); }}
        />
      )}
      {showModelePicker && (
        <ModelePickerModal
          onClose={() => { setShowModelePicker(false); setContratProspect(null); }}
          onPick={(modele) => {
            setShowModelePicker(false);
            setModelePreselection({
              modeleUrl: modele.modele_url,
              modeleId: modele.id,
              contenuDynamique: modele.contenu_dynamique || null,
              modePaiement: modele.mode_paiement || 'pourcentage',
              tauxTvaModele: modele.taux_tva_modele ?? null,
              pourcentageAcompteModele: modele.pourcentage_acompte_modele ?? null,
              baseCalculAcompteModele: modele.base_calcul_acompte_modele ?? 'TTC',
              paliersAnnulation: modele.paliers_annulation || [],
              echeancierModele: modele.echeancier_modele || [],
              });
              setContratCreationMode('modele');
            setContratModalOpen(true);
          }}
        />
      )}
      {devisFromMessage && (
        <DevisModal
          prospectId={devisFromMessage.prospect_id}
          clientNom={devisFromMessage.client_nom}
          clientEmail={devisFromMessage.client_email}
          clientTelephone={devisFromMessage.client_telephone}
          lignesInitiales={devisFromMessage.lignes_initiales || []}
          objet={devisFromMessage.objet || ''}
          onClose={() => setDevisFromMessage(null)}
          onSaved={() => setDevisFromMessage(null)}
        />
      )}
      {convertirProspect && <ConvertirProspectModal prospect={convertirProspect} datesDemandees={datesDemandees} onClose={() => setConvertirProspect(null)} onConverted={() => { setConvertirProspect(null); qc.invalidateQueries(['prospects']); }} />}
      {messagesProspect && <ProspectMessagesModal prospect={messagesProspect} onClose={() => setMessagesProspect(null)} />}
      {reservationProspect && <ProspectReservationModal prospect={reservationProspect} onClose={() => setReservationProspect(null)} onConvertir={handleConvertirFromReservation} />}
    </div>
  );
}

export default function Prospects({ embedded = false }) {
  const [view, setView] = useState(null);

  const { data: prospects = [] } = useQuery({
    queryKey: ['prospects'],
    queryFn: () => base44.entities.Prospect.list('-created_date', 200),
  });

  const actifs = prospects.filter(p => !p.converti).length;
  const aRelancer = prospects.filter(p => p.statut === 'À relancer').length;

  // Mode embedded : affiche directement la liste sans hub ni header
  if (embedded) return <ProspectsList />;

  return (
    <div className="p-4 md:p-6 space-y-5 max-w-4xl mx-auto">
      <div className="flex items-center gap-3">
        {view && (
          <button onClick={() => setView(null)} className="flex items-center gap-1 text-sm text-muted-foreground hover:text-foreground transition-colors">
            <ChevronRight size={14} className="rotate-180" /> Retour
          </button>
        )}
        <div>
          <h2 className="text-2xl font-bold">Prospects</h2>
          {!view && <p className="text-muted-foreground text-sm mt-1">Suivez vos opportunités commerciales</p>}
        </div>
      </div>

      {!view && (
        <div className="space-y-3">
          <PageCard
            emoji="🎯"
            iconBg="bg-amber-100 text-amber-700"
            title="Pipeline prospects"
            subtitle={`${actifs} actif${actifs !== 1 ? 's' : ''}${aRelancer > 0 ? ` · ${aRelancer} à relancer` : ''} · ${prospects.filter(p => p.converti).length} converti${prospects.filter(p => p.converti).length !== 1 ? 's' : ''}`}
            badge={aRelancer > 0 ? <span className="bg-orange-500 text-white text-xs px-2 py-0.5 rounded-full font-bold">{aRelancer}</span> : null}
            onClick={() => setView('list')}
          />
        </div>
      )}

      {view === 'list' && <ProspectsList />}
    </div>
  );
}