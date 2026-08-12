import { useState, useMemo } from 'react';
import { useQuery, useQueryClient } from '@tanstack/react-query';
import { base44 } from '@/api/base44Client';
import { Plus, Send, Archive, Tag, Trash2, History, BarChart2, TrendingUp, Eye, ThumbsUp, DollarSign } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { format, parseISO, isAfter } from 'date-fns';
import { fr } from 'date-fns/locale';
import PromotionFormModal from '@/components/promotions/PromotionFormModal';
import PromotionSendModal from '@/components/promotions/PromotionSendModal';
import PromoCard from '@/components/promotions/PromoCard';
import PromoOffreBadge from '@/components/promotions/PromoOffreBadge';
import { useToast } from '@/components/ui/use-toast';
import { useNavigate } from 'react-router-dom';



export default function Promotions() {
  const navigate = useNavigate();
  const qc = useQueryClient();
  const { toast } = useToast();
  const [showForm, setShowForm] = useState(false);
  const [editPromo, setEditPromo] = useState(null);
  const [sendPromo, setSendPromo] = useState(null);
  const [activeTab, setActiveTab] = useState('promotions');

  const { data: promotions = [] } = useQuery({
    queryKey: ['promotions'],
    queryFn: () => base44.entities.Promotion.list('-created_date', 100),
  });

  const { data: reponses = [] } = useQuery({
    queryKey: ['promo-reponses'],
    queryFn: () => base44.entities.PromotionReponse.list('-created_date', 500),
  });

  const getStats = (promo) => {
    const r = reponses.filter(x => x.promotion_id === promo.id);
    return {
      envois: promo.nb_envois || 0,
      vues: r.filter(x => x.reponse === 'Vue').length,
      acceptations: r.filter(x => x.reponse === 'Accepté').length,
      refus: r.filter(x => x.reponse === 'Refusé').length,
    };
  };

  const globalStats = useMemo(() => {
    const totalEnvois = promotions.reduce((sum, p) => sum + (p.nb_envois || 0), 0);
    const totalVues = reponses.filter(r => r.reponse === 'Vu').length;
    const totalAcceptations = reponses.filter(r => r.reponse === 'Accepté').length;
    const caGenere = reponses
      .filter(r => r.reponse === 'Accepté')
      .reduce((sum, r) => sum + (r.promotion_prix || 0), 0);
    return { totalEnvois, totalVues, totalAcceptations, caGenere };
  }, [promotions, reponses]);

  const handleArchive = async (promo) => {
    await base44.entities.Promotion.update(promo.id, { statut: 'Archivée' });
    qc.invalidateQueries(['promotions']);
    toast({ title: 'Promotion archivée' });
  };

  const handleDelete = async (promo) => {
    await base44.entities.Promotion.delete(promo.id);
    qc.invalidateQueries(['promotions']);
    toast({ title: 'Promotion supprimée' });
  };

  const active = promotions.filter(p => p.statut !== 'Archivée');
  const archived = promotions.filter(p => p.statut === 'Archivée');

  return (
    <div className="p-4 md:p-6 space-y-4 max-w-6xl mx-auto">
      {/* Header */}
      <div className="flex items-center justify-between flex-wrap gap-3 mb-6">
        <div>
          <h2 className="text-2xl font-bold">🎯 Promotions</h2>
          <p className="text-muted-foreground text-sm mt-1">Créez et envoyez des offres ciblées à vos clients</p>
        </div>
        <div className="flex items-center gap-2">
          <Button onClick={() => { setEditPromo(null); setShowForm(true); }} className="gap-2">
            <Plus size={16} /> Nouvelle promotion
          </Button>
        </div>
      </div>

      {/* Boutons de navigation */}
      <div className="grid grid-cols-3 gap-3 max-w-2xl">
        <button
          onClick={() => setActiveTab('promotions')}
          className={`rounded-2xl border-2 p-4 text-left transition-all ${
            activeTab === 'promotions'
              ? 'border-primary bg-primary/10'
              : 'border-border hover:border-primary/40 bg-card'
          }`}
        >
          <Tag size={20} className={activeTab === 'promotions' ? 'text-primary mb-2' : 'text-muted-foreground mb-2'} />
          <p className="font-semibold text-sm">Promotions</p>
          <p className="text-xs text-muted-foreground mt-0.5">{active.length + archived.length} au total</p>
        </button>
        <button
          onClick={() => setActiveTab('performances')}
          className={`rounded-2xl border-2 p-4 text-left transition-all ${
            activeTab === 'performances'
              ? 'border-primary bg-primary/10'
              : 'border-border hover:border-primary/40 bg-card'
          }`}
        >
          <BarChart2 size={20} className={activeTab === 'performances' ? 'text-primary mb-2' : 'text-muted-foreground mb-2'} />
          <p className="font-semibold text-sm">Performances</p>
          <p className="text-xs text-muted-foreground mt-0.5">{globalStats.totalEnvois} envois</p>
        </button>
        <button
          onClick={() => navigate('/promotions-historique')}
          className="rounded-2xl border-2 p-4 text-left transition-all border-border hover:border-primary/40 bg-card"
        >
          <History size={20} className="text-muted-foreground mb-2" />
          <p className="font-semibold text-sm">Historique</p>
          <p className="text-xs text-muted-foreground mt-0.5">Suivi des envois</p>
        </button>
      </div>

      {/* ONGLET PROMOTIONS */}
      {activeTab === 'promotions' && (
        <>
          {/* Grille des promotions actives */}
          <div>
            <div className="flex items-center justify-between mb-3">
              <h3 className="font-semibold text-sm text-muted-foreground">Promotions actives ({active.length})</h3>
            </div>
            {active.length === 0 && (
              <div className="bg-card border border-dashed border-border rounded-2xl p-8 text-center text-muted-foreground">
                <Tag size={32} className="mx-auto mb-3 opacity-30" />
                <p className="font-medium">Aucune promotion</p>
                <p className="text-sm mt-1">Créez votre première offre pour la proposer à vos clients</p>
              </div>
            )}
            <div className="grid gap-3 md:grid-cols-2 lg:grid-cols-3">
              {active.map(promo => (
                <PromoCard
                  key={promo.id}
                  promo={promo}
                  stats={getStats(promo)}
                  reponses={reponses.filter(r => r.promotion_id === promo.id)}
                  onEdit={() => { setEditPromo(promo); setShowForm(true); }}
                  onSend={() => setSendPromo(promo)}
                  onArchive={() => handleArchive(promo)}
                />
              ))}
            </div>
          </div>

          {/* Archives */}
          {archived.length > 0 && (
            <div>
              <h3 className="font-semibold text-sm text-muted-foreground mb-3">Archives ({archived.length})</h3>
              <div className="grid gap-3 md:grid-cols-2 lg:grid-cols-3">
                {archived.map(promo => {
                  const stats = getStats(promo);
                  return (
                    <div key={promo.id} className="bg-muted/30 border border-border rounded-2xl p-4 opacity-70">
                      <div className="flex items-start gap-3">
                        {promo.visuel_url && <img src={promo.visuel_url} alt="" className="w-12 h-12 rounded-xl object-cover shrink-0 opacity-70" />}
                        <div className="min-w-0 flex-1">
                          <p className="font-semibold text-muted-foreground text-sm truncate">{promo.titre}</p>
                          <PromoOffreBadge promo={promo} className="mt-1 opacity-70 scale-90" />
                          <p className="text-xs text-muted-foreground mt-1">{stats.envois} envois · {stats.acceptations} acceptations</p>
                        </div>
                      </div>
                      <div className="flex gap-1.5 mt-3">
                        <Button size="sm" variant="outline" className="text-xs h-7 flex-1" onClick={() => handleDelete(promo)}>
                          <Trash2 size={12} /> Supprimer
                        </Button>
                      </div>
                    </div>
                  );
                })}
              </div>
            </div>
          )}
        </>
      )}

      {/* ONGLET PERFORMANCES */}
      {activeTab === 'performances' && (
        <div className="space-y-6">
          {/* Stats globales */}
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
            <div className="bg-card border border-border rounded-2xl p-4">
              <div className="flex items-center gap-2 mb-2">
                <TrendingUp size={16} className="text-primary" />
                <p className="text-xs text-muted-foreground font-medium">Total envois</p>
              </div>
              <p className="text-3xl font-bold text-primary">{globalStats.totalEnvois}</p>
            </div>
            <div className="bg-card border border-border rounded-2xl p-4">
              <div className="flex items-center gap-2 mb-2">
                <Eye size={16} className="text-blue-600" />
                <p className="text-xs text-muted-foreground font-medium">Total vues</p>
              </div>
              <p className="text-3xl font-bold text-blue-600">{globalStats.totalVues}</p>
            </div>
            <div className="bg-card border border-border rounded-2xl p-4">
              <div className="flex items-center gap-2 mb-2">
                <ThumbsUp size={16} className="text-emerald-600" />
                <p className="text-xs text-muted-foreground font-medium">Total acceptations</p>
              </div>
              <p className="text-3xl font-bold text-emerald-600">{globalStats.totalAcceptations}</p>
            </div>
            <div className="bg-card border border-border rounded-2xl p-4">
              <div className="flex items-center gap-2 mb-2">
                <DollarSign size={16} className="text-green-600" />
                <p className="text-xs text-muted-foreground font-medium">CA généré</p>
              </div>
              <p className="text-3xl font-bold text-green-600">{globalStats.caGenere.toLocaleString('fr-FR')} €</p>
            </div>
          </div>

          {/* Détail par promotion */}
          <div>
            <h3 className="font-semibold text-sm text-muted-foreground mb-3">Détail par promotion</h3>
            {promotions.length === 0 && (
              <div className="bg-card border border-dashed border-border rounded-2xl p-8 text-center text-muted-foreground">
                <p className="text-sm">Aucune promotion créée</p>
              </div>
            )}
            <div className="space-y-2">
              {promotions.map(promo => {
                const stats = getStats(promo);
                const promoCA = stats.acceptations * (promo.prix || 0);
                return (
                  <div key={promo.id} className="bg-card border border-border rounded-xl p-4 flex items-center justify-between">
                    <div className="flex-1 min-w-0">
                      <p className="font-semibold text-sm truncate">{promo.titre}</p>
                      <p className="text-xs text-muted-foreground mt-0.5">{promo.description}</p>
                    </div>
                    <div className="grid grid-cols-2 md:grid-cols-4 gap-3 ml-0 md:ml-4">
                      <div className="text-center md:text-right">
                        <p className="text-xs text-muted-foreground">Envois</p>
                        <p className="text-lg font-bold">{stats.envois}</p>
                      </div>
                      <div className="text-center md:text-right">
                        <p className="text-xs text-muted-foreground">Vues</p>
                        <p className="text-lg font-bold text-blue-600">{stats.vues}</p>
                      </div>
                      <div className="text-center md:text-right">
                        <p className="text-xs text-muted-foreground">Acceptations</p>
                        <p className="text-lg font-bold text-emerald-600">{stats.acceptations}</p>
                      </div>
                      <div className="text-center md:text-right">
                        <p className="text-xs text-muted-foreground">CA</p>
                        <p className="text-lg font-bold text-green-600">{promoCA.toLocaleString('fr-FR')} €</p>
                      </div>
                    </div>
                  </div>
                );
              })}
            </div>
          </div>
        </div>
      )}

      {/* Modals */}
      {showForm && (
        <PromotionFormModal
          promo={editPromo}
          onClose={() => { setShowForm(false); setEditPromo(null); }}
          onSaved={() => { setShowForm(false); setEditPromo(null); qc.invalidateQueries(['promotions']); }}
        />
      )}
      {sendPromo && (
        <PromotionSendModal
          promo={sendPromo}
          reponses={reponses.filter(r => r.promotion_id === sendPromo.id)}
          onClose={() => setSendPromo(null)}
          onSent={() => { setSendPromo(null); qc.invalidateQueries(['promotions']); qc.invalidateQueries(['promo-reponses']); }}
        />
      )}
    </div>
  );
}