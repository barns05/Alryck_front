/**
 * BottomNav — Barre de navigation principale de l'espace client.
 *
 * Refonte : la barre du bas accueille désormais les 4 onglets premium
 * (Événement / Organisation / Mes favoris / Recherche), icônes seules avec
 * pastille active mise en évidence. Le swipe horizontal (TabCarousel) reste
 * synchronisé via le store partagé portalTabStore.
 *
 * Les 5 raccourcis transverses (Accueil / Messagerie / Médias / Documents /
 * Alertes) avec leurs badges numériques sont regroupés dans un bouton
 * flottant (FAB) en bas à droite, au-dessus de la barre des 4 onglets. Le FAB
 * n'est visible que sur la vue d'accueil (là où vivent les 4 onglets).
 */
import { useState, useRef, useEffect } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { Plus, X, Handshake, Calendar, Heart, Search } from 'lucide-react';
import { useQuery } from '@tanstack/react-query';
import { base44 } from '@/api/base44Client';
import { usePortalActiveTab, setActiveTabId } from './portalTabStore';
import { subscribeBack } from './portalNavStore';

// ── 4 onglets premium (barre du bas) ──────────────────────────────────────────
// onboardingTarget conserve les anciens ids data-onboarding-target utilisés par
// l'onboarding guidé de ClientPortal (fichier protégé) — on garde la compat.
const TAB_DEFS = [
  { id: 'evenement',    Icon: Handshake, label: 'Événement',    onboardingTarget: 'tab-evenement' },
  { id: 'organisation', Icon: Calendar,  label: 'Organisation', onboardingTarget: 'tab-organisation' },
  { id: 'favoris',      Icon: Heart,     label: 'Favoris',      onboardingTarget: 'tab-recommandations' },
  { id: 'recherche',    Icon: Search,    label: 'Recherche',    onboardingTarget: null },
];

// ── 5 raccourcis transverses (menu FAB) ───────────────────────────────────────
const SHORTCUTS = [
  { id: 'accueil',       label: 'Accueil',     emoji: '🏠' },
  { id: 'messages',      label: 'Messagerie',  emoji: '💬' },
  { id: 'medias',        label: 'Médias',       emoji: '📸' },
  { id: 'documents',     label: 'Documents',   emoji: '📄' },
  { id: 'notifications', label: 'Alertes',     emoji: '🔔' },
];

function useBadges({ evenement, clientId }) {
  const evenementId = evenement?.id;
  const clientIdFinal = clientId || (evenement ? `guest-${evenement.id}` : null);

  const { data: conversations = [] } = useQuery({
    queryKey: ['conversations-badge', clientIdFinal, evenementId],
    queryFn: () => base44.entities.Conversation.filter({
      client_id: clientIdFinal,
      evenement_id: evenementId,
    }),
    enabled: !!evenementId,
    refetchInterval: 30000,
  });

  const { data: medias = [] } = useQuery({
    queryKey: ['photos-client', evenementId],
    queryFn: () => base44.entities.PhotoClient.filter({ evenement_id: evenementId }),
    enabled: !!evenementId,
  });

  const { data: documents = [] } = useQuery({
    queryKey: ['client-documents', clientId, evenementId],
    queryFn: () => clientId
      ? base44.entities.ClientDocument.filter({ client_id: clientId }, '-created_date', 100)
      : [],
    enabled: !!clientId && !!evenementId,
  });

  const { data: devis = [] } = useQuery({
    queryKey: ['devis-client-portal', evenementId],
    queryFn: () => base44.entities.Devis.filter({ evenement_id: evenementId }),
    enabled: !!evenementId,
  });

  const { data: evPrestataires = [] } = useQuery({
    queryKey: ['ev-prestataires-client', evenementId],
    queryFn: () => base44.entities.EvenementPrestataire.filter({ evenement_id: evenementId }),
    enabled: !!evenementId,
  });

  const { data: contrats = [] } = useQuery({
    queryKey: ['client-contrats-badge', clientId],
    queryFn: () => clientId
      ? base44.entities.Contrat.filter({ client_id: clientId, type: 'client' }, '-created_date', 50)
      : [],
    enabled: !!clientId,
  });

  const nonLusTotal = conversations.reduce((acc, c) => acc + (c.non_lus_client || 0), 0);
  const nbMedias = medias.length;
  const nbDocs = documents.length + devis.filter(d => d.statut !== 'Brouillon').length;
  const nbNouveauxPrestataires = evPrestataires.filter(ep => ep.vu_par_client === false).length;
  const sevenDaysAgo = Date.now() - 7 * 86400000;
  const nbNouveauxContrats = contrats.filter(c => c.statut !== 'Archivé' && new Date(c.created_date) > sevenDaysAgo).length;

  return {
    accueil: 0,
    messages: nonLusTotal,
    medias: 0,
    documents: 0,
    notifications: nbNouveauxPrestataires + nbNouveauxContrats,
  };
}

