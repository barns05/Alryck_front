/**
 * MonEspaceTab
 * Onglet "Mon espace" de l'espace client unifié.
 *
 * SECTION 1 — Mon organisation personnelle (6 cartes 2x2 + drawers)
 *   Ma checklist · Mes rendez-vous · Ma liste d'invités
 *   Mon plan de table · Mon budget · Mes inspirations
 *
 * SECTION 2 — Mon espace personnel
 *   Mes préférences · Mon profil · Notifications · Sécurité
 *
 * Tout l'existant est conservé.
 */
import { useState, useLayoutEffect } from 'react';
import { createPortal } from 'react-dom';
import { useQuery, useQueryClient } from '@tanstack/react-query';
import { motion, AnimatePresence } from 'framer-motion';
import { base44 } from '@/api/base44Client';
import { X, Plus, Trash2, Heart, CheckSquare, Calendar, Users, Armchair, Wallet, Palette, CalendarDays } from 'lucide-react';
import { isPast } from 'date-fns';
import { format } from 'date-fns';
import { fr } from 'date-fns/locale';
import ChecklistOrganisateur from '@/components/checklist/ChecklistOrganisateur';
import MonAgenda from './MonAgenda';
import InvitesDashboard from '@/components/invites/InvitesDashboard';
import InvitesList from '@/components/invites/InvitesList';
import InviteModal from '@/components/invites/InviteModal';
import PlanDeTable from '@/components/invites/PlanDeTable';
import ProgrammeJourJ from '@/components/programme/ProgrammeJourJ';
import PersonnalisationCard from './PersonnalisationCard';
import PersonnalisationContent from './PersonnalisationContent';
import { usePlanSalleConfig } from './usePlanSalleConfig';
import PlanSalleScreen from './PlanSalleScreen';

const THEME_COLORS = [
  { label: 'Navy',        hex: '#1e1b4b' },
  { label: 'Rose poudré', hex: '#d4a0a0' },
  { label: 'Bordeaux',    hex: '#6b1f1f' },
  { label: 'Vert sauge',  hex: '#4a6741' },
  { label: 'Doré',        hex: '#b8960c' },
  { label: 'Noir',        hex: '#1a1a1a' },
];

// ── Cartes section 1 ──────────────────────────────────────────────────────────
const ORG_CARDS = [
  { id: 'checklist',    icon: CheckSquare, label: 'Ma checklist',       sublabel: 'Tâches et préparatifs' },
  { id: 'rdv',          icon: Calendar,    label: 'Mon agenda',         sublabel: 'RDV & notes personnelles' },
  { id: 'invites',      icon: Users,       label: "Ma liste d'invités", sublabel: 'Suivi & allergies' },
  { id: 'plan_table',   icon: Armchair,   label: 'Mon plan de table',  sublabel: 'Placement des convives' },
  { id: 'budget',       icon: Wallet,     label: 'Mon budget',          sublabel: 'Suivi personnel' },
  { id: 'inspirations', icon: Palette,    label: 'Mes inspirations',    sublabel: 'Moodboard & ambiances' },
];

