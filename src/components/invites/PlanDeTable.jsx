/**
 * PlanDeTable — Module complet de gestion du plan de table
 * Props: evenementId, evenementNom, evenement
 */
import { useState } from 'react';
import { useQuery, useQueryClient } from '@tanstack/react-query';
import { base44 } from '@/api/base44Client';
import { Plus, FileText, Loader2, Eye, LayoutList, Armchair } from 'lucide-react';
import { usePlanSalleConfig } from '@/components/client-portal/usePlanSalleConfig';
import { tableDisplayName } from '@/lib/tableName';
import { AnimatePresence, motion } from 'framer-motion';
import PDFViewer from './PDFViewer';
import TableEditModal from './TableEditModal';
import TableViewModal from './TableViewModal';
import TablesOverviewModal from './TablesOverviewModal';
import { exportPlanDeTablePDF } from './exportPlanDeTablePDF';

// ── Avatar générique avec initiales ──────────────────────────────────────────
const AVATAR_COLORS = [
  '#1e1b4b', '#7c3aed', '#1d4ed8', '#0f766e', '#15803d',
  '#c2410c', '#b91c1c', '#be185d', '#6d28d9', '#0369a1',
];

function getAvatarColor(name) {
  const idx = (name || '').charCodeAt(0) % AVATAR_COLORS.length;
  return AVATAR_COLORS[idx];
}

function Avatar({ prenom, nom, size = 28 }) {
  const initiales = `${(prenom || '?')[0]}${(nom || '')[0] || ''}`.toUpperCase();
  const color = getAvatarColor(prenom);
  return (
    <div
      style={{
        width: size, height: size, borderRadius: '50%',
        background: color, color: 'white',
        display: 'flex', alignItems: 'center', justifyContent: 'center',
        fontSize: size * 0.36, fontWeight: 700, flexShrink: 0,
      }}
    >
      {initiales}
    </div>
  );
}

// ── Carte d'une table ─────────────────────────────────────────────────────────
function TableCard({ table, invites, onEdit, onView }) {
  const capacite = table.capacite || null;
  const nbInvites = invites.length;
  const isFull = capacite && nbInvites >= capacite;
  const isEmpty = nbInvites === 0;
  const isOver = capacite && nbInvites > capacite;

  let borderColor = '#e8e4dc';
  if (isOver) borderColor = '#fca5a5';
  else if (isFull) borderColor = '#86efac';
  else if (!isEmpty) borderColor = '#fed7aa';

  const apercu = invites.slice(0, 4).map(i => `${i.prenom} ${i.nom}`).join(', ');
  const apercuTronque = apercu.length > 45 ? apercu.slice(0, 42) + '…' : apercu;
  const reste = invites.length - 4;

  return (
    <motion.div
      initial={{ opacity: 0, y: 8 }}
      animate={{ opacity: 1, y: 0 }}
      className="rounded-2xl border-2 p-4 bg-white space-y-3"
      style={{ borderColor }}
    >
      <div className="flex items-center gap-3">
        <div className="w-10 h-10 rounded-xl flex items-center justify-center shrink-0"
          style={{ background: '#fff7ed' }}>
          <span className="text-xl">🪑</span>
        </div>
        <div className="flex-1 min-w-0">
          <p className="font-bold text-sm truncate" style={{ color: '#1e1b4b' }}>{tableDisplayName(table)}</p>
          <p className="text-xs" style={{ color: isOver ? '#dc2626' : isFull ? '#16a34a' : '#c2410c' }}>
            {nbInvites}{capacite ? ` / ${capacite} places` : ` invité${nbInvites > 1 ? 's' : ''}`}
            {isOver && ' ⚠️ Surcharge'}
            {isFull && !isOver && ' ✓ Complet'}
          </p>
        </div>
        <div className="flex items-center gap-1.5 shrink-0">
          <button
            onClick={() => onView(table)}
            className="w-8 h-8 flex items-center justify-center rounded-xl border-2 transition-colors hover:bg-indigo-50"
            title="Voir les détails"
            style={{ borderColor: '#c7d2fe', color: '#4338ca' }}>
            <Eye size={14} />
          </button>
          <button
            onClick={() => onEdit(table)}
            className="px-3 py-1.5 rounded-xl text-xs font-semibold border-2 transition-colors hover:bg-orange-50"
            style={{ borderColor: '#fed7aa', color: '#c2410c' }}>
            Modifier
          </button>
        </div>
      </div>

      {isEmpty ? (
        <p className="text-xs text-gray-300 italic pl-1">Aucun invité assigné</p>
      ) : (
        <div className="flex items-center gap-2">
          <div className="flex -space-x-1">
            {invites.slice(0, 5).map((inv, i) => (
              <div key={inv.id} style={{ zIndex: 5 - i }}>
                <Avatar prenom={inv.prenom} nom={inv.nom} size={24} />
              </div>
            ))}
            {reste > 0 && (
              <div className="w-6 h-6 rounded-full bg-gray-200 flex items-center justify-center text-[9px] font-bold text-gray-500"
                style={{ zIndex: 0 }}>
                +{reste}
              </div>
            )}
          </div>
          <p className="text-[11px] text-gray-400 truncate flex-1">{apercuTronque}</p>
        </div>
      )}
    </motion.div>
  );
}

