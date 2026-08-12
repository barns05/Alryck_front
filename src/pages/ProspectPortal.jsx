import { useState, useEffect, useRef } from 'react';
import { useQuery } from '@tanstack/react-query';
import { base44 } from '@/api/base44Client';
import PortalHeader from '@/components/portal/PortalHeader';
import PortalAuthModal from '@/components/portal/PortalAuthModal';
import { usePortalAuth } from '@/hooks/usePortalAuth';
import ProspectGalerie from '@/components/prospect-portal/ProspectGalerie';
import ProspectFormules from '@/components/prospect-portal/ProspectFormules';
import ProspectAvis from '@/components/prospect-portal/ProspectAvis';
import ProspectMessagerie from '@/components/prospect-portal/ProspectMessagerie';
import ProspectDateDemande from '@/components/prospect-portal/ProspectDateDemande';
import ProspectPreReservation from '@/components/prospect-portal/ProspectPreReservation';
import CountdownSection from '@/components/client-portal/CountdownSection';
import SocialNetworksSection from '@/components/client-portal/SocialNetworksSection';
import { useOwnerCompanySettings } from '@/hooks/useOwnerCompanySettings';
import ProspectToujoursInteresse from '@/components/prospect-portal/ProspectToujoursInteresse';
import { Image, Star, UtensilsCrossed, MessageCircle, ClipboardList, Map, Folder, FileText, Camera, Users, CalendarClock, FileCheck } from 'lucide-react';

const PROSPECT_TILES = [
  {
    id: 'galerie',
    emoji: '🖼️',
    label: 'Galerie',
    icon: Image,
    sublabel: 'Photos & ambiance',
  },
  {
    id: 'avis',
    emoji: '⭐',
    label: 'Avis clients',
    icon: Star,
    sublabel: 'Retours & note moyenne',
  },
  {
    id: 'formules',
    emoji: '🍽️',
    label: 'Formules & Devis',
    icon: UtensilsCrossed,
    sublabel: 'Offres & tarifs',
  },
  {
    id: 'messages',
    emoji: '💬',
    label: 'Messagerie',
    icon: MessageCircle,
    sublabel: 'Échangez avec nous',
  },
  {
    id: 'dates',
    emoji: '📅',
    label: 'Demande de date',
    icon: CalendarClock,
    sublabel: 'Indiquez vos dates',
  },
  {
    id: 'prereservation',
    emoji: '🔐',
    label: 'Ma pré-réservation',
    icon: FileCheck,
    sublabel: 'Votre devis en ligne',
  },
];

const LOCKED_TILES = [
  { id: 'programme', emoji: '📋', label: 'Programme de la journée', icon: ClipboardList },
  { id: 'plan_table', emoji: '🗺️', label: 'Plan de table', icon: Map },
  { id: 'documents', emoji: '📁', label: 'Mes documents', icon: Folder },
  { id: 'formulaire', emoji: '📝', label: 'Questionnaire de préparation', icon: FileText },
  { id: 'medias', emoji: '📸', label: 'Mes médias', icon: Camera },
  { id: 'prestataires', emoji: '🤝', label: 'Vos prestataires', icon: Users },
];

const EVENT_EMOJIS = {
  'Mariage': '💍',
  'Anniversaire': '🎂',
  'Gala': '🥂',
  'Baptême': '🕊️',
  'Pacs': '💑',
  "Soirée d'entreprise": '🏢',
  'Séminaire': '📊',
  'Cocktail': '🍸',
  'Location': '🏡',
  'Autre': '🎉',
};

// Tuiles découverte : galerie, avis, formules, messagerie (les 4 premiers de PROSPECT_TILES)
const DISCOVERY_TILE_IDS = ['galerie', 'avis', 'formules', 'messages'];

function ProspectDiscoveryTiles({ onSelectTile }) {
  const tiles = PROSPECT_TILES.filter(t => DISCOVERY_TILE_IDS.includes(t.id));
  return (
    <div className="grid grid-cols-2 gap-3">
      {tiles.map(tile => {
        const Icon = tile.icon;
        return (
          <button
            key={tile.id}
            onClick={() => onSelectTile(tile.id)}
            className="premium-card flex flex-col items-start gap-2 p-5 text-left transition-all active:scale-[0.97]"
          >
            <div className="w-11 h-11 rounded-xl flex items-center justify-center shrink-0 relative z-[3]" style={{ background: 'rgba(30,27,75,0.06)' }}>
              <Icon size={22} strokeWidth={1.75} style={{ color: '#1e1b4b' }} />
            </div>
            <div className="space-y-0.5 w-full relative z-[3]">
              <p className="premium-card-title text-sm leading-tight" style={{ color: '#1e1b4b' }}>{tile.label}</p>
              <p className="text-[11px] leading-snug" style={{ color: '#9ca3af' }}>{tile.sublabel}</p>
            </div>
          </button>
        );
      })}
    </div>
  );
}

