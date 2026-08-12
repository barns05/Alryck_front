/**
 * TableSeatingPanel — Panneau fixe (bas d'écran) affichant le schéma circulaire
 * des invités d'une table sélectionnée dans la vue plan (mode lecture seule).
 * Contenu identique à l'ancienne bulle flottante : cercle = table, sièges =
 * capacité, invités répartis dans l'ordre chronologique d'assignation
 * (helper tableSeating.js partagé avec le PDF).
 *
 * Bouton « Échanger » : permute les positions (pos_x/pos_y) de la table courante
 * avec une autre table placée de l'événement. Les invités restent attachés à
 * leur table (table_attribuee inchangé) — c'est l'emplacement physique qui
 * change. Action fluide (toast de confirmation, pas de modale bloquante).
 */
import { useState } from 'react';
import { useQueryClient } from '@tanstack/react-query';
import { X, Repeat } from 'lucide-react';
import { toast } from 'sonner';
import { base44 } from '@/api/base44Client';
import { tableDisplayName } from '@/lib/tableName';
import { sortInvitesByAssignation, seatAngles } from '@/lib/tableSeating';

export default function TableSeatingPanel({ table, invites, allTables = [], allInvites = [], evenementId, onClose }) {
  const qc = useQueryClient();
  const [showSwap, setShowSwap] = useState(false);
  const [swapping, setSwapping] = useState(null);

  const cap = table.capacite;
  const list = invites || [];
  const seats = Math.max(cap || list.length, list.length, 1);
  const sorted = sortInvitesByAssignation(list);
  const angles = seatAngles(seats);
  const SVG = 200;
  const center = SVG / 2;
  const tableR = Math.min(46, Math.max(28, Math.sqrt(seats / 6) * 28));
  const chairR = tableR + 12;
  const nameR = chairR + 6;
  const maxLen = seats > 14 ? 7 : seats > 8 ? 10 : 16;
  const tableLabel = (() => { const l = tableDisplayName(table); return l.length > 12 ? l.slice(0, 11) + '…' : l; })();

  // Tables placées (hors table courante) échangeables.
  const autresTables = allTables.filter(
    (t) => t.id !== table.id && t.pos_x != null && t.pos_y != null
  );
  const countFor = (t) => allInvites.filter((i) => i.table_attribuee === t.id).length;

  const handleSwap = async (other) => {
    setSwapping(other.id);
    try {
      await Promise.all([
        base44.entities.TableEvenement.update(table.id, { pos_x: other.pos_x, pos_y: other.pos_y }),
        base44.entities.TableEvenement.update(other.id, { pos_x: table.pos_x, pos_y: table.pos_y }),
      ]);
      await qc.invalidateQueries(['tables', evenementId]);
      toast.success(`${tableDisplayName(table)} et ${tableDisplayName(other)} échangées`);
      setShowSwap(false);
    } catch (e) {
      toast.error("Échange impossible");
    } finally {
      setSwapping(null);
    }
  };

  return (
    <div className="shrink-0 border-t bg-white" style={{ borderColor: '#e8e4dc' }}>
      <div className="flex items-center justify-between gap-2 px-4 py-2 border-b" style={{ borderColor: '#f1f5f9' }}>
        <p className="text-sm font-bold truncate" style={{ color: '#1e1b4b' }}>{tableDisplayName(table)}</p>
        <button onClick={onClose} className="p-1.5 rounded-lg hover:bg-muted text-muted-foreground">
          <X size={16} />
        </button>
      </div>
      <div className="px-4 pb-3 max-h-[40vh] overflow-y-auto">
        {list.length === 0 ? (
          <p className="text-xs text-gray-400 italic text-center py-6">Aucun invité assigné à cette table</p>
        ) : (
          <svg viewBox={`0 0 ${SVG} ${SVG}`} className="w-full block mx-auto" style={{ maxHeight: '30vh' }}>
            <circle cx={center} cy={center} r={tableR} fill="#f5f6fc" stroke="#1e1b4b" strokeWidth={1} />
            <text x={center} y={center + 3} textAnchor="middle" fontSize={10} fontWeight={700} fill="#1e1b4b">{tableLabel}</text>
            {angles.map((a, i) => {
              const chx = center + chairR * Math.cos(a);
              const chy = center + chairR * Math.sin(a);
              const nx = center + nameR * Math.cos(a);
              const ny = center + nameR * Math.sin(a);
              const occupied = i < sorted.length;
              const cos = Math.cos(a);
              const anchor = cos > 0.2 ? 'start' : cos < -0.2 ? 'end' : 'middle';
              let disp = '';
              if (occupied) {
                const inv = sorted[i];
                const name = `${inv.prenom || ''} ${inv.nom || ''}`.trim();
                disp = name.length > maxLen ? name.slice(0, maxLen - 1) + '…' : name;
              }
              return (
                <g key={i}>
                  {occupied ? <circle cx={chx} cy={chy} r={3.2} fill="#C5A059" stroke="#1e1b4b" strokeWidth={0.6} /> : <circle cx={chx} cy={chy} r={2} fill="#cbd5e1" />}
                  {occupied && <text x={nx} y={ny + 2.5} textAnchor={anchor} fontSize={7} fontWeight={600} fill="#374151">{disp}</text>}
                </g>
              );
            })}
          </svg>
        )}
        <p className="text-[11px] text-center text-gray-400 mt-1">
          {list.length} / {cap || list.length} place{(cap || list.length) > 1 ? 's' : ''}
        </p>

        {/* Échange de position avec une autre table */}
        {autresTables.length > 0 && (
          <div className="mt-2 border-t pt-2" style={{ borderColor: '#f1f5f9' }}>
            {!showSwap ? (
              <button
                onClick={() => setShowSwap(true)}
                className="w-full flex items-center justify-center gap-1.5 py-2 rounded-lg text-xs font-semibold border"
                style={{ borderColor: '#C5A059', color: '#C5A059', background: '#FFFBF0' }}
              >
                <Repeat size={13} /> Échanger avec une autre table
              </button>
            ) : (
              <div className="space-y-1.5">
                <p className="text-[11px] font-semibold text-muted-foreground">Choisir la table à échanger :</p>
                <div className="max-h-32 overflow-y-auto space-y-1">
                  {autresTables.map((t) => (
                    <button
                      key={t.id}
                      disabled={swapping === t.id}
                      onClick={() => handleSwap(t)}
                      className="w-full flex items-center justify-between gap-2 px-3 py-2 rounded-lg text-xs font-medium border bg-white hover:border-[#C5A059] disabled:opacity-60"
                      style={{ borderColor: '#e8e4dc' }}
                    >
                      <span className="truncate" style={{ color: '#1e1b4b' }}>{tableDisplayName(t)}</span>
                      <span className="text-[10px] text-muted-foreground shrink-0">{countFor(t)} inv.</span>
                    </button>
                  ))}
                </div>
                <button
                  onClick={() => setShowSwap(false)}
                  className="w-full text-[11px] text-muted-foreground py-1 hover:underline"
                >
                  Annuler
                </button>
              </div>
            )}
          </div>
        )}
      </div>
    </div>
  );
}