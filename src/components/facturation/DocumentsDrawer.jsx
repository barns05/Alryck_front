/**
 * DocumentsDrawer — Badge "📁 X docs" sur la carte événement.
 * Au clic → Sheet bottom avec :
 *  - Section "Devis & Factures" déléguée au composant partagé DocumentsFacturationSection
 *    (même comportement que la fiche détaillée : création multi-types, consultation,
 *     PDF à la volée, échéances, transitions de statut, conversion, avoir, relance).
 *  - Section "Contrats" (propre au drawer).
 *  - Section "Fichiers" (upload ClientDocument + envoi email client — propre au drawer).
 */
import { useState, useRef } from 'react';
import { useQuery, useQueryClient } from '@tanstack/react-query';
import { base44 } from '@/api/base44Client';
import { Sheet, SheetContent, SheetTitle, SheetClose } from '@/components/ui/sheet';
import { X, FileText, Upload, Loader2, Plus } from 'lucide-react';
import {
  DropdownMenu, DropdownMenuContent, DropdownMenuItem, DropdownMenuTrigger,
} from '@/components/ui/dropdown-menu';
import { Button } from '@/components/ui/button';
import { toast } from 'sonner';
import ContratsSection from '@/components/juridique/ContratsSection';
import DocumentsFacturationSection from './DocumentsFacturationSection';
import { CONTRAT_STATUT_COLORS } from '@/constants/colors';

// ─── Couleurs statuts (constante centralisée) ────────────────────────────────
function StatutBadge({ statut }) {
  if (!statut) return null;
  const cls = CONTRAT_STATUT_COLORS[statut] || 'bg-slate-100 text-slate-500 border-slate-200';
  return (
    <span className={`text-[10px] px-1.5 py-0.5 rounded-full border font-medium shrink-0 ${cls}`}>
      {statut}
    </span>
  );
}

// ─── Ligne générique (contrats / fichiers) ───────────────────────────────────
function DocRow({ icon, title, subtitle, statut, onClick, href }) {
  const inner = (
    <div className="flex items-center gap-3 px-4 py-3 hover:bg-muted/50 transition-colors w-full text-left">
      {icon}
      <div className="flex-1 min-w-0">
        <p className="text-sm font-medium truncate">{title}</p>
        {subtitle && <p className="text-xs text-muted-foreground truncate">{subtitle}</p>}
      </div>
      {statut && <StatutBadge statut={statut} />}
    </div>
  );
  if (href) {
    return (
      <a href={href} target="_blank" rel="noopener noreferrer" onClick={e => e.stopPropagation()}
        className="block w-full divide-y divide-border">
        {inner}
      </a>
    );
  }
  return <button onClick={onClick} className="block w-full">{inner}</button>;
}

function Section({ title, children, empty }) {
  return (
    <div>
      <p className="text-xs font-semibold uppercase tracking-wider text-muted-foreground px-4 py-2 bg-muted/30 border-y border-border">
        {title}
      </p>
      {children}
      {empty && <p className="text-xs text-muted-foreground px-4 py-3 italic">{empty}</p>}
    </div>
  );
}

