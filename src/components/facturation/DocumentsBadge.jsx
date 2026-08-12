/**
 * DocumentsBadge — badge sur la carte événement listant tous les documents liés :
 * Devis (+ factures, avoirs…), Contrats, ClientDocuments.
 * Au clic → Popover shadcn/ui avec liste détaillée.
 */
import { useState } from 'react';
import { useQuery, useQueryClient } from '@tanstack/react-query';
import { base44 } from '@/api/base44Client';
import { Popover, PopoverContent, PopoverTrigger } from '@/components/ui/popover';
import { FileText, FileCheck, FileX, FileClock, FileBadge, ExternalLink, Plus } from 'lucide-react';
import DevisModal from './DevisModal';
import ContractModal from '@/components/juridique/ContractModal';

// ─── Couleurs par statut ──────────────────────────────────────────────────────
const STATUT_COLORS = {
  // Devis statuts
  'Brouillon':   'bg-slate-100 text-slate-500 border-slate-200',
  'Envoyé':      'bg-blue-100 text-blue-700 border-blue-200',
  'Accepté':     'bg-emerald-100 text-emerald-700 border-emerald-200',
  'Refusé':      'bg-red-100 text-red-600 border-red-200',
  'Annulé':      'bg-red-100 text-red-500 border-red-200',
  // Contrat statuts
  'En attente de signature': 'bg-amber-100 text-amber-700 border-amber-200',
  'Signé':       'bg-emerald-100 text-emerald-700 border-emerald-200',
  'Archivé':     'bg-slate-100 text-slate-500 border-slate-200',
};

// ─── Icône selon type de document ────────────────────────────────────────────
function DocIcon({ type }) {
  if (!type) return <FileText size={13} className="text-muted-foreground shrink-0" />;
  if (type === 'Avoir')   return <FileX size={13} className="text-orange-500 shrink-0" />;
  if (type === 'Accepté' || type === 'Signé') return <FileCheck size={13} className="text-emerald-500 shrink-0" />;
  if (type === 'Devis')   return <FileClock size={13} className="text-blue-400 shrink-0" />;
  return <FileBadge size={13} className="text-muted-foreground shrink-0" />;
}

// ─── Badge statut coloré ──────────────────────────────────────────────────────
function StatutBadge({ statut }) {
  const cls = STATUT_COLORS[statut] || 'bg-slate-100 text-slate-500 border-slate-200';
  return (
    <span className={`text-[10px] px-1.5 py-0.5 rounded-full border font-medium shrink-0 ${cls}`}>
      {statut}
    </span>
  );
}

