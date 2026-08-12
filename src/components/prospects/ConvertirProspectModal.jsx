import { useState, useRef } from 'react';
import { useMutation, useQueryClient } from '@tanstack/react-query';
import { base44 } from '@/api/base44Client';
import { X, Check, PartyPopper } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import AmandaMessage from '@/components/AmandaMessage';
import { normalizeEvenementDate, formatEvenementDate } from '@/lib/evenementDate';

function genToken() {
  return Math.random().toString(36).slice(2, 12) + Date.now().toString(36);
}

export default function ConvertirProspectModal({ prospect, datesDemandees, onClose, onConverted }) {
  const qc = useQueryClient();
  const [step, setStep] = useState(datesDemandees.length > 1 ? 'choix_date' : 'confirmation');
  const [dateChoisie, setDateChoisie] = useState(datesDemandees[0] || '');
  const [dateManuelle, setDateManuelle] = useState(
    datesDemandees.length === 0 && prospect?.date_evenement_souhaitee ? prospect.date_evenement_souhaitee : ''
  );
  const [loading, setLoading] = useState(false);
  const [showCelebration, setShowCelebration] = useState(false);
  const [convertedEventId, setConvertedEventId] = useState(null);
  const [errorMsg, setErrorMsg] = useState('');
  const isConverting = useRef(false);

  const dateFinale = step === 'confirmation'
    ? (datesDemandees.length === 1 ? datesDemandees[0] : dateChoisie) || dateManuelle
    : dateChoisie || dateManuelle;

  const pDateType = prospect.date_type || 'exacte';
  const hasApproxMode = pDateType === 'mois' || pDateType === 'periode';

  // Libellé de la date pour le récapitulatif (exacte, mois ou période)
  const dateDisplay = dateFinale
    ? new Date(dateFinale).toLocaleDateString('fr-FR', { day: 'numeric', month: 'long', year: 'numeric' })
    : hasApproxMode
      ? formatEvenementDate({ date_type: pDateType, date_mois: prospect.date_mois, date_periode: prospect.date_periode }).label
      : null;

  const handleConvertir = async () => {
    if (isConverting.current) return;
    if (prospect.converti) {
      alert('Ce prospect a déjà été converti.');
      onClose();
      return;
    }
    // Calcul de la date technique selon le mode du prospect.
    // Si l'admin a choisi/renseigné une date exacte → mode exacte.
    // Sinon, si le prospect est en mode mois/periode → on utilise ce mode (sans exiger de date exacte).
    let normalizedDate;
    if (dateFinale) {
      normalizedDate = normalizeEvenementDate({ date_type: 'exacte', date: dateFinale });
    } else if (hasApproxMode) {
      const fallbackDate = prospect.date_evenement_souhaitee || new Date().toISOString().split('T')[0];
      normalizedDate = normalizeEvenementDate({
        date_type: pDateType,
        date: fallbackDate,
        date_mois: prospect.date_mois,
        date_periode: prospect.date_periode,
      });
    } else {
      setErrorMsg('Veuillez renseigner la date de l\'événement avant de convertir.');
      return;
    }

    if (!normalizedDate.date) {
      setErrorMsg('Impossible de déterminer la date de l\'événement.');
      return;
    }
    setErrorMsg('');
    isConverting.current = true;
    setLoading(true);
    try {
      // 1. Créer le client
      const clientNom = prospect.prenom + ' ' + prospect.nom + (prospect.prenom2 ? ' & ' + prospect.prenom2 + ' ' + (prospect.nom2 || prospect.nom) : '');
      const client = await base44.entities.Client.create({
        prenom: prospect.prenom,
        nom: prospect.nom,
        prenom2: prospect.prenom2 || null,
        nom2: prospect.nom2 || null,
        telephone: prospect.telephone || null,
        telephone2: prospect.telephone2 || null,
        email: prospect.email || null,
        source_connaissance: prospect.source || null,
        lien_client_token: genToken(),
      });

      // 2. Créer l'événement
      const nomEvenement = prospect.type_evenement
        ? `${prospect.type_evenement} ${clientNom}`
        : clientNom;

      const evenement = await base44.entities.Evenement.create({
        nom: nomEvenement,
        type_evenement: prospect.type_evenement || null,
        statut: 'À configurer',
        date: normalizedDate.date,
        date_type: normalizedDate.date_type,
        date_mois: normalizedDate.date_mois,
        date_periode: normalizedDate.date_periode,
        client_id: client.id,
        client_nom: clientNom,
        client_email: prospect.email || null,
        client_telephone: prospect.telephone || null,
        nb_invites: prospect.nb_invites_estime ? parseInt(prospect.nb_invites_estime) : 0,
        formule_id: prospect.formule_id || null,
        formule_nom: prospect.formule_nom || null,
        notes_internes: prospect.notes_visite || null,
        lien_client_token: client.lien_client_token,
        ...(prospect.couleur_theme ? { couleur_theme: prospect.couleur_theme } : {}),
        ...(prospect.lieu_id ? { lieu_id: prospect.lieu_id, lieu_nom: prospect.lieu_nom || null } : {}),
        taches_requises: {
          formulaire: true,
          programme: true,
          plan_table: true,
          fiche_service: true,
          equipe_extras: true,
        },
      });

      // 3. Créer l'entrée EvenementPrestataire si prestataire initiateur
      if (prospect.prestataire_id) {
        const prestataire = await base44.entities.Prestataire.filter({ id: prospect.prestataire_id }).then(r => r[0] || null);
        if (prestataire) {
          await base44.entities.EvenementPrestataire.create({
            evenement_id: evenement.id,
            evenement_nom: evenement.nom,
            prestataire_id: prospect.prestataire_id,
            prestataire_nom: prestataire.nom,
            prestataire_domaine: prestataire.domaine || '',
            statut: 'Confirmé',
            initiateur: true,
          });
        }
      }

      // 4. Marquer le prospect comme converti + lier
      await base44.entities.Prospect.update(prospect.id, {
        statut: 'Signé',
        converti: true,
        client_id: client.id,
        evenement_id: evenement.id,
      });

      // 4. Mettre à jour les devis existants du prospect avec le nouvel evenement_id
      const devisProspect = await base44.entities.Devis.filter({ prospect_id: prospect.id });
      for (const d of devisProspect) {
        await base44.entities.Devis.update(d.id, {
          evenement_id: evenement.id,
          evenement_nom: evenement.nom,
        });
      }

      // 4b. Rattacher les documents archivés en attente (contrat de réservation signé
      //     avant conversion) au nouveau client et événement.
      const docsEnAttente = await base44.entities.ClientDocument.filter({ prospect_id: prospect.id });
      for (const doc of docsEnAttente) {
        if (!doc.client_id) {
          await base44.entities.ClientDocument.update(doc.id, {
            client_id: client.id,
            evenement_id: evenement.id,
          });
        }
      }

      // 5. Notifier via email (non bloquant)
      if (prospect.email) {
        base44.functions.invoke('sendProspectWelcomeEmail', {
          to: prospect.email,
          prenom: prospect.prenom,
          url: `${window.location.origin}/client-portal?token=${client.lien_client_token}`,
          subject: '🎉 Votre réservation est confirmée !',
          body: `Bonjour ${prospect.prenom},\n\nNous avons le plaisir de vous confirmer votre réservation !\n\nVotre espace client est maintenant disponible à l'adresse :\n${window.location.origin}/client-portal?token=${client.lien_client_token}\n\nBienvenue dans votre espace client ✨\n\nCordialement`,
        }).catch(() => {});
      }

      // 6. Envoyer message interne dans la messagerie prospect (non bloquant)
      base44.entities.ProspectMessage.create({
        prospect_id: prospect.id,
        auteur: 'admin',
        message: '🎉 Votre réservation est confirmée ! Bienvenue dans votre espace client ✨',
      }).catch(() => {});

      qc.invalidateQueries(['prospects']);
      qc.invalidateQueries(['evenements']);
      setConvertedEventId(evenement.id);
      setShowCelebration(true);
    } catch (err) {
      setErrorMsg('Une erreur est survenue lors de la conversion. Veuillez vérifier votre connexion et réessayer. Si le problème persiste, contactez le support.');
      console.error(err);
    } finally {
      setLoading(false);
      isConverting.current = false;
    }
  };

  if (showCelebration) {
    return (
      <AmandaMessage
        type="celebration"
        modal
        message={`Félicitations ! ${prospect.prenom} ${prospect.nom} est maintenant un client confirmé. Leur espace client est ouvert. 🎉`}
        onClose={() => { onConverted(convertedEventId); onClose(); }}
      />
    );
  }

  return (
    <div className="fixed inset-0 z-[60] flex items-center justify-center bg-black/60 p-4">
      <div className="bg-card rounded-2xl shadow-2xl w-full max-w-md">
        <div className="flex items-center justify-between px-5 py-4 border-b border-border">
          <h2 className="font-bold text-lg flex items-center gap-2">
            <PartyPopper size={18} className="text-amber-500" />
            {step === 'choix_date' ? 'Quelle date confirmer ?' : '🎉 Félicitations !'}
          </h2>
          <button onClick={onClose} className="p-1.5 rounded-lg hover:bg-muted text-muted-foreground"><X size={16} /></button>
        </div>

        <div className="px-5 py-5 space-y-4">
          {step === 'choix_date' && (
            <>
              <p className="text-sm text-muted-foreground">
                Ce prospect avait proposé plusieurs dates. Laquelle souhaitez-vous confirmer ?
              </p>
              <div className="space-y-2">
                {datesDemandees.map((d, i) => (
                  <label key={i} className={`flex items-center gap-3 p-3 rounded-xl border cursor-pointer transition-colors ${dateChoisie === d ? 'border-primary bg-primary/5' : 'border-border hover:bg-muted/50'}`}>
                    <input
                      type="radio"
                      name="date"
                      value={d}
                      checked={dateChoisie === d}
                      onChange={() => setDateChoisie(d)}
                      className="accent-primary"
                    />
                    <span className="text-sm font-medium">
                      {d ? new Date(d).toLocaleDateString('fr-FR', { weekday: 'long', day: 'numeric', month: 'long', year: 'numeric' }) : d}
                    </span>
                  </label>
                ))}
                <label className={`flex items-center gap-3 p-3 rounded-xl border cursor-pointer transition-colors ${dateChoisie === '' ? 'border-primary bg-primary/5' : 'border-border hover:bg-muted/50'}`}>
                  <input type="radio" name="date" value="" checked={dateChoisie === ''} onChange={() => setDateChoisie('')} className="accent-primary" />
                  <span className="text-sm text-muted-foreground">Définir une autre date</span>
                </label>
                {dateChoisie === '' && (
                  <input
                    type="date"
                    value={dateManuelle}
                    min={new Date().toISOString().split('T')[0]}
                    onChange={e => setDateManuelle(e.target.value)}
                    style={{ fontSize: 16 }}
                    className="ml-6 flex h-9 w-full rounded-md border border-input bg-transparent px-3 py-1 shadow-sm transition-colors focus-visible:outline-none focus-visible:ring-1 focus-visible:ring-ring"
                  />
                )}
              </div>
              <div className="flex justify-end gap-2 pt-2">
                <Button variant="outline" size="sm" onClick={onClose}>Annuler</Button>
                <Button size="sm" onClick={() => setStep('confirmation')}>
                  Continuer →
                </Button>
              </div>
            </>
          )}

          {step === 'confirmation' && (
            <>
              <p className="text-sm text-muted-foreground">
                Voulez-vous convertir <strong>{prospect.prenom} {prospect.nom}</strong> en client confirmé ?
              </p>
              <div className="bg-muted/40 rounded-xl p-4 space-y-1.5 text-xs">
                <p className="font-semibold text-sm mb-2">Ce qui va être créé :</p>
                <p>✅ Fiche client : <strong>{prospect.prenom} {prospect.nom}</strong></p>
                <p>✅ Événement : <strong>{prospect.type_evenement || 'Événement'} {prospect.prenom} {prospect.nom}</strong></p>
                {dateDisplay && <p>📅 Date : <strong>{dateDisplay}</strong></p>}
                {prospect.email && <p>📧 Email de confirmation envoyé à <strong>{prospect.email}</strong></p>}
                <p>🔓 Espace client déverrouillé avec toutes les tuiles</p>
              </div>

              {!dateFinale && !hasApproxMode && (
                <div>
                  <label className="text-xs font-medium text-muted-foreground mb-1 block">Date de l'événement <span className="text-red-500">*</span></label>
                  <input
                    type="date"
                    value={dateManuelle}
                    min={new Date().toISOString().split('T')[0]}
                    onChange={e => { setDateManuelle(e.target.value); setErrorMsg(''); }}
                    style={{ fontSize: 16 }}
                    className="flex h-9 w-full rounded-md border border-input bg-transparent px-3 py-1 shadow-sm transition-colors focus-visible:outline-none focus-visible:ring-1 focus-visible:ring-ring"
                  />
                </div>
              )}

              {errorMsg && (
                <p className="text-xs text-red-600 bg-red-50 border border-red-200 rounded-lg px-3 py-2">{errorMsg}</p>
              )}

              <div className="flex items-center justify-between pt-2">
                <Button variant="ghost" size="sm" onClick={onClose} className="text-muted-foreground">Pas maintenant</Button>
                <Button
                  size="sm"
                  onClick={handleConvertir}
                  disabled={loading}
                  className="bg-emerald-600 hover:bg-emerald-700 text-white gap-1.5"
                >
                  {loading ? (
                    <div className="w-4 h-4 border-2 border-white border-t-transparent rounded-full animate-spin" />
                  ) : <Check size={14} />}
                  Convertir en client
                </Button>
              </div>
            </>
          )}
        </div>
      </div>
    </div>
  );
}