/**
 * SuperPDPTransmitButton — Bouton "Transmettre électroniquement" pour une facture
 * finalisée. Appelle la fonction backend transmitInvoiceSuperPDP qui interagit
 * avec l'API SuperPDP (PDP facturation électronique 2026).
 *
 * Si les identifiants SuperPDP ne sont pas configurés, affiche un message clair
 * et grise le bouton (détecté après le premier clic via not_configured: true).
 *
 * Props :
 *   - devisId (string, requis) : ID de la facture à transmettre
 *   - disabled (boolean) : true si la facture n'est pas éligible (pro forma, déjà transmise…)
 *   - compact (boolean) : rendu en icône seule pour les listes denses
 *   - onSuccess (function) : callback après succès (ex: invalidate queries)
 */
import { useState } from 'react';
import { base44 } from '@/api/base44Client';
import { Send, Loader2 } from 'lucide-react';
import { toast } from 'sonner';

export default function SuperPDPTransmitButton({ devisId, disabled = false, compact = false, label, onSuccess }) {
  const [loading, setLoading] = useState(false);
  const [notConfigured, setNotConfigured] = useState(false);

  const handleClick = async () => {
    if (loading || notConfigured || disabled) return;
    setLoading(true);
    try {
      const res = await base44.functions.invoke('transmitInvoiceSuperPDP', { devis_id: devisId });

      if (res.data?.not_configured) {
        setNotConfigured(true);
        toast.info(res.data.error || 'Facturation électronique non configurée — identifiants SuperPDP manquants.');
        return;
      }
      if (res.data?.error) {
        toast.error(res.data.error);
        return;
      }

      toast.success('Facture transmise électroniquement au PDP SuperPDP.');
      onSuccess?.(res.data);
    } catch (e) {
      toast.error('Erreur lors de la transmission électronique.');
    } finally {
      setLoading(false);
    }
  };

  const isDisabled = notConfigured || loading || disabled;

  if (compact) {
    return (
      <button
        onClick={handleClick}
        disabled={isDisabled}
        title={notConfigured ? 'Facturation électronique non configurée (identifiants SuperPDP manquants)' : 'Transmettre électroniquement au PDP'}
        className={`p-1.5 rounded-lg transition-colors shrink-0 ${
          isDisabled
            ? 'text-muted-foreground/30 cursor-not-allowed'
            : 'hover:bg-muted text-muted-foreground hover:text-violet-600'
        }`}
      >
        {loading ? <Loader2 size={14} className="animate-spin" /> : <Send size={14} />}
      </button>
    );
  }

  return (
    <button
      onClick={handleClick}
      disabled={isDisabled}
      title={notConfigured ? 'Facturation électronique non configurée (identifiants SuperPDP manquants)' : 'Transmettre électroniquement au PDP'}
      className={`flex items-center gap-1.5 text-xs font-medium px-2.5 py-1.5 rounded-lg transition-colors shrink-0 ${
        isDisabled
          ? 'bg-muted text-muted-foreground/50 cursor-not-allowed'
          : 'bg-violet-50 text-violet-700 hover:bg-violet-100 border border-violet-200'
      }`}
    >
      {loading ? <Loader2 size={12} className="animate-spin" /> : <Send size={12} />}
      {notConfigured ? 'PDP non configuré' : loading ? 'Transmission…' : (label || 'Transmettre électroniquement')}
    </button>
  );
}