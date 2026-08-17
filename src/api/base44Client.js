// =============================================================================
//  Client Alryck — remplace le SDK Base44
// =============================================================================
//  Expose exactement la même interface que `@base44/sdk` (`base44.entities.X.filter()`,
//  `base44.auth.me()`, `base44.functions.Y()`, `base44.integrations.Core.UploadFile()`),
//  mais parle au back-office .NET.
//
//  C'est le seul fichier de plomberie à avoir changé : les quelque huit cents appels
//  répartis dans plus de trois cents fichiers continuent de fonctionner tels quels.
//
//  Dispositif transitoire : chaque module basculé sur un endpoint métier propre cesse de
//  passer par ici. L'en-tête `X-Alryck-Screen` permet de mesurer ce qui reste branché.
// =============================================================================

const API_BASE = import.meta.env.VITE_ALRYCK_API ?? 'https://localhost:7100';

const TOKEN_KEY = 'alryck.token';
const TENANT_KEY = 'alryck.tenant';

export const tokenStore = {
  get: () => localStorage.getItem(TOKEN_KEY),
  set: (token) => localStorage.setItem(TOKEN_KEY, token),
  clear: () => {
    localStorage.removeItem(TOKEN_KEY);
    localStorage.removeItem(TENANT_KEY);
  },
  getTenant: () => localStorage.getItem(TENANT_KEY),
  setTenant: (tenantId) => localStorage.setItem(TENANT_KEY, tenantId),
};

/** Écran courant, renseigné par le routeur. Sert à mesurer l'usage de la compatibilité. */
let currentScreen = 'inconnu';
export const setCurrentScreen = (name) => { currentScreen = name; };

export class ApiError extends Error {
  constructor(message, status, payload) {
    super(message);
    this.name = 'ApiError';
    this.status = status;
    this.payload = payload;
    // Code stable renvoyé par le serveur : compat.write_not_implemented,
    // tenant.violation, auth.invalid_credentials…
    this.code = payload?.code;
  }
}

function safeParse(text) {
  try { return JSON.parse(text); } catch { return text; }
}

async function request(path, { method = 'GET', body, signal } = {}) {
  const headers = {
    'Content-Type': 'application/json',
    'X-Alryck-Screen': currentScreen,
  };

  const token = tokenStore.get();
  if (token) headers.Authorization = `Bearer ${token}`;

  const response = await fetch(`${API_BASE}${path}`, {
    method,
    headers,
    body: body === undefined ? undefined : JSON.stringify(body),
    signal,
  });

  if (response.status === 401) {
    tokenStore.clear();
    window.dispatchEvent(new CustomEvent('alryck:unauthenticated'));
    throw new ApiError('Session expirée', 401, { code: 'auth.expired' });
  }

  if (response.status === 204) return null;

  const text = await response.text();
  const payload = text ? safeParse(text) : null;

  if (!response.ok) {
    throw new ApiError(payload?.message ?? `Erreur ${response.status}`, response.status, payload);
  }

  return payload;
}

// --- Entités -----------------------------------------------------------------

function entity(name) {
  return {
    list: (sort, limit) => {
      const params = new URLSearchParams();
      if (sort) params.set('sort', sort);
      if (limit) params.set('limit', String(limit));
      const query = params.toString();
      return request(`/api/entities/${name}${query ? `?${query}` : ''}`);
    },

    filter: (filter, sort, limit) =>
      request(`/api/entities/${name}/query`, {
        method: 'POST',
        body: { filter, sort, limit },
      }),

    get: (id) => request(`/api/entities/${name}/${id}`),

    create: (data) => request(`/api/entities/${name}`, { method: 'POST', body: data }),

    update: (id, data) => request(`/api/entities/${name}/${id}`, { method: 'PUT', body: data }),

    delete: (id) => request(`/api/entities/${name}/${id}`, { method: 'DELETE' }),

    bulkCreate: (rows) => request(`/api/entities/${name}/bulk`, { method: 'POST', body: rows }),

    // Le temps réel n'a pas encore d'équivalent : un seul écran l'utilisait. On dégrade en
    // scrutation, le temps que SignalR soit branché.
    subscribe: (callback, intervalMs = 15000) => {
      let stopped = false;
      const tick = async () => {
        if (stopped) return;
        try {
          const rows = await request(`/api/entities/${name}`);
          callback({ type: 'poll', data: rows });
        } catch { /* une erreur de scrutation ne doit pas casser l'écran */ }
        if (!stopped) setTimeout(tick, intervalMs);
      };
      setTimeout(tick, intervalMs);
      return () => { stopped = true; };
    },
  };
}

