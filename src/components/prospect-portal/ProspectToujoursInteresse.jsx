import { useState } from 'react';
import { base44 } from '@/api/base44Client';
import { useQueryClient } from '@tanstack/react-query';

const RAISONS = [
  'Contrainte budgétaire',
  'Offre ne correspondant pas à nos attentes',
  'Date non disponible',
  'Choix d\'un autre prestataire',
  'Projet annulé ou reporté',
  'Autre',
];

/**
 * Bouton visible dans l'espace prospect quand le statut est
 * "Devis envoyé" ou "À relancer".
 * - "Je suis toujours intéressé" → snooze + notification admin
 * - "Je ne suis plus intéressé(e)" → étape motif → ProspectMessage + notification admin
 */
export default function ProspectToujoursInteresse({ prospect }) {
  const qc = useQueryClient();
  const [loading, setLoading] = useState(false);
  const [done, setDone] = useState(null); // 'interesse' | 'pas_interesse'
  const [showMotif, setShowMotif] = useState(false);
  const [raisonSelectionnee, setRaisonSelectionnee] = useState('');
  const [raisonAutre, setRaisonAutre] = useState('');

  const statut = prospect?.statut;
  if (!['Devis envoyé', 'À relancer'].includes(statut)) return null;

  const handleInteresse = async () => {
    setLoading(true);
    try {
      const delai = prospect.relance_delai_jours || 7;
      const snooze = new Date();
      snooze.setDate(snooze.getDate() + delai);
      const snoozeStr = snooze.toISOString().split('T')[0];

      await base44.entities.ProspectMessage.create({
        prospect_id: prospect.id,
        auteur: 'prospect',
        message: `TOUJOURS_INTERESSE:{"date":"${new Date().toISOString()}"}`,
      });

      await base44.entities.Prospect.update(prospect.id, {
        statut: 'Devis envoyé',
        relance_snooze_jusqu_au: snoozeStr,
      });

      await base44.entities.Notification.create({
        titre: `💬 Prospect toujours intéressé — ${prospect.prenom} ${prospect.nom}`,
        message: `${prospect.prenom} ${prospect.nom} a confirmé son intérêt. La relance est suspendue jusqu'au ${snoozeStr}.`,
        type: 'info',
        lu: false,
        lien: `/prospects`,
      });

      qc.invalidateQueries(['prospect', prospect.id]);
      setDone('interesse');
    } finally {
      setLoading(false);
    }
  };

  const handlePasInteresse = async (raison) => {
    setLoading(true);
    try {
      const motif = raison === 'Autre' ? (raisonAutre.trim() || 'Autre') : raison;

      await base44.entities.ProspectMessage.create({
        prospect_id: prospect.id,
        auteur: 'prospect',
        message: `PAS_INTERESSE:${JSON.stringify({ date: new Date().toISOString(), motif })}`,
      });

      await base44.entities.Prospect.update(prospect.id, {
        statut: 'Annulé',
      });

      await base44.entities.Notification.create({
        titre: `❌ Prospect non intéressé — ${prospect.prenom} ${prospect.nom}`,
        message: `${prospect.prenom} ${prospect.nom} a indiqué ne plus être intéressé(e).\nMotif : ${motif}`,
        type: 'info',
        lu: false,
        lien: `/prospects`,
      });

      qc.invalidateQueries(['prospect', prospect.id]);
      setDone('pas_interesse');
    } finally {
      setLoading(false);
    }
  };

  const handlePasser = async () => {
    // Passer sans motif
    await handlePasInteresse('Non précisé');
  };

  // ── Écran de confirmation "toujours intéressé"
  if (done === 'interesse') {
    return (
      <div className="bg-emerald-50 border border-emerald-200 rounded-2xl px-4 py-3 text-center">
        <p className="text-sm font-semibold text-emerald-800">✅ Merci ! Nous avons bien noté votre intérêt.</p>
        <p className="text-xs text-emerald-600 mt-1">Notre équipe reprendra contact avec vous prochainement.</p>
      </div>
    );
  }

  // ── Écran de confirmation "pas intéressé"
  if (done === 'pas_interesse') {
    return (
      <div className="bg-slate-50 border border-slate-200 rounded-2xl px-4 py-3 text-center">
        <p className="text-sm font-semibold text-slate-700">Merci pour votre retour.</p>
        <p className="text-xs text-slate-500 mt-1">Nous prenons note de votre décision. N'hésitez pas à nous recontacter si votre projet évolue.</p>
      </div>
    );
  }

  // ── Étape motif "pas intéressé"
  if (showMotif) {
    return (
      <div className="bg-slate-50 border border-slate-200 rounded-2xl px-4 py-4 space-y-3">
        <div className="flex items-center justify-between">
          <p className="font-semibold text-sm text-slate-700">Pouvez-vous nous indiquer la raison ?</p>
          <button
            onClick={() => setShowMotif(false)}
            className="text-muted-foreground text-lg leading-none"
          >✕</button>
        </div>

        <div className="space-y-2">
          {RAISONS.map(raison => (
            <button
              key={raison}
              type="button"
              onClick={() => setRaisonSelectionnee(raison)}
              className={`w-full text-left px-3 py-2.5 rounded-xl border text-sm transition-all active:scale-[0.98] ${
                raisonSelectionnee === raison
                  ? 'border-primary bg-primary/5 text-primary font-medium'
                  : 'border-border bg-card text-foreground'
              }`}
            >
              {raison}
            </button>
          ))}
        </div>

        {raisonSelectionnee === 'Autre' && (
          <textarea
            value={raisonAutre}
            onChange={e => setRaisonAutre(e.target.value)}
            placeholder="Précisez la raison…"
            rows={2}
            className="w-full rounded-xl border border-input bg-background px-3 py-2 text-sm focus-visible:outline-none focus-visible:ring-1 focus-visible:ring-ring resize-none placeholder:text-muted-foreground"
          />
        )}

        <div className="flex gap-2 pt-1">
          <button
            onClick={handlePasser}
            disabled={loading}
            className="flex-1 py-2 rounded-xl border border-border text-sm text-muted-foreground active:bg-muted transition-colors disabled:opacity-50"
          >
            Passer
          </button>
          <button
            onClick={() => handlePasInteresse(raisonSelectionnee || 'Non précisé')}
            disabled={loading || !raisonSelectionnee}
            className="flex-1 py-2 rounded-xl bg-slate-700 text-white text-sm font-semibold active:scale-[0.98] transition-all disabled:opacity-40"
          >
            {loading ? '…' : 'Confirmer'}
          </button>
        </div>
      </div>
    );
  }

  // ── Vue principale
  return (
    <div className="bg-amber-50 border border-amber-200 rounded-2xl px-4 py-4">
      <p className="font-semibold text-sm text-amber-800 mb-1">
        {statut === 'À relancer' ? '🔔 Votre projet nous tient à cœur' : '💬 Toujours intéressé ?'}
      </p>
      <p className="text-xs text-amber-700 mb-3">
        Confirmez votre intérêt pour que notre équipe reste à votre disposition.
      </p>
      <div className="flex gap-2">
        <button
          onClick={() => setShowMotif(true)}
          disabled={loading}
          className="flex-1 py-2.5 rounded-xl border border-amber-300 bg-white text-amber-700 text-sm font-medium active:scale-[0.98] transition-all disabled:opacity-50"
        >
          Je ne suis plus intéressé(e)
        </button>
        <button
          onClick={handleInteresse}
          disabled={loading}
          className="flex-1 py-2.5 rounded-xl bg-amber-500 text-white text-sm font-semibold active:scale-[0.98] transition-all disabled:opacity-50"
        >
          {loading ? '…' : '✋ Toujours intéressé'}
        </button>
      </div>
    </div>
  );
}