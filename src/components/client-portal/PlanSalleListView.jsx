/**
 * PlanSalleListView — Vue liste du Plan de salle (côté client).
 *
 * Tables triées par `ordre` (ordre logique d'affichage, fixé à l'emplacement
 * spatial lors de l'application d'une configuration — voir AutoPlacementModal).
 * Lecture seule : l'ordre n'est plus modifiable depuis cette vue (ni le contenu —
 * rename / assignation — qui reste dans « Mon plan de table »).
 * Clic sur une ligne → occupants (invités assignés).
 */
import { useState } from 'react';
import { ChevronDown } from 'lucide-react';
import { AnimatePresence, motion } from 'framer-motion';
import { tableDisplayName } from '@/lib/tableName';
import { avatarColor, avatarInitiales as initiales } from '@/lib/avatarColor';

export default function PlanSalleListView({ evenementId, tables, invites }) {
  const [expanded, setExpanded] = useState(null);
  const sorted = [...tables].sort((a, b) => (a.ordre ?? 0) - (b.ordre ?? 0));

  if (tables.length === 0) {
    return (
      <div className="text-center py-10 space-y-2">
        <span className="text-4xl">🪑</span>
        <p className="text-sm font-semibold" style={{ color: '#1e1b4b' }}>Aucune table placée</p>
        <p className="text-xs text-gray-400">Choisissez une configuration pour générer vos tables.</p>
      </div>
    );
  }

  return (
    <div className="space-y-2">
      <p className="text-[11px] text-muted-foreground">
        Cliquez sur une table pour voir ses occupants.
      </p>
      {sorted.map((t) => {
        const occupants = invites.filter(i => i.table_attribuee === t.id);
        const isOpen = expanded === t.id;
        return (
          <div
            key={t.id}
            className="rounded-2xl border bg-white overflow-hidden"
            style={{ borderColor: isOpen ? '#C5A059' : '#e8e4dc' }}
          >
            <div className="flex items-center gap-2 p-3">
              <button
                onClick={() => setExpanded(isOpen ? null : t.id)}
                className="flex-1 flex items-center gap-2 text-left min-w-0"
              >
                <span className="w-8 h-8 rounded-lg flex items-center justify-center text-sm shrink-0" style={{ background: 'rgba(30,27,75,0.06)' }}>🪑</span>
                <span className="flex-1 min-w-0">
                  <span className="block text-sm font-semibold truncate" style={{ color: '#1e1b4b' }}>{tableDisplayName(t)}</span>
                  <span className="block text-[11px]" style={{ color: '#9ca3af' }}>
                    {occupants.length} invité{occupants.length > 1 ? 's' : ''}
                    {t.capacite ? ` / ${t.capacite}` : ''}
                  </span>
                </span>
                <motion.span animate={{ rotate: isOpen ? 180 : 0 }} className="text-gray-400 shrink-0">
                  <ChevronDown size={16} />
                </motion.span>
              </button>
            </div>
            <AnimatePresence initial={false}>
              {isOpen && (
                <motion.div
                  initial={{ height: 0, opacity: 0 }}
                  animate={{ height: 'auto', opacity: 1 }}
                  exit={{ height: 0, opacity: 0 }}
                  transition={{ duration: 0.18 }}
                  style={{ overflow: 'hidden' }}
                >
                  <div className="px-4 pb-3 pt-1 space-y-1.5 border-t" style={{ borderColor: '#f1f5f9' }}>
                    {occupants.length === 0 ? (
                      <p className="text-xs text-gray-300 italic">Aucun invité assigné à cette table</p>
                    ) : (
                      occupants.map(inv => (
                        <div key={inv.id} className="flex items-center gap-2">
                          <div style={{
                            width: 26, height: 26, borderRadius: '50%',
                            background: avatarColor(inv.prenom), color: 'white',
                            display: 'flex', alignItems: 'center', justifyContent: 'center',
                            fontSize: 10, fontWeight: 700, flexShrink: 0,
                          }}>
                            {initiales(inv.prenom, inv.nom)}
                          </div>
                          <span className="text-xs" style={{ color: '#1e1b4b' }}>{inv.prenom} {inv.nom}</span>
                        </div>
                      ))
                    )}
                  </div>
                </motion.div>
              )}
            </AnimatePresence>
          </div>
        );
      })}
    </div>
  );
}