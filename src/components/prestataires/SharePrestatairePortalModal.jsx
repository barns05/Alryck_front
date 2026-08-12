import { useState, useEffect } from 'react';
import { X, Copy, Check, ExternalLink, Loader2 } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { toast } from 'sonner';
import { base44 } from '@/api/base44Client';
import { useQueryClient } from '@tanstack/react-query';

export default function SharePrestatairePortalModal({ prestataire, onClose }) {
  const [copied, setCopied] = useState(false);
  const [token, setToken] = useState(prestataire?.lien_token || null);
  const [generating, setGenerating] = useState(false);
  const qc = useQueryClient();

  useEffect(() => {
    if (!token) {
      generateToken();
    }
  }, []);

  const generateToken = async () => {
    setGenerating(true);
    const newToken = Math.random().toString(36).substring(2) + Date.now().toString(36);
    await base44.entities.Prestataire.update(prestataire.id, { lien_token: newToken });
    qc.invalidateQueries(['prestataires']);
    setToken(newToken);
    setGenerating(false);
  };

  const portalUrl = token ? `${window.location.origin}/prestataire-portal?token=${token}` : null;

  const handleCopy = () => {
    navigator.clipboard.writeText(portalUrl);
    setCopied(true);
    toast.success('Lien copié !');
    setTimeout(() => setCopied(false), 2000);
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/40 backdrop-blur-sm p-4">
      <div className="bg-card rounded-2xl border border-border shadow-xl w-full max-w-sm p-6 space-y-4">
        <div className="flex items-center justify-between">
          <h3 className="font-semibold text-lg">Partager l'espace prestataire</h3>
          <button onClick={onClose} className="p-1.5 rounded-lg hover:bg-muted text-muted-foreground">
            <X size={16} />
          </button>
        </div>

        <div className="space-y-1">
          <p className="text-xs text-muted-foreground uppercase font-semibold">Prestataire</p>
          <p className="font-medium text-sm">{prestataire.nom}</p>
          {prestataire.email && <p className="text-xs text-muted-foreground">{prestataire.email}</p>}
        </div>

        <p className="text-xs text-muted-foreground bg-muted/50 rounded-xl px-3 py-2">
          🔗 Ce lien donne accès direct à l'espace prestataire sans création de compte. Partagez-le par email ou SMS.
        </p>

        {generating ? (
          <div className="flex items-center justify-center py-4">
            <Loader2 size={20} className="animate-spin text-muted-foreground" />
          </div>
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
              <Button variant="outline" onClick={() => window.open(portalUrl, '_blank')} className="flex-1 gap-2">
                <ExternalLink size={14} />
                Ouvrir
              </Button>
            </div>
          </>
        )}

        <Button variant="outline" onClick={onClose} className="w-full">Fermer</Button>
      </div>
    </div>
  );
}