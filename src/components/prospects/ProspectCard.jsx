import { useState } from 'react';
import { ChevronDown, MessageSquare, Pencil, Trash2, Phone, Mail, Users, ExternalLink, FileText, BookOpen, Paperclip, CalendarCheck, CalendarClock, Bell, Clock, Share2 } from 'lucide-react';
import { TYPE_COLORS } from '@/constants/colors';
import RelanceDelaiPopover from '@/components/prospects/RelanceDelaiPopover';

const STATUTS = [
  { label: 'Nouveau',       color: 'bg-slate-100 text-slate-600',   dot: '⚪' },
  { label: 'Devis envoyé',  color: 'bg-blue-100 text-blue-700',     dot: '🔵' },
  { label: 'À relancer',    color: 'bg-orange-100 text-orange-700', dot: '🟠' },
  { label: 'Signé',         color: 'bg-emerald-100 text-emerald-700', dot: '🟢' },
  { label: 'Annulé',        color: 'bg-red-100 text-red-600',       dot: '🔴' },
];
const STATUT_COLORS = Object.fromEntries(STATUTS.map(s => [s.label, s.color]));
const STATUT_DOTS   = Object.fromEntries(STATUTS.map(s => [s.label, s.dot]));

function StatutBadge({ statut, onChange }) {
  const [open, setOpen] = useState(false);
  return (
    <div className="relative" onClick={e => e.stopPropagation()}>
      <button onClick={() => setOpen(v => !v)} className={`flex items-center gap-1 text-xs px-2 py-0.5 rounded-full font-medium ${STATUT_COLORS[statut] || 'bg-muted text-muted-foreground'}`}>
        {STATUT_DOTS[statut]} {statut} <ChevronDown size={10} />
      </button>
      {open && (
        <div className="absolute top-full left-0 mt-1 z-20 bg-card border border-border rounded-xl shadow-lg py-1 min-w-[150px]">
          {STATUTS.map(s => (
            <button key={s.label} onClick={() => { onChange(s.label); setOpen(false); }} className={`w-full text-left px-3 py-1.5 text-xs font-medium hover:bg-muted transition-colors flex items-center gap-2 ${statut === s.label ? 'opacity-50' : ''}`}>
              {s.dot} {s.label}
            </button>
          ))}
        </div>
      )}
    </div>
  );
}

/**
 * ProspectCard — carte prospect individuelle extraite de Prospects.jsx.
 * Affiche les informations, badges d'état et actions rapides d'un prospect.
 */
