import { useEffect, useState } from 'react';
import { createPortal } from 'react-dom';
import { X, Star, ChevronLeft, ChevronRight, CheckCircle2, RefreshCw, Zap, Globe } from 'lucide-react';
import { STARS, MACARON, getPlanSections, getPlanIntro, GRATUIT_MODAL_HEADER, ESSENTIEL_MODAL_HEADER, PRO_MODAL_HEADER, BUSINESS_MODAL_HEADER, PRIX, PRIX_BARRE, FACTURATION_ADDON } from './planDetailData';

// ─── Icônes SVG par nom de section ───────────────────────────────────────────
const SECTION_ICONS = {
  'Catalogue et Prestations': (
    <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round">
      <rect x="3" y="3" width="7" height="7" rx="1"/><rect x="14" y="3" width="7" height="7" rx="1"/>
      <rect x="3" y="14" width="7" height="7" rx="1"/><rect x="14" y="14" width="7" height="7" rx="1"/>
    </svg>
  ),
  'Prospects et Devis': (
    <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round">
      <path d="M17 21v-2a4 4 0 0 0-4-4H5a4 4 0 0 0-4 4v2"/>
      <circle cx="9" cy="7" r="4"/>
      <path d="M23 21v-2a4 4 0 0 0-3-3.87"/><path d="M16 3.13a4 4 0 0 1 0 7.75"/>
    </svg>
  ),
  'Expérience Client': (
    <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round">
      <path d="M20 21v-2a4 4 0 0 0-4-4H8a4 4 0 0 0-4 4v2"/>
      <circle cx="12" cy="7" r="4"/>
    </svg>
  ),
  'Amanda IA': (
    <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round">
      <polygon points="13 2 3 14 12 14 11 22 21 10 12 10 13 2"/>
    </svg>
  ),
  'Vitrine et visibilité': (
    <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round">
      <circle cx="12" cy="12" r="10"/><line x1="2" y1="12" x2="22" y2="12"/>
      <path d="M12 2a15.3 15.3 0 0 1 4 10 15.3 15.3 0 0 1-4 10 15.3 15.3 0 0 1-4-10 15.3 15.3 0 0 1 4-10z"/>
    </svg>
  ),
  'Espace Prospect': (
    <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round">
      <path d="M21 15a2 2 0 0 1-2 2H7l-4 4V5a2 2 0 0 1 2-2h14a2 2 0 0 1 2 2z"/>
    </svg>
  ),
  'Clients & Événements': (
    <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round">
      <rect x="3" y="4" width="18" height="18" rx="2"/><line x1="16" y1="2" x2="16" y2="6"/><line x1="8" y1="2" x2="8" y2="6"/><line x1="3" y1="10" x2="21" y2="10"/>
    </svg>
  ),
  'Écosystème Connecté': (
    <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round">
      <circle cx="18" cy="5" r="3"/><circle cx="6" cy="12" r="3"/><circle cx="18" cy="19" r="3"/>
      <line x1="8.59" y1="13.51" x2="15.42" y2="17.49"/><line x1="15.41" y1="6.51" x2="8.59" y2="10.49"/>
    </svg>
  ),
  'Espace prospect': (
    <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round">
      <path d="M17 21v-2a4 4 0 0 0-4-4H5a4 4 0 0 0-4 4v2"/><circle cx="9" cy="7" r="4"/>
      <path d="M23 21v-2a4 4 0 0 0-3-3.87"/>
    </svg>
  ),
  'Bibliothèque complète': (
    <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round">
      <path d="M3 9l9-7 9 7v11a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2z"/><polyline points="9 22 9 12 15 12 15 22"/>
    </svg>
  ),
  'Gestion événements': (
    <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round">
      <path d="M14 2H6a2 2 0 0 0-2 2v16a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2V8z"/><polyline points="14 2 14 8 20 8"/>
      <line x1="16" y1="13" x2="8" y2="13"/><line x1="16" y1="17" x2="8" y2="17"/>
    </svg>
  ),
  'Gestion extras et équipes': (
    <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round">
      <path d="M17 21v-2a4 4 0 0 0-4-4H5a4 4 0 0 0-4 4v2"/><circle cx="9" cy="7" r="4"/>
      <path d="M23 21v-2a4 4 0 0 0-3-3.87"/><path d="M16 3.13a4 4 0 0 1 0 7.75"/>
    </svg>
  ),
  'Analyses et prévisionnel': (
    <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round">
      <line x1="18" y1="20" x2="18" y2="10"/><line x1="12" y1="20" x2="12" y2="4"/>
      <line x1="6" y1="20" x2="6" y2="14"/><line x1="2" y1="20" x2="22" y2="20"/>
    </svg>
  ),
  'Gestion logistique': (
    <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round">
      <rect x="1" y="3" width="15" height="13"/><polygon points="16 8 20 8 23 11 23 16 16 16 16 8"/>
      <circle cx="5.5" cy="18.5" r="2.5"/><circle cx="18.5" cy="18.5" r="2.5"/>
    </svg>
  ),
  'Bibliothèque premium': (
    <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round">
      <polygon points="12 2 15.09 8.26 22 9.27 17 14.14 18.18 21.02 12 17.77 5.82 21.02 7 14.14 2 9.27 8.91 8.26 12 2"/>
    </svg>
  ),
};

// Icône de fallback générique
function getFallbackIcon() {
  return (
    <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round">
      <circle cx="12" cy="12" r="10"/><line x1="12" y1="8" x2="12" y2="12"/><line x1="12" y1="16" x2="12.01" y2="16"/>
    </svg>
  );
}

function getSectionIcon(titre) {
  return SECTION_ICONS[titre] || getFallbackIcon();
}

