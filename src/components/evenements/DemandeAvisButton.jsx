import { useState } from 'react';
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import { base44 } from '@/api/base44Client';
import { Star, Send, CheckCircle, Clock } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { format } from 'date-fns';
import { fr } from 'date-fns/locale';
import { useOwnerCompanySettings } from '@/hooks/useOwnerCompanySettings';

function buildEmailBody(message, platforms, evenement) {
  const clientPrenom = evenement.client_nom?.split(' ')[0] || evenement.client_nom || 'cher client';
  const personalised = (message || 'Bonjour {client},\n\nMerci pour votre confiance ! Votre avis nous aide à progresser.')
    .replace('{client}', clientPrenom)
    .replace('{type_evenement}', evenement.type_evenement || 'événement');

  const platformLinks = platforms
    .filter((p) => p.name && p.url)
    .map((p) => `• ${p.name} : ${p.url}`)
    .join('\n');

  return `${personalised}\n\n${platforms.length > 0 ? `Déposez votre avis ici :\n${platformLinks}` : ''}\n\nMerci beaucoup !`;
}

export default function DemandeAvisButton({ evenement }) {
  const qc = useQueryClient();
  const [sent, setSent] = useState(false);

  const { data: avisList = [] } = useQuery({
    queryKey: ['avis-evenement', evenement.id],
    queryFn: () => base44.entities.AvisEvenement.filter({ evenement_id: evenement.id }),
  });

  const { settings: _ownerSettings } = useOwnerCompanySettings();

  const avis = avisList[0] || null;
  const settings = _ownerSettings || null;
  const platforms = settings?.review_platforms || [];
  const autoMessage = settings?.auto_review_message || '';

  const sendMutation = useMutation({
    mutationFn: async () => {
      if (!evenement.client_email) throw new Error('Pas d\'email client');
      const body = buildEmailBody(autoMessage, platforms, evenement);
      const subject = `Votre avis sur votre ${evenement.type_evenement || 'événement'} – ${evenement.nom}`;

      await base44.integrations.Core.SendEmail({
        to: evenement.client_email,
        subject,
        body,
      });

      const now = new Date().toISOString().split('T')[0];
      if (avis?.id) {
        await base44.entities.AvisEvenement.update(avis.id, {
          statut: 'Envoyé',
          date_envoi: now,
          mode_envoi: 'Manuel',
        });
      } else {
        await base44.entities.AvisEvenement.create({
          evenement_id: evenement.id,
          evenement_nom: evenement.nom,
          client_email: evenement.client_email,
          client_nom: evenement.client_nom,
          date_evenement: evenement.date,
          statut: 'Envoyé',
          date_envoi: now,
          mode_envoi: 'Manuel',
        });
      }
      setSent(true);
    },
    onSuccess: () => {
      qc.invalidateQueries(['avis-evenement', evenement.id]);
      qc.invalidateQueries(['avis-evenements']);
    },
  });

  const markReceived = useMutation({
    mutationFn: async () => {
      if (avis?.id) {
        await base44.entities.AvisEvenement.update(avis.id, { statut: 'Avis reçu' });
      }
    },
    onSuccess: () => qc.invalidateQueries(['avis-evenement', evenement.id]),
  });

  // Statut courant
  const statut = avis?.statut || 'Non demandé';

  if (statut === 'Avis reçu') {
    return (
      <div className="flex items-center gap-1.5 text-emerald-600 text-sm font-medium">
        <CheckCircle size={14} />
        Avis reçu
      </div>
    );
  }

  if (statut === 'Envoyé') {
    return (
      <div className="flex items-center gap-3">
        <div className="flex items-center gap-1.5 text-blue-600 text-sm">
          <Clock size={14} />
          <span>Demande envoyée{avis?.date_envoi ? ` le ${format(new Date(avis.date_envoi), 'd MMM', { locale: fr })}` : ''}</span>
        </div>
        <button
          onClick={() => markReceived.mutate()}
          className="text-xs text-emerald-600 hover:underline"
        >
          Marquer comme reçu
        </button>
      </div>
    );
  }

  // Non demandé
  return (
    <Button
      size="sm"
      variant="outline"
      className="gap-1.5 text-amber-600 border-amber-300 hover:bg-amber-50"
      onClick={() => sendMutation.mutate()}
      disabled={sendMutation.isPending || !evenement.client_email || sent}
    >
      <Star size={13} />
      {sendMutation.isPending ? 'Envoi...' : 'Demander un avis'}
    </Button>
  );
}