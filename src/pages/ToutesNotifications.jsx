import { useState } from 'react';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { base44 } from '@/api/base44Client';
import { Bell, X, Check, ExternalLink, ArrowLeft, Filter } from 'lucide-react';
import { Link, useNavigate } from 'react-router-dom';
import { format, parseISO } from 'date-fns';
import { fr } from 'date-fns/locale';
import { Button } from '@/components/ui/button';

const typeColors = {
  prestataire: 'bg-purple-100 text-purple-700',
  rendezvous:  'bg-emerald-100 text-emerald-700',
  evenement:   'bg-orange-100 text-orange-700',
  service:     'bg-blue-100 text-blue-700',
  info:        'bg-slate-100 text-slate-600',
};

const typeLabels = {
  prestataire: 'Prestataires',
  rendezvous:  'Rendez-vous',
  evenement:   'Événements',
  service:     'Extras',
  info:        'Infos',
};

const LECTURE_FILTERS = [
  { value: 'all',    label: 'Toutes' },
  { value: 'unread', label: 'Non lues' },
  { value: 'read',   label: 'Lues' },
];

export default function ToutesNotifications() {
  const navigate = useNavigate();
  const qc = useQueryClient();
  const [lectureFilter, setLectureFilter] = useState('all');
  const [typeFilter, setTypeFilter] = useState('all');

  const { data: notifications = [], isLoading } = useQuery({
    queryKey: ['notifications'],
    queryFn: async () => {
      const isAuth = await base44.auth.isAuthenticated();
      if (!isAuth) return [];
      return base44.entities.Notification.list('-created_date', 200);
    },
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

  // Types disponibles dans les données
  const availableTypes = [...new Set(notifications.map(n => n.type).filter(Boolean))];

  // Filtrage
  const filtered = notifications.filter(n => {
    const matchLecture =
      lectureFilter === 'all' ? true :
      lectureFilter === 'unread' ? !n.lu :
      n.lu;
    const matchType = typeFilter === 'all' || n.type === typeFilter;
    return matchLecture && matchType;
  });

  return (
    <div className="max-w-2xl mx-auto px-4 py-8">
      {/* Header */}
      <div className="flex items-center gap-3 mb-6">
        <button
          onClick={() => navigate(-1)}
          className="p-2 rounded-lg hover:bg-muted text-muted-foreground hover:text-foreground transition-colors"
        >
          <ArrowLeft size={18} />
        </button>
        <div className="flex-1">
          <h1 className="text-xl font-bold text-foreground flex items-center gap-2">
            <Bell size={20} className="text-primary" />
            Notifications
          </h1>
          {nonLues.length > 0 && (
            <p className="text-sm text-muted-foreground mt-0.5">{nonLues.length} non lue{nonLues.length > 1 ? 's' : ''}</p>
          )}
        </div>
        {nonLues.length > 0 && (
          <Button
            size="sm"
            variant="outline"
            onClick={() => markAllLuesMutation.mutate()}
            disabled={markAllLuesMutation.isPending}
            className="gap-1.5 text-xs"
          >
            <Check size={13} />
            Tout marquer lu
          </Button>
        )}
      </div>

      {/* Filtres */}
      <div className="flex flex-wrap gap-2 mb-6">
        {/* Lecture */}
        <div className="flex bg-muted rounded-lg p-0.5 gap-0.5">
          {LECTURE_FILTERS.map(f => (
            <button
              key={f.value}
              onClick={() => setLectureFilter(f.value)}
              className={`px-3 py-1.5 rounded-md text-xs font-medium transition-colors ${
                lectureFilter === f.value
                  ? 'bg-card text-foreground shadow-sm'
                  : 'text-muted-foreground hover:text-foreground'
              }`}
            >
              {f.label}
            </button>
          ))}
        </div>

        {/* Type */}
        {availableTypes.length > 1 && (
          <div className="flex items-center gap-1.5 flex-wrap">
            <Filter size={13} className="text-muted-foreground" />
            <button
              onClick={() => setTypeFilter('all')}
              className={`px-2.5 py-1 rounded-full text-xs font-medium transition-colors border ${
                typeFilter === 'all'
                  ? 'bg-primary text-primary-foreground border-primary'
                  : 'border-border text-muted-foreground hover:text-foreground hover:border-foreground/30'
              }`}
            >
              Tous types
            </button>
            {availableTypes.map(t => (
              <button
                key={t}
                onClick={() => setTypeFilter(typeFilter === t ? 'all' : t)}
                className={`px-2.5 py-1 rounded-full text-xs font-medium transition-colors border ${
                  typeFilter === t
                    ? 'bg-primary text-primary-foreground border-primary'
                    : 'border-border text-muted-foreground hover:text-foreground hover:border-foreground/30'
                }`}
              >
                {typeLabels[t] || t}
              </button>
            ))}
          </div>
        )}
      </div>

      {/* Liste */}
      {isLoading ? (
        <div className="text-center py-16 text-muted-foreground text-sm">Chargement…</div>
      ) : filtered.length === 0 ? (
        <div className="text-center py-16 text-muted-foreground">
          <Bell size={32} className="mx-auto mb-3 opacity-20" />
          <p className="text-sm">Aucune notification</p>
        </div>
      ) : (
        <div className="space-y-2">
          {filtered.map(n => (
            <div
              key={n.id}
              className={`flex gap-3 px-4 py-3.5 rounded-xl border transition-colors ${
                !n.lu
                  ? 'bg-primary/5 border-primary/20'
                  : 'bg-card border-border hover:bg-muted/30'
              }`}
            >
              {/* Point non lu */}
              <div className="pt-1 shrink-0">
                {!n.lu
                  ? <span className="block w-2 h-2 bg-primary rounded-full mt-0.5" />
                  : <span className="block w-2 h-2 rounded-full" />
                }
              </div>

              {/* Contenu */}
              <div className="flex-1 min-w-0">
                <div className="flex items-center gap-2 mb-0.5">
                  <span className={`text-[9px] px-1.5 py-0.5 rounded-full font-semibold uppercase ${typeColors[n.type] || typeColors.info}`}>
                    {typeLabels[n.type] || n.type || 'info'}
                  </span>
                </div>
                {n.lien ? (
                  <Link
                    to={n.lien}
                    onClick={() => { if (!n.lu) markLueMutation.mutate(n.id); }}
                    className="block hover:text-primary transition-colors group"
                  >
                    <p className={`text-sm truncate ${!n.lu ? 'font-semibold text-foreground' : 'font-medium text-foreground/80'}`}>
                      {n.titre}
                    </p>
                    <p className="text-xs text-muted-foreground mt-0.5 line-clamp-2">{n.message}</p>
                  </Link>
                ) : (
                  <>
                    <p className={`text-sm truncate ${!n.lu ? 'font-semibold text-foreground' : 'font-medium text-foreground/80'}`}>
                      {n.titre}
                    </p>
                    <p className="text-xs text-muted-foreground mt-0.5 line-clamp-2">{n.message}</p>
                  </>
                )}
                <p className="text-[10px] text-muted-foreground/60 mt-1.5">
                  {n.created_date ? format(parseISO(n.created_date), "EEEE d MMMM 'à' HH:mm", { locale: fr }) : ''}
                </p>
              </div>

              {/* Actions */}
              <div className="flex flex-col items-end gap-1 shrink-0 pt-0.5">
                {n.lien && (
                  <Link
                    to={n.lien}
                    onClick={() => { if (!n.lu) markLueMutation.mutate(n.id); }}
                    className="p-1 text-primary hover:text-primary/70 transition-colors"
                    title="Aller à la page"
                  >
                    <ExternalLink size={13} />
                  </Link>
                )}
                {!n.lu && (
                  <button
                    onClick={() => markLueMutation.mutate(n.id)}
                    className="p-1 text-muted-foreground hover:text-primary transition-colors"
                    title="Marquer lu"
                  >
                    <Check size={13} />
                  </button>
                )}
                <button
                  onClick={() => deleteMutation.mutate(n.id)}
                  className="p-1 text-muted-foreground hover:text-destructive transition-colors"
                  title="Supprimer"
                >
                  <X size={13} />
                </button>
              </div>
            </div>
          ))}
        </div>
      )}
    </div>
  );
}