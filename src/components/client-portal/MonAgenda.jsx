/**
 * MonAgenda — Agenda complet côté espace client
 * Voie 1 : Demande à un prestataire (sélection parmi EvenementPrestataire)
 * Voie 2 : Note personnelle directe (titre + lieu + note)
 * Export iCal (.ics) des RDV confirmés
 */
import { useState } from 'react';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { base44 } from '@/api/base44Client';
import { Plus, Calendar, Phone, Monitor, MapPin, User, ChevronDown, ChevronUp, X, Pencil, Trash2, Bell, CalendarDays, List } from 'lucide-react';
import { format, isPast, parseISO } from 'date-fns';
import { fr } from 'date-fns/locale';
import IcsSubscriptionBlock from './IcsSubscriptionBlock';
import RappelCheckboxes from './RappelCheckboxes';
import AgendaCalendar from './AgendaCalendar';

// ── Constantes ────────────────────────────────────────────────────────────────
const JOURS  = Array.from({ length: 31 }, (_, i) => String(i + 1).padStart(2, '0'));
const MOIS   = [
  { v: '01', l: 'Janvier' }, { v: '02', l: 'Février' }, { v: '03', l: 'Mars' },
  { v: '04', l: 'Avril' },   { v: '05', l: 'Mai' },     { v: '06', l: 'Juin' },
  { v: '07', l: 'Juillet' }, { v: '08', l: 'Août' },    { v: '09', l: 'Septembre' },
  { v: '10', l: 'Octobre' }, { v: '11', l: 'Novembre' }, { v: '12', l: 'Décembre' },
];
const ANNEES = Array.from({ length: 5 }, (_, i) => String(new Date().getFullYear() + i));
const HEURES = Array.from({ length: 24 }, (_, i) => `${String(i).padStart(2, '0')}:00`);

const TYPE_RDV_OPTIONS = [
  { val: 'Physique',    icon: MapPin,    color: '#1d4ed8' },
  { val: 'Visio',       icon: Monitor,   color: '#7c3aed' },
  { val: 'Téléphonique', icon: Phone,    color: '#0f766e' },
];

// Palette couleur : bleu (RDV prestataire confirmé), jaune/orange (en attente), vert (note perso)
const CARD_STYLE = {
  prestataire_confirme: { bg: '#eff6ff', color: '#1d4ed8', border: '#bfdbfe' },
  prestataire_attente:  { bg: '#fffbeb', color: '#b45309', border: '#fde68a' },
  personnel:            { bg: '#f0fdf4', color: '#15803d', border: '#bbf7d0' },
  annule:               { bg: '#f9fafb', color: '#6b7280', border: '#e5e7eb' },
  termine:              { bg: '#f9fafb', color: '#9ca3af', border: '#e5e7eb' },
};

function getCardStyle(rdv) {
  if (rdv.statut === 'Annulé') return CARD_STYLE.annule;
  if (rdv.statut === 'Terminé') return CARD_STYLE.termine;
  if (rdv.origine === 'Personnel') return CARD_STYLE.personnel;
  if (rdv.origine === 'Prestataire') {
    return rdv.statut === 'Confirmé' ? CARD_STYLE.prestataire_confirme : CARD_STYLE.prestataire_attente;
  }
  return CARD_STYLE.prestataire_attente;
}

// ── Helpers ───────────────────────────────────────────────────────────────────
function buildDate(j, m, a) {
  if (!j || !m || !a) return '';
  return `${a}-${m}-${j}`;
}

function getDateRef(rdv) {
  return rdv.statut === 'Confirmé' ? rdv.date_confirmee : rdv.date_souhaitee;
}

function formatDateRdv(dateStr, heure) {
  if (!dateStr) return '';
  try {
    return format(parseISO(dateStr), 'd MMM yyyy', { locale: fr }) + (heure ? ` à ${heure}` : '');
  } catch { return dateStr; }
}

async function notifierAdmin({ clientNom, clientId, typeRdv, motif, prestataireNom }) {
  await base44.entities.Notification.create({
    titre: 'Nouvelle demande de rendez-vous',
    message: `${clientNom} souhaite un rendez-vous${prestataireNom ? ` avec ${prestataireNom}` : ''}${typeRdv ? ` (${typeRdv})` : ''}${motif ? ` — "${motif}"` : ''}.`,
    type: 'rendezvous',
    lu: false,
    lien: `/clients/${clientId}`,
  });
}

async function notifierClientViaConversation({ clientId, evenementId, clientNom, evenementNom, message }) {
  const convs = await base44.entities.Conversation.filter({ client_id: clientId, evenement_id: evenementId });
  if (convs.length > 0) {
    const conv = convs[0];
    await base44.entities.Conversation.update(conv.id, {
      dernier_message: message,
      date_dernier_message: new Date().toISOString(),
      non_lus_client: (conv.non_lus_client || 0) + 1,
    });
  } else {
    await base44.entities.Conversation.create({
      client_id: clientId, evenement_id: evenementId,
      client_nom: clientNom, evenement_nom: evenementNom,
      dernier_message: message,
      date_dernier_message: new Date().toISOString(),
      non_lus_client: 1, non_lus_admin: 0,
    });
  }
}

