/**
 * AmandaProcessing — Animation de traitement IA unifiée (personnage Amanda).
 *
 * Animation : pulse doux du personnage Amanda « main vide » (scale + opacité)
 * + orbite de 4 cristaux (bleu, rose, orange, champagne) lévitant au-dessus de
 * la paume, sur une ellipse en perspective qui tourne lentement (7 s/tour).
 * Le variant sm affiche le cristal Alryck seul (compact, sans personnage).
 *
 * Props:
 *   - message     (string)  défaut "Amanda traite votre document…"
 *   - size        ('sm'|'md'|'lg')  défaut 'md'
 *       sm = cristal Alryck seul (compact, inline)
 *       md = personnage Amanda moyen + orbite de cristaux
 *       lg = personnage Amanda grand + orbite de cristaux
 *   - variant     ('light'|'dark')  défaut 'light' — adapte le contraste du label
 *       (tous les écrans de traitement IA utilisent 'light' / fond blanc)
 *   - overlay     (boolean) défaut false — backdrop blanc centré plein écran
 */
import { Fragment } from 'react';
import { motion } from 'framer-motion';
import { AMANDA_ASSETS } from '@/components/AmandaMessage.jsx';

// Pulse commun (scale doux + opacité), même principe que le cristal seul en sm.
const PULSE = { scale: [1, 1.06, 1], opacity: [0.85, 1, 0.85] };
const PULSE_TRANSITION = { duration: 2.6, repeat: Infinity, ease: 'easeInOut' };

// ── Orbite de 4 cristaux au-dessus de la paume d'Amanda ────────────────────────
// Les 4 cristaux lévitent sur une ellipse en perspective (plus large que haute),
// tournant ensemble autour d'un axe vertical (mobile suspendu). Profondeur
// simulée par scale + opacité : cristaux « devant » (bas de l'ellipse) plus
// grands et opaques, « derrière » (haut) plus petits et transparents.
// Rythme lent (7 s/tour), aucune trajectoire/halo visible — seuls les cristaux.
const ORBIT_CRYSTALS = [
  { key: 'blue',      src: AMANDA_ASSETS.crystals.blue,      phase: 0 },
  { key: 'magenta',   src: AMANDA_ASSETS.crystals.magenta,   phase: 90 },
  { key: 'amber',     src: AMANDA_ASSETS.crystals.amber,     phase: 180 },
  { key: 'champagne', src: AMANDA_ASSETS.crystals.champagne, phase: 270 },
];
const ORBIT_STEPS = 8;     // échantillonnage de l'ellipse (0° → 360°)
const ORBIT_DURATION = 5;  // 5 s par tour complet

function buildOrbitKeyframes(phaseDeg, rx, ry, depthAmp) {
  const xs = [], ys = [], scales = [], opacities = [];
  for (let j = 0; j <= ORBIT_STEPS; j++) {
    const ang = ((phaseDeg + j * (360 / ORBIT_STEPS)) * Math.PI) / 180;
    xs.push(Math.round(rx * Math.cos(ang)));
    ys.push(Math.round(ry * Math.sin(ang)));
    scales.push(Number((1 + depthAmp * Math.sin(ang)).toFixed(2)));
    opacities.push(Number((0.6 + 0.4 * ((Math.sin(ang) + 1) / 2)).toFixed(2)));
  }
  return { xs, ys, scales, opacities };
}

// Orbite de 4 cristaux au-dessus de la paume.
// Les motion.img sont placés DIRECTEMENT dans AmandaPulse (parent sized,
// position: relative, SANS transform) — pas dans un sous-conteneur 0×0
// transformé. Raison : framer-motion compose le transform du motion.img à
// partir de son containing block ; un parent 0×0 avec `transform` produit un
// containing block nul et l'enfant se rend hors de l'espace visible.
// Motif identique à FloatingCrystal (AmandaMessage.jsx) qui fonctionne.
const ORBIT_CENTER_LEFT = '30%';  // centre orbite ≈ au-dessus de la paume
const ORBIT_CENTER_TOP = '56%';