// ─── Composant principal ──────────────────────────────────────────────────────
export default function DocumentsDrawer({ evenement }) {
  const qc = useQueryClient();
  const fileInputRef = useRef(null);

  const [open, setOpen] = useState(false);
  const [uploading, setUploading] = useState(false);

  // Devis : requête conservée pour le compteur du badge (clé partagée avec DocumentsFacturationSection → dédupée par React Query)
  const { data: devisList = [] } = useQuery({
    queryKey: ['devis-evenement', evenement.id],
    queryFn: () => base44.entities.Devis.filter({ evenement_id: evenement.id }),
    enabled: !!evenement.id,
  });

  const { data: contrats = [] } = useQuery({
    queryKey: ['contrats-evenement', evenement.id],
    queryFn: () => base44.entities.Contrat.filter({ evenement_id: evenement.id }),
    enabled: !!evenement.id,
  });

  const { data: clientDocs = [], refetch: refetchClientDocs } = useQuery({
    queryKey: ['client-docs-evenement', evenement.id],
    queryFn: () => base44.entities.ClientDocument.filter({ evenement_id: evenement.id }),
    enabled: !!evenement.id,
  });

  const totalDocs = devisList.length + contrats.length + clientDocs.length;

  // ─── Handlers ────────────────────────────────────────────────────────────
  const handleFileUpload = async (e) => {
    const file = e.target.files?.[0];
    if (!file) return;
    setUploading(true);
    try {
      const { file_url } = await base44.integrations.Core.UploadFile({ file });
      await base44.entities.ClientDocument.create({
        client_id: evenement.client_id || '',
        evenement_id: evenement.id,
        nom: file.name,
        file_url,
        type_document: 'Autre',
      });
      refetchClientDocs();
      qc.invalidateQueries(['client-docs-evenement', evenement.id]);

      await base44.entities.Notification.create({
        titre: '📄 Nouveau fichier',
        message: `Le fichier "${file.name}" a été ajouté pour l'événement "${evenement.nom}".`,
        type: 'evenement',
        lu: false,
      });

      if (evenement.client_email) {
        const lienPortail = evenement.lien_client_token
          ? `${window.location.origin}/evenement-client?token=${evenement.lien_client_token}`
          : null;
        const body = lienPortail
          ? `<p>Bonjour ${evenement.client_nom || ''},</p><p>Un document a été partagé avec vous concernant votre événement "<strong>${evenement.nom}</strong>".</p><p><a href="${lienPortail}" style="display:inline-block;padding:12px 24px;background:#1e40af;color:white;text-decoration:none;border-radius:8px;font-weight:600;">Accéder à mon espace →</a></p><p>Cordialement</p>`
          : `<p>Bonjour ${evenement.client_nom || ''},</p><p>Un document a été partagé avec vous concernant votre événement "<strong>${evenement.nom}</strong>". Connectez-vous à votre espace client pour le consulter.</p><p>Cordialement</p>`;
        await base44.integrations.Core.SendEmail({
          to: evenement.client_email,
          subject: 'Un document a été partagé',
          body,
        });
      }

      toast.success('✓ Fichier uploadé');
    } catch {
      toast.error('❌ Erreur lors de l\'upload');
    } finally {
      setUploading(false);
      if (fileInputRef.current) fileInputRef.current.value = '';
    }
  };

  // ─── Badge ────────────────────────────────────────────────────────────────
  const badgeLabel = totalDocs === 0
    ? '📁 + Ajouter'
    : `📁 ${totalDocs} doc${totalDocs > 1 ? 's' : ''}`;

  return (
    <>
      {/* Badge trigger */}
      <button
        onClick={e => { e.stopPropagation(); setOpen(true); }}
        className={`text-xs px-2 py-0.5 rounded-full font-medium border transition-colors hover:opacity-80 ${
          totalDocs === 0
            ? 'bg-slate-100 text-slate-600 border-slate-200'
            : 'bg-slate-100 text-slate-700 border-slate-200'
        }`}
      >
        {badgeLabel}
      </button>

      {/* Sheet bottom */}
      <Sheet open={open} onOpenChange={setOpen}>
        <SheetContent
          side="bottom"
          className="p-0 rounded-t-2xl flex flex-col [&>button:first-child]:hidden"
          style={{ height: '85vh', paddingBottom: 'env(safe-area-inset-bottom, 0px)' }}
          onClick={e => e.stopPropagation()}
        >
          {/* Header : ✕ à gauche | titre | + Nouveau (contrat / fichier) à droite */}
          <div className="flex items-center gap-3 px-4 py-4 border-b border-border shrink-0">
            <SheetTitle className="sr-only">Documents & Facturation</SheetTitle>
            <SheetClose asChild>
              <button className="p-1.5 rounded-lg hover:bg-muted text-muted-foreground hover:text-foreground transition-colors shrink-0">
                <X size={16} />
              </button>
            </SheetClose>
            <div className="flex-1 min-w-0">
              <h2 className="text-base font-bold">Documents & Facturation</h2>
              <p className="text-xs text-muted-foreground truncate">{evenement.nom}</p>
            </div>
            {/* Bouton "+ Nouveau" — contrats & fichiers uniquement.
                La création de devis/factures est gérée par DocumentsFacturationSection. */}
            <DropdownMenu>
              <DropdownMenuTrigger asChild>
                <Button size="sm" className="gap-1.5 text-xs shrink-0">
                  <Plus size={13} /> Nouveau
                </Button>
              </DropdownMenuTrigger>
              <DropdownMenuContent align="end" className="z-[200]">
                <DropdownMenuItem
                  onClick={() => fileInputRef.current?.click()}
                  disabled={uploading}
                >
                  {uploading
                    ? <Loader2 size={13} className="mr-2 animate-spin" />
                    : <Upload size={13} className="mr-2 text-muted-foreground" />}
                  Uploader un fichier
                </DropdownMenuItem>
              </DropdownMenuContent>
            </DropdownMenu>
            <input
              ref={fileInputRef}
              type="file"
              className="hidden"
              onChange={handleFileUpload}
            />
          </div>

          {/* Contenu scrollable */}
          <div className="flex-1 overflow-y-auto divide-y divide-border" style={{ paddingBottom: 110 }}>

            {/* ── Devis & Factures — composant partagé ── */}
            <div className="px-4 py-4">
              <p className="text-xs font-semibold uppercase tracking-wider text-muted-foreground mb-3">
                Devis & Factures ({devisList.length})
              </p>
              <DocumentsFacturationSection
                evenementId={evenement.id}
                evenement={evenement}
                clientNom={evenement.client_nom}
                clientEmail={evenement.client_email}
                clientTelephone={evenement.client_telephone}
              />
            </div>

            {/* ── Contrats — composant partagé ── */}
            <div className="px-4 py-4">
              <ContratsSection evenementId={evenement.id} evenementNom={evenement.nom} />
            </div>

            {/* ── Fichiers uploadés ── */}
            <Section
              title={`Fichiers (${clientDocs.length})`}
              empty={clientDocs.length === 0 ? 'Aucun fichier uploadé' : null}
            >
              {clientDocs.map(doc => (
                <DocRow
                  key={doc.id}
                  icon={<FileText size={14} className="text-muted-foreground shrink-0" />}
                  title={doc.nom}
                  subtitle={doc.type_document || undefined}
                  href={doc.file_url}
                />
              ))}
              <button
                onClick={() => fileInputRef.current?.click()}
                disabled={uploading}
                className="w-full flex items-center gap-2 px-4 py-2.5 text-xs text-primary hover:bg-muted/40 transition-colors font-medium disabled:opacity-50"
              >
                {uploading ? <Loader2 size={12} className="animate-spin" /> : <Upload size={12} />}
                Uploader un fichier
              </button>
            </Section>
          </div>
        </SheetContent>
      </Sheet>

    </>
  );
}