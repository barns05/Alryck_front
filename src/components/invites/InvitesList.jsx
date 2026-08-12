/**
 * InvitesList — Liste plate des invités (architecture nouvelle)
 * Une ligne = une personne indépendante
 * Props: evenementId, evenementNom, onClose, filterMomentId (optionnel)
 */
import { useState } from 'react';
import { useQuery, useQueryClient } from '@tanstack/react-query';
import { base44 } from '@/api/base44Client';
import { Share2, Trash2, ChevronDown, QrCode, LayoutList, Table2 } from 'lucide-react';
import InviteModal from './InviteModal';
import QRCodeInvite from './QRCodeInvite';
import ShareInviteModal from './ShareInviteModal';
import InvitesTableView from './InvitesTableView';
import { AnimatePresence, motion } from 'framer-motion';

const STATUT_STYLES = {
  'Confirmé':   { bg: '#f0fdf4', color: '#16a34a', dot: '🟢' },
  'Absent':     { bg: '#fff1f2', color: '#be123c', dot: '🔴' },
  'En attente': { bg: '#f9fafb', color: '#6b7280', dot: '⚪' },
  'Peut-être':  { bg: '#fff7ed', color: '#c2410c', dot: '🟠' },
};

const ALLERGENE_LABELS = {
  gluten: 'Gluten', crustaces: 'Crustacés', oeufs: 'Œufs', poissons: 'Poissons',
  arachides: 'Arachides', soja: 'Soja', lait: 'Lait', fruits_coque: 'Fruits à coque',
  celeri: 'Céleri', moutarde: 'Moutarde', sesame: 'Sésame', sulfites: 'Sulfites',
  lupin: 'Lupin', mollusques: 'Mollusques',
};

