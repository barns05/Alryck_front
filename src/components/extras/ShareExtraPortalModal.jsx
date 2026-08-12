import { useState, useEffect } from 'react';
import { base44 } from '@/api/base44Client';
import { useQueryClient } from '@tanstack/react-query';
import { Copy, Check, ExternalLink, X, Loader2 } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { toast } from 'sonner';

export default function ShareExtraPortalModal({ extra, onClose }) {
  const qc = useQueryClient();
  const [token, setToken] = useState(extra?.lien_extra_token || null);
  const [generating, setGenerating] = useState(false);
  const [copied, setCopied] = useState(false);

  // Auto-génère le token si l'extra n'en a pas encore
  useEffect(() => {
    if (!token) {
      generateToken();
    }
  }, []);

  const url = token ? `${window.location.origin}/extra-portal?token=${token}` : null;

  const generateToken = async () => {
    setGenerating(true);
    const newToken = Math.random().toString(36).substring(2) + Date.now().toString(36);
    await base44.entities.Extra.update(extra.id, { lien_extra_token: newToken });
    qc.invalidateQueries(['extras']);
    setToken(newToken);
    setGenerating(false);
  };

  const handleCopy = () => {
    navigator.clipboard.writeText(url);
    setCopied(true);
    toast.success('Lien copié !');
    setTimeout(() => setCopied(false), 2000);
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/40 backdrop-blur-sm p-4">
      <div className="bg-card rounded-2xl border border-border shadow-xl w-full max-w-sm p-6 space-y-4">
        <div className="flex items-center justify-between">
          <h3 className="font-semibold text-lg">Espace planning</h3>
          <button onClick={onClose} className="p-1.5 rounded-lg hover:bg-muted text-muted-foreground"><X size={16} /></button>
        </div>

        <div>
          <p className="text-xs text-muted-foreground uppercase font-semibold mb-1">Extra</p>
          <p className="font-medium text-sm">{extra.nom}</p>
        </div>

        {!url ? (
          <div className="flex items-center justify-center py-4">
            <Loader2 size={20} className="animate-spin text-muted-foreground" />
          </div>
        ) : (
          <>
            <div className="space-y-2">
              <p className="text-xs text-muted-foreground uppercase font-semibold">Lien de partage</p>
              <div className="bg-muted/50 rounded-xl p-3 border border-border">
                <p className="text-xs font-mono break-all text-foreground">{url}</p>
              </div>
            </div>

            <div className="flex gap-2">
              <Button onClick={handleCopy} className="flex-1 gap-2">
                {copied ? <Check size={14} /> : <Copy size={14} />}
                {copied ? 'Copié !' : 'Copier'}
              </Button>
              <Button variant="outline" onClick={() => window.open(url, '_blank')} className="flex-1 gap-2">
                <ExternalLink size={14} /> Ouvrir
              </Button>
            </div>
          </>
        )}

        <Button variant="outline" onClick={onClose} className="w-full">Fermer</Button>
      </div>
    </div>
  );
}