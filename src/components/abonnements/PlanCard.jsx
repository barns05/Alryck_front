import { useState } from 'react';
import { Star, Lock, ChevronDown } from 'lucide-react';
import { motion } from 'framer-motion';
import PlanDetailModal from './PlanDetailModal';

// ─── Losange cristal SVG ──────────────────────────────────────────────────────
function DiamondIcon({ dim = false }) {
  return (
    <svg
      width="10" height="14"
      viewBox="0 0 10 14"
      style={{ flexShrink: 0, marginTop: 3 }}
      fill={dim ? 'rgba(246,231,193,0.28)' : '#F6E7C1'}
    >
      <polygon points="5,0 10,7 5,14 0,7" />
    </svg>
  );
}

// ─── Bloc intro carte (sous-titre + bullets) ──────────────────────────────────
function IntroBloc({ intro }) {
  if (!intro) return null;
  return (
    <div className="mt-1">
      <p style={{
        fontSize: 13,
        fontStyle: 'italic',
        fontWeight: 400,
        color: '#FFFFFF',
        lineHeight: 1.45,
        margin: '0 0 8px',
      }}>
        {intro.sousTitre}
      </p>
      <ul style={{ listStyle: 'none', margin: 0, padding: 0, display: 'flex', flexDirection: 'column', gap: 6 }}>
        {intro.bullets.map((bullet, i) => (
          <li key={i} style={{ display: 'flex', alignItems: 'flex-start', gap: 7 }}>
            <DiamondIcon />
            <span style={{ fontSize: 14, color: '#F6E7C1', lineHeight: 1.4 }}>{bullet}</span>
          </li>
        ))}
      </ul>
    </div>
  );
}

const NAVY = '#1e1b4b';
const CHAMPAGNE = '#F6E7C1';

// ─── Proposition A — ModuleList avec objets {label, isNew} ───────────────────
function ModuleList({ items, accent, isPaid }) {
  return (
    <ul className="space-y-2 mt-2">
      {items.map((item, idx) => {
        const label = typeof item === 'string' ? item : item.label;
        const isNew = typeof item === 'string' ? true : item.isNew;
        return (
          <li key={idx} className="flex items-start gap-2 text-sm">
            {isPaid && isNew
              ? <DiamondIcon />
              : isPaid && !isNew
              ? <DiamondIcon dim />
              : <DiamondIcon />
            }
            <span style={{
              color: isPaid && isNew ? CHAMPAGNE : isPaid ? 'rgba(255,255,255,0.45)' : 'rgba(255,255,255,0.55)',
              fontWeight: isPaid && isNew ? 500 : 400,
              fontSize: 13,
            }}>
              {label}
            </span>
          </li>
        );
      })}
    </ul>
  );
}

// ─── GratuitBlocList — carte Gratuit ─────────────────────────────────────────
const GRATUIT_FEATURES = [
  'Retrouvez tous vos clients et tous vos événements dans des fiches complètes et centralisées',
  'Accédez à votre calendrier événementiel en un coup d\'œil',
  'Conservez l\'historique de vos échanges et coordonnées',
  'Offrez un espace dédié à chaque prospect grâce à votre vitrine professionnelle',
  'Présentez vos prestations de manière professionnelle',
];

function GratuitBlocList() {
  return (
    <div className="mt-1">
      <p style={{
        fontSize: 13,
        fontStyle: 'italic',
        fontWeight: 400,
        color: '#FFFFFF',
        lineHeight: 1.45,
        margin: '0 0 8px',
      }}>
        Centralisez vos clients et vos événements
      </p>
      <ul className="space-y-2">
        {GRATUIT_FEATURES.map((label, i) => (
          <li key={i} className="flex items-start gap-2 text-sm">
            <DiamondIcon />
            <span style={{ fontSize: 13, color: CHAMPAGNE, lineHeight: 1.45, fontWeight: 500 }}>{label}</span>
          </li>
        ))}
      </ul>
    </div>
  );
}

