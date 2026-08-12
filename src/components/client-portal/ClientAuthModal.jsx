import { useState } from 'react';
import { X, Eye, EyeOff, Lock, Mail, UserCircle2 } from 'lucide-react';

/**
 * Modale de création de compte portail client.
 * Apparaît à la première visite, après la modale "Comment nous avez-vous connu".
 * Props:
 *  - clientEmail: email pré-rempli
 *  - clientNom: nom du client
 *  - onRegister(email, password): callback si le client crée un compte
 *  - onSkip(): callback si le client continue sans compte
 */
export default function ClientAuthModal({ clientEmail, clientNom, onRegister, onSkip }) {
  const [email, setEmail] = useState(clientEmail || '');
  const [password, setPassword] = useState('');
  const [showPwd, setShowPwd] = useState(false);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');

  const handleSubmit = async (e) => {
    e.preventDefault();
    if (!email.trim()) { setError('Veuillez entrer votre adresse email.'); return; }
    if (password.length < 6) { setError('Le mot de passe doit contenir au moins 6 caractères.'); return; }
    setLoading(true);
    setError('');
    await onRegister(email.trim(), password);
    setLoading(false);
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/60 p-4">
      <div className="bg-card rounded-2xl border border-border shadow-2xl p-6 max-w-sm w-full space-y-5">
        {/* Header */}
        <div className="text-center space-y-2">
          <div className="w-14 h-14 bg-primary/10 rounded-2xl flex items-center justify-center mx-auto">
            <UserCircle2 size={28} className="text-primary" />
          </div>
          <h2 className="text-lg font-bold">Créez votre compte</h2>
          <p className="text-sm text-muted-foreground">
            Accédez à votre espace à tout moment, depuis n'importe quel appareil.
          </p>
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
            <label className="text-xs font-medium text-muted-foreground">Mot de passe (6 caractères min.)</label>
            <div className="relative">
              <Lock size={15} className="absolute left-3 top-1/2 -translate-y-1/2 text-muted-foreground" />
              <input
                type={showPwd ? 'text' : 'password'}
                value={password}
                onChange={e => setPassword(e.target.value)}
                placeholder="Choisissez un mot de passe"
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

          <button type="submit" disabled={loading}
            className="w-full py-2.5 rounded-xl bg-primary text-primary-foreground text-sm font-semibold hover:bg-primary/90 transition-colors disabled:opacity-60">
            {loading ? 'Création en cours...' : 'Créer mon compte'}
          </button>
        </form>

        <div className="text-center">
          <button onClick={onSkip}
            className="text-xs text-muted-foreground hover:text-foreground underline underline-offset-2 transition-colors">
            Continuer sans compte
          </button>
        </div>
      </div>
    </div>
  );
}