import { useState, useEffect } from 'react';
import { useQueryClient } from '@tanstack/react-query';
import { base44 } from '@/api/base44Client';
import { Upload, Clock, X, CheckCircle, AlertCircle, Ban } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { toast } from 'sonner';
import YousignSignButton from '@/components/juridique/YousignSignButton';

const DELAIS = [
  { label: '7 jours', value: 7 },
  { label: '14 jours', value: 14 },
  { label: '21 jours', value: 21 },
  { label: '30 jours', value: 30 },
  { label: 'Personnalisé', value: 'custom' },
];

const TYPES_VERSEMENT = ['Arrhes', 'Acompte', 'Autre'];

const STATUT_CONFIG = {
  'En attente': { color: 'bg-amber-100 text-amber-700 border-amber-200', icon: Clock, label: 'En attente de signature' },
  'Signé':      { color: 'bg-emerald-100 text-emerald-700 border-emerald-200', icon: CheckCircle, label: 'Contrat signé' },
  'Expiré':     { color: 'bg-red-100 text-red-700 border-red-200', icon: AlertCircle, label: 'Expirée' },
  'Annulé':     { color: 'bg-slate-100 text-slate-600 border-slate-200', icon: Ban, label: 'Annulée' },
};

function jRestants(dateStr) {
  if (!dateStr) return null;
  const diff = Math.ceil((new Date(dateStr) - new Date()) / (1000 * 60 * 60 * 24));
  return diff;
}

