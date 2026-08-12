import { useState, useRef } from 'react';
import { base44 } from '@/api/base44Client';
import { X, CalendarCheck } from 'lucide-react';
import { Button } from '@/components/ui/button';
import AdminProspectDates from '@/components/prospects/AdminProspectDates';
import PreReservationPanel from '@/components/prospects/PreReservationPanel';
import AdminReservationPanel from '@/components/prospects/AdminReservationPanel';

export default function ProspectReservationModal({ prospect, onClose, onConvertir }) {
  const [pendingResaDemandeId, setPendingResaDemandeId] = useState(null);
  const [resaPrefillDate, setResaPrefillDate] = useState(null);
  const [preResa, setPreResa] = useState(null);
  const preResaRef = useRef(null);

  const prospectPortalUrl = `${window.location.origin}/prospect-portal?token=${prospect.lien_token}`;

  const handleAccepterReservation = (demandeId, datePayload) => {
    setPendingResaDemandeId(demandeId);
    setResaPrefillDate(datePayload.date_evenement_souhaitee || null);
    setTimeout(() => preResaRef.current?.scrollIntoView({ behavior: 'smooth', block: 'start' }), 50);
  };

  const handlePreResaCreated = async () => {
    if (!pendingResaDemandeId) return;
    try {
      await base44.entities.DemandeReservation.update(pendingResaDemandeId, { statut: 'acceptee' });
    } catch (e) { /* non bloquant */ }
    setPendingResaDemandeId(null);
    setResaPrefillDate(null);
  };

  const handleSignatureConfirmed = () => {
    onConvertir?.(prospect);
    onClose();
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 p-4">
      <div className="bg-card rounded-2xl shadow-xl w-full max-w-lg max-h-[90vh] overflow-y-auto">
        <div className="flex items-center justify-between px-5 py-4 border-b border-border sticky top-0 bg-card z-10">
          <h2 className="font-bold text-lg flex items-center gap-2">
            <CalendarCheck size={18} className="text-emerald-600" />
            Réservation — {prospect.prenom} {prospect.nom}
          </h2>
          <button onClick={onClose} className="p-1.5 rounded-lg hover:bg-muted text-muted-foreground"><X size={16} /></button>
        </div>
        <div className="px-5 py-5 space-y-5">
          <section>
            <h3 className="text-xs font-bold text-slate-400 uppercase tracking-[0.12em] mb-2">1 · Demandes de date</h3>
            <AdminProspectDates
              prospectId={prospect.id}
              prospectEmail={prospect.email}
              prospectPrenom={prospect.prenom}
              prospectPortalUrl={prospectPortalUrl}
            />
          </section>
          <section>
            <h3 className="text-xs font-bold text-slate-400 uppercase tracking-[0.12em] mb-2">2 · Demandes de réservation</h3>
            <AdminReservationPanel
              prospect={prospect}
              prospectPortalUrl={prospectPortalUrl}
              onAccepter={handleAccepterReservation}
            />
          </section>
          <section ref={preResaRef}>
            <h3 className="text-xs font-bold text-slate-400 uppercase tracking-[0.12em] mb-2">3 · Pré-réservation</h3>
            <PreReservationPanel
              prospect={prospect}
              prospectPortalUrl={prospectPortalUrl}
              datePrefill={resaPrefillDate}
              onPreResaCreated={handlePreResaCreated}
              onPreResaChange={setPreResa}
              onSignatureConfirmed={handleSignatureConfirmed}
            />
          </section>
          {preResa?.statut === 'Signé' && !prospect?.converti && (
            <section className="bg-emerald-50 border border-emerald-200 rounded-2xl p-4 space-y-2">
              <p className="text-xs font-semibold text-emerald-800">🎉 Pré-réservation signée</p>
              <p className="text-[11px] text-emerald-700">Finalisez la création du client et de l'événement.</p>
              <Button size="sm" onClick={handleSignatureConfirmed} className="w-full gap-1.5 bg-emerald-600 hover:bg-emerald-700 text-white">
                Convertir en client
              </Button>
            </section>
          )}
        </div>
      </div>
    </div>
  );
}