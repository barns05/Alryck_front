/**
 * SelectionTab — Refonte Étape 3
 *
 * Bloc 1 : Prestataires recommandés (statuts À contacter / Contacté)
 *   - Accepter  → crée fiche prospect dans le CRM du prestataire + notification + badge vert + déplace vers Mon événement
 *   - Refuser   → grise la carte + déplace dans bloc Refusés (jamais supprimé en base)
 *
 * Bloc 2 : Trouver un prestataire (formulaire + filtres, pas de suggestions IA)
 *
 * Bloc 3 : Prestataires refusés (accordéon fermé par défaut, cartes grisées)
 *   - Réactiver → remet dans Recommandés avec animation
 */
import { useState, useEffect } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { useQuery, useQueryClient } from '@tanstack/react-query';
import { base44 } from '@/api/base44Client';
import { toast } from 'sonner';
import { createPortal } from 'react-dom';
import { ChevronDown, ArrowLeft, Clock } from 'lucide-react';
import VitrineProfil from '@/components/vitrine/VitrineProfil';
import MiseEnRelationView from './MiseEnRelationView';
import PrestataireCard from './PrestataireCard';
import ConfirmRelationModal from './ConfirmRelationModal';

const DOMAINE_ICONS = {
  'Traiteur':      '🍽️',
  'DJ / Musique':  '🎵',
  'Photographe':   '📷',
  'Vidéaste':      '🎬',
  'Fleuriste':     '💐',
  'Décoration':    '✨',
  'Animation':     '🎭',
  'Transport':     '🚗',
  'Sécurité':      '🛡️',
  'Sono / Lumières': '💡',
  'Autre':         '🤝',
};

const DOMAINE_OPTIONS = Object.keys(DOMAINE_ICONS);

// Génération d'un token unique pour le lien prospect (même mécanique que ProspectModal).
function genToken() {
  return Math.random().toString(36).slice(2, 12) + Date.now().toString(36);
}

function getInitiales(nom = '') {
  return nom.trim().split(/\s+/).map(w => w[0]).join('').toUpperCase().slice(0, 2);
}

// ── Carte en discussion (Contacté) ─────────────────────────────────────────────
function CarteEnDiscussion({ ep, details: d, onOuvrir }) {
  const icon = DOMAINE_ICONS[ep.prestataire_domaine] || '🤝';
  return (
    <motion.button
      initial={{ opacity: 0, y: 12 }}
      animate={{ opacity: 1, y: 0 }}
      exit={{ opacity: 0, height: 0, marginBottom: 0 }}
      transition={{ duration: 0.3 }}
      whileTap={{ scale: 0.98 }}
      onClick={() => onOuvrir(ep)}
      className="w-full rounded-2xl overflow-hidden border text-left"
      style={{ background: '#ffffff', borderColor: '#e8e4dc' }}
    >
      <div className="flex items-center gap-3 p-3">
        {d?.logo_url ? (
          <img src={d.logo_url} alt={ep.prestataire_nom} className="rounded-lg object-contain shrink-0" style={{ width: 40, height: 40, background: 'white' }} />
        ) : (
          <div className="rounded-lg flex items-center justify-center text-white text-sm font-bold shrink-0" style={{ width: 40, height: 40, background: 'rgba(30,27,75,0.85)' }}>
            {d?.nom ? getInitiales(d.nom) : icon}
          </div>
        )}
        <div className="flex-1 min-w-0">
          <p className="font-semibold text-sm leading-tight" style={{ color: '#1e1b4b' }}>{ep.prestataire_nom}</p>
          <p className="text-xs mt-0.5" style={{ color: '#9ca3af' }}>{ep.prestataire_domaine}{d?.ville ? ` · ${d.ville}` : ''}</p>
        </div>
        <span className="inline-flex items-center gap-1 text-[10px] font-semibold px-2 py-0.5 rounded-full shrink-0" style={{ background: 'rgba(249,115,22,0.12)', color: '#ea580c' }}>
          <Clock size={9} /> En discussion
        </span>
      </div>
    </motion.button>
  );
}

