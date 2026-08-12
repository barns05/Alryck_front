/**
 * ClientPortal — Espace client unifié
 *
 * Shell principal avec :
 *  - 3 onglets en haut : Mon événement / Ma sélection / Mon espace
 *  - BottomNav fixe en bas : Accueil / Messages / Médias / Documents / Notifications
 *  - Mode prospect pur conservé sans BottomNav
 */
import { useState, useEffect, useRef, useCallback } from 'react';
import { useQuery, useQueryClient } from '@tanstack/react-query';
import { base44 } from '@/api/base44Client';
import { LogOut, Check, MoreVertical, User, Bell, CalendarDays, ChevronDown, Palette, Lock, Plus, ShieldAlert } from 'lucide-react';
import { motion, AnimatePresence } from 'framer-motion';
import { ALRYCK_CRISTAL_URL } from '@/lib/brandAssets';
import { useOwnerCompanySettings } from '@/hooks/useOwnerCompanySettings';
import PortalHeader from '@/components/portal/PortalHeader';
import PortalAuthModal from '@/components/portal/PortalAuthModal';
import PWABanner from '@/components/client-portal/PWABanner';
import ClientPortalHeader from '@/components/client-portal/ClientPortalHeader';
import UnifiedClientPortalTabs from '@/components/client-portal/UnifiedClientPortalTabs';
import ProspectSection from '@/components/client-portal/ProspectSection';
import BottomNav from '@/components/client-portal/BottomNav';
import OnboardingOverlay from '@/components/client-portal/OnboardingOverlay';
import CreateEvenementModal from '@/components/client-portal/CreateEvenementModal';
import { usePortalAuth } from '@/hooks/usePortalAuth';
import { usePortalResolution } from '@/hooks/usePortalResolution';

import UserMenuDrawer from '@/components/client-portal/UserMenuDrawer';
import ConsolidatedMessagesView from '@/components/client-portal/ConsolidatedMessagesView';
import ConsolidatedMediasView from '@/components/client-portal/ConsolidatedMediasView';
import ConsolidatedDocumentsView from '@/components/client-portal/ConsolidatedDocumentsView';
import NotificationsView from '@/components/client-portal/NotificationsView';

// Étapes de l'onboarding guidé (cibles data-onboarding-target)
const ONBOARDING_STEPS = [
  { target: 'tab-evenement',       text: 'Retrouvez ici vos prestataires confirmés et toutes les infos de votre événement.' },
  { target: 'tab-recommandations', text: 'Recherchez ou recevez des recommandations de nouveaux prestataires.' },
  { target: 'personnalisation-card', preSwitch: 'tab-organisation', text: 'Donnez vie à votre événement : photo, ambiance et thème visuel.' },
  { target: 'tab-organisation',     text: 'Toute la planification de votre événement au même endroit.' },
];

