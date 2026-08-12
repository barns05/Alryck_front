import { useEffect, useState } from 'react';
import { useMutation, useQueryClient } from '@tanstack/react-query';
import { base44 } from '@/api/base44Client';
import { format, parseISO, isFuture, isPast } from 'date-fns';
import { fr } from 'date-fns/locale';
import { Calendar, MapPin, Clock, Briefcase, Phone, Mail, Users, CheckCircle, XCircle, PartyPopper } from 'lucide-react';
import PrestataireChatPortal from '@/components/prestataires/PrestataireChatPortal';
import PropositionsDateSection from '@/components/prestataires/PropositionsDateSection';
import ProposerDateSection from '@/components/prestataires/ProposerDateSection';
import DemanderAnnulationSection from '@/components/prestataires/DemanderAnnulationSection';
import PlanSallePrestataireSection from '@/components/prestataires/PlanSallePrestataireSection';
import { peutVoirPlanSalle } from '@/lib/planSalleAccess';

const statutColors = {
  'En attente': 'bg-amber-100 text-amber-700 border-amber-200',
  'Confirmé':   'bg-emerald-100 text-emerald-700 border-emerald-200',
  'Indispo':    'bg-red-100 text-red-600 border-red-200',
  'Annulé':     'bg-slate-100 text-slate-500 border-slate-200',
  'Terminé':    'bg-slate-100 text-slate-500 border-slate-200',
};

