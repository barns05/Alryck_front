import { Toaster } from "@/components/ui/toaster"
import { Toaster as SonnerToaster } from 'sonner';
import { QueryClientProvider } from '@tanstack/react-query'
import { queryClientInstance } from '@/lib/query-client'
import { BrowserRouter as Router, Route, Routes, Navigate } from 'react-router-dom';
import PageNotFound from './lib/PageNotFound';
import Register from '@/pages/Register';
import Login from '@/pages/Login';
import { AuthProvider, useAuth } from '@/lib/AuthContext';
import UserNotRegisteredError from '@/components/UserNotRegisteredError';
import { useState, useEffect } from 'react';
import { base44 } from '@/api/base44Client';
import { useNavigate } from 'react-router-dom';
import OnboardingModal from '@/components/onboarding/OnboardingModal';
import SplashScreen from '@/components/SplashScreen';
import SplashDevButton from '@/components/SplashDevButton';
import LoadingCristal from '@/components/LoadingCristal';
import Layout from '@/components/Layout';
import Dashboard from '@/pages/Dashboard';
import Planning from '@/pages/Planning';
import MonPlanning from '@/pages/MonPlanning';
import Clients from '@/pages/Clients';
import Evenements from '@/pages/Evenements';
import EvenementClient from '@/pages/EvenementClient';
import Lieux from '@/pages/Lieux';
import Prestataires from '@/pages/Prestataires';
import PrestatairePlanning from '@/pages/PrestatairePlanning';
import MonEspacePrestataire from '@/pages/MonEspacePrestataire';
import ClientPortal from '@/pages/ClientPortal';
import ClientDetail from '@/pages/ClientDetail';
import PlanningExtras from '@/pages/PlanningExtras';
import ExtraPortal from '@/pages/ExtraPortal';
import PrestatairePortal from '@/pages/PrestatairePortal';
import LieuPortal from '@/pages/LieuPortal';
import GaleriePhotos from '@/pages/GaleriePhotos';
import Bibliotheque from '@/pages/Bibliotheque';
import EffectifSettings from '@/pages/EffectifSettings';
import Analyse from '@/pages/Analyse';
import Promotions from '@/pages/Promotions';
import PromotionsHistorique from '@/pages/PromotionsHistorique';
import ToutesNotifications from '@/pages/ToutesNotifications';
import ProspectPortal from '@/pages/ProspectPortal';
import ProspectPreview from '@/pages/ProspectPreview';
import ConfigurerEvenement from '@/pages/ConfigurerEvenement';
import Automatisations from '@/pages/Automatisations';
import Facturation from '@/pages/Facturation';
import Rappels from '@/pages/Rappels';
import Business from '@/pages/Business';
import EquipePartenaires from '@/pages/EquipePartenaires';
import Developpement from '@/pages/Developpement';
import Medias from '@/pages/Medias';
import PartenairesLieux from '@/pages/PartenairesLieux';
import Contrats from '@/pages/Contrats';
import ParametresEntreprise from '@/pages/ParametresEntreprise';
import Equipe from '@/pages/Equipe';
import Extras from '@/pages/Extras';
import Abonnements from '@/pages/Abonnements';
import TestAnimations from '@/pages/TestAnimations';
import MaVitrine from '@/pages/MaVitrine';
import InvitePortal from '@/pages/InvitePortal';
import ProgrammePublic from '@/pages/ProgrammePublic';
import EspaceInvite from '@/pages/EspaceInvite';
import InvitationDetail from '@/pages/InvitationDetail';
import { homeRouteFor, isBackOffice } from '@/lib/roles';