// ── Sélecteur de date (3 selects) ─────────────────────────────────────────────
function DateSelects({ jour, mois, annee, onChange, label = 'Date' }) {
  return (
    <div className="space-y-1">
      <p className="text-xs font-medium text-gray-500">{label}</p>
      <div className="grid grid-cols-3 gap-1.5">
        <select value={jour} onChange={e => onChange('j', e.target.value)}
          className="border rounded-xl px-2 py-2 text-sm focus:outline-none" style={{ borderColor: '#e2e8f0', fontSize: 15 }}>
          <option value="">Jour</option>
          {JOURS.map(j => <option key={j} value={j}>{parseInt(j)}</option>)}
        </select>
        <select value={mois} onChange={e => onChange('m', e.target.value)}
          className="border rounded-xl px-2 py-2 text-sm focus:outline-none" style={{ borderColor: '#e2e8f0', fontSize: 15 }}>
          <option value="">Mois</option>
          {MOIS.map(m => <option key={m.v} value={m.v}>{m.l}</option>)}
        </select>
        <select value={annee} onChange={e => onChange('a', e.target.value)}
          className="border rounded-xl px-2 py-2 text-sm focus:outline-none" style={{ borderColor: '#e2e8f0', fontSize: 15 }}>
          <option value="">Année</option>
          {ANNEES.map(a => <option key={a} value={a}>{a}</option>)}
        </select>
      </div>
    </div>
  );
}

// ── Sélecteur heure ────────────────────────────────────────────────────────────
function HeureSelect({ value, onChange, label = 'Heure' }) {
  return (
    <div className="space-y-1">
      <p className="text-xs font-medium text-gray-500">{label}</p>
      <select value={value} onChange={e => onChange(e.target.value)}
        className="w-full border rounded-xl px-2 py-2 text-sm focus:outline-none" style={{ borderColor: '#e2e8f0', fontSize: 15 }}>
        <option value="">-- Choisir --</option>
        {HEURES.map(h => <option key={h} value={h}>{h}</option>)}
      </select>
    </div>
  );
}

