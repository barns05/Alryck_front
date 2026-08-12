import { useState, useMemo } from 'react';
import { useQuery } from '@tanstack/react-query';
import { base44 } from '@/api/base44Client';
import { ArrowLeft, Check, Eye, ThumbsDown, Send, Search, Filter, Inbox } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { format, parseISO } from 'date-fns';
import { fr } from 'date-fns/locale';
import { useNavigate } from 'react-router-dom';

const reponseConfig = {
  'Envoyé':  { color: 'bg-slate-100 text-slate-600', icon: Send },
  'Vue':     { color: 'bg-blue-100 text-blue-700', icon: Eye },
  'Accepté': { color: 'bg-emerald-100 text-emerald-700', icon: Check },
  'Refusé':  { color: 'bg-red-100 text-red-600', icon: ThumbsDown },
};

const FILTRES_STATUT = ['Tous', 'Envoyé', 'Vue', 'Accepté', 'Refusé'];

export default function PromotionsHistorique() {
  const navigate = useNavigate();
  const [filtreStatut, setFiltreStatut] = useState('Tous');
  const [recherche, setRecherche] = useState('');

  const { data: promotions = [] } = useQuery({
    queryKey: ['promotions'],
    queryFn: () => base44.entities.Promotion.list(),
  });

  const { data: reponses = [] } = useQuery({
    queryKey: ['promo-reponses'],
    queryFn: () => base44.entities.PromotionReponse.list('-date_reponse', 1000),
  });

  const filtered = useMemo(() => {
    let result = reponses;

    // Filtre par statut
    if (filtreStatut !== 'Tous') {
      result = result.filter(r => r.reponse === filtreStatut);
    }

    // Filtre par recherche (promotion OU client)
    if (recherche) {
      const q = recherche.toLowerCase();
      result = result.filter(r => 
        r.promotion_titre?.toLowerCase().includes(q) ||
        r.client_nom?.toLowerCase().includes(q) ||
        r.client_email?.toLowerCase().includes(q)
      );
    }

    return result;
  }, [reponses, filtreStatut, recherche]);

  const stats = useMemo(() => {
    const total = reponses.length;
    const envoyes = reponses.filter(r => r.reponse === 'Envoyé').length;
    const vues = reponses.filter(r => r.reponse === 'Vue').length;
    const acceptes = reponses.filter(r => r.reponse === 'Accepté').length;
    const refuses = reponses.filter(r => r.reponse === 'Refusé').length;
    return { total, envoyes, vues, acceptes, refuses };
  }, [reponses]);

  return (
    <div className="p-4 md:p-6 space-y-4 max-w-6xl mx-auto">
      {/* Header */}
      <div className="flex items-center gap-3">
        <Button variant="ghost" size="icon" onClick={() => navigate('/promotions')} className="h-9 w-9">
          <ArrowLeft size={18} />
        </Button>
        <div>
          <h2 className="text-2xl font-bold">📊 Historique des envois</h2>
          <p className="text-muted-foreground text-sm">Suivez les réponses des clients à vos promotions</p>
        </div>
      </div>

      {/* Stats globales */}
      <div className="grid grid-cols-5 gap-3">
        {[
          { label: 'Total envois', value: stats.total, color: 'text-foreground' },
          { label: 'Envoyés', value: stats.envoyes, color: 'text-slate-600' },
          { label: 'Vues', value: stats.vues, color: 'text-blue-600' },
          { label: 'Acceptés', value: stats.acceptes, color: 'text-emerald-600' },
          { label: 'Refus', value: stats.refuses, color: 'text-red-500' },
        ].map(s => (
          <div key={s.label} className="bg-card border border-border rounded-2xl p-4 text-center">
            <p className={`text-2xl font-bold ${s.color}`}>{s.value}</p>
            <p className="text-xs text-muted-foreground mt-0.5">{s.label}</p>
          </div>
        ))}
      </div>

      {/* Recherche et filtres */}
      <div className="space-y-3">
        <div className="relative">
          <Search size={14} className="absolute left-3 top-1/2 -translate-y-1/2 text-muted-foreground" />
          <input
            value={recherche}
            onChange={e => setRecherche(e.target.value)}
            placeholder="Rechercher par client ou promotion…"
            className="w-full pl-9 pr-3 py-2 text-sm rounded-lg border border-border bg-background focus:outline-none focus:ring-1 focus:ring-ring"
          />
        </div>
        <div className="flex items-center gap-2 flex-wrap">
          <Filter size={14} className="text-muted-foreground" />
          {FILTRES_STATUT.map(s => (
            <button
              key={s}
              onClick={() => setFiltreStatut(s)}
              className={`px-3 py-1.5 rounded-full text-xs font-medium border transition-colors ${
                filtreStatut === s
                  ? 'bg-primary text-white border-primary'
                  : 'border-border text-muted-foreground hover:border-primary/40'
              }`}
            >
              {s}
            </button>
          ))}
        </div>
      </div>

      {/* Cartes */}
      {filtered.length === 0 ? (
        <div className="bg-card border border-dashed border-border rounded-2xl p-12 text-center">
          <Inbox size={40} className="mx-auto mb-3 text-muted-foreground/40" />
          <p className="text-muted-foreground">{reponses.length === 0 ? 'Aucun envoi enregistré' : 'Aucun résultat pour ces filtres'}</p>
        </div>
      ) : (
        <div className="grid gap-3">
          {filtered.map(r => {
            const cfg = reponseConfig[r.reponse] || reponseConfig['Envoyé'];
            const Icon = cfg.icon;
            return (
              <div key={r.id} className="bg-card border border-border rounded-2xl p-4 hover:shadow-md transition-shadow">
                <div className="grid grid-cols-1 md:grid-cols-5 gap-4 items-start">
                  {/* Promotion */}
                  <div className="md:col-span-1">
                    <p className="text-xs text-muted-foreground uppercase tracking-wider font-semibold mb-1">Promotion</p>
                    <p className="font-medium text-sm break-words">{r.promotion_titre || 'Promotion supprimée'}</p>
                  </div>

                  {/* Client */}
                  <div className="md:col-span-1">
                    <p className="text-xs text-muted-foreground uppercase tracking-wider font-semibold mb-1">Client</p>
                    <p className="font-medium text-sm break-words">{r.client_nom || r.client_email || 'Inconnu'}</p>
                    {r.client_email && <p className="text-xs text-muted-foreground mt-0.5 break-words">{r.client_email}</p>}
                  </div>

                  {/* Événement */}
                  <div className="md:col-span-1">
                    <p className="text-xs text-muted-foreground uppercase tracking-wider font-semibold mb-1">Événement</p>
                    <p className="text-sm text-foreground">{r.evenement_nom || '-'}</p>
                  </div>

                  {/* Date */}
                  <div className="md:col-span-1">
                    <p className="text-xs text-muted-foreground uppercase tracking-wider font-semibold mb-1">Date</p>
                    <p className="text-sm text-muted-foreground">
                      {r.date_reponse ? format(parseISO(r.date_reponse), 'd MMM yyyy', { locale: fr }) : '-'}
                    </p>
                  </div>

                  {/* Statut */}
                  <div className="md:col-span-1 flex items-end h-full md:justify-end">
                    <span className={`inline-flex items-center gap-1.5 text-xs px-3 py-1.5 rounded-full font-medium whitespace-nowrap ${cfg.color}`}>
                      <Icon size={12} /> {r.reponse}
                    </span>
                  </div>
                </div>
              </div>
            );
          })}
        </div>
      )}

      <div className="text-xs text-muted-foreground text-center">
        {filtered.length} résultat{filtered.length !== 1 ? 's' : ''} affiché{filtered.length !== 1 ? 's' : ''}
      </div>
    </div>
  );
}