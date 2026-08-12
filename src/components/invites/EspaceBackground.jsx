/**
 * EspaceBackground — Fond SVG d'un EspaceLieu (contours + exclusions).
 * Extrait du rendu équivalent de PlanSpatialView, réutilisable par
 * PropositionEditor. Coordonnées en % (0-100), viewBox 0 0 100 100.
 *
 * - Zones 'table' : polygone coloré (périmètre où placer les tables).
 * - Zones 'exclusion' : hachures grises + label centré (Bar, WC, Piste…).
 */
import { centerOf } from '@/lib/espaceCoords';

export default function EspaceBackground({ zones }) {
  return (
    <>
      <svg
        viewBox="0 0 100 100"
        preserveAspectRatio="none"
        className="absolute inset-0 w-full h-full pointer-events-none"
      >
        <defs>
          <pattern id="excl-hatch-bg" patternUnits="userSpaceOnUse" width="3" height="3" patternTransform="rotate(45)">
            <line x1="0" y1="0" x2="0" y2="3" stroke="#94a3b8" strokeWidth="0.8" />
          </pattern>
        </defs>
        {(zones || []).map((z) => {
          const isExcl = z.categorie === 'exclusion';
          return (
            <polygon
              key={z.id}
              points={(z.points || []).map((p) => `${p.x},${p.y}`).join(' ')}
              fill={isExcl ? 'url(#excl-hatch-bg)' : z.couleur || '#c7d2fe'}
              fillOpacity={isExcl ? 0.6 : 0.45}
              stroke={isExcl ? '#64748b' : '#1e1b4b'}
              strokeWidth={0.4}
            />
          );
        })}
      </svg>

      {/* Labels des zones d'exclusion (overlay HTML pour éviter la distorsion SVG) */}
      {(zones || [])
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
    </>
  );
}