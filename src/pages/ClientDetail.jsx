import { useState } from 'react';
import { useParams, Link } from 'react-router-dom';
import { useQuery, useQueryClient } from '@tanstack/react-query';
import { base44 } from '@/api/base44Client';
import { ArrowLeft, CalendarDays, MapPin, Users, Phone, Mail, Loader2, Plus, ExternalLink, Copy, Check } from 'lucide-react';
import { toast } from 'sonner';
import { format, parseISO } from 'date-fns';
import { fr } from 'date-fns/locale';
import ChatSection from '@/components/client-portal/ChatSection';
import RendezVousSection from '@/components/client-portal/RendezVousSection';
import ClientDocumentsAdmin from '@/components/client-portal/ClientDocumentsAdmin';
import EvenementModal from '@/components/evenements/EvenementModal';
import ShareClientPortalModal from '@/components/client-portal/ShareClientPortalModal';
import RappelBouton from '@/components/rappels/RappelBouton';
import { Button } from '@/components/ui/button';
import EnvoyerRibButton from '@/components/facturation/EnvoyerRibButton';

const TYPE_COLORS = {
  'Mariage': 'bg-pink-100 text-pink-700',
  'Baptême': 'bg-blue-100 text-blue-700',
  'Anniversaire': 'bg-yellow-100 text-yellow-700',
  "Soirée d'entreprise": 'bg-indigo-100 text-indigo-700',
  'Cocktail': 'bg-green-100 text-green-700',
  'Gala': 'bg-purple-100 text-purple-700',
  'Autre': 'bg-gray-100 text-gray-600',
};

const STATUT_COLORS = {
  'En préparation': 'bg-yellow-100 text-yellow-700',
  'Confirmé': 'bg-emerald-100 text-emerald-700',
  'En cours': 'bg-blue-100 text-blue-700',
  'Terminé': 'bg-slate-100 text-slate-600',
  'Annulé': 'bg-red-100 text-red-600',
};

