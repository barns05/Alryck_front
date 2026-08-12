/**
 * DocumentsFacturationSection — logique partagée "Devis & Factures" d'un événement.
 * Consommée par FacturationPanel (fiche détaillée) et DocumentsDrawer (badge liste).
 *
 * Autonome : gère ses propres requêtes (devis actifs, échéances), états (création,
 * consultation, relance email) et le menu de création à 2 niveaux.
 */
import { useState, useEffect } from 'react';
import { useQuery, useQueryClient } from '@tanstack/react-query';
import { base44 } from '@/api/base44Client';
import { FileText, Plus, Check, Clock, AlertTriangle, Download, Loader2, ArrowLeft } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { format, parseISO, isPast } from 'date-fns';
import { fr } from 'date-fns/locale';
import DevisModal from './DevisModal';
import DevisConsultationView from './DevisConsultationView';
import DevisEmailPreviewModal from './DevisEmailPreviewModal';
import StatutGlobalDevisBadge from './StatutGlobalDevisBadge';
import SuperPDPStatusBadge from './SuperPDPStatusBadge';
import { exportDevisPDFBlob } from './exportDevisPDF';
import { useGenererLignesDevis } from '@/hooks/useGenererLignesDevis';
import { useOwnerCompanySettings } from '@/hooks/useOwnerCompanySettings';
import { interpolateTemplate } from '@/lib/emailUtils';
import { DOCUMENT_TYPE_COLORS, DOCUMENT_STATUT_COLORS } from '@/constants/colors';
import { toast } from 'sonner';

const statutDevisColors = DOCUMENT_STATUT_COLORS;

// Menu de création à 2 niveaux — réplique compacte du module Facturation global
const TYPES_GROUPES = [
  { label: 'Devis', section: 'devis', typeDocument: 'Devis', chipClass: 'bg-blue-50 text-blue-700 border-blue-200' },
  { label: 'Facture', section: 'facturation', typeDocument: null, hasNatures: true, chipClass: 'bg-emerald-50 text-emerald-600 border-emerald-200' },
  { label: 'Avoir', section: 'facturation', typeDocument: 'Avoir', chipClass: 'bg-orange-50 text-orange-700 border-orange-200' },
];
const NATURES_FACTURE = [
  { label: 'Facture classique', typeDocument: 'Facture', chipClass: 'bg-emerald-50 text-emerald-800 border-emerald-200' },
  { label: "Facture d'acompte", typeDocument: "Facture d'acompte", chipClass: 'bg-emerald-50 text-emerald-600 border-emerald-200' },
  { label: 'Facture intermédiaire', typeDocument: 'Facture intermédiaire', chipClass: 'bg-emerald-50 text-emerald-500 border-emerald-200' },
  { label: 'Facture de solde', typeDocument: 'Solde', chipClass: 'bg-emerald-50 text-emerald-300 border-emerald-200' },
];