// ── Carte RDV ──────────────────────────────────────────────────────────────────
function RdvCard({ rdv, onChooseCreneau, choosingCreneau, onEdit, onDelete, onCancelDemande, onCancelRdv, onModifyRdv, onRefusCreneaux }) {
  const [selectedCreneau, setSelectedCreneau] = useState(null);
  const [showCancelForm, setShowCancelForm] = useState(false);
  const [cancelMotif, setCancelMotif] = useState('');
  const [showModifyForm, setShowModifyForm] = useState(false);
  const [modifyMotif, setModifyMotif] = useState('');
  const [showRefusForm, setShowRefusForm] = useState(false);
  const [refusMotif, setRefusMotif] = useState('');
  const [expandedJour, setExpandedJour] = useState(null);
  const dateRef = getDateRef(rdv);
  const heureRef = rdv.statut === 'Confirmé' ? rdv.heure_confirmee : rdv.heure_souhaitee;
  const style = getCardStyle(rdv);
  const isPasse = dateRef ? isPast(new Date(dateRef + 'T23:59:59')) : false;
  const TypeIcon = TYPE_RDV_OPTIONS.find(t => t.val === rdv.type_rdv)?.icon || null;
  const titre = rdv.origine === 'Personnel' ? (rdv.titre || 'RDV personnel') : (rdv.motif || 'Rendez-vous');
  // Actions modifiables : seulement pour les RDV personnels (origine Personnel) confirmés
  const canEdit = rdv.origine === 'Personnel' && rdv.initie_par === 'Client';
  // Annulation : demande prestataire en attente initiée par le client
  const canCancelDemande = rdv.origine === 'Prestataire' && rdv.initie_par === 'Client' && rdv.statut === 'En attente';
  // Annulation avec motif : RDV prestataire confirmé
  const canCancelRdv = rdv.origine === 'Prestataire' && rdv.statut === 'Confirmé';
  // Jours proposés par l'admin
  const hasJoursProposes = rdv.jours_proposes && rdv.jours_proposes.length > 0;
  // Refus créneaux : quand des jours sont proposés et en attente
  const canRefusCreneaux = hasJoursProposes && rdv.statut === 'En attente' && onRefusCreneaux;

  return (
    <div className={`rounded-2xl border-2 p-3.5 space-y-2 ${isPasse ? 'opacity-60' : ''}`}
      style={{ borderColor: style.border, background: style.bg }}>
      <div className="flex items-start gap-3">
        <div className="flex-1 min-w-0">
          <p className="font-semibold text-sm leading-snug" style={{ color: '#1e1b4b' }}>{titre}</p>
          {dateRef && (
            <p className="text-xs mt-0.5" style={{ color: '#6b7280' }}>
              📅 {formatDateRdv(dateRef, heureRef)}
            </p>
          )}
          {rdv.lieu && (
            <p className="text-xs mt-0.5" style={{ color: '#6b7280' }}>📍 {rdv.lieu}</p>
          )}
          {rdv.notes_admin && (
            <p className="text-xs italic mt-0.5" style={{ color: '#6b7280' }}>💬 {rdv.notes_admin}</p>
          )}
        </div>
        <div className="flex flex-col items-end gap-1.5 shrink-0">
          <span className="text-[10px] font-semibold px-2 py-0.5 rounded-full border"
            style={{ background: style.bg, color: style.color, borderColor: style.border }}>
            {rdv.statut}
          </span>
          {canCancelDemande && onCancelDemande && (
            <button
              onClick={() => onCancelDemande(rdv)}
              className="w-7 h-7 flex items-center justify-center rounded-lg border transition-colors hover:bg-amber-50"
              style={{ borderColor: '#fde68a', color: '#b45309' }}
              title="Annuler ma demande">
              <X size={13} />
            </button>
          )}
        </div>
      </div>
      {/* Badges origine + type */}
      <div className="flex flex-wrap gap-1.5">
        {rdv.origine === 'Prestataire' && rdv.prestataire_nom ? (
          <span className="text-[10px] font-medium px-2 py-0.5 rounded-full"
            style={{ background: '#eef2ff', color: '#4338ca' }}>
            👤 {rdv.prestataire_nom}
          </span>
        ) : (
          <span className="text-[10px] font-medium px-2 py-0.5 rounded-full"
            style={{ background: '#f0fdf4', color: '#15803d' }}>
            🗒️ Personnel
          </span>
        )}
        {rdv.type_rdv && (
          <span className="text-[10px] font-medium px-2 py-0.5 rounded-full"
            style={{ background: '#f8faff', color: '#1d4ed8' }}>
            {rdv.type_rdv === 'Physique' ? '📍' : rdv.type_rdv === 'Visio' ? '💻' : '📞'} {rdv.type_rdv}
          </span>
        )}
        {rdv.initie_par === 'Admin' && (
          <span className="text-[10px] font-medium px-2 py-0.5 rounded-full"
            style={{ background: '#faf5ff', color: '#7c3aed' }}>
            Proposé par l'organisateur
          </span>
        )}
        {rdv.rappel_1j && (
          <span className="text-[10px] font-medium px-2 py-0.5 rounded-full flex items-center gap-0.5"
            style={{ background: '#fffbeb', color: '#b45309' }}>
            <Bell size={9} /> 1 jour
          </span>
        )}
        {rdv.rappel_1h && (
          <span className="text-[10px] font-medium px-2 py-0.5 rounded-full flex items-center gap-0.5"
            style={{ background: '#fff7ed', color: '#c2410c' }}>
            <Bell size={9} /> 1 heure
          </span>
        )}
      </div>

      {/* Boutons Modifier / Supprimer pour les notes personnelles */}
      {canEdit && onEdit && onDelete && (
        <div className="flex gap-2 pt-2 border-t" style={{ borderColor: style.border }}>
          <button
            onClick={() => onEdit(rdv)}
            className="flex-1 py-2 rounded-xl border text-xs font-semibold transition-colors flex items-center justify-center gap-1.5"
            style={{ borderColor: '#bfdbfe', color: '#1d4ed8', background: 'white' }}>
            <Pencil size={12} /> Modifier
          </button>
          <button
            onClick={() => onDelete(rdv)}
            className="flex-1 py-2 rounded-xl border text-xs font-semibold transition-colors flex items-center justify-center gap-1.5"
            style={{ borderColor: '#fecaca', color: '#dc2626', background: 'white' }}>
            <Trash2 size={12} /> Supprimer
          </button>
        </div>
      )}

      {/* Jours proposés par l'admin — le client choisit un jour puis un créneau */}
      {hasJoursProposes && rdv.statut === 'En attente' && onChooseCreneau && (
        <div className="space-y-1.5 pt-2 border-t" style={{ borderColor: style.border }}>
          <p className="text-xs font-semibold" style={{ color: '#b45309' }}>🕐 Jours proposés — choisissez le vôtre :</p>
          {rdv.jours_proposes.map((jp, i) => {
            const isExpanded = expandedJour === i;
            return (
              <div key={i} className="rounded-xl border-2 overflow-hidden"
                style={{ borderColor: isExpanded ? '#1d4ed8' : '#fde68a', background: isExpanded ? '#eff6ff' : 'white' }}>
                {/* Ligne repliée : date + bouton Voir */}
                <button
                  onClick={() => setExpandedJour(prev => prev === i ? null : i)}
                  disabled={choosingCreneau}
                  className="w-full flex items-center justify-between px-3 py-2 text-sm font-medium transition-colors disabled:opacity-50"
                  style={{ color: '#1e1b4b' }}>
                  <span>📅 {format(parseISO(jp.date), 'EEEE d MMMM yyyy', { locale: fr })}</span>
                  {isExpanded
                    ? <span className="text-xs font-semibold flex items-center gap-0.5" style={{ color: '#1d4ed8' }}>Replier <ChevronUp size={12} /></span>
                    : <span className="text-xs font-semibold flex items-center gap-0.5" style={{ color: '#b45309' }}>Voir <ChevronDown size={12} /></span>}
                </button>
                {/* Créneaux horaires dépliés */}
                {isExpanded && jp.creneaux && jp.creneaux.length > 0 && (
                  <div className="px-3 pb-3 space-y-1.5">
                    <p className="text-xs font-medium" style={{ color: '#6b7280' }}>Créneaux disponibles :</p>
                    <div className="flex flex-wrap gap-1.5">
                      {jp.creneaux.map(h => {
                        const isSelected = selectedCreneau && selectedCreneau.date === jp.date && selectedCreneau.heure === h;
                        return (
                          <button key={h}
                            onClick={() => setSelectedCreneau({ date: jp.date, heure: h })}
                            disabled={choosingCreneau}
                            className="px-3 py-1.5 rounded-xl border-2 text-xs font-semibold transition-colors disabled:opacity-50"
                            style={{
                              borderColor: isSelected ? '#1d4ed8' : '#fde68a',
                              background: isSelected ? '#1d4ed8' : 'white',
                              color: isSelected ? 'white' : '#b45309',
                            }}>
                            {h}
                          </button>
                        );
                      })}
                    </div>
                    {selectedCreneau && selectedCreneau.date === jp.date && (
                      <button
                        onClick={() => onChooseCreneau(rdv, selectedCreneau)}
                        disabled={choosingCreneau}
                        className="w-full flex items-center justify-center gap-2 py-2.5 rounded-xl text-white text-sm font-semibold transition-colors disabled:opacity-50"
                        style={{ background: '#1d4ed8' }}>
                        {choosingCreneau ? 'Confirmation…' : 'Confirmer ce créneau'}
                      </button>
                    )}
                  </div>
                )}
                {isExpanded && (!jp.creneaux || jp.creneaux.length === 0) && (
                  <div className="px-3 pb-3">
                    <p className="text-xs text-gray-400 italic">Aucun créneau horaire défini pour ce jour</p>
                  </div>
                )}
              </div>
            );
          })}
        </div>
      )}

      {/* Bouton "Aucun de ces créneaux ne me convient" — visible quand des jours sont proposés */}
      {canRefusCreneaux && !showRefusForm && (
        <button
          onClick={() => setShowRefusForm(true)}
          className="w-full py-2 rounded-xl border text-xs font-semibold transition-colors"
          style={{ borderColor: '#fde68a', color: '#b45309', background: 'white' }}>
          Aucun de ces créneaux ne me convient
        </button>
      )}

      {/* Formulaire de refus des créneaux */}
      {showRefusForm && (
        <div className="space-y-2 pt-2 pb-32 border-t" style={{ borderColor: style.border }}>
          <p className="text-xs font-semibold" style={{ color: '#b45309' }}>Aucun de ces créneaux ne me convient</p>
          <textarea
            value={refusMotif}
            onChange={e => setRefusMotif(e.target.value)}
            placeholder="Précisez ce qui ne convient pas (obligatoire)…"
            rows={2}
            style={{ fontSize: 15, borderColor: '#fde68a' }}
            className="w-full border rounded-xl px-3 py-2 text-sm focus:outline-none resize-none scroll-mb-32" />
          <div className="flex gap-2">
            <button onClick={() => { setShowRefusForm(false); setRefusMotif(''); }}
              className="flex-1 py-2 rounded-xl border text-sm font-medium text-gray-500" style={{ borderColor: '#e2e8f0' }}>
              Retour
            </button>
            <button onClick={async () => {
                await onRefusCreneaux(rdv, refusMotif.trim());
                setShowRefusForm(false);
                setRefusMotif('');
              }}
              disabled={!refusMotif.trim()}
              className="flex-1 py-2 rounded-xl text-white text-sm font-semibold disabled:opacity-40"
              style={{ background: '#b45309' }}>
              Confirmer
            </button>
          </div>
        </div>
      )}

      {/* Boutons Modifier / Annuler pour RDV prestataire confirmé */}
      {canCancelRdv && !showCancelForm && !showModifyForm && (
        <div className="flex gap-2 pt-2 border-t" style={{ borderColor: style.border }}>
          {onModifyRdv && (
            <button
              onClick={() => setShowModifyForm(true)}
              className="flex-1 py-2 rounded-xl border text-xs font-semibold transition-colors"
              style={{ borderColor: '#bfdbfe', color: '#1d4ed8', background: 'white' }}>
              Modifier
            </button>
          )}
          {onCancelRdv && (
            <button
              onClick={() => setShowCancelForm(true)}
              className="flex-1 py-2 rounded-xl border text-xs font-semibold transition-colors"
              style={{ borderColor: '#fecaca', color: '#dc2626', background: 'white' }}>
              Annuler
            </button>
          )}
        </div>
      )}
      {/* Formulaire modification */}
      {showModifyForm && (
        <div className="space-y-2 pt-2 pb-32 border-t" style={{ borderColor: style.border }}>
          <p className="text-xs font-semibold" style={{ color: '#1d4ed8' }}>Modifier ce rendez-vous</p>
          <textarea
            value={modifyMotif}
            onChange={e => setModifyMotif(e.target.value)}
            placeholder="Motif de la modification (obligatoire)… Ex : Empêchement, souhait de décaler"
            rows={2}
            style={{ fontSize: 15, borderColor: '#bfdbfe' }}
            className="w-full border rounded-xl px-3 py-2 text-sm focus:outline-none resize-none scroll-mb-32" />
          <div className="flex gap-2">
            <button onClick={() => { setShowModifyForm(false); setModifyMotif(''); }}
              className="flex-1 py-2 rounded-xl border text-sm font-medium text-gray-500" style={{ borderColor: '#e2e8f0' }}>
              Retour
            </button>
            <button onClick={async () => {
                await onModifyRdv(rdv, modifyMotif.trim());
                setShowModifyForm(false);
                setModifyMotif('');
              }}
              disabled={!modifyMotif.trim()}
              className="flex-1 py-2 rounded-xl text-white text-sm font-semibold disabled:opacity-40"
              style={{ background: '#1d4ed8' }}>
              Confirmer
            </button>
          </div>
        </div>
      )}
      {showCancelForm && (
        <div className="space-y-2 pt-2 pb-32 border-t" style={{ borderColor: style.border }}>
          <p className="text-xs font-semibold" style={{ color: '#dc2626' }}>Annuler ce rendez-vous</p>
          <textarea
            value={cancelMotif}
            onChange={e => setCancelMotif(e.target.value)}
            placeholder="Motif de l'annulation (obligatoire)…"
            rows={2}
            style={{ fontSize: 15, borderColor: '#fecaca' }}
            className="w-full border rounded-xl px-3 py-2 text-sm focus:outline-none resize-none scroll-mb-32" />
          <div className="flex gap-2">
            <button onClick={() => { setShowCancelForm(false); setCancelMotif(''); }}
              className="flex-1 py-2 rounded-xl border text-sm font-medium text-gray-500" style={{ borderColor: '#e2e8f0' }}>
              Retour
            </button>
            <button onClick={async () => {
                await onCancelRdv(rdv, cancelMotif.trim());
                setShowCancelForm(false);
                setCancelMotif('');
              }}
              disabled={!cancelMotif.trim()}
              className="flex-1 py-2 rounded-xl text-white text-sm font-semibold disabled:opacity-40"
              style={{ background: '#dc2626' }}>
              Confirmer l'annulation
            </button>
          </div>
        </div>
      )}
    </div>
  );
}