// ── Carte invités sans table ──────────────────────────────────────────────────
function SansTableCard({ invites, onAssigner }) {
  if (invites.length === 0) return null;
  return (
    <motion.div
      initial={{ opacity: 0, y: 8 }}
      animate={{ opacity: 1, y: 0 }}
      className="rounded-2xl border-2 p-4 bg-white space-y-3"
      style={{ borderColor: '#fed7aa', background: '#fff7ed' }}>
      <div className="flex items-center gap-3">
        <div className="w-10 h-10 rounded-xl bg-orange-100 flex items-center justify-center shrink-0">
          <span className="text-xl">👤</span>
        </div>
        <div className="flex-1">
          <p className="font-bold text-sm" style={{ color: '#1e1b4b' }}>Invités sans table</p>
          <span className="inline-block text-[10px] font-bold px-2 py-0.5 rounded-full mt-0.5"
            style={{ background: '#fed7aa', color: '#c2410c' }}>
            {invites.length} personne{invites.length > 1 ? 's' : ''}
          </span>
        </div>
        <button
          onClick={onAssigner}
          className="px-3 py-1.5 rounded-xl text-xs font-semibold text-white shrink-0"
          style={{ background: '#c2410c' }}>
          Assigner
        </button>
      </div>
      <div className="flex items-center gap-1.5 flex-wrap">
        {invites.slice(0, 5).map((inv, i) => (
          <div key={inv.id} title={`${inv.prenom} ${inv.nom}`}>
            <Avatar prenom={inv.prenom} nom={inv.nom} size={28} />
          </div>
        ))}
        {invites.length > 5 && (
          <div className="w-7 h-7 rounded-full bg-orange-200 flex items-center justify-center text-[10px] font-bold text-orange-700">
            +{invites.length - 5}
          </div>
        )}
      </div>
    </motion.div>
  );
}

