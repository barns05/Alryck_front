import { useState, useEffect } from 'react';
import { useQueryClient } from '@tanstack/react-query';
import { base44 } from '@/api/base44Client';
import { Plus, Send, X } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';

const STATUS_COLORS = {
  'En attente': 'bg-amber-100 text-amber-700',
  'Répondu':    'bg-blue-100 text-blue-700',
  'Confirmée':  'bg-emerald-100 text-emerald-700',
  'Refusée':    'bg-red-100 text-red-600',
};

function fmtDate(iso) {
  return new Date(iso).toLocaleDateString('fr-FR', { weekday: 'long', day: 'numeric', month: 'long', year: 'numeric' });
}

export default function AdminProspectDates({ prospectId, prospectEmail, prospectPrenom, prospectPortalUrl }) {
  const qc = useQueryClient();
  const [demandes, setDemandes] = useState([]);
  const [repondant, setRepondant] = useState(null);

  // state du formulaire de réponse
  const [datesDisponibles, setDatesDisponibles] = useState([]);   // dates cochées (parmi proposees)
  const [datesAlternatives, setDatesAlternatives] = useState([]); // nouvelles dates admin
  const [reponse, setReponse] = useState('');

  const load = async () => {
    const res = await base44.entities.ProspectDateDemande.filter({ prospect_id: prospectId }, '-created_date', 20);
    setDemandes(res);
  };

  useEffect(() => { load(); }, [prospectId]);

  const openRepondre = (demandeId) => {
    setRepondant(demandeId);
    setDatesDisponibles([]);
    setDatesAlternatives([]);
    setReponse('');
  };

  const toggleDisponible = (date) => {
    setDatesDisponibles(prev =>
      prev.includes(date) ? prev.filter(d => d !== date) : [...prev, date]
    );
  };

  const addAlternative = () => setDatesAlternatives(prev => [...prev, '']);
  const setAlternative = (i, v) => setDatesAlternatives(prev => prev.map((d, idx) => idx === i ? v : d));
  const removeAlternative = (i) => setDatesAlternatives(prev => prev.filter((_, idx) => idx !== i));

  const handleEnvoyer = async (demande) => {
    const altValides = datesAlternatives.filter(d => d.trim());
    const reponseTexte = reponse.trim() || null;

    await base44.entities.ProspectDateDemande.update(demande.id, {
      statut: 'Répondu',
      dates_disponibles: datesDisponibles,
      dates_alternatives: altValides,
      reponse_admin: reponseTexte,
    });

    // Message dans la conversation
    const dispoParts = datesDisponibles.length > 0
      ? `✅ Dates disponibles : ${datesDisponibles.map(fmtDate).join(', ')}`
      : '❌ Aucune de vos dates n\'est disponible.';
    const altParts = altValides.length > 0
      ? `\n📅 Dates alternatives proposées : ${altValides.map(fmtDate).join(', ')}`
      : '';
    const msgBody = `${dispoParts}${altParts}${reponseTexte ? `\n\n${reponseTexte}` : ''}`;

    await base44.entities.ProspectMessage.create({
      prospect_id: prospectId,
      auteur: 'admin',
      message: msgBody,
    });

    if (prospectEmail) {
      await base44.integrations.Core.SendEmail({
        to: prospectEmail,
        subject: 'Réponse à votre demande de date',
        body: `<p>Bonjour ${prospectPrenom || ''},</p><p>${msgBody.replace(/\n/g, '<br>')}</p>${prospectPortalUrl ? `<p><a href="${prospectPortalUrl}" style="display:inline-block;padding:10px 20px;background:#1e40af;color:white;text-decoration:none;border-radius:8px;font-weight:600;">Voir mon espace prospect →</a></p>` : ''}<p>Cordialement</p>`,
      });
    }

    setRepondant(null);
    setDatesDisponibles([]);
    setDatesAlternatives([]);
    setReponse('');
    load();
  };

  if (demandes.length === 0) {
    return <p className="text-xs text-muted-foreground py-4 text-center">Aucune demande de date reçue.</p>;
  }

  return (
    <div className="space-y-3">
      {demandes.map(d => (
        <div key={d.id} className="bg-muted/30 rounded-xl p-3 border border-border text-xs space-y-2">

          {/* En-tête */}
          <div className="flex items-center justify-between">
            <p className="font-semibold">Demande de date</p>
            <span className={`text-xs px-2 py-0.5 rounded-full font-medium ${STATUS_COLORS[d.statut] || ''}`}>{d.statut}</span>
          </div>

          {/* Dates proposées par le prospect */}
          {(d.dates_proposees || []).length > 0 && (
            <div className="space-y-0.5">
              <p className="text-muted-foreground font-medium">📅 Dates souhaitées :</p>
              {d.dates_proposees.map(date => (
                <p key={date} className="pl-4 text-foreground/80">{fmtDate(date)}</p>
              ))}
            </div>
          )}

          {d.flexibilite && <p className="text-muted-foreground">Flexibilité : {d.flexibilite}</p>}
          {d.message && <p className="italic text-foreground/70">"{d.message}"</p>}

          {/* Réponse déjà envoyée */}
          {d.statut !== 'En attente' && (
            <div className="bg-primary/5 border border-primary/20 rounded-lg px-3 py-2 space-y-1">
              {(d.dates_disponibles || []).length > 0 && (
                <p className="text-emerald-700 font-medium">✅ Disponibles : {d.dates_disponibles.map(fmtDate).join(', ')}</p>
              )}
              {(d.dates_alternatives || []).length > 0 && (
                <p className="text-blue-700">📅 Alternatives : {d.dates_alternatives.map(fmtDate).join(', ')}</p>
              )}
              {d.reponse_admin && <p className="text-muted-foreground italic">{d.reponse_admin}</p>}
              {d.date_confirmee && (
                <p className="text-emerald-700 font-semibold">🎉 Date confirmée par le prospect : {fmtDate(d.date_confirmee)}</p>
              )}
            </div>
          )}

          {/* Bouton ouvrir réponse */}
          {d.statut === 'En attente' && repondant !== d.id && (
            <button
              onClick={() => openRepondre(d.id)}
              className="text-primary hover:text-primary/80 font-medium text-xs"
            >
              Répondre →
            </button>
          )}

          {/* Formulaire de réponse */}
          {repondant === d.id && (
            <div className="space-y-3 mt-2 pt-2 border-t border-border">

              {/* Checkboxes dates disponibles */}
              {(d.dates_proposees || []).length > 0 && (
                <div className="space-y-1">
                  <p className="font-medium text-muted-foreground">Cochez les dates disponibles :</p>
                  {d.dates_proposees.map(date => (
                    <label key={date} className={`flex items-center gap-2 cursor-pointer px-2 py-1.5 rounded-lg border transition-colors ${
                      datesDisponibles.includes(date) ? 'border-emerald-400 bg-emerald-50' : 'border-border hover:bg-muted/40'
                    }`}>
                      <input
                        type="checkbox"
                        checked={datesDisponibles.includes(date)}
                        onChange={() => toggleDisponible(date)}
                        className="accent-emerald-600"
                      />
                      <span className={datesDisponibles.includes(date) ? 'text-emerald-700 font-medium' : ''}>
                        {fmtDate(date)}
                      </span>
                      <span className="ml-auto text-[10px]">
                        {datesDisponibles.includes(date) ? '✅ disponible' : '—'}
                      </span>
                    </label>
                  ))}
                </div>
              )}

              {/* Dates alternatives */}
              <div className="space-y-1.5">
                <p className="font-medium text-muted-foreground">Proposer d'autres dates :</p>
                {datesAlternatives.map((alt, i) => (
                  <div key={i} className="flex gap-2 items-center">
                    <Input
                      type="date"
                      value={alt}
                      onChange={e => setAlternative(i, e.target.value)}
                      className="flex-1 h-7 text-xs"
                    />
                    <button onClick={() => removeAlternative(i)} className="text-muted-foreground hover:text-red-500">
                      <X size={13} />
                    </button>
                  </div>
                ))}
                <button
                  onClick={addAlternative}
                  className="flex items-center gap-1 text-xs text-primary hover:text-primary/80 font-medium"
                >
                  <Plus size={11} /> Ajouter une date alternative
                </button>
              </div>

              {/* Message */}
              <textarea
                value={reponse}
                onChange={e => setReponse(e.target.value)}
                rows={2}
                placeholder="Message au prospect (optionnel)…"
                className="flex w-full rounded-lg border border-input bg-transparent px-3 py-2 text-xs resize-none focus-visible:outline-none focus-visible:ring-1 focus-visible:ring-ring placeholder:text-muted-foreground"
              />

              <div className="flex gap-2 flex-wrap">
                <Button
                  size="sm"
                  className="gap-1 text-xs h-7"
                  disabled={datesDisponibles.length === 0 && datesAlternatives.filter(d => d.trim()).length === 0}
                  onClick={() => handleEnvoyer(d)}
                >
                  <Send size={11} /> Envoyer ma réponse
                </Button>
                <button
                  onClick={() => setRepondant(null)}
                  className="text-xs text-muted-foreground hover:text-foreground px-2"
                >
                  Annuler
                </button>
              </div>
            </div>
          )}
        </div>
      ))}
    </div>
  );
}