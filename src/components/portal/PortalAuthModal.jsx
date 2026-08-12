/**
 * Modales d'authentification réutilisables pour tous les portails.
 * Props communes:
 *  - mode: 'register' | 'login'
 *  - entityEmail: email pré-rempli
 *  - entityNom: nom de l'entité
 *  - onRegister(email, password)
 *  - onLogin(email, password)
 *  - onForgotPassword(email)
 *  - onSkip()
 *  - error: message d'erreur
 *  - portalType: 'extra' | 'prestataire' | 'lieu' | 'client'
 */
import { useState } from 'react';
import { Eye, EyeOff, Lock, Mail, UserCircle2, LogIn } from 'lucide-react';

const portalLabels = {
  extra:       { role: 'extra', subtitle: 'Votre espace planning' },
  prestataire: { role: 'prestataire', subtitle: 'Votre espace prestataire' },
  lieu:        { role: 'lieu', subtitle: 'Votre espace lieu' },
  client:      { role: 'client', subtitle: 'Votre espace client' },
};

function PasswordField({ value, onChange, placeholder }) {
  const [show, setShow] = useState(false);
  return (
    <div className="relative">
      <Lock size={15} className="absolute left-3 top-1/2 -translate-y-1/2 text-muted-foreground" />
      <input
        type={show ? 'text' : 'password'}
        value={value}
        onChange={onChange}
        placeholder={placeholder}
        className="w-full pl-9 pr-10 py-2.5 rounded-xl border border-input bg-background text-sm focus:outline-none focus:ring-1 focus:ring-ring"
      />
      <button type="button" onClick={() => setShow(v => !v)}
        className="absolute right-3 top-1/2 -translate-y-1/2 text-muted-foreground hover:text-foreground">
        {show ? <EyeOff size={15} /> : <Eye size={15} />}
      </button>
    </div>
  );
}

export default function PortalAuthModal({ mode, entityEmail, entityNom, onRegister, onLogin, onForgotPassword, onSkip, error: externalError, portalType }) {
  const [email, setEmail] = useState(entityEmail || '');
  const [password, setPassword] = useState('');
  const [loading, setLoading] = useState(false);
  const [localError, setLocalError] = useState('');
  const [forgotSent, setForgotSent] = useState(false);

  const error = externalError || localError;
  const label = portalLabels[portalType] || portalLabels.client;

  const handleSubmit = async (e) => {
    e.preventDefault();
    setLocalError('');
    if (!email.trim()) { setLocalError('Veuillez entrer votre adresse email.'); return; }
    if (mode === 'register' && password.length < 6) { setLocalError('Le mot de passe doit contenir au moins 6 caractères.'); return; }
    if (mode === 'login' && !password) { setLocalError('Veuillez entrer votre mot de passe.'); return; }
    setLoading(true);
    if (mode === 'register') await onRegister(email.trim(), password);
    else await onLogin(email.trim(), password);
    setLoading(false);
  };

  const handleForgot = async () => {
    if (!email.trim()) { setLocalError('Entrez votre email pour recevoir le lien d\'accès.'); return; }
    setLocalError('');
    await onForgotPassword(email.trim());
    setForgotSent(true);
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/60 p-4">
      <div className="bg-card rounded-2xl border border-border shadow-2xl p-6 max-w-sm w-full space-y-5">
        {/* Header */}
        <div className="text-center space-y-2">
          <div className="w-14 h-14 bg-primary/10 rounded-2xl flex items-center justify-center mx-auto">
            {mode === 'register' ? <UserCircle2 size={28} className="text-primary" /> : <LogIn size={28} className="text-primary" />}
          </div>
          {mode === 'register' ? (
            <>
              <h2 className="text-lg font-bold">Créez votre compte</h2>
              <p className="text-sm text-muted-foreground">
                Accédez à votre espace à tout moment, depuis n'importe quel appareil.
              </p>
            </>
          ) : (
            <>
              <h2 className="text-lg font-bold">Connexion à votre espace</h2>
              <p className="text-sm text-muted-foreground">Retrouvez toutes vos informations.</p>
            </>
          )}
        </div>

        <form onSubmit={handleSubmit} className="space-y-3">
          {/* Email */}
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

          {/* Mot de passe */}
          <div className="space-y-1">
            <label className="text-xs font-medium text-muted-foreground">
              {mode === 'register' ? 'Mot de passe (6 caractères min.)' : 'Mot de passe'}
            </label>
            <PasswordField
              value={password}
              onChange={e => setPassword(e.target.value)}
              placeholder={mode === 'register' ? 'Choisissez un mot de passe' : 'Votre mot de passe'}
            />
          </div>

          {error && (
            <p className="text-xs text-destructive bg-destructive/10 rounded-lg px-3 py-2">{error}</p>
          )}
          {forgotSent && (
            <p className="text-xs text-emerald-600 bg-emerald-50 rounded-lg px-3 py-2">
              ✓ Votre lien d'accès a été renvoyé par email.
            </p>
          )}

          <button type="submit" disabled={loading}
            className="w-full py-2.5 rounded-xl bg-primary text-primary-foreground text-sm font-semibold hover:bg-primary/90 transition-colors disabled:opacity-60">
            {loading
              ? (mode === 'register' ? 'Création...' : 'Connexion...')
              : (mode === 'register' ? 'Créer mon compte' : 'Se connecter')}
          </button>
        </form>

        <div className="flex flex-col items-center gap-2">
          {mode === 'login' && (
            <button onClick={handleForgot}
              className="text-xs text-primary hover:text-primary/80 underline underline-offset-2 transition-colors">
              Mot de passe oublié ?
            </button>
          )}
          <button onClick={onSkip}
            className="text-xs text-muted-foreground hover:text-foreground underline underline-offset-2 transition-colors">
            Continuer sans compte
          </button>
        </div>
      </div>
    </div>
  );
}