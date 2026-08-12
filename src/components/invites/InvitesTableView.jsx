/**
 * InvitesTableView — Vue compacte en tableau des invités
 * Props: invites, organizerName, onDelete
 */
import { useState } from 'react';
import { Share2, QrCode, Trash2 } from 'lucide-react';
import ShareInviteModal from './ShareInviteModal';
import QRCodeInvite from './QRCodeInvite';

const STATUT_STYLES = {
  'Confirmé':   { bg: '#f0fdf4', color: '#16a34a', dot: '🟢' },
  'Absent':     { bg: '#fff1f2', color: '#be123c', dot: '🔴' },
  'En attente': { bg: '#f9fafb', color: '#6b7280', dot: '⚪' },
  'Peut-être':  { bg: '#fff7ed', color: '#c2410c', dot: '🟠' },
  'Partiel':    { bg: '#f5f3ff', color: '#6d28d9', dot: '🟣' },
};

const ALLERGENE_LABELS = {
  gluten: 'Gluten', crustaces: 'Crustacés', oeufs: 'Œufs', poissons: 'Poissons',
  arachides: 'Arachides', soja: 'Soja', lait: 'Lait', fruits_coque: 'F. coque',
  celeri: 'Céleri', moutarde: 'Moutarde', sesame: 'Sésame', sulfites: 'Sulfites',
  lupin: 'Lupin', mollusques: 'Mollusques',
};

function computeTotal(invite) {
  return 1 + (invite.accompagnants || []).length;
}

function allergenesResume(invite) {
  const all = [...(invite.allergenes || [])];
  (invite.accompagnants || []).forEach(a => (a.allergenes || []).forEach(alg => {
    if (!all.includes(alg)) all.push(alg);
  }));
  return all.map(a => ALLERGENE_LABELS[a] || a).join(', ');
}

function TableRow({ invite, organizerName, onDelete }) {
  const [showShare, setShowShare] = useState(false);
  const [showQR, setShowQR] = useState(false);
  const statut = invite.statut_rsvp || 'En attente';
  const style = STATUT_STYLES[statut] || STATUT_STYLES['En attente'];
  const total = computeTotal(invite);
  const allergenes = allergenesResume(invite);

  return (
    <tr className="border-b last:border-0" style={{ borderColor: '#f1f5f9' }}>
      <td className="px-3 py-2.5">
        <p className="text-sm font-semibold" style={{ color: '#1e1b4b' }}>
          {invite.prenom} {invite.nom}
        </p>
        {invite.groupe && (
          <p className="text-[10px] text-gray-400">{invite.groupe}</p>
        )}
      </td>
      <td className="px-3 py-2.5">
        <span className="text-[11px] font-semibold px-2 py-0.5 rounded-full whitespace-nowrap"
          style={{ background: style.bg, color: style.color }}>
          {style.dot} {statut}
        </span>
      </td>
      <td className="px-3 py-2.5 text-center">
        <span className="text-sm font-bold" style={{ color: '#1e1b4b' }}>{total}</span>
      </td>
      <td className="px-3 py-2.5">
        {invite.moment_nom ? (
          <span className="text-[10px] px-2 py-0.5 rounded-full font-medium"
            style={{ background: '#eef2ff', color: '#4338ca' }}>
            {invite.moment_nom}
          </span>
        ) : (
          <span className="text-gray-300 text-xs">—</span>
        )}
      </td>
      <td className="px-3 py-2.5">
        {allergenes ? (
          <span className="text-[11px] text-rose-600 font-medium">{allergenes}</span>
        ) : (
          <span className="text-gray-300 text-xs">—</span>
        )}
      </td>
      <td className="px-3 py-2.5">
        <div className="flex items-center gap-1">
          <button onClick={() => setShowShare(true)} title="Partager"
            className="w-7 h-7 rounded-lg flex items-center justify-center text-gray-400 hover:text-blue-600 hover:bg-blue-50 transition-colors">
            <Share2 size={13} />
          </button>
          {invite.lien_token && (
            <button onClick={() => setShowQR(true)} title="QR Code"
              className="w-7 h-7 rounded-lg flex items-center justify-center text-gray-400 hover:text-violet-600 hover:bg-violet-50 transition-colors">
              <QrCode size={13} />
            </button>
          )}
          <button onClick={() => onDelete(invite.id)}
            className="w-7 h-7 rounded-lg flex items-center justify-center text-gray-300 hover:text-red-400 transition-colors">
            <Trash2 size={13} />
          </button>
        </div>
      </td>
      {showShare && <ShareInviteModal invite={invite} organizerName={organizerName} onClose={() => setShowShare(false)} />}
      {showQR && <QRCodeInvite invite={invite} onClose={() => setShowQR(false)} />}
    </tr>
  );
}

export default function InvitesTableView({ invites, organizerName, onDelete }) {
  if (invites.length === 0) {
    return (
      <div className="text-center py-10 space-y-2">
        <p className="text-3xl">👥</p>
        <p className="text-sm text-gray-400">Aucun résultat</p>
      </div>
    );
  }

  return (
    <div className="rounded-2xl border overflow-hidden" style={{ borderColor: '#e8e4dc' }}>
      <div className="overflow-x-auto">
        <table className="w-full text-xs">
          <thead>
            <tr style={{ background: '#f8fafc' }}>
              <th className="text-left px-3 py-2 font-semibold text-gray-500 border-b" style={{ borderColor: '#f1f5f9' }}>Invité</th>
              <th className="text-left px-3 py-2 font-semibold text-gray-500 border-b" style={{ borderColor: '#f1f5f9' }}>Statut</th>
              <th className="text-center px-3 py-2 font-semibold text-gray-500 border-b" style={{ borderColor: '#f1f5f9' }}>Pers.</th>
              <th className="text-left px-3 py-2 font-semibold text-gray-500 border-b" style={{ borderColor: '#f1f5f9' }}>Moment</th>
              <th className="text-left px-3 py-2 font-semibold text-gray-500 border-b" style={{ borderColor: '#f1f5f9' }}>Allergènes</th>
              <th className="text-left px-3 py-2 font-semibold text-gray-500 border-b" style={{ borderColor: '#f1f5f9' }}>Actions</th>
            </tr>
          </thead>
          <tbody style={{ background: 'white' }}>
            {invites.map(invite => (
              <TableRow
                key={invite.id}
                invite={invite}
                organizerName={organizerName}
                onDelete={onDelete}
              />
            ))}
          </tbody>
        </table>
      </div>
    </div>
  );
}