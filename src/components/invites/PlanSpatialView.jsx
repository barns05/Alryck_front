/**
 * PlanSpatialView — Canvas client (placement visuel des tables, niveau 2)
 * Fond SVG = contours/zones de l'EspaceLieu choisi.
 * Les TableEvenement s'affichent comme formes draggables (pointer events natifs),
 * rondes ou rectangulaires selon `forme`. Position persistée sur pos_x/pos_y au drop
 * (un seul update par drag, pas d'appel API par pixel).
 * Tables sans pos_x/pos_y → palette latérale à draguer sur le canvas.
 * Clic (sans déplacement) sur une table → ouvre l'édition existante (onEditTable).
 */
import { useState, useRef, useCallback, useEffect } from 'react';
import { base44 } from '@/api/base44Client';
import { useQueryClient } from '@tanstack/react-query';
import { clamp, centerOf } from '@/lib/espaceCoords';
import { MoveHorizontal } from 'lucide-react';
import { tableDisplayName } from '@/lib/tableName';

const TABLE_SIZE = 48; // px — taille de repli tant que le canvas n'est pas mesuré
const MIN_TABLE_PX = 25; // px — diamètre mini garanti (sinon canvas scrollable)
const MOVE_THRESHOLD = 4; // px : en-deçà = clic (édition), au-delà = drag
// Taille fixe selon la capacité (une table de 12 reste plus grande qu'une de 6,
// indépendamment des invités effectivement assignés). Référence : table de 6 = base.
const CAP_REF = 6;
const MAX_CAP_GROWTH = 1.6;
const MAX_CHAIRS = 24; // plafond décoratif du nombre de chaises dessinées autour

