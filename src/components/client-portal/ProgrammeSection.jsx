import { useState, useEffect } from 'react';
import { formatDuree } from '@/lib/programmeUtils';
import { ChevronDown, ChevronUp, Printer, CalendarClock, MapPin } from 'lucide-react';
import { matchLieuEvenement } from '@/lib/lieuEvenementMatch';
import { base44 } from '@/api/base44Client';
import { format, parseISO } from 'date-fns';
import { fr } from 'date-fns/locale';

export default function ProgrammeSection({ evenement, clientNom }) {
  const [expanded, setExpanded] = useState(false);
  const [companySettings, setCompanySettings] = useState(null);
  const [prestataires, setPrestataires] = useState([]);
  const [lieuxEvenement, setLieuxEvenement] = useState([]);

  // ── Source unique : programme de service créé par l'admin via ProgrammeEditor ──
  const programme = [...(evenement.programme_journee || [])].sort((a, b) => {
    const ha = a.heure || 'zz';
    const hb = b.heure || 'zz';
    return ha.localeCompare(hb);
  });

  useEffect(() => {
    base44.entities.CompanySettings.list().then(r => setCompanySettings(r.find(cs => cs.is_owner === true) || null));
    if (evenement.id) {
      base44.entities.EvenementPrestataire.filter({ evenement_id: evenement.id })
        .then(setPrestataires)
        .catch(() => setPrestataires([]));
      base44.entities.LieuEvenement.filter({ evenement_id: evenement.id })
        .then(setLieuxEvenement)
        .catch(() => setLieuxEvenement([]));
    }
  }, [evenement.id]);

  // ── État vide propre ──
  if (programme.length === 0) {
    return (
      <div className="bg-card rounded-2xl border border-border p-5">
        <h3 className="font-semibold text-base flex items-center gap-2 mb-4">
          🗓️ Programme de la journée
        </h3>
        <div className="flex flex-col items-center text-center py-8 px-4">
          <div className="w-12 h-12 rounded-full bg-muted/60 flex items-center justify-center mb-3">
            <CalendarClock size={22} className="text-muted-foreground" />
          </div>
          <p className="text-sm text-muted-foreground max-w-xs">
            Le programme de l'événement sera disponible ici dès qu'il aura été renseigné.
          </p>
        </div>
      </div>
    );
  }

  const today = new Date().toISOString().split('T')[0];
  const isToday = evenement.date === today;

  let etapeEnCours = -1;
  if (isToday) {
    const now = new Date();
    const heureNow = `${String(now.getHours()).padStart(2, '0')}:${String(now.getMinutes()).padStart(2, '0')}`;
    for (let i = programme.length - 1; i >= 0; i--) {
      if (programme[i].heure && programme[i].heure <= heureNow) { etapeEnCours = i; break; }
    }
  }

  const getPreviewIndices = () => {
    if (isToday && etapeEnCours >= 0) {
      const indices = [etapeEnCours];
      if (etapeEnCours + 1 < programme.length) indices.push(etapeEnCours + 1);
      if (etapeEnCours + 2 < programme.length) indices.push(etapeEnCours + 2);
      return indices;
    }
    return programme.slice(0, 3).map((_, i) => i);
  };

  const previewIndices = getPreviewIndices();
  const hasMore = programme.length > previewIndices.length;

  /* ── Timeline row ── */
  const EtapeRow = ({ etape, i, isLast, forceShow }) => {
    const isActive = isToday && i === etapeEnCours;
    const isPast = isToday && i < etapeEnCours && !forceShow;
    const label = etape.nom || etape.intitule || '';
    const duree = formatDuree(etape.duree_heures, etape.duree_minutes);
    const categorie = etape.categorie || '';
    const sousEtapes = etape.sous_etapes || [];

    return (
      <div className={`flex gap-0 ${isPast ? 'opacity-40' : ''}`}>
        {/* Ligne verticale + point */}
        <div className="flex flex-col items-center mr-4 shrink-0">
          <div className={`w-3 h-3 rounded-full border-2 mt-1 shrink-0 ${
            isActive ? 'bg-primary border-primary shadow-sm shadow-primary/40' :
            isPast ? 'bg-muted border-muted-foreground/30' : 'bg-background border-border'
          }`} />
          {!isLast && <div className="w-px flex-1 bg-border mt-1" />}
        </div>

        {/* Contenu */}
        <div className={`pb-4 flex-1 min-w-0 ${
          isActive ? 'rounded-xl bg-primary/5 border border-primary/20 px-3 pt-1 pb-3 -ml-1' : ''
        }`}>
          <div className="flex items-baseline gap-2 flex-wrap">
            {etape.heure && (
              <>
                <span className={`text-sm font-bold shrink-0 ${isActive ? 'text-primary' : 'text-foreground'}`}>
                  {etape.heure}
                </span>
                <span className="text-sm text-muted-foreground">—</span>
              </>
            )}
            <span className={`text-sm flex-1 ${isActive ? 'font-semibold text-foreground' : 'text-foreground/90'}`}>
              {label}
            </span>
            {categorie && (
              <span className="text-[10px] uppercase tracking-wide font-medium px-2 py-0.5 rounded-full bg-muted text-muted-foreground shrink-0">
                {categorie}
              </span>
            )}
            {duree && <span className="text-xs text-muted-foreground shrink-0">{duree}</span>}
            {isActive && <span className="text-xs text-primary font-medium shrink-0 animate-pulse">▶ En cours</span>}
          </div>
          {/* Lieu typé associé (LieuEvenement) si match avec la catégorie de l'étape */}
          {(() => {
            const le = matchLieuEvenement(etape, lieuxEvenement);
            if (!le) return null;
            const label = [le.lieu_nom, le.lieu_ville].filter(Boolean).join(' · ');
            return (
              <div className="flex items-center gap-1 mt-1 text-xs text-muted-foreground">
                <MapPin size={10} className="shrink-0" />
                {le.lieu_lien_google_maps ? (
                  <a href={le.lieu_lien_google_maps} target="_blank" rel="noopener noreferrer" className="hover:underline">{label}</a>
                ) : (
                  <span>{label}</span>
                )}
              </div>
            );
          })()}
          {/* Sous-étapes */}
          {sousEtapes.length > 0 && (
            <div className="mt-1.5 ml-3 space-y-0.5 border-l-2 border-border pl-3">
              {sousEtapes.map((se, j) => (
                <div key={j} className="flex items-baseline gap-2 text-xs text-muted-foreground">
                  {se.heure && (
                    <>
                      <span className="font-mono shrink-0">{se.heure}</span>
                      <span>—</span>
                    </>
                  )}
                  <span>{se.nom || se.intitule || ''}</span>
                  {(se.duree_heures || se.duree_minutes) && (
                    <span className="text-muted-foreground/60 shrink-0">{formatDuree(se.duree_heures, se.duree_minutes)}</span>
                  )}
                </div>
              ))}
            </div>
          )}
        </div>
      </div>
    );
  };

  /* ── Impression / PDF ── */
  const handlePrint = () => {
    const confirmedPrestataires = prestataires.filter(p => p.statut === 'Confirmé');
    const dateStr = evenement.date ? format(parseISO(evenement.date), 'EEEE d MMMM yyyy', { locale: fr }) : '';

    const programmeHtml = programme.map((etape, i) => {
      const label = etape.nom || etape.intitule || '';
      const duree = formatDuree(etape.duree_heures, etape.duree_minutes);
      const sousEtapes = etape.sous_etapes || [];
      const categorie = etape.categorie || '';
      return `
        <div style="display:flex;gap:12px;margin-bottom:0">
          <div style="display:flex;flex-direction:column;align-items:center;min-width:12px">
            <div style="width:10px;height:10px;border-radius:50%;border:2px solid #3b4ea6;background:#fff;margin-top:4px;flex-shrink:0"></div>
            ${i < programme.length - 1 ? '<div style="width:1px;flex:1;background:#e2e8f0;margin-top:2px"></div>' : ''}
          </div>
          <div style="padding-bottom:14px;flex:1">
            <div style="display:flex;align-items:baseline;gap:8px;flex-wrap:wrap">
              <span style="font-weight:700;font-size:13px;color:#1e293b;min-width:45px">${etape.heure ? etape.heure.replace(':', 'h') : ''}</span>
              <span style="font-size:13px;color:#1e293b;flex:1">${label}</span>
              ${categorie ? `<span style="font-size:10px;text-transform:uppercase;letter-spacing:.05em;color:#64748b;background:#f1f5f9;padding:2px 8px;border-radius:999px">${categorie}</span>` : ''}
              ${duree ? `<span style="font-size:11px;color:#94a3b8">${duree}</span>` : ''}
            </div>
            ${sousEtapes.length > 0 ? `
              <div style="margin-top:4px;margin-left:12px;padding-left:10px;border-left:2px solid #e2e8f0">
                ${sousEtapes.map(se => `
                  <div style="font-size:11px;color:#64748b;display:flex;gap:6px;margin-bottom:2px">
                    ${se.heure ? `<span style="font-family:monospace">${se.heure.replace(':', 'h')}</span>` : ''}
                    <span>${se.nom || se.intitule || ''}</span>
                  </div>`).join('')}
              </div>` : ''}
          </div>
        </div>`;
    }).join('');

    const prestHtml = confirmedPrestataires.length > 0 ? `
      <div style="margin-top:24px;padding-top:16px;border-top:1px solid #e2e8f0">
        <h3 style="font-size:12px;font-weight:700;text-transform:uppercase;letter-spacing:.06em;color:#64748b;margin-bottom:10px">Prestataires</h3>
        <div style="display:grid;grid-template-columns:1fr 1fr;gap:6px">
          ${confirmedPrestataires.map(p => `
            <div style="font-size:12px;padding:6px 8px;background:#f8fafc;border-radius:6px">
              <strong>${p.prestataire_nom}</strong>
              ${p.prestataire_domaine ? `<span style="color:#64748b"> — ${p.prestataire_domaine}</span>` : ''}
            </div>`).join('')}
        </div>
      </div>` : '';

    const company = companySettings;
    const footerParts = [company?.telephone, company?.email_contact, company?.site_web].filter(Boolean);

    const html = `<!DOCTYPE html><html><head><meta charset="utf-8">
      <title>Programme — ${evenement.nom}</title>
      <style>
        * { box-sizing:border-box; margin:0; padding:0; }
        body { font-family:'Segoe UI',Arial,sans-serif; color:#1e293b; background:#fff; padding:32px; max-width:680px; margin:0 auto; }
        @media print { body { padding:16px; } }
      </style>
    </head><body>
      <div style="display:flex;align-items:center;gap:16px;padding-bottom:20px;border-bottom:2px solid #e2e8f0;margin-bottom:20px">
        ${company?.company_logo_url ? `<img src="${company.company_logo_url}" style="height:48px;width:auto;object-fit:contain" />` : ''}
        <div>
          ${company?.company_name ? `<p style="font-size:18px;font-weight:700;color:#1e293b">${company.company_name}</p>` : ''}
        </div>
      </div>
      <div style="margin-bottom:24px;padding:14px 16px;background:#f8fafc;border-radius:10px;border-left:4px solid #3b4ea6">
        <h1 style="font-size:20px;font-weight:800;color:#1e293b;margin-bottom:4px">${evenement.nom}</h1>
        ${evenement.type_evenement ? `<p style="font-size:13px;color:#3b4ea6;font-weight:600;margin-bottom:6px">${evenement.type_evenement}</p>` : ''}
        <div style="display:flex;flex-wrap:wrap;gap:16px;font-size:12px;color:#64748b">
          ${dateStr ? `<span>📅 ${dateStr}</span>` : ''}
          ${evenement.heure_debut && evenement.heure_fin ? `<span>🕐 ${evenement.heure_debut} – ${evenement.heure_fin}</span>` : ''}
          ${evenement.lieu_nom ? `<span>📍 ${evenement.lieu_nom}</span>` : ''}
          ${evenement.nb_invites ? `<span>👥 ${evenement.nb_invites} invités</span>` : ''}
        </div>
      </div>
      <h3 style="font-size:12px;font-weight:700;text-transform:uppercase;letter-spacing:.06em;color:#64748b;margin-bottom:12px">Programme de la journée</h3>
      ${programmeHtml}
      ${prestHtml}
      ${footerParts.length > 0 ? `
        <div style="margin-top:32px;padding-top:12px;border-top:1px solid #e2e8f0;font-size:11px;color:#94a3b8;text-align:center">
          ${footerParts.join(' · ')}
        </div>` : ''}
    </body></html>`;

    const win = window.open('', '_blank');
    win.document.write(html);
    win.document.close();
    win.focus();
    setTimeout(() => win.print(), 400);
  };

  return (
    <div className="bg-card rounded-2xl border border-border p-5">
      <div className="flex items-center justify-between mb-5">
        <h3 className="font-semibold text-base flex items-center gap-2">
          🗓️ Programme de la journée
          {isToday && (
            <span className="text-xs bg-emerald-100 text-emerald-700 px-2 py-0.5 rounded-full font-medium">
              Aujourd'hui !
            </span>
          )}
        </h3>
        <button
          onClick={handlePrint}
          className="flex items-center gap-1.5 text-xs text-muted-foreground hover:text-primary transition-colors border border-border hover:border-primary/40 rounded-lg px-2.5 py-1.5"
          title="Imprimer / Télécharger PDF"
        >
          <Printer size={13} /> Imprimer
        </button>
      </div>

      {/* Aperçu condensé */}
      {!expanded && (
        <div>
          {previewIndices.map((i, idx) => (
            <EtapeRow key={i} etape={programme[i]} i={i} isLast={idx === previewIndices.length - 1 && !hasMore} />
          ))}
          {hasMore && (
            <button
              onClick={() => setExpanded(true)}
              className="w-full flex items-center justify-center gap-1.5 mt-1 py-2 text-xs font-medium text-primary hover:bg-primary/5 rounded-xl transition-colors border border-primary/20"
            >
              Voir le programme complet ({programme.length} étapes) <ChevronDown size={13} />
            </button>
          )}
        </div>
      )}

      {/* Programme complet */}
      {expanded && (
        <div>
          {programme.map((etape, i) => (
            <EtapeRow key={etape.id || i} etape={etape} i={i} isLast={i === programme.length - 1} forceShow />
          ))}
          <button
            onClick={() => setExpanded(false)}
            className="w-full flex items-center justify-center gap-1.5 mt-1 py-2 text-xs font-medium text-muted-foreground hover:bg-muted/50 rounded-xl transition-colors border border-border"
          >
            Réduire <ChevronUp size={13} />
          </button>
        </div>
      )}
    </div>
  );
}