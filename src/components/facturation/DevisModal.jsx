import { useState, useEffect, useRef } from 'react';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { base44 } from '@/api/base44Client';
import { Save, Download, Send, ArrowLeft, Lock, MoreVertical, Plus, FileText, Sparkles } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { toast } from 'sonner';
import { format, parseISO } from 'date-fns';
import { fr } from 'date-fns/locale';
import DevisLignesEditor from './DevisLignesEditor';
import DevisTotaux, { calculerTotaux } from './DevisTotaux';
import EcheancesPanel from './EcheancesPanel';
import ClientSearchSelector from './ClientSearchSelector';
import OptionsPrestationsModal from './OptionsPrestationsModal';
import { exportDevisPDF, exportDevisPDFBlob } from './exportDevisPDF';
import { useGenererLignesDevis } from '@/hooks/useGenererLignesDevis';
import { enrichirLignesAvecPrix } from '@/components/notifications/DevisDemandeButton';
import DevisConsultationView from './DevisConsultationView';
import DevisEmailPreviewModal from './DevisEmailPreviewModal';
import PromoSuggestionBanner from './PromoSuggestionBanner';
import { interpolateTemplate, getEmailTemplate } from '@/lib/emailUtils';
import { useOwnerCompanySettings } from '@/hooks/useOwnerCompanySettings';

const PREFIXES = {
  'Devis': 'DEV',
  "Facture d'acompte": 'FAC',
  'Facture intermédiaire': 'FAC',
  'Facture': 'FAC',
  'Solde': 'FAC',
  'Avoir': 'AV',
};

const DATE_LABELS = {
  'Devis': 'Date du devis',
  "Facture d'acompte": 'Date de facturation',
  'Facture intermédiaire': 'Date de facturation',
  'Facture': 'Date de facturation',
  'Solde': 'Date de facturation',
  'Avoir': "Date de l'avoir",
};

async function genererNumero(type = 'Devis') {
  // Numéro DÉFINITIF : ne compte que les documents finalisés (est_pro_forma === false)
  const all = await base44.entities.Devis.list('-created_date', 200);
  const year = new Date().getFullYear();
  const prefix = PREFIXES[type] || 'DEV';
  const max = all.filter(d => !d.est_pro_forma && d.numero?.startsWith(`${prefix}-${year}`)).length;
  return `${prefix}-${year}-${String(max + 1).padStart(3, '0')}`;
}

// Numéro provisoire pour les factures pro forma (préfixe PF-, séquence séparée)
async function genererNumeroProvisoire() {
  const all = await base44.entities.Devis.list('-created_date', 200);
  const year = new Date().getFullYear();
  const max = all.filter(d => d.numero_provisoire?.startsWith(`PF-${year}`)).length;
  return `PF-${year}-${String(max + 1).padStart(3, '0')}`;
}

// Récupère la date de la dernière facture finalisée d'un type donné (pour validation antériorité)
async function derniereDateFinalisee(typeDocument, prestataireId) {
  const all = await base44.entities.Devis.list('-created_date', 200);
  const finalises = all.filter(d =>
    !d.est_pro_forma &&
    d.type_document === typeDocument &&
    (!prestataireId || d.prestataire_id === prestataireId) &&
    d.date_devis
  );
  if (finalises.length === 0) return null;
  // Tri descendant par date_devis
  finalises.sort((a, b) => (b.date_devis || '').localeCompare(a.date_devis || ''));
  return finalises[0].date_devis;
}

