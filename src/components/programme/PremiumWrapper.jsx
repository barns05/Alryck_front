/**
 * PremiumWrapper — Wrapper unifié pour TOUS les thèmes premium du Programme.
 *
 * Architecture graphique standard ALRYCK (3 assets indépendants) :
 *
 *   ┌─ Wrapper (paperBg, border, shadow, borderRadius, minHeight)
 *   │   ├─ Layer 1: Texture de fond (cover, no-repeat, center)
 *   │   │              → Couvre toute la hauteur du wrapper (scale uniforme).
 *   │   │              → Les bords de la texture raccordent avec decoTop et decoBottom.
 *   │   ├─ Layer 2: Décoration haute (1200×600, motifs coins supérieurs)
 *   │   │              → <picture> + <img> top:0, width 100%, height auto
 *   │   ├─ Layer 3: Décoration basse (1200×600, motifs coins inférieurs)
 *   │   │              → <picture> + <img> bottom:0, width 100%, height auto
 *   │   │              → loading="lazy" (souvent hors écran initial)
 *   │   ├─ Layer 4: Filet intérieur (CSS border, opacity paramétrable)
 *   │   └─ Layer 5: Contenu (z-index: 1, pointer-events actifs)
 *
 * Principe : les 3 images se raccordent naturellement (fond de la déco =
 * texture principale) pour donner l'illusion d'un seul support graphique.
 * AUCUNE transparence alpha requise. AUCUN blend-mode. AUCUN masque CSS.
 *
 * Règles strictes (non-négociables) :
 *   - AUCUN filtre CSS : pas de mix-blend-mode, filter, brightness, contrast
 *   - Assets affichés dans leurs couleurs d'origine
 *   - pointer-events: none sur TOUTES les couches décoratives (1-4)
 *   - Décorations haute/basse ancrées indépendamment de la hauteur du contenu
 *   - Décorations JAMAIS étirées verticalement (height: auto conserve le ratio)
 *
 * Support WebP + fallback JPEG :
 *   Le moteur accepte des URLs WebP avec un fallback JPEG optionnel.
 *   - texture : CSS image-set() si fallback fourni, sinon URL directe
 *   - decoTop / decoBottom : <picture> + <source type="image/webp"> si fallback
 *
 *   Tant que les URLs WebP ne sont pas fournies, les URLs PNG existantes
 *   continuent de fonctionner sans modification (rétro-compatibilité totale).
 *
 * Config thème attendue :
 *   textureUrl: string | null         — URL principale (WebP, JPEG ou PNG)
 *   textureUrlFallback: string | null — URL fallback JPEG (si textureUrl est WebP)
 *   textureMode: 'cover' | 'repeat'    — mode d'intégration (default: 'cover')
 *   textureOpacity: number            — opacité texture (default: 1)
 *   decoTopUrl: string | null         — URL principale déco haute
 *   decoTopUrlFallback: string | null — URL fallback JPEG déco haute
 *   decoBottomUrl: string | null      — URL principale déco basse
 *   decoBottomUrlFallback: string | null — URL fallback JPEG déco basse
 *   innerBorder: boolean              — afficher filet intérieur (default: true)
 *   innerBorderOpacity: number        — opacité filet (default: 0.16)
 *   innerBorderInset: number          — inset du filet en px (default: 12)
 *
 * Props: theme, children
 */
