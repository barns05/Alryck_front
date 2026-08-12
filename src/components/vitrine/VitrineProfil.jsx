/**
 * VitrineProfil — Passeport universel du prestataire / établissement
 *
 * Utilisé à 4 endroits :
 *  1. Lien prospect (mode="prospect", props prospect + settings)
 *  2. Annuaire / recommandation (mode="prestataire", prestataire_id)
 *  3. Page Ma Vitrine admin (mode="company")
 *  4. Carte prestataire espace client (mode="prestataire", prestataire_id)
 *
 * Branché sur useVitrineData pour la résolution de source.
 */
import { useState, useRef, useEffect } from 'react';
import { useQuery } from '@tanstack/react-query';
import { base44 } from '@/api/base44Client';
import { Star, ExternalLink, ArrowLeft, Phone, Globe, Lock, MessageCircle, CalendarClock, Folder, FileText, Camera, Users, FileStack, CheckSquare, Armchair, Calendar, Wallet, Palette } from 'lucide-react';
import { differenceInDays } from 'date-fns';
import { AnimatePresence } from 'framer-motion';
import { DrawerSheet } from '@/components/client-portal/MonEspaceTab';
import { useVitrineData } from './useVitrineData';
import ProspectFormules from '@/components/prospect-portal/ProspectFormules';
import ProspectAvis from '@/components/prospect-portal/ProspectAvis';
import ProspectMessagerie from '@/components/prospect-portal/ProspectMessagerie';
import ProspectDateDemande from '@/components/prospect-portal/ProspectDateDemande';
import ProspectPreReservation from '@/components/prospect-portal/ProspectPreReservation';
import ProspectToujoursInteresse from '@/components/prospect-portal/ProspectToujoursInteresse';
import ProspectGalerie from '@/components/prospect-portal/ProspectGalerie';
import SocialNetworksSection from '@/components/client-portal/SocialNetworksSection';
import BlocInfosDecouverte from '@/components/vitrine/BlocInfosDecouverte';
import FaqAccordion from '@/components/vitrine/FaqAccordion';
import ReassuranceAccordions from '@/components/vitrine/ReassuranceAccordions';
import { getMetierConfig } from '@/config/metierConfig';
import { EVENT_EMOJIS } from '@/lib/eventEmojis';

// ─── Icônes SVG inline ────────────────────────────────────────────────────────
function IconFormules() {
  return (
    <svg width="28" height="28" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round">
      <path d="M3 11l19-9-9 19-2-8-8-2z"/>
    </svg>
  );
}
function IconMessagerie() {
  return (
    <svg width="22" height="22" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.7" strokeLinecap="round" strokeLinejoin="round">
      <path d="M21 15a2 2 0 0 1-2 2H7l-4 4V5a2 2 0 0 1 2-2h14a2 2 0 0 1 2 2z"/>
    </svg>
  );
}
function IconDate() {
  return (
    <svg width="22" height="22" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.7" strokeLinecap="round" strokeLinejoin="round">
      <rect x="3" y="4" width="18" height="18" rx="2"/><line x1="16" y1="2" x2="16" y2="6"/><line x1="8" y1="2" x2="8" y2="6"/><line x1="3" y1="10" x2="21" y2="10"/>
    </svg>
  );
}
function IconPreResa() {
  return (
    <svg width="22" height="22" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.7" strokeLinecap="round" strokeLinejoin="round">
      <rect x="3" y="11" width="18" height="11" rx="2"/><path d="M7 11V7a5 5 0 0 1 10 0v4"/>
    </svg>
  );
}
function IconChevron() {
  return (
    <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
      <polyline points="9 18 15 12 9 6"/>
    </svg>
  );
}

// ─── Grille de tuiles ─────────────────────────────────────────────────────────
function TilesGrid({ onSelect, vitrineData, mode_recommandation = false }) {
  const metierCfg = getMetierConfig(vitrineData?.metier);
  const appellation = vitrineData?.appellation_commerciale
    || metierCfg.appellation_defaut
    || 'Formules & Devis';

  return (
    <div className="space-y-3">
      <p className="text-[10px] font-bold text-slate-400 uppercase tracking-[0.15em]">Votre espace</p>

      <button
        onClick={() => onSelect('formules')}
        className="premium-card w-full flex items-center justify-between px-5 py-5 text-left transition-all active:scale-[0.98]"
      >
        <div className="flex items-center gap-4 relative z-[3]">
          <div className="w-11 h-11 rounded-xl flex items-center justify-center shrink-0 relative z-[3]" style={{ background: 'rgba(30,27,75,0.06)' }}>
            <FileStack size={22} strokeWidth={1.75} style={{ color: '#1e1b4b' }} />
          </div>
          <div>
            <p className="premium-card-title text-base leading-tight" style={{ color: '#1e1b4b' }}>{appellation}</p>
            <p className="text-xs mt-1" style={{ color: '#9ca3af' }}>Consultez nos offres et demandez un devis</p>
          </div>
        </div>
        <span className="shrink-0 relative z-[3]" style={{ color: 'rgba(30,27,75,0.35)' }}><IconChevron /></span>
      </button>

      {!mode_recommandation && (
      <div className="grid grid-cols-2 md:grid-cols-3 gap-3">
          <button
            onClick={() => onSelect('messages')}
            className="premium-card flex flex-col gap-3 p-4 text-left transition-all active:scale-[0.98]"
          >
            <div className="w-11 h-11 rounded-xl flex items-center justify-center shrink-0 relative z-[3]" style={{ background: 'rgba(30,27,75,0.06)' }}>
              <MessageCircle size={22} strokeWidth={1.75} style={{ color: '#1e1b4b' }} />
            </div>
            <div className="relative z-[3]">
              <p className="premium-card-title text-sm leading-tight" style={{ color: '#1e1b4b' }}>Messagerie</p>
              <p className="text-[11px] mt-0.5" style={{ color: '#9ca3af' }}>Écrivez-nous</p>
            </div>
          </button>

        <button
          onClick={() => onSelect('dates')}
          className="premium-card flex flex-col gap-3 p-4 text-left transition-all active:scale-[0.98]"
        >
          <div className="w-11 h-11 rounded-xl flex items-center justify-center shrink-0 relative z-[3]" style={{ background: 'rgba(30,27,75,0.06)' }}>
            <CalendarClock size={22} strokeWidth={1.75} style={{ color: '#1e1b4b' }} />
          </div>
          <div className="relative z-[3]">
            <p className="premium-card-title text-sm leading-tight" style={{ color: '#1e1b4b' }}>Disponibilité</p>
            <p className="text-[11px] mt-0.5" style={{ color: '#9ca3af' }}>Vérifier une date</p>
          </div>
        </button>

      </div>
      )}
    </div>
  );
}

