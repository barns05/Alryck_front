/**
 * InfosPratiquesContent — Contenu du tile "logistique" (Informations pratiques)
 * côté espace client.
 *
 * Une section par prestataire confirmé (logo + nom + métier), dépliable vers
 * les infos pratiques (5 champs non vides). GPS : Copier + Ouvrir dans Maps.
 * Réutilise les queries company-settings-all / prestataires-all / ev-prestataires
 * (même pattern que PrestatairesCardsSection).
 */
import { useState } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { useQuery } from '@tanstack/react-query';
import { base44 } from '@/api/base44Client';
import { ChevronDown, MapPin, Clock, Phone, FileText, Navigation, Check } from 'lucide-react';

const DOMAINE_ICONS = {
  'Traiteur': '🍽️', 'DJ / Musique': '🎵', 'Photographe': '📷', 'Vidéaste': '🎬',
  'Fleuriste': '💐', 'Décoration': '✨', 'Animation': '🎭', 'Transport': '🚗',
  'Sécurité': '🛡️', 'Sono / Lumières': '💡', 'Autre': '🤝',
};
const METIER_ICONS = {
  'Salle de réception': '🏛️', 'Lieu de prestige / Château': '🏰', 'Traiteur événementiel': '🍽️',
  'Chef à domicile': '👨‍🍳', 'Photographe': '📷', 'Vidéaste': '🎬', 'DJ': '🎧',
  'Fleuriste': '💐', 'Décorateur': '✨', 'Location de matériel': '📦', 'Sécurité événementielle': '🛡️',
};
const DEFAULT_ICON = '🤝';

function getMetier(cs, domaine) {
  if (cs?.metier) return { icon: METIER_ICONS[cs.metier] || DEFAULT_ICON, label: cs.metier };
  return { icon: DOMAINE_ICONS[domaine] || DEFAULT_ICON, label: domaine || '' };
}

function getInitiales(nom = '') {
  return nom.trim().split(/\s+/).map(w => w[0]).join('').toUpperCase().slice(0, 2) || '?';
}

function LogoRond({ nom, logoUrl, size = 44 }) {
  if (logoUrl) {
    return (
      <img src={logoUrl} alt={nom || ''} className="rounded-full object-cover shrink-0"
        style={{ width: size, height: size, border: '1.5px solid #e8e4dc' }} />
    );
  }
  return (
    <div className="rounded-full flex items-center justify-center shrink-0 font-bold"
      style={{ width: size, height: size, background: 'rgba(30,27,75,0.08)', color: '#1e1b4b', fontSize: '0.85rem' }}>
      {getInitiales(nom)}
    </div>
  );
}

function InfoRow({ icon: Icon, label, value }) {
  return (
    <div className="flex items-start gap-2.5 py-1.5">
      <Icon size={15} className="text-muted-foreground mt-0.5 shrink-0" />
      <div className="min-w-0 flex-1">
        <p className="text-[11px] font-semibold uppercase tracking-wide text-muted-foreground">{label}</p>
        <p className="text-sm text-foreground break-words mt-0.5">{value}</p>
      </div>
    </div>
  );
}

function GpsActions({ url }) {
  const [copied, setCopied] = useState(false);

  const handleCopy = async () => {
    try {
      await navigator.clipboard.writeText(url);
      setCopied(true);
      setTimeout(() => setCopied(false), 2000);
    } catch {
      // repli silencieux
    }
  };

  const handleOpenMaps = () => {
    // Une URL Google Maps / coordonnées ouvre l'app de navigation native sur iOS
    window.open(url, '_blank', 'noopener,noreferrer');
  };

  return (
    <div className="flex gap-2 mt-1">
      <button
        onClick={handleCopy}
        className="flex-1 flex items-center justify-center gap-1.5 text-xs font-semibold py-2 rounded-xl border transition-colors active:scale-95"
        style={{ borderColor: '#e8e4dc', background: '#faf8f4', color: '#1e1b4b' }}
      >
        {copied ? <Check size={13} className="text-green-600" /> : null}
        {copied ? 'Copié' : '📋 Copier'}
      </button>
      <button
        onClick={handleOpenMaps}
        className="flex-1 flex items-center justify-center gap-1.5 text-xs font-semibold py-2 rounded-xl text-white transition-colors active:scale-95"
        style={{ background: '#1e1b4b' }}
      >
        🗺️ Ouvrir dans Maps
      </button>
    </div>
  );
}