// ── Slide drawer wrapper ──────────────────────────────────────────────────────
export function DrawerSheet({ title, emoji, onClose, children }) {
  const [headerHeight, setHeaderHeight] = useState(0);

  // Mesure dynamique de la hauteur réelle du header sticky (inclut safe-area iOS)
  useLayoutEffect(() => {
    const header = document.getElementById('portal-header-sticky');
    if (header) {
      setHeaderHeight(header.getBoundingClientRect().bottom);
    }
  }, []);

  return createPortal(
    <motion.div
      className="fixed z-[9999]"
      style={{ top: 0, left: 0, right: 0, bottom: 0, display: 'flex', alignItems: 'flex-end', justifyContent: 'center' }}
      initial={{ opacity: 0 }}
      animate={{ opacity: 1 }}
      exit={{ opacity: 0 }}
      transition={{ duration: 0.15 }}
      onClick={onClose}
    >
      {/* Overlay sombre — commence sous le header pour ne pas l'assombrir */}
      <div style={{ position: 'absolute', top: headerHeight, left: 0, right: 0, bottom: 0, backgroundColor: 'rgba(0,0,0,0.45)' }} />

      {/* Panel blanc — s'étend 200px sous le bas du viewport pour couvrir safe-area et barre Safari */}
      <motion.div
        initial={{ y: '100%' }}
        animate={{ y: 0 }}
        exit={{ y: '100%' }}
        transition={{ type: 'spring', damping: 32, stiffness: 320 }}
        style={{
          position: 'relative',
          width: '100%',
          maxWidth: 512,
          /* Dépasse intentionnellement de 200px sous le bas pour couvrir la barre Safari qui réapparaît */
          marginBottom: -200,
          paddingBottom: 200,
          backgroundColor: '#ffffff',
          borderTopLeftRadius: 24,
          borderTopRightRadius: 24,
          maxHeight: 'calc(90dvh + 200px)',
          display: 'flex',
          flexDirection: 'column',
          boxShadow: '0 -4px 30px rgba(0,0,0,0.15)',
        }}
        onClick={e => e.stopPropagation()}
      >
        {/* Header */}
        <div className="flex items-center justify-between px-5 pt-4 pb-3 border-b shrink-0" style={{ borderColor: '#f1f5f9' }}>
          <h3 className="font-bold text-base flex items-center gap-2" style={{ color: '#1e1b4b' }}>
            <span>{emoji}</span> {title}
          </h3>
          <button onClick={onClose} className="text-gray-400 hover:text-gray-600"><X size={20} /></button>
        </div>
        {/* Contenu scrollable — limité pour ne pas déborder dans la zone padding */}
        <div style={{ overflowY: 'auto', overflowX: 'hidden', flex: 1, padding: '16px 20px', maxHeight: 'calc(90dvh - 60px)' }}>
          {children}
        </div>
      </motion.div>
    </motion.div>,
    document.body
  );
}

// ── Drawer Ma checklist ───────────────────────────────────────────────────────
function ChecklistDrawer({ evenement, onClose }) {
  return (
    <DrawerSheet title="Ma checklist" emoji="✅" onClose={onClose}>
      <ChecklistOrganisateur evenementId={evenement.id} typeEvenement={evenement.type_evenement} />
    </DrawerSheet>
  );
}

// ── Drawer Mon agenda ─────────────────────────────────────────────────────────
function RdvDrawer({ evenement, clientId, clientNom, onClose }) {
  return (
    <DrawerSheet title="Mon agenda" emoji="📅" onClose={onClose}>
      <MonAgenda
        clientId={clientId}
        evenementId={evenement.id}
        evenementNom={evenement.nom}
        clientNom={clientNom}
      />
    </DrawerSheet>
  );
}

// ── Drawer Ma liste d'invités — propulsé par l'entité Invite ─────────────────
function InvitesDrawer({ evenement, onClose }) {
  const [view, setView] = useState('dashboard'); // 'dashboard' | 'list'
  const [showModal, setShowModal] = useState(false);
  const qc = useQueryClient();

  return (
    <DrawerSheet title="Mes invités" emoji="👥" onClose={onClose}>
      {view === 'dashboard' && (
        <InvitesDashboard
          evenementId={evenement.id}
          onAddInvite={() => setShowModal(true)}
          onViewList={() => setView('list')}
        />
      )}
      {view === 'list' && (
        <>
          <button onClick={() => setView('dashboard')} className="text-xs text-purple-600 mb-3 flex items-center gap-1">
            ← Retour au tableau de bord
          </button>
          <InvitesList
            evenementId={evenement.id}
            evenementNom={evenement.nom}
          />
        </>
      )}
      {showModal && (
        <InviteModal
          evenementId={evenement.id}
          evenementNom={evenement.nom}
          invite={null}
          onClose={() => setShowModal(false)}
          onSaved={() => qc.invalidateQueries(['invites', evenement.id])}
        />
      )}
    </DrawerSheet>
  );
}

