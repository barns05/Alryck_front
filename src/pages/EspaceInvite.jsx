import { useState, useEffect } from 'react';
import { useQuery } from '@tanstack/react-query';
import { base44 } from '@/api/base44Client';
import { isPast, parseISO } from 'date-fns';
import { ChevronDown, LogOut } from 'lucide-react';
import InvitationCard from '@/components/espace-invite/InvitationCard';
import RoleCard from '@/components/espace-invite/RoleCard';
import InfoBanner from '@/components/espace-invite/InfoBanner';

const NAVY = '#1e1b4b';
const LOGO_CRYSTAL = 'https://media.base44.com/images/public/69b804640546049d1a7bf53a/add7d9f16_file_00000000baa0724695dea66812e6a844.png';

const ROLE_CARDS = [
  {
    profile: 'client',
    iconName: 'PartyPopper',
    title: "J'organise un événement",
    description: "Créez et pilotez votre propre mariage, anniversaire ou événement en toute simplicité.",
    buttonLabel: 'Créer mon espace',
    accentColor: '#C5A059',
  },
  {
    profile: 'pro',
    iconName: 'Briefcase',
    title: 'Je suis prestataire',
    description: "Développez votre activité et gérez vos clients depuis Alryck.",
    buttonLabel: 'Devenir prestataire',
    accentColor: '#38bdf8',
  },
  {
    profile: 'staff',
    iconName: 'Users',
    title: 'Je suis collaborateur extra',
    description: "Rejoignez des équipes et participez à des événements.",
    buttonLabel: 'Rejoindre',
    accentColor: '#4a6741',
  },
];