// Détermine la couleur d'icône selon le niveau
function getIconStyle(level, titre) {
  if (titre === 'Amanda IA' || titre.startsWith('Amanda')) {
    return { bg: 'rgba(124,58,237,0.25)', color: '#a78bfa' };
  }
  const map = {
    Gratuit:   { bg: 'rgba(148,163,184,0.18)', color: '#94a3b8' },
    Essentiel: { bg: 'rgba(0,212,255,0.15)', color: '#00D4FF' },
    Pro:       { bg: 'rgba(124,58,237,0.18)',  color: '#a78bfa' },
    Business:  { bg: 'rgba(246,231,193,0.15)', color: '#F6E7C1' },
  };
  return map[level] || map.Essentiel;
}

// Couleur du checkmark selon le niveau
const CHECK_COLOR = {
  Gratuit:   '#94a3b8',
  Essentiel: '#00D4FF',
  Pro:       '#a78bfa',
  Business:  '#F6E7C1',
};

// ─── Rendu unifié pour tous les niveaux ───────────────────────────────────────
function UnifiedContent({ level, sections, accent, macaron, facturationOn, onFacturationToggle }) {
  const checkColor = CHECK_COLOR[level] || '#00D4FF';
  const borderColor = `${accent}18`;

  // Sépare les sections pour l'affichage
  // Pour Gratuit : toutes les sections nommées restent dans la grille, seul _isVisuel va en pleine largeur
  // Pour les autres niveaux : VITRINE_TITRES vont en pleine largeur
  const VITRINE_TITRES = level === 'Gratuit'
    ? ['Votre Vitrine Professionnelle', 'Vitrine et visibilité', 'Vitrine Professionnelle'].filter(() => false) // aucune pour Gratuit
    : ['Votre Vitrine Professionnelle', 'Vitrine et visibilité', 'Vitrine Professionnelle'];
  const INCLUS_TITRES  = ['Inclus dans Essentiel', 'Inclus gratuitement', 'Inclus dans Pro', 'Inclus dans Business'];
  const AMANDA_TITRES   = (s) => s.titre.startsWith('Amanda');

  const vitrineSection = sections.find(s => VITRINE_TITRES.includes(s.titre));
  const visuelSection  = sections.find(s => s._isVisuel);
  const inclusSection  = sections.find(s => INCLUS_TITRES.includes(s.titre));
  const amandaSection   = sections.find(s => AMANDA_TITRES(s));
  const starSection    = sections.find(s => s._isStarCard);
  // Sections principales = tout sauf vitrine pleine-largeur, inclus, amanda, visuel, star (grille 2 colonnes)
  const mainSections   = sections.filter(s =>
    !VITRINE_TITRES.includes(s.titre) &&
    !INCLUS_TITRES.includes(s.titre) &&
    !AMANDA_TITRES(s) &&
    !s._isVisuel &&
    !s._isStarCard
  );

  // Header intro
  const intro = level === 'Gratuit'
    ? { titre: GRATUIT_MODAL_HEADER.titre, intro: GRATUIT_MODAL_HEADER.intro }
    : level === 'Essentiel'
    ? { titre: ESSENTIEL_MODAL_HEADER.titre, intro: ESSENTIEL_MODAL_HEADER.intro }
    : level === 'Pro'
    ? { titre: PRO_MODAL_HEADER.titre, intro: PRO_MODAL_HEADER.intro }
    : level === 'Business'
    ? { titre: BUSINESS_MODAL_HEADER.titre, intro: BUSINESS_MODAL_HEADER.intro }
    : null;

  const inclusColor = CHECK_COLOR[level] || '#00D4FF';
  const INCLUS_ICONS_EL = [
    <CheckCircle2 size={22} style={{ color: inclusColor }} />,
    <RefreshCw size={22} style={{ color: inclusColor }} />,
    <Zap size={22} style={{ color: inclusColor }} />,
  ];

  return (
    <div style={{ padding: '20px 16px 8px' }}>

      {/* ── Titre + intro ── */}
      {intro && (
        <>
          <h2 style={{ fontSize: 20, fontWeight: 800, color: '#fff', margin: '0 0 12px', lineHeight: 1.25 }}>
            {intro.titre}
          </h2>
          {intro.intro.split('\n\n').map((para, i) => (
            <p key={i} style={{ fontSize: 13, color: 'rgba(246,231,193,0.80)', fontStyle: 'italic', lineHeight: 1.6, margin: i === 0 ? '0 0 8px' : '0 0 20px' }}>
              {para}
            </p>
          ))}
        </>
      )}

      {/* ── Bloc badge Partenaire (niveaux payants) ── */}
      {macaron && (
        <div style={{
          background: 'rgba(246,231,193,0.07)',
          border: '1px solid rgba(246,231,193,0.22)',
          borderRadius: 14, padding: '10px 12px 10px 8px', marginBottom: 20,
          display: 'flex', alignItems: 'center', gap: 10,
        }}>
          <img
            src={macaron.imageUrl}
            alt={macaron.label}
            style={{
              width: 118,
              height: 118,
              objectFit: 'contain', flexShrink: 0,
              transform: 'scale(1.35)',
              transformOrigin: 'center center',
              filter: 'drop-shadow(0 0 14px rgba(246,231,193,0.55)) drop-shadow(0 0 6px rgba(246,231,193,0.35))',
            }}
          />
          <div style={{ flex: 1, minWidth: 0 }}>
            <p style={{ margin: 0, fontSize: 13, fontWeight: 700, color: '#F6E7C1', lineHeight: 1.3 }}>
              Badge Partenaire ALRYCK inclus
            </p>
            <p style={{ margin: '4px 0 0', fontSize: 12, color: 'rgba(255,255,255,0.72)', lineHeight: 1.5 }}>
              Affichez immédiatement votre statut professionnel sur votre vitrine et vos espaces clients.
            </p>
            <p style={{ margin: '3px 0 0', fontSize: 11, color: 'rgba(246,231,193,0.60)', fontStyle: 'italic' }}>
              Un signe de confiance visible dès le premier contact.
            </p>
          </div>
        </div>
      )}

      {/* ── Carte Star pleine largeur (Business) ── */}
      {starSection && (() => {
        const iconStyle = getIconStyle(level, starSection.titre);
        return (
          <div style={{
            background: 'rgba(246,231,193,0.06)',
            border: '1px solid rgba(246,231,193,0.28)',
            borderRadius: 14, padding: '14px',
            boxShadow: '0 0 18px rgba(246,231,193,0.08)',
            marginBottom: 14,
          }}>
            <div style={{ display: 'flex', alignItems: 'center', gap: 8, marginBottom: 12 }}>
              <div style={{
                width: 36, height: 36, borderRadius: 10,
                background: iconStyle.bg,
                display: 'flex', alignItems: 'center', justifyContent: 'center', flexShrink: 0,
                color: iconStyle.color,
                filter: 'brightness(1.15)',
                }}>
                <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round">
                    <path d="M12 22s8-4 8-10V5l-8-3-8 3v7c0 6 8 10 8 10z"/>
                </svg>
              </div>
              <div>
                <p style={{ margin: 0, fontSize: 13, fontWeight: 800, color: '#fff', lineHeight: 1.2 }}>
                  {starSection.titre}
                </p>
                <p style={{ margin: '2px 0 0', fontSize: 11, color: 'rgba(255,255,255,0.55)', fontStyle: 'italic' }}>
                  Restez conforme, organisé et protégé à tout moment
                </p>
              </div>
            </div>
            <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '6px 16px' }}>
              {starSection.items.map((item, i) => (
                <div key={i} style={{ display: 'flex', alignItems: 'flex-start', gap: 7 }}>
                  <CheckCircle2 size={13} style={{ color: '#F6E7C1', flexShrink: 0, marginTop: 2, opacity: 0.95 }} />
                  <span style={{ fontSize: 12, color: 'rgba(255,255,255,0.92)', lineHeight: 1.4 }}>
                    {item.label}
                  </span>
                </div>
              ))}
            </div>
          </div>
        );
      })()}

      {/* ── Grille 2 colonnes : sections principales + Amanda IA (Essentiel seulement) ── */}
      {(mainSections.length > 0 || (amandaSection && level === 'Essentiel')) && (
        <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 10, marginBottom: 14 }}>
          {/* Sections principales */}
          {mainSections.map(section => {
            const iconStyle = getIconStyle(level, section.titre);
            return (
              <div
                key={section.titre}
                style={{
                  background: 'rgba(255,255,255,0.04)',
                  border: `1px solid ${borderColor}`,
                  borderRadius: 14, padding: '12px 12px 14px',
                  boxShadow: `0 0 6px ${accent}10`,
                  display: 'flex', flexDirection: 'column',
                }}
              >
                <div style={{ display: 'flex', alignItems: 'flex-start', gap: 8, marginBottom: 10 }}>
                  <div style={{
                    width: 36, height: 36, borderRadius: 10,
                    background: iconStyle.bg,
                    display: 'flex', alignItems: 'center', justifyContent: 'center',
                    flexShrink: 0, color: iconStyle.color,
                    filter: 'brightness(1.15)',
                  }}>
                    {getSectionIcon(section.titre)}
                  </div>
                  <p style={{ margin: 0, fontSize: 13, fontWeight: 800, color: '#fff', lineHeight: 1.25, paddingTop: 2 }}>
                    {section.titre}
                  </p>
                </div>
                <ul style={{ listStyle: 'none', margin: 0, padding: 0, display: 'flex', flexDirection: 'column', gap: 6, flex: 1 }}>
                  {section.items.map((item, i) => (
                    <li key={i} style={{ display: 'flex', alignItems: 'flex-start', gap: 7 }}>
                      <CheckCircle2 size={14} style={{ color: checkColor, flexShrink: 0, marginTop: 2, filter: 'brightness(1.2)' }} />
                      <span style={{ fontSize: 12, color: '#fff', lineHeight: 1.4 }}>
                        {item.label}
                      </span>
                    </li>
                  ))}
                </ul>
              </div>
            );
          })}

                      {/* Amanda IA dans la grille — Essentiel uniquement */}
          {amandaSection && level === 'Essentiel' && (() => {
            const iconStyle = getIconStyle(level, amandaSection.titre);
            return (
              <div
                style={{
                  background: 'rgba(255,255,255,0.04)',
                  border: `1px solid ${borderColor}`,
                  borderRadius: 14, padding: '12px 12px 14px',
                  boxShadow: `0 0 6px ${accent}10`,
                  display: 'flex', flexDirection: 'column',
                }}
              >
                <div style={{ display: 'flex', alignItems: 'flex-start', gap: 8, marginBottom: 10 }}>
                  <div style={{
                    width: 36, height: 36, borderRadius: 10,
                    background: iconStyle.bg,
                    display: 'flex', alignItems: 'center', justifyContent: 'center',
                    flexShrink: 0, color: iconStyle.color,
                    filter: 'brightness(1.15)',
                  }}>
                    {getSectionIcon(amandaSection.titre)}
                  </div>
                  <p style={{ margin: 0, fontSize: 13, fontWeight: 800, color: '#fff', lineHeight: 1.25, paddingTop: 2 }}>
                    {amandaSection.titre}
                  </p>
                </div>
                <ul style={{ listStyle: 'none', margin: 0, padding: 0, display: 'flex', flexDirection: 'column', gap: 6, flex: 1 }}>
                  {amandaSection.items.map((item, i) => (
                    <li key={i} style={{ display: 'flex', alignItems: 'flex-start', gap: 7 }}>
                      <CheckCircle2 size={14} style={{ color: checkColor, flexShrink: 0, marginTop: 2, filter: 'brightness(1.2)' }} />
                      <span style={{ fontSize: 12, color: '#fff', lineHeight: 1.4 }}>
                        {item.label}
                      </span>
                    </li>
                  ))}
                </ul>
              </div>
            );
          })()}
        </div>
      )}

      {/* ── Amanda IA — pleine largeur (Pro et autres niveaux hors Essentiel) ── */}
      {amandaSection && level !== 'Essentiel' && (
        <div style={{
          background: 'rgba(124,58,237,0.06)',
          border: '1px solid rgba(124,58,237,0.28)',
          borderRadius: 14, padding: '14px',
          boxShadow: '0 0 12px rgba(124,58,237,0.10)',
          marginBottom: 14,
        }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: 8, marginBottom: 12 }}>
            <div style={{
              width: 36, height: 36, borderRadius: 10,
              background: 'rgba(124,58,237,0.22)',
              display: 'flex', alignItems: 'center', justifyContent: 'center', flexShrink: 0,
              color: '#a78bfa',
              filter: 'brightness(1.15)',
            }}>
              <Zap size={18} />
            </div>
            <p style={{ margin: 0, fontSize: 13, fontWeight: 800, color: '#fff', lineHeight: 1.25 }}>
              {amandaSection.titre}
            </p>
          </div>
          <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '6px 16px' }}>
            {amandaSection.items.map((item, i) => (
              <div key={i} style={{ display: 'flex', alignItems: 'flex-start', gap: 7 }}>
                <CheckCircle2 size={14} style={{ color: '#a78bfa', flexShrink: 0, marginTop: 2, filter: 'brightness(1.2)' }} />
                <span style={{ fontSize: 12, color: '#fff', lineHeight: 1.4 }}>
                  {item.label}
                </span>
              </div>
            ))}
          </div>
        </div>
      )}

      {/* ── Ligne 3 : Vitrine Professionnelle — pleine largeur, layout côte-à-côte ── */}
      {vitrineSection && (
        <div style={{
          background: 'rgba(255,255,255,0.04)',
          border: `1px solid rgba(246,231,193,0.18)`,
          borderRadius: 14, padding: '14px',
          boxShadow: '0 0 10px rgba(246,231,193,0.06)',
          marginBottom: 14,
        }}>
          {/* Header */}
          <div style={{ display: 'flex', alignItems: 'center', gap: 8, marginBottom: 12 }}>
            <div style={{
              width: 36, height: 36, borderRadius: 10,
              background: getIconStyle(level, vitrineSection.titre).bg,
              display: 'flex', alignItems: 'center', justifyContent: 'center', flexShrink: 0,
              color: getIconStyle(level, vitrineSection.titre).color,
              filter: 'brightness(1.15)',
            }}>
              <Globe size={20} />
            </div>
            <p style={{ margin: 0, fontSize: 13, fontWeight: 800, color: '#fff', lineHeight: 1.25 }}>
              {vitrineSection.titre}
            </p>
          </div>

          {/* Bullets pleine largeur */}
          <ul style={{ listStyle: 'none', margin: '0 0 12px', padding: 0, display: 'flex', flexDirection: 'column', gap: 6 }}>
            {vitrineSection.items.map((item, i) => (
              <li key={i} style={{ display: 'flex', alignItems: 'flex-start', gap: 7 }}>
                <CheckCircle2 size={14} style={{ color: checkColor, flexShrink: 0, marginTop: 2, filter: 'brightness(1.2)' }} />
                <span style={{ fontSize: 12, color: '#fff', lineHeight: 1.4 }}>
                  {item.label}
                </span>
              </li>
            ))}
          </ul>

          {/* Aperçu vitrine pleine largeur */}
          <div style={{ borderRadius: 12, overflow: 'hidden' }}>
            <img
              src="https://media.base44.com/images/public/69b804640546049d1a7bf53a/533273761_IMG_2594.jpg"
              alt="Aperçu vitrine"
              style={{ width: '100%', display: 'block', objectFit: 'cover' }}
            />
          </div>
        </div>
      )}

      {/* ── Carte visuelle "Une expérience unique" (Gratuit) ── */}
      {visuelSection && (
        <div style={{
          background: 'rgba(255,255,255,0.04)',
          border: `1px solid ${borderColor}`,
          borderRadius: 14, padding: '14px',
          boxShadow: `0 0 10px ${accent}08`,
          marginBottom: 14,
        }}>
          {/* Header */}
          <div style={{ marginBottom: 10 }}>
            <p style={{ margin: 0, fontSize: 13, fontWeight: 700, color: '#fff' }}>
              {visuelSection.titre}
            </p>
            <p style={{ margin: '3px 0 0', fontSize: 11, color: 'rgba(255,255,255,0.40)', fontStyle: 'italic' }}>
              Découvrez l'espace prospect et client ALRYCK.
            </p>
          </div>

          {/* Bullets courts */}
          <div style={{ display: 'flex', flexWrap: 'wrap', gap: '6px 14px', marginBottom: 12 }}>
            {visuelSection.items.map((item, i) => (
              <div key={i} style={{ display: 'flex', alignItems: 'center', gap: 5 }}>
                <CheckCircle2 size={12} style={{ color: checkColor, flexShrink: 0 }} />
                <span style={{ fontSize: 11.5, color: 'rgba(255,255,255,0.90)' }}>{item.label}</span>
              </div>
            ))}
          </div>

          {/* Visuels réels de l'application */}
          <div style={{ borderRadius: 10, overflow: 'hidden' }}>
            <img
              src="https://media.base44.com/images/public/69b804640546049d1a7bf53a/9db6e4491_IMG_2612.jpg"
              alt="Aperçu espace client ALRYCK - partie haute"
              style={{ width: '100%', display: 'block', objectFit: 'contain' }}
            />
            <img
              src="https://media.base44.com/images/public/69b804640546049d1a7bf53a/86af518e3_IMG_2615.jpg"
              alt="Aperçu espace client ALRYCK - partie basse"
              style={{ width: '100%', display: 'block', objectFit: 'contain' }}
            />
          </div>
        </div>
      )}

      {/* ── Bandeau Amanda pour Gratuit ── */}
      {level === 'Gratuit' && (
        <div style={{
          background: 'rgba(124,58,237,0.08)',
          border: '1px solid rgba(124,58,237,0.18)',
          borderRadius: 14, padding: '12px 14px',
          marginBottom: 14,
          display: 'flex', alignItems: 'flex-start', gap: 10,
        }}>
          <img
            src="https://media.base44.com/images/public/69b804640546049d1a7bf53a/b40a205d7_1B1C326A-B45D-4C5D-9B3D-69D6A46F502B.png"
            alt="Amanda"
            style={{ width: 36, height: 36, objectFit: 'contain', flexShrink: 0, filter: 'grayscale(60%)', opacity: 0.7 }}
          />
          <p style={{ margin: 0, fontSize: 12, color: 'rgba(255,255,255,0.72)', fontStyle: 'italic', lineHeight: 1.6 }}>
            Découvrez les capacités d'Amanda IA dans les formules supérieures et automatisez encore davantage votre activité.
          </p>
        </div>
      )}

      {/* ── Add-on Facturation avec toggle (tous niveaux payants) ── */}
      {level !== 'Gratuit' && (() => {
        const addonColors = {
          Essentiel: { bg: 'rgba(0,212,255,0.06)', border: 'rgba(0,212,255,0.22)', borderOn: 'rgba(0,212,255,0.55)', iconBg: 'rgba(0,212,255,0.14)', color: '#00D4FF', toggleOn: '#00D4FF' },
          Pro:       { bg: 'rgba(124,58,237,0.06)', border: 'rgba(124,58,237,0.22)', borderOn: 'rgba(124,58,237,0.65)', iconBg: 'rgba(124,58,237,0.15)', color: '#a78bfa', toggleOn: '#a78bfa' },
          Business:  { bg: 'rgba(246,231,193,0.06)', border: 'rgba(246,231,193,0.22)', borderOn: 'rgba(246,231,193,0.55)', iconBg: 'rgba(246,231,193,0.12)', color: '#F6E7C1', toggleOn: '#F6E7C1' },
        };
        const c = addonColors[level] || addonColors.Pro;
        return (
          <div style={{
            background: facturationOn ? `${c.bg.replace('0.06', '0.12')}` : c.bg,
            border: `1px solid ${facturationOn ? c.borderOn : c.border}`,
            borderRadius: 12, padding: '12px 14px', marginBottom: 14,
            transition: 'border-color 0.2s, background 0.2s',
          }}>
            <div style={{ display: 'flex', alignItems: 'center', gap: 12 }}>
              <div style={{
                width: 34, height: 34, borderRadius: 9, flexShrink: 0,
                background: c.iconBg,
                display: 'flex', alignItems: 'center', justifyContent: 'center',
                color: c.color,
              }}>
                <Zap size={17} />
              </div>
              <div style={{ flex: 1, minWidth: 0 }}>
                <div style={{ display: 'flex', alignItems: 'baseline', gap: 8, flexWrap: 'wrap' }}>
                  <p style={{ margin: 0, fontSize: 13, fontWeight: 700, color: c.color }}>
                    Facturation ALRYCK
                  </p>
                  <span style={{ fontSize: 12, fontWeight: 700, color: 'rgba(255,255,255,0.65)' }}>
                    +{FACTURATION_ADDON} €/mois
                  </span>
                </div>
                <p style={{ margin: '3px 0 0', fontSize: 11, color: 'rgba(255,255,255,0.62)', lineHeight: 1.45 }}>
                  Gérez vos factures officielles directement depuis ALRYCK — numérotation légale et suivi des paiements.
                </p>
              </div>
              {/* Toggle */}
              <button
                onClick={() => onFacturationToggle(v => !v)}
                style={{
                  flexShrink: 0,
                  width: 44, height: 24,
                  borderRadius: 999,
                  border: 'none',
                  background: facturationOn ? c.toggleOn : 'rgba(255,255,255,0.15)',
                  cursor: 'pointer',
                  position: 'relative',
                  transition: 'background 0.2s',
                  padding: 0,
                }}
              >
                <span style={{
                  position: 'absolute',
                  top: 3, left: facturationOn ? 23 : 3,
                  width: 18, height: 18,
                  borderRadius: '50%',
                  background: facturationOn ? '#1e1b4b' : 'rgba(255,255,255,0.80)',
                  transition: 'left 0.2s',
                  display: 'block',
                }} />
              </button>
            </div>
            {/* Label sous le toggle */}
            <p style={{
              margin: '8px 0 0',
              fontSize: 11,
              color: facturationOn ? c.color : 'rgba(255,255,255,0.40)',
              fontWeight: facturationOn ? 600 : 400,
              textAlign: 'right',
              transition: 'color 0.2s',
            }}>
              {facturationOn ? `✓ Facturation ALRYCK activée (+${FACTURATION_ADDON} €/mois)` : `Ajouter la Facturation ALRYCK (+${FACTURATION_ADDON} €/mois)`}
            </p>
          </div>
        );
      })()}

      {/* ── Section "Inclus" ── */}
      {inclusSection && (
        <div style={{ borderTop: '1px solid rgba(255,255,255,0.08)', paddingTop: 14, marginBottom: 8 }}>
          <p style={{
            textAlign: 'center', fontSize: 12, fontWeight: 600,
            color: 'rgba(255,255,255,0.62)', letterSpacing: '0.06em',
            textTransform: 'uppercase', margin: '0 0 12px',
          }}>
            {inclusSection.titre}
          </p>
          <div style={{ display: 'flex', justifyContent: 'space-around', gap: 8 }}>
            {inclusSection.items.map((item, i) => (
              <div key={i} style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', gap: 6, flex: 1, textAlign: 'center' }}>
                {INCLUS_ICONS_EL[i] || <CheckCircle2 size={22} style={{ color: '#00D4FF' }} />}
                <span style={{ fontSize: 11, color: 'rgba(255,255,255,0.92)', lineHeight: 1.35 }}>{item.label}</span>
              </div>
            ))}
          </div>
        </div>
      )}
    </div>
  );
}