export default function DocumentsFacturationSection({ evenementId, evenement, formulaireReponses, clientNom, clientEmail, clientTelephone }) {
  const qc = useQueryClient();
  const { settings: company } = useOwnerCompanySettings();
  const assujetti = company?.assujetti_tva !== false;

  const [showDevisModal, setShowDevisModal] = useState(false);
  const [selectedDevisId, setSelectedDevisId] = useState(null);
  const [initialTypeDocument, setInitialTypeDocument] = useState(null);
  const [modalSection, setModalSection] = useState('devis');
  const [lignesPregenerees, setLignesPregenerees] = useState(null);
  const [showCreateMenu, setShowCreateMenu] = useState(false);
  const [showFactureNatures, setShowFactureNatures] = useState(false);
  const [consultationDevis, setConsultationDevis] = useState(null);
  const [selectedDocId, setSelectedDocId] = useState(null);
  const [generatingPdfId, setGeneratingPdfId] = useState(null);
  const [relancePreview, setRelancePreview] = useState(null);

  const { generer: genererLignes, peutGenerer } = useGenererLignesDevis(evenement, formulaireReponses);

  const { data: devisList = [], refetch: refetchDevis } = useQuery({
    queryKey: ['devis-evenement', evenementId],
    queryFn: () => base44.entities.Devis.filter({ evenement_id: evenementId }),
    enabled: !!evenementId,
  });

  // Documents actifs uniquement (les archivés restent gérés dans le module global)
  const docsActifs = devisList
    .filter(d => !d.archived)
    .sort((a, b) => new Date(b.date_devis || b.created_date || 0) - new Date(a.date_devis || a.created_date || 0));

  // Document "sélectionné" = dernier ouvert, sinon le plus récent (pour le bloc échéances)
  useEffect(() => {
    if (!selectedDocId && docsActifs.length > 0) setSelectedDocId(docsActifs[0].id);
  }, [docsActifs, selectedDocId]);

  const selectedDoc = docsActifs.find(d => d.id === selectedDocId) || docsActifs[0] || null;

  const { data: echeances = [] } = useQuery({
    queryKey: ['echeances', selectedDoc?.id],
    queryFn: () => base44.entities.Echeance.filter({ devis_id: selectedDoc.id }),
    enabled: !!selectedDoc?.id,
  });

  const openCreate = (typeDocument, section) => {
    setSelectedDevisId(null);
    setInitialTypeDocument(typeDocument);
    setModalSection(section);
    setLignesPregenerees(null);
    setShowDevisModal(true);
    setShowCreateMenu(false);
    setShowFactureNatures(false);
  };

  const openConsultation = (d) => {
    setConsultationDevis(d);
    setSelectedDocId(d.id);
  };

  const genererEtOuvrir = () => {
    const lignes = peutGenerer ? genererLignes() : [];
    setSelectedDevisId(null);
    setInitialTypeDocument('Devis');
    setModalSection('devis');
    setLignesPregenerees(lignes.length > 0 ? lignes : null);
    setShowDevisModal(true);
  };

  const handlePdf = async (d) => {
    if (generatingPdfId) return;
    if (d.pdf_url) { window.open(d.pdf_url, '_blank'); return; }
    setGeneratingPdfId(d.id);
    try {
      const echs = await base44.entities.Echeance.filter({ devis_id: d.id }).catch(() => []);
      const pdfBlob = await exportDevisPDFBlob({ devis: d, echeances: echs, company });
      const pdfFile = new File([pdfBlob], `devis-${d.numero || d.id}.pdf`, { type: 'application/pdf' });
      const { file_url: pdfUrl } = await base44.integrations.Core.UploadFile({ file: pdfFile });
      await base44.entities.Devis.update(d.id, { pdf_url: pdfUrl });
      qc.invalidateQueries(['devis-evenement', evenementId]);
      window.open(pdfUrl, '_blank');
    } catch (err) {
      toast.error('Impossible de générer le PDF : ' + (err?.message || 'erreur'));
    } finally {
      setGeneratingPdfId(null);
    }
  };

  const handleRelanceSend = async (subject, body) => {
    try {
      await base44.integrations.Core.SendEmail({ to: consultationDevis.client_email, subject, body });
      await base44.entities.Notification.create({
        titre: '📤 Relance envoyée',
        message: `Relance du ${consultationDevis.type_document} ${consultationDevis.numero} envoyée à ${consultationDevis.client_nom}`,
        type: 'facturation', lu: false,
      });
      qc.invalidateQueries(['notifications']);
      toast.success('✓ Relance envoyée au client');
    } catch (err) {
      toast.error(`❌ Erreur : ${err?.message || JSON.stringify(err)}`);
    }
    setRelancePreview(null);
  };

  return (
    <div className="space-y-3">
      {/* En-tête : statut global + création */}
      <div className="flex items-center justify-between gap-2">
        <StatutGlobalDevisBadge evenementId={evenementId} />
        <div className="relative">
          <Button size="sm" className="gap-1.5" onClick={() => { setShowCreateMenu(v => !v); setShowFactureNatures(false); }}>
            <Plus size={14} /> Créer
          </Button>
          {showCreateMenu && (
            <>
              <div className="fixed inset-0 z-10" onClick={() => { setShowCreateMenu(false); setShowFactureNatures(false); }} />
              <div className="absolute right-0 top-11 z-20 bg-card border border-border rounded-xl shadow-lg p-3 w-[calc(100vw-2rem)] max-w-[260px]">
                {!showFactureNatures ? (
                  <>
                    <p className="text-[10px] font-semibold uppercase tracking-wider text-muted-foreground mb-2 px-1">Type de document</p>
                    <div className="flex flex-col gap-1.5">
                      {TYPES_GROUPES.map(chip => (
                        <button
                          key={chip.label}
                          onClick={() => chip.hasNatures ? setShowFactureNatures(true) : openCreate(chip.typeDocument, chip.section)}
                          className={`w-full text-center px-4 py-2.5 rounded-full border text-sm font-medium transition-colors hover:brightness-95 ${chip.chipClass}`}
                        >
                          {chip.label}
                        </button>
                      ))}
                    </div>
                  </>
                ) : (
                  <>
                    <button onClick={() => setShowFactureNatures(false)} className="flex items-center gap-1 text-xs text-muted-foreground hover:text-foreground mb-2 px-1 transition-colors">
                      <ArrowLeft size={14} /> Retour
                    </button>
                    <p className="text-[10px] font-semibold uppercase tracking-wider text-muted-foreground mb-2 px-1">Nature de la facture</p>
                    <div className="flex flex-col gap-1.5">
                      {NATURES_FACTURE.map(nature => (
                        <button
                          key={nature.label}
                          onClick={() => openCreate(nature.typeDocument, 'facturation')}
                          className={`w-full text-center px-4 py-2.5 rounded-full border text-sm font-medium transition-colors hover:brightness-95 ${nature.chipClass}`}
                        >
                          {nature.label}
                        </button>
                      ))}
                    </div>
                  </>
                )}
              </div>
            </>
          )}
        </div>
      </div>

      {/* Liste des documents (actifs) */}
      {docsActifs.length > 0 ? (
        <div className="space-y-2">
          {docsActifs.map(d => (
            <div
              key={d.id}
              className={`bg-card rounded-xl border p-3 flex items-center gap-3 transition-colors cursor-pointer hover:bg-muted/30 ${selectedDocId === d.id ? 'border-primary/40' : 'border-border'}`}
              onClick={() => openConsultation(d)}
            >
              <div className="flex-1 min-w-0">
                <div className="flex items-center gap-1.5 flex-wrap">
                  <span className="font-mono text-xs text-muted-foreground truncate">
                    {d.est_pro_forma ? (d.numero_provisoire || '—') : (d.numero || '—')}
                  </span>
                  <span className={`text-[10px] px-1.5 py-0.5 rounded-full font-medium ${DOCUMENT_TYPE_COLORS[d.type_document] || 'bg-slate-100 text-slate-600'}`}>
                    {d.type_document || 'Devis'}
                  </span>
                  {d.est_pro_forma && <span className="text-[10px] px-1.5 py-0.5 rounded-full bg-primary/10 text-primary border border-primary/30 font-bold">PF</span>}
                  <span className={`text-[10px] px-1.5 py-0.5 rounded-full font-medium ${statutDevisColors[d.statut] || ''}`}>{d.statut || 'Brouillon'}</span>
                  <SuperPDPStatusBadge statut={d.superpdp_statut} />
                </div>
                <div className="flex items-center justify-between gap-2 mt-1">
                  <p className="text-xs text-muted-foreground truncate">
                    {d.date_devis ? format(parseISO(d.date_devis), 'd MMM yyyy', { locale: fr }) : ''}
                    {d.client_nom ? ` · ${d.client_nom}` : ''}
                  </p>
                  <div className="text-right shrink-0">
                    <p className="text-sm font-bold text-primary">{(d.total_ttc || 0).toLocaleString('fr-FR', { minimumFractionDigits: 2 })} €</p>
                    {assujetti && <p className="text-[10px] text-muted-foreground">{(d.total_ht || 0).toLocaleString('fr-FR', { minimumFractionDigits: 2 })} € HT</p>}
                  </div>
                </div>
              </div>
              <button
                onClick={e => { e.stopPropagation(); handlePdf(d); }}
                disabled={generatingPdfId === d.id}
                title="Télécharger le PDF"
                className="p-2 rounded-lg hover:bg-muted text-muted-foreground hover:text-primary transition-colors disabled:opacity-50 shrink-0"
              >
                {generatingPdfId === d.id ? <Loader2 size={16} className="animate-spin" /> : <Download size={16} />}
              </button>
            </div>
          ))}
        </div>
      ) : (
        <div className="text-center py-6 text-muted-foreground text-sm space-y-3">
          <FileText size={28} className="mx-auto opacity-30" />
          <p>Aucun document actif pour cet événement.</p>
          {peutGenerer && (
            <Button size="sm" className="gap-1.5 mx-auto" onClick={genererEtOuvrir}>✨ Générer la facturation</Button>
          )}
        </div>
      )}

      {/* Bloc échéances lié au document sélectionné */}
      {selectedDoc && echeances.length > 0 && (
        <div className="bg-muted/30 rounded-xl border border-border p-3 space-y-1.5">
          <p className="text-[10px] font-semibold uppercase tracking-wider text-muted-foreground">
            Échéances — {selectedDoc.est_pro_forma ? (selectedDoc.numero_provisoire || 'PF') : (selectedDoc.numero || '')}
          </p>
          {echeances.map(e => {
            const isLate = e.statut === 'En attente' && e.date_prevue && isPast(parseISO(e.date_prevue));
            return (
              <div key={e.id} className="flex items-center justify-between text-sm">
                <div className="flex items-center gap-2">
                  {e.statut === 'Reçu' ? <Check size={12} className="text-emerald-500" /> :
                   isLate ? <AlertTriangle size={12} className="text-red-500" /> :
                   <Clock size={12} className="text-amber-500" />}
                  <span className={isLate ? 'text-red-600 font-medium' : ''}>{e.type}</span>
                </div>
                <span className="font-medium">{(e.montant_calcule || 0).toLocaleString('fr-FR', { minimumFractionDigits: 2 })} €</span>
              </div>
            );
          })}
        </div>
      )}

      {/* Modal création / édition document */}
      {showDevisModal && (
        <DevisModal
          devisId={selectedDevisId}
          initialTypeDocument={initialTypeDocument}
          section={modalSection}
          evenementId={evenementId}
          evenement={evenement}
          formulaireReponses={formulaireReponses}
          clientNom={clientNom}
          clientEmail={clientEmail}
          clientTelephone={clientTelephone}
          lignesInitiales={lignesPregenerees}
          onClose={() => { setShowDevisModal(false); setLignesPregenerees(null); setInitialTypeDocument(null); }}
          onSaved={() => { refetchDevis(); }}
        />
      )}

      {/* Consultation d'un document (transitions de statut, conversion, avoir) */}
      {consultationDevis && (
        <DevisConsultationView
          devis={consultationDevis}
          company={company}
          onClose={() => setConsultationDevis(null)}
          onOuvreNouveauDevis={(srcId, typeDocument) => {
            setConsultationDevis(null);
            setSelectedDevisId(srcId);
            setInitialTypeDocument(typeDocument);
            setModalSection(typeDocument === 'Devis' ? 'devis' : 'facturation');
            setLignesPregenerees(null);
            setShowDevisModal(true);
          }}
          onOuvreEmailPreview={({ subject, body }) => setRelancePreview({ subject, body })}
        />
      )}

      {/* Aperçu email relance */}
      {relancePreview && consultationDevis && (
        <DevisEmailPreviewModal
          emailPreview={relancePreview}
          signature={company?.email_signature ? interpolateTemplate(company.email_signature, {
            company_name: company?.company_name || '',
            email_contact: company?.email_contact || '',
            telephone: company?.telephone || '',
            site_web: company?.site_web || '',
          }) : ''}
          clientEmail={consultationDevis.client_email}
          onSend={handleRelanceSend}
          onCancel={() => setRelancePreview(null)}
          sending={false}
          zIndex="z-[60]"
        />
      )}
    </div>
  );
}