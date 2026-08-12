import { useState } from 'react';
import { base44 } from '@/api/base44Client';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';

export default function OtpVerification({ email, onVerified }) {
  const [otp, setOtp] = useState('');
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');
  const [resent, setResent] = useState(false);

  const handleVerify = async () => {
    if (!otp.trim()) return;
    setLoading(true);
    setError('');
    try {
      await base44.auth.verifyOtp(otp.trim());
      onVerified();
    } catch (e) {
      setError('Code incorrect ou expiré. Vérifiez votre email.');
    } finally {
      setLoading(false);
    }
  };

  const handleResend = async () => {
    try {
      await base44.auth.resendOtp();
      setResent(true);
      setTimeout(() => setResent(false), 5000);
    } catch {}
  };

  return (
    <div className="space-y-5">
      <div className="space-y-1">
        <h2 className="text-xl font-bold text-white">Vérifiez votre email</h2>
        <p className="text-sm text-slate-400">
          Un code de vérification a été envoyé à <span className="text-white font-medium">{email}</span>.
        </p>
      </div>

      <div className="space-y-2">
        <label className="text-sm font-medium text-slate-300">Code de vérification</label>
        <Input
          value={otp}
          onChange={e => setOtp(e.target.value)}
          placeholder="123456"
          maxLength={8}
          className="bg-white/10 border-white/20 text-white placeholder:text-slate-500 text-center text-lg tracking-widest"
          onKeyDown={e => e.key === 'Enter' && handleVerify()}
        />
      </div>

      {error && <p className="text-sm text-red-400">{error}</p>}

      <Button onClick={handleVerify} disabled={loading || !otp.trim()} className="w-full bg-amber-500 hover:bg-amber-600 text-slate-900 font-semibold">
        {loading ? 'Vérification…' : 'Valider le code'}
      </Button>

      <button
        type="button"
        onClick={handleResend}
        className="w-full text-center text-xs text-slate-400 hover:text-white transition-colors"
      >
        {resent ? '✅ Code renvoyé !' : 'Renvoyer le code'}
      </button>
    </div>
  );
}