export default function ClientPortal() {
  const qc = useQueryClient();
  const [selectedEvenementId, setSelectedEvenementId] = useState(null);
  const [showPWA, setShowPWA] = useState(false);
  const [activeNav, setActiveNav] = useState('accueil');
  const [showOnboarding, setShowOnboarding] = useState(false);
  const onboardingShownRef = useRef(false);
  const [messagesPrestataireFilter, setMessagesPrestataireFilter] = useState(null);
  const [showCreateEvenement, setShowCreateEvenement] = useState(false);
  const [creatingEvenement, setCreatingEvenement] = useState(false);

  const urlParams = new URLSearchParams(window.location.search);
  const token = urlParams.get('token');

  // ── Persistance de la dernière sélection d'événement (par token client) ──
  const storageKey = token ? `selected-evenement-${token}` : null;
  const handleSelectEvenement = useCallback((id) => {
    setSelectedEvenementId(id);
    if (storageKey) {
      try { localStorage.setItem(storageKey, id); } catch {}
    }
  }, [storageKey]);

  // ── Résolution du token ────────────────────────────────────────────────────
  const { mode, client, prospect, evenements, lieux, loading, error, refetch } = usePortalResolution(token);

  // ── Sélection de l'événement courant ──────────────────────────────────────
  useEffect(() => {
    if (evenements.length > 0 && !selectedEvenementId) {
      // Restaurer la dernière sélection persistée si elle correspond à un événement existant
      let restored = null;
      if (storageKey) {
        try { restored = localStorage.getItem(storageKey); } catch {}
      }
      const valid = restored && evenements.some(e => e.id === restored);
      setSelectedEvenementId(valid ? restored : evenements[0].id);
    }
  }, [evenements, storageKey]);

  // ── Refresh frais de l'événement sélectionné ──────────────────────────────
  const { data: evenementFrais } = useQuery({
    queryKey: ['evenement-portal', selectedEvenementId],
    queryFn: () => base44.entities.Evenement.filter({ id: selectedEvenementId }).then(r => r[0] || null),
    enabled: !!selectedEvenementId,
  });

  // ── CompanySettings ────────────────────────────────────────────────────────
  const { settings } = useOwnerCompanySettings();

  // ── Auth ───────────────────────────────────────────────────────────────────
  const authEntity = mode === 'prospect' ? prospect : client;
  const authType   = mode === 'prospect' ? 'prospect' : 'client';

  const { authStep, authError, isAuthenticated, handleRegister, handleLogin, handleForgotPassword, handleSkip, handleLogout } = usePortalAuth({
    token,
    entityType: authType,
    entityId: authEntity?.id,
    entityEmail: authEntity?.email,
    portalPassword: authEntity?.portal_password,
    onSavePassword: async (hash, email) => {
      const entity = authType === 'prospect' ? base44.entities.Prospect : base44.entities.Client;
      await entity.update(authEntity.id, { portal_password: hash, portal_email: email });
      if (authType === 'client') setShowPWA(true);
    },
    onSendForgotLink: async (email) => {
      await base44.integrations.Core.SendEmail({
        to: email,
        subject: 'Accès à votre espace',
        body: `Bonjour,\n\nVoici votre lien d'accès :\n${window.location.href}\n\nCordialement`,
      });
    },
  });

  useEffect(() => {
    if (isAuthenticated && client?.portal_password) setShowPWA(true);
  }, [isAuthenticated, client?.portal_password]);

  // ── Onboarding guidé : une seule fois dans la vie du compte Client ─────────
  useEffect(() => {
    if (!isAuthenticated || !client || !evenement) return;
    if (client.onboarding_vu) return;
    if (onboardingShownRef.current) return;
    onboardingShownRef.current = true;
    setShowOnboarding(true);
  }, [isAuthenticated, client?.id, selectedEvenementId]);

  const handleOnboardingComplete = async () => {
    setShowOnboarding(false);
    if (client?.id) {
      try {
        await base44.entities.Client.update(client.id, { onboarding_vu: true });
        qc.invalidateQueries();
      } catch (e) { /* non bloquant */ }
    }
  };

  // ── Menu utilisateur (dropdown) ───────────────────────────────────────────
  const [userMenuOpen, setUserMenuOpen] = useState(false);
  const userMenuRef = useRef(null);
  const [accountMenuOpen, setAccountMenuOpen] = useState(false);
  const accountMenuRef = useRef(null);

  // ── UserMenuDrawer ─────────────────────────────────────────────────────────
  const [userDrawerOpen, setUserDrawerOpen] = useState(false);
  const [userDrawerTab, setUserDrawerTab] = useState('profil');

  const openUserDrawer = (tab) => {
    setAccountMenuOpen(false);
    setUserDrawerTab(tab);
    setUserDrawerOpen(true);
  };


  useEffect(() => {
    const handleClick = (e) => {
      if (userMenuRef.current && !userMenuRef.current.contains(e.target)) {
        setUserMenuOpen(false);
      }
      if (accountMenuRef.current && !accountMenuRef.current.contains(e.target)) {
        setAccountMenuOpen(false);
      }
    };
    document.addEventListener('mousedown', handleClick);
    return () => document.removeEventListener('mousedown', handleClick);
  }, []);

  // ── Navigation BottomNav ───────────────────────────────────────────────────
  const handleNavChange = (tabId) => {
    setActiveNav(tabId);
  };

  const handleNavigateToMessages = (prestataire_id, prestataire_nom) => {
    setMessagesPrestataireFilter({ prestataire_id, prestataire_nom });
    handleNavChange('messages');
  };

  // ── Création d'un nouvel événement par le client ─────────────────────────────
  const handleCreateEvenement = async (payload) => {
    setCreatingEvenement(true);
    try {
      const newEv = await base44.entities.Evenement.create(payload);
      await refetch();
      await qc.invalidateQueries({ queryKey: ['evenement-portal', newEv.id] });
      handleSelectEvenement(newEv.id);
      setShowCreateEvenement(false);
      return newEv;
    } finally {
      setCreatingEvenement(false);
    }
  };

  // ── Loading / Error ────────────────────────────────────────────────────────
  if (loading) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-background">
        <div className="w-8 h-8 border-4 border-slate-200 border-t-primary rounded-full animate-spin" />
      </div>
    );
  }

  if (error) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-background p-4">
        <div className="text-center max-w-sm">
          <div className="text-5xl mb-4">🔒</div>
          <h2 className="text-xl font-bold mb-2">Accès impossible</h2>
          <p className="text-muted-foreground text-sm">{error}</p>
        </div>
      </div>
    );
  }

  // ── Données dérivées ───────────────────────────────────────────────────────
  const evenement = evenementFrais || evenements.find(e => e.id === selectedEvenementId) || evenements[0] || null;
  const lieu      = evenement?.lieu_id ? lieux[evenement.lieu_id] : null;

  const clientNom = client
    ? (`${client.prenom || ''} ${client.nom}`.trim() + (client.prenom2 ? ' & ' + client.prenom2 + ' ' + (client.nom2 || client.nom) : ''))
    : prospect
      ? (prospect.prenom + ' ' + prospect.nom + (prospect.prenom2 ? ' & ' + prospect.prenom2 + ' ' + (prospect.nom2 || prospect.nom) : ''))
      : 'Client';

  const accentColor = evenement?.couleur_theme || '#1e1b4b';

  // ── MODE PROSPECT PUR ──────────────────────────────────────────────────────
  if (mode === 'prospect') {
    return (
      <div className="min-h-screen overflow-x-hidden" style={{ background: '#faf8f4' }}>
        {authStep && (
          <PortalAuthModal
            mode={authStep}
            entityEmail={prospect?.portal_email || prospect?.email || ''}
            entityNom={clientNom}
            onRegister={handleRegister}
            onLogin={handleLogin}
            onForgotPassword={handleForgotPassword}
            onSkip={handleSkip}
            error={authError}
            portalType="prospect"
          />
        )}

        <div id="portal-header-sticky" className="sticky top-0 z-40">
          <PortalHeader
            subtitle="Votre projet ✨"
            portalType="prospect"
            logoSize={40}
            subtitlePosition="right"
          />
        </div>

        <div className="px-4 pt-4 pb-8 space-y-4">
          <ProspectSection prospect={prospect} settings={settings} />
        </div>
      </div>
    );
  }

  // ── MODE CLIENT (direct ou converti) ──────────────────────────────────────
  // Contenu de la vue active dans la BottomNav
  const renderNavContent = () => {
    if (activeNav === 'accueil') {
      return (
        <div key="accueil">
          {/* Bannière événement */}
          {evenement && <ClientPortalHeader evenement={evenement} lieu={lieu} couleurTheme={evenement.couleur_theme} client={client} clientNom={clientNom} />}
          {/* Navigation onglets Mon événement / Ma sélection / Mon espace */}
          {evenement && (
            <UnifiedClientPortalTabs
              evenement={evenement}
              clientId={evenement.client_id}
              clientNom={clientNom}
              prospect={prospect || null}
              settings={settings}
              espaceScrollTarget={null}
              onEspaceScrollDone={() => {}}
              onNavigateToMessages={handleNavigateToMessages}
            />
          )}
        </div>
      );
    }

    if (activeNav === 'messages') {
      return (
        <div key="messages">
          {evenement && (
            <ConsolidatedMessagesView
              evenement={evenement}
              clientId={evenement.client_id}
              clientNom={clientNom}
              prestataireFilter={messagesPrestataireFilter}
              onPrestataireFilterConsumed={() => setMessagesPrestataireFilter(null)}
            />
          )}
        </div>
      );
    }

    if (activeNav === 'medias') {
      return (
        <div key="medias">
          {evenement && (
            <ConsolidatedMediasView evenement={evenement} clientNom={clientNom} />
          )}
        </div>
      );
    }

    if (activeNav === 'documents') {
      return (
        <div key="documents">
          {evenement && (
            <ConsolidatedDocumentsView
              clientId={evenement.client_id}
              evenementId={evenement.id}
              clientEmail={evenement.client_email}
            />
          )}
        </div>
      );
    }

    if (activeNav === 'notifications') {
      return (
        <div key="notifications">
          {evenement && (
            <NotificationsView
              evenement={evenement}
              clientId={evenement.client_id}
            />
          )}
        </div>
      );
    }

    return null;
  };

  return (
    <div className="min-h-screen" style={{ background: '#faf8f4' }}>
      {authStep && (
        <PortalAuthModal
          mode={authStep}
          entityEmail={client?.portal_email || client?.email || ''}
          entityNom={clientNom}
          onRegister={handleRegister}
          onLogin={handleLogin}
          onForgotPassword={handleForgotPassword}
          onSkip={handleSkip}
          error={authError}
          portalType="client"
        />
      )}

      {/* Header fixe — charte Alryck */}
      <div id="portal-header-sticky" className="sticky top-0 z-40" style={{ background: '#1e1b4b' }}>
        <div className="flex items-center justify-between px-4 py-3">
          {/* Logo */}
          <div className="flex items-center shrink-0">
            <img
              src={ALRYCK_CRISTAL_URL}
              alt="Alryck"
              className="h-10 w-10 object-contain"
            />
          </div>

          {/* Sélecteur d'événement — centre */}
          {evenements.length > 0 && (
            <div className="flex-1 flex justify-center px-3">
              <div className="relative" ref={userMenuRef}>
                <button
                  onClick={() => setUserMenuOpen(v => !v)}
                  className="flex items-center gap-1.5 px-3 py-1.5 rounded-xl transition-colors"
                  style={{ background: 'rgba(255,255,255,0.10)' }}
                >
                  <span className="text-white text-xs font-semibold truncate max-w-[130px]">
                    {evenement?.nom || clientNom}
                  </span>
                  <motion.div animate={{ rotate: userMenuOpen ? 180 : 0 }} transition={{ duration: 0.2 }}>
                    <ChevronDown size={13} className="text-white/60 shrink-0" />
                  </motion.div>
                </button>
                <AnimatePresence>
                  {userMenuOpen && (
                    <motion.div
                      initial={{ opacity: 0, y: -6, scale: 0.96 }}
                      animate={{ opacity: 1, y: 0, scale: 1 }}
                      exit={{ opacity: 0, y: -6, scale: 0.96 }}
                      transition={{ duration: 0.15 }}
                      className="absolute left-1/2 -translate-x-1/2 mt-2 w-52 max-w-[calc(100vw-2rem)] rounded-2xl shadow-xl overflow-hidden z-50"
                      style={{ background: '#1e1b4b', border: '1px solid rgba(255,255,255,0.12)' }}
                    >
                      {/* Événements */}
                      <div>
                        <p className="px-4 pt-3 pb-1 text-[10px] font-bold uppercase tracking-widest"
                          style={{ color: 'rgba(255,255,255,0.35)' }}>
                          Mes événements
                        </p>
                        {evenements.map(ev => (
                          <button
                            key={ev.id}
                            onClick={() => { handleSelectEvenement(ev.id); setUserMenuOpen(false); }}
                            className="w-full flex items-center gap-2.5 px-4 py-2.5 text-left transition-colors hover:bg-white/5"
                            style={{ background: selectedEvenementId === ev.id ? 'rgba(201,168,76,0.12)' : 'transparent' }}
                          >
                            <CalendarDays size={13} className="shrink-0" style={{ color: selectedEvenementId === ev.id ? '#c9a84c' : 'rgba(255,255,255,0.45)' }} />
                            <span className="flex-1 text-xs font-medium text-white truncate">{ev.nom}</span>
                            {selectedEvenementId === ev.id && (
                              <Check size={11} style={{ color: '#c9a84c' }} className="shrink-0" />
                            )}
                          </button>
                        ))}

                        {/* Séparateur + Création nouvel événement */}
                        <div style={{ borderTop: '1px solid rgba(255,255,255,0.10)', margin: '4px 0' }} />
                        <button
                          onClick={() => { setShowCreateEvenement(true); setUserMenuOpen(false); }}
                          className="w-full flex items-center gap-2.5 px-4 py-2.5 text-left transition-colors hover:bg-white/5"
                        >
                          <Plus size={13} className="shrink-0" style={{ color: '#c9a84c' }} />
                          <span className="flex-1 text-xs font-semibold" style={{ color: '#c9a84c' }}>Créer un nouvel événement</span>
                        </button>
                      </div>
                    </motion.div>
                  )}
                </AnimatePresence>
              </div>
            </div>
          )}

          {/* Bouton menu utilisateur (⋯) — droite */}
          <div className="shrink-0 flex justify-end">
            <div className="relative" ref={accountMenuRef}>
              <button
                onClick={() => { setUserMenuOpen(false); setAccountMenuOpen(v => !v); }}
                className="flex items-center justify-center w-8 h-8 rounded-xl transition-colors"
                style={{ background: accountMenuOpen ? 'rgba(255,255,255,0.18)' : 'rgba(255,255,255,0.08)' }}
              >
                <MoreVertical size={16} className="text-white/80" />
              </button>

              <AnimatePresence>
                {accountMenuOpen && (
                  <motion.div
                    initial={{ opacity: 0, y: -6, scale: 0.96 }}
                    animate={{ opacity: 1, y: 0, scale: 1 }}
                    exit={{ opacity: 0, y: -6, scale: 0.96 }}
                    transition={{ duration: 0.15 }}
                    className="absolute right-0 mt-2 w-52 rounded-2xl shadow-xl overflow-hidden z-50"
                    style={{ background: '#1e1b4b', border: '1px solid rgba(255,255,255,0.12)' }}
                  >
                    <p className="px-4 pt-3 pb-1 text-[10px] font-bold uppercase tracking-widest" style={{ color: 'rgba(255,255,255,0.35)' }}>Mon compte</p>
                    <button onClick={() => openUserDrawer('profil')} className="w-full flex items-center gap-2.5 px-4 py-3 text-left hover:bg-white/5 transition-colors">
                      <User size={14} className="text-white/60 shrink-0" />
                      <span className="text-xs font-medium text-white">Mon profil</span>
                    </button>
                    <button onClick={() => openUserDrawer('personnalisation')} className="w-full flex items-center gap-2.5 px-4 py-3 text-left hover:bg-white/5 transition-colors">
                      <Palette size={14} className="text-white/60 shrink-0" />
                      <span className="text-xs font-medium text-white">Personnalisation</span>
                    </button>
                    <button onClick={() => openUserDrawer('notifications')} className="w-full flex items-center gap-2.5 px-4 py-3 text-left hover:bg-white/5 transition-colors">
                      <Bell size={14} className="text-white/60 shrink-0" />
                      <span className="text-xs font-medium text-white">Notifications</span>
                    </button>
                    <button onClick={() => openUserDrawer('confidentialite')} className="w-full flex items-center gap-2.5 px-4 py-3 text-left hover:bg-white/5 transition-colors">
                      <Lock size={14} className="text-white/60 shrink-0" />
                      <span className="text-xs font-medium text-white">Confidentialité</span>
                    </button>
                    <button onClick={() => openUserDrawer('evenement')} className="w-full flex items-center gap-2.5 px-4 py-3 text-left hover:bg-white/5 transition-colors">
                      <ShieldAlert size={14} className="shrink-0" style={{ color: 'rgba(255,180,120,0.9)' }} />
                      <span className="text-xs font-medium text-white">Gérer mon événement</span>
                    </button>
                    <div style={{ borderTop: '1px solid rgba(255,255,255,0.08)' }} />
                    <button onClick={() => { setAccountMenuOpen(false); handleLogout(); }} className="w-full flex items-center gap-2.5 px-4 py-3 text-left hover:bg-white/5 transition-colors">
                      <LogOut size={14} className="shrink-0" style={{ color: 'rgba(255,100,100,0.85)' }} />
                      <span className="text-xs font-medium" style={{ color: 'rgba(255,100,100,0.85)' }}>Déconnexion</span>
                    </button>
                  </motion.div>
                )}
              </AnimatePresence>
            </div>
          </div>
        </div>
      </div>

      {showPWA && isAuthenticated && <PWABanner />}

      {/* Contenu principal — paddingBottom pour laisser place à la BottomNav */}
      <div style={{ paddingBottom: 'calc(60px + env(safe-area-inset-bottom, 0px))' }}>
        <div key={activeNav}>
          {renderNavContent()}
        </div>
      </div>

      {/* UserMenuDrawer */}
      <UserMenuDrawer
        open={userDrawerOpen}
        onClose={() => setUserDrawerOpen(false)}
        initialTab={userDrawerTab}
        clientId={evenement?.client_id}
        evenement={evenement}
        onEvenementUpdate={() => qc.invalidateQueries({ queryKey: ['evenement-portal', evenement?.id] })}
      />

      {/* BottomNav fixe */}
      <BottomNav
        activeTab={activeNav}
        onTabChange={handleNavChange}
        evenement={evenement}
        clientId={evenement?.client_id}
        accentColor={accentColor}
      />

      {/* Onboarding guidé (une seule fois par compte client) */}
      {showOnboarding && client && (
        <OnboardingOverlay
          steps={ONBOARDING_STEPS}
          onComplete={handleOnboardingComplete}
          onSkip={handleOnboardingComplete}
        />
      )}

      {/* Création d'un nouvel événement par le client */}
      {showCreateEvenement && (
        <CreateEvenementModal
          client={client}
          creating={creatingEvenement}
          onClose={() => setShowCreateEvenement(false)}
          onSubmit={handleCreateEvenement}
        />
      )}
    </div>
  );
}