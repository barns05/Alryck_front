import { useState } from 'react';
import { useQuery } from '@tanstack/react-query';
import { base44 } from '@/api/base44Client';
import { X } from 'lucide-react';
import { useOwnerCompanySettings } from '@/hooks/useOwnerCompanySettings';

const DISMISSED_KEY = 'alryck_progress_bar_dismissed';

export default function OnboardingProgress() {
  const [dismissed, setDismissed] = useState(() => {
    return localStorage.getItem(DISMISSED_KEY) === '1';
  });

  const { query } = useOwnerCompanySettings({ enabled: !dismissed });
  const companySettings = query.data ?? [];

  const { data: prospects = [] } = useQuery({
    queryKey: ['prospects'],
    queryFn: () => base44.entities.Prospect.list(),
    enabled: !dismissed,
  });

  const { data: catalogueItems = [] } = useQuery({
    queryKey: ['catalogue-items-count'],
    queryFn: () => base44.entities.CatalogueItem.list('-created_date', 1),
    enabled: !dismissed,
  });

  if (dismissed) return null;

  const tasks = {
    configEntreprise: companySettings.length > 0 && !!companySettings[0]?.company_name,
    bibliotheque: catalogueItems.length > 0,
    prospect: prospects.length > 0,
  };

  const completed = Object.values(tasks).filter(Boolean).length;
  const total = Object.keys(tasks).length;

  if (completed === total) return null;

  const handleDismiss = (e) => {
    e.stopPropagation();
    localStorage.setItem(DISMISSED_KEY, '1');
    setDismissed(true);
  };

  return (
    <div className="bg-primary/10 border-b border-primary/20 px-4 py-3">
      <div className="max-w-7xl mx-auto flex items-center justify-between gap-4">
        <div className="flex-1">
          <div className="flex items-center gap-2 mb-2">
            <span className="text-sm font-medium text-primary">
              {completed}/{total} tâches complétées
            </span>
          </div>
          <div className="w-full bg-primary/20 rounded-full h-2">
            <div
              className="bg-primary h-full rounded-full transition-all duration-300"
              style={{ width: `${(completed / total) * 100}%` }}
            />
          </div>
        </div>
        <button
          onClick={handleDismiss}
          className="p-1 rounded hover:bg-primary/20 text-muted-foreground hover:text-primary transition-colors shrink-0"
        >
          <X size={16} />
        </button>
      </div>
    </div>
  );
}