const entities = new Proxy({}, {
  get: (cache, name) => {
    if (typeof name !== 'string') return undefined;
    if (!cache[name]) cache[name] = entity(name);
    return cache[name];
  },
});

// --- Authentification --------------------------------------------------------
//  La plateforme managée disparaît : le compte est porté par ce back, et un même compte
//  peut appartenir à plusieurs entreprises (voir /api/me/contexts).

let cachedUser = null;

const auth = {
  isAuthenticated: () => Boolean(tokenStore.get()),

  loginViaEmailPassword: async (email, password) => {
    const result = await request('/api/auth/login', {
      method: 'POST',
      body: { email, password },
    });

    tokenStore.set(result.accessToken);
    if (result.contexts?.length === 1) tokenStore.setTenant(result.contexts[0].tenantId);

    cachedUser = null;
    return result;
  },

  register: async ({ email, password, displayName, firstName, lastName } = {}) => {
    const result = await request('/api/auth/register', {
      method: 'POST',
      body: { email, password, displayName, firstName, lastName },
    });

    tokenStore.set(result.accessToken);
    cachedUser = null;
    return result;
  },

  me: async () => {
    if (cachedUser) return cachedUser;
    const me = await request('/api/me');

    // Forme attendue par le front hérité : il lit `role` pour rediriger après connexion.
    cachedUser = {
      ...me,
      full_name: me.displayName,
      role: (me.currentRoles ?? []).map((r) => r.toLowerCase())[0] ?? 'user',
      roles: me.currentRoles ?? [],
      // « Business » ou « Personal ». Le rôle ne suffit pas à router : le propriétaire d'un
      // espace personnel porte Owner comme un patron de traiteur, mais son accueil n'est
      // pas le back-office.
      tenantKind: me.currentTenantKind ?? null,
    };
    return cachedUser;
  },

  /**
   * Mise à jour du profil personnel.
   *
   * Le front hérité parle encore la forme Base44 (`full_name`, `role`,
   * `onboarding_completed`) : on traduit les champs qui ont un équivalent et on laisse
   * tomber les autres. `role` en particulier n'est **pas** transmis : dans Base44 le
   * navigateur écrivait son propre rôle sur son compte, ici il est porté par l'appartenance
   * et décidé côté serveur.
   */
  updateMe: async (data = {}) => {
    const body = {
      displayName: data.displayName ?? data.full_name,
      firstName: data.firstName ?? data.first_name,
      lastName: data.lastName ?? data.last_name,
      avatarUrl: data.avatarUrl ?? data.avatar_url,
      locale: data.locale,
    };

    // Les clés `undefined` disparaissent à la sérialisation : le serveur pratique la fusion
    // partielle, donc n'envoyer que ce qui change suffit.
    const updated = await request('/api/me', { method: 'PUT', body });
    cachedUser = null;
    return updated;
  },

  /** Contextes de travail du compte : une entreprise, un jeu de rôles. */
  contexts: () => request('/api/me/contexts'),

  /** Bascule d'entreprise : réémet un jeton portant le nouveau contexte. */
  switchContext: async (tenantId) => {
    const result = await request(`/api/me/contexts/${tenantId}`, { method: 'POST' });
    tokenStore.set(result.accessToken);
    tokenStore.setTenant(tenantId);
    cachedUser = null;
    return result;
  },

  logout: () => {
    tokenStore.clear();
    cachedUser = null;
    if (window.location.pathname !== '/login') window.location.href = '/login';
  },

  redirectToLogin: () => {
    const from = encodeURIComponent(window.location.pathname + window.location.search);
    window.location.href = `/login?from=${from}`;
  },

  // La vérification par code à usage unique était propre à la plateforme Base44. Le compte
  // est créé directement ; la confirmation d'adresse passera par un lien de courriel.
  verifyOtp: async () => ({ verified: true }),
  resendOtp: async () => ({ sent: false, reason: 'otp_non_supporte' }),
};

