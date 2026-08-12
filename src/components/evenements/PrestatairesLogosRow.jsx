/**
 * PrestatairesLogosRow — Rangée de logos ronds des prestataires confirmés.
 * Au tap sur un logo : popover avec les infos pratiques du prestataire
 * (depuis CompanySettings, récupéré via filter({ prestataire_id }) au tap).
 */
import { useState, useRef, useEffect } from 'react';
import { createPortal } from 'react-dom';
import { base44 } from '@/api/base44Client';
import { MapPin, Clock, Phone, FileText, Navigation, Loader2 } from 'lucide-react';

function getInitiales(nom = '') {
  return nom.trim().split(/\s+/).map(w => w[0]).join('').toUpperCase().slice(0, 2) || '?';
}

function LogoRond({ nom, logoUrl, size = 38 }) {
  if (logoUrl) {
    return (
      <img
        src={logoUrl}
        alt={nom || ''}
        className="rounded-full object-cover shrink-0"
        style={{ width: size, height: size, border: '1.5px solid #e8e4dc' }}
      />
    );
  }
  return (
    <div
      className="rounded-full flex items-center justify-center shrink-0 font-bold"
      style={{ width: size, height: size, background: 'rgba(30,27,75,0.08)', color: '#1e1b4b', fontSize: '0.75rem' }}
    >
      {getInitiales(nom)}
    </div>
  );
}

function InfoLine({ icon: Icon, label, value }) {
  return (
    <div className="flex items-start gap-2 text-xs">
      <Icon size={13} className="text-muted-foreground mt-0.5 shrink-0" />
      <div className="min-w-0">
        <span className="text-muted-foreground">{label} : </span>
        <span className="font-medium text-foreground break-words">{value}</span>
      </div>
    </div>
  );
}

function PopoverContent({ prestataireNom, metier, cs, loading }) {
  if (loading) {
    return (
      <div className="flex items-center justify-center py-4">
        <Loader2 size={16} className="animate-spin text-muted-foreground" />
      </div>
    );
  }

  const fields = cs ? [
    { icon: MapPin, label: 'Adresse', value: cs.infos_pratiques_adresse },
    { icon: Navigation, label: 'GPS', value: cs.infos_pratiques_gps },
    { icon: Clock, label: 'Horaires', value: cs.infos_pratiques_horaires },
    { icon: Phone, label: 'Contact', value: cs.infos_pratiques_contact },
    { icon: FileText, label: 'Notes', value: cs.infos_pratiques_notes },
  ].filter(f => f.value && String(f.value).trim() !== '') : [];

  const tousVides = fields.length === 0;

  return (
    <div className="space-y-2">
      <div>
        <p className="font-semibold text-sm" style={{ color: '#1e1b4b' }}>{prestataireNom}</p>
        {metier && <p className="text-xs text-muted-foreground">{metier}</p>}
      </div>
      {tousVides ? (
        <p className="text-xs italic text-muted-foreground">Aucune info pratique renseignée</p>
      ) : (
        <div className="space-y-1.5 pt-1">
          {fields.map((f, i) => (
            <InfoLine key={i} icon={f.icon} label={f.label} value={f.value} />
          ))}
        </div>
      )}
    </div>
  );
}

export default function PrestatairesLogosRow({ prestatairesEv, compact = false, size = 38, settingsMap }) {
  const confirmes = prestatairesEv.filter(p => p.statut === 'Confirmé');
  const [openId, setOpenId] = useState(null);
  const [pos, setPos] = useState({ top: 0, left: 0 });
  const [cache, setCache] = useState({}); // { [prestataire_id]: CompanySettings }
  const [loadingId, setLoadingId] = useState(null);
  const wrapRef = useRef(null);
  const popoverRef = useRef(null);

  // Fermer la popover au clic extérieur, au scroll et au resize
  useEffect(() => {
    if (!openId) return;
    const onDown = (e) => {
      const t = e.target;
      if (popoverRef.current && popoverRef.current.contains(t)) return;
      if (wrapRef.current && wrapRef.current.contains(t)) return;
      setOpenId(null);
    };
    const onClose = () => setOpenId(null);
    document.addEventListener('mousedown', onDown);
    window.addEventListener('scroll', onClose, true);
    window.addEventListener('resize', onClose);
    return () => {
      document.removeEventListener('mousedown', onDown);
      window.removeEventListener('scroll', onClose, true);
      window.removeEventListener('resize', onClose);
    };
  }, [openId]);

  const handleTap = async (ep, e) => {
    if (openId === ep.id) { setOpenId(null); return; }
    const rect = e.currentTarget.getBoundingClientRect();
    const POP_W = 256;
    const POP_H_EST = 240;
    let left = rect.left;
    if (left + POP_W > window.innerWidth - 8) left = window.innerWidth - POP_W - 8;
    if (left < 8) left = 8;
    let top = rect.bottom + 8;
    if (top + POP_H_EST > window.innerHeight - 8) top = rect.top - POP_H_EST - 8;
    if (top < 8) top = 8;
    setPos({ top, left });
    setOpenId(ep.id);
    if (settingsMap?.[ep.prestataire_id] || cache[ep.prestataire_id]) return;
    setLoadingId(ep.id);
    try {
      const res = await base44.entities.CompanySettings.filter({ prestataire_id: ep.prestataire_id });
      setCache(prev => ({ ...prev, [ep.prestataire_id]: res[0] || null }));
    } catch {
      setCache(prev => ({ ...prev, [ep.prestataire_id]: null }));
    } finally {
      setLoadingId(null);
    }
  };

  if (confirmes.length === 0) return null;

  const openEp = confirmes.find(p => p.id === openId);
  const openCs = openEp ? (settingsMap?.[openEp.prestataire_id] || cache[openEp.prestataire_id]) : null;
  const openLoading = openEp ? loadingId === openEp.id : false;

  return (
    <div ref={wrapRef} className="relative">
      {!compact && (
        <p className="text-[11px] font-semibold uppercase tracking-wider text-muted-foreground mb-2">
          Infos pratiques prestataires
        </p>
      )}
      <div className={`flex flex-wrap ${compact ? 'gap-1.5' : 'gap-2'}`}>
        {confirmes.map(ep => {
          const cs = settingsMap?.[ep.prestataire_id] || cache[ep.prestataire_id];
          return (
            <div key={ep.id} className="relative">
              <button
                onClick={(e) => handleTap(ep, e)}
                className="block rounded-full transition-transform active:scale-95"
                title={ep.prestataire_nom}
              >
                <LogoRond nom={ep.prestataire_nom} logoUrl={cs?.company_logo_url} size={size} />
              </button>
            </div>
          );
        })}
      </div>
      {openEp && createPortal(
        <div
          ref={popoverRef}
          className="fixed rounded-2xl border bg-card shadow-xl p-3"
          style={{ top: pos.top, left: pos.left, width: 256, zIndex: 9999, borderColor: '#e8e4dc' }}
        >
          <PopoverContent
            prestataireNom={openEp.prestataire_nom}
            metier={openCs?.metier || openEp.prestataire_domaine}
            cs={openCs}
            loading={openLoading}
          />
        </div>,
        document.body
      )}
    </div>
  );
}