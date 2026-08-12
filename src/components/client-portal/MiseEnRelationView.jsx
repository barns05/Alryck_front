/**
 * MiseEnRelationView — Vue équivalant carte Prospect, côté client.
 *
 * Ouvre au tap sur une carte "En discussion" dans l'onglet Favoris, ou directement
 * à la confirmation d'une mise en relation. Reprend l'habillage visuel de la
 * fiche découverte VitrineProfil (cover, logo, métier, tagline, expérience, avis),
 * une grille « Votre espace » de 4 tuiles pastel, et une galerie photo en bas.
 *
 * Réutilise : useVitrineData, CarteEtablissement, GalerieApercu (VitrineProfil),
 * ConsolidatedMessagesView, ConsolidatedDocumentsView. Aucun countdown.
 */
import { useState } from 'react';
import { createPortal } from 'react-dom';
import { ArrowLeft, Clock, CheckCircle2, ChevronRight } from 'lucide-react';
import { base44 } from '@/api/base44Client';
import { useQuery, useQueryClient } from '@tanstack/react-query';
import { toast } from 'sonner';
import { useVitrineData } from '@/components/vitrine/useVitrineData';
import { CarteEtablissement, GalerieApercu } from '@/components/vitrine/VitrineProfil';
import ConsolidatedMessagesView from './ConsolidatedMessagesView';
import ConsolidatedDocumentsView from './ConsolidatedDocumentsView';