export default function MonEspacePrestataire() {
  const [user, setUser] = useState(null);
  const [prestataire, setPrestataire] = useState(null);
  const [dispos, setDispos] = useState([]);
  const [loading, setLoading] = useState(true);
  const [updatingId, setUpdatingId] = useState(null);
  const [prospects, setProspects] = useState([]);
  const [notifs, setNotifs] = useState([]);

  useEffect(() => {
    (async () => {
      const me = await base44.auth.me();
      setUser(me);

      const prestataires = await base44.entities.Prestataire.filter({ email: me.email });
      if (prestataires.length === 0) { setLoading(false); return; }
      const p = prestataires[0];
      setPrestataire(p);

      const results = await base44.entities.DispoPrestataire.filter({ prestataire_id: p.id }, '-date', 200);
      setDispos(results.sort((a, b) => (a.date || '').localeCompare(b.date || '')));

      // Prospects recommandés à ce prestataire (suite à une mise en relation client)
      try {
        const prosp = await base44.entities.Prospect.filter({ prestataire_id: p.id });
        setProspects(prosp);
      } catch {}

      // Notifications ciblées au prestataire (user_email = son email de connexion)
      try {
        const allNotifs = await base44.entities.Notification.list('-created_date', 30);
        const email = (p.portal_email || p.email || '').toLowerCase();
        setNotifs(allNotifs.filter(n => n.user_email && (n.user_email || '').toLowerCase() === email));
      } catch {}

      setLoading(false);
    })();
  }, []);

  const updateStatut = async (id, statut) => {
    setUpdatingId(id);
    await base44.entities.DispoPrestataire.update(id, { statut });
    setDispos(prev => prev.map(d => d.id === id ? { ...d, statut } : d));
    setUpdatingId(null);
  };

  if (loading) {
    return (
      <div className="flex items-center justify-center h-64">
        <div className="w-8 h-8 border-4 border-purple-200 border-t-purple-500 rounded-full animate-spin" />
      </div>
    );
  }

  if (!prestataire) {
    return (
      <div className="p-8 text-center">
        <div className="text-4xl mb-3">😕</div>
        <h2 className="font-semibold text-lg mb-2">Profil prestataire introuvable</h2>
        <p className="text-muted-foreground text-sm">Votre email ({user?.email}) n'est associé à aucun prestataire. Contactez votre organisateur.</p>
      </div>
    );
  }

  const upcoming = dispos.filter(d => d.date && !isPast(parseISO(d.date)));
  const past = dispos.filter(d => d.date && isPast(parseISO(d.date)));
  const confirmed = dispos.filter(d => d.statut === 'Confirmé').length;
  const pending = dispos.filter(d => d.statut === 'En attente').length;

  return (
    <div className="p-4 md:p-6 space-y-6 max-w-3xl mx-auto">
      {/* Header */}
      <div className="bg-gradient-to-r from-purple-700 to-purple-500 text-white rounded-2xl p-6">
        <div className="flex items-center gap-4">
          <div className="w-14 h-14 bg-white/20 rounded-2xl flex items-center justify-center shrink-0">
            <Briefcase size={24} className="text-white" />
          </div>
          <div>
            <h1 className="text-xl font-bold">{prestataire.nom}</h1>
            {prestataire.domaine && (
              <span className="inline-block bg-white/20 text-white text-xs px-2.5 py-0.5 rounded-full font-medium mt-1">
                {prestataire.domaine}
              </span>
            )}
            <div className="flex items-center gap-4 mt-2 text-white/75 text-xs flex-wrap">
              {prestataire.telephone && <span className="flex items-center gap-1"><Phone size={11} />{prestataire.telephone}</span>}
              {prestataire.email && <span className="flex items-center gap-1"><Mail size={11} />{prestataire.email}</span>}
            </div>
          </div>
        </div>
      </div>

      {/* Stats */}
      <div className="grid grid-cols-4 gap-3">
        <div className="bg-card rounded-2xl border border-border p-4 text-center shadow-sm">
          <p className="text-2xl font-bold text-foreground">{dispos.length}</p>
          <p className="text-xs text-muted-foreground mt-0.5">Total</p>
        </div>
        <div className="bg-card rounded-2xl border border-border p-4 text-center shadow-sm">
          <p className="text-2xl font-bold text-amber-500">{pending}</p>
          <p className="text-xs text-muted-foreground mt-0.5">En attente</p>
        </div>
        <div className="bg-card rounded-2xl border border-border p-4 text-center shadow-sm">
          <p className="text-2xl font-bold text-emerald-600">{confirmed}</p>
          <p className="text-xs text-muted-foreground mt-0.5">Confirmés</p>
        </div>
        <div className="bg-card rounded-2xl border border-border p-4 text-center shadow-sm">
          <p className="text-2xl font-bold text-blue-600">{upcoming.length}</p>
          <p className="text-xs text-muted-foreground mt-0.5">À venir</p>
        </div>
      </div>

      {/* Notifications ciblées au prestataire */}
      {notifs.filter(n => !n.lu).length > 0 && (
        <div className="space-y-2">
          <h2 className="font-semibold text-sm uppercase tracking-wide text-muted-foreground">🔔 Notifications</h2>
          {notifs.filter(n => !n.lu).slice(0, 4).map(n => (
            <div key={n.id} className="bg-purple-50 border border-purple-200 rounded-2xl p-3 flex items-start gap-2">
              <span className="text-lg shrink-0">🔔</span>
              <div className="flex-1 min-w-0">
                <p className="font-semibold text-sm text-purple-800">{n.titre}</p>
                <p className="text-xs text-purple-700 mt-0.5">{n.message}</p>
              </div>
            </div>
          ))}
        </div>
      )}

      {/* Proposer un changement de date (initiative prestataire) */}
      <ProposerDateSection prestataireId={prestataire.id} />

      {/* Demander l'annulation d'un événement (initiative prestataire) */}
      <DemanderAnnulationSection prestataireId={prestataire.id} />

      {/* Changements de date à confirmer */}
      <PropositionsDateSection prestataireId={prestataire.id} />

      {/* Mes prospects — mises en relation reçues */}
      {prospects.length > 0 && (
        <div className="space-y-3">
          <h2 className="font-semibold text-sm uppercase tracking-wide text-muted-foreground">Mes prospects</h2>
          {prospects.map(p => (
            <ProspectCard key={p.id} p={p} />
          ))}
        </div>
      )}

      {/* Demandes à venir */}
      {upcoming.length > 0 && (
        <div className="space-y-3">
          <h2 className="font-semibold text-sm uppercase tracking-wide text-muted-foreground">Demandes à venir</h2>
          {upcoming.map(d => (
            <DispoCard key={d.id} dispo={d} onUpdate={updateStatut} isUpdating={updatingId === d.id} domaine={prestataire.domaine} />
          ))}
        </div>
      )}

      {upcoming.length === 0 && (
        <div className="bg-card rounded-2xl border border-border p-10 text-center">
          <Calendar size={36} className="mx-auto mb-3 text-muted-foreground/30" />
          <p className="text-muted-foreground font-medium">Aucune demande à venir</p>
        </div>
      )}

      {/* Passées */}
      {past.length > 0 && (
        <div className="space-y-3">
          <h2 className="font-semibold text-sm uppercase tracking-wide text-muted-foreground">Passées</h2>
          {past.map(d => (
            <DispoCard key={d.id} dispo={d} onUpdate={updateStatut} isUpdating={updatingId === d.id} past domaine={prestataire.domaine} />
          ))}
        </div>
      )}

      {/* Messagerie */}
      {prestataire && (
        <PrestataireChatPortal
          prestataireId={prestataire.id}
          prestataireNom={prestataire.nom}
          prestataireEmail={prestataire.email}
        />
      )}
    </div>
  );
}