// ── Formulaire Voie 1 — Demande prestataire ────────────────────────────────────
function FormulairePrestataire({ evenementId, clientId, clientNom, evenementNom, prestataires, onSaved, onCancel }) {
  const qc = useQueryClient();
  const [selectedPrestataire, setSelectedPrestataire] = useState(null);
  const [showPrestList, setShowPrestList] = useState(false);
  const [typeRdv, setTypeRdv] = useState('Physique');
  const [motif, setMotif] = useState('');
  const [preferencesDispo, setPreferencesDispo] = useState('');

  const canSend = selectedPrestataire && motif.trim();

  const mutation = useMutation({
    mutationFn: async () => {
      await base44.entities.RendezVous.create({
        client_id: clientId,
        evenement_id: evenementId,
        client_nom: clientNom,
        evenement_nom: evenementNom,
        prestataire_id: selectedPrestataire.prestataire_id,
        prestataire_nom: selectedPrestataire.prestataire_nom,
        origine: 'Prestataire',
        type_rdv: typeRdv,
        motif: motif.trim(),
        preferences_dispo: preferencesDispo.trim() || null,
        statut: 'En attente',
        initie_par: 'Client',
      });
    },
    onSuccess: () => { qc.invalidateQueries(['rendezvous-agenda']); onSaved(); },
  });

  return (
    <div className="rounded-2xl border-2 p-4 pb-32 space-y-4" style={{ borderColor: '#dbeafe', background: '#eff6ff' }}>
      <p className="text-xs font-bold" style={{ color: '#1d4ed8' }}>📅 Demande à un prestataire</p>

      {/* Sélection prestataire */}
      <div className="space-y-1">
        <p className="text-xs font-medium text-gray-500">Prestataire *</p>
        <button
          onClick={() => setShowPrestList(v => !v)}
          className="w-full flex items-center justify-between border rounded-xl px-3 py-2.5 text-sm text-left"
          style={{ borderColor: '#e2e8f0', background: 'white' }}>
          <span style={{ color: selectedPrestataire ? '#1e1b4b' : '#9ca3af' }}>
            {selectedPrestataire ? selectedPrestataire.prestataire_nom : 'Choisir un prestataire…'}
          </span>
          {showPrestList ? <ChevronUp size={14} className="text-gray-400" /> : <ChevronDown size={14} className="text-gray-400" />}
        </button>
        {showPrestList && (
          <div className="border rounded-xl bg-white overflow-hidden shadow-lg" style={{ borderColor: '#e2e8f0' }}>
            {prestataires.length === 0 && (
              <p className="text-xs text-gray-400 p-3 text-center">Aucun prestataire associé à cet événement</p>
            )}
            {prestataires.map(p => (
              <button key={p.prestataire_id}
                onClick={() => { setSelectedPrestataire(p); setShowPrestList(false); }}
                className="w-full flex items-center justify-between px-4 py-2.5 hover:bg-blue-50 text-left">
                <span className="text-sm font-medium" style={{ color: '#1e1b4b' }}>{p.prestataire_nom}</span>
                <span className="text-[10px] px-1.5 py-0.5 rounded-full" style={{ background: '#eef2ff', color: '#4338ca' }}>
                  {p.statut}
                </span>
              </button>
            ))}
          </div>
        )}
      </div>

      {/* Type RDV */}
      <div className="space-y-1">
        <p className="text-xs font-medium text-gray-500">Type *</p>
        <div className="flex gap-2">
          {TYPE_RDV_OPTIONS.map(t => (
            <button key={t.val} onClick={() => setTypeRdv(t.val)}
              className="flex-1 py-2 rounded-xl text-xs font-semibold border-2 transition-colors"
              style={{
                borderColor: typeRdv === t.val ? t.color : '#e2e8f0',
                background: typeRdv === t.val ? t.color : 'white',
                color: typeRdv === t.val ? 'white' : '#6b7280',
              }}>
              {t.val}
            </button>
          ))}
        </div>
      </div>

      {/* Motif */}
      <div className="space-y-1">
        <p className="text-xs font-medium text-gray-500">Motif *</p>
        <input value={motif} onChange={e => setMotif(e.target.value)}
          placeholder="Ex : Finaliser le menu, visite des lieux…"
          style={{ fontSize: 16, borderColor: '#e2e8f0' }}
          className="w-full border rounded-xl px-3 py-2 text-sm focus:outline-none scroll-mb-32" />
      </div>

      {/* Préférences de disponibilité */}
      <div className="space-y-1">
        <p className="text-xs font-medium text-gray-500">Préférences de disponibilité (optionnel)</p>
        <input value={preferencesDispo} onChange={e => setPreferencesDispo(e.target.value)}
          placeholder="Ex : plutôt le matin, en semaine, après 18h"
          style={{ fontSize: 16, borderColor: '#e2e8f0' }}
          className="w-full border rounded-xl px-3 py-2 text-sm focus:outline-none scroll-mb-32" />
      </div>

      <div className="flex gap-2">
        <button onClick={onCancel} className="flex-1 py-2.5 rounded-xl border text-sm font-medium text-gray-500" style={{ borderColor: '#e2e8f0' }}>
          Annuler
        </button>
        <button onClick={() => mutation.mutate()} disabled={!canSend || mutation.isPending}
          className="flex-1 py-2.5 rounded-xl text-white text-sm font-semibold disabled:opacity-40"
          style={{ background: '#1d4ed8' }}>
          {mutation.isPending ? 'Envoi…' : 'Envoyer la demande'}
        </button>
      </div>
    </div>
  );
}