// ── Drawer Mon plan de table ──────────────────────────────────────────────────
function PlanTableDrawer({ evenement, onClose, onOpenPlanSalle }) {
  return (
    <DrawerSheet title="Mon plan de table" emoji="🪑" onClose={onClose}>
      <PlanDeTable
        evenementId={evenement.id}
        evenementNom={evenement.nom}
        evenement={evenement}
        onOpenPlanSalle={onOpenPlanSalle}
      />
    </DrawerSheet>
  );
}

// ── Drawer Programme du Jour J ────────────────────────────────────────────────
function ProgrammeDrawer({ evenement, onClose }) {
  return (
    <DrawerSheet title="Programme du Jour J" emoji="🗓️" onClose={onClose}>
      <ProgrammeJourJ evenement={evenement} />
    </DrawerSheet>
  );
}

// ── Drawer Personnalisation ───────────────────────────────────────────────────
function PersonnalisationDrawer({ evenement, clientId, clientNom, onClose }) {
  return (
    <DrawerSheet title="Personnalisation" emoji="🎨" onClose={onClose}>
      <PersonnalisationContent
        evenement={evenement}
        clientId={clientId}
        clientNom={clientNom}
        onClose={onClose}
      />
    </DrawerSheet>
  );
}

// ── Drawer Mon budget ─────────────────────────────────────────────────────────
function BudgetDrawer({ evenementId, onClose }) {
  const [postes, setPostes] = useState(() => {
    try { return JSON.parse(localStorage.getItem(`budget_${evenementId}`) || '[]'); } catch { return []; }
  });
  const [label, setLabel] = useState('');
  const [montant, setMontant] = useState('');

  const save = (list) => {
    setPostes(list);
    localStorage.setItem(`budget_${evenementId}`, JSON.stringify(list));
  };

  const addPoste = () => {
    if (!label.trim() || !montant) return;
    save([...postes, { id: Date.now(), label: label.trim(), montant: parseFloat(montant) || 0 }]);
    setLabel(''); setMontant('');
  };

  const total = postes.reduce((s, p) => s + p.montant, 0);

  return (
    <DrawerSheet title="Mon budget" emoji="💰" onClose={onClose}>
      <div className="space-y-4">
        <p className="text-xs text-gray-400 italic">Budget personnel uniquement — distinct des devis et factures de vos prestataires.</p>

        {/* Total */}
        <div className="text-center py-4 rounded-2xl border" style={{ borderColor: '#fef08a', background: '#fefce8' }}>
          <p className="text-3xl font-bold" style={{ color: '#854d0e' }}>{total.toLocaleString('fr-FR')} €</p>
          <p className="text-xs text-gray-400 mt-1">Budget total estimé</p>
        </div>

        {/* Ajout poste */}
        <div className="space-y-2 p-3 rounded-xl border" style={{ borderColor: '#e8e4dc', background: '#faf8f4' }}>
          <input value={label} onChange={e => setLabel(e.target.value)} placeholder="Libellé (ex : Fleuriste)"
            className="w-full border rounded-xl px-3 py-2 text-sm focus:outline-none" style={{ borderColor: '#e8e4dc' }} />
          <div className="flex gap-2">
            <input value={montant} onChange={e => setMontant(e.target.value)} type="number" placeholder="Montant €"
              className="flex-1 border rounded-xl px-3 py-2 text-sm focus:outline-none" style={{ borderColor: '#e8e4dc' }} />
            <button onClick={addPoste} disabled={!label.trim() || !montant}
              className="px-4 py-2 rounded-xl text-white text-sm font-semibold disabled:opacity-40"
              style={{ background: '#1e1b4b' }}>
              <Plus size={14} />
            </button>
          </div>
        </div>

        {/* Postes */}
        <div className="space-y-2">
          {postes.map(p => (
            <div key={p.id} className="flex items-center gap-3 p-3 rounded-xl border" style={{ borderColor: '#e8e4dc' }}>
              <p className="flex-1 text-sm" style={{ color: '#1e1b4b' }}>{p.label}</p>
              <p className="font-semibold text-sm" style={{ color: '#854d0e' }}>{p.montant.toLocaleString('fr-FR')} €</p>
              <button onClick={() => save(postes.filter(x => x.id !== p.id))} className="text-gray-300 hover:text-red-400">
                <Trash2 size={14} />
              </button>
            </div>
          ))}
          {postes.length === 0 && (
            <p className="text-center text-sm text-gray-400 py-6">Aucun poste budgétaire ajouté</p>
          )}
        </div>
      </div>
    </DrawerSheet>
  );
}

