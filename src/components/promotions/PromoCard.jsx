import { useState } from 'react';
import { Button } from '@/components/ui/button';
import { CheckCircle2 } from 'lucide-react';
import PromoOffreBadge from '@/components/promotions/PromoOffreBadge';
import PerformancesTab from '@/components/promotions/PerformancesTab';

const statutColors = {
  'Brouillon': 'bg-slate-100 text-slate-600',
  'Envoyée': 'bg-emerald-100 text-emerald-700',
  'Archivée': 'bg-muted text-muted-foreground',
};

export default function PromoCard({ promo, stats, reponses = [], onEdit, onSend, onArchive, onDelete }) {
  const [activeTab, setActiveTab] = useState('apercu');
  const isExpired = promo.date_validite && new Date(promo.date_validite) < new Date();

  return (
    <div className="bg-card border border-border rounded-2xl p-4 space-y-3 flex flex-col h-full">
      {/* Header avec visuel */}
      <div className="flex items-start gap-3">
        {promo.visuel_url && <img src={promo.visuel_url} alt="" className="w-16 h-16 rounded-xl object-cover shrink-0" />}
        <div className="flex-1 min-w-0">
          <div className="flex items-center gap-2 flex-wrap">
            <h3 className="font-semibold text-sm truncate">{promo.titre}</h3>
            <span className={`text-[10px] px-2 py-0.5 rounded-full font-medium ${statutColors[promo.statut]}`}>{promo.statut}</span>
          </div>
          {isExpired && <p className="text-[10px] text-red-600 font-medium mt-0.5">⚠️ Expirée</p>}
          <div className="mt-1.5">
            <PromoOffreBadge promo={promo} />
          </div>
        </div>
      </div>

      {/* Onglets */}
      <div className="flex gap-2 border-b border-border -mx-4 px-4">
        <button
          onClick={() => setActiveTab('apercu')}
          className={`text-xs font-medium pb-2 transition-colors ${
            activeTab === 'apercu'
              ? 'text-primary border-b-2 border-primary'
              : 'text-muted-foreground hover:text-foreground'
          }`}
        >
          Aperçu
        </button>
        <button
          onClick={() => setActiveTab('performances')}
          className={`text-xs font-medium pb-2 transition-colors ${
            activeTab === 'performances'
              ? 'text-primary border-b-2 border-primary'
              : 'text-muted-foreground hover:text-foreground'
          }`}
        >
          Performances
        </button>
      </div>

      {/* Contenu des onglets */}
      <div className="flex-1">
        {activeTab === 'apercu' && (
          <div className="space-y-2">
            {promo.description && <p className="text-xs text-muted-foreground">{promo.description}</p>}
            <div className="flex items-center justify-between text-xs text-muted-foreground border-t border-border pt-2">
              <span><span className="font-semibold text-foreground">{stats.envois}</span> envois</span>
              <span><span className="font-semibold text-blue-600">{stats.vues}</span> vues</span>
              <span><span className="font-semibold text-emerald-600">{stats.acceptations}</span> ✓</span>
            </div>
          </div>
        )}

        {activeTab === 'performances' && (
          <PerformancesTab promo={promo} reponses={reponses} />
        )}
      </div>

      {/* Actions */}
      <div className="flex gap-2 pt-1">
        <Button size="sm" variant="outline" className="text-xs h-8 flex-1 gap-1" onClick={onEdit}>
          ✏️ Modifier
        </Button>
        <Button size="sm" className="text-xs h-8 flex-1 gap-1 bg-primary hover:bg-primary/90" onClick={onSend}>
          📤 Envoyer
        </Button>
        <Button size="sm" variant="ghost" className="text-xs h-8 text-muted-foreground hover:text-foreground" onClick={onArchive} title="Archiver">
          🗑️
        </Button>
      </div>
    </div>
  );
}