export default function DocumentsBadge({ evenement }) {
  const qc = useQueryClient();
  const [open, setOpen] = useState(false);
  const [showDevisModal, setShowDevisModal] = useState(false);
  const [selectedDevisId, setSelectedDevisId] = useState(null);
  const [showContratModal, setShowContratModal] = useState(false);
  const [selectedContrat, setSelectedContrat] = useState(null);

  // ─── Chargement en parallèle ──────────────────────────────────────────────
  const { data: devisList = [], refetch: refetchDevis } = useQuery({
    queryKey: ['devis-evenement', evenement.id],
    queryFn: () => base44.entities.Devis.filter({ evenement_id: evenement.id }),
    enabled: !!evenement.id,
  });

  const { data: contrats = [], refetch: refetchContrats } = useQuery({
    queryKey: ['contrats-evenement', evenement.id],
    queryFn: () => base44.entities.Contrat.filter({ evenement_id: evenement.id }),
    enabled: !!evenement.id,
  });

  const { data: clientDocs = [] } = useQuery({
    queryKey: ['client-docs-evenement', evenement.id],
    queryFn: () => base44.entities.ClientDocument.filter({ evenement_id: evenement.id }),
    enabled: !!evenement.id,
  });

  const totalDocs = devisList.length + contrats.length + clientDocs.length;

  // ─── Badge résumé ─────────────────────────────────────────────────────────
  const badgeLabel = totalDocs === 0
    ? '+ Créer'
    : `${totalDocs} doc${totalDocs > 1 ? 's' : ''}`;

  const openDevis = (id = null) => {
    setSelectedDevisId(id);
    setShowDevisModal(true);
    setOpen(false);
  };

  const openContrat = (contrat = null) => {
    setSelectedContrat(contrat);
    setShowContratModal(true);
    setOpen(false);
  };

  return (
    <>
      <Popover open={open} onOpenChange={setOpen}>
        <PopoverTrigger asChild>
          <button
            onClick={e => e.stopPropagation()}
            className={`text-xs px-2 py-0.5 rounded-full font-medium border transition-colors hover:opacity-80 ${
              totalDocs === 0
                ? 'bg-slate-100 text-slate-600 border-slate-200'
                : 'bg-slate-100 text-slate-700 border-slate-200'
            }`}
          >
            {badgeLabel}
          </button>
        </PopoverTrigger>

        <PopoverContent
          side="bottom"
          align="start"
          className="w-72 p-0 z-50"
          onClick={e => e.stopPropagation()}
        >
          <div className="px-3 py-2.5 border-b border-border">
            <p className="text-xs font-semibold text-foreground">Documents liés</p>
            <p className="text-[11px] text-muted-foreground">{evenement.nom}</p>
          </div>

          <div className="max-h-64 overflow-y-auto divide-y divide-border">
            {/* ── Devis & factures ── */}
            {devisList.length > 0 && devisList
              .sort((a, b) => new Date(a.created_date) - new Date(b.created_date))
              .map(doc => (
                <button
                  key={doc.id}
                  onClick={() => openDevis(doc.id)}
                  className="w-full flex items-center gap-2 px-3 py-2.5 hover:bg-muted/50 transition-colors text-left"
                >
                  <DocIcon type={doc.type_document} />
                  <div className="flex-1 min-w-0">
                    <p className="text-xs font-medium truncate">{doc.type_document || 'Devis'}</p>
                    {doc.numero && <p className="text-[10px] text-muted-foreground truncate">{doc.numero}</p>}
                  </div>
                  <StatutBadge statut={doc.statut} />
                </button>
              ))
            }

            {/* ── Contrats ── */}
            {contrats.length > 0 && contrats.map(c => (
              <button
                key={c.id}
                onClick={() => openContrat(c)}
                className="w-full flex items-center gap-2 px-3 py-2.5 hover:bg-muted/50 transition-colors text-left"
              >
                <FileCheck size={13} className="text-muted-foreground shrink-0" />
                <div className="flex-1 min-w-0">
                  <p className="text-xs font-medium truncate">{c.titre || 'Contrat'}</p>
                  {c.date_signature && <p className="text-[10px] text-muted-foreground">Signé le {c.date_signature}</p>}
                </div>
                <StatutBadge statut={c.statut} />
              </button>
            ))}

            {/* ── ClientDocuments ── */}
            {clientDocs.length > 0 && clientDocs.map(doc => (
              <a
                key={doc.id}
                href={doc.file_url}
                target="_blank"
                rel="noopener noreferrer"
                onClick={e => e.stopPropagation()}
                className="w-full flex items-center gap-2 px-3 py-2.5 hover:bg-muted/50 transition-colors"
              >
                <FileText size={13} className="text-muted-foreground shrink-0" />
                <div className="flex-1 min-w-0">
                  <p className="text-xs font-medium truncate">{doc.nom}</p>
                  {doc.type_document && <p className="text-[10px] text-muted-foreground">{doc.type_document}</p>}
                </div>
                <ExternalLink size={11} className="text-muted-foreground shrink-0" />
              </a>
            ))}

            {/* ── Aucun doc ── */}
            {totalDocs === 0 && (
              <p className="text-xs text-muted-foreground text-center py-4">Aucun document</p>
            )}
          </div>

          {/* Pied — Nouveau document */}
          <div className="px-3 py-2 border-t border-border">
            <button
              onClick={() => openDevis(null)}
              className="w-full flex items-center justify-center gap-1.5 text-xs text-primary hover:underline font-medium py-1"
            >
              <Plus size={12} /> Nouveau document
            </button>
          </div>
        </PopoverContent>
      </Popover>

      {/* Modals */}
      {showDevisModal && (
        <DevisModal
          devisId={selectedDevisId}
          evenementId={evenement.id}
          clientNom={evenement.client_nom}
          clientEmail={evenement.client_email}
          clientTelephone={evenement.client_telephone}
          onClose={() => { setShowDevisModal(false); setSelectedDevisId(null); }}
          onSaved={() => { refetchDevis(); qc.invalidateQueries(['devis-evenement', evenement.id]); }}
        />
      )}

      {showContratModal && (
        <ContractModal
          contrat={selectedContrat}
          onClose={() => { setShowContratModal(false); setSelectedContrat(null); refetchContrats(); }}
        />
      )}
    </>
  );
}