export default function EspaceInvite() {
  const [user, setUser] = useState(null);
  const [loading, setLoading] = useState(true);
  const [upcomingExpanded, setUpcomingExpanded] = useState(true);
  const [pastExpanded, setPastExpanded] = useState(false);
  const [navigatingId, setNavigatingId] = useState(null);

  useEffect(() => {
    base44.auth.me().then(u => { setUser(u); setLoading(false); })
      .catch(() => setLoading(false));
  }, []);

  // ── Charger les invitations liées au compte (par email, auto-link compte_id) ──
  const { data: invites = [], isLoading: invitesLoading } = useQuery({
    queryKey: ['espace-invite-invites', user?.id, user?.email],
    queryFn: async () => {
      if (!user?.email) return [];
      const results = await base44.entities.Invite.filter({ email: user.email });
      // Auto-link compte_id (best-effort, non bloquant)
      const toLink = results.filter(i => !i.compte_id);
      if (toLink.length > 0) {
        base44.entities.Invite.bulkUpdate(
          toLink.map(i => ({ id: i.id, compte_id: user.id }))
        ).catch(() => {});
      }
      return results;
    },
    enabled: !!user?.email,
    staleTime: 30000,
  });

  // ── Charger les événements pour photos de couverture et dates ──
  const evenementIds = [...new Set(invites.map(i => i.evenement_id).filter(Boolean))];
  const { data: evenements = [] } = useQuery({
    queryKey: ['espace-invite-evenements', evenementIds.join(',')],
    queryFn: async () => {
      const results = await Promise.all(
        evenementIds.map(id =>
          base44.entities.Evenement.filter({ id }).then(r => r[0] || null).catch(() => null)
        )
      );
      return results.filter(Boolean);
    },
    enabled: evenementIds.length > 0,
    staleTime: 60000,
  });

  const evenementMap = Object.fromEntries(evenements.map(e => [e.id, e]));

  // ── Séparer en à venir / passées ──
  const upcoming = invites.filter(i => {
    const evt = evenementMap[i.evenement_id];
    if (!evt?.date) return true;
    return !isPast(parseISO(evt.date + 'T00:00:00'));
  }).sort((a, b) => {
    const dA = evenementMap[a.evenement_id]?.date || '9999';
    const dB = evenementMap[b.evenement_id]?.date || '9999';
    return dA.localeCompare(dB);
  });

  const past = invites.filter(i => {
    const evt = evenementMap[i.evenement_id];
    if (!evt?.date) return false;
    return isPast(parseISO(evt.date + 'T00:00:00'));
  }).sort((a, b) => {
    const dA = evenementMap[a.evenement_id]?.date || '';
    const dB = evenementMap[b.evenement_id]?.date || '';
    return dB.localeCompare(dA);
  });

  if (loading || invitesLoading) {
    return (
      <div className="min-h-screen flex items-center justify-center" style={{ background: '#f8f9fc' }}>
        <div className="w-8 h-8 border-2 border-gray-200 rounded-full animate-spin" style={{ borderTopColor: NAVY }} />
      </div>
    );
  }

  const goToInvite = async (invite) => {
    if (navigatingId) return;
    setNavigatingId(invite.id);
    try {
      const programmes = await base44.entities.ProgrammeJourJ.filter({ evenement_id: invite.evenement_id });
      if (programmes.length > 0 && programmes[0].lien_universel_token) {
        window.location.href = `/programme-public?token=${programmes[0].lien_universel_token}`;
      } else {
        window.location.href = `/invitation-detail?invite_id=${invite.id}`;
      }
    } catch {
      window.location.href = `/invitation-detail?invite_id=${invite.id}`;
    } finally {
      setNavigatingId(null);
    }
  };

  return (
    <div className="min-h-screen" style={{ background: '#f8f9fc' }}>
      <div className="max-w-md mx-auto px-5 py-8 pb-16 space-y-8">

        {/* Header */}
        <div className="flex items-center justify-between">
          <img src={LOGO_CRYSTAL} alt="Alryck" style={{ width: 36, height: 36, objectFit: 'contain' }} />
          <button
            onClick={() => base44.auth.logout('/register')}
            className="flex items-center gap-1.5 text-xs text-gray-400 hover:text-gray-600 transition-colors"
          >
            <LogOut size={14} /> Déconnexion
          </button>
        </div>

        {/* ═══ ZONE 1 — Mes invitations ═══ */}
        <div className="space-y-3">
          <div>
            <h1 className="text-2xl font-bold" style={{ color: NAVY }}>Mes invitations</h1>
            <p className="text-sm text-gray-400 mt-1">Retrouvez les événements auxquels vous êtes invité.</p>
          </div>

          {/* À venir — ouverte par défaut */}
          {upcoming.length > 0 && (
            <div>
              <button
                onClick={() => setUpcomingExpanded(v => !v)}
                className="flex items-center gap-2 w-full py-1.5"
              >
                <ChevronDown
                  size={16}
                  className="transition-transform"
                  style={{ color: NAVY, transform: upcomingExpanded ? 'rotate(0deg)' : 'rotate(-90deg)' }}
                />
                <span className="text-sm font-semibold" style={{ color: NAVY }}>À venir</span>
                <span className="text-xs px-2 py-0.5 rounded-full" style={{ background: '#f3f4f6', color: '#6b7280' }}>
                  {upcoming.length}
                </span>
              </button>
              {upcomingExpanded && (
                <div className="space-y-2 mt-1">
                  {upcoming.map(invite => (
                    <InvitationCard
                      key={invite.id}
                      invite={invite}
                      evenement={evenementMap[invite.evenement_id]}
                      onClick={() => goToInvite(invite)}
                    />
                  ))}
                </div>
              )}
            </div>
          )}

          {/* Passées — repliée par défaut */}
          {past.length > 0 && (
            <div>
              <button
                onClick={() => setPastExpanded(v => !v)}
                className="flex items-center gap-2 w-full py-1.5"
              >
                <ChevronDown
                  size={16}
                  className="transition-transform"
                  style={{ color: '#9ca3af', transform: pastExpanded ? 'rotate(0deg)' : 'rotate(-90deg)' }}
                />
                <span className="text-sm font-semibold text-gray-400">Passées</span>
                <span className="text-xs px-2 py-0.5 rounded-full" style={{ background: '#f3f4f6', color: '#9ca3af' }}>
                  {past.length}
                </span>
              </button>
              {pastExpanded && (
                <div className="space-y-2 mt-1">
                  {past.map(invite => (
                    <InvitationCard
                      key={invite.id}
                      invite={invite}
                      evenement={evenementMap[invite.evenement_id]}
                      onClick={() => goToInvite(invite)}
                    />
                  ))}
                </div>
              )}
            </div>
          )}

          {/* Empty state */}
          {upcoming.length === 0 && past.length === 0 && (
            <div className="text-center py-10 space-y-2">
              <span className="text-4xl">📭</span>
              <p className="text-sm font-medium" style={{ color: NAVY }}>Aucune invitation pour le moment</p>
              <p className="text-xs text-gray-400">Vos invitations apparaîtront ici dès qu'elles seront envoyées.</p>
            </div>
          )}
        </div>

        {/* Séparateur */}
        <div style={{ height: 1, background: '#e5e7eb' }} />

        {/* ═══ ZONE 2 — Créer un nouvel espace ═══ */}
        <div className="space-y-4">
          <div>
            <h2 className="text-xl font-bold" style={{ color: NAVY }}>Créer un nouvel espace</h2>
            <p className="text-sm text-gray-400 mt-1">Développez votre expérience avec Alryck.</p>
          </div>
          <div className="space-y-3">
            {ROLE_CARDS.map((card, i) => (
              <RoleCard
                key={card.profile}
                iconName={card.iconName}
                title={card.title}
                description={card.description}
                buttonLabel={card.buttonLabel}
                accentColor={card.accentColor}
                delay={0.1 + i * 0.07}
                onClick={() => { window.location.href = `/register?profile=${card.profile}`; }}
              />
            ))}
          </div>
        </div>

        {/* Bloc message contextuel — toujours visible */}
        <InfoBanner />
      </div>
    </div>
  );
}