export default function PremiumWrapper({ theme, children }) {
  if (!theme || !theme.premium) {
    return <>{children}</>;
  }

  // ── Wrapper base ──────────────────────────────────────────────────────────
  const accent = theme.accent || '#C97A5A';
  const paperBg = theme.paperBg || '#FCF8F3';
  const borderColor = theme.paperBorder || 'rgba(0,0,0,0.1)';
  const shadow = theme.paperShadow;
  const radius = theme.paperRadius || '28px';

  // ── Layer 1: Texture (WebP + fallback JPEG via image-set) ──────────────────
  const textureUrl = theme.textureUrlWebp || theme.textureUrl || theme.paperTextureUrl || null;
  const textureUrlFallback = theme.textureUrlFallback || null;
  const textureMode = theme.textureMode || 'cover';
  const textureOpacity = theme.textureOpacity ?? 1;

  // Construit le background-image : image-set() si fallback, sinon URL directe
  const textureBg = textureUrl && textureUrlFallback
    ? `image-set(url("${textureUrl}") 1x type("image/webp"), url("${textureUrlFallback}") 1x type("image/jpeg"))`
    : textureUrl ? `url("${textureUrl}")` : null;

  // ── Layer 2-3: Décorations (WebP + fallback JPEG via <picture>) ───────────
  const decoTopUrl = theme.decoTopUrlWebp || theme.decoTopUrl || null;
  const decoTopUrlFallback = theme.decoTopUrlFallback || null;
  const decoBottomUrl = theme.decoBottomUrlWebp || theme.decoBottomUrl || null;
  const decoBottomUrlFallback = theme.decoBottomUrlFallback || null;

  // ── Layer 4: Filet intérieur ───────────────────────────────────────────────
  const showInnerBorder = theme.innerBorder !== false;
  const innerBorderOpacity = theme.innerBorderOpacity ?? 0.16;
  const innerBorderInset = theme.innerBorderInset ?? 12;

  return (
    <div style={{
      width: 'calc(100% - 24px)',
      maxWidth: 600,
      margin: '36px auto 32px auto',
      background: paperBg,
      borderRadius: radius,
      border: `1px solid ${borderColor}`,
      boxShadow: shadow,
      overflow: 'hidden',
      position: 'relative',
      minHeight: 600,
    }}>
      {/* ── Layer 1: Texture de fond ────────────────────────────────────────
          Mode cover : couvre toute la hauteur du wrapper. Les bords de la
          texture sont visibles et raccordent avec decoTop (en haut) et
          decoBottom (en bas). Comportement d'origine restauré. */}
      {textureBg && (
        <div aria-hidden="true" style={{
          position: 'absolute',
          inset: 0,
          backgroundImage: textureBg,
          backgroundSize: textureMode === 'repeat' ? 'auto' : 'cover',
          backgroundPosition: 'center',
          backgroundRepeat: textureMode === 'repeat' ? 'repeat' : 'no-repeat',
          opacity: textureOpacity,
          pointerEvents: 'none',
          zIndex: 0,
        }} />
      )}

      {/* ── Layer 2: Décoration haute ──────────────────────────────────────
          <picture> pour le support WebP + fallback JPEG.
          decoding="async" pour libérer le thread principal au décodage.
          width 100%, height auto → JAMAIS étirée verticalement. */}
      {decoTopUrl && (
        <picture>
          {decoTopUrlFallback && (
            <source srcSet={decoTopUrl} type="image/webp" />
          )}
          <img
            src={decoTopUrlFallback || decoTopUrl}
            alt=""
            aria-hidden="true"
            decoding="async"
            style={{
              position: 'absolute',
              top: 0,
              left: 0,
              width: '100%',
              height: 'auto',
              display: 'block',
              pointerEvents: 'none',
              zIndex: 0,
            }}
          />
        </picture>
      )}

      {/* ── Layer 3: Décoration basse ──────────────────────────────────────
          Même logique que la déco haute + loading="lazy" car souvent hors
          écran au chargement initial. */}
      {decoBottomUrl && (
        <picture>
          {decoBottomUrlFallback && (
            <source srcSet={decoBottomUrl} type="image/webp" />
          )}
          <img
            src={decoBottomUrlFallback || decoBottomUrl}
            alt=""
            aria-hidden="true"
            decoding="async"
            loading="lazy"
            style={{
              position: 'absolute',
              bottom: 0,
              left: 0,
              width: '100%',
              height: 'auto',
              display: 'block',
              pointerEvents: 'none',
              zIndex: 0,
            }}
          />
        </picture>
      )}

      {/* ── Layer 4: Filet intérieur ─────────────────────────────────────── */}
      {showInnerBorder && (
        <div style={{
          position: 'absolute',
          inset: innerBorderInset,
          border: `1px solid ${accent}`,
          opacity: innerBorderOpacity,
          borderRadius: `calc(${radius} - 8px)`,
          pointerEvents: 'none',
          zIndex: 0,
        }} />
      )}

      {/* ── Layer 5: Contenu ─────────────────────────────────────────────── */}
      <div style={{ position: 'relative', zIndex: 1, paddingTop: 32 }}>
        {children}
      </div>
    </div>
  );
}