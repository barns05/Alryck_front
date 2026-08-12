import { motion } from "framer-motion";
import { Check } from "lucide-react";

const PROFILES = [
  {
    id: "pro",
    role: "admin",
    title: "Espace Prestataire",
    subtitle: "Gérez vos événements clients et équipes.",
    accent: "#38BDF8",
    glow: "rgba(56,189,248,0.18)",
    imageUrl: "https://media.base44.com/images/public/69b804640546049d1a7bf53a/f917dbf8c_40AB57F7-CC66-4C3C-A62C-747B04F3F9D8.png",
  },
  {
    id: "client",
    role: "user",
    title: "Espace Client",
    subtitle: "Organisez votre événement et sélectionnez vos prestataires.",
    accent: "#E879F9",
    glow: "rgba(232,121,249,0.18)",
    imageUrl: "https://media.base44.com/images/public/69b804640546049d1a7bf53a/dcf73fcde_FA32BA51-D432-403A-BF5C-E35E2E18303B.png",
  },
  {
    id: "staff",
    role: "extra",
    title: "Espace Équipe",
    subtitle: "Consultez vos missions et votre planning.",
    accent: "#FBB35A",
    glow: "rgba(251,179,90,0.18)",
    imageUrl: "https://media.base44.com/images/public/69b804640546049d1a7bf53a/b8363022d_DAC36FF3-C9B7-471F-985B-2A200F6A4508.png",
  },
];

export { PROFILES };

export default function ProfilePicker({ selected, onSelect }) {
  return (
    <div className="flex flex-col">

      {/* ── HEADER ─────────────────────────────────────────────── */}
      <motion.div
        initial={{ opacity: 0, y: -12 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ duration: 0.6, ease: "easeOut" }}
        className="flex flex-col items-center"
      >
        {/* Logo cristal animé — 144px */}
        <motion.div
          animate={{ y: [0, -4, 0] }}
          transition={{ duration: 7, repeat: Infinity, ease: "easeInOut" }}
          className="relative flex items-center justify-center"
          style={{ width: 144, height: 144 }}
        >
          <img
            src="https://media.base44.com/images/public/69b804640546049d1a7bf53a/add7d9f16_file_00000000baa0724695dea66812e6a844.png"
            alt="ALRYCK"
            className="relative z-10"
            style={{ width: 144, height: 144, objectFit: 'contain' }}
          />
        </motion.div>

        {/* Wordmark */}
        <img
          src="https://media.base44.com/images/public/69b804640546049d1a7bf53a/54cebbb89_6C85E1F1-B178-4B34-980F-516CAA26E653.png"
          alt="ALRYCK"
          style={{
            height: 168,
            objectFit: 'contain',
            marginTop: -74,
            filter: 'drop-shadow(0px 0px 14px rgba(246,231,193,0.65)) drop-shadow(0px 0px 4px rgba(246,231,193,0.40))',
          }}
        />

        {/* Séparateur doré */}
        <div style={{
          width: '55%',
          height: 1,
          background: 'linear-gradient(90deg, transparent 0%, rgba(246,231,193,0.25) 20%, rgba(246,231,193,0.55) 50%, rgba(246,231,193,0.25) 80%, transparent 100%)',
          boxShadow: '0 0 8px rgba(246,231,193,0.15)',
          marginTop: -56,
          marginBottom: 0,
        }} />

        {/* Title */}
        <div className="mt-6 text-center space-y-1.5">
          <h2 className="text-[1.6rem] font-semibold leading-tight tracking-tight text-white">
            Choisissez votre espace
          </h2>
          <p className="text-[0.875rem] font-light text-white/50 tracking-wide">
            Sélectionnez le profil qui vous correspond.
          </p>
        </div>
      </motion.div>

      {/* ── CARDS ──────────────────────────────────────────────── */}
      <div className="mt-7 space-y-3">
        {PROFILES.map((profile, index) => {
          const isSelected = selected?.id === profile.id;
          return (
            <motion.button
              key={profile.id}
              type="button"
              onClick={() => onSelect(profile)}
              initial={{ opacity: 0, y: 12 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ duration: 0.35, delay: 0.1 + index * 0.07, ease: "easeOut" }}
              whileTap={{ scale: 0.985 }}
              className={`
                relative w-full rounded-[20px] text-left
                border transition-all duration-300
                ${isSelected
                  ? "border-white/20 bg-white/[0.06]"
                  : "border-white/[0.06] bg-white/[0.025] hover:bg-white/[0.045]"
                }
              `}
              style={{
                boxShadow: isSelected
                  ? `0 0 0 1px ${profile.accent}40, 0 8px 32px ${profile.glow}`
                  : "none",
              }}
            >
              {/* Badge Gratuit — coin supérieur droit */}
              <span style={{
                position: 'absolute',
                top: 8,
                right: isSelected ? 52 : 10,
                zIndex: 20,
                borderRadius: 999,
                padding: '2px 9px',
                fontSize: 11,
                fontWeight: 600,
                background: 'rgba(201,168,76,0.18)',
                border: '1px solid rgba(201,168,76,0.50)',
                color: '#c9a84c',
                lineHeight: '18px',
                pointerEvents: 'none',
                transition: 'right 300ms',
              }}>
                Gratuit
              </span>

              {/* selected glow layer */}
              {isSelected && (
                <div
                  className="pointer-events-none absolute inset-0 rounded-[20px]"
                  style={{
                    background: `radial-gradient(ellipse at 0% 50%, ${profile.glow} 0%, transparent 65%)`,
                  }}
                />
              )}

              <div className="relative flex items-center gap-4 px-4 py-4">
                {/* Cristal icon */}
                <div className="shrink-0 w-12 h-12 flex items-center justify-center">
                  <img src={profile.imageUrl} alt={profile.title} style={{ width: 48, height: 48, objectFit: 'contain' }} />
                </div>

                {/* Text */}
                <div className="flex-1 min-w-0">
                  <span className="text-[1.05rem] font-semibold text-white leading-none">
                    {profile.title}
                  </span>
                  <p className="mt-1 text-[0.8rem] font-light leading-snug text-white/45">
                    {profile.subtitle}
                  </p>
                </div>

                {/* Check sélection */}
                {isSelected && (
                  <div
                    className="flex h-7 w-7 shrink-0 items-center justify-center rounded-full"
                    style={{ background: `${profile.accent}25`, border: `1px solid ${profile.accent}` }}
                  >
                    <Check className="h-3.5 w-3.5" style={{ color: profile.accent }} />
                  </div>
                )}
              </div>
            </motion.button>
          );
        })}
      </div>
    </div>
  );
}