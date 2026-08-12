import { useState, useEffect } from 'react';
import { base44 } from '@/api/base44Client';
import { CalendarPlus, Check } from 'lucide-react';
import { Input } from '@/components/ui/input';
import { Button } from '@/components/ui/button';
import CalendarAddButton from '@/components/shared/CalendarAddButton';

const FLEXIBILITES = ['Date fixe', 'Flexible sur la semaine', 'Flexible sur le mois'];

function fmtDate(iso) {
  return new Date(iso).toLocaleDateString('fr-FR', { weekday: 'long', day: 'numeric', month: 'long', year: 'numeric' });
}

const STATUS_COLORS = {
  'En attente': 'text-amber-600 bg-amber-50',
  'Répondu':    'text-blue-600 bg-blue-50',
  'Confirmée':  'text-emerald-600 bg-emerald-50',
  'Refusée':    'text-red-600 bg-red-50',
};

// ─── Sous-composant : choisir une date parmi les disponibilités/alternatives ──
function ChoixDateProspect({ demande, prospectId, prospectNom, prospect, onConfirmed }) {
  const [dateChoisie, setDateChoisie] = useState('');
  const [loading, setLoading] = useState(false);
  const [confirme, setConfirme] = useState(false);

  const toutesLesDates = [
    ...(demande.dates_disponibles || []),
    ...(demande.dates_alternatives || []),
  ];

  if (toutesLesDates.length === 0) return null;

  const handleConfirmer = async () => {
    if (!dateChoisie) return;
    setLoading(true);
    await base44.entities.ProspectDateDemande.update(demande.id, {
      date_confirmee: dateChoisie,
      statut: 'Confirmée',
    });
    await base44.entities.Prospect.update(prospectId, {
      date_evenement_souhaitee: dateChoisie,
      date_type: 'exacte',
    });
    // Notifier l'admin
    await base44.functions.invoke('createNotification', {
      titre: `📅 Date confirmée par ${prospectNom || 'le prospect'}`,
      message: `Date choisie : ${fmtDate(dateChoisie)}`,
      type: 'info',
      lien: '/Clients?tab=prospects',
    });
    setLoading(false);
    setConfirme(true);
    onConfirmed();
  };

  if (confirme) {
    return (
      <div className="mt-2 space-y-2">
        <div className="flex items-center gap-2 text-sm text-emerald-700 bg-emerald-50 rounded-lg px-3 py-2 border border-emerald-200">
          <Check size={14} /> Date confirmée : {fmtDate(dateChoisie)}
        </div>
        <CalendarAddButton
          titre={`${prospect?.prenom || ''} ${prospect?.nom || ''}${prospect?.type_evenement ? ' — ' + prospect.type_evenement : ''}`.trim()}
          dateDebut={dateChoisie}
          lieu={prospect?.lieu_nom || null}
          allDay
          compact
        />
      </div>
    );
  }

  return (
    <div className="mt-2 space-y-2 bg-blue-50 border border-blue-200 rounded-xl p-3">
      <p className="text-xs font-semibold text-blue-800">📅 Choisissez votre date parmi les disponibilités :</p>
      <div className="space-y-1">
        {toutesLesDates.map(date => {
          const isAlt = (demande.dates_disponibles || []).indexOf(date) === -1;
          return (
            <label key={date} className={`flex items-center gap-2 cursor-pointer px-3 py-2 rounded-lg border transition-colors ${
              dateChoisie === date ? 'border-primary bg-primary/5' : 'border-border bg-white hover:bg-muted/40'
            }`}>
              <input
                type="radio"
                name={`choix-date-${demande.id}`}
                value={date}
                checked={dateChoisie === date}
                onChange={() => setDateChoisie(date)}
                className="accent-primary"
              />
              <span className={`text-xs ${dateChoisie === date ? 'font-semibold' : ''}`}>
                {fmtDate(date)}
                {isAlt && <span className="ml-1.5 text-[10px] text-blue-500 font-medium">(alternative)</span>}
              </span>
            </label>
          );
        })}
      </div>
      <Button
        size="sm"
        className="w-full gap-1 text-xs h-8"
        disabled={!dateChoisie || loading}
        onClick={handleConfirmer}
      >
        <Check size={12} /> Confirmer mon choix
      </Button>
    </div>
  );
}

