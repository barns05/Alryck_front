/**
 * EvenementTab — Onglet "Mon événement"
 *
 * Section 1 : Informations de l'événement (Fiche · Déroulé · Infos pratiques)
 * Section 2 : Outils disponibles (OutilsSection — 5 cartes fixes)
 * Section 3 : Prestataires confirmés
 */
import { useState } from 'react';
import { createPortal } from 'react-dom';
import { motion, AnimatePresence } from 'framer-motion';
import { useQuery, useQueryClient } from '@tanstack/react-query';
import { base44 } from '@/api/base44Client';
import { format } from 'date-fns';
import { fr } from 'date-fns/locale';
import { X, ExternalLink, FileText, Info, AlertTriangle, CalendarClock, ChevronDown, Download, PenTool } from 'lucide-react';
import PrestatairesCardsSection from './PrestatairesCardsSection';
import PlanSalleScreen from './PlanSalleScreen';
import OutilsSection from './OutilsSection';
import InfosPratiquesContent from './InfosPratiquesContent';
import ProgrammeSection from './ProgrammeSection';
import PropositionLieuSection from './PropositionLieuSection';
import { DrawerSheet } from './MonEspaceTab';
import { useClientContrats } from '@/hooks/useClientContrats';
import { CONTRAT_STATUT_COLORS } from '@/constants/colors';

// ─── Cartes principales (toujours visibles) ───────────────────────────────────
const MAIN_CARDS = [
  {
    id: 'fiche',
    icon: FileText,
    label: 'Fiche récapitulative',
    sublabel: 'Type · Date · Lieu · Invités · Horaires',
    color: '#9ca3af',
    tileId: null,
  },
  {
    id: 'logistique',
    icon: Info,
    label: 'Informations pratiques',
    sublabel: 'Accès · Parking · Contacts',
    color: '#9ca3af',
    tileId: 'logistique',
  },
];

// ─── Fiche récapitulative inline ──────────────────────────────────────────────
function FicheRecap({ evenement, lieu }) {
  const isApprox = evenement.date_type === 'approximative';
  const dateStr = evenement.date
    ? format(new Date(evenement.date + 'T12:00:00'), 'EEEE d MMMM yyyy', { locale: fr })
    : null;
  const dateDisplay = isApprox ? (evenement.date_periode || 'Date à préciser') : dateStr;

  const rows = [
    { label: 'Type',    value: evenement.type_evenement },
    { label: 'Date',    value: dateDisplay },
    { label: 'Lieu',    value: evenement.lieu_nom || lieu?.nom },
    { label: 'Invités', value: evenement.nb_invites ? `${evenement.nb_invites} personnes` : null },
    { label: 'Début',   value: evenement.heure_debut },
    { label: 'Fin',     value: evenement.heure_fin },
  ].filter(r => r.value);

  return (
    <div className="space-y-2 pt-1">
      {rows.map(r => (
        <div key={r.label} className="flex items-baseline gap-2">
          <span className="text-[11px] font-semibold uppercase tracking-wide text-blue-400 w-14 shrink-0">{r.label}</span>
          <span className="text-sm text-blue-900 font-medium capitalize">{r.value}</span>
        </div>
      ))}
    </div>
  );
}

// ─── Carte principale cliquable ───────────────────────────────────────────────
function EventCard({ card, onClick, badge, isOpen }) {
  const Icon = card.icon;
  return (
    <motion.button
      whileTap={{ scale: 0.97 }}
      onClick={onClick}
      className={`premium-card flex flex-col items-start gap-2 p-5 text-left w-full ${isOpen ? 'premium-card--active' : ''}`}
    >
      <div className="w-11 h-11 rounded-xl flex items-center justify-center shrink-0 relative z-[3]" style={{ background: 'rgba(30,27,75,0.06)' }}>
        <Icon size={22} strokeWidth={1.75} style={{ color: '#1e1b4b' }} />
      </div>
      <div className="space-y-0.5 w-full relative z-[3]">
        <p className="premium-card-title text-sm leading-tight" style={{ color: '#1e1b4b' }}>{card.label}</p>
        <p className="text-[11px] leading-snug" style={{ color: '#9ca3af' }}>{card.sublabel}</p>
        {badge && (
          <span
            className="inline-block text-[10px] font-semibold px-2 py-0.5 rounded-full mt-1"
            style={{ background: 'rgba(30,27,75,0.08)', color: '#1e1b4b' }}
          >
            {badge}
          </span>
        )}
      </div>
    </motion.button>
  );
}