export default function MiseEnRelationView({ evenement, clientId, clientNom, ep, details, onClose }) {
  const qc = useQueryClient();
  const [statut, setStatut] = useState(ep?.statut || 'Contacté');
  const [confirming, setConfirming] = useState(false);
  const [demandeEnvoyee, setDemandeEnvoyee] = useState(false);
  const [activeTile, setActiveTile] = useState(null);

  const clientIdFinal = clientId || `guest-${evenement?.id}`;
  const prestataireFilter = {
    prestataire_id: ep?.prestataire_id,
    prestataire_nom: ep?.prestataire_nom,
  };

  const { vitrineData, isLoading } = useVitrineData({ mode: 'prestataire', prestataire_id: ep?.prestataire_id });

  const { data: evenementsTermines = [] } = useQuery({
    queryKey: ['evenements-termines-stats'],
    queryFn: () => base44.entities.Evenement.filter({ statut: 'Terminé' }),
  });

  // Même mécanisme que le bouton « Réserver » du ProspectPortal : envoi d'une
  // demande au prestataire (message marqué DEMANDE_RESERVATION dans la
  // conversation + notification ciblée), sans passer le statut à Confirmé.
  // Le prestataire valide ensuite lui-même via contrat (physique ou in-app).
  const handleReserver = async () => {
    if (demandeEnvoyee) return;
    setConfirming(true);
    try {
      const convs = await base44.entities.Conversation.filter({
        client_id: clientIdFinal,
        evenement_id: evenement?.id,
        prestataire_id: ep?.prestataire_id,
      });
      let conv = convs[0] || null;
      if (!conv) {
        conv = await base44.entities.Conversation.create({
          client_id: clientIdFinal,
          evenement_id: evenement?.id,
          evenement_nom: evenement?.nom,
          client_nom: clientNom,
          prestataire_id: ep?.prestataire_id,
          prestataire_nom: ep?.prestataire_nom,
        });
      }
      await base44.entities.Message.create({
        conversation_id: conv.id,
        auteur: 'client',
        auteur_nom: clientNom,
        contenu: `DEMANDE_RESERVATION:${JSON.stringify({ prestataire_id: ep?.prestataire_id, client_id: clientIdFinal, evenement_id: evenement?.id })}`,
        lu: false,
      });
      await base44.entities.Conversation.update(conv.id, {
        dernier_message: '🔐 Demande de réservation envoyée',
        date_dernier_message: new Date().toISOString(),
        non_lus_admin: (conv.non_lus_admin || 0) + 1,
      });
      const prestataireEmail = details?.portal_email || details?.email || null;
      await base44.entities.Notification.create({
        titre: '🔐 Demande de réservation',
        message: `${clientNom || 'Un client'} souhaite confirmer la réservation avec ${ep?.prestataire_nom} pour son ${evenement?.type_evenement || 'événement'}${evenement?.date ? ` du ${evenement.date}` : ''}.`,
        type: 'prestataire',
        lien: '/MonEspacePrestataire',
        user_email: prestataireEmail,
      });
      setDemandeEnvoyee(true);
      qc.invalidateQueries({ queryKey: ['conversations'] });
      qc.invalidateQueries({ queryKey: ['messages'] });
      qc.invalidateQueries({ queryKey: ['notifications'] });
      toast.success(`Votre demande de réservation a été envoyée à ${ep?.prestataire_nom}.`, { icon: '✅' });
    } catch {
      toast.error("Impossible d'envoyer la demande pour le moment.");
    } finally {
      setConfirming(false);
    }
  };

  const dateLabel = evenement?.date
    ? new Date(evenement.date).toLocaleDateString('fr-FR', { weekday: 'long', day: 'numeric', month: 'long', year: 'numeric' })
    : null;

  return createPortal(
    <div className="fixed inset-0 z-[60] flex flex-col bg-background">
      {/* Top bar — badge En discussion conservé */}
      <div className="flex items-center gap-3 px-4 py-3 border-b shrink-0 bg-white" style={{ borderColor: '#e8e4dc' }}>
        <button
          onClick={onClose}
          className="w-10 h-10 rounded-full flex items-center justify-center transition-all active:scale-95"
          style={{ background: '#f3f4f6', color: '#1e1b4b' }}
        >
          <ArrowLeft size={20} />
        </button>
        <div className="flex-1 min-w-0">
          <p className="font-semibold text-sm truncate" style={{ color: '#1e1b4b' }}>{ep?.prestataire_nom}</p>
          <p className="text-xs" style={{ color: '#9ca3af' }}>{ep?.prestataire_domaine}</p>
        </div>
        {statut === 'Confirmé' ? (
          <span className="inline-flex items-center gap-1 text-[10px] font-semibold px-2 py-0.5 rounded-full shrink-0" style={{ background: 'rgba(34,197,94,0.12)', color: '#16a34a' }}>
            <CheckCircle2 size={9} /> Confirmé
          </span>
        ) : (
          <span className="inline-flex items-center gap-1 text-[10px] font-semibold px-2 py-0.5 rounded-full shrink-0" style={{ background: 'rgba(249,115,22,0.12)', color: '#ea580c' }}>
            <Clock size={9} /> En discussion
          </span>
        )}
      </div>

      <div className="flex-1 overflow-y-auto">
        {activeTile ? (
          /* ── Contenu d'une tuile ── */
          <div>
            <button
              onClick={() => setActiveTile(null)}
              className="flex items-center gap-1.5 px-4 py-3 text-sm font-semibold active:opacity-70"
              style={{ color: '#1e1b4b' }}
            >
              <ArrowLeft size={16} /> Votre espace
            </button>

            {activeTile === 'formules' && (
              <ConsolidatedDocumentsView
                clientId={evenement?.client_id || null}
                evenementId={evenement?.id}
                clientEmail={evenement?.client_email}
              />
            )}

            {activeTile === 'messages' && (
              <ConsolidatedMessagesView
                evenement={evenement}
                clientId={clientIdFinal}
                clientNom={clientNom}
                prestataireFilter={prestataireFilter}
                onPrestataireFilterConsumed={() => {}}
              />
            )}

            {activeTile === 'dates' && (
              <div className="px-4 py-4 space-y-4">
                <div className="rounded-2xl p-4" style={{ background: '#fffbeb', border: '1px solid rgba(180,140,40,0.28)' }}>
                  <p className="text-[10px] font-bold uppercase tracking-wider" style={{ color: '#8a6d1f' }}>Votre événement</p>
                  <p className="text-lg font-bold mt-1" style={{ color: '#1e1b4b' }}>{evenement?.nom}</p>
                  {dateLabel && <p className="text-sm capitalize mt-0.5" style={{ color: '#64748b' }}>📅 {dateLabel}</p>}
                </div>
                <p className="text-sm text-muted-foreground">
                  Écrivez à ce prestataire pour vérifier sa disponibilité à cette date et organiser la suite.
                </p>
                <button
                  onClick={() => setActiveTile('messages')}
                  className="w-full py-3 rounded-xl text-sm font-bold text-white transition-all active:scale-[0.98]"
                  style={{ background: '#1e1b4b' }}
                >
                  💬 Écrire au prestataire
                </button>
              </div>
            )}
          </div>
        ) : (
          /* ── Vue principale : header enrichi + tuiles + galerie ── */
          <div className="px-4 py-4 space-y-5 max-w-2xl mx-auto">
            {isLoading ? (
              <div className="flex items-center justify-center py-16 text-muted-foreground text-sm">Chargement…</div>
            ) : (
              <CarteEtablissement vitrineData={vitrineData} nbEvenements={evenementsTermines.length} />
            )}

            {/* Grille « Votre espace » — 4 tuiles pastel */}
            <div className="space-y-3">
              <p className="text-[10px] font-bold text-slate-400 uppercase tracking-[0.15em]">Votre espace</p>

              {/* Tuile Formules & Devis (grande, ambre) */}
              <button
                onClick={() => setActiveTile('formules')}
                className="w-full rounded-2xl overflow-hidden text-left transition-all duration-200 active:scale-[0.98]"
                style={{
                  background: 'linear-gradient(135deg, #fffbeb 0%, #fef3c7 100%)',
                  border: '1px solid rgba(180,140,40,0.28)',
                  boxShadow: '0 4px 18px rgba(180,140,40,0.12)',
                }}
              >
                <div className="px-5 py-5 flex items-center justify-between">
                  <div className="flex items-center gap-4">
                    <div className="w-12 h-12 rounded-xl flex items-center justify-center shrink-0" style={{ background: 'rgba(30,27,75,0.07)', border: '1px solid rgba(30,27,75,0.10)' }}>
                      <span className="text-2xl">🏛️</span>
                    </div>
                    <div>
                      <p className="font-bold text-base leading-tight" style={{ color: '#1e1b4b' }}>Formules & Devis</p>
                      <p className="text-xs mt-1" style={{ color: 'rgba(30,27,75,0.50)' }}>Devis reçus et documents partagés</p>
                    </div>
                  </div>
                  <span style={{ color: 'rgba(30,27,75,0.35)' }} className="shrink-0"><ChevronRight size={16} /></span>
                </div>
                <div style={{ height: 4, background: 'linear-gradient(90deg, #1e1b4b 0%, #2d2a6e 100%)' }} />
              </button>

              {/* 3 tuiles pastel */}
              <div className="grid grid-cols-3 gap-3">
                {/* Messagerie */}
                <button
                  onClick={() => setActiveTile('messages')}
                  className="rounded-2xl text-left transition-all duration-200 active:scale-[0.98]"
                  style={{ background: '#eff6ff', border: '1px solid rgba(59,130,246,0.18)', boxShadow: '0 2px 10px rgba(59,130,246,0.08)' }}
                >
                  <div className="p-4 flex flex-col gap-3">
                    <div className="w-10 h-10 rounded-xl flex items-center justify-center" style={{ background: 'rgba(59,130,246,0.10)' }}>
                      <span className="text-lg">💬</span>
                    </div>
                    <div>
                      <p className="font-bold text-[13px] leading-tight" style={{ color: '#1e40af' }}>Messagerie</p>
                      <p className="text-[11px] mt-0.5" style={{ color: '#64748b' }}>Écrivez-nous</p>
                    </div>
                  </div>
                </button>

                {/* Disponibilité */}
                <button
                  onClick={() => setActiveTile('dates')}
                  className="rounded-2xl text-left transition-all duration-200 active:scale-[0.98]"
                  style={{ background: '#f0fdf4', border: '1px solid rgba(34,197,94,0.20)', boxShadow: '0 2px 10px rgba(34,197,94,0.08)' }}
                >
                  <div className="p-4 flex flex-col gap-3">
                    <div className="w-10 h-10 rounded-xl flex items-center justify-center" style={{ background: 'rgba(34,197,94,0.10)' }}>
                      <span className="text-lg">📅</span>
                    </div>
                    <div>
                      <p className="font-bold text-[13px] leading-tight" style={{ color: '#166534' }}>Disponibilité</p>
                      <p className="text-[11px] mt-0.5" style={{ color: '#64748b' }}>Vérifier une date</p>
                    </div>
                  </div>
                </button>

                {/* Réserver — envoie une demande au prestataire (pas de confirmation directe) */}
                {statut === 'Confirmé' ? (
                  <div className="rounded-2xl text-left" style={{ background: '#f0fdf4', border: '1px solid rgba(34,197,94,0.30)' }}>
                    <div className="p-4 flex flex-col gap-3">
                      <div className="w-10 h-10 rounded-xl flex items-center justify-center" style={{ background: 'rgba(34,197,94,0.15)' }}>
                        <CheckCircle2 size={18} style={{ color: '#16a34a' }} />
                      </div>
                      <div>
                        <p className="font-bold text-[13px] leading-tight" style={{ color: '#16a34a' }}>Confirmé</p>
                        <p className="text-[11px] mt-0.5" style={{ color: '#64748b' }}>Réservation actée</p>
                      </div>
                    </div>
                  </div>
                ) : demandeEnvoyee ? (
                  <div className="rounded-2xl text-left" style={{ background: '#f0fdf4', border: '1px solid rgba(34,197,94,0.25)' }}>
                    <div className="p-4 flex flex-col gap-3">
                      <div className="w-10 h-10 rounded-xl flex items-center justify-center" style={{ background: 'rgba(34,197,94,0.12)' }}>
                        <CheckCircle2 size={18} style={{ color: '#16a34a' }} />
                      </div>
                      <div>
                        <p className="font-bold text-[13px] leading-tight" style={{ color: '#16a34a' }}>Demande envoyée</p>
                        <p className="text-[11px] mt-0.5" style={{ color: '#64748b' }}>En attente de validation</p>
                      </div>
                    </div>
                  </div>
                ) : (
                  <button
                    onClick={handleReserver}
                    disabled={confirming}
                    className="rounded-2xl text-left transition-all duration-200 active:scale-[0.98] disabled:opacity-60"
                    style={{ background: '#faf5ff', border: '1px solid rgba(168,85,247,0.20)', boxShadow: '0 2px 10px rgba(168,85,247,0.08)' }}
                  >
                    <div className="p-4 flex flex-col gap-3">
                      <div className="w-10 h-10 rounded-xl flex items-center justify-center" style={{ background: 'rgba(168,85,247,0.10)' }}>
                        <span className="text-lg">🔐</span>
                      </div>
                      <div>
                        <p className="font-bold text-[13px] leading-tight" style={{ color: '#6b21a8' }}>{confirming ? '…' : 'Réserver'}</p>
                        <p className="text-[11px] mt-0.5" style={{ color: '#64748b' }}>Demander la réservation</p>
                      </div>
                    </div>
                  </button>
                )}
              </div>
            </div>

            {/* Galerie photo — même pattern que VitrineProfil (1re photo plus grande, scroll horizontal) */}
            {!isLoading && vitrineData && (
              <GalerieApercu mode_decouverte prestataire_id={ep?.prestataire_id} />
            )}
          </div>
        )}
      </div>
    </div>,
    document.body
  );
}