// ─── Composant principal ──────────────────────────────────────────────────────
export default function ProspectDateDemande({ prospectId, prospectNom, prospect = null }) {
  const [demandes, setDemandes] = useState([]);
  const [showForm, setShowForm] = useState(false);
  const [sent, setSent] = useState(false);
  const [form, setForm] = useState({
    dates_proposees: [''],
    flexibilite: 'Date fixe',
    message: '',
  });

  const load = async () => {
    const res = await base44.entities.ProspectDateDemande.filter({ prospect_id: prospectId }, '-created_date', 10);
    setDemandes(res);
  };

  useEffect(() => { load(); }, [prospectId]);

  const addDate = () => setForm(f => ({ ...f, dates_proposees: [...f.dates_proposees, ''] }));
  const setDate = (i, v) => setForm(f => ({ ...f, dates_proposees: f.dates_proposees.map((d, idx) => idx === i ? v : d) }));
  const removeDate = (i) => setForm(f => ({ ...f, dates_proposees: f.dates_proposees.filter((_, idx) => idx !== i) }));

  const handleSend = async () => {
    const datesValides = form.dates_proposees.filter(d => d.trim());
    if (!datesValides.length) return;
    await base44.entities.ProspectDateDemande.create({
      prospect_id: prospectId,
      dates_proposees: datesValides,
      flexibilite: form.flexibilite,
      message: form.message.trim() || null,
      statut: 'En attente',
    });
    const datesStr = datesValides.map(d => new Date(d).toLocaleDateString('fr-FR')).join(', ');
    await base44.functions.invoke('createNotification', {
      titre: `📅 Demande de date de ${prospectNom || 'un prospect'}`,
      message: `Dates souhaitées : ${datesStr}`,
      type: 'info',
      lien: '/Clients?tab=prospects',
    });
    setSent(true);
    setShowForm(false);
    load();
  };

  return (
    <div className="pt-4 space-y-3">
      {sent && !showForm && (
        <div className="flex items-center gap-2 text-sm text-emerald-700 bg-emerald-50 rounded-xl px-4 py-3 border border-emerald-200">
          <Check size={14} /> Votre demande a bien été envoyée !
        </div>
      )}

      {/* Demandes existantes */}
      {demandes.map(d => (
        <div key={d.id} className="bg-muted/30 rounded-xl p-3 border border-border text-xs space-y-1">
          <div className="flex items-center justify-between">
            <p className="font-semibold text-sm">Demande de date</p>
            <span className={`text-xs px-2 py-0.5 rounded-full font-medium ${STATUS_COLORS[d.statut] || ''}`}>{d.statut}</span>
          </div>
          {(d.dates_proposees || []).length > 0 && (
            <div>
              <p className="text-muted-foreground mb-0.5">📅 Vos dates souhaitées :</p>
              {d.dates_proposees.map(date => (
                <p key={date} className="pl-3 text-foreground/80">{fmtDate(date)}</p>
              ))}
            </div>
          )}
          {d.flexibilite && <p className="text-muted-foreground">Flexibilité : {d.flexibilite}</p>}
          {d.message && <p className="italic text-foreground/70">"{d.message}"</p>}

          {/* Réponse admin affichée textuellement */}
          {d.reponse_admin && (
            <div className="mt-1 bg-primary/5 border border-primary/20 rounded-lg px-3 py-2">
              <p className="text-[11px] font-semibold text-primary mb-0.5">Message de l'organisateur :</p>
              <p className="text-xs">{d.reponse_admin}</p>
            </div>
          )}

          {/* Date déjà confirmée */}
          {d.date_confirmee && (
            <div className="flex items-center gap-2 text-xs text-emerald-700 bg-emerald-50 rounded-lg px-3 py-2 border border-emerald-200">
              <Check size={12} /> Date confirmée : {fmtDate(d.date_confirmee)}
            </div>
          )}

          {/* Choix du prospect si statut Répondu et pas encore confirmé */}
          {d.statut === 'Répondu' && !d.date_confirmee && (
            <ChoixDateProspect
              demande={d}
              prospectId={prospectId}
              prospectNom={prospectNom}
              prospect={prospect}
              onConfirmed={load}
            />
          )}
        </div>
      ))}

      {/* Formulaire nouvelle demande */}
      {showForm ? (
        <div className="bg-muted/30 rounded-xl p-4 border border-border space-y-3">
          <p className="text-sm font-semibold">Proposer une ou plusieurs dates</p>

          <div className="space-y-2">
            {form.dates_proposees.map((d, i) => (
              <div key={i} className="flex gap-2">
                <Input type="date" value={d} onChange={e => setDate(i, e.target.value)} className="flex-1" />
                {form.dates_proposees.length > 1 && (
                  <button onClick={() => removeDate(i)} className="text-muted-foreground hover:text-red-500 text-xs px-2">✕</button>
                )}
              </div>
            ))}
            <button onClick={addDate} className="text-xs text-primary hover:text-primary/80 font-medium">+ Ajouter une date</button>
          </div>

          <div>
            <label className="text-xs font-medium text-muted-foreground mb-1 block">Flexibilité</label>
            <div className="flex flex-wrap gap-1.5">
              {FLEXIBILITES.map(f => (
                <button
                  key={f}
                  onClick={() => setForm(prev => ({ ...prev, flexibilite: f }))}
                  className={`text-xs px-3 py-1 rounded-full border font-medium transition-colors ${form.flexibilite === f ? 'bg-primary text-primary-foreground border-primary' : 'bg-card border-border text-muted-foreground hover:bg-muted'}`}
                >
                  {f}
                </button>
              ))}
            </div>
          </div>

          <div>
            <label className="text-xs font-medium text-muted-foreground mb-1 block">Message (optionnel)</label>
            <textarea
              value={form.message}
              onChange={e => setForm(f => ({ ...f, message: e.target.value }))}
              rows={2}
              placeholder="Précisez vos contraintes ou préférences…"
              className="flex w-full rounded-md border border-input bg-transparent px-3 py-2 text-sm resize-none focus-visible:outline-none focus-visible:ring-1 focus-visible:ring-ring placeholder:text-muted-foreground"
            />
          </div>

          <div className="flex gap-2 justify-end">
            <Button variant="outline" size="sm" onClick={() => setShowForm(false)}>Annuler</Button>
            <Button size="sm" onClick={handleSend} disabled={!form.dates_proposees.some(d => d.trim())}>
              Envoyer la demande
            </Button>
          </div>
        </div>
      ) : (
        <button
          onClick={() => setShowForm(true)}
          className="w-full flex items-center justify-center gap-2 py-3 rounded-xl border-2 border-dashed border-primary/30 text-primary text-sm font-medium hover:bg-primary/5 transition-colors"
        >
          <CalendarPlus size={15} /> Proposer une date
        </button>
      )}
    </div>
  );
}