// ─── Bottom-sheet drawer générique pour les outils ───────────────────────────
function OutilDrawer({ title, emoji, onClose, children }) {
  return createPortal(
    <div className="fixed inset-0 z-[9999] flex items-end justify-center" onClick={onClose}>
      <div className="absolute inset-0 bg-black/45" />
      <motion.div
        initial={{ y: '100%' }}
        animate={{ y: 0 }}
        exit={{ y: '100%' }}
        transition={{ type: 'spring', damping: 30, stiffness: 300 }}
        className="relative w-full max-w-lg bg-white rounded-t-3xl shadow-2xl flex flex-col overflow-hidden"
        style={{ maxHeight: '85vh' }}
        onClick={e => e.stopPropagation()}
      >
        <div className="flex items-center justify-between px-5 pt-4 pb-3 border-b shrink-0" style={{ borderColor: '#f1f5f9' }}>
          <h3 className="font-bold text-base flex items-center gap-2" style={{ color: '#1e1b4b' }}>
            <span>{emoji}</span> {title}
          </h3>
          <button onClick={onClose} className="text-gray-400 hover:text-gray-600">
            <X size={20} />
          </button>
        </div>
        <div className="overflow-y-auto flex-1 px-5 py-4">
          {children}
        </div>
      </motion.div>
    </div>,
    document.body
  );
}

// ─── Vues simples pour chaque outil ──────────────────────────────────────────
function QuestionnairesView({ evenementId, prestataireId, onFill }) {
  const { data: formulaires = [], isLoading } = useQuery({
    queryKey: ['drawer-formulaires', evenementId, prestataireId],
    queryFn: () => base44.entities.FormulairePreparation.filter({ evenement_id: evenementId }),
    staleTime: 60000,
  });

  const actifs = formulaires.filter(f => f.statut !== 'Brouillon' && (!prestataireId || f.prestataire_id === prestataireId));

  if (isLoading) return <p className="text-sm text-gray-400 text-center py-8">Chargement…</p>;
  if (actifs.length === 0) return (
    <div className="flex flex-col items-center py-10 gap-3 text-center">
      <span className="text-4xl">📋</span>
      <p className="font-semibold text-sm" style={{ color: '#1e1b4b' }}>Aucun questionnaire disponible</p>
      <p className="text-xs text-gray-400">Votre organisateur vous enverra un questionnaire dès que nécessaire.</p>
    </div>
  );

  const STATUT_STYLE = {
    'Complété': { bg: '#f0fdf4', color: '#16a34a', label: 'Complété ✓' },
    'Clôturé':  { bg: '#f0fdf4', color: '#16a34a', label: 'Clôturé ✓' },
    'En cours': { bg: '#fefce8', color: '#854d0e', label: 'En cours ✏️' },
    'Envoyé':   { bg: '#eff6ff', color: '#1d4ed8', label: 'À remplir ⏳' },
  };

  return (
    <div className="space-y-3">
      {actifs.map(f => {
        const s = STATUT_STYLE[f.statut] || { bg: '#f8fafc', color: '#475569', label: f.statut };
        const nbChamps  = (f.champs || []).length;
        const nbReponses = Object.keys(f.reponses || {}).length;
        const canFill = ['Envoyé', 'En cours'].includes(f.statut) && onFill;
        return (
          <div key={f.id} className="p-4 rounded-2xl border" style={{ borderColor: '#e8e4dc', background: '#faf8f4' }}>
            <div className="flex items-start justify-between gap-2">
              <div className="flex-1 min-w-0">
                <p className="font-semibold text-sm" style={{ color: '#1e1b4b' }}>
                  {f.evenement_nom || 'Questionnaire'}
                </p>
                {nbChamps > 0 && (
                  <p className="text-xs text-gray-400 mt-0.5">
                    {nbReponses}/{nbChamps} réponses
                  </p>
                )}
                {f.date_limite && (
                  <p className="text-xs text-gray-400 mt-0.5">
                    Date limite : {format(new Date(f.date_limite), 'd MMM yyyy', { locale: fr })}
                  </p>
                )}
              </div>
              <span className="text-[11px] font-semibold px-2.5 py-1 rounded-full shrink-0"
                style={{ background: s.bg, color: s.color }}>
                {s.label}
              </span>
            </div>
            {canFill && (
              <button
                onClick={onFill}
                className="w-full mt-3 flex items-center justify-center gap-2 py-2.5 rounded-xl text-sm font-semibold transition-colors"
                style={{ background: '#1e1b4b', color: 'white' }}
              >
                {f.statut === 'En cours' ? 'Continuer le questionnaire' : 'Remplir le questionnaire'}
              </button>
            )}
          </div>
        );
      })}
    </div>
  );
}

