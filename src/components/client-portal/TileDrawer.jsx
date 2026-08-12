import { createPortal } from 'react-dom';
import { X } from 'lucide-react';
import ProgrammeSection from './ProgrammeSection';
import FormulaireClientSection from './FormulaireClientSection';
import PhotosSection from './PhotosSection';
import ChatSection from './ChatSection';
import DocumentsSection from './DocumentsSection';
import PrestatairesCardsSection from './PrestatairesCardsSection';
import InfosPratiquesContent from './InfosPratiquesContent';

const TITLES = {
  programme: '🗓️ Déroulé de l\'événement',
  formulaire: '📋 Questionnaire partagé',
  medias: '📸 Galerie événement',
  messages: '💬 Messages',
  documents: '📁 Documents partagés',
  prestataires: '🤝 Prestataires confirmés',
  logistique: 'ℹ️ Informations pratiques',
};

export default function TileDrawer({ tileId, evenement, clientId, clientNom, onClose }) {
  if (!tileId) return null;

  return createPortal(
    <div className="fixed inset-0 z-[10000] flex flex-col bg-background">
      {/* Header */}
      <div className="flex items-center gap-3 px-4 py-4 border-b border-border bg-card shrink-0">
        <button
          onClick={onClose}
          className="p-2 rounded-xl hover:bg-muted transition-colors"
        >
          <X size={18} />
        </button>
        <h2 className="font-semibold text-base">{TITLES[tileId]}</h2>
      </div>

      {/* Content */}
      <div className="flex-1 overflow-y-auto">
        <div className="max-w-2xl mx-auto px-4 py-4">
          {tileId === 'programme' && <ProgrammeSection evenement={evenement} clientNom={clientNom} />}
          {tileId === 'formulaire' && <FormulaireClientSection evenement={evenement} />}
          {tileId === 'medias' && <PhotosSection evenement={evenement} clientNom={clientNom} />}
          {tileId === 'messages' && (
            <ChatSection
              clientId={evenement.client_id || `guest-${evenement.id}`}
              evenementId={evenement.id}
              evenementNom={evenement.nom}
              clientNom={clientNom}
              isAdmin={false}
            />
          )}
          {tileId === 'documents' && (
            <DocumentsSection clientId={clientId} evenementId={evenement.id} clientEmail={evenement.client_email} />
          )}
          {tileId === 'prestataires' && <PrestatairesCardsSection evenementId={evenement.id} />}
          {tileId === 'logistique' && <InfosPratiquesContent evenementId={evenement.id} />}
        </div>
      </div>
    </div>,
    document.body
  );
}