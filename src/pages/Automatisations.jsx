import { useState } from 'react';
import { Settings2, History } from 'lucide-react';
import AutomationRegles from '@/components/automatisations/AutomationRegles';
import AutomationHistorique from '@/components/automatisations/AutomationHistorique';

const TABS = [
  { id: 'regles', label: 'Règles par défaut', icon: Settings2 },
  { id: 'historique', label: 'Historique & suivi', icon: History },
];

export default function Automatisations() {
  const [tab, setTab] = useState('regles');

  return (
    <div className="p-4 md:p-6 space-y-6 max-w-5xl mx-auto">
      <div>
        <h2 className="text-2xl font-bold">⚙️ Automatisations</h2>
        <p className="text-muted-foreground text-sm mt-1">Règles d'envoi automatique et suivi des actions</p>
      </div>

      {/* Tabs */}
      <div className="flex gap-1 bg-muted p-1 rounded-xl w-fit">
        {TABS.map(t => (
          <button
            key={t.id}
            onClick={() => setTab(t.id)}
            className={`flex items-center gap-2 px-4 py-2 rounded-lg text-sm font-medium transition-colors ${
              tab === t.id ? 'bg-card shadow text-foreground' : 'text-muted-foreground hover:text-foreground'
            }`}
          >
            <t.icon size={15} />
            {t.label}
          </button>
        ))}
      </div>

      {tab === 'regles' && <AutomationRegles />}
      {tab === 'historique' && <AutomationHistorique />}
    </div>
  );
}