export default function ProspectCard({
  prospect: p,
  badgeData: { datesEnAttente, datesRepondues, datesConfirmees, nbMessages, contrat, rappel },
  onStatutChange,
  onMessages,
  onEdit,
  onDelete,
  onArchive,
  onDevis,
  onBrochure,
  onDocument,
  onContrat,
  onReservation,
  onRappel,
  onShare,
  onRelanceDelaiSave,
}) {
  return (
    <div className="bg-card rounded-2xl border border-border shadow-sm p-4 space-y-3 hover:shadow-md transition-shadow">
      <div className="flex items-start justify-between">
        <div>
          <p className="font-semibold text-base">
            {p.prenom} {p.nom}{p.prenom2 ? ` & ${p.prenom2}${p.nom2 && p.nom2 !== p.nom ? ' ' + p.nom2 : ''}` : ''}
          </p>
          {p.type_evenement && <span className={`text-xs px-2 py-0.5 rounded-full mt-1 inline-block font-medium ${TYPE_COLORS[p.type_evenement] || TYPE_COLORS['Autre']}`}>{p.type_evenement}</span>}
        </div>
        <div className="flex items-center gap-1">
          <StatutBadge statut={p.statut || 'Nouveau'} onChange={onStatutChange} />
          <button onClick={onMessages} className="p-1.5 rounded-lg hover:bg-muted text-muted-foreground hover:text-foreground transition-colors"><MessageSquare size={16} /></button>
          <button onClick={onEdit} className="p-1.5 rounded-lg hover:bg-muted text-muted-foreground hover:text-foreground transition-colors"><Pencil size={16} /></button>
          {p.statut === 'Annulé' && !p.archived && (
            <button
              onClick={(e) => { e.stopPropagation(); onArchive(true); }}
              title="Archiver"
              className="p-1.5 rounded-lg hover:bg-muted text-muted-foreground hover:text-amber-600 transition-colors text-xs font-medium"
            >🗃️</button>
          )}
          {p.archived && (
            <button
              onClick={(e) => { e.stopPropagation(); onArchive(false); }}
              title="Restaurer"
              className="p-1.5 rounded-lg hover:bg-muted text-muted-foreground hover:text-emerald-600 transition-colors text-xs font-medium"
            >↩️</button>
          )}
          <button onClick={onDelete} className="p-1.5 rounded-lg hover:bg-muted text-muted-foreground hover:text-destructive transition-colors"><Trash2 size={16} /></button>
        </div>
      </div>
      <div className="space-y-1.5 text-sm text-muted-foreground">
        {p.telephone && <div className="flex items-center gap-2"><Phone size={13} /><span>{p.telephone}</span></div>}
        {p.email && <div className="flex items-center gap-2"><Mail size={13} /><span className="truncate">{p.email}</span></div>}
        {p.nb_invites_estime > 0 && <div className="flex items-center gap-2"><Users size={13} /><span>{p.nb_invites_estime} personnes</span></div>}
      </div>
      {((!p.date_type || p.date_type === 'exacte') && p.date_evenement_souhaitee) && (
        <div className="flex items-center gap-2 text-xs text-muted-foreground">
          <span>📅</span>
          <span>{new Date(p.date_evenement_souhaitee + 'T12:00:00').toLocaleDateString('fr-FR', { day: 'numeric', month: 'long', year: 'numeric' })}</span>
        </div>
      )}
      {p.date_type === 'mois' && p.date_mois && (
        <div className="flex items-center gap-2 text-xs text-muted-foreground">
          <span>📅</span>
          <span>{new Date(p.date_mois + '-15').toLocaleDateString('fr-FR', { month: 'long', year: 'numeric' })}</span>
        </div>
      )}
      {p.date_type === 'periode' && p.date_periode && (
        <div className="flex items-center gap-2 text-xs text-muted-foreground">
          <span>📅</span>
          <span>{p.date_periode}</span>
        </div>
      )}
      {p.lieu_nom && (
        <div className="flex items-center gap-2 text-xs text-muted-foreground">
          <span>📍</span><span>{p.lieu_nom}</span>
        </div>
      )}
      {p.formule_nom && <p className="text-xs text-primary/80 bg-primary/5 rounded-lg px-3 py-2">{p.formule_nom}</p>}
      {/* Badges d'état */}
      {(datesEnAttente || datesRepondues || datesConfirmees || nbMessages > 0) && (
        <div className="flex flex-wrap gap-1.5">
          {datesEnAttente && (
            <button onClick={(e) => { e.stopPropagation(); onReservation(); }} className="text-[10px] font-semibold px-2 py-0.5 rounded-full bg-cyan-100 text-cyan-700 border border-cyan-200 hover:bg-cyan-200 transition-colors">📅 Date en attente</button>
          )}
          {datesRepondues && (
            <button onClick={(e) => { e.stopPropagation(); onReservation(); }} className="text-[10px] font-semibold px-2 py-0.5 rounded-full bg-blue-100 text-blue-700 border border-blue-200 hover:bg-blue-200 transition-colors">📅 Réponse envoyée</button>
          )}
          {datesConfirmees && (
            <span className="text-[10px] font-semibold px-2 py-0.5 rounded-full bg-emerald-100 text-emerald-700 border border-emerald-200">✅ Date confirmée</span>
          )}
          {nbMessages > 0 && (
            <button onClick={(e) => { e.stopPropagation(); onMessages(); }} className="text-[10px] font-semibold px-2 py-0.5 rounded-full bg-emerald-100 text-emerald-700 border border-emerald-200 hover:bg-emerald-200 transition-colors">💬 {nbMessages} message{nbMessages > 1 ? 's' : ''}</button>
          )}
        </div>
      )}
      {/* Actions rapides — chips style carte événement */}
      <div className="flex flex-wrap gap-1.5 pt-2 border-t border-border">
        {p.converti && p.evenement_id ? (
          <a href={`/Evenements?open=${p.evenement_id}`} className="flex items-center gap-1.5 px-2.5 py-1.5 rounded-lg border border-border bg-muted/30 hover:bg-muted text-xs font-medium text-foreground transition-colors"><ExternalLink size={13} className="text-blue-600" /> Voir l'événement</a>
        ) : (
          <button onClick={onDevis} className="flex items-center gap-1.5 px-2.5 py-1.5 rounded-lg border border-border bg-muted/30 hover:bg-muted text-xs font-medium text-foreground transition-colors"><FileText size={13} className="text-blue-600" /> Devis</button>
        )}
        <button onClick={onBrochure} className="flex items-center gap-1.5 px-2.5 py-1.5 rounded-lg border border-border bg-muted/30 hover:bg-muted text-xs font-medium text-foreground transition-colors"><BookOpen size={13} className="text-violet-600" /> Brochure</button>
        <button onClick={onDocument} className="flex items-center gap-1.5 px-2.5 py-1.5 rounded-lg border border-border bg-muted/30 hover:bg-muted text-xs font-medium text-foreground transition-colors"><Paperclip size={13} className="text-slate-600" /> Document</button>
        <button onClick={onContrat} className="flex items-center gap-1.5 px-2.5 py-1.5 rounded-lg border border-border bg-muted/30 hover:bg-muted text-xs font-medium text-foreground transition-colors">
          <CalendarCheck size={13} className="text-emerald-600" /> Contrat :
          {(() => {
            if (contrat) {
              if (contrat.statut === 'Signé' || contrat.contrat_signe_url) return <span className="text-[10px] px-1.5 py-0.5 rounded-md bg-emerald-100 text-emerald-700 font-medium">Signé</span>;
              if (contrat.statut === 'En attente de signature') return <span className="text-[10px] px-1.5 py-0.5 rounded-md bg-amber-100 text-amber-700 font-medium">En attente</span>;
              return <span className="text-[10px] px-1.5 py-0.5 rounded-md bg-slate-100 text-slate-500 font-medium">{contrat.statut}</span>;
            }
            return <span className="text-[10px] px-1.5 py-0.5 rounded-md bg-slate-100 text-slate-500 font-medium">—</span>;
          })()}
        </button>
        <button onClick={onReservation} className="flex items-center gap-1.5 px-2.5 py-1.5 rounded-lg border border-border bg-muted/30 hover:bg-muted text-xs font-medium text-foreground transition-colors"><CalendarClock size={13} className="text-cyan-600" /> Réservation</button>
        <button onClick={onRappel} className="flex items-center gap-1.5 px-2.5 py-1.5 rounded-lg border border-border bg-muted/30 hover:bg-muted text-xs font-medium text-foreground transition-colors">
          <Bell size={13} className="text-amber-600" /> Rappel
          {(() => {
            if (rappel) {
              const today = new Date(); today.setHours(0, 0, 0, 0);
              const j = Math.ceil((new Date(rappel.date_rappel + 'T12:00:00') - today) / (1000 * 60 * 60 * 24));
              if (j >= 0) {
                return <span className="text-[10px] px-1.5 py-0.5 rounded-md bg-amber-100 text-amber-700 font-medium">{j === 0 ? "Aujourd'hui" : `J-${j}`}</span>;
              }
            }
            return <span className="text-[10px] px-1.5 py-0.5 rounded-md bg-slate-100 text-slate-500 font-medium">—</span>;
          })()}
        </button>
        {p.statut === 'Devis envoyé' && (
          <RelanceDelaiPopover
            prospect={p}
            onSave={onRelanceDelaiSave}
          />
        )}
        {p.statut === 'À relancer' && (
          <span className="flex items-center gap-1.5 px-2.5 py-1.5 rounded-lg border border-amber-200 bg-amber-50 text-xs font-medium text-amber-700">
            <Clock size={13} /> Relance envoyée
          </span>
        )}
      </div>
      {p.lien_token && (
        <div className="pt-2 border-t border-border">
          <button onClick={onShare} className="w-full flex items-center justify-center gap-1.5 py-2 rounded-lg border border-border bg-primary/5 hover:bg-primary/10 text-xs font-medium text-primary transition-colors"><Share2 size={13} className="text-primary" /> Partager l'espace prospect</button>
        </div>
      )}
    </div>
  );
}