const NAVY = '#1e1b4b';
const CHAMPAGNE = '#F6E7C1';

// Données statiques par niveau (accent, glow, style bouton, label CTA)
const LEVELS_CONFIG = {
  Gratuit: {
    accent: '#94a3b8',
    glow: 'rgba(148,163,184,0.18)',
    buttonBase: null,
    label: null,
  },
  Essentiel: {
    accent: '#00D4FF',
    glow: 'rgba(0,212,255,0.22)',
    buttonBase: { background: '#00D4FF', color: NAVY, boxShadow: '0 4px 18px rgba(0,212,255,0.30)' },
    label: 'Passer Essentiel',
  },
  Pro: {
    accent: '#7c3aed',
    glow: 'rgba(124,58,237,0.28)',
    buttonBase: { background: '#7c3aed', color: '#fff', boxShadow: '0 4px 18px rgba(124,58,237,0.35)' },
    label: 'Passer Pro',
  },
  Business: {
    accent: '#EED9B7',
    glow: 'rgba(246,231,193,0.22)',
    buttonBase: {
      background: 'linear-gradient(135deg, #F6E7C1 0%, #DCC7A1 100%)',
      color: NAVY,
      boxShadow: '0 4px 20px rgba(246,231,193,0.28)',
    },
    label: 'Démo gratuite',
  },
};

