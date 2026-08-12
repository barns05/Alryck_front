/**
 * TablesOverviewModal — Vue lecture seule de toutes les tables et leurs invités
 * Props: tables, invites, onClose
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

function Avatar({ prenom, nom, size = 28 }) {
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

function TableSection({ table, invites }) {
  const invitesTable = invites.filter(i =>
    i.table_attribuee === table.id
  );
  const capacite = table.capacite || null;
  const isOver = capacite && invitesTable.length > capacite;
  const isFull = capacite && invitesTable.length >= capacite && !isOver;

  return (
    <div className="rounded-2xl border-2 overflow-hidden" style={{
      borderColor: isOver ? '#fca5a5' : isFull ? '#86efac' : invitesTable.length > 0 ? '#fed7aa' : '#e8e4dc'
    }}>
      {/* Table header */}
      <div className="flex items-center gap-3 px-4 py-3" style={{ background: '#fafaf9' }}>
        <div className="w-8 h-8 rounded-xl flex items-center justify-center shrink-0" style={{ background: '#fff7ed' }}>
          <span className="text-base">🪑</span>
        </div>
        <div className="flex-1 min-w-0">
          <p className="font-bold text-sm truncate" style={{ color: '#1e1b4b' }}>{tableDisplayName(table)}</p>
          <p className="text-xs" style={{ color: isOver ? '#dc2626' : isFull ? '#16a34a' : '#c2410c' }}>
            {invitesTable.length}{capacite ? ` / ${capacite} places` : ` invité${invitesTable.length > 1 ? 's' : ''}`}
            {isOver && ' ⚠️ Surcharge'}
            {isFull && ' ✓ Complet'}
          </p>
        </div>
      </div>

      {/* Invités */}
      <div className="px-3 pb-3 space-y-1.5 bg-white">
        {invitesTable.length === 0 ? (
          <p className="text-xs text-gray-300 italic py-2 pl-1">Aucun invité assigné</p>
        ) : (
          invitesTable.map(inv => {
            const isMineur = inv.categorie === 'Mineur';
            const hasRestriction = (inv.allergenes || []).length > 0 || !!inv.regime_alimentaire;
            return (
              <div key={inv.id} className="flex items-center gap-2.5 py-1.5 border-b last:border-0" style={{ borderColor: '#f1f5f9' }}>
                <Avatar prenom={inv.prenom} nom={inv.nom} size={26} />
                <div className="flex-1 min-w-0">
                  <p className="text-sm font-medium truncate" style={{ color: '#1e1b4b' }}>
                    {inv.prenom} {inv.nom}
                    {isMineur && (
                      <span className="text-[10px] font-normal text-violet-500 ml-1">
                        ({inv.age ? `${inv.age} ans` : 'Mineur'})
                      </span>
                    )}
                  </p>
                  {hasRestriction && (
                    <p className="text-[10px] font-medium" style={{ color: '#be123c' }}>
                      🌿 {inv.regime_alimentaire
                        ? inv.regime_alimentaire
                        : `${inv.allergenes.length} allergie${inv.allergenes.length > 1 ? 's' : ''}`}
                    </p>
                  )}
                </div>
                <span className="text-[10px] shrink-0" style={{ color: isMineur ? '#7c3aed' : '#9ca3af' }}>
                  {isMineur ? 'Mineur' : 'Adulte'}
                </span>
              </div>
            );
          })
        )}
      </div>
    </div>
  );
}

