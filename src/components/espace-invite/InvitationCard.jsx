import { motion } from 'framer-motion';
import { ChevronRight, MapPin } from 'lucide-react';
import { format, parseISO } from 'date-fns';
import { fr } from 'date-fns/locale';

const NAVY = '#1e1b4b';

const RSVP_STYLES = {
  'Confirmé':  { bg: '#f0fdf4', color: '#16a34a' },
  'En attente': { bg: '#fefce8', color: '#a16207' },
  'Absent':     { bg: '#f3f4f6', color: '#6b7280' },
  'Peut-être':  { bg: '#f5f3ff', color: '#7c3aed' },
};

export default function InvitationCard({ invite, evenement, onClick }) {
  const rsvp = RSVP_STYLES[invite.statut_rsvp] || RSVP_STYLES['En attente'];
  const coverUrl = evenement?.photo_bandeau_url;
  const eventDate = evenement?.date;
  const eventLieu = evenement?.lieu_nom;

  return (
    <motion.button
      initial={{ opacity: 0, y: 8 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ duration: 0.3 }}
      whileTap={{ scale: 0.98 }}
      onClick={onClick}
      className="w-full flex items-center gap-3 bg-white rounded-2xl p-3 text-left"
      style={{ boxShadow: '0 1px 6px rgba(30,27,75,0.05)' }}
    >
      {/* Cover thumbnail */}
      <div className="w-14 h-14 rounded-xl overflow-hidden shrink-0">
        {coverUrl ? (
          <img src={coverUrl} alt="" className="w-full h-full object-cover" />
        ) : (
          <div className="w-full h-full flex items-center justify-center" style={{ background: '#f0f0f5' }}>
            <span className="text-xl">🎉</span>
          </div>
        )}
      </div>

      {/* Content */}
      <div className="flex-1 min-w-0 space-y-0.5">
        <p className="font-semibold text-sm truncate" style={{ color: NAVY }}>
          {invite.evenement_nom || evenement?.nom || 'Événement'}
        </p>
        {eventDate && (
          <p className="text-xs text-gray-400">
            {format(parseISO(eventDate), 'd MMM yyyy', { locale: fr })}
          </p>
        )}
        {eventLieu && (
          <p className="text-xs text-gray-400 flex items-center gap-1 truncate">
            <MapPin size={10} className="shrink-0" /> {eventLieu}
          </p>
        )}
        <span
          className="inline-block text-[10px] font-medium px-2 py-0.5 rounded-full mt-1"
          style={{ background: rsvp.bg, color: rsvp.color }}
        >
          {invite.statut_rsvp || 'En attente'}
        </span>
      </div>

      <ChevronRight size={16} className="shrink-0 text-gray-300" />
    </motion.button>
  );
}