import { useState, useEffect } from 'react';
import { useSearchParams } from 'react-router-dom';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { base44 } from '@/api/base44Client';
import { toast } from 'sonner';
import { Plus, Search, Pencil, Trash2, User, MapPin, Users, MessageSquare, SortAsc, SortDesc, Share2, FileSpreadsheet, Sparkles, MoreVertical } from 'lucide-react';
import { Link } from 'react-router-dom';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { AlertDialog, AlertDialogAction, AlertDialogCancel, AlertDialogContent, AlertDialogDescription, AlertDialogFooter, AlertDialogHeader, AlertDialogTitle } from '@/components/ui/alert-dialog';
import { DropdownMenu, DropdownMenuContent, DropdownMenuItem, DropdownMenuTrigger } from '@/components/ui/dropdown-menu';
import ArchiveTabs from '@/components/ui/ArchiveTabs';
import ClientModal from '@/components/clients/ClientModal';
import ShareClientPortalModal from '@/components/client-portal/ShareClientPortalModal';
import ImportClientsExcelModal from '@/components/clients/ImportClientsExcelModal';
import ImportClientDocumentModal from '@/components/clients/ImportClientDocumentModal';
import WelcomeImportModal from '@/components/clients/WelcomeImportModal';
import { format, parseISO } from 'date-fns';
import { TYPE_COLORS } from '@/constants/colors';
import { STATUT_EVENEMENT_DETAIL_COLORS } from '@/constants/statutColors';
import EmptyState from '@/components/EmptyState';
import EvenementDetail from '@/components/evenements/EvenementDetail';
import { EVENT_EMOJIS } from '@/lib/eventEmojis';

// Date d'un événement au format complet jour/mois/année (ex : 31/07/2026).
// Pour les dates non exactes (mois/période), on affiche le libellé lisible.
const evDateShort = (ev) => {
  if (ev.date_type === 'periode') return ev.date_periode || '';
  if (ev.date_type === 'mois' && ev.date_mois) {
    const mois = ['01', '02', '03', '04', '05', '06', '07', '08', '09', '10', '11', '12'];
    const [y, m] = ev.date_mois.split('-');
    return `${mois[parseInt(m, 10) - 1]}/${y}`;
  }
  return ev.date ? format(parseISO(ev.date), 'dd/MM/yyyy') : '';
};
import Prospects from './Prospects';

const WELCOME_KEY = 'planyse_welcome_shown';