export default function TablesOverviewModal({ tables, invites, onClose }) {
  const sortedTables = tables.slice().sort((a, b) => (a.ordre ?? 0) - (b.ordre ?? 0));
  const totalPlaces = invites.filter(i => !!i.table_attribuee && i.table_attribuee !== '').length;
  const totalSansTable = invites.filter(i => !i.table_attribuee || i.table_attribuee === '').length;

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
        style={{ maxHeight: '92vh' }}
        onClick={e => e.stopPropagation()}
      >
        {/* Header navy */}
        <div className="px-5 pt-5 pb-4 shrink-0" style={{ background: '#1e1b4b' }}>
          <div className="flex items-center justify-between mb-3">
            <h3 className="font-bold text-base text-white">👁 Vue d'ensemble des tables</h3>
            <button onClick={onClose} className="w-8 h-8 flex items-center justify-center rounded-full text-white/60 hover:text-white hover:bg-white/10 transition-colors">
              <X size={16} />
            </button>
          </div>
          {/* Mini stats */}
          <div className="grid grid-cols-3 gap-2">
            {[
              { val: sortedTables.length, label: 'Tables', color: 'rgba(255,255,255,0.9)' },
              { val: totalPlaces, label: 'Placés', color: '#86efac' },
              { val: totalSansTable, label: 'Sans table', color: '#fca5a5' },
            ].map(s => (
              <div key={s.label} className="rounded-xl py-2 text-center" style={{ background: 'rgba(255,255,255,0.08)' }}>
                <p className="text-lg font-bold" style={{ color: s.color }}>{s.val}</p>
                <p className="text-[10px]" style={{ color: 'rgba(255,255,255,0.45)' }}>{s.label}</p>
              </div>
            ))}
          </div>
        </div>

        {/* Liste des tables */}
        <div className="overflow-y-auto flex-1 px-4 py-4 space-y-3">
          {sortedTables.length === 0 ? (
            <div className="text-center py-10">
              <span className="text-3xl">🪑</span>
              <p className="text-sm text-gray-400 mt-2">Aucune table créée</p>
            </div>
          ) : (
            sortedTables.map(table => (
              <TableSection key={table.id} table={table} invites={invites} />
            ))
          )}

          {/* Invités sans table */}
          {totalSansTable > 0 && (
            <div className="rounded-2xl border-2 overflow-hidden" style={{ borderColor: '#fed7aa' }}>
              <div className="flex items-center gap-3 px-4 py-3" style={{ background: '#fff7ed' }}>
                <div className="w-8 h-8 rounded-xl bg-orange-100 flex items-center justify-center shrink-0">
                  <span className="text-base">👤</span>
                </div>
                <div>
                  <p className="font-bold text-sm" style={{ color: '#c2410c' }}>Sans table</p>
                  <p className="text-xs" style={{ color: '#c2410c' }}>{totalSansTable} personne{totalSansTable > 1 ? 's' : ''}</p>
                </div>
              </div>
              <div className="px-3 pb-3 space-y-1.5 bg-white">
                {invites.filter(i => !i.table_attribuee || i.table_attribuee === '').map(inv => {
                  const isMineur = inv.categorie === 'Mineur';
                  const hasRestriction = (inv.allergenes || []).length > 0 || !!inv.regime_alimentaire;
                  return (
                    <div key={inv.id} className="flex items-center gap-2.5 py-1.5 border-b last:border-0" style={{ borderColor: '#f1f5f9' }}>
                      <Avatar prenom={inv.prenom} nom={inv.nom} size={26} />
                      <div className="flex-1 min-w-0">
                        <p className="text-sm font-medium truncate" style={{ color: '#1e1b4b' }}>
                          {inv.prenom} {inv.nom}
                          {isMineur && (
                            <span className="text-[10px] font-normal text-violet-500 ml-1">
                              ({inv.age ? `${inv.age} ans` : 'Mineur'})
                            </span>
                          )}
                        </p>
                        {hasRestriction && (
                          <p className="text-[10px] font-medium" style={{ color: '#be123c' }}>
                            🌿 {inv.regime_alimentaire
                              ? inv.regime_alimentaire
                              : `${inv.allergenes.length} allergie${inv.allergenes.length > 1 ? 's' : ''}`}
                          </p>
                        )}
                      </div>
                    </div>
                  );
                })}
              </div>
            </div>
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