function QuestionnairesListView({ evenementId, onFill }) {
  const [selected, setSelected] = useState(null); // { id, nom } | null — ouvre le détail d'un prestataire
  const { data: formulaires = [], isLoading } = useQuery({
    queryKey: ['outils-formulaires-ev', evenementId],
    queryFn: () => base44.entities.FormulairePreparation.filter({ evenement_id: evenementId }),
    staleTime: 60000,
  });
  const { data: evPrestataires = [] } = useQuery({
    queryKey: ['ev-prestataires-client', evenementId],
    queryFn: () => base44.entities.EvenementPrestataire.filter({ evenement_id: evenementId }),
  });
  const { data: tousPrestataires = [] } = useQuery({
    queryKey: ['prestataires-all'],
    queryFn: () => base44.entities.Prestataire.list(),
    enabled: evPrestataires.length > 0,
  });

  const confirmesIds = new Set(evPrestataires.filter(ep => ep.statut === 'Confirmé').map(ep => ep.prestataire_id));
  const actifs = formulaires.filter(f => f.statut !== 'Brouillon' && f.prestataire_id && confirmesIds.has(f.prestataire_id));

  // Regroupement par prestataire (un prestataire peut avoir plusieurs formulaires).
  const byPresta = {};
  actifs.forEach(f => {
    (byPresta[f.prestataire_id] = byPresta[f.prestataire_id] || []).push(f);
  });
  const rows = Object.entries(byPresta).map(([pid, fs]) => {
    const p = tousPrestataires.find(x => x.id === pid);
    return { prestataireId: pid, prestataireNom: p?.nom || fs[0]?.prestataire_nom || 'Prestataire', formulaires: fs };
  });

  if (isLoading) return <p className="text-sm text-gray-400 text-center py-8">Chargement…</p>;
  if (rows.length === 0) return (
    <div className="flex flex-col items-center py-10 gap-3 text-center">
      <span className="text-4xl">📋</span>
      <p className="font-semibold text-sm" style={{ color: '#1e1b4b' }}>Aucun questionnaire disponible</p>
      <p className="text-xs text-gray-400">Vos prestataires vous enverront un questionnaire dès que nécessaire.</p>
    </div>
  );

  const STATUT_STYLE = {
    'Complété': { bg: '#f0fdf4', color: '#16a34a', label: 'Complété ✓' },
    'Clôturé':  { bg: '#f0fdf4', color: '#16a34a', label: 'Clôturé ✓' },
    'En cours': { bg: '#fefce8', color: '#854d0e', label: 'En cours ✏️' },
    'Envoyé':   { bg: '#eff6ff', color: '#1d4ed8', label: 'À remplir ⏳' },
  };
  const PRIORITY = ['Envoyé', 'En cours', 'Complété', 'Clôturé'];

  return (
    <div className="space-y-3">
      {rows.map(r => {
        const mainF = r.formulaires.slice().sort((a, b) => PRIORITY.indexOf(a.statut) - PRIORITY.indexOf(b.statut))[0] || r.formulaires[0];
        const s = STATUT_STYLE[mainF.statut] || { bg: '#f8fafc', color: '#475569', label: mainF.statut };
        const nbChamps = (mainF.champs || []).length;
        const nbReponses = Object.keys(mainF.reponses || {}).length;
        return (
          <button key={r.prestataireId} type="button"
            onClick={() => setSelected({ id: r.prestataireId, nom: r.prestataireNom })}
            className="w-full p-4 rounded-2xl border text-left transition-colors"
            style={{ borderColor: '#e8e4dc', background: '#faf8f4' }}>
            <div className="flex items-start justify-between gap-2">
              <div className="flex-1 min-w-0">
                <p className="font-semibold text-sm" style={{ color: '#1e1b4b' }}>{r.prestataireNom}</p>
                {nbChamps > 0 && (
                  <p className="text-xs text-gray-400 mt-0.5">
                    {nbReponses}/{nbChamps} réponses{r.formulaires.length > 1 ? ` · ${r.formulaires.length} questionnaires` : ''}
                  </p>
                )}
                {mainF.date_limite && (
                  <p className="text-xs text-gray-400 mt-0.5">
                    Date limite : {format(new Date(mainF.date_limite), 'd MMM yyyy', { locale: fr })}
                  </p>
                )}
              </div>
              <span className="text-[11px] font-semibold px-2.5 py-1 rounded-full shrink-0"
                style={{ background: s.bg, color: s.color }}>
                {s.label}
              </span>
            </div>
          </button>
        );
      })}
      {selected && (
        <OutilDrawer title={`Questionnaires · ${selected.nom}`} emoji="📋" onClose={() => setSelected(null)}>
          <QuestionnairesView evenementId={evenementId} prestataireId={selected.id} onFill={onFill} />
        </OutilDrawer>
      )}
    </div>
  );
}

