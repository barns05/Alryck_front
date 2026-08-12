/**
 * ContratsSection — logique partagée "Contrats" (module Juridique).
 * Consommée par ContractsPanel (vue globale, sans filtre evenement_id),
 * FacturationPanel et DocumentsDrawer (vue événement filtrée par evenement_id).
 *
 * Gère : liste filtrée avec recherche (client_nom + titre), tri (création,
 * client, date événement, statut), filtre par statut avec archivage séparé,
 * actions rapides par ligne (consulter, télécharger, imprimer, archiver,
 * supprimer), et menu de création (2 chemins). Statut manuel — pas de
 * signature électronique.
 */
import { useState, useMemo } from 'react';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { base44 } from '@/api/base44Client';
import { FileCheck, Plus, Download, Trash2, Search, Archive, ArchiveRestore, Eye, Printer, Mail } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { toast } from 'sonner';
import { CONTRAT_STATUT_COLORS } from '@/constants/colors';
import ContractModal from './ContractModal';
import ModelePickerModal from './ModelePickerModal';
import ContratCreateModal from './ContratCreateModal';
import YousignStatusBadge from './YousignStatusBadge';
import YousignSignButton from './YousignSignButton';

// ─── Helpers ───────────────────────────────────────────────────────────────────
const normalizeStr = (s) => (s || '').toLowerCase().normalize('NFD').replace(/[\u0300-\u036f]/g, '');
const getContratPdfUrl = (c) => c.contrat_signe_url || c.modele_url || null;
const getDownloadName = (c) => `${(c.titre || c.client_nom || 'contrat').replace(/[^a-zA-Z0-9-_]/g, '_')}.pdf`;

// ─── Config ────────────────────────────────────────────────────────────────────
const SORT_OPTIONS = [
  { id: 'created', label: 'Date de création' },
  { id: 'client', label: 'Nom du client (A-Z)' },
  { id: 'event', label: "Date de l'événement" },
  { id: 'statut', label: 'Statut' },
];

const STATUT_FILTERS = [
  { id: 'all', label: 'Tous' },
  { id: 'En attente de signature', label: 'En attente' },
  { id: 'Signé', label: 'Signé' },
  { id: 'Archivé', label: 'Archivé' },
];

