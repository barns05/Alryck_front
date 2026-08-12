import { useState } from 'react';
import Equipe from './Equipe';
import PlanningExtras from './PlanningExtras';
import StatistiquesEquipe from '@/components/equipe/StatistiquesEquipe';
import EffectifSettings from './EffectifSettings';
import { ArrowLeft } from 'lucide-react';

const TABS = [
  { id: 'planning', label: 'Planning' },
  { id: 'equipe', label: 'Collaborateurs & Extras' },
  { id: 'statistiques', label: 'Statistiques' },
];

export default function EquipePartenaires() {
  const [tab, setTab] = useState(() => sessionStorage.getItem('equipe_tab') || 'planning');
  const [subView, setSubView] = useState(null);

  const handleTab = (t) => {
    setTab(t);
    setSubView(null);
    sessionStorage.setItem('equipe_tab', t);
  };

  // Sous-vue paramètres effectifs — affiché sans changer de route
  if (subView === 'effectif-settings') {
    return (
      <div className="p-4 md:p-6 space-y-5 max-w-4xl mx-auto">
        <button
          onClick={() => setSubView(null)}
          className="flex items-center gap-1.5 text-sm text-muted-foreground hover:text-foreground transition-colors"
        >
          <ArrowLeft size={15} /> Retour au planning
        </button>
        <EffectifSettings />
      </div>
    );
  }

  return (
    <div className="p-4 md:p-6 space-y-5 max-w-4xl mx-auto">
      <div>
        <h2 className="text-2xl font-bold">Équipe & Planning</h2>
        <p className="text-muted-foreground text-sm mt-1">Collaborateurs, extras et planning équipe</p>
      </div>

      {/* Boutons de bascule */}
      <div className="flex gap-2">
        {TABS.map(t => (
          <button
            key={t.id}
            onClick={() => handleTab(t.id)}
            className={`flex-1 py-3 rounded-xl text-sm font-bold transition-colors ${
              tab === t.id
                ? 'bg-primary text-white'
                : 'bg-secondary text-muted-foreground hover:bg-secondary/80'
            }`}
          >
            {t.label}
          </button>
        ))}
      </div>

      {tab === 'planning' && <PlanningExtras embedded onOpenSettings={() => setSubView('effectif-settings')} />}
      {tab === 'equipe' && <Equipe embedded />}
      {tab === 'statistiques' && <StatistiquesEquipe />}
    </div>
  );
}