/**
 * PropositionEditor — Éditeur plein écran des positions d'une PropositionConfig
 * (mode assis), avant validation par le prestataire.
 *
 * - Fond : EspaceBackground (contours + exclusions de l'EspaceLieu).
 * - Tables (dont la table d'honneur, couleur #C5A059) déplaçables via useTableDrag.
 * - Aucune palette : le nombre de tables est figé (on ne peut que déplacer).
 * - « Enregistrer les positions » → PropositionConfig.update(id, { positions }),
 *   avec garde-fou : positions.length doit rester identique à l'original.
 * - « Annuler » → onClose sans écriture.
 */
import { useState, useRef, useEffect } from 'react';
import { base44 } from '@/api/base44Client';
import { X, Check, Loader2, MoveHorizontal } from 'lucide-react';
import { toast } from 'sonner';
import EspaceBackground from '@/components/invites/EspaceBackground';
import { useTableDrag } from '@/components/invites/useTableDrag';
import { tableWrapStyle, tableLabelStyle, TABLE_SIZE, MIN_TABLE_PX } from '@/components/invites/tableRender';

const HONNEUR_COLOR = '#C5A059';

export default function PropositionEditor({ proposition, espace, onClose, onSaved }) {
  const containerRef = useRef(null);
  const original = proposition.positions || [];
  const [positions, setPositions] = useState(() => original.map((p) => ({ ...p })));
  const [saving, setSaving] = useState(false);

  // Mesure du viewport (largeur disponible + hauteur visible) pour calculer
  // l'échelle réelle du canvas et activer le scroll si le minimum de lisibilité
  // des tables (30px) impose un canvas plus grand que la zone visible.
  const viewportRef = useRef(null);
  const [viewport, setViewport] = useState({ w: 0, h: 0 });
  useEffect(() => {
    const el = viewportRef.current;
    if (!el) return;
    const ro = new ResizeObserver((entries) => {
      const r = entries[0].contentRect;
      setViewport({ w: r.width, h: r.height });
    });
    ro.observe(el);
    return () => ro.disconnect();
  }, []);

  // Rayon réel (demi-diamètre en %) d'une table selon sa forme / statut honneur,
  // depuis les formats déclarés sur l'espace (dimension). Défaut 4 ronde, 6 rect.
  const radiusForForme = (forme, honneur) => {
    if (honneur) return espace?.table_honneur?.dimension || 6;
    const fmt = (espace?.formats_tables || []).find((f) => f.forme === forme);
    return fmt?.dimension || (forme === 'rectangulaire' ? 6 : 4);
  };

  // Échelle : au moins 30px de diamètre pour la plus petite table. Si la largeur
  // disponible ne le permet pas, on agrandit le canvas (scroll horizontal/vertical)
  // plutôt que de rétrécir les tables sous le minimum de lisibilité.
  const minRadius = Math.max(1, positions.length > 0
    ? Math.min(...positions.map((p) => radiusForForme(p.forme, p.honneur)))
    : 4);
  const minPxPerPercent = MIN_TABLE_PX / (2 * minRadius);
  const fitPxPerPercent = viewport.w > 0 ? viewport.w / 100 : 0;
  const pxPerPercent = Math.max(fitPxPerPercent, minPxPerPercent);
  const canvasWidthPx = pxPerPercent * 100;
  const canvasHeightPx = canvasWidthPx * ((espace?.hauteur || 70) / (espace?.largeur || 100));
  const needsScroll = viewport.w > 0 && (canvasWidthPx > viewport.w + 1 || canvasHeightPx > viewport.h + 1);

  const sizePxFor = (it) => Math.max(MIN_TABLE_PX, radiusForForme(it.forme, it.honneur) * 2 * pxPerPercent);

  // items = positions avec un id stable (index) pour useTableDrag.
  const items = positions.map((p, i) => ({ ...p, id: i, index: i }));

  const onDrop = (pos, itemId) => {
    setPositions((prev) => prev.map((p, i) => (i === itemId ? { ...p, x: pos.x, y: pos.y } : p)));
  };
  const getStartPos = (item) => ({ x: item.x, y: item.y });
  const onClick = () => {}; // pas d'édition de table ici (nombre/capacité figés)

  const { startDrag, posOverride } = useTableDrag({ containerRef, onDrop, getStartPos, onClick });

  const getPos = (it) => posOverride[it.id] || { x: it.x, y: it.y };

  const handleSave = async () => {
    if (positions.length !== original.length) {
      toast.error("Le nombre de tables ne peut pas être modifié dans cet éditeur.");
      return;
    }
    setSaving(true);
    try {
      const clean = positions.map(({ x, y, forme, honneur }) => ({
        x: Math.round(x * 10) / 10,
        y: Math.round(y * 10) / 10,
        forme,
        honneur: !!honneur,
      }));
      await base44.entities.PropositionConfig.update(proposition.id, { positions: clean });
      onSaved?.();
    } catch (e) {
      toast.error("Erreur lors de l'enregistrement des positions.");
    } finally {
      setSaving(false);
    }
  };

  return (
    <div className="fixed inset-0 z-[75] bg-black/60 flex items-center justify-center p-3">
      <div className="bg-card rounded-2xl w-full max-w-3xl max-h-[95vh] overflow-y-auto p-5 space-y-4">
        <div className="flex items-center justify-between">
          <div>
            <h3 className="font-semibold text-base">Ajuster les positions</h3>
            <p className="text-xs text-muted-foreground mt-0.5">{proposition.label}</p>
          </div>
          <button onClick={onClose} className="p-1.5 rounded-lg hover:bg-muted text-muted-foreground">
            <X size={18} />
          </button>
        </div>

        <div className="text-xs text-muted-foreground">
          {positions.length} table{positions.length > 1 ? 's' : ''} — déplacez-les sur l'espace.
          La table d'honneur est en doré. Le nombre de tables est figé.
        </div>

        <div className="relative">
          <div
            ref={viewportRef}
            className="relative w-full rounded-2xl border-2 border-border bg-muted/30 overflow-auto"
            style={{ maxHeight: '60vh' }}
          >
            <div
              ref={containerRef}
              className="relative"
              style={viewport.w > 0 ? { width: canvasWidthPx, height: canvasHeightPx } : { width: '100%', aspectRatio: `${espace.largeur} / ${espace.hauteur}` }}
            >
              <EspaceBackground zones={espace.zones} />

              {items.map((it) => {
                const pos = getPos(it);
                const isHonneur = !!it.honneur;
                const borderColor = isHonneur ? HONNEUR_COLOR : '#e8e4dc';
                const sizePx = sizePxFor(it);
                return (
                  <div
                    key={it.id}
                    onPointerDown={(e) => startDrag(e, it)}
                    style={tableWrapStyle(pos, it.forme, borderColor, sizePx)}
                  >
                    <div
                      className="flex flex-col items-center justify-center select-none text-center leading-tight px-0.5"
                      style={tableLabelStyle(it.forme, sizePx)}
                    >
                      <span className="text-[9px] font-bold text-[#1e1b4b] leading-tight">
                        {isHonneur ? 'Honneur' : `Table ${it.id + 1}`}
                      </span>
                      {isHonneur && <span className="text-[8px] font-semibold leading-none" style={{ color: HONNEUR_COLOR }}>★</span>}
                    </div>
                  </div>
                );
              })}
            </div>
          </div>
          {needsScroll && (
            <div className="absolute bottom-2 left-1/2 -translate-x-1/2 z-10 px-3 py-1 rounded-full bg-black/55 text-white text-[11px] flex items-center gap-1 pointer-events-none">
              <MoveHorizontal size={12} /> Faites glisser pour voir toute la salle
            </div>
          )}
        </div>

        <p className="text-[11px] text-muted-foreground">
          Glissez les tables pour les repositionner. Aucune restriction sur les zones d'exclusion
          (comme côté client) — ajustez au besoin avant validation.
        </p>

        <div className="flex justify-end gap-2 border-t border-border pt-3">
          <button
            onClick={onClose}
            className="px-4 py-2 rounded-lg text-sm font-medium border border-border hover:bg-muted"
          >
            Annuler
          </button>
          <button
            onClick={handleSave}
            disabled={saving}
            className="flex items-center gap-1.5 px-4 py-2 rounded-lg text-sm font-semibold bg-primary text-primary-foreground disabled:opacity-50"
          >
            {saving ? <Loader2 size={14} className="animate-spin" /> : <Check size={14} />}
            Enregistrer les positions
          </button>
        </div>
      </div>
    </div>
  );
}