export default function PreReservationPanel({ prospect, prospectPortalUrl, datePrefill = null, onPreResaCreated = null, onPreResaChange = null, onSignatureConfirmed = null }) {
  const qc = useQueryClient();
  const [preResa, setPreResa] = useState(null);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [uploading, setUploading] = useState(false);
  const [confirmAnnuler, setConfirmAnnuler] = useState(false);
  const [signatureMsg, setSignatureMsg] = useState(null); // ProspectMessage CONTRAT_SIGNE
  const [confirmingSignature, setConfirmingSignature] = useState(false);

  const [delaiSelect, setDelaiSelect] = useState(14);
  const [delaiCustom, setDelaiCustom] = useState('');
  const [form, setForm] = useState({
    date_evenement: datePrefill || prospect?.date_evenement_souhaitee || '',
    type_versement: 'Acompte',
    montant_versement: '',
    conditions_annulation: '',
    conditions_texte: '',
    contrat_url: '',
    contrat_nom: '',
  });

  const set = (k, v) => setForm(f => ({ ...f, [k]: v }));

  const load = async () => {
    setLoading(true);
    const [resaList, msgs] = await Promise.all([
      base44.entities.PreReservation.filter({ prospect_id: prospect.id }, '-created_date', 1),
      base44.entities.ProspectMessage.filter({ prospect_id: prospect.id, auteur: 'prospect' }),
    ]);
    const resa = resaList[0] || null;
    setPreResa(resa);
    setSignatureMsg(msgs.find(m => m.message?.startsWith('CONTRAT_SIGNE:')) || null);
    setLoading(false);
    if (onPreResaChange) onPreResaChange(resa);
  };

  useEffect(() => { load(); }, [prospect.id]);

  const getExpireDate = () => {
    const jours = delaiSelect === 'custom' ? parseInt(delaiCustom) || 14 : delaiSelect;
    const d = new Date();
    d.setDate(d.getDate() + jours);
    return d.toISOString().split('T')[0];
  };

  const handleUpload = async (file) => {
    setUploading(true);
    const { file_url } = await base44.integrations.Core.UploadFile({ file });
    set('contrat_url', file_url);
    set('contrat_nom', file.name);
    setUploading(false);
    toast.success('Contrat uploadé');
  };

  const handleCreer = async () => {
    setSaving(true);
    try {
      const jours = delaiSelect === 'custom' ? parseInt(delaiCustom) || 14 : delaiSelect;
      const expire_le = getExpireDate();

      const data = {
        prospect_id: prospect.id,
        prospect_nom: `${prospect.prenom} ${prospect.nom}`,
        prospect_email: prospect.email || '',
        date_evenement: form.date_evenement || null,
        type_evenement: prospect.type_evenement || '',
        nb_invites: prospect.nb_invites_estime || null,
        formule_nom: prospect.formule_nom || '',
        type_versement: form.type_versement,
        montant_versement: form.montant_versement ? parseFloat(form.montant_versement) : null,
        conditions_annulation: form.conditions_annulation || null,
        conditions_texte: form.conditions_texte || null,
        contrat_url: form.contrat_url || null,
        contrat_nom: form.contrat_nom || null,
        expire_le,
        delai_jours: jours,
        statut: 'En attente',
      };

      await base44.entities.PreReservation.create(data);

      // Notif admin
      await base44.functions.invoke('createNotification', {
        titre: `🔐 Pré-réservation créée pour ${data.prospect_nom}`,
        message: `Expire le ${new Date(expire_le).toLocaleDateString('fr-FR')}`,
        type: 'info',
        lien: '/Prospects',
      });

      // Email au prospect
      if (prospect.email) {
        const expireLabel = new Date(expire_le).toLocaleDateString('fr-FR', { day: 'numeric', month: 'long', year: 'numeric' });
        const dateEvtLabel = form.date_evenement
          ? new Date(form.date_evenement).toLocaleDateString('fr-FR', { weekday: 'long', day: 'numeric', month: 'long', year: 'numeric' })
          : null;
        await base44.integrations.Core.SendEmail({
          to: prospect.email,
          subject: 'Votre pré-réservation est prête',
          body: `<p>Bonjour ${prospect.prenom || ''},</p><p>🔐 Votre pré-réservation est maintenant disponible.</p>${dateEvtLabel ? `<p>📅 Date de l'événement : <strong>${dateEvtLabel}</strong></p>` : ''}${form.montant_versement ? `<p>💶 ${form.type_versement || 'Versement'} demandé : <strong>${parseFloat(form.montant_versement).toLocaleString('fr-FR')} €</strong></p>` : ''}<p>⏳ À signer avant le <strong>${expireLabel}</strong></p>${prospectPortalUrl ? `<p><a href="${prospectPortalUrl}" style="display:inline-block;padding:10px 20px;background:#1e40af;color:white;text-decoration:none;border-radius:8px;font-weight:600;">Accéder à mon espace →</a></p>` : ''}<p>Cordialement</p>`,
        });
      }

      await load();
      qc.invalidateQueries(['prereservations']);
      if (onPreResaCreated) await onPreResaCreated();
      toast.success('Pré-réservation créée');
    } catch (err) {
      toast.error(`Erreur : ${err?.message || 'Une erreur est survenue'}`);
    } finally {
      setSaving(false);
    }
  };

  const handleAnnuler = async () => {
    await base44.entities.PreReservation.update(preResa.id, { statut: 'Annulé' });
    await load();
    setConfirmAnnuler(false);
    toast.success('Pré-réservation annulée');
  };

  const handleConfirmerSignature = async () => {
    setConfirmingSignature(true);
    try {
      const prospectFrais = await base44.entities.Prospect.filter({ id: prospect.id }).then(r => r[0]);
      if (prospectFrais?.converti) {
        toast.error('Ce prospect est déjà converti en client.');
        return;
      }

      const dateSignature = new Date().toISOString().split('T')[0];

      // 1. Marquer la pré-réservation comme signée
      await base44.entities.PreReservation.update(preResa.id, {
        statut: 'Signé',
        date_signature: dateSignature,
        admin_confirmed_payment: true,
        admin_confirmed_date: new Date().toISOString(),
      });

      // 2. Archiver le contrat de pré-réservation (si uploadé)
      if (preResa.contrat_url) {
        await base44.entities.ClientDocument.create({
          client_id: prospectFrais?.client_id || null,
          prospect_id: prospect.id,
          nom: 'Contrat de réservation',
          type_document: 'Contrat',
          file_url: preResa.contrat_url,
        });
      }

      // 3. Notification admin
      await base44.functions.invoke('createNotification', {
        titre: `✅ Signature confirmée — ${prospect.prenom} ${prospect.nom}`,
        message: `La pré-réservation de ${prospect.prenom} ${prospect.nom} est signée. Finalisez la conversion en client.`,
        type: 'info',
        lien: '/Clients',
      });

      qc.invalidateQueries(['prospects']);
      qc.invalidateQueries(['prereservations']);
      await load();
      toast.success('Signature confirmée. Vous pouvez maintenant convertir le prospect en client.');

      // 4. Déléguer la conversion réelle à ConvertirProspectModal (chemin canonique)
      if (onSignatureConfirmed) onSignatureConfirmed();
    } catch (err) {
      toast.error(`Erreur : ${err?.message || 'Une erreur est survenue'}`);
    } finally {
      setConfirmingSignature(false);
    }
  };

  if (loading) {
    return (
      <div className="flex items-center justify-center py-10">
        <div className="w-6 h-6 border-2 border-border border-t-primary rounded-full animate-spin" />
      </div>
    );
  }

  // ── Vue : pré-résa existante ────────────────────────────────────
  if (preResa && preResa.statut !== 'Annulé') {
    const cfg = STATUT_CONFIG[preResa.statut] || STATUT_CONFIG['En attente'];
    const Icon = cfg.icon;
    const jR = jRestants(preResa.expire_le);

    return (
      <div className="space-y-4">
        {/* Statut */}
        <div className={`flex items-center gap-2 px-3 py-2 rounded-xl border text-sm font-medium ${cfg.color}`}>
          <Icon size={15} /> {cfg.label}
        </div>

        {/* Countdown expiration */}
        {preResa.statut === 'En attente' && preResa.expire_le && (
          <div className={`text-xs px-3 py-2 rounded-xl border font-medium ${jR !== null && jR <= 3 ? 'bg-red-50 border-red-200 text-red-700' : 'bg-muted/50 border-border text-muted-foreground'}`}>
            {jR === null ? '' : jR > 0 ? `⏱️ Expire dans ${jR} jour${jR > 1 ? 's' : ''} · ${new Date(preResa.expire_le).toLocaleDateString('fr-FR')}` : jR === 0 ? '⚠️ Expire aujourd\'hui !' : `🔴 Expirée depuis ${Math.abs(jR)} jour${Math.abs(jR) > 1 ? 's' : ''}`}
          </div>
        )}

        {/* Détails */}
        <div className="bg-muted/40 rounded-xl border border-border p-4 space-y-2 text-sm">
          {preResa.date_evenement && (
            <div className="flex justify-between">
              <span className="text-muted-foreground text-xs">Date événement</span>
              <span className="font-medium text-xs">{new Date(preResa.date_evenement).toLocaleDateString('fr-FR', { day: 'numeric', month: 'long', year: 'numeric' })}</span>
            </div>
          )}
          {preResa.formule_nom && (
            <div className="flex justify-between">
              <span className="text-muted-foreground text-xs">Formule</span>
              <span className="font-medium text-xs">{preResa.formule_nom}</span>
            </div>
          )}
          {preResa.montant_versement && (
            <div className="flex justify-between">
              <span className="text-muted-foreground text-xs">{preResa.type_versement || 'Versement'}</span>
              <span className="font-medium text-xs">{preResa.montant_versement.toLocaleString('fr-FR')} €</span>
            </div>
          )}
          {preResa.date_signature && (
            <div className="flex justify-between">
              <span className="text-muted-foreground text-xs">Signé le</span>
              <span className="font-medium text-xs text-emerald-700">{new Date(preResa.date_signature).toLocaleDateString('fr-FR')}</span>
            </div>
          )}
        </div>

        {/* Contrat signé */}
        {preResa.contrat_signe_url && (
          <a
            href={preResa.contrat_signe_url}
            target="_blank"
            rel="noopener noreferrer"
            className="flex items-center gap-2 text-xs text-primary hover:underline px-3 py-2 bg-primary/5 rounded-xl border border-primary/20"
          >
            📥 Télécharger le contrat signé
          </a>
        )}

        {/* Conditions */}
        {preResa.conditions_texte && (
          <div className="text-xs text-muted-foreground bg-muted/30 rounded-xl p-3 border border-border whitespace-pre-wrap">
            {preResa.conditions_texte}
          </div>
        )}

        {/* Bandeau signature déclarée par le prospect + bouton de confirmation */}
        {preResa.statut === 'En attente' && signatureMsg && (
          <div className="bg-emerald-50 border border-emerald-300 rounded-xl p-3 space-y-2">
            <p className="text-xs font-semibold text-emerald-800">🖊️ Le prospect a déclaré avoir signé son contrat</p>
            <p className="text-[11px] text-emerald-700">
              Déclaré le {new Date(signatureMsg.created_date).toLocaleDateString('fr-FR', { day: 'numeric', month: 'long', year: 'numeric' })}
            </p>
            <Button
              size="sm"
              onClick={handleConfirmerSignature}
              disabled={confirmingSignature}
              className="w-full gap-2 bg-emerald-600 hover:bg-emerald-700 text-white text-xs"
            >
              {confirmingSignature ? (
                <div className="w-3.5 h-3.5 border-2 border-white border-t-transparent rounded-full animate-spin" />
              ) : '✅'}
              Confirmer la signature et convertir en client
            </Button>
          </div>
        )}

        {/* Signature électronique — remplace le collage manuel de lien YouSign */}
        {preResa.statut === 'En attente' && (
          <div>
            {preResa.yousign_sign_url ? (
              <div className="flex items-center gap-2 px-3 py-2 rounded-xl border border-violet-200 bg-violet-50 text-violet-700 text-xs font-medium">
                <CheckCircle size={14} /> Signature électronique envoyée au prospect
              </div>
            ) : preResa.contrat_url ? (
              <YousignSignButton
                preReservationId={preResa.id}
                label="Demander signature électronique"
                onSuccess={() => load()}
              />
            ) : (
              <p className="text-[10px] text-muted-foreground bg-muted/30 rounded-lg px-3 py-2 border border-dashed border-border">
                Aucun document à signer. Ajoutez un contrat PDF lors de la création de la pré-réservation.
              </p>
            )}
          </div>
        )}

        {/* Annuler */}
        {preResa.statut === 'En attente' && (
          confirmAnnuler ? (
            <div className="bg-red-50 border border-red-200 rounded-xl p-3 space-y-2">
              <p className="text-xs text-red-700 font-medium">Confirmer l'annulation ?</p>
              <div className="flex gap-2">
                <Button size="sm" variant="outline" onClick={() => setConfirmAnnuler(false)} className="text-xs h-7">Non</Button>
                <Button size="sm" onClick={handleAnnuler} className="text-xs h-7 bg-red-600 hover:bg-red-700 text-white">Oui, annuler</Button>
              </div>
            </div>
          ) : (
            <button
              onClick={() => setConfirmAnnuler(true)}
              className="flex items-center gap-1.5 text-xs text-red-500 hover:text-red-700 hover:bg-red-50 px-3 py-2 rounded-lg transition-colors"
            >
              <X size={12} /> Annuler la pré-réservation
            </button>
          )
        )}
      </div>
    );
  }

  // ── Vue : formulaire de création ────────────────────────────────
  return (
    <div className="space-y-4">
      {preResa?.statut === 'Annulé' && (
        <div className="text-xs text-muted-foreground bg-muted/30 rounded-xl px-3 py-2 border border-border">
          La précédente pré-réservation a été annulée. Vous pouvez en créer une nouvelle.
        </div>
      )}

      {/* Date événement */}
      <div>
        <label className="text-xs font-medium text-muted-foreground mb-1 block">Date de l'événement</label>
        <Input type="date" value={form.date_evenement} onChange={e => set('date_evenement', e.target.value)} />
      </div>

      {/* Délai expiration */}
      <div>
        <label className="text-xs font-medium text-muted-foreground mb-1 block">Délai pour signer</label>
        <div className="flex flex-wrap gap-1.5">
          {DELAIS.map(d => (
            <button
              key={d.value}
              type="button"
              onClick={() => setDelaiSelect(d.value)}
              className={`text-xs px-3 py-1 rounded-full border font-medium transition-colors ${delaiSelect === d.value ? 'bg-primary text-primary-foreground border-primary' : 'bg-card border-border text-muted-foreground hover:bg-muted'}`}
            >
              {d.label}
            </button>
          ))}
        </div>
        {delaiSelect === 'custom' && (
          <div className="mt-2 flex items-center gap-2">
            <Input
              type="number"
              value={delaiCustom}
              onChange={e => setDelaiCustom(e.target.value)}
              placeholder="Nombre de jours"
              className="w-40"
              min="1"
            />
            <span className="text-xs text-muted-foreground">jours</span>
          </div>
        )}
        {delaiSelect !== 'custom' && (
          <p className="text-xs text-muted-foreground mt-1">
            Expire le : <strong>{new Date(getExpireDate()).toLocaleDateString('fr-FR', { day: 'numeric', month: 'long', year: 'numeric' })}</strong>
          </p>
        )}
      </div>

      {/* Type + montant versement */}
      <div className="grid grid-cols-2 gap-3">
        <div>
          <label className="text-xs font-medium text-muted-foreground mb-1 block">Type de versement</label>
          <select
            value={form.type_versement}
            onChange={e => set('type_versement', e.target.value)}
            className="flex h-9 w-full rounded-md border border-input bg-transparent px-3 py-1 text-sm shadow-sm focus-visible:outline-none focus-visible:ring-1 focus-visible:ring-ring"
          >
            {TYPES_VERSEMENT.map(t => <option key={t} value={t}>{t}</option>)}
          </select>
        </div>
        <div>
          <label className="text-xs font-medium text-muted-foreground mb-1 block">Montant (€)</label>
          <Input
            type="number"
            value={form.montant_versement}
            onChange={e => set('montant_versement', e.target.value)}
            placeholder="500"
            min="0"
          />
        </div>
      </div>

      {/* Conditions annulation */}
      <div>
        <label className="text-xs font-medium text-muted-foreground mb-1 block">Conditions d'annulation</label>
        <textarea
          value={form.conditions_annulation}
          onChange={e => set('conditions_annulation', e.target.value)}
          rows={2}
          placeholder="Ex : Arrhes non remboursables en cas d'annulation…"
          className="flex w-full rounded-md border border-input bg-transparent px-3 py-2 text-sm shadow-sm resize-none focus-visible:outline-none focus-visible:ring-1 focus-visible:ring-ring placeholder:text-muted-foreground"
        />
      </div>

      {/* Conditions texte */}
      <div>
        <label className="text-xs font-medium text-muted-foreground mb-1 block">Conditions générales affichées au prospect</label>
        <textarea
          value={form.conditions_texte}
          onChange={e => set('conditions_texte', e.target.value)}
          rows={3}
          placeholder="Détails de la prestation, modalités, informations importantes…"
          className="flex w-full rounded-md border border-input bg-transparent px-3 py-2 text-sm shadow-sm resize-none focus-visible:outline-none focus-visible:ring-1 focus-visible:ring-ring placeholder:text-muted-foreground"
        />
      </div>

      {/* Upload PDF */}
      <div>
        <label className="text-xs font-medium text-muted-foreground mb-1 block">Contrat PDF (optionnel)</label>
        <label className="flex items-center gap-3 cursor-pointer border border-dashed border-border rounded-xl p-3 hover:bg-muted/30 transition-colors">
          <Upload size={16} className="text-muted-foreground shrink-0" />
          <span className="text-xs text-muted-foreground">
            {uploading ? 'Upload en cours…' : form.contrat_nom ? `✓ ${form.contrat_nom}` : 'Cliquer pour uploader un PDF'}
          </span>
          <input
            type="file"
            accept=".pdf"
            className="hidden"
            disabled={uploading}
            onChange={e => e.target.files?.[0] && handleUpload(e.target.files[0])}
          />
        </label>
      </div>

      <Button
        onClick={handleCreer}
        disabled={saving || uploading}
        className="w-full gap-2"
      >
        {saving ? (
          <div className="w-4 h-4 border-2 border-white border-t-transparent rounded-full animate-spin" />
        ) : '🔐'}
        Envoyer pour signature
      </Button>
    </div>
  );
}