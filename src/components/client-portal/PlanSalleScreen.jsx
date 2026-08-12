/**
 * PlanSalleScreen — Écran « Plan de salle » (côté client).
 *
 * Centralise le pilotage SPATIAL de la salle :
 *  - choix de la configuration (AutoPlacementModal, avec confirmation + migration
 *    des invités lors d'un remplacement — fix étape 2),
 *  - vue plan (PlanSpatialView réutilisé : positionnement par glisser-déposer),
 *  - vue liste ordonnée (PlanSalleListView : ordre logique d'affichage + occupants).
 *
 * L'édition du CONTENU (renommer une table, assigner/libérer des invités) reste
 * dans « Mon plan de table » (Mon organisation) — séparation validée.
 */
import { useState } from 'react';
import { useQuery } from '@tanstack/react-query';
import { base44 } from '@/api/base44Client';
import { X, Sparkles, Map as MapIcon, List, FileText, Loader2 } from 'lucide-react';
import AutoPlacementModal from '@/components/invites/AutoPlacementModal';
import PlanSpatialView from '@/components/invites/PlanSpatialView';
import PlanSalleListView from './PlanSalleListView';
import TableSeatingPanel from './TableSeatingPanel';
import { exportPlanDeSallePDF } from '@/components/invites/exportPlanDeSallePDF';
import PDFViewer from '@/components/invites/PDFViewer';

export default function PlanSalleScreen({ evenement, espace, onClose }) {
  const [viewMode, setViewMode] = useState('plan');
  const [showAutoPlace, setShowAutoPlace] = useState(false);
  const [selectedTableId, setSelectedTableId] = useState(null);
  const [exporting, setExporting] = useState(false);
  const [pdfViewer, setPdfViewer] = useState(null);

  const { data: tables = [] } = useQuery({
    queryKey: ['tables', evenement.id],
    queryFn: () => base44.entities.TableEvenement.filter({ evenement_id: evenement.id }),
    enabled: !!evenement.id,
    staleTime: 10000,
  });
  const { data: invites = [] } = useQuery({
    queryKey: ['invites', evenement.id],
    queryFn: () => base44.entities.Invite.filter({ evenement_id: evenement.id }),
    enabled: !!evenement.id,
    staleTime: 10000,
  });

  const invitesVisibles = invites.filter(i =>
    !(i.archived && i.prenom === '_groupe_') && i.statut_rsvp !== 'Absent'
  );
  const sortedTables = tables.slice().sort((a, b) => (a.ordre ?? 0) - (b.ordre ?? 0));
  const selectedTable = viewMode === 'plan' ? sortedTables.find((t) => t.id === selectedTableId) || null : null;
  const selectedInvites = selectedTable ? invitesVisibles.filter((i) => i.table_attribuee === selectedTable.id) : [];

  const handleExportSalle = async () => {
    setExporting(true);
    try {
      const result = await exportPlanDeSallePDF({
        espace,
        tables: sortedTables,
        invites: invitesVisibles,
        evenementNom: evenement?.nom,
        evenementDate: evenement?.date,
        coverUrl: evenement?.photo_bandeau_url || null,
      });
      setPdfViewer(result);
    } catch (e) {
      console.error('exportPlanDeSallePDF', e);
    } finally {
      setExporting(false);
    }
  };

  return (
    <div className="fixed inset-0 z-[10001] bg-background flex flex-col">
      {/* Header — 2 rangées : titre+espace / boutons PDF+Configuration */}
      <div className="px-4 py-2.5 border-b shrink-0 space-y-2" style={{ borderColor: '#e8e4dc', background: '#FFFBF0' }}>
        <div className="flex items-center gap-2 min-w-0">
          <button onClick={onClose} className="p-1.5 rounded-lg hover:bg-muted text-muted-foreground shrink-0">
            <X size={20} />
          </button>
          <h2 className="font-bold text-base flex items-center gap-1.5 whitespace-nowrap shrink-0" style={{ color: '#1e1b4b' }}>
            🪑 Plan de salle
          </h2>
          {espace?.nom && (
            <span className="text-xs text-muted-foreground truncate min-w-0">· {espace.nom}</span>
          )}
        </div>
        <div className="flex items-center justify-end gap-2 flex-wrap">
          {viewMode === 'plan' && (
            <button
              onClick={handleExportSalle}
              disabled={exporting}
              className="flex items-center gap-1.5 px-3 py-2 rounded-xl text-xs font-semibold border shrink-0 disabled:opacity-60"
              style={{ borderColor: '#C5A059', color: '#C5A059', background: '#FFFBF0' }}
            >
              {exporting ? <Loader2 size={13} className="animate-spin" /> : <FileText size={13} />}
              {exporting ? '…' : 'PDF'}
            </button>
          )}
          <button
            onClick={() => setShowAutoPlace(true)}
            className="flex items-center gap-1.5 px-3 py-2 rounded-xl text-xs font-semibold text-white shrink-0"
            style={{ background: '#1e1b4b' }}
          >
            <Sparkles size={13} /> Choisir son plan de salle
          </button>
        </div>
      </div>

      {/* Toggle vues */}
      <div className="px-4 pt-3 shrink-0">
        <div className="flex gap-1 bg-muted/40 rounded-xl p-1">
          <button
            onClick={() => setViewMode('plan')}
            className={`flex-1 flex items-center justify-center gap-1.5 px-3 py-2 rounded-lg text-xs font-semibold transition-colors ${viewMode === 'plan' ? 'bg-white text-foreground shadow-sm' : 'text-muted-foreground'}`}
          >
            <MapIcon size={14} /> Vue plan
          </button>
          <button
            onClick={() => setViewMode('liste')}
            className={`flex-1 flex items-center justify-center gap-1.5 px-3 py-2 rounded-lg text-xs font-semibold transition-colors ${viewMode === 'liste' ? 'bg-white text-foreground shadow-sm' : 'text-muted-foreground'}`}
          >
            <List size={14} /> Vue liste
          </button>
        </div>
      </div>

      {/* Contenu */}
      <div className="flex-1 overflow-y-auto px-4 py-3">
        {viewMode === 'plan' ? (
          <PlanSpatialView
            evenement={evenement}
            espace={espace}
            tables={sortedTables}
            invites={invitesVisibles}
            readOnlyPositions
            selectedTableId={selectedTableId}
            onSelectTable={setSelectedTableId}
          />
        ) : (
          <PlanSalleListView
            evenementId={evenement.id}
            tables={sortedTables}
            invites={invitesVisibles}
          />
        )}
      </div>

      {/* Panneau fixe : invités de la table sélectionnée (vue plan, mode lecture seule) */}
      {selectedTable && (
        <TableSeatingPanel
          table={selectedTable}
          invites={selectedInvites}
          allTables={sortedTables}
          allInvites={invitesVisibles}
          evenementId={evenement.id}
          onClose={() => setSelectedTableId(null)}
        />
      )}

      {/* Visualiseur PDF du plan de salle */}
      {pdfViewer && (
        <PDFViewer
          pdfBlob={pdfViewer.blob}
          fileName={pdfViewer.fileName}
          onClose={() => setPdfViewer(null)}
        />
      )}

      {/* Configurateur (AutoPlacementModal avec confirmation + migration des invités) */}
      {showAutoPlace && (
        <AutoPlacementModal
          evenementId={evenement.id}
          evenement={evenement}
          espace={espace}
          existingTables={sortedTables}
          onClose={() => setShowAutoPlace(false)}
        />
      )}
    </div>
  );
}