/**
 * TableViewModal — Lecture seule d'une table et de ses invités
 * Props: table, invites (tous les invités de l'événement), onClose
 */
import { motion } from 'framer-motion';
import { X } from 'lucide-react';
import { tableDisplayName } from '@/lib/tableName';

const AVATAR_COLORS = [
  '#1e1b4b', '#7c3aed', '#1d4ed8', '#0f766e', '#15803d',
  '#c2410c', '#b91c1c', '#be185d', '#6d28d9', '#0369a1',
];

function getAvatarColor(name) {
  const idx = (name || '').charCodeAt(0) % AVATAR_COLORS.length;
  return AVATAR_COLORS[idx];
}

function Avatar({ prenom, nom, size = 32 }) {
  const initiales = `${(prenom || '?')[0]}${(nom || '')[0] || ''}`.toUpperCase();
  return (
    <div style={{
      width: size, height: size, borderRadius: '50%',
      background: getAvatarColor(prenom), color: 'white',
      display: 'flex', alignItems: 'center', justifyContent: 'center',
      fontSize: size * 0.36, fontWeight: 700, flexShrink: 0,
    }}>
      {initiales}
    </div>
  );
}

function InviteRow({ inv }) {
  const isMineur = inv.categorie === 'Mineur';
  const hasRestriction = (inv.allergenes || []).length > 0 || !!inv.regime_alimentaire;
  return (
    <div className="flex items-center gap-3 rounded-xl border px-3 py-2.5" style={{ borderColor: '#f1f5f9' }}>
      <Avatar prenom={inv.prenom} nom={inv.nom} size={32} />
      <div className="flex-1 min-w-0">
        <p className="text-sm font-semibold truncate" style={{ color: '#1e1b4b' }}>
          {inv.prenom} {inv.nom}
          {isMineur && (
            <span className="text-[10px] font-normal text-violet-500 ml-1">
              ({inv.age ? `${inv.age} ans` : 'Mineur'})
            </span>
          )}
        </p>
        <div className="flex items-center gap-1.5 mt-0.5 flex-wrap">
          <span className="text-[10px] text-gray-400">{isMineur ? 'Mineur' : 'Adulte'}</span>
          {hasRestriction && (
            <span className="text-[10px] font-medium" style={{ color: '#be123c' }}>
              · 🌿 {inv.regime_alimentaire
                ? inv.regime_alimentaire
                : `${inv.allergenes.length} allergie${inv.allergenes.length > 1 ? 's' : ''}`}
            </span>
          )}
        </div>
      </div>
    </div>
  );
}

export default function TableViewModal({ table, invites, onClose }) {
  const invitesTable = invites.filter(i =>
    i.table_attribuee === table.id || i.table_attribuee === table.nom
  );
  const capacite = table.capacite || null;
  const isOver = capacite && invitesTable.length > capacite;

  return (
    <motion.div
      className="fixed inset-0 z-[99999] flex items-end justify-center"
      initial={{ opacity: 0 }}
      animate={{ opacity: 1 }}
      exit={{ opacity: 0 }}
      onClick={onClose}
    >
      <div className="absolute inset-0" style={{ background: 'rgba(0,0,0,0.5)' }} />
      <motion.div
        initial={{ y: '100%' }}
        animate={{ y: 0 }}
        exit={{ y: '100%' }}
        transition={{ type: 'spring', damping: 32, stiffness: 320 }}
        className="relative w-full max-w-lg bg-white rounded-t-3xl shadow-2xl flex flex-col overflow-hidden"
        style={{ maxHeight: '88vh' }}
        onClick={e => e.stopPropagation()}
      >
        {/* Header navy */}
        <div className="px-5 pt-5 pb-4 shrink-0" style={{ background: '#1e1b4b' }}>
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-3">
              <div className="w-9 h-9 rounded-xl flex items-center justify-center" style={{ background: 'rgba(255,255,255,0.12)' }}>
                <span className="text-lg">🪑</span>
              </div>
              <div>
                <h3 className="font-bold text-base text-white">{tableDisplayName(table)}</h3>
                <p className="text-xs mt-0.5" style={{ color: isOver ? '#fca5a5' : 'rgba(255,255,255,0.55)' }}>
                  {invitesTable.length}{capacite ? ` / ${capacite} places` : ` invité${invitesTable.length > 1 ? 's' : ''}`}
                  {isOver && ' · ⚠️ Surcharge'}
                </p>
              </div>
            </div>
            <button onClick={onClose} className="w-8 h-8 flex items-center justify-center rounded-full text-white/60 hover:text-white hover:bg-white/10 transition-colors">
              <X size={16} />
            </button>
          </div>
        </div>

        {/* Liste */}
        <div className="overflow-y-auto flex-1 px-4 py-4 space-y-2">
          {invitesTable.length === 0 ? (
            <div className="text-center py-10">
              <span className="text-3xl">🪑</span>
              <p className="text-sm text-gray-400 mt-2">Aucun invité assigné à cette table</p>
            </div>
          ) : (
            invitesTable.map(inv => <InviteRow key={inv.id} inv={inv} />)
          )}
        </div>

        {/* Footer */}
        <div className="px-4 pb-8 pt-3 border-t shrink-0" style={{ borderColor: '#f1f5f9' }}>
          <button
            onClick={onClose}
            className="w-full py-3 rounded-2xl text-white text-sm font-semibold"
            style={{ background: '#1e1b4b' }}>
            Fermer
          </button>
        </div>
      </motion.div>
    </motion.div>
  );
}