import { useState } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { base44 } from '@/api/base44Client';
import { Plus, FileText, Search, Download, RefreshCw, Settings, Archive, RotateCcw, Trash2, ClipboardList, Receipt, MoreVertical, Filter, FileMinus, BarChart3, ArrowLeft, Loader2 } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { toast } from 'sonner';
import { format, parseISO, isPast, isWithinInterval, isThisMonth } from 'date-fns';
import { fr } from 'date-fns/locale';
import DevisModal from '@/components/facturation/DevisModal';
import { exportDevisPDFBlob } from '@/components/facturation/exportDevisPDF';
import { DOCUMENT_TYPE_COLORS, DOCUMENT_STATUT_COLORS } from '@/constants/colors';
import EmptyState from '@/components/EmptyState';
import TableauDeBordFinancier from '@/components/facturation/TableauDeBordFinancier';
import SuperPDPStatusBadge from '@/components/facturation/SuperPDPStatusBadge';
import SuperPDPTransmitButton from '@/components/facturation/SuperPDPTransmitButton';
import { useOwnerCompanySettings } from '@/hooks/useOwnerCompanySettings';


export default function Facturation() {
  const qc = useQueryClient();
  const [view, setView] = useState('accueil'); // 'accueil' | 'documents' | 'tableau'
  const navigate = useNavigate();
  const [sectionFacture, setSectionFacture] = useState('devis'); // 'devis' | 'facturation'
  const [search, setSearch] = useState('');
  const [filterType, setFilterType] = useState('');
  const [filterStatut, setFilterStatut] = useState('');
  const [filterPeriode, setFilterPeriode] = useState('');
  const [ongletArchive, setOngletArchive] = useState('actifs'); // 'actifs' | 'archives'
  const [devisModalOpen, setDevisModalOpen] = useState(false);
  const [selectedDevisId, setSelectedDevisId] = useState(null);
  const [initialTypeDocument, setInitialTypeDocument] = useState(null);
  const [showFiltres, setShowFiltres] = useState(false);
  const [openMenuId, setOpenMenuId] = useState(null);
  const [showCreateMenu, setShowCreateMenu] = useState(false);
  const [showFactureNatures, setShowFactureNatures] = useState(false);
  const [modalSectionOverride, setModalSectionOverride] = useState(null);
  const [generatingPdfId, setGeneratingPdfId] = useState(null);

  const { data: devisList = [], refetch } = useQuery({
    queryKey: ['tous-devis'],
    queryFn: () => base44.entities.Devis.list('-date_devis', 1500),
  });

  const archiveDevis = useMutation({
    mutationFn: ({ id, archived }) => base44.entities.Devis.update(id, { archived }),
    onSuccess: () => { qc.invalidateQueries(['tous-devis']); refetch(); },
  });

  const deleteDevis = useMutation({
    mutationFn: (id) => base44.entities.Devis.delete(id),
    onSuccess: () => { qc.invalidateQueries(['tous-devis']); refetch(); },
  });

  const { data: echeances = [] } = useQuery({
    queryKey: ['toutes-echeances'],
    queryFn: () => base44.entities.Echeance.list('-created_date', 500),
  });

  const { settings } = useOwnerCompanySettings();
  const assujetti = settings?.assujetti_tva !== false;

  const { data: evenements = [] } = useQuery({
    queryKey: ['evenements-facturation'],
    queryFn: () => base44.entities.Evenement.list('-date', 1000),
  });

  // --- KPIs légers pour le badge onglet ---
  const enRetardList = echeances.filter(e => e.statut === 'En attente' && e.date_prevue && isPast(parseISO(e.date_prevue)));
  const totalEnRetard = enRetardList.reduce((s, e) => s + (e.montant_calcule || 0), 0);

  const now = new Date();
  const devisActifs = devisList.filter(d => !d.archived);
  const devisArchives = devisList.filter(d => d.archived);
  const baseDevis = ongletArchive === 'archives' ? devisArchives : devisActifs;

  // ── Cartes de l'écran d'accueil (extensible : ajouter une entrée ici) ──
  const CARDS = [
    { id: 'documents', label: 'Documents', icon: ClipboardList, color: 'bg-primary/10 text-primary', sub: `${devisActifs.length} document${devisActifs.length !== 1 ? 's' : ''} actif${devisActifs.length !== 1 ? 's' : ''}`, badge: null },
    { id: 'tableau', label: 'Tableau de bord', icon: BarChart3, color: 'bg-violet-100 text-violet-600', sub: 'CA, encaissements, analyse par période', badge: totalEnRetard > 0 ? '!' : null },
    { id: 'parametres', label: 'Paramètres', icon: Settings, color: 'bg-amber-100 text-amber-600', sub: 'Numérotation, mentions légales, TVA' },
  ];

  // --- Filtres documents ---
  const PERIODES = [
    { label: 'Toutes', value: '' },
    { label: 'Ce mois', value: 'mois' },
    { label: 'Ce trimestre', value: 'trimestre' },
    { label: 'Cette année', value: 'annee' },
  ];

  const TYPES_DEVIS = ['Devis'];
  const TYPES_FACTURATION = ["Facture d'acompte", 'Facture intermédiaire', 'Facture', 'Avoir', 'Solde'];

  // Niveau 1 — 3 familles de documents (chips de taille uniforme, une par ligne)
  // Devis = blue, Facture = emerald, Avoir = orange (couleurs cohérentes avec DOCUMENT_TYPE_COLORS)
  const TYPES_GROUPES = [
    { label: 'Devis', section: 'devis', typeDocument: 'Devis', chipClass: 'bg-blue-50 text-blue-700 border-blue-200' },
    { label: 'Facture', section: 'facturation', typeDocument: null, hasNatures: true, chipClass: 'bg-emerald-50 text-emerald-600 border-emerald-200' },
    { label: 'Avoir', section: 'facturation', typeDocument: 'Avoir', chipClass: 'bg-orange-50 text-orange-700 border-orange-200' },
  ];

  // Niveau 2 — natures de facture (dégradé emerald du plus foncé au plus clair, cycle de vie)
  // Facture classique = Facture, Facture de solde = Solde (valeurs type_document existantes)
  const NATURES_FACTURE = [
    { label: 'Facture classique', typeDocument: 'Facture', chipClass: 'bg-emerald-50 text-emerald-800 border-emerald-200' },
    { label: "Facture d'acompte", typeDocument: "Facture d'acompte", chipClass: 'bg-emerald-50 text-emerald-600 border-emerald-200' },
    { label: 'Facture intermédiaire', typeDocument: 'Facture intermédiaire', chipClass: 'bg-emerald-50 text-emerald-500 border-emerald-200' },
    { label: 'Facture de solde', typeDocument: 'Solde', chipClass: 'bg-emerald-50 text-emerald-300 border-emerald-200' },
  ];

  // Filtre par section : Devis (type Devis uniquement) vs Facturation (tous les types factures/avoir/solde)
  const bySection = baseDevis.filter(d => {
    return sectionFacture === 'devis'
      ? TYPES_DEVIS.includes(d.type_document || 'Devis')
      : TYPES_FACTURATION.includes(d.type_document);
  });

  const filtered = bySection.filter(d => {
    const q = search.toLowerCase();
    const matchSearch = !q || (d.client_nom || '').toLowerCase().includes(q) || (d.numero || '').toLowerCase().includes(q) || (d.numero_provisoire || '').toLowerCase().includes(q);
    const matchType = !filterType || d.type_document === filterType;
    const matchStatut = !filterStatut || d.statut === filterStatut;
    let matchPeriode = true;
    if (filterPeriode === 'mois' && d.date_devis) matchPeriode = isThisMonth(parseISO(d.date_devis));
    if (filterPeriode === 'trimestre' && d.date_devis) {
      const m = now.getMonth();
      const q = Math.floor(m / 3) * 3;
      matchPeriode = isWithinInterval(parseISO(d.date_devis), { start: new Date(now.getFullYear(), q, 1), end: new Date(now.getFullYear(), q + 3, 0) });
    }
    if (filterPeriode === 'annee' && d.date_devis) matchPeriode = parseISO(d.date_devis).getFullYear() === now.getFullYear();
    return matchSearch && matchType && matchStatut && matchPeriode;
  });

  const activeFiltersCount = [filterType, filterStatut, filterPeriode].filter(Boolean).length;

  const openDevis = (id = null, typeDocument = null, sectionOverride = null) => {
    setSelectedDevisId(id);
    setInitialTypeDocument(typeDocument);
    setModalSectionOverride(sectionOverride);
    setDevisModalOpen(true);
  };

  const handlePdf = async (d) => {
    if (generatingPdfId) return;
    if (d.pdf_url) { window.open(d.pdf_url, '_blank'); return; }
    setGeneratingPdfId(d.id);
    try {
      const echeances = await base44.entities.Echeance.filter({ devis_id: d.id }).catch(() => []);
      const pdfBlob = await exportDevisPDFBlob({ devis: d, echeances, company: settings });
      const pdfFile = new File([pdfBlob], `devis-${d.numero || d.id}.pdf`, { type: 'application/pdf' });
      const { file_url: pdfUrl } = await base44.integrations.Core.UploadFile({ file: pdfFile });
      await base44.entities.Devis.update(d.id, { pdf_url: pdfUrl });
      qc.invalidateQueries(['tous-devis']);
      window.open(pdfUrl, '_blank');
    } catch (err) {
      toast.error('Impossible de générer le PDF : ' + (err?.message || 'erreur'));
    } finally {
      setGeneratingPdfId(null);
    }
  };

  const handleDevisSaved = (action, ...args) => {
    refetch();
    if (action === 'open') {
      // Réouverture avec conversion (Avoir, Facture)
      const [srcId, typeDocument] = args;
      openDevis(srcId, typeDocument);
    } else if (action === 'duplicate') {
      // Duplication : ouvrir un nouveau document vierge pré-rempli depuis la source
      const [sourceDevis] = args;
      // On passe par openDevis sans id — DevisModal créera un nouveau brouillon
      // Les props clientNom etc. ne sont pas dispo ici, donc on ouvre via typeDocument='duplicate'
      openDevis(sourceDevis.id, 'duplicate');
    }
    // sinon : simple save → refetch déjà fait
  };

  return (
    <div className="p-4 md:p-6 space-y-5 max-w-7xl mx-auto pb-[calc(2rem+env(safe-area-inset-bottom)]">
      {/* ───────────── Écran d'accueil ───────────── */}
      {view === 'accueil' && (
        <div className="space-y-4">
          <h2 className="text-2xl font-bold">Facturation</h2>
          <div className="flex flex-col gap-3">
            {CARDS.map(card => {
              const Icon = card.icon;
              return (
                <button
                  key={card.id}
                  onClick={() => card.id === 'parametres' ? navigate('/parametres-entreprise?advanced=facturation') : setView(card.id)}
                  className="flex items-center gap-4 bg-card rounded-2xl border border-border p-4 text-left hover:bg-muted/30 transition-colors"
                >
                  <div className={`w-11 h-11 rounded-xl flex items-center justify-center shrink-0 ${card.color}`}>
                    <Icon size={20} />
                  </div>
                  <div className="flex-1 min-w-0">
                    <p className="font-semibold">{card.label}</p>
                    <p className="text-sm text-muted-foreground">{card.sub}</p>
                  </div>
                  {card.badge && (
                    <span className="bg-red-500 text-white text-[10px] px-1.5 py-0.5 rounded-full font-bold">{card.badge}</span>
                  )}
                </button>
              );
            })}
          </div>
        </div>
      )}

      {/* ───────────── Section Documents ───────────── */}
      {view === 'documents' && (
        <>
        {/* Header section : retour + titre + création */}
        <div className="flex items-center justify-between flex-wrap gap-3">
          <div className="flex items-center gap-2">
            <button onClick={() => setView('accueil')} className="p-1.5 rounded-lg hover:bg-muted text-muted-foreground hover:text-foreground transition-colors">
              <ArrowLeft size={18} />
            </button>
            <div>
              <h2 className="text-2xl font-bold">Documents</h2>
              <p className="text-sm text-muted-foreground mt-0.5">{bySection.length} document{bySection.length !== 1 ? 's' : ''} dans « {sectionFacture === 'devis' ? 'Devis' : 'Facturation'} »</p>
            </div>
          </div>
          {ongletArchive === 'actifs' && (
            <div className="relative">
              <Button className="gap-1.5" onClick={() => setShowCreateMenu(v => !v)}>
                <Plus size={15} /> Créer un document
              </Button>
              {showCreateMenu && (
                <>
                  <div className="fixed inset-0 z-10" onClick={() => { setShowCreateMenu(false); setShowFactureNatures(false); }} />
                  <div className="absolute left-0 top-11 z-20 bg-card border border-border rounded-xl shadow-lg p-3 w-[calc(100vw-2rem)] max-w-[280px]">
                    {!showFactureNatures ? (
                      <>
                        <p className="text-[10px] font-semibold uppercase tracking-wider text-muted-foreground mb-2 px-1">Type de document</p>
                        <div className="flex flex-col gap-1.5">
                          {TYPES_GROUPES.map(chip => (
                            <button
                              key={chip.label}
                              onClick={() => {
                                if (chip.hasNatures) {
                                  setShowFactureNatures(true);
                                } else {
                                  openDevis(null, chip.typeDocument, chip.section);
                                  setShowCreateMenu(false);
                                }
                              }}
                              className={`w-full text-center px-4 py-2.5 rounded-full border text-sm font-medium transition-colors hover:brightness-95 ${chip.chipClass}`}
                            >
                              {chip.label}
                            </button>
                          ))}
                        </div>
                      </>
                    ) : (
                      <>
                        <button
                          onClick={() => setShowFactureNatures(false)}
                          className="flex items-center gap-1 text-xs text-muted-foreground hover:text-foreground mb-2 px-1 transition-colors"
                        >
                          <ArrowLeft size={14} /> Retour
                        </button>
                        <p className="text-[10px] font-semibold uppercase tracking-wider text-muted-foreground mb-2 px-1">Nature de la facture</p>
                        <div className="flex flex-col gap-1.5">
                          {NATURES_FACTURE.map(nature => (
                            <button
                              key={nature.label}
                              onClick={() => {
                                openDevis(null, nature.typeDocument, 'facturation');
                                setShowCreateMenu(false);
                                setShowFactureNatures(false);
                              }}
                              className={`w-full text-center px-4 py-2.5 rounded-full border text-sm font-medium transition-colors hover:brightness-95 ${nature.chipClass}`}
                            >
                              {nature.label}
                            </button>
                          ))}
                        </div>
                      </>
                    )}
                  </div>
                </>
              )}
            </div>
          )}
        </div>

      {/* Barre unifiée : section (gauche) + archive toggle inline */}
      <div className="flex items-center justify-between flex-wrap gap-2 border-b border-border pb-2">
        <div className="flex items-center gap-3">
          <div className="inline-flex rounded-xl bg-muted p-1">
            <button
              onClick={() => { setSectionFacture('devis'); setFilterType(''); }}
              className={`flex items-center gap-1.5 px-4 py-1.5 rounded-lg text-sm font-semibold transition-colors ${sectionFacture === 'devis' ? 'bg-card text-primary shadow' : 'text-muted-foreground hover:text-foreground'}`}
            >
              <ClipboardList size={14} /> Devis
            </button>
            <button
              onClick={() => { setSectionFacture('facturation'); setFilterType(''); }}
              className={`flex items-center gap-1.5 px-4 py-1.5 rounded-lg text-sm font-semibold transition-colors ${sectionFacture === 'facturation' ? 'bg-card text-primary shadow' : 'text-muted-foreground hover:text-foreground'}`}
            >
              <Receipt size={14} /> Facturation
            </button>
          </div>
          {/* Toggle Actifs/Archivés discret inline */}
          <select
            value={ongletArchive}
            onChange={e => setOngletArchive(e.target.value)}
            className="h-7 rounded-lg border border-input bg-background px-2 text-xs font-medium focus-visible:outline-none focus-visible:ring-1 focus-visible:ring-ring"
          >
            <option value="actifs">Actifs ({devisActifs.length})</option>
            <option value="archives">Archivés ({devisArchives.length})</option>
          </select>
        </div>
      </div>
        <div className="space-y-4">
          {/* Filtres : recherche visible + bouton Filtres avec popover */}
          <div className="flex flex-wrap gap-3 items-center">
            <div className="relative flex-1 min-w-[200px]">
              <Search size={14} className="absolute left-3 top-1/2 -translate-y-1/2 text-muted-foreground" />
              <Input value={search} onChange={e => setSearch(e.target.value)} placeholder="Rechercher par client ou n°…" className="pl-9 h-9" />
            </div>
            <div className="relative">
              <Button variant="outline" size="sm" className="gap-1.5 h-9" onClick={() => setShowFiltres(v => !v)}>
                <Filter size={14} /> Filtres
                {activeFiltersCount > 0 && (
                  <span className="bg-primary text-primary-foreground text-[10px] px-1.5 py-0.5 rounded-full font-bold">{activeFiltersCount}</span>
                )}
              </Button>
              {showFiltres && (
                <>
                  <div className="fixed inset-0 z-10" onClick={() => setShowFiltres(false)} />
                  <div className="absolute right-0 top-11 z-20 bg-card border border-border rounded-xl shadow-lg p-4 space-y-3 min-w-[220px]">
                    <div>
                      <label className="text-xs font-medium text-muted-foreground mb-1 block">Type</label>
                      <select value={filterType} onChange={e => setFilterType(e.target.value)} className="h-9 w-full rounded-lg border border-input bg-background px-3 text-sm">
                        <option value="">Tous les types</option>
                        {(sectionFacture === 'devis' ? TYPES_DEVIS : TYPES_FACTURATION).map(t => <option key={t} value={t}>{t}</option>)}
                      </select>
                    </div>
                    <div>
                      <label className="text-xs font-medium text-muted-foreground mb-1 block">Statut</label>
                      <select value={filterStatut} onChange={e => setFilterStatut(e.target.value)} className="h-9 w-full rounded-lg border border-input bg-background px-3 text-sm">
                        <option value="">Tous les statuts</option>
                        {Object.keys(DOCUMENT_STATUT_COLORS).map(s => <option key={s} value={s}>{s}</option>)}
                      </select>
                    </div>
                    <div>
                      <label className="text-xs font-medium text-muted-foreground mb-1 block">Période</label>
                      <select value={filterPeriode} onChange={e => setFilterPeriode(e.target.value)} className="h-9 w-full rounded-lg border border-input bg-background px-3 text-sm">
                        {PERIODES.map(p => <option key={p.value} value={p.value}>{p.label}</option>)}
                      </select>
                    </div>
                    {activeFiltersCount > 0 && (
                      <button onClick={() => { setFilterType(''); setFilterStatut(''); setFilterPeriode(''); }} className="text-xs text-muted-foreground hover:text-foreground underline">
                        Réinitialiser les filtres
                      </button>
                    )}
                  </div>
                </>
              )}
            </div>
          </div>

          {/* Total filtré */}
          {filtered.length > 0 && (
            <div className="flex justify-end">
              <p className="text-sm text-muted-foreground">
                {filtered.length} document{filtered.length > 1 ? 's' : ''} · Total{assujetti ? ' TTC' : ''} :
                <span className="font-bold text-foreground ml-1">
                  {filtered.reduce((s, d) => s + (d.total_ttc || 0), 0).toLocaleString('fr-FR', { minimumFractionDigits: 2 })} €
                </span>
              </p>
            </div>
          )}

          {/* Tableau */}
          {filtered.length === 0 ? (
            <EmptyState
              icon={FileText}
              title="Aucun document trouvé"
              description={devisList.length === 0 ? "Créez votre premier document de facturation pour commencer." : "Affinez votre recherche ou modifiez les filtres."}
              actionLabel={devisList.length === 0 ? "Créer un document" : undefined}
              onAction={devisList.length === 0 ? () => openDevis() : undefined}
            />
          ) : (
            <div className="bg-card rounded-2xl border border-border overflow-hidden">
              <div className="overflow-x-auto">
                <table className="w-full text-sm">
                  <thead className="bg-muted/50 border-b border-border">
                    <tr>
                      <th className="text-left px-4 py-3 font-semibold text-xs uppercase tracking-wider text-muted-foreground">N°</th>
                      <th className="text-left px-4 py-3 font-semibold text-xs uppercase tracking-wider text-muted-foreground">Type</th>
                      <th className="text-left px-4 py-3 font-semibold text-xs uppercase tracking-wider text-muted-foreground">Client</th>
                      <th className="text-left px-4 py-3 font-semibold text-xs uppercase tracking-wider text-muted-foreground">Date</th>
                      <th className="text-right px-4 py-3 font-semibold text-xs uppercase tracking-wider text-muted-foreground">Total {assujetti ? 'TTC' : ''}</th>
                      <th className="text-center px-4 py-3 font-semibold text-xs uppercase tracking-wider text-muted-foreground">Statut</th>
                      <th className="px-2 py-3 w-10"></th>
                      <th className="px-4 py-3"></th>
                    </tr>
                  </thead>
                  <tbody>
                    {filtered.map((d, i) => (
                      <tr
                        key={d.id}
                        onClick={() => !d.archived && openDevis(d.id)}
                        className={`border-b border-border/50 last:border-0 hover:bg-muted/30 ${!d.archived ? 'cursor-pointer' : ''} transition-colors ${i % 2 === 0 ? '' : 'bg-muted/10'}`}
                      >
                        <td className="px-4 py-3 font-mono text-xs">
                          {d.est_pro_forma ? (
                            <span className="text-primary">{d.numero_provisoire || '—'}</span>
                          ) : (
                            <span className="text-muted-foreground">{d.numero || '—'}</span>
                          )}
                        </td>
                        <td className="px-4 py-3">
                          <div className="flex items-center gap-1.5 flex-wrap">
                            <span className={`text-xs px-2 py-0.5 rounded-full font-medium ${DOCUMENT_TYPE_COLORS[d.type_document] || 'bg-slate-100 text-slate-600'}`}>
                              {d.type_document || 'Devis'}
                            </span>
                            {d.est_pro_forma && (
                              <span className="text-[10px] px-1.5 py-0.5 rounded-full bg-primary/10 text-primary border border-primary/30 font-bold">PF</span>
                            )}
                          </div>
                        </td>
                        <td className="px-4 py-3">
                          <p className="font-medium">{d.client_nom || '—'}</p>
                          {d.objet && <p className="text-xs text-muted-foreground mt-0.5 truncate max-w-[200px]">{d.objet}</p>}
                        </td>
                        <td className="px-4 py-3 text-muted-foreground">
                          {d.date_devis ? format(parseISO(d.date_devis), 'd MMM yyyy', { locale: fr }) : '—'}
                        </td>
                        <td className="px-4 py-3 text-right font-bold text-primary">
                          {(d.total_ttc || 0).toLocaleString('fr-FR', { minimumFractionDigits: 2 })} €
                          {assujetti && (
                            <p className="text-xs font-normal text-muted-foreground mt-0.5">
                              {(d.total_ht || 0).toLocaleString('fr-FR', { minimumFractionDigits: 2 })} € HT
                            </p>
                          )}
                        </td>
                        <td className="px-4 py-3 text-center">
                          <div className="flex items-center justify-center gap-1 flex-wrap">
                            <span className={`text-xs px-2.5 py-0.5 rounded-full font-medium ${DOCUMENT_STATUT_COLORS[d.statut] || ''}`}>
                              {d.statut || 'Brouillon'}
                            </span>
                            <SuperPDPStatusBadge statut={d.superpdp_statut} />
                          </div>
                        </td>
                        <td className="px-2 py-3 text-center" onClick={e => e.stopPropagation()}>
                          <div className="flex items-center justify-center gap-1">
                            <button
                              onClick={() => handlePdf(d)}
                              disabled={generatingPdfId === d.id}
                              title="Télécharger le PDF"
                              className="inline-flex p-1 rounded hover:bg-muted text-muted-foreground hover:text-primary transition-colors disabled:opacity-50"
                            >
                              {generatingPdfId === d.id ? <Loader2 size={16} className="animate-spin" /> : <Download size={16} />}
                            </button>
                            {(() => {
                              const TYPES_FACT = ["Facture", "Facture d'acompte", "Facture intermédiaire", "Solde", "Avoir"];
                              const estFactEligible = TYPES_FACT.includes(d.type_document) && !d.est_pro_forma && !d.archived && !d.superpdp_transmission_id;
                              if (!estFactEligible) return null;
                              return (
                                <SuperPDPTransmitButton
                                  devisId={d.id}
                                  compact
                                  onSuccess={() => qc.invalidateQueries(['tous-devis'])}
                                />
                              );
                            })()}
                          </div>
                        </td>
                        <td className="px-4 py-3 text-right" onClick={e => e.stopPropagation()}>
                          {(() => {
                            const TYPES_OFFICIELS = ["Facture", "Facture d'acompte", "Facture intermédiaire", "Solde", "Avoir"];
                            const estOfficiel = TYPES_OFFICIELS.includes(d.type_document);
                            const estVerrouille = estOfficiel && (d.statut === 'Envoyé' || d.statut === 'Accepté');
                            const peutArchiver = !d.archived && !estOfficiel && ['Annulé', 'Refusé'].includes(d.statut);
                            const TYPES_FACTURES = ["Facture", "Facture d'acompte", "Facture intermédiaire", "Solde"];
                            const peutAvoir = !d.archived && TYPES_FACTURES.includes(d.type_document) && estVerrouille;
                            const peutConvertir = !d.archived && d.type_document === 'Devis' && d.statut === 'Accepté';
                            const hasActions = peutConvertir || peutAvoir || peutArchiver || (d.archived && !estOfficiel);
                            if (!hasActions) return null;
                            return (
                              <div className="relative flex justify-end">
                                <button
                                  onClick={() => setOpenMenuId(openMenuId === d.id ? null : d.id)}
                                  className="p-1 rounded hover:bg-muted text-muted-foreground hover:text-foreground transition-colors"
                                  title="Actions"
                                >
                                  <MoreVertical size={16} />
                                </button>
                                {openMenuId === d.id && (
                                  <>
                                    <div className="fixed inset-0 z-10" onClick={() => setOpenMenuId(null)} />
                                    <div className="absolute right-0 top-9 z-20 bg-card border border-border rounded-xl shadow-lg py-1 min-w-[190px]">
                                      {peutConvertir && (
                                        <button onClick={() => { openDevis(d.id, 'Facture'); setOpenMenuId(null); }} className="w-full flex items-center gap-2 px-3 py-2 text-sm hover:bg-muted transition-colors text-left text-emerald-600">
                                          <RefreshCw size={14} /> Convertir en facture
                                        </button>
                                      )}
                                      {peutAvoir && (
                                        <button onClick={() => { openDevis(d.id, 'Avoir'); setOpenMenuId(null); }} className="w-full flex items-center gap-2 px-3 py-2 text-sm hover:bg-muted transition-colors text-left text-orange-600">
                                          <FileMinus size={14} /> Créer un avoir
                                        </button>
                                      )}
                                      {peutArchiver && (
                                        <button onClick={() => { archiveDevis.mutate({ id: d.id, archived: true }); setOpenMenuId(null); }} className="w-full flex items-center gap-2 px-3 py-2 text-sm hover:bg-muted transition-colors text-left">
                                          <Archive size={14} className="text-muted-foreground" /> Archiver
                                        </button>
                                      )}
                                      {d.archived && !estOfficiel && (
                                        <>
                                          <button onClick={() => { archiveDevis.mutate({ id: d.id, archived: false }); setOpenMenuId(null); }} className="w-full flex items-center gap-2 px-3 py-2 text-sm hover:bg-muted transition-colors text-left">
                                            <RotateCcw size={14} className="text-muted-foreground" /> Restaurer
                                          </button>
                                          <button onClick={() => { deleteDevis.mutate(d.id); setOpenMenuId(null); }} className="w-full flex items-center gap-2 px-3 py-2 text-sm hover:bg-rose-50 transition-colors text-left text-destructive">
                                            <Trash2 size={14} /> Supprimer
                                          </button>
                                        </>
                                      )}
                                    </div>
                                  </>
                                )}
                              </div>
                            );
                          })()}
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            </div>
          )}
        </div>
        </>
      )}

      {/* ───────────── Section Tableau de bord ───────────── */}
      {view === 'tableau' && (
        <>
          <div className="flex items-center gap-2">
            <button onClick={() => setView('accueil')} className="p-1.5 rounded-lg hover:bg-muted text-muted-foreground hover:text-foreground transition-colors">
              <ArrowLeft size={18} />
            </button>
            <div className="flex items-center gap-2">
              <h2 className="text-2xl font-bold">Tableau de bord</h2>
              {totalEnRetard > 0 && (
                <span className="bg-red-500 text-white text-[10px] px-1.5 py-0.5 rounded-full font-bold">!</span>
              )}
            </div>
          </div>
          <TableauDeBordFinancier
            devisList={devisList}
            echeances={echeances}
            evenements={evenements}
            openDevis={openDevis}
          />
        </>
      )}

      {/* Modal devis */}
      {devisModalOpen && (
        <DevisModal
          devisId={selectedDevisId}
          initialTypeDocument={initialTypeDocument}
          section={modalSectionOverride || sectionFacture}
          onClose={() => { setDevisModalOpen(false); setSelectedDevisId(null); setInitialTypeDocument(null); setModalSectionOverride(null); }}
          onSaved={handleDevisSaved}
        />
      )}
    </div>
  );
}