function ContratsView({ clientId, evenementId, prestataireId }) {
  const { contrats: actifs, isLoading } = useClientContrats({ clientId, evenementId, prestataireId });

  if (isLoading) return <p className="text-sm text-gray-400 text-center py-8">Chargement…</p>;
  if (actifs.length === 0) return (
    <div className="flex flex-col items-center py-10 gap-3 text-center">
      <span className="text-4xl">📄</span>
      <p className="font-semibold text-sm" style={{ color: '#1e1b4b' }}>Aucun contrat disponible</p>
      <p className="text-xs text-gray-400">Vos contrats apparaîtront ici une fois partagés par votre organisateur.</p>
    </div>
  );

  const STATUT_LABELS = {
    'En attente de signature': 'À signer ✍️',
    'Signé': 'Signé ✓',
    'Archivé': 'Archivé',
  };

  return (
    <div className="space-y-3">
      {actifs.map(c => {
        const label = STATUT_LABELS[c.statut] || c.statut;
        const cls = CONTRAT_STATUT_COLORS[c.statut] || 'bg-slate-100 text-slate-500 border-slate-200';
        return (
          <div key={c.id} className="p-4 rounded-2xl border" style={{ borderColor: '#e8e4dc', background: '#faf8f4' }}>
            <div className="flex items-start justify-between gap-2">
              <div className="flex-1 min-w-0">
                <p className="font-semibold text-sm truncate" style={{ color: '#1e1b4b' }}>{c.titre}</p>
                {c.date_signature && (
                  <p className="text-xs text-gray-400 mt-0.5">
                    Signé le {format(new Date(c.date_signature), 'd MMM yyyy', { locale: fr })}
                  </p>
                )}
              </div>
              <span className={`text-[11px] font-semibold px-2.5 py-1 rounded-full shrink-0 border ${cls}`}>
                {label}
              </span>
            </div>
            {c.yousign_signature_url && c.statut === 'En attente de signature' && !c.contrat_signe_url && (
              <a href={c.yousign_signature_url} target="_blank" rel="noopener noreferrer"
                className="flex items-center gap-1.5 text-xs font-medium"
                style={{ color: '#7c3aed' }}>
                <PenTool size={12} /> Signer le contrat
              </a>
            )}
            {(c.contrat_signe_url || c.modele_url) && (
              <div className="mt-3 flex items-center gap-3">
                <a href={c.contrat_signe_url || c.modele_url} target="_blank" rel="noopener noreferrer"
                  className="flex items-center gap-1.5 text-xs font-medium"
                  style={{ color: '#1d4ed8' }}>
                  <ExternalLink size={12} /> Consulter
                </a>
                <a href={c.contrat_signe_url || c.modele_url} download target="_blank" rel="noopener noreferrer"
                  className="flex items-center gap-1.5 text-xs font-medium text-gray-500 hover:text-gray-700">
                  <Download size={12} /> Télécharger
                </a>
              </div>
            )}
          </div>
        );
      })}
    </div>
  );
}

