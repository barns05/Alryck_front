import { useState } from 'react';
import { Eye, EyeOff, Lock, Mail, LogIn } from 'lucide-react';

/**
 * Modale de connexion portail client (visites suivantes).
 * Props:
 *  - clientEmail: email pré-rempli
 *  - onLogin(email, password): callback connexion
 *  - onForgotPassword(email): callback mot de passe oublié
 *  - onSkip(): continuer sans connexion
 *  - error: message d'erreur éventuel
 */
export default function ClientLoginModal({ clientEmail, onLogin, onForgotPassword, onSkip, error: externalError }) {
  const [email, setEmail] = useState(clientEmail || '');
  const [password, setPassword] = useState('');
  const [showPwd, setShowPwd] = useState(false);
  const [loading, setLoading] = useState(false);
  const [localError, setLocalError] = useState('');
  const [forgotSent, setForgotSent] = useState(false);

  const error = externalError || localError;

  const handleSubmit = async (e) => {
    e.preventDefault();
    if (!email.trim() || !password) { setLocalError('Veuillez remplir tous les champs.'); return; }
    setLoading(true);
    setLocalError('');
    await onLogin(email.trim(), password);
    setLoading(false);
  };

  const handleForgot = async () => {
    if (!email.trim()) { setLocalError('Entrez votre email pour recevoir un lien de réinitialisation.'); return; }
    setLocalError('');
    await onForgotPassword(email.trim());
    setForgotSent(true);
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/60 p-4">
      <div className="bg-card rounded-2xl border border-border shadow-2xl p-6 max-w-sm w-full space-y-5">
        <div className="text-center space-y-2">
          <div className="w-14 h-14 bg-primary/10 rounded-2xl flex items-center justify-center mx-auto">
            <LogIn size={28} className="text-primary" />
          </div>
          <h2 className="text-lg font-bold">Connexion à votre espace</h2>
          <p className="text-sm text-muted-foreground">Retrouvez toutes vos informations et votre événement.</p>
        </div>

        <form onSubmit={handleSubmit} className="space-y-3">
          <div className="space-y-1">
            <label className="text-xs font-medium text-muted-foreground">Adresse email</label>
            <div className="relative">
              <Mail size={15} className="absolute left-3 top-1/2 -translate-y-1/2 text-muted-foreground" />
              <input
                type="email"
                value={email}
                onChange={e => setEmail(e.target.value)}
                placeholder="votre@email.com"
                className="w-full pl-9 pr-4 py-2.5 rounded-xl border border-input bg-background text-sm focus:outline-none focus:ring-1 focus:ring-ring"
              />
            </div>
          </div>

          <div className="space-y-1">
            <label className="text-xs font-medium text-muted-foreground">Mot de passe</label>
            <div className="relative">
              <Lock size={15} className="absolute left-3 top-1/2 -translate-y-1/2 text-muted-foreground" />
              <input
                type={showPwd ? 'text' : 'password'}
                value={password}
                onChange={e => setPassword(e.target.value)}
                placeholder="Votre mot de passe"
                className="w-full pl-9 pr-10 py-2.5 rounded-xl border border-input bg-background text-sm focus:outline-none focus:ring-1 focus:ring-ring"
              />
              <button type="button" onClick={() => setShowPwd(v => !v)}
                className="absolute right-3 top-1/2 -translate-y-1/2 text-muted-foreground hover:text-foreground">
                {showPwd ? <EyeOff size={15} /> : <Eye size={15} />}
              </button>
            </div>
          </div>

          {error && (
            <p className="text-xs text-destructive bg-destructive/10 rounded-lg px-3 py-2">{error}</p>
          )}

          {forgotSent && (
            <p className="text-xs text-emerald-600 bg-emerald-50 rounded-lg px-3 py-2">
              ✓ Un email de réinitialisation a été envoyé si ce compte existe.
            </p>
          )}

          <button type="submit" disabled={loading}
            className="w-full py-2.5 rounded-xl bg-primary text-primary-foreground text-sm font-semibold hover:bg-primary/90 transition-colors disabled:opacity-60">
            {loading ? 'Connexion...' : 'Se connecter'}
          </button>
        </form>

        <div className="flex flex-col items-center gap-2">
          <button onClick={handleForgot}
            className="text-xs text-primary hover:text-primary/80 underline underline-offset-2 transition-colors">
            Mot de passe oublié ?
          </button>
          <button onClick={onSkip}
            className="text-xs text-muted-foreground hover:text-foreground underline underline-offset-2 transition-colors">
            Continuer avec le lien uniquement
          </button>
        </div>
      </div>
    </div>
  );
}