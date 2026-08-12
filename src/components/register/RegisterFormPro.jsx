import { useState } from 'react';
import { base44 } from '@/api/base44Client';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Eye, EyeOff, ArrowLeft } from 'lucide-react';

const METIERS_GROUPES = [
  { groupe: 'Lieux et réception', metiers: ['Salle de réception','Lieu de prestige / Château','Domaine viticole / Château viticole','Domaine privé','Mas / Bastide','Villa privatisable','Espace plein air / Jardin','Salle de spectacle','Salon événementiel','Restaurant privatisable','Espace atypique','Péniche / Bateau','Rooftop',"Musée / Galerie d'art"] },
  { groupe: 'Restauration et traiteur', metiers: ['Traiteur événementiel','Chef à domicile','Pâtissier / Wedding cake','Candy bar / Sweet table','Food truck événementiel'] },
  { groupe: 'Image et souvenir', metiers: ['Photographe','Vidéaste','Photobooth'] },
  { groupe: 'Musique et animation', metiers: ['DJ','Musicien / Groupe','Animateur','Magicien / Artiste','Sonorisation / Éclairage'] },
  { groupe: 'Organisation', metiers: ['Wedding Planner','Chef de projet événementiel','Maître de cérémonie'] },
  { groupe: 'Décoration et floral', metiers: ['Fleuriste','Décorateur','Scénographe'] },
  { groupe: 'Beauté et bien-être', metiers: ['Coiffeur / Maquilleur','Spa événementiel'] },
  { groupe: 'Transport et prestige', metiers: ['Limousine / VTC prestige','Hélicoptère événementiel'] },
  { groupe: 'Logistique et technique', metiers: ['Location de matériel','Sécurité événementielle'] },
  { groupe: 'Autre', metiers: ['Autre prestataire'] },
];

const inputCls = "bg-white/[0.08] border-white/[0.15] text-white placeholder:text-white/40 focus-visible:ring-amber-400/60";
const labelCls = "text-sm font-medium text-white/70";

export default function RegisterFormPro({ onNeedOtp, onSuccess, onBack }) {
  const [form, setForm] = useState({ prenom: '', nom: '', email: '', password: '', confirmPassword: '', companyName: '', metier: '' });
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
    try {
      await base44.auth.register({ email: form.email, password: form.password });
      try {
        await base44.auth.loginViaEmailPassword(form.email, form.password);
        await base44.auth.updateMe({
          full_name: `${form.prenom} ${form.nom}`.trim(),
          role: 'admin',
          onboarding_completed: false,
        });
        await base44.entities.CompanySettings.create({
          company_name: form.companyName,
          metier: form.metier || undefined,
        });
        onSuccess('/Dashboard');
      } catch {
        onNeedOtp(form.email, async () => {
          await base44.auth.loginViaEmailPassword(form.email, form.password);
          await base44.auth.updateMe({ full_name: `${form.prenom} ${form.nom}`.trim(), role: 'admin', onboarding_completed: false });
          await base44.entities.CompanySettings.create({ company_name: form.companyName, metier: form.metier || undefined });
          onSuccess('/Dashboard');
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
        <h2 className="text-xl font-bold text-white">Créez votre compte</h2>
        <p className="text-sm text-white/50 flex items-center gap-1.5">
          <span style={{ color: "#c9a84c" }}>◆</span>
          Espace Prestataire
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
              placeholder="Dupont" className={inputCls} />
          </div>
        </div>

        {/* Nom entreprise */}
        <div className="space-y-1.5">
          <label className={labelCls}>Nom de votre entreprise *</label>
          <Input required value={form.companyName} onChange={e => set('companyName', e.target.value)}
            placeholder="Ex : Dupont Traiteur" className={inputCls} />
        </div>

        {/* Métier */}
        <div className="space-y-1.5">
          <label className={labelCls}>Votre métier</label>
          <select value={form.metier} onChange={e => set('metier', e.target.value)}
            className="flex h-9 w-full rounded-md border border-white/[0.15] bg-white/[0.08] px-3 text-sm text-white focus-visible:outline-none focus-visible:ring-1 focus-visible:ring-amber-400/60">
            <option value="" className="bg-slate-900">— Choisir votre métier —</option>
            {METIERS_GROUPES.map(g => (
              <optgroup key={g.groupe} label={g.groupe} className="bg-slate-900">
                {g.metiers.map(m => <option key={m} value={m} className="bg-slate-900">{m}</option>)}
              </optgroup>
            ))}
          </select>
        </div>

        {/* Email */}
        <div className="space-y-1.5">
          <label className={labelCls}>Email professionnel *</label>
          <Input required type="email" value={form.email} onChange={e => set('email', e.target.value)}
            placeholder="contact@votreentreprise.fr" className={inputCls} />
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
        className="w-full font-semibold h-10 text-[#1a2340]"
        style={{ background: "linear-gradient(90deg, #c9a84c, #e2c97e)", color: "#1a2340" }}>
        {loading ? 'Création du compte…' : 'Créer mon compte'}
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