function FinancierView({ evenementId, prestataireId }) {
  const [openId, setOpenId] = useState(null);
  const { data: devis = [], isLoading } = useQuery({
    queryKey: ['drawer-devis', evenementId, prestataireId],
    queryFn: () => base44.entities.Devis.filter({ evenement_id: evenementId }),
    staleTime: 60000,
  });

  if (isLoading) return <p className="text-sm text-gray-400 text-center py-8">Chargement…</p>;

  const visibles = devis.filter(d => d.statut !== 'Brouillon' && d.statut !== 'Annulé' && (!prestataireId || d.prestataire_id === prestataireId));
  if (visibles.length === 0) return (
    <div className="flex flex-col items-center py-10 gap-3 text-center">
      <span className="text-4xl">💰</span>
      <p className="font-semibold text-sm" style={{ color: '#1e1b4b' }}>Aucune information financière disponible</p>
      <p className="text-xs text-gray-400">Vos devis et factures apparaîtront ici une fois partagés.</p>
    </div>
  );

  const TYPE_STYLE = {
    'Devis':                  { emoji: '📋', color: '#1d4ed8' },
    'Contrat':                { emoji: '📝', color: '#7c3aed' },
    'Facture d\'acompte':     { emoji: '💳', color: '#c2410c' },
    'Facture intermédiaire':  { emoji: '💳', color: '#c2410c' },
    'Facture':                { emoji: '🧾', color: '#166534' },
    'Avoir':                  { emoji: '↩️', color: '#6b7280' },
    'Solde':                  { emoji: '✅', color: '#166534' },
  };
  const STATUT_STYLE = {
    'Accepté':  { bg: '#f0fdf4', color: '#16a34a' },
    'Envoyé':   { bg: '#eff6ff', color: '#1d4ed8' },
    'Refusé':   { bg: '#fff1f2', color: '#be123c' },
  };

  const totalTTC = visibles.reduce((s, d) => s + (d.total_ttc || 0), 0);

  return (
    <div className="space-y-4">
      {/* Total */}
      {totalTTC > 0 && (
        <div className="text-center py-4 rounded-2xl border" style={{ borderColor: '#bbf7d0', background: '#f0fdf4' }}>
          <p className="text-2xl font-bold" style={{ color: '#166534' }}>{totalTTC.toLocaleString('fr-FR')} €</p>
          <p className="text-xs text-gray-400 mt-1">Total TTC</p>
        </div>
      )}

      {/* Liste */}
      <div className="space-y-2">
        {visibles.map(d => {
          const t = TYPE_STYLE[d.type_document] || { emoji: '📄', color: '#475569' };
          const s = STATUT_STYLE[d.statut] || { bg: '#f8fafc', color: '#6b7280' };
          const isOpen = openId === d.id;
          // PDF disponible → lien direct. Sinon → ligne dépliable affichant le
          // détail (lignes + total) en lecture seule.
          const headClass = "flex items-center gap-3 p-3 rounded-xl border transition-colors w-full text-left";
          const headStyle = d.pdf_url
            ? { borderColor: '#e8e4dc', background: '#faf8f4', cursor: 'pointer' }
            : { borderColor: isOpen ? '#C5A059' : '#e8e4dc', background: isOpen ? '#FFFBF0' : '#fff', cursor: 'pointer' };
          return (
            <div key={d.id} className="space-y-1">
              {d.pdf_url ? (
                <a href={d.pdf_url} target="_blank" rel="noopener noreferrer" className={headClass} style={headStyle}>
                  <span className="text-xl shrink-0">{t.emoji}</span>
                  <div className="flex-1 min-w-0">
                    <p className="text-sm font-medium truncate" style={{ color: '#1e1b4b' }}>{d.numero || d.objet || d.type_document}</p>
                    {d.total_ttc > 0 && (
                      <p className="text-xs" style={{ color: t.color }}>{d.total_ttc.toLocaleString('fr-FR')} € TTC</p>
                    )}
                  </div>
                  <span className="text-[10px] font-semibold px-2 py-0.5 rounded-full shrink-0"
                    style={{ background: s.bg, color: s.color }}>
                    {d.statut}
                  </span>
                  <ExternalLink size={15} className="text-gray-300 shrink-0" />
                </a>
              ) : (
                <>
                  <button type="button" onClick={() => setOpenId(isOpen ? null : d.id)} className={headClass} style={headStyle}>
                    <span className="text-xl shrink-0">{t.emoji}</span>
                    <div className="flex-1 min-w-0">
                      <p className="text-sm font-medium truncate" style={{ color: '#1e1b4b' }}>{d.numero || d.objet || d.type_document}</p>
                      {d.total_ttc > 0 && (
                        <p className="text-xs" style={{ color: t.color }}>{d.total_ttc.toLocaleString('fr-FR')} € TTC</p>
                      )}
                    </div>
                    <span className="text-[10px] font-semibold px-2 py-0.5 rounded-full shrink-0"
                      style={{ background: s.bg, color: s.color }}>
                      {d.statut}
                    </span>
                    <ChevronDown size={16} className="text-gray-400 shrink-0 transition-transform"
                      style={{ transform: isOpen ? 'rotate(180deg)' : 'none' }} />
                  </button>
                  {isOpen && (
                    <div className="rounded-xl border p-3 space-y-2" style={{ borderColor: '#f1f5f9', background: '#faf8f4' }}>
                      {(d.lignes || []).length > 0 ? (
                        <div className="space-y-1.5">
                          {d.lignes.map((l, i) => (
                            <div key={l.id || i} className="flex items-baseline gap-2 text-xs">
                              <span className="flex-1 min-w-0" style={{ color: '#1e1b4b' }}>{l.description || '—'}</span>
                              <span className="text-gray-400 shrink-0">{l.quantite ?? 0} {l.unite || ''}</span>
                              <span className="font-medium shrink-0" style={{ color: t.color }}>{(l.total_ht ?? 0).toLocaleString('fr-FR')} €</span>
                            </div>
                          ))}
                        </div>
                      ) : (
                        <p className="text-xs text-gray-400 italic">Aucun détail de ligne disponible.</p>
                      )}
                      <div className="flex items-center justify-between pt-2 border-t" style={{ borderColor: '#f1f5f9' }}>
                        <span className="text-xs text-gray-500">Total TTC</span>
                        <span className="text-sm font-bold" style={{ color: '#166534' }}>{(d.total_ttc ?? 0).toLocaleString('fr-FR')} €</span>
                      </div>
                    </div>
                  )}
                </>
              )}
            </div>
          );
        })}
      </div>
    </div>
  );
}

function BrochuresView() {
  const { data: brochures = [], isLoading } = useQuery({
    queryKey: ['drawer-brochures'],
    queryFn: () => base44.entities.BrochureCatalogue.filter({ actif: true }),
    staleTime: 300000,
  });

  if (isLoading) return <p className="text-sm text-gray-400 text-center py-8">Chargement…</p>;
  if (brochures.length === 0) return (
    <div className="flex flex-col items-center py-10 gap-3 text-center">
      <span className="text-4xl">📘</span>
      <p className="font-semibold text-sm" style={{ color: '#1e1b4b' }}>Aucune brochure disponible</p>
      <p className="text-xs text-gray-400">Les brochures et catalogues partagés apparaîtront ici.</p>
    </div>
  );

  return (
    <div className="space-y-2">
      {brochures.map(b => (
        <div key={b.id} className="flex items-center gap-3 p-3 rounded-xl border" style={{ borderColor: '#e8e4dc', background: '#faf8f4' }}>
          <span className="text-xl shrink-0">{b.fichier_type === 'image' ? '🖼️' : '📄'}</span>
          <div className="flex-1 min-w-0">
            <p className="text-sm font-medium truncate" style={{ color: '#1e1b4b' }}>{b.nom}</p>
            {b.fichier_nom && <p className="text-xs text-gray-400 truncate">{b.fichier_nom}</p>}
          </div>
          {b.fichier_url && (
            <a href={b.fichier_url} target="_blank" rel="noopener noreferrer"
              className="shrink-0 text-blue-500 hover:text-blue-700">
              <ExternalLink size={15} />
            </a>
          )}
        </div>
      ))}
    </div>
  );
}