export default function DevisModal({ devisId, initialTypeDocument, prospectId, evenementId, evenement, formulaireReponses, clientNom, clientEmail, clientTelephone, lignesInitiales, objet, section = 'devis', onClose, onSaved }) {
  const qc = useQueryClient();
  const initializedRef = useRef(false);
  const [tab, setTab] = useState('devis');
  const [form, setForm] = useState(null);
  const [manualClientMode, setManualClientMode] = useState(!!clientNom);
  const [showClientSummary, setShowClientSummary] = useState(!!clientNom);
  const [selectedClientSummary, setSelectedClientSummary] = useState(null);
  const [showOptionsModal, setShowOptionsModal] = useState(false);
  const [sending, setSending] = useState(false);
  const [showConfirmLock, setShowConfirmLock] = useState(false);
  const [showEmailPreview, setShowEmailPreview] = useState(false);
  const [emailPreview, setEmailPreview] = useState(null);
  const [pendingEmailSend, setPendingEmailSend] = useState(null);
  const [relanceEmailPreview, setRelanceEmailPreview] = useState(null); // { subject, body } pour la relance seule
  const [showFinaliserModal, setShowFinaliserModal] = useState(false);
  const [finalisationDate, setFinalisationDate] = useState(new Date().toISOString().split('T')[0]);
  const [finalisationError, setFinalisationError] = useState('');
  const [finalising, setFinalising] = useState(false);
  const [showHeaderMenu, setShowHeaderMenu] = useState(false);
  const [showAjouterMenu, setShowAjouterMenu] = useState(false);
  const set = (k, v) => setForm(f => ({ ...f, [k]: v }));

  const TYPES_OFFICIELS = ["Facture", "Facture d'acompte", "Facture intermédiaire", "Solde", "Avoir"];
  // Types autorisés selon la section active (devis = Devis uniquement ; facturation = tous les types officiels)
  const TYPES_AUTORISES = section === 'devis'
    ? ["Devis"]
    : ["Facture d'acompte", "Facture intermédiaire", "Facture", "Solde", "Avoir"];
  const isDocumentOfficiel = TYPES_OFFICIELS.includes(form?.type_document);
  // Un document officiel est verrouillé UNIQUEMENT s'il est finalisé (est_pro_forma === false) ET envoyé/accepté.
  // Tant que est_pro_forma === true, le document reste entièrement modifiable quel que soit son statut.
  const isLocked = isDocumentOfficiel && !form?.est_pro_forma && (form?.statut === 'Envoyé' || form?.statut === 'Accepté');
  // Document pro forma = facture en cours de préparation, non encore finalisée
  const isProForma = isDocumentOfficiel && form?.est_pro_forma === true;
  // Mode consultation : document existant non-Brouillon ET non pro forma, UNIQUEMENT si aucune conversion/duplication demandée
  const isConsultation = !!devisId && !initialTypeDocument && !!form && form.statut !== 'Brouillon' && !isProForma;

  const { generer: genererLignes, peutGenerer } = useGenererLignesDevis(evenement, formulaireReponses);

  const { settings: company } = useOwnerCompanySettings();

  const assujetti = company?.assujetti_tva !== false;
  // Mode saisie HT/TTC : depuis le document, sinon TTC par défaut (sauf si réglage entreprise = HT explicitement)
  const modeSaisie = assujetti ? (form?.mode_saisie || (company?.tva_mode === 'HT' ? 'ht' : 'ttc')) : 'ht';

  const { data: options = [] } = useQuery({
    queryKey: ['options-prestations'],
    queryFn: () => base44.entities.OptionPrestation.list(),
  });

  const { data: evenements = [] } = useQuery({
    queryKey: ['evenements'],
    queryFn: () => base44.entities.Evenement.list(),
  });

  const { data: existingDevis } = useQuery({
    queryKey: ['devis', devisId],
    queryFn: () => base44.entities.Devis.filter({ id: devisId }).then(r => r[0] || null),
    enabled: !!devisId,
  });

  const { data: prospectData } = useQuery({
    queryKey: ['prospect-devis', prospectId],
    queryFn: () => base44.entities.Prospect.filter({ id: prospectId }).then(r => r[0] || null),
    enabled: !!prospectId,
    staleTime: 5 * 60 * 1000,
  });

  // useEffect 1 : Initialisation du form + enrichissement des prix (fusionné)
  useEffect(() => {
    if (existingDevis) {
      // Duplication : nouveau brouillon pré-rempli depuis la source
      if (initialTypeDocument === 'duplicate') {
        (async () => {
          if (initializedRef.current) return;
          initializedRef.current = true;
          const numero = await genererNumero(existingDevis.type_document || 'Devis');
          setForm({
            ...existingDevis,
            id: undefined,
            numero,
            statut: 'Brouillon',
            pdf_url: undefined,
            date_devis: new Date().toISOString().split('T')[0],
            facture_origine_id: undefined,
            facture_origine_numero: undefined,
          });
        })();
        return;
      }
      if (initialTypeDocument && initialTypeDocument !== existingDevis.type_document) {
        (async () => {
          const isAvoir = initialTypeDocument === 'Avoir';
          const estFactureConvertie = TYPES_OFFICIELS.includes(initialTypeDocument);
          const lignesAvoir = isAvoir
            ? (existingDevis.lignes || []).map(l => ({
                ...l,
                prix_unitaire_ht: -Math.abs(l.prix_unitaire_ht || 0),
                total_ht: -Math.abs(l.total_ht || 0),
              }))
            : existingDevis.lignes;
          // Conversion vers une facture → pro forma avec numéro provisoire
          const numeroProvisoireConvertie = estFactureConvertie ? await genererNumeroProvisoire() : '';
          setForm({
            ...existingDevis,
            id: undefined,
            type_document: initialTypeDocument,
            numero: estFactureConvertie ? '' : existingDevis.numero,
            numero_provisoire: numeroProvisoireConvertie,
            est_pro_forma: estFactureConvertie,
            statut: 'Brouillon',
            pdf_url: undefined,
            lignes: lignesAvoir,
            ...(isAvoir ? {
              facture_origine_id: existingDevis.id,
              facture_origine_numero: existingDevis.numero,
            } : {}),
          });
        })();
        return;
      } else {
        setForm(existingDevis);
      }
      return;
    }
    if (devisId) return;
    
    (async () => {
      if (initializedRef.current) return;
      initializedRef.current = true;
      
      const numero = await genererNumero();
      
      const annee = prospectData?.date_evenement_souhaitee
        ? new Date(prospectData.date_evenement_souhaitee).getFullYear()
        : evenement?.date_evenement
        ? new Date(evenement.date_evenement).getFullYear()
        : new Date().getFullYear();
      
      const lignesEnrichies = lignesInitiales?.length > 0
        ? await enrichirLignesAvecPrix(lignesInitiales, annee)
        : lignesInitiales || [];
      
      const datePrestation = prospectData?.date_evenement_souhaitee ||
        (prospectData?.date_mois ? prospectData.date_mois + '-15' : '') ||
        '';

      const typeDoc = initialTypeDocument || 'Devis';
      const estFacture = TYPES_OFFICIELS.includes(typeDoc);
      // Pour les factures : numéro provisoire PF- + est_pro_forma=true, pas de numéro définitif
      // Pour les devis : numéro définitif direct (les devis ne sont jamais pro forma)
      const numeroProvisoire = estFacture ? await genererNumeroProvisoire() : '';
      const numeroDefinitif = estFacture ? '' : (initialTypeDocument ? await genererNumero(typeDoc) : numero);
      setForm({
        numero: numeroDefinitif,
        numero_provisoire: numeroProvisoire,
        est_pro_forma: estFacture,
        type_document: typeDoc,
        prospect_id: prospectId || null,
        evenement_id: evenementId || null,
        client_nom: clientNom || '',
        client_email: clientEmail || '',
        client_telephone: clientTelephone || '',
        client_adresse: '',
        date_devis: new Date().toISOString().split('T')[0],
        date_validite: '',
        date_prestation: datePrestation,
        objet: objet || '',
        lignes: lignesEnrichies,
        conditions_paiement: company?.conditions_paiement_defaut || 'Acompte de 30% à la signature, solde 3 jours avant l\'événement.',
        statut: 'Brouillon',
        notes: '',
      });

    })();
  }, [existingDevis?.id, devisId]);

  // Réinitialiser le ref quand le modal se ferme
  useEffect(() => {
    return () => {
      initializedRef.current = false;
    };
  }, []);

  // useEffect 2 : Enrichissement depuis prospectData (quand prospect est chargé)
  useEffect(() => {
    if (!prospectData) return;
    setForm(f => {
      if (!f || Object.keys(f).length === 0) return f;
      
      const datePrestation = 
        prospectData.date_evenement_souhaitee ||
        (prospectData.date_mois ? prospectData.date_mois + '-15' : '') ||
        '';

      return ({
        ...f,
        client_nom: clientNom || 
          f.client_nom || 
          (prospectData.prenom + ' ' + prospectData.nom +
          (prospectData.prenom2 ? 
            ' & ' + prospectData.prenom2 + 
            ' ' + (prospectData.nom2 || prospectData.nom) 
            : '')),
        client_email: f.client_email || prospectData.email || '',
        client_telephone: f.client_telephone || prospectData.telephone || '',
        date_prestation: f.date_prestation || datePrestation,
      });
    });
  }, [prospectData?.id, clientNom]);



  const saveMutation = useMutation({
  mutationFn: async () => {
    const { totalHT, totalTVA, totalTTC } = calculerTotaux(form.lignes || [], form.remise_globale || 0, form.remise_globale_type || 'pct');
    const payload = { ...form, total_ht: totalHT, total_tva: totalTVA, total_ttc: totalTTC };
    if (form.id) return base44.entities.Devis.update(form.id, payload);
    return base44.entities.Devis.create({ ...payload, prestataire_id: company?.prestataire_id || null });
    },
    onSuccess: (saved) => {
      qc.invalidateQueries(['devis']);
      setForm(f => ({ ...f, id: saved?.id || f.id }));
      toast.success('✓ Devis enregistré');
      onSaved?.();
    },
    onError: () => toast.error('❌ Une erreur est survenue'),
  });

  const handleExport = async () => {
    const echeances = await base44.entities.Echeance.filter({ devis_id: form.id }).catch(() => []);
    await exportDevisPDF({ devis: form, echeances, company });
  };

  const handleEnvoyer = async () => {
    // Pour les types officiels, demander confirmation avant envoi
    if (isDocumentOfficiel && form?.statut !== 'Envoyé' && form?.statut !== 'Accepté') {
      setShowConfirmLock(true);
      return;
    }
    // Afficher la popup email
    await showEmailPreviewPopup();
  };

  const showEmailPreviewPopup = async () => {
    if (!form?.client_email) {
      toast.error('❌ Aucun email client renseigné');
      return;
    }

    // Charger le template
    const template = getEmailTemplate(company, form.type_document || 'Devis');
    
    // Construire le lien portail si disponible
    const lienPortail = evenement?.lien_client_token
      ? `${window.location.origin}/client-portal?token=${evenement.lien_client_token}`
      : null;

    // Variables pour interpolation
    const vars = {
      client_nom: form.client_nom || '',
      client_email: form.client_email,
      numero: form.numero || '',
      type_document: form.type_document || 'Devis',
      lien_portail: lienPortail || '',
      company_name: company?.company_name || '',
      email_contact: company?.email_contact || '',
      telephone: company?.telephone || '',
      site_web: company?.site_web || '',
    };

    // Interpoler subject et body
    const subject = interpolateTemplate(template.subject, vars);
    const body = interpolateTemplate(template.body, vars);

    // Ajouter la signature interpolée
    const signature = company?.email_signature ? interpolateTemplate(company.email_signature, vars) : '';
    const bodyWithSignature = signature ? `${body}<hr/><p>${signature.replace(/\n/g, '<br>')}</p>` : body;

    setEmailPreview({
      subject,
      body: bodyWithSignature
    });
    setPendingEmailSend({ subject, body: bodyWithSignature });
    setShowEmailPreview(true);
  };

  const doEnvoyer = async () => {
    setSending(true);
    try {
      // 1. Sauvegarder si nécessaire
      let savedId = form.id;
      if (!savedId) {
        const { totalHT, totalTVA, totalTTC } = calculerTotaux(form.lignes || [], form.remise_globale || 0, form.remise_globale_type || 'pct');
        const saved = await base44.entities.Devis.create({ ...form, total_ht: totalHT, total_tva: totalTVA, total_ttc: totalTTC });
        savedId = saved.id;
        setForm(f => ({ ...f, id: savedId }));
        qc.invalidateQueries(['devis']);
      }
      // 2. Générer le PDF et l'uploader
      const echeances = await base44.entities.Echeance.filter({ devis_id: savedId }).catch(() => []);
      const savedForm = { ...form, id: savedId };
      const pdfBlob = await exportDevisPDFBlob({ devis: savedForm, echeances, company });
      const pdfFile = new File([pdfBlob], `devis-${savedForm.numero || savedId}.pdf`, { type: 'application/pdf' });
      const { file_url: pdfUrl } = await base44.integrations.Core.UploadFile({ file: pdfFile });
      await base44.entities.Devis.update(savedId, { pdf_url: pdfUrl });
      setForm(f => ({ ...f, pdf_url: pdfUrl }));

      // 3. Passer statut à "Envoyé"
       await base44.entities.Devis.update(savedId, { statut: 'Envoyé' });
       setForm(f => ({ ...f, statut: 'Envoyé' }));
       qc.invalidateQueries(['devis']);
       if (form.prospect_id) {
         await base44.entities.Prospect.update(
           form.prospect_id, { statut: 'Devis envoyé' }
         );
         qc.invalidateQueries(['prospects']);
       }
       // Marquer la notification de demande de devis comme lue
       const notifsDevis = await base44.entities.Notification.filter({
         type: 'devis_demande',
         lu: false
       });

       const notifCible = notifsDevis.find(n =>
         n.message?.includes(form.prospect_id) ||
         n.message?.includes(form.client_email)
       );
       if (notifCible) {
         await base44.entities.Notification.update(
           notifCible.id, { lu: true }
         );
       }
       qc.invalidateQueries(['prospect-messages-badges']);
      // 3. Email au client si email disponible et sujet/body fournis
      try {
        if (form.client_email && pendingEmailSend?.subject && pendingEmailSend?.body) {
          await base44.integrations.Core.SendEmail({
            to: form.client_email,
            subject: pendingEmailSend.subject,
            body: pendingEmailSend.body,
          });
        }
      } catch (emailError) {
        console.warn('Email non envoyé:', emailError);
      }
      // 4. Notification admin
      await base44.entities.Notification.create({
        titre: `📄 ${form.type_document || 'Devis'} envoyé`,
        message: `Le document ${form.numero} a été envoyé à ${form.client_nom || form.client_email || 'le client'}.`,
        type: 'facturation',
        lu: false,
      });
      toast.success(`✓ ${form.type_document || 'Devis'} envoyé au client`);
      onSaved?.();
    } catch (err) {
      toast.error(`❌ Erreur : ${err?.message || JSON.stringify(err)}`);
    } finally {
      setSending(false);
    }
  };

  const confirmAndSend = async () => {
    setShowConfirmLock(false);
    await doEnvoyer();
  };

  // Ouvrir la modale de finalisation avec date par défaut = aujourd'hui
  const openFinaliserModal = () => {
    setFinalisationDate(new Date().toISOString().split('T')[0]);
    setFinalisationError('');
    setShowFinaliserModal(true);
  };

  // Finaliser : attribuer le numéro définitif, passer est_pro_forma à false, verrouiller
  const handleFinaliser = async () => {
    setFinalisationError('');
    // Validation : date postérieure à la dernière facture finalisée du même type
    const derniere = await derniereDateFinalisee(form.type_document, form.prestataire_id || company?.prestataire_id);
    if (derniere && finalisationDate <= derniere) {
      setFinalisationError(`La date doit être postérieure au ${format(parseISO(derniere), 'd MMM yyyy', { locale: fr })} (dernière facture ${form.type_document} finalisée).`);
      return;
    }
    setFinalising(true);
    try {
      const numeroDefinitif = await genererNumero(form.type_document);
      const { totalHT, totalTVA, totalTTC } = calculerTotaux(form.lignes || [], form.remise_globale || 0, form.remise_globale_type || 'pct');
      const payload = {
        ...form,
        numero: numeroDefinitif,
        est_pro_forma: false,
        date_devis: finalisationDate,
        total_ht: totalHT,
        total_tva: totalTVA,
        total_ttc: totalTTC,
      };
      const saved = form.id
        ? await base44.entities.Devis.update(form.id, payload)
        : await base44.entities.Devis.create({ ...payload, prestataire_id: company?.prestataire_id || null });
      qc.invalidateQueries(['devis']);
      setForm(f => ({ ...f, ...payload, id: saved?.id || f.id, est_pro_forma: false, numero: numeroDefinitif }));
      toast.success(`✓ Facture finalisée — n° ${numeroDefinitif}`);
      setShowFinaliserModal(false);
      onSaved?.();
    } catch (err) {
      toast.error(`❌ Erreur : ${err?.message || JSON.stringify(err)}`);
    } finally {
      setFinalising(false);
    }
  };

  // Réinitialiser le ref quand le modal se ferme
  useEffect(() => {
    return () => {
      initializedRef.current = false;
    };
  }, []);

  if (!form) return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/40">
      <div className="w-8 h-8 border-4 border-slate-200 border-t-primary rounded-full animate-spin" />
    </div>
  );

  // Mode consultation : document existant non-Brouillon
  if (isConsultation) {
    return (
      <>
        <DevisConsultationView
          devis={form}
          company={company}
          onClose={onClose}
          onOuvreEmailPreview={({ subject, body }) => setRelanceEmailPreview({ subject, body })}
          onOuvreNouveauDevis={(srcId, typeDocument) => {
            if (typeDocument === 'duplicate') {
              onClose();
              onSaved?.('duplicate', form);
            } else {
              onClose();
              onSaved?.('open', srcId, typeDocument);
            }
          }}
        />
        {relanceEmailPreview && (
          <DevisEmailPreviewModal
            emailPreview={relanceEmailPreview}
            signature={company?.email_signature ? interpolateTemplate(company.email_signature, {
              company_name: company?.company_name || '',
              email_contact: company?.email_contact || '',
              telephone: company?.telephone || '',
              site_web: company?.site_web || '',
            }) : ''}
            clientEmail={form.client_email}
            onSend={async (subject, body) => {
              try {
                await base44.integrations.Core.SendEmail({ to: form.client_email, subject, body });
                await base44.entities.Notification.create({
                  titre: '📤 Relance envoyée',
                  message: `Relance du ${form.type_document} ${form.numero} envoyée à ${form.client_nom}`,
                  type: 'facturation',
                  lu: false,
                });
                qc.invalidateQueries(['notifications']);
                toast.success('✓ Relance envoyée au client');
              } catch (err) {
                toast.error(`❌ Erreur : ${err?.message || JSON.stringify(err)}`);
              }
              setRelanceEmailPreview(null);
            }}
            onCancel={() => setRelanceEmailPreview(null)}
            sending={false}
            zIndex="z-[60]"
          />
        )}
      </>
    );
  }

  const { totalTTC } = calculerTotaux(form.lignes || [], form.remise_globale || 0, form.remise_globale_type || 'pct');

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/40 backdrop-blur-sm p-4">
      <div className="bg-card rounded-2xl border border-border shadow-2xl w-full max-w-4xl max-h-[92vh] flex flex-col">
        {/* Header */}
        <div className="px-4 md:px-6 py-3 md:py-4 border-b border-border shrink-0">
          <div className="flex items-center gap-3">
            <button onClick={onClose} className="p-1.5 rounded-lg hover:bg-muted text-muted-foreground hover:text-foreground transition-colors shrink-0">
              <ArrowLeft size={18} />
            </button>
            <div className="flex-1 min-w-0">
              <div className="flex items-center gap-2">
                <p className="font-bold text-sm md:text-base truncate">{form.type_document || 'Devis'}</p>
                {isProForma && (
                  <span className="text-[10px] px-2 py-0.5 rounded-full bg-primary/10 text-primary border border-primary/30 font-bold shrink-0">PRO FORMA</span>
                )}
              </div>
              <p className="text-xs text-muted-foreground truncate">
                {isProForma ? (form.numero_provisoire || '—') : (form.numero || '—')}
                {isProForma && <span className="ml-1 text-primary">(provisoire)</span>}
              </p>
            </div>

            {/* CTA principal unique + menu secondaire */}
            <div className="flex items-center gap-2 shrink-0">
              {/* CTA unique contextuel — caché si verrouillé */}
              {!isLocked && !isProForma && !form.id && (
                <Button size="sm" className="gap-1.5 h-8 text-xs px-3" onClick={() => saveMutation.mutate()} disabled={saveMutation.isPending}>
                  <Save size={13} /> {saveMutation.isPending ? 'Enr…' : 'Enregistrer'}
                </Button>
              )}
              {!isLocked && !isProForma && form.id && (
                <Button size="sm" className="gap-1.5 h-8 text-xs px-3" onClick={handleEnvoyer} disabled={sending}>
                  <Send size={13} /> {sending ? '…' : 'Envoyer'}
                </Button>
              )}
              {isProForma && (
                <Button size="sm" className="gap-1.5 h-8 text-xs px-3 bg-primary" onClick={openFinaliserModal} disabled={finalising}>
                  {finalising ? <span className="animate-spin">⏳</span> : <Lock size={13} />} Finaliser
                </Button>
              )}

              {/* Menu trois points : PDF, HT/TTC, Type, Statut */}
              <div className="relative">
                <button
                  onClick={() => setShowHeaderMenu(v => !v)}
                  className="p-1.5 rounded-lg hover:bg-muted text-muted-foreground hover:text-foreground transition-colors"
                  title="Plus d'options"
                >
                  <MoreVertical size={16} />
                </button>
                {showHeaderMenu && (
                  <>
                    <div className="fixed inset-0 z-10" onClick={() => setShowHeaderMenu(false)} />
                    <div className="absolute right-0 top-9 z-20 bg-card border border-border rounded-xl shadow-lg py-1 min-w-[220px]">
                      <button onClick={() => { handleExport(); setShowHeaderMenu(false); }} disabled={!form.id} className="w-full flex items-center gap-2 px-3 py-2 text-sm hover:bg-muted transition-colors text-left disabled:opacity-40">
                        <Download size={14} className="text-muted-foreground" /> Télécharger PDF
                      </button>
                      {assujetti && (
                        <div className="px-3 py-2 flex items-center justify-between gap-2 border-t border-border">
                          <span className="text-sm">Saisie</span>
                          <div className="flex rounded-lg border border-input overflow-hidden">
                            {['ttc', 'ht'].map(m => (
                              <button
                                key={m}
                                onClick={() => set('mode_saisie', m)}
                                className={`flex-1 text-xs font-semibold px-2 py-1 transition-colors ${modeSaisie === m ? 'bg-primary text-primary-foreground' : 'bg-transparent text-muted-foreground hover:bg-muted'}`}
                              >
                                {m.toUpperCase()}
                              </button>
                            ))}
                          </div>
                        </div>
                      )}
                      <div className="px-3 py-2 border-t border-border">
                        <label className="text-[10px] font-semibold uppercase tracking-wider text-muted-foreground block mb-1">Type</label>
                        <select
                          value={form.type_document || 'Devis'}
                          onChange={e => {
                            const newType = e.target.value;
                            const currentPrefix = Object.entries(PREFIXES).find(([, p]) => form.numero?.startsWith(p + '-'))?.[1];
                            const newPrefix = PREFIXES[newType] || 'DEV';
                            const newNumero = currentPrefix && form.numero
                              ? form.numero.replace(currentPrefix + '-', newPrefix + '-')
                              : form.numero;
                            setForm(f => ({ ...f, type_document: newType, numero: newNumero }));
                          }}
                          disabled={isLocked}
                          className="h-8 w-full rounded-lg border border-input bg-transparent px-2 text-sm focus-visible:outline-none focus-visible:ring-1 focus-visible:ring-ring disabled:opacity-60 disabled:cursor-not-allowed"
                        >
                          {TYPES_AUTORISES.map(t => <option key={t} value={t}>{t}</option>)}
                        </select>
                      </div>
                      <div className="px-3 py-2 border-t border-border">
                        <label className="text-[10px] font-semibold uppercase tracking-wider text-muted-foreground block mb-1">Statut</label>
                        <select
                          value={form.statut}
                          onChange={e => set('statut', e.target.value)}
                          disabled={isLocked}
                          className="h-8 w-full rounded-lg border border-input bg-transparent px-2 text-sm focus-visible:outline-none focus-visible:ring-1 focus-visible:ring-ring disabled:opacity-60 disabled:cursor-not-allowed"
                        >
                          {['Brouillon', 'Envoyé', 'Accepté', 'Refusé', 'Annulé'].map(s => <option key={s} value={s}>{s}</option>)}
                        </select>
                      </div>
                    </div>
                  </>
                )}
              </div>
            </div>
          </div>
        </div>

        {/* Zone d'info unique — un seul bandeau visible à la fois */}
        {isLocked && (
          <div className="px-4 py-2 bg-rose-50 border-b border-rose-200 flex items-center gap-2 text-rose-800 text-xs font-semibold shrink-0">
            <Lock size={14} />
            <span>Document officiel verrouillé — non modifiable</span>
          </div>
        )}
        {isProForma && (
          <div className="px-4 py-2 bg-primary/5 border-b border-primary/20 flex items-center gap-2 text-primary text-xs font-medium shrink-0">
            <Lock size={14} />
            <span>Facture en préparation — finalisez pour attribuer le numéro définitif et verrouiller.</span>
          </div>
        )}

        {/* Tabs */}
        <div className="flex border-b border-border shrink-0">
          <button
            onClick={() => setTab('devis')}
            className={`px-5 py-3 text-sm font-medium border-b-2 transition-colors ${tab === 'devis' ? 'border-primary text-primary' : 'border-transparent text-muted-foreground hover:text-foreground'}`}
          >
            Articles & Montants
          </button>
          <button
            onClick={() => setTab('echeances')}
            className={`px-5 py-3 text-sm font-medium border-b-2 transition-colors ${tab === 'echeances' ? 'border-primary text-primary' : 'border-transparent text-muted-foreground hover:text-foreground'}`}
          >
            Échéances de paiement
          </button>
        </div>

        <div className="flex-1 overflow-y-auto p-4 md:p-6">
           {tab === 'devis' && (
             <div className="space-y-6">
               {/* Info client & dates */}
               <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                 <div className="space-y-3">
                   {showClientSummary ? (
                     <div className="space-y-2">
                       <label className="text-xs font-semibold uppercase tracking-wider text-muted-foreground block">Client</label>
                       <div className="bg-muted/40 rounded-xl border border-border p-3 space-y-1">
                         <p className="font-semibold text-sm">{form.client_nom || 'Aucun nom'}</p>
                         {form.client_email && <p className="text-xs text-muted-foreground">{form.client_email}</p>}
                         {form.client_telephone && <p className="text-xs text-muted-foreground">{form.client_telephone}</p>}
                         {form.client_adresse && <p className="text-xs text-muted-foreground">{form.client_adresse}</p>}
                         {!isLocked && (
                           <button
                             onClick={() => setShowClientSummary(false)}
                             className="text-xs text-primary hover:underline mt-1 inline-block"
                           >
                             ✏️ Modifier
                           </button>
                         )}
                       </div>
                     </div>
                   ) : (
                     <>
                       {!manualClientMode ? (
                         <ClientSearchSelector
                           onSelect={(data) => {
                             set('client_nom', data.client_nom);
                             set('client_email', data.client_email);
                             set('client_telephone', data.client_telephone);
                             set('client_adresse', data.client_adresse);
                             if (data.prospectId) set('prospect_id', data.prospectId);
                             setSelectedClientSummary(data);
                             setShowClientSummary(true);
                           }}
                           onManualEntry={() => setManualClientMode(true)}
                         />
                       ) : (
                         <>
                           <label className="text-xs font-semibold uppercase tracking-wider text-muted-foreground block">Client</label>
                           <Input value={form.client_nom || ''} onChange={e => set('client_nom', e.target.value)} placeholder="Nom du client" className="h-8 text-sm" />
                           <Input value={form.client_email || ''} onChange={e => set('client_email', e.target.value)} placeholder="Email" className="h-8 text-sm" />
                           <Input value={form.client_telephone || ''} onChange={e => set('client_telephone', e.target.value)} placeholder="Téléphone" className="h-8 text-sm" />
                           <Input value={form.client_adresse || ''} onChange={e => set('client_adresse', e.target.value)} placeholder="Adresse" className="h-8 text-sm" />
                           <Button size="sm" variant="outline" onClick={() => setManualClientMode(false)} className="w-full text-xs mt-1">
                             ← Retour à la recherche
                           </Button>
                         </>
                       )}
                     </>
                   )}
                 </div>
                 <div className="space-y-3">
                   <h4 className="text-xs font-semibold uppercase tracking-wider text-muted-foreground">
                     {['Facture', "Facture d'acompte", 'Facture intermédiaire', 'Solde'].includes(form.type_document) ? 'FACTURE' : form.type_document === 'Avoir' ? 'AVOIR' : 'DEVIS'}
                   </h4>
                   <div>
                     <label className="text-xs text-muted-foreground mb-1 block">{DATE_LABELS[form.type_document] || 'Date du devis'}</label>
                     <Input type="date" value={form.date_devis || ''} onChange={e => set('date_devis', e.target.value)} className="h-8 text-sm" disabled={isLocked} />
                   </div>
                   <div>
                     <label className="text-xs text-muted-foreground mb-1 block">Date de validité</label>
                     <Input type="date" value={form.date_validite || ''} onChange={e => set('date_validite', e.target.value)} className="h-8 text-sm" disabled={isLocked} />
                   </div>
                   <div>
                     <label className="text-xs text-muted-foreground mb-1 block">Numéro</label>
                     <Input value={form.numero || ''} onChange={e => set('numero', e.target.value)} className="h-8 text-sm" disabled={isLocked} />
                   </div>
                   <div>
                     <label className="text-xs text-muted-foreground mb-1 block">Objet</label>
                     <Input value={form.objet || ''} onChange={e => set('objet', e.target.value)} placeholder="Ex : Mariage Dupont — Formule Sirocco" className="h-8 text-sm" disabled={isLocked} />
                   </div>
                   <div>
                     <label className="text-xs text-muted-foreground mb-1 block">Date de prestation</label>
                     <Input type="date" value={form.date_prestation || ''} onChange={e => set('date_prestation', e.target.value)} className="h-8 text-sm" disabled={isLocked} />
                   </div>
                   <div>
                     <label className="text-xs text-muted-foreground mb-1 block">Événement concerné</label>
                     <select value={form.evenement_id || ''} onChange={e => {
                       const evt = evenements.find(ev => ev.id === e.target.value);
                       set('evenement_id', e.target.value);
                       if (evt) set('evenement_nom', evt.nom);
                     }} disabled={isLocked} className="h-8 w-full rounded-md border border-input bg-transparent px-2 text-sm focus-visible:outline-none focus-visible:ring-1 focus-visible:ring-ring disabled:opacity-60 disabled:cursor-not-allowed">
                       <option value="">Pas d'événement</option>
                       {evenements.map(evt => <option key={evt.id} value={evt.id}>{evt.nom}</option>)}
                     </select>
                   </div>
                 </div>
               </div>

               {/* Bandeau effectifs événement */}
               {evenement && (evenement.nb_adultes > 0 || evenement.nb_adolescents > 0 || evenement.nb_enfants > 0 || evenement.nb_prestataires > 0 || evenement.nb_invites > 0) && (() => {
                 const lignes = form.lignes || [];
                 const descriptions = lignes.map(l => (l.description || '').toLowerCase());
                 const hasAdo = descriptions.some(d => d.includes('ado') || d.includes('adolescent'));
                 const hasEnfant = descriptions.some(d => d.includes('enfant'));
                 const hasPresta = descriptions.some(d => d.includes('prestataire'));
                 const missingAdo = (evenement.nb_adolescents || 0) > 0 && !hasAdo;
                 const missingEnfant = (evenement.nb_enfants || 0) > 0 && !hasEnfant;
                 const missingPresta = (evenement.nb_prestataires || 0) > 0 && !hasPresta;
                 const hasWarning = missingAdo || missingEnfant || missingPresta;
                 return (
                   <div className={`flex flex-wrap items-center gap-2 px-3 py-2 rounded-xl text-xs font-medium border ${hasWarning ? 'bg-amber-50 border-amber-200 text-amber-800' : 'bg-muted/40 border-border text-muted-foreground'}`}>
                     {hasWarning && <span>⚠️</span>}
                     {(evenement.nb_adultes || evenement.nb_invites) > 0 && <span>{evenement.nb_adultes || evenement.nb_invites} adultes</span>}
                     {evenement.nb_adolescents > 0 && <><span className="opacity-40">·</span><span className={missingAdo ? 'text-amber-700 font-semibold' : ''}>{evenement.nb_adolescents} ados{missingAdo ? ' (sans ligne)' : ''}</span></>}
                     {evenement.nb_enfants > 0 && <><span className="opacity-40">·</span><span className={missingEnfant ? 'text-amber-700 font-semibold' : ''}>{evenement.nb_enfants} enfants{missingEnfant ? ' (sans ligne)' : ''}</span></>}
                     {evenement.nb_prestataires > 0 && <><span className="opacity-40">·</span><span className={missingPresta ? 'text-amber-700 font-semibold' : ''}>{evenement.nb_prestataires} prestataires{missingPresta ? ' (sans ligne)' : ''}</span></>}
                   </div>
                 );
               })()}

               {/* Suggestion de ligne promotionnelle (offre acceptée non appliquée) */}
               {form.evenement_id && !isLocked && (
                 <PromoSuggestionBanner
                   evenementId={form.evenement_id}
                   devisId={form.id}
                   tvaTauxDefaut={company?.tva_taux_defaut ?? 20}
                   disabled={isLocked}
                   onAddLigne={(ligne) => set('lignes', [...(form.lignes || []), ligne])}
                 />
               )}

               {/* Articles */}
               <div>
                  <div className="flex items-center justify-between mb-3">
                    <h4 className="text-xs font-semibold uppercase tracking-wider text-muted-foreground">Articles & Prestations</h4>
                   <div className="relative">
                     <Button size="sm" variant="outline" className="gap-1 text-xs" onClick={() => setShowAjouterMenu(v => !v)}>
                       <Plus size={13} /> Ajouter
                     </Button>
                     {showAjouterMenu && (
                       <>
                         <div className="fixed inset-0 z-10" onClick={() => setShowAjouterMenu(false)} />
                         <div className="absolute right-0 top-9 z-20 bg-card border border-border rounded-xl shadow-lg py-1 min-w-[220px]">
                           <button
                             onClick={() => {
                               set('lignes', [...(form.lignes || []), { id: crypto.randomUUID(), description: '', unite: 'pers', quantite: 1, prix_unitaire_ht: 0, tva_taux: company?.tva_taux_defaut ?? 20, total_ht: 0, remise: 0, remise_type: 'pct' }]);
                               setShowAjouterMenu(false);
                             }}
                             className="w-full flex items-center gap-2 px-3 py-2 text-sm hover:bg-muted transition-colors text-left"
                           >
                             <Plus size={14} className="text-muted-foreground" /> Ligne vide
                           </button>
                           <button
                             onClick={() => { setShowOptionsModal(true); setShowAjouterMenu(false); }}
                             className="w-full flex items-center gap-2 px-3 py-2 text-sm hover:bg-muted transition-colors text-left"
                           >
                             <FileText size={14} className="text-muted-foreground" /> Depuis la bibliothèque
                           </button>
                           {peutGenerer && (
                             <button
                               onClick={() => { const lignes = genererLignes(); if (lignes.length > 0) set('lignes', lignes); setShowAjouterMenu(false); }}
                               className="w-full flex items-center gap-2 px-3 py-2 text-sm hover:bg-muted transition-colors text-left"
                             >
                               <Sparkles size={14} className="text-primary" /> Générer depuis l'événement
                             </button>
                           )}
                         </div>
                       </>
                     )}
                   </div>
                 </div>
                 <DevisLignesEditor
                   lignes={form.lignes || []}
                   onChange={l => set('lignes', l)}
                   options={options}
                   modeSaisie={modeSaisie}
                   disabled={isLocked}
                 />
               </div>

              {/* Totaux */}
              <DevisTotaux
                lignes={form.lignes || []}
                remiseGlobale={form.remise_globale || 0}
                remiseGlobaleType={form.remise_globale_type || 'pct'}
                onRemiseChange={(k, v) => set(k, v)}
                modeSaisie={modeSaisie}
              />

              {/* Conditions */}
              <div>
                <label className="text-xs font-semibold uppercase tracking-wider text-muted-foreground mb-2 block">Conditions de paiement</label>
                <textarea
                  value={form.conditions_paiement || ''}
                  onChange={e => set('conditions_paiement', e.target.value)}
                  rows={3}
                  disabled={isLocked}
                  className="flex w-full rounded-md border border-input bg-transparent px-3 py-2 text-sm shadow-sm resize-none focus-visible:outline-none focus-visible:ring-1 focus-visible:ring-ring disabled:opacity-60 disabled:cursor-not-allowed"
                  placeholder="Conditions de paiement…"
                />
              </div>

              {/* Notes */}
              <div>
                <label className="text-xs font-semibold uppercase tracking-wider text-muted-foreground mb-2 block">Notes internes</label>
                <textarea
                  value={form.notes || ''}
                  onChange={e => set('notes', e.target.value)}
                  rows={2}
                  disabled={isLocked}
                  className="flex w-full rounded-md border border-input bg-transparent px-3 py-2 text-sm shadow-sm resize-none focus-visible:outline-none focus-visible:ring-1 focus-visible:ring-ring disabled:opacity-60 disabled:cursor-not-allowed"
                  placeholder="Notes internes…"
                />
              </div>
            </div>
          )}

          {tab === 'echeances' && (
            form.id
              ? <EcheancesPanel devisId={form.id} evenementId={form.evenement_id} totalTTC={totalTTC} disabled={isLocked} />
              : <div className="flex items-center justify-center h-32 text-sm text-muted-foreground">Enregistrez le document pour gérer les échéances.</div>
          )}
        </div>
      </div>

      {/* Popup aperçu email avant envoi */}
      {showEmailPreview && emailPreview && (
        <DevisEmailPreviewModal
          emailPreview={emailPreview}
          signature={company?.email_signature ? interpolateTemplate(company.email_signature, {
            company_name: company?.company_name || '',
            email_contact: company?.email_contact || '',
            telephone: company?.telephone || '',
            site_web: company?.site_web || '',
          }) : ''}
          clientEmail={form.client_email}
          onSend={(subject, body) => {
            setPendingEmailSend({ subject, body });
            setShowEmailPreview(false);
            setSending(true);
            doEnvoyer();
          }}
          onCancel={() => {
            setShowEmailPreview(false);
            setPendingEmailSend(null);
          }}
          sending={sending}
        />
      )}

      {/* Modale de confirmation envoi document officiel */}
      {showConfirmLock && (
        <div className="fixed inset-0 z-[60] flex items-center justify-center bg-black/50 backdrop-blur-sm p-4">
          <div className="bg-card rounded-2xl border border-border shadow-2xl w-full max-w-md p-6 space-y-4">
            <div className="flex items-start gap-3">
              <span className="text-2xl">⚠️</span>
              <div>
                <h3 className="font-bold text-base">Confirmer l'envoi du document officiel</h3>
                <p className="text-sm text-muted-foreground mt-2">
                  Conformément à la réglementation française sur la facturation électronique, ce document ({form.type_document}) <strong>ne pourra plus être modifié après envoi</strong>.
                </p>
                <p className="text-sm text-muted-foreground mt-2">
                  Cette action est <strong>irréversible</strong>. Si une correction est nécessaire ultérieurement, vous devrez émettre un avoir.
                </p>
              </div>
            </div>
            <div className="flex gap-3 justify-end">
              <Button variant="outline" onClick={() => setShowConfirmLock(false)}>Annuler</Button>
              <Button onClick={confirmAndSend} disabled={sending}>
                <Send size={14} /> Confirmer et envoyer
              </Button>
            </div>
          </div>
        </div>
      )}

      {/* Modal Options & Prestations */}
      {showOptionsModal && (
        <OptionsPrestationsModal
          onAdd={(newLigne) => {
            set('lignes', [...(form.lignes || []), newLigne]);
          }}
          onClose={() => setShowOptionsModal(false)}
        />
      )}

      {/* Modal de finalisation pro forma → facture définitive */}
      {showFinaliserModal && (
        <div className="fixed inset-0 z-[60] flex items-center justify-center bg-black/50 backdrop-blur-sm p-4">
          <div className="bg-card rounded-2xl border border-border shadow-2xl w-full max-w-md p-6 space-y-4">
            <div className="flex items-start gap-3">
              <span className="text-2xl shrink-0">🔒</span>
              <div className="flex-1">
                <h3 className="font-bold text-base">Finaliser la facture</h3>
                <p className="text-sm text-muted-foreground mt-2">
                  Cette action attribue le numéro définitif à votre <strong>{form.type_document}</strong>, verrouille son contenu et la rend officielle.
                </p>
                <p className="text-sm text-muted-foreground mt-2">
                  Le numéro provisoire <strong>{form.numero_provisoire}</strong> sera remplacé par le numéro définitif.
                </p>
              </div>
            </div>
            <div>
              <label className="text-xs font-semibold uppercase tracking-wider text-muted-foreground mb-1 block">Date de facturation</label>
              <Input
                type="date"
                value={finalisationDate}
                onChange={e => setFinalisationDate(e.target.value)}
                className="h-9 text-sm"
              />
              {finalisationError && (
                <p className="text-xs text-destructive mt-1">{finalisationError}</p>
              )}
            </div>
            <div className="flex gap-3 justify-end">
              <Button variant="outline" onClick={() => setShowFinaliserModal(false)}>Annuler</Button>
              <Button onClick={handleFinaliser} disabled={finalising || !finalisationDate}>
                <Lock size={14} /> {finalising ? 'Finalisation…' : 'Finaliser'}
              </Button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}