const AuthenticatedApp = ({ onAuthReady }) => {
  const { isLoadingAuth, isLoadingPublicSettings, authError, navigateToLogin } = useAuth();

  useEffect(() => {
    if (!isLoadingAuth && !isLoadingPublicSettings) {
      onAuthReady?.();
    }
  }, [isLoadingAuth, isLoadingPublicSettings]);
  const [currentUser, setCurrentUser] = useState(null);
  // L'accueil se décide sur les rôles : tant qu'ils ne sont pas connus, rediriger
  // reviendrait à parier sur « aucun rôle » et à expédier un administrateur vers
  // l'espace personnel le temps d'un aller-retour réseau.
  const [userResolved, setUserResolved] = useState(false);
  const [showOnboarding, setShowOnboarding] = useState(false);

  useEffect(() => {
    base44.auth.me().then(async (user) => {
      setCurrentUser(user);
      // L'onboarding demande une raison sociale, un métier et un téléphone professionnel :
      // c'est la configuration d'une **entreprise**. `isBackOffice` exclut les espaces
      // personnels, dont le titulaire porte pourtant `Owner` comme un patron de traiteur —
      // sans cette nuance, un particulier qui vient d'ouvrir son espace se voyait demander
      // le nom de sa société.
      if (isBackOffice(user)) {
        // Vérifier le flag onboarding_completed dans le profil utilisateur
        const onboardingCompleted = user.onboarding_completed === true;

        // Si c'est un nouvel utilisateur (pas encore de flag), afficher l'onboarding
        if (!onboardingCompleted) {
          setShowOnboarding(true);
        }
      }
    }).catch(() => {}).finally(() => setUserResolved(true));
  }, []);

  if (isLoadingPublicSettings || isLoadingAuth) {
    return (
      <div className="fixed inset-0 flex items-center justify-center" style={{ background: 'radial-gradient(ellipse at center, #2d2a6e 0%, #1e1b4b 70%)' }}>
        <LoadingCristal size={56} />
      </div>
    );
  }

  if (authError) {
    if (authError.type === 'user_not_registered') {
      return <UserNotRegisteredError />;
    } else if (authError.type === 'auth_required') {
      const PUBLIC_PATHS = ['/client-portal', '/prospect-portal', '/prospect-preview',
        '/invite-portal', '/programme-public', '/espace-invite', '/invitation-detail',
        '/extra-portal', '/prestataire-portal', '/lieu-portal'];
      const isPublicRoute = PUBLIC_PATHS.some(p => window.location.pathname.startsWith(p));
      if (!isPublicRoute) {
        navigateToLogin();
        return null;
      }
    }
  }

  return (
    <>
      <Routes>
        {/* L'accueil dépend des rôles du contexte courant, jamais d'un rôle unique deviné :
            un propriétaire porte `Owner` *et* `Admin`, et un compte fraîchement inscrit n'en
            porte aucun. `homeRouteFor` centralise la règle (voir src/lib/roles.js). */}
        <Route
          path="/"
          element={userResolved
            ? <Navigate to={homeRouteFor(currentUser)} replace />
            : (
              <div className="fixed inset-0 flex items-center justify-center" style={{ background: 'radial-gradient(ellipse at center, #2d2a6e 0%, #1e1b4b 70%)' }}>
                <LoadingCristal size={56} />
              </div>
            )}
        />
        <Route element={<Layout />}>
          <Route path="/Dashboard" element={<Dashboard />} />
          <Route path="/Planning" element={<Planning />} />
          <Route path="/MonPlanning" element={<MonPlanning />} />
          <Route path="/MonEspacePrestataire" element={<MonEspacePrestataire />} />
          <Route path="/Evenements" element={<Evenements />} />
          <Route path="/Clients" element={<Clients />} />
          <Route path="/Lieux" element={<Lieux />} />
          <Route path="/Prestataires" element={<Prestataires />} />
          <Route path="/clients/:clientId" element={<ClientDetail />} />
          <Route path="/PlanningExtras" element={<PlanningExtras />} />
          <Route path="/parametres-entreprise" element={<ParametresEntreprise />} />
          <Route path="/bibliotheque" element={<Bibliotheque />} />
          <Route path="/galerie-photos" element={<GaleriePhotos />} />
          <Route path="/effectif-settings" element={<EffectifSettings />} />
          <Route path="/analyse" element={<Analyse />} />
          <Route path="/promotions" element={<Promotions />} />
          <Route path="/promotions-historique" element={<PromotionsHistorique />} />
          <Route path="/notifications" element={<ToutesNotifications />} />
          <Route path="/configurer-evenement" element={<ConfigurerEvenement />} />
          <Route path="/automatisations" element={<Automatisations />} />
          <Route path="/facturation" element={<Facturation />} />
          <Route path="/rappels" element={<Rappels />} />
          <Route path="/business" element={<Business />} />
          <Route path="/equipe-partenaires" element={<EquipePartenaires />} />
          <Route path="/developpement" element={<Developpement />} />
          <Route path="/medias" element={<Medias />} />
          <Route path="/partenaires-lieux" element={<PartenairesLieux />} />
          <Route path="/contrats" element={<Contrats />} />
          <Route path="/juridique-securite" element={<Navigate to="/contrats" replace />} />
          <Route path="/parametres-hub" element={<Navigate to="/ma-vitrine" replace />} />
          <Route path="/equipe" element={<Equipe />} />
          <Route path="/extras" element={<Extras />} />
          <Route path="/abonnements" element={<Abonnements />} />
          <Route path="/test-animations" element={<TestAnimations />} />
          <Route path="/ma-vitrine" element={<MaVitrine />} />
        </Route>
        <Route path="/evenement-client" element={<EvenementClient />} />
        <Route path="/prestataire-planning" element={<PrestatairePlanning />} />
        <Route path="/client-portal" element={<ClientPortal />} />
        <Route path="/extra-portal" element={<ExtraPortal />} />
        <Route path="/prestataire-portal" element={<PrestatairePortal />} />
        <Route path="/lieu-portal" element={<LieuPortal />} />
        <Route path="/prospect-portal" element={<ProspectPortal />} />
        <Route path="/prospect-preview" element={<ProspectPreview />} />
        <Route path="/invite-portal" element={<InvitePortal />} />
        <Route path="/programme-public" element={<ProgrammePublic />} />
        <Route path="/espace-invite" element={<EspaceInvite />} />
        <Route path="/invitation-detail" element={<InvitationDetail />} />
        <Route path="*" element={<PageNotFound />} />
      </Routes>
      {showOnboarding && currentUser && (
        <OnboardingModal
          user={currentUser}
          onComplete={async () => {
            await base44.auth.updateMe({ onboarding_completed: true });
            setShowOnboarding(false);
            // Rediriger vers la page abonnements si toujours sur Gratuit
            const companyList = await base44.entities.CompanySettings.list();
            const company = companyList.find(cs => cs.is_owner === true);
            if (!company?.subscription_level || company.subscription_level === 'Gratuit') {
              window.location.href = '/abonnements';
            }
          }}
        />
      )}
    </>
  );
};

function App() {
  const [splashDone, setSplashDone] = useState(false);
  const [authReady, setAuthReady] = useState(false);

  return (
    <AuthProvider>
      <QueryClientProvider client={queryClientInstance}>
        {!splashDone && <SplashScreen onDone={() => setSplashDone(true)} ready={authReady} />}
        <Router>
          <Routes>
            {/* Routes publiques — hors AuthenticatedApp, accessibles sans jeton */}
            <Route path="/login" element={<Login />} />
            <Route path="/register" element={<Register />} />
            {/* Toutes les routes authentifiées */}
            <Route path="/*" element={<AuthenticatedApp onAuthReady={() => setAuthReady(true)} />} />
          </Routes>
        </Router>
        <SplashDevButton />
        <Toaster />
        <SonnerToaster position="top-center" richColors />
      </QueryClientProvider>
    </AuthProvider>
  )
}

export default App