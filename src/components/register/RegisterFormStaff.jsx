import { useState } from 'react';
import { base44 } from '@/api/base44Client';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Eye, EyeOff, ArrowLeft } from 'lucide-react';

const inputCls = "bg-white/[0.08] border-white/[0.15] text-white placeholder:text-white/40 focus-visible:ring-amber-400/60";
const labelCls = "text-sm font-medium text-white/70";

export default function RegisterFormStaff({ onNeedOtp, onSuccess, onBack }) {
  const [form, setForm] = useState({ email: '', password: '', confirmPassword: '', prenom: '', nom: '' });
  const [showPwd, setShowPwd] = useState(false);
  const [showConfirm, setShowConfirm] = useState(false);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');

  const set = (k, v) => setForm(f => ({ ...f, [k]: v }));

  const handleSubmit = async (e) => {
    e.preventDefault();
    setError('');
    if (form.password !== form.confirmPassword) { setError('Les mots de passe ne correspondent pas.'); return; }
    if (form.password.length < 8) { setError('Le mot de passe doit contenir au moins 8 caractères.'); return; }
    setLoading(true);
    const fullName = `${form.prenom} ${form.nom}`.trim();
    try {
      await base44.auth.register({ email: form.email, password: form.password });
      try {
        await base44.auth.loginViaEmailPassword(form.email, form.password);
        await base44.auth.updateMe({ full_name: fullName, role: 'extra', onboarding_completed: true });
        onSuccess('/MonPlanning');
      } catch {
        onNeedOtp(form.email, async () => {
          await base44.auth.loginViaEmailPassword(form.email, form.password);
          await base44.auth.updateMe({ full_name: fullName, role: 'extra', onboarding_completed: true });
          onSuccess('/MonPlanning');
        });
      }
    } catch (err) {
      setError(err?.message || 'Une erreur est survenue. Cet email est peut-être déjà utilisé.');
    } finally {
      setLoading(false);
    }
  };

  return (
    <form onSubmit={handleSubmit} className="space-y-4">
      {/* Header */}
      <div className="space-y-1">
        <h2 className="text-xl font-bold text-white">Rejoignez l'équipe</h2>
        <p className="text-sm text-white/50 flex items-center gap-1.5">
          <span style={{ color: "#c9a84c" }}>◆</span>
          Espace Équipe
        </p>
      </div>

      <div className="space-y-3">
        {/* Prénom / Nom */}
        <div className="grid grid-cols-2 gap-3">
          <div className="space-y-1.5">
            <label className={labelCls}>Prénom *</label>
            <Input required value={form.prenom} onChange={e => set('prenom', e.target.value)}
              placeholder="Jean" className={inputCls} />
          </div>
          <div className="space-y-1.5">
            <label className={labelCls}>Nom *</label>
            <Input required value={form.nom} onChange={e => set('nom', e.target.value)}
              placeholder="Martin" className={inputCls} />
          </div>
        </div>

        {/* Email */}
        <div className="space-y-1.5">
          <label className={labelCls}>Email *</label>
          <Input required type="email" value={form.email} onChange={e => set('email', e.target.value)}
            placeholder="jean.martin@email.fr" className={inputCls} />
        </div>

        {/* Mot de passe */}
        <div className="space-y-1.5">
          <label className={labelCls}>Mot de passe *</label>
          <div className="relative">
            <Input required type={showPwd ? 'text' : 'password'} value={form.password}
              onChange={e => set('password', e.target.value)}
              placeholder="Minimum 8 caractères" className={`${inputCls} pr-10`} />
            <button type="button" onClick={() => setShowPwd(v => !v)}
              className="absolute right-3 top-1/2 -translate-y-1/2 text-white/40 hover:text-white/70 transition-colors">
              {showPwd ? <EyeOff size={15} /> : <Eye size={15} />}
            </button>
          </div>
        </div>

        {/* Confirmer */}
        <div className="space-y-1.5">
          <label className={labelCls}>Confirmer le mot de passe *</label>
          <div className="relative">
            <Input required type={showConfirm ? 'text' : 'password'} value={form.confirmPassword}
              onChange={e => set('confirmPassword', e.target.value)}
              placeholder="Répétez votre mot de passe" className={`${inputCls} pr-10`} />
            <button type="button" onClick={() => setShowConfirm(v => !v)}
              className="absolute right-3 top-1/2 -translate-y-1/2 text-white/40 hover:text-white/70 transition-colors">
              {showConfirm ? <EyeOff size={15} /> : <Eye size={15} />}
            </button>
          </div>
        </div>
      </div>

      {error && <p className="text-sm text-red-400 bg-red-400/10 rounded-lg px-3 py-2">{error}</p>}

      <Button type="submit" disabled={loading}
        className="w-full font-semibold h-10"
        style={{ background: "linear-gradient(90deg, #c9a84c, #e2c97e)", color: "#1a2340" }}>
        {loading ? 'Création du compte…' : 'Rejoindre'}
      </Button>

      {onBack && (
        <button type="button" onClick={onBack}
          className="w-full flex items-center justify-center gap-1.5 text-xs text-white/40 hover:text-white/70 transition-colors pt-1">
          <ArrowLeft size={13} />
          Changer de profil
        </button>
      )}
    </form>
  );
}