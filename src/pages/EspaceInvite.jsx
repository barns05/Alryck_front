import { useCallback, useEffect, useRef, useState } from 'react';
import { useQuery } from '@tanstack/react-query';
import { base44 } from '@/api/base44Client';
import { isPast, parseISO } from 'date-fns';
import { ChevronDown, ChevronRight, LogOut, Building2, PartyPopper } from 'lucide-react';
import InvitationCard from '@/components/espace-invite/InvitationCard';
import RoleCard from '@/components/espace-invite/RoleCard';
import InfoBanner from '@/components/espace-invite/InfoBanner';
import CreerEvenementModal from '@/components/espace-invite/CreerEvenementModal';
import { useAuth } from '@/lib/AuthContext';
import { ROLES, hasBusinessSpace, hasPersonalSpace, hasRole, homeRouteFor, isPersonalSpace } from '@/lib/roles';

const NAVY = '#1e1b4b';
const LOGO_CRYSTAL = 'https://media.base44.com/images/public/69b804640546049d1a7bf53a/add7d9f16_file_00000000baa0724695dea66812e6a844.png';

// ─── Ouvrir un espace supplémentaire ─────────────────────────────────────────
//  Ces cartes proposent d'endosser un rôle qu'on n'a pas encore. C'est bien une
//  *ouverture d'espace*, pas un choix de profil : celui-ci a déjà été fait à
//  l'inscription, et le reposer juste après donnait à l'écran l'air de n'avoir rien
//  retenu. Chaque carte porte donc la condition qui la rend pertinente, et la section
//  entière disparaît quand il n'en reste aucune.
const ROLE_CARDS = [
  {
    profile: 'client',
    iconName: 'PartyPopper',
    title: "J'organise un événement",
    description: "Créez et pilotez votre propre mariage, anniversaire ou événement en toute simplicité.",
    buttonLabel: 'Créer mon espace',
    accentColor: '#C5A059',
    // Pertinente tant que le compte n'a pas d'espace à lui — la condition porte sur les
    // contextes, pas sur les rôles : dans son propre espace, l'organisateur est `Owner`.
    relevantFor: (user, contexts) => !hasPersonalSpace(contexts),
  },
  {
    profile: 'pro',
    iconName: 'Briefcase',
    title: 'Je suis prestataire',
    description: "Développez votre activité et gérez vos clients depuis Alryck.",
    buttonLabel: 'Devenir prestataire',
    accentColor: '#38bdf8',
    relevantFor: (user, contexts) => !contexts.some(c => !isPersonalSpace(c)) && !hasBusinessSpace(user),
  },
  {
    profile: 'staff',
    iconName: 'Users',
    title: 'Je suis collaborateur extra',
    description: "Rejoignez des équipes et participez à des événements.",
    buttonLabel: 'Rejoindre',
    accentColor: '#4a6741',
    relevantFor: (user) => !hasRole(user, ROLES.Extra, ROLES.Staff),
  },
];

const MOIS = ['janvier', 'février', 'mars', 'avril', 'mai', 'juin',
  'juillet', 'août', 'septembre', 'octobre', 'novembre', 'décembre'];

/**
 * Une date d'événement se lit selon sa précision. L'afficher toujours comme une date ferme
 * ferait passer « courant juin » pour le 1er juin, ce que l'ancien modèle laissait croire.
 */
function formatEventDate(ev) {
  const jour = (iso) => {
    const d = parseISO(iso);
    return `${d.getDate()} ${MOIS[d.getMonth()]} ${d.getFullYear()}`;
  };

  if (ev.datePrecision === 'Month' && ev.monthOf) {
    const d = parseISO(ev.monthOf);
    return `Courant ${MOIS[d.getMonth()]} ${d.getFullYear()}`;
  }
  if (ev.datePrecision === 'Period' && ev.periodStart && ev.periodEnd) {
    return `Entre le ${jour(ev.periodStart)} et le ${jour(ev.periodEnd)}`;
  }
  if (ev.exactDate) return jour(ev.exactDate);
  return 'Date à définir';
}

