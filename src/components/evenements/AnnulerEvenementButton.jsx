import { useState } from 'react';
import { useQueryClient } from '@tanstack/react-query';
import { base44 } from '@/api/base44Client';
import { toast } from 'sonner';
import { Ban } from 'lucide-react';
import { Button } from '@/components/ui/button';

/**
 * AnnulerEvenementButton — bouton d'annulation DIRECTE côté admin.
 * Appelle annulerEvenement (passe l'Evenement et tous les EvenementPrestataire
 * Confirmé en Annulé, notifie les prestataires).
 *
 * N'apparaît que si l'événement n'est pas déjà Annulé.
 */
export default function AnnulerEvenementButton({ evenement }) {
  const qc = useQueryClient();
  const [loading, setLoading] = useState(false);

  if (!evenement || evenement.statut === 'Annulé') return null;

  const handleAnnuler = async () => {
    if (!confirm(
      `Annuler l'événement « ${evenement.nom || ''} » ?\n\n` +
      `Tous les prestataires confirmés seront notifiés et leur statut passera à Annulé. ` +
      `La donnée est conservée (pas de suppression). Cette action est irréversible.`
    )) return;
    setLoading(true);
    try {
      await base44.functions.invoke('annulerEvenement', { evenement_id: evenement.id });
      toast.success('✓ Événement annulé. Les prestataires confirmés ont été notifiés.');
      qc.invalidateQueries(['evenements']);
      qc.invalidateQueries(['evenement-prestataires', evenement.id]);
      qc.invalidateQueries(['evenement-prestataires-all']);
      qc.invalidateQueries(['demande-annulation-active', evenement.id]);
    } catch {
      toast.error('❌ Erreur lors de l\'annulation');
    }
    setLoading(false);
  };

  return (
    <Button
      size="sm"
      variant="outline"
      onClick={handleAnnuler}
      disabled={loading}
      className="gap-1.5 h-8 text-xs border-red-200 text-red-600 hover:bg-red-50"
    >
      {loading
        ? <div className="w-3.5 h-3.5 border-2 border-red-400 border-t-transparent rounded-full animate-spin" />
        : <Ban size={13} />}
      Annuler l'événement
    </Button>
  );
}