function CrystalOrbit({ width, height }) {
  const crystalSize = Math.round(height * 0.18);  // taille d'un cristal (visible)
  const rx = Math.round(width * 0.28 * 0.65);        // rayon horizontal (resserré 35%)
  const ry = Math.round(height * 0.13 * 0.65);        // rayon vertical (resserré 35%)
  const depthAmp = 0.25;                            // amplitude scale (0.75 ↔ 1.25)
  return (
    <Fragment>
      {ORBIT_CRYSTALS.map((c) => {
        const kf = buildOrbitKeyframes(c.phase, rx, ry, depthAmp);
        return (
          <motion.img
            key={c.key}
            src={c.src}
            alt=""
            initial={{ x: kf.xs[0], y: kf.ys[0], scale: kf.scales[0], opacity: kf.opacities[0] }}
            animate={{ x: kf.xs, y: kf.ys, scale: kf.scales, opacity: kf.opacities }}
            transition={{ duration: ORBIT_DURATION, repeat: Infinity, ease: 'linear' }}
            style={{
              position: 'absolute',
              left: ORBIT_CENTER_LEFT,
              top: ORBIT_CENTER_TOP,
              width: crystalSize,
              height: crystalSize,
              marginLeft: -crystalSize / 2,
              marginTop: -crystalSize / 2,
              objectFit: 'contain',
              display: 'block',
              zIndex: 20,
              pointerEvents: 'none',
              filter: 'drop-shadow(0 1px 3px rgba(30,27,75,0.45))',
            }}
          />
        );
      })}
    </Fragment>
  );
}

// ── Variant sm : cristal Alryck seul (compact) ─────────────────────────────────
function SmContent({ message, variant }) {
  const labelColor = variant === 'dark' ? 'rgba(246,231,193,0.85)' : '#1e1b4b';
  return (
    <div className="flex items-center gap-2">
      <motion.img
        src={AMANDA_ASSETS.crystalAlryck}
        alt=""
        animate={PULSE}
        transition={PULSE_TRANSITION}
        style={{ width: 22, height: 22, objectFit: 'contain', flexShrink: 0 }}
      />
      {message && (
        <span className="text-xs font-medium" style={{ color: labelColor }}>{message}</span>
      )}
    </div>
  );
}

// ── Personnage Amanda « main vide » + orbite de cristaux au-dessus de la main ──
function AmandaPulse({ width, height }) {
  return (
    <div style={{ position: 'relative', width, height }}>
      <motion.img
        src={AMANDA_ASSETS.characterEmptyHand}
        alt="Amanda"
        animate={PULSE}
        transition={PULSE_TRANSITION}
        style={{ width, height, objectFit: 'contain', display: 'block' }}
      />
      {/* Orbite de 4 cristaux au-dessus de la paume. Centre ≈ au-dessus de la
          paume — ajuster left/top dans CrystalOrbit si besoin. */}
      <CrystalOrbit width={width} height={height} />
    </div>
  );
}

// ── Variant md ────────────────────────────────────────────────────────────────
function MdContent({ message, variant }) {
  const labelColor = variant === 'dark' ? 'rgba(246,231,193,0.9)' : '#1e1b4b';
  return (
    <div className="flex flex-col items-center gap-3 py-4">
      <AmandaPulse width={110} height={120} />
      {message && (
        <p className="text-center text-sm font-semibold px-4" style={{ color: labelColor, maxWidth: 260 }}>
          {message}
        </p>
      )}
    </div>
  );
}

// ── Variant lg ────────────────────────────────────────────────────────────────
function LgContent({ message, variant }) {
  const labelColor = variant === 'dark' ? 'rgba(246,231,193,0.92)' : '#1e1b4b';
  return (
    <div className="flex flex-col items-center gap-4 py-2">
      <AmandaPulse width={160} height={180} />
      {message && (
        <p className="text-center font-bold text-base" style={{ color: labelColor, maxWidth: 280 }}>
          {message}
        </p>
      )}
    </div>
  );
}

export default function AmandaProcessing({
  message = 'Amanda traite votre document…',
  size = 'md',
  variant = 'light',
  overlay = false,
}) {
  const content = (() => {
    switch (size) {
      case 'sm': return <SmContent message={message} variant={variant} />;
      case 'lg': return <LgContent message={message} variant={variant} />;
      default:   return <MdContent message={message} variant={variant} />;
    }
  })();

  if (overlay) {
    return (
      <div className="fixed inset-0 z-[80] flex items-center justify-center" style={{ background: 'rgba(255,255,255,0.85)', backdropFilter: 'blur(2px)' }}>
        <div className="flex flex-col items-center">
          {content}
        </div>
      </div>
    );
  }

  return <div className="flex justify-center">{content}</div>;
}