function getInitiales(name) {
  if (!name) return '?';
  return name.trim().split(/\s+/).map(w => w[0]).slice(0, 2).join('').toUpperCase();
}

// ─── Carte de présentation établissement ──────────────────────────────────────
export function CarteEtablissement({ vitrineData, nbEvenements, mode_decouverte = false }) {
  const nom = vitrineData?.nom || 'Votre organisateur';
  const anneesExp = vitrineData?.annee_creation
    ? new Date().getFullYear() - vitrineData.annee_creation
    : null;

  const badges = [];
  if (nbEvenements >= 50) badges.push({ label: 'Excellence', emoji: '🏆' });
  else if (nbEvenements >= 10) badges.push({ label: 'Vérifié', emoji: '✅' });
  if (nbEvenements >= 10) badges.push({ label: 'Réponse rapide', emoji: '⚡' });

  const hasCover = !!vitrineData?.cover_url;

  return (
    <div className="bg-white border border-border rounded-2xl overflow-hidden shadow-sm">
      <div className="relative" style={{ height: 220 }}>
        {hasCover ? (
          <img src={vitrineData.cover_url} alt="Couverture" className="w-full h-full object-cover" />
        ) : (
          <div className="w-full h-full" style={{ background: 'linear-gradient(135deg, #1e1b4b 0%, #3730a3 60%, #b45309 100%)' }} />
        )}
        <div className="absolute inset-0" style={{ background: 'linear-gradient(to top, rgba(0,0,0,0.65) 0%, rgba(0,0,0,0.10) 55%, transparent 100%)' }} />

        <div style={{ position: 'absolute', bottom: 12, left: 16, width: 88, height: 88 }}>
          {vitrineData?.logo_url ? (
            <img src={vitrineData.logo_url} alt={nom} className="object-contain rounded-xl"
              style={{ width: 88, height: 88, border: '2px solid white', boxShadow: '0 6px 16px rgba(0,0,0,0.40)', background: 'white', display: 'block' }} />
          ) : (
            <div className="rounded-xl flex items-center justify-center text-white text-2xl font-bold select-none"
              style={{ width: 88, height: 88, border: '2px solid white', boxShadow: '0 6px 16px rgba(0,0,0,0.40)', background: 'rgba(30,27,75,0.85)' }}>
              {getInitiales(nom)}
            </div>
          )}
          {/* Macaron abonnement — uniquement si subscription_level renseigné */}
          {(vitrineData?.subscription_level && vitrineData.subscription_level !== 'Gratuit') && (() => {
            const MACARON_URLS = {
              Essentiel: 'https://media.base44.com/images/public/69b804640546049d1a7bf53a/d53f06681_30508522-C1A0-460A-8B60-8154EDD6277E.png',
              Pro:       'https://media.base44.com/images/public/69b804640546049d1a7bf53a/98e1f1124_26A34486-246A-415C-8660-2D0D308FD53A.png',
              Business:  'https://media.base44.com/images/public/69b804640546049d1a7bf53a/1c587c6c6_52ACD217-F1A8-4E67-A572-D0FCF490FF0F.png',
            };
            const url = MACARON_URLS[vitrineData.subscription_level];
            if (!url) return null;
            return (
              <img src={url} alt="Partenaire ALRYCK"
                style={{ position: 'absolute', top: -30, right: -30, width: 75, height: 75, objectFit: 'contain', pointerEvents: 'none', filter: 'drop-shadow(0 3px 10px rgba(0,0,0,0.40))' }} />
            );
          })()}
        </div>

        <div className="absolute bottom-3 left-28 right-4 flex items-end justify-between gap-2">
          <div className="min-w-0">
            <h2 className="font-bold text-xl text-white leading-tight" style={{ textShadow: '0 1px 6px rgba(0,0,0,0.6)' }}>{nom}</h2>
            {(vitrineData?.metier || vitrineData?.ville) && (
              <p className="text-white/70 text-xs mt-0.5" style={{ textShadow: '0 1px 4px rgba(0,0,0,0.5)' }}>
                {vitrineData?.metier}{vitrineData?.metier && vitrineData?.ville ? ' · ' : ''}{vitrineData?.ville}
              </p>
            )}
          </div>
          {badges.length > 0 && (
            <div className="flex gap-1.5 shrink-0">
              {badges.map(b => (
                <span key={b.label} className="inline-flex items-center gap-1 text-[10px] font-semibold px-2 py-0.5 rounded-full text-white"
                  style={{ background: 'rgba(255,255,255,0.20)', border: '1px solid rgba(255,255,255,0.40)' }}>
                  {b.emoji} {b.label}
                </span>
              ))}
            </div>
          )}
        </div>

        {!mode_decouverte && (
        <div className="absolute top-3 right-3 flex gap-2">
          {vitrineData?.telephone && (
            <a href={`tel:${vitrineData.telephone}`}
              className="inline-flex items-center gap-1 text-white text-sm font-semibold rounded-full px-3 py-1 transition-opacity active:opacity-70"
              style={{ background: 'rgba(255,255,255,0.35)', border: '1px solid rgba(255,255,255,0.50)', textShadow: '0 1px 3px rgba(0,0,0,0.5)' }}>
              📞 Nous appeler
            </a>
          )}
          {vitrineData?.site_web && (
            <a href={vitrineData.site_web} target="_blank" rel="noopener noreferrer"
              className="inline-flex items-center gap-1 text-white text-sm font-semibold rounded-full px-3 py-1 transition-opacity active:opacity-70"
              style={{ background: 'rgba(255,255,255,0.35)', border: '1px solid rgba(255,255,255,0.50)', textShadow: '0 1px 3px rgba(0,0,0,0.5)' }}>
              🌐 Notre site
            </a>
          )}
        </div>
        )}
      </div>

      {!mode_decouverte && (
      <div className="px-5 pt-4 pb-4 space-y-2 relative">
        {vitrineData?.adresse && (
          <button onClick={() => window.open(`https://maps.google.com?q=${encodeURIComponent(vitrineData.adresse)}`, '_blank')}
            className="flex items-center gap-1.5 text-xs text-muted-foreground hover:text-foreground transition-colors text-left">
            <svg width="13" height="13" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round" className="shrink-0 text-slate-400">
              <path d="M21 10c0 7-9 13-9 13s-9-6-9-13a9 9 0 0 1 18 0z"/><circle cx="12" cy="10" r="3"/>
            </svg>
            <span className="underline underline-offset-2">{vitrineData.adresse}</span>
          </button>
        )}
        {vitrineData?.accroche && (
          <p className="text-sm text-foreground/80 italic leading-relaxed">{vitrineData.accroche}</p>
        )}
        {anneesExp !== null && anneesExp > 0 && (
          <p className="text-xs text-primary font-semibold">🏆 {anneesExp} ans d'expérience</p>
        )}
        {vitrineData?.lien_avis_externe && (
          <a href={vitrineData.lien_avis_externe} target="_blank" rel="noopener noreferrer"
            className="inline-flex items-center gap-2 text-sm font-semibold text-primary hover:underline">
            <Star size={14} className="fill-amber-400 text-amber-400" />
            Voir nos avis clients
            <ExternalLink size={12} />
          </a>
        )}
      </div>
      )}
    </div>
  );
}

