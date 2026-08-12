import { useState } from 'react';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { base44 } from '@/api/base44Client';
import { CalendarCheck, Plus, X, Check, Trash2, ChevronDown, ChevronUp, Clock, Clock3 } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { format, parseISO } from 'date-fns';
import { fr } from 'date-fns/locale';
import CreneauxQuickPicker from './CreneauxQuickPicker';
import CalendarAddButton from '@/components/shared/CalendarAddButton';

const statutColors = {
  'En attente': 'bg-yellow-100 text-yellow-700',
  'Confirmé':   'bg-green-100 text-green-700',
  'Annulé':     'bg-red-100 text-red-700',
  'Terminé':    'bg-slate-100 text-slate-600',
};

const TYPE_RDV_OPTIONS = ['Physique', 'Visio', 'Téléphonique'];

const JOURS  = Array.from({ length: 31 }, (_, i) => String(i + 1).padStart(2, '0'));
const MOIS   = [
  { v: '01', l: 'Janvier' }, { v: '02', l: 'Février' }, { v: '03', l: 'Mars' },
  { v: '04', l: 'Avril' },   { v: '05', l: 'Mai' },     { v: '06', l: 'Juin' },
  { v: '07', l: 'Juillet' }, { v: '08', l: 'Août' },    { v: '09', l: 'Septembre' },
  { v: '10', l: 'Octobre' }, { v: '11', l: 'Novembre' }, { v: '12', l: 'Décembre' },
];
const ANNEES = Array.from({ length: 5 }, (_, i) => String(new Date().getFullYear() + i));
const HEURES = Array.from({ length: 24 }, (_, i) => `${String(i).padStart(2, '0')}:00`);

function buildDate(j, m, a) {
  if (!j || !m || !a) return '';
  return `${a}-${m}-${j}`;
}

// ── Sélecteur 3 selects (jour/mois/année) ─────────────────────────────────────
function DateSelects({ jour, mois, annee, onChange }) {
  return (
    <div className="grid grid-cols-3 gap-2">
      <select value={jour} onChange={e => onChange('j', e.target.value)}
        className="border rounded-lg px-2 py-1.5 text-xs focus:outline-none" style={{ borderColor: '#e2e8f0' }}>
        <option value="">Jour</option>
        {JOURS.map(j => <option key={j} value={j}>{parseInt(j)}</option>)}
      </select>
      <select value={mois} onChange={e => onChange('m', e.target.value)}
        className="border rounded-lg px-2 py-1.5 text-xs focus:outline-none" style={{ borderColor: '#e2e8f0' }}>
        <option value="">Mois</option>
        {MOIS.map(m => <option key={m.v} value={m.v}>{m.l}</option>)}
      </select>
      <select value={annee} onChange={e => onChange('a', e.target.value)}
        className="border rounded-lg px-2 py-1.5 text-xs focus:outline-none" style={{ borderColor: '#e2e8f0' }}>
        <option value="">Année</option>
        {ANNEES.map(a => <option key={a} value={a}>{a}</option>)}
      </select>
    </div>
  );
}

// ── Helpers notifications ──────────────────────────────────────────────────────

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

// ── Composant principal ────────────────────────────────────────────────────────

