import { useState } from 'react';
import { X, Copy, Check, Mail, Loader2 } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { toast } from 'sonner';
import { base44 } from '@/api/base44Client';

export default function ShareProspectPortalModal({ prospect, onClose }) {
  const [copied, setCopied] = useState(false);
  const [sending, setSending] = useState(false);

  const portalUrl = `${window.location.origin}/prospect-portal?token=${prospect.lien_token}`;

  const handleCopy = async () => {
    try {
      await navigator.clipboard.writeText(portalUrl);
      toast.success('Lien copié !');
    } catch {
      const input = document.createElement('input');
      input.value = portalUrl;
      document.body.appendChild(input);
      input.select();
      document.execCommand('copy');
      document.body.removeChild(input);
      toast.success('Lien copié !');
    }
    setCopied(true);
    setTimeout(() => setCopied(false), 2000);
  };

  const handleSendEmail = async () => {
    if (!prospect.email) {
      toast.error("Aucun email renseigné pour ce prospect.");
      return;
    }
    setSending(true);
    try {
      await base44.functions.invoke('sendProspectWelcomeEmail', {
        to: prospect.email,
        prenom: prospect.prenom,
        url: portalUrl,
        subject: `Votre espace personnel – ${prospect.prenom} ${prospect.nom}`,
        body: `Bonjour ${prospect.prenom},\n\nVoici votre espace personnel dédié à votre projet :\n${portalUrl}\n\nVous y retrouverez toutes les informations, les documents et pouvez nous contacter directement.\n\nCordialement`,
      });
      toast.success(`Lien envoyé à ${prospect.email}`);
    } catch {
      toast.error("Erreur lors de l'envoi de l'email.");
    } finally {
      setSending(false);
    }
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/40 backdrop-blur-sm p-4">
      <div className="bg-card rounded-2xl border border-border shadow-xl w-full max-w-sm p-6 space-y-4">
        <div className="flex items-center justify-between">
          <h3 className="font-semibold text-lg">Partager l'espace prospect</h3>
          <button onClick={onClose} className="p-1.5 rounded-lg hover:bg-muted text-muted-foreground">
            <X size={16} />
          </button>
        </div>

        <div className="space-y-0.5">
          <p className="font-medium text-sm">{prospect.prenom} {prospect.nom}</p>
          {prospect.email && <p className="text-xs text-muted-foreground">{prospect.email}</p>}
        </div>

        <div className="space-y-2">
          <p className="text-xs text-muted-foreground uppercase font-semibold">Lien de partage</p>
          <div className="bg-muted/50 rounded-xl p-3 border border-border">
            <p className="text-xs font-mono break-all text-foreground">{portalUrl}</p>
          </div>
        </div>

        <div className="flex gap-2">
          <Button onClick={handleCopy} className="flex-1 gap-2">
            {copied ? <Check size={14} /> : <Copy size={14} />}
            {copied ? 'Copié !' : 'Copier le lien'}
          </Button>
          <Button
            variant="outline"
            onClick={handleSendEmail}
            disabled={sending || !prospect.email}
            className="flex-1 gap-2"
          >
            {sending ? <Loader2 size={14} className="animate-spin" /> : <Mail size={14} />}
            {sending ? 'Envoi…' : 'Envoyer par email'}
          </Button>
        </div>

        <Button variant="outline" onClick={onClose} className="w-full">
          Fermer
        </Button>
      </div>
    </div>
  );
}