function darkenHex(hex, amount = 0.3) {
  const h = hex.replace('#', '');
  const r = Math.round(parseInt(h.substring(0, 2), 16) * (1 - amount));
  const g = Math.round(parseInt(h.substring(2, 4), 16) * (1 - amount));
  const b = Math.round(parseInt(h.substring(4, 6), 16) * (1 - amount));
  return `#${r.toString(16).padStart(2, '0')}${g.toString(16).padStart(2, '0')}${b.toString(16).padStart(2, '0')}`;
}

function useCountdown(targetDate) {
  const [remaining, setRemaining] = useState(null);
  useEffect(() => {
    if (!targetDate) return;
    const target = new Date(targetDate);
    const tick = () => {
      const diff = target - new Date();
      if (diff <= 0) { setRemaining({ jours: 0, h: '00', m: '00', s: '00' }); return; }
      const jours = Math.floor(diff / 86400000);
      const h = String(Math.floor((diff % 86400000) / 3600000)).padStart(2, '0');
      const m = String(Math.floor((diff % 3600000) / 60000)).padStart(2, '0');
      const s = String(Math.floor((diff % 60000) / 1000)).padStart(2, '0');
      setRemaining({ jours, h, m, s });
    };
    tick();
    const id = setInterval(tick, 1000);
    return () => clearInterval(id);
  }, [targetDate]);
  return remaining;
}

function LieuModal({ lieuNom, lieuAdresse, lieuTelephone, onClose }) {
  const query = encodeURIComponent(lieuAdresse ? `${lieuNom} ${lieuAdresse}` : lieuNom);
  const mapsUrl = `https://www.google.com/maps/search/?api=1&query=${query}`;
  return (
    <div className="fixed inset-0 z-50 flex items-end justify-center" onClick={onClose}>
      <div className="absolute inset-0 bg-black/40" />
      <div className="relative w-full max-w-md bg-white rounded-t-2xl px-5 pt-5 pb-8 shadow-2xl" onClick={e => e.stopPropagation()}>
        <div className="w-10 h-1 bg-slate-200 rounded-full mx-auto mb-4" />
        <p className="font-bold text-base text-foreground mb-1">{lieuNom}</p>
        {lieuAdresse && <p className="text-xs text-muted-foreground mb-4">{lieuAdresse}</p>}
        <div className="space-y-3">
          <a href={mapsUrl} target="_blank" rel="noopener noreferrer"
            className="flex items-center gap-3 w-full px-4 py-3 rounded-xl bg-blue-50 border border-blue-100 text-blue-700 font-semibold text-sm active:bg-blue-100 transition-colors">
            <span className="text-lg">🗺️</span> Ouvrir dans Maps
          </a>
          {lieuTelephone && (
            <a href={`tel:${lieuTelephone}`}
              className="flex items-center gap-3 w-full px-4 py-3 rounded-xl bg-emerald-50 border border-emerald-100 text-emerald-700 font-semibold text-sm active:bg-emerald-100 transition-colors">
              <span className="text-lg">📞</span> Appeler le lieu
            </a>
          )}
          <button onClick={onClose} className="w-full py-2.5 text-sm text-muted-foreground">Fermer</button>
        </div>
      </div>
    </div>
  );
}

function BlocProjet({ prospect }) {
  const [showLieuModal, setShowLieuModal] = useState(false);

  const { data: lieu = null } = useQuery({
    queryKey: ['lieu-prospect', prospect.lieu_id],
    queryFn: () => base44.entities.Lieu.filter({ id: prospect.lieu_id }).then(r => r[0] || null),
    enabled: !!prospect.lieu_id,
  });

  let dateLabel = null;
  let dateExacte = null;
  if ((prospect.date_type === 'exacte' || !prospect.date_type) && prospect.date_evenement_souhaitee) {
    dateExacte = prospect.date_evenement_souhaitee;
    dateLabel = new Date(prospect.date_evenement_souhaitee).toLocaleDateString('fr-FR', { weekday: 'long', day: 'numeric', month: 'long', year: 'numeric' });
  } else if (prospect.date_type === 'mois' && prospect.date_mois) {
    dateLabel = new Date(prospect.date_mois + '-15').toLocaleDateString('fr-FR', { month: 'long', year: 'numeric' });
  } else if (prospect.date_type === 'periode' && prospect.date_periode) {
    dateLabel = prospect.date_periode;
  }

  const countdown = useCountdown(dateExacte);

  if (!dateLabel && !prospect.type_evenement && !prospect.lieu_nom) return null;

  const prospectNom = prospect.prenom + ' ' + prospect.nom +
    (prospect.prenom2 ? ' & ' + prospect.prenom2 + ' ' + (prospect.nom2 || prospect.nom) : '');
  const icon = EVENT_EMOJIS[prospect.type_evenement] || '🎉';
  const couleur = prospect.couleur_theme || null;
  const gradientBg = couleur
    ? `linear-gradient(135deg, ${couleur} 0%, ${darkenHex(couleur)} 100%)`
    : 'linear-gradient(135deg, #3730a3 0%, #1e1b4b 100%)';

  return (
    <>
      <div className="rounded-2xl px-5 py-5 text-white shadow-lg" style={{ background: gradientBg }}>
        <div className="flex items-center gap-3">
          <span className="text-3xl">{icon}</span>
          <div className="flex-1 min-w-0">
            <p className="font-bold text-base leading-tight">{prospectNom}</p>
            {prospect.type_evenement && <p className="text-white/60 text-sm mt-0.5">{prospect.type_evenement}</p>}
          </div>
        </div>
        {dateLabel && (
          <div className="flex items-center gap-2 mt-4">
            <svg width="15" height="15" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round" className="shrink-0 opacity-70">
              <rect x="3" y="4" width="18" height="18" rx="2"/><line x1="16" y1="2" x2="16" y2="6"/><line x1="8" y1="2" x2="8" y2="6"/><line x1="3" y1="10" x2="21" y2="10"/>
            </svg>
            <p className="text-white/90 text-sm font-medium capitalize">{dateLabel}</p>
          </div>
        )}
        {countdown && countdown.jours >= 0 && (
          <div className="flex items-baseline justify-center gap-3 mt-4">
            <span style={{ fontFamily: 'Georgia, serif', fontStyle: 'italic', fontWeight: 700, fontSize: '2.5rem', letterSpacing: '-0.02em', lineHeight: 1 }}>J-{countdown.jours}</span>
            <span style={{ color: 'rgba(255,255,255,0.3)', fontSize: '1.2rem', fontWeight: 300 }}>|</span>
            <span style={{ fontFamily: 'monospace', fontSize: '1rem', opacity: 0.6, letterSpacing: '0.1em' }}>{countdown.h}:{countdown.m}:{countdown.s}</span>
          </div>
        )}
        {prospect.lieu_nom && (
          <button onClick={() => setShowLieuModal(true)}
            className="mt-4 flex items-center gap-1.5 text-white/60 text-xs hover:text-white/90 transition-colors active:opacity-70">
            <svg width="13" height="13" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.6" strokeLinecap="round" strokeLinejoin="round" className="shrink-0 opacity-60">
              <path d="M21 10c0 7-9 13-9 13s-9-6-9-13a9 9 0 0 1 18 0z"/><circle cx="12" cy="10" r="3"/>
            </svg>
            <span className="underline underline-offset-2">{prospect.lieu_nom}</span>
            <svg width="10" height="10" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" className="opacity-50">
              <polyline points="9 18 15 12 9 6"/>
            </svg>
          </button>
        )}
      </div>
      {showLieuModal && prospect.lieu_nom && (
        <LieuModal lieuNom={prospect.lieu_nom} lieuAdresse={lieu?.adresse || ''} lieuTelephone={lieu?.telephone || ''} onClose={() => setShowLieuModal(false)} />
      )}
    </>
  );
}

