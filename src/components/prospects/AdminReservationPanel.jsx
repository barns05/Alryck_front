import { useState, useEffect } from 'react';
import { base44 } from '@/api/base44Client';
import { CheckCircle, XCircle, CalendarClock, Send } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { toast } from 'sonner';
import { formatDateLabel, InlineDateSelector } from '@/components/prospect-portal/ProspectPreReservation';

const STATUS_CONFIG = {
  en_attente: { label: 'En attente', color: 'bg-amber-100 text-amber-700' },
  acceptee: { label: 'Acceptée', color: 'bg-emerald-100 text-emerald-700' },
  refusee: { label: 'Refusée', color: 'bg-red-100 text-red-600' },
  contre_proposee: { label: 'Contre-proposition envoyée', color: 'bg-blue-100 text-blue-700' },
  confirmee_par_prospect: { label: 'Confirmée par le prospect', color: 'bg-emerald-100 text-emerald-700' },
};

export default function AdminReservationPanel({ prospect, prospectPortalUrl, onAccepter }) {
  const [demandes, setDemandes] = useState([]);
  const [actionFor, setActionFor] = useState(null);
  const [motif, setMotif] = useState('');
  // Contre-proposition (3 modes)
  const [cpMode, setCpMode] = useState('exacte');
  const [cpExacte, setCpExacte] = useState('');
  const [cpMois, setCpMois] = useState('');
  const [cpAnnee, setCpAnnee] = useState('');
  const [cpPeriode, setCpPeriode] = useState('');
  const [cpMessage, setCpMessage] = useState('');

  const load = async () => {
    const res = await base44.entities.DemandeReservation.filter({ prospect_id: prospect.id }, '-created_date', 20);
    setDemandes(res);
  };

  useEffect(() => { load(); }, [prospect.id]);

  const resetForms = () => {
    setActionFor(null);
    setMotif('');
    setCpMode('exacte'); setCpExacte(''); setCpMois(''); setCpAnnee(''); setCpPeriode(''); setCpMessage('');
  };

  const handleAccepter = (d) => {
    const datePayload = {
      date_type: d.date_type || 'exacte',
      date_evenement_souhaitee: d.date_evenement_souhaitee || null,
      date_mois: d.date_mois || null,
      date_periode: d.date_periode || null,
    };
    onAccepter?.(d.id, datePayload);
  };

  const handleRefuser = async (d) => {
    if (!motif.trim()) { toast.error('Indiquez un motif'); return; }
    await base44.entities.DemandeReservation.update(d.id, { statut: 'refusee', reponse_admin: motif.trim() });
    await base44.entities.ProspectMessage.create({
      prospect_id: prospect.id,
      auteur: 'admin',
      message: `REFUS_RESERVATION:${JSON.stringify({ motif: motif.trim() })}`,
    });
    await base44.entities.Notification.create({
      titre: `❌ Demande de réservation refusée — ${prospect.prenom} ${prospect.nom}`,
      message: `Motif : ${motif.trim()}`,
      type: 'info',
      lien: '/Clients?tab=prospects',
    });
    if (prospect.email) {
      try {
        await base44.integrations.Core.SendEmail({
          to: prospect.email,
          subject: 'Votre demande de réservation',
          body: `<p>Bonjour ${prospect.prenom || ''},</p><p>Votre demande de réservation n'a pas pu être acceptée.</p><p><strong>Motif :</strong> ${motif.trim()}</p>${prospectPortalUrl ? `<p><a href="${prospectPortalUrl}" style="display:inline-block;padding:10px 20px;background:#1e40af;color:white;text-decoration:none;border-radius:8px;font-weight:600;">Accéder à mon espace →</a></p>` : ''}<p>Cordialement</p>`,
        });
      } catch (e) { /* non bloquant */ }
    }
    toast.success('Demande refusée');
    resetForms();
    load();
  };

  const cpValid = cpMode === 'exacte' ? !!cpExacte
    : cpMode === 'mois' ? !!cpMois && !!cpAnnee
    : !!cpPeriode.trim();

  const buildCpPayload = () => {
    if (cpMode === 'exacte') return { date_alternative_type: 'exacte', date_alternative_exacte: cpExacte };
    if (cpMode === 'mois') return { date_alternative_type: 'mois', date_alternative_mois: `${cpAnnee}-${cpMois}` };
    return { date_alternative_type: 'periode', date_alternative_periode: cpPeriode.trim() };
  };

  const handleContreProposer = async (d) => {
    if (!cpValid) { toast.error('Renseignez une date'); return; }
    const cp = buildCpPayload();
    const label = formatDateLabel({
      date_type: cp.date_alternative_type,
      date_evenement_souhaitee: cp.date_alternative_exacte,
      date_mois: cp.date_alternative_mois,
      date_periode: cp.date_alternative_periode,
    });
    await base44.entities.DemandeReservation.update(d.id, {
      statut: 'contre_proposee',
      ...cp,
      date_alternative_label: label,
      reponse_admin: cpMessage.trim() || null,
    });
    await base44.entities.ProspectMessage.create({
      prospect_id: prospect.id,
      auteur: 'admin',
      message: `CONTRE_PROPOSITION_RESERVATION:${JSON.stringify({ label, message: cpMessage.trim() || null, ...cp })}`,
    });
    await base44.entities.Notification.create({
      titre: `📅 Contre-proposition — ${prospect.prenom} ${prospect.nom}`,
      message: `Nouvelle date proposée : ${label}`,
      type: 'info',
      lien: '/Clients?tab=prospects',
    });
    toast.success('Contre-proposition envoyée');
    resetForms();
    load();
  };

  if (demandes.length === 0) {
    return <p className="text-xs text-muted-foreground py-4 text-center">Aucune demande de réservation reçue.</p>;
  }

  return (
    <div className="space-y-3">
      {demandes.map(d => {
        const cfg = STATUS_CONFIG[d.statut] || STATUS_CONFIG.en_attente;
        const isActive = d.statut === 'en_attente' || d.statut === 'confirmee_par_prospect';
        return (
          <div key={d.id} className="bg-muted/30 rounded-xl p-3 border border-border text-xs space-y-2">
            <div className="flex items-center justify-between">
              <p className="font-semibold">Demande de réservation</p>
              <span className={`text-xs px-2 py-0.5 rounded-full font-medium ${cfg.color}`}>{cfg.label}</span>
            </div>

            <div className="space-y-0.5">
              <p className="text-muted-foreground font-medium">📅 Date demandée :</p>
              <p className="pl-4 text-foreground/80">{d.date_label || formatDateLabel(d) || 'Non précisée'}</p>
              {d.date_source && <p className="pl-4 text-[10px] text-muted-foreground">Source : {d.date_source}</p>}
            </div>

            {d.statut === 'confirmee_par_prospect' && d.date_alternative_label && (
              <div className="bg-emerald-50 border border-emerald-200 rounded-lg px-3 py-2">
                <p className="text-emerald-700 font-medium">✅ Le prospect a accepté la contre-proposition : {d.date_alternative_label}</p>
                <p className="text-[11px] text-emerald-600 mt-0.5">Finalisez en créant la pré-réservation.</p>
              </div>
            )}

            {d.statut === 'contre_proposee' && (
              <div className="bg-blue-50 border border-blue-200 rounded-lg px-3 py-2">
                <p className="text-blue-700">📅 Contre-proposition envoyée : {d.date_alternative_label}</p>
                <p className="text-[11px] text-blue-600 mt-0.5">En attente de réponse du prospect.</p>
              </div>
            )}

            {d.statut === 'acceptee' && (
              <p className="text-emerald-700 text-[11px]">✅ Acceptée — pré-réservation créée.</p>
            )}

            {d.statut === 'refusee' && (
              <div className="bg-red-50 border border-red-200 rounded-lg px-3 py-2">
                <p className="text-red-700 text-[11px]">❌ Refusée. Motif : {d.reponse_admin || '—'}</p>
              </div>
            )}

            {isActive && actionFor?.id !== d.id && (
              <div className="flex flex-wrap gap-2 pt-1">
                {d.statut === 'en_attente' && (
                  <>
                    <Button size="sm" className="gap-1 text-xs h-7 bg-emerald-600 hover:bg-emerald-700 text-white" onClick={() => handleAccepter(d)}>
                      <CheckCircle size={12} /> Accepter
                    </Button>
                    <Button size="sm" variant="outline" className="gap-1 text-xs h-7 text-red-600 border-red-200 hover:bg-red-50" onClick={() => { setActionFor({ id: d.id, mode: 'refuser' }); setMotif(''); }}>
                      <XCircle size={12} /> Refuser
                    </Button>
                    <Button size="sm" variant="outline" className="gap-1 text-xs h-7" onClick={() => { setActionFor({ id: d.id, mode: 'contre' }); }}>
                      <CalendarClock size={12} /> Proposer une autre date
                    </Button>
                  </>
                )}
                {d.statut === 'confirmee_par_prospect' && (
                  <Button size="sm" className="gap-1 text-xs h-7 bg-emerald-600 hover:bg-emerald-700 text-white" onClick={() => handleAccepter(d)}>
                    <CheckCircle size={12} /> Finaliser (créer la pré-réservation)
                  </Button>
                )}
              </div>
            )}

            {actionFor?.id === d.id && actionFor.mode === 'refuser' && (
              <div className="space-y-2 pt-2 border-t border-border">
                <p className="font-medium text-muted-foreground">Motif du refus</p>
                <textarea value={motif} onChange={e => setMotif(e.target.value)} rows={2} placeholder="Indiquez la raison…" className="flex w-full rounded-lg border border-input bg-transparent px-3 py-2 text-xs resize-none focus-visible:outline-none focus-visible:ring-1 focus-visible:ring-ring" />
                <div className="flex gap-2">
                  <Button size="sm" className="text-xs h-7 bg-red-600 hover:bg-red-700 text-white" onClick={() => handleRefuser(d)}>Confirmer le refus</Button>
                  <button onClick={resetForms} className="text-xs text-muted-foreground px-2">Annuler</button>
                </div>
              </div>
            )}

            {actionFor?.id === d.id && actionFor.mode === 'contre' && (
              <div className="space-y-3 pt-2 border-t border-border">
                <p className="font-medium text-muted-foreground">Proposer une autre date</p>
                <InlineDateSelector
                  mode={cpMode} setMode={setCpMode}
                  exacte={cpExacte} setExacte={setCpExacte}
                  mois={cpMois} setMois={setCpMois}
                  annee={cpAnnee} setAnnee={setCpAnnee}
                  periode={cpPeriode} setPeriode={setCpPeriode}
                />
                <textarea value={cpMessage} onChange={e => setCpMessage(e.target.value)} rows={2} placeholder="Message au prospect (optionnel)…" className="flex w-full rounded-lg border border-input bg-transparent px-3 py-2 text-xs resize-none focus-visible:outline-none focus-visible:ring-1 focus-visible:ring-ring" />
                <div className="flex gap-2">
                  <Button size="sm" className="gap-1 text-xs h-7" disabled={!cpValid} onClick={() => handleContreProposer(d)}><Send size={11} /> Envoyer</Button>
                  <button onClick={resetForms} className="text-xs text-muted-foreground px-2">Annuler</button>
                </div>
              </div>
            )}
          </div>
        );
      })}
    </div>
  );
}