function LockedTile({ tile }) {
  const Icon = tile.icon;
  return (
    <div className="premium-card flex flex-col items-center justify-center gap-2 p-4 opacity-70 select-none text-center">
      <div className="w-11 h-11 rounded-xl flex items-center justify-center shrink-0 relative z-[3]" style={{ background: 'rgba(30,27,75,0.06)' }}>
        <Icon size={22} strokeWidth={1.75} style={{ color: '#1e1b4b' }} />
      </div>
      <p className="text-xs font-medium relative z-[3]" style={{ color: '#1e1b4b' }}>{tile.label}</p>
      <p className="text-[10px] relative z-[3]" style={{ color: '#9ca3af' }}>Disponible après confirmation</p>
    </div>
  );
}

export default function ProspectPortal() {
  const urlParams = new URLSearchParams(window.location.search);
  const token = urlParams.get('token');

  const [prospect, setProspect] = useState(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);
  const [activeTile, setActiveTile] = useState(null);
  const [demandeReservationEnvoyee, setDemandeReservationEnvoyee] = useState(false);
  const formulesScrollRef = useRef(null);

  // Redirection transparente vers l'espace unifié si token présent
  useEffect(() => {
    if (token) {
      window.location.replace(`/client-portal?token=${token}`);
    }
  }, [token]);

  const { settings } = useOwnerCompanySettings();

  const { data: datesDemandes } = useQuery({
    queryKey: ['prospect-dates', prospect?.id],
    queryFn: () => base44.entities.ProspectDateDemande.filter({ prospect_id: prospect.id }),
    enabled: !!prospect?.id,
  });

  const { data: devis = [] } = useQuery({
    queryKey: ['devis-prospect', prospect?.id],
    queryFn: () => base44.entities.Devis.filter({ prospect_id: prospect.id }),
    enabled: !!prospect?.id,
  });

  const devisProspect = devis.filter(d =>
    ['Envoyé', 'Accepté'].includes(d.statut)
  );

  const { data: preResa = null } = useQuery({
    queryKey: ['prereservation', prospect?.id],
    queryFn: () => base44.entities.PreReservation
      .filter({ prospect_id: prospect.id })
      .then(r => r[0] || null),
    enabled: !!prospect?.id,
    staleTime: 2 * 60 * 1000,
  });

  const { authStep, authError, isAuthenticated, handleRegister, handleLogin, handleForgotPassword, handleSkip, handleLogout } = usePortalAuth({
    token,
    entityType: 'prospect',
    entityId: prospect?.id,
    entityEmail: prospect?.email,
    portalPassword: prospect?.portal_password,
    onSavePassword: async (hash, email) => {
      await base44.entities.Prospect.update(prospect.id, { portal_password: hash, portal_email: email });
      setProspect(prev => ({ ...prev, portal_password: hash, portal_email: email }));
    },
    onSendForgotLink: async (email) => {
      await base44.integrations.Core.SendEmail({
        to: email,
        subject: 'Accès à votre espace prospect',
        body: `Bonjour,\n\nVoici votre lien d'accès à votre espace :\n${window.location.href}\n\nCordialement`,
      });
    },
  });

  const fetchProspect = async (t) => {
    if (!t) { setError('Lien invalide.'); setLoading(false); return; }
    const res = await base44.entities.Prospect.filter({ lien_token: t });
    if (res.length === 0) {
      setError('Espace introuvable. Veuillez contacter votre organisateur.');
      setLoading(false);
      return;
    }
    const p = res[0];
    if (p.converti && p.client_id) {
      const clients = await base44.entities.Client.filter({ id: p.client_id });
      const client = clients[0];
      if (client?.lien_client_token) {
        window.location.replace(`/client-portal?token=${client.lien_client_token}`);
        return;
      }
    }
    setProspect(p);
    setLoading(false);
  };

  useEffect(() => {
    if (!token) fetchProspect(token);
  }, [token]);

  useEffect(() => {
    const reload = () => {
      if (document.visibilityState === 'visible' && token) {
        fetchProspect(token);
      }
    };
    document.addEventListener('visibilitychange', reload);
    return () => document.removeEventListener('visibilitychange', reload);
  }, [token]);

  if (token || loading) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-background">
        <div className="w-8 h-8 border-4 border-slate-200 border-t-primary rounded-full animate-spin" />
      </div>
    );
  }

  if (error || !prospect) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-background p-4">
        <div className="text-center max-w-sm">
          <div className="text-5xl mb-4">🔒</div>
          <h2 className="text-xl font-bold mb-2">Accès impossible</h2>
          <p className="text-muted-foreground text-sm">{error}</p>
        </div>
      </div>
    );
  }

  const isSigned = prospect.statut === 'Signé';
  const prospectNom = prospect.prenom + ' ' + prospect.nom + (prospect.prenom2 ? ' & ' + prospect.prenom2 + ' ' + (prospect.nom2 || prospect.nom) : '');
  const prenomAffichage = prospect.prenom2 ? `${prospect.prenom} & ${prospect.prenom2}` : prospect.prenom;

  const handleReserverClick = async () => {
    // Cas D — Pré-résa signée
    if (preResa?.statut === 'Signé') return;

    // Cas C — Pré-résa créée par admin
    if (preResa) {
      setActiveTile('prereservation');
      return;
    }

    // Cas A — Pas de devis reçu
    if (!devisProspect || devisProspect.length === 0) {
      setActiveTile('formules');
      return;
    }

    // Cas B — Devis reçu, pas de pré-résa → Envoyer demande à l'admin
    await base44.entities.ProspectMessage.create({
      prospect_id: prospect.id,
      auteur: 'prospect',
      message: `DEMANDE_RESERVATION:${JSON.stringify({ prospect_id: prospect.id, prenom: prospect.prenom, nom: prospect.nom })}`,
    });
    await base44.entities.Notification.create({
      titre: '🔐 Demande de réservation',
      message: prospect.prenom + ' ' + prospect.nom + ' souhaite réserver son événement.',
      type: 'info',
      lien: '/Clients?tab=prospects',
    });
    setDemandeReservationEnvoyee(true);
  };

  return (
    <div className="min-h-screen overflow-x-hidden" style={{ background: '#faf8f4' }}>
      {authStep && (
        <PortalAuthModal
          mode={authStep}
          entityEmail={prospect?.portal_email || prospect?.email || ''}
          entityNom={prospectNom}
          onRegister={handleRegister}
          onLogin={handleLogin}
          onForgotPassword={handleForgotPassword}
          onSkip={handleSkip}
          error={authError}
          portalType="prospect"
        />
      )}

      {/* Bandeau fixe */}
      <div className="sticky top-0 z-40">
        <PortalHeader
          subtitle="Votre projet ✨"
          userLabel={prospectNom}
          userSub={prospect?.type_evenement}
          portalType="prospect"
        />
      </div>

      {/* Bouton retour */}
      <div className="px-4 pt-3">
        <button
          onClick={() => window.history.back()}
          className="flex items-center gap-1.5 text-sm text-muted-foreground hover:text-foreground transition-colors"
        >
          <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><polyline points="15 18 9 12 15 6"/></svg>
          Retour
        </button>
      </div>

      {/* Compte à rebours + réseaux sociaux */}
      <div className="px-4 pt-4 space-y-3">
        {/* Date exacte → compte à rebours */}
        {(prospect.date_type === 'exacte' || !prospect.date_type) && prospect.date_evenement_souhaitee && (
          <CountdownSection
            evenement={{
              date: prospect.date_evenement_souhaitee,
              nom: prospectNom,
              type_evenement: prospect.type_evenement,
            }}
            bgStyle={prospect.couleur_theme ? { backgroundColor: prospect.couleur_theme } : undefined}
          />
        )}
        {/* Mois → affichage mois */}
        {prospect.date_type === 'mois' && prospect.date_mois && (() => {
          const couleur = prospect.couleur_theme;
          const computedStyle = couleur ? { background: `linear-gradient(135deg, ${couleur}dd, ${couleur}99)` } : undefined;
          const icon = prospect.type_evenement === 'Mariage' ? '💍' : prospect.type_evenement === 'Anniversaire' ? '🎂' : '🎉';
          const moisLabel = new Date(prospect.date_mois + '-15').toLocaleDateString('fr-FR', { month: 'long', year: 'numeric' });
          const moisRestants = Math.max(0, Math.round((new Date(prospect.date_mois + '-15') - new Date()) / (1000 * 60 * 60 * 24 * 30)));
          return (
            <div className="rounded-2xl p-5 shadow-lg text-center text-white bg-gradient-to-br from-primary to-primary/80" style={computedStyle}>
              <div className="text-3xl mb-2">{icon}</div>
              <h2 className="text-lg font-bold mb-1">{prospectNom}</h2>
              <p className="text-white/70 text-sm mb-2">{prospect.type_evenement}</p>
              <p className="text-white/70 text-xs uppercase tracking-widest mb-1">Date souhaitée</p>
              <p className="text-xl font-bold">📅 {moisLabel}</p>
              <p className="text-white/60 text-xs mt-1">Dans {moisRestants} mois environ</p>
            </div>
          );
        })()}
        {/* Période → affichage texte */}
        {prospect.date_type === 'periode' && prospect.date_periode && (() => {
          const couleur = prospect.couleur_theme;
          const computedStyle = couleur ? { background: `linear-gradient(135deg, ${couleur}dd, ${couleur}99)` } : undefined;
          const icon = prospect.type_evenement === 'Mariage' ? '💍' : prospect.type_evenement === 'Anniversaire' ? '🎂' : '🎉';
          return (
            <div className="rounded-2xl p-5 shadow-lg text-center text-white bg-gradient-to-br from-primary to-primary/80" style={computedStyle}>
              <div className="text-3xl mb-2">{icon}</div>
              <h2 className="text-lg font-bold mb-1">{prospectNom}</h2>
              <p className="text-white/70 text-sm mb-2">{prospect.type_evenement}</p>
              <p className="text-white/70 text-xs uppercase tracking-widest mb-1">Période souhaitée</p>
              <p className="text-xl font-bold">📅 {prospect.date_periode}</p>
            </div>
          );
        })()}
        <SocialNetworksSection />
      </div>

      {/* MESSAGE DE BIENVENUE */}
      <div className="mx-4 mt-4 bg-white border border-border rounded-2xl px-5 py-4 text-center shadow-sm">
        <span className="text-2xl">{EVENT_EMOJIS[prospect.type_evenement] || '✨'}</span>
        <p className="text-base font-semibold text-foreground mt-1">
          Bonjour {prenomAffichage} ✨
        </p>
        {prospect.type_evenement && (
          <p className="text-sm text-muted-foreground mt-1">
            Nous sommes ravis de vous accompagner dans l'organisation de votre{' '}
            <span className="font-medium text-foreground">{prospect.type_evenement.toLowerCase()}</span>.
          </p>
        )}
        {prospect.lieu_nom && (
          <p className="text-xs text-muted-foreground mt-1.5 flex items-center justify-center gap-1">
            📍 {prospect.lieu_nom}
          </p>
        )}
      </div>

      {/* BLOC 1 — Découverte */}
      <div className="px-4 pt-5">
        <p className="text-[11px] font-semibold text-muted-foreground uppercase tracking-widest mb-3">🌟 Découvrez notre univers</p>
        <ProspectDiscoveryTiles onSelectTile={setActiveTile} />
      </div>

      {/* BLOC 2 — CTA actions */}
      <div className="px-4 pt-5 pb-1 space-y-3">
        <p className="text-[11px] font-semibold text-muted-foreground uppercase tracking-widest mb-3">🎯 Passez à l'étape suivante</p>
        <button
          onClick={() => setActiveTile('dates')}
          className="w-full flex items-center justify-center gap-2 py-3.5 px-5 rounded-2xl border-2 border-cyan-200 bg-cyan-50 text-cyan-800 font-semibold text-sm transition-all active:scale-[0.98]"
        >
          📅 Demander une disponibilité
        </button>
        {/* Cas D — Pré-résa signée */}
        {preResa?.statut === 'Signé' ? (
          <button disabled className="w-full flex items-center justify-center gap-2 py-3.5 px-5 rounded-2xl bg-emerald-500 text-white font-semibold text-sm opacity-80 cursor-not-allowed">
            ✅ Réservation confirmée
          </button>
        ) : preResa ? (
          /* Cas C — Pré-résa créée par admin */
          <button
            onClick={handleReserverClick}
            className="w-full flex items-center justify-center gap-2 py-3.5 px-5 rounded-2xl bg-primary text-primary-foreground font-semibold text-sm transition-all active:scale-[0.98] shadow-md"
          >
            📄 Voir ma pré-réservation
          </button>
        ) : devisProspect.length > 0 ? (
          /* Cas B — Devis reçu, pas de pré-résa */
          demandeReservationEnvoyee ? (
            <button disabled className="w-full flex items-center justify-center gap-2 py-3.5 px-5 rounded-2xl bg-emerald-100 text-emerald-700 font-semibold text-sm cursor-not-allowed">
              ✅ Demande envoyée
            </button>
          ) : (
            <button
              onClick={handleReserverClick}
              className="w-full flex items-center justify-center gap-2 py-3.5 px-5 rounded-2xl bg-primary text-primary-foreground font-semibold text-sm transition-all active:scale-[0.98] shadow-md"
            >
              🔐 Réserver mon événement
            </button>
          )
        ) : (
          /* Cas A — Pas de devis */
          <button
            onClick={handleReserverClick}
            className="w-full flex items-center justify-center gap-2 py-3.5 px-5 rounded-2xl border-2 border-border bg-background text-foreground font-semibold text-sm transition-all active:scale-[0.98]"
          >
            📋 Demander un devis d'abord
          </button>
        )}
      </div>

      {/* Bloc toujours intéressé — visible si "Devis envoyé" ou "À relancer" */}
      {['Devis envoyé', 'À relancer'].includes(prospect.statut) && (
        <div className="px-4 pt-4">
          <ProspectToujoursInteresse prospect={prospect} />
        </div>
      )}

      {/* Bandeau signé */}
      {isSigned && (
        <div className="mx-4 mt-4 bg-emerald-50 border border-emerald-200 rounded-2xl px-4 py-3 flex items-start gap-3">
          <span className="text-xl">🎉</span>
          <div>
            <p className="font-semibold text-sm text-emerald-800">Réservation confirmée !</p>
            <p className="text-xs text-emerald-700 mt-0.5">Votre espace client est maintenant actif avec toutes les fonctionnalités déverrouillées.</p>
          </div>
        </div>
      )}

      {/* BLOC 3 — Tuiles verrouillées */}
      {!isSigned && (
        <div className="px-4 pt-5 pb-8">
          <p className="text-[11px] font-semibold text-muted-foreground uppercase tracking-widest mb-3">🔒 Disponible après confirmation</p>
          <div className="grid grid-cols-2 gap-3">
            {LOCKED_TILES.map(t => <LockedTile key={t.id} tile={t} />)}
          </div>
        </div>
      )}

      {/* Contenu des tuiles en drawers simples */}
      {activeTile === 'galerie' && (
        <ProspectPortalTileDrawer tileId={activeTile} prospect={prospect} onClose={() => setActiveTile(null)}>
          <ProspectGalerie />
        </ProspectPortalTileDrawer>
      )}
      {activeTile === 'formules' && (
        <ProspectPortalTileDrawer tileId={activeTile} prospect={prospect} onClose={() => setActiveTile(null)} scrollRef={formulesScrollRef}>
          <ProspectFormules prospect={prospect} onNavigate={(tile) => { setActiveTile(tile); }} scrollRef={formulesScrollRef} />
        </ProspectPortalTileDrawer>
      )}
      {activeTile === 'avis' && (
        <ProspectPortalTileDrawer tileId={activeTile} prospect={prospect} onClose={() => setActiveTile(null)}>
          <ProspectAvis settings={settings} />
        </ProspectPortalTileDrawer>
      )}
      {activeTile === 'messages' && (
        <ProspectPortalTileDrawer tileId={activeTile} prospect={prospect} onClose={() => setActiveTile(null)}>
          <ProspectMessagerie prospectId={prospect.id} prospectNom={prospectNom} />
        </ProspectPortalTileDrawer>
      )}
      {activeTile === 'dates' && (
        <ProspectPortalTileDrawer tileId={activeTile} prospect={prospect} onClose={() => setActiveTile(null)}>
          <ProspectDateDemande prospectId={prospect.id} prospectNom={prospectNom} />
        </ProspectPortalTileDrawer>
      )}
      {activeTile === 'prereservation' && (
        <ProspectPortalTileDrawer tileId={activeTile} prospect={prospect} onClose={() => setActiveTile(null)}>
          <ProspectPreReservation prospectId={prospect.id} prospectNom={prospectNom} />
        </ProspectPortalTileDrawer>
      )}

    </div>
  );
}

function ProspectPortalTileDrawer({ tileId, prospect, onClose, children, scrollRef }) {
  const getTileConfig = () => {
    const tile = PROSPECT_TILES.find(t => t.id === tileId);
    return tile || { emoji: '❓', label: 'Tuile' };
  };
  const tile = getTileConfig();

  return (
    <div className="fixed inset-0 z-50 flex flex-col bg-background">
      <div className="flex items-center justify-between px-4 py-3 border-b border-border">
        <h2 className="font-semibold text-lg flex items-center gap-2">{tile.emoji} {tile.label}</h2>
        <button onClick={onClose} className="text-muted-foreground hover:text-foreground transition-colors text-xl">✕</button>
      </div>
      <div ref={scrollRef} className="flex-1 overflow-y-auto px-4 py-4">
        {children}
      </div>
    </div>
  );
}