function ProspectCard({ p }) {
  const dateLabel = p.date_evenement_souhaitee
    ? format(parseISO(p.date_evenement_souhaitee), 'd MMM yyyy', { locale: fr })
    : p.date_mois
      ? format(new Date(p.date_mois + '-15'), 'MMMM yyyy', { locale: fr })
      : p.date_periode || null;
  return (
    <div className="bg-card rounded-2xl border border-border shadow-sm p-4 space-y-2">
      <div className="flex items-start justify-between gap-2">
        <div className="min-w-0">
          <p className="font-semibold text-base">{p.prenom} {p.nom}{p.prenom2 ? ` & ${p.prenom2}` : ''}</p>
          {p.type_evenement && <span className="text-xs px-2 py-0.5 rounded-full bg-primary/10 text-primary font-medium mt-1 inline-block">{p.type_evenement}</span>}
        </div>
        <span className="text-[11px] px-2 py-0.5 rounded-full bg-slate-100 text-slate-600 font-medium shrink-0">{p.statut || 'Nouveau'}</span>
      </div>
      <div className="space-y-1 text-sm text-muted-foreground">
        {p.telephone && <div className="flex items-center gap-2"><Phone size={13} className="shrink-0" /><a href={`tel:${p.telephone}`} className="hover:underline">{p.telephone}</a></div>}
        {p.email && <div className="flex items-center gap-2"><Mail size={13} className="shrink-0" /><a href={`mailto:${p.email}`} className="hover:underline truncate">{p.email}</a></div>}
        {p.nb_invites_estime > 0 && <div className="flex items-center gap-2"><Users size={13} className="shrink-0" /><span>{p.nb_invites_estime} personnes</span></div>}
        {dateLabel && <div className="flex items-center gap-2"><Calendar size={13} className="shrink-0" /><span>{dateLabel}</span></div>}
        {p.lieu_nom && <div className="flex items-center gap-2"><MapPin size={13} className="shrink-0" /><span>{p.lieu_nom}</span></div>}
      </div>
    </div>
  );
}

function DispoCard({ dispo, onUpdate, isUpdating, past, domaine }) {
  return (
    <div className={`bg-card rounded-2xl border border-border shadow-sm p-4 space-y-3 ${past ? 'opacity-60' : ''}`}>
      <div className="flex items-start justify-between gap-3">
        <div>
          <p className="font-semibold capitalize">
            {dispo.date ? format(parseISO(dispo.date), 'EEEE d MMMM yyyy', { locale: fr }) : '—'}
          </p>
          <div className="flex flex-wrap gap-3 mt-1 text-xs text-muted-foreground">
            {(dispo.heure_debut || dispo.heure_fin) && (
              <span className="flex items-center gap-1"><Clock size={11} />{dispo.heure_debut} – {dispo.heure_fin}</span>
            )}
            {dispo.lieu && (
              <span className="flex items-center gap-1"><MapPin size={11} />{dispo.lieu}</span>
            )}
            {dispo.evenement_nom && (
              <span className="flex items-center gap-1"><PartyPopper size={11} />{dispo.evenement_nom}</span>
            )}
          </div>
          {dispo.notes && (
            <p className="text-xs text-muted-foreground italic mt-1.5 bg-muted rounded-lg px-2.5 py-1.5">{dispo.notes}</p>
          )}
        </div>
        <span className={`text-[11px] px-2.5 py-1 rounded-full border font-medium shrink-0 ${statutColors[dispo.statut] || 'bg-slate-100 text-slate-600'}`}>
          {dispo.statut}
        </span>
      </div>

      {/* Actions - uniquement si pas passé et pas déjà terminé/annulé */}
      {!past && dispo.statut !== 'Annulé' && dispo.statut !== 'Terminé' && (
        <div className="flex gap-2 pt-1 border-t border-border">
          <button
            disabled={isUpdating || dispo.statut === 'Confirmé'}
            onClick={() => onUpdate(dispo.id, 'Confirmé')}
            className={`flex-1 flex items-center justify-center gap-1.5 text-xs py-2 rounded-xl font-medium transition-colors
              ${dispo.statut === 'Confirmé'
                ? 'bg-emerald-100 text-emerald-700 cursor-default'
                : 'bg-emerald-50 text-emerald-700 hover:bg-emerald-100 border border-emerald-200'
              }`}
          >
            <CheckCircle size={13} />
            {dispo.statut === 'Confirmé' ? 'Confirmé ✓' : 'Je suis disponible'}
          </button>
          <button
            disabled={isUpdating || dispo.statut === 'Indispo'}
            onClick={() => onUpdate(dispo.id, 'Indispo')}
            className={`flex-1 flex items-center justify-center gap-1.5 text-xs py-2 rounded-xl font-medium transition-colors
              ${dispo.statut === 'Indispo'
                ? 'bg-red-100 text-red-600 cursor-default'
                : 'bg-red-50 text-red-600 hover:bg-red-100 border border-red-200'
              }`}
          >
            <XCircle size={13} />
            {dispo.statut === 'Indispo' ? 'Indisponible ✓' : 'Je suis indisponible'}
          </button>
        </div>
      )}
      {dispo.statut === 'Confirmé' && dispo.evenement_id && peutVoirPlanSalle(domaine) && (
        <PlanSallePrestataireSection evenementId={dispo.evenement_id} />
      )}
    </div>
  );
}