export default function PlanCard({
  index,
  title,
  icon,
  accent,
  glow,
  modules,
  modulesBlocs,
  isCurrent,
  isRecommended,
  isBusiness,
  onConfirmLevel,
  onAddFacturation,
  facturationDejaActive,
  currentSubscriptionLevel,
  loading,
  buttonLabel,
  buttonStyle,
  prixLancement,
  prixBarre,
  crystalImageUrl,
  macaronImageUrl,
  macaronLabel,
  showLaunchBadge,
  amandaLabel,
  amandaActive,
  intro,
  categorie,
  metier,
  restaurationIntegree,
}) {
  const [showDetail, setShowDetail] = useState(false);
  const isPaid = title !== 'Gratuit';

  // ── Proposition E — tap carte = ouvre modale (sauf Gratuit) ──────────────
  const handleCardClick = () => {
    setShowDetail(true);
  };

  return (
    <motion.div
      initial={{ opacity: 0, y: 24 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ duration: 0.45, delay: 0.08 + index * 0.08, ease: 'easeOut' }}
      className="relative flex flex-col rounded-[22px] p-5 cursor-pointer"
      style={{
        background: 'linear-gradient(160deg, rgba(255,255,255,0.04) 0%, rgba(30,27,75,0.60) 100%)',
        backdropFilter: 'blur(10px)',
        WebkitBackdropFilter: 'blur(10px)',
        // ── Proposition F — border permanente pour isCurrent ──────────────
        border: isCurrent
          ? `1px solid ${accent}55`
          : `1px solid rgba(255,255,255,0.10)`,
        boxShadow: isCurrent
          ? `0 0 0 1px ${accent}30, 0 8px 40px rgba(0,0,0,0.35), 0 0 30px ${glow}`
          : '0 4px 20px rgba(0,0,0,0.25)',
        transition: 'all 0.3s ease',
        minHeight: 420,
      }}
      onClick={handleCardClick}
      whileTap={{ scale: 0.99 }}
    >
      {/* ── Proposition F — Ligne colorée en haut de carte pour isCurrent ── */}
      <div className="pointer-events-none absolute inset-0 rounded-[22px] overflow-hidden">
        <div style={{
          position: 'absolute', top: 0, left: 0, right: 0,
          height: isCurrent ? 2 : 1,
          background: isCurrent
            ? `linear-gradient(90deg, transparent, ${accent}90, transparent)`
            : 'linear-gradient(90deg, transparent, rgba(255,255,255,0.12), transparent)',
        }} />
      </div>

      {/* Glow overlay isCurrent */}
      {isCurrent && (
        <div
          className="pointer-events-none absolute inset-0 rounded-[22px]"
          style={{ background: `radial-gradient(ellipse at 15% 40%, ${glow} 0%, transparent 60%)` }}
        />
      )}

      {/* ── Proposition F — Badge niveau actuel permanent ── */}
      {isCurrent && (
        <div style={{ position: 'absolute', top: -13, left: '50%', transform: 'translateX(-50%)', zIndex: 20 }}>
          <span style={{
            display: 'inline-block', fontSize: 10, fontWeight: 700,
            padding: '3px 12px', borderRadius: 999, whiteSpace: 'nowrap',
            background: accent, color: NAVY,
            boxShadow: `0 2px 12px ${glow}`, letterSpacing: '0.04em',
          }}>
            ✓ Votre niveau actuel
          </span>
        </div>
      )}

      {/* Badge Recommandé */}
      {isRecommended && !isCurrent && (
        <div style={{ position: 'absolute', top: -13, left: '50%', transform: 'translateX(-50%)', zIndex: 20 }}>
          <span style={{
            display: 'inline-flex', alignItems: 'center', gap: 4,
            fontSize: 10, fontWeight: 700,
            padding: '3px 12px', borderRadius: 999, whiteSpace: 'nowrap',
            background: 'rgba(246,231,200,0.15)',
            border: '1px solid rgba(246,231,200,0.40)',
            color: CHAMPAGNE,
            boxShadow: '0 2px 14px rgba(246,231,200,0.12)',
            letterSpacing: '0.05em',
            backdropFilter: 'blur(6px)',
            WebkitBackdropFilter: 'blur(6px)',
          }}>
            <Star size={9} className="fill-current shrink-0" style={{ color: CHAMPAGNE }} />
            Recommandé
          </span>
        </div>
      )}

      {/* Cristal — coin haut droit */}
      {crystalImageUrl && (
        <div style={{ position: 'absolute', top: 12, right: 12, zIndex: 10 }}>
          <img src={crystalImageUrl} alt="" style={{ width: 80, height: 80, objectFit: 'contain', mixBlendMode: 'luminosity', opacity: 0.92 }} />
        </div>
      )}

      {/* Header titre */}
      <div className="relative mt-2 mb-1 pr-16">
        <span style={{ fontSize: 20, fontWeight: 700, color: accent, letterSpacing: '0.02em' }}>
          {title}
        </span>
      </div>

      {/* ── Bloc prix ── */}
      <div className="relative mt-1 mb-2">
        {prixBarre && (
          <p style={{ fontSize: 16, color: 'rgba(255,255,255,0.38)', textDecoration: 'line-through', marginBottom: 2, letterSpacing: '0.01em', fontWeight: 400 }}>
            {prixBarre} €
          </p>
        )}
        <div className="flex items-end gap-1" style={{ filter: 'drop-shadow(0 0 12px rgba(246,231,193,0.12))' }}>
          {prixLancement !== undefined ? (
            <>
              <span style={{ fontSize: 44, fontWeight: 800, lineHeight: 1, color: isBusiness ? CHAMPAGNE : '#FFFFFF', letterSpacing: '-0.03em' }}>
                {prixLancement}
              </span>
              <span style={{ fontSize: 20, fontWeight: 600, color: isBusiness ? 'rgba(246,231,193,0.70)' : 'rgba(255,255,255,0.55)', marginBottom: 4 }}>€</span>
              <span style={{ fontSize: 12, color: isBusiness ? 'rgba(246,231,193,0.45)' : 'rgba(255,255,255,0.35)', marginBottom: 6, marginLeft: 2 }}>/mois</span>
            </>
          ) : (
            <>
              <span style={{ fontSize: 44, fontWeight: 800, lineHeight: 1, color: '#FFFFFF', letterSpacing: '-0.03em' }}>0</span>
              <span style={{ fontSize: 20, fontWeight: 600, color: 'rgba(255,255,255,0.55)', marginBottom: 4 }}>€</span>
            </>
          )}
        </div>
        {showLaunchBadge && (
          <div className="mt-3">
            <span style={{
              display: 'inline-block',
              fontSize: 10, fontWeight: 600,
              padding: '2px 10px', borderRadius: 999,
              background: 'rgba(246,231,193,0.10)',
              border: '1px solid rgba(246,231,193,0.25)',
              color: CHAMPAGNE,
              letterSpacing: '0.04em',
              backdropFilter: 'blur(4px)',
            }}>
              Offre de lancement
            </span>
          </div>
        )}
      </div>

      {/* Séparateur fin */}
      <div style={{
        height: 1,
        background: `linear-gradient(90deg, transparent, ${accent}30, transparent)`,
        margin: isPaid ? '12px 0 14px' : '8px 0 8px',
      }} />

      {/* ── Badge Amanda IA — toutes les cartes, en haut sous le séparateur ── */}
      {amandaLabel && (
        <div className="mb-2">
          <span style={{
            display: 'inline-flex',
            alignItems: 'center',
            gap: 5,
            padding: '3px 11px',
            borderRadius: 999,
            fontSize: 11,
            fontWeight: 600,
            letterSpacing: '0.04em',
            background: amandaActive ? 'rgba(246,231,193,0.10)' : 'rgba(148,163,184,0.08)',
            border: amandaActive ? '1px solid rgba(246,231,193,0.30)' : '1px solid rgba(255,255,255,0.10)',
            color: amandaActive ? CHAMPAGNE : 'rgba(255,255,255,0.28)',
            backdropFilter: 'blur(4px)',
          }}>
            <img
              src="https://media.base44.com/images/public/69b804640546049d1a7bf53a/b40a205d7_1B1C326A-B45D-4C5D-9B3D-69D6A46F502B.png"
              alt=""
              style={{
                width: 24,
                height: 24,
                objectFit: 'contain',
                flexShrink: 0,
                filter: amandaActive ? 'none' : 'grayscale(100%)',
                opacity: amandaActive ? 1 : 0.4,
              }}
            />
            {!amandaActive && <Lock size={10} className="shrink-0" style={{ color: 'rgba(255,255,255,0.28)' }} />}
            {amandaLabel}
          </span>
        </div>
      )}

      {/* ── Contenu carte : intro si fournie, sinon liste features ── */}
      <div className="relative flex-1">
        {intro
          ? <IntroBloc intro={intro} />
          : !isPaid && modulesBlocs
            ? <GratuitBlocList />
            : <ModuleList items={modules || []} accent={accent} isPaid={isPaid} />
        }
      </div>



      {/* ── Bouton détail visible — toutes les cartes ── */}
      <>
        {/* Séparateur accent fin */}
        <div style={{
          height: 1,
          background: `linear-gradient(90deg, transparent, ${accent}20, transparent)`,
          margin: '12px 0 8px',
        }} />
        <button
          onClick={e => { e.stopPropagation(); setShowDetail(true); }}
          className="w-full flex items-center justify-center gap-1.5 transition-opacity hover:opacity-90"
          style={{
            fontSize: 12,
            color: 'rgba(246,231,193,0.70)',
            background: 'none',
            border: 'none',
            cursor: 'pointer',
            letterSpacing: '0.02em',
            paddingBottom: 4,
          }}
        >
          Voir le détail complet
          <ChevronDown size={13} style={{ color: 'rgba(246,231,193,0.70)' }} />
        </button>
      </>

      {/* Modale détail */}
      {showDetail && (
        <PlanDetailModal
          level={title}
          categorie={categorie}
          metier={metier}
          restaurationIntegree={restaurationIntegree}
          currentSubscriptionLevel={currentSubscriptionLevel}
          facturationDejaActive={facturationDejaActive}
          onConfirm={(chosenLevel, withFacturation) => onConfirmLevel && onConfirmLevel(chosenLevel, withFacturation)}
          onAddFacturation={onAddFacturation}
          onClose={() => setShowDetail(false)}
        />
      )}

      {/* CTA */}
      <button
        onClick={e => { if (isPaid) { e.stopPropagation(); setShowDetail(true); } }}
        disabled={isPaid && (isCurrent || loading)}
        className="relative mt-2 w-full py-2.5 text-sm font-bold transition-all"
        style={{
          borderRadius: 999,
          opacity: loading ? 0.6 : 1,
          letterSpacing: '0.02em',
          cursor: isPaid && !isCurrent ? 'pointer' : 'default',
          ...buttonStyle,
        }}
        onMouseDown={e => { if (isPaid && !isCurrent) { e.stopPropagation(); e.currentTarget.style.transform = 'scale(0.97)'; } }}
        onMouseUp={e => { if (isPaid) { e.stopPropagation(); e.currentTarget.style.transform = 'scale(1)'; } }}
      >
        {isCurrent ? 'Niveau actuel' : buttonLabel}
      </button>
    </motion.div>
  );
}