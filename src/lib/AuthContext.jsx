import React, { createContext, useState, useContext, useEffect, useCallback } from 'react';
import { base44, tokenStore } from '@/api/base44Client';

// =============================================================================
//  Contexte d'authentification
// =============================================================================
//  Réécrit pour le back-office Alryck. La forme exposée est **identique** à celle de la
//  version Base44 (user, isAuthenticated, isLoadingAuth, isLoadingPublicSettings,
//  authError, appPublicSettings, logout, navigateToLogin, checkAppState) : aucun écran
//  n'a besoin d'être touché.
//
//  Ce qui change dessous : plus d'appel aux « public settings » de la plateforme, plus de
//  redirection vers un service d'authentification tiers. Le compte est porté par ce back,
//  et un même compte peut appartenir à plusieurs entreprises — d'où la notion de contexte.
// =============================================================================

const AuthContext = createContext();

/** Routes accessibles sans compte : les portails à lien et l'inscription. */
const PUBLIC_PATHS = [
  '/login', '/register',
  '/client-portal', '/prospect-portal', '/prospect-preview', '/invite-portal',
  '/programme-public', '/espace-invite', '/invitation-detail',
  '/extra-portal', '/prestataire-portal', '/lieu-portal',
];

export const isPublicPath = (pathname) => PUBLIC_PATHS.some((p) => pathname.startsWith(p));

export const AuthProvider = ({ children }) => {
  const [user, setUser] = useState(null);
  const [isAuthenticated, setIsAuthenticated] = useState(false);
  const [isLoadingAuth, setIsLoadingAuth] = useState(true);
  const [authError, setAuthError] = useState(null);
  const [contexts, setContexts] = useState([]);

  const checkAppState = useCallback(async () => {
    setAuthError(null);
    setIsLoadingAuth(true);

    // Un portail à lien n'a pas besoin de compte : ne pas exiger de jeton là-bas.
    if (!tokenStore.get()) {
      setUser(null);
      setIsAuthenticated(false);
      setIsLoadingAuth(false);
      if (!isPublicPath(window.location.pathname)) {
        setAuthError({ type: 'auth_required', message: 'Authentification requise' });
      }
      return;
    }

    try {
      const currentUser = await base44.auth.me();
      setUser(currentUser);
      setIsAuthenticated(true);

      // Contextes de travail : une entreprise, un jeu de rôles. Le sélecteur ne s'affiche
      // que s'il y en a plusieurs.
      try {
        setContexts(await base44.auth.contexts());
      } catch {
        setContexts([]);
      }
    } catch (error) {
      setUser(null);
      setIsAuthenticated(false);
      if (error.status === 401 || error.status === 403) {
        setAuthError({ type: 'auth_required', message: 'Authentification requise' });
      } else {
        setAuthError({ type: 'unknown', message: error.message ?? 'Chargement impossible' });
      }
    } finally {
      setIsLoadingAuth(false);
    }
  }, []);

  useEffect(() => {
    checkAppState();

    // Le client émet cet événement dès qu'une requête revient en 401 : on repasse en
    // « non authentifié » sans attendre le prochain rechargement de page.
    const onUnauthenticated = () => {
      setUser(null);
      setIsAuthenticated(false);
      if (!isPublicPath(window.location.pathname)) {
        setAuthError({ type: 'auth_required', message: 'Session expirée' });
      }
    };

    window.addEventListener('alryck:unauthenticated', onUnauthenticated);
    return () => window.removeEventListener('alryck:unauthenticated', onUnauthenticated);
  }, [checkAppState]);

  const logout = () => {
    setUser(null);
    setIsAuthenticated(false);
    setContexts([]);
    base44.auth.logout();
  };

  const navigateToLogin = () => base44.auth.redirectToLogin();

  const switchContext = async (tenantId) => {
    await base44.auth.switchContext(tenantId);
    await checkAppState();
  };

  return (
    <AuthContext.Provider value={{
      user,
      isAuthenticated,
      isLoadingAuth,
      // Conservé pour ne pas toucher aux écrans : il n'y a plus de réglages de plateforme
      // à charger, donc l'attente est terminée d'emblée.
      isLoadingPublicSettings: false,
      appPublicSettings: null,
      authError,
      contexts,
      switchContext,
      logout,
      navigateToLogin,
      checkAppState,
    }}>
      {children}
    </AuthContext.Provider>
  );
};

export const useAuth = () => {
  const context = useContext(AuthContext);
  if (!context) throw new Error('useAuth must be used within an AuthProvider');
  return context;
};