function Lightbox({ photos, index, onClose, onPrev, onNext }) {
  useEffect(() => {
    document.body.style.overflow = 'hidden';
    const onKey = (e) => {
      if (e.key === 'Escape') onClose();
      if (e.key === 'ArrowLeft') onPrev();
      if (e.key === 'ArrowRight') onNext();
    };
    window.addEventListener('keydown', onKey);
    return () => { document.body.style.overflow = ''; window.removeEventListener('keydown', onKey); };
  }, [onClose, onPrev, onNext]);

  const photo = photos[index];
  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center" style={{ background: 'rgba(0,0,0,0.92)' }} onClick={onClose}>
      <img src={photo.url} alt={photo.titre || 'Photo'} className="max-h-screen max-w-full object-contain select-none"
        style={{ maxHeight: '90vh', maxWidth: '92vw' }} onClick={(e) => e.stopPropagation()} />
      <button onClick={onClose} className="absolute top-4 right-4 w-9 h-9 rounded-full flex items-center justify-center text-white text-xl font-light"
        style={{ background: 'rgba(255,255,255,0.15)' }}>✕</button>
      {photos.length > 1 && (
        <button onClick={(e) => { e.stopPropagation(); onPrev(); }} className="absolute left-3 w-10 h-10 rounded-full flex items-center justify-center text-white text-xl"
          style={{ background: 'rgba(255,255,255,0.15)' }}>‹</button>
      )}
      {photos.length > 1 && (
        <button onClick={(e) => { e.stopPropagation(); onNext(); }} className="absolute right-3 w-10 h-10 rounded-full flex items-center justify-center text-white text-xl"
          style={{ background: 'rgba(255,255,255,0.15)' }}>›</button>
      )}
      {photos.length > 1 && (
        <p className="absolute bottom-5 left-0 right-0 text-center text-white/60 text-xs font-medium">{index + 1} / {photos.length}</p>
      )}
    </div>
  );
}

// prestataire_id prévu pour filtrage multi-tenant futur — non utilisé encore
export function GalerieApercu({ onVoirTout, prestataire_id, mode_decouverte = false }) {
  const [lightboxIndex, setLightboxIndex] = useState(null);
  const scrollRef = useRef(null);
  const { data: medias = [] } = useQuery({
    queryKey: ['galerie-vitrine-prospect'],
    queryFn: () => base44.entities.GalerieVitrine.filter({ visible_prospect: true }),
  });
  const allPhotos = medias.filter(m => m.type === 'photo').sort((a, b) => (a.ordre || 0) - (b.ordre || 0));
  const photos = mode_decouverte ? allPhotos.slice(0, 6) : allPhotos;

  // Réinitialise le scroll horizontal sur la 1re photo à chaque (re)affichage de la galerie
  useEffect(() => {
    const el = scrollRef.current;
    if (!el || photos.length === 0) return;
    el.scrollLeft = 0;
    const io = new IntersectionObserver((entries) => {
      if (entries[0]?.isIntersecting) el.scrollLeft = 0;
    }, { threshold: 0.01 });
    io.observe(el);
    return () => io.disconnect();
  }, [photos]);

  if (photos.length === 0) return null;

  const openLightbox = (idx) => setLightboxIndex(idx);
  const closeLightbox = () => setLightboxIndex(null);
  const prevPhoto = () => setLightboxIndex(i => (i - 1 + photos.length) % photos.length);
  const nextPhoto = () => setLightboxIndex(i => (i + 1) % photos.length);
  const photosDesktop = photos.slice(0, 4);

  return (
    <div>
      <div className="flex items-center justify-between mb-2">
        <p className="text-[11px] font-semibold text-muted-foreground uppercase tracking-widest">🖼️ Notre galerie</p>
        {!mode_decouverte && photos.length > 0 && <button onClick={onVoirTout} className="text-xs text-primary font-semibold">Voir tout →</button>}
      </div>
      <div ref={scrollRef} className="flex gap-3 overflow-x-auto pb-1" style={{ scrollbarWidth: 'none', msOverflowStyle: 'none', WebkitOverflowScrolling: 'touch', scrollSnapType: 'x proximity', scrollPaddingLeft: '4px' }}>
        {photos.map((p, idx) => {
          const isHero = idx === 0;
          const h = mode_decouverte ? (isHero ? 240 : 200) : (isHero ? 200 : 140);
          // Héro (mode découverte) : largeur contrainte pour laisser une portion
          // significative de la 2e photo visible sur le bord droit (indice clair de
          // scroll horizontal). La 2e photo fait ~82% de la largeur du héro, avec un
          // espacement marqué (gap-3) pour signaler le défilement horizontal.
          const w = mode_decouverte ? (isHero ? 'calc(100% - 130px)' : 'calc((100% - 130px) * 0.82)') : (isHero ? 260 : 140);
          const imgW = '100%';
          return (
            <button key={p.id} onClick={() => openLightbox(idx)} className="shrink-0 rounded-xl overflow-hidden border border-border"
              style={{ width: w, height: h, scrollSnapAlign: 'start' }}>
              <img src={p.url} alt={p.titre || 'Photo'} style={{ height: '100%', width: imgW, display: 'block', objectFit: 'cover', minHeight: h }} />
            </button>
          );
        })}
      </div>
      {!mode_decouverte && (
      <div className="hidden md:grid md:grid-cols-2 gap-2">
        {photosDesktop.map((p, idx) => (
          <button key={p.id} onClick={() => openLightbox(idx)} className="rounded-xl overflow-hidden border border-border" style={{ height: 160 }}>
            <img src={p.url} alt={p.titre || 'Photo'} className="w-full h-full object-cover" />
          </button>
        ))}
      </div>
      )}
      {lightboxIndex !== null && (
        <Lightbox photos={photos} index={lightboxIndex} onClose={closeLightbox} onPrev={prevPhoto} onNext={nextPhoto} />
      )}
    </div>
  );
}