function PrestataireInfosCard({ ep, cs, defaultOpen = false }) {
  const [open, setOpen] = useState(defaultOpen);
  const { icon, label: metierLabel } = getMetier(cs, ep.prestataire_domaine);
  const d = ep.details;

  const gpsUrl = cs?.infos_pratiques_gps || null;
  const fields = cs ? [
    { icon: MapPin, key: 'adresse', label: 'Adresse', value: cs.infos_pratiques_adresse },
    { icon: Clock, key: 'horaires', label: 'Horaires', value: cs.infos_pratiques_horaires },
    { icon: Phone, key: 'contact', label: 'Contact', value: cs.infos_pratiques_contact },
    { icon: FileText, key: 'notes', label: 'Notes', value: cs.infos_pratiques_notes },
  ].filter(f => f.value && String(f.value).trim() !== '') : [];

  const hasGps = gpsUrl && String(gpsUrl).trim() !== '';
  const tousVides = fields.length === 0 && !hasGps;

  return (
    <div className="rounded-2xl border overflow-hidden"
      style={{ background: '#ffffff', borderColor: open ? '#1e1b4b' : '#e8e4dc' }}>
      <motion.button
        whileTap={{ scale: 0.99 }}
        onClick={() => setOpen(v => !v)}
        className="flex items-center gap-3 w-full p-4 text-left"
      >
        <LogoRond nom={ep.prestataire_nom} logoUrl={cs?.company_logo_url} />
        <div className="flex-1 min-w-0">
          <p className="font-semibold text-sm" style={{ color: '#1e1b4b' }}>{ep.prestataire_nom}</p>
          <p className="text-xs mt-0.5" style={{ color: '#9ca3af' }}>
            {icon} {metierLabel}{d?.ville ? ` · ${d.ville}` : ''}
          </p>
        </div>
        <motion.div animate={{ rotate: open ? 180 : 0 }} transition={{ duration: 0.2 }}
          style={{ color: '#9ca3af', flexShrink: 0 }}>
          <ChevronDown size={18} />
        </motion.div>
      </motion.button>

      <AnimatePresence initial={false}>
        {open && (
          <motion.div
            key="body"
            initial={{ height: 0, opacity: 0 }}
            animate={{ height: 'auto', opacity: 1 }}
            exit={{ height: 0, opacity: 0 }}
            transition={{ duration: 0.22, ease: 'easeOut' }}
            style={{ overflow: 'hidden' }}
          >
            <div className="px-4 pb-4 border-t" style={{ borderColor: '#f1f5f9' }}>
              {tousVides ? (
                <p className="text-sm italic text-muted-foreground pt-3">Infos pratiques à venir</p>
              ) : (
                <div className="pt-2">
                  {hasGps && (
                    <div className="py-1.5">
                      <div className="flex items-center gap-2.5">
                        <Navigation size={15} className="text-muted-foreground shrink-0" />
                        <div className="min-w-0 flex-1">
                          <p className="text-[11px] font-semibold uppercase tracking-wide text-muted-foreground">GPS</p>
                          <p className="text-sm text-foreground break-all mt-0.5">{gpsUrl}</p>
                        </div>
                      </div>
                      <GpsActions url={gpsUrl} />
                    </div>
                  )}
                  {fields.map(f => (
                    <InfoRow key={f.key} icon={f.icon} label={f.label} value={f.value} />
                  ))}
                </div>
              )}
            </div>
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  );
}

export default function InfosPratiquesContent({ evenementId, autoExpand = false }) {
  const { data: evPrestataires = [] } = useQuery({
    queryKey: ['ev-prestataires-client', evenementId],
    queryFn: () => base44.entities.EvenementPrestataire.filter({ evenement_id: evenementId }),
  });

  const { data: tousPrestataires = [] } = useQuery({
    queryKey: ['prestataires-all'],
    queryFn: () => base44.entities.Prestataire.list(),
    enabled: evPrestataires.length > 0,
  });

  const { data: allCompanySettings = [] } = useQuery({
    queryKey: ['company-settings-all'],
    queryFn: () => base44.entities.CompanySettings.list(),
    enabled: evPrestataires.length > 0,
  });

  const confirmes = evPrestataires
    .filter(ep => ep.statut === 'Confirmé')
    .map(ep => ({
      ...ep,
      details: tousPrestataires.find(p => p.id === ep.prestataire_id) || null,
      company: allCompanySettings.find(cs => cs.prestataire_id === ep.prestataire_id) || null,
    }));

  if (confirmes.length === 0) {
    return (
      <div className="flex flex-col items-center text-center py-12 px-4">
        <span className="text-4xl mb-3">ℹ️</span>
        <p className="font-semibold text-sm" style={{ color: '#1e1b4b' }}>Aucun prestataire confirmé</p>
        <p className="text-xs text-muted-foreground mt-1">
          Les informations pratiques de vos prestataires apparaîtront ici dès qu'ils seront confirmés.
        </p>
      </div>
    );
  }

  return (
    <div className="space-y-3">
      <p className="text-[11px] font-bold uppercase tracking-widest flex items-center gap-2" style={{ color: '#1e1b4b' }}>
        <span style={{ display: 'inline-block', width: 9, height: 9, borderRadius: '50%', background: '#C5A059', flexShrink: 0 }} />
        Informations pratiques par prestataire
        <span style={{ flex: 1, height: 1, background: 'rgba(197,160,89,0.3)' }} />
      </p>
      <div className="space-y-3">
        {confirmes.map(ep => (
          <PrestataireInfosCard key={ep.id} ep={ep} cs={ep.company} defaultOpen={autoExpand} />
        ))}
      </div>
    </div>
  );
}