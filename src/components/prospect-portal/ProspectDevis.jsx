import { useState } from 'react';
import { base44 } from '@/api/base44Client';
import { CheckCircle, ThumbsUp } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { useOwnerCompanySettings } from '@/hooks/useOwnerCompanySettings';

export default function ProspectDevis({ prospect }) {
  const [validated, setValidated] = useState(false);
  const [loading, setLoading] = useState(false);
  const { settings } = useOwnerCompanySettings();

  const handleValidate = async () => {
    setLoading(true);
    // Mettre à jour le statut prospect
    await base44.entities.Prospect.update(prospect.id, { statut: 'Signé' });
    // Notifier l'admin
    const nom = `${prospect.prenom} ${prospect.nom}`;
    await base44.functions.invoke('createNotification', {
      titre: `✅ ${nom} a validé son projet !`,
      message: `Le prospect ${nom} a cliqué sur "Valider mon projet" depuis son espace.`,
      type: 'info',
      lien: '/Prospects',
    });
    // Si le prestataire a activé l'acceptation automatique, passer le devis
    // lié le plus récent au statut "Envoyé" vers "Accepté".
    if (settings?.accepter_devis_auto_validation_prospect === true) {
      try {
        const devis = await base44.entities.Devis.filter({ prospect_id: prospect.id }, '-created_date', 50);
        const cible = devis.find(d => d.statut === 'Envoyé');
        if (cible) {
          await base44.entities.Devis.update(cible.id, { statut: 'Accepté' });
        }
      } catch { /* non bloquant */ }
    }
    setValidated(true);
    setLoading(false);
  };

  if (validated) {
    return (
      <div className="pt-4">
        <div className="flex items-center gap-2 text-sm text-emerald-700 bg-emerald-50 rounded-xl px-4 py-3 border border-emerald-200">
          <CheckCircle size={16} /> Votre accord a bien été transmis ! Nous vous recontacterons très bientôt.
        </div>
      </div>
    );
  }

  return (
    <div className="pt-4 space-y-4">
      {prospect.formule_nom && (
        <div className="bg-muted/40 rounded-xl p-3 border border-border text-sm">
          <p className="text-xs text-muted-foreground mb-0.5">Formule proposée</p>
          <p className="font-semibold">{prospect.formule_nom}</p>
        </div>
      )}
      <p className="text-sm text-muted-foreground">
        Si notre offre vous convient et que vous souhaitez confirmer votre projet, cliquez sur le bouton ci-dessous. Notre équipe prendra contact avec vous pour finaliser votre réservation.
      </p>
      <Button
        onClick={handleValidate}
        disabled={loading || prospect.statut === 'Signé'}
        className="w-full gap-2 bg-emerald-600 hover:bg-emerald-700 text-white"
      >
        {loading ? (
          <div className="w-4 h-4 border-2 border-white border-t-transparent rounded-full animate-spin" />
        ) : <ThumbsUp size={15} />}
        {prospect.statut === 'Signé' ? 'Projet validé ✓' : 'Valider mon projet'}
      </Button>
    </div>
  );
}