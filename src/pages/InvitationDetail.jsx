import { useQuery } from '@tanstack/react-query';
import { base44 } from '@/api/base44Client';
import { format, parseISO } from 'date-fns';
import { fr } from 'date-fns/locale';
import { MapPin, ChevronLeft, Calendar } from 'lucide-react';
import { useInviteTheme, inviteThemeStyle, PremiumWrapper } from '@/components/invite-portal/useInviteTheme';

const RSVP_STYLES = {
  'Confirmé':  { bg: '#f0fdf4', color: '#16a34a' },
  'En attente': { bg: '#fefce8', color: '#a16207' },
  'Absent':     { bg: '#f3f4f6', color: '#6b7280' },
  'Peut-être':  { bg: '#f5f3ff', color: '#7c3aed' },
};

export default function InvitationDetail() {
  const urlParams = new URLSearchParams(window.location.search);
  const inviteId = urlParams.get('invite_id');

  const { data: invite = null, isLoading: inviteLoading } = useQuery({
    queryKey: ['invitation-detail', inviteId],
    queryFn: async () => {
      if (!inviteId) return null;
      const results = await base44.entities.Invite.filter({ id: inviteId });
      return results[0] || null;
    },
    enabled: !!inviteId,
  });

  const { data: evenement = null, isLoading: evtLoading } = useQuery({
    queryKey: ['invitation-detail-evenement', invite?.evenement_id],
    queryFn: async () => {
      if (!invite?.evenement_id) return null;
      const results = await base44.entities.Evenement.filter({ id: invite.evenement_id });
      return results[0] || null;
    },
    enabled: !!invite?.evenement_id,
  });

  const { theme, isPremiumUnlocked } = useInviteTheme(invite?.evenement_id || evenement?.id);
  const s = inviteThemeStyle(theme, isPremiumUnlocked);

  if (inviteLoading || evtLoading) {
    return (
      <div className="min-h-screen flex items-center justify-center" style={s.page}>
        <div className="w-8 h-8 border-2 rounded-full animate-spin"
          style={{ borderColor: s.cardBorder, borderTopColor: s.accent }} />
      </div>
    );
  }

  if (!invite) {
    return (
      <div className="min-h-screen flex items-center justify-center" style={s.page}>
        <p className="text-sm" style={{ color: s.textMuted }}>Invitation introuvable.</p>
      </div>
    );
  }

  const rsvp = RSVP_STYLES[invite.statut_rsvp] || RSVP_STYLES['En attente'];
  const coverUrl = evenement?.photo_bandeau_url;
  const eventName = invite.evenement_nom || evenement?.nom || 'Événement';
  const eventDate = evenement?.date;
  const eventLieu = evenement?.lieu_nom;

  const content = (
    <>
      {/* Photo de couverture */}
      {coverUrl ? (
        <div className="relative w-full h-56 overflow-hidden">
          <img src={coverUrl} alt={eventName} className="w-full h-full object-cover" />
          <div className="absolute inset-0" style={{ background: 'linear-gradient(180deg, rgba(0,0,0,0.2) 0%, rgba(0,0,0,0.6) 100%)' }} />
          <button
            onClick={() => window.location.href = '/espace-invite'}
            className="absolute top-4 left-4 w-9 h-9 rounded-full bg-white/30 backdrop-blur flex items-center justify-center"
          >
            <ChevronLeft size={18} className="text-white" />
          </button>
        </div>
      ) : (
        <div className="relative w-full h-40 flex items-center justify-center" style={{ background: s.accent }}>
          <button
            onClick={() => window.location.href = '/espace-invite'}
            className="absolute top-4 left-4 w-9 h-9 rounded-full bg-white/30 backdrop-blur flex items-center justify-center"
          >
            <ChevronLeft size={18} className="text-white" />
          </button>
          <span className="text-4xl">🎉</span>
        </div>
      )}

      {/* Contenu */}
      <div className="px-5 py-6 space-y-5">
        {/* Nom + statut RSVP */}
        <div className="space-y-2">
          <h1 className="text-2xl font-bold leading-tight" style={{ color: s.text, fontFamily: s.headingFont }}>
            {eventName}
          </h1>
          <span
            className="inline-block text-xs font-medium px-3 py-1 rounded-full"
            style={{ background: rsvp.bg, color: rsvp.color }}
          >
            {invite.statut_rsvp || 'En attente'}
          </span>
        </div>

        {/* Infos */}
        <div className="space-y-3">
          {eventDate && (
            <div className="flex items-center gap-3 rounded-2xl p-3.5"
              style={{ background: s.cardBg, border: `1px solid ${s.cardBorder}` }}>
              <div className="w-9 h-9 rounded-xl flex items-center justify-center shrink-0" style={{ background: s.accentBg }}>
                <Calendar size={16} style={{ color: s.accent }} />
              </div>
              <div>
                <p className="text-[10px] font-semibold uppercase tracking-wide" style={{ color: s.textMuted }}>Date</p>
                <p className="text-sm font-medium" style={{ color: s.text }}>
                  {format(parseISO(eventDate), 'EEEE d MMMM yyyy', { locale: fr })}
                </p>
              </div>
            </div>
          )}

          {eventLieu && (
            <div className="flex items-center gap-3 rounded-2xl p-3.5"
              style={{ background: s.cardBg, border: `1px solid ${s.cardBorder}` }}>
              <div className="w-9 h-9 rounded-xl flex items-center justify-center shrink-0" style={{ background: s.accentBg }}>
                <MapPin size={16} style={{ color: s.accent }} />
              </div>
              <div className="min-w-0">
                <p className="text-[10px] font-semibold uppercase tracking-wide" style={{ color: s.textMuted }}>Lieu</p>
                <p className="text-sm font-medium truncate" style={{ color: s.text }}>{eventLieu}</p>
              </div>
            </div>
          )}
        </div>

        {/* Footer */}
        <p className="text-center text-[10px] pt-2" style={{ color: s.textMuted }}>
          Programme non encore publié par les organisateurs · Alryck
        </p>
      </div>
    </>
  );

  return (
    <div className="min-h-screen" style={s.page}>
      <div className="max-w-md mx-auto">
        {isPremiumUnlocked
          ? <PremiumWrapper theme={theme}><div className="px-1">{content}</div></PremiumWrapper>
          : content}
      </div>
    </div>
  );
}