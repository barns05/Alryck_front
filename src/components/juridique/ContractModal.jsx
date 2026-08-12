import { useState, useEffect } from 'react';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { base44 } from '@/api/base44Client';
import { X, Sparkles, Loader2, Mail } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { toast } from 'sonner';
import { generateContratPDF } from './generateContratPDF';
import { extractPlaceholders, substituteVariables, buildClientFullName, autoFillValue } from '@/lib/contractModalHelpers';
import DynamicVariablesSection from './DynamicVariablesSection';
import ClientEventSelector from './contract-sections/ClientEventSelector';
import ContractStatusSection from './contract-sections/ContractStatusSection';
import YousignSignButton from './YousignSignButton';

export default function ContractModal({ contrat, onClose, modelePreselection, creationMode, evenementId: propEvenementId, evenementNom: propEvenementNom, prospectId: propProspectId, prospectNom: propProspectNom, prospectEmail: propProspectEmail }) {
  const qc = useQueryClient();
  const [form, setForm] = useState({
    titre: '',
    client_id: '',
    client_nom: '',
    evenement_id: '',
    evenement_nom: '',
    modele_url: '',
    modele_nom: '',
    modele_source_id: '',
    contenu_dynamique: '',
    contrat_signe_url: '',
    contrat_signe_nom: '',
    statut: 'Signé',
    date_signature: '',
    notes: '',
    prospect_id: '',
    prospect_email: '',
    mode_paiement: 'pourcentage',
    echeancier_modele: [],
    paliers_annulation: [],
    taux_tva_modele: null,
    pourcentage_acompte_modele: null,
    base_calcul_acompte_modele: 'TTC',
  });

  const [uploadingModele, setUploadingModele] = useState(false);
  const [uploadingSigne, setUploadingSigne] = useState(false);
  const [variableValues, setVariableValues] = useState({});
  const [autoFilledFields, setAutoFilledFields] = useState(new Set());
  const [generatingPdf, setGeneratingPdf] = useState(false);
  const [sending, setSending] = useState(false);

  const isDynamicModele = !!(modelePreselection?.contenuDynamique);
  const placeholders = isDynamicModele ? extractPlaceholders(modelePreselection.contenuDynamique) : [];
  const modelSettings = isDynamicModele ? {
    modePaiement: modelePreselection?.modePaiement || 'pourcentage',
    tauxTvaModele: modelePreselection?.tauxTvaModele ?? null,
    pourcentageAcompteModele: modelePreselection?.pourcentageAcompteModele ?? null,
    baseCalculAcompteModele: modelePreselection?.baseCalculAcompteModele ?? 'TTC',
    paliersAnnulation: modelePreselection?.paliersAnnulation || [],
  } : null;
  const previewText = isDynamicModele
    ? substituteVariables(modelePreselection.contenuDynamique, variableValues)
    : '';

  const { data: clients = [] } = useQuery({
    queryKey: ['clients'],
    queryFn: () => base44.entities.Client.list(),
  });

  const { data: evenements = [] } = useQuery({
    queryKey: ['evenements'],
    queryFn: () => base44.entities.Evenement.list(),
  });

  const { data: company } = useQuery({
    queryKey: ['company-settings-owner'],
    queryFn: () => base44.entities.CompanySettings.list().then(r => r.find(cs => cs.is_owner === true) || null),
    staleTime: 60000,
  });

  const effectiveEvenementId = propEvenementId || form.evenement_id;

  const { data: evenementDevis = [] } = useQuery({
    queryKey: ['evenement-devis-for-contrat', effectiveEvenementId],
    queryFn: () => effectiveEvenementId ? base44.entities.Devis.filter({ evenement_id: effectiveEvenementId }, '-created_date', 50) : [],
    enabled: !!effectiveEvenementId,
    staleTime: 60000,
  });

  const acceptedDevis = evenementDevis.find(d => d.statut === 'Accepté') || null;
  const selectedClient = clients.find(c => c.id === form.client_id);

  useEffect(() => {
    if (contrat) {
      setForm(contrat);
    } else {
      setForm(f => ({
        ...f,
        evenement_id: propEvenementId || f.evenement_id || '',
        evenement_nom: propEvenementNom || f.evenement_nom || '',
        prospect_id: propProspectId || '',
        prospect_email: propProspectEmail || '',
        client_nom: propProspectNom || f.client_nom || '',
        statut: creationMode === 'a_signer' ? 'En attente de signature' : 'Signé',
        ...(modelePreselection ? {
          modele_url: modelePreselection.modeleUrl || '',
          modele_source_id: modelePreselection.modeleId || '',
          contenu_dynamique: modelePreselection.contenuDynamique || '',
          mode_paiement: modelePreselection.modePaiement || 'pourcentage',
          taux_tva_modele: modelePreselection.tauxTvaModele ?? null,
          pourcentage_acompte_modele: modelePreselection.pourcentageAcompteModele ?? null,
          base_calcul_acompte_modele: modelePreselection.baseCalculAcompteModele ?? 'TTC',
          paliers_annulation: modelePreselection.paliersAnnulation || [],
          echeancier_modele: modelePreselection.echeancierModele || [],
        } : {}),
      }));
      // Initialiser les valeurs des placeholders avec auto-fill
      if (modelePreselection?.contenuDynamique) {
        const phs = extractPlaceholders(modelePreselection.contenuDynamique);
        const initial = {};
        phs.forEach(ph => { initial[ph] = ''; });
        setVariableValues(initial);
        setAutoFilledFields(new Set());
      }
    }
  }, [contrat, modelePreselection, propEvenementId, propEvenementNom]);

  // Auto-sélection du client quand l'événement est fourni (création depuis fiche événement)
  useEffect(() => {
    if (contrat || !propEvenementId || form.client_id) return;
    const evt = evenements.find(e => e.id === propEvenementId);
    if (!evt?.client_id) return;
    const linkedClient = clients.find(c => c.id === evt.client_id);
    if (!linkedClient) return;
    setForm(f => ({
      ...f,
      client_id: linkedClient.id,
      client_nom: buildClientFullName(linkedClient),
    }));
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [propEvenementId, evenements, clients, contrat]);

  // Titre du contrat suggéré (ne pas écraser une saisie manuelle)
  useEffect(() => {
    if (contrat) return;
    setForm(f => {
      if (f.titre) return f;
      if (f.evenement_nom) return { ...f, titre: `Contrat — ${f.evenement_nom}` };
      if (f.client_nom) return { ...f, titre: `Contrat — ${f.client_nom}` };
      return f;
    });
  }, [form.evenement_nom, form.client_nom, contrat]);

  // Auto-fill des variables quand le client/événement/company changent
  useEffect(() => {
    if (!isDynamicModele) return;
    const selectedClient = clients.find(c => c.id === form.client_id);
    const selectedEvent = evenements.find(e => e.id === form.evenement_id);

    const newValues = { ...variableValues };
    const newAutoFilled = new Set();
    let changed = false;

    // Champs calculés par l'effet de calcul dédié — ne pas gérer ici
    const CALCULATED = ['MONTANT_TVA', 'MONTANT_TTC', 'MONTANT_ACOMPTE', 'MONTANT_SOLDE'];

    placeholders.forEach(ph => {
      if (CALCULATED.includes(ph)) return;
      const isAutoFilled = autoFilledFields.has(ph);
      const hasManualValue = !!(variableValues[ph] || '');

      // Ne pas écraser les champs modifiés manuellement par l'utilisateur
      if (hasManualValue && !isAutoFilled) return;

      const auto = autoFillValue(ph, { form, client: selectedClient, evenement: selectedEvent, company, modelSettings, acceptedDevis });
      if (auto) {
        if (newValues[ph] !== auto) { newValues[ph] = auto; changed = true; }
        newAutoFilled.add(ph);
      } else if (isAutoFilled) {
        // La source n'a plus de valeur (ex: client désélectionné) → vider
        newValues[ph] = ''; changed = true;
      }
    });

    if (changed) {
      setVariableValues(newValues);
      setAutoFilledFields(newAutoFilled);
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [form.client_id, form.evenement_id, company, acceptedDevis, clients, evenements]);

  // ─── Calcul automatique des montants dérivés (Mode A uniquement) ──────────
  // MONTANT_HT (saisi par client) × TAUX_TVA (fixé par modèle) → TVA, TTC
  // TTC × POURCENTAGE_ACOMPTE (fixé par modèle) → acompte, solde
  useEffect(() => {
    if (!isDynamicModele || modelSettings?.modePaiement !== 'pourcentage') return;
    const ht = parseFloat(variableValues['MONTANT_HT']) || 0;
    const tvaRate = parseFloat(variableValues['TAUX_TVA']) || 0;
    const pct = parseFloat(variableValues['POURCENTAGE_ACOMPTE']) || 0;
    const tva = ht * tvaRate / 100;
    const ttc = ht + tva;
    const base = modelSettings?.baseCalculAcompteModele === 'HT' ? ht : ttc;
    const acompte = base * pct / 100;
    const solde = ttc - acompte;
    const derivations = {
      MONTANT_TVA: tva.toFixed(2),
      MONTANT_TTC: ttc.toFixed(2),
      MONTANT_ACOMPTE: acompte.toFixed(2),
      MONTANT_SOLDE: solde.toFixed(2),
    };
    setVariableValues(prev => {
      const updated = { ...prev };
      let changed = false;
      for (const [key, val] of Object.entries(derivations)) {
        if (placeholders.includes(key) && prev[key] !== val) {
          updated[key] = val;
          changed = true;
        }
      }
      return changed ? updated : prev;
    });
    setAutoFilledFields(prev => {
      const s = new Set(prev);
      let added = false;
      Object.keys(derivations).forEach(key => {
        if (placeholders.includes(key) && !s.has(key)) { s.add(key); added = true; }
      });
      return added ? s : prev;
    });
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [variableValues['MONTANT_HT'], variableValues['TAUX_TVA'], variableValues['POURCENTAGE_ACOMPTE'], isDynamicModele, modelSettings?.modePaiement]);

  const saveMutation = useMutation({
    mutationFn: async () => {
      if (contrat?.id) {
        return base44.entities.Contrat.update(contrat.id, form);
      }

      let payload = { ...form, prestataire_id: company?.prestataire_id || null };
      if (propProspectId) {
        payload.prospect_id = propProspectId;
        payload.prospect_email = propProspectEmail || '';
        payload.client_nom = form.client_nom || propProspectNom || '';
      }

      // Modèle dynamique : substituer les variables → générer PDF → uploader
      if (isDynamicModele) {
        setGeneratingPdf(true);
        try {
          const substitutedText = substituteVariables(modelePreselection.contenuDynamique, variableValues);
          const doc = generateContratPDF({
            bodyText: substitutedText,
            company,
            titreModele: form.titre,
            fields: {},
          });
          const pdfBlob = doc.output('blob');
          const fileName = `contrat-${(form.client_nom || 'client').replace(/[^a-zA-Z0-9-_]/g, '_')}.pdf`;
          const pdfFile = new File([pdfBlob], fileName, { type: 'application/pdf' });
          const { file_url } = await base44.integrations.Core.UploadFile({ file: pdfFile });
          payload.modele_url = file_url;
          payload.modele_nom = fileName;
        } finally {
          setGeneratingPdf(false);
        }
      }

      return base44.entities.Contrat.create(payload);
    },
    onSuccess: () => {
      qc.invalidateQueries(['contrats']);
      qc.invalidateQueries(['contrats-evenement']);
      qc.invalidateQueries(['client-contrats']);
      qc.invalidateQueries(['outils-contrats-ev']);
      toast.success(contrat ? 'Contrat mis à jour' : 'Contrat créé');
      onClose();
    },
  });

  const handleFileUpload = async (file, type) => {
    if (type === 'modele') setUploadingModele(true);
    else setUploadingSigne(true);

    try {
      const { file_url } = await base44.integrations.Core.UploadFile({ file });
      if (type === 'modele') {
        setForm(f => ({ ...f, modele_url: file_url, modele_nom: file.name }));
      } else {
        setForm(f => ({ ...f, contrat_signe_url: file_url, contrat_signe_nom: file.name }));
      }
      toast.success('Fichier uploadé');
    } catch (e) {
      toast.error('Erreur lors du upload');
    } finally {
      if (type === 'modele') setUploadingModele(false);
      else setUploadingSigne(false);
    }
  };

  const isSaving = saveMutation.isPending || generatingPdf;

  const handleSendToClient = async () => {
    const emails = propProspectEmail
      ? [propProspectEmail]
      : [...new Set([selectedClient?.email, selectedClient?.email2].filter(Boolean))];
    if (emails.length === 0) {
      toast.error("Aucun email associé à ce client.");
      return;
    }
    setSending(true);
    try {
      const results = await Promise.allSettled(
        emails.map(email =>
          base44.integrations.Core.SendEmail({
            to: email,
            subject: `Contrat disponible : ${form.titre}`,
            body: `<p>Bonjour,</p><p>Votre contrat <strong>${form.titre}</strong> est désormais disponible dans votre espace client.</p><p>Connectez-vous à votre espace pour le consulter.</p>`,
          })
        )
      );
      if (results.every(r => r.status === 'rejected')) {
        throw new Error('ALL_FAILED');
      }
      const succeeded = results.filter(r => r.status === 'fulfilled').length;
      toast.success(`Contrat envoyé${emails.length > 1 ? ` à ${succeeded} destinataire${succeeded > 1 ? 's' : ''}` : ' au client'}.`);
    } catch (e) {
      toast.info("Le contrat est visible dans l'espace client. Le client n'est pas enregistré sur la plateforme pour recevoir un email.");
    } finally {
      setSending(false);
    }
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/40 backdrop-blur-sm p-4">
      <div className="bg-card rounded-2xl border border-border shadow-2xl w-full max-w-2xl max-h-[90vh] flex flex-col">
        {/* Header */}
        <div className="px-6 py-4 border-b border-border flex items-center justify-between shrink-0">
          <div className="flex items-center gap-2">
            {isDynamicModele && (
              <div className="w-8 h-8 rounded-lg bg-violet-100 flex items-center justify-center">
                <Sparkles size={16} className="text-violet-700" />
              </div>
            )}
            <h3 className="font-semibold text-base">{contrat ? 'Modifier le contrat' : isDynamicModele ? 'Contrat depuis modèle dynamique' : 'Nouveau contrat'}</h3>
          </div>
          <button onClick={onClose} className="p-1.5 rounded-lg hover:bg-muted text-muted-foreground">
            <X size={18} />
          </button>
        </div>

        {/* Contenu */}
        <div className="flex-1 overflow-y-auto px-6 py-4 space-y-4">
          <div>
            <label className="text-xs font-semibold uppercase tracking-wider text-muted-foreground block mb-2">Titre du contrat *</label>
            <Input
              value={form.titre}
              onChange={e => setForm(f => ({ ...f, titre: e.target.value }))}
              placeholder="Ex: Contrat de prestation événement"
              className="h-9 text-sm"
              autoComplete="off"
              autoCorrect="off"
              spellCheck={false}
            />
          </div>

          <ClientEventSelector
            form={form}
            setForm={setForm}
            clients={clients}
            evenements={evenements}
            propProspectId={propProspectId}
            propProspectNom={propProspectNom}
            propEvenementId={propEvenementId}
          />

          {/* Section modèle dynamique — variables + aperçu (règle D : substitution + relecture) */}
          {isDynamicModele && (
            <DynamicVariablesSection
              placeholders={placeholders}
              variableValues={variableValues}
              setVariableValues={setVariableValues}
              autoFilledFields={autoFilledFields}
              setAutoFilledFields={setAutoFilledFields}
              previewText={previewText}
            />
          )}

          <ContractStatusSection
            form={form}
            setForm={setForm}
            contrat={contrat}
            creationMode={creationMode}
            isDynamicModele={isDynamicModele}
            onFileUpload={handleFileUpload}
            uploadingModele={uploadingModele}
            uploadingSigne={uploadingSigne}
          />

          <div>
            <label className="text-xs font-semibold uppercase tracking-wider text-muted-foreground block mb-2">Notes</label>
            <textarea
              value={form.notes}
              onChange={e => setForm(f => ({ ...f, notes: e.target.value }))}
              rows={3}
              className="flex w-full rounded-md border border-input bg-transparent px-3 py-2 text-sm text-foreground shadow-sm resize-none focus-visible:outline-none focus-visible:ring-1 focus-visible:ring-ring"
              placeholder="Notes internes…"
            />
          </div>
        </div>

        {/* Footer */}
        <div className="px-6 py-4 border-t border-border flex justify-end gap-3 shrink-0">
          <Button variant="outline" onClick={onClose}>
            Annuler
          </Button>
          {contrat && form.modele_url && !form.contrat_signe_url && (
            <YousignSignButton
              contratId={contrat.id}
              onSuccess={() => {
                qc.invalidateQueries(['contrats']);
                qc.invalidateQueries(['contrats-evenement']);
                qc.invalidateQueries(['client-contrats']);
              }}
            />
          )}
          {contrat && form.contrat_signe_url && (
            <span className="text-xs text-emerald-600 font-medium px-2 py-1 flex items-center gap-1">
              ✓ Déjà signé
            </span>
          )}
          {contrat && (
            <Button variant="outline" onClick={handleSendToClient} disabled={sending} className="gap-1.5">
              {sending ? <Loader2 size={14} className="animate-spin" /> : <Mail size={14} />}
              {sending ? 'Envoi…' : 'Envoyer au client'}
            </Button>
          )}
          <Button onClick={() => saveMutation.mutate()} disabled={!form.titre || (!form.client_id && !propProspectId) || isSaving} className="gap-1.5">
            {isSaving && <Loader2 size={14} className="animate-spin" />}
            {isSaving ? 'Génération…' : contrat ? 'Mettre à jour' : 'Créer'}
          </Button>
        </div>
      </div>
    </div>
  );
}