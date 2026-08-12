import { useState } from 'react';
import { useMutation, useQueryClient } from '@tanstack/react-query';
import { base44 } from '@/api/base44Client';
import { toast } from 'sonner';
import { Copy, Calendar } from 'lucide-react';
import {
  Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription, DialogFooter,
} from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';

/**
 * Dupliquer un événement (client récurrent, nouvelle occurrence).
 *
 * - Champs copiés : identité client, lieu, formule, menu, config visuelle, tâches/modèles.
 * - Champs réinitialisés : date (saisie), statut, heures, effectifs, programme, checklist,
 *   plan de table, cree_par_client, archived, recommandation_statut.
 * - Ne copie PAS les relations (EvenementPrestataire, FormulairePreparation, Devis,
 *   Contrat, Invite, MomentEvenement, EtapeProgramme, TacheChecklist, RendezVous).
 * - Même client = même lien_client_token conservé.
 */
export default function DuplicateEvenementModal({ evenement, onClose }) {
  const qc = useQueryClient();
  const [nom, setNom] = useState(evenement?.nom || '');
  const [date, setDate] = useState('');
  const [submitting, setSubmitting] = useState(false);

  const duplicateMutation = useMutation({
    mutationFn: async () => {
      const ev = evenement;
      const payload = {
        // ── Champs copiés depuis l'original ──
        nom: nom.trim() || ev.nom,
        type_evenement: ev.type_evenement || null,
        client_id: ev.client_id || null,
        client_nom: ev.client_nom || null,
        client_email: ev.client_email || null,
        client_telephone: ev.client_telephone || null,
        lieu_id: ev.lieu_id || null,
        lieu_nom: ev.lieu_nom || null,
        formule_id: ev.formule_id || null,
        formule_nom: ev.formule_nom || null,
        notes_contrat: ev.notes_contrat || null,
        taches_requises: ev.taches_requises || {},
        modeles_config: ev.modeles_config || {},
        menu: ev.menu || {},
        plan_table_actif: ev.plan_table_actif !== undefined ? ev.plan_table_actif : true,
        couleur_theme: ev.couleur_theme || null,
        photo_bandeau_url: ev.photo_bandeau_url || null,
        mode_bandeau: ev.mode_bandeau || 'ambiance',
        countdown_style: ev.countdown_style || 'classique',
        hebergement_disponible: !!ev.hebergement_disponible,
        personnalisation_card_reduced: !!ev.personnalisation_card_reduced,
        lien_client_token: ev.lien_client_token || null,

        // ── Champs réinitialisés (nouvelle occurrence) ──
        date: date,                       // date saisie (obligatoire)
        date_type: 'exacte',
        date_mois: null,
        date_periode: null,
        statut: 'À configurer',
        heure_debut: null,
        heure_fin: null,
        nb_invites: 0,
        nb_adultes: 0,
        nb_adolescents: 0,
        nb_enfants: 0,
        nb_prestataires: 0,
        budget: null,
        options_validees: null,
        notes_internes: null,
        programme_journee: [],
        checklist: [],
        plan_table_url: null,
        plan_table_nom: null,
        plan_table_envoye: false,
        cree_par_client: false,
        archived: false,
        recommandation_statut: 'a_faire',
        recommandation_date_rappel: null,
      };

      return base44.entities.Evenement.create(payload);
    },
    onSuccess: () => {
      qc.invalidateQueries(['evenements']);
      toast.success('✓ Événement dupliqué — nouvelle occurrence créée');
      onClose();
    },
    onError: () => toast.error('❌ Une erreur est survenue lors de la duplication'),
  });

  const canSubmit = !!date && !submitting;

  const handleSubmit = () => {
    if (!date) return;
    setSubmitting(true);
    duplicateMutation.mutate(undefined, {
      onSettled: () => setSubmitting(false),
    });
  };

  return (
    <Dialog open onOpenChange={(o) => { if (!o && !submitting) onClose(); }}>
      <DialogContent className="sm:max-w-md">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2">
            <Copy size={18} className="text-primary" />
            Dupliquer l'événement
          </DialogTitle>
          <DialogDescription>
            Crée une nouvelle occurrence pour ce client récurrent. Prestataires, devis, formulaires
            et invités ne sont pas copiés — ils repartent à zéro pour cette occurrence.
          </DialogDescription>
        </DialogHeader>

        <div className="space-y-4 py-2">
          {/* Nom (éditable, pré-rempli) */}
          <div>
            <label className="text-xs font-medium text-muted-foreground mb-1 block">
              Nom de la nouvelle occurrence
            </label>
            <Input value={nom} onChange={(e) => setNom(e.target.value)} placeholder="Mariage Dupont" />
          </div>

          {/* Nouvelle date (obligatoire, exacte) */}
          <div>
            <label className="text-xs font-medium text-muted-foreground mb-1 block flex items-center gap-1">
              <Calendar size={12} /> Date de la nouvelle occurrence *
            </label>
            <Input
              type="date"
              value={date}
              onChange={(e) => setDate(e.target.value)}
              required
            />
            {!date && (
              <p className="text-[11px] text-muted-foreground mt-1">La date est obligatoire pour la nouvelle occurrence.</p>
            )}
          </div>
        </div>

        <DialogFooter>
          <Button variant="outline" onClick={onClose} disabled={submitting}>
            Annuler
          </Button>
          <Button onClick={handleSubmit} disabled={!canSubmit}>
            {submitting ? <div className="w-4 h-4 border-2 border-white border-t-transparent rounded-full animate-spin" /> : <Copy size={15} />}
            Dupliquer
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}