function AllergenesView({ evenementId }) {
  const { data: formulaires = [] } = useQuery({
    queryKey: ['drawer-formulaires-allergenes', evenementId],
    queryFn: () => base44.entities.FormulairePreparation.filter({ evenement_id: evenementId }),
    staleTime: 60000,
  });

  // Extraire les champs liés aux allergènes / régimes dans les réponses
  const entries = [];
  formulaires.forEach(f => {
    const reponses = f.reponses || {};
    const champs   = f.champs   || [];
    champs.forEach(c => {
      if (/allergi|intol|régime|regime|alimentaire/i.test(c.label)) {
        const val = reponses[c.id];
        if (val && val !== '' && !(Array.isArray(val) && val.length === 0)) {
          entries.push({ label: c.label, value: Array.isArray(val) ? val.join(', ') : String(val) });
        }
      }
    });
  });

  return (
    <div className="space-y-4">
      {entries.length === 0 ? (
        <div className="flex flex-col items-center py-10 gap-3 text-center">
          <span className="text-4xl">🥗</span>
          <p className="font-semibold text-sm" style={{ color: '#1e1b4b' }}>Aucune information renseignée</p>
          <p className="text-xs text-gray-400">Les allergies et régimes alimentaires déclarés dans vos questionnaires apparaîtront ici.</p>
        </div>
      ) : (
        <>
          <p className="text-xs text-gray-400">Informations issues de vos questionnaires de préparation.</p>
          <div className="space-y-2">
            {entries.map((e, i) => (
              <div key={i} className="p-3 rounded-xl border" style={{ borderColor: '#bbf7d0', background: '#f0fdf4' }}>
                <p className="text-[11px] font-semibold uppercase tracking-wide" style={{ color: '#15803d' }}>{e.label}</p>
                <p className="text-sm mt-0.5" style={{ color: '#1e1b4b' }}>{e.value}</p>
              </div>
            ))}
          </div>
        </>
      )}
    </div>
  );
}

// ─── Alerte discrète : demande d'annulation prestataire en attente ──────────
// Informe le client qu'une action l'attend dans « Mon compte », sans exposer
// l'action elle-même (accepter/refuser) sur la page principale.
function DemandeAnnulationAlert({ evenementId }) {
  const { data: demande } = useQuery({
    queryKey: ['demande-annulation-active-client', evenementId],
    queryFn: async () => {
      const all = await base44.entities.DemandeAnnulationEvenement.filter({ evenement_id: evenementId });
      return (all || []).find((d) => d.statut === 'en_attente') || null;
    },
    enabled: !!evenementId,
  });
  if (!demande) return null;
  return (
    <div className="mx-4 mt-3 flex items-center gap-2.5 px-3.5 py-2.5 rounded-xl border border-amber-200 bg-amber-50">
      <AlertTriangle size={14} className="shrink-0" style={{ color: '#b45309' }} />
      <p className="text-[11px] leading-snug" style={{ color: '#92400e' }}>
        Une demande d'annulation de cet événement nécessite votre attention.
        <span className="font-medium"> Répondez-y depuis « Mon compte ».</span>
      </p>
    </div>
  );
}

// ─── Alerte discrète : proposition de changement de date en attente ──────────
// Informe le client qu'une action l'attend dans « Mon compte », sans exposer
// l'action elle-même (finaliser/refuser) sur la page principale.
function PropositionDateAlert({ evenementId }) {
  const { data: prop } = useQuery({
    queryKey: ['proposition-date-active-client', evenementId],
    queryFn: async () => {
      const all = await base44.entities.PropositionDateEvenement.filter({ evenement_id: evenementId });
      return (all || []).find((p) => p.statut === 'en_attente') || null;
    },
    enabled: !!evenementId,
  });
  if (!prop) return null;
  return (
    <div className="mx-4 mt-3 flex items-center gap-2.5 px-3.5 py-2.5 rounded-xl border border-amber-200 bg-amber-50">
      <CalendarClock size={14} className="shrink-0" style={{ color: '#b45309' }} />
      <p className="text-[11px] leading-snug" style={{ color: '#92400e' }}>
        Un changement de date nécessite votre attention.
        <span className="font-medium"> Consultez-le dans « Mon compte ».</span>
      </p>
    </div>
  );
}

