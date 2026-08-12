import { X, ExternalLink, AlertCircle } from 'lucide-react';
import { Button } from '@/components/ui/button';

export default function PartenairJuridModal({ onClose }) {
  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/40 backdrop-blur-sm p-4">
      <div className="bg-card rounded-2xl border border-border shadow-xl w-full max-w-lg p-6 space-y-6">
        <div className="flex items-center justify-between">
          <h3 className="font-semibold text-lg">Partenaire juridique</h3>
          <button onClick={onClose} className="p-1.5 rounded-lg hover:bg-muted text-muted-foreground">
            <X size={16} />
          </button>
        </div>

        {/* Explication du service */}
        <div className="space-y-4">
          <div className="space-y-2">
            <h4 className="font-semibold text-sm">Services partenaires</h4>
            <p className="text-sm text-muted-foreground">
              Nos partenaires juridiques spécialisés vous proposent une assistance professionnelle pour :
            </p>
            <ul className="text-sm text-muted-foreground space-y-2 ml-4 list-disc">
              <li>Rédaction et personnalisation de contrats</li>
              <li>Vérification légale de vos conditions générales</li>
              <li>Conseils en droit des événements</li>
              <li>Support en cas de litige</li>
            </ul>
          </div>

          <div className="bg-blue-50 border border-blue-200 rounded-xl p-4 space-y-2">
            <p className="text-sm font-medium text-blue-900">Vous avez besoin d'un accompagnement professionnel ?</p>
            <p className="text-xs text-blue-800">Cliquez sur le bouton ci-dessous pour découvrir nos partenaires et les contacter directement.</p>
          </div>
        </div>

        {/* Avertissement responsabilité */}
        <div className="bg-amber-50 border border-amber-200 rounded-xl p-4 flex gap-3">
          <AlertCircle size={16} className="text-amber-700 shrink-0 mt-0.5" />
          <p className="text-xs text-amber-800">
            <span className="font-semibold">Avis de non-responsabilité :</span> Alryck n'est pas responsable des services fournis par ses partenaires. Nous vous recommandons de vérifier les références et les tarifs avant de vous engager.
          </p>
        </div>

        <div className="flex justify-end gap-2 pt-2">
          <Button variant="outline" onClick={onClose}>Fermer</Button>
          <Button className="gap-2" disabled title="Bientôt disponible">
            Consulter nos partenaires
            <ExternalLink size={16} />
          </Button>
        </div>
      </div>
    </div>
  );
}