export default function ContratsSection({ evenementId = null, evenementNom = null }) {
  const qc = useQueryClient();
  const isEventScoped = !!evenementId;

  const [showCreateMenu, setShowCreateMenu] = useState(false);
  const [contratModalOpen, setContratModalOpen] = useState(false);
  const [contratEditing, setContratEditing] = useState(null);
  const [showModelePicker, setShowModelePicker] = useState(false);
  const [modelePreselection, setModelePreselection] = useState(null);
  const [creationMode, setCreationMode] = useState(null); // 'signe' | 'a_signer' | 'modele' | null

  // Recherche / tri / filtres
  const [search, setSearch] = useState('');
  const [sortBy, setSortBy] = useState('created');
  const [statutFilter, setStatutFilter] = useState('all');
  const [showArchived, setShowArchived] = useState(false);

  const queryKey = isEventScoped ? ['contrats-evenement', evenementId] : ['contrats'];

  const { data: contrats = [] } = useQuery({
    queryKey,
    queryFn: () => isEventScoped
      ? base44.entities.Contrat.filter({ evenement_id: evenementId, type: 'client' }, '-created_date', 200)
      : base44.entities.Contrat.filter({ type: 'client' }, '-created_date', 200),
  });

  // ─── Récupération des dates d'événements pour le tri par date d'événement ────
  const evenementIds = useMemo(
    () => [...new Set(contrats.map(c => c.evenement_id).filter(Boolean))],
    [contrats]
  );

  const { data: evenements = [] } = useQuery({
    queryKey: ['evenements-for-contrats-sort', evenementIds],
    queryFn: async () => {
      const all = await base44.entities.Evenement.list('-created_date', 500);
      return all.filter(e => evenementIds.includes(e.id));
    },
    enabled: sortBy === 'event' && evenementIds.length > 0,
    staleTime: 60000,
  });

  const evenementDateMap = useMemo(() => {
    const m = {};
    evenements.forEach(e => { m[e.id] = e.date; });
    return m;
  }, [evenements]);

  // ─── Filtrage + tri ──────────────────────────────────────────────────────────
  const contratsVisibles = useMemo(() => {
    let result = [...contrats];

    // Recherche insensible à la casse et aux accents
    if (search.trim()) {
      const q = normalizeStr(search);
      result = result.filter(c =>
        normalizeStr(c.client_nom).includes(q) || normalizeStr(c.titre).includes(q)
      );
    }

    // Filtre par statut
    if (statutFilter === 'all') {
      if (!showArchived) {
        result = result.filter(c => c.statut !== 'Archivé');
      }
    } else {
      result = result.filter(c => c.statut === statutFilter);
    }

    // Tri
    switch (sortBy) {
      case 'client':
        result.sort((a, b) => normalizeStr(a.client_nom).localeCompare(normalizeStr(b.client_nom)));
        break;
      case 'event':
        result.sort((a, b) => {
          const da = evenementDateMap[a.evenement_id] || '';
          const db = evenementDateMap[b.evenement_id] || '';
          return db.localeCompare(da); // plus récent en premier
        });
        break;
      case 'statut':
        result.sort((a, b) => normalizeStr(a.statut).localeCompare(normalizeStr(b.statut)));
        break;
      case 'created':
      default:
        break; // déjà trié par -created_date depuis la requête
    }

    return result;
  }, [contrats, search, sortBy, statutFilter, showArchived, evenementDateMap]);

  // ─── Mutations ────────────────────────────────────────────────────────────────
  const deleteMutation = useMutation({
    mutationFn: (id) => base44.entities.Contrat.delete(id),
    onSuccess: () => {
      qc.invalidateQueries(['contrats']);
      qc.invalidateQueries(['contrats-evenement']);
      qc.invalidateQueries(['client-contrats']);
      qc.invalidateQueries(['outils-contrats-ev']);
      toast.success('Contrat supprimé');
    },
  });

  const archiveMutation = useMutation({
    mutationFn: ({ id, statut }) => base44.entities.Contrat.update(id, { statut }),
    onSuccess: () => {
      qc.invalidateQueries(['contrats']);
      qc.invalidateQueries(['contrats-evenement']);
      qc.invalidateQueries(['client-contrats']);
      qc.invalidateQueries(['outils-contrats-ev']);
    },
  });

  const handleArchive = (contrat) => {
    if (!window.confirm('Archiver ce contrat ?')) return;
    archiveMutation.mutate({ id: contrat.id, statut: 'Archivé' });
  };

  const handleRestore = (contrat) => {
    if (!window.confirm('Restaurer ce contrat (passer en « Signé ») ?')) return;
    archiveMutation.mutate({ id: contrat.id, statut: 'Signé' });
  };

  const sendMutation = useMutation({
    mutationFn: async (contrat) => {
      const client = await base44.entities.Client.get(contrat.client_id);
      const emails = [...new Set([client?.email, client?.email2].filter(Boolean))];
      if (emails.length === 0) throw new Error('NO_EMAIL');
      const results = await Promise.allSettled(
        emails.map(email =>
          base44.integrations.Core.SendEmail({
            to: email,
            subject: `Contrat disponible : ${contrat.titre}`,
            body: `<p>Bonjour,</p><p>Votre contrat <strong>${contrat.titre}</strong> est désormais disponible dans votre espace client.</p><p>Connectez-vous à votre espace pour le consulter.</p>`,
          })
        )
      );
      if (results.every(r => r.status === 'rejected')) throw new Error('ALL_FAILED');
    },
    onSuccess: () => toast.success('Contrat envoyé au client'),
    onError: (e) => {
      if (e?.message === 'NO_EMAIL') {
        toast.info("Le contrat est visible dans l'espace client. Aucun email enregistré pour ce client.");
      } else {
        toast.info("Le contrat est visible dans l'espace client. Le client n'est peut-être pas enregistré sur la plateforme.");
      }
    },
  });

  const openContrat = (contrat) => {
    setContratEditing(contrat);
    setContratModalOpen(true);
  };

  return (
    <div className="space-y-3">
      {/* En-tête : compte + création unifiée */}
      <div className="flex items-center justify-between gap-2">
        <p className="text-xs font-semibold uppercase tracking-wider text-muted-foreground">
          Contrats ({contratsVisibles.length})
        </p>
        <Button size="sm" className="gap-1.5" onClick={() => setShowCreateMenu(true)}>
          <Plus size={14} /> Nouveau contrat
        </Button>
      </div>

      {/* Recherche + tri */}
      <div className="flex gap-2">
        <div className="relative flex-1">
          <Search size={14} className="absolute left-2.5 top-1/2 -translate-y-1/2 text-muted-foreground pointer-events-none" />
          <input
            type="text"
            value={search}
            onChange={e => setSearch(e.target.value)}
            placeholder="Rechercher par client ou titre…"
            className="flex h-9 w-full rounded-md border border-input bg-transparent pl-8 pr-3 py-1 text-sm focus-visible:outline-none focus-visible:ring-1 focus-visible:ring-ring"
          />
        </div>
        <select
          value={sortBy}
          onChange={e => setSortBy(e.target.value)}
          className="flex h-9 rounded-md border border-input bg-transparent px-2 py-1 text-sm focus-visible:outline-none focus-visible:ring-1 focus-visible:ring-ring shrink-0"
          title="Trier par"
        >
          {SORT_OPTIONS.map(opt => (
            <option key={opt.id} value={opt.id}>{opt.label}</option>
          ))}
        </select>
      </div>

      {/* Filtres par statut + toggle archivés */}
      <div className="flex items-center gap-2 flex-wrap">
        {STATUT_FILTERS.map(f => (
          <button
            key={f.id}
            onClick={() => setStatutFilter(f.id)}
            className={`text-xs px-2.5 py-1 rounded-full border font-medium transition-colors ${
              statutFilter === f.id
                ? 'bg-primary text-primary-foreground border-primary'
                : 'bg-card text-muted-foreground border-border hover:bg-muted'
            }`}
          >
            {f.label}
          </button>
        ))}
        <label className="flex items-center gap-1.5 text-xs text-muted-foreground cursor-pointer ml-auto">
          <input
            type="checkbox"
            checked={showArchived}
            onChange={e => {
              setShowArchived(e.target.checked);
              if (!e.target.checked && statutFilter === 'Archivé') setStatutFilter('all');
            }}
            className="w-3.5 h-3.5 rounded border-input"
          />
          Afficher archivés
        </label>
      </div>

      {/* Liste */}
      {contratsVisibles.length === 0 ? (
        <div className="rounded-xl border border-dashed border-border p-4 text-center text-xs text-muted-foreground">
          {search || statutFilter !== 'all' ? 'Aucun contrat ne correspond à votre recherche' : 'Aucun contrat'}
        </div>
      ) : (
        <div className="space-y-2">
          {contratsVisibles.map(c => {
            const pdfUrl = getContratPdfUrl(c);
            const hasPdf = !!pdfUrl;
            return (
              <div
                key={c.id}
                onClick={() => openContrat(c)}
                className="bg-card rounded-xl border border-border p-3 flex items-center gap-2 hover:bg-muted/30 transition-colors cursor-pointer text-left"
              >
                <FileCheck size={16} className="text-muted-foreground shrink-0" />
                <div className="flex-1 min-w-0">
                  <p className="text-sm font-medium truncate">{c.titre || 'Contrat'}</p>
                  <p className="text-xs text-muted-foreground truncate">
                    {c.client_nom}
                    {c.evenement_nom ? ` · ${c.evenement_nom}` : ''}
                    {c.date_signature ? ` · ${c.date_signature}` : ''}
                  </p>
                </div>

                {/* Actions rapides */}
                <div className="flex items-center gap-0.5 shrink-0">
                  {c.statut !== 'Archivé' && c.modele_url && !c.contrat_signe_url && (
                    <YousignSignButton
                      contratId={c.id}
                      compact
                      onSuccess={() => {
                        qc.invalidateQueries(['contrats']);
                        qc.invalidateQueries(['contrats-evenement']);
                        qc.invalidateQueries(['client-contrats']);
                        qc.invalidateQueries(['outils-contrats-ev']);
                      }}
                    />
                  )}
                  {hasPdf ? (
                    <a
                      href={pdfUrl} target="_blank" rel="noopener noreferrer"
                      onClick={e => e.stopPropagation()}
                      title="Consulter le PDF"
                      className="p-1.5 rounded-lg hover:bg-muted text-muted-foreground hover:text-primary transition-colors"
                    >
                      <Eye size={14} />
                    </a>
                  ) : (
                    <span title="Aucun fichier PDF disponible" className="p-1.5 rounded-lg text-muted-foreground/30 cursor-not-allowed">
                      <Eye size={14} />
                    </span>
                  )}
                  {hasPdf ? (
                    <a
                      href={pdfUrl} download={getDownloadName(c)} target="_blank" rel="noopener noreferrer"
                      onClick={e => e.stopPropagation()}
                      title="Télécharger"
                      className="p-1.5 rounded-lg hover:bg-muted text-muted-foreground hover:text-primary transition-colors"
                    >
                      <Download size={14} />
                    </a>
                  ) : (
                    <span title="Aucun fichier à télécharger" className="p-1.5 rounded-lg text-muted-foreground/30 cursor-not-allowed">
                      <Download size={14} />
                    </span>
                  )}
                  {hasPdf ? (
                    <a
                      href={pdfUrl} target="_blank" rel="noopener noreferrer"
                      onClick={e => e.stopPropagation()}
                      title="Imprimer"
                      className="p-1.5 rounded-lg hover:bg-muted text-muted-foreground hover:text-primary transition-colors"
                    >
                      <Printer size={14} />
                    </a>
                  ) : (
                    <span title="Aucun fichier à imprimer" className="p-1.5 rounded-lg text-muted-foreground/30 cursor-not-allowed">
                      <Printer size={14} />
                    </span>
                  )}
                  {c.statut !== 'Archivé' ? (
                    <button
                      onClick={e => { e.stopPropagation(); handleArchive(c); }}
                      disabled={archiveMutation.isPending}
                      title="Archiver"
                      className="p-1.5 rounded-lg hover:bg-muted text-muted-foreground hover:text-amber-600 transition-colors disabled:opacity-50"
                    >
                      <Archive size={14} />
                    </button>
                  ) : (
                    <button
                      onClick={e => { e.stopPropagation(); handleRestore(c); }}
                      disabled={archiveMutation.isPending}
                      title="Restaurer (passer en Signé)"
                      className="p-1.5 rounded-lg hover:bg-muted text-muted-foreground hover:text-emerald-600 transition-colors disabled:opacity-50"
                    >
                      <ArchiveRestore size={14} />
                    </button>
                  )}
                  <button
                    onClick={e => { e.stopPropagation(); sendMutation.mutate(c); }}
                    disabled={sendMutation.isPending}
                    title="Envoyer au client"
                    className="p-1.5 rounded-lg hover:bg-muted text-muted-foreground hover:text-primary transition-colors disabled:opacity-50"
                  >
                    <Mail size={14} />
                  </button>
                  <button
                    onClick={e => { e.stopPropagation(); deleteMutation.mutate(c.id); }}
                    disabled={deleteMutation.isPending}
                    title="Supprimer"
                    className="p-1.5 rounded-lg hover:bg-muted text-muted-foreground hover:text-destructive transition-colors disabled:opacity-50"
                  >
                    <Trash2 size={14} />
                  </button>
                </div>

                {c.yousign_statut && <YousignStatusBadge statut={c.yousign_statut} />}
                <span className={`text-[10px] px-1.5 py-0.5 rounded-full font-medium border shrink-0 ${CONTRAT_STATUT_COLORS[c.statut] || 'bg-slate-100 text-slate-500 border-slate-200'}`}>
                  {c.statut}
                </span>
              </div>
            );
          })}
        </div>
      )}

      {/* Modals — consultation/édition (statut manuel) + création (2 chemins) */}
      {showCreateMenu && (
        <ContratCreateModal
          onClose={() => setShowCreateMenu(false)}
          onPickUpload={() => {
            setShowCreateMenu(false);
            setContratEditing(null);
            setModelePreselection(null);
            setCreationMode('signe');
            setContratModalOpen(true);
          }}
          onPickSigner={() => {
            setShowCreateMenu(false);
            setContratEditing(null);
            setModelePreselection(null);
            setCreationMode('a_signer');
            setContratModalOpen(true);
          }}
          onPickModele={() => {
            setShowCreateMenu(false);
            setShowModelePicker(true);
          }}
        />
      )}
      {contratModalOpen && (
        <ContractModal
          contrat={contratEditing}
          modelePreselection={modelePreselection}
          creationMode={creationMode}
          evenementId={evenementId}
          evenementNom={evenementNom}
          onClose={() => { setContratModalOpen(false); setContratEditing(null); setModelePreselection(null); setCreationMode(null); }}
        />
      )}
      {showModelePicker && (
        <ModelePickerModal
          onClose={() => setShowModelePicker(false)}
          onPick={(modele) => {
            setShowModelePicker(false);
            setContratEditing(null);
            setModelePreselection({
              modeleUrl: modele.modele_url,
              modeleId: modele.id,
              contenuDynamique: modele.contenu_dynamique || null,
              modePaiement: modele.mode_paiement || 'pourcentage',
              tauxTvaModele: modele.taux_tva_modele ?? null,
              pourcentageAcompteModele: modele.pourcentage_acompte_modele ?? null,
              baseCalculAcompteModele: modele.base_calcul_acompte_modele ?? 'TTC',
              paliersAnnulation: modele.paliers_annulation || [],
            });
            setCreationMode('modele');
            setContratModalOpen(true);
          }}
        />
      )}
    </div>
  );
}