// --- Référentiels partagés ---------------------------------------------------

const referentials = {
  /**
   * Métiers de la plateforme, plus ceux ajoutés par l'entreprise. Servi sans authentification :
   * le formulaire d'inscription en a besoin avant que le compte existe.
   *
   * Remplace la liste de quarante libellés que le formulaire codait en dur — sans identifiant
   * stable, donc impossibles à référencer depuis une vitrine ou à filtrer dans l'annuaire.
   */
  trades: () => request('/api/trades'),
};

// --- Entreprise --------------------------------------------------------------
//  Base44 n'avait pas de notion d'entreprise : `CompanySettings` était un enregistrement
//  ordinaire que le navigateur créait lui-même. Ici l'entreprise est l'unité d'isolation, sa
//  création est une transaction serveur (entreprise + établissement principal + appartenance
//  du créateur) et elle ne peut donc pas passer par l'écriture générique d'une entité.

const tenants = {
  /**
   * Crée l'entreprise du compte connecté, qui en devient propriétaire.
   * Le serveur renvoie un jeton portant déjà ce contexte : inutile de se reconnecter.
   */
  create: async ({ name, slug, siren, timeZoneId, establishmentName, tradeCode } = {}) => {
    const result = await request('/api/tenants', {
      method: 'POST',
      // `tradeCode` manquait ici alors que le formulaire d'inscription l'envoie et que le
      // serveur l'attend : le métier choisi était perdu entre les deux, et la vitrine se
      // créait sans lui, sans que rien ne le signale.
      body: { name, slug, siren, timeZoneId, establishmentName, tradeCode },
    });

    tokenStore.set(result.accessToken);
    tokenStore.setTenant(result.id);
    cachedUser = null;
    return result;
  },

  /**
   * Crée l'espace personnel du compte connecté : le périmètre où vivront les événements
   * qu'il organise pour lui-même. Idempotent côté serveur.
   */
  createPersonal: async ({ name } = {}) => {
    const result = await request('/api/tenants/personal', {
      method: 'POST',
      body: { name },
    });

    tokenStore.set(result.accessToken);
    tokenStore.setTenant(result.id);
    cachedUser = null;
    return result;
  },

  /** Entreprise du contexte de travail courant, avec ses établissements. */
  current: () => request('/api/tenants/current'),
};

// --- Dossiers événement (endpoint métier, hors couche de compatibilité) -------

const events = {
  /** Les dossiers du contexte de travail courant. */
  list: () => request('/api/events'),

  /**
   * Crée un dossier et son moment principal. Dans un espace personnel, le contact est
   * résolu côté serveur — le titulaire est le contact de ses propres dossiers.
   */
  create: (payload) => request('/api/events', { method: 'POST', body: payload }),
};

// --- Fonctions et intégrations ----------------------------------------------

const functions = new Proxy({}, {
  get: (_, name) => {
    if (typeof name !== 'string') return undefined;
    return (payload) => request(`/api/functions/${name}`, { method: 'POST', body: payload ?? {} });
  },
});

const integrations = {
  Core: {
    UploadFile: async ({ file }) => {
      const form = new FormData();
      form.append('file', file);

      const headers = { 'X-Alryck-Screen': currentScreen };
      const token = tokenStore.get();
      if (token) headers.Authorization = `Bearer ${token}`;

      const response = await fetch(`${API_BASE}/api/files`, { method: 'POST', headers, body: form });
      if (!response.ok) throw new ApiError('Téléversement impossible', response.status, null);
      return response.json();
    },

    // L'envoi ne part plus du navigateur : le serveur décide qui a le droit d'écrire à qui.
    SendEmail: (payload) => request('/api/emails', { method: 'POST', body: payload }),

    // Idem pour le modèle : la clé reste côté serveur.
    InvokeLLM: (payload) => request('/api/ai/invoke', { method: 'POST', body: payload }),
  },
};

export const base44 = { entities, auth, tenants, events, referentials, functions, integrations };
export default base44;
