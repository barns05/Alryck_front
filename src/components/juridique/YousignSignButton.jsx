/**
 * YousignSignButton — Bouton "Demander signature électronique" côté prestataire.
 *
 * Appelle la fonction backend createSignatureRequest qui interagit avec l'API
 * Youtrust v3. Si la clé API n'est pas configurée, affiche un message clair
 * et grise le bouton (détecté après le premier clic via not_configured: true).
 *
 * Props :
 *   - contratId (string, requis) : ID du contrat à faire signer
 *   - compact (boolean) : rendu en icône seule pour les listes denses
 *   - onSuccess (function) : callback appelé après succès (ex: invalidate queries)
 */
import { useState } from 'react';
import { base44 } from '@/api/base44Client';
import { PenTool, Loader2 } from 'lucide-react';
import { toast } from 'sonner';

export default function YousignSignButton({ contratId, preReservationId, compact = false, label, onSuccess }) {
  const [loading, setLoading] = useState(false);
  const [notConfigured, setNotConfigured] = useState(false);

  const handleClick = async () => {
    if (loading || notConfigured) return;
    setLoading(true);
    try {
      const payload = preReservationId
        ? { pre_reservation_id: preReservationId }
        : { contrat_id: contratId };
      const res = await base44.functions.invoke('createSignatureRequest', payload);

      if (res.data?.not_configured) {
        setNotConfigured(true);
        toast.info(res.data.error || 'Signature électronique non configurée — clé API manquante.');
        return;
      }
      if (res.data?.error) {
        toast.error(res.data.error);
        return;
      }

      toast.success('Demande de signature électronique envoyée.');
      onSuccess?.(res.data);
    } catch (e) {
      toast.error('Erreur lors de la création de la demande de signature.');
    } finally {
      setLoading(false);
    }
  };

  const isDisabled = notConfigured || loading;

  if (compact) {
    return (
      <button
        onClick={handleClick}
        disabled={isDisabled}
        title={notConfigured ? 'Signature électronique non configurée (clé API manquante)' : 'Demander une signature électronique'}
        className={`p-1.5 rounded-lg transition-colors shrink-0 ${
          isDisabled
            ? 'text-muted-foreground/30 cursor-not-allowed'
            : 'hover:bg-muted text-muted-foreground hover:text-violet-600'
        }`}
      >
        {loading ? <Loader2 size={14} className="animate-spin" /> : <PenTool size={14} />}
      </button>
    );
  }

  return (
    <button
      onClick={handleClick}
      disabled={isDisabled}
      title={notConfigured ? 'Signature électronique non configurée (clé API manquante)' : 'Demander une signature électronique'}
      className={`flex items-center gap-1.5 text-xs font-medium px-2.5 py-1.5 rounded-lg transition-colors shrink-0 ${
        isDisabled
          ? 'bg-muted text-muted-foreground/50 cursor-not-allowed'
          : 'bg-violet-50 text-violet-700 hover:bg-violet-100 border border-violet-200'
      }`}
    >
      {loading ? <Loader2 size={12} className="animate-spin" /> : <PenTool size={12} />}
      {notConfigured ? 'E-sign non configurée' : loading ? 'Envoi…' : (label || 'Demander signature e-signature')}
    </button>
  );
}