// ── Carte refusée ──────────────────────────────────────────────────────────────
function CarteRefusee({ ep, details: d, onReactiver }) {
  const icon = DOMAINE_ICONS[ep.prestataire_domaine] || '🤝';
  const [loading, setLoading] = useState(false);

  const handleReactiver = async () => {
    setLoading(true);
    await base44.entities.EvenementPrestataire.update(ep.id, { statut: 'Recommandé' });
    onReactiver(ep.id);
  };

  return (
    <motion.div
      initial={{ opacity: 0 }}
      animate={{ opacity: 1 }}
      exit={{ opacity: 0 }}
      className="rounded-2xl border p-3 flex items-center gap-3"
      style={{ background: '#f8f8f8', borderColor: '#e8e4dc', filter: 'grayscale(60%)' }}
    >
      {/* Logo */}
      <div>
        {d?.logo_url ? (
          <img src={d.logo_url} alt={ep.prestataire_nom} className="rounded-lg object-contain shrink-0"
            style={{ width: 38, height: 38, background: 'white', border: '1px solid #ddd' }} />
        ) : (
          <div className="rounded-lg flex items-center justify-center text-gray-400 text-sm font-bold shrink-0"
            style={{ width: 38, height: 38, background: '#e5e7eb' }}>
            {d?.nom ? getInitiales(d.nom) : icon}
          </div>
        )}
      </div>

      {/* Infos */}
      <div className="flex-1 min-w-0">
        <p className="font-semibold text-sm text-gray-500 truncate">{ep.prestataire_nom}</p>
        <p className="text-xs text-gray-400">{ep.prestataire_domaine}</p>
      </div>

      {/* Actions */}
      <div className="flex gap-2 shrink-0">
        <button
          onClick={handleReactiver}
          disabled={loading}
          className="text-[11px] font-semibold px-3 py-1.5 rounded-lg transition-all active:scale-[0.97]"
          style={{ background: 'rgba(30,27,75,0.08)', color: '#1e1b4b' }}
        >
          {loading ? '…' : 'Réactiver'}
        </button>
      </div>
    </motion.div>
  );
}

