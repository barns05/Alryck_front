import { useQuery } from '@tanstack/react-query';
import { base44 } from '@/api/base44Client';
import { FileText, Download, FileCheck, Receipt, UtensilsCrossed, CalendarDays, File, FileBadge, FileX, Coins } from 'lucide-react';

// ─── Config icônes/couleurs pour ClientDocument ───────────────────────────────
const typeConfig = {
  'Contrat':           { icon: FileCheck,       color: 'text-blue-600 bg-blue-50' },
  'Offre commerciale': { icon: Receipt,          color: 'text-green-600 bg-green-50' },
  'Menu':              { icon: UtensilsCrossed,  color: 'text-orange-600 bg-orange-50' },
  'Programme':         { icon: CalendarDays,     color: 'text-purple-600 bg-purple-50' },
  'Facture':           { icon: FileText,         color: 'text-red-600 bg-red-50' },
  'Autre':             { icon: File,             color: 'text-slate-600 bg-slate-50' },
};

// ─── Config icônes/couleurs pour Devis (par type_document) ───────────────────
const devisTypeConfig = {
  'Devis':                  { icon: FileBadge,  color: 'text-blue-600 bg-blue-50',    label: 'Devis' },
  "Facture d'acompte":      { icon: Coins,      color: 'text-amber-600 bg-amber-50',  label: "Facture d'acompte" },
  'Facture intermédiaire':  { icon: Coins,      color: 'text-amber-600 bg-amber-50',  label: 'Facture intermédiaire' },
  'Facture':                { icon: FileText,   color: 'text-red-600 bg-red-50',      label: 'Facture' },
  'Avoir':                  { icon: FileX,      color: 'text-orange-600 bg-orange-50', label: 'Avoir' },
  'Solde':                  { icon: FileCheck,  color: 'text-emerald-600 bg-emerald-50', label: 'Solde' },
  'Contrat':                { icon: FileCheck,  color: 'text-blue-600 bg-blue-50',    label: 'Contrat' },
};

const STATUT_COLORS = {
  'Envoyé':  'bg-blue-100 text-blue-700',
  'Accepté': 'bg-emerald-100 text-emerald-700',
  'Refusé':  'bg-red-100 text-red-600',
  'Annulé':  'bg-slate-100 text-slate-500',
};

// Statuts visibles côté client (pas les Brouillons)
const STATUTS_VISIBLES = ['Envoyé', 'Accepté', 'Refusé', 'Annulé'];

export default function DocumentsSection({ clientId, evenementId, clientEmail }) {
  // ─── ClientDocuments ──────────────────────────────────────────────────────
  const { data: clientDocs = [] } = useQuery({
    queryKey: ['client-documents', clientId, evenementId],
    queryFn: () => base44.entities.ClientDocument.filter({ client_id: clientId }, '-created_date', 100),
    enabled: !!clientId,
  });

  // ─── Devis filtrés par evenement_id ──────────────────────────────────────
  const { data: devisParEvenement = [] } = useQuery({
    queryKey: ['devis-client-portal-ev', evenementId],
    queryFn: () => base44.entities.Devis.filter({ evenement_id: evenementId }),
    enabled: !!evenementId,
  });

  // ─── Devis filtrés par client_email (si pas d'evenement_id sur le devis) ──
  const { data: devisParEmail = [] } = useQuery({
    queryKey: ['devis-client-portal-email', clientEmail],
    queryFn: () => base44.entities.Devis.filter({ client_email: clientEmail }),
    enabled: !!clientEmail,
  });

  // ─── Fusion : dédoublonnage par id + filtre statut visible ───────────────
  const allDevis = [...devisParEvenement, ...devisParEmail]
    .filter((d, i, arr) => arr.findIndex(x => x.id === d.id) === i) // dédoublonnage
    .filter(d => STATUTS_VISIBLES.includes(d.statut));

  // ─── Normalisation en liste unifiée ──────────────────────────────────────
  const docsNormalises = [
    ...clientDocs.map(d => ({ ...d, _source: 'clientdoc' })),
    ...allDevis.map(d => ({ ...d, _source: 'devis' })),
  ].sort((a, b) => new Date(b.created_date) - new Date(a.created_date));

  if (docsNormalises.length === 0) return null;

  return (
    <div className="bg-card rounded-2xl border border-border p-5">
      <h3 className="font-semibold text-base mb-4 flex items-center gap-2">
        <FileText size={18} className="text-primary" /> Mes documents
        <span className="ml-auto text-xs bg-primary/10 text-primary px-2 py-0.5 rounded-full">
          {docsNormalises.length}
        </span>
      </h3>

      <div className="space-y-2">
        {docsNormalises.map(doc => {
          // ── ClientDocument ──
          if (doc._source === 'clientdoc') {
            const config = typeConfig[doc.type_document] || typeConfig['Autre'];
            const Icon = config.icon;
            return (
              <a
                key={`cd-${doc.id}`}
                href={doc.file_url}
                target="_blank"
                rel="noopener noreferrer"
                className="flex items-center gap-3 p-3 rounded-xl border border-border hover:bg-muted/30 transition-colors group"
              >
                <div className={`w-9 h-9 rounded-xl flex items-center justify-center shrink-0 ${config.color}`}>
                  <Icon size={16} />
                </div>
                <div className="flex-1 min-w-0">
                  <p className="font-medium text-sm truncate">{doc.nom}</p>
                  <p className="text-xs text-muted-foreground">{doc.type_document}</p>
                </div>
                <Download size={14} className="text-muted-foreground group-hover:text-primary transition-colors shrink-0" />
              </a>
            );
          }

          // ── Devis / Facture ──
          const cfg = devisTypeConfig[doc.type_document] || devisTypeConfig['Devis'];
          const Icon = cfg.icon;
          const statutCls = STATUT_COLORS[doc.statut] || 'bg-slate-100 text-slate-500';
          const montant = doc.total_ttc != null
            ? new Intl.NumberFormat('fr-FR', { style: 'currency', currency: 'EUR' }).format(doc.total_ttc)
            : null;

          return (
            <div
              key={`dv-${doc.id}`}
              className="flex items-center gap-3 p-3 rounded-xl border border-border bg-card"
            >
              <div className={`w-9 h-9 rounded-xl flex items-center justify-center shrink-0 ${cfg.color}`}>
                <Icon size={16} />
              </div>
              <div className="flex-1 min-w-0">
                <div className="flex items-center gap-2 flex-wrap">
                  <p className="font-medium text-sm truncate">{cfg.label}{doc.numero ? ` · ${doc.numero}` : ''}</p>
                  <span className={`text-[10px] px-1.5 py-0.5 rounded-full font-medium shrink-0 ${statutCls}`}>
                    {doc.statut}
                  </span>
                </div>
                {montant && (
                  <p className="text-xs text-muted-foreground">{montant} TTC</p>
                )}
              </div>
            </div>
          );
        })}
      </div>
    </div>
  );
}