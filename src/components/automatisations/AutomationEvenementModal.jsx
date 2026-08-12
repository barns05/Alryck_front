import { useState } from 'react';
import { X, Settings2, History } from 'lucide-react';
import AutomationRegles from './AutomationRegles';
import AutomationHistorique from './AutomationHistorique';

const TABS = [
  { id: 'regles', label: 'Règles', icon: Settings2 },
  { id: 'historique', label: 'Historique', icon: History },
];

export default function AutomationEvenementModal({ evenement, onClose }) {
  const [tab, setTab] = useState('regles');

  return (
    <div className="fixed inset-0 z-[60] flex items-center justify-center bg-black/50 backdrop-blur-sm p-4">
      <div className="bg-card rounded-2xl border border-border shadow-2xl w-full max-w-3xl max-h-[90vh] flex flex-col">
        {/* Header */}
        <div className="flex items-center justify-between px-6 py-4 border-b border-border shrink-0">
          <div>
            <h3 className="font-bold text-lg">Relances & automatisations</h3>
            <p className="text-sm text-muted-foreground mt-0.5">{evenement.nom} — règles spécifiques à cet événement</p>
          </div>
          <button onClick={onClose} className="p-1.5 rounded-lg hover:bg-muted text-muted-foreground"><X size={18} /></button>
        </div>

        {/* Tabs */}
        <div className="px-6 pt-4 shrink-0">
          <div className="flex gap-1 bg-muted p-1 rounded-xl w-fit">
            {TABS.map(t => (
              <button
                key={t.id}
                onClick={() => setTab(t.id)}
                className={`flex items-center gap-2 px-3 py-1.5 rounded-lg text-sm font-medium transition-colors ${
                  tab === t.id ? 'bg-card shadow text-foreground' : 'text-muted-foreground hover:text-foreground'
                }`}
              >
                <t.icon size={14} />
                {t.label}
              </button>
            ))}
          </div>
          <p className="text-xs text-muted-foreground mt-2 mb-4">
            {tab === 'regles'
              ? 'Ces règles s\'appliquent uniquement à cet événement et remplacent les règles globales. Les valeurs non configurées ici utilisent les règles globales par défaut.'
              : 'Historique des actions automatisées pour cet événement.'}
          </p>
        </div>

        {/* Content */}
        <div className="overflow-y-auto flex-1 px-6 pb-6">
          {tab === 'regles' && <AutomationRegles evenementId={evenement.id} />}
          {tab === 'historique' && <AutomationHistorique evenementId={evenement.id} />}
        </div>
      </div>
    </div>
  );
}