// ── Composant principal ────────────────────────────────────────────────────────
export default function SelectionTab({ evenementId, evenementNom, clientNom, evenement, onNavigateToMessages }) {
  const qc = useQueryClient();
  const [profilOuvert, setProfilOuvert] = useState(null);
  const [refuses, setRefuses] = useState({}); // id → true (suivi local)
  const [relationOuvert, setRelationOuvert] = useState(null); // { ep, details } — vue mise en relation
  const [refusesOpen, setRefusesOpen] = useState(false);
  const [confirmingId, setConfirmingId] = useState(null);
  const [confirmModalOpen, setConfirmModalOpen] = useState(false);
  const [confirmRetirer, setConfirmRetirer] = useState(null); // { id, nom } — confirmation retrait favori

  const { data: evPrestataires = [] } = useQuery({
    queryKey: ['ev-prestataires-selection', evenementId],
    queryFn: () => base44.entities.EvenementPrestataire.filter({ evenement_id: evenementId }),
    enabled: !!evenementId,
  });

  const { data: tousPrestataires = [] } = useQuery({
    queryKey: ['prestataires-all'],
    queryFn: () => base44.entities.Prestataire.list(),
    enabled: evPrestataires.length > 0,
  });

  // Source canonique : CompanySettings (passeport prestataire) pour la photo de
  // couverture, le logo, le métier précis et le tarif — cohérent avec l'annuaire.
  const { data: allCompanySettings = [] } = useQuery({
    queryKey: ['company-settings-all'],
    queryFn: () => base44.entities.CompanySettings.list(),
    enabled: evPrestataires.length > 0,
  });

  const detailsMap = {};
  tousPrestataires.forEach(p => { detailsMap[p.id] = p; });
  const csMap = {};
  allCompanySettings.forEach(cs => { if (cs.prestataire_id) csMap[cs.prestataire_id] = cs; });

  // Marquer vu_par_client
  useEffect(() => {
    evPrestataires
      .filter(ep => ep.vu_par_client === false)
      .forEach(ep => {
        base44.entities.EvenementPrestataire.update(ep.id, { vu_par_client: true })
          .then(() => qc.invalidateQueries({ queryKey: ['ev-prestataires-selection', evenementId] }));
      });
  }, [evPrestataires.length]);

  // Catégories : recommandés (Recommandé), en discussion (Contacté), refusés (Annulé)
  const recommandes = evPrestataires.filter(ep =>
    ep.statut === 'Recommandé' && !refuses[ep.id]
  );
  const enDiscussion = evPrestataires.filter(ep =>
    ep.statut === 'Contacté' && !refuses[ep.id]
  );

  // Sélections du client (favoris depuis l'annuaire) — statut « Favori », marqueur
  // personnel sans effet de bord. N'apparaît ni dans Recommandés, ni dans En
  // discussion, ni dans Refusés, ni dans Mes prestataires confirmés.
  const selections = evPrestataires.filter(ep => ep.statut === 'Favori');

  const refusesList = evPrestataires.filter(ep =>
    ep.statut === 'Annulé' || refuses[ep.id]
  );

  const handleConfirmRelation = async (message) => {
    const ep = profilOuvert?.ep;
    if (!ep) return;
    setConfirmingId(ep.id);

    const parts = (clientNom || '').trim().split(/\s+/);
    const prenom = parts[0] || '';
    const nom = parts.slice(1).join(' ') || prenom;
    // Téléphone/email du client : depuis l'événement, avec repli sur l'entité Client liée.
    let clientTelephone = evenement?.client_telephone || null;
    let clientEmail = evenement?.client_email || null;
    if ((!clientTelephone || !clientEmail) && evenement?.client_id) {
      try {
        const found = await base44.entities.Client.filter({ id: evenement.client_id });
        const c = found[0];
        if (c) {
          clientTelephone = clientTelephone || c.telephone || null;
          clientEmail = clientEmail || c.email || null;
        }
      } catch {}
    }

    // Email du prestataire recommandé (pour cibler la notification vers son compte).
    const prestataireEmail = profilOuvert?.details?.portal_email || profilOuvert?.details?.email || null;

    await base44.entities.Prospect.create({
      prenom,
      nom,
      telephone: clientTelephone,
      email: clientEmail,
      lien_token: genToken(),
      prestataire_id: ep.prestataire_id,
      source: 'Recommandation prestataire',
      type_evenement: evenement?.type_evenement,
      date_evenement_souhaitee: evenement?.date,
      nb_invites_estime: evenement?.nb_invites,
      lieu_nom: evenement?.lieu_nom,
      statut: 'Nouveau',
    });
    await base44.entities.Notification.create({
      titre: 'Nouvelle mise en relation',
      message: `${clientNom || 'Un client'} souhaite vous contacter pour son ${evenement?.type_evenement || 'événement'}${evenement?.date ? ` du ${evenement.date}` : ''}.`,
      type: 'prestataire',
      lien: '/Clients?tab=prospects',
      user_email: prestataireEmail,
    });
    await base44.entities.EvenementPrestataire.update(ep.id, { statut: 'Contacté' });

    // Notification côté client (onglet Alertes)
    await base44.entities.Notification.create({
      titre: 'Demande envoyée',
      message: `Le prestataire ${ep.prestataire_nom} a bien reçu votre demande de mise en relation. Il reviendra vers vous rapidement.`,
      type: 'info',
      lu: false,
    });

    // Toast immédiat
    toast.success(`Votre demande a été transmise à ${ep.prestataire_nom}. Il vous contactera prochainement.`, {
      duration: 3000,
      icon: '✅',
    });

    // Créer une conversation avec ce prestataire pour le client
    const clientIdForConv = evenement?.client_id || `guest-${evenementId}`;
    const conv = await base44.entities.Conversation.create({
      client_id: clientIdForConv,
      evenement_id: evenementId,
      evenement_nom: evenementNom,
      client_nom: clientNom,
      prestataire_id: ep.prestataire_id,
      prestataire_nom: ep.prestataire_nom,
    });

    // Premier message de la conversation = texte saisi par le client
    const premierMessage = (message || '').trim();
    if (premierMessage) {
      await base44.entities.Message.create({
        conversation_id: conv.id,
        auteur: 'client',
        auteur_nom: clientNom,
        contenu: premierMessage,
        lu: false,
      });
      await base44.entities.Conversation.update(conv.id, {
        dernier_message: premierMessage,
        date_dernier_message: new Date().toISOString(),
        non_lus_admin: 1,
      });
    }

    setConfirmingId(null);
    setProfilOuvert(null);
    qc.invalidateQueries({ queryKey: ['ev-prestataires-selection', evenementId] });
    qc.invalidateQueries({ queryKey: ['ev-prestataires-client', evenementId] });
    qc.invalidateQueries({ queryKey: ['notifications'] });
    qc.invalidateQueries({ queryKey: ['conversations-badge'] });

    // Ouvrir directement la vue équivalente carte prospect (messagerie + documents + devis)
    setRelationOuvert({ ep: { ...ep, statut: 'Contacté' }, details: detailsMap[ep.prestataire_id] || null });
  };

  const handleRefuse = async (ep) => {
    await base44.entities.EvenementPrestataire.update(ep.id, { statut: 'Annulé' });
    setRefuses(prev => ({ ...prev, [ep.id]: true }));
    qc.invalidateQueries({ queryKey: ['ev-prestataires-selection', evenementId] });
  };

  const handleReactiver = (id) => {
    setRefuses(prev => { const n = { ...prev }; delete n[id]; return n; });
    qc.invalidateQueries({ queryKey: ['ev-prestataires-selection', evenementId] });
  };

  // Retirer un favori : l'EP « Favori » est un marqueur pur, on le supprime.
  const handleRetirerFavori = async (id) => {
    await base44.entities.EvenementPrestataire.delete(id);
    qc.invalidateQueries({ queryKey: ['ev-prestataires-selection', evenementId] });
    qc.invalidateQueries({ queryKey: ['ev-prestataires-annuaire', evenementId] });
  };

  return (
    <div className="px-4 pt-4 pb-8 space-y-6">

      {/* ── Bloc 1 : Prestataires recommandés ───────────────────────── */}
      <div className="space-y-3">
        <div>
          <p className="text-[11px] font-bold uppercase tracking-widest" style={{ color: '#1e1b4b' }}>
            🌟 Prestataires recommandés
          </p>
          <p className="text-xs mt-0.5" style={{ color: '#9ca3af' }}>
            Recommandés par les professionnels participant à votre événement.
          </p>
        </div>

        {recommandes.length > 0 ? (
          <AnimatePresence mode="popLayout">
            {recommandes.map(ep => (
              <PrestataireCard
                key={ep.id}
                context="recommande"
                cs={csMap[ep.prestataire_id] || null}
                d={detailsMap[ep.prestataire_id] || null}
                ep={ep}
                recommandePar={ep.recommande_par || null}
                description={detailsMap[ep.prestataire_id]?.description || null}
                onOpen={() => setProfilOuvert({ ep, details: detailsMap[ep.prestataire_id] || null, contactMasque: true })}
                onRefuse={() => handleRefuse(ep)}
              />
            ))}
          </AnimatePresence>
        ) : (
          <div className="flex flex-col items-center justify-center py-8 text-center space-y-2">
            <span className="text-4xl">🤷</span>
            <p className="font-semibold text-sm" style={{ color: '#1e1b4b' }}>Aucun prestataire recommandé pour l'instant</p>
          </div>
        )}
      </div>

      {/* ── Bloc 2 : Prestataires en discussion (Contacté) ───────────── */}
      {enDiscussion.length > 0 && (
        <div className="space-y-3">
          <div>
            <p className="text-[11px] font-bold uppercase tracking-widest" style={{ color: '#1e1b4b' }}>
              💬 En discussion
            </p>
            <p className="text-xs mt-0.5" style={{ color: '#9ca3af' }}>
              Prestataires que vous avez contactés. Touchez pour échanger.
            </p>
          </div>
          <AnimatePresence mode="popLayout">
            {enDiscussion.map(ep => (
              <CarteEnDiscussion
                key={ep.id}
                ep={ep}
                details={detailsMap[ep.prestataire_id] || null}
                onOuvrir={(ep) => setRelationOuvert({ ep, details: detailsMap[ep.prestataire_id] || null })}
              />
            ))}
          </AnimatePresence>
        </div>
      )}

      {/* ── Bloc 3 : Mes sélections (favoris depuis l'annuaire) ─────── */}
      {selections.length > 0 && (
        <div className="space-y-3">
          <div>
            <p className="text-[11px] font-bold uppercase tracking-widest" style={{ color: '#1e1b4b' }}>
              ❤️ Mes sélections
            </p>
            <p className="text-xs mt-0.5" style={{ color: '#9ca3af' }}>
              Prestataires repérés dans l'annuaire. Touchez pour confirmer la mise en relation.
            </p>
          </div>
          <AnimatePresence mode="popLayout">
            {selections.map(ep => (
              <PrestataireCard
                key={ep.id}
                context="selection"
                cs={csMap[ep.prestataire_id] || null}
                d={detailsMap[ep.prestataire_id] || null}
                ep={ep}
                favori
                onToggleFavori={() => setConfirmRetirer({ id: ep.id, nom: ep.prestataire_nom })}
                onOpen={() => setProfilOuvert({ ep, details: detailsMap[ep.prestataire_id] || null, contactMasque: true })}
              />
            ))}
          </AnimatePresence>
        </div>
      )}

      {/* ── Bloc 4 : Prestataires refusés (accordéon) ────────────────── */}
      {refusesList.length > 0 && (
        <div className="rounded-2xl border overflow-hidden" style={{ borderColor: '#e8e4dc' }}>
          {/* Header accordéon */}
          <motion.button
            whileTap={{ scale: 0.99 }}
            onClick={() => setRefusesOpen(v => !v)}
            className="flex items-center justify-between w-full px-4 py-3 text-left"
            style={{ background: '#f8f8f8' }}
          >
            <p className="text-sm font-semibold" style={{ color: '#9ca3af' }}>
              Prestataires refusés ({refusesList.length})
            </p>
            <motion.div
              animate={{ rotate: refusesOpen ? 180 : 0 }}
              transition={{ duration: 0.2 }}
              style={{ color: '#9ca3af' }}
            >
              <ChevronDown size={18} />
            </motion.div>
          </motion.button>

          {/* Corps dépliable */}
          <AnimatePresence initial={false}>
            {refusesOpen && (
              <motion.div
                key="refused-body"
                initial={{ height: 0, opacity: 0 }}
                animate={{ height: 'auto', opacity: 1 }}
                exit={{ height: 0, opacity: 0 }}
                transition={{ duration: 0.22 }}
                style={{ overflow: 'hidden' }}
              >
                <div className="px-3 py-3 space-y-2 border-t" style={{ borderColor: '#f1f5f9' }}>
                  <AnimatePresence>
                    {refusesList.map(ep => (
                      <CarteRefusee
                        key={ep.id}
                        ep={ep}
                        details={detailsMap[ep.prestataire_id] || null}
                        onReactiver={handleReactiver}
                      />
                    ))}
                  </AnimatePresence>
                </div>
              </motion.div>
            )}
          </AnimatePresence>
        </div>
      )}

      {/* Profil prestataire — modale plein écran propre (portal pour échapper au containing block de TabCarousel) */}
      {profilOuvert && createPortal(
        <div className="fixed inset-0 z-[60] flex flex-col bg-white">
          {/* Header fixe */}
          <div className="flex items-center justify-between px-4 py-3 border-b shrink-0" style={{ borderColor: '#e8e4dc' }}>
            <button
              onClick={() => setProfilOuvert(null)}
              className="w-10 h-10 rounded-full flex items-center justify-center transition-all active:scale-95"
              style={{ background: '#f3f4f6', color: '#1e1b4b' }}
            >
              <ArrowLeft size={20} />
            </button>
            <p className="font-semibold text-sm truncate px-2" style={{ color: '#1e1b4b' }}>
              {profilOuvert.ep.prestataire_nom}
            </p>
            <div className="w-10" />
          </div>

          {/* Contenu scrollable */}
          <div className="flex-1 overflow-y-auto">
            <VitrineProfil
              mode="prestataire"
              prestataire_id={profilOuvert.ep.prestataire_id}
              mode_decouverte={true}
              mode_recommandation={true}
              contactMasque={profilOuvert.contactMasque}
              onConfirm={handleConfirmRelation}
              onBack={() => setProfilOuvert(null)}
              confirming={confirmingId === profilOuvert.ep.id}
            />
          </div>

          {/* Bouton fixe en bas */}
          <div
            className="shrink-0 px-4 py-3 bg-white border-t"
            style={{ borderColor: '#e8e4dc', paddingBottom: 'max(0.75rem, env(safe-area-inset-bottom))' }}
          >
            <button
              onClick={() => setConfirmModalOpen(true)}
              disabled={confirmingId === profilOuvert.ep.id}
              className="w-full py-3.5 text-sm font-bold rounded-xl text-white transition-all active:scale-[0.97] disabled:opacity-60"
              style={{ background: '#1e1b4b' }}
            >
              {confirmingId === profilOuvert.ep.id ? 'Confirmation…' : 'Mise en relation'}
            </button>
          </div>
          <ConfirmRelationModal
            open={confirmModalOpen}
            onClose={() => setConfirmModalOpen(false)}
            onConfirm={(msg) => handleConfirmRelation(msg)}
            prestataireNom={profilOuvert.ep.prestataire_nom}
            evenement={evenement}
            confirming={!!confirmingId}
          />
        </div>,
        document.body
      )}
      {relationOuvert && (
        <MiseEnRelationView
          evenement={evenement}
          clientId={evenement?.client_id || `guest-${evenementId}`}
          clientNom={clientNom}
          ep={relationOuvert.ep}
          details={relationOuvert.details}
          onClose={() => setRelationOuvert(null)}
        />
      )}

      {/* ── Confirmation retrait favori ─────────────────────────────── */}
      {confirmRetirer && createPortal(
        <div className="fixed inset-0 z-[80] flex items-center justify-center p-4" onClick={() => setConfirmRetirer(null)}>
          <div className="absolute inset-0" style={{ background: 'rgba(0,0,0,0.45)' }} />
          <motion.div
            initial={{ opacity: 0, scale: 0.96, y: 8 }}
            animate={{ opacity: 1, scale: 1, y: 0 }}
            transition={{ duration: 0.18 }}
            className="relative w-full max-w-sm rounded-2xl bg-white shadow-2xl p-5"
            onClick={(e) => e.stopPropagation()}
          >
            <p className="font-bold text-base text-center" style={{ color: '#1e1b4b' }}>
              Retirer ce prestataire de vos sélections ?
            </p>
            <p className="text-xs text-center mt-1.5" style={{ color: '#9ca3af' }}>
              {confirmRetirer.nom} ne sera plus dans vos favoris.
            </p>
            <div className="flex gap-2 mt-5">
              <button
                onClick={() => setConfirmRetirer(null)}
                className="flex-1 py-3 rounded-xl text-sm font-semibold transition-all active:scale-[0.97]"
                style={{ background: 'rgba(30,27,75,0.06)', color: '#1e1b4b' }}
              >
                Annuler
              </button>
              <button
                onClick={async () => {
                  const id = confirmRetirer.id;
                  setConfirmRetirer(null);
                  await handleRetirerFavori(id);
                  toast.success('Prestataire retiré de vos sélections.', { duration: 2500, icon: '❤️' });
                }}
                className="flex-1 py-3 rounded-xl text-sm font-bold text-white transition-all active:scale-[0.97]"
                style={{ background: '#dc2626' }}
              >
                Retirer
              </button>
            </div>
          </motion.div>
        </div>,
        document.body
      )}
    </div>
  );
}