// prestataire_id prévu pour filtrage multi-tenant futur — non utilisé encore
function AvisApercu({ vitrineData, onVoirTout, prestataire_id }) {
  const { data: avis = [] } = useQuery({
    queryKey: ['avis-evenement-prospect'],
    queryFn: () => base44.entities.AvisEvenement.filter({ statut: 'Avis reçu' }),
  });
  const avisEnAvant = vitrineData?.avis_mis_en_avant || [];
  const avisSelectionnes = avisEnAvant.length > 0
    ? avis.filter(a => avisEnAvant.includes(a.id))
    : avis.filter(a => a.commentaire).slice(0, 3);
  if (avisSelectionnes.length === 0) return null;
  return (
    <div>
      <div className="flex items-center justify-between mb-2">
        <p className="text-[11px] font-semibold text-muted-foreground uppercase tracking-widest">⭐ Avis clients</p>
        <button onClick={onVoirTout} className="text-xs text-primary font-semibold">Voir tout →</button>
      </div>
      <div className="space-y-2">
        {avisSelectionnes.slice(0, 3).map(a => (
          <div key={a.id} className="bg-white border border-border rounded-xl p-3">
            <div className="flex items-center justify-between mb-1">
              <p className="text-xs font-semibold">{a.client_nom || 'Client'}</p>
              {a.note && (
                <div className="flex items-center gap-0.5">
                  {Array.from({ length: 5 }).map((_, i) => (
                    <Star key={i} size={10} className={i < a.note ? 'text-amber-400 fill-amber-400' : 'text-muted-foreground/30'} />
                  ))}
                </div>
              )}
            </div>
            {a.commentaire && <p className="text-[11px] text-foreground/70 italic leading-relaxed">"{a.commentaire}"</p>}
          </div>
        ))}
      </div>
    </div>
  );
}

function CTAProjetCommence({ onSelect, preResa, prospect }) {
  if (preResa?.statut === 'Signé') return (
    <div className="flex items-center gap-3 px-5 py-4 rounded-2xl bg-emerald-50 border border-emerald-200">
      <span className="text-xl">🎉</span>
      <div>
        <p className="font-semibold text-sm text-emerald-800">Réservation confirmée !</p>
        <p className="text-xs text-emerald-600 mt-0.5">Votre espace client est maintenant actif.</p>
      </div>
    </div>
  );
  if (preResa) return (
    <button onClick={() => onSelect('prereservation')} className="w-full flex items-center justify-center gap-2 py-4 px-5 rounded-2xl font-semibold text-sm transition-all active:scale-[0.98] shadow-md" style={{ background: '#1e1b4b', color: '#ffffff' }}>
      ✍️ Signer mon contrat
    </button>
  );
  if (['Devis envoyé', 'Accepté'].includes(prospect?.statut)) return (
    <button onClick={() => onSelect('prereservation')} className="w-full flex items-center justify-center gap-2 py-4 px-5 rounded-2xl font-semibold text-sm transition-all active:scale-[0.98] shadow-md" style={{ background: '#1e1b4b', color: '#ffffff' }}>
      🔐 Réserver mon événement
    </button>
  );
  return (
    <button onClick={() => onSelect('prereservation')} className="w-full flex items-center justify-center gap-2 py-4 px-5 rounded-2xl font-bold text-base transition-all active:scale-[0.98] shadow-lg" style={{ background: 'linear-gradient(135deg, #1e1b4b 0%, #3730a3 100%)', color: '#ffffff' }}>
      ✨ Votre projet commence ici
    </button>
  );
}

// ─── Bloc identité (mode découverte) ─────────────────────────────────────────
// ─── Bloc identité (mode découverte) ─────────────────────────────────────────
// Avis déporté vers BlocAvisDecouverte (bloc séparé, juste après).
function BlocIdentite({ vitrineData }) {
  const anneesExp = vitrineData?.annee_creation
    ? new Date().getFullYear() - vitrineData.annee_creation
    : null;
  const description = vitrineData?.accroche || null;
  const tarif = vitrineData?.tarif ?? null;

  if (anneesExp === null && !description && tarif === null) return null;

  return (
    <div className="bg-white border border-border rounded-2xl p-5 space-y-3">
      {anneesExp !== null && anneesExp > 0 && (
        <p className="text-sm font-semibold text-primary flex items-center gap-2">
          🏆 Depuis {vitrineData.annee_creation} • {anneesExp} ans d'expérience
        </p>
      )}
      {description && (
        <p className="text-sm text-foreground/80 leading-relaxed">{description}</p>
      )}
      {tarif !== null && (
        <p className="text-sm font-semibold flex items-center gap-2" style={{ color: '#1e1b4b' }}>💰 À partir de {tarif}€</p>
      )}
    </div>
  );
}

// ─── Bandeau léger identité + avis (mode découverte) ─────────────────────────
// Bandeau allégé (pas de cadre carte) fusionnant l'expérience, l'accroche et le
// lien avis — pour ne pas concurrencer visuellement la carte Chiffres clés.
function BandeauIdentiteAvis({ vitrineData }) {
  const anneesExp = vitrineData?.annee_creation
    ? new Date().getFullYear() - vitrineData.annee_creation
    : null;
  const description = vitrineData?.accroche || null;

  if (anneesExp === null && !description) return null;

  return (
    <div className="px-1 py-1 space-y-1">
      {anneesExp !== null && anneesExp > 0 && (
        <p className="text-sm font-semibold text-primary flex items-center gap-1.5">
          🏆 Depuis {vitrineData.annee_creation} • {anneesExp} ans d'expérience
        </p>
      )}
      {description && (
        <p className="text-sm text-foreground/80 leading-relaxed">{description}</p>
      )}
    </div>
  );
}

