import { motion } from 'framer-motion';
import { PartyPopper, Briefcase, Users } from 'lucide-react';

const NAVY = '#1e1b4b';

const ICONS = {
  PartyPopper,
  Briefcase,
  Users,
};

export default function RoleCard({ iconName, title, description, buttonLabel, accentColor, delay, onClick }) {
  const Icon = ICONS[iconName] || Users;

  return (
    <motion.div
      initial={{ opacity: 0, y: 12 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ duration: 0.35, delay, ease: 'easeOut' }}
      className="bg-white rounded-3xl overflow-hidden"
      style={{ boxShadow: '0 2px 12px rgba(30,27,75,0.06)' }}
    >
      {/* Fine bordure colorée en haut */}
      <div style={{ height: 3, background: accentColor }} />

      <div className="p-5 space-y-4">
        {/* Icône */}
        <div
          className="w-12 h-12 rounded-full flex items-center justify-center"
          style={{ background: `${accentColor}18` }}
        >
          <Icon size={22} style={{ color: NAVY }} />
        </div>

        {/* Titre + description */}
        <div className="space-y-1">
          <h3 className="font-semibold text-base" style={{ color: NAVY }}>{title}</h3>
          <p className="text-sm leading-relaxed text-gray-400">{description}</p>
        </div>

        {/* Bouton navy identique pour les 3 cartes */}
        <motion.button
          whileTap={{ scale: 0.98 }}
          onClick={onClick}
          className="w-full py-3 rounded-2xl text-sm font-semibold text-white transition-all"
          style={{ background: NAVY }}
        >
          {buttonLabel}
        </motion.button>
      </div>
    </motion.div>
  );
}