function ClientsListe() {
  const qc = useQueryClient();
  const [search, setSearch] = useState('');
  const [modalOpen, setModalOpen] = useState(false);
  const [editClient, setEditClient] = useState(null);
  const [sortBy, setSortBy] = useState('date');
  const [sortOrder, setSortOrder] = useState('desc');
  const [sharePortalClient, setSharePortalClient] = useState(null);
  const [showExcelImport, setShowExcelImport] = useState(false);
  const [showDocImport, setShowDocImport] = useState(false);
  const [showWelcome, setShowWelcome] = useState(false);
  const [confirmDelete, setConfirmDelete] = useState(null);

  const [ongletArchive, setOngletArchive] = useState('actifs'); // 'actifs' | 'archives'
  const [expandedEventId, setExpandedEventId] = useState(null); // pastille d'événement dépliée (une seule à la fois)
  const [openedEvent, setOpenedEvent] = useState(null); // événement ouvert en modal complète depuis une pastille

  const { data: clients = [], isLoading: clientsLoading } = useQuery({
    queryKey: ['clients'],
    queryFn: () => base44.entities.Client.list('-date_evenement', 200),
  });

  const { data: evenements = [] } = useQuery({
    queryKey: ['evenements'],
    queryFn: () => base44.entities.Evenement.list('-date', 500),
  });

  // Map clientId → événements liés (triés par date desc) + événement le plus récent
  const evenementParClient = {};
  const evenementsParClient = {};
  evenements.forEach(ev => {
    if (!ev.client_id) return;
    if (!evenementParClient[ev.client_id]) evenementParClient[ev.client_id] = ev;
    if (!evenementsParClient[ev.client_id]) evenementsParClient[ev.client_id] = [];
    evenementsParClient[ev.client_id].push(ev);
  });
  Object.values(evenementsParClient).forEach(arr => arr.sort((a, b) => new Date(b.date || 0) - new Date(a.date || 0)));

  useEffect(() => {
    if (clientsLoading) return;
    const shown = localStorage.getItem(WELCOME_KEY);
    if (!shown && clients.length === 0) {
      setShowWelcome(true);
      localStorage.setItem(WELCOME_KEY, '1');
    }
  }, [clientsLoading, clients.length]);

  const archiveClient = useMutation({
    mutationFn: ({ id, archived }) => base44.entities.Client.update(id, { archived }),
    onSuccess: () => {
      qc.invalidateQueries(['clients']);
    },
  });

  const deleteClient = useMutation({
    mutationFn: async (client) => {
      const errors = [];
      // Suppression en cascade — chaque étape est tentée indépendamment pour éviter un état partiel silencieux
      const evenements = await base44.entities.Evenement.filter({ client_id: client.id });
      for (const e of evenements) {
        try { await base44.entities.Evenement.delete(e.id); } catch { errors.push(`Événement ${e.nom}`); }
      }
      const conversations = await base44.entities.Conversation.filter({ client_id: client.id });
      for (const conv of conversations) {
        try {
          const msgs = await base44.entities.Message.filter({ conversation_id: conv.id });
          await Promise.all(msgs.map(m => base44.entities.Message.delete(m.id)));
          await base44.entities.Conversation.delete(conv.id);
        } catch { errors.push(`Conversation ${conv.id}`); }
      }
      const docs = await base44.entities.ClientDocument.filter({ client_id: client.id });
      for (const d of docs) {
        try { await base44.entities.ClientDocument.delete(d.id); } catch { errors.push(`Document ${d.nom}`); }
      }
      const rdvs = await base44.entities.RendezVous.filter({ client_id: client.id });
      for (const r of rdvs) {
        try { await base44.entities.RendezVous.delete(r.id); } catch { errors.push(`RDV ${r.id}`); }
      }
      if (errors.length > 0) {
        throw new Error(`Suppression partielle : ${errors.join(', ')} — Le client n'a pas été supprimé.`);
      }
      await base44.entities.Client.delete(client.id);
    },
    onSuccess: () => {
      qc.invalidateQueries(['clients']);
      qc.invalidateQueries(['evenements']);
      qc.invalidateQueries(['conversations']);
      toast.success('Client supprimé');
    },
    onError: (err) => toast.error(`❌ ${err.message || 'Erreur lors de la suppression'}`),
  });

  const today = new Date();
  today.setHours(0, 0, 0, 0);

  const clientsActifs = clients.filter(c => !c.archived);
  const clientsArchives = clients.filter(c => c.archived);
  const baseClients = ongletArchive === 'archives' ? clientsArchives : clientsActifs;

  const filtered = baseClients.filter(c => {
    const ev = evenementParClient[c.id];
    const lieu = ev?.lieu_nom || '';
    return `${c.nom} ${c.prenom} ${lieu}`.toLowerCase().includes(search.toLowerCase());
  });

  const sorted = [...filtered].sort((a, b) => {
    let valA, valB;
    if (sortBy === 'date') {
      const evA = evenementParClient[a.id];
      const evB = evenementParClient[b.id];
      valA = evA?.date ? new Date(evA.date).getTime() : 0;
      valB = evB?.date ? new Date(evB.date).getTime() : 0;
    } else {
      valA = (a.nom || '').toLowerCase();
      valB = (b.nom || '').toLowerCase();
    }
    return sortOrder === 'asc' ? (valA > valB ? 1 : valA < valB ? -1 : 0) : (valA < valB ? 1 : valA > valB ? -1 : 0);
  });

  return (
    <div className="space-y-5">
      <ArchiveTabs
        value={ongletArchive}
        onChange={setOngletArchive}
        countActifs={clientsActifs.length}
        countArchives={clientsArchives.length}
        archiveMessage="Clients archivés — données conservées, restaurez ou supprimez définitivement"
      />

      <div className="flex items-center justify-between flex-wrap gap-3">
        <p className="text-sm text-muted-foreground">{clients.length} client{clients.length > 1 ? 's' : ''}</p>
        <div className="flex items-center gap-2">
          <DropdownMenu>
            <DropdownMenuTrigger asChild>
              <Button variant="outline" size="icon" className="h-9 w-9"><MoreVertical size={16} /></Button>
            </DropdownMenuTrigger>
            <DropdownMenuContent align="end">
              <DropdownMenuItem onClick={() => setShowExcelImport(true)} className="gap-2 cursor-pointer">
                <FileSpreadsheet size={14} /> Excel / CSV
              </DropdownMenuItem>
              <DropdownMenuItem onClick={() => setShowDocImport(true)} className="gap-2 cursor-pointer">
                <Sparkles size={14} /> Via document
              </DropdownMenuItem>
            </DropdownMenuContent>
          </DropdownMenu>
          <Button className="gap-2" onClick={() => setModalOpen(true)}><Plus size={16} /> Nouveau client</Button>
        </div>
      </div>

      <div className="flex gap-3 flex-wrap items-center">
        <div className="relative flex-1 min-w-[200px]">
          <Search size={15} className="absolute left-3 top-1/2 -translate-y-1/2 text-muted-foreground" />
          <Input className="pl-9" placeholder="Rechercher par nom, prénom, lieu..." value={search} onChange={e => setSearch(e.target.value)} />
        </div>
        <div className="flex items-center gap-2 ml-auto">
          <span className="text-xs text-muted-foreground">Trier par :</span>
          <select value={sortBy} onChange={e => setSortBy(e.target.value)} className="text-xs border border-input bg-background rounded-lg px-2 py-1.5">
            <option value="date">Date d'événement</option>
            <option value="nom">Nom</option>
          </select>
          <button onClick={() => setSortOrder(o => o === 'asc' ? 'desc' : 'asc')} className="p-1.5 rounded-lg border border-input hover:bg-muted">
            {sortOrder === 'asc' ? <SortAsc size={14} /> : <SortDesc size={14} />}
          </button>
        </div>
      </div>

      {sorted.length === 0 ? (
        <EmptyState icon={User} title="Aucun client trouvé" description={clients.length === 0 ? "Importez ou créez vos premiers clients." : "Affinez votre recherche."} actionLabel={clients.length === 0 ? "Créer un client" : undefined} onAction={clients.length === 0 ? () => setModalOpen(true) : undefined} />
      ) : (
        <div className="grid grid-cols-1 md:grid-cols-2 xl:grid-cols-3 gap-4">
          {sorted.map(c => (
            <div key={c.id} className="bg-card rounded-2xl border border-border shadow-sm p-4 space-y-3 hover:shadow-md transition-shadow">
              <div className="flex items-start justify-between">
                <div>
                  <p className="font-semibold text-base">
                    {c.prenom} {c.nom}{c.prenom2 ? ` & ${c.prenom2}${c.nom2 && c.nom2 !== c.nom ? ' ' + c.nom2 : ''}` : ''}
                  </p>
                </div>
                <div className="flex gap-1">
                  {!c.archived && <Link to={`/clients/${c.id}`} className="p-1.5 rounded-lg hover:bg-muted text-muted-foreground hover:text-foreground transition-colors"><MessageSquare size={16} /></Link>}
                  {!c.archived && <button onClick={() => { setEditClient(c); setModalOpen(true); }} className="p-1.5 rounded-lg hover:bg-muted text-muted-foreground hover:text-foreground transition-colors"><Pencil size={16} /></button>}
                  {!c.archived && evenementParClient[c.id]?.date && new Date(evenementParClient[c.id].date) < today && (
                    <button
                      onClick={() => archiveClient.mutate({ id: c.id, archived: true })}
                      title="Archiver"
                      className="p-1.5 rounded-lg hover:bg-muted text-muted-foreground hover:text-amber-600 transition-colors text-sm"
                    >🗃️</button>
                  )}
                  {c.archived && (
                    <button
                      onClick={() => archiveClient.mutate({ id: c.id, archived: false })}
                      title="Restaurer"
                      className="p-1.5 rounded-lg hover:bg-muted text-muted-foreground hover:text-emerald-600 transition-colors text-sm"
                    >↩️</button>
                  )}
                  <button onClick={() => setConfirmDelete(c)} className="p-1.5 rounded-lg hover:bg-muted text-muted-foreground hover:text-destructive transition-colors"><Trash2 size={16} /></button>
                </div>
              </div>
              <div className="space-y-1.5 text-sm text-muted-foreground">
                {evenementsParClient[c.id]?.length > 0 && (
                  <div className="flex flex-wrap gap-1.5">
                    {evenementsParClient[c.id].map(ev => {
                      const colorClass = TYPE_COLORS[ev.type_evenement] || TYPE_COLORS['Autre'];
                      const isExpanded = expandedEventId === ev.id;
                      return (
                        <button
                          key={ev.id}
                          onClick={() => setExpandedEventId(isExpanded ? null : ev.id)}
                          className={`text-xs px-2 py-1 rounded-full font-medium transition-all ${colorClass} ${isExpanded ? 'ring-2 ring-offset-1 ring-primary/40' : 'hover:opacity-90'}`}
                          title={`${ev.type_evenement || 'Événement'} — ${ev.statut || ''}`}
                        >
                          {EVENT_EMOJIS[ev.type_evenement] || '🎉'} {ev.type_evenement || 'Événement'} · {evDateShort(ev)}
                        </button>
                      );
                    })}
                  </div>
                )}
                {expandedEventId && evenementsParClient[c.id]?.some(e => e.id === expandedEventId) && (() => {
                  const ev = evenementsParClient[c.id].find(e => e.id === expandedEventId);
                  return (
                    <div className="flex flex-wrap gap-x-3 gap-y-1 text-xs text-muted-foreground bg-muted/40 rounded-lg px-2.5 py-2">
                      {ev.lieu_nom && <span className="inline-flex items-center gap-1"><MapPin size={12} />{ev.lieu_nom}</span>}
                      {ev.nb_invites > 0 && <span className="inline-flex items-center gap-1"><Users size={12} />{ev.nb_invites} invités</span>}
                      <span className={`px-1.5 py-0.5 rounded-full font-medium ${STATUT_EVENEMENT_DETAIL_COLORS[ev.statut] || ''}`}>{ev.statut}</span>
                      <button onClick={() => setOpenedEvent(ev)} className="inline-flex items-center gap-1 text-primary font-medium hover:underline ml-auto">Ouvrir l'événement →</button>
                    </div>
                  );
                })()}
                {c.telephone && <div className="flex items-center gap-2"><span className="text-base">📞</span><span>{c.telephone}</span></div>}
                {c.email && <div className="flex items-center gap-2"><span className="text-base">✉️</span><span className="truncate">{c.email}</span></div>}
              </div>
              <div className="border-t border-border pt-2">
                <button onClick={() => setSharePortalClient(c)} className="flex items-center gap-1.5 text-xs text-primary hover:underline"><Share2 size={11} /> Partager l'espace client</button>
              </div>
              {c.notes && <p className="text-xs text-muted-foreground bg-muted/50 rounded-xl px-3 py-2 line-clamp-2">{c.notes}</p>}
            </div>
          ))}
        </div>
      )}

      <AlertDialog open={!!confirmDelete} onOpenChange={open => { if (!open) setConfirmDelete(null); }}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Supprimer ce client ?</AlertDialogTitle>
            <AlertDialogDescription>Cette action supprimera définitivement <strong>{confirmDelete?.prenom} {confirmDelete?.nom}</strong> ainsi que tous ses événements, conversations et documents. Irréversible.</AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel>Annuler</AlertDialogCancel>
            <AlertDialogAction className="bg-destructive text-destructive-foreground hover:bg-destructive/90" onClick={() => { deleteClient.mutate(confirmDelete); setConfirmDelete(null); }}>Supprimer définitivement</AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>

      {modalOpen && <ClientModal client={editClient} onClose={() => { setModalOpen(false); setEditClient(null); }} />}
      {sharePortalClient && <SharePortalFromClient client={sharePortalClient} onClose={() => setSharePortalClient(null)} />}
      {showExcelImport && <ImportClientsExcelModal onClose={() => setShowExcelImport(false)} />}
      {showDocImport && <ImportClientDocumentModal onClose={() => setShowDocImport(false)} />}
      {showWelcome && <WelcomeImportModal onClose={() => setShowWelcome(false)} />}
      {openedEvent && <EvenementDetail evenement={openedEvent} onClose={() => setOpenedEvent(null)} />}
    </div>
  );
}

