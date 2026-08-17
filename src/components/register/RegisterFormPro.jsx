import { useEffect, useState } from 'react';
import { base44 } from '@/api/base44Client';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Eye, EyeOff, ArrowLeft } from 'lucide-react';
// La règle de mot de passe et la traduction des codes d'erreur sont communes aux trois
// formulaires : les garder ici les avait fait diverger (8 caractères côté client et
// équipe, 10 côté serveur).
import { PASSWORD_HINT, messageFor, validatePassword } from './registerRules';

// La liste des métiers vient désormais du référentiel servi par le back (GET /api/trades) et
// non plus d'un tableau codé ici. Elle porte des codes stables, ce qui permet de rattacher la
// vitrine de l'établissement au métier choisi — un libellé seul ne le permettait pas, et se
// serait décorrélé au premier renommage.
function groupByFamily(trades) {
  const groups = [];
  for (const trade of trades) {
    const family = trade.family || 'Autre';
    let group = groups.find(g => g.family === family);
    if (!group) groups.push((group = { family, trades: [] }));
    group.trades.push(trade);
  }
  return groups;
}

const inputCls = "bg-white/[0.08] border-white/[0.15] text-white placeholder:text-white/40 focus-visible:ring-amber-400/60";
const labelCls = "text-sm font-medium text-white/70";

export default function RegisterFormPro({ onSuccess, onBack }) {
  const [form, setForm] = useState({ prenom: '', nom: '', email: '', password: '', confirmPassword: '', companyName: '', tradeCode: '' });
  const [tradeGroups, setTradeGroups] = useState([]);
  const [showPwd, setShowPwd] = useState(false);
  const [showConfirm, setShowConfirm] = useState(false);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');

  const set = (k, v) => setForm(f => ({ ...f, [k]: v }));

  // Le métier est facultatif : si le référentiel est injoignable, on laisse le champ vide
  // plutôt que de bloquer une inscription pour un choix qui pourra se faire plus tard.
  useEffect(() => {
    let cancelled = false;
    base44.referentials.trades()
      .then(trades => { if (!cancelled) setTradeGroups(groupByFamily(trades ?? [])); })
      .catch(() => { if (!cancelled) setTradeGroups([]); });
    return () => { cancelled = true; };
  }, []);

  const handleSubmit = async (e) => {
    e.preventDefault();
    setError('');

    const invalid = validatePassword(form.password, form.confirmPassword);
    if (invalid) { setError(invalid); return; }

    setLoading(true);
    try {
      // 1. Le compte. Une personne, un compte, global à la plateforme : il n'appartient
      //    encore à aucune entreprise et le jeton renvoyé ne porte donc aucun contexte.
      try {
        await base44.auth.register({
          email: form.email,
          password: form.password,
          firstName: form.prenom,
          lastName: form.nom,
          displayName: `${form.prenom} ${form.nom}`.trim(),
        });
      } catch (err) {
        if (err?.code !== 'auth.email_taken') throw err;

        // L'inscription se fait en deux écritures : le compte, puis l'entreprise. Si la
        // seconde échoue, l'adresse est prise sans que l'entreprise existe — et réessayer
        // buterait indéfiniment sur ce compte orphelin. On reprend donc la main, à condition
        // que le mot de passe corresponde : une adresse déjà prise par quelqu'un d'autre
        // reste refusée, la connexion s'en charge.
        const session = await base44.auth.loginViaEmailPassword(form.email, form.password);

        // Compte déjà rattaché à une entreprise : il n'y a rien à créer, c'est une connexion.
        if (session.contexts?.length) { onSuccess('/Dashboard'); return; }
      }

      // 2. L'entreprise, dans la foulée. Le serveur crée l'entreprise, son établissement
      //    principal et l'appartenance du créateur (propriétaire) en une transaction, puis
      //    réémet un jeton portant déjà ce contexte — d'où l'absence de reconnexion ici.
      //
      //    Remplace `CompanySettings.create()` : la création d'entreprise n'est pas
      //    l'écriture d'un enregistrement, c'est l'ouverture d'un périmètre d'isolation.
      //    Le métier, s'il est renseigné, amorce la vitrine de l'établissement principal.
      await base44.tenants.create({
        name: form.companyName,
        tradeCode: form.tradeCode || undefined,
      });

      onSuccess('/Dashboard');
    } catch (err) {
      setError(messageFor(err));
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
          <select value={form.tradeCode} onChange={e => set('tradeCode', e.target.value)}
            disabled={tradeGroups.length === 0}
            className="flex h-9 w-full rounded-md border border-white/[0.15] bg-white/[0.08] px-3 text-sm text-white focus-visible:outline-none focus-visible:ring-1 focus-visible:ring-amber-400/60 disabled:opacity-50">
            <option value="" className="bg-slate-900">
              {tradeGroups.length === 0 ? '— Chargement… —' : '— Choisir votre métier —'}
            </option>
            {tradeGroups.map(g => (
              <optgroup key={g.family} label={g.family} className="bg-slate-900">
                {g.trades.map(t => (
                  <option key={t.code} value={t.code} className="bg-slate-900">{t.label}</option>
                ))}
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
              placeholder={PASSWORD_HINT} className={`${inputCls} pr-10`} />
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