// ─── Bandeau de confiance (mode découverte) ──────────────────────────────────
// Compact, sous le hero. N'affiche que les éléments renseignés : lien avis externes
// (dès que lien_avis_externe est renseigné ; note/nombre/source en complément si
// présents) et badge Profil vérifié (validation manuelle Alryck, indépendant des
// macarons d'engagement). NB : delai_reponse reste stocké en base + éditable admin
// mais n'est plus affiché (donnée déclarative non vérifiable) — réutilisation future.
function BandeauConfiance({ vitrineData }) {
  const note = vitrineData?.note_moyenne_externe;
  const nb = vitrineData?.nb_avis_externe;
  const source = vitrineData?.source_avis;
  const lien = vitrineData?.lien_avis_externe;
  const verifie = vitrineData?.verifie_alryck === true;

  // Affiche le bloc avis dès que lien_avis_externe OU note OU nb est renseigné.
  // Étoile ⭐ systématique. Source précisée (« sur Google ») si renseignée,
  // sinon « externes ». Note + nombre intégrés devant si présents
  // (ex: « 4,9/5 sur Google · 126 avis »). Note au format français (virgule).
  const showAvis = !!lien || note != null || nb != null;
  if (!showAvis && !verifie) return null;

  const noteFr = note != null ? String(note).replace('.', ',') : null;
  const sourceTxt = source ? ` sur ${source}` : '';
  let avisText;
  if (noteFr != null && nb != null) {
    avisText = `${noteFr}/5${sourceTxt} · ${nb} avis`;
  } else if (noteFr != null) {
    avisText = `${noteFr}/5${sourceTxt}`;
  } else if (nb != null) {
    avisText = `${nb} avis${sourceTxt}`;
  } else {
    avisText = source ? `Voir les avis${sourceTxt}` : 'Voir les avis externes';
  }

  const parts = [];
  if (showAvis) {
    parts.push(
      <span key="avis" className="inline-flex items-center gap-1 font-semibold" style={{ color: '#1e1b4b' }}>
        <span aria-hidden>⭐</span>
        {lien ? (
          <a href={lien} target="_blank" rel="noopener noreferrer" className="font-medium hover:underline" style={{ color: '#1e40af' }}>
            {avisText} ↗
          </a>
        ) : (
          <span>{avisText}</span>
        )}
      </span>
    );
  }
  if (verifie) {
    parts.push(
      <span key="verifie" className="inline-flex items-center gap-1 font-semibold px-2 py-0.5 rounded-full" style={{ background: 'rgba(34,197,94,0.10)', color: '#166534', border: '1px solid rgba(34,197,94,0.25)' }}>
        ✓ Profil vérifié
      </span>
    );
  }

  return (
    <div className="flex flex-wrap items-center gap-x-3 gap-y-1.5 text-xs px-3.5 py-2.5 rounded-xl border" style={{ background: '#fff', borderColor: '#e8e4dc' }}>
      {parts}
    </div>
  );
}

// ─── Bloc « A propos de nous » (mode découverte) ─────────────────────────────
// Texte libre du prestataire. 2 lignes visibles par défaut (clamp webkit),
// « Lire la suite » n'apparaît que si le texte est réellement tronqué.
function BlocAPropos({ vitrineData }) {
  const text = vitrineData?.a_propos;
  const [expanded, setExpanded] = useState(false);
  const [clamped, setClamped] = useState(false);
  const ref = useRef(null);
  useEffect(() => {
    if (!ref.current || !text) return;
    setClamped(ref.current.scrollHeight > ref.current.clientHeight + 1);
  }, [text]);
  if (!text) return null;
  return (
    <div className="bg-white border border-border rounded-2xl p-4">
      <p className="text-[10px] font-semibold uppercase tracking-wider text-slate-400 leading-none mb-2">A propos de nous</p>
      <p
        ref={ref}
        className="text-sm text-foreground/80 leading-relaxed whitespace-pre-line"
        style={expanded ? {} : { display: '-webkit-box', WebkitLineClamp: 2, lineClamp: 2, WebkitBoxOrient: 'vertical', overflow: 'hidden' }}
      >
        {text}
      </p>
      {clamped && (
        <button onClick={() => setExpanded(v => !v)} className="text-xs font-semibold text-primary hover:underline mt-1">
          {expanded ? 'Réduire ▲' : 'Lire la suite ▼'}
        </button>
      )}
    </div>
  );
}

