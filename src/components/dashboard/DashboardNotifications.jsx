import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { base44 } from '@/api/base44Client';
import { Check, X, ExternalLink } from 'lucide-react';
import { useNavigate } from 'react-router-dom';
import { format, parseISO } from 'date-fns';
import { fr } from 'date-fns/locale';
import RappelBouton from '@/components/rappels/RappelBouton';
import DevisDemandeButton from '@/components/notifications/DevisDemandeButton';

const typeColors = {
  prestataire:   'bg-purple-100 text-purple-700 border-purple-200',
  rendezvous:    'bg-emerald-100 text-emerald-700 border-emerald-200',
  evenement:     'bg-orange-100 text-orange-700 border-orange-200',
  service:       'bg-blue-100 text-blue-700 border-blue-200',
  info:          'bg-slate-100 text-slate-600 border-slate-200',
  devis_demande: 'bg-rose-100 text-rose-700 border-rose-200',
};

const typeIcons = {
  prestataire:   '🤝',
  rendezvous:    '📅',
  evenement:     '🎉',
  service:       '🍽️',
  info:          'ℹ️',
  devis_demande: '📋',
};

const typeLabels = {
  prestataire:   'Prestataire',
  rendezvous:    'Rendez-vous',
  evenement:     'Événement',
  service:       'Service',
  info:          'Info',
  devis_demande: 'Demande devis',
};

export default function DashboardNotifications() {
  const qc = useQueryClient();
  const navigate = useNavigate();

  const { data: notifications = [] } = useQuery({
    queryKey: ['notifications'],
    queryFn: () => base44.entities.Notification.list('-created_date', 30),
    refetchInterval: 30000,
  });

  const nonLues = notifications.filter(n => !n.lu);

  const markLueMutation = useMutation({
    mutationFn: (id) => base44.entities.Notification.update(id, { lu: true }),
    onSuccess: () => qc.invalidateQueries(['notifications']),
  });

  const markAllLuesMutation = useMutation({
    mutationFn: async () => {
      for (const n of nonLues) {
        await base44.entities.Notification.update(n.id, { lu: true });
      }
    },
    onSuccess: () => qc.invalidateQueries(['notifications']),
  });

  const deleteMutation = useMutation({
    mutationFn: (id) => base44.entities.Notification.delete(id),
    onSuccess: () => qc.invalidateQueries(['notifications']),
  });

  if (notifications.length === 0) return null;

  return (
    <div className="bg-card rounded-2xl border border-border shadow-sm p-5">
      {/* Header */}
      <div className="flex items-center gap-2 px-3 py-2 border-b border-border -m-5 mb-4 pb-4">
        {/* Titre + badge non lues */}
        <div className="flex items-center gap-1.5 flex-1">
          <span className="font-semibold text-sm">Notifications</span>
          {nonLues.length > 0 && (
            <span className="bg-primary text-white text-xs rounded-full px-1.5 py-0.5 leading-none">
              {nonLues.length}
            </span>
          )}
        </div>

        {/* Bouton Rappel compact */}
        <RappelBouton context={undefined} />

        {/* Tout marquer lu — icône seule */}
        <button onClick={() => markAllLuesMutation.mutate()}
          disabled={markAllLuesMutation.isPending}
          className="p-1.5 rounded-lg hover:bg-muted text-muted-foreground disabled:opacity-50"
          title="Tout marquer lu">
          <Check size={14} />
        </button>
      </div>

      {/* Liste */}
      <div className="space-y-2">
        {notifications.map(n => (
          <div
            key={n.id}
            className={`flex gap-3 rounded-xl px-4 py-3 border transition-colors ${
              !n.lu ? 'bg-primary/5 border-primary/15' : 'bg-muted/30 border-transparent hover:bg-muted/50'
            }`}
          >
            {/* Icône type */}
            <div className={`shrink-0 w-8 h-8 rounded-lg flex items-center justify-center text-sm border ${typeColors[n.type] || typeColors.info}`}>
              {typeIcons[n.type] || 'ℹ️'}
            </div>

            {/* Contenu */}
            <div className="flex-1 min-w-0">
              <div className="flex items-center gap-2 mb-0.5 flex-wrap">
                <span className={`text-[10px] px-1.5 py-0.5 rounded-full font-semibold uppercase border ${typeColors[n.type] || typeColors.info}`}>
                  {typeLabels[n.type] || n.type}
                </span>
                {!n.lu && <span className="w-1.5 h-1.5 bg-primary rounded-full shrink-0" title="Non lue" />}
                <span className="text-[10px] text-muted-foreground/60 ml-auto">
                  {format(parseISO(n.created_date), "d MMM 'à' HH:mm", { locale: fr })}
                </span>
              </div>
              <p className="text-sm font-semibold">{n.titre}</p>
              <p className="text-xs text-muted-foreground mt-0.5 whitespace-pre-line">{n.message}</p>
              {n.type === 'devis_demande' && (
                <DevisDemandeButton notification={n} onMarqueLue={() => markLueMutation.mutate(n.id)} />
              )}
            </div>

            {/* Actions */}
            <div className="flex flex-col items-end gap-1 shrink-0">
              {n.lien && (
                <button
                  onClick={() => { markLueMutation.mutate(n.id); navigate(n.lien); }}
                  className="p-1 rounded hover:bg-primary/10 text-primary"
                  title="Voir"
                >
                  <ExternalLink size={13} />
                </button>
              )}
              {!n.lu && (
                <button
                  onClick={() => markLueMutation.mutate(n.id)}
                  className="p-1 rounded hover:bg-emerald-50 text-muted-foreground hover:text-emerald-600"
                  title="Marquer comme lue"
                >
                  <Check size={13} />
                </button>
              )}
              <button
                onClick={() => deleteMutation.mutate(n.id)}
                className="p-1 rounded hover:bg-red-50 text-muted-foreground hover:text-red-500"
                title="Supprimer"
              >
                <X size={13} />
              </button>
            </div>
          </div>
        ))}
      </div>
    </div>
  );
}