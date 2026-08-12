import { useState } from 'react';
import { useQuery } from '@tanstack/react-query';
import { base44 } from '@/api/base44Client';
import { ChevronRight, Receipt, Zap } from 'lucide-react';
import { isPast, parseISO } from 'date-fns';
import PageCard from '@/components/PageCard';
import Facturation from './Facturation';
import Automatisations from './Automatisations';

const SECTIONS = [
  {
    id: 'facturation',
    emoji: '💶',
    iconBg: 'bg-emerald-100 text-emerald-700',
    title: 'Facturation',
    component: Facturation,
  },
  {
    id: 'automatisations',
    emoji: '⚡',
    iconBg: 'bg-violet-100 text-violet-700',
    title: 'Automatisations',
    component: Automatisations,
  },
];

export default function Business() {
  const [section, setSection] = useState(null);

  const { data: devisList = [] } = useQuery({
    queryKey: ['tous-devis'],
    queryFn: () => base44.entities.Devis.list('-date_devis', 500),
  });
  const { data: echeances = [] } = useQuery({
    queryKey: ['toutes-echeances'],
    queryFn: () => base44.entities.Echeance.list('-created_date', 500),
  });
  const { data: automations = [] } = useQuery({
    queryKey: ['automation-regles'],
    queryFn: () => base44.entities.AutomationRegle.list(),
  });

  const enRetard = echeances.filter(e => e.statut === 'En attente' && e.date_prevue && isPast(parseISO(e.date_prevue))).length;
  const activeAuto = automations.filter(a => a.actif !== false).length;

  const subtitles = {
    facturation: `${devisList.length} document${devisList.length !== 1 ? 's' : ''}${enRetard > 0 ? ` · ${enRetard} paiement${enRetard > 1 ? 's' : ''} en retard` : ''}`,
    automatisations: `${activeAuto} règle${activeAuto !== 1 ? 's' : ''} active${activeAuto !== 1 ? 's' : ''}`,
  };

  const badges = {
    facturation: enRetard > 0 ? (
      <span className="bg-red-500 text-white text-xs px-2 py-0.5 rounded-full font-bold">{enRetard}</span>
    ) : null,
  };

  const active = SECTIONS.find(s => s.id === section);
  const ActiveComponent = active?.component;

  return (
    <div className="p-4 md:p-6 space-y-5 max-w-4xl mx-auto">
      <div className="flex items-center gap-3">
        {section && (
          <button
            onClick={() => setSection(null)}
            className="flex items-center gap-1 text-sm text-muted-foreground hover:text-foreground transition-colors"
          >
            <ChevronRight size={14} className="rotate-180" /> Retour
          </button>
        )}
        <div>
          <h2 className="text-2xl font-bold">
            {active ? active.title : 'Business'}
          </h2>
          {!section && <p className="text-muted-foreground text-sm mt-1">Facturation et automatisations</p>}
        </div>
      </div>

      {!section && (
        <div className="space-y-3">
          {SECTIONS.map(s => (
            <PageCard
              key={s.id}
              emoji={s.emoji}
              iconBg={s.iconBg}
              title={s.title}
              subtitle={subtitles[s.id]}
              badge={badges[s.id]}
              onClick={() => setSection(s.id)}
            />
          ))}
        </div>
      )}

      {ActiveComponent && <ActiveComponent />}
    </div>
  );
}