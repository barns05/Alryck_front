/**
 * Hook réutilisable pour l'authentification des portails (Extra, Prestataire, Lieu, Client).
 * 
 * Usage:
 *   const { authStep, authError, isAuthenticated, handleRegister, handleLogin, handleForgotPassword, handleSkip, handleLogout }
 *     = usePortalAuth({ entityId, entityEmail, entityPassword, entityPasswordField, onSavePassword, sendLoginLink });
 */

import { useState, useEffect } from 'react';

async function hashPassword(password) {
  const encoder = new TextEncoder();
  const data = encoder.encode(password + 'planyse_salt_2024');
  const hashBuffer = await crypto.subtle.digest('SHA-256', data);
  return Array.from(new Uint8Array(hashBuffer)).map(b => b.toString(16).padStart(2, '0')).join('');
}

function getSessionKey(entityType, entityId) {
  return `planyse_session_${entityType}_${entityId}`;
}

function getFirstVisitKey(token) {
  return `planyse_first_${token}`;
}

export function usePortalAuth({ token, entityType, entityId, entityEmail, portalPassword, onSavePassword, onSendForgotLink }) {
  const [authStep, setAuthStep] = useState(null); // null | 'register' | 'login'
  const [authError, setAuthError] = useState('');
  const [isAuthenticated, setIsAuthenticated] = useState(false);
  const [ready, setReady] = useState(false);

  useEffect(() => {
    if (!entityId || !token) return;

    const sessionKey = getSessionKey(entityType, entityId);
    const session = (() => { try { return JSON.parse(localStorage.getItem(sessionKey) || 'null'); } catch { return null; } })();

    if (portalPassword) {
      // L'entité a un compte — vérifier la session
      if (session?.entityId === entityId) {
        setIsAuthenticated(true);
      } else {
        setAuthStep('login');
      }
    } else {
      // Pas encore de compte — première visite ?
      const firstVisitKey = getFirstVisitKey(token);
      if (!localStorage.getItem(firstVisitKey)) {
        localStorage.setItem(firstVisitKey, '1');
        setAuthStep('register');
      } else {
        setIsAuthenticated(true);
      }
    }
    setReady(true);
  }, [entityId, token, portalPassword, entityType]);

  const saveSession = (entityId) => {
    const sessionKey = getSessionKey(entityType, entityId);
    localStorage.setItem(sessionKey, JSON.stringify({ entityId, ts: Date.now() }));
  };

  const handleRegister = async (email, password) => {
    setAuthError('');
    const hash = await hashPassword(password);
    await onSavePassword(hash, email);
    saveSession(entityId);
    setIsAuthenticated(true);
    setAuthStep(null);
  };

  const handleSkip = () => {
    setAuthStep(null);
    setIsAuthenticated(true);
  };

  const handleLogin = async (email, password) => {
    setAuthError('');
    const hash = await hashPassword(password);
    if (portalPassword === hash) {
      saveSession(entityId);
      setIsAuthenticated(true);
      setAuthStep(null);
    } else {
      setAuthError('Email ou mot de passe incorrect.');
    }
  };

  const handleForgotPassword = async (email) => {
    if (onSendForgotLink) await onSendForgotLink(email);
  };

  const handleLogout = () => {
    const sessionKey = getSessionKey(entityType, entityId);
    localStorage.removeItem(sessionKey);
    setIsAuthenticated(false);
    setAuthStep('login');
  };

  return { authStep, authError, isAuthenticated, ready, handleRegister, handleLogin, handleForgotPassword, handleSkip, handleLogout };
}