/** Message d'accueil au retour de l'inscription, par profil choisi. */
const WELCOME = {
  client: {
    title: 'Votre compte est créé',
    body: "Votre espace est prêt : c'est là que vivront les événements que vous organisez. Si un professionnel vous a déjà enregistré, son espace apparaîtra aussi ci-dessous.",
  },
  staff: {
    title: 'Votre compte est créé',
    body: "Dès qu'une entreprise vous recrutera, son espace et vos missions apparaîtront ici.",
  },
  default: {
    title: 'Votre compte est créé',
    body: 'Vos espaces et vos invitations apparaîtront ici.',
  },
};

export default function EspaceInvite() {
  // Le compte et ses appartenances sont déjà chargés par le contexte d'authentification :
  // les relire ici ferait deux appels de plus pour la même réponse.
  const { user, isLoadingAuth, contexts = [], checkAppState } = useAuth();

  const [upcomingExpanded, setUpcomingExpanded] = useState(true);
  const [pastExpanded, setPastExpanded] = useState(false);
  const [navigatingId, setNavigatingId] = useState(null);
  const [switchingTenantId, setSwitchingTenantId] = useState(null);

  const loading = isLoadingAuth;

  // ── Retour d'inscription ────────────────────────────────────────────────────
  //  Le profil vient d'être choisi sur l'écran précédent. On l'accuse réception au lieu
  //  de reposer la question, et on masque les cartes d'ouverture d'espace : proposer
  //  « J'organise un événement » à quelqu'un qui vient de cliquer exactement ça donne
  //  l'impression que rien n'a été enregistré.
  const urlParams = new URLSearchParams(window.location.search);
  const justRegistered = urlParams.get('from') === 'register';
  const registeredProfile = urlParams.get('profile');
  const welcome = justRegistered ? (WELCOME[registeredProfile] ?? WELCOME.default) : null;

  // Cartes encore pertinentes : celles dont le rôle n'est pas déjà détenu.
  const availableRoleCards = justRegistered
    ? []
    : ROLE_CARDS.filter(card => card.relevantFor(user, contexts));

  // ── Provisionnement de l'espace personnel ───────────────────────────────────
  //  Un organisateur a besoin d'un périmètre à lui, où vivront ses événements. Il se crée
  //  ici plutôt qu'à la soumission du formulaire d'inscription, pour deux raisons : le
  //  compte est déjà créé à ce stade, donc un échec ne remet pas l'inscription en cause ;
  //  et surtout il devient **visible** — l'écran peut dire ce qui a raté et proposer de
  //  réessayer, là où le formulaire ne pouvait que l'avaler en silence.
  //
  //  L'endpoint est idempotent : le rappeler ne crée pas un second espace.
  //
  //  Deux garde-fous, appris à la dure. La première version rechargeait la page après
  //  création et gardait sa trace dans un `useRef` — remis à zéro par ce rechargement. Il
  //  suffisait alors que l'espace créé ne soit pas reconnu au retour (un back pas encore
  //  redéployé, par exemple) pour que le cycle « créer → recharger → créer » ne s'arrête
  //  jamais. Donc :
  //    1. on ne recharge plus la page — on redemande son état au contexte d'authentification ;
  //    2. la tentative automatique est mémorisée dans la session du navigateur, donc au plus
  //       une par compte, quoi qu'il arrive ensuite.
  //  Au-delà, c'est à l'utilisateur de redemander, avec un bouton.
  const [provisioning, setProvisioning] = useState(false);
  const [provisionError, setProvisionError] = useState(null);
  const provisionAttempted = useRef(false);

  const needsPersonalSpace =
    !isLoadingAuth && !!user && registeredProfile === 'client' && !hasPersonalSpace(contexts);

  const provisionPersonalSpace = useCallback(async () => {
    setProvisioning(true);
    setProvisionError(null);
    try {
      await base44.tenants.createPersonal({});
      // Le jeton renvoyé porte déjà le nouveau contexte : il suffit de redemander l'état
      // du compte pour que l'écran reparte de là.
      await checkAppState();
    } catch (err) {
      setProvisionError(err?.payload?.message || err?.message || "L'espace n'a pas pu être créé.");
    } finally {
      setProvisioning(false);
    }
  }, [checkAppState]);

  useEffect(() => {
    if (!needsPersonalSpace || !user?.id || provisionAttempted.current) return;

    const onceKey = `alryck.personal-space-attempted.${user.id}`;
    let alreadyTried = false;
    try { alreadyTried = sessionStorage.getItem(onceKey) === '1'; } catch { /* mode privé */ }
    if (alreadyTried) return;

    provisionAttempted.current = true;
    try { sessionStorage.setItem(onceKey, '1'); } catch { /* mode privé */ }
    provisionPersonalSpace();
  }, [needsPersonalSpace, user?.id, provisionPersonalSpace]);

  // ── Mes événements ──────────────────────────────────────────────────────────
  //  Uniquement dans un espace personnel : dans une entreprise, les dossiers se gèrent
  //  depuis le back-office, qui en fait bien plus que cette liste.
  const inPersonalSpace = isPersonalSpace(user);
  const [showCreateEvent, setShowCreateEvent] = useState(false);

  const { data: myEvents = [], isLoading: eventsLoading, refetch: refetchEvents } = useQuery({
    queryKey: ['espace-invite-events', user?.currentTenantId],
    queryFn: () => base44.events.list(),
    enabled: inPersonalSpace,
    staleTime: 30000,
  });

  // ── Charger les invitations liées au compte, par e-mail ──────────────────────
  //  Le rattachement de la fiche invité au compte (`compte_id`) était tenté ici, depuis
  //  le navigateur, via `Invite.bulkUpdate` — une méthode que le client d'API n'expose
  //  pas. L'appel levait une TypeError *avant* que la promesse existe, donc hors de
  //  portée du `.catch()` : la requête échouait et la liste restait vide en permanence,
  //  même lorsque des invitations existaient.
  //
  //  Il est retiré plutôt que réparé : rattacher une invitation à un compte est une
  //  décision serveur (§4.3 — sur proposition, jamais silencieusement), pas une écriture
  //  de confort déclenchée par l'affichage d'un écran.
  const { data: invites = [], isLoading: invitesLoading } = useQuery({
    queryKey: ['espace-invite-invites', user?.id, user?.email],
    queryFn: () => base44.entities.Invite.filter({ email: user.email }),
    enabled: !!user?.email,
    staleTime: 30000,
  });

  // ── Basculer vers un espace de travail ───────────────────────────────────────
  //  Le jeton est réémis avec le tenant et les rôles choisis ; on recharge ensuite la
  //  page cible pour que tous les écrans repartent du nouveau contexte.
  const goToEspace = async (context) => {
    if (switchingTenantId) return;
    setSwitchingTenantId(context.tenantId);
    try {
      await base44.auth.switchContext(context.tenantId);
      // `kind` doit accompagner les rôles : sans lui, un espace personnel se lit comme une
      // entreprise — son titulaire porte `Owner` — et la bascule expédiait l'organisateur
      // sur le back-office.
      window.location.href = homeRouteFor({ roles: context.roles ?? [], tenantKind: context.kind });
    } catch {
      setSwitchingTenantId(null);
    }
  };

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

        {/* ═══ Accueil au retour de l'inscription ═══ */}
        {welcome && (
          <div
            className="rounded-2xl p-4 flex items-start gap-3"
            style={{ background: 'rgba(197,160,89,0.08)', border: '1px solid rgba(197,160,89,0.28)' }}
          >
            <div
              className="shrink-0 w-8 h-8 rounded-full flex items-center justify-center"
              style={{ background: 'rgba(197,160,89,0.18)' }}
            >
              <PartyPopper size={16} style={{ color: '#9a7c33' }} />
            </div>
            <div className="space-y-0.5">
              <p className="text-sm font-semibold" style={{ color: NAVY }}>{welcome.title}</p>
              <p className="text-xs text-gray-500 leading-relaxed">{welcome.body}</p>
            </div>
          </div>
        )}

        {/* ═══ Provisionnement de l'espace personnel ═══ */}
        {provisioning && (
          <div className="flex items-center gap-3 rounded-2xl p-4 bg-white" style={{ boxShadow: '0 2px 12px rgba(30,27,75,0.06)' }}>
            <div className="w-4 h-4 border-2 border-gray-200 rounded-full animate-spin shrink-0" style={{ borderTopColor: NAVY }} />
            <p className="text-sm text-gray-500">Préparation de votre espace…</p>
          </div>
        )}

        {!provisioning && provisionError && (
          <div className="rounded-2xl p-4 space-y-2" style={{ background: '#fef2f2', border: '1px solid #fecaca' }}>
            <p className="text-sm font-semibold text-red-800">Votre espace n'a pas pu être créé</p>
            <p className="text-xs text-red-700 leading-relaxed">{provisionError}</p>
            <button
              type="button"
              onClick={provisionPersonalSpace}
              className="text-xs font-semibold text-red-800 underline underline-offset-2"
            >
              Réessayer
            </button>
          </div>
        )}

        {/* La tentative automatique a eu lieu et l'espace n'est toujours pas là, sans erreur
            à afficher : la création a répondu, mais le contexte n'est pas revenu. Plutôt que
            de recommencer en boucle, on rend la main. */}
        {!provisioning && !provisionError && needsPersonalSpace && provisionAttempted.current && (
          <div className="rounded-2xl p-4 space-y-2 bg-white" style={{ boxShadow: '0 2px 12px rgba(30,27,75,0.06)' }}>
            <p className="text-sm font-semibold" style={{ color: NAVY }}>Votre espace n'est pas encore prêt</p>
            <p className="text-xs text-gray-500 leading-relaxed">
              La création a bien été demandée, mais l'espace ne remonte pas encore. Réessayez dans un instant.
            </p>
            <button
              type="button"
              onClick={provisionPersonalSpace}
              className="text-xs font-semibold underline underline-offset-2"
              style={{ color: NAVY }}
            >
              Créer mon espace
            </button>
          </div>
        )}

        {/* ═══ ZONE 0 — Mes événements (espace personnel) ═══ */}
        {inPersonalSpace && (
          <div className="space-y-3">
            <div>
              <h1 className="text-2xl font-bold" style={{ color: NAVY }}>Mes événements</h1>
              <p className="text-sm text-gray-400 mt-1">Les événements que vous organisez.</p>
            </div>

            {eventsLoading ? (
              <div className="h-16 rounded-2xl bg-white animate-pulse" />
            ) : myEvents.length > 0 ? (
              <div className="space-y-2">
                {myEvents.map(ev => (
                  <div
                    key={ev.id}
                    className="bg-white rounded-2xl p-4 flex items-center gap-3"
                    style={{ boxShadow: '0 2px 12px rgba(30,27,75,0.06)' }}
                  >
                    <div
                      className="shrink-0 w-10 h-10 rounded-full flex items-center justify-center"
                      style={{ background: 'rgba(197,160,89,0.14)' }}
                    >
                      <PartyPopper size={18} style={{ color: '#9a7c33' }} />
                    </div>
                    <div className="min-w-0 flex-1">
                      <p className="font-semibold text-sm truncate" style={{ color: NAVY }}>{ev.name}</p>
                      <p className="text-xs text-gray-400 truncate">
                        {formatEventDate(ev)}
                        {ev.guestCount > 0 && ` · ${ev.guestCount} invités`}
                      </p>
                    </div>
                  </div>
                ))}
              </div>
            ) : (
              <div className="text-center py-8 space-y-2">
                <span className="text-4xl">🎉</span>
                <p className="text-sm font-medium" style={{ color: NAVY }}>Aucun événement pour l'instant</p>
                <p className="text-xs text-gray-400">Créez le vôtre pour commencer à l'organiser.</p>
              </div>
            )}

            <button
              type="button"
              onClick={() => setShowCreateEvent(true)}
              className="w-full py-3 rounded-2xl text-sm font-bold transition-all"
              style={{ background: 'linear-gradient(90deg, #c9a84c, #e2c97e)', color: '#1a2340' }}
            >
              + Créer un événement
            </button>

            {/* Les écrans d'organisation (déroulé, invités, plan de table, prestataires)
                arrivent au lot suivant. Le dire vaut mieux que de laisser cliquer sur une
                carte qui ne mène nulle part. */}
            {myEvents.length > 0 && (
              <p className="text-xs text-gray-400 text-center leading-relaxed">
                L'espace d'organisation de vos événements arrive prochainement.
              </p>
            )}
          </div>
        )}

        <CreerEvenementModal
          open={showCreateEvent}
          onClose={() => setShowCreateEvent(false)}
          onCreated={() => { setShowCreateEvent(false); refetchEvents(); }}
        />

        {/* ═══ ZONE 1 — Mes espaces ═══ */}
        {/*  Les appartenances du compte, tous tenants confondus (GET /api/me/contexts).
            C'est la seule lecture que le serveur sait faire hors contexte de travail, et
            donc la seule chose qu'un compte fraîchement inscrit puisse voir de ses
            rattachements. Masquée quand il n'y en a aucun : un titre suivi du vide
            n'apprend rien. */}
        {contexts.length > 0 && (
          <div className="space-y-3">
            <div>
              <h1 className="text-2xl font-bold" style={{ color: NAVY }}>Mes espaces</h1>
              <p className="text-sm text-gray-400 mt-1">
                {contexts.length > 1
                  ? 'Choisissez l’entreprise dans laquelle vous souhaitez travailler.'
                  : 'Votre espace de travail.'}
              </p>
            </div>

            <div className="space-y-2">
              {contexts.map(context => (
                <button
                  key={context.tenantId}
                  type="button"
                  disabled={Boolean(switchingTenantId)}
                  onClick={() => goToEspace(context)}
                  className="w-full flex items-center gap-3 bg-white rounded-2xl p-4 text-left transition-all hover:shadow-md disabled:opacity-50"
                  style={{ boxShadow: '0 2px 12px rgba(30,27,75,0.06)' }}
                >
                  <div
                    className="shrink-0 w-10 h-10 rounded-full flex items-center justify-center"
                    style={{ background: isPersonalSpace(context) ? 'rgba(197,160,89,0.14)' : 'rgba(30,27,75,0.06)' }}
                  >
                    {isPersonalSpace(context)
                      ? <PartyPopper size={18} style={{ color: '#9a7c33' }} />
                      : <Building2 size={18} style={{ color: NAVY }} />}
                  </div>
                  <div className="min-w-0 flex-1">
                    <p className="font-semibold text-sm truncate" style={{ color: NAVY }}>
                      {context.tenantName}
                    </p>
                    {/* Dans son propre espace, afficher « Owner » n'apprendrait rien à un
                        particulier : le rôle n'a de sens que dans une entreprise. */}
                    <p className="text-xs text-gray-400 truncate">
                      {isPersonalSpace(context)
                        ? 'Vos événements'
                        : ((context.roles ?? []).join(', ') || 'Sans rôle')}
                    </p>
                  </div>
                  {switchingTenantId === context.tenantId
                    ? <div className="w-4 h-4 border-2 border-gray-200 rounded-full animate-spin shrink-0" style={{ borderTopColor: NAVY }} />
                    : <ChevronRight size={18} className="text-gray-300 shrink-0" />}
                </button>
              ))}
            </div>
          </div>
        )}

        {/* ═══ ZONE 2 — Mes invitations ═══ */}
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
              {/* Un compte sans appartenance ne peut structurellement rien voir ici : la
                  lecture des invitations est bornée au tenant courant, et il n'en a pas.
                  Autant le dire, plutôt que de laisser croire à une attente. */}
              <p className="text-xs text-gray-400">
                {contexts.length === 0
                  ? "Votre organisateur vous enverra un lien d'accès, ou vous les retrouverez ici s'il enregistre l'adresse de ce compte."
                  : 'Vos invitations apparaîtront ici dès qu’elles seront envoyées.'}
              </p>
            </div>
          )}
        </div>

        {/* ═══ ZONE 3 — Ouvrir un espace supplémentaire ═══ */}
        {/*  Masquée au retour de l'inscription, et réduite aux rôles que le compte n'a
            pas encore. Sans cette condition, l'écran reproposait le profil qui venait
            d'être choisi. */}
        {availableRoleCards.length > 0 && (
        <>
        {/* Séparateur */}
        <div style={{ height: 1, background: '#e5e7eb' }} />

        <div className="space-y-4">
          <div>
            <h2 className="text-xl font-bold" style={{ color: NAVY }}>Ouvrir un autre espace</h2>
            <p className="text-sm text-gray-400 mt-1">Développez votre expérience avec Alryck.</p>
          </div>
          <div className="space-y-3">
            {availableRoleCards.map((card, i) => (
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
        </>
        )}

        {/* Bloc message contextuel — il parle de choisir entre plusieurs espaces, donc il
            ne s'affiche qu'à partir de deux. Il était auparavant permanent et renvoyait à
            un sélecteur qui n'existe nulle part. */}
        {contexts.length > 1 && <InfoBanner />}
      </div>
    </div>
  );
}