export default function RendezVousSection({ clientId, evenementId, evenementNom, clientNom, isAdmin = false }) {
  const qc = useQueryClient();

  // Formulaire admin (proposition directe — Voie 2 admin, statut Confirmé)
  const [showAdminForm, setShowAdminForm] = useState(false);
  const [adminForm, setAdminForm] = useState({ date_souhaitee: '', heure_souhaitee: '10:00', motif: '', type_rdv: 'Physique' });
  const setA = (k, v) => setAdminForm(f => ({ ...f, [k]: v }));

  // Réponse admin à une demande client (jours + créneaux)
  const [respondingId, setRespondingId] = useState(null);
  const [joursProposes, setJoursProposes] = useState([]); // [{ date: {j,m,a}, creneaux: [string] }]
  const [notesAdmin, setNotesAdmin] = useState('');
  const [quickPickerJourIdx, setQuickPickerJourIdx] = useState(null);

  const { data: rdvs = [] } = useQuery({
    queryKey: ['rendezvous', clientId, evenementId],
    queryFn: () => base44.entities.RendezVous.filter({ client_id: clientId }),
  });

  // ── Mutation création côté ADMIN (proposition directe) ──────────────────────
  const createAdminMutation = useMutation({
    mutationFn: async () => {
      const rdv = await base44.entities.RendezVous.create({
        ...adminForm,
        date_confirmee: adminForm.date_souhaitee,
        heure_confirmee: adminForm.heure_souhaitee,
        client_id: clientId,
        evenement_id: evenementId,
        client_nom: clientNom,
        evenement_nom: evenementNom,
        statut: 'Confirmé',
        initie_par: 'Admin',
      });
      const dateLabel = adminForm.date_souhaitee
        ? format(parseISO(adminForm.date_souhaitee), 'd MMM yyyy', { locale: fr })
        : '';
      const msg = `Un rendez-vous vous est proposé le ${dateLabel} à ${adminForm.heure_souhaitee} (${adminForm.type_rdv}).`;
      await notifierClientViaConversation({ clientId, evenementId, clientNom, evenementNom: evenementNom || '', message: msg });
      return rdv;
    },
    onSuccess: () => {
      qc.invalidateQueries(['rendezvous']);
      setAdminForm({ date_souhaitee: '', heure_souhaitee: '10:00', motif: '', type_rdv: 'Physique' });
      setShowAdminForm(false);
    },
  });

  // ── Mutation : admin propose des jours + créneaux (réponse à une demande client) ────
  const proposeCreneauxMutation = useMutation({
    mutationFn: async ({ rdvId }) => {
      const joursFormatte = joursProposes
        .filter(j => buildDate(j.date.j, j.date.m, j.date.a) && j.creneaux.length > 0)
        .map(j => ({ date: buildDate(j.date.j, j.date.m, j.date.a), creneaux: j.creneaux }));
      await base44.entities.RendezVous.update(rdvId, {
        jours_proposes: joursFormatte,
        notes_admin: notesAdmin.trim() || null,
        statut: 'En attente',
        motif_refus_creneaux: null,
      });
      const msg = `${joursFormatte.length} jour${joursFormatte.length > 1 ? 's' : ''} proposé${joursFormatte.length > 1 ? 's' : ''} avec créneaux. Choisissez celui qui vous convient.`;
      await notifierClientViaConversation({ clientId, evenementId, clientNom, evenementNom: evenementNom || '', message: msg });
    },
    onSuccess: () => {
      qc.invalidateQueries(['rendezvous']);
      setRespondingId(null);
      setJoursProposes([]);
      setNotesAdmin('');
    },
  });

  // ── Mutation refus admin ──────────────────────────────────────────────────────
  const refuseMutation = useMutation({
    mutationFn: async ({ rdvId, note }) => {
      await base44.entities.RendezVous.update(rdvId, { statut: 'Annulé', notes_admin: note || null });
      const msg = `Votre demande de rendez-vous a été déclinée${note ? ` : ${note}` : ''}.`;
      await notifierClientViaConversation({ clientId, evenementId, clientNom, evenementNom: evenementNom || '', message: msg });
    },
    onSuccess: () => qc.invalidateQueries(['rendezvous']),
  });

  // ── Helpers gestion jours/créneaux ──────────────────────────────────────────
  const addJour = () => setJoursProposes(prev => [...prev, { date: { j: '', m: '', a: '' }, creneaux: [] }]);
  const updateJourDate = (idx, key, val) => setJoursProposes(prev => prev.map((x, i) => i === idx ? { ...x, date: { ...x.date, [key]: val } } : x));
  const addCreneauToJour = (idx, heure) => setJoursProposes(prev => prev.map((x, i) => i === idx ? { ...x, creneaux: [...new Set([...x.creneaux, heure])] } : x));
  const removeCreneauFromJour = (idx, heure) => setJoursProposes(prev => prev.map((x, i) => i === idx ? { ...x, creneaux: x.creneaux.filter(h => h !== heure) } : x));
  const removeJour = (idx) => setJoursProposes(prev => prev.filter((_, i) => i !== idx));
  const addMultipleCreneauxToJour = (idx, creneauxList) => setJoursProposes(prev => prev.map((x, i) => i === idx ? { ...x, creneaux: creneauxList } : x));

  const openResponse = (rdv) => {
    setRespondingId(rdv.id);
    setJoursProposes([{ date: { j: '', m: '', a: '' }, creneaux: [] }]);
    setNotesAdmin('');
  };

  // Vérifie que chaque jour a une date et au moins un créneau
  const canSubmitJours = joursProposes.length > 0 && joursProposes.every(j => buildDate(j.date.j, j.date.m, j.date.a) && j.creneaux.length > 0);

  return (
    <div className="bg-card rounded-2xl border border-border p-5">
      {/* Header */}
      <div className="flex items-center justify-between mb-4">
        <h3 className="font-semibold text-base flex items-center gap-2">
          <CalendarCheck size={18} className="text-primary" /> Rendez-vous
        </h3>
        {isAdmin && (
          <Button size="sm" variant="outline" className="gap-1.5 text-xs" onClick={() => setShowAdminForm(v => !v)}>
            {showAdminForm ? <X size={13} /> : <Plus size={13} />}
            {showAdminForm ? 'Annuler' : 'Proposer un RDV'}
          </Button>
        )}
      </div>

      {/* Formulaire admin — proposition directe (inchangé) */}
      {showAdminForm && isAdmin && (
        <div className="bg-emerald-50 rounded-xl p-4 mb-4 space-y-3 border border-emerald-200">
          <p className="text-xs font-semibold text-emerald-700">Proposer un rendez-vous au client</p>
          <div className="space-y-1.5">
            <Label className="text-xs">Type de rendez-vous</Label>
            <div className="flex gap-2">
              {TYPE_RDV_OPTIONS.map(t => (
                <button key={t} onClick={() => setA('type_rdv', t)}
                  className={`flex-1 py-1.5 rounded-lg text-xs font-medium border transition-colors ${adminForm.type_rdv === t ? 'bg-emerald-600 text-white border-emerald-600' : 'border-border text-muted-foreground hover:bg-muted'}`}>
                  {t}
                </button>
              ))}
            </div>
          </div>
          <div className="grid grid-cols-2 gap-3">
            <div className="space-y-1.5">
              <Label className="text-xs">Date proposée *</Label>
              <Input type="date" value={adminForm.date_souhaitee} onChange={e => setA('date_souhaitee', e.target.value)} />
            </div>
            <div className="space-y-1.5">
              <Label className="text-xs">Heure proposée</Label>
              <Input type="time" value={adminForm.heure_souhaitee} onChange={e => setA('heure_souhaitee', e.target.value)} />
            </div>
          </div>
          <div className="space-y-1.5">
            <Label className="text-xs">Message / motif *</Label>
            <Input value={adminForm.motif} onChange={e => setA('motif', e.target.value)} placeholder="Ex: Point sur la prestation, remise de documents..." />
          </div>
          <Button size="sm" className="w-full bg-emerald-600 hover:bg-emerald-700" onClick={() => createAdminMutation.mutate()}
            disabled={!adminForm.date_souhaitee || !adminForm.motif || createAdminMutation.isPending}>
            {createAdminMutation.isPending ? 'Envoi...' : 'Proposer ce rendez-vous'}
          </Button>
        </div>
      )}

      {rdvs.length === 0 && (
        <p className="text-sm text-muted-foreground text-center py-4">
          Aucun rendez-vous planifié.
        </p>
      )}

      <div className="space-y-2">
        {rdvs.map(rdv => {
          const isModification = rdv.statut === 'En attente' && !!rdv.date_confirmee;
          return (
          <div key={rdv.id} className="p-3 rounded-xl border border-border bg-muted/20 space-y-2">
            <div className="flex items-start gap-3">
              <div className="flex-1">
                <div className="flex items-center gap-2 flex-wrap">
                  <p className="font-medium text-sm">{rdv.motif || rdv.titre}</p>
                  {rdv.type_rdv && (
                    <span className="text-[10px] px-1.5 py-0.5 rounded-full bg-blue-50 text-blue-600 font-medium">{rdv.type_rdv}</span>
                  )}
                  {rdv.prestataire_nom && (
                    <span className="text-[10px] px-1.5 py-0.5 rounded-full bg-indigo-50 text-indigo-600 font-medium">👤 {rdv.prestataire_nom}</span>
                  )}
                  {rdv.initie_par === 'Admin' && (
                    <span className="text-[10px] px-1.5 py-0.5 rounded-full bg-purple-50 text-purple-600 font-medium">Proposé par l'organisateur</span>
                  )}
                </div>
                {/* Préférences de disponibilité du client (indicatif) */}
                {rdv.preferences_dispo && (
                  <p className="text-xs italic mt-0.5 flex items-center gap-1" style={{ color: '#6366f1' }}>
                    <Clock3 size={11} className="shrink-0" /> {rdv.preferences_dispo}
                  </p>
                )}
                {/* Date souhaitée — uniquement pour Voie 2 (note perso) ou proposition directe admin */}
                {rdv.date_souhaitee && !isModification && (
                  <p className="text-xs text-muted-foreground mt-0.5">
                    {rdv.initie_par === 'Admin' ? 'Proposé' : 'Souhaité'} le {format(parseISO(rdv.date_souhaitee), 'd MMM yyyy', { locale: fr })} à {rdv.heure_souhaitee}
                  </p>
                )}
                {/* Jours proposés par l'admin (réponse à demande client) */}
                {rdv.jours_proposes && rdv.jours_proposes.length > 0 && (
                  <div className="mt-2 space-y-1">
                    <p className="text-xs font-medium text-amber-700">Jours proposés :</p>
                    {rdv.jours_proposes.map((jp, i) => (
                      <p key={i} className="text-xs text-muted-foreground">
                        • {format(parseISO(jp.date), 'd MMM yyyy', { locale: fr })}
                        {jp.creneaux && jp.creneaux.length > 0 ? ` à ${jp.creneaux.join(', ')}` : ''}
                      </p>
                    ))}
                  </div>
                )}
                {/* Bandeau demande de modification — remplace le texte vert de confirmation */}
                {isModification && (
                  <div className="mt-1.5 rounded-lg border border-amber-300 bg-amber-50 px-2.5 py-1.5 space-y-0.5">
                    <p className="text-xs font-semibold text-amber-700">🔄 Demande de modification</p>
                    <p className="text-xs text-gray-400 line-through">
                      📅 Ancien créneau : {format(parseISO(rdv.date_confirmee), 'd MMM yyyy', { locale: fr })} à {rdv.heure_confirmee}
                    </p>
                    {rdv.motif_modification && (
                      <p className="text-xs italic text-amber-700">Motif : {rdv.motif_modification}</p>
                    )}
                  </div>
                )}
                {/* Bandeau jours refusés par le client */}
                {rdv.motif_refus_creneaux && (
                  <div className="mt-1.5 rounded-lg border border-amber-300 bg-amber-50 px-2.5 py-1.5 space-y-0.5">
                    <p className="text-xs font-semibold text-amber-700">🔄 Le client a refusé les jours proposés</p>
                    <p className="text-xs italic text-amber-700">Motif : {rdv.motif_refus_creneaux}</p>
                  </div>
                )}
                {/* Date confirmée — masquée si demande de modification en cours */}
                {rdv.date_confirmee && !isModification && (
                  <div className="mt-0.5 space-y-1.5">
                    <p className="text-xs text-green-700">
                      ✅ Confirmé le {format(parseISO(rdv.date_confirmee), 'd MMM yyyy', { locale: fr })} à {rdv.heure_confirmee}
                    </p>
                    {rdv.statut === 'Confirmé' && (
                      <CalendarAddButton
                        titre={rdv.motif || rdv.titre || 'Rendez-vous'}
                        dateDebut={rdv.date_confirmee}
                        heureDebut={rdv.heure_confirmee || null}
                        lieu={rdv.lieu || null}
                        description={[
                          rdv.type_rdv ? `Type : ${rdv.type_rdv}` : null,
                          rdv.prestataire_nom ? `Avec : ${rdv.prestataire_nom}` : null,
                        ].filter(Boolean).join('\n') || null}
                        compact
                      />
                    )}
                  </div>
                )}
                {rdv.notes_admin && (
                  <p className="text-xs text-muted-foreground italic mt-0.5">💬 {rdv.notes_admin}</p>
                )}
              </div>
              <span className={`text-[10px] px-2 py-0.5 rounded-full font-medium shrink-0 ${statutColors[rdv.statut]}`}>
                {rdv.statut}
              </span>
            </div>

            {/* Actions admin sur demandes client en attente (Voie 1) */}
            {isAdmin && rdv.statut === 'En attente' && rdv.initie_par !== 'Admin' && (
              respondingId === rdv.id ? (
                <div className="space-y-3 border-t border-border pt-3 pb-32">
                  <p className="text-xs font-semibold text-primary">Proposer des disponibilités au client</p>
                  {joursProposes.map((jp, idx) => (
                    <div key={idx} className="space-y-2 p-2.5 rounded-lg bg-muted/30 border border-border">
                      <div className="flex items-center justify-between">
                        <span className="text-[10px] font-medium text-muted-foreground">Jour {idx + 1}</span>
                        <button onClick={() => removeJour(idx)} className="text-destructive hover:text-destructive/80">
                          <Trash2 size={12} />
                        </button>
                      </div>
                      <DateSelects jour={jp.date.j} mois={jp.date.m} annee={jp.date.a}
                        onChange={(k, v) => updateJourDate(idx, k, v)} />
                      {/* Créneaux ajoutés pour ce jour */}
                      {jp.creneaux.length > 0 && (
                        <div className="flex flex-wrap gap-1.5">
                          {jp.creneaux.map(h => (
                            <span key={h} className="inline-flex items-center gap-1 text-[10px] px-2 py-0.5 rounded-full bg-amber-100 text-amber-700 font-medium">
                              {h}
                              <button onClick={() => removeCreneauFromJour(idx, h)} className="hover:text-destructive">
                                <X size={9} />
                              </button>
                            </span>
                          ))}
                        </div>
                      )}
                      {/* Créneaux horaires — bouton unique qui ouvre la grille rapide */}
                      <Button size="sm" variant="secondary" className="w-full gap-1 text-xs"
                        onClick={() => setQuickPickerJourIdx(idx)}>
                        <Clock size={12} /> Créneaux horaires
                      </Button>
                    </div>
                  ))}
                  <Button size="sm" variant="outline" className="w-full gap-1 text-xs" onClick={addJour}>
                    <Plus size={12} /> Ajouter un jour disponible
                  </Button>
                  <Input placeholder="Note (optionnelle)" value={notesAdmin} onChange={e => setNotesAdmin(e.target.value)} className="scroll-mb-32" />
                  <div className="flex gap-2">
                    <Button size="sm" className="flex-1 gap-1"
                      onClick={() => proposeCreneauxMutation.mutate({ rdvId: rdv.id })}
                      disabled={!canSubmitJours || proposeCreneauxMutation.isPending}>
                      <Check size={12} /> {proposeCreneauxMutation.isPending ? 'Envoi...' : 'Envoyer les disponibilités'}
                    </Button>
                    <Button size="sm" variant="outline" onClick={() => setRespondingId(null)}>Annuler</Button>
                  </div>
                </div>
              ) : (
                <div className="flex gap-2 border-t border-border pt-2">
                  <Button size="sm" variant="outline" className="gap-1 text-xs" onClick={() => openResponse(rdv)}>
                    <Check size={11} /> Proposer des créneaux
                  </Button>
                  <Button size="sm" variant="outline" className="text-xs text-destructive hover:text-destructive"
                    onClick={() => {
                      const note = window.prompt('Motif du refus (optionnel) :') || '';
                      refuseMutation.mutate({ rdvId: rdv.id, note });
                    }}>
                    Refuser
                  </Button>
                </div>
              )
            )}
          </div>
          );
        })}
      </div>

      {/* Modal grille rapide multi-créneaux */}
      <CreneauxQuickPicker
        open={quickPickerJourIdx !== null}
        existingCreneaux={quickPickerJourIdx !== null ? (joursProposes[quickPickerJourIdx]?.creneaux || []) : []}
        onAdd={(creneauxList) => {
          if (quickPickerJourIdx !== null) addMultipleCreneauxToJour(quickPickerJourIdx, creneauxList);
          setQuickPickerJourIdx(null);
        }}
        onClose={() => setQuickPickerJourIdx(null)}
      />
    </div>
  );
}