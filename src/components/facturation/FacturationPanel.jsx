/**
 * FacturationPanel — section "Facturation et docs" de la fiche détaillée événement.
 * Délègue "Devis & Factures" à DocumentsFacturationSection et "Contrats" au
 * composant partagé ContratsSection (module Juridique).
 */
import DocumentsFacturationSection from './DocumentsFacturationSection';
import ContratsSection from '@/components/juridique/ContratsSection';

export default function FacturationPanel({ evenementId, evenement, formulaireReponses, clientNom, clientEmail, clientTelephone }) {
  return (
    <div className="space-y-5">
      <DocumentsFacturationSection
        evenementId={evenementId}
        evenement={evenement}
        formulaireReponses={formulaireReponses}
        clientNom={clientNom}
        clientEmail={clientEmail}
        clientTelephone={clientTelephone}
      />
      <ContratsSection evenementId={evenementId} evenementNom={evenement?.nom} />
    </div>
  );
}