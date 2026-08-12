import { useState } from 'react';
import { useQuery } from '@tanstack/react-query';
import { base44 } from '@/api/base44Client';
import { Button } from '@/components/ui/button';
import { Send, Loader2 } from 'lucide-react';
import { toast } from 'sonner';
import { useOwnerCompanySettings } from '@/hooks/useOwnerCompanySettings';

export default function EnvoyerRibButton({ clientEmail, clientNom, size = 'sm', variant = 'outline' }) {
  const [sending, setSending] = useState(false);

  const { settings: company } = useOwnerCompanySettings();

  const hasRib = company && (company.iban || company.rib_url);

  const handleSend = async () => {
    if (!clientEmail) {
      toast.error('Aucun email client renseigné');
      return;
    }
    if (!hasRib) {
      toast.error('Aucun RIB configuré dans Paramètres → Identité');
      return;
    }

    setSending(true);
    let body = `Bonjour ${clientNom || ''},\n\nVeuillez trouver ci-dessous nos coordonnées bancaires pour le règlement :\n\n`;

    if (company.nom_banque) body += `Banque : ${company.nom_banque}\n`;
    if (company.iban) body += `IBAN : ${company.iban}\n`;
    if (company.bic) body += `BIC : ${company.bic}\n`;
    if (company.rib_url) body += `\nVous pouvez également consulter notre RIB en cliquant sur ce lien : ${company.rib_url}\n`;

    body += `\nCordialement,\n${company.company_name || ''}`;

    await base44.integrations.Core.SendEmail({
      to: clientEmail,
      subject: `Coordonnées bancaires — ${company.company_name || ''}`,
      body,
      from_name: company.company_name,
    });

    setSending(false);
    toast.success(`RIB envoyé à ${clientEmail}`);
  };

  if (!clientEmail) return null;

  return (
    <Button size={size} variant={variant} className="gap-1.5" onClick={handleSend} disabled={sending}>
      {sending ? <Loader2 size={14} className="animate-spin" /> : <Send size={14} />}
      Envoyer le RIB
    </Button>
  );
}