export default function PlanSpatialView({ evenement, espace, tables, invites, onEditTable, readOnlyPositions = false, selectedTableId, onSelectTable }) {
  const qc = useQueryClient();
  const containerRef = useRef(null);
  const draggingRef = useRef(null); // { tableId, fromPalette, startClient, moved, pos }
  const [posOverride, setPosOverride] = useState({}); // tableId -> {x,y} pendant le drag
  const [paletteDrag, setPaletteDrag] = useState(null); // { tableId, pos } fantôme palette→canvas
  const [draggingTable, setDraggingTable] = useState(null); // table en cours de drag (pour le fantôme)

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

  const radiusForTable = (t) => t.dimension || ((t.forme || 'ronde') === 'rectangulaire' ? 6 : 4);

  // Échelle : au moins 30px de diamètre pour la plus petite table placée. Si la
  // largeur disponible ne le permet pas, on agrandit le canvas (scroll) plutôt
  // que de rétrécir les tables sous le minimum de lisibilité.
  const placedForMin = tables.filter((t) => t.pos_x != null && t.pos_y != null);
  const minRadius = Math.max(1, placedForMin.length > 0 ? Math.min(...placedForMin.map(radiusForTable)) : 4);
  const minPxPerPercent = MIN_TABLE_PX / (2 * minRadius);
  const fitPxPerPercent = viewport.w > 0 ? viewport.w / 100 : 0;
  const pxPerPercent = Math.max(fitPxPerPercent, minPxPerPercent);
  const canvasWidthPx = pxPerPercent * 100;
  const canvasHeightPx = canvasWidthPx * ((espace?.hauteur || 70) / (espace?.largeur || 100));
  const needsScroll = viewport.w > 0 && (canvasWidthPx > viewport.w + 1 || canvasHeightPx > viewport.h + 1);

  // Taille visuelle fixe selon la capacité de la table (pas le nombre d'invités
  // assignés) : une table ne rétrécit pas physiquement quand elle est vide.
  const sizePxFor = (t) => {
    const base = Math.max(MIN_TABLE_PX, radiusForTable(t) * 2 * pxPerPercent);
    const cap = t.capacite;
    if (!cap || cap <= 0) return base;
    return Math.max(MIN_TABLE_PX, base * Math.min(MAX_CAP_GROWTH, Math.sqrt(cap / CAP_REF)));
  };

  // Refs stables pour les handlers window
  const tablesRef = useRef(tables);
  tablesRef.current = tables;
  const onEditTableRef = useRef(onEditTable);
  onEditTableRef.current = onEditTable;
  const evenementRef = useRef(evenement);
  evenementRef.current = evenement;
  const qcRef = useRef(qc);
  qcRef.current = qc;

  const placed = tables.filter((t) => t.pos_x != null && t.pos_y != null);
  const palette = tables.filter((t) => t.pos_x == null || t.pos_y == null);

  const invitesCount = useCallback(
    (table) => {
      if (!table) return 0;
      return invites.filter(
        (i) => i.table_attribuee === table.id
      ).length;
    },
    [invites]
  );

  const pointerToPct = (clientX, clientY) => {
    const rect = containerRef.current.getBoundingClientRect();
    return {
      x: clamp(((clientX - rect.left) / rect.width) * 100),
      y: clamp(((clientY - rect.top) / rect.height) * 100),
    };
  };

  const onMove = useCallback((e) => {
    const d = draggingRef.current;
    if (!d) return;
    const pos = pointerToPct(e.clientX, e.clientY);
    if (!d.moved && Math.hypot(e.clientX - d.startClient.x, e.clientY - d.startClient.y) > MOVE_THRESHOLD) {
      d.moved = true;
    }
    d.pos = pos;
    setPosOverride((o) => ({ ...o, [d.tableId]: pos }));
    if (d.fromPalette) setPaletteDrag({ tableId: d.tableId, pos });
  }, []);

  const onUp = useCallback(() => {
    const d = draggingRef.current;
    window.removeEventListener('pointermove', onMove);
    window.removeEventListener('pointerup', onUp);
    draggingRef.current = null;
    setPaletteDrag(null);
    setDraggingTable(null);
    if (!d) return;
    setPosOverride((o) => {
      const n = { ...o };
      delete n[d.tableId];
      return n;
    });
    if (!d.moved) {
      const t = tablesRef.current.find((tt) => tt.id === d.tableId);
      if (t) onEditTableRef.current?.(t);
      return;
    }
    // Persister une seule fois au drop
    base44.entities.TableEvenement
      .update(d.tableId, { pos_x: d.pos.x, pos_y: d.pos.y })
      .then(() => qcRef.current.invalidateQueries(['tables', evenementRef.current.id]))
      .catch(() => {});
  }, [onMove]);

  const startDrag = (e, table, fromPalette) => {
    if (readOnlyPositions) return;
    e.stopPropagation();
    e.preventDefault();
    const pos = fromPalette ? pointerToPct(e.clientX, e.clientY) : { x: table.pos_x, y: table.pos_y };
    draggingRef.current = {
      tableId: table.id,
      fromPalette,
      startClient: { x: e.clientX, y: e.clientY },
      moved: false,
      pos,
    };
    setDraggingTable(table);
    setPosOverride((o) => ({ ...o, [table.id]: pos }));
    if (fromPalette) setPaletteDrag({ tableId: table.id, pos });
    window.addEventListener('pointermove', onMove);
    window.addEventListener('pointerup', onUp);
  };

  // Nettoyage au démontage
  useEffect(() => {
    return () => {
      window.removeEventListener('pointermove', onMove);
      window.removeEventListener('pointerup', onUp);
    };
  }, [onMove, onUp]);

  const getPos = (t) => posOverride[t.id] || { x: t.pos_x, y: t.pos_y };

  const renderTableShape = (t, w, h, dragging) => {
    const n = invitesCount(t);
    const cap = t.capacite;
    return (
      <div
        className={`flex flex-col items-center justify-center select-none text-center leading-tight px-0.5 ${
          dragging ? 'opacity-90 scale-105' : ''
        }`}
        style={{ width: w, height: h, pointerEvents: 'none' }}
      >
        <span className="text-[9px] font-bold text-[#1e1b4b] leading-tight">{tableDisplayName(t)}</span>
        <span className="text-[7px] text-muted-foreground leading-none">
          {n}
          {cap ? `/${cap}` : ''}
        </span>
      </div>
    );
  };

  const tableWrapStyle = (pos, isRound, borderColor, sizePx = TABLE_SIZE) => {
    const w = isRound ? sizePx : sizePx * 1.3;
    const h = isRound ? sizePx : sizePx * 0.46;
    return {
      position: 'absolute',
      left: `${pos.x}%`,
      top: `${pos.y}%`,
      width: w,
      height: h,
      transform: 'translate(-50%, -50%)',
      borderRadius: isRound ? '9999px' : '10px',
      background: '#fff',
      border: `2px solid ${borderColor}`,
      boxShadow: '0 2px 6px rgba(30,27,75,0.15)',
      touchAction: readOnlyPositions ? 'auto' : 'none',
      cursor: readOnlyPositions ? 'default' : 'grab',
    };
  };

  return (
    <div className="space-y-3">
      <div className="relative">
        <div
          ref={viewportRef}
          className="relative w-full rounded-2xl border-2 border-border bg-muted/30 overflow-auto"
          style={{ maxHeight: '65vh' }}
        >
          <div
            ref={containerRef}
            className="relative"
            onClick={readOnlyPositions ? () => onSelectTable?.(null) : undefined}
            style={viewport.w > 0 ? { width: canvasWidthPx, height: canvasHeightPx } : { width: '100%', aspectRatio: `${espace.largeur} / ${espace.hauteur}` }}
          >
        {/* SVG : zones de l'espace */}
        <svg viewBox="0 0 100 100" preserveAspectRatio="none" className="absolute inset-0 w-full h-full pointer-events-none">
          <defs>
            <pattern id="excl-hatch-client" patternUnits="userSpaceOnUse" width="3" height="3" patternTransform="rotate(45)">
              <line x1="0" y1="0" x2="0" y2="3" stroke="#94a3b8" strokeWidth="0.8" />
            </pattern>
          </defs>
          {(espace.zones || []).map((z) => {
            const isExcl = z.categorie === 'exclusion';
            return (
              <polygon
                key={z.id}
                points={(z.points || []).map((p) => `${p.x},${p.y}`).join(' ')}
                fill={isExcl ? 'url(#excl-hatch-client)' : z.couleur || '#c7d2fe'}
                fillOpacity={isExcl ? 0.6 : 0.45}
                stroke={isExcl ? '#64748b' : '#1e1b4b'}
                strokeWidth={0.4}
              />
            );
          })}
        </svg>

        {/* Labels des zones d'exclusion (overlay HTML) */}
        {(espace.zones || [])
          .filter((z) => z.categorie === 'exclusion' && z.nom)
          .map((z) => {
            const c = centerOf(z.points || []);
            return (
              <div
                key={z.id}
                className="absolute -translate-x-1/2 -translate-y-1/2 text-[10px] font-semibold text-slate-600 bg-white/70 px-1.5 py-0.5 rounded pointer-events-none"
                style={{ left: `${c.x}%`, top: `${c.y}%` }}
              >
                {z.nom}
              </div>
            );
          })}

        {/* Tables placées */}
        {placed.map((t) => {
          const pos = getPos(t);
          const isRound = (t.forme || 'ronde') === 'ronde';
          const n = invitesCount(t);
          const cap = t.capacite;
          const isSelected = readOnlyPositions && selectedTableId === t.id;
          const borderColor = isSelected ? '#C5A059' : (cap && n >= cap ? '#86efac' : n > 0 ? '#fed7aa' : '#e8e4dc');
          const sizePx = sizePxFor(t);
          const w = isRound ? sizePx : sizePx * 1.3;
          const h = isRound ? sizePx : sizePx * 0.46;
          const chairCount = Math.min(MAX_CHAIRS, cap || n || 0);
          const wrapStyle = tableWrapStyle(pos, isRound, borderColor, sizePx);
          const tableStyle = isSelected
            ? { ...wrapStyle, zIndex: 5, boxShadow: '0 0 0 3px rgba(197,160,89,0.4), 0 6px 16px rgba(30,27,75,0.25)' }
            : wrapStyle;
          return (
            <div
              key={t.id}
              onPointerDown={(e) => startDrag(e, t, false)}
              onClick={readOnlyPositions ? (e) => { e.stopPropagation(); onSelectTable?.(t.id); } : undefined}
              style={tableStyle}
            >
              {/* Chaises autour du cercle (décoratif, mode lecture seule) */}
              {readOnlyPositions && isRound && chairCount > 0 && Array.from({ length: chairCount }).map((_, i) => {
                const angle = (i / chairCount) * 2 * Math.PI - Math.PI / 2;
                const r = sizePx / 2 + 3;
                const cx = w / 2 + r * Math.cos(angle);
                const cy = h / 2 + r * Math.sin(angle);
                return (
                  <div key={`ch-${i}`} style={{
                    position: 'absolute', width: 5, height: 3,
                    background: i < n ? '#C5A059' : '#cbd5e1',
                    borderRadius: 1.5, left: cx, top: cy,
                    transform: 'translate(-50%, -50%)', pointerEvents: 'none', zIndex: 1,
                  }} />
                );
              })}
              {renderTableShape(t, w, h, false)}
            </div>
          );
        })}

        {/* Fantôme de drag palette → canvas */}
        {paletteDrag && draggingTable && (
          <div
            style={{
              ...tableWrapStyle(paletteDrag.pos, (draggingTable.forme || 'ronde') === 'ronde', '#1e1b4b', sizePxFor(draggingTable)),
              opacity: 0.85,
            }}
          >
            {(() => {
              const sp = sizePxFor(draggingTable);
              const isR = (draggingTable.forme || 'ronde') === 'ronde';
              return renderTableShape(draggingTable, isR ? sp : sp * 1.3, isR ? sp : sp * 0.46, true);
            })()}
          </div>
        )}
          </div>
        </div>
        {needsScroll && (
          <div className="absolute bottom-2 left-1/2 -translate-x-1/2 z-10 px-3 py-1 rounded-full bg-black/55 text-white text-[11px] flex items-center gap-1 pointer-events-none">
            <MoveHorizontal size={12} /> Faites glisser pour voir toute la salle
          </div>
        )}
      </div>

      {/* Palette : tables non placées */}
      {palette.length > 0 && (
        <div>
          <p className="text-[11px] font-semibold uppercase tracking-wider text-muted-foreground mb-2">
            Tables à placer ({palette.length})
          </p>
          <div className="flex flex-wrap gap-2">
            {palette.map((t) => {
              const isRound = (t.forme || 'ronde') === 'ronde';
              return (
                <div
                  key={t.id}
                  onPointerDown={(e) => startDrag(e, t, true)}
                  className="flex items-center justify-center text-center cursor-grab active:cursor-grabbing select-none shadow px-0.5"
                  style={{
                    width: isRound ? 42 : 42 * 1.3,
                    height: isRound ? 42 : 42 * 0.46,
                    borderRadius: isRound ? '9999px' : '8px',
                    background: '#fff',
                    border: '2px solid #e8e4dc',
                    touchAction: readOnlyPositions ? 'auto' : 'none',
                    cursor: readOnlyPositions ? 'default' : 'grab',
                  }}
                >
                  <span className="text-[8px] font-bold text-[#1e1b4b] leading-tight">{t.nom}</span>
                </div>
              );
            })}
          </div>
        </div>
      )}

      <p className="text-[11px] text-muted-foreground">
        {readOnlyPositions
          ? "Le plan est fixé par le lieu. Contactez votre organisateur pour toute modification."
          : "Glissez les tables sur l’espace pour les positionner. Cliquez une table pour modifier son nom, sa capacité et ses invités."}
      </p>
    </div>
  );
}