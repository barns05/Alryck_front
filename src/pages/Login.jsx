import { useState } from 'react';
import { useNavigate, useSearchParams, Link } from 'react-router-dom';
import { base44 } from '@/api/base44Client';
import { useAuth } from '@/lib/AuthContext';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { homeRouteFor } from '@/lib/roles';

// =============================================================================
//  Connexion
// =============================================================================
//  Écran ajouté par la migration : l'authentification était auparavant gérée par la
//  plateforme Base44, qui redirigeait vers son propre service.
//
//  Un même compte pouvant appartenir à plusieurs entreprises, la connexion peut renvoyer
//  plusieurs contextes de travail — on fait alors choisir, plutôt que d'en supposer un.
// =============================================================================

export default function Login() {
  const navigate = useNavigate();
  const [params] = useSearchParams();
  const { checkAppState } = useAuth();

  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [contexts, setContexts] = useState(null);
  const [error, setError] = useState(null);
  const [busy, setBusy] = useState(false);

  const requested = params.get('from');

  /**
   * Destination après connexion. Une page demandée explicitement l'emporte ; sinon on
   * suit les rôles du contexte retenu.
   *
   * Le cas à ne pas manquer est celui du compte **sans appartenance** : inscrit, mais
   * rattaché à aucune entreprise. Il partait auparavant sur `/Dashboard`, c'est-à-dire un
   * back-office qui n'a rien à lui montrer. Sa place est l'espace personnel.
   */
  //
  // `kind` compte autant que les rôles : le titulaire d'un espace personnel porte `Owner`,
  // exactement comme un patron de traiteur. L'omettre l'envoie sur le back-office.
  const destinationFor = (context) => requested || homeRouteFor({
    roles: context?.roles ?? [],
    tenantKind: context?.kind,
  });

  const submit = async (event) => {
    event.preventDefault();
    setError(null);
    setBusy(true);

    try {
      const result = await base44.auth.loginViaEmailPassword(email, password);

      // Plusieurs entreprises : on fait choisir plutôt que d'en supposer une.
      if (result.contexts?.length > 1) {
        setContexts(result.contexts);
        return;
      }

      // Zéro ou un contexte : le serveur a déjà sélectionné le seul possible, le jeton
      // porte donc les rôles à jour.
      await checkAppState();
      navigate(destinationFor(result.contexts?.[0]), { replace: true });
    } catch (err) {
      setError(
        err.code === 'auth.locked_out'
          ? 'Compte temporairement bloqué après plusieurs tentatives. Réessayez dans quelques minutes.'
          : 'Adresse ou mot de passe incorrect.',
      );
    } finally {
      setBusy(false);
    }
  };

  const chooseContext = async (context) => {
    setBusy(true);
    try {
      await base44.auth.switchContext(context.tenantId);
      await checkAppState();
      navigate(destinationFor(context), { replace: true });
    } finally {
      setBusy(false);
    }
  };

  return (
    <div
      className="fixed inset-0 flex items-center justify-center p-4"
      style={{ background: 'radial-gradient(ellipse at center, #2d2a6e 0%, #1e1b4b 70%)' }}
    >
      <div className="w-full max-w-sm rounded-2xl bg-white/95 p-8 shadow-2xl backdrop-blur">
        <h1 className="mb-1 text-2xl font-semibold text-slate-900">Alryck</h1>

        {contexts ? (
          <>
            <p className="mb-6 text-sm text-slate-500">
              Votre compte est rattaché à plusieurs entreprises. Choisissez votre espace de travail.
            </p>
            <div className="space-y-2">
              {contexts.map((context) => (
                <button
                  key={context.tenantId}
                  type="button"
                  disabled={busy}
                  onClick={() => chooseContext(context)}
                  className="w-full rounded-lg border border-slate-200 px-4 py-3 text-left transition hover:border-indigo-400 hover:bg-indigo-50 disabled:opacity-50"
                >
                  <span className="block font-medium text-slate-900">{context.tenantName}</span>
                  <span className="block text-xs text-slate-500">
                    {(context.roles ?? []).join(', ')}
                  </span>
                </button>
              ))}
            </div>
          </>
        ) : (
          <>
            <p className="mb-6 text-sm text-slate-500">Connectez-vous à votre espace.</p>

            <form onSubmit={submit} className="space-y-4">
              <div>
                <Label htmlFor="email">Adresse électronique</Label>
                <Input
                  id="email"
                  type="email"
                  autoComplete="username"
                  required
                  value={email}
                  onChange={(e) => setEmail(e.target.value)}
                />
              </div>

              <div>
                <Label htmlFor="password">Mot de passe</Label>
                <Input
                  id="password"
                  type="password"
                  autoComplete="current-password"
                  required
                  value={password}
                  onChange={(e) => setPassword(e.target.value)}
                />
              </div>

              {error && (
                <p className="rounded-md bg-red-50 px-3 py-2 text-sm text-red-700">{error}</p>
              )}

              <Button type="submit" className="w-full" disabled={busy}>
                {busy ? 'Connexion…' : 'Se connecter'}
              </Button>
            </form>

            <p className="mt-6 text-center text-sm text-slate-500">
              Pas encore de compte ?{' '}
              <Link to="/register" className="font-medium text-indigo-600 hover:underline">
                Créer un compte
              </Link>
            </p>
          </>
        )}
      </div>
    </div>
  );
}
