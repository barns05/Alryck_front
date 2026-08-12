import { useState, useEffect, useRef } from 'react';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { base44 } from '@/api/base44Client';
import { Bell, X, Check, ExternalLink } from 'lucide-react';
import { useNavigate } from 'react-router-dom';
import { format, parseISO } from 'date-fns';
import { fr } from 'date-fns/locale';
import RappelModal from '@/components/rappels/RappelModal';
import DevisDemandeButton from '@/components/notifications/DevisDemandeButton';

const typeColors = {
  prestataire:   'bg-purple-100 text-purple-700',
  rendezvous:    'bg-emerald-100 text-emerald-700',
  evenement:     'bg-orange-100 text-orange-700',
  service:       'bg-blue-100 text-blue-700',
  info:          'bg-slate-100 text-slate-600',
  devis_demande: 'bg-rose-100 text-rose-700',
};

export default function NotificationBell({ panelSide = 'right' }) {
  const [open, setOpen] = useState(false);
  const [badgeSeen, setBadgeSeen] = useState(false);
  const [openRappel, setOpenRappel] = useState(false);
  const ref = useRef(null);
  const qc = useQueryClient();
  const navigate = useNavigate();

  const { data: notifications = [] } = useQuery({
    queryKey: ['notifications'],
    queryFn: async () => {
      const isAuth = await base44.auth.isAuthenticated();
      if (!isAuth) return [];
      return base44.entities.Notification.list('-created_date', 30);
    },
    refetchInterval: 30000,
  });

  const nonLues = notifications.filter(n => !n.lu);
  // Badge disparaît une fois le panneau ouvert
  const showBadge = nonLues.length > 0 && !badgeSeen;

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

  const deleteNotifMutation = useMutation({
    mutationFn: (id) => base44.entities.Notification.delete(id),
    onSuccess: () => qc.invalidateQueries(['notifications']),
  });

  const handleOpen = () => {
    setOpen(v => !v);
    setBadgeSeen(true); // Badge disparaît à l'ouverture
  };

  // Fermer en cliquant dehors
  useEffect(() => {
    const handleClick = (e) => {
      if (ref.current && !ref.current.contains(e.target)) setOpen(false);
    };
    document.addEventListener('mousedown', handleClick);
    return () => document.removeEventListener('mousedown', handleClick);
  }, []);

  // Réafficher le badge si de nouvelles notifications arrivent après fermeture
  useEffect(() => {
    if (!open && nonLues.length > 0) setBadgeSeen(false);
  }, [nonLues.length]);

  // Positionnement du panneau
  const panelClass = panelSide === 'right'
    ? 'left-full top-0 ml-2'
    : 'right-0 top-full mt-2';

  return (
    <div className="relative" ref={ref}>
      <button
        onClick={handleOpen}
        className="relative p-2 rounded-lg hover:bg-sidebar-accent/50 text-sidebar-foreground/70 hover:text-white transition-colors"
        title="Notifications"
      >
        <Bell size={18} />
        {showBadge && (
          <span className="absolute -top-0.5 -right-0.5 w-4 h-4 bg-red-500 text-white text-[9px] font-bold rounded-full flex items-center justify-center">
            {nonLues.length > 9 ? '9+' : nonLues.length}
          </span>
        )}
      </button>

      {open && (
        <div className={`absolute ${panelClass} w-80 bg-card border border-border rounded-2xl shadow-xl z-50 flex flex-col max-h-[480px]`}>
          {/* Header */}
          <div className="flex items-center gap-2 px-3 py-2 border-b border-border">
            {/* Titre + badge non lues */}
            <div className="flex items-center gap-1.5 flex-1">
              <span className="font-semibold text-sm">Notifications</span>
              {nonLues.length > 0 && (
                <span className="bg-primary text-white text-xs rounded-full px-1.5 py-0.5 leading-none">
                  {nonLues.length}
                </span>
              )}
            </div>

            {/* Bouton Rappel */}
            <button
              onClick={() => setOpenRappel(true)}
              className="p-1.5 rounded-lg hover:bg-muted text-muted-foreground"
              title="Ajouter un rappel"
            >
              <Bell size={14} />
            </button>

            {/* Tout marquer lu — icône seule */}
            <button onClick={() => markAllLuesMutation.mutate()}
              disabled={markAllLuesMutation.isPending}
              className="p-1.5 rounded-lg hover:bg-muted text-muted-foreground disabled:opacity-50"
              title="Tout marquer lu">
              <Check size={14} />
            </button>

            {/* Fermer */}
            <button onClick={() => setOpen(false)} className="p-1.5 rounded-lg hover:bg-muted text-muted-foreground">
              <X size={14} />
            </button>
          </div>
          {openRappel && (
            <RappelModal
              defaultContext={undefined}
              onClose={() => setOpenRappel(false)}
              onSaved={() => qc.invalidateQueries(['rappels'])}
            />
          )}

          {/* Liste */}
          <div className="flex-1 overflow-y-auto divide-y divide-border">
            {notifications.length === 0 && (
              <div className="py-10 text-center text-muted-foreground text-sm">
                <Bell size={24} className="mx-auto mb-2 opacity-30" />
                Aucune notification
              </div>
            )}
            {notifications.map(n => (
              <div
                key={n.id}
                className={`px-4 py-3 flex gap-3 transition-colors ${!n.lu ? 'bg-primary/5' : 'hover:bg-muted/30'}`}
              >
                <div className="flex-1 min-w-0">
                  <div className="flex items-center gap-2 mb-0.5">
                    <span className={`text-[9px] px-1.5 py-0.5 rounded-full font-semibold uppercase ${typeColors[n.type] || typeColors.info}`}>
                      {n.type}
                    </span>
                    {!n.lu && <span className="w-1.5 h-1.5 bg-primary rounded-full shrink-0" />}
                  </div>
                  {n.lien ? (
                    <button
                      onClick={() => { markLueMutation.mutate(n.id); setOpen(false); navigate(n.lien); }}
                      className="block text-left w-full hover:text-primary transition-colors"
                    >
                      <p className="text-sm font-semibold truncate">{n.titre}</p>
                      <p className="text-xs text-muted-foreground mt-0.5 line-clamp-2">{n.message}</p>
                    </button>
                  ) : (
                    <>
                      <p className="text-sm font-semibold truncate">{n.titre}</p>
                      <p className="text-xs text-muted-foreground mt-0.5 line-clamp-2">{n.message}</p>
                    </>
                  )}
                  {n.type === 'devis_demande' && (
                    <DevisDemandeButton
                      notification={n}
                      onMarqueLue={() => markLueMutation.mutate(n.id)}
                      compact
                    />
                  )}
                  <p className="text-[10px] text-muted-foreground/60 mt-1">
                    {n.created_date ? format(parseISO(n.created_date), "d MMM 'à' HH:mm", { locale: fr }) : ''}
                  </p>
                </div>
                <div className="flex flex-col items-end gap-1 shrink-0">
                  {n.lien && (
                    <button
                      onClick={() => { markLueMutation.mutate(n.id); setOpen(false); navigate(n.lien); }}
                      className="text-primary hover:text-primary/80 p-0.5"
                      title="Voir"
                    >
                      <ExternalLink size={12} />
                    </button>
                  )}
                  {!n.lu && (
                    <button
                      onClick={() => markLueMutation.mutate(n.id)}
                      className="text-muted-foreground hover:text-primary p-0.5"
                      title="Marquer lu"
                    >
                      <Check size={12} />
                    </button>
                  )}
                  <button
                    onClick={() => deleteNotifMutation.mutate(n.id)}
                    className="text-muted-foreground hover:text-destructive p-0.5"
                    title="Supprimer"
                  >
                    <X size={12} />
                  </button>
                </div>
              </div>
            ))}
          </div>

          {/* Footer */}
          <div className="px-4 py-3 border-t border-border shrink-0">
            <button
              onClick={() => { setOpen(false); navigate('/notifications'); }}
              className="w-full text-xs text-center text-primary hover:underline font-medium"
            >
              Voir toutes les notifications →
            </button>
          </div>
        </div>
      )}
    </div>
  );
}