const ALL_LEVELS = ['Gratuit', 'Essentiel', 'Pro', 'Business'];

export default function PlanDetailModal({
  level: initialLevel,
  categorie,
  metier,
  restaurationIntegree,
  currentSubscriptionLevel, // niveau actuellement souscrit
  facturationDejaActive,    // true si modules_actifs.facturation déjà actif
  onConfirm,                 // appelé avec le niveau choisi
  onAddFacturation,          // appelé pour ajouter uniquement la facturation
  onClose,
  loading,
}) {
  const [idx, setIdx] = useState(() => {
    const i = ALL_LEVELS.indexOf(initialLevel);
    return i >= 0 ? i : 0;
  });
  const [facturationOn, setFacturationOn] = useState(false);

  useEffect(() => {
    const prev = document.body.style.overflow;
    document.body.style.overflow = 'hidden';
    return () => { document.body.style.overflow = prev; };
  }, []);

  const level = ALL_LEVELS[idx];
  const cfg = LEVELS_CONFIG[level];
  const macaron = MACARON[level];
  const sections = getPlanSections(level, categorie, metier, restaurationIntegree);

  const cat = categorie || 'A';
  const prixNiveau = PRIX[level];
  const prix = prixNiveau ? (prixNiveau[cat] ?? prixNiveau['A']) : null;
  const prixBarreNiveau = PRIX_BARRE[level];
  const prixBarre = prixBarreNiveau ? (prixBarreNiveau[cat] ?? prixBarreNiveau['A']) : null;
  const accent = cfg.accent;
  const glow = cfg.glow;
  const isGratuit = level === 'Gratuit';
  const prixTotal = prix !== null ? (facturationOn ? prix + FACTURATION_ADDON : prix) : null;

  const isCurrent = level === currentSubscriptionLevel;
  const isFirst = idx === 0;
  const isLast = idx === ALL_LEVELS.length - 1;

  // ── Logique CTA ──
  // Cas spécial : niveau actuel payant → CTA Facturation uniquement
  const isCurrentPaid = isCurrent && !isGratuit;
  // Bouton "Ajouter Facturation" : niveau actuel, toggle activé, pas encore en base
  const ctaAddFacturation = isCurrentPaid && facturationOn && !facturationDejaActive;

  // Style du bouton selon l'état
  const btnStyle = isCurrentPaid
    ? ctaAddFacturation
      ? cfg.buttonBase  // actif avec style du niveau
      : { background: 'rgba(255,255,255,0.08)', color: 'rgba(255,255,255,0.30)', cursor: 'not-allowed' }
    : isCurrent
    ? { background: 'rgba(255,255,255,0.08)', color: 'rgba(255,255,255,0.30)', cursor: 'not-allowed' }
    : cfg.buttonBase;

  // Labels CTA dynamiques
  const ctaLabels = {
    Essentiel: facturationOn ? `Passer Essentiel + Facturation — ${prixTotal} €/mois` : `Passer Essentiel — ${prix} €/mois`,
    Pro:       facturationOn ? `Passer Pro + Facturation — ${prixTotal} €/mois` : `Passer Pro — ${prix} €/mois`,
    Business:  facturationOn ? `Business + Facturation — ${prixTotal} €/mois` : cfg.label,
  };

  return createPortal(
    <>
      {/* ── Overlay ── */}
      <div
        onClick={onClose}
        style={{
          position: 'fixed',
          inset: 0,
          zIndex: 9998,
          background: 'rgba(0,0,0,0.70)',
          backdropFilter: 'blur(4px)',
          WebkitBackdropFilter: 'blur(4px)',
        }}
      />

      {/* ── Conteneur centré ── */}
      <div
        style={{
          position: 'fixed',
          inset: 0,
          zIndex: 9999,
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'center',
          padding: '16px',
          boxSizing: 'border-box',
        }}
        onClick={onClose}
      >
        {/* ── Panel modale ── */}
        <div
          onClick={e => e.stopPropagation()}
          style={{
            position: 'relative',
            width: '100%',
            maxWidth: 640,
            maxHeight: '90vh',
            display: 'flex',
            flexDirection: 'column',
            borderRadius: 20,
            overflow: 'hidden',
            background: `radial-gradient(ellipse at 30% 20%, #2d2a6e 0%, ${NAVY} 70%)`,
            border: '1px solid rgba(255,255,255,0.13)',
            boxShadow: `0 8px 60px rgba(0,0,0,0.60), 0 0 40px ${glow}`,
            transition: 'box-shadow 0.3s',
          }}
        >
          {/* Constellation décorative */}
          <svg style={{ position: 'absolute', inset: 0, width: '100%', height: '100%', pointerEvents: 'none', opacity: 0.7 }}>
            {STARS.map((s, i) => (
              <circle key={i} cx={`${s.x}%`} cy={`${s.y}%`} r={s.r} fill="white" opacity={s.o} />
            ))}
          </svg>

          {/* ── Header fixe ── */}
          <div
            style={{
              position: 'relative',
              flexShrink: 0,
              padding: '14px 16px 22px',
              borderBottom: '1px solid rgba(255,255,255,0.08)',
              background: 'rgba(20,18,60,0.95)',
              backdropFilter: 'blur(12px)',
              WebkitBackdropFilter: 'blur(12px)',
              zIndex: 2,
              display: 'flex',
              alignItems: 'center',
              gap: 10,
            }}
          >
            {/* Flèche gauche */}
            <button
              onClick={() => setIdx(i => i - 1)}
              disabled={isFirst}
              style={{
                flexShrink: 0,
                width: 34, height: 34,
                display: 'flex', alignItems: 'center', justifyContent: 'center',
                borderRadius: '50%',
                border: '1px solid rgba(255,255,255,0.12)',
                background: 'rgba(255,255,255,0.06)',
                color: isFirst ? 'rgba(255,255,255,0.18)' : CHAMPAGNE,
                cursor: isFirst ? 'default' : 'pointer',
              }}
            >
              <ChevronLeft size={16} />
            </button>

            {/* Centre : cristal (à gauche du titre) + titre + prix + macaron (à droite) */}
            <div style={{ flex: 1, display: 'flex', alignItems: 'center', justifyContent: 'center', gap: 10, minWidth: 0 }}>
              {/* Cristal du niveau — discret, 26px */}
              {level === 'Essentiel' && (
                <img
                  src="https://media.base44.com/images/public/69b804640546049d1a7bf53a/5df4b8137_40AB57F7-CC66-4C3C-A62C-747B04F3F9D8.png"
                  alt=""
                  style={{ width: 26, height: 26, objectFit: 'contain', flexShrink: 0, opacity: 0.88 }}
                />
              )}
              {level === 'Pro' && (
                <img
                  src="https://media.base44.com/images/public/69b804640546049d1a7bf53a/966b4195c_AFA6BCF1-8E1F-474D-80A9-6CDF89CA79C9.png"
                  alt=""
                  style={{ width: 26, height: 26, objectFit: 'contain', flexShrink: 0, opacity: 0.88 }}
                />
              )}
              {level === 'Business' && (
                <img
                  src="https://media.base44.com/images/public/69b804640546049d1a7bf53a/d57a45d75_68089AEB-F2E7-48BE-9065-EFFA426078B9.png"
                  alt=""
                  style={{ width: 26, height: 26, objectFit: 'contain', flexShrink: 0, opacity: 0.88 }}
                />
              )}
              {isGratuit && (
                <img
                  src="https://media.base44.com/images/public/69b804640546049d1a7bf53a/7be0b55e7_C55CA9E3-739F-4C22-BF06-3264ACEBB5B6.png"
                  alt="Gratuit"
                  style={{ width: 26, height: 26, objectFit: 'contain', flexShrink: 0, mixBlendMode: 'luminosity', opacity: 0.75 }}
                />
              )}
              <span style={{ fontSize: 18, fontWeight: 800, color: '#fff', letterSpacing: '-0.02em' }}>
                {level}
              </span>
              {/* Prix inline — masqué pour Gratuit */}
              {prix !== null && prix !== undefined && (
                <span style={{ fontSize: 15, fontWeight: 700, color: 'rgba(255,255,255,0.55)', flexShrink: 0 }}>
                  {prix} €
                  <span style={{ fontSize: 11, fontWeight: 400, marginLeft: 2 }}>/mois</span>
                </span>
              )}
              {isGratuit && (
                <span style={{ fontSize: 15, fontWeight: 700, color: 'rgba(255,255,255,0.55)', flexShrink: 0 }}>
                  Gratuit
                </span>
              )}

            </div>
            {/* Sans engagement */}
            <p style={{
              position: 'absolute',
              bottom: 4,
              left: 0, right: 0,
              textAlign: 'center',
              fontSize: 10,
              fontStyle: 'italic',
              color: 'rgba(246,231,193,0.40)',
              pointerEvents: 'none',
              margin: 0,
            }}>
              Sans engagement — résiliable à tout moment
            </p>
            {/* Flèche droite */}
            <button
              onClick={() => setIdx(i => i + 1)}
              disabled={isLast}
              style={{
                flexShrink: 0,
                width: 34, height: 34,
                display: 'flex', alignItems: 'center', justifyContent: 'center',
                borderRadius: '50%',
                border: '1px solid rgba(255,255,255,0.12)',
                background: 'rgba(255,255,255,0.06)',
                color: isLast ? 'rgba(255,255,255,0.18)' : CHAMPAGNE,
                cursor: isLast ? 'default' : 'pointer',
              }}
            >
              <ChevronRight size={16} />
            </button>

            {/* Bouton fermer X */}
            <button
              onClick={onClose}
              style={{
                flexShrink: 0,
                width: 34, height: 34,
                display: 'flex', alignItems: 'center', justifyContent: 'center',
                borderRadius: '50%',
                background: 'rgba(246,231,193,0.12)',
                border: '1px solid rgba(246,231,193,0.28)',
                color: CHAMPAGNE,
                cursor: 'pointer',
                marginLeft: 4,
              }}
            >
              <X size={15} />
            </button>
          </div>

          {/* Séparateur accent */}
          <div style={{
            flexShrink: 0,
            height: 1,
            background: `linear-gradient(90deg, transparent, ${accent}55, transparent)`,
            position: 'relative', zIndex: 2,
          }} />

          {/* ── Contenu scrollable ── */}
          <div
            style={{
              position: 'relative',
              flex: 1,
              overflowY: 'auto',
              overflowX: 'hidden',
              WebkitOverflowScrolling: 'touch',
              zIndex: 1,
            }}
          >
            {/* ── Layout unifié pour tous les niveaux ── */}
            <UnifiedContent
              level={level}
              sections={sections}
              accent={accent}
              macaron={macaron}
              facturationOn={facturationOn}
              onFacturationToggle={setFacturationOn}
            />
          </div>

          {/* ── CTA fixe en bas ── */}
          <div
            style={{
              position: 'relative',
              flexShrink: 0,
              padding: '14px 20px',
              paddingBottom: 'calc(env(safe-area-inset-bottom, 0px) + 14px)',
              borderTop: '1px solid rgba(255,255,255,0.08)',
              background: 'rgba(20,18,60,0.97)',
              zIndex: 2,
            }}
          >
            {/* Mini avatar Amanda + message contextuel — masqué pour Gratuit */}
            {!isGratuit && (() => {
              const messages = {
                Essentiel: 'Structurez votre activité et gagnez un temps précieux grâce à l\'automatisation de vos documents et de votre suivi commercial.',
                Pro: 'Pilotez vos événements de A à Z grâce à un véritable logiciel métier conçu pour les professionnels de l\'événementiel.',
                Business: 'L\'expérience la plus complète du marché événementiel pour les professionnels qui veulent tout automatiser.',
              };
              return (
                <div style={{
                  display: 'flex', alignItems: 'flex-start', gap: 10, marginBottom: 12,
                  padding: '10px 12px', borderRadius: 10,
                  background: isGratuit
                    ? 'rgba(255,255,255,0.04)'
                    : level === 'Pro'
                    ? 'rgba(124,58,237,0.08)'
                    : level === 'Business'
                    ? 'rgba(246,231,193,0.07)'
                    : 'linear-gradient(135deg, rgba(0,212,255,0.10) 0%, rgba(124,58,237,0.10) 100%)',
                  border: isGratuit
                    ? '1px solid rgba(255,255,255,0.07)'
                    : level === 'Pro'
                    ? '1px solid rgba(124,58,237,0.22)'
                    : level === 'Business'
                    ? '1px solid rgba(246,231,193,0.20)'
                    : '1px solid rgba(0,212,255,0.15)',
                }}>
                  <img
                    src="https://media.base44.com/images/public/69b804640546049d1a7bf53a/b40a205d7_1B1C326A-B45D-4C5D-9B3D-69D6A46F502B.png"
                    alt="Amanda"
                    style={{
                      width: 46, height: 46, objectFit: 'contain', flexShrink: 0,
                      filter: isGratuit ? 'grayscale(100%)' : 'none',
                      opacity: isGratuit ? 0.4 : 1,
                    }}
                  />
                  <p style={{
                    margin: 0,
                    fontSize: 12,
                    lineHeight: 1.55,
                    color: isGratuit ? 'rgba(255,255,255,0.62)' : 'rgba(246,231,193,0.92)',
                    fontStyle: 'italic',
                    paddingTop: 3,
                  }}>
                    {messages[level]}
                  </p>
                </div>
              );
            })()}

            {/* CTA Gratuit */}

            {isGratuit ? (
              isCurrent ? (
                /* Niveau actuel = Gratuit → on propose de passer à l'Essentiel */
                <button
                  onClick={e => { e.stopPropagation(); setIdx(1); }}
                  style={{
                    width: '100%',
                    padding: '13px 0',
                    borderRadius: 999,
                    fontSize: 14,
                    fontWeight: 700,
                    letterSpacing: '0.02em',
                    border: '1px solid rgba(246,231,193,0.45)',
                    background: 'rgba(246,231,193,0.12)',
                    color: CHAMPAGNE,
                    cursor: 'pointer',
                    transition: 'transform 0.12s',
                  }}
                  onMouseDown={e => { e.currentTarget.style.transform = 'scale(0.98)'; }}
                  onMouseUp={e => { e.currentTarget.style.transform = 'scale(1)'; }}
                >
                  Découvrir l'Essentiel →
                </button>
              ) : (
                /* Niveau actuel ≠ Gratuit → on peut rétrograder */
                <button
                  onClick={e => { e.stopPropagation(); onConfirm?.('Gratuit'); onClose(); }}
                  style={{
                    width: '100%',
                    padding: '13px 0',
                    borderRadius: 999,
                    fontSize: 14,
                    fontWeight: 700,
                    letterSpacing: '0.02em',
                    border: '1px solid rgba(255,255,255,0.18)',
                    background: 'rgba(255,255,255,0.08)',
                    color: 'rgba(255,255,255,0.60)',
                    cursor: 'pointer',
                    transition: 'transform 0.12s',
                  }}
                  onMouseDown={e => { e.currentTarget.style.transform = 'scale(0.98)'; }}
                  onMouseUp={e => { e.currentTarget.style.transform = 'scale(1)'; }}
                >
                  Rétrograder vers Gratuit
                </button>
              )
            ) : (
              <button
                onClick={e => {
                  e.stopPropagation();
                  if (isCurrentPaid) {
                    // Niveau actuel payant : ajouter uniquement la facturation si toggle activé
                    if (ctaAddFacturation) { onAddFacturation?.(); onClose(); }
                  } else if (!isCurrent) {
                    onConfirm?.(level, facturationOn); onClose();
                  }
                }}
                disabled={isCurrentPaid ? !ctaAddFacturation || loading : isCurrent || loading}
                style={{
                  width: '100%',
                  padding: '13px 0',
                  borderRadius: 999,
                  fontSize: (facturationOn && !isCurrentPaid) ? 13 : 14,
                  fontWeight: 700,
                  letterSpacing: '0.02em',
                  border: 'none',
                  transition: 'transform 0.12s, font-size 0.15s',
                  ...btnStyle,
                }}
                onMouseDown={e => { if (isCurrentPaid ? ctaAddFacturation : !isCurrent) e.currentTarget.style.transform = 'scale(0.98)'; }}
                onMouseUp={e => { e.currentTarget.style.transform = 'scale(1)'; }}
              >
                {isCurrentPaid
                  ? (facturationDejaActive
                      ? '✓ Facturation activée'
                      : facturationOn
                        ? `Ajouter la Facturation — +${FACTURATION_ADDON} €/mois`
                        : 'Activez le toggle pour ajouter la Facturation')
                  : isCurrent
                    ? 'Niveau actuel'
                    : (ctaLabels[level] || cfg.label)
                }
              </button>
            )}
          </div>
        </div>
      </div>
    </>,
    document.body
  );
}