// ── Drawer Mes inspirations ───────────────────────────────────────────────────
function InspirationsDrawer({ evenementId, onClose }) {
  const [url, setUrl] = useState('');
  const [note, setNote] = useState('');
  const [inspirations, setInspirations] = useState(() => {
    try { return JSON.parse(localStorage.getItem(`inspirations_${evenementId}`) || '[]'); } catch { return []; }
  });

  const save = (list) => {
    setInspirations(list);
    localStorage.setItem(`inspirations_${evenementId}`, JSON.stringify(list));
  };

  const isImage = (u) => /\.(jpg|jpeg|png|webp|gif)$/i.test(u) || u.includes('unsplash') || u.includes('images');

  const addInspi = () => {
    if (!url.trim()) return;
    save([...inspirations, { id: Date.now(), url: url.trim(), note }]);
    setUrl(''); setNote('');
  };

  return (
    <DrawerSheet title="Mes inspirations" emoji="🎨" onClose={onClose}>
      <div className="space-y-4">
        <p className="text-xs text-gray-400 italic">Collez des liens d'images (Pinterest, Instagram, Unsplash…) pour créer votre moodboard.</p>

        {/* Ajout */}
        <div className="space-y-2 p-3 rounded-xl border" style={{ borderColor: '#e8e4dc', background: '#faf8f4' }}>
          <input value={url} onChange={e => setUrl(e.target.value)} placeholder="URL de l'image ou de la page"
            className="w-full border rounded-xl px-3 py-2 text-sm focus:outline-none" style={{ borderColor: '#e8e4dc' }} />
          <div className="flex gap-2">
            <input value={note} onChange={e => setNote(e.target.value)} placeholder="Note (optionnelle)"
              className="flex-1 border rounded-xl px-3 py-2 text-sm focus:outline-none" style={{ borderColor: '#e8e4dc' }} />
            <button onClick={addInspi} disabled={!url.trim()}
              className="px-4 py-2 rounded-xl text-white text-sm font-semibold disabled:opacity-40"
              style={{ background: '#be123c' }}>
              <Heart size={14} />
            </button>
          </div>
        </div>

        {/* Grille moodboard */}
        <div className="grid grid-cols-2 gap-2">
          {inspirations.map(ins => (
            <div key={ins.id} className="relative rounded-xl overflow-hidden border group" style={{ borderColor: '#fecdd3' }}>
              {isImage(ins.url) ? (
                <img src={ins.url} alt={ins.note || 'Inspiration'} className="w-full h-28 object-cover" />
              ) : (
                <a href={ins.url} target="_blank" rel="noopener noreferrer"
                  className="flex items-center justify-center h-28 bg-pink-50 text-pink-400 text-2xl">🔗</a>
              )}
              {ins.note && (
                <p className="text-[10px] px-2 py-1 bg-white text-gray-500 truncate">{ins.note}</p>
              )}
              <button
                onClick={() => save(inspirations.filter(x => x.id !== ins.id))}
                className="absolute top-1 right-1 w-6 h-6 rounded-full bg-black/40 text-white flex items-center justify-center opacity-0 group-hover:opacity-100 transition-opacity">
                <X size={10} />
              </button>
            </div>
          ))}
        </div>
        {inspirations.length === 0 && (
          <p className="text-center text-sm text-gray-400 py-6">Votre moodboard est vide — ajoutez vos premières inspirations !</p>
        )}
      </div>
    </DrawerSheet>
  );
}