// ─── Mini-sélecteur d'espace (plan de salle, lieu multi-espaces) ──────────────
function PlanSalleEspacePicker({ espaces, onSelect, onClose }) {
  return createPortal(
    <div className="fixed inset-0 z-[9999] flex items-center justify-center p-4" onClick={onClose}>
      <div className="absolute inset-0 bg-black/45" />
      <motion.div
        initial={{ opacity: 0, scale: 0.96 }}
        animate={{ opacity: 1, scale: 1 }}
        className="relative w-full max-w-sm bg-white rounded-2xl shadow-2xl p-5"
        onClick={(e) => e.stopPropagation()}
      >
        <div className="flex items-center justify-between mb-3">
          <h3 className="font-bold text-base flex items-center gap-2" style={{ color: '#1e1b4b' }}>
            <span>🪑</span> Choisir un espace
          </h3>
          <button onClick={onClose} className="text-gray-400 hover:text-gray-600">
            <X size={18} />
          </button>
        </div>
        <p className="text-xs text-gray-400 mb-3">Ce lieu propose plusieurs espaces. Sélectionnez celui à configurer.</p>
        <div className="space-y-2">
          {espaces.map((e) => (
            <button
              key={e.id}
              onClick={() => onSelect(e)}
              className="w-full text-left p-3 rounded-xl border hover:border-[#C5A059] hover:bg-[#FFFBF0] transition-colors"
              style={{ borderColor: '#e8e4dc', background: '#fff' }}
            >
              <p className="text-sm font-semibold" style={{ color: '#1e1b4b' }}>{e.nom}</p>
              {Array.isArray(e.formats_tables) && e.formats_tables.length > 0 && (
                <p className="text-xs text-gray-400 mt-0.5">
                  {e.formats_tables.length} format(s) de table
                </p>
              )}
            </button>
          ))}
        </div>
      </motion.div>
    </div>,
    document.body
  );
}

