import { useState } from 'react';
import { base44 } from '@/api/base44Client';
import { toast } from 'sonner';

/**
 * Hook partagé pour les actions sur le lien espace client d'un événement.
 * Utilisé par EvenementDetail et tout autre composant ayant besoin d'envoyer
 * ou copier le lien de l'espace client.
 */
export function useClientPortal(evenement) {
  const [sendingLink, setSendingLink] = useState(false);

  const portalUrl = evenement?.lien_client_token
    ? `${window.location.origin}/evenement-client?token=${evenement.lien_client_token}`
    : null;

  const copyLink = () => {
    if (!portalUrl) return;
    navigator.clipboard.writeText(portalUrl);
    toast.success('Lien copié !');
  };

  const sendLink = async () => {
    if (!evenement?.client_email || !portalUrl) return;
    setSendingLink(true);
    await base44.integrations.Core.SendEmail({
      to: evenement.client_email,
      subject: `Votre espace événement — ${evenement.nom}`,
      body: `<p>Bonjour ${evenement.client_nom || ''},</p><p>Retrouvez toutes les informations de votre événement "<strong>${evenement.nom}</strong>" en cliquant sur le lien ci-dessous :</p><p><a href="${portalUrl}" style="display:inline-block;padding:12px 24px;background:#1e40af;color:white;text-decoration:none;border-radius:8px;font-weight:600;">Accéder à mon espace →</a></p><p>Cordialement</p>`,
    });
    setSendingLink(false);
    toast.success('Lien envoyé !');
  };

  return { portalUrl, copyLink, sendLink, sendingLink };
}