/**
 * PropositionsCurationModal — Écran de validation prestataire des propositions
 * générées (mode assis). Liste les PropositionConfig de l'espace, aperçu miniature
 * SVG + label + capacité + checkbox valider/rejeter. Bulk update des statuts.
 */
import { useState } from 'react';
import { useQuery, useQueryClient } from '@tanstack/react-query';
import { base44 } from '@/api/base44Client';
import { X, Check, CheckCheck, XCircle, Loader2, Move } from 'lucide-react';
import { toast } from 'sonner';
import PropositionEditor from './PropositionEditor';

const MODE_LABELS = {
  assis: 'Assis (tables)',
  debout: 'Debout / Cocktail',
  chaises: 'Chaises seules',
};

function MiniPreview({ positions, dimension = 4 }) {
  // viewBox 0 0 100 100, tables en cercles/rects selon forme.
  return (
    <svg viewBox="0 0 100 100" preserveAspectRatio="none" className="w-full h-full">
      <rect x="0" y="0" width="100" height="100" fill="#fafaf7" stroke="#e8e4dc" strokeWidth="0.4" />
      {(positions || []).map((p, i) => {
        const r = (p.honneur ? 6 : dimension);
        if (p.forme === 'rectangulaire') {
          return (
            <rect
              key={i}
              x={p.x - r * 1.2}
              y={p.y - r * 0.425}
              width={r * 2.4}
              height={r * 0.85}
              rx="0.6"
              fill={p.honneur ? '#C5A059' : '#c7d2fe'}
              stroke="#1e1b4b"
              strokeWidth="0.3"
            />
          );
        }
        return (
          <circle
            key={i}
            cx={p.x}
            cy={p.y}
            r={r}
            fill={p.honneur ? '#C5A059' : '#c7d2fe'}
            stroke="#1e1b4b"
            strokeWidth="0.3"
          />
        );
      })}
    </svg>
  );
}