// ─── Composant principal ──────────────────────────────────────────────────────
export default function EvenementTab({ evenement, clientId, clientNom, onSelectTile }) {
  const [activePage, setActivePage] = useState(null);   // 'fiche' | 'logistique' | 'programme' | 'brochures' → bottom sheet DrawerSheet (aligné sur Organisation)
  const [activeOutil, setActiveOutil] = useState(null); // 'questionnaires' | 'contrats' | 'financier' | 'allergenes' → bottom sheet prestataire
  const [activePrestataireId, setActivePrestataireId] = useState(null);
  const [activePrestataireNom, setActivePrestataireNom] = useState(null);
  const [planSalleEspace, setPlanSalleEspace] = useState(null);      // EspaceLieu à configurer (écran PlanSalleScreen)
  const [pickerEspaces, setPickerEspaces] = useState(null);         // espaces à choisir (lieu multi-espaces) → mini-sélecteur
  const qc = useQueryClient();

  const handleOpenOutil = (prestataireId, prestataireNom, type) => {
    setActivePrestataireId(prestataireId);
    setActivePrestataireNom(prestataireNom);
    setActiveOutil(type);
  };

  // Ouvre le configurateur de plan de salle depuis la carte d'un lieu confirmé.
  // Résout l'espace cible : 1 espace → direct ; plusieurs → mini-sélecteur.
  const selectAndOpenPlanSalle = async (espace) => {
    if (!espace?.id) return;
    if (evenement.espace_lieu_id !== espace.id) {
      try {
        await base44.entities.Evenement.update(evenement.id, { espace_lieu_id: espace.id });
        qc.invalidateQueries(['evenements']);
        qc.invalidateQueries(['evenement', evenement.id]);
      } catch { /* ignore */ }
    }
    setPickerEspaces(null);
    setPlanSalleEspace(espace);
  };

  const handleOpenPlanSalle = (espaces) => {
    if (!espaces || espaces.length === 0) return;
    if (espaces.length === 1) {
      selectAndOpenPlanSalle(espaces[0]);
    } else {
      setPickerEspaces(espaces);
    }
  };

  const { data: lieu = null } = useQuery({
    queryKey: ['lieu-portal', evenement.lieu_id],
    queryFn: () => base44.entities.Lieu.filter({ id: evenement.lieu_id }).then(r => r[0] || null),
    enabled: !!evenement.lieu_id,
  });

  const DRAWER_CONFIG = {
    fiche:          { title: 'Fiche récapitulative',      emoji: '📄' },
    logistique:     { title: 'Informations pratiques',    emoji: 'ℹ️' },
    programme:      { title: "Déroulé de l'événement",      emoji: '🗓️' },
    questionnaires: { title: 'Questionnaires',             emoji: '📋' },
    contrats:       { title: 'Contrats',                   emoji: '📄' },
    financier:      { title: 'Récapitulatif financier',    emoji: '💰' },
    brochures:      { title: 'Brochures & prestations',    emoji: '📘' },
    allergenes:     { title: 'Allergènes & régimes',       emoji: '🥗' },
  };

  // Ouvre le formulaire interactif (FormulaireClientSection via TileDrawer) et
  // ferme le drawer outil courant (questionnaires en lecture seule).
  const handleFillFormulaire = () => {
    setActiveOutil(null);
    setActivePrestataireId(null);
    setActivePrestataireNom(null);
    onSelectTile('formulaire');
  };

  return (
    <div className="pb-4">

      {/* ── Section 1 : Prestataires confirmés ───────────────────────── */}
      <PrestatairesCardsSection evenementId={evenement.id} evenementType={evenement.type_evenement} evenement={evenement} clientNom={clientNom} onSelectModule={onSelectTile} onOpenOutil={handleOpenOutil} />

      {/* ── Section 2 : Informations de l'événement ──────────────────── */}
      <div className="px-4 pt-4 space-y-3">
        <p className="text-[11px] font-bold uppercase tracking-widest flex items-center gap-2" style={{ color: '#1e1b4b' }}>
          <span style={{ display: 'inline-block', width: 9, height: 9, borderRadius: '50%', background: '#C5A059', flexShrink: 0 }} />
          Informations de l'événement
          <span style={{ flex: 1, height: 1, background: 'rgba(197,160,89,0.3)' }} />
        </p>

        {/* Fiche récap + Infos pratiques — grille 2 colonnes */}
        <div className="grid grid-cols-2 gap-3">
          <EventCard
            card={MAIN_CARDS[0]}
            onClick={() => setActivePage('fiche')}
          />
          <EventCard
            card={MAIN_CARDS[1]}
            onClick={() => setActivePage('logistique')}
          />
        </div>
      </div>

      {/* ── Section 3 : Outils disponibles ───────────────────────────── */}
      <OutilsSection
        evenement={evenement}
        onSelectTile={onSelectTile}
        onOpen={setActivePage}
        onOpenPlanSalle={handleOpenPlanSalle}
      />

      {/* ── Proposition de lieu par le client (bandeau repliable) ─── */}
      <PropositionLieuSection
        evenementId={evenement.id}
        clientId={clientId}
        clientNom={clientNom}
        evenementNom={evenement.nom}
      />

      {/* ── Alertes discrètes : demande d'annulation + changement de date en attente (action dans Mon compte) ─── */}
      <DemandeAnnulationAlert evenementId={evenement.id} />
      <PropositionDateAlert evenementId={evenement.id} />

      {/* ── Bottom sheets : 4 cartes principales (même mécanisme que Organisation) ─── */}
      <AnimatePresence>
        {activePage && DRAWER_CONFIG[activePage] && (
          <DrawerSheet
            key={activePage}
            title={DRAWER_CONFIG[activePage].title}
            emoji={DRAWER_CONFIG[activePage].emoji}
            onClose={() => setActivePage(null)}
          >
            {activePage === 'fiche'      && <FicheRecap evenement={evenement} lieu={lieu} />}
            {activePage === 'logistique' && <InfosPratiquesContent evenementId={evenement.id} />}
            {activePage === 'programme'  && <ProgrammeSection evenement={evenement} clientNom={clientNom} />}
            {activePage === 'brochures'  && <BrochuresView />}
            {activePage === 'questionnaires' && <QuestionnairesListView evenementId={evenement.id} onFill={handleFillFormulaire} />}
          </DrawerSheet>
        )}
      </AnimatePresence>

      {/* ── Bottom sheets : outils rattachés aux prestataires ────────── */}
      <AnimatePresence>
        {activeOutil && DRAWER_CONFIG[activeOutil] && (
          <OutilDrawer
            key={activeOutil}
            title={activePrestataireNom ? `${DRAWER_CONFIG[activeOutil].title} · ${activePrestataireNom}` : DRAWER_CONFIG[activeOutil].title}
            emoji={DRAWER_CONFIG[activeOutil].emoji}
            onClose={() => { setActiveOutil(null); setActivePrestataireId(null); setActivePrestataireNom(null); }}
          >
            {activeOutil === 'questionnaires' && <QuestionnairesView evenementId={evenement.id} prestataireId={activePrestataireId} onFill={handleFillFormulaire} />}
            {activeOutil === 'contrats'       && <ContratsView clientId={clientId} evenementId={evenement.id} prestataireId={activePrestataireId} />}
            {activeOutil === 'financier'      && <FinancierView evenementId={evenement.id} prestataireId={activePrestataireId} />}
            {activeOutil === 'brochures'      && <BrochuresView />}
            {activeOutil === 'allergenes'     && <AllergenesView evenementId={evenement.id} />}
          </OutilDrawer>
        )}
      </AnimatePresence>

      {/* ── Écran « Plan de salle » (configuration + vue plan + vue liste) ─── */}
      {planSalleEspace && (
        <PlanSalleScreen
          evenement={evenement}
          espace={planSalleEspace}
          onClose={() => setPlanSalleEspace(null)}
        />
      )}

      {/* ── Mini-sélecteur d'espace (lieu multi-espaces) ───────────────────────── */}
      {pickerEspaces && (
        <PlanSalleEspacePicker
          espaces={pickerEspaces}
          onSelect={selectAndOpenPlanSalle}
          onClose={() => setPickerEspaces(null)}
        />
      )}
    </div>
  );
}