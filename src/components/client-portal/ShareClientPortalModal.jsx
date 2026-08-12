import { useState, useEffect, useRef } from 'react';
import { X, Copy, Check, ExternalLink, Loader2 } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { toast } from 'sonner';
import { base44 } from '@/api/base44Client';
import { useQueryClient } from '@tanstack/react-query';

// Ce modal génère un token sur le CLIENT (pas l'événement)
// ainsi tous les événements du client sont accessibles via un seul lien
export default function ShareClientPortalModal({ evenement, onClose }) {
  const [copied, setCopied] = useState(false);
  const [token, setToken] = useState(null);
  const [generating, setGenerating] = useState(true);
  const qc = useQueryClient();
  const initialized = useRef(false);

  useEffect(() => {
    if (initialized.current) return;
    initialized.current = true;
    initToken();
  }, []);

  const initToken = async () => {
    setGenerating(true);
    if (!evenement?.client_id) {
      setGenerating(false);
      return;
    }
    // Si l'événement a déjà un token, l'utiliser directement sans appel API
    if (evenement.lien_client_token) {
      setToken(evenement.lien_client_token);
      setGenerating(false);
      return;
    }
    const clients = await base44.entities.Client.filter({ id: evenement.client_id });
    if (clients.length > 0 && clients[0].lien_client_token) {
      setToken(clients[0].lien_client_token);
    } else {
      const newToken = Math.random().toString(36).substring(2) + Date.now().toString(36);
      if (clients.length > 0) {
        await base44.entities.Client.update(evenement.client_id, { lien_client_token: newToken });
      }
      qc.invalidateQueries(['clients']);
      setToken(newToken);
    }
    setGenerating(false);
  };

  const regenerateToken = async () => {
    if (!evenement?.client_id) return;
    setGenerating(true);
    const newToken = Math.random().toString(36).substring(2) + Date.now().toString(36);
    await base44.entities.Client.update(evenement.client_id, { lien_client_token: newToken });
    qc.invalidateQueries(['clients']);
    setToken(newToken);
    setGenerating(false);
  };

  const portalUrl = token ? `${window.location.origin}/client-portal?token=${token}` : null;

  const handleCopy = () => {
    navigator.clipboard.writeText(portalUrl);
    setCopied(true);
    toast.success('Lien copié !');
    setTimeout(() => setCopied(false), 2000);
  };

  const handleOpenPortal = () => {
    window.open(portalUrl, '_blank');
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/40 backdrop-blur-sm p-4">
      <div className="bg-card rounded-2xl border border-border shadow-xl w-full max-w-sm p-6 space-y-4">
        <div className="flex items-center justify-between">
          <h3 className="font-semibold text-lg">Partager l'espace client</h3>
          <button onClick={onClose} className="p-1.5 rounded-lg hover:bg-muted text-muted-foreground">
            <X size={16} />
          </button>
        </div>

        <div className="space-y-1">
          <p className="text-xs text-muted-foreground uppercase font-semibold">Client</p>
          <p className="font-medium text-sm">{evenement.client_nom || 'Client'}</p>
          <p className="text-xs text-muted-foreground">Ce lien donne accès à tous les événements de ce client.</p>
        </div>

        {generating ? (
          <div className="flex items-center justify-center py-4">
            <Loader2 size={20} className="animate-spin text-muted-foreground" />
          </div>
        ) : !evenement?.client_id ? (
          <p className="text-sm text-destructive text-center py-4">Aucun client associé à cet événement.</p>
        ) : (
          <>
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
              <Button variant="outline" onClick={handleOpenPortal} className="flex-1 gap-2">
                <ExternalLink size={14} />
                Ouvrir
              </Button>
            </div>
          </>
        )}

        <Button variant="outline" onClick={onClose} className="w-full">
          Fermer
        </Button>
      </div>
    </div>
  );
}