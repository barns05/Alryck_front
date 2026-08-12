import { useState, useEffect, useMemo } from 'react';
import { useQuery, useQueryClient } from '@tanstack/react-query';
import { base44 } from '@/api/base44Client';
import { CheckCircle, AlertCircle, Clock, ExternalLink, Download, CalendarClock } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { toast } from 'sonner';

// ── Libellé lisible d'une date Prospect (modes exacte / mois / période) ─────────
export function formatDateLabel(d) {
  if (!d) return null;
  const dt = d.date_type || 'exacte';
  if (dt === 'periode' && d.date_periode) return d.date_periode;
  if (dt === 'mois' && d.date_mois) {
    const [y, m] = d.date_mois.split('-');
    const yi = parseInt(y, 10), mi = parseInt(m, 10);
    if (!yi || !mi) return null;
    return new Date(yi, mi - 1, 1).toLocaleDateString('fr-FR', { month: 'long', year: 'numeric' });
  }
  if (d.date_evenement_souhaitee) {
    const dt2 = new Date(d.date_evenement_souhaitee);
    if (isNaN(dt2.getTime())) return null;
    return dt2.toLocaleDateString('fr-FR', { day: 'numeric', month: 'long', year: 'numeric' });
  }
  return null;
}

// ── Sélecteur inline de date (3 modes) — affiché quand aucune date n'est connue ─
export function InlineDateSelector({ mode, setMode, exacte, setExacte, mois, setMois, annee, setAnnee, periode, setPeriode }) {
  const MOIS = ['Janvier','Février','Mars','Avril','Mai','Juin','Juillet','Août','Septembre','Octobre','Novembre','Décembre'];
  const anneeCourante = new Date().getFullYear();
  const ANNEES = Array.from({ length: 5 }, (_, i) => anneeCourante + i);
  const segStyle = (active) => `text-xs py-2 rounded-xl border font-medium transition-colors ${active ? 'bg-primary text-primary-foreground border-primary' : 'bg-card border-border text-muted-foreground'}`;
  const inputCls = 'flex h-10 w-full rounded-xl border border-input bg-background px-3 text-sm focus-visible:outline-none focus-visible:ring-1 focus-visible:ring-ring';
  return (
    <div className="space-y-3 bg-muted/30 border border-border rounded-2xl p-4">
      <p className="text-xs font-semibold text-muted-foreground uppercase tracking-wide">📅 Votre date d'événement</p>
      <div className="grid grid-cols-3 gap-1.5">
        {[{id:'exacte',l:'Date précise'},{id:'mois',l:'Mois'},{id:'periode',l:'Période'}].map(o => (
          <button key={o.id} type="button" onClick={() => setMode(o.id)} className={segStyle(mode===o.id)}>{o.l}</button>
        ))}
      </div>
      {mode === 'exacte' && (
        <input type="date" value={exacte} onChange={e=>setExacte(e.target.value)} className={inputCls} style={{ fontSize: '16px' }} />
      )}
      {mode === 'mois' && (
        <div className="grid grid-cols-2 gap-2">
          <select value={mois} onChange={e=>setMois(e.target.value)} className={inputCls} style={{ fontSize: '16px' }}>
            <option value="">Mois</option>
            {MOIS.map((m,i)=><option key={i} value={String(i+1).padStart(2,'0')}>{m}</option>)}
          </select>
          <select value={annee} onChange={e=>setAnnee(e.target.value)} className={inputCls} style={{ fontSize: '16px' }}>
            <option value="">Année</option>
            {ANNEES.map(a=><option key={a} value={String(a)}>{a}</option>)}
          </select>
        </div>
      )}
      {mode === 'periode' && (
        <input type="text" value={periode} onChange={e=>setPeriode(e.target.value)} placeholder="Ex : Été 2027, Printemps 2028…" className={inputCls} style={{ fontSize: '16px' }} />
      )}
    </div>
  );
}