// ─── Section contact (mode découverte) ───────────────────────────────────────
// Palette champagne/neutre cohérente avec la fiche (fonds beige clair, icônes navy).
function ContactSection({ vitrineData, contactMasque = false }) {
  const tel = vitrineData?.telephone || null;
  const site = vitrineData?.site_web || null;

  // Les coordonnées sont masquées uniquement sur les fiches ouvertes depuis une
  // vraie recommandation (contactMasque=true, transmis par la section dédiée).
  // Les fiches ouvertes depuis l'Annuaire (recherche libre) ou les sélections/
  // favoris affichent toujours les coordonnées, quel que soit le statut EP.
  if (contactMasque) {
    return (
      <div className="bg-white border border-border rounded-2xl p-5 space-y-2">
        <p className="text-[11px] font-bold text-slate-400 uppercase tracking-widest">Contact</p>
        <div className="flex items-start gap-3 px-4 py-3 rounded-xl" style={{ background: '#FAF6EC', border: '1px solid rgba(197,160,89,0.22)' }}>
          <Lock size={16} style={{ color: '#1e1b4b' }} className="shrink-0 mt-0.5" />
          <p className="text-xs leading-relaxed" style={{ color: '#6b7280' }}>
            Coordonnées disponibles après confirmation de la mise en relation.
          </p>
        </div>
      </div>
    );
  }

  if (!tel && !site) return null;

  const itemStyle = { background: '#FAF6EC', border: '1px solid rgba(197,160,89,0.22)', color: '#1e1b4b' };

  return (
    <div className="bg-white border border-border rounded-2xl p-5 space-y-3">
      <p className="text-[11px] font-bold text-slate-400 uppercase tracking-widest">Contact</p>
      {tel && (
        <a href={`tel:${tel}`}
          className="flex items-center gap-3 w-full px-4 py-3 rounded-xl font-semibold text-sm transition-colors"
          style={itemStyle}>
          <Phone size={18} style={{ color: '#1e1b4b' }} className="shrink-0" /> {tel}
        </a>
      )}
      {site && (
        <a href={site} target="_blank" rel="noopener noreferrer"
          className="flex items-center gap-3 w-full px-4 py-3 rounded-xl font-semibold text-sm transition-colors truncate"
          style={itemStyle}>
          <Globe size={18} style={{ color: '#1e1b4b' }} className="shrink-0" /> <span className="truncate">{site.replace(/^https?:\/\//, '').replace(/\/$/, '')}</span>
        </a>
      )}
    </div>
  );
}

// ─── Aperçu léger « après réservation » (mode prospect) ───────────────────────
// Mini-rangée discrète d'icônes + labels courts, sans carte ni fond marqué.
// Simple aperçu informatif (pas de clic) de ce qui arrive après réservation.
function ApercuApresReservation() {
  const items = [
    { Icon: Users, label: 'Invitations' },
    { Icon: CalendarClock, label: 'Programme du jour J' },
    { Icon: CheckSquare, label: 'Checklist' },
    { Icon: Armchair, label: 'Plan de table' },
    { Icon: Calendar, label: 'Agenda' },
    { Icon: Wallet, label: 'Budget' },
    { Icon: Palette, label: 'Inspiration' },
  ];
  return (
    <div className="pt-1">
      <p className="text-[10px] mb-2 font-semibold" style={{ color: '#64748b' }}>Tout s'organise ensuite sur l'app Alryck :</p>
      <div className="flex flex-wrap gap-x-4 gap-y-2">
        {items.map(({ Icon, label }) => (
          <div key={label} className="inline-flex items-center gap-1.5" style={{ color: '#94a3b8' }}>
            <Icon size={14} strokeWidth={1.7} />
            <span className="text-[11px] font-medium">{label}</span>
          </div>
        ))}
      </div>
    </div>
  );
}

// ─── Composant principal ──────────────────────────────────────────────────────
export default function VitrineProfil({
  // Mode "prospect" (comportement original)
  prospect = null,
  settings = null,
  // Mode "company" ou "prestataire"
  mode = 'prospect',
  prestataire_id = null,
  // Mode recommandation — masque messagerie/pré-résa/dates, affiche bouton Confirmer + retour
  mode_recommandation = false,
  mode_decouverte = false,
  contactMasque = false,
  onConfirm = null,
  onBack = null,
  confirming = false,
}) {
  const [activeTile, setActiveTile] = useState(null);
  const [demandeReservationEnvoyee, setDemandeReservationEnvoyee] = useState(false);
  const formulesScrollRef = useRef(null);

  const { vitrineData, settingsRaw, isLoading } = useVitrineData({ mode, prestataire_id, prospect, settings });

  // cs est le CompanySettings brut — utilisé pour les modules et les devis
  const cs = settingsRaw;

  const prospectNom = prospect
    ? prospect.prenom + ' ' + prospect.nom + (prospect.prenom2 ? ' & ' + prospect.prenom2 + ' ' + (prospect.nom2 || prospect.nom) : '')
    : '';

  const { data: evenementsTermines = [] } = useQuery({
    queryKey: ['evenements-termines-stats'],
    queryFn: () => base44.entities.Evenement.filter({ statut: 'Terminé' }),
  });

  const { data: devis = [] } = useQuery({
    queryKey: ['devis-prospect', prospect?.id],
    queryFn: () => base44.entities.Devis.filter({ prospect_id: prospect.id }),
    enabled: !!prospect?.id,
  });
  const devisProspect = devis.filter(d => ['Envoyé', 'Accepté'].includes(d.statut));

  const { data: preResa = null } = useQuery({
    queryKey: ['prereservation', prospect?.id],
    queryFn: () => base44.entities.PreReservation.filter({ prospect_id: prospect.id }).then(r => r[0] || null),
    enabled: !!prospect?.id,
    staleTime: 2 * 60 * 1000,
  });

  const { data: dernierMessage = null } = useQuery({
    queryKey: ['prospect-last-message', prospect?.id],
    queryFn: () => base44.entities.ProspectMessage.filter({ prospect_id: prospect.id })
      .then(msgs => msgs.sort((a, b) => new Date(b.created_date) - new Date(a.created_date))[0] || null),
    enabled: !!prospect?.id && ['Devis envoyé', 'À relancer'].includes(prospect?.statut),
  });

  const delaiRelance = vitrineData?.relance_prospect_jours ?? cs?.relance_prospect_jours ?? 3;
  const dateReference = dernierMessage?.created_date || prospect?.updated_date;
  const joursDepuis = dateReference ? differenceInDays(new Date(), new Date(dateReference)) : 0;
  const afficherToujoursInteresse = prospect &&
    ['Devis envoyé', 'À relancer'].includes(prospect.statut) && joursDepuis >= delaiRelance;

  const handleReserverClick = async () => {
    if (preResa?.statut === 'Signé') return;
    if (preResa) { setActiveTile('prereservation'); return; }
    if (!devisProspect.length) { setActiveTile('formules'); return; }
    await base44.entities.ProspectMessage.create({
      prospect_id: prospect.id,
      auteur: 'prospect',
      message: `DEMANDE_RESERVATION:${JSON.stringify({ prospect_id: prospect.id, prenom: prospect.prenom, nom: prospect.nom })}`,
    });
    await base44.entities.Notification.create({
      titre: '🔐 Demande de réservation',
      message: prospect.prenom + ' ' + prospect.nom + ' souhaite réserver son événement.',
      type: 'info',
      lien: '/Clients?tab=prospects',
    });
    setDemandeReservationEnvoyee(true);
  };

  const isSigned = prospect?.statut === 'Signé';
  const modulesActifs = cs?.modules_actifs || vitrineData?.modules_actifs || {};

  // Espace verrouillé — conditionné à la présence d'un prospect
  const EspaceVerrouille = () => {
    if (!prospect) return null;
    const lockedTiles = [
      { id: 'formulaire',   show: modulesActifs?.formulaire   !== false, icon: FileText,  label: 'Questionnaire' },
      { id: 'medias',       show: modulesActifs?.medias       !== false, icon: Camera,    label: 'Médias' },
      { id: 'documents',    show: true,                                   icon: Folder,     label: 'Documents' },
      { id: 'prestataires', show: modulesActifs?.prestataires !== false, icon: Users,      label: 'Prestataires' },
      { id: 'deroule',      show: true,                                   icon: Calendar,   label: "Déroulé de l'événement" },
    ];
    return (
      <div className="space-y-3">
        <p className="text-[11px] font-bold text-slate-400 uppercase tracking-[0.12em]">🔒 Réservez pour accéder</p>
        <div className="grid grid-cols-2 gap-2">
          {lockedTiles.filter(t => t.show).map((tile, idx, arr) => {
            const Icon = tile.icon;
            // Dernière tuile en pleine largeur quand le nombre d'items est impair :
            // comble la cellule vide et évite une tuile orpheline (ex: 5 → 2×2 + 1 pleine).
            const isLastOdd = idx === arr.length - 1 && arr.length % 2 === 1;
            return (
              <div key={tile.id} className={`premium-card relative flex items-center gap-2.5 px-3 py-2.5 cursor-default opacity-60 ${isLastOdd ? 'col-span-2' : ''}`}>
                <div className="w-9 h-9 rounded-lg flex items-center justify-center shrink-0 relative z-[3]" style={{ background: 'rgba(30,27,75,0.06)' }}>
                  <Icon size={18} strokeWidth={1.75} style={{ color: '#1e1b4b' }} />
                </div>
                <p className="font-semibold text-xs leading-tight relative z-[3]" style={{ color: '#1e1b4b' }}>{tile.label}</p>
                <span className="ml-auto text-[10px] shrink-0 relative z-[3]">🔒</span>
              </div>
            );
          })}
        </div>
      </div>
    );
  };

  if (isLoading) return (
    <div className="flex items-center justify-center py-20 text-muted-foreground text-sm">Chargement...</div>
  );

  const innerContent = (
    <div className={mode_decouverte ? "px-4 py-4 md:px-8 md:py-6" : mode_recommandation ? "px-4 pt-16 pb-32 md:px-8 md:py-6 md:pt-16" : "md:px-8 md:py-6"}>
      {mode_decouverte ? (
        <div className="space-y-4 max-w-2xl mx-auto">
          <CarteEtablissement vitrineData={vitrineData} nbEvenements={evenementsTermines.length} mode_decouverte />
          <BandeauConfiance vitrineData={vitrineData} />
          <BandeauIdentiteAvis vitrineData={vitrineData} />
          <BlocAPropos vitrineData={vitrineData} />
          <BlocInfosDecouverte vitrineData={vitrineData} />
          <GalerieApercu mode_decouverte prestataire_id={prestataire_id} />
          <FaqAccordion faq={vitrineData?.faq} />
          <ContactSection vitrineData={vitrineData} contactMasque={contactMasque} />
          {!contactMasque && <SocialNetworksSection networks={vitrineData?.social_networks || []} />}
        </div>
      ) : (
      <div className="md:flex md:gap-8 md:items-start space-y-4 md:space-y-0">

        {/* Colonne gauche */}
        <div className={mode_decouverte ? "space-y-4" : "md:sticky md:top-[60px] space-y-4"} style={{ flex: '0 0 55%', minWidth: 0 }}>
          <CarteEtablissement vitrineData={vitrineData} nbEvenements={evenementsTermines.length} />
          {prospect && !mode_decouverte && <BlocProjet prospect={prospect} />}
          {!mode_decouverte && <SocialNetworksSection />}
          {!mode_decouverte && <TilesGrid onSelect={setActiveTile} vitrineData={vitrineData} mode_recommandation={mode_recommandation} />}
          {prospect && !mode_decouverte && <CTAProjetCommence onSelect={setActiveTile} preResa={preResa} prospect={prospect} />}
        </div>

        {/* Colonne droite */}
        <div className="space-y-4" style={{ flex: '0 0 40%', minWidth: 0 }}>
          <GalerieApercu onVoirTout={() => setActiveTile('galerie')} prestataire_id={prestataire_id} />
          {!mode_decouverte && <AvisApercu vitrineData={vitrineData} onVoirTout={() => setActiveTile('avis')} prestataire_id={prestataire_id} />}
          {!mode_decouverte && <ReassuranceAccordions vitrineData={vitrineData} />}
          {!mode_decouverte && <EspaceVerrouille />}

          {afficherToujoursInteresse && prospect && !mode_decouverte && (
            <ProspectToujoursInteresse prospect={prospect} />
          )}

          {isSigned && !mode_decouverte && (
            <div className="bg-emerald-50 border border-emerald-200 rounded-2xl px-4 py-3 flex items-start gap-3">
              <span className="text-xl">🎉</span>
              <div>
                <p className="font-semibold text-sm text-emerald-800">Réservation confirmée !</p>
                <p className="text-xs text-emerald-700 mt-0.5">Votre espace client est maintenant actif.</p>
              </div>
            </div>
          )}

          {!mode_decouverte && <ApercuApresReservation />}
        </div>
      </div>
      )}

      {/* Drawers — bottom-sheets animés (parité avec l'espace client) */}
      <AnimatePresence>
        {activeTile === 'galerie' && (
          <DrawerSheet key="galerie" title="Galerie" emoji="🖼️" onClose={() => setActiveTile(null)}>
            <ProspectGalerie />
          </DrawerSheet>
        )}
        {activeTile === 'formules' && (
          <DrawerSheet key="formules" title="Formules & Devis" emoji="🍽️" onClose={() => setActiveTile(null)}>
            <ProspectFormules prospect={prospect} onNavigate={setActiveTile} scrollRef={formulesScrollRef} />
          </DrawerSheet>
        )}
        {activeTile === 'avis' && (
          <DrawerSheet key="avis" title="Avis clients" emoji="⭐" onClose={() => setActiveTile(null)}>
            <ProspectAvis settings={cs} />
          </DrawerSheet>
        )}
        {prospect && activeTile === 'messages' && (
          <DrawerSheet key="messages" title="Messagerie" emoji="💬" onClose={() => setActiveTile(null)}>
            <ProspectMessagerie prospectId={prospect.id} prospectNom={prospectNom} />
          </DrawerSheet>
        )}
        {prospect && activeTile === 'dates' && (
          <DrawerSheet key="dates" title="Demande de date" emoji="📅" onClose={() => setActiveTile(null)}>
            <ProspectDateDemande prospectId={prospect.id} prospectNom={prospectNom} prospect={prospect} />
          </DrawerSheet>
        )}
        {prospect && activeTile === 'prereservation' && (
          <DrawerSheet key="prereservation" title="Ma pré-réservation" emoji="🔐" onClose={() => setActiveTile(null)}>
            <ProspectPreReservation prospectId={prospect.id} prospectNom={prospectNom} />
          </DrawerSheet>
        )}
      </AnimatePresence>
    </div>
  );

  // mode_decouverte : retourne innerContent sans overlay — le parent fournit la modale
  // mode_recommandation seul (sans mode_decouverte) : overlay complet (ancien comportement)
  if (mode_recommandation && !mode_decouverte) {
    return (
      <div className="fixed inset-0 z-50 bg-background overflow-y-auto">
        {onBack && (
          <button
            onClick={onBack}
            className="fixed top-4 left-4 z-10 w-10 h-10 rounded-full flex items-center justify-center bg-white shadow-lg border border-border"
            style={{ color: '#1e1b4b' }}
          >
            <ArrowLeft size={20} />
          </button>
        )}
        {innerContent}
        <div
          className="fixed bottom-0 left-0 right-0 p-4 bg-white border-t border-border shadow-lg"
          style={{ paddingBottom: 'max(1rem, env(safe-area-inset-bottom))' }}
        >
          <button
            onClick={onConfirm || undefined}
            disabled={confirming}
            className="w-full py-3.5 text-sm font-bold rounded-xl text-white transition-all active:scale-[0.97] disabled:opacity-60"
            style={{ background: '#1e1b4b' }}
          >
            {confirming ? 'Confirmation…' : 'Mise en relation'}
          </button>
        </div>
      </div>
    );
  }

  return innerContent;
}