export default function ClientDetail() {
  const { clientId } = useParams();
  const qc = useQueryClient();
  const [evenementModal, setEvenementModal] = useState(null); // null = fermé, 'new' = nouveau, obj = éditer
  const [sharePortalModal, setSharePortalModal] = useState(null);

  const { data: client, isLoading } = useQuery({
    queryKey: ['client', clientId],
    queryFn: () => base44.entities.Client.filter({ id: clientId }).then(r => r[0]),
    enabled: !!clientId,
  });

  const { data: evenements = [] } = useQuery({
    queryKey: ['evenements-client', clientId],
    queryFn: () => base44.entities.Evenement.filter({ client_id: clientId }),
    enabled: !!clientId,
  });

  const clientNom = client ? `${client.prenom || ''} ${client.nom}`.trim() : '';
  const evenement = evenements[0] || null; // pour rétrocompatibilité RDV/Chat

  if (isLoading) {
    return (
      <div className="min-h-screen flex items-center justify-center">
        <Loader2 className="h-8 w-8 animate-spin text-primary" />
      </div>
    );
  }

  if (!client) {
    return (
      <div className="min-h-screen flex items-center justify-center text-muted-foreground">
        Client introuvable.
      </div>
    );
  }

  return (
    <div className="p-4 md:p-6 max-w-4xl mx-auto space-y-5">
      {/* Header */}
      <div className="flex items-center gap-3">
        <Link to="/Clients" className="p-2 rounded-xl hover:bg-muted text-muted-foreground hover:text-foreground transition-colors">
          <ArrowLeft size={18} />
        </Link>
        <div className="flex-1">
          <div className="flex items-center gap-2 flex-wrap">
            <h2 className="text-2xl font-bold">{clientNom}</h2>
            {evenement?.type_evenement && (
              <span className={`text-xs px-2 py-0.5 rounded-full font-medium ${TYPE_COLORS[evenement.type_evenement] || TYPE_COLORS['Autre']}`}>
                {evenement.type_evenement}
              </span>
            )}
          </div>
        </div>
        <RappelBouton lieeType="client" lieeId={clientId} lieeNom={clientNom} />
        {client.email && <EnvoyerRibButton clientEmail={client.email} clientNom={clientNom} />}
      </div>

      {/* Infos client */}
      <div className="bg-card rounded-2xl border border-border p-5 grid grid-cols-1 sm:grid-cols-2 gap-3 text-sm text-muted-foreground">
        {client.email && (
          <div className="flex items-center gap-2"><Mail size={14} /><span>{client.email}</span></div>
        )}
        {client.telephone && (
          <div className="flex items-center gap-2"><Phone size={14} /><span>{client.telephone}</span></div>
        )}
        {evenement?.date && (
          <div className="flex items-center gap-2"><CalendarDays size={14} />
            <span>{format(parseISO(evenement.date), 'd MMMM yyyy', { locale: fr })}</span>
          </div>
        )}
        {evenement?.lieu_nom && (
          <div className="flex items-center gap-2"><MapPin size={14} /><span>{evenement.lieu_nom}</span></div>
        )}
        {evenement?.nb_invites > 0 && (
          <div className="flex items-center gap-2"><Users size={14} /><span>{evenement.nb_invites} invités</span></div>
        )}
        {client.notes && (
          <div className="sm:col-span-2 bg-muted/50 rounded-xl px-3 py-2 text-xs">{client.notes}</div>
        )}
      </div>

      {/* Événements liés */}
      <div className="bg-card rounded-2xl border border-border p-5 space-y-3">
        <div className="flex items-center justify-between">
          <p className="text-xs font-semibold text-muted-foreground uppercase tracking-wide">
            Historique des événements ({evenements.length})
          </p>
          <Button
            size="sm"
            variant="outline"
            className="gap-1 h-7 text-xs"
            onClick={() => setEvenementModal('new')}
          >
            <Plus size={12} /> Ajouter
          </Button>
        </div>

        {evenements.length === 0 && (
          <p className="text-sm text-muted-foreground text-center py-4">Aucun événement lié</p>
        )}

        <div className="space-y-2">
          {evenements.map(ev => (
            <div key={ev.id} className="p-3 rounded-xl border border-border hover:bg-muted/30 transition-colors space-y-2">
              <div className="flex items-start justify-between">
                <div className="flex-1 min-w-0">
                  <div className="flex items-center gap-2 flex-wrap">
                    <p className="font-medium text-sm truncate">{ev.nom}</p>
                    {ev.type_evenement && (
                      <span className={`text-[10px] px-2 py-0.5 rounded-full font-medium ${TYPE_COLORS[ev.type_evenement] || TYPE_COLORS['Autre']}`}>
                        {ev.type_evenement}
                      </span>
                    )}
                    {ev.statut && (
                      <span className={`text-[10px] px-2 py-0.5 rounded-full font-medium ${STATUT_COLORS[ev.statut] || 'bg-gray-100 text-gray-600'}`}>
                        {ev.statut}
                      </span>
                    )}
                  </div>
                  <div className="flex items-center gap-3 mt-0.5 text-xs text-muted-foreground flex-wrap">
                    {ev.date && <span>📅 {format(parseISO(ev.date), 'd MMM yyyy', { locale: fr })}</span>}
                    {ev.lieu_nom && <span>📍 {ev.lieu_nom}</span>}
                    {ev.nb_invites > 0 && <span>👥 {ev.nb_invites} invités</span>}
                  </div>
                </div>
                <button
                  onClick={() => setEvenementModal(ev)}
                  className="p-1.5 text-muted-foreground hover:text-primary hover:bg-primary/10 rounded-lg transition-colors shrink-0"
                  title="Modifier"
                >
                  <ExternalLink size={14} />
                </button>
              </div>
              <Button
                size="sm"
                variant="outline"
                className="w-full gap-2 text-xs"
                onClick={() => setSharePortalModal(ev)}
              >
                <Copy size={12} /> Partager l'espace client
              </Button>
            </div>
          ))}
        </div>
      </div>

      {/* Documents */}
      <ClientDocumentsAdmin clientId={clientId} evenementId={evenement?.id || ''} />

      {/* Rendez-vous */}
      <RendezVousSection
        clientId={clientId}
        evenementId={evenement?.id || ''}
        evenementNom={evenement?.nom || client.type_evenement || ''}
        clientNom={clientNom}
        isAdmin={true}
      />

      {/* Chat */}
      <ChatSection
        clientId={clientId}
        evenementId={evenement?.id || ''}
        evenementNom={evenement?.nom || client.type_evenement || ''}
        clientNom={clientNom}
        isAdmin={true}
      />

      {/* Modal événement */}
      {evenementModal && (
        <EvenementModal
           evenement={evenementModal === 'new' ? {
              client_id: clientId,
              client_nom: clientNom,
              client_email: client.email || '',
              client_telephone: client.telephone || '',
            } : evenementModal}
           onClose={() => {
            setEvenementModal(null);
            qc.invalidateQueries(['evenements-client', clientId]);
            qc.invalidateQueries(['evenements']);
          }}
        />
      )}

      {/* Modal partage espace client */}
      {sharePortalModal && (
        <ShareClientPortalModal
          evenement={sharePortalModal}
          onClose={() => setSharePortalModal(null)}
        />
      )}
    </div>
  );
}