// ── Carte organisation — charte premium identique à l'onglet Événement ───────
function OrgCard({ card, onClick, badge, badgeAccent }) {
  const Icon = card.icon;
  return (
    <motion.button
      whileTap={{ scale: 0.97 }}
      onClick={onClick}
      className="premium-card flex flex-col items-start gap-2 p-5 text-left w-full"
    >
      <div className="w-11 h-11 rounded-xl flex items-center justify-center shrink-0 relative z-[3]" style={{ background: 'rgba(30,27,75,0.06)' }}>
        <Icon size={22} strokeWidth={1.75} style={{ color: '#1e1b4b' }} />
      </div>
      <div className="space-y-0.5 w-full relative z-[3]">
        <p className="premium-card-title text-sm leading-tight" style={{ color: '#1e1b4b' }}>{card.label}</p>
        <p className="text-[11px] leading-snug" style={{ color: '#9ca3af' }}>{card.sublabel}</p>
        {badge && (
          <span className="inline-block text-[10px] font-semibold px-2 py-0.5 rounded-full mt-1 relative z-[3]"
            style={{ background: badgeAccent ? `${badgeAccent}20` : 'rgba(30,27,75,0.08)', color: badgeAccent || '#1e1b4b' }}>
            {badge}
          </span>
        )}
      </div>
    </motion.button>
  );
}

// ── Carte Programme du Jour J — charte premium identique ─────────────────────
function ProgrammeBanner({ onClick }) {
  return (
    <motion.button
      whileTap={{ scale: 0.97 }}
      onClick={onClick}
      className="premium-card flex flex-col items-start gap-2 p-5 text-left w-full"
    >
      <div className="w-11 h-11 rounded-xl flex items-center justify-center shrink-0 relative z-[3]" style={{ background: 'rgba(30,27,75,0.06)' }}>
        <CalendarDays size={22} strokeWidth={1.75} style={{ color: '#1e1b4b' }} />
      </div>
      <div className="space-y-0.5 w-full relative z-[3]">
        <p className="premium-card-title text-sm leading-tight" style={{ color: '#1e1b4b' }}>Programme du Jour J</p>
        <p className="text-[11px] leading-snug" style={{ color: '#9ca3af' }}>Partagez votre journée avec vos invités</p>
      </div>
    </motion.button>
  );
}

