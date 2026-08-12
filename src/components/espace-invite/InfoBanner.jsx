import { Info } from 'lucide-react';

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
        <p className="text-sm font-semibold text-gray-700">Plusieurs rôles activés</p>
        <p className="text-xs text-gray-400 leading-relaxed">
          Changez d'espace à tout moment grâce au sélecteur en haut de l'écran.
        </p>
      </div>
    </div>
  );
}