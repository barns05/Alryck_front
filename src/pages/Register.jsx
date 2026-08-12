import { useState } from 'react';
import ProfilePicker, { PROFILES } from '@/components/register/ProfilePicker';
import RegisterFormPro from '@/components/register/RegisterFormPro';
import RegisterFormClient from '@/components/register/RegisterFormClient';
import RegisterFormStaff from '@/components/register/RegisterFormStaff';
import OtpVerification from '@/components/register/OtpVerification';

const GOLD = '#c9a84c';
const NAVY_DEEP = '#1e1b4b';

// ─── Points constellation (statiques, génération déterministe) ────────────────
const STARS = Array.from({ length: 38 }, (_, i) => ({
  x: ((i * 137.5) % 100).toFixed(2),
  y: ((i * 97.3 + 13) % 100).toFixed(2),
  r: i % 5 === 0 ? 1.5 : i % 3 === 0 ? 1 : 0.7,
  o: (0.03 + (i % 7) * 0.01).toFixed(2),
}));

// ─── Panneau gauche (branding desktop) ────────────────────────────────────────
function BrandPanel({ profile }) {
  return (
    <div
      className="hidden md:flex md:w-[42%] flex-col justify-between p-10 relative overflow-hidden shrink-0"
      style={{ background: `radial-gradient(ellipse at center, #2d2a6e 0%, ${NAVY_DEEP} 70%)` }}
    >
      {/* Constellation SVG */}
      <svg className="absolute inset-0 w-full h-full pointer-events-none" style={{ opacity: 0.9 }}>
        {STARS.map((s, i) => (
          <circle key={i} cx={`${s.x}%`} cy={`${s.y}%`} r={s.r} fill="white" opacity={s.o} />
        ))}
      </svg>

      <div className="relative z-10">
        <div className="flex items-center gap-3 mb-12">
          <img
            src="https://media.base44.com/images/public/69b804640546049d1a7bf53a/bd97063e6_file_00000000baa0724695dea66812e6a844.png"
            alt="Alryck"
            style={{ width: 40, height: 40, borderRadius: 10, objectFit: 'cover' }}
          />
          <img
              src="https://media.base44.com/images/public/69b804640546049d1a7bf53a/54cebbb89_6C85E1F1-B178-4B34-980F-516CAA26E653.png"
              alt="ALRYCK"
              style={{ height: 32, objectFit: 'contain' }}
            />
        </div>

        <div className="space-y-4 mb-10">
          <h1 className="text-3xl font-bold text-white leading-tight">
            L'outil événementiel<br />
            <span style={{ color: GOLD }}>des professionnels</span><br />
            d'exception.
          </h1>
          <p className="text-sm leading-relaxed" style={{ color: 'rgba(255,255,255,0.55)' }}>
            Gérez vos événements, clients, prestataires et équipes depuis une seule plateforme pensée pour les pros de l'événementiel.
          </p>
        </div>

        {profile && (
          <div style={{
            background: 'rgba(255,255,255,0.05)',
            border: `1px solid rgba(201,168,76,0.3)`,
            borderRadius: 16,
            padding: '14px 16px',
          }}>
            <p style={{ color: GOLD, fontWeight: 600, fontSize: 14, marginBottom: 4 }}>{profile.emoji} {profile.label}</p>
            <p style={{ color: 'rgba(255,255,255,0.6)', fontSize: 12 }}>{profile.description}</p>
          </div>
        )}
      </div>

      <div className="relative z-10 space-y-3">
        {[
          { icon: '✅', text: 'Essai gratuit — sans carte bancaire' },
          { icon: '🔒', text: 'Données sécurisées et confidentielles' },
          { icon: '📱', text: 'Disponible sur mobile et desktop' },
        ].map(item => (
          <div key={item.text} className="flex items-center gap-2.5">
            <span className="text-sm">{item.icon}</span>
            <span style={{ color: 'rgba(255,255,255,0.5)', fontSize: 12 }}>{item.text}</span>
          </div>
        ))}
      </div>
    </div>
  );
}