// ── Formulaire Voie 2 — Note personnelle ──────────────────────────────────────
function FormulairePersonnel({ evenementId, clientId, clientNom, evenementNom, rdvEdit, onSaved, onCancel, prefillDate }) {
  const qc = useQueryClient();
  const isEdit = !!rdvEdit;

  // Pré-remplir depuis rdvEdit si fourni, sinon depuis prefillDate (calendrier)
  const initialDate = isEdit ? (rdvEdit.date_confirmee || rdvEdit.date_souhaitee || '') : (prefillDate || '');
  const [titre, setTitre] = useState(isEdit ? (rdvEdit.titre || '') : '');
  const [j, setJ] = useState(initialDate ? initialDate.slice(8, 10) : '');
  const [m, setM] = useState(initialDate ? initialDate.slice(5, 7) : '');
  const [a, setA] = useState(initialDate ? initialDate.slice(0, 4) : '');
  const [heure, setHeure] = useState(isEdit ? (rdvEdit.heure_confirmee || rdvEdit.heure_souhaitee || '') : '');
  const [lieu, setLieu] = useState(isEdit ? (rdvEdit.lieu || '') : '');
  const [note, setNote] = useState(isEdit ? (rdvEdit.motif || '') : '');
  const [rappel1j, setRappel1j] = useState(isEdit ? !!rdvEdit.rappel_1j : false);
  const [rappel1h, setRappel1h] = useState(isEdit ? !!rdvEdit.rappel_1h : false);

  const dateStr = buildDate(j, m, a);
  const canSend = titre.trim() && dateStr;

  const mutation = useMutation({
    mutationFn: async () => {
      const payload = {
        origine: 'Personnel',
        titre: titre.trim(),
        date_souhaitee: dateStr,
        heure_souhaitee: heure,
        lieu: lieu.trim() || null,
        motif: note.trim() || null,
        statut: 'Confirmé',
        date_confirmee: dateStr,
        heure_confirmee: heure,
        initie_par: 'Client',
        rappel_1j: rappel1j,
        rappel_1h: rappel1h,
        // Réinitialiser les flags d'envoi si les rappels changent ou si la date change
        rappel_1j_envoye: isEdit && rdvEdit.rappel_1j === rappel1j && rdvEdit.date_confirmee === dateStr ? !!rdvEdit.rappel_1j_envoye : false,
        rappel_1h_envoye: isEdit && rdvEdit.rappel_1h === rappel1h && rdvEdit.date_confirmee === dateStr ? !!rdvEdit.rappel_1h_envoye : false,
      };
      if (isEdit) {
        await base44.entities.RendezVous.update(rdvEdit.id, payload);
      } else {
        await base44.entities.RendezVous.create({
          client_id: clientId,
          evenement_id: evenementId,
          client_nom: clientNom,
          evenement_nom: evenementNom,
          ...payload,
        });
      }
    },
    onSuccess: () => { qc.invalidateQueries(['rendezvous-agenda']); onSaved(); },
  });

  return (
    <div className="rounded-2xl border-2 p-4 pb-32 space-y-4" style={{ borderColor: '#bbf7d0', background: '#f0fdf4' }}>
      <p className="text-xs font-bold" style={{ color: '#15803d' }}>
        {isEdit ? '🗒️ Modifier la note personnelle' : '🗒️ Note personnelle'}
      </p>

      <div className="space-y-1">
        <p className="text-xs font-medium text-gray-500">Titre *</p>
        <input value={titre} onChange={e => setTitre(e.target.value)}
          placeholder="Ex : RDV mairie, essayage robe, rappel paiement acompte…"
          style={{ fontSize: 16, borderColor: '#e2e8f0' }}
          className="w-full border rounded-xl px-3 py-2 text-sm focus:outline-none scroll-mb-32" />
      </div>

      <DateSelects jour={j} mois={m} annee={a} label="Date *"
        onChange={(k, v) => { if (k === 'j') setJ(v); if (k === 'm') setM(v); if (k === 'a') setA(v); }} />

      <HeureSelect value={heure} onChange={setHeure} label="Heure" />

      <div className="space-y-1">
        <p className="text-xs font-medium text-gray-500">Lieu (optionnel)</p>
        <input value={lieu} onChange={e => setLieu(e.target.value)}
          placeholder="Ex : Mairie de Lyon, Domaine des Roses…"
          style={{ fontSize: 16, borderColor: '#e2e8f0' }}
          className="w-full border rounded-xl px-3 py-2 text-sm focus:outline-none scroll-mb-32" />
      </div>

      <div className="space-y-1">
        <p className="text-xs font-medium text-gray-500">Note (optionnelle)</p>
        <input value={note} onChange={e => setNote(e.target.value)}
          placeholder="Mémo libre…"
          style={{ fontSize: 16, borderColor: '#e2e8f0' }}
          className="w-full border rounded-xl px-3 py-2 text-sm focus:outline-none scroll-mb-32" />
      </div>

      <RappelCheckboxes
        rappel1j={rappel1j}
        rappel1h={rappel1h}
        onChange={({ rappel_1j, rappel_1h }) => { setRappel1j(rappel_1j); setRappel1h(rappel_1h); }}
      />

      <div className="flex gap-2">
        <button onClick={onCancel} className="flex-1 py-2.5 rounded-xl border text-sm font-medium text-gray-500" style={{ borderColor: '#e2e8f0' }}>
          Annuler
        </button>
        <button onClick={() => mutation.mutate()} disabled={!canSend || mutation.isPending}
          className="flex-1 py-2.5 rounded-xl text-white text-sm font-semibold disabled:opacity-40"
          style={{ background: '#15803d' }}>
          {mutation.isPending ? 'Enregistrement…' : isEdit ? 'Enregistrer' : 'Ajouter au calendrier'}
        </button>
      </div>
    </div>
  );
}