function InviteRow({ invite, organizerName, onDelete }) {
  const [expanded, setExpanded] = useState(false);
  const [showQR, setShowQR] = useState(false);
  const [showShare, setShowShare] = useState(false);

  const statut = invite.statut_rsvp || 'En attente';
  const style = STATUT_STYLES[statut] || STATUT_STYLES['En attente'];
  const allergeneLabels = (invite.allergenes || []).map(a => ALLERGENE_LABELS[a] || a);
  const reponsesCustom = invite.reponses_custom || {};
  const hasReponsesCustom = Object.keys(reponsesCustom).some(k => reponsesCustom[k]);
  const hasDetails = allergeneLabels.length > 0 || invite.regime_alimentaire || invite.message_organisateur || invite.besoin_hebergement || hasReponsesCustom;
  const isMineur = invite.categorie === 'Mineur';

  return (
    <motion.div
      initial={{ opacity: 0, y: 6 }}
      animate={{ opacity: 1, y: 0 }}
      exit={{ opacity: 0, y: -4 }}
      className="rounded-2xl border overflow-hidden"
      style={{ borderColor: '#e8e4dc', background: '#fff' }}
    >
      <div className="flex items-start gap-3 p-3">
        <div className="flex-1 min-w-0">
          <div className="flex items-center gap-2 flex-wrap">
            <p className="text-sm font-semibold" style={{ color: '#1e1b4b' }}>
              {invite.prenom} {invite.nom}
            </p>
            <span className="text-[11px] font-semibold px-2 py-0.5 rounded-full"
              style={{ background: style.bg, color: style.color }}>
              {style.dot} {statut}
            </span>
            <span className="text-[10px] px-2 py-0.5 rounded-full font-medium bg-slate-100 text-slate-500">
              {isMineur ? `👦 Mineur${invite.age ? ` · ${invite.age} ans` : ''}` : '👤 Adulte'}
            </span>
            {invite.moment_nom && (
              <span className="text-[10px] px-2 py-0.5 rounded-full font-medium"
                style={{ background: '#eef2ff', color: '#4338ca' }}>
                ⏱️ {invite.moment_nom}
              </span>
            )}
            {invite.groupe && (
              <span className="text-[10px] px-2 py-0.5 rounded-full bg-slate-100 text-slate-500 font-medium">
                {invite.groupe}
              </span>
            )}
          </div>
          {allergeneLabels.length > 0 && (
            <p className="text-[10px] text-rose-500 mt-1">🌾 {allergeneLabels.join(', ')}</p>
          )}
        </div>

        <div className="flex items-center gap-1 shrink-0 mt-0.5">
          <button onClick={() => setShowShare(true)} title="Partager"
            className="w-8 h-8 rounded-xl flex items-center justify-center text-gray-400 hover:text-blue-600 hover:bg-blue-50 transition-colors">
            <Share2 size={14} />
          </button>
          {invite.lien_token && (
            <button onClick={() => setShowQR(true)} title="QR Code"
              className="w-8 h-8 rounded-xl flex items-center justify-center text-gray-400 hover:text-violet-600 hover:bg-violet-50 transition-colors">
              <QrCode size={14} />
            </button>
          )}
          {hasDetails && (
            <button onClick={() => setExpanded(v => !v)}
              className="w-8 h-8 rounded-xl flex items-center justify-center text-gray-400 hover:text-gray-600 transition-colors">
              <motion.div animate={{ rotate: expanded ? 180 : 0 }} transition={{ duration: 0.2 }}>
                <ChevronDown size={14} />
              </motion.div>
            </button>
          )}
          <button onClick={() => onDelete(invite.id)}
            className="w-8 h-8 rounded-xl flex items-center justify-center text-gray-300 hover:text-red-400 transition-colors">
            <Trash2 size={14} />
          </button>
        </div>
      </div>

      {showQR && <QRCodeInvite invite={invite} onClose={() => setShowQR(false)} />}
      {showShare && (
        <ShareInviteModal invite={invite} organizerName={organizerName} onClose={() => setShowShare(false)} />
      )}

      <AnimatePresence>
        {expanded && hasDetails && (
          <motion.div
            initial={{ height: 0, opacity: 0 }}
            animate={{ height: 'auto', opacity: 1 }}
            exit={{ height: 0, opacity: 0 }}
            transition={{ duration: 0.2 }}
            className="overflow-hidden"
          >
            <div className="px-3 pb-4 pt-1 space-y-2 border-t" style={{ borderColor: '#f1f5f9' }}>
              {invite.regime_alimentaire && (
                <p className="text-xs text-blue-600">🍽️ {invite.regime_alimentaire}</p>
              )}
              {invite.besoin_hebergement && (
                <p className="text-xs text-indigo-600">🏨 Besoin hébergement</p>
              )}
              {invite.message_organisateur && (
                <p className="text-xs text-gray-500 italic">💌 "{invite.message_organisateur}"</p>
              )}
              {hasReponsesCustom && (
                <div className="pt-1 space-y-1">
                  {Object.entries(reponsesCustom).map(([k, v]) => v ? (
                    <p key={k} className="text-xs text-violet-600">❓ {v}</p>
                  ) : null)}
                </div>
              )}
            </div>
          </motion.div>
        )}
      </AnimatePresence>
    </motion.div>
  );
}

