import { useState, useEffect } from 'react';
import { useQuery } from '@tanstack/react-query';
import { base44 } from '@/api/base44Client';
import RSVPForm from '@/components/invite-portal/RSVPForm';
import RSVPModeGroupe from '@/components/invite-portal/RSVPModeGroupe';
import DeadlineAlert, { getEtat } from '@/components/invites/DeadlineAlert';
import { useInviteTheme } from '@/components/invite-portal/useInviteTheme';

export default function InvitePortal() {
  const urlParams = new URLSearchParams(window.location.search);
  const token = urlParams.get('token');
  const groupeToken = urlParams.get('groupe');

  const [invite, setInvite] = useState(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);

  // Pour le mode Groupe : on doit retrouver l'événement via le premier invité qui a ce groupe_lien_token
  // ou via une invite "fantôme" qu'on crée localement. On fetch l'info depuis les invites existantes.
  const [groupeInfo, setGroupeInfo] = useState(null); // { evenement_id, evenement_nom }

  const { data: evenement = null } = useQuery({
    queryKey: ['evenement-invite', invite?.evenement_id || groupeInfo?.evenement_id],
    queryFn: () => base44.entities.Evenement.filter({ id: invite?.evenement_id || groupeInfo?.evenement_id }).then(r => r[0] || null),
    enabled: !!(invite?.evenement_id || groupeInfo?.evenement_id),
  });

  const { data: client = null } = useQuery({
    queryKey: ['client-invite', evenement?.client_id],
    queryFn: () => base44.entities.Client.filter({ id: evenement.client_id }).then(r => r[0] || null),
    enabled: !!evenement?.client_id,
  });

  // ── Thème visuel — source unique ProgrammeJourJ.theme_id ──────────────────
  const { theme, isPremiumUnlocked } = useInviteTheme(invite?.evenement_id || groupeInfo?.evenement_id || evenement?.id);

  const organizerName = client?.prenom
    ? (client.prenom2 ? `${client.prenom} & ${client.prenom2}` : client.prenom)
    : evenement?.nom || '';

  useEffect(() => {
    const resolve = async () => {
      // Mode Groupe : paramètre ?groupe=TOKEN
      if (groupeToken && !token) {
        // Chercher un invité existant avec ce groupe_lien_token pour récupérer l'evenement_id
        const existing = await base44.entities.Invite.filter({ groupe_lien_token: groupeToken });
        if (existing.length > 0) {
          setGroupeInfo({ evenement_id: existing[0].evenement_id, evenement_nom: existing[0].evenement_nom });
        } else {
          // Aucun invité encore — on ne peut pas déterminer l'événement sans info supplémentaire
          // On recherche dans tous les invités (pas encore créés = lien tout frais)
          // Dans ce cas on affiche quand même le formulaire d'entrée avec info minimale
          setGroupeInfo({ evenement_id: null, evenement_nom: '' });
        }
        setLoading(false);
        return;
      }

      // Mode individuel : paramètre ?token=TOKEN
      if (!token) {
        setError('Lien invalide. Veuillez utiliser le lien qui vous a été envoyé.');
        setLoading(false);
        return;
      }
      const res = await base44.entities.Invite.filter({ lien_token: token });
      if (res.length === 0) {
        setError('Invitation introuvable. Ce lien est peut-être expiré ou incorrect.');
        setLoading(false);
        return;
      }
      setInvite(res[0]);
      setLoading(false);
    };
    resolve();
  }, [token, groupeToken]);

  if (loading) {
    return (
      <div className="min-h-screen flex items-center justify-center"
        style={{ background: theme.pageBg }}>
        <div className="text-center text-white space-y-4">
          <div className="w-12 h-12 border-4 border-white/30 border-t-white rounded-full animate-spin mx-auto" />
          <p className="text-white/70 text-sm">Chargement de votre invitation…</p>
        </div>
      </div>
    );
  }

  if (error) {
    return (
      <div className="min-h-screen flex items-center justify-center p-6"
        style={{ background: theme.pageBg }}>
        <div className="text-center max-w-sm bg-white/10 backdrop-blur rounded-3xl p-8 text-white">
          <div className="text-5xl mb-4">🔒</div>
          <h2 className="text-xl font-bold mb-2">Lien invalide</h2>
          <p className="text-white/70 text-sm leading-relaxed">{error}</p>
        </div>
      </div>
    );
  }

  // ── Mode Groupe : formulaire d'identification d'abord ──
  if (groupeToken && !invite) {
    return (
      <RSVPModeGroupe
        groupeLienToken={groupeToken}
        evenementId={groupeInfo?.evenement_id}
        evenementNom={groupeInfo?.evenement_nom || evenement?.nom}
        evenement={evenement}
        theme={theme}
        isPremiumUnlocked={isPremiumUnlocked}
        onCreated={(newInvite) => setInvite(newInvite)}
      />
    );
  }

  if (!invite) {
    return (
      <div className="min-h-screen flex items-center justify-center p-6"
        style={{ background: theme.pageBg }}>
        <div className="text-center max-w-sm bg-white/10 backdrop-blur rounded-3xl p-8 text-white">
          <div className="text-5xl mb-4">🔒</div>
          <h2 className="text-xl font-bold mb-2">Lien invalide</h2>
          <p className="text-white/70 text-sm leading-relaxed">Ce lien d'invitation n'est pas reconnu.</p>
        </div>
      </div>
    );
  }

  // Guard deadline — si clôturée, bloquer complètement RSVPForm
  const deadlineEtat = getEtat(invite.date_limite_reponse);
  if (deadlineEtat === 'cloture') {
    return <DeadlineAlert dateLimit={invite.date_limite_reponse} />;
  }

  return <RSVPForm invite={invite} evenement={evenement} organizerName={organizerName} theme={theme} isPremiumUnlocked={isPremiumUnlocked} />;
}