// ── Composant principal ────────────────────────────────────────────────────────
export default function MonAgenda({ evenementId, evenementNom, clientId, clientNom }) {
  const qc = useQueryClient();
  const [mode, setMode] = useState(null); // null | 'prestataire' | 'personnel'
  const [editRdv, setEditRdv] = useState(null); // RDV en cours d'édition
  const [viewMode, setViewMode] = useState('liste'); // 'liste' | 'calendrier'
  const [selectedCalendarDate, setSelectedCalendarDate] = useState(null); // 'yyyy-MM-dd' ou null

  // Mutation : client choisit un créneau proposé par l'admin
  const chooseCreneauMutation = useMutation({
    mutationFn: async ({ rdv, creneau }) => {
      await base44.entities.RendezVous.update(rdv.id, {
        statut: 'Confirmé',
        date_confirmee: creneau.date,
        heure_confirmee: creneau.heure || null,
        jours_proposes: [],
        motif_refus_creneaux: null,
        // Rappels automatiques pour les RDV prestataire confirmés
        rappel_1j: true,
        rappel_1h: true,
        rappel_1j_envoye: false,
        rappel_1h_envoye: false,
      });
    },
    onSuccess: () => qc.invalidateQueries(['rendezvous-agenda']),
  });

  // Mutation : suppression d'un RDV
  const deleteRdvMutation = useMutation({
    mutationFn: async (rdvId) => {
      await base44.entities.RendezVous.delete(rdvId);
    },
    onSuccess: () => qc.invalidateQueries(['rendezvous-agenda']),
  });

  // Mutation : annulation d'une demande prestataire (statut -> Annulé)
  // La notification admin est gérée par handleRdvChange backend (supprimée pour les annulations client)
  const cancelDemandeMutation = useMutation({
    mutationFn: async (rdv) => {
      await base44.entities.RendezVous.update(rdv.id, { statut: 'Annulé' });
    },
    onSuccess: () => qc.invalidateQueries(['rendezvous-agenda']),
  });

  // Mutation : annulation avec motif d'un RDV prestataire confirmé (marqué Annulé, pas de suppression physique)
  // Le RDV reste en base pour que le flux ICS émette STATUS:CANCELLED et que le calendrier externe le supprime.
  const cancelRdvMutation = useMutation({
    mutationFn: async ({ rdv, motif }) => {
      await base44.entities.RendezVous.update(rdv.id, {
        statut: 'Annulé',
        notes_admin: motif,
      });
      await base44.entities.Notification.create({
        titre: 'Rendez-vous annulé',
        message: `${rdv.client_nom || 'Le client'} a annulé le rendez-vous — Motif : ${motif}`,
        type: 'rendezvous',
        lu: false,
        lien: `/clients/${rdv.client_id}`,
      });
    },
    onSuccess: () => qc.invalidateQueries(['rendezvous-agenda']),
  });

  const handleCancelRdv = async (rdv, motif) => {
    await cancelRdvMutation.mutateAsync({ rdv, motif });
  };

  // Mutation : demande de modification d'un RDV prestataire confirmé (statut -> En attente + notification prestataire)
  // On garde date_confirmee intacte pour que le flux ICS continue d'afficher l'événement
  // jusqu'à ce qu'un nouveau créneau soit choisi et confirmé.
  const modifyRdvMutation = useMutation({
    mutationFn: async ({ rdv, motif }) => {
      await base44.entities.RendezVous.update(rdv.id, {
        statut: 'En attente',
        jours_proposes: [],
        motif_modification: motif,
      });
      await base44.entities.Notification.create({
        titre: 'Demande de modification',
        message: `${rdv.client_nom || 'Le client'} souhaite modifier le rendez-vous — Motif : ${motif}`,
        type: 'rendezvous',
        lu: false,
        lien: `/clients/${rdv.client_id}`,
      });
    },
    onSuccess: () => qc.invalidateQueries(['rendezvous-agenda']),
  });

  const handleModifyRdv = async (rdv, motif) => {
    await modifyRdvMutation.mutateAsync({ rdv, motif });
  };

  // Mutation : client refuse les jours proposés (statut reste En attente + notification admin)
  const refusCreneauxMutation = useMutation({
    mutationFn: async ({ rdv, motif }) => {
      await base44.entities.RendezVous.update(rdv.id, {
        jours_proposes: [],
        motif_refus_creneaux: motif,
        statut: 'En attente',
      });
      await base44.entities.Notification.create({
        titre: 'Créneaux refusés',
        message: `${rdv.client_nom || 'Le client'} a refusé les jours proposés — Motif : ${motif}`,
        type: 'rendezvous',
        lu: false,
        lien: `/clients/${rdv.client_id}`,
      });
    },
    onSuccess: () => qc.invalidateQueries(['rendezvous-agenda']),
  });

  const handleRefusCreneaux = async (rdv, motif) => {
    await refusCreneauxMutation.mutateAsync({ rdv, motif });
  };

  const handleCancelDemande = (rdv) => {
    if (window.confirm('Êtes-vous sûr de vouloir annuler cette demande ?')) {
      cancelDemandeMutation.mutate(rdv);
    }
  };

  const handleEdit = (rdv) => {
    setEditRdv(rdv);
    setMode('personnel');
  };

  const handleDelete = (rdv) => {
    if (window.confirm(`Supprimer définitivement « ${rdv.titre || rdv.motif || 'ce rendez-vous'} » ?`)) {
      deleteRdvMutation.mutate(rdv.id);
    }
  };

  const { data: rdvs = [], isLoading } = useQuery({
    queryKey: ['rendezvous-agenda', evenementId, clientId],
    queryFn: () => base44.entities.RendezVous.filter({ evenement_id: evenementId, client_id: clientId }),
    enabled: !!evenementId && !!clientId,
    staleTime: 30000,
  });

  const { data: epList = [] } = useQuery({
    queryKey: ['ep-agenda', evenementId],
    queryFn: () => base44.entities.EvenementPrestataire.filter({ evenement_id: evenementId }),
    enabled: !!evenementId,
    staleTime: 60000,
  });

  // Charger le client pour récupérer lien_client_token (token d'abonnement iCal)
  const { data: client } = useQuery({
    queryKey: ['client-agenda', clientId],
    queryFn: () => base44.entities.Client.get(clientId),
    enabled: !!clientId,
    staleTime: 300000,
  });

  // Tri chronologique : à venir d'abord, passés ensuite
  const rdvsTries = [...rdvs].sort((a, b) => {
    const dA = getDateRef(a) || '';
    const dB = getDateRef(b) || '';
    return dA.localeCompare(dB);
  });
  const aVenir = rdvsTries.filter(r => {
    if (r.statut === 'Annulé' || r.statut === 'Terminé') return false;
    const d = getDateRef(r);
    return d ? !isPast(new Date(d + 'T23:59:59')) : true;
  });

  if (isLoading) {
    return <div className="flex items-center justify-center py-10">
      <div className="w-6 h-6 border-2 border-blue-200 border-t-blue-600 rounded-full animate-spin" />
    </div>;
  }

  return (
    <div className="space-y-4 pb-6">
      <div className="flex items-center justify-between gap-3">
        <p className="text-sm text-gray-500">Vos rendez-vous et notes de calendrier</p>
        <IcsSubscriptionBlock token={client?.lien_client_token} clientNom={clientNom} />
      </div>

      {/* Toggle vue liste / calendrier */}
      {!mode && (
        <div className="flex gap-1 p-1 rounded-xl border" style={{ borderColor: '#e2e8f0', background: '#f8faff' }}>
          <button onClick={() => { setViewMode('liste'); setSelectedCalendarDate(null); }}
            className={`flex-1 flex items-center justify-center gap-1.5 py-2 rounded-lg text-xs font-semibold transition-colors ${viewMode === 'liste' ? 'bg-white shadow-sm' : ''}`}
            style={{ color: viewMode === 'liste' ? '#1d4ed8' : '#9ca3af' }}>
            <List size={14} /> Liste
          </button>
          <button onClick={() => setViewMode('calendrier')}
            className={`flex-1 flex items-center justify-center gap-1.5 py-2 rounded-lg text-xs font-semibold transition-colors ${viewMode === 'calendrier' ? 'bg-white shadow-sm' : ''}`}
            style={{ color: viewMode === 'calendrier' ? '#1d4ed8' : '#9ca3af' }}>
            <CalendarDays size={14} /> Calendrier
          </button>
        </div>
      )}

      {/* Boutons d'ajout */}
      {!mode && (
        <div className="flex gap-2">
          <div className="flex-1 flex flex-col">
            <button onClick={() => setMode('prestataire')}
              className="flex items-center justify-center gap-2 py-3 rounded-2xl text-sm font-semibold border-2 transition-colors"
              style={selectedCalendarDate
                ? { background: '#1d4ed8', borderColor: '#1d4ed8', color: 'white' }
                : { background: 'white', borderColor: '#1d4ed8', color: '#1d4ed8' }}>
              <Calendar size={15} /> Demander un RDV
            </button>
            <p className="text-[10px] text-gray-400 text-center mt-1">avec un prestataire</p>
          </div>
          <div className="flex-1 flex flex-col">
            <button onClick={() => setMode('personnel')}
              className="flex items-center justify-center gap-2 py-3 rounded-2xl text-sm font-semibold border-2 transition-colors"
              style={selectedCalendarDate
                ? { background: '#15803d', borderColor: '#15803d', color: 'white' }
                : { background: 'white', borderColor: '#15803d', color: '#15803d' }}>
              <Plus size={15} /> Ajouter une note
            </button>
            <p className="text-[10px] text-gray-400 text-center mt-1">Rappel personnel, RDV extérieur, mémo libre</p>
          </div>
        </div>
      )}

      {/* Formulaires */}
      {mode === 'prestataire' && (
        <FormulairePrestataire
          evenementId={evenementId} clientId={clientId}
          clientNom={clientNom} evenementNom={evenementNom}
          prestataires={epList}
          onSaved={() => { setMode(null); setSelectedCalendarDate(null); }}
          onCancel={() => { setMode(null); setSelectedCalendarDate(null); }}
        />
      )}
      {mode === 'personnel' && (
        <FormulairePersonnel
          evenementId={evenementId} clientId={clientId}
          clientNom={clientNom} evenementNom={evenementNom}
          rdvEdit={editRdv}
          prefillDate={selectedCalendarDate}
          onSaved={() => { setMode(null); setEditRdv(null); setSelectedCalendarDate(null); }}
          onCancel={() => { setMode(null); setEditRdv(null); setSelectedCalendarDate(null); }}
        />
      )}

      {/* Vue calendrier */}
      {!mode && viewMode === 'calendrier' && (
        <AgendaCalendar
          rdvs={rdvs}
          selectedDate={selectedCalendarDate}
          onDateSelect={(dateStr) => setSelectedCalendarDate(prev => prev === dateStr ? null : dateStr)}
        />
      )}

      {/* Vue liste — À venir uniquement */}
      {!mode && viewMode === 'liste' && aVenir.length > 0 && (
        <div className="space-y-2">
          <p className="text-[11px] font-bold uppercase tracking-widest" style={{ color: '#1e1b4b' }}>
            À venir · {aVenir.length}
          </p>
          {aVenir.map(r => (
            <RdvCard
              key={r.id}
              rdv={r}
              onChooseCreneau={(rdv, creneau) => chooseCreneauMutation.mutate({ rdv, creneau })}
              choosingCreneau={chooseCreneauMutation.isPending}
              onEdit={handleEdit}
              onDelete={handleDelete}
              onCancelDemande={handleCancelDemande}
              onCancelRdv={handleCancelRdv}
              onModifyRdv={handleModifyRdv}
              onRefusCreneaux={handleRefusCreneaux}
            />
          ))}
        </div>
      )}

      {rdvs.length === 0 && !mode && (
        <div className="text-center py-10 space-y-2">
          <span className="text-4xl">📅</span>
          <p className="text-sm font-semibold" style={{ color: '#1e1b4b' }}>Aucun rendez-vous pour l'instant</p>
          <p className="text-xs text-gray-400">Demandez un rendez-vous à un prestataire ou ajoutez une note personnelle.</p>
        </div>
      )}
    </div>
  );
}