function SignatureDeclarationBlock({ alreadyDeclared, declareSigning, confirming, onDeclare, onCancel, onConfirm }) {
  if (alreadyDeclared) {
    return (
      <div className="flex items-center gap-2 px-4 py-3 bg-emerald-50 border border-emerald-200 rounded-2xl text-emerald-700 text-sm font-medium">
        <CheckCircle size={15} /> Signature déclarée — en attente de confirmation
      </div>
    );
  }
  if (declareSigning) {
    return (
      <div className="bg-emerald-50 border border-emerald-200 rounded-2xl p-4 space-y-3">
        <p className="text-sm font-semibold text-emerald-800">Confirmer votre signature ?</p>
        <p className="text-xs text-emerald-700">En cliquant "Confirmer", vous signalez à votre organisateur que vous avez signé votre contrat. Il devra valider pour finaliser votre réservation.</p>
        <div className="flex gap-2">
          <Button size="sm" variant="outline" onClick={onCancel} className="flex-1 text-xs" disabled={confirming}>Annuler</Button>
          <Button
            size="sm"
            onClick={onConfirm}
            disabled={confirming}
            className="flex-1 text-xs bg-emerald-600 hover:bg-emerald-700 text-white"
          >
            {confirming ? '…' : '✓ Confirmer'}
          </Button>
        </div>
      </div>
    );
  }
  return (
    <button
      onClick={onDeclare}
      className="w-full py-2.5 rounded-2xl border border-emerald-200 bg-emerald-50 text-emerald-700 text-sm font-medium transition-all active:scale-[0.98]"
    >
      ✅ J'ai signé mon contrat
    </button>
  );
}

function jRestants(dateStr) {
  if (!dateStr) return null;
  return Math.ceil((new Date(dateStr) - new Date()) / (1000 * 60 * 60 * 24));
}

