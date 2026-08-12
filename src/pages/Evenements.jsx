import { useState, useEffect, useMemo } from 'react';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { toast } from 'sonner';
import { base44 } from '@/api/base44Client';
import { Plus, Search, Calendar, Users, MapPin, Printer, Trash2, Pencil, Eye, ClipboardList, Inbox, Copy } from 'lucide-react';
import { AlertDialog, AlertDialogAction, AlertDialogCancel, AlertDialogContent, AlertDialogDescription, AlertDialogFooter, AlertDialogHeader, AlertDialogTitle } from '@/components/ui/alert-dialog';
import { useNavigate, Link } from 'react-router-dom';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { format, parseISO, isSameMonth, addMonths, startOfMonth } from 'date-fns';
import { fr } from 'date-fns/locale';
import EvenementModal from '@/components/evenements/EvenementModal';
import EvenementDetail from '@/components/evenements/EvenementDetail';
import FormulaireDrawer, { FormulaireStatutBadge } from '@/components/evenements/FormulaireDrawer';
import ProgrammeDrawer, { ProgrammeStatutBadge } from '@/components/evenements/ProgrammeDrawer';
import GenerateFichesModal from '@/components/evenements/GenerateFichesModal';
import FicheStatutBadge from '@/components/evenements/FicheStatutBadge';
import PlanTableStatutBadge from '@/components/evenements/PlanTableStatutBadge';
import PlanTablePanel from '@/components/evenements/PlanTablePanel';
import { useModules } from '@/hooks/useModules';
import { TYPE_COLORS } from '@/constants/colors';
import EmptyState from '@/components/EmptyState';
import DocumentsDrawer from '@/components/facturation/DocumentsDrawer';
import LogistiqueStatutBadge from '@/components/evenements/LogistiqueStatutBadge';
import PromoEventBadge from '@/components/evenements/PromoEventBadge';
import TachesEditModal from '@/components/evenements/TachesEditModal';
import PrintEvenementModal from '@/components/evenements/PrintEvenementModal';
import AssocierPrestataireModal from '@/components/prestataires/AssocierPrestataireModal';
import DuplicateEvenementModal from '@/components/evenements/DuplicateEvenementModal';
import PrestatairesLogosRow from '@/components/evenements/PrestatairesLogosRow';
import DateBadge from '@/components/ui/DateBadge';
import ArchiveTabs from '@/components/ui/ArchiveTabs';
import { STATUT_EVENEMENT_COLORS } from '@/constants/statutColors';

import { getEventStatus } from '@/utils/dossier';

function isEvenementFinalise(ev, formulaires, fichesService, services, assignments, logistiqueRecords) {
  const status = getEventStatus(ev, fichesService, services, assignments, [], formulaires, logistiqueRecords);
  return status.type === 'complete';
}

