import { TrendingUp, Eye, ThumbsUp, ThumbsDown, DollarSign, Percent } from 'lucide-react';

export default function PerformancesTab({ promo, reponses = [] }) {
  const stats = {
    envois: promo.nb_envois || 0,
    envoyes: reponses.filter(r => r.reponse === 'Envoyé').length,
    vues: reponses.filter(r => r.reponse === 'Vu').length,
    acceptations: reponses.filter(r => r.reponse === 'Accepté').length,
    refus: reponses.filter(r => r.reponse === 'Refusé').length,
  };

  const tauxConversion = stats.envois > 0 ? Math.round((stats.acceptations / stats.envois) * 100) : 0;
  const caGenere = stats.acceptations * (promo.prix || 0);

  const StatCard = ({ icon: Icon, label, value, unit = '', color = 'text-slate-600' }) => (
    <div className="bg-muted/50 rounded-xl p-3">
      <div className="flex items-center gap-2 mb-1">
        <Icon size={16} className={color} />
        <p className="text-xs text-muted-foreground font-medium">{label}</p>
      </div>
      <p className="text-2xl font-bold">{value}{unit}</p>
    </div>
  );

  return (
    <div className="space-y-4">
      <div className="grid grid-cols-2 gap-3">
        <StatCard icon={TrendingUp} label="Envois total" value={stats.envois} color="text-primary" />
        <StatCard icon={Eye} label="Vues" value={stats.vues} color="text-blue-600" />
        <StatCard icon={ThumbsUp} label="Acceptations" value={stats.acceptations} color="text-emerald-600" />
        <StatCard icon={ThumbsDown} label="Refus" value={stats.refus} color="text-red-600" />
        <StatCard icon={Percent} label="Taux de conversion" value={tauxConversion} unit="%" color="text-amber-600" />
        <StatCard icon={DollarSign} label="CA généré" value={caGenere.toLocaleString('fr-FR')} unit=" €" color="text-green-600" />
      </div>

      {stats.envois > 0 && (
        <div className="bg-card border border-border rounded-xl p-4 space-y-2">
          <h4 className="text-xs font-semibold text-muted-foreground mb-3">📊 Résumé</h4>
          <div className="space-y-1.5 text-xs text-muted-foreground">
            <div className="flex justify-between">
              <span>Taux d'ouverture</span>
              <span className="font-semibold">{stats.envois > 0 ? Math.round((stats.vues / stats.envois) * 100) : 0}%</span>
            </div>
            <div className="flex justify-between">
              <span>Taux d'acceptation</span>
              <span className="font-semibold">{tauxConversion}%</span>
            </div>
            <div className="flex justify-between">
              <span>Valeur moyenne par acceptation</span>
              <span className="font-semibold">{stats.acceptations > 0 ? (caGenere / stats.acceptations).toLocaleString('fr-FR') : 0} €</span>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}