export default function InvitesList({ evenementId, evenementNom, onClose, filterMomentId }) {
  const qc = useQueryClient();
  const [filterStatut, setFilterStatut] = useState('Tous');
  const [showModal, setShowModal] = useState(false);
  const [search, setSearch] = useState('');
  const [vue, setVue] = useState('cartes');

  const { data: invites = [], isLoading } = useQuery({
    queryKey: ['invites', evenementId],
    queryFn: () => base44.entities.Invite.filter({ evenement_id: evenementId }),
    enabled: !!evenementId,
  });

  const existingGroupeToken = invites.find(i => i.groupe_lien_token)?.groupe_lien_token || null;

  const { data: evenement = null } = useQuery({
    queryKey: ['evenement', evenementId],
    queryFn: () => base44.entities.Evenement.filter({ id: evenementId }).then(r => r[0] || null),
    enabled: !!evenementId,
    staleTime: 60000,
  });

  const { data: client = null } = useQuery({
    queryKey: ['client', evenement?.client_id],
    queryFn: () => base44.entities.Client.filter({ id: evenement.client_id }).then(r => r[0] || null),
    enabled: !!evenement?.client_id,
    staleTime: 60000,
  });

  const organizerName = client?.prenom
    ? (client.prenom2 ? `${client.prenom} & ${client.prenom2}` : client.prenom)
    : evenementNom || '';

  const handleDelete = async (id) => {
    await base44.entities.Invite.delete(id);
    qc.invalidateQueries(['invites', evenementId]);
  };

  const filtered = invites.filter(i => {
    // Exclure les invites ancres du mode Groupe
    if (i.archived && i.prenom === '_groupe_') return false;
    const matchStatut = filterStatut === 'Tous' || (i.statut_rsvp || 'En attente') === filterStatut;
    const matchSearch = !search || `${i.prenom} ${i.nom}`.toLowerCase().includes(search.toLowerCase());
    const matchMoment = !filterMomentId || filterMomentId === 'tous' || i.moment_id === filterMomentId;
    return matchStatut && matchSearch && matchMoment;
  });

  return (
    <div className="space-y-4">
      <div className="space-y-2">
        <div className="flex items-center gap-2">
          <input
            type="text"
            placeholder="Rechercher une personne…"
            value={search}
            onChange={e => setSearch(e.target.value)}
            style={{ fontSize: 16, borderColor: '#e2e8f0' }}
            className="flex-1 rounded-xl border px-3 py-2 text-sm focus:outline-none"
          />
          <div className="flex rounded-xl border overflow-hidden shrink-0" style={{ borderColor: '#e2e8f0' }}>
            <button onClick={() => setVue('cartes')} title="Vue cartes"
              className="w-9 h-9 flex items-center justify-center transition-colors"
              style={{ background: vue === 'cartes' ? '#1e1b4b' : 'white', color: vue === 'cartes' ? 'white' : '#6b7280' }}>
              <LayoutList size={15} />
            </button>
            <button onClick={() => setVue('tableau')} title="Vue tableau"
              className="w-9 h-9 flex items-center justify-center transition-colors"
              style={{ background: vue === 'tableau' ? '#1e1b4b' : 'white', color: vue === 'tableau' ? 'white' : '#6b7280' }}>
              <Table2 size={15} />
            </button>
          </div>
        </div>
        <div className="flex gap-1.5 flex-wrap">
          {['Tous', 'Confirmé', 'En attente', 'Peut-être', 'Absent'].map(s => (
            <button key={s} onClick={() => setFilterStatut(s)}
              className="px-3 py-1 rounded-full text-xs font-medium border transition-colors"
              style={{
                borderColor: filterStatut === s ? '#1e1b4b' : '#e2e8f0',
                background: filterStatut === s ? '#1e1b4b' : 'white',
                color: filterStatut === s ? 'white' : '#374151',
              }}>
              {s}
            </button>
          ))}
        </div>
      </div>

      <button onClick={() => setShowModal(true)}
        className="w-full py-3 rounded-2xl text-white text-sm font-semibold flex items-center justify-center gap-2"
        style={{ background: '#1e1b4b' }}>
        ➕ Ajouter une personne
      </button>

      {isLoading ? (
        <div className="flex items-center justify-center py-8">
          <div className="w-6 h-6 border-2 border-purple-200 border-t-purple-600 rounded-full animate-spin" />
        </div>
      ) : filtered.length === 0 ? (
        <div className="text-center py-10 space-y-2">
          <p className="text-3xl">👥</p>
          <p className="text-sm text-gray-400">
            {invites.length === 0 ? 'Aucune personne ajoutée pour l\'instant' : 'Aucun résultat pour ce filtre'}
          </p>
        </div>
      ) : vue === 'tableau' ? (
        <InvitesTableView invites={filtered} organizerName={organizerName} onDelete={handleDelete} />
      ) : (
        <AnimatePresence>
          {filtered.map(invite => (
            <InviteRow
              key={invite.id}
              invite={invite}
              organizerName={organizerName}
              onDelete={handleDelete}
            />
          ))}
        </AnimatePresence>
      )}

      {showModal && (
        <InviteModal
          evenementId={evenementId}
          evenementNom={evenementNom}
          invite={null}
          onClose={() => setShowModal(false)}
          onSaved={() => qc.invalidateQueries(['invites', evenementId])}
          existingGroupeToken={existingGroupeToken}
        />
      )}
    </div>
  );
}