// ── Composant principal ────────────────────────────────────────────────────────
export default function MonEspaceTab({ evenement, clientId, clientNom }) {
  const qc = useQueryClient();
  const [activeDrawer, setActiveDrawer] = useState(null);
  const [reduceOverride, setReduceOverride] = useState(null);
  const [planSalleEspace, setPlanSalleEspace] = useState(null);
  const handleOpenPlanSalle = (espace) => {
    setActiveDrawer(null);
    setPlanSalleEspace(espace);
  };

  const personnalisationReduced = reduceOverride !== null
    ? reduceOverride
    : evenement?.personnalisation_card_reduced === true;

  const handleTogglePersonnalisationReduce = async (reduced) => {
    setReduceOverride(reduced);
    if (evenement?.id) {
      try {
        await base44.entities.Evenement.update(evenement.id, { personnalisation_card_reduced: reduced });
        qc.invalidateQueries();
      } catch (_) { /* ignore */ }
    }
  };

  // ── Indicateurs dynamiques pour les cartes ───────────────────────────────────
  // Checklist — depuis TacheChecklist
  const { data: tachesChecklist = [] } = useQuery({
    queryKey: ['taches-checklist', evenement?.id],
    queryFn: () => base44.entities.TacheChecklist.filter({ evenement_id: evenement.id }),
    enabled: !!evenement?.id,
    staleTime: 30000,
  });
  const checklistTotal = tachesChecklist.length;
  const checklistDone  = tachesChecklist.filter(i => i.complete).length;

  // Rendez-vous — chargés depuis la base
  const { data: rdvList = [] } = useQuery({
    queryKey: ['rdv-portal-badges', evenement?.id],
    queryFn: () => base44.entities.RendezVous.filter({ evenement_id: evenement.id }),
    enabled: !!evenement?.id,
    staleTime: 60000,
  });
  const prochainRdv = rdvList
    .filter(r => {
      if (r.statut === 'Annulé' || r.statut === 'Terminé') return false;
      const dateRef = r.statut === 'Confirmé' ? r.date_confirmee : r.date_souhaitee;
      if (!dateRef) return false;
      return !isPast(new Date(dateRef + 'T00:00:00'));
    })
    .sort((a, b) => {
      const dA = a.statut === 'Confirmé' ? a.date_confirmee : a.date_souhaitee;
      const dB = b.statut === 'Confirmé' ? b.date_confirmee : b.date_souhaitee;
      return (dA || '').localeCompare(dB || '');
    })[0];

  // Invités — chargés depuis la base
  const { data: invitesList = [] } = useQuery({
    queryKey: ['invites', evenement?.id],
    queryFn: () => base44.entities.Invite.filter({ evenement_id: evenement.id }),
    enabled: !!evenement?.id,
    staleTime: 30000,
  });
  const nbConfirmes = invitesList.filter(i => i.statut_rsvp === 'Confirmé').length;
  const nbInvites = invitesList.length;

  // Plan de table — résolution partagée (espace actif + configurations validées).
  const { espacesLieu, propsValidees, espaceActif } = usePlanSalleConfig(evenement);
  const { data: tablesList = [] } = useQuery({
    queryKey: ['tables', evenement?.id],
    queryFn: () => evenement?.id
      ? base44.entities.TableEvenement.filter({ evenement_id: evenement.id }, 'ordre', 50)
      : [],
    enabled: !!evenement?.id,
    staleTime: 30000,
  });

  const nbInvitesPlaces = invitesList.filter(i =>
    !(i.archived && i.prenom === '_groupe_') && !!i.table_attribuee && i.table_attribuee !== ''
  ).length;

  // Badge contextuel de la carte « Mon plan de table » :
  //  - configs validées + aucune table → « N config(s) dispo · Choisissez » (champagne)
  //  - configs validées + tables existantes → compteur placés + configs (champagne)
  //  - espace défini sans config → « Espace défini » (neutre)
  //  - sinon → comportement historique (compteur placés ou rien)
  const nbConfigs = propsValidees.length;
  const nbTables = tablesList.length;
  const espaceExiste = !!evenement?.espace_lieu_id || espacesLieu.length > 0;
  let planBadge = null;
  let planBadgeAccent = null;
  if (nbConfigs > 0 && nbTables === 0) {
    planBadge = `${nbConfigs} config${nbConfigs > 1 ? 's' : ''} dispo · Choisissez`;
    planBadgeAccent = '#C5A059';
  } else if (nbConfigs > 0 && nbTables > 0) {
    planBadge = `${nbInvitesPlaces} placé${nbInvitesPlaces > 1 ? 's' : ''} · ${nbConfigs} config${nbConfigs > 1 ? 's' : ''}`;
    planBadgeAccent = '#C5A059';
  } else if (espaceExiste) {
    planBadge = 'Espace défini';
    planBadgeAccent = null;
  } else {
    planBadge = nbInvitesPlaces > 0 ? `${nbInvitesPlaces} placé${nbInvitesPlaces > 1 ? 's' : ''}` : null;
    planBadgeAccent = null;
  }

  // Budget — localStorage
  const budgetPostes = (() => {
    try { return JSON.parse(localStorage.getItem(`budget_${evenement?.id}`) || '[]'); } catch { return []; }
  })();
  const budgetTotal = budgetPostes.reduce((s, p) => s + (p.montant || 0), 0);

  // Inspirations — localStorage
  const inspirations = (() => {
    try { return JSON.parse(localStorage.getItem(`inspirations_${evenement?.id}`) || '[]'); } catch { return []; }
  })();

  return (
    <div className="py-4 space-y-8 px-4">

      {/* ═══════════════════════════════════════════════════════════════════════
          SECTION 1 — MON ORGANISATION PERSONNELLE
          ══════════════════════════════════════════════════════════════════════ */}
      <div className="space-y-3">
        {/* Carte Personnalisation — pleine largeur ou compacte selon l'état */}
        <PersonnalisationCard
          evenement={{ ...evenement, personnalisation_card_reduced: personnalisationReduced }}
          clientId={clientId}
          onClick={() => setActiveDrawer('personnalisation')}
          onToggleReduce={handleTogglePersonnalisationReduce}
        />

        {/* Grille 2 colonnes */}
        <div className="grid grid-cols-2 gap-3">
          {/* Ma checklist */}
          <OrgCard
            card={ORG_CARDS[0]}
            onClick={() => setActiveDrawer('checklist')}
            badge={checklistTotal > 0
              ? `${checklistDone}/${checklistTotal} faites`
              : null}
          />
          {/* Mes rendez-vous */}
          <OrgCard
            card={ORG_CARDS[1]}
            onClick={() => setActiveDrawer('rdv')}
            badge={prochainRdv
              ? `${format(new Date((prochainRdv.statut === 'Confirmé' ? prochainRdv.date_confirmee : prochainRdv.date_souhaitee) + 'T00:00:00'), 'd MMM', { locale: fr })}`
              : rdvList.length > 0 ? `${rdvList.length} RDV` : null}
          />
          {/* Ma liste d'invités */}
          <OrgCard
            card={ORG_CARDS[2]}
            onClick={() => setActiveDrawer('invites')}
            badge={nbInvites > 0 ? `${nbConfirmes}/${nbInvites} confirmés` : null}
          />
          {/* Mon plan de table */}
          <OrgCard
            card={ORG_CARDS[3]}
            onClick={() => setActiveDrawer('plan_table')}
            badge={planBadge}
            badgeAccent={planBadgeAccent}
          />
          {/* Mon budget */}
          <OrgCard
            card={ORG_CARDS[4]}
            onClick={() => setActiveDrawer('budget')}
            badge={budgetTotal > 0
              ? `${budgetTotal.toLocaleString('fr-FR')} €`
              : null}
          />
          {/* Mes inspirations */}
          <OrgCard
            card={ORG_CARDS[5]}
            onClick={() => setActiveDrawer('inspirations')}
            badge={inspirations.length > 0
              ? `${inspirations.length} enregistrée${inspirations.length > 1 ? 's' : ''}`
              : null}
          />
        </div>

        {/* Bannière Programme du Jour J — pleine largeur */}
        <ProgrammeBanner onClick={() => setActiveDrawer('programme')} />
      </div>

      {/* ── Drawers section 1 ──────────────────────────────────────────────── */}
      <AnimatePresence>
        {activeDrawer === 'checklist' && (
          <ChecklistDrawer evenement={evenement} onClose={() => setActiveDrawer(null)} />
        )}
        {activeDrawer === 'rdv' && (
          <RdvDrawer evenement={evenement} clientId={clientId} clientNom={clientNom} onClose={() => setActiveDrawer(null)} />
        )}
        {activeDrawer === 'invites' && (
          <InvitesDrawer evenement={evenement} onClose={() => setActiveDrawer(null)} />
        )}
        {activeDrawer === 'plan_table' && (
          <PlanTableDrawer evenement={evenement} onClose={() => setActiveDrawer(null)} onOpenPlanSalle={handleOpenPlanSalle} />
        )}
        {activeDrawer === 'budget' && (
          <BudgetDrawer evenementId={evenement.id} onClose={() => setActiveDrawer(null)} />
        )}
        {activeDrawer === 'inspirations' && (
          <InspirationsDrawer evenementId={evenement.id} onClose={() => setActiveDrawer(null)} />
        )}
        {activeDrawer === 'programme' && (
          <ProgrammeDrawer evenement={evenement} onClose={() => setActiveDrawer(null)} />
        )}
        {activeDrawer === 'personnalisation' && (
          <PersonnalisationDrawer evenement={evenement} clientId={clientId} clientNom={clientNom} onClose={() => setActiveDrawer(null)} />
        )}
      </AnimatePresence>

      {planSalleEspace && (
        <PlanSalleScreen
          evenement={evenement}
          espace={planSalleEspace}
          onClose={() => setPlanSalleEspace(null)}
        />
      )}
    </div>
  );
}