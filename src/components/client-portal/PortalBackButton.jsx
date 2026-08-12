/**
 * PortalBackButton — Bouton retour en haut à gauche des vues secondaires
 * de l'espace client (Messagerie, Médias, Documents, Alertes).
 *
 * Au tap, demande le retour à l'accueil (onglet premium préservé) via
 * portalNavStore. Style identique à la flèche retour de la fiche VitrineProfil
 * (cercle blanc, ombre, icône ArrowLeft navy).
 */
import { ArrowLeft } from 'lucide-react';
import { requestBackToAccueil } from './portalNavStore';

export default function PortalBackButton() {
  return (
    <button
      onClick={() => requestBackToAccueil()}
      className="w-10 h-10 rounded-full flex items-center justify-center bg-white shadow-lg border mb-3 transition-all active:scale-95"
      style={{ borderColor: '#e8e4dc', color: '#1e1b4b' }}
      aria-label="Retour à l'accueil"
    >
      <ArrowLeft size={20} />
    </button>
  );
}