// ── Composant principal ───────────────────────────────────────────────────────
export default function PlanDeTable({ evenementId, evenementNom, evenement, onOpenPlanSalle }) {
  const qc = useQueryClient();
  const [editingTable, setEditingTable] = useState(null); // null | table object | 'sans_table'
  const [viewingTable, setViewingTable] = useState(null); // table object | null
  const [showOverview, setShowOverview] = useState(false);
  const [generatingPDF, setGeneratingPDF] = useState(false);
  const [pdfViewer, setPdfViewer] = useState(null); // { blob, fileName }

  const { data: tables = [], isLoading: loadingTables } = useQuery({
    queryKey: ['tables', evenementId],
    queryFn: () => base44.entities.TableEvenement.filter({ evenement_id: evenementId }, 'ordre', 50),
    enabled: !!evenementId,
    staleTime: 10000,
  });

  const { data: invites = [], isLoading: loadingInvites } = useQuery({
    queryKey: ['invites', evenementId],
    queryFn: () => base44.entities.Invite.filter({ evenement_id: evenementId }),
    enabled: !!evenementId,
    staleTime: 10000,
  });

  // Plan de salle du lieu : espace actif + configurations validées (résolution partagée).
  const { espaceActif, disponible } = usePlanSalleConfig(evenement);

  const invitesVisibles = invites.filter(i =>
    !(i.archived && i.prenom === '_groupe_') && i.statut_rsvp !== 'Absent'
  );
  const sortedTables = tables.slice().sort((a, b) => (a.ordre ?? 0) - (b.ordre ?? 0));

  // Associer les invités à leurs tables
  const invitesParTable = (tableId) => {
    const t = tables.find(t => t.id === tableId);
    if (!t) return [];
    return invitesVisibles.filter(i => i.table_attribuee === t.id);
  };

  const invitesSansTable = invitesVisibles.filter(i => !i.table_attribuee || i.table_attribuee === '');
  const invitesPlaces = invitesVisibles.filter(i => !!i.table_attribuee && i.table_attribuee !== '');

  const handleAddTable = async () => {
    const nextNum = sortedTables.length + 1;
    const newTable = await base44.entities.TableEvenement.create({
      evenement_id: evenementId,
      nom: `Table ${nextNum}`,
      ordre: nextNum - 1,
    });
    qc.invalidateQueries(['tables', evenementId]);
    setEditingTable(newTable);
  };

  const handleExportPDF = async () => {
    setGeneratingPDF(true);
    try {
      const result = await exportPlanDeTablePDF({
        tables: sortedTables,
        invites: invitesVisibles,
        evenementNom: evenementNom || evenement?.nom,
        evenementDate: evenement?.date,
        coverUrl: evenement?.photo_bandeau_url || null,
        couleurTheme: evenement?.couleur_theme || null,
      });
      setPdfViewer(result);
    } finally {
      setGeneratingPDF(false);
    }
  };

  const isLoading = loadingTables || loadingInvites;

  return (
    <div className="space-y-4">
      {/* Header */}
      <div className="flex items-center justify-between gap-2">
        <button
          onClick={() => setShowOverview(true)}
          className="flex items-center gap-1.5 px-3 py-2 rounded-xl text-xs font-semibold border-2 transition-colors hover:bg-indigo-50"
          style={{ borderColor: '#c7d2fe', color: '#4338ca' }}>
          <LayoutList size={13} /> Voir toutes
        </button>
        <button
          onClick={handleAddTable}
          className="flex items-center gap-1.5 px-3 py-2 rounded-xl text-xs font-bold text-white"
          style={{ background: '#c2410c' }}>
          <Plus size={13} /> Table
        </button>
      </div>

      {/* Badge « Plan de salle disponible » — si le lieu a un espace + configs validées */}
      {disponible && onOpenPlanSalle && (
        <button
          onClick={() => onOpenPlanSalle(espaceActif)}
          className="w-full flex items-center gap-2.5 p-3 rounded-2xl border transition-colors"
          style={{ borderColor: '#C5A059', background: '#FFFBF0' }}
        >
          <span className="w-9 h-9 rounded-xl flex items-center justify-center shrink-0" style={{ background: 'rgba(197,160,89,0.18)' }}>
            <Armchair size={18} style={{ color: '#C5A059' }} />
          </span>
          <div className="text-left flex-1">
            <p className="text-sm font-semibold" style={{ color: '#1e1b4b' }}>Plan de salle disponible</p>
            <p className="text-[11px]" style={{ color: '#9ca3af' }}>Choisissez une configuration proposée par le lieu</p>
          </div>
          <span className="text-xs font-semibold px-2.5 py-1 rounded-full" style={{ background: '#C5A059', color: '#fff' }}>
            Ouvrir
          </span>
        </button>
      )}

      {/* Compteurs */}
      <div className="grid grid-cols-3 gap-2">
        <div className="rounded-xl p-3 text-center border" style={{ background: '#f0fdf4', borderColor: '#bbf7d0' }}>
          <p className="text-xl font-bold" style={{ color: '#16a34a' }}>{invitesPlaces.length}</p>
          <p className="text-[10px] font-medium" style={{ color: '#16a34a' }}>Placés</p>
        </div>
        <div className="rounded-xl p-3 text-center border" style={{ background: '#fff7ed', borderColor: '#fed7aa' }}>
          <p className="text-xl font-bold" style={{ color: '#c2410c' }}>{invitesSansTable.length}</p>
          <p className="text-[10px] font-medium" style={{ color: '#c2410c' }}>Sans table</p>
        </div>
        <div className="rounded-xl p-3 text-center border" style={{ background: '#eef2ff', borderColor: '#c7d2fe' }}>
          <p className="text-xl font-bold" style={{ color: '#1e1b4b' }}>{sortedTables.length}</p>
          <p className="text-[10px] font-medium" style={{ color: '#4338ca' }}>Tables</p>
        </div>
      </div>

      {isLoading ? (
        <div className="flex items-center justify-center py-10">
          <div className="w-6 h-6 border-2 border-orange-200 border-t-orange-500 rounded-full animate-spin" />
        </div>
      ) : (
        <>
          {/* Tables */}
          <AnimatePresence>
            {sortedTables.map(table => (
              <TableCard
                key={table.id}
                table={table}
                invites={invitesParTable(table.id)}
                onEdit={() => setEditingTable(table)}
                onView={() => setViewingTable(table)}
              />
            ))}
          </AnimatePresence>

          {sortedTables.length === 0 && invitesVisibles.length === 0 && (
            <div className="text-center py-10 space-y-2">
              <span className="text-5xl">🪑</span>
              <p className="text-sm font-semibold" style={{ color: '#1e1b4b' }}>Aucune table créée</p>
              <p className="text-xs text-gray-400">Commencez par ajouter vos invités puis créez des tables</p>
            </div>
          )}

          {sortedTables.length === 0 && invitesVisibles.length > 0 && (
            <div className="text-center py-8 space-y-3">
              <span className="text-4xl">🪑</span>
              <p className="text-sm font-semibold" style={{ color: '#1e1b4b' }}>Créez votre première table</p>
              <p className="text-xs text-gray-400">{invitesVisibles.length} invité{invitesVisibles.length > 1 ? 's' : ''} en attente de placement</p>
              <button
                onClick={handleAddTable}
                className="mx-auto flex items-center gap-2 px-5 py-2.5 rounded-xl text-sm font-bold text-white"
                style={{ background: '#c2410c' }}>
                <Plus size={14} /> Ajouter une table
              </button>
            </div>
          )}

          {/* Invités sans table */}
          <SansTableCard
            invites={invitesSansTable}
            onAssigner={() => setEditingTable('sans_table')}
          />
        </>
      )}

      {/* Export PDF */}
      {(sortedTables.length > 0 || invitesVisibles.length > 0) && (
        <button
          onClick={handleExportPDF}
          disabled={generatingPDF}
          className="w-full flex items-center justify-center gap-2 py-3 rounded-2xl text-sm font-semibold border-2 transition-colors hover:bg-orange-50 disabled:opacity-60"
          style={{ borderColor: '#fed7aa', color: '#c2410c' }}>
          {generatingPDF
            ? <><Loader2 size={14} className="animate-spin" /> Génération…</>
            : <><FileText size={14} /> Exporter le plan de table PDF</>}
        </button>
      )}

      {/* Modal d'édition */}
      <AnimatePresence>
        {editingTable && (
          <TableEditModal
            table={editingTable === 'sans_table' ? null : editingTable}
            evenementId={evenementId}
            allTables={sortedTables}
            invites={invitesVisibles}
            onClose={() => setEditingTable(null)}
            onSaved={() => {
              qc.invalidateQueries(['tables', evenementId]);
              qc.invalidateQueries(['invites', evenementId]);
              setEditingTable(null);
            }}
          />
        )}
      </AnimatePresence>

      {/* Modal vue détail table */}
      <AnimatePresence>
        {viewingTable && (
          <TableViewModal
            table={viewingTable}
            invites={invitesVisibles}
            onClose={() => setViewingTable(null)}
          />
        )}
      </AnimatePresence>

      {/* Modal vue d'ensemble */}
      <AnimatePresence>
        {showOverview && (
          <TablesOverviewModal
            tables={sortedTables}
            invites={invitesVisibles}
            onClose={() => setShowOverview(false)}
          />
        )}
      </AnimatePresence>

      {/* Visualiseur PDF — mêmes boutons Fermer / Télécharger / Partager que la liste d'invités */}
      <AnimatePresence>
        {pdfViewer && (
          <PDFViewer
            pdfBlob={pdfViewer.blob}
            fileName={pdfViewer.fileName}
            onClose={() => setPdfViewer(null)}
          />
        )}
      </AnimatePresence>

    </div>
  );
}