// ─── Orchestrateur principal ──────────────────────────────────────────────────
export default function Register() {
  const urlParams = new URLSearchParams(window.location.search);
  const presetProfileId = urlParams.get('profile');
  const customRedirect = urlParams.get('redirect');
  const presetProfile = presetProfileId ? PROFILES.find(p => p.id === presetProfileId) || null : null;

  const [step, setStep] = useState(presetProfile ? 'form' : 'pick');
  const [selectedProfile, setSelectedProfile] = useState(presetProfile);
  const [otpEmail, setOtpEmail] = useState('');
  const [otpCallback, setOtpCallback] = useState(null);

  const handleNeedOtp = (email, callback) => {
    setOtpEmail(email);
    setOtpCallback(() => callback);
    setStep('otp');
  };

  const handleOtpVerified = async () => {
    if (otpCallback) await otpCallback();
  };

  const handleSuccess = (defaultRedirect) => {
    window.location.href = customRedirect || defaultRedirect;
  };

  const renderForm = () => {
    if (!selectedProfile) return null;
    const props = { onNeedOtp: handleNeedOtp, onSuccess: handleSuccess, onBack: () => setStep('pick') };
    if (selectedProfile.id === 'pro') return <RegisterFormPro {...props} />;
    if (selectedProfile.id === 'client') return <RegisterFormClient {...props} />;
    if (selectedProfile.id === 'staff') return <RegisterFormStaff {...props} />;
  };

  const STEPS = ['pick', 'form', 'otp'];

  return (
    <div
      className="min-h-screen flex"
      style={{ background: `radial-gradient(ellipse at center, #2d2a6e 0%, ${NAVY_DEEP} 70%)` }}
    >
      {/* Panneau gauche — branding desktop */}
      <BrandPanel profile={step !== 'pick' ? selectedProfile : null} />

      {/* Panneau droit — contenu */}
      <div className="flex-1 flex flex-col justify-center items-center p-6 md:p-12 overflow-y-auto relative">

        {/* Constellation légère côté droit aussi sur mobile */}
        <svg className="absolute inset-0 w-full h-full pointer-events-none md:hidden" style={{ opacity: 0.6 }}>
          {STARS.slice(0, 20).map((s, i) => (
            <circle key={i} cx={`${s.x}%`} cy={`${s.y}%`} r={s.r} fill="white" opacity={s.o} />
          ))}
        </svg>

        <div className="w-full max-w-md space-y-6 relative z-10">

          {/* Étape : choix du profil */}
          {step === 'pick' && (
            <>
              <ProfilePicker selected={selectedProfile} onSelect={setSelectedProfile} />

              {/* Bouton Continuer gold */}
              <button
                onClick={() => { if (selectedProfile) setStep('form'); }}
                style={{
                  width: '100%',
                  height: 44,
                  borderRadius: 999,
                  background: selectedProfile
                    ? 'linear-gradient(135deg, #c9a84c 0%, #b8922a 100%)'
                    : 'rgba(100,100,100,0.3)',
                  color: selectedProfile ? '#1e1b4b' : 'rgba(255,255,255,0.4)',
                  fontWeight: 700,
                  fontSize: 15,
                  border: 'none',
                  cursor: selectedProfile ? 'pointer' : 'not-allowed',
                  boxShadow: selectedProfile ? '0 4px 18px rgba(201,168,76,0.35)' : 'none',
                  transition: 'all 300ms',
                }}
                onMouseDown={e => { if (selectedProfile) e.currentTarget.style.transform = 'scale(0.98)'; }}
                onMouseUp={e => { e.currentTarget.style.transform = 'scale(1)'; }}
              >
                Continuer →
              </button>
            </>
          )}

          {/* Étape : formulaire selon profil */}
          {step === 'form' && renderForm()}

          {/* Étape : OTP */}
          {step === 'otp' && (
            <OtpVerification email={otpEmail} onVerified={handleOtpVerified} />
          )}

          {/* Lien connexion */}
          <p className="text-center" style={{ fontSize: 12, color: 'rgba(255,255,255,0.5)' }}>
            Déjà un compte ?{' '}
            <button
              onClick={() => window.location.href = '/'}
              style={{ color: 'rgba(201,168,76,0.85)', fontWeight: 600, background: 'none', border: 'none', cursor: 'pointer', transition: 'color 200ms' }}
              onMouseEnter={e => e.currentTarget.style.color = GOLD}
              onMouseLeave={e => e.currentTarget.style.color = 'rgba(201,168,76,0.85)'}
            >
              Se connecter
            </button>
          </p>

          {/* Indicateurs d'étapes pills */}
          <div className="flex justify-center gap-2">
            {STEPS.map(s => (
              <div
                key={s}
                style={{
                  height: 6,
                  borderRadius: 999,
                  width: s === step ? 24 : 8,
                  background: s === step ? GOLD : 'rgba(255,255,255,0.25)',
                  transition: 'all 350ms',
                }}
              />
            ))}
          </div>
        </div>
      </div>
    </div>
  );
}