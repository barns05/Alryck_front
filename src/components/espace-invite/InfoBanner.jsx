import { Info } from 'lucide-react';

/**
 * Rappel affiché sous les espaces d'un compte qui en a plusieurs.
 *
 * Le texte renvoyait auparavant à « un sélecteur en haut de l'écran » qui n'existe dans
 * aucun écran. Il désigne désormais la liste « Mes espaces », qui est réellement là.
 */
export default function InfoBanner() {
  return (
    <div
      className="flex items-start gap-3 rounded-2xl p-4"
      style={{ background: '#f8f9fc', border: '1px solid #e5e7eb' }}
    >
      <div className="shrink-0 w-8 h-8 rounded-full flex items-center justify-center" style={{ background: '#f0f0f5' }}>
        <Info size={16} className="text-gray-400" />
      </div>
      <div className="space-y-0.5">
        <p className="text-sm font-semibold text-gray-700">Plusieurs espaces</p>
        <p className="text-xs text-gray-400 leading-relaxed">
          Votre compte est rattaché à plusieurs entreprises. Revenez sur cette page pour
          passer de l'une à l'autre.
        </p>
      </div>
    </div>
  );
}