function SharePortalFromClient({ client, onClose }) {
  const { data: evenements = [], isLoading } = useQuery({
    queryKey: ['evenements-client', client.id],
    queryFn: () => base44.entities.Evenement.filter({ client_id: client.id }),
  });
  if (isLoading) return <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/40 backdrop-blur-sm"><div className="w-8 h-8 border-4 border-slate-200 border-t-primary rounded-full animate-spin"></div></div>;
  if (!evenements[0]) return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/40 backdrop-blur-sm p-4">
      <div className="bg-card rounded-2xl border border-border shadow-xl w-full max-w-sm p-6 space-y-4">
        <p className="font-semibold text-lg">Partager l'espace client</p>
        <p className="text-sm text-muted-foreground">Ce client n'a pas encore d'événement associé.</p>
        <button onClick={onClose} className="w-full py-2 rounded-xl border border-border text-sm hover:bg-muted transition-colors">Fermer</button>
      </div>
    </div>
  );
  return <ShareClientPortalModal evenement={evenements[0]} onClose={onClose} />;
}

const TABS = [
  { id: 'clients', label: 'Clients' },
  { id: 'prospects', label: 'Prospects' },
];

export default function Clients() {
  const [searchParams] = useSearchParams();
  const [onglet, setOnglet] = useState(
    searchParams.get('tab') || 'clients'
  );

  useEffect(() => {
    const tab = searchParams.get('tab');
    if (tab) setOnglet(tab);
  }, [searchParams]);

  return (
    <div className="p-4 md:p-6 space-y-5 max-w-4xl mx-auto pb-[calc(2rem+env(safe-area-inset-bottom)]">
      <div>
        <h2 className="text-2xl font-bold">Clients & Prospects</h2>
        <p className="text-muted-foreground text-sm mt-1">Gérez vos clients et prospects</p>
      </div>

      {/* Boutons de bascule */}
      <div className="flex gap-2">
        {TABS.map(tab => (
          <button
            key={tab.id}
            onClick={() => setOnglet(tab.id)}
            className={`flex-1 py-3 rounded-xl text-base font-bold transition-colors ${
              onglet === tab.id
                ? 'bg-primary text-white'
                : 'bg-secondary text-muted-foreground hover:bg-secondary/80'
            }`}
          >
            {tab.label}
          </button>
        ))}
      </div>

      {onglet === 'prospects' && <Prospects embedded />}
      {onglet === 'clients' && <ClientsListe />}
    </div>
  );
}