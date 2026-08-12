import { useState } from 'react';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { base44 } from '@/api/base44Client';
import { X, Send, RotateCcw, CheckCircle2, Clock, Loader2 } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { format, parseISO, subHours } from 'date-fns';
import { fr } from 'date-fns/locale';

const statutColors = {
  'Non envoyée': 'bg-slate-100 text-slate-600',
  'Envoyée': 'bg-blue-100 text-blue-700',
  'Vue': 'bg-emerald-100 text-emerald-700',
};

export default function FicheServiceExtraModal({ evenement, formulaire, onClose }) {
  const qc = useQueryClient();
  const [tenue, setTenue] = useState('');
  const [responsable, setResponsable] = useState('');
  const [coordUrgence, setCoordUrgence] = useState('');
  const [heuresPoste, setHeuresPoste] = useState({});
  const [sending, setSending] = useState(null);

  // Extras confirmés pour cet événement
  const { data: services = [] } = useQuery({
    queryKey: ['services-ev', evenement.id],
    queryFn: () => base44.entities.Service.filter({ evenement_id: evenement.id }),
  });

  const serviceIds = services.map(s => s.id);

  const { data: assignments = [] } = useQuery({
    queryKey: ['assignments-fiches', evenement.id],
    queryFn: async () => {
      if (!serviceIds.length) return [];
      const all = await base44.entities.ServiceAssignment.list('-created_date', 500);
      return all.filter(a => serviceIds.includes(a.service_id) && a.statut === 'Confirmé');
    },
    enabled: serviceIds.length > 0,
  });

  const { data: extras = [] } = useQuery({
    queryKey: ['extras-all'],
    queryFn: () => base44.entities.Extra.list(),
  });

  const { data: fichesSaved = [], refetch: refetchFiches } = useQuery({
    queryKey: ['fiches-service-extra', evenement.id],
    queryFn: () => base44.entities.FicheServiceExtra.filter({ evenement_id: evenement.id }),
  });

  // Extras confirmés uniques
  const confirmedExtras = [];
  const seenIds = new Set();
  assignments.forEach(a => {
    const extra = extras.find(e => e.id === a.extra_id || e.email === a.extra_id);
    if (extra && !seenIds.has(extra.id)) {
      seenIds.add(extra.id);
      const svc = services.find(s => s.id === a.service_id);
      confirmedExtras.push({ extra, service: svc, assignment: a });
    }
  });

  // Calcul auto heure serveurs (heure arrivée invités -1h)
  const heureArriveeInvites = evenement.heure_debut;
  const calcHeureServeur = () => {
    if (!heureArriveeInvites) return '';
    const [h, m] = heureArriveeInvites.split(':').map(Number);
    const date = new Date();
    date.setHours(h, m, 0);
    date.setHours(date.getHours() - 1);
    return `${String(date.getHours()).padStart(2, '0')}:${String(date.getMinutes()).padStart(2, '0')}`;
  };

  const getHeurePoste = (extra, service) => {
    if (heuresPoste[extra.id] !== undefined) return heuresPoste[extra.id];
    if (extra.poste === 'Serveur') return calcHeureServeur();
    return service?.heure_debut || '';
  };

  const getFicheExistante = (extraId) => fichesSaved.find(f => f.extra_id === extraId);

  const envoyerFiche = async (extraItem) => {
    const { extra, service } = extraItem;
    setSending(extra.id);
    const heurePoste = getHeurePoste(extra, service);
    const ficheExistante = getFicheExistante(extra.id);

    const data = {
      evenement_id: evenement.id,
      evenement_nom: evenement.nom,
      evenement_date: evenement.date,
      evenement_lieu: evenement.lieu_nom || '',
      extra_id: extra.id,
      extra_nom: extra.nom,
      extra_email: extra.email,
      extra_poste: extra.poste,
      nb_invites: evenement.nb_invites || 0,
      menu: evenement.menu || {},
      programme: evenement.programme_journee || [],
      tenue,
      responsable_nom: responsable,
      coordonnees_urgence: coordUrgence,
      heure_prise_poste: heurePoste,
      statut: 'Envoyée',
      date_envoi: new Date().toISOString(),
    };

    if (ficheExistante) {
      await base44.entities.FicheServiceExtra.update(ficheExistante.id, data);
    } else {
      await base44.entities.FicheServiceExtra.create(data);
    }

    // Notification email à l'extra
    if (extra.email) {
      await base44.integrations.Core.SendEmail({
        to: extra.email,
        subject: `📋 Votre fiche de service — ${evenement.nom}`,
        body: `Bonjour ${extra.nom},\n\nVotre fiche de service pour l'événement "${evenement.nom}" du ${evenement.date ? format(parseISO(evenement.date), 'd MMMM yyyy', { locale: fr }) : ''} est maintenant disponible dans votre espace Planyse.\n\nHeure de prise de poste : ${heurePoste}\nTenue : ${tenue || 'Non précisée'}\nResponsable du soir : ${responsable || 'Non précisé'}\n\nConnectez-vous à votre espace pour consulter tous les détails.\n\nCordialement`,
      });
    }

    // Notification interne
    await base44.entities.Notification.create({
      titre: '📋 Fiche de service envoyée',
      message: `Fiche de service envoyée à ${extra.nom} pour "${evenement.nom}".`,
      type: 'evenement',
      lu: false,
    });

    setSending(null);
    refetchFiches();
  };

  const envoyerTout = async () => {
    for (const item of confirmedExtras) {
      await envoyerFiche(item);
    }
  };

  return (
    <div className="fixed inset-0 z-[60] flex items-center justify-center bg-black/50 backdrop-blur-sm p-4">
      <div className="bg-card rounded-2xl border border-border shadow-xl w-full max-w-2xl max-h-[90vh] overflow-y-auto">
        <div className="p-6 border-b border-border flex items-center justify-between">
          <div>
            <h3 className="font-bold text-lg">Fiches de service</h3>
            <p className="text-sm text-muted-foreground">{evenement.nom}</p>
          </div>
          <button onClick={onClose} className="p-1.5 rounded-lg hover:bg-muted text-muted-foreground">
            <X size={16} />
          </button>
        </div>

        <div className="p-6 space-y-6">
          {/* Informations communes */}
          <div className="space-y-4">
            <h4 className="text-xs font-semibold uppercase tracking-wider text-muted-foreground">Informations communes à toutes les fiches</h4>
            <div className="grid grid-cols-1 gap-3">
              <div className="space-y-1.5">
                <Label>Tenue vestimentaire requise</Label>
                <Input value={tenue} onChange={e => setTenue(e.target.value)} placeholder="Ex : Chemise blanche, pantalon noir, chaussures noires" />
              </div>
              <div className="space-y-1.5">
                <Label>Nom du responsable du soir</Label>
                <Input value={responsable} onChange={e => setResponsable(e.target.value)} placeholder="Prénom Nom" />
              </div>
              <div className="space-y-1.5">
                <Label>Coordonnées d'urgence</Label>
                <Input value={coordUrgence} onChange={e => setCoordUrgence(e.target.value)} placeholder="Ex : 06 00 00 00 00 — Prénom Nom" />
              </div>
            </div>
          </div>

          {/* Liste des extras confirmés */}
          <div className="space-y-3">
            <div className="flex items-center justify-between">
              <h4 className="text-xs font-semibold uppercase tracking-wider text-muted-foreground">
                Extras confirmés ({confirmedExtras.length})
              </h4>
              {confirmedExtras.length > 0 && (
                <Button size="sm" className="gap-1 text-xs" onClick={envoyerTout} disabled={!!sending}>
                  <Send size={12} /> Envoyer toutes les fiches
                </Button>
              )}
            </div>

            {confirmedExtras.length === 0 ? (
              <p className="text-sm text-muted-foreground text-center py-6 bg-muted/30 rounded-xl">
                Aucun extra confirmé pour cet événement.
              </p>
            ) : (
              <div className="space-y-3">
                {confirmedExtras.map(({ extra, service }) => {
                  const fiche = getFicheExistante(extra.id);
                  const isServeur = extra.poste === 'Serveur';
                  const heureAuto = isServeur ? calcHeureServeur() : '';
                  const heureManuelle = heuresPoste[extra.id];
                  const heureAffichee = heureManuelle !== undefined ? heureManuelle : (isServeur ? heureAuto : (service?.heure_debut || ''));

                  return (
                    <div key={extra.id} className="bg-muted/30 rounded-xl p-4 space-y-3 border border-border">
                      <div className="flex items-center justify-between">
                        <div>
                          <p className="font-medium text-sm">{extra.nom}</p>
                          <p className="text-xs text-muted-foreground">{extra.poste}</p>
                        </div>
                        <div className="flex items-center gap-2">
                          {fiche && (
                            <span className={`text-xs px-2.5 py-0.5 rounded-full font-medium ${statutColors[fiche.statut]}`}>
                              {fiche.statut}
                            </span>
                          )}
                          <Button
                            size="sm"
                            variant={fiche ? 'outline' : 'default'}
                            className="gap-1 text-xs"
                            onClick={() => envoyerFiche({ extra, service })}
                            disabled={sending === extra.id}
                          >
                            {sending === extra.id
                              ? <Loader2 size={12} className="animate-spin" />
                              : fiche ? <><RotateCcw size={12} /> Renvoyer</> : <><Send size={12} /> Envoyer</>
                            }
                          </Button>
                        </div>
                      </div>

                      {/* Heure de prise de poste */}
                      <div className="flex items-center gap-3">
                        <Clock size={13} className="text-muted-foreground shrink-0" />
                        <div className="flex-1 space-y-1">
                          <p className="text-xs text-muted-foreground">
                            Heure de prise de poste
                            {isServeur && heureAuto && (
                              <span className="ml-1 text-primary">(calculée auto : {heureAuto})</span>
                            )}
                          </p>
                          <Input
                            type="time"
                            value={heureAffichee}
                            onChange={e => setHeuresPoste(prev => ({ ...prev, [extra.id]: e.target.value }))}
                            className="h-8 text-sm w-32"
                          />
                        </div>
                      </div>
                    </div>
                  );
                })}
              </div>
            )}
          </div>
        </div>

        <div className="p-6 border-t border-border flex justify-end">
          <Button variant="outline" onClick={onClose}>Fermer</Button>
        </div>
      </div>
    </div>
  );
}