export default function PropositionsCurationModal({ espace_lieu_id, onClose }) {
  const qc = useQueryClient();
  const [saving, setSaving] = useState(false);
  const [draftStatuts, setDraftStatuts] = useState({}); // id -> 'validee' | 'rejetee'
  const [editingId, setEditingId] = useState(null);

  const { data: propositions = [], isLoading } = useQuery({
    queryKey: ['propositions-config', espace_lieu_id],
    queryFn: () => base44.entities.PropositionConfig.filter({ espace_lieu_id }, 'ordre', 200),
    enabled: !!espace_lieu_id,
  });

  // EspaceLieu (contours + exclusions) chargé à l'ouverture de l'éditeur.
  const { data: espace } = useQuery({
    queryKey: ['espace-lieu', espace_lieu_id],
    queryFn: () => base44.entities.EspaceLieu.get(espace_lieu_id),
    enabled: !!editingId,
  });

  // Groupe par mode
  const byMode = propositions.reduce((acc, p) => {
    const m = p.mode || 'assis';
    if (!acc[m]) acc[m] = [];
    acc[m].push(p);
    return acc;
  }, {});

  const statutOf = (p) => draftStatuts[p.id] ?? p.statut ?? 'proposee';

  const setStatut = (id, val) => setDraftStatuts((s) => ({ ...s, [id]: val }));

  const setAll = (list, val) => {
    const next = { ...draftStatuts };
    list.forEach((p) => { next[p.id] = val; });
    setDraftStatuts(next);
  };

  const handleSave = async () => {
    const updates = Object.entries(draftStatuts).map(([id, statut]) => ({ id, statut }));
    if (updates.length === 0) { onClose(); return; }
    setSaving(true);
    try {
      await base44.entities.PropositionConfig.bulkUpdate(updates);
      qc.invalidateQueries(['propositions-config', espace_lieu_id]);
      toast.success(`${updates.length} proposition(s) mise(s) à jour.`);
      onClose();
    } catch (e) {
      toast.error('Erreur lors de l\'enregistrement.');
    } finally {
      setSaving(false);
    }
  };

  const hasDraft = Object.keys(draftStatuts).length > 0;

  return (
    <div className="fixed inset-0 z-[70] bg-black/60 flex items-center justify-center p-3">
      <div className="bg-card rounded-2xl w-full max-w-3xl max-h-[92vh] overflow-y-auto p-5 space-y-4">
        <div className="flex items-center justify-between sticky top-0 bg-card pb-2 -mt-1 z-10">
          <h3 className="font-semibold text-base flex items-center gap-1.5">
            <CheckCheck size={16} /> Valider les propositions de configuration
          </h3>
          <button onClick={onClose} className="p-1.5 rounded-lg hover:bg-muted text-muted-foreground">
            <X size={18} />
          </button>
        </div>

        {isLoading ? (
          <div className="flex items-center justify-center py-10">
            <Loader2 className="animate-spin text-muted-foreground" size={22} />
          </div>
        ) : propositions.length === 0 ? (
          <p className="text-sm text-muted-foreground py-8 text-center">
            Aucune proposition générée pour cet espace. Cliquez sur « Générer les propositions »
            depuis l'éditeur après avoir renseigné vos formats de table.
          </p>
        ) : (
          <>
            <p className="text-xs text-muted-foreground">
              Cochez les propositions à rendre visibles côté client. Seules les propositions
              « validées » seront proposées au client lors de la configuration de son plan de table.
            </p>

            {Object.entries(byMode).map(([mode, list]) => (
              <div key={mode} className="space-y-2">
                <div className="flex items-center justify-between">
                  <h4 className="text-xs font-semibold uppercase tracking-wider text-muted-foreground">
                    {MODE_LABELS[mode] || mode} · {list.length}
                  </h4>
                  <div className="flex gap-1">
                    <button
                      onClick={() => setAll(list, 'validee')}
                      className="text-[11px] font-semibold px-2 py-1 rounded-md bg-green-50 text-green-700 hover:bg-green-100"
                    >
                      Tout valider
                    </button>
                    <button
                      onClick={() => setAll(list, 'rejetee')}
                      className="text-[11px] font-semibold px-2 py-1 rounded-md bg-red-50 text-red-700 hover:bg-red-100"
                    >
                      Tout rejeter
                    </button>
                  </div>
                </div>

                <div className="grid grid-cols-1 sm:grid-cols-2 gap-2">
                  {list.map((p) => {
                    const st = statutOf(p);
                    const checked = st === 'validee';
                    return (
                      <label
                        key={p.id}
                        className={`flex items-start gap-3 p-3 rounded-xl border cursor-pointer transition-colors ${
                          checked ? 'border-green-400 bg-green-50/60' : st === 'rejetee' ? 'border-red-200 bg-red-50/30 opacity-70' : 'border-border bg-white'
                        }`}
                      >
                        <input
                          type="checkbox"
                          checked={checked}
                          onChange={(e) => setStatut(p.id, e.target.checked ? 'validee' : 'rejetee')}
                          className="mt-1 w-4 h-4 accent-green-600"
                        />
                        <div className="w-16 h-16 shrink-0 rounded-lg overflow-hidden border border-border bg-white">
                          {p.mode === 'assis' && p.positions?.length > 0 ? (
                            <MiniPreview positions={p.positions} dimension={p.forme_principale === 'rectangulaire' ? 6 : 4} />
                          ) : (
                            <div className="w-full h-full flex items-center justify-center text-[10px] text-muted-foreground text-center px-1">
                              {p.mode === 'debout' ? '🥂 Debout' : '🪑 Chaises'}
                            </div>
                          )}
                        </div>
                        <div className="min-w-0 flex-1">
                          <p className="text-sm font-semibold leading-tight">{p.label}</p>
                          <p className="text-xs text-muted-foreground mt-0.5">
                            {p.capacite_totale} pers.
                            {p.avec_table_honneur ? ' · avec table d\'honneur' : ''}
                          </p>
                          <p className={`text-[10px] font-semibold mt-1 ${
                            st === 'validee' ? 'text-green-600' : st === 'rejetee' ? 'text-red-500' : 'text-amber-600'
                          }`}>
                            {st === 'validee' ? '✓ Validée' : st === 'rejetee' ? '✕ Rejetée' : '● Proposée'}
                          </p>
                          {p.mode === 'assis' && p.positions?.length > 0 && (
                            <button
                              onClick={(e) => { e.preventDefault(); e.stopPropagation(); setEditingId(p.id); }}
                              className="mt-2 inline-flex items-center gap-1 text-[11px] font-semibold px-2 py-1 rounded-md border border-border bg-white hover:bg-muted text-foreground"
                            >
                              <Move size={12} /> Ajuster
                            </button>
                          )}
                        </div>
                      </label>
                    );
                  })}
                </div>
              </div>
            ))}
          </>
        )}

        <div className="flex justify-end gap-2 border-t border-border pt-3 sticky bottom-0 bg-card">
          <button onClick={onClose} className="px-4 py-2 rounded-lg text-sm font-medium border border-border hover:bg-muted">
            Annuler
          </button>
          <button
            onClick={handleSave}
            disabled={saving || !hasDraft}
            className="flex items-center gap-1.5 px-4 py-2 rounded-lg text-sm font-semibold bg-primary text-primary-foreground disabled:opacity-50"
          >
            {saving ? <Loader2 size={14} className="animate-spin" /> : <Check size={14} />}
            Enregistrer
          </button>
        </div>
      </div>

      {editingId && espace && (() => {
        const prop = propositions.find((p) => p.id === editingId);
        if (!prop) return null;
        return (
          <PropositionEditor
            proposition={prop}
            espace={espace}
            onClose={() => setEditingId(null)}
            onSaved={() => {
              qc.invalidateQueries(['propositions-config', espace_lieu_id]);
              setEditingId(null);
              toast.success('Positions enregistrées.');
            }}
          />
        );
      })()}
    </div>
  );
}