export default function ProspectPreReservation({ prospectId, prospectNom }) {
  const [preResa, setPreResa] = useState(null);
  const [loading, setLoading] = useState(true);
  const [declareSigning, setDeclareSigning] = useState(false);
  const [alreadyDeclared, setAlreadyDeclared] = useState(false);
  const [confirming, setConfirming] = useState(false);
  const [demandeEnvoyee, setDemandeEnvoyee] = useState(false);
  const [sending, setSending] = useState(false);
  const qc = useQueryClient();

  // ── Résolution de la date connue du prospect (Prospect + ProspectDateDemande) ──
  const { data: prospect, isLoading: prospectLoading } = useQuery({
    queryKey: ['prospect-preresa', prospectId],
    queryFn: () => base44.entities.Prospect.filter({ id: prospectId }).then(r => r[0] || null),
    enabled: !!prospectId,
  });
  const { data: dateDemandes = [], isLoading: datesLoading } = useQuery({
    queryKey: ['prospect-date-demandes', prospectId],
    queryFn: () => base44.entities.ProspectDateDemande.filter({ prospect_id: prospectId }, '-created_date', 20),
    enabled: !!prospectId,
  });

  // ── DemandeReservation active (workflow de réservation) ────────────────────────
  const { data: demandeResa = null } = useQuery({
    queryKey: ['demande-reservation-active', prospectId],
    queryFn: () => base44.entities.DemandeReservation.filter({ prospect_id: prospectId }, '-created_date', 5).then(r => r[0] || null),
    enabled: !!prospectId,
  });
  const demandeActive = demandeResa && ['en_attente', 'contre_proposee', 'confirmee_par_prospect'].includes(demandeResa.statut) ? demandeResa : null;
  const demandeRefusee = demandeResa && demandeResa.statut === 'refusee' ? demandeResa : null;

  const knownDate = useMemo(() => {
    // 1. Date renseignée directement sur le Prospect
    if (prospect) {
      const label = formatDateLabel(prospect);
      if (label) {
        return { source: 'prospect', date_type: prospect.date_type || 'exacte', date_evenement_souhaitee: prospect.date_evenement_souhaitee, date_mois: prospect.date_mois, date_periode: prospect.date_periode, label };
      }
    }
    // 2. ProspectDateDemande confirmée avec date_confirmee
    const confirmee = dateDemandes.find(d => d.statut === 'Confirmée' && d.date_confirmee);
    if (confirmee) {
      return { source: 'demande_confirmee', date_type: 'exacte', date_evenement_souhaitee: confirmee.date_confirmee, label: formatDateLabel({ date_type: 'exacte', date_evenement_souhaitee: confirmee.date_confirmee }) };
    }
    // 3. ProspectDateDemande en attente avec dates_proposees
    const enAttente = dateDemandes.find(d => d.statut === 'En attente' && (d.dates_proposees || []).length > 0);
    if (enAttente) {
      const labels = enAttente.dates_proposees.map(d => formatDateLabel({ date_type: 'exacte', date_evenement_souhaitee: d })).filter(Boolean);
      if (labels.length) return { source: 'demande_en_attente', dates_proposees: enAttente.dates_proposees, label: labels.join(', ') };
    }
    return null;
  }, [prospect, dateDemandes]);

  // ── Sélecteur inline de date (quand aucune date n'est connue) ──────────────────
  const [dateMode, setDateMode] = useState('exacte');
  const [dateExacte, setDateExacte] = useState('');
  const [dateMois, setDateMois] = useState('');
  const [dateAnnee, setDateAnnee] = useState('');
  const [datePeriode, setDatePeriode] = useState('');

  const dateFormValid = dateMode === 'exacte' ? !!dateExacte
    : dateMode === 'mois' ? !!dateMois && !!dateAnnee
    : !!datePeriode.trim();

  const buildDateFromForm = () => {
    if (dateMode === 'exacte') return { date_type: 'exacte', date_evenement_souhaitee: dateExacte };
    if (dateMode === 'mois') return { date_type: 'mois', date_mois: `${dateAnnee}-${dateMois}` };
    return { date_type: 'periode', date_periode: datePeriode.trim() };
  };

  // ── Envoi effectif de la demande de réservation (avec datePayload) ─────────────
  const doSendDemande = async (datePayload, forcedLabel = null, source = 'saisie_manuelle') => {
    if (sending) return;
    setSending(true);
    try {
      const label = forcedLabel || formatDateLabel(datePayload);
      const phrase = label ? (datePayload.date_type === 'exacte' ? ` pour le ${label}` : ` pour ${label}`) : '';
      await base44.entities.ProspectMessage.create({
        prospect_id: prospectId,
        auteur: 'prospect',
        message: `DEMANDE_RESERVATION:${JSON.stringify({
          prospect_id: prospectId,
          prospect_nom: prospectNom,
          demande_at: new Date().toISOString(),
          date_evenement: { ...datePayload, label },
        })}`,
      });
      await base44.entities.Notification.create({
        titre: '🔐 Demande de réservation',
        message: `${prospectNom} souhaite réserver son événement${phrase}.`,
        type: 'info',
        lien: '/Clients?tab=prospects',
      });
      // Création de l'entité DemandeReservation (anti-doublon : une seule en_attente)
      const existing = await base44.entities.DemandeReservation.filter({ prospect_id: prospectId, statut: 'en_attente' }, '-created_date', 1);
      if (!existing[0]) {
        await base44.entities.DemandeReservation.create({
          prospect_id: prospectId,
          prospect_nom: prospectNom,
          date_type: datePayload.date_type || 'exacte',
          date_evenement_souhaitee: datePayload.date_evenement_souhaitee || null,
          date_mois: datePayload.date_mois || null,
          date_periode: datePayload.date_periode || null,
          date_label: label,
          date_source: source,
          statut: 'en_attente',
        });
      }
      setDemandeEnvoyee(true);
      qc.invalidateQueries(['demande-reservation-active', prospectId]);
      toast.success('Votre demande de réservation a bien été transmise !');
    } catch (err) {
      toast.error('Une erreur est survenue. Veuillez réessayer.');
    } finally {
      setSending(false);
    }
  };

  const handleSendDemande = async () => {
    if (!knownDate) return;
    const { source, label, ...datePayload } = knownDate;
    const forcedLabel = source === 'demande_en_attente' ? `${label} (proposition à confirmer)` : label;
    await doSendDemande(datePayload, forcedLabel, source || 'saisie_manuelle');
  };

  const handleValidateAndSend = async () => {
    if (!dateFormValid || sending) return;
    const datePayload = buildDateFromForm();
    try {
      await base44.entities.Prospect.update(prospectId, datePayload);
    } catch (e) { /* non bloquant : on envoie quand même */ }
    await doSendDemande(datePayload, null, 'saisie_manuelle');
  };

  // ── Réception d'une contre-proposition admin (accepter / refuser) ─────────────
  const handleAccepterContreProposition = async () => {
    if (!demandeResa) return;
    const alt = {
      date_type: demandeResa.date_alternative_type,
      date_evenement_souhaitee: demandeResa.date_alternative_exacte || null,
      date_mois: demandeResa.date_alternative_mois || null,
      date_periode: demandeResa.date_alternative_periode || null,
    };
    try {
      await base44.entities.DemandeReservation.update(demandeResa.id, { statut: 'confirmee_par_prospect' });
      await base44.entities.Prospect.update(prospectId, alt);
      await base44.entities.Notification.create({
        titre: '✅ Contre-proposition acceptée',
        message: `${prospectNom} a accepté la contre-proposition (${demandeResa.date_alternative_label}). Finalisez via Pré-résa.`,
        type: 'info',
        lien: '/Clients?tab=prospects',
      });
      qc.invalidateQueries(['demande-reservation-active', prospectId]);
      toast.success("Contre-proposition acceptée ! L'organisateur va finaliser.");
    } catch (e) {
      toast.error('Une erreur est survenue. Veuillez réessayer.');
    }
  };

  const handleRefuserContreProposition = async () => {
    if (!demandeResa) return;
    try {
      await base44.entities.DemandeReservation.update(demandeResa.id, { statut: 'refusee' });
      qc.invalidateQueries(['demande-reservation-active', prospectId]);
      toast.success('Contre-proposition refusée. Vous pouvez renvoyer une nouvelle demande.');
    } catch (e) {
      toast.error('Une erreur est survenue. Veuillez réessayer.');
    }
  };

  const handleConfirmerSignature = async () => {
    setConfirming(true);
    try {
      await base44.entities.ProspectMessage.create({
        prospect_id: prospectId,
        auteur: 'prospect',
        message: `CONTRAT_SIGNE:${JSON.stringify({ prospect_id: prospectId, prospect_nom: prospectNom, date: new Date().toISOString() })}`,
      });
      await base44.entities.Notification.create({
        titre: `🖊️ Contrat signé par ${prospectNom} — à confirmer`,
        message: `${prospectNom} a déclaré avoir signé son contrat. Veuillez confirmer la signature dans la fiche prospect.`,
        type: 'info',
        lien: '/Clients?tab=prospects',
      });
      setAlreadyDeclared(true);
      setDeclareSigning(false);
      toast.success('Votre signature a bien été signalée à votre organisateur !');
    } catch (err) {
      toast.error('Une erreur est survenue. Veuillez réessayer.');
    } finally {
      setConfirming(false);
    }
  };

  // (handleSendDemande déplacé plus haut — version avec résolution de date)

  const load = () => {
    Promise.all([
      base44.entities.PreReservation.filter({ prospect_id: prospectId }, '-created_date', 1),
      base44.entities.ProspectMessage.filter({ prospect_id: prospectId, auteur: 'prospect' }),
    ]).then(([resaList, msgs]) => {
      setPreResa(resaList[0] || null);
      setAlreadyDeclared(msgs.some(m => m.message?.startsWith('CONTRAT_SIGNE:')));
      setDemandeEnvoyee(msgs.some(m => m.message?.startsWith('DEMANDE_RESERVATION:')));
      setLoading(false);
    });
  };

  useEffect(() => { load(); }, [prospectId]);

  if (loading) {
    return (
      <div className="flex items-center justify-center py-10">
        <div className="w-6 h-6 border-2 border-border border-t-primary rounded-full animate-spin" />
      </div>
    );
  }

  // ── Aucune pré-résa : workflow de demande de réservation ──────
  if (!preResa || preResa.statut === 'Annulé') {
    return (
      <div className="pt-4 space-y-4">
        <div className="text-center space-y-2">
          <div className="text-3xl">🔐</div>
          <p className="text-sm font-semibold">Réservez votre événement</p>
          <p className="text-xs text-muted-foreground leading-relaxed">
            {demandeActive
              ? "Statut de votre demande de réservation :"
              : knownDate
                ? "Confirmez votre demande de réservation, votre organisateur reviendra vers vous pour finaliser."
                : "Aucune pré-réservation en cours. Indiquez votre date puis envoyez votre demande à l'organisateur."}
          </p>
        </div>

        {demandeActive?.statut === 'en_attente' ? (
          <div className="flex items-start gap-2 px-4 py-3 bg-amber-50 border border-amber-200 rounded-2xl text-amber-700">
            <Clock size={16} className="shrink-0 mt-0.5" />
            <p className="text-xs leading-relaxed">Votre demande de réservation a bien été envoyée. Votre organisateur reviendra vers vous prochainement.</p>
          </div>
        ) : demandeActive?.statut === 'contre_proposee' ? (
          <div className="space-y-3">
            <div className="flex items-start gap-2 px-4 py-3 bg-blue-50 border border-blue-200 rounded-2xl text-blue-700">
              <CalendarClock size={16} className="shrink-0 mt-0.5" />
              <div className="text-xs leading-relaxed">
                <p>📅 Votre organisateur vous propose une autre date : <span className="font-semibold">{demandeActive.date_alternative_label}</span></p>
                {demandeActive.reponse_admin && <p className="mt-1 text-[11px] italic">{demandeActive.reponse_admin}</p>}
              </div>
            </div>
            <div className="flex gap-2">
              <Button onClick={handleAccepterContreProposition} disabled={sending} className="flex-1 gap-2 bg-emerald-600 hover:bg-emerald-700 text-white" size="lg">
                ✓ Accepter cette date
              </Button>
              <Button onClick={handleRefuserContreProposition} disabled={sending} variant="outline" className="flex-1 gap-2" size="lg">
                Refuser
              </Button>
            </div>
          </div>
        ) : demandeActive?.statut === 'confirmee_par_prospect' ? (
          <div className="flex items-start gap-2 px-4 py-3 bg-emerald-50 border border-emerald-200 rounded-2xl text-emerald-700">
            <CheckCircle size={16} className="shrink-0 mt-0.5" />
            <p className="text-xs leading-relaxed">Vous avez accepté la contre-proposition. Votre organisateur finalise votre réservation.</p>
          </div>
        ) : demandeEnvoyee && !demandeResa ? (
          <div className="flex items-start gap-2 px-4 py-3 bg-emerald-50 border border-emerald-200 rounded-2xl text-emerald-700">
            <CheckCircle size={16} className="shrink-0 mt-0.5" />
            <p className="text-xs leading-relaxed">Votre demande de réservation a bien été envoyée. Votre organisateur revient vers vous dès que possible.</p>
          </div>
        ) : (prospectLoading || datesLoading) ? (
          <div className="flex items-center justify-center py-6">
            <div className="w-5 h-5 border-2 border-border border-t-primary rounded-full animate-spin" />
          </div>
        ) : (
          <>
            {demandeRefusee && (
              <div className="flex items-start gap-2 px-4 py-3 bg-red-50 border border-red-200 rounded-2xl text-red-700">
                <AlertCircle size={16} className="shrink-0 mt-0.5" />
                <div className="text-xs leading-relaxed">
                  <p>Votre précédente demande a été refusée.</p>
                  {demandeRefusee.reponse_admin && <p className="mt-0.5 italic">Motif : {demandeRefusee.reponse_admin}</p>}
                  <p className="mt-1 text-[11px]">Vous pouvez renvoyer une nouvelle demande ci-dessous.</p>
                </div>
              </div>
            )}
            {knownDate ? (
              <>
                <div className="flex items-start gap-2 px-4 py-3 bg-blue-50 border border-blue-200 rounded-2xl text-blue-700">
                  <CalendarClock size={16} className="shrink-0 mt-0.5" />
                  <div className="text-xs leading-relaxed">
                    <p>📅 Date connue : <span className="font-semibold">{knownDate.label}</span></p>
                    {knownDate.source === 'demande_en_attente' && (
                      <p className="text-[11px] text-blue-500 mt-0.5">Proposition à confirmer par l'organisateur.</p>
                    )}
                  </div>
                </div>
                <Button onClick={handleSendDemande} disabled={sending} className="w-full gap-2" size="lg">
                  {sending ? 'Envoi…' : <>✍️ Envoyer une demande de réservation</>}
                </Button>
              </>
            ) : (
              <>
                <InlineDateSelector
                  mode={dateMode} setMode={setDateMode}
                  exacte={dateExacte} setExacte={setDateExacte}
                  mois={dateMois} setMois={setDateMois}
                  annee={dateAnnee} setAnnee={setDateAnnee}
                  periode={datePeriode} setPeriode={setDatePeriode}
                />
                <Button onClick={handleValidateAndSend} disabled={sending || !dateFormValid} className="w-full gap-2" size="lg">
                  {sending ? 'Envoi…' : <>✓ Valider ma date et envoyer la demande</>}
                </Button>
              </>
            )}
          </>
        )}
      </div>
    );
  }

  const jR = jRestants(preResa.expire_le);

  // ── Expiré ──────────────────────────────────────────────────────
  if (preResa.statut === 'Expiré') {
    return (
      <div className="pt-4 space-y-4">
        <div className="flex items-center gap-2 px-4 py-3 bg-red-50 border border-red-200 rounded-2xl text-red-700 text-sm font-medium">
          <AlertCircle size={16} /> Pré-réservation expirée
        </div>
        <p className="text-xs text-muted-foreground leading-relaxed">
          Le délai de signature a expiré le {new Date(preResa.expire_le).toLocaleDateString('fr-FR', { day: 'numeric', month: 'long', year: 'numeric' })}. Contactez votre organisateur pour renouveler la pré-réservation.
        </p>
      </div>
    );
  }

  // ── Signé ───────────────────────────────────────────────────────
  if (preResa.statut === 'Signé') {
    return (
      <div className="pt-4 space-y-4">
        <div className="flex items-center gap-2 px-4 py-3 bg-emerald-50 border border-emerald-200 rounded-2xl text-emerald-700 text-sm font-medium">
          <CheckCircle size={16} /> Contrat signé ✓
        </div>
        {preResa.date_signature && (
          <p className="text-xs text-muted-foreground">
            Signé le {new Date(preResa.date_signature).toLocaleDateString('fr-FR', { day: 'numeric', month: 'long', year: 'numeric' })}
          </p>
        )}
        {preResa.contrat_signe_url && (
          <a
            href={preResa.contrat_signe_url}
            target="_blank"
            rel="noopener noreferrer"
            className="flex items-center gap-2 text-sm text-primary font-medium hover:underline px-4 py-3 bg-primary/5 border border-primary/20 rounded-2xl"
          >
            <Download size={15} /> Télécharger mon contrat signé
          </a>
        )}
        {preResa.date_evenement && (
          <div className="bg-muted/40 rounded-2xl border border-border p-4 text-sm">
            <p className="text-xs text-muted-foreground mb-0.5">Date de votre événement</p>
            <p className="font-semibold">{new Date(preResa.date_evenement).toLocaleDateString('fr-FR', { weekday: 'long', day: 'numeric', month: 'long', year: 'numeric' })}</p>
          </div>
        )}
      </div>
    );
  }

  // ── En attente de signature ─────────────────────────────────────
  return (
    <div className="pt-4 space-y-4">
      {/* Bandeau expiration */}
      {preResa.expire_le && (
        <div className={`flex items-center gap-2 px-4 py-3 rounded-2xl border text-sm font-medium ${
          jR !== null && jR <= 3
            ? 'bg-red-50 border-red-200 text-red-700'
            : 'bg-amber-50 border-amber-200 text-amber-700'
        }`}>
          <Clock size={15} />
          {jR === null ? 'En attente de signature'
            : jR > 0 ? `⏱️ À signer avant le ${new Date(preResa.expire_le).toLocaleDateString('fr-FR')} (${jR} j)`
            : jR === 0 ? '⚠️ Expire aujourd\'hui !'
            : '🔴 Délai dépassé'}
        </div>
      )}

      {/* Détails de la pré-résa */}
      <div className="bg-muted/40 rounded-2xl border border-border p-4 space-y-3">
        {preResa.date_evenement && (
          <div>
            <p className="text-[11px] text-muted-foreground uppercase tracking-wide font-semibold mb-0.5">Date de l'événement</p>
            <p className="text-sm font-semibold">{new Date(preResa.date_evenement).toLocaleDateString('fr-FR', { weekday: 'long', day: 'numeric', month: 'long', year: 'numeric' })}</p>
          </div>
        )}
        {preResa.formule_nom && (
          <div>
            <p className="text-[11px] text-muted-foreground uppercase tracking-wide font-semibold mb-0.5">Formule</p>
            <p className="text-sm">{preResa.formule_nom}</p>
          </div>
        )}
        {preResa.montant_versement && (
          <div>
            <p className="text-[11px] text-muted-foreground uppercase tracking-wide font-semibold mb-0.5">{preResa.type_versement || 'Versement demandé'}</p>
            <p className="text-sm font-semibold text-primary">{preResa.montant_versement.toLocaleString('fr-FR')} €</p>
          </div>
        )}
      </div>

      {/* Conditions annulation */}
      {preResa.conditions_annulation && (
        <div className="bg-orange-50 border border-orange-200 rounded-2xl p-4">
          <p className="text-[11px] font-semibold text-orange-700 uppercase tracking-wide mb-1">Conditions d'annulation</p>
          <p className="text-xs text-orange-800 leading-relaxed">{preResa.conditions_annulation}</p>
        </div>
      )}

      {/* Conditions générales */}
      {preResa.conditions_texte && (
        <div className="bg-muted/30 rounded-2xl border border-border p-4">
          <p className="text-[11px] font-semibold text-muted-foreground uppercase tracking-wide mb-2">Conditions</p>
          <p className="text-xs text-foreground/80 leading-relaxed whitespace-pre-wrap">{preResa.conditions_texte}</p>
        </div>
      )}

      {/* Bouton signature YouSign */}
      {preResa.yousign_sign_url ? (
        <div className="space-y-3">
          <Button
            onClick={() => window.open(preResa.yousign_sign_url, '_blank')}
            className="w-full gap-2 bg-violet-600 hover:bg-violet-700 text-white"
            size="lg"
          >
            <ExternalLink size={16} />
            ✍️ Signer le contrat
          </Button>

          {/* Bouton "J'ai signé" */}
          <SignatureDeclarationBlock
            alreadyDeclared={alreadyDeclared}
            declareSigning={declareSigning}
            confirming={confirming}
            onDeclare={() => setDeclareSigning(true)}
            onCancel={() => setDeclareSigning(false)}
            onConfirm={handleConfirmerSignature}
          />
        </div>
      ) : (
        preResa.contrat_url ? (
          <div className="space-y-3">
            <a
              href={preResa.contrat_url}
              target="_blank"
              rel="noopener noreferrer"
              className="flex items-center justify-center gap-2 w-full py-3 px-4 bg-muted border border-border rounded-2xl text-sm font-medium text-foreground hover:bg-muted/80 transition-colors"
            >
              <Download size={15} /> Consulter le contrat PDF
            </a>
            {/* Bouton "J'ai signé" */}
            <SignatureDeclarationBlock
              alreadyDeclared={alreadyDeclared}
              declareSigning={declareSigning}
              confirming={confirming}
              onDeclare={() => setDeclareSigning(true)}
              onCancel={() => setDeclareSigning(false)}
              onConfirm={handleConfirmerSignature}
            />
          </div>
        ) : (
          <div className="text-center py-4 text-xs text-muted-foreground bg-muted/30 rounded-2xl border border-dashed border-border">
            <p>Le lien de signature sera disponible prochainement.</p>
            <p className="mt-1">Contactez votre organisateur si vous n'avez pas reçu votre contrat.</p>
          </div>
        )
      )}
    </div>
  );
}