function TousEvenements() {
  const modules = useModules();
  const qc = useQueryClient();
  const navigate = useNavigate();
  const [search, setSearch] = useState('');
  const [modalOpen, setModalOpen] = useState(false);
  const [editing, setEditing] = useState(null);
  const [viewing, setViewing] = useState(null);
  const [viewingTab, setViewingTab] = useState('general');
  const [filterStatut, setFilterStatut] = useState('');
  const [filterMonth, setFilterMonth] = useState(null); // 'current' | 'next' | null
  const [ongletArchive, setOngletArchive] = useState('actifs'); // 'actifs' | 'archives'
  const [openFormulaireId, setOpenFormulaireId] = useState(null);
  const [openProgrammeId, setOpenProgrammeId] = useState(null);
  const [openFicheId, setOpenFicheId] = useState(null);
  const [openPlanTableId, setOpenPlanTableId] = useState(null);
  const [confirmDelete, setConfirmDelete] = useState(null);
  const [confirmArchive, setConfirmArchive] = useState(null);
  const [editTaches, setEditTaches] = useState(null);
  const [printEvenement, setPrintEvenement] = useState(null);
  const [openPrestatairesId, setOpenPrestatairesId] = useState(null);
  const [duplicateEv, setDuplicateEv] = useState(null);

  const { data: evenements = [], isLoading } = useQuery({
    queryKey: ['evenements'],
    queryFn: () => base44.entities.Evenement.list('-date', 200),
  });
  const { data: formulaires = [] } = useQuery({ queryKey: ['formulaires'], queryFn: () => base44.entities.FormulairePreparation.list('-created_date', 500) });
  const { data: fichesService = [] } = useQuery({ queryKey: ['fiches-service'], queryFn: () => base44.entities.FicheService.list('-created_date', 200) });
  const { data: services = [] } = useQuery({ queryKey: ['services'], queryFn: () => base44.entities.Service.list('-date', 500) });
  const { data: assignments = [] } = useQuery({ queryKey: ['service-assignments'], queryFn: () => base44.entities.ServiceAssignment.list('-created_date', 500) });
  const { data: logistiqueRecords = [] } = useQuery({ queryKey: ['logistique-ev-all'], queryFn: () => base44.entities.LogistiqueEvenement.list() });
  const { data: allPrestatairesEv = [] } = useQuery({ queryKey: ['evenement-prestataires-all'], queryFn: () => base44.entities.EvenementPrestataire.list() });
  const prestatairesByEvent = useMemo(() => {
    const map = {};
    for (const ep of allPrestatairesEv) {
      (map[ep.evenement_id] = map[ep.evenement_id] || []).push(ep);
    }
    return map;
  }, [allPrestatairesEv]);
  const { data: allCompanySettings = [] } = useQuery({ queryKey: ['company-settings-all'], queryFn: () => base44.entities.CompanySettings.list() });
  const settingsByPrestataire = useMemo(() => {
    const map = {};
    for (const cs of allCompanySettings) {
      if (cs.prestataire_id) map[cs.prestataire_id] = cs;
    }
    return map;
  }, [allCompanySettings]);

  useEffect(() => {
    if (!evenements.length) return;
    const params = new URLSearchParams(window.location.search);
    const openId = params.get('open');
    if (openId) {
      const ev = evenements.find(e => e.id === openId);
      if (ev) setViewing(ev);
      window.history.replaceState({}, '', window.location.pathname);
    }
  }, [evenements]);

  const deleteMutation = useMutation({
    mutationFn: (id) => base44.entities.Evenement.delete(id),
    onSuccess: () => { qc.invalidateQueries(['evenements']); toast.success('✓ Événement supprimé'); },
    onError: () => toast.error('❌ Une erreur est survenue'),
  });

  const archiveMutation = useMutation({
    mutationFn: ({ id, archived }) => base44.entities.Evenement.update(id, { archived }),
    onSuccess: () => { qc.invalidateQueries(['evenements']); },
  });


  const today = useMemo(() => new Date(), []);
  const currentMonthStart = useMemo(() => startOfMonth(today), [today]);
  const nextMonthStart = useMemo(() => startOfMonth(addMonths(today, 1)), [today]);

  const countForMonth = (monthStart) =>
    evenements.filter(e => e.date && isSameMonth(parseISO(e.date), monthStart)).length;

  const evenementsActifs = evenements.filter(ev => !ev.archived);
  const evenementsArchives = evenements.filter(ev => ev.archived);
  const baseEvenements = ongletArchive === 'archives' ? evenementsArchives : evenementsActifs;

  const filtered = baseEvenements.filter(ev => {
    const q = search.toLowerCase();
    const matchSearch = !q || ev.nom?.toLowerCase().includes(q) || ev.client_nom?.toLowerCase().includes(q) || ev.lieu_nom?.toLowerCase().includes(q);
    const matchStatut = !filterStatut || ev.statut === filterStatut;
    const matchMonth = !filterMonth
      || (filterMonth === 'current' && ev.date && isSameMonth(parseISO(ev.date), currentMonthStart))
      || (filterMonth === 'next' && ev.date && isSameMonth(parseISO(ev.date), nextMonthStart));
    return matchSearch && matchStatut && matchMonth;
  });

  const sorted = [...filtered].sort((a, b) => {
    const valA = a.date ? new Date(a.date).getTime() : 0;
    const valB = b.date ? new Date(b.date).getTime() : 0;
    return valA - valB;
  });

  // Pré-calcul mémoïsé du statut "finalisé" pour tous les événements
  const finaliseMap = useMemo(() => {
    const map = {};
    for (const ev of sorted) {
      map[ev.id] = isEvenementFinalise(ev, formulaires, fichesService, services, assignments, logistiqueRecords);
    }
    return map;
  }, [sorted, formulaires, fichesService, services, assignments, logistiqueRecords]);

  // Events possédant déjà un enregistrement LogistiqueEvenement (badge auto)
  const logistiqueEventIds = useMemo(() => new Set(logistiqueRecords.map(r => r.evenement_id)), [logistiqueRecords]);

  return (
    <div className="space-y-4 pb-24">
      <ArchiveTabs
        value={ongletArchive}
        onChange={setOngletArchive}
        countActifs={evenementsActifs.length}
        countArchives={evenementsArchives.length}
        archiveMessage="Événements archivés — données et documents conservés, restaurez ou supprimez définitivement"
      />

      {/* Ligne 1 : Compteur + bouton */}
      <div className="flex items-center justify-between gap-3">
        <p className="text-sm text-muted-foreground font-medium">{evenementsActifs.length} événement{evenementsActifs.length > 1 ? 's' : ''}</p>
        {ongletArchive === 'actifs' && (
          <Button className="gap-2" onClick={() => { setEditing(null); setModalOpen(true); }}>
            <Plus size={16} /> Nouvel événement
          </Button>
        )}
      </div>

      {/* Ligne 2 : Cartes mois en cours / mois prochain */}
      <div className="grid grid-cols-2 gap-3">
        {[
          { key: 'current', monthStart: currentMonthStart },
          { key: 'next',    monthStart: nextMonthStart },
        ].map(({ key, monthStart }) => {
          const count = countForMonth(monthStart);
          const label = format(monthStart, 'MMMM', { locale: fr });
          const year  = format(monthStart, 'yyyy');
          const active = filterMonth === key;
          return (
            <button
              key={key}
              onClick={() => setFilterMonth(active ? null : key)}
              className={`rounded-2xl border p-4 text-left transition-all ${active ? 'bg-primary text-primary-foreground border-primary shadow-md' : 'bg-card border-border hover:border-primary/40 hover:shadow-sm'}`}
            >
              <p className={`text-2xl font-bold leading-none ${active ? 'text-primary-foreground' : 'text-foreground'}`}>{count}</p>
              <p className={`text-sm mt-1 capitalize font-medium ${active ? 'text-primary-foreground/90' : 'text-foreground'}`}>{label}</p>
              <p className={`text-xs ${active ? 'text-primary-foreground/70' : 'text-muted-foreground'}`}>{year}</p>
            </button>
          );
        })}
      </div>

      {/* Ligne 3 : Recherche */}
      <div className="relative">
        <Search size={15} className="absolute left-3 top-1/2 -translate-y-1/2 text-muted-foreground" />
        <Input className="pl-9" placeholder="Rechercher par nom, client, lieu..." value={search} onChange={e => setSearch(e.target.value)} />
      </div>

      {/* Ligne 4 : Filtre statut */}
      <select
        value={filterStatut}
        onChange={e => setFilterStatut(e.target.value)}
        className="w-full h-9 rounded-md border border-input bg-background px-3 text-sm focus-visible:outline-none focus-visible:ring-1 focus-visible:ring-ring"
      >
        {['', 'À configurer', 'En attente', 'Confirmé', 'En préparation', 'Prêt', 'En cours', 'Terminé', 'Annulé'].map(s => (
          <option key={s} value={s}>{s ? `Statut : ${s}` : 'Statut : Tous'}</option>
        ))}
      </select>

      {isLoading ? (
        <div className="text-center py-12 text-muted-foreground">Chargement...</div>
      ) : sorted.length === 0 ? (
        <EmptyState icon={Inbox} title="Aucun événement" description={evenements.length === 0 ? "Créez votre premier événement." : "Aucun résultat."} actionLabel={evenements.length === 0 ? "Créer" : undefined} onAction={evenements.length === 0 ? () => setModalOpen(true) : undefined} />
      ) : (
        <div className="grid gap-3">
          {sorted.map(ev => {
            const finalise = finaliseMap[ev.id] ?? false;
            return (
              <div key={ev.id} className={`rounded-2xl border overflow-hidden transition-shadow ${openFormulaireId === ev.id ? 'shadow-md' : 'hover:shadow-md'} ${finalise ? 'bg-emerald-50 border-emerald-200' : 'bg-card border-border'}`}>
                <div className="p-4">
                  {/* Actions row */}
                  <div className="flex items-start justify-between gap-2 mb-3">
                    <div className="flex items-start gap-3 flex-1 min-w-0">
                       <DateBadge evenement={ev} date={ev.date} />
                      <div className="flex-1 min-w-0">
                        <h3 className="font-semibold text-sm leading-snug break-words">{ev.nom}</h3>
                        <div className="flex flex-wrap gap-1 mt-1">
                          {ev.type_evenement && <span className={`text-xs px-2 py-0.5 rounded-full font-medium ${TYPE_COLORS[ev.type_evenement] || TYPE_COLORS['Autre']}`}>{ev.type_evenement}</span>}
                          <span className={`text-xs px-2 py-0.5 rounded-full border font-medium ${STATUT_EVENEMENT_COLORS[ev.statut] || ''}`}>{ev.statut}</span>
                        </div>
                      </div>
                    </div>
                    <div className="flex items-center shrink-0">
                      {!ev.archived && <Button size="icon" variant="ghost" title="Voir" onClick={() => { setViewing(ev); setViewingTab('general'); }}><Eye size={15} /></Button>}
                      {!ev.archived && <Button size="icon" variant="ghost" title="Dupliquer (nouvelle occurrence)" onClick={() => setDuplicateEv(ev)}><Copy size={15} /></Button>}
                      {!ev.archived && <Button size="icon" variant="ghost" title="Modifier" onClick={() => { setEditing(ev); setModalOpen(true); }}><Pencil size={15} /></Button>}
                      {!ev.archived && <Button size="icon" variant="ghost" title="Imprimer" onClick={() => setPrintEvenement(ev)}><Printer size={15} /></Button>}
                      {!ev.archived && ['Terminé', 'Annulé'].includes(ev.statut) && (
                        <Button size="icon" variant="ghost" title="Archiver" className="text-amber-500 hover:text-amber-600" onClick={() => setConfirmArchive(ev)}>
                          <span className="text-sm">🗃️</span>
                        </Button>
                      )}
                      {ev.archived && (
                        <Button size="icon" variant="ghost" title="Restaurer" className="text-emerald-600 hover:text-emerald-700" onClick={() => archiveMutation.mutate({ id: ev.id, archived: false })}>
                          <span className="text-sm">↩️</span>
                        </Button>
                      )}
                      <Button size="icon" variant="ghost" className="text-destructive hover:text-destructive" title="Supprimer" onClick={() => setConfirmDelete(ev)}><Trash2 size={15} /></Button>
                    </div>
                  </div>
                  {/* Infos */}
                  <div className="flex flex-wrap gap-x-3 gap-y-1 text-xs text-muted-foreground mb-2">
                    {ev.client_nom && ev.client_id && <Link to={`/clients/${ev.client_id}`} className="flex items-center gap-1 hover:text-primary transition-colors"><Users size={11} />{ev.client_nom}</Link>}
                    {ev.client_nom && !ev.client_id && <span className="flex items-center gap-1"><Users size={11} />{ev.client_nom}</span>}
                    {ev.lieu_nom && <span className="flex items-center gap-1 min-w-0"><MapPin size={11} /><span className="truncate">{ev.lieu_nom}</span></span>}
                    {(() => { const total = (ev.nb_adultes || 0) + (ev.nb_adolescents || 0) + (ev.nb_enfants || 0); const nb = total > 0 ? total : ev.nb_invites; return nb > 0 ? <span className="flex items-center gap-1"><Users size={11} />{nb} invités</span> : null; })()}
                    {ev.heure_debut && <span className="flex items-center gap-1"><Calendar size={11} />{ev.heure_debut}–{ev.heure_fin}</span>}
                  </div>
                  {ev.statut === 'À configurer' && (
                    <div className="mb-2 flex items-center gap-2 flex-wrap">
                      {!['mois', 'periode'].includes(ev.date_type) ? (
                        <button onClick={e => { e.stopPropagation(); navigate(`/configurer-evenement?id=${ev.id}`); }} className="flex items-center gap-2 text-xs bg-orange-100 text-orange-700 border border-orange-200 px-3 py-1.5 rounded-lg font-medium hover:bg-orange-200 transition-colors">
                          ⚙️ Configurer l'événement →
                        </button>
                      ) : (
                        <>
                          <span
                            className="flex items-center gap-2 text-xs bg-muted text-muted-foreground border border-border px-3 py-1.5 rounded-lg font-medium cursor-not-allowed opacity-60"
                            title="La date doit être fixée (mode exact) avant de configurer l'événement"
                          >
                            🔒 Configurer l'événement
                          </span>
                          <button
                            onClick={e => { e.stopPropagation(); setEditing(ev); setModalOpen(true); }}
                            className="flex items-center gap-1.5 text-xs text-primary hover:text-primary/80 font-medium"
                            title="Fixer la date exacte"
                          >
                            📅 Fixer la date d'abord
                          </button>
                        </>
                      )}
                    </div>
                  )}
                  {/* Badges modules */}
                  <div className="flex flex-wrap gap-2">
                    {modules.formulaire && ev.taches_requises?.formulaire !== false && <button onClick={() => { setOpenFormulaireId(openFormulaireId === ev.id ? null : ev.id); setOpenProgrammeId(null); setOpenFicheId(null); setOpenPlanTableId(null); }} className="flex items-center gap-1 text-xs font-medium text-muted-foreground hover:text-foreground transition-colors"><ClipboardList size={12} />Questionnaire : <FormulaireStatutBadge evenementId={ev.id} /></button>}
                    {modules.programme && ev.taches_requises?.programme !== false && <button onClick={() => { setOpenProgrammeId(openProgrammeId === ev.id ? null : ev.id); setOpenFormulaireId(null); setOpenFicheId(null); setOpenPlanTableId(null); }} className="flex items-center gap-1 text-xs font-medium text-muted-foreground hover:text-foreground transition-colors">🗓️ Programme horaire : <ProgrammeStatutBadge evenement={ev} /></button>}
                    {modules.fiche_service && ev.taches_requises?.fiche_service !== false && <button onClick={() => { setOpenFicheId(ev.id); }} className="flex items-center gap-1 text-xs font-medium text-muted-foreground hover:text-foreground transition-colors">📋 Fiche service : <FicheStatutBadge evenementId={ev.id} /></button>}
                    {modules.plan_table && ev.plan_table_actif !== false && ev.taches_requises?.plan_table !== false && <button onClick={() => { setOpenPlanTableId(openPlanTableId === ev.id ? null : ev.id); setOpenFormulaireId(null); setOpenProgrammeId(null); setOpenFicheId(null); }} className="flex items-center gap-1 text-xs font-medium text-muted-foreground hover:text-foreground transition-colors">🗺️ Plan de table : <PlanTableStatutBadge evenement={ev} /></button>}
                    <span className="flex items-center gap-1 text-xs font-medium text-muted-foreground">🧾 Facturation &amp; docs : <DocumentsDrawer evenement={ev} /></span>
                    {modules.logistique && (ev.taches_requises?.logistique === true || logistiqueEventIds.has(ev.id)) && <button onClick={() => { setViewing(ev); setViewingTab('logistique'); }} className="flex items-center gap-1 text-xs font-medium text-muted-foreground hover:text-foreground transition-colors">🚚 Logistique : <LogistiqueStatutBadge evenementId={ev.id} onClick={() => {}} /></button>}
                    <PromoEventBadge evenementId={ev.id} />
                  </div>
                  {modules.prestataires !== false && !ev.archived && (prestatairesByEvent[ev.id] || []).some(p => p.statut === 'Confirmé') && (
                    <div className="flex items-center gap-2 mt-3 pt-3 border-t border-border/60">
                      <span className="text-sm shrink-0" title="Prestataires confirmés">👥</span>
                      <PrestatairesLogosRow prestatairesEv={prestatairesByEvent[ev.id] || []} compact size={26} settingsMap={settingsByPrestataire} />
                    </div>
                  )}
                </div>
                {openFormulaireId === ev.id && <FormulaireDrawer evenement={ev} onClose={() => setOpenFormulaireId(null)} />}
                {openProgrammeId === ev.id && <ProgrammeDrawer evenement={ev} onClose={() => setOpenProgrammeId(null)} />}
                {openPlanTableId === ev.id && <PlanTablePanel evenement={ev} onClose={() => { setOpenPlanTableId(null); }} onUpdated={() => { qc.invalidateQueries(['evenements']); setOpenPlanTableId(null); }} />}
              </div>
            );
          })}
        </div>
      )}

      <AlertDialog open={!!confirmDelete} onOpenChange={open => { if (!open) setConfirmDelete(null); }}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Supprimer cet événement ?</AlertDialogTitle>
            <AlertDialogDescription>Voulez-vous vraiment supprimer <strong>{confirmDelete?.nom}</strong> ? Cette action est irréversible.</AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel>Annuler</AlertDialogCancel>
            <AlertDialogAction className="bg-destructive text-destructive-foreground hover:bg-destructive/90" onClick={() => { deleteMutation.mutate(confirmDelete.id); setConfirmDelete(null); }}>Supprimer</AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>

      <AlertDialog open={!!confirmArchive} onOpenChange={open => { if (!open) setConfirmArchive(null); }}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Archiver cet événement ?</AlertDialogTitle>
            <AlertDialogDescription>
              <strong>{confirmArchive?.nom}</strong> restera consultable dans l'historique du client mais disparaîtra de la liste principale.
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel>Annuler</AlertDialogCancel>
            <AlertDialogAction className="bg-amber-500 text-white hover:bg-amber-600" onClick={() => { archiveMutation.mutate({ id: confirmArchive.id, archived: true }); setConfirmArchive(null); }}>Archiver</AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>

      {modalOpen && <EvenementModal evenement={editing} onClose={() => { setModalOpen(false); setEditing(null); }} />}
      {viewing && <EvenementDetail evenement={viewing} initialTab={viewingTab} onClose={() => { setViewing(null); setViewingTab('general'); }} onEdit={(ev) => { setViewing(null); setEditing(ev); setModalOpen(true); }} />}
      {openFicheId && <GenerateFichesModal evenement={sorted.find(e => e.id === openFicheId) || evenements.find(e => e.id === openFicheId)} onClose={() => setOpenFicheId(null)} />}
      {editTaches && <TachesEditModal evenement={editTaches} onClose={() => setEditTaches(null)} />}
      {printEvenement && <PrintEvenementModal evenement={printEvenement} onClose={() => setPrintEvenement(null)} />}
      {openPrestatairesId && <AssocierPrestataireModal evenement={sorted.find(e => e.id === openPrestatairesId) || evenements.find(e => e.id === openPrestatairesId)} onClose={() => setOpenPrestatairesId(null)} />}
      {duplicateEv && <DuplicateEvenementModal evenement={duplicateEv} onClose={() => setDuplicateEv(null)} />}
    </div>
  );
}

export default function Evenements() {
  return (
    <div className="p-4 md:p-6 space-y-5 max-w-4xl mx-auto pb-24 overflow-x-hidden">
      <div>
        <h2 className="text-2xl font-bold">Événements</h2>
        <p className="text-muted-foreground text-sm mt-1">Gérez vos événements et leur préparation</p>
      </div>
      <TousEvenements />
    </div>
  );
}