export default function BottomNav({ activeTab, onTabChange, evenement, clientId, accentColor }) {
  const activePremiumTab = usePortalActiveTab();
  const badges = useBadges({ evenement, clientId });
  const [fabOpen, setFabOpen] = useState(false);
  const fabRef = useRef(null);
  const onTabChangeRef = useRef(onTabChange);
  useEffect(() => { onTabChangeRef.current = onTabChange; });

  // Pont de retour vers l'accueil (déclenché par PortalBackButton dans les vues secondaires)
  useEffect(() => {
    return subscribeBack(() => onTabChangeRef.current?.('accueil'));
  }, []);

  // Fermer le menu FAB au clic/tap extérieur + touche Échap
  useEffect(() => {
    if (!fabOpen) return;
    const handler = (e) => {
      if (fabRef.current && !fabRef.current.contains(e.target)) setFabOpen(false);
    };
    const onKey = (e) => { if (e.key === 'Escape') setFabOpen(false); };
    document.addEventListener('mousedown', handler);
    document.addEventListener('touchstart', handler, { passive: true });
    document.addEventListener('keydown', onKey);
    return () => {
      document.removeEventListener('mousedown', handler);
      document.removeEventListener('touchstart', handler);
      document.removeEventListener('keydown', onKey);
    };
  }, [fabOpen]);

  const handlePremiumClick = (id) => {
    setFabOpen(false);
    setActiveTabId(id);
    // Revenir sur la vue d'accueil (où vivent les 4 onglets) si on était sur un raccourci
    if (onTabChange) onTabChange('accueil');
  };

  const handleShortcutClick = (id) => {
    setFabOpen(false);
    if (onTabChange) onTabChange(id);
  };

  const totalBadge = (badges.messages || 0) + (badges.notifications || 0);
  const showFab = activeTab === 'accueil';

  return (
    <>
      {/* ── Bouton flottant (FAB) + menu raccourcis ──────────────────────────── */}
      {showFab && (
        <div
          ref={fabRef}
          className="fixed right-4 z-50"
          style={{ bottom: 'calc(72px + env(safe-area-inset-bottom, 0px))' }}
        >
          {/* Menu des 5 raccourcis — se déploie au-dessus du bouton */}
          <AnimatePresence>
            {fabOpen && (
              <motion.div
                initial={{ opacity: 0, y: 12, scale: 0.95 }}
                animate={{ opacity: 1, y: 0, scale: 1 }}
                exit={{ opacity: 0, y: 12, scale: 0.95 }}
                transition={{ duration: 0.18 }}
                className="absolute right-0 bottom-16 flex flex-col gap-2 items-end"
              >
                {SHORTCUTS.map((s) => {
                  const b = badges[s.id] || 0;
                  return (
                    <motion.button
                      key={s.id}
                      whileTap={{ scale: 0.95 }}
                      onClick={() => handleShortcutClick(s.id)}
                      className="flex items-center gap-3 pl-3 pr-4 py-2.5 rounded-2xl shadow-lg"
                      style={{ background: '#ffffff', border: '1px solid rgba(0,0,0,0.08)' }}
                    >
                      <span className="text-xl leading-none">{s.emoji}</span>
                      <span className="text-sm font-semibold" style={{ color: '#1e1b4b' }}>{s.label}</span>
                      {b > 0 && (
                        <span
                          className="ml-auto min-w-[20px] h-5 rounded-full flex items-center justify-center text-[10px] font-bold text-white px-1.5"
                          style={{ background: '#ef4444' }}
                        >
                          {b > 99 ? '99+' : b}
                        </span>
                      )}
                    </motion.button>
                  );
                })}
              </motion.div>
            )}
          </AnimatePresence>

          {/* Bouton flottant */}
          <motion.button
            whileTap={{ scale: 0.92 }}
            onClick={() => setFabOpen(v => !v)}
            className="relative w-14 h-14 rounded-2xl flex items-center justify-center shadow-xl"
            style={{ background: '#1e1b4b', color: '#ffffff' }}
            aria-label={fabOpen ? 'Fermer le menu des raccourcis' : 'Ouvrir le menu des raccourcis'}
          >
            <motion.span
              key={fabOpen ? 'close' : 'open'}
              initial={{ rotate: -90, opacity: 0 }}
              animate={{ rotate: 0, opacity: 1 }}
              transition={{ duration: 0.18 }}
              className="leading-none"
            >
              {fabOpen ? <X size={26} strokeWidth={2.5} /> : <Plus size={26} strokeWidth={2.5} />}
            </motion.span>
            {!fabOpen && totalBadge > 0 && (
              <span
                className="absolute -top-1 -right-1 min-w-[20px] h-5 rounded-full flex items-center justify-center text-[10px] font-bold text-white px-1.5"
                style={{ background: '#ef4444', border: '2px solid #ffffff' }}
              >
                {totalBadge > 99 ? '99+' : totalBadge}
              </span>
            )}
          </motion.button>
        </div>
      )}

      {/* ── Barre des 4 onglets — fixe en bas ─────────────────────────────────── */}
      <nav
        className="fixed bottom-0 left-0 right-0 z-40 flex items-center justify-around"
        style={{
          background: '#ffffff',
          borderTop: '1px solid rgba(0,0,0,0.08)',
          boxShadow: '0 -4px 20px rgba(0,0,0,0.08)',
          paddingBottom: 'env(safe-area-inset-bottom, 0px)',
          height: 'calc(60px + env(safe-area-inset-bottom, 0px))',
        }}
      >
        {TAB_DEFS.map((tab) => {
          const isActive = activePremiumTab === tab.id;
          return (
            <button
              key={tab.id}
              onClick={() => handlePremiumClick(tab.id)}
              data-onboarding-target={tab.onboardingTarget || undefined}
              className="relative flex-1 h-full flex flex-col items-center justify-center gap-0.5"
              aria-label={tab.label}
            >
              {isActive && (
                <motion.div
                  layoutId="premium-nav-pill"
                  className="absolute rounded-full"
                  style={{ background: 'rgba(197,160,89,0.18)', width: 40, height: 40, zIndex: 0, left: '50%', top: '50%', marginLeft: -20, marginTop: -20 }}
                  transition={{ type: 'spring', stiffness: 400, damping: 30 }}
                />
              )}
              <motion.span
                className="relative z-10 leading-none"
                animate={{ scale: isActive ? 1.18 : 1 }}
                transition={{ type: 'spring', stiffness: 400, damping: 25 }}
                style={{ color: isActive ? '#C5A059' : '#5b6488' }}
              >
                <tab.Icon size={24} strokeWidth={isActive ? 2.75 : 2.5} />
              </motion.span>
              <span
                className="relative z-10 text-[10px] leading-none font-semibold whitespace-nowrap"
                style={{ color: isActive ? '#1e1b4b' : '#5b6488